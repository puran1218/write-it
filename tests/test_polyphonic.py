"""Conservative contract checks for the polyphonic editorial pipeline."""
import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CURATED = ROOT / "content/polyphonic-curated.json"

class PolyphonicContentTests(unittest.TestCase):
    def test_validated_editorial_data(self):
        subprocess.run(
            [sys.executable, "scripts/build-polyphonic.py", "--validate"],
            cwd=ROOT, check=True
        )

    def test_five_approved_examples_and_drafts_not_misrepresented(self):
        doc = json.loads(CURATED.read_text(encoding="utf-8"))["entries"]
        self.assertEqual(len(doc), 30)
        self.assertEqual(
            {c for c, item in doc.items() if item["status"] == "approved"},
            {"缝", "长", "行", "重", "乐"}
        )
        for char, entry in doc.items():
            self.assertGreaterEqual(len(entry["readings"]), 2)
            self.assertTrue(entry["source"].startswith("https://"))
        self.assertEqual(
            [r["p"] for r in doc["缝"]["readings"]],
            ["féng", "fèng"]
        )

if __name__ == "__main__":
    unittest.main()
