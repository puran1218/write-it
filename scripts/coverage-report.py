#!/usr/bin/env python3
"""字宝宝 web 数据覆盖统计：笔顺 / 拼音 / 释义 / 部首 / 结构 / 拆字提示。

用法：python3 scripts/coverage-report.py（需先跑过 build-data.py）
"""

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA = REPO_ROOT / "static" / "zi" / "data"

table = json.loads((DATA / "characters.json").read_text("utf-8"))
supplements = json.loads((DATA / "supplements.json").read_text("utf-8"))
curriculum = json.loads((DATA / "curriculum.json").read_text("utf-8"))["order"]
stroke_files = {path.stem for path in (DATA / "strokes").glob("*.json")}

all_chars = list(table.keys())


def has_radical(char: str) -> bool:
    return bool(supplements.get(char, {}).get("r") or table[char].get("r"))


def has_structure(char: str) -> bool:
    return bool(supplements.get(char, {}).get("st") or table[char].get("st"))


def has_learning(char: str) -> bool:
    s = supplements.get(char, {})
    return bool(s.get("dc") or s.get("h"))


rows = [
    ("有笔顺", lambda c: c in stroke_files),
    ("有拼音", lambda c: bool(table[c].get("p"))),
    ("有释义", lambda c: bool(table[c].get("d"))),
    ("有部首", has_radical),
    ("有结构", has_structure),
    ("有拆字/口诀", has_learning),
]

print(f"字符表 {len(all_chars)} 字 ｜ 课程 {len(curriculum)} 字 ｜ 精校补充 {len(supplements)} 字 ｜ 笔顺文件 {len(stroke_files)} 个")
print()
print(f"{'项目':<12}{'覆盖':>8}{'比例':>8}")
for name, predicate in rows:
    have = sum(1 for char in all_chars if predicate(char))
    print(f"{name:<12}{have:>6}/{len(all_chars)}{have / len(all_chars) * 100:>7.0f}%")

print()
print(f"课程 {len(curriculum)} 字（贴纸册/今日一字的核心集）：")
print(f"  有笔顺          {sum(1 for c in curriculum if c in stroke_files)}/{len(curriculum)}")
print(f"  有精校补充      {sum(1 for c in curriculum if c in supplements)}/{len(curriculum)}")
print(f"  有结构(含派生)  {sum(1 for c in curriculum if has_structure(c))}/{len(curriculum)}")

missing = sorted(set(all_chars) - stroke_files)
extra = sorted(stroke_files - set(all_chars))
print()
print(f"字符表内缺笔顺文件：{len(missing)} 个{' ' + ' '.join(missing[:15]) if missing else ''}")
print(f"有笔顺但不在字符表（部首字形等，仅 ?char= 可达）：{len(extra)} 个")
