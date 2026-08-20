import importlib.util
import json
import tempfile
from datetime import date
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "scripts" / "sync_official_data.py"
SPEC = importlib.util.spec_from_file_location("mamoboat_sync", SCRIPT)
sync = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sync)


def b_entry(boat, racer, name="選手太郎", branch="愛知"):
    row = f"{boat} {racer:04d}{name:<4}{30:02d}{branch:<2}{52:02d}{'A1':<2}"
    row = row.ljust(41) + f"{boat + 10:02d}"
    row = row.ljust(50) + f"{boat + 20:02d}"
    return row


def b_block(code, venue_name, racer_base):
    # 現行の番組表は、場名だけでなく開催日・何日目・大会名を必須とする。
    # 本番のstrict検証を迂回せず、fixtureを公式Bファイルの見出しに合わせる。
    lines = [
        f"{code}BBGN",
        f"ボートレース{venue_name}",
        "第1日 2026年8月9日",
        "*** 番組表 ***",
        f"{venue_name.replace(' ', '')}テスト大会",
    ]
    for race_no in range(1, 13):
        hour = 9 + (race_no // 3)
        minute = (race_no * 7) % 60
        lines.append(
            f" {race_no}R  一般          H1800m  電話投票締切予定{hour:02d}:{minute:02d}"
        )
        for boat in range(1, 7):
            lines.append(b_entry(boat, racer_base + race_no * 6 + boat))
    lines.append(f"{code}BEND")
    return lines


def k_paid_block(code, venue_name, racer_base):
    lines = [
        f"{code}KBGN",
        f"第1日 2026/8/9 ボートレース{venue_name}",
        " 1R  1-3-2  660",
        " 1R  一般  H1800m  晴  風 無風",
    ]
    order = [1, 3, 2, 4, 5, 6]
    for position, boat in enumerate(order, start=1):
        racer = racer_base + 6 + boat
        lines.append(f"  {position:02d}  {boat} {racer:04d} 選 手 太 郎  11 21")
    lines.extend([
        "  単勝    1      170",
        "  複勝    1      200  3      180",
        "  2連単   1-3    540  人気  2",
        "  2連複   1-3    270  人気  1",
        "  拡連複  1-3    100  人気  1",
        "          1-2    160  人気  3",
        "          2-3    110  人気  2",
        "  3連単   1-3-2  660  人気  3",
        "  3連複   1-2-3  300  人気  1",
        f"{code}KEND",
    ])
    return lines


def k_refund_block(code, venue_name, racer_base):
    lines = [
        f"{code}KBGN",
        f"第1日 2026/8/9 ボートレース{venue_name}",
        " 1R  不成立",
        " 1R  一般  H1800m  晴  風 無風",
    ]
    for boat in range(1, 7):
        racer = racer_base + 6 + boat
        lines.append(f"  {boat:02d}  {boat} {racer:04d} 選 手 太 郎  11 21")
    lines.extend(["  3連単  不成立", f"{code}KEND"])
    return lines


schedule_text = "\n".join(
    b_block("24", "大 村", 5000) + b_block("07", "蒲 郡", 4000)
)
performance_text = "\n".join(
    k_paid_block("24", "大 村", 5000) + k_refund_block("07", "蒲 郡", 4000)
)

payload = sync.build_payload_from_files(
    date(2026, 8, 9),
    {"B260809.TXT": schedule_text},
    {"K260809.TXT": performance_text},
)

assert payload["schemaVersion"] == 10
assert len(payload["venues"]) == 24
assert [venue["code"] for venue in payload["venues"]] == [
    f"{number:02d}" for number in range(1, 25)
]
assert [venue["code"] for venue in payload["venues"] if venue["active"]] == ["07", "24"]

omura = next(venue for venue in payload["venues"] if venue["code"] == "24")
gamagori = next(venue for venue in payload["venues"] if venue["code"] == "07")
assert len(omura["races"]) == 12
assert len(gamagori["races"]) == 12
assert [race["number"] for race in omura["races"]] == list(range(1, 13))
assert all(len(race["entries"]) == 6 for race in omura["races"] + gamagori["races"])
assert omura["races"][0]["entries"][0]["racerNumber"] == 5007
assert gamagori["races"][0]["entries"][0]["racerNumber"] == 4007
assert omura["races"][0]["closeTime"].endswith("+09:00")

paid = omura["races"][0]["result"]
assert [item["boatNumber"] for item in paid["finish"][:3]] == [1, 3, 2]
assert paid["sanrensho"] == [
    {"combination": "1-3-2", "payout": 660, "popularity": 3}
]
assert paid["payouts"]["win"] == [
    {"combination": "1", "payout": 170, "popularity": None}
]
assert len(paid["payouts"]["place"]) == 2
assert len(paid["payouts"]["wide"]) == 3
assert paid["payouts"]["trio"][0]["combination"] == "1-2-3"
assert paid["payoutStatus"] == "paid"
assert paid["settleable"] is True

refunded = gamagori["races"][0]["result"]
assert refunded["payoutStatus"] == "notEstablished"
assert refunded["sanrensho"] == []
assert refunded["settleable"] is True

stats = payload["quality"]["stats"]
assert stats["scheduleVenues"] == 2
assert stats["scheduleRaces"] == 24
assert stats["scheduleEntries"] == 144
assert stats["performanceRaces"] == 2
assert stats["resultRows"] == 12
assert stats["sanrenshoPayouts"] == 1
assert stats["totalPayoutEntries"] == 10
assert stats["payoutsByType"] == {
    "win": 1,
    "place": 2,
    "exacta": 1,
    "quinella": 1,
    "wide": 3,
    "trifecta": 1,
    "trio": 1,
}
assert payload["quality"]["warnings"] == []
assert any("24 大村: 12 races / 72 entries" in line for line in payload["quality"]["debug"])
assert any("07 蒲郡: 12 races / 72 entries" in line for line in payload["quality"]["debug"])

broken_lines = b_block("08", "常 滑", 4500)
broken_lines.pop(-2)  # 12Rの6号艇を欠落させる。
try:
    sync.build_payload_from_files(
        date(2026, 8, 9),
        {"B260809-broken.TXT": "\n".join(broken_lines)},
    )
except RuntimeError as error:
    assert "構造検証に失敗" in str(error)
else:
    raise AssertionError("不完全な6艇データをstrictモードが拒否しませんでした")

with tempfile.TemporaryDirectory() as directory:
    existing_path = Path(directory) / "today.json"
    existing_path.write_text(
        json.dumps({"generatedAt": "old", "value": 1}),
        encoding="utf-8",
    )
    unchanged = {"generatedAt": "new", "value": 1}
    sync.reuse_generated_at_when_unchanged(unchanged, existing_path)
    assert unchanged["generatedAt"] == "old"
    changed = {"generatedAt": "new", "value": 2}
    sync.reuse_generated_at_when_unchanged(changed, existing_path)
    assert changed["generatedAt"] == "new"

print("sync transform tests OK")
