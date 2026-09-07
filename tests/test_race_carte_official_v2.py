import copy
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPTS = Path(__file__).parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))

import race_carte_official_v2 as parser  # noqa: E402
from bs4 import BeautifulSoup  # noqa: E402


RACERS = [
    (1, 5289, 0, 0, 0.16, (5.73, 41.18, 58.82), (5.95, 40.00, 60.00), (34, 42.96, 54.81), (138, 42.27, 60.82), 6.85),
    (2, 3523, 0, 0, 0.20, (4.42, 20.90, 43.28), (6.00, 55.56, 55.56), (35, 26.61, 40.37), (106, 26.04, 36.46), 6.91),
    (3, 5007, 1, 0, 0.18, (4.68, 21.05, 36.84), (4.00, 21.05, 31.58), (65, 41.51, 61.32), (131, 21.05, 33.68), 6.92),
    (4, 4632, 0, 0, 0.20, (4.84, 27.63, 50.00), (5.14, 26.32, 50.88), (15, 40.48, 55.56), (124, 30.95, 41.67), 6.95),
    (5, 4114, 0, 0, 0.19, (4.89, 25.93, 48.15), (6.16, 32.26, 64.52), (37, 30.77, 49.04), (122, 30.93, 47.42), 6.93),
    (6, 4095, 2, 0, 0.13, (7.07, 59.18, 71.43), (7.33, 55.56, 72.22), (39, 40.45, 64.04), (101, 31.68, 47.52), 6.84),
]


def triplet(values):
    return "<br>".join(str(value) for value in values)


def racelist_html():
    bodies = []
    for lane, racer, f_count, l_count, average_st, national, local, motor, boat, _ in RACERS:
        # The final cells deliberately contain misleading nearby integers. The
        # parser must use the labelled row cells rather than scanning a text tail.
        bodies.append(f"""
          <tbody><tr>
            <td rowspan="4">{lane}</td>
            <td rowspan="4"><a href="/owpc/pc/data/racersearch/profile?toban={racer}"><img></a></td>
            <td rowspan="4"><div>{racer} / A1</div><a href="/owpc/pc/data/racersearch/profile?toban={racer}">選手</a></td>
            <td rowspan="4">F{f_count}<br>L{l_count}<br>{average_st:.2f}</td>
            <td rowspan="4">{triplet(national)}</td>
            <td rowspan="4">{triplet(local)}</td>
            <td rowspan="4">{triplet(motor)}</td>
            <td rowspan="4">{triplet(boat)}</td>
            <td rowspan="4">&nbsp;</td><td>{boat[0] % 100}</td><td>2</td><td>11</td>
          </tr></tbody>
        """)
    return f"""
      <table>
        <thead><tr><th>枠</th><th>ボートレーサー</th><th>全国</th><th>当地</th><th>モーター</th><th>ボート</th></tr></thead>
        {''.join(bodies)}
      </table>
    """


def beforeinfo_html():
    bodies = []
    for lane, racer, *_values, exhibition in RACERS:
        bodies.append(f"""
          <tbody><tr>
            <td rowspan="4">{lane}</td>
            <td rowspan="4"><a href="/owpc/pc/data/racersearch/profile?toban={racer}"><img></a></td>
            <td rowspan="4"><a href="/owpc/pc/data/racersearch/profile?toban={racer}">選手</a></td>
            <td rowspan="4">52.0kg</td><td rowspan="4">{exhibition:.2f}</td><td rowspan="4">0.0</td>
          </tr></tbody>
        """)
    return f"""
      <div>水面気象情報 曇り 気温 28.0℃ 水温 28.0℃ 風速 4m 波高 4cm</div>
      <p class="weather1_bodyUnitImage is-wind10"></p>
      <table>
        <thead><tr><th>枠</th><th>ボートレーサー</th><th>体重</th><th>展示<br>タイム</th><th>チルト</th></tr></thead>
        {''.join(bodies)}
      </table>
    """


def race_fixture():
    return {
        "number": 2,
        "entries": [
            {
                "boatNumber": lane,
                "racerNumber": racer,
                "motorNumber": int(motor[0]),
                # Reproduce the old B-file parser's lost hundreds digit.
                "boatPart": int(boat[0]) % 100,
            }
            for lane, racer, _f, _l, _st, _national, _local, motor, boat, _exhibition in RACERS
        ],
    }


class RaceCarteOfficialParserTest(unittest.TestCase):
    def test_fukuoka_2r_all_six_racers_use_validated_columns(self):
        race = race_fixture()
        with patch.object(parser, "fetch_html", return_value=racelist_html()):
            self.assertTrue(parser.enrich_race_card(race, "2026-09-07", "22"))

        self.assertTrue(parser.has_static_stats(race))
        self.assertEqual(race["carteSource"]["raceCardParsedRacers"], 6)
        for entry, expected in zip(race["entries"], RACERS):
            lane, racer, f_count, l_count, average_st, national, local, motor, boat, _ = expected
            self.assertEqual(entry["boatNumber"], lane)
            self.assertEqual(entry["racerNumber"], racer)
            self.assertEqual(entry["flyingCount"], f_count)
            self.assertEqual(entry["lateCount"], l_count)
            self.assertEqual(entry["averageStart"], average_st)
            self.assertEqual(
                (entry["nationalWinRate"], entry["national2Rate"], entry["national3Rate"]),
                national,
            )
            self.assertEqual(
                (entry["localWinRate"], entry["local2Rate"], entry["local3Rate"]),
                local,
            )
            self.assertEqual(
                (entry["motorNumber"], entry["motor2Rate"], entry["motor3Rate"]),
                motor,
            )
            self.assertEqual(
                (entry["boatPart"], entry["boat2Rate"], entry["boat3Rate"]),
                boat,
            )

    def test_row_is_rejected_when_known_motor_does_not_match(self):
        race = race_fixture()
        soup = BeautifulSoup(racelist_html(), "html.parser")
        entry = copy.deepcopy(race["entries"][0])
        entry["motorNumber"] = 99
        row = parser._find_profile_row(soup, str(entry["racerNumber"]))
        self.assertEqual(parser._parse_racer_row(row, entry), {})

    def test_preview_maps_each_exhibition_and_numbered_wind_class(self):
        race = race_fixture()
        with patch.object(parser, "fetch_html", return_value=beforeinfo_html()):
            self.assertTrue(parser.enrich_preview(race, "2026-09-07", "22"))

        self.assertEqual(
            [entry["exhibitionTime"] for entry in race["entries"]],
            [expected[-1] for expected in RACERS],
        )
        self.assertEqual(race["environment"], {
            "weather": "曇",
            "windDirection": "南南西",
            "windSpeed": 4.0,
            "waveHeight": 4.0,
            "airTemperature": 28.0,
            "waterTemperature": 28.0,
        })


if __name__ == "__main__":
    unittest.main()
