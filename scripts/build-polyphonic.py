#!/usr/bin/env python3
"""Validate polyphonic editorial content and produce optional static data overlays.

No external dictionary is required for validation / --write. Automatic dictionary
candidate discovery is audit-only: it NEVER publishes unreviewed meanings.

Usage:
  python3 scripts/build-polyphonic.py --validate
  python3 scripts/build-polyphonic.py --audit-dictionary ../minimaxi/Data/dictionary.txt
  python3 scripts/build-polyphonic.py --write
  python3 scripts/build-polyphonic.py --check
"""
import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CURATED = ROOT / "content/polyphonic-curated.json"
DATA = ROOT / "static/zi/data"

VOWELS = "aeiouvü"
TONE_MARKS = {
    "a": "āáǎà", "e": "ēéěè", "i": "īíǐì",
    "o": "ōóǒò", "u": "ūúǔù", "ü": "ǖǘǚǜ",
}
HANZI = re.compile(r"[\u3400-\u9fff]")

def canonical_pinyin(value: str) -> str:
    """Normalize mixed numeric/marked pinyin to a single NFC representation."""
    value = unicodedata.normalize("NFC", value.strip().lower().replace("u:", "ü").replace("v", "ü"))
    # A source may use e.g. zha3ng or chang2, not necessarily a trailing digit.
    def convert(match: re.Match) -> str:
        syllable = match.group(0)
        digits = re.findall(r"[1-5]", syllable)
        bare = re.sub(r"[1-5]", "", syllable)
        if not digits or digits[0] == "5":
            return bare
        tone = int(digits[0]) - 1
        target = -1
        for vowel in "aoe":
            if vowel in bare:
                target = bare.index(vowel)
                break
        if target < 0:
            if "iu" in bare:
                target = bare.index("iu") + 1
            elif "ui" in bare:
                target = bare.index("ui") + 1
            else:
                target = max((i for i, c in enumerate(bare) if c in VOWELS), default=-1)
        if target < 0:
            return bare
        marks = TONE_MARKS.get(bare[target])
        return bare[:target] + (marks[tone] if marks else bare[target]) + bare[target+1:]
    return " ".join(convert(re.match(r".+", part)) for part in value.split()) if re.search(r"[1-5]", value) else value

def fold(value: str) -> str:
    return "".join(ch for ch in unicodedata.normalize("NFD", canonical_pinyin(value))
                   if not unicodedata.combining(ch)).replace("ü", "v")

def validate() -> dict:
    doc = json.loads(CURATED.read_text(encoding="utf-8"))
    assert doc.get("schemaVersion") == 1
    entries = doc["entries"]
    for char, entry in entries.items():
        assert len(char) == 1 and HANZI.fullmatch(char), char
        assert entry["status"] in {"approved", "draft"}, char
        assert entry.get("source", "").startswith("https://"), char
        assert len(entry["readings"]) >= 2, char
        seen = set()
        for item in entry["readings"]:
            p = canonical_pinyin(item["p"])
            assert item["p"] == p and p not in seen, (char, p)
            seen.add(p)
            assert len(item["meaning"].strip()) >= 3, char
            assert len(item["words"]) >= 2, char
            for word in item["words"]:
                tokens = word["p"].split()
                chars = [c for c in word["w"] if HANZI.fullmatch(c)]
                assert len(tokens) == len(chars), (char, word, "token count")
                assert char in chars, (char, word, "target character absent")
                # For repeated occurrences, at least one must be read this way.
                assert any(c == char and canonical_pinyin(tokens[i]) == p
                           for i, c in enumerate(chars)), (char, word, "reading mismatch")
    print(f"Validated {len(entries)} candidates; "
          f"{sum(x['status']=='approved' for x in entries.values())} approved, "
          f"{sum(x['status']=='draft' for x in entries.values())} editorial drafts.")
    return entries

def render(entries: dict) -> tuple[str, str]:
    table = json.loads((DATA / "characters.json").read_text(encoding="utf-8"))
    approved = {}
    for char, entry in entries.items():
        if entry["status"] != "approved":
            continue
        if char not in table:
            raise ValueError(f"Missing dictionary character {char}")
        readings = [item["p"] for item in entry["readings"]]
        table[char]["ps"] = readings
        # The old single pinyin + mixed English definition are preserved for
        # backward compatibility. New views must never treat d as sense-specific.
        approved[char] = {"readings": entry["readings"]}
    return (
        json.dumps(table, ensure_ascii=False, separators=(",", ":")) + "\n",
        json.dumps(approved, ensure_ascii=False, separators=(",", ":")) + "\n",
    )

def audit_dictionary(path: Path, entries: dict) -> None:
    """Report all raw alternative pronunciations without treating them as verified."""
    candidates = {}
    with path.open(encoding="utf-8") as stream:
        for line in stream:
            row = json.loads(line)
            char = row.get("character", "")
            if len(char) != 1 or not HANZI.fullmatch(char):
                continue
            raw = row.get("pinyin") or []
            if isinstance(raw, str):
                raw = [raw]
            deduped = list(dict.fromkeys(canonical_pinyin(p) for p in raw if p.strip()))
            if len(deduped) > 1:
                candidates[char] = deduped
    not_curated = {c: v for c, v in candidates.items() if c not in entries}
    print(f"Raw dictionary contains {len(candidates)} multi-reading candidates; "
          f"{len(not_curated)} not yet in editorial queue.")
    print("Examples (UNREVIEWED): " +
          ", ".join(f"{c}: {'/'.join(ps)}" for c, ps in list(not_curated.items())[:20]))

def main() -> None:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--validate", action="store_true")
    group.add_argument("--write", action="store_true")
    group.add_argument("--check", action="store_true")
    group.add_argument("--audit-dictionary", type=Path)
    args = parser.parse_args()
    entries = validate()
    if args.audit_dictionary:
        audit_dictionary(args.audit_dictionary, entries)
    if args.write or args.check:
        characters, polyphonic = render(entries)
        files = {DATA / "characters.json": characters, DATA / "polyphonic.json": polyphonic}
        for path, content in files.items():
            if args.write:
                path.write_text(content, encoding="utf-8")
                print(f"Wrote {path.relative_to(ROOT)}")
            elif not path.exists() or path.read_text(encoding="utf-8") != content:
                sys.exit(f"Generated data out of date: {path.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
