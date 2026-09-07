#!/usr/bin/env python3
"""Stronger BOAT RACE official parsers used by Race Carte backfill."""
from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup

import enrich_race_carte_data as base

JST = base.JST
jst_now = base.jst_now
close_dt = base.close_dt
has_static_stats = base.has_static_stats
merge = base.merge
fetch_html = base.fetch_html
parse_preview_racer_row = base.parse_preview_racer_row
enrich_result = base.enrich_result


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").replace("\u3000", " ")).strip()


def _find_racer_segment(page_text: str, racer_no: str, next_racer_no: str | None = None) -> str:
    """Return the text block for one racer even when the official layout has no <tr>."""
    m = re.search(rf"(?<!\d){re.escape(racer_no)}(?!\d)", page_text)
    if not m:
        return ""
    start = m.start()
    end = min(len(page_text), start + 900)
    if next_racer_no:
        n = re.search(rf"(?<!\d){re.escape(next_racer_no)}(?!\d)", page_text[m.end():end])
        if n:
            end = m.end() + n.start()
    return page_text[start:end]


def _parse_racer_segment(segment: str, entry: dict[str, Any]) -> dict[str, Any]:
    values: dict[str, Any] = {}
    if not segment:
        return values

    f = re.search(r"(?:^|\s)F\s*(\d+)", segment)
    l = re.search(r"(?:^|\s)L\s*(\d+)", segment)
    if f:
        values["flyingCount"] = int(f.group(1))
    if l:
        values["lateCount"] = int(l.group(1))

    st = re.search(r"(?<!\d)(0\.\d{2})(?!\d)", segment)
    if not st:
        return values
    values["averageStart"] = float(st.group(1))

    # Official racelist ordering immediately after average ST:
    # national win/2-ren/3-ren, local win/2-ren/3-ren,
    # motor no/2-ren/3-ren, boat no/2-ren/3-ren.
    tail = segment[st.end():]
    nums = [float(x) for x in re.findall(r"(?<![\d.])(\d{1,3}(?:\.\d+)?)(?![\d.])", tail)]
    if len(nums) >= 6:
        if 0 <= nums[0] <= 10:
            values["nationalWinRate"] = nums[0]
        if 0 <= nums[1] <= 100:
            values["national2Rate"] = nums[1]
        if 0 <= nums[2] <= 100:
            values["national3Rate"] = nums[2]
        if 0 <= nums[3] <= 10:
            values["localWinRate"] = nums[3]
        if 0 <= nums[4] <= 100:
            values["local2Rate"] = nums[4]
        if 0 <= nums[5] <= 100:
            values["local3Rate"] = nums[5]

    motor_no = int(entry.get("motorNumber") or 0) if str(entry.get("motorNumber") or "").isdigit() else None
    boat_raw = entry.get("boatPart") or entry.get("boatNumberPart")
    boat_no = int(boat_raw) if str(boat_raw or "").isdigit() else None

    def anchor(no: int | None, start: int = 6) -> int | None:
        if not no:
            return None
        for i in range(start, max(start, len(nums) - 2)):
            n = nums[i]
            if n.is_integer() and int(n) == no and i + 2 < len(nums):
                if 0 <= nums[i + 1] <= 100 and 0 <= nums[i + 2] <= 100:
                    return i
        return None

    mi = anchor(motor_no, 6)
    if mi is not None:
        values["motor2Rate"] = nums[mi + 1]
        values["motor3Rate"] = nums[mi + 2]
    bi = anchor(boat_no, (mi + 3) if mi is not None else 6)
    if bi is not None:
        values["boat2Rate"] = nums[bi + 1]
        values["boat3Rate"] = nums[bi + 2]
    return values


def enrich_race_card(race: dict[str, Any], date_text: str, venue_code: str) -> bool:
    race_no = int(race.get("number") or 0)
    html = fetch_html(
        f"/owpc/pc/race/racelist?hd={date_text.replace('-', '')}&jcd={venue_code}&rno={race_no}",
        timeout=6,
    )
    soup = BeautifulSoup(html, "html.parser")
    page_text = _clean(" ".join(soup.stripped_strings))
    entries = race.get("entries") or []
    changed = False
    parsed = 0

    for idx, entry in enumerate(entries):
        racer_no = str(entry.get("racerNumber") or "").strip()
        if not re.fullmatch(r"\d{4}", racer_no):
            continue
        next_no = None
        if idx + 1 < len(entries):
            candidate = str(entries[idx + 1].get("racerNumber") or "").strip()
            if re.fullmatch(r"\d{4}", candidate):
                next_no = candidate

        segment = _find_racer_segment(page_text, racer_no, next_no)
        values = _parse_racer_segment(segment, entry)
        if values:
            parsed += 1
            changed |= merge(entry, values)

    if parsed:
        meta = race.setdefault("carteSource", {})
        meta["raceCard"] = "official-racelist-v3-textblock"
        meta["raceCardParsedRacers"] = parsed
        meta["raceCardFetchedAt"] = jst_now().isoformat()
        changed = True
    return changed


def _wind_direction_from_assets(soup: BeautifulSoup) -> str | None:
    directions = [
        "北北東","東北東","東南東","南南東","南南西","西南西","西北西","北北西",
        "北東","南東","南西","北西","北","南","東","西","向い風","向かい風","追い風","左横風","右横風",
    ]
    mapping = {
        "n":"北","nne":"北北東","ne":"北東","ene":"東北東","e":"東","ese":"東南東","se":"南東","sse":"南南東",
        "s":"南","ssw":"南南西","sw":"南西","wsw":"西南西","w":"西","wnw":"西北西","nw":"北西","nnw":"北北西",
    }
    for tag in soup.find_all(True):
        blob = " ".join(str(tag.get(k) or "") for k in ("alt","title","class","src","data-src","style"))
        for d in directions:
            if d in blob:
                return d
        m = re.search(r"(?:wind|kaze)[-_]?(nne|ene|ese|sse|ssw|wsw|wnw|nnw|ne|se|sw|nw|n|e|s|w)(?:\D|$)", blob, re.I)
        if m:
            return mapping.get(m.group(1).lower())
    return None


def enrich_preview(race: dict[str, Any], date_text: str, venue_code: str) -> bool:
    race_no = int(race.get("number") or 0)
    html = fetch_html(
        f"/owpc/pc/race/beforeinfo?hd={date_text.replace('-', '')}&jcd={venue_code}&rno={race_no}",
        timeout=6,
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

    env = base.parse_environment(soup)
    direction = _wind_direction_from_assets(soup)
    if direction and not env.get("windDirection"):
        env["windDirection"] = direction
    if str(env.get("windDirection") or "").lower() in {"undefined", "null", "none", "nan"}:
        env.pop("windDirection", None)
    if env:
        changed |= merge(race.setdefault("environment", {}), env)
    if changed:
        meta = race.setdefault("carteSource", {})
        meta["preview"] = "official-beforeinfo-v3"
        meta["previewFetchedAt"] = jst_now().isoformat()
    return changed
