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
FW = str.maketrans("０１２３４５６７８９", "0123456789")


def hw(s):
    return str(s).translate(FW)


def num_or_none(s, typ=int):
    try:
        t = hw(s).strip()
        return typ(t) if t else None
    except Exception:
        return None


def iso(v):
    if not v:
        return None
    if getattr(v, "tzinfo", None) is None:
        v = v.replace(tzinfo=JST)
    return v.isoformat()


def detect_venue(lines, idx, current=None):
    """現在行と周辺行から場名を検出。"""
    start = max(0, idx - 8)
    end = min(len(lines), idx + 9)
    targets = [lines[idx]] + lines[start:end]
    for line in targets:
        normalized = line.replace("　", "").replace(" ", "")
        for name, code in NAME_TO_CODE.items():
            if name in normalized:
                return code
    return current


def parse_entry_fixed(line):
    """
    BOAT RACE公式番組表の固定幅行から最低限必要な出走情報を取得。
    旧来から使われている配置:
    艇番[0], 登番[2:6], 氏名[6:10], 年齢[10:12], 支部[12:14],
    体重[14:16], 級別[16:18], モーター[41:43], ボート[50:52]
    """
    if not re.match(r"^[1-6]\s*\d{4}", hw(line)):
        return None

    try:
        boat = int(hw(line[0:1]))
        racer = int(hw(line[2:6]))
    except Exception:
        # 空白位置が少し違う場合の保険
        m = re.match(r"^([1-6])\s*(\d{4})", hw(line))
        if not m:
            return None
        boat = int(m.group(1))
        racer = int(m.group(2))

    # 公式固定幅を優先
    name = line[6:10].strip().replace("　", " ")
    age = num_or_none(line[10:12])
    branch = line[12:14].strip().replace("　", " ") or None
    weight = num_or_none(line[14:16], float)
    racer_class = line[16:18].strip().replace("　", "") or None
    motor = num_or_none(line[41:43])
    boat_part = num_or_none(line[50:52])

    # 名前が取れなかった時だけ、登番直後から年齢までをゆるく拾う
    if not name:
        m = re.match(r"^[1-6]\s*\d{4}\s*([^\d]{2,12}?)\s*\d{2}", line)
        if m:
            name = m.group(1).strip().replace("　", " ")

    return {
        "boatNumber": boat,
        "racerNumber": racer,
        "name": name,
        "class": racer_class,
        "branch": branch,
        "age": age,
        "weight": weight,
        "motorNumber": motor,
        "boatPart": boat_part,
    }


def parse_header(line, target):
    """レース番号・レース名・締切を番組表ヘッダから取得。"""
    m = re.search(r"^\s*([0-9０-９]{1,2})[ＲRｒr]\s*(.*)$", line)
    if not m:
        return None

    race_no = int(hw(m.group(1)))
    rest = m.group(2)

    # レース名: H/Ｈ または電話投票締切予定より前
    name_part = re.split(r"[ＨH]\s*[0-9０-９]+|電話投票締切予定", rest, maxsplit=1)[0]
    race_name = re.sub(r"\s+", "", name_part.replace("　", " ")).strip()

    close_time = None
    cm = re.search(
        r"電話投票締切予定\s*([0-9０-９]{1,2})[：:]\s*([0-9０-９]{2})",
        line,
    )
    if cm:
        hour = int(hw(cm.group(1)))
        minute = int(hw(cm.group(2)))
        close_time = datetime(
            target.year, target.month, target.day, hour, minute, tzinfo=JST
        )

    return race_no, race_name, close_time


def parse_schedule_multivenue(files, target):
    """
    1日分のBファイル内に複数会場が入っていても解析する。
    boatrace-lzhのclose-time parserも補助的に利用する。
    """
    races = {}
    entries = defaultdict(list)

    # ライブラリの締切抽出は multi-venue 対応なので先に利用
    close_rows = []
    try:
        sp = ScheduleParser()
        close_rows = sp.parse_schedule_with_close_times(files, target)
    except Exception as ex:
        print("close-time parser warning:", ex)

    for r in close_rows:
        races[(r.venue_code, r.race_number)] = {
            "number": r.race_number,
            "name": r.race_name or "",
            "closeTime": r.close_time,
        }

    for filename, content in files.items():
        if not content:
            continue
        lines = content.splitlines()
        current_venue = None
        current_race = None

        for i, line in enumerate(lines):
            # 「番組表」付近、場名入りヘッダ、ボートレース○○等を拾う
            if (
                "番組表" in line
                or "ボートレース" in line
                or "［番組］" in line
                or "[番組]" in line
            ):
                current_venue = detect_venue(lines, i, current_venue)

            hdr = parse_header(line, target)
            if hdr:
                current_venue = detect_venue(lines, i, current_venue)
                if current_venue:
                    race_no, race_name, close_time = hdr
                    current_race = race_no
                    key = (current_venue, race_no)
                    base = races.get(key, {})
                    races[key] = {
                        "number": race_no,
                        "name": base.get("name") or race_name,
                        "closeTime": base.get("closeTime") or close_time,
                    }
                else:
                    current_race = None
                continue

            if current_venue and current_race:
                e = parse_entry_fixed(line)
                if e:
                    key = (current_venue, current_race)
                    # 同じ艇番を二重登録しない
                    if not any(x["boatNumber"] == e["boatNumber"] for x in entries[key]):
                        entries[key].append(e)

    # close parserで見つかったレースに選手を結合
    for key in list(races):
        entries[key].sort(key=lambda x: x["boatNumber"])

    return races, entries


def build(target: date, cache: Path):
    # 1日1個の公式番組表LZH + 1日1個の公式競走成績LZH
    dl = LzhDownloader(cache_dir=cache, max_workers=1, request_delay=0.5)

    sf = dl.download(target, "schedule")
    if not sf:
        raise RuntimeError(f"番組表取得失敗: {target}")

    races, entries = parse_schedule_multivenue(sf, target)

    perf_entries = defaultdict(list)
    payouts = defaultdict(list)
    perf_ok = False
    perf_race_count = 0
    perf_entry_count = 0
    perf_payout_count = 0

    try:
        pf = dl.download(target, "performance")
        if pf:
            pp = PerformanceParser()
            perf = pp.parse(pf)
            perf_ok = True
            perf_race_count = len(perf.races)
            perf_entry_count = len(perf.entries)
            perf_payout_count = len(perf.payouts)
            for e in perf.entries:
                perf_entries[(e.venue_code, e.race_number)].append(e)
            for p in perf.payouts:
                payouts[(p.venue_code, p.race_number)].append(p)
    except Exception as ex:
        print(f"performance pending: {ex}")

    active = {code for code, _ in races.keys()}

    payload = {
        "schemaVersion": 4,
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
            "scheduleFiles": list(sf.keys()),
            "performanceRaces": perf_race_count,
            "performanceEntries": perf_entry_count,
            "performancePayouts": perf_payout_count,
        },
    }

    for code, name in VENUES:
        vr = []
        keys = sorted(
            [k for k in races if k[0] == code],
            key=lambda k: k[1],
        )

        for key in keys:
            n = key[1]
            rr = races[key]
            es = entries.get(key, [])

            if len(es) != 6:
                payload["quality"]["warnings"].append(
                    f"{code}-{n}R entries={len(es)}"
                )

            result = None
            fin = [e for e in perf_entries[key] if e.result_position]
            fin.sort(key=lambda x: (x.result_position, x.boat_number))
            sans = [p for p in payouts[key] if p.ticket_type == "sanrensho"]

            if fin or sans:
                result = {
                    "finish": [
                        {
                            "position": e.result_position,
                            "boatNumber": e.boat_number,
                        }
                        for e in fin
                    ],
                    "sanrensho": [
                        {
                            "combination": p.winning_combination,
                            "payout": p.payout,
                            "popularity": p.popularity,
                        }
                        for p in sans
                    ],
                }

            vr.append(
                {
                    "number": n,
                    "name": rr.get("name", ""),
                    "closeTime": iso(rr.get("closeTime")),
                    "entries": es,
                    "result": result,
                }
            )

        if code in active and len(vr) != 12:
            payload["quality"]["warnings"].append(
                f"{code} race_count={len(vr)}"
            )

        payload["venues"].append(
            {
                "code": code,
                "name": name,
                "active": code in active,
                "races": vr,
                "boatcast": f"https://race.boatcast.jp/?jo={code}",
            }
        )

    return payload


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date")
    ap.add_argument("--output", default="data/today.json")
    ap.add_argument("--cache-dir", default=".cache/boatrace_lzh")
    args = ap.parse_args()

    target = (
        date.fromisoformat(args.date)
        if args.date
        else datetime.now(JST).date()
    )

    payload = build(target, Path(args.cache_dir))

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, ensure_ascii=False, indent=2)

    # 日付別アーカイブ
    dated = out.parent / f"{target.isoformat()}.json"
    dated.write_text(text, encoding="utf-8")

    # 今日の実行だけtoday.jsonを更新
    if target == datetime.now(JST).date() or out.name != "today.json":
        out.write_text(text, encoding="utf-8")

    active = sum(v["active"] for v in payload["venues"])
    race_count = sum(len(v["races"]) for v in payload["venues"])
    entrants = sum(
        len(r["entries"])
        for v in payload["venues"]
        for r in v["races"]
    )
    warnings = len(payload["quality"]["warnings"])

    print(
        f"{target}: {active} venues / {race_count} races / "
        f"{entrants} entries / warnings={warnings}"
    )
    print(
        "performance:",
        payload["quality"]["performanceRaces"],
        "races /",
        payload["quality"]["performanceEntries"],
        "entries /",
        payload["quality"]["performancePayouts"],
        "payouts",
    )


if __name__ == "__main__":
    main()
