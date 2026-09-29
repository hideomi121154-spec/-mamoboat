#!/usr/bin/env python3
"""Build a lightweight live overlay for race facts shown in MAMO BOAT.

This deliberately does not rewrite data/today.json. It enriches only races near
their betting deadline and publishes data/live-race-facts.json, so user-facing
facts are not blocked by the heavier full-day synchronization workflow.
"""
from __future__ import annotations

import copy
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import enrich_race_carte_data as base
import race_carte_official_v2 as official

JST = timezone(timedelta(hours=9))
DATASET = Path("data/today.json")
OUTPUT = Path("data/live-race-facts.json")

FACT_FIELDS = (
    "boatNumber",
    "racerNumber",
    "name",
    "class",
    "branch",
    "age",
    "weight",
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
    "exhibitionTime",
)


def jst_now() -> datetime:
    return datetime.now(JST)


def close_dt(race: dict[str, Any]) -> datetime | None:
    value = race.get("closeTime")
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=JST)


def minutes_to_close(race: dict[str, Any], now: datetime) -> float | None:
    close = close_dt(race)
    if not close:
        return None
    return (close - now).total_seconds() / 60


def priority(item: tuple[str, dict[str, Any]], now: datetime) -> tuple[int, float]:
    delta = minutes_to_close(item[1], now)
    if delta is None:
        return (4, float("inf"))
    if 0 <= delta <= 120:
        return (0, delta)
    if -30 <= delta < 0:
        return (1, abs(delta))
    if delta > 120:
        return (2, delta)
    return (3, abs(delta))


def in_live_window(race: dict[str, Any], now: datetime) -> bool:
    delta = minutes_to_close(race, now)
    return delta is not None and -30 <= delta <= 120


def should_fetch_preview(race: dict[str, Any], now: datetime) -> bool:
    delta = minutes_to_close(race, now)
    return delta is not None and -30 <= delta <= 60


def compact_entry(entry: dict[str, Any]) -> dict[str, Any]:
    return {key: entry.get(key) for key in FACT_FIELDS if entry.get(key) is not None}


def fast_fetch_html(path: str, timeout: int = 12) -> str:
    # The overlay runs frequently; fail fast rather than holding publication for
    # a slow official response. The next 5-minute run will retry.
    return base.fetch_html(path, timeout=min(timeout, 5))


def enrich_one(
    venue_code: str,
    race: dict[str, Any],
    date_text: str,
    now: datetime,
) -> dict[str, Any]:
    current = copy.deepcopy(race)
    errors: list[str] = []

    if not official.has_static_stats(current):
        try:
            official.enrich_race_card(current, date_text, venue_code)
        except Exception as exc:  # best effort, preserve base facts
            errors.append(f"raceCard:{exc}")

    if should_fetch_preview(current, now):
        try:
            official.enrich_preview(current, date_text, venue_code)
        except Exception as exc:  # best effort, preserve base facts
            errors.append(f"preview:{exc}")

    result = {
        "venueCode": venue_code,
        "raceNumber": int(current.get("number") or 0),
        "closeTime": current.get("closeTime"),
        "entries": [compact_entry(entry) for entry in current.get("entries") or []],
        "environment": current.get("environment") or {},
        "carteSource": current.get("carteSource") or {},
    }
    if errors:
        result["warnings"] = errors
    return result


def build_overlay(payload: dict[str, Any], now: datetime, max_races: int = 18) -> dict[str, Any]:
    date_text = str(payload.get("date") or now.date().isoformat())
    candidates: list[tuple[str, dict[str, Any]]] = []
    for venue in payload.get("venues") or []:
        venue_code = str(venue.get("code") or "").zfill(2)
        for race in venue.get("races") or []:
            if len(race.get("entries") or []) != 6:
                continue
            if in_live_window(race, now):
                candidates.append((venue_code, race))

    candidates.sort(key=lambda item: priority(item, now))
    selected = candidates[:max_races]

    races: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = [
            pool.submit(enrich_one, venue_code, race, date_text, now)
            for venue_code, race in selected
        ]
        for future in as_completed(futures):
            races.append(future.result())

    order = {
        (venue_code, int(race.get("number") or 0)): index
        for index, (venue_code, race) in enumerate(selected)
    }
    races.sort(key=lambda race: order.get(
        (str(race.get("venueCode") or "").zfill(2), int(race.get("raceNumber") or 0)),
        999,
    ))

    return {
        "schemaVersion": 1,
        "date": date_text,
        "generatedAt": now.isoformat(),
        "source": {
            "type": "official-live-overlay",
            "raceCard": official.RACE_CARD_SOURCE,
            "preview": official.PREVIEW_SOURCE,
        },
        "races": races,
    }


def main() -> int:
    if not DATASET.exists():
        print("live race facts: data/today.json not found")
        return 0

    payload = json.loads(DATASET.read_text(encoding="utf-8"))
    now = jst_now()

    # Make the validated parser use a shorter network timeout for this live layer.
    official.fetch_html = fast_fetch_html

    overlay = build_overlay(payload, now)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(overlay, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"live race facts date={overlay['date']} races={len(overlay['races'])} "
        f"generatedAt={overlay['generatedAt']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
