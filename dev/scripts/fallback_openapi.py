#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
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
    for boat_key, racer in sorted((program.get("racers") or {}).items(), key=lambda pair: int(pair[0])):
        boat = int(boat_key)
        entries.append({
            "boatNumber": boat,
            "racerNumber": racer.get("number"),
            "name": str(racer.get("name") or "").replace(" ", ""),
            "class": racer.get("rank_number_source") or "",
            "branch": racer.get("branch_number_source") or "",
            "age": racer.get("age"),
            "weight": racer.get("weight"),
            "motorNumber": racer.get("motor_number"),
            "boatPart": racer.get("boat_number"),
        })
    return {
        "number": int(program.get("race_number") or 0),
        "name": program.get("subtitle") or "一般",
        "closeTime": close,
        "entries": entries,
        "result": convert_result(program.get("result")),
    }


def main():
    now = datetime.now(JST)
    target = now.date().isoformat()
    today_path = Path("data/today.json")
    current = read_json(today_path)
    if current and current.get("date") == target:
        print(f"today.json is already current: {target}")
        return

    url = f"https://boatraceopenapi.github.io/api/v1/{now.year}/{now.strftime('%Y%m%d')}.json"
    source = fetch_json(url)
    stadiums = (((source or {}).get("programs") or {}).get("stadiums") or {})
    if not stadiums:
        raise RuntimeError(f"fallback source has no programs for {target}")

    venue_rows = []
    schedule_races = 0
    completed_results = 0
    for code, name in VENUES:
        raw_stadium = stadiums.get(str(int(code))) or stadiums.get(code) or {}
        raw_races = raw_stadium.get("races") or {}
        programs = [value for _, value in sorted(raw_races.items(), key=lambda pair: int(pair[0]))]
        races = [convert_program(item, target) for item in programs]
        races = [race for race in races if race["number"]]
        schedule_races += len(races)
        completed_results += sum(1 for race in races if race.get("result"))
        first = programs[0] if programs else None
        event = None
        if first:
            grade_key = str(first.get("grade_number_source") or "ippan").lower()
            grade, grade_label = GRADE_MAP.get(grade_key, ("GENERAL", "一般"))
            day_number = first.get("day_number")
            event = {
                "title": first.get("title") or "開催情報",
                "dayNumber": day_number,
                "dayLabel": first.get("day_number_source") or (f"{day_number}日目" if day_number else "開催中"),
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
            "performance": "Boatrace Open API fallback",
            "performanceLoaded": completed_results > 0,
            "performanceComplete": False,
            "gradeSchedule": "fallback",
            "gradeScheduleLoaded": False,
            "odds": "未取得",
            "oddsPolicy": "自前同期復旧後に通常取得へ戻す",
            "fastResults": "Boatrace Open API fallback",
            "fastResultPolicy": "自前同期が前日止まりの場合のみ利用",
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
