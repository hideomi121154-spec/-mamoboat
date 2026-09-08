#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup

JST = timezone(timedelta(hours=9))
OFFICIAL = "https://www.boatrace.jp"
UA = "Mozilla/5.0 (compatible; MAMOBOAT-Kimarite/1.0; +https://mamoboat.com/)"
METHODS = ("まくり差し", "まくり", "逃げ", "差し", "抜き", "恵まれ")


def now_jst() -> datetime:
    return datetime.now(JST)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default="")
    parser.add_argument("--max-races", type=int, default=36)
    parser.add_argument("--sleep", type=float, default=0.08)
    return parser.parse_args()


def data_path(date_text: str) -> Path | None:
    today = now_jst().date().isoformat()
    candidates = [Path("data") / f"{date_text}.json"]
    if date_text == today:
        candidates.insert(0, Path("data/today.json"))
    return next((p for p in candidates if p.exists()), None)


def fetch_html(path: str, timeout: int = 12) -> str:
    req = Request(OFFICIAL + path, headers={"User-Agent": UA, "Accept-Language": "ja,en;q=0.7"})
    last: Exception | None = None
    for attempt in range(3):
        try:
            with urlopen(req, timeout=timeout) as res:
                raw = res.read()
                charset = res.headers.get_content_charset() or "utf-8"
            for enc in (charset, "utf-8", "cp932", "shift_jis"):
                try:
                    return raw.decode(enc)
                except (UnicodeDecodeError, LookupError):
                    continue
            return raw.decode("utf-8", errors="replace")
        except (HTTPError, URLError, TimeoutError) as exc:
            last = exc
            if attempt < 2:
                time.sleep(0.25 * (attempt + 1))
    raise RuntimeError(f"official fetch failed: {path}: {last}")


def extract_kimarite(html: str) -> str | None:
    soup = BeautifulSoup(html, "html.parser")
    text = " ".join(soup.stripped_strings).replace("\u3000", " ")

    direct = re.search(
        r"決まり手\s*[:：]?\s*(まくり差し|まくり|逃げ|差し|抜き|恵まれ)",
        text,
    )
    if direct:
        return direct.group(1)

    marker = text.find("決まり手")
    if marker >= 0:
        nearby = text[marker:marker + 240]
        for method in METHODS:
            if method in nearby:
                return method

    for node in soup.find_all(string=lambda s: s and "決まり手" in str(s)):
        parent = node.parent
        candidates: list[str] = []
        if parent:
            candidates.append(" ".join(parent.stripped_strings))
            if parent.parent:
                candidates.append(" ".join(parent.parent.stripped_strings))
            nxt = parent.find_next()
            if nxt:
                candidates.append(" ".join(nxt.stripped_strings))
        blob = " ".join(candidates)
        for method in METHODS:
            if method in blob:
                return method
    return None


def race_close(race: dict[str, Any]) -> datetime:
    raw = race.get("closeTime")
    if raw:
        try:
            dt = datetime.fromisoformat(str(raw))
            return dt if dt.tzinfo else dt.replace(tzinfo=JST)
        except ValueError:
            pass
    return datetime(1970, 1, 1, tzinfo=JST)


def save_all(path: Path, payload: dict[str, Any], date_text: str) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    path.write_text(text, encoding="utf-8")
    dated = Path("data") / f"{date_text}.json"
    if dated != path:
        dated.write_text(text, encoding="utf-8")


def main() -> int:
    args = parse_args()
    date_text = args.date.strip() or now_jst().date().isoformat()
    path = data_path(date_text)
    if not path:
        print(f"kimarite repair: no dataset for {date_text}")
        return 0

    payload = json.loads(path.read_text(encoding="utf-8"))
    targets: list[tuple[str, dict[str, Any]]] = []
    for venue in payload.get("venues") or []:
        code = str(venue.get("code") or "").zfill(2)
        for race in venue.get("races") or []:
            result = race.get("result") or {}
            if result and not result.get("kimarite"):
                targets.append((code, race))

    targets.sort(key=lambda item: race_close(item[1]), reverse=True)
    changed = False
    repaired = 0
    checked = 0
    for code, race in targets[: max(0, args.max_races)]:
        race_no = int(race.get("number") or 0)
        if not 1 <= race_no <= 12:
            continue
        checked += 1
        try:
            html = fetch_html(
                f"/owpc/pc/race/raceresult?hd={date_text.replace('-', '')}&jcd={code}&rno={race_no}"
            )
            method = extract_kimarite(html)
            if method:
                race.setdefault("result", {})["kimarite"] = method
                meta = race.setdefault("carteSource", {})
                meta["resultDetail"] = "official-raceresult-kimarite-v2"
                meta["resultDetailFetchedAt"] = now_jst().isoformat()
                changed = True
                repaired += 1
            else:
                print(f"kimarite not found {code}-{race_no}R")
        except Exception as exc:
            print(f"kimarite fetch failed {code}-{race_no}R: {exc}")
        time.sleep(max(0.0, args.sleep))

    if changed:
        save_all(path, payload, date_text)
    print(f"kimarite repair date={date_text} checked={checked} repaired={repaired} changed={changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
