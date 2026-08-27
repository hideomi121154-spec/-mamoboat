import unittest

from scripts.fallback_openapi import convert_program, day_details, grade_details


class FallbackOpenApiV3Tests(unittest.TestCase):
    def setUp(self):
        self.program = {
            "date": "2026-08-27",
            "stadium_number": 1,
            "number": 1,
            "closed_at": "2026-08-27 14:57:00",
            "day_label": "３日目",
            "grade_label": "SG",
            "title": "第72回ボートレースメモリアル",
            "subtitle": "予選",
            "boats": [
                {
                    "racer_boat_number": boat,
                    "racer_name": f"選手 {boat}",
                    "racer_number": 3900 + boat,
                    "racer_class_number": 1,
                    "racer_branch_number": 35,
                    "racer_age": 40,
                    "racer_weight": 52.0,
                    "racer_assigned_motor_number": 10 + boat,
                    "racer_assigned_boat_number": 20 + boat,
                }
                for boat in range(1, 7)
            ],
        }

    def test_converts_v3_program_to_mamoboat_race(self):
        race = convert_program(self.program, "2026-08-27")

        self.assertEqual(race["number"], 1)
        self.assertEqual(race["name"], "予選")
        self.assertEqual(race["closeTime"], "2026-08-27T14:57:00+09:00")
        self.assertEqual(len(race["entries"]), 6)
        self.assertEqual(race["entries"][0]["boatNumber"], 1)
        self.assertEqual(race["entries"][0]["racerNumber"], 3901)
        self.assertEqual(race["entries"][0]["name"], "選手1")
        self.assertEqual(race["entries"][0]["class"], "A1")
        self.assertEqual(race["entries"][0]["branch"], "山口")
        self.assertIsNone(race["result"])

    def test_normalizes_grade_and_full_width_day_number(self):
        self.assertEqual(grade_details(self.program), ("SG", "SG"))
        self.assertEqual(day_details(self.program), (3, "３日目"))


if __name__ == "__main__":
    unittest.main()
