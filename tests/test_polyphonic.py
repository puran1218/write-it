"""Conservative contract checks for the polyphonic editorial pipeline."""
import json
import importlib.util
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CURATED = ROOT / "content/polyphonic-curated.json"
CHARACTERS = ROOT / "static/zi/data/characters.json"

class PolyphonicContentTests(unittest.TestCase):
    def test_full_source_inventory_and_confirmed_index(self):
        spec = importlib.util.spec_from_file_location("polyphonic_build", ROOT / "scripts/build-polyphonic.py")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        entries = mod.validate()
        table = json.loads(CHARACTERS.read_text(encoding="utf-8"))
        indexed, audit = mod.audited_index(entries, table)
        counts = audit["summary"]
        self.assertEqual(counts["dictionaryCharacters"], 9565)
        self.assertEqual(counts["multiReadingCandidates"], 3459)
        self.assertEqual(counts["referenceMultiReadingCharacters"], 582)
        self.assertEqual(counts["indexedMultiReadingCharacters"], 582)
        self.assertEqual(counts["needsReviewCandidates"], 3459 - 582)
        self.assertEqual(len(audit["characters"]), 3459)
        self.assertEqual(indexed["缝"][:2], ["féng", "fèng"])
        self.assertIn("cháng", indexed["长"])
        self.assertIn("zhǎng", indexed["长"])
        self.assertIn("xíng", indexed["行"])
        self.assertIn("háng", indexed["行"])
        self.assertNotIn("tóng", indexed["重"])  # merged-source-only historical variant
        self.assertEqual(audit["characters"]["还"]["status"], "reference")
        self.assertEqual(audit["characters"]["缝"]["editorial"], "approved")
        self.assertEqual(audit["characters"]["觉"]["editorial"], "draft")

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
