#!/usr/bin/env python3
"""Stronger BOAT RACE official parsers used by Race Carte backfill.

Uses the official racelist page for racer/motor stats and adds image-attribute
fallbacks for wind direction on beforeinfo pages.
"""
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


def _numbers(text: str) -> list[float]:
    return [float(x) for x in re.findall(r"(?<![\d.])(\d{1,3}(?:\.\d+)?)(?![\d.])", text)]


def enrich_race_card(race: dict[str, Any], date_text: str, venue_code: str) -> bool:
    race_no = int(race.get("number") or 0)
    html = fetch_html(f"/owpc/pc/race/racelist?hd={date_text.replace('-', '')}&jcd={venue_code}&rno={race_no}", timeout=6)
    soup = BeautifulSoup(html, "html.parser")
    changed = False
    parsed = 0

    for entry in race.get("entries") or []:
        racer_no = str(entry.get("racerNumber") or "").strip()
        row = None
        if re.fullmatch(r"\d{4}", racer_no):
            for node in soup.find_all(string=re.compile(rf"(?<!\d){re.escape(racer_no)}(?!\d)")):
                row = node.find_parent("tr")
                if row:
                    break
        if not row:
            continue

        text = " ".join(row.stripped_strings).replace("\u3000", " ")
        values: dict[str, Any] = {}
        f = re.search(r"(?:^|\s)F\s*(\d+)", text)
        l = re.search(r"(?:^|\s)L\s*(\d+)", text)
        if f: values["flyingCount"] = int(f.group(1))
        if l: values["lateCount"] = int(l.group(1))
        sts = re.findall(r"(?<!\d)(0\.\d{2})(?!\d)", text)
        if sts: values["averageStart"] = float(sts[0])

        # Prefer table cell ordering on the official racelist page.
        cells = [" ".join(td.stripped_strings).replace("\u3000", " ") for td in row.find_all(["td","th"])]
        flat = " | ".join(cells)
        nums = _numbers(flat)
        motor_no = int(entry.get("motorNumber") or 0) if str(entry.get("motorNumber") or "").isdigit() else None
        boat_no_raw = entry.get("boatPart") or entry.get("boatNumberPart")
        boat_no = int(boat_no_raw) if str(boat_no_raw or "").isdigit() else None

        # Rates generally appear as win/2-ren/3-ren blocks. Anchor motor/boat number,
        # then read adjacent percentages; this is safer than relying on a fixed index.
        def anchor(no: int | None):
            if not no: return None
            for i, n in enumerate(nums[:-2]):
                if n.is_integer() and int(n) == no and 0 <= nums[i+1] <= 100 and 0 <= nums[i+2] <= 100:
                    return i
            return None
        mi = anchor(motor_no)
        if mi is not None:
            values["motor2Rate"] = nums[mi+1]
            values["motor3Rate"] = nums[mi+2]
        bi = anchor(boat_no)
        if bi is not None:
            values["boat2Rate"] = nums[bi+1]
            values["boat3Rate"] = nums[bi+2]

        # Win-rate values are decimals 0-10. Take plausible values before motor block.
        decs = [n for n in nums[:mi if mi is not None else len(nums)] if 0.0 <= n <= 10.0 and not n.is_integer()]
        if len(decs) >= 2:
            values["nationalWinRate"] = decs[-2]
            values["localWinRate"] = decs[-1]

        if values:
            parsed += 1
            changed |= merge(entry, values)

    if parsed:
        meta = race.setdefault("carteSource", {})
        meta["raceCard"] = "official-racelist-v2"
        meta["raceCardFetchedAt"] = jst_now().isoformat()
        changed = True
    return changed


def _wind_direction_from_assets(soup: BeautifulSoup) -> str | None:
    directions = ["北北東","東北東","東南東","南南東","南南西","西南西","西北西","北北西","北東","南東","南西","北西","北","南","東","西","向い風","向かい風","追い風","左横風","右横風"]
    for tag in soup.find_all(True):
        blob = " ".join(str(tag.get(k) or "") for k in ("alt","title","class","src","data-src","style"))
        for d in directions:
            if d in blob:
                return d
        m = re.search(r"(?:wind|kaze)[-_]?(nne|ene|ese|sse|ssw|wsw|wnw|nnw|ne|se|sw|nw|n|e|s|w)(?:\D|$)", blob, re.I)
        if m:
            code = m.group(1).lower()
            return {"n":"北","nne":"北北東","ne":"北東","ene":"東北東","e":"東","ese":"東南東","se":"南東","sse":"南南東","s":"南","ssw":"南南西","sw":"南西","wsw":"西南西","w":"西","wnw":"西北西","nw":"北西","nnw":"北北西"}.get(code)
    return None


def enrich_preview(race: dict[str, Any], date_text: str, venue_code: str) -> bool:
    race_no = int(race.get("number") or 0)
    html = fetch_html(f"/owpc/pc/race/beforeinfo?hd={date_text.replace('-', '')}&jcd={venue_code}&rno={race_no}", timeout=6)
    soup = BeautifulSoup(html, "html.parser")
    changed = False

    for entry in race.get("entries") or []:
        name = str(entry.get("name") or "").replace(" ", "")
        row = None
        if name:
            for node in soup.find_all(string=lambda s: s and name in str(s).replace(" ", "").replace("\u3000", "")):
                row = node.find_parent("tr")
                if row: break
        if row:
            changed |= merge(entry, parse_preview_racer_row(row))

    env = base.parse_environment(soup)
    direction = _wind_direction_from_assets(soup)
    if direction and not env.get("windDirection"):
        env["windDirection"] = direction
    # Never persist JavaScript-style placeholders as real data.
    if str(env.get("windDirection") or "").lower() in {"undefined","null","none","nan"}:
        env.pop("windDirection", None)
    if env:
        changed |= merge(race.setdefault("environment", {}), env)
    if changed:
        meta = race.setdefault("carteSource", {})
        meta["preview"] = "official-beforeinfo-v2"
        meta["previewFetchedAt"] = jst_now().isoformat()
    return changed
