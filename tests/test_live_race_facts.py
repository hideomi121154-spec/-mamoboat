import sys
import unittest
from datetime import datetime
from pathlib import Path


SCRIPTS = Path(__file__).parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))

import build_live_race_facts as live  # noqa: E402


class LiveRaceFactsTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime.fromisoformat("2026-09-29T17:05:00+09:00")

    def test_upcoming_race_is_in_live_window(self):
        race = {"closeTime": "2026-09-29T17:09:00+09:00"}
        self.assertTrue(live.in_live_window(race, self.now))
        self.assertTrue(live.should_fetch_preview(race, self.now))

    def test_distant_race_is_not_in_live_window(self):
        race = {"closeTime": "2026-09-29T20:00:00+09:00"}
        self.assertFalse(live.in_live_window(race, self.now))

    def test_upcoming_race_priority_beats_recently_closed(self):
        upcoming = ("07", {"closeTime": "2026-09-29T17:09:00+09:00"})
        closed = ("15", {"closeTime": "2026-09-29T17:02:00+09:00"})
        targets = [closed, upcoming]
        targets.sort(key=lambda item: live.priority(item, self.now))
        self.assertEqual(targets[0], upcoming)


if __name__ == "__main__":
    unittest.main()
