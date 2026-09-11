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


# IDS 拆解式首算子 → 小学结构名（⿻ 重叠合成与单部件字归独体字）
IDS_STRUCTURES = {
    "⿰": "左右",
    "⿱": "上下",
    "⿲": "左中右",
    "⿳": "上中下",
    "⿴": "全包围",
    "⿵": "上包围",
    "⿶": "下包围",
    "⿷": "左包围",
    "⿸": "左上包围",
    "⿹": "右上包围",
    "⿺": "左下包围",
    "⿻": "独体字",
}


def derive_structure(decomposition: str, char: str) -> str | None:
    # makemeahanzi 拆解式不带空格：首字符即 IDS 算子（⿰女马 → 左右）；
    # 单部件拆解（如 丁→一）为象形独体字
    if not decomposition or "？" in decomposition:
        return None
    if decomposition == char or decomposition[0] not in IDS_STRUCTURES:
        return "独体字"
    return IDS_STRUCTURES[decomposition[0]]


def derive_components(decomposition: str, char: str) -> list[str] | None:
    """IDS 拆解式的叶子部件 → 「可以这样拆」标签（⿰女马 → [女, 马]）。"""
    if not decomposition or "？" in decomposition or decomposition == char:
        return None
    comps: list[str] = []
    for ch in decomposition:
        if ch in IDS_STRUCTURES or ch in comps:
            continue
        comps.append(ch)
        if len(comps) == 4:
            break
    return comps or None


def convert_characters(db_path: Path, dictionary_path: Path, supplements_path: Path) -> dict:
    conn = sqlite3.connect(db_path)
    rows = conn.execute(
        "SELECT character, pinyin, definition, stroke_count FROM characters"
    ).fetchall()
    conn.close()

    # 精校补充里已给结构的字不再用 IDS 派生覆盖
    curated = json.loads(supplements_path.read_text("utf-8"))
    has_curated_structure = {
        char for char, s in curated.items() if s.get("structure")
    }

    # iOS 打包的 522 字是权威数据（声调数字 + 人工校对），排在前
    characters = {}
    for char, pinyin, definition, stroke_count in rows:
        entry = {"p": pinyin or ""}
        if definition:
            entry["d"] = definition
        if stroke_count:
            entry["sc"] = stroke_count
        characters[char] = entry

    # makemeahanzi 字典补全覆盖：声调符号拼音（displayPinyin 原样显示）+
    # 英文释义 + 部首 + IDS 派生结构。无拼音的部首字形（⺀ 等）搜不到，跳过。
    added = 0
    derived_count = 0
    with dictionary_path.open(encoding="utf-8") as stream:
        for line in stream:
            obj = json.loads(line)
            char = obj.get("character", "")
            if not char or len(char) != 1:
                continue

            structure = derive_structure(obj.get("decomposition") or "", char)
            components = derive_components(obj.get("decomposition") or "", char)
            if structure and char not in has_curated_structure and not characters.get(char, {}).get("st"):
                if char in characters:
                    characters[char]["st"] = structure
                derived_count += 1
            # SQLite 字也补字典部首/部件（展示层精校优先，这里只兜底）
            if char in characters:
                if obj.get("radical") and not characters[char].get("r"):
                    characters[char]["r"] = obj["radical"]
                if components and not curated.get(char, {}).get("components") and not characters[char].get("c"):
                    characters[char]["c"] = components
                continue

            if not (obj.get("pinyin") or []):
                continue
            entry = {"p": obj["pinyin"][0]}
            if obj.get("definition"):
                entry["d"] = obj["definition"]
            if obj.get("radical"):
                entry["r"] = obj["radical"]
            if structure:
                entry["st"] = structure
            if components:
                entry["c"] = components
            characters[char] = entry
            added += 1
    print(
        f"    characters: {len(rows)} from db + {added} from makemeahanzi dictionary"
        f"（{derived_count} 个结构来自 IDS 派生）"
    )
    return characters


def convert_strokes(source_dir: Path) -> None:
    """hanzi-writer-data（devDependency）全量单字笔顺，去掉 radStrokes 精简。"""
    strokes_out = OUT_DIR / "strokes"
    if strokes_out.exists():
        shutil.rmtree(strokes_out)
    strokes_out.mkdir(parents=True)

    count = 0
    for path in sorted(source_dir.glob("*.json")):
        if len(path.stem) != 1:
            continue  # 跳过 index.js / README 等非单字文件
        payload = json.loads(path.read_text(encoding="utf-8"))
        payload.pop("radStrokes", None)
        (strokes_out / path.name).write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        count += 1
    total_mb = sum(f.stat().st_size for f in strokes_out.glob("*.json")) / 1024 / 1024
    print(f"  data/strokes/ ({count} files, {total_mb:.1f} MB total)")


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    if not source.is_dir():
        sys.exit(f"Source repo not found: {source}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Converting data from {source}:")

    # 1. Character lookup table (SQLite 522 字 + makemeahanzi 字典补全)
    dump(
        OUT_DIR / "characters.json",
        convert_characters(
            source / "Data" / "characters.db",
            source / "Data" / "dictionary.txt",
            source / "Resources" / "character_supplements.json",
        ),
    )

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

    # 6. Per-character stroke files: hanzi-writer-data 全量（含 iOS 522 字的超集）
    hw_data_dir = REPO_ROOT / "node_modules" / "hanzi-writer-data"
    if not hw_data_dir.is_dir():
        sys.exit("hanzi-writer-data missing — run: npm install")
    convert_strokes(hw_data_dir)


if __name__ == "__main__":
    main()
