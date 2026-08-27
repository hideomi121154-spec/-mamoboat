#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import unicodedata
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

JST = timezone(timedelta(hours=9))
VENUES = [
    ("01", "桐生"), ("02", "戸田"), ("03", "江戸川"), ("04", "平和島"),
    ("05", "多摩川"), ("06", "浜名湖"), ("07", "蒲郡"), ("08", "常滑"),
    ("09", "津"), ("10", "三国"), ("11", "びわこ"), ("12", "住之江"),
    ("13", "尼崎"), ("14", "鳴門"), ("15", "丸亀"), ("16", "児島"),
    ("17", "宮島"), ("18", "徳山"), ("19", "下関"), ("20", "若松"),
    ("21", "芦屋"), ("22", "福岡"), ("23", "唐津"), ("24", "大村"),
]
GRADE_MAP = {
    "sg": ("SG", "SG"), "pg1": ("PG1", "PGⅠ"), "g1": ("G1", "GⅠ"),
    "g2": ("G2", "GⅡ"), "g3": ("G3", "GⅢ"), "ippan": ("GENERAL", "一般"),
}
PAYOUT_MAP = {
    "win": "win", "place": "place", "exacta": "exacta", "quinella": "quinella",
    "quinella_place": "wide", "trifecta": "trifecta", "trio": "trio",
}
CLASS_MAP = {1: "A1", 2: "A2", 3: "B1", 4: "B2"}
PREFECTURES = {
    1: "北海道", 2: "青森", 3: "岩手", 4: "宮城", 5: "秋田", 6: "山形",
    7: "福島", 8: "茨城", 9: "栃木", 10: "群馬", 11: "埼玉", 12: "千葉",
    13: "東京", 14: "神奈川", 15: "新潟", 16: "富山", 17: "石川",
    18: "福井", 19: "山梨", 20: "長野", 21: "岐阜", 22: "静岡",
    23: "愛知", 24: "三重", 25: "滋賀", 26: "京都", 27: "大阪",
    28: "兵庫", 29: "奈良", 30: "和歌山", 31: "鳥取", 32: "島根",
    33: "岡山", 34: "広島", 35: "山口", 36: "徳島", 37: "香川",
    38: "愛媛", 39: "高知", 40: "福岡", 41: "佐賀", 42: "長崎",
    43: "熊本", 44: "大分", 45: "宮崎", 46: "鹿児島", 47: "沖縄",
}


def read_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def fetch_json(url: str):
    req = Request(url, headers={"User-Agent": "MAMO-BOAT/4.0.1 fallback"})
    with urlopen(req, timeout=30) as response:
        return json.load(response)


def normalize_combo(value):
    return str(value or "").replace("=", "-")


def convert_result(raw):
    if not isinstance(raw, dict) or not raw.get("racers"):
        return None
    finish = []
    statuses = []
    for boat_key, racer in raw.get("racers", {}).items():
        try:
            boat = int(boat_key)
        except Exception:
            continue
        place = racer.get("place_number")
        if isinstance(place, int) and place > 0:
            finish.append({
                "position": place,
                "boatNumber": boat,
                "racerNumber": racer.get("number"),
                "name": str(racer.get("name") or "").replace(" ", ""),
            })
            statuses.append({"boatNumber": boat, "racerNumber": racer.get("number"), "status": f"{place:02d}"})
    finish.sort(key=lambda item: item["position"])
    payouts = {name: [] for name in ("win", "place", "exacta", "quinella", "wide", "trifecta", "trio")}
    for source_key, target_key in PAYOUT_MAP.items():
        for item in raw.get("payouts", {}).get(source_key, []) or []:
            payouts[target_key].append({
                "combination": normalize_combo(item.get("combination")),
                "payout": int(item.get("amount") or 0),
                "popularity": None,
            })
    return {
        "finish": finish,
        "sanrensho": payouts["trifecta"],
        "payouts": payouts,
        "statuses": statuses,
        "refundBoats": [],
        "payoutStatus": "paid" if finish else "pending",
        "notEstablishedTypes": [],
        "settleable": bool(finish),
    }


def convert_program(program, target_date):
    close = program.get("closed_at")
    if close and "+" not in close and "T" not in close:
        close = close.replace(" ", "T") + "+09:00"
    entries = []
    if isinstance(program.get("boats"), list):
        racers = [
            (racer.get("racer_boat_number"), racer)
            for racer in program.get("boats") or []
        ]
    else:
        racers = list((program.get("racers") or {}).items())
    for boat_key, racer in sorted(racers, key=lambda pair: int(pair[0] or 0)):
        boat = int(boat_key or 0)
        if not boat:
            continue
        class_number = racer.get("racer_class_number")
        branch_number = racer.get("racer_branch_number")
        entries.append({
            "boatNumber": boat,
            "racerNumber": racer.get("racer_number") or racer.get("number"),
            "name": str(racer.get("racer_name") or racer.get("name") or "").replace(" ", ""),
            "class": CLASS_MAP.get(class_number, racer.get("rank_number_source") or ""),
            "branch": PREFECTURES.get(branch_number, racer.get("branch_number_source") or ""),
            "age": racer.get("racer_age") or racer.get("age"),
            "weight": racer.get("racer_weight") or racer.get("weight"),
            "motorNumber": racer.get("racer_assigned_motor_number") or racer.get("motor_number"),
            "boatPart": racer.get("racer_assigned_boat_number") or racer.get("boat_number"),
        })
    return {
        "number": int(program.get("number") or program.get("race_number") or 0),
        "name": program.get("subtitle") or "一般",
        "closeTime": close,
        "entries": entries,
        "result": convert_result(program.get("result")),
    }


def grade_details(program):
    label = unicodedata.normalize("NFKC", str(program.get("grade_label") or "")).upper()
    compact = label.replace(" ", "")
    if compact == "SG":
        return "SG", "SG"
    if compact in {"PG1", "PGI"}:
        return "PG1", "PGⅠ"
    if compact in {"G1", "GI"}:
        return "G1", "GⅠ"
    if compact in {"G2", "GII"}:
        return "G2", "GⅡ"
    if compact in {"G3", "GIII"}:
        return "G3", "GⅢ"
    grade_key = str(program.get("grade_number_source") or "ippan").lower()
    return GRADE_MAP.get(grade_key, ("GENERAL", "一般"))


def day_details(program):
    label = str(program.get("day_label") or program.get("day_number_source") or "")
    normalized = unicodedata.normalize("NFKC", label)
    match = re.search(r"\d+", normalized)
    number = int(match.group()) if match else program.get("day_number")
    return number, label or (f"{number}日目" if number else "開催中")


def main():
    now = datetime.now(JST)
    target = now.date().isoformat()
    today_path = Path("data/today.json")
    current = read_json(today_path)
    if current and current.get("date") == target:
        print(f"today.json is already current: {target}")
        return

    url = f"https://boatraceopenapi.github.io/programs/v3/{now.year}/{now.strftime('%Y%m%d')}.json"
    try:
        source = fetch_json(url)
    except HTTPError as error:
        if error.code == 404:
            print(f"fallback source is not published yet for {target}; keeping existing data")
            return
        raise
    raw_programs = (source or {}).get("programs") or []
    if not isinstance(raw_programs, list) or not raw_programs:
        raise RuntimeError(f"fallback source has no programs for {target}")
    programs_by_stadium = {}
    for program in raw_programs:
        stadium_number = int(program.get("stadium_number") or 0)
        if stadium_number:
            programs_by_stadium.setdefault(stadium_number, []).append(program)

    venue_rows = []
    schedule_races = 0
    completed_results = 0
    for code, name in VENUES:
        programs = sorted(
            programs_by_stadium.get(int(code), []),
            key=lambda item: int(item.get("number") or item.get("race_number") or 0),
        )
        races = [convert_program(item, target) for item in programs]
        races = [race for race in races if race["number"]]
        schedule_races += len(races)
        completed_results += sum(1 for race in races if race.get("result"))
        first = programs[0] if programs else None
        event = None
        if first:
            grade, grade_label = grade_details(first)
            day_number, day_label = day_details(first)
            event = {
                "title": first.get("title") or "開催情報",
                "dayNumber": day_number,
                "dayLabel": day_label,
                "eventDate": target,
                "startDate": None,
                "endDate": None,
                "grade": grade,
                "gradeLabel": grade_label,
                "gradeSource": "boatraceopenapi-fallback",
                "timeZone": None,
                "isFinalDay": False,
                "officialUrl": f"https://www.boatrace.jp/owpc/pc/race/raceindex?hd={now.strftime('%Y%m%d')}&jcd={code}",
            }
        venue_rows.append({
            "code": code,
            "name": name,
            "active": bool(races),
            "event": event,
            "races": races,
            "boatcast": f"https://race.boatcast.jp/?jo={code}",
        })

    active_venues = sum(1 for venue in venue_rows if venue["active"])
    payload = {
        "schemaVersion": 10,
        "date": target,
        "generatedAt": now.isoformat(),
        "source": {
            "type": "official-lzh",
            "schedule": "Boatrace Open API fallback (非公式・当日公開データ)",
            "performance": "未取得",
            "performanceLoaded": False,
            "performanceComplete": False,
            "gradeSchedule": "fallback",
            "gradeScheduleLoaded": False,
            "odds": "未取得",
            "oddsPolicy": "自前同期復旧後に通常取得へ戻す",
            "fastResults": "BOAT RACE 公式レース結果画面の終了レース限定チェック",
            "fastResultPolicy": "締切5分後から10分周期・未確定のみ・各場均等巡回・直列取得",
            "fallback": True,
            "fallbackUrl": url,
        },
        "venues": venue_rows,
        "quality": {
            "warnings": ["自前の公式同期が当日化できなかったため、Boatrace Open APIを一時フォールバックとして使用しています。"],
            "stats": {
                "scheduleVenues": active_venues,
                "scheduleRaces": schedule_races,
                "scheduleEntries": schedule_races * 6,
                "completedResultRaces": completed_results,
                "oddsRaces": 0,
            },
        },
    }
    Path("data").mkdir(exist_ok=True)
    today_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    Path(f"data/{target}.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"fallback updated {target}: {active_venues} venues / {schedule_races} races / {completed_results} results")


if __name__ == "__main__":
    main()
