#!/usr/bin/env python3
"""Repair missing Race Carte environment snapshots from BOAT RACE beforeinfo.

The normal enrichment job intentionally focuses on a narrow window around the
race close time. If that window is missed because many venues settle together,
a finished Race Carte can keep showing 未保存 forever. This repair pass revisits
settled/current-day races whose environment is still incomplete.
"""
from __future__ import annotations

import argparse
import os
import time
from datetime import datetime
from typing import Any

from enrich_race_carte_data import JST, dataset_path, jst_now, load_json, save_json
from race_carte_official_v2 import enrich_preview

ENV_FIELDS = (
    "weather",
    "windDirection",
    "windSpeed",
    "waveHeight",
    "airTemperature",
    "waterTemperature",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=os.getenv("TARGET_DATE") or "")
    parser.add_argument("--max-races", type=int, default=48)
    parser.add_argument("--sleep", type=float, default=0.03)
    return parser.parse_args()


def target_date(value: str) -> str:
    return value.strip() or jst_now().date().isoformat()


def close_dt(race: dict[str, Any]) -> datetime | None:
    raw = race.get("closeTime")
    if not raw:
        return None
    try:
        value = datetime.fromisoformat(str(raw))
        return value if value.tzinfo else value.replace(tzinfo=JST)
    except ValueError:
        return None


def missing_environment(race: dict[str, Any]) -> bool:
    env = race.get("environment") or {}
    return any(env.get(field) in (None, "") for field in ENV_FIELDS)


def main() -> int:
    args = parse_args()
    date_text = target_date(args.date)
    path = dataset_path(date_text)
    if not path:
        print(f"environment repair: dataset not found for {date_text}")
        return 0

    payload = load_json(path)
    now = jst_now()
    targets: list[tuple[str, dict[str, Any]]] = []

    for venue in payload.get("venues") or []:
        code = str(venue.get("code") or "").zfill(2)
        for race in venue.get("races") or []:
            close = close_dt(race)
            if not close or close > now:
                continue
            # Revisit races that have settled or are old enough that beforeinfo is
            # stable, but only when at least one environment field is still empty.
            if missing_environment(race):
                targets.append((code, race))

    # Most recent finished races first so a user opening a fresh Race Carte gets
    # repaired before older history. Repeated 5-minute runs will catch the rest.
    targets.sort(
        key=lambda item: (close_dt(item[1]) or datetime(1970, 1, 1, tzinfo=JST)).timestamp(),
        reverse=True,
    )

    changed = False
    attempted = 0
    repaired = 0
    for code, race in targets[: max(0, args.max_races)]:
        attempted += 1
        try:
            before = dict(race.get("environment") or {})
            if enrich_preview(race, date_text, code):
                changed = True
            after = race.get("environment") or {}
            if after != before and not missing_environment(race):
                repaired += 1
        except Exception as exc:
            print(f"environment repair failed {code}-{race.get('number')}R: {exc}")
        time.sleep(max(0.0, args.sleep))

    if changed:
        save_json(path, payload)

    print(
        f"environment repair date={date_text} targets={len(targets)} "
        f"attempted={attempted} repaired_complete={repaired} changed={changed}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
