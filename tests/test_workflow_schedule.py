from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "sync-official-data.yml"


class WorkflowScheduleTests(unittest.TestCase):
    def test_overnight_jst_rollover_is_scheduled(self):
        source = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn('cron: "5 15-20 * * *"', source)

    def test_downloader_uses_jst_for_current_day_validation(self):
        source = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("TZ: Asia/Tokyo", source)

    def test_fallback_failure_does_not_block_mirroring_valid_data(self):
        source = WORKFLOW.read_text(encoding="utf-8")
        start = source.index("- name: Recover stale JST current-day data")
        end = source.index("- name: Mirror official data into dev", start)
        fallback_step = source[start:end]
        self.assertIn("continue-on-error: true", fallback_step)


if __name__ == "__main__":
    unittest.main()
