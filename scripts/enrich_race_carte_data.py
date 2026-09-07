#!/usr/bin/env python3
"""Best-effort official BOAT RACE enrichment for MAMO BOAT race cartes.

Adds racer stats from the official race card and preview/environment data from
official beforeinfo pages into the already validated data/*.json dataset.
The core B/K parser remains the source of truth; this module only fills fields
that the fixed-width parser does not currently expose.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup

JST = timezone(timedelta(hours=9))
UA = "Mozilla/5.0 (compatible; MAMOBOAT-RaceCarte/1.0; +https://mamoboat.com/)"
OFFICIAL = "https://www.boatrace.jp"


def jst_now() -> datetime:
    return datetime.now(JST)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=os.getenv("TARGET_DATE") or "")
    parser.add_argument("--max-race-cards", type=int, default=24)
    parser.add_argument("--max-previews", type=int, default=18)
    parser.add_argument("--max-results", type=int, default=18)
    parser.add_argument("--sleep", type=float, default=0.20)
    return parser.parse_args()


def target_date(value: str) -> str:
    return value.strip() or jst_now().date().isoformat()


def dataset_path(date_text: str) -> Path | None:
    today = jst_now().date().isoformat()
    candidates = [Path("data") / f"{date_text}.json"]
    if date_text == today:
        candidates.insert(0, Path("data/today.json"))
    for path in candidates:
        if path.exists():
            return path
    return None


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    dated = Path("data") / f"{payload.get('date')}.json"
    if path.name == "today.json" and dated.exists():
        save_json(dated, payload) if dated != path else None


def fetch_html(path: str, timeout: int = 12) -> str:
    request = Request(OFFICIAL + path, headers={"User-Agent": UA, "Accept-Language": "ja,en;q=0.7"})
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read()
            charset = response.headers.get_content_charset() or "utf-8"
    except (HTTPError, URLError, TimeoutError) as exc:
        raise RuntimeError(f"official fetch failed: {path}: {exc}") from exc
    for encoding in (charset, "utf-8", "cp932", "shift_jis"):
        try:
            return raw.decode(encoding)
        except (UnicodeDecodeError, LookupError):
            pass
    return raw.decode("utf-8", errors="replace")


def nfloat(value: Any) -> float | None:
    try:
        if value is None or value == "":
            return None
        return float(str(value).replace("%", "").replace("kg", "").strip())
    except (TypeError, ValueError):
        return None


def nint(value: Any) -> int | None:
    number = nfloat(value)
    return int(number) if number is not None else None


def merge(entry: dict[str, Any], values: dict[str, Any]) -> bool:
    changed = False
    for key, value in values.items():
        if value is None or value == "":
            continue
        if entry.get(key) != value:
            entry[key] = value
            changed = True
    return changed


def compact_text(node) -> str:
    return " ".join(node.stripped_strings).replace("\u3000", " ")


def find_racer_row(soup: BeautifulSoup, racer_number: Any):
    wanted = str(racer_number or "").strip()
    if not re.fullmatch(r"\d{4}", wanted):
        return None
    for text_node in soup.find_all(string=re.compile(rf"(?<!\d){re.escape(wanted)}(?!\d)")):
        row = text_node.find_parent("tr")
        if row:
            return row
    return None


def parse_race_card_row(row, entry: dict[str, Any]) -> dict[str, Any]:
    """Parse the official pcexpect/racelist row using stable numeric ordering.

    After F/L/average-ST the official row is ordered as:
    national win/2/3, local win/2/3, motor no/2/3, boat no/2/3.
    We validate motor/boat numbers already obtained from the B file before using
    adjacent percentage values.
    """
    text = compact_text(row)
    result: dict[str, Any] = {}

    f_match = re.search(r"(?:^|\s)F\s*(\d+)", text)
    l_match = re.search(r"(?:^|\s)L\s*(\d+)", text)
    if f_match:
        result["flyingCount"] = int(f_match.group(1))
    if l_match:
        result["lateCount"] = int(l_match.group(1))

    st_anchor = re.search(r"(?:L\s*\d+\s+)?(0\.\d{2})(?=\s)", text)
    if not st_anchor:
        # Some layouts omit explicit L0. Use the first plausible ST after F count.
        candidates = list(re.finditer(r"(?<!\d)(0\.\d{2})(?!\d)", text))
        st_anchor = candidates[0] if candidates else None
    if not st_anchor:
        return result

    result["averageStart"] = float(st_anchor.group(1))
    tail = text[st_anchor.end():]
    tokens = re.findall(r"(?<![\d.])(\d{1,3}(?:\.\d+)?)(?![\d.])", tail)
    nums = [float(token) for token in tokens]
    if len(nums) >= 6:
        # official order: national 3 values, local 3 values
        if 0 <= nums[0] <= 10:
            result["nationalWinRate"] = nums[0]
        if 0 <= nums[1] <= 100:
            result["national2Rate"] = nums[1]
        if 0 <= nums[2] <= 100:
            result["national3Rate"] = nums[2]
        if 0 <= nums[3] <= 10:
            result["localWinRate"] = nums[3]
        if 0 <= nums[4] <= 100:
            result["local2Rate"] = nums[4]
        if 0 <= nums[5] <= 100:
            result["local3Rate"] = nums[5]

    motor_no = nint(entry.get("motorNumber"))
    boat_no = nint(entry.get("boatPart"))

    def locate_no(no: int | None, start: int) -> int | None:
        if no is None:
            return None
        for index in range(start, max(start, len(nums) - 2)):
            if abs(nums[index] - no) < 1e-9 and nums[index].is_integer():
                return index
        return None

    motor_index = locate_no(motor_no, 6)
    if motor_index is not None and motor_index + 2 < len(nums):
        result["motor2Rate"] = nums[motor_index + 1]
        result["motor3Rate"] = nums[motor_index + 2]
    boat_index = locate_no(boat_no, (motor_index + 3) if motor_index is not None else 6)
    if boat_index is not None and boat_index + 2 < len(nums):
        result["boat2Rate"] = nums[boat_index + 1]
        result["boat3Rate"] = nums[boat_index + 2]

    return result


def enrich_race_card(race: dict[str, Any], date_text: str, venue_code: str) -> bool:
    race_no = int(race.get("number") or 0)
    html = fetch_html(
        f"/owsp/sp/race/pcexpect?hd={date_text.replace('-', '')}&jcd={venue_code}&rno={race_no}"
    )
    soup = BeautifulSoup(html, "html.parser")
    changed = False
    parsed = 0
    for entry in race.get("entries") or []:
        row = find_racer_row(soup, entry.get("racerNumber"))
        if not row:
            continue
        values = parse_race_card_row(row, entry)
        if values:
            parsed += 1
            changed |= merge(entry, values)
    if parsed:
        meta = race.setdefault("carteSource", {})
        stamp = jst_now().isoformat()
        if meta.get("raceCard") != "official-pcexpect":
            meta["raceCard"] = "official-pcexpect"
            changed = True
        if meta.get("raceCardFetchedAt") != stamp:
            meta["raceCardFetchedAt"] = stamp
            changed = True
    return changed


def parse_preview_racer_row(row) -> dict[str, Any]:
    text = compact_text(row)
    # Exhibition times are normally ~6.xx. Avoid weight (5x.x) and tilt values.
    times = [float(v) for v in re.findall(r"(?<!\d)(6\.[0-9]{2})(?!\d)", text)]
    return {"exhibitionTime": times[0]} if times else {}


def parse_environment(soup: BeautifulSoup) -> dict[str, Any]:
    text = " ".join(soup.stripped_strings).replace("\u3000", " ")
    env: dict[str, Any] = {}

    patterns = {
        "airTemperature": r"気温\s*([+-]?\d+(?:\.\d+)?)\s*℃",
        "waterTemperature": r"水温\s*([+-]?\d+(?:\.\d+)?)\s*℃",
        "windSpeed": r"風速\s*(\d+(?:\.\d+)?)\s*m",
        "waveHeight": r"波高\s*(\d+(?:\.\d+)?)\s*cm",
    }
    for key, pattern in patterns.items():
        match = re.search(pattern, text)
        if match:
            env[key] = float(match.group(1))

    weather_match = re.search(r"(?:水面気象情報.{0,120}?)(晴れ?|曇り?|雨|雪|霧)", text)
    if not weather_match:
        weather_match = re.search(r"(?:^|\s)(晴れ?|曇り?|雨|雪|霧)(?:\s|$)", text)
    if weather_match:
        weather = weather_match.group(1)
        env["weather"] = {"晴": "晴", "晴れ": "晴", "曇": "曇", "曇り": "曇"}.get(weather, weather)

    wind_match = re.search(r"風向\s*[:：]?\s*(北東|北西|南東|南西|北|南|東|西|向い風|向かい風|追い風|左横風|右横風)", text)
    if wind_match:
        env["windDirection"] = wind_match.group(1)
    return env


def enrich_preview(race: dict[str, Any], date_text: str, venue_code: str) -> bool:
    race_no = int(race.get("number") or 0)
    html = fetch_html(
        f"/owpc/pc/race/beforeinfo?hd={date_text.replace('-', '')}&jcd={venue_code}&rno={race_no}"
    )
    soup = BeautifulSoup(html, "html.parser")
    changed = False

    for entry in race.get("entries") or []:
        name = str(entry.get("name") or "").replace(" ", "")
        row = None
        if name:
            for node in soup.find_all(string=lambda s: s and name in str(s).replace(" ", "").replace("\u3000", "")):
                row = node.find_parent("tr")
                if row:
                    break
        if row:
            changed |= merge(entry, parse_preview_racer_row(row))

    env = parse_environment(soup)
    if env:
        current = race.setdefault("environment", {})
        changed |= merge(current, env)

    if changed:
        meta = race.setdefault("carteSource", {})
        meta["preview"] = "official-beforeinfo"
        meta["previewFetchedAt"] = jst_now().isoformat()
    return changed


def enrich_result(race: dict[str, Any], date_text: str, venue_code: str) -> bool:
    if not race.get("result") or race["result"].get("kimarite"):
        return False
    race_no = int(race.get("number") or 0)
    html = fetch_html(
        f"/owpc/pc/race/raceresult?hd={date_text.replace('-', '')}&jcd={venue_code}&rno={race_no}"
    )
    soup = BeautifulSoup(html, "html.parser")
    text = " ".join(soup.stripped_strings).replace("\u3000", " ")
    match = re.search(r"決まり手\s*[:：]?\s*(まくり差し|まくり|逃げ|差し|抜き|恵まれ)", text)
    if not match:
        return False
    race["result"]["kimarite"] = match.group(1)
    meta = race.setdefault("carteSource", {})
    meta["resultDetail"] = "official-raceresult"
    meta["resultDetailFetchedAt"] = jst_now().isoformat()
    return True


def close_dt(race: dict[str, Any]) -> datetime | None:
    value = race.get("closeTime")
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value))
        return dt if dt.tzinfo else dt.replace(tzinfo=JST)
    except ValueError:
        return None


def has_static_stats(race: dict[str, Any]) -> bool:
    entries = race.get("entries") or []
    return bool(entries) and all(
        entry.get("nationalWinRate") is not None
        and entry.get("averageStart") is not None
        and entry.get("motor2Rate") is not None
        for entry in entries
    )


def main() -> int:
    # The scheduled sync must use the same validated parser as history backfill.
    # Import here because that module reuses this module's HTTP/result helpers.
    from race_carte_official_v2 import enrich_race_card, enrich_preview, has_static_stats

    args = parse_args()
    date_text = target_date(args.date)
    path = dataset_path(date_text)
    if not path:
        print(f"race-carte enrichment: dataset not found for {date_text}")
        return 0

    payload = load_json(path)
    now = jst_now()
    races: list[tuple[str, dict[str, Any]]] = []
    for venue in payload.get("venues") or []:
        code = str(venue.get("code") or "").zfill(2)
        for race in venue.get("races") or []:
            if race.get("entries"):
                races.append((code, race))

    # Static racer/motor stats: prioritize races nearest to the current time and
    # keep previously enriched values to avoid repeatedly hitting the official site.
    static_targets = [(code, race) for code, race in races if not has_static_stats(race)]
    static_targets.sort(key=lambda item: abs(((close_dt(item[1]) or now) - now).total_seconds()))

    changed = False
    race_card_done = 0
    for code, race in static_targets[: max(0, args.max_race_cards)]:
        try:
            changed |= enrich_race_card(race, date_text, code)
            race_card_done += 1
        except Exception as exc:  # best-effort; base dataset must remain usable
            print(f"race-card enrichment failed {code}-{race.get('number')}R: {exc}")
        time.sleep(max(0.0, args.sleep))

    # Dynamic preview/weather: only around the betting window, so these values
    # reflect the race conditions users actually saw near AIR BET time.
    preview_targets: list[tuple[str, dict[str, Any]]] = []
    for code, race in races:
        close = close_dt(race)
        if not close:
            continue
        delta = (close - now).total_seconds() / 60
        if -35 <= delta <= 75:
            preview_targets.append((code, race))
    preview_targets.sort(key=lambda item: abs(((close_dt(item[1]) or now) - now).total_seconds()))

    preview_done = 0
    for code, race in preview_targets[: max(0, args.max_previews)]:
        try:
            changed |= enrich_preview(race, date_text, code)
            preview_done += 1
        except Exception as exc:
            print(f"preview enrichment failed {code}-{race.get('number')}R: {exc}")
        time.sleep(max(0.0, args.sleep))

    # Result detail: kimarite is stable after settlement. Fill recent missing rows.
    result_targets = [(code, race) for code, race in races if race.get("result") and not race["result"].get("kimarite")]
    result_targets.sort(key=lambda item: -((close_dt(item[1]) or datetime(1970, 1, 1, tzinfo=JST)).timestamp()))
    result_done = 0
    for code, race in result_targets[: max(0, args.max_results)]:
        try:
            changed |= enrich_result(race, date_text, code)
            result_done += 1
        except Exception as exc:
            print(f"result enrichment failed {code}-{race.get('number')}R: {exc}")
        time.sleep(max(0.0, args.sleep))

    source = payload.setdefault("source", {})
    source["raceCarteEnrichment"] = "BOAT RACE official pcexpect/beforeinfo/raceresult"
    source["raceCarteEnrichmentPolicy"] = "static stats cached; preview near close; kimarite after settlement"
    payload["raceCarteEnrichedAt"] = now.isoformat()

    if changed:
        save_json(path, payload)
        # Keep today's dated archive in sync even when today.json is the selected path.
        dated = Path("data") / f"{date_text}.json"
        if dated != path:
            save_json(dated, payload)
    print(
        f"race-carte enrichment date={date_text} changed={changed} "
        f"raceCards={race_card_done} previews={preview_done} results={result_done}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
