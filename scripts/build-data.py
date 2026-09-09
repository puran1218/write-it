#!/usr/bin/env python3
"""Convert the 字宝宝 iOS app's bundled data (../minimaxi) into static JSON
for the web plugin. Outputs into static/zi/data/.

Usage: python3 scripts/build-data.py [path-to-minimaxi-repo]
"""

import json
import shutil
import sqlite3
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE = REPO_ROOT.parent / "minimaxi"
OUT_DIR = REPO_ROOT / "static" / "zi" / "data"


def dump(path: Path, payload) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"  {path.relative_to(REPO_ROOT)} ({path.stat().st_size / 1024:.0f} KB)")


def convert_characters(db_path: Path) -> dict:
    conn = sqlite3.connect(db_path)
    rows = conn.execute(
        "SELECT character, pinyin, definition, stroke_count FROM characters"
    ).fetchall()
    conn.close()

    characters = {}
    for char, pinyin, definition, stroke_count in rows:
        entry = {"p": pinyin or ""}
        if definition:
            entry["d"] = definition
        if stroke_count:
            entry["sc"] = stroke_count
        characters[char] = entry
    return characters


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    if not source.is_dir():
        sys.exit(f"Source repo not found: {source}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Converting data from {source}:")

    # 1. Character lookup table (from SQLite)
    dump(OUT_DIR / "characters.json", convert_characters(source / "Data" / "characters.db"))

    # 2. Curated words (the SQLite words table may not exist; iOS reads this JSON)
    raw_words = json.loads((source / "Data" / "character_words.json").read_text("utf-8"))
    words = {
        char: [{"w": w["word"], "p": w["pinyin"]} for w in entries]
        for char, entries in raw_words.get("characters", {}).items()
    }
    dump(OUT_DIR / "words.json", words)

    # 3. Example sentences
    raw_sentences = json.loads((source / "Data" / "example_sentences.json").read_text("utf-8"))
    sentences = {
        char: [{"s": s["sentence"], "p": s["pinyin"]} for s in entries]
        for char, entries in raw_sentences.items()
    }
    dump(OUT_DIR / "sentences.json", sentences)

    # 4. Learning supplements (radical / structure / decomposition / hint)
    supplements = json.loads(
        (source / "Resources" / "character_supplements.json").read_text("utf-8")
    )
    slim = {
        char: {
            "r": s.get("radical"),
            "st": s.get("structure"),
            "c": s.get("components"),
            "dc": s.get("decomposition"),
            "h": s.get("hint"),
        }
        for char, s in supplements.items()
    }
    dump(OUT_DIR / "supplements.json", slim)

    # 5. Curriculum ordering: precompute the sorted character list
    #    (displayOrder, then frequencyRank, then codepoint — same as CurriculumStore)
    metadata = json.loads(
        (source / "Resources" / "curriculum_metadata.json").read_text("utf-8")
    )
    ordered = sorted(
        metadata.keys(),
        key=lambda c: (
            metadata[c].get("displayOrder", sys.maxsize),
            metadata[c].get("frequencyRank", sys.maxsize),
            c,
        ),
    )
    dump(OUT_DIR / "curriculum.json", {"order": ordered})

    # 6. Handwriting recognition index (522 chars, stroke median points) —
    #    lazy-loaded on first use of the draw screen, runtime-cached by the SW
    shutil.copyfile(
        source / "Resources" / "handwrite_recognition_index.json",
        OUT_DIR / "handwrite_index.json",
    )
    print(
        f"  data/handwrite_index.json "
        f"({(OUT_DIR / 'handwrite_index.json').stat().st_size / 1024 / 1024:.1f} MB)"
    )

    # 6. Per-character stroke files (makemeahanzi SVG paths + medians), copied as-is
    strokes_out = OUT_DIR / "strokes"
    if strokes_out.exists():
        shutil.rmtree(strokes_out)
    shutil.copytree(source / "Data" / "strokes", strokes_out)
    total_kb = sum(f.stat().st_size for f in strokes_out.glob("*.json")) / 1024
    print(f"  data/strokes/ ({len(list(strokes_out.glob('*.json')))} files, {total_kb:.0f} KB total)")


if __name__ == "__main__":
    main()
