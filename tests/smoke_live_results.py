#!/usr/bin/env python3
"""BOAT RACE公式結果を任意・低頻度で確認する手動スモークテスト。"""
import argparse
import importlib.util
import os
import sys
import time
from datetime import date
from pathlib import Path


if os.environ.get("MAMOBOAT_LIVE_SMOKE") != "1":
    print("SKIP: MAMOBOAT_LIVE_SMOKE=1 が未指定のため外部通信を実施しません。")
    raise SystemExit(0)

SCRIPT = Path(__file__).parents[1] / "scripts" / "sync_official_data.py"
SPEC = importlib.util.spec_from_file_location("mamoboat_live_sync", SCRIPT)
sync = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sync)

parser = argparse.ArgumentParser()
parser.add_argument("--date", default=date.today().isoformat())
parser.add_argument("--venues", nargs="+", required=True, help="場コード (例: 07 24)")
parser.add_argument("--race", type=int, default=1)
parser.add_argument("--wait", type=float, default=2.0)
args = parser.parse_args()

target = date.fromisoformat(args.date)
if not 1 <= args.race <= 12:
    parser.error("--race は1から12です")
codes = [str(code).zfill(2) for code in args.venues]
unknown = [code for code in codes if code not in sync.CODE_TO_NAME]
if unknown:
    parser.error(f"不明な場コード: {', '.join(unknown)}")

confirmed = []
waiting = []
errors = []
for index, code in enumerate(codes):
    if index:
        time.sleep(max(1.0, args.wait))
    try:
        result, url = sync.fetch_official_result_page(target, code, args.race)
        if result is None:
            waiting.append(code)
            print(f"WAITING: {code} {sync.CODE_TO_NAME[code]} (開催・結果なしを含む) {url}")
        else:
            confirmed.append(code)
            print(f"CONFIRMED: {code} {sync.CODE_TO_NAME[code]} {args.race}R {url}")
    except Exception as error:  # ネットワーク不可も未確認として明示する。
        errors.append(code)
        print(f"UNVERIFIED: {code} {sync.CODE_TO_NAME[code]}: {error}", file=sys.stderr)

print(f"SUMMARY confirmed={confirmed} waiting={waiting} unverified={errors}")
# 開催なし・結果待ちは失敗にしない。通信失敗だけ、実行環境の未確認を示す。
raise SystemExit(2 if errors else 0)
