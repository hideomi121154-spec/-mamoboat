import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / 'scripts'))
from sync_official_data import merge_cached_carte


class CartePersistenceTests(unittest.TestCase):
    def test_rebuild_keeps_details_without_touching_odds_or_payouts(self):
        entry = dict(boatNumber=1, racerNumber=4095, motorNumber=39, boatPart=101)
        new = dict(date='2026-09-07', venues=[dict(code='22', races=[dict(
            number=11, entries=[entry], odds={'keep': 12}, result={'payouts': {'keep': 100}}
        )])])
        old = copy.deepcopy(new)
        oldrace = old['venues'][0]['races'][0]
        oldrace['entries'][0]['nationalWinRate'] = 7.07
        oldrace['environment'] = {'windDirection': '南南西'}
        oldrace['carteSource'] = {'raceCard': 'validated'}
        merge_cached_carte(new, old)
        race = new['venues'][0]['races'][0]
        self.assertEqual(race['entries'][0]['nationalWinRate'], 7.07)
        self.assertEqual(race['environment'], oldrace['environment'])
        self.assertEqual(race['odds'], {'keep': 12})
        self.assertEqual(race['result']['payouts'], {'keep': 100})
        for key in ('racerNumber', 'boatNumber', 'motorNumber', 'boatPart'):
            changed = copy.deepcopy(old)
            changed['venues'][0]['races'][0]['entries'][0][key] = 999
            fresh = copy.deepcopy(new)
            fresh['venues'][0]['races'][0]['entries'][0].pop('nationalWinRate')
            merge_cached_carte(fresh, changed)
            self.assertNotIn('nationalWinRate', fresh['venues'][0]['races'][0]['entries'][0])
