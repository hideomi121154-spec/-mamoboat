#!/usr/bin/env python3
"""Build a lightweight live overlay for race facts shown in MAMO BOAT.

The full-day GitHub sync can be slow because BOAT RACE official pages sometimes
throttle GitHub runner IPs. This live layer asks the existing Supabase edge
network to fetch one official race at a time, then publishes only the races near
their deadline.
"""
from __future__ import annotations

import copy
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

JST = timezone(timedelta(hours=9))
DATASET = Path("data/today.json")
OUTPUT = Path("data/live-race-facts.json")
EDGE_URL = "https://mihicuoijitluvrufsoj.supabase.co/functions/v1/boatrace-race-facts"
PUBLISHABLE_KEY = "sb_publishable_cexgWfIKzthZ1d6tLOH3_g_sWgcunHB"

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
    if 0 <= delta <= 60:
        return (0, delta)
    if -30 <= delta < 0:
        return (1, abs(delta))
    if 60 < delta <= 120:
        return (2, delta)
    if delta > 120:
        return (3, delta)
    return (4, abs(delta))


def in_live_window(race: dict[str, Any], now: datetime) -> bool:
    delta = minutes_to_close(race, now)
    return delta is not None and -30 <= delta <= 120


def compact_entry(entry: dict[str, Any]) -> dict[str, Any]:
    return {key: entry.get(key) for key in FACT_FIELDS if entry.get(key) is not None}


def merge_nonempty(target: dict[str, Any], source: dict[str, Any], fields: tuple[str, ...]) -> None:
    for field in fields:
        value = source.get(field)
        if value is not None and value != "":
            target[field] = value


def fetch_edge_facts(date_text: str, venue_code: str, race_no: int) -> dict[str, Any]:
    body = json.dumps({
        "date": date_text,
        "venueCode": venue_code,
        "raceNo": race_no,
    }).encode("utf-8")
    request = Request(
        EDGE_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "apikey": PUBLISHABLE_KEY,
            "User-Agent": "MAMOBOAT-LiveFacts/1.0",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"edge fetch failed: {exc}") from exc
    if not payload.get("ok"):
        raise RuntimeError(f"edge returned error: {payload.get('error') or payload.get('status')}")
    return payload


def enrich_one(
    venue_code: str,
    race: dict[str, Any],
    date_text: str,
    _now: datetime,
) -> dict[str, Any]:
    current = copy.deepcopy(race)
    errors: list[str] = []

    try:
        live = fetch_edge_facts(date_text, venue_code, int(current.get("number") or 0))
        live_entries = {
            int(entry.get("boatNumber") or 0): entry
            for entry in live.get("entries") or []
        }
        for entry in current.get("entries") or []:
            live_entry = live_entries.get(int(entry.get("boatNumber") or 0))
            if live_entry:
                merge_nonempty(entry, live_entry, FACT_FIELDS)

        if isinstance(live.get("environment"), dict):
            current["environment"] = {
                **(current.get("environment") or {}),
                **live["environment"],
            }
        if isinstance(live.get("carteSource"), dict):
            current["carteSource"] = {
                **(current.get("carteSource") or {}),
                **live["carteSource"],
            }

        if live.get("status") not in {"available", "partial"}:
            errors.append(f"edgeStatus:{live.get('status')}")
    except Exception as exc:  # best effort, preserve base facts
        errors.append(str(exc))

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


def build_overlay(payload: dict[str, Any], now: datetime, max_races: int = 24) -> dict[str, Any]:
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
        "schemaVersion": 2,
        "date": date_text,
        "generatedAt": now.isoformat(),
        "source": {
            "type": "official-live-overlay",
            "transport": "supabase-edge",
        },
        "races": races,
    }


def main() -> int:
    if not DATASET.exists():
        print("live race facts: data/today.json not found")
        return 0

    payload = json.loads(DATASET.read_text(encoding="utf-8"))
    overlay = build_overlay(payload, jst_now())
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(overlay, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    errors = sum(1 for race in overlay["races"] if race.get("warnings"))
    print(
        f"live race facts date={overlay['date']} races={len(overlay['races'])} "
        f"errors={errors} generatedAt={overlay['generatedAt']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
