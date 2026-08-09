#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from boatrace_lzh import LzhDownloader, ScheduleParser, PerformanceParser

JST = timezone(timedelta(hours=9))

VENUES = [
    ("01","桐生"),("02","戸田"),("03","江戸川"),("04","平和島"),
    ("05","多摩川"),("06","浜名湖"),("07","蒲郡"),("08","常滑"),
    ("09","津"),("10","三国"),("11","びわこ"),("12","住之江"),
    ("13","尼崎"),("14","鳴門"),("15","丸亀"),("16","児島"),
    ("17","宮島"),("18","徳山"),("19","下関"),("20","若松"),
    ("21","芦屋"),("22","福岡"),("23","唐津"),("24","大村"),
]
NAME_TO_CODE = {name: code for code, name in VENUES}
CODE_TO_NAME = dict(VENUES)

FW = str.maketrans(
    "０１２３４５６７８９Ｒ：",
    "0123456789R:"
)

def hw(s: str) -> str:
    return str(s).translate(FW)

def number(s, typ=int):
    try:
        s = hw(s).strip()
        return typ(s) if s else None
    except Exception:
        return None

def iso(dt):
    if not dt:
        return None
    if getattr(dt, "tzinfo", None) is None:
        dt = dt.replace(tzinfo=JST)
    return dt.isoformat()

def detect_file_venue(lines):
    # Bファイルは基本的に会場単位のテキスト。
    # ヘッダ部分を中心に会場名を一度だけ特定する。
    for line in lines[:120]:
        compact = line.replace("　", "").replace(" ", "")
        for name, code in NAME_TO_CODE.items():
            if name in compact:
                return code

    # 念のため全体も探索
    for line in lines:
        compact = line.replace("　", "").replace(" ", "")
        for name, code in NAME_TO_CODE.items():
            if name in compact:
                return code
    return None

def race_header(line, target):
    s = hw(line)
    m = re.search(r"^\s*([0-9]{1,2})R\s*(.*)$", s)
    if not m:
        return None

    race_no = int(m.group(1))
    if not 1 <= race_no <= 12:
        return None

    rest = m.group(2)
    # 「H1800m」や「電話投票締切予定」より前をレース名として扱う
    race_name = re.split(
        r"[HＨ]\s*[0-9０-９]+|電話投票締切予定",
        line,
        maxsplit=1
    )[0]
    race_name = re.sub(
        r"^\s*[0-9０-９]{1,2}[ＲR]\s*",
        "",
        race_name
    )
    race_name = re.sub(r"\s+", "", race_name.replace("　", " ")).strip()

    close_time = None
    cm = re.search(
        r"電話投票締切予定\s*([0-9０-９]{1,2})[：:]\s*([0-9０-９]{2})",
        line
    )
    if cm:
        close_time = datetime(
            target.year, target.month, target.day,
            int(hw(cm.group(1))), int(hw(cm.group(2))),
            tzinfo=JST
        )

    return race_no, race_name, close_time

def parse_entry(line):
    # 行頭空白やBOMがあっても艇番＋登録番号を検出する
    row = line.lstrip("\ufeff \t")
    ascii_row = hw(row)

    m = re.match(r"^([1-6])\s*(\d{4})", ascii_row)
    if not m:
        return None

    boat_no = int(m.group(1))
    racer_no = int(m.group(2))

    # 公式Bファイルの固定幅。
    # 古くから利用されているBファイルパーサーの位置に合わせる。
    # 艇[0] 登番[2:6] 氏名[6:10] 年齢[10:12] 支部[12:14]
    # 体重[14:16] 級別[16:18] モーター[41:43] ボート[50:52]
    try:
        name = row[6:10].strip().replace("　", " ")
        age = number(row[10:12])
        branch = row[12:14].strip().replace("　", " ") or None
        weight = number(row[14:16], float)
        racer_class = row[16:18].strip().replace("　", "") or None
        motor = number(row[41:43])
        boat_part = number(row[50:52])
    except Exception:
        name = ""
        age = branch = weight = racer_class = motor = boat_part = None

    # 固定幅で氏名が空なら登録番号の後ろから補助抽出
    if not name:
        mm = re.match(
            r"^[1-6]\s*\d{4}\s*([^\d]{2,12}?)\s*[0-9０-９]{2}",
            row
        )
        if mm:
            name = mm.group(1).strip().replace("　", " ")

    return {
        "boatNumber": boat_no,
        "racerNumber": racer_no,
        "name": name,
        "class": racer_class,
        "branch": branch,
        "age": age,
        "weight": weight,
        "motorNumber": motor,
        "boatPart": boat_part,
    }

def collect_entries_after_header(lines, header_index):
    """
    レース見出し後から最初の選手行を探し、
    そこから1〜6号艇を最大6人まとめて取得する。

    Bファイルには見出しと出走行の間に複数の項目見出し行があるため、
    「今のrace状態で全行を走査」せず、レース単位でブロックを切る。
    """
    found = []
    started = False

    # 次のレースヘッダまで十分収まる範囲
    for j in range(header_index + 1, min(len(lines), header_index + 28)):
        line = lines[j]

        # 次R見出しに到達したら終了
        if race_header(line, date(2000,1,1)):
            break

        entry = parse_entry(line)
        if entry:
            started = True
            if entry["boatNumber"] not in {x["boatNumber"] for x in found}:
                found.append(entry)
            if len(found) == 6:
                break
        elif started:
            # 出走行が始まった後は空行などを許容しつつ少しだけ継続
            # 6艇未満でも次ヘッダまで探索
            pass

    return sorted(found, key=lambda x: x["boatNumber"])

def parse_schedule(files, target):
    races = {}
    entries = defaultdict(list)
    debug = []

    # ライブラリ側の締切時刻抽出を補助的に使用
    try:
        sp = ScheduleParser()
        close_rows = sp.parse_schedule_with_close_times(files, target)
    except Exception as ex:
        close_rows = []
        debug.append(f"close parser warning: {ex}")

    for r in close_rows:
        races[(r.venue_code, r.race_number)] = {
            "number": r.race_number,
            "name": r.race_name or "",
            "closeTime": r.close_time
        }

    for filename, content in files.items():
        lines = content.splitlines()
        venue_code = detect_file_venue(lines)

        if not venue_code:
            debug.append(f"{filename}: venue not detected")
            continue

        found_races = 0
        found_entries = 0

        for i, line in enumerate(lines):
            hdr = race_header(line, target)
            if not hdr:
                continue

            race_no, race_name, close_time = hdr
            key = (venue_code, race_no)
            base = races.get(key, {})

            races[key] = {
                "number": race_no,
                "name": base.get("name") or race_name,
                "closeTime": base.get("closeTime") or close_time,
            }

            es = collect_entries_after_header(lines, i)
            if es:
                entries[key] = es

            found_races += 1
            found_entries += len(es)

        debug.append(
            f"{filename}: {venue_code} {CODE_TO_NAME[venue_code]} "
            f"{found_races} races / {found_entries} entries"
        )

    return races, entries, debug

def build_payload(target, cache_dir):
    dl = LzhDownloader(
        cache_dir=cache_dir,
        max_workers=1,
        request_delay=0.5
    )

    schedule_files = dl.download(target, "schedule")
    if not schedule_files:
        raise RuntimeError(f"番組表を取得できませんでした: {target}")

    races, entries, parse_debug = parse_schedule(schedule_files, target)

    perf_entries = defaultdict(list)
    payouts = defaultdict(list)
    perf_ok = False
    perf_debug = None

    try:
        performance_files = dl.download(target, "performance")
        if performance_files:
            pp = PerformanceParser()
            perf = pp.parse(performance_files)
            perf_ok = True
            for e in perf.entries:
                perf_entries[(e.venue_code, e.race_number)].append(e)
            for p in perf.payouts:
                payouts[(p.venue_code, p.race_number)].append(p)
            perf_debug = (
                f"{len(perf.races)} races / "
                f"{len(perf.entries)} entries / "
                f"{len(perf.payouts)} payouts"
            )
    except Exception as ex:
        perf_debug = f"performance pending: {ex}"

    active_codes = {code for code, _ in races.keys()}

    payload = {
        "schemaVersion": 6,
        "date": target.isoformat(),
        "generatedAt": datetime.now(JST).isoformat(),
        "source": {
            "type": "official-lzh",
            "schedule": "BOAT RACE 番組表ダウンロード",
            "performance": "BOAT RACE 競走成績ダウンロード",
            "performanceLoaded": perf_ok,
        },
        "venues": [],
        "quality": {
            "warnings": [],
            "debug": parse_debug,
            "performanceDebug": perf_debug,
            "scheduleFiles": list(schedule_files.keys()),
        },
    }

    for code, venue_name in VENUES:
        vraces = []

        keys = sorted(
            [k for k in races.keys() if k[0] == code],
            key=lambda x: x[1]
        )

        for key in keys:
            race_no = key[1]
            rr = races[key]
            es = entries.get(key, [])

            if len(es) != 6:
                payload["quality"]["warnings"].append(
                    f"{code}-{race_no}R entries={len(es)}"
                )

            result = None
            finish = [
                e for e in perf_entries.get(key, [])
                if e.result_position
            ]
            finish.sort(
                key=lambda x: (x.result_position, x.boat_number)
            )

            sanrensho = [
                p for p in payouts.get(key, [])
                if p.ticket_type == "sanrensho"
            ]

            if finish or sanrensho:
                result = {
                    "finish": [
                        {
                            "position": e.result_position,
                            "boatNumber": e.boat_number,
                        }
                        for e in finish
                    ],
                    "sanrensho": [
                        {
                            "combination": p.winning_combination,
                            "payout": p.payout,
                            "popularity": p.popularity,
                        }
                        for p in sanrensho
                    ],
                }

            vraces.append({
                "number": race_no,
                "name": rr.get("name", ""),
                "closeTime": iso(rr.get("closeTime")),
                "entries": es,
                "result": result,
            })

        if code in active_codes and len(vraces) != 12:
            payload["quality"]["warnings"].append(
                f"{code} race_count={len(vraces)}"
            )

        payload["venues"].append({
            "code": code,
            "name": venue_name,
            "active": code in active_codes,
            "races": vraces,
            "boatcast": f"https://race.boatcast.jp/?jo={code}",
        })

    return payload

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument("--output", default="data/today.json")
    parser.add_argument("--cache-dir", default=".cache/boatrace_lzh")
    args = parser.parse_args()

    target = (
        date.fromisoformat(args.date)
        if args.date
        else datetime.now(JST).date()
    )

    payload = build_payload(target, Path(args.cache_dir))

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, ensure_ascii=False, indent=2)

    # 日付別データも保存
    dated = output.parent / f"{target.isoformat()}.json"
    dated.write_text(text, encoding="utf-8")

    # 今日のデータならtoday.jsonを更新
    if target == datetime.now(JST).date():
        output.write_text(text, encoding="utf-8")

    active = sum(v["active"] for v in payload["venues"])
    race_count = sum(len(v["races"]) for v in payload["venues"])
    entry_count = sum(
        len(r["entries"])
        for v in payload["venues"]
        for r in v["races"]
    )
    warnings = len(payload["quality"]["warnings"])

    print(
        f"{target}: {active} venues / {race_count} races / "
        f"{entry_count} entries / warnings={warnings}"
    )
    print("---- schedule files ----")
    for line in payload["quality"]["debug"]:
        print(line)
    print("performance:", payload["quality"]["performanceDebug"])

if __name__ == "__main__":
    main()
