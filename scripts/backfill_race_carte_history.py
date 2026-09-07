#!/usr/bin/env python3
"""Backfill Race Carte details for recent already-started/settled races."""
from __future__ import annotations

import argparse
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from pathlib import Path
from threading import Lock

from race_carte_official_v2 import (
    JST,
    close_dt,
    enrich_preview,
    enrich_race_card,
    enrich_result,
    has_static_stats,
    jst_now,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default="")
    parser.add_argument("--hours", type=float, default=8.0)
    parser.add_argument("--max-races", type=int, default=96)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--venue", default="", help="optional two-digit venue code")
    parser.add_argument("--race", type=int, default=0, help="optional 1-12 race number")
    return parser.parse_args()


def load_path(date_text: str) -> Path | None:
    today = jst_now().date().isoformat()
    candidates = [Path("data") / f"{date_text}.json"]
    if date_text == today:
        candidates.insert(0, Path("data/today.json"))
    return next((path for path in candidates if path.exists()), None)


def save_payload(path: Path, payload: dict) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    path.write_text(text, encoding="utf-8")
    dated = Path("data") / f"{payload.get('date')}.json"
    if dated != path:
        dated.write_text(text, encoding="utf-8")


def has_preview(race: dict) -> bool:
    env = race.get("environment") or {}
    entries = race.get("entries") or []
    present = lambda key: env.get(key) not in (None, "", "undefined", "null")
    has_env = all(present(key) for key in (
        "weather", "windSpeed", "waveHeight", "airTemperature", "waterTemperature",
    ))
    try:
        wind_speed = float(env.get("windSpeed") or 0)
    except (TypeError, ValueError):
        wind_speed = 0
        has_env = False
    if wind_speed > 0:
        has_env = has_env and present("windDirection")
    has_exhibition = bool(entries) and all(
        entry.get("exhibitionTime") is not None for entry in entries
    )
    return has_env and has_exhibition


def has_kimarite(race: dict) -> bool:
    result = race.get("result")
    return isinstance(result, dict) and bool(result.get("kimarite"))


def needs_work(race: dict) -> bool:
    return not (has_kimarite(race) and has_static_stats(race) and has_preview(race))


def enrich_one(code: str, race: dict, date_text: str) -> tuple[bool, int, int, int]:
    changed = False
    card_done = preview_done = result_done = 0

    if not has_static_stats(race):
        try:
            changed |= enrich_race_card(race, date_text, code)
            card_done = 1
        except Exception as exc:
            print(f"history race-card failed {code}-{race.get('number')}R: {exc}")

    if not has_preview(race):
        try:
            changed |= enrich_preview(race, date_text, code)
            preview_done = 1
        except Exception as exc:
            print(f"history preview failed {code}-{race.get('number')}R: {exc}")

    # Retry every closed race until kimarite is actually confirmed. The legacy
    # enrich_result() treats an empty dict as "no result" and returns early, so
    # use a temporary truthy marker only during the fetch. Never persist it.
    if not has_kimarite(race):
        marker = "_raceCartePendingKimarite"
        try:
            if not isinstance(race.get("result"), dict):
                race["result"] = {}
            result = race["result"]
            if not result:
                result[marker] = True
            changed |= enrich_result(race, date_text, code)
            result_done = 1
        except Exception as exc:
            print(f"history result failed {code}-{race.get('number')}R: {exc}")
        finally:
            result = race.get("result")
            if isinstance(result, dict):
                result.pop(marker, None)

    return changed, card_done, preview_done, result_done


def main() -> int:
    args = parse_args()
    now = jst_now()
    date_text = args.date.strip() or now.date().isoformat()
    path = load_path(date_text)
    if not path:
        print(f"race-carte history backfill: dataset not found for {date_text}")
        return 0

    payload = json.loads(path.read_text(encoding="utf-8"))
    cutoff = now - timedelta(hours=max(0.5, args.hours))
    targets: list[tuple[str, dict]] = []

    for venue in payload.get("venues") or []:
        code = str(venue.get("code") or "").zfill(2)
        if args.venue and code != args.venue.zfill(2):
            continue
        for race in venue.get("races") or []:
            if args.race and int(race.get("number") or 0) != args.race:
                continue
            close = close_dt(race)
            if not close or close > now + timedelta(minutes=15) or close < cutoff:
                continue
            if race.get("entries") and needs_work(race):
                targets.append((code, race))

    # Never spend the capped request budget on already-complete races. Within
    # incomplete races: missing kimarite first, then missing racer/motor stats,
    # then missing preview/environment; older closed races win ties.
    targets.sort(key=lambda item: (
        0 if not has_kimarite(item[1]) else 1,
        0 if not has_static_stats(item[1]) else 1,
        0 if not has_preview(item[1]) else 1,
        (close_dt(item[1]) or datetime(1970, 1, 1, tzinfo=JST)).timestamp(),
    ))
    targets = targets[: max(0, args.max_races)]

    changed = False
    card_done = preview_done = result_done = 0
    counter_lock = Lock()

    with ThreadPoolExecutor(max_workers=max(1, min(12, args.workers))) as executor:
        futures = [executor.submit(enrich_one, code, race, date_text) for code, race in targets]
        for future in as_completed(futures):
            try:
                race_changed, c, p, r = future.result()
            except Exception as exc:
                print(f"history worker failed: {exc}")
                continue
            with counter_lock:
                changed |= race_changed
                card_done += c
                preview_done += p
                result_done += r

    payload.setdefault("source", {})["raceCarteHistoryBackfill"] = (
        "recent incomplete races via validated official racelist/beforeinfo/raceresult; "
        "missing kimarite and missing stats retried until confirmed"
    )
    payload["raceCarteHistoryBackfilledAt"] = now.isoformat()
    if changed:
        save_payload(path, payload)

    print(
        f"race-carte history backfill date={date_text} targets={len(targets)} changed={changed} "
        f"raceCards={card_done} previews={preview_done} results={result_done} workers={max(1, min(12, args.workers))}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
