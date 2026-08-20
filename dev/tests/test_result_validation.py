import importlib.util
import unittest
from copy import deepcopy
from datetime import date
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).parents[1] / "scripts" / "sync_official_data.py"
SPEC = importlib.util.spec_from_file_location("mamoboat_result_sync", SCRIPT)
sync = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sync)


VENUES = [
    ("01", "桐生"), ("02", "戸田"), ("03", "江戸川"), ("04", "平和島"),
    ("05", "多摩川"), ("06", "浜名湖"), ("07", "蒲郡"), ("08", "常滑"),
    ("09", "津"), ("10", "三国"), ("11", "びわこ"), ("12", "住之江"),
    ("13", "尼崎"), ("14", "鳴門"), ("15", "丸亀"), ("16", "児島"),
    ("17", "宮島"), ("18", "徳山"), ("19", "下関"), ("20", "若松"),
    ("21", "芦屋"), ("22", "福岡"), ("23", "唐津"), ("24", "大村"),
]


def result_html(payout_rows, statuses=None, extra_text=""):
    statuses = statuses or [
        (position, boat, 4000 + boat, f"選手{boat}")
        for position, boat in enumerate((1, 3, 2, 4, 5, 6), 1)
    ]
    finish_rows = "".join(
        f"<tr><td>{status}</td><td>{boat}</td><td>{racer} {name}</td></tr>"
        for status, boat, racer, name in statuses
    )
    payouts = "".join(
        f"<tr><td>{label}</td><td>{combo}</td><td>{amount}</td><td>{popularity}</td></tr>"
        for label, combo, amount, popularity in payout_rows
    )
    return f"""
      <html><body>{extra_text}
      <table><tr><th>着</th><th>枠</th><th>ボートレーサー</th></tr>{finish_rows}</table>
      <table><tr><th>勝式</th><th>組番</th><th>払戻金</th><th>人気</th></tr>{payouts}</table>
      </body></html>
    """


ALL_PAYOUTS = [
    ("単勝", "1", "170円", ""),
    ("複勝", "1", "200円", ""),
    ("", "3", "180円", ""),
    ("2連単", "1-3", "540円", "2"),
    ("2連複", "1-3", "270円", "1"),
    ("拡連複", "1-3", "100円", "1"),
    ("", "1-2", "160円", "3"),
    ("", "2-3", "110円", "2"),
    ("3連単", "1-3-2", "660円", "3"),
    ("3連複", "1-2-3", "300円", "1"),
]


def payload_with_race(result=None):
    return {
        "date": "2026-08-09",
        "venues": [{
            "code": "07", "name": "蒲郡", "active": True,
            "races": [{"number": 1, "result": result}],
        }],
        "quality": {"stats": {}},
    }


class ResultValidationTests(unittest.TestCase):
    def test_24_venue_codes_names_dates_and_result_urls(self):
        self.assertEqual(sync.VENUES, VENUES)
        target = date(2026, 8, 9)
        for code, name in VENUES:
            with self.subTest(code=code, name=name):
                url = sync.official_result_page_url(target, code, 12)
                self.assertEqual(
                    url,
                    "https://www.boatrace.jp/owpc/pc/race/raceresult"
                    f"?hd=20260809&jcd={code}&rno=12",
                )

    def test_all_seven_payout_types_and_multiple_payouts(self):
        result = sync.parse_official_result_html(result_html(ALL_PAYOUTS), date(2026, 8, 9))
        self.assertIsNotNone(result)
        self.assertEqual(result["payoutStatus"], "paid")
        self.assertTrue(result["settleable"])
        self.assertEqual(
            {key: len(value) for key, value in result["payouts"].items()},
            {"win": 1, "place": 2, "exacta": 1, "quinella": 1,
             "wide": 3, "trifecta": 1, "trio": 1},
        )

    def test_waiting_and_incomplete_html_are_not_settleable(self):
        self.assertIsNone(sync.parse_official_result_html("<html>結果待ち</html>", date(2026, 8, 9)))
        incomplete = result_html(ALL_PAYOUTS[:-1])
        self.assertIsNone(sync.parse_official_result_html(incomplete, date(2026, 8, 9)))

    def test_cancelled_race_is_refunded(self):
        result = sync.parse_official_result_html("<html>レース中止</html>", date(2026, 8, 9))
        self.assertEqual(result["payoutStatus"], "notEstablished")
        self.assertEqual(set(result["notEstablishedTypes"]), set(sync.PAYOUT_TYPES))
        self.assertTrue(result["settleable"])

    def test_scratched_boat_and_partial_refund(self):
        statuses = [
            ("1", 1, 4001, "選手1"), ("2", 3, 4003, "選手3"),
            ("3", 2, 4002, "選手2"), ("4", 4, 4004, "選手4"),
            ("5", 5, 4005, "選手5"), ("欠場", 6, 4006, "選手6"),
        ]
        result = sync.parse_official_result_html(
            result_html(ALL_PAYOUTS, statuses, "返還 6 備考"), date(2026, 8, 9)
        )
        self.assertEqual(result["refundBoats"], [6])
        self.assertEqual(result["statuses"][-1]["status"], "欠")

    def test_partial_not_established_types(self):
        rows = deepcopy(ALL_PAYOUTS)
        rows[-2] = ("3連単", "不成立", "", "")
        result = sync.parse_official_result_html(result_html(rows), date(2026, 8, 9))
        self.assertEqual(result["payoutStatus"], "partial")
        self.assertIn("trifecta", result["notEstablishedTypes"])

    def test_cached_settleable_result_is_reused_without_duplicate(self):
        settled = sync.parse_official_result_html(result_html(ALL_PAYOUTS), date(2026, 8, 9))
        previous = payload_with_race(settled)
        current = payload_with_race(None)
        self.assertEqual(sync.merge_cached_results(current, previous), 1)
        self.assertEqual(current["venues"][0]["races"][0]["result"], settled)
        # 同じ結果が既にある場合は上書き・二重計上しない。
        self.assertEqual(sync.merge_cached_results(current, previous), 0)

    def test_fetch_builds_request_and_pending_is_not_confirmed(self):
        response = unittest.mock.MagicMock()
        response.__enter__.return_value.read.return_value = b"<html>waiting</html>"
        with patch.object(sync, "urlopen", return_value=response) as mocked:
            result, url = sync.fetch_official_result_page(date(2026, 8, 9), "07", 1)
        self.assertIsNone(result)
        self.assertIn("hd=20260809&jcd=07&rno=1", url)
        request, = mocked.call_args.args
        self.assertEqual(request.full_url, url)
        self.assertEqual(mocked.call_args.kwargs["timeout"], 25)


if __name__ == "__main__":
    unittest.main()
