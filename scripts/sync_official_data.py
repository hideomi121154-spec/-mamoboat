#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import tempfile
import time
import unicodedata
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Mapping
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
NAME_TO_CODE = {name: code for code, name in VENUES}
CODE_TO_NAME = dict(VENUES)

PAYOUT_TYPES = (
    "win", "place", "exacta", "quinella", "wide", "trifecta", "trio",
)
PAYOUT_LABEL_TO_TYPE = {
    "単勝": "win",
    "複勝": "place",
    "2連単": "exacta",
    "2連複": "quinella",
    "拡連複": "wide",
    "3連単": "trifecta",
    "3連複": "trio",
}

CONTROL_RE = re.compile(r"^\s*([0-9]{2})([BK])(BGN|END)\s*$")
RESULT_STATUS_RE = re.compile(
    r"^(?:0[1-6]|[FLSK][0-9]?|転|転覆|落|落水|沈|沈没|失|失格|"
    r"妨|妨害|欠|欠場|不|不完走|返|返還|除|除外)$"
)

GRADE_PAGE_URL = "https://www.boatrace.jp/owpc/pc/race/gradesch"
GRADE_PAGE_CATEGORIES = ("01", "02", "03")
GRADE_LABELS = {
    "SG": "SG",
    "PG1": "PG1",
    "G1": "GⅠ",
    "G2": "GⅡ",
    "G3": "GⅢ",
    "GENERAL": "一般",
}
TIME_ZONE_CLASSES = {
    "is-morning": "morning",
    "is-summer": "summer",
    "is-nighter": "night",
    "is-midnight": "midnight",
}


def normalized(value: Any) -> str:
    return unicodedata.normalize("NFKC", str(value))


def number(value: Any, typ=int):
    try:
        text = normalized(value).strip().replace(",", "")
        return typ(text) if text else None
    except (TypeError, ValueError):
        return None


def iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=JST)
    return value.isoformat()


def ensure_text(content: str | bytes) -> str:
    if isinstance(content, str):
        return content
    for encoding in ("utf-8-sig", "utf-8", "cp932", "shift_jis"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    return content.decode("cp932", errors="replace")


def compact_text(value: Any) -> str:
    """公式公開テキストの全角英数・全角空白を表示用に整える。"""
    return re.sub(r"\s+", " ", normalized(value)).strip()


class OfficialGradeScheduleParser(HTMLParser):
    """
    公式グレード日程の表から事実データだけを取り出す。

    画像・CSS・公式ロゴは保存せず、開催期間、場、グレード、
    大会名、時間帯のみを取り出す。
    """

    def __init__(self, year: int, category: str):
        super().__init__(convert_charrefs=True)
        self.year = year
        self.category = category
        self.events: list[dict[str, Any]] = []
        self._row: list[dict[str, Any]] | None = None
        self._cell: dict[str, Any] | None = None

    def handle_starttag(self, tag: str, attrs):
        attributes = dict(attrs)
        if tag == "tr":
            self._row = []
            self._cell = None
        elif tag == "td" and self._row is not None:
            self._cell = {
                "classes": set((attributes.get("class") or "").split()),
                "text": [],
                "imageAlt": None,
            }
            self._row.append(self._cell)
        elif tag == "img" and self._cell is not None:
            alt = compact_text(attributes.get("alt") or "")
            if alt:
                self._cell["imageAlt"] = alt

    def handle_data(self, data: str):
        if self._cell is not None:
            self._cell["text"].append(data)

    def handle_endtag(self, tag: str):
        if tag == "td":
            self._cell = None
        elif tag == "tr" and self._row is not None:
            event = self._parse_row(self._row)
            if event:
                self.events.append(event)
            self._row = None
            self._cell = None

    def _parse_row(self, cells: list[dict[str, Any]]):
        date_text = ""
        venue_name = ""
        title = ""
        grade = None
        time_zone = None

        for cell in cells:
            classes = cell["classes"]
            text = compact_text("".join(cell["text"]))
            if "td_date" in classes:
                date_text = text
            if cell.get("imageAlt") in NAME_TO_CODE:
                venue_name = cell["imageAlt"]
            if "is-alignL" in classes and text:
                title = text
            for class_name in classes:
                match = re.fullmatch(r"is-(SG|G1|G2|G3)([ab])", class_name)
                if not match:
                    continue
                raw_grade, group = match.groups()
                if raw_grade == "G1" and group == "a" and self.category == "01":
                    grade = "PG1"
                else:
                    grade = raw_grade
                break
            for class_name, zone in TIME_ZONE_CLASSES.items():
                if class_name in classes:
                    time_zone = zone

        dates = parse_grade_date_range(date_text, self.year)
        if not dates or not venue_name or not grade or not title:
            return None
        start_date, end_date = dates
        return {
            "venueCode": NAME_TO_CODE[venue_name],
            "venueName": venue_name,
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "grade": grade,
            "gradeLabel": GRADE_LABELS[grade],
            "title": title,
            "timeZone": time_zone,
        }


def parse_grade_date_range(value: str, year: int):
    match = re.fullmatch(
        r"\s*(\d{1,2})/(\d{1,2})\s*-\s*(\d{1,2})/(\d{1,2})\s*",
        normalized(value),
    )
    if not match:
        return None
    start_month, start_day, end_month, end_day = map(int, match.groups())
    end_year = year + 1 if end_month < start_month else year
    try:
        return (
            date(year, start_month, start_day),
            date(end_year, end_month, end_day),
        )
    except ValueError:
        return None


def parse_grade_schedule_html(content: str | bytes, year: int, category: str):
    parser = OfficialGradeScheduleParser(year, category)
    parser.feed(ensure_text(content))
    return parser.events


def fetch_official_grade_schedule(year: int):
    """公式の年間グレード日程を3ページ、直列・低頻度で取得する。"""
    events: list[dict[str, Any]] = []
    pages: list[str] = []
    for index, category in enumerate(GRADE_PAGE_CATEGORIES):
        url = f"{GRADE_PAGE_URL}?year={year}&hcd={category}"
        request = Request(
            url,
            headers={
                "User-Agent": "mamoboat-personal/3.2 (+official-grade-cache)",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "ja",
            },
        )
        with urlopen(request, timeout=60) as response:
            html = response.read()
        parsed = parse_grade_schedule_html(html, year, category)
        if not parsed:
            raise RuntimeError(
                f"公式グレード日程を解析できません: year={year} hcd={category}"
            )
        events.extend(parsed)
        pages.append(url)
        if index + 1 < len(GRADE_PAGE_CATEGORIES):
            time.sleep(1.0)
    events.sort(key=lambda item: (item["startDate"], item["venueCode"], item["grade"]))
    return {
        "schemaVersion": 1,
        "year": year,
        "generatedAt": datetime.now(JST).isoformat(),
        "source": {
            "type": "official-grade-schedule",
            "pages": pages,
            "policy": "weekly-cache",
        },
        "events": events,
    }


def read_grade_schedule(path: Path | None):
    if not path or not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return None
    if payload.get("source", {}).get("type") != "official-grade-schedule":
        return None
    if not isinstance(payload.get("events"), list):
        return None
    return payload


def event_for_date(
    events: list[dict[str, Any]] | None,
    target: date,
    venue_code: str,
):
    for event in events or []:
        if event.get("venueCode") != venue_code:
            continue
        try:
            start = date.fromisoformat(event["startDate"])
            end = date.fromisoformat(event["endDate"])
        except (KeyError, TypeError, ValueError):
            continue
        if start <= target <= end:
            return event
    return None


def control_marker(line: str, expected_kind: str | None = None):
    match = CONTROL_RE.fullmatch(normalized(line))
    if not match:
        return None
    code, kind, phase = match.groups()
    if expected_kind and kind != expected_kind:
        return None
    return code, phase


def detect_venue_header(line: str) -> str | None:
    """会場見出しを検出する。BBGN/KBGNがない異常ファイル用の補助判定。"""
    compact = re.sub(r"\s+", "", normalized(line).replace("\u3000", ""))
    if "ボートレース" not in compact:
        return None
    for name in sorted(NAME_TO_CODE, key=len, reverse=True):
        if f"ボートレース{name}" in compact:
            return NAME_TO_CODE[name]
    return None


def race_header(line: str, target: date):
    """Bファイル見出しからR番号、名称、電話投票締切予定を得る。"""
    text = normalized(line)
    match = re.match(r"^\s*([0-9]{1,2})R\s+(.*)$", text)
    if not match:
        return None

    race_no = int(match.group(1))
    if not 1 <= race_no <= 12:
        return None

    rest = match.group(2)
    raw_name = re.split(
        r"H\s*[0-9]+\s*m|電話投票締切予定",
        rest,
        maxsplit=1,
    )[0]
    # 「進入固定戦隊 進入固定」のような場合は末尾の区分だけを除く。
    raw_name = re.sub(r"\s+進入固定\s*$", "", raw_name)
    race_name = re.sub(r"\s+", "", raw_name).strip()

    close_time = None
    close_match = re.search(
        r"電話投票締切予定\s*([0-9]{1,2})\s*:\s*([0-9]{2})",
        text,
    )
    if close_match:
        close_time = datetime(
            target.year,
            target.month,
            target.day,
            int(close_match.group(1)),
            int(close_match.group(2)),
            tzinfo=JST,
        )

    return race_no, race_name, close_time


def parse_entry(line: str):
    """公式Bファイルの固定幅選手行を解析する。"""
    row = line.lstrip("\ufeff \t")
    ascii_row = normalized(row)
    match = re.match(r"^([1-6])\s*(\d{4})", ascii_row)
    if not match:
        return None

    boat_no = int(match.group(1))
    racer_no = int(match.group(2))

    # 公式Bファイルの固定幅（文字位置）。
    # 艇[0] 登番[2:6] 氏名[6:10] 年齢[10:12] 支部[12:14]
    # 体重[14:16] 級別[16:18] モーター[41:43] ボート[50:52]
    name = row[6:10].strip().replace("\u3000", " ")
    age = number(row[10:12])
    branch = row[12:14].strip().replace("\u3000", " ") or None
    weight = number(row[14:16], float)
    racer_class = normalized(row[16:18]).strip() or None
    motor = number(row[41:43])
    boat_part = number(row[50:52])

    if not name:
        fallback = re.match(
            r"^[1-6]\s*\d{4}\s*([^\d]{2,12}?)\s*[0-9]{2}",
            ascii_row,
        )
        if fallback:
            name = fallback.group(1).strip().replace("\u3000", " ")

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


def collect_entries_after_header(lines: list[str], header_index: int):
    """次のR見出しまたはB制御行までから、1〜6号艇を取得する。"""
    found: list[dict[str, Any]] = []
    seen_boats: set[int] = set()

    for line in lines[header_index + 1:]:
        if control_marker(line, "B") or race_header(line, date(2000, 1, 1)):
            break
        entry = parse_entry(line)
        if not entry:
            continue
        boat_no = entry["boatNumber"]
        if boat_no not in seen_boats:
            found.append(entry)
            seen_boats.add(boat_no)
        if len(found) == 6:
            break

    return sorted(found, key=lambda item: item["boatNumber"])


def parse_b_event_block(
    lines: list[str],
    marker_index: int,
    venue_code: str,
    target: date,
):
    """BBGN直後の実際の見出しから大会名・開催日数を取得する。"""
    block: list[str] = []
    for line in lines[marker_index + 1:marker_index + 24]:
        if control_marker(line, "B") or race_header(line, target):
            break
        block.append(line)

    day_number = None
    event_date = None
    title = ""
    after_program_heading = False

    for line in block:
        text = compact_text(line)
        if not text:
            continue

        if day_number is None:
            day_match = re.search(r"第\s*([0-9]+)\s*日", text)
            if day_match:
                day_number = int(day_match.group(1))

        if event_date is None:
            date_match = re.search(
                r"([0-9]{4})\s*年\s*([0-9]{1,2})\s*月\s*([0-9]{1,2})\s*日",
                text,
            )
            if date_match:
                try:
                    event_date = date(*map(int, date_match.groups()))
                except ValueError:
                    event_date = None

        if "*** 番組表 ***" in text or "***番組表***" in text:
            after_program_heading = True
            continue

        if after_program_heading and not title:
            excluded = (
                "ボートレース" in text
                or "内容について" in text
                or bool(re.fullmatch(r"-+", text))
                or bool(re.match(r"^第\s*[0-9]+\s*日\s+[0-9]{4}年", text))
            )
            if not excluded:
                title = text

    start_date = None
    effective_date = event_date or target
    if day_number and day_number > 0:
        start_date = effective_date - timedelta(days=day_number - 1)

    return {
        "title": title,
        "dayNumber": day_number,
        "dayLabel": f"{day_number}日目" if day_number else None,
        "eventDate": effective_date.isoformat(),
        "startDate": start_date.isoformat() if start_date else None,
        "endDate": None,
        "grade": "GENERAL",
        "gradeLabel": GRADE_LABELS["GENERAL"],
        "gradeSource": "default",
        "timeZone": None,
    }


def _parse_schedule(files: Mapping[str, str | bytes], target: date):
    races: dict[tuple[str, int], dict[str, Any]] = {}
    entries: dict[tuple[str, int], list[dict[str, Any]]] = defaultdict(list)
    events: dict[str, dict[str, Any]] = {}
    debug: list[str] = []
    warnings: list[str] = []
    venue_race_counts: dict[str, int] = defaultdict(int)
    venue_entry_counts: dict[str, int] = defaultdict(int)

    for filename, raw_content in files.items():
        lines = ensure_text(raw_content).splitlines()
        current_venue: str | None = None
        marker_open = False
        file_headers = 0
        file_entries = 0
        file_begins = 0
        file_ends = 0
        file_fallbacks = 0

        for index, line in enumerate(lines):
            marker = control_marker(line, "B")
            if marker:
                code, phase = marker
                if code not in CODE_TO_NAME:
                    warnings.append(f"{filename}:{index + 1} unknown B venue code={code}")
                    current_venue = None
                    marker_open = False
                    continue
                if phase == "BGN":
                    if marker_open:
                        warnings.append(
                            f"{filename}:{index + 1} BGN before previous BEND "
                            f"previous={current_venue} next={code}"
                        )
                    current_venue = code
                    marker_open = True
                    file_begins += 1
                    block_event = parse_b_event_block(lines, index, code, target)
                    previous_event = events.get(code)
                    if previous_event and previous_event != block_event:
                        warnings.append(
                            f"{filename}:{index + 1} duplicate event metadata "
                            f"venue={code}"
                        )
                    else:
                        events[code] = block_event
                    debug.append(
                        f"{filename}:{index + 1} begin {code} {CODE_TO_NAME[code]}"
                    )
                else:
                    if current_venue and current_venue != code:
                        warnings.append(
                            f"{filename}:{index + 1} BEND mismatch "
                            f"open={current_venue} end={code}"
                        )
                    current_venue = None
                    marker_open = False
                    file_ends += 1
                continue

            header_venue = detect_venue_header(line)
            if header_venue:
                if current_venue and current_venue != header_venue:
                    if marker_open:
                        warnings.append(
                            f"{filename}:{index + 1} venue header mismatch "
                            f"marker={current_venue} header={header_venue}"
                        )
                    else:
                        current_venue = header_venue
                        file_fallbacks += 1
                elif current_venue is None:
                    # 制御行欠損時だけ見出しをフォールバックとして使う。
                    current_venue = header_venue
                    file_fallbacks += 1
                    warnings.append(
                        f"{filename}:{index + 1} venue fallback={header_venue}"
                    )

            header = race_header(line, target)
            if not header:
                continue
            if not current_venue:
                warnings.append(
                    f"{filename}:{index + 1} race header without venue: "
                    f"{normalized(line).strip()}"
                )
                continue

            race_no, race_name, close_time = header
            key = (current_venue, race_no)
            race_entries = collect_entries_after_header(lines, index)

            if key in races:
                warnings.append(
                    f"{filename}:{index + 1} duplicate race "
                    f"{current_venue}-{race_no}R"
                )
                continue

            races[key] = {
                "number": race_no,
                "name": race_name,
                "closeTime": close_time,
            }
            entries[key] = race_entries
            venue_race_counts[current_venue] += 1
            venue_entry_counts[current_venue] += len(race_entries)
            file_headers += 1
            file_entries += len(race_entries)

        if marker_open:
            warnings.append(f"{filename}: missing BEND for venue={current_venue}")
        if file_begins != file_ends:
            warnings.append(
                f"{filename}: B marker count begins={file_begins} ends={file_ends}"
            )
        debug.append(
            f"{filename}: {file_begins} venue blocks / {file_headers} races / "
            f"{file_entries} entries / fallbacks={file_fallbacks}"
        )

    for code, name in VENUES:
        if venue_race_counts[code]:
            debug.append(
                f"{code} {name}: {venue_race_counts[code]} races / "
                f"{venue_entry_counts[code]} entries"
            )

    return races, entries, events, debug, warnings


def parse_schedule(files: Mapping[str, str | bytes], target: date):
    """後方互換用。従来どおり races, entries, debug の3値を返す。"""
    races, entries, _events, debug, warnings = _parse_schedule(files, target)
    debug.extend(f"warning: {message}" for message in warnings)
    return races, entries, debug


def validate_schedule(
    races: Mapping[tuple[str, int], Mapping[str, Any]],
    entries: Mapping[tuple[str, int], list[dict[str, Any]]],
    events: Mapping[str, Mapping[str, Any]] | None = None,
):
    errors: list[str] = []
    active_codes = sorted({code for code, _ in races})

    if not active_codes:
        errors.append("no active venues")

    for code in active_codes:
        if events is not None:
            event = events.get(code) or {}
            if not event.get("title"):
                errors.append(f"{code} event title missing")
            if not event.get("dayNumber"):
                errors.append(f"{code} event day missing")
            if not event.get("startDate"):
                errors.append(f"{code} event start date missing")

        race_numbers = sorted(no for venue, no in races if venue == code)
        if race_numbers != list(range(1, 13)):
            errors.append(f"{code} race_numbers={race_numbers}")

        for race_no in race_numbers:
            key = (code, race_no)
            race = races[key]
            race_entries = entries.get(key, [])
            boats = [item.get("boatNumber") for item in race_entries]
            racers = [item.get("racerNumber") for item in race_entries]

            if len(race_entries) != 6 or boats != list(range(1, 7)):
                errors.append(
                    f"{code}-{race_no}R entries={len(race_entries)} boats={boats}"
                )
            if len(set(racers)) != len(racers) or any(not item for item in racers):
                errors.append(f"{code}-{race_no}R invalid racer numbers={racers}")
            if any(not item.get("name") for item in race_entries):
                errors.append(f"{code}-{race_no}R racer name missing")
            if race.get("closeTime") is None:
                errors.append(f"{code}-{race_no}R closeTime missing")

    return errors


def performance_race_header(line: str):
    text = normalized(line)
    match = re.match(r"^\s*([0-9]{1,2})R\s+(.*?)\s+H\s*[0-9]+\s*m\b", text)
    if not match:
        return None
    race_no = int(match.group(1))
    if not 1 <= race_no <= 12:
        return None
    name = re.sub(r"\s+", "", match.group(2)).strip()
    name = re.sub(r"進入固定$", "", name)
    return race_no, name


def parse_result_row(line: str):
    text = normalized(line)
    match = re.match(r"^\s*(\S{1,3})\s+([1-6])\s+(\d{4})\s+", text)
    if not match or not RESULT_STATUS_RE.fullmatch(match.group(1)):
        return None

    status = match.group(1)
    position = int(status) if re.fullmatch(r"0[1-6]", status) else None
    official_name = line[13:20].replace("\u3000", "").replace(" ", "").strip()
    return {
        "position": position,
        "status": status,
        "boatNumber": int(match.group(2)),
        "racerNumber": int(match.group(3)),
        "name": official_name or None,
    }


def parse_sanrensho_line(line: str):
    text = normalized(line)
    match = re.match(
        r"^\s*(?:3連単\s+)?([1-6]\s*-\s*[1-6]\s*-\s*[1-6])"
        r"\s+([0-9,]+)\s+人気\s+([0-9]+)",
        text,
    )
    if not match:
        return None
    combination = re.sub(r"\s+", "", match.group(1))
    return {
        "combination": combination,
        "payout": int(match.group(2).replace(",", "")),
        "popularity": int(match.group(3)),
    }


def parse_payout_line(line: str, continuation_type: str | None = None):
    """競走詳細の7舟券種の払戻行を解析する。"""
    text = normalized(line)
    labeled = re.match(
        r"^\s*(単勝|複勝|2連単|2連複|拡連複|3連単|3連複)\s+(.*)$",
        text,
    )
    if labeled:
        bet_type = PAYOUT_LABEL_TO_TYPE[labeled.group(1)]
        remainder = labeled.group(2).strip()
    elif continuation_type == "wide":
        bet_type = "wide"
        remainder = text.strip()
    else:
        return None

    if re.match(r"^不成立(?:\s|$)", remainder):
        return bet_type, [], True

    payouts: list[dict[str, Any]] = []
    if bet_type in {"win", "place"}:
        for match in re.finditer(r"(?:^|\s)([1-6])\s+([0-9][0-9,]*)", remainder):
            payouts.append({
                "combination": match.group(1),
                "payout": int(match.group(2).replace(",", "")),
                "popularity": None,
            })
        if bet_type == "win" and payouts:
            payouts = payouts[:1]
    else:
        parts = 3 if bet_type in {"trifecta", "trio"} else 2
        combo_pattern = r"[1-6](?:\s*-\s*[1-6]){" + str(parts - 1) + r"}"
        match = re.match(
            rf"^({combo_pattern})\s+([0-9][0-9,]*)(?:\s+人気\s+([0-9]+))?",
            remainder,
        )
        if match:
            payouts.append({
                "combination": re.sub(r"\s+", "", match.group(1)),
                "payout": int(match.group(2).replace(",", "")),
                "popularity": int(match.group(3)) if match.group(3) else None,
            })

    return (bet_type, payouts, False) if payouts else None


def parse_summary_sanrensho(line: str):
    text = normalized(line)
    match = re.match(
        r"^\s*([0-9]{1,2})R\s+"
        r"([1-6]\s*-\s*[1-6]\s*-\s*[1-6])\s+([0-9,]+)",
        text,
    )
    if match:
        return {
            "raceNumber": int(match.group(1)),
            "combination": re.sub(r"\s+", "", match.group(2)),
            "payout": int(match.group(3).replace(",", "")),
            "popularity": None,
        }
    not_established = re.match(r"^\s*([0-9]{1,2})R\s+不成立", text)
    if not_established:
        return {
            "raceNumber": int(not_established.group(1)),
            "notEstablished": True,
        }
    return None


def parse_performance(files: Mapping[str, str | bytes]):
    results: dict[tuple[str, int], dict[str, Any]] = {}
    debug: list[str] = []
    warnings: list[str] = []
    summary_payouts: dict[tuple[str, int], dict[str, Any]] = {}
    venue_race_counts: dict[str, int] = defaultdict(int)
    venue_row_counts: dict[str, int] = defaultdict(int)
    venue_payout_counts: dict[str, int] = defaultdict(int)
    venue_all_payout_counts: dict[str, int] = defaultdict(int)

    for filename, raw_content in files.items():
        lines = ensure_text(raw_content).splitlines()
        current_venue: str | None = None
        current_key: tuple[str, int] | None = None
        marker_open = False
        file_begins = 0
        file_ends = 0
        file_races = 0
        file_rows = 0
        file_payouts = 0
        file_all_payouts = 0
        file_fallbacks = 0
        current_payout_type: str | None = None

        for index, line in enumerate(lines):
            marker = control_marker(line, "K")
            if marker:
                code, phase = marker
                current_key = None
                current_payout_type = None
                if code not in CODE_TO_NAME:
                    warnings.append(f"{filename}:{index + 1} unknown K venue code={code}")
                    current_venue = None
                    marker_open = False
                    continue
                if phase == "BGN":
                    current_venue = code
                    marker_open = True
                    file_begins += 1
                    debug.append(
                        f"{filename}:{index + 1} begin {code} {CODE_TO_NAME[code]}"
                    )
                else:
                    if current_venue and current_venue != code:
                        warnings.append(
                            f"{filename}:{index + 1} KEND mismatch "
                            f"open={current_venue} end={code}"
                        )
                    current_venue = None
                    marker_open = False
                    file_ends += 1
                continue

            header_venue = detect_venue_header(line)
            if header_venue:
                if current_venue and current_venue != header_venue:
                    if marker_open:
                        warnings.append(
                            f"{filename}:{index + 1} result venue mismatch "
                            f"marker={current_venue} header={header_venue}"
                        )
                    else:
                        current_venue = header_venue
                        current_key = None
                        file_fallbacks += 1
                elif current_venue is None:
                    current_venue = header_venue
                    file_fallbacks += 1
                    warnings.append(
                        f"{filename}:{index + 1} result venue fallback={header_venue}"
                    )

            if current_venue:
                summary = parse_summary_sanrensho(line)
                if summary:
                    summary_payouts[(current_venue, summary["raceNumber"])] = summary

            header = performance_race_header(line)
            if header:
                if not current_venue:
                    warnings.append(
                        f"{filename}:{index + 1} result race without venue"
                    )
                    current_key = None
                    continue
                race_no, race_name = header
                current_key = (current_venue, race_no)
                current_payout_type = None
                if current_key in results:
                    warnings.append(
                        f"{filename}:{index + 1} duplicate result "
                        f"{current_venue}-{race_no}R"
                    )
                    continue
                payouts = {bet_type: [] for bet_type in PAYOUT_TYPES}
                results[current_key] = {
                    "name": race_name,
                    "finish": [],
                    "statuses": [],
                    "payouts": payouts,
                    "sanrensho": payouts["trifecta"],
                    "notEstablishedTypes": [],
                    "payoutStatus": "pending",
                }
                venue_race_counts[current_venue] += 1
                file_races += 1
                continue

            if current_key is None:
                continue

            row = parse_result_row(line)
            if row:
                results[current_key]["statuses"].append(row)
                if row["position"] is not None:
                    results[current_key]["finish"].append(row)
                venue_row_counts[current_key[0]] += 1
                file_rows += 1
                continue

            payout_line = parse_payout_line(line, current_payout_type)
            if payout_line:
                bet_type, payouts, not_established = payout_line
                current_payout_type = bet_type
                if not_established:
                    results[current_key]["notEstablishedTypes"].append(bet_type)
                    continue
                results[current_key]["payouts"][bet_type].extend(payouts)
                results[current_key]["payoutStatus"] = "paid"
                venue_all_payout_counts[current_key[0]] += len(payouts)
                file_all_payouts += len(payouts)
                if bet_type == "trifecta":
                    venue_payout_counts[current_key[0]] += len(payouts)
                    file_payouts += len(payouts)
                continue

            if re.match(r"^\s*3連単\s+不成立", normalized(line)):
                results[current_key]["payoutStatus"] = "notEstablished"

        if marker_open:
            warnings.append(f"{filename}: missing KEND for venue={current_venue}")
        if file_begins != file_ends:
            warnings.append(
                f"{filename}: K marker count begins={file_begins} ends={file_ends}"
            )
        debug.append(
            f"{filename}: {file_begins} venue blocks / {file_races} races / "
            f"{file_rows} result rows / {file_payouts} sanrensho / "
            f"{file_all_payouts} all payouts / "
            f"fallbacks={file_fallbacks}"
        )

    # 詳細欄が欠けた場合だけ、冒頭の払戻一覧をフォールバックにする。
    for key, summary in summary_payouts.items():
        race_result = results.get(key)
        if not race_result:
            continue
        if summary.get("notEstablished"):
            if "trifecta" not in race_result["notEstablishedTypes"]:
                race_result["notEstablishedTypes"].append("trifecta")
            continue
        if not race_result["sanrensho"]:
            race_result["sanrensho"].append({
                "combination": summary["combination"],
                "payout": summary["payout"],
                "popularity": summary["popularity"],
            })
            race_result["payoutStatus"] = "paid"
            venue_payout_counts[key[0]] += 1

    for race_result in results.values():
        has_payouts = any(race_result["payouts"].values())
        if race_result["notEstablishedTypes"]:
            race_result["payoutStatus"] = "partial" if has_payouts else "notEstablished"
        elif has_payouts:
            race_result["payoutStatus"] = "paid"
        else:
            race_result["payoutStatus"] = "pending"
        race_result["finish"].sort(
            key=lambda item: (item["position"], item["boatNumber"])
        )

    for code, name in VENUES:
        if venue_race_counts[code]:
            debug.append(
                f"{code} {name}: {venue_race_counts[code]} result races / "
                f"{venue_row_counts[code]} rows / "
                f"{venue_payout_counts[code]} sanrensho / "
                f"{venue_all_payout_counts[code]} all payouts"
            )

    return results, debug, warnings


def validate_performance(
    results: Mapping[tuple[str, int], Mapping[str, Any]],
):
    warnings: list[str] = []
    for (code, race_no), race_result in sorted(results.items()):
        statuses = race_result["statuses"]
        boats = [item["boatNumber"] for item in statuses]
        racers = [item["racerNumber"] for item in statuses]
        payout_status = race_result["payoutStatus"]

        if payout_status != "pending" and len(statuses) != 6:
            warnings.append(
                f"{code}-{race_no}R performance rows={len(statuses)}"
            )
        if len(boats) != len(set(boats)):
            warnings.append(f"{code}-{race_no}R duplicate result boats={boats}")
        if len(racers) != len(set(racers)):
            warnings.append(f"{code}-{race_no}R duplicate result racers={racers}")
        if payout_status == "paid" and len(race_result["finish"]) < 3:
            warnings.append(
                f"{code}-{race_no}R paid but finish rows="
                f"{len(race_result['finish'])}"
            )

    return warnings


def build_payload_from_files(
    target: date,
    schedule_files: Mapping[str, str | bytes],
    performance_files: Mapping[str, str | bytes] | None = None,
    grade_events: list[dict[str, Any]] | None = None,
    *,
    strict: bool = True,
):
    races, entries, events, schedule_debug, schedule_warnings = _parse_schedule(
        schedule_files, target
    )
    schedule_errors = validate_schedule(races, entries, events)
    schedule_failures = [*schedule_warnings, *schedule_errors]
    if strict and schedule_failures:
        preview = "; ".join(schedule_failures[:12])
        raise RuntimeError(
            f"番組表の構造検証に失敗しました ({len(schedule_failures)}件): "
            f"{preview}"
        )

    performance_results: dict[tuple[str, int], dict[str, Any]] = {}
    performance_debug: list[str] = []
    performance_warnings: list[str] = []
    if performance_files:
        (
            performance_results,
            performance_debug,
            performance_warnings,
        ) = parse_performance(performance_files)
        performance_warnings.extend(
            validate_performance(performance_results)
        )

    performance_loaded = bool(performance_results)
    matched_result_count = sum(key in performance_results for key in races)
    completed_result_count = sum(
        key in performance_results
        and performance_results[key]["payoutStatus"] != "pending"
        for key in races
    )
    performance_complete = (
        bool(races) and completed_result_count == len(races)
    )
    result_row_count = sum(
        len(item["statuses"]) for item in performance_results.values()
    )
    payout_count = sum(
        len(item["sanrensho"]) for item in performance_results.values()
    )
    payouts_by_type = {
        bet_type: sum(
            len(item.get("payouts", {}).get(bet_type, []))
            for item in performance_results.values()
        )
        for bet_type in PAYOUT_TYPES
    }
    all_payout_count = sum(payouts_by_type.values())

    warnings = [
        *schedule_warnings,
        *schedule_errors,
        *performance_warnings,
    ]
    if performance_files and not performance_results:
        warnings.append("performance files were present but no result races parsed")

    active_codes = {code for code, _ in races}
    payload: dict[str, Any] = {
        "schemaVersion": 9,
        "date": target.isoformat(),
        "generatedAt": datetime.now(JST).isoformat(),
        "source": {
            "type": "official-lzh",
            "schedule": "BOAT RACE 番組表ダウンロード",
            "performance": "BOAT RACE 競走成績ダウンロード",
            "performanceLoaded": performance_loaded,
            "performanceComplete": performance_complete,
            "gradeSchedule": "BOAT RACE グレードスケジュール週次キャッシュ",
            "gradeScheduleLoaded": bool(grade_events),
        },
        "venues": [],
        "quality": {
            "warnings": warnings,
            "debug": schedule_debug,
            "performanceDebug": (
                f"{len(performance_results)} races / "
                f"{result_row_count} entries / {payout_count} trifecta / "
                f"{all_payout_count} all payouts"
                if performance_results
                else "performance pending"
            ),
            "performanceDetails": performance_debug,
            "scheduleFiles": [str(name) for name in schedule_files],
            "performanceFiles": [str(name) for name in (performance_files or {})],
            "stats": {
                "scheduleVenues": len(active_codes),
                "scheduleRaces": len(races),
                "scheduleEntries": sum(len(items) for items in entries.values()),
                "performanceRaces": len(performance_results),
                "matchedResultRaces": matched_result_count,
                "completedResultRaces": completed_result_count,
                "resultRows": result_row_count,
                "sanrenshoPayouts": payout_count,
                "totalPayoutEntries": all_payout_count,
                "payoutsByType": payouts_by_type,
                "gradedVenues": sum(
                    event_for_date(grade_events, target, code) is not None
                    for code in active_codes
                ),
            },
        },
    }

    for code, venue_name in VENUES:
        venue_races: list[dict[str, Any]] = []
        keys = sorted(
            (key for key in races if key[0] == code),
            key=lambda key: key[1],
        )

        for key in keys:
            race_no = key[1]
            race = races[key]
            race_entries = entries.get(key, [])
            performance = performance_results.get(key)
            result = None

            if performance:
                schedule_by_boat = {
                    item["boatNumber"]: item for item in race_entries
                }
                statuses = []
                for item in performance["statuses"]:
                    scheduled = schedule_by_boat.get(item["boatNumber"])
                    if scheduled and scheduled["racerNumber"] != item["racerNumber"]:
                        payload["quality"]["warnings"].append(
                            f"{code}-{race_no}R boat={item['boatNumber']} "
                            f"racer mismatch schedule={scheduled['racerNumber']} "
                            f"performance={item['racerNumber']}"
                        )
                    statuses.append({
                        "boatNumber": item["boatNumber"],
                        "racerNumber": item["racerNumber"],
                        "status": item["status"],
                    })

                finish = []
                for item in performance["finish"]:
                    scheduled = schedule_by_boat.get(item["boatNumber"], {})
                    finish.append({
                        "position": item["position"],
                        "boatNumber": item["boatNumber"],
                        "racerNumber": item["racerNumber"],
                        "name": scheduled.get("name") or item.get("name"),
                    })

                payouts = {
                    bet_type: [dict(item) for item in performance.get("payouts", {}).get(bet_type, [])]
                    for bet_type in PAYOUT_TYPES
                }
                sanrensho = payouts["trifecta"]
                result = {
                    "finish": finish,
                    "sanrensho": sanrensho,
                    "payouts": payouts,
                    "statuses": statuses,
                    "payoutStatus": performance["payoutStatus"],
                    "notEstablishedTypes": performance.get("notEstablishedTypes", []),
                    "settleable": bool(any(payouts.values()) or performance.get("notEstablishedTypes")),
                }

            venue_races.append({
                "number": race_no,
                "name": race.get("name", ""),
                "closeTime": iso(race.get("closeTime")),
                "entries": race_entries,
                "result": result,
            })

        event = dict(events.get(code) or {})
        grade_event = event_for_date(grade_events, target, code)
        if grade_event:
            event.update({
                "grade": grade_event["grade"],
                "gradeLabel": grade_event.get("gradeLabel")
                    or GRADE_LABELS.get(grade_event["grade"], grade_event["grade"]),
                "gradeSource": "official-grade-schedule",
                "scheduleTitle": grade_event.get("title"),
                "startDate": grade_event.get("startDate") or event.get("startDate"),
                "endDate": grade_event.get("endDate"),
                "timeZone": grade_event.get("timeZone"),
            })

        final_race = venue_races[-1] if venue_races else None
        final_name = compact_text(final_race.get("name", "")) if final_race else ""
        is_final_day = bool(
            final_name and "優勝" in final_name and "準優勝" not in final_name
        )
        if event:
            if event.get("endDate") == target.isoformat() or is_final_day:
                event["dayLabel"] = "最終日"
                event["isFinalDay"] = True
                if not event.get("endDate"):
                    event["endDate"] = target.isoformat()
            else:
                event["isFinalDay"] = False
            event["officialUrl"] = (
                "https://www.boatrace.jp/owpc/pc/race/raceindex"
                f"?hd={target.strftime('%Y%m%d')}&jcd={code}"
            )
            schedule_debug.append(
                f"{code} {venue_name} event: grade={event.get('gradeLabel')} "
                f"day={event.get('dayLabel')} title={event.get('title')}"
            )

        payload["venues"].append({
            "code": code,
            "name": venue_name,
            "active": code in active_codes,
            "event": event or None,
            "races": venue_races,
            "boatcast": f"https://race.boatcast.jp/?jo={code}",
        })

    return payload


def build_payload(
    target: date,
    cache_dir: Path,
    grade_events: list[dict[str, Any]] | None = None,
    *,
    strict: bool = True,
):
    # 取得処理は既存のLzhDownloaderを維持し、解析だけを実構造に合わせる。
    try:
        from boatrace_lzh import LzhDownloader
    except ImportError as error:
        raise RuntimeError(
            "boatrace_lzh.LzhDownloaderを読み込めません。"
            "既存モジュールを配置してください"
        ) from error

    downloader = LzhDownloader(
        cache_dir=cache_dir,
        max_workers=1,
        request_delay=0.5,
    )
    schedule_files = downloader.download(target, "schedule")
    if not schedule_files:
        raise RuntimeError(f"番組表を取得できませんでした: {target}")

    performance_files = None
    performance_download_message = None
    try:
        performance_files = downloader.download(target, "performance")
    except Exception as error:  # 当日未公開・一時障害でも番組表は更新する。
        performance_download_message = f"performance pending: {error}"

    payload = build_payload_from_files(
        target,
        schedule_files,
        performance_files,
        grade_events,
        strict=strict,
    )
    if performance_download_message:
        payload["quality"]["performanceDebug"] = performance_download_message
        payload["quality"]["performanceDetails"].insert(
            0, performance_download_message
        )
    return payload


def atomic_write_text(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_name = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=path.parent,
            prefix=f".{path.name}.",
            suffix=".tmp",
            delete=False,
        ) as handle:
            temp_name = handle.name
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, path)
        temp_name = None
    finally:
        if temp_name:
            Path(temp_name).unlink(missing_ok=True)


def reuse_generated_at_when_unchanged(payload: dict[str, Any], path: Path):
    """実データに変化がない定期実行では不要なコミットを作らない。"""
    try:
        previous = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return

    current_content = {
        key: value for key, value in payload.items() if key != "generatedAt"
    }
    previous_content = {
        key: value for key, value in previous.items() if key != "generatedAt"
    }
    if current_content == previous_content and previous.get("generatedAt"):
        payload["generatedAt"] = previous["generatedAt"]


def build_result_archive(payload: dict[str, Any]) -> dict[str, Any]:
    """検索・長期保存用に、確定した成績と払戻だけを小さく残す。"""
    venues = []
    race_count = 0
    payout_count = 0
    for venue in payload.get("venues", []):
        races = []
        for race in venue.get("races", []):
            result = race.get("result")
            if not result:
                continue
            races.append(
                {
                    "number": race.get("number"),
                    "name": race.get("name"),
                    "closeTime": race.get("closeTime"),
                    "result": result,
                }
            )
            race_count += 1
            payout_count += sum(
                len(items) for items in result.get("payouts", {}).values()
                if isinstance(items, list)
            )
        if races:
            venues.append(
                {
                    "code": venue.get("code"),
                    "name": venue.get("name"),
                    "event": venue.get("event"),
                    "races": races,
                }
            )
    return {
        "schemaVersion": 1,
        "date": payload.get("date"),
        "generatedAt": payload.get("generatedAt"),
        "source": {"type": "official-lzh-result-archive"},
        "venues": venues,
        "stats": {
            "venues": len(venues),
            "races": race_count,
            "payouts": payout_count,
        },
    }


def write_result_archive(payload: dict[str, Any], output_dir: Path):
    """日別アーカイブと、GitHub Pagesから参照できる日付索引を更新する。"""
    archive_dir = output_dir / "results"
    archive_path = archive_dir / f"{payload['date']}.json"
    archive = build_result_archive(payload)
    reuse_generated_at_when_unchanged(archive, archive_path)
    atomic_write_text(
        archive_path,
        json.dumps(archive, ensure_ascii=False, indent=2),
    )

    dates = []
    for path in sorted(archive_dir.glob("????-??-??.json"), reverse=True):
        try:
            item = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError, TypeError):
            continue
        stats = item.get("stats", {})
        dates.append(
            {
                "date": item.get("date") or path.stem,
                "venues": int(stats.get("venues") or 0),
                "races": int(stats.get("races") or 0),
                "payouts": int(stats.get("payouts") or 0),
                "generatedAt": item.get("generatedAt"),
            }
        )
    index_payload = {
        "schemaVersion": 1,
        "generatedAt": payload.get("generatedAt"),
        "dates": dates,
    }
    index_path = archive_dir / "index.json"
    reuse_generated_at_when_unchanged(index_payload, index_path)
    atomic_write_text(
        index_path,
        json.dumps(index_payload, ensure_ascii=False, indent=2),
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument("--output", default="data/today.json")
    parser.add_argument("--cache-dir", default=".cache/boatrace_lzh")
    parser.add_argument(
        "--grade-cache",
        default="",
        help="公式グレード日程の低頻度キャッシュJSON",
    )
    parser.add_argument(
        "--refresh-grade-cache",
        action="store_true",
        help="公式グレード日程3ページを再取得する（週次用）",
    )
    parser.add_argument(
        "--allow-partial",
        action="store_true",
        help="構造不完全な番組表でもデバッグ用JSONを出力する",
    )
    parser.add_argument(
        "--require-performance",
        action="store_true",
        help="競走成績が未取得なら失敗させる（夜間確認用）",
    )
    args = parser.parse_args()

    raw_date = (args.date or "").strip()
    target = date.fromisoformat(raw_date) if raw_date else datetime.now(JST).date()
    grade_cache = Path(args.grade_cache) if args.grade_cache else Path(
        f"data/grade_schedule_{target.year}.json"
    )
    grade_payload = read_grade_schedule(grade_cache)
    grade_error = None
    if (
        args.refresh_grade_cache
        or grade_payload is None
        or int(grade_payload.get("year") or 0) != target.year
    ):
        try:
            refreshed = fetch_official_grade_schedule(target.year)
            atomic_write_text(
                grade_cache,
                json.dumps(refreshed, ensure_ascii=False, indent=2),
            )
            grade_payload = refreshed
        except Exception as error:
            grade_error = f"grade schedule cache pending: {error}"

    payload = build_payload(
        target,
        Path(args.cache_dir),
        (grade_payload or {}).get("events", []),
        strict=not args.allow_partial,
    )
    if grade_error:
        payload["quality"]["warnings"].append(grade_error)
    if args.require_performance and not payload["source"]["performanceLoaded"]:
        raise RuntimeError(f"競走成績を取得できませんでした: {target}")

    # 検証済みJSONだけを原子的に置換する。
    # 失敗時は直前のtoday.jsonを維持する。
    output = Path(args.output)
    dated = output.parent / f"{target.isoformat()}.json"
    reuse_generated_at_when_unchanged(payload, dated)
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    atomic_write_text(dated, text)
    if target == datetime.now(JST).date():
        atomic_write_text(output, text)
    write_result_archive(payload, output.parent)

    active = sum(venue["active"] for venue in payload["venues"])
    race_count = sum(len(venue["races"]) for venue in payload["venues"])
    entry_count = sum(
        len(race["entries"])
        for venue in payload["venues"]
        for race in venue["races"]
    )
    warning_count = len(payload["quality"]["warnings"])

    print(
        f"{target}: {active} venues / {race_count} races / "
        f"{entry_count} entries / warnings={warning_count}"
    )
    print("---- schedule ----")
    for message in payload["quality"]["debug"]:
        print(message)
    print("---- performance ----")
    print(payload["quality"]["performanceDebug"])
    for message in payload["quality"]["performanceDetails"]:
        print(message)
    if payload["quality"]["warnings"]:
        print("---- warnings ----")
        for message in payload["quality"]["warnings"]:
            print(message)


if __name__ == "__main__":
    main()
