#!/usr/bin/env python3
"""Validate polyphonic editorial content and produce optional static data overlays.

Pinned Unicode-derived pinyin source snapshots are in sources/. The merged
source is audit-only; modern reference-backed readings feed the index.

Usage:
  python3 scripts/build-polyphonic.py --validate
  python3 scripts/build-polyphonic.py --audit
  python3 scripts/build-polyphonic.py --write-audit
  python3 scripts/build-polyphonic.py --check-audit
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
            assert len(item["meaning"].strip()) >= 2, char
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


# Pinned data: mozillazg/pinyin-data v0.15.0 (MIT plus Unicode Terms of Use).
PINNED = ROOT / "sources" / "pinyin-data-v0.15.0"
MERGED = PINNED / "pinyin.txt"
STANDARD = PINNED / "kTGHZ2013.txt"
AUDIT_DIR = ROOT / "reports"
CODEPOINT = re.compile(r"^U\+([0-9A-Fa-f]{4,6}):\s*([^#]*)")


def parse_reading_source(path: Path) -> dict[str, list[str]]:
    """Parse code point lines into de-duplicated, tone-marked Hanyu Pinyin."""
    result = {}
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        match = CODEPOINT.match(line)
        if match is None:
            raise ValueError(f"{path.name}:{number}: malformed row")
        char = chr(int(match[1], 16))
        raw = [canonical_pinyin(p) for p in match[2].split(",") if p.strip()]
        result[char] = list(dict.fromkeys(raw))
    return result


def audited_index(entries: dict, table: dict) -> tuple[dict, dict]:
    """Inventory all candidates; index only source-backed modern readings.

    Merged pinyin.txt has rare, historical and specialised variants (candidates
    only). kTGHZ2013 is a modern dictionary reading reference. It is not a
    substitute for editorial review of each child-facing meaning and example.
    """
    merged = parse_reading_source(MERGED)
    standard = parse_reading_source(STANDARD)
    indexed, candidates, legacy_mismatches = {}, {}, {}
    for char, record in table.items():
        suggested = merged.get(char, [])
        reference = standard.get(char, [])
        curated = entries.get(char)
        editorial = curated["status"] if curated else "none"
        confirmed = [item["p"] for item in curated["readings"]] if editorial == "approved" else []
        reference_multi = len(reference) > 1
        if reference_multi:
            indexed[char] = list(dict.fromkeys(confirmed + reference))
        elif confirmed:
            indexed[char] = list(dict.fromkeys(confirmed))
        if len(suggested) > 1 or reference_multi:
            candidates[char] = {
                "candidateReadings": suggested,
                "referenceReadings": reference,
                "status": "reference" if reference_multi else "needs-review",
                "editorial": editorial,
            }
        if char in indexed and len(indexed[char]) > 1:
            legacy = canonical_pinyin(record.get("p", ""))
            if legacy and legacy not in indexed[char]:
                legacy_mismatches[char] = {
                    "legacy": legacy, "reference": indexed[char],
                }
    counts = {
        "dictionaryCharacters": len(table),
        "mergedSourceCharacters": sum(ch in merged for ch in table),
        "referenceSourceCharacters": sum(ch in standard for ch in table),
        "multiReadingCandidates": sum(len(merged.get(ch, [])) > 1 for ch in table),
        "referenceMultiReadingCharacters": sum(len(standard.get(ch, [])) > 1 for ch in table),
        "indexedMultiReadingCharacters": sum(len(ps) > 1 for ps in indexed.values()),
        "needsReviewCandidates": sum(item["status"] == "needs-review" for item in candidates.values()),
        "editoriallyApprovedCharacters": sum(x["status"] == "approved" for x in entries.values()),
        "legacyPrimaryOutsideIndex": len(legacy_mismatches),
    }
    return indexed, {
        "schemaVersion": 1,
        "source": {
            "project": "mozillazg/pinyin-data",
            "version": "v0.15.0",
            "reference": "kTGHZ2013.txt",
            "candidate": "pinyin.txt",
            "warning": "Merged readings include rare/historical variants; not verified for teaching.",
        },
        "summary": counts,
        "characters": candidates,
        "legacyPrimaryOutsideIndex": legacy_mismatches,
    }


def render(entries: dict) -> tuple[str, str]:
    table = json.loads((DATA / "characters.json").read_text(encoding="utf-8"))
    indexed, _audit = audited_index(entries, table)
    approved = {}
    # Make --write and --check idempotent (strip any prior generated ps).
    for record in table.values():
        record.pop("ps", None)
    for char, readings in indexed.items():
        if len(readings) > 1:
            table[char]["ps"] = readings
    for char, entry in entries.items():
        if entry["status"] != "approved":
            continue
        if char not in table:
            raise ValueError(f"Missing dictionary character {char}")
        # Legacy p and mixed d remain for compatibility but must never
        # be interpreted as a per-reading definition by the new UI.
        approved[char] = {"readings": entry["readings"]}
    return (
        json.dumps(table, ensure_ascii=False, separators=(",", ":")) + "\n",
        json.dumps(approved, ensure_ascii=False, separators=(",", ":")) + "\n",
    )


def render_audit(entries: dict) -> tuple[str, str]:
    table = json.loads((DATA / "characters.json").read_text(encoding="utf-8"))
    _indexed, audit = audited_index(entries, table)
    counts = audit["summary"]
    data = json.dumps(audit, ensure_ascii=False, indent=2) + "\n"
    lines = [
        "# Polyphonic pronunciation inventory",
        "",
        "Source: mozillazg/pinyin-data v0.15.0",
        "(https://github.com/mozillazg/pinyin-data/tree/v0.15.0).",
        "Candidate source: pinyin.txt. Modern dictionary reference: kTGHZ2013.txt.",
        "",
        "Counts refer only to existing Write It characters, not all Hanzi.",
        "Merged candidate pronunciations may include historical, rare or",
        "specialised readings and must not be auto-published.",
        "",
        "| Metric | Count |",
        "| --- | ---: |",
    ]
    for name, value in counts.items():
        lines.append(f"| {name} | {value} |")
    lines += [
        "",
        "The complete per-character inventory with both source readings and",
        "status flags is in polyphonic-audit.json.",
        "",
        "reference = modern-dictionary reference has multiple readings.",
        "needs-review = variant appears in merged source only.",
        "editorial = separate reviewed child-friendly meaning/example status.",
        "",
        "Only reference-backed multiple readings and separately approved",
        "editorial overrides are copied to characters.json.ps.",
        "The merged-only candidates stay in this audit report.",
        "",
    ]
    return data, "\n".join(lines)


def audit_dictionary(path: Path, entries: dict) -> None:
    """Compare legacy Make Me a Hanzi raw source (NOT a complete index)."""
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
            unique = list(dict.fromkeys(canonical_pinyin(p) for p in raw if p.strip()))
            if len(unique) > 1:
                candidates[char] = unique
    print(f"Legacy source has {len(candidates)} explicit multiple-readings only.")


def verify_or_write(files: dict[Path, str], write: bool) -> None:
    for path, content in files.items():
        if write:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
            print(f"Wrote {path.relative_to(ROOT)}")
        elif not path.exists() or path.read_text(encoding="utf-8") != content:
            sys.exit(f"Generated file out of date: {path.relative_to(ROOT)}")


def main() -> None:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--validate", action="store_true")
    group.add_argument("--audit", action="store_true")
    group.add_argument("--write-audit", action="store_true")
    group.add_argument("--check-audit", action="store_true")
    group.add_argument("--write", action="store_true")
    group.add_argument("--check", action="store_true")
    group.add_argument("--audit-dictionary", type=Path)
    args = parser.parse_args()
    entries = validate()
    if args.audit_dictionary:
        audit_dictionary(args.audit_dictionary, entries)
    if args.audit or args.write_audit or args.check_audit:
        audit_json, audit_markdown = render_audit(entries)
        if args.audit:
            print(json.dumps(json.loads(audit_json)["summary"], ensure_ascii=False, indent=2))
        else:
            verify_or_write({
                AUDIT_DIR / "polyphonic-audit.json": audit_json,
                AUDIT_DIR / "polyphonic-audit.md": audit_markdown,
            }, write=args.write_audit)
    if args.write or args.check:
        characters, polyphonic = render(entries)
        verify_or_write({
            DATA / "characters.json": characters,
            DATA / "polyphonic.json": polyphonic,
        }, write=args.write)


if __name__ == "__main__":
    main()
