#!/usr/bin/env python3
"""Validated BOAT RACE official parsers used by Race Carte backfill."""
from __future__ import annotations

import re
import time
import unicodedata
from typing import Any

from bs4 import BeautifulSoup

import enrich_race_carte_data as base

JST = base.JST
jst_now = base.jst_now
close_dt = base.close_dt
merge = base.merge
fetch_html = base.fetch_html
enrich_result = base.enrich_result

RACE_CARD_SOURCE = "official-racelist-v4-validated-cells"
RACE_CARD_PARTIAL_SOURCE = "official-racelist-v4-partial"
PREVIEW_SOURCE = "official-beforeinfo-v4-validated-cells"
PREVIEW_PARTIAL_SOURCE = "official-beforeinfo-v4-partial"
REQUIRED_STATIC_FIELDS = (
    "nationalWinRate",
    "national2Rate",
    "national3Rate",
    "localWinRate",
    "local2Rate",
    "local3Rate",
    "averageStart",
    "flyingCount",
    "lateCount",
    "motorNumber",
    "motor2Rate",
    "motor3Rate",
    "boatPart",
    "boat2Rate",
    "boat3Rate",
)


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").replace("\u3000", " ")).strip()


def _fetch_official(path: str) -> str:
    """Retry one transient official-page timeout without accepting partial data."""
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            return fetch_html(path, timeout=12)
        except RuntimeError as exc:
            last_error = exc
            if attempt == 0:
                time.sleep(0.25)
    raise RuntimeError(str(last_error or f"official fetch failed: {path}"))


def _normalized(text: Any) -> str:
    return unicodedata.normalize("NFKC", _clean(str(text or "")))


def _profile_link_matches(tag: Any, racer_no: str) -> bool:
    if getattr(tag, "name", None) != "a":
        return False
    href = str(tag.get("href") or "")
    return bool(re.search(rf"(?:[?&])toban={re.escape(racer_no)}(?:[&#]|$)", href))


def _find_profile_row(soup: BeautifulSoup, racer_no: str):
    """Find the row through the exact official profile link, never nearby numbers."""
    if not re.fullmatch(r"\d{4}", racer_no):
        return None
    for link in soup.find_all(lambda tag: _profile_link_matches(tag, racer_no)):
        row = link.find_parent("tr")
        if row:
            return row
    return None


def _direct_cells(row) -> list[Any]:
    return list(row.find_all(["td", "th"], recursive=False))


def _profile_cell_index(cells: list[Any], racer_no: str) -> int | None:
    for index, cell in enumerate(cells):
        if cell.find(lambda tag: _profile_link_matches(tag, racer_no)):
            return index
    return None


def _single_integer(cell) -> int | None:
    text = _normalized(" ".join(cell.stripped_strings))
    match = re.fullmatch(r"0*(\d{1,3})", text)
    return int(match.group(1)) if match else None


def _rate_triplet(cell, *, first_max: float) -> tuple[float, float, float] | None:
    """Parse one labelled racelist column (win/no, 2-ren, 3-ren)."""
    parts = [_normalized(part) for part in cell.stripped_strings]
    if len(parts) != 3 or not all(re.fullmatch(r"\d{1,3}(?:\.\d+)?", part) for part in parts):
        return None
    values = tuple(float(part) for part in parts)
    if not (0 <= values[0] <= first_max and 0 <= values[1] <= 100 and 0 <= values[2] <= 100):
        return None
    return values


def _has_racelist_headers(row) -> bool:
    table = row.find_parent("table")
    if not table:
        return False
    headers = [_normalized(" ".join(cell.stripped_strings)) for cell in table.find_all("th")]
    positions: list[int] = []
    for label in ("全国", "当地", "モーター", "ボート"):
        try:
            positions.append(headers.index(label))
        except ValueError:
            return False
    return positions == sorted(positions) and len(set(positions)) == 4


def _same_official_boat_part(existing: Any, official: int) -> bool:
    """Accept the historical two-digit truncation only when its suffix matches."""
    try:
        current = int(existing)
    except (TypeError, ValueError):
        return existing in (None, "")
    return current == official or (current < 100 <= official and current == official % 100)


def _parse_racer_row(row, entry: dict[str, Any]) -> dict[str, Any]:
    """Parse one racer using the official table's validated semantic columns."""
    racer_no = str(entry.get("racerNumber") or "").strip()
    cells = _direct_cells(row)
    profile_index = _profile_cell_index(cells, racer_no)
    if profile_index is None or profile_index < 1 or not _has_racelist_headers(row):
        return {}

    # racer profile, racer identity, F/L/ST, national, local, motor, boat
    required_end = profile_index + 7
    if len(cells) < required_end:
        return {}
    lane_cell = cells[profile_index - 1]
    identity_cell = cells[profile_index + 1]
    fst_cell, national_cell, local_cell, motor_cell, boat_cell = cells[profile_index + 2:required_end]

    lane = _single_integer(lane_cell)
    if lane != int(entry.get("boatNumber") or 0):
        return {}
    identity = _normalized(" ".join(identity_cell.stripped_strings))
    if not re.search(rf"(?<!\d){re.escape(racer_no)}(?!\d)", identity):
        return {}

    fst = _normalized(" ".join(fst_cell.stripped_strings))
    fst_match = re.fullmatch(r"F\s*(\d+)\s+L\s*(\d+)\s+(0\.\d{2})", fst)
    national = _rate_triplet(national_cell, first_max=10)
    local = _rate_triplet(local_cell, first_max=10)
    motor = _rate_triplet(motor_cell, first_max=999)
    boat = _rate_triplet(boat_cell, first_max=999)
    if not (fst_match and national and local and motor and boat):
        return {}

    if not motor[0].is_integer() or not boat[0].is_integer():
        return {}
    motor_number = int(motor[0])
    boat_number = int(boat[0])
    existing_motor = entry.get("motorNumber")
    if existing_motor not in (None, ""):
        try:
            if int(existing_motor) != motor_number:
                return {}
        except (TypeError, ValueError):
            return {}
    existing_boat = entry.get("boatPart", entry.get("boatNumberPart"))
    if not _same_official_boat_part(existing_boat, boat_number):
        return {}

    return {
        "flyingCount": int(fst_match.group(1)),
        "lateCount": int(fst_match.group(2)),
        "averageStart": float(fst_match.group(3)),
        "nationalWinRate": national[0],
        "national2Rate": national[1],
        "national3Rate": national[2],
        "localWinRate": local[0],
        "local2Rate": local[1],
        "local3Rate": local[2],
        "motorNumber": motor_number,
        "motor2Rate": motor[1],
        "motor3Rate": motor[2],
        "boatPart": boat_number,
        "boat2Rate": boat[1],
        "boat3Rate": boat[2],
    }


def has_static_stats(race: dict[str, Any]) -> bool:
    entries = race.get("entries") or []
    source = (race.get("carteSource") or {}).get("raceCard")
    return bool(entries) and source == RACE_CARD_SOURCE and all(
        all(entry.get(field) is not None for field in REQUIRED_STATIC_FIELDS)
        for entry in entries
    )


def enrich_race_card(race: dict[str, Any], date_text: str, venue_code: str) -> bool:
    race_no = int(race.get("number") or 0)
    html = _fetch_official(
        f"/owpc/pc/race/racelist?hd={date_text.replace('-', '')}&jcd={venue_code}&rno={race_no}"
    )
    soup = BeautifulSoup(html, "html.parser")
    entries = race.get("entries") or []
    changed = False
    parsed = 0

    for entry in entries:
        racer_no = str(entry.get("racerNumber") or "").strip()
        if not re.fullmatch(r"\d{4}", racer_no):
            continue
        row = _find_profile_row(soup, racer_no)
        values = _parse_racer_row(row, entry) if row else {}
        if values:
            parsed += 1
            changed |= merge(entry, values)

    if parsed:
        meta = race.setdefault("carteSource", {})
        source = (
            RACE_CARD_SOURCE if parsed == len(entries) else RACE_CARD_PARTIAL_SOURCE
        )
        official_url = (
            "https://www.boatrace.jp/owpc/pc/race/racelist"
            f"?hd={date_text.replace('-', '')}&jcd={venue_code}&rno={race_no}"
        )
        meta_changed = (
            meta.get("raceCard") != source
            or meta.get("raceCardParsedRacers") != parsed
            or meta.get("raceCardOfficialUrl") != official_url
        )
        if changed or meta_changed:
            meta["raceCard"] = source
            meta["raceCardParsedRacers"] = parsed
            meta["raceCardOfficialUrl"] = official_url
            meta["raceCardFetchedAt"] = jst_now().isoformat()
            changed = True
    return changed


def _wind_direction_from_assets(soup: BeautifulSoup) -> str | None:
    numbered = {
        1: "北", 2: "北北東", 3: "北東", 4: "東北東",
        5: "東", 6: "東南東", 7: "南東", 8: "南南東",
        9: "南", 10: "南南西", 11: "南西", 12: "西南西",
        13: "西", 14: "西北西", 15: "北西", 16: "北北西",
    }
    directions = [
        "北北東","東北東","東南東","南南東","南南西","西南西","西北西","北北西",
        "北東","南東","南西","北西","北","南","東","西","向い風","向かい風","追い風","左横風","右横風",
    ]
    mapping = {
        "n":"北","nne":"北北東","ne":"北東","ene":"東北東","e":"東","ese":"東南東","se":"南東","sse":"南南東",
        "s":"南","ssw":"南南西","sw":"南西","wsw":"西南西","w":"西","wnw":"西北西","nw":"北西","nnw":"北北西",
    }
    for tag in soup.find_all(True):
        for css_class in tag.get("class") or []:
            numeric = re.fullmatch(r"is-wind(\d{1,2})", str(css_class))
            if numeric and int(numeric.group(1)) in numbered:
                return numbered[int(numeric.group(1))]
        blob = " ".join(str(tag.get(k) or "") for k in ("alt","title","class","src","data-src","style"))
        for d in directions:
            if d in blob:
                return d
        m = re.search(r"(?:wind|kaze)[-_]?(nne|ene|ese|sse|ssw|wsw|wnw|nnw|ne|se|sw|nw|n|e|s|w)(?:\D|$)", blob, re.I)
        if m:
            return mapping.get(m.group(1).lower())
    return None


def _parse_exhibition_row(row, entry: dict[str, Any]) -> dict[str, Any]:
    racer_no = str(entry.get("racerNumber") or "").strip()
    cells = _direct_cells(row)
    profile_index = _profile_cell_index(cells, racer_no)
    if profile_index is None or profile_index < 1:
        return {}
    table = row.find_parent("table")
    headers = _normalized(" ".join(table.stripped_strings)) if table else ""
    if "ボートレーサー" not in headers or "展示 タイム" not in headers:
        return {}
    if _single_integer(cells[profile_index - 1]) != int(entry.get("boatNumber") or 0):
        return {}
    exhibition_index = profile_index + 3
    if len(cells) <= exhibition_index:
        return {}
    exhibition = _normalized(" ".join(cells[exhibition_index].stripped_strings))
    if not re.fullmatch(r"6\.\d{2}", exhibition):
        return {}
    return {"exhibitionTime": float(exhibition)}


def enrich_preview(race: dict[str, Any], date_text: str, venue_code: str) -> bool:
    race_no = int(race.get("number") or 0)
    html = _fetch_official(
        f"/owpc/pc/race/beforeinfo?hd={date_text.replace('-', '')}&jcd={venue_code}&rno={race_no}"
    )
    soup = BeautifulSoup(html, "html.parser")
    changed = False

    parsed = 0
    for entry in race.get("entries") or []:
        racer_no = str(entry.get("racerNumber") or "").strip()
        row = _find_profile_row(soup, racer_no)
        if row:
            values = _parse_exhibition_row(row, entry)
            if values:
                parsed += 1
                changed |= merge(entry, values)

    env = base.parse_environment(soup)
    direction = _wind_direction_from_assets(soup)
    if direction and not env.get("windDirection"):
        env["windDirection"] = direction
    if str(env.get("windDirection") or "").lower() in {"undefined", "null", "none", "nan"}:
        env.pop("windDirection", None)
    if env:
        changed |= merge(race.setdefault("environment", {}), env)
    entry_count = len(race.get("entries") or [])
    source = PREVIEW_SOURCE if parsed == entry_count else PREVIEW_PARTIAL_SOURCE
    official_url = (
        "https://www.boatrace.jp/owpc/pc/race/beforeinfo"
        f"?hd={date_text.replace('-', '')}&jcd={venue_code}&rno={race_no}"
    )
    current_meta = race.get("carteSource") or {}
    meta_changed = (
        current_meta.get("preview") != source
        or current_meta.get("previewParsedRacers") != parsed
        or current_meta.get("previewOfficialUrl") != official_url
    )
    if changed or meta_changed:
        meta = race.setdefault("carteSource", {})
        meta["preview"] = source
        meta["previewParsedRacers"] = parsed
        meta["previewOfficialUrl"] = official_url
        meta["previewFetchedAt"] = jst_now().isoformat()
        changed = True
    return changed
