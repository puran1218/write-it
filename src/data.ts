/** Offline data loading + pinyin formatting. All files live under ./data/. */

import type {
  CharacterInfo,
  CharacterPreview,
  SentenceItem,
  StrokeSegment,
  Supplement,
  WordItem,
} from "./types";

async function loadJson<T>(relativePath: string): Promise<T> {
  const response = await fetch(relativePath);
  if (!response.ok) {
    throw new Error(`Failed to load ${relativePath}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Bundled tables (loaded once, on first use)

let charactersTable: Promise<Record<string, { p: string; d?: string; sc?: number; r?: string; st?: string; c?: string[] }>> | null = null;
let wordsTable: Promise<Record<string, WordItem[]>> | null = null;
let sentencesTable: Promise<Record<string, SentenceItem[]>> | null = null;
let supplementsTable: Promise<Record<string, Supplement>> | null = null;
let curriculumOrder: Promise<string[]> | null = null;

function characters(): Promise<Record<string, { p: string; d?: string; sc?: number; r?: string; st?: string; c?: string[] }>> {
  charactersTable ??= loadJson("./data/characters.json");
  return charactersTable;
}

function words(): Promise<Record<string, WordItem[]>> {
  wordsTable ??= loadJson("./data/words.json");
  return wordsTable;
}

function sentences(): Promise<Record<string, SentenceItem[]>> {
  sentencesTable ??= loadJson("./data/sentences.json");
  return sentencesTable;
}

function supplements(): Promise<Record<string, Supplement>> {
  supplementsTable ??= loadJson("./data/supplements.json");
  return supplementsTable;
}

function curriculum(): Promise<string[]> {
  curriculumOrder ??= loadJson<{ order: string[] }>("./data/curriculum.json").then((data) => data.order);
  return curriculumOrder;
}

// ---------------------------------------------------------------------------
// Stroke files（按分包懒加载：manifest 记录 字 → 分包，包内按字取数据）

export interface StrokeFile {
  character: string;
  strokes: string[];
  medians?: number[][][];
}

interface RawStrokeData {
  strokes: string[];
  medians?: number[][][];
}

let packManifestPromise: Promise<Record<string, string>> | null = null;
const packPromises = new Map<string, Promise<Record<string, RawStrokeData>>>();
const strokeFileCache = new Map<string, Promise<StrokeFile | null>>();

async function rawStrokeData(character: string): Promise<RawStrokeData | null> {
  packManifestPromise ??= loadJson("./data/strokes-manifest.json");
  const manifest = await packManifestPromise;
  const packFile = manifest[character];
  if (!packFile) {
    return null;
  }
  let pack = packPromises.get(packFile);
  if (!pack) {
    pack = loadJson(`./data/${packFile}`);
    packPromises.set(packFile, pack);
  }
  return (await pack)[character] ?? null;
}

/** 整份笔顺数据（hanzi-writer 的 charDataLoader 直接吃这个格式）。 */
export function loadStrokeFile(character: string): Promise<StrokeFile | null> {
  let pending = strokeFileCache.get(character);
  if (!pending) {
    pending = rawStrokeData(character)
      .then((raw) => (raw ? { ...raw, character } : null))
      .catch(() => null);
    strokeFileCache.set(character, pending);
  }
  return pending;
}

/** makemeahanzi flat format → StrokeSegment list (same as OfflineDataManager.parseStrokes). */
function toSegments(file: RawStrokeData): StrokeSegment[] {
  return file.strokes.map((path, index) => ({
    strokeIndex: index,
    path,
    medianPoints: (file.medians?.[index] ?? [])
      .filter((point) => point.length === 2)
      .map(([x, y]) => ({ x, y })),
  }));
}

// ---------------------------------------------------------------------------
// Lookup

export async function lookup(character: string): Promise<CharacterInfo> {
  const [table, rawStrokes, wordList, sentenceList, supplementMap] = await Promise.all([
    characters(),
    rawStrokeData(character).catch(() => null),
    words(),
    sentences(),
    supplements(),
  ]);
  const strokesData = rawStrokes ? toSegments(rawStrokes) : [];

  const entry = table[character];
  const supplement = supplementMap[character] ?? null;

  return {
    character,
    pinyin: entry?.p || `${character}0`,
    definition: entry?.d ?? null,
    radical: supplement?.r ?? entry?.r ?? null,
    structure: supplement?.st ?? entry?.st ?? null,
    components: supplement?.c ?? entry?.c ?? null,
    decomposition: supplement?.dc ?? null,
    learningHint: supplement?.h ?? null,
    strokeCount: entry?.sc ?? strokesData.length,
    strokes: strokesData,
    words: wordList[character] ?? [],
    sentences: sentenceList[character] ?? [],
  };
}

// ---------------------------------------------------------------------------
// Search

const CJK_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const LOW_INTENT_CHARACTERS = new Set(
  "我要想看找查说读学写小大这个一的吗呢请帮给字".split("")
);

export function isChineseCharacter(text: string): boolean {
  return CJK_PATTERN.test(text);
}

/** Port of VoiceQueryResolution.searchTerm: "我要查花" → "花". */
export function searchTerm(forQuery: string): string {
  const trimmed = forQuery.trim();
  const chinese = [...trimmed].filter((char) => CJK_PATTERN.test(char));
  if (chinese.length === 0) {
    return trimmed;
  }
  return [...chinese].reverse().find((char) => !LOW_INTENT_CHARACTERS.has(char)) ?? chinese[chinese.length - 1];
}

/** 拼音搜索键：去声调符号与数字、转小写（"dà"/"da4" → "da"）。 */
function foldPinyin(pinyin: string): string {
  return pinyin
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[0-9]/g, "")
    .toLowerCase();
}

/** Pinyin prefix search ("hua" → 花 画 化…), capped like the iOS app. */
export async function searchByPinyin(query: string): Promise<CharacterPreview[]> {
  const cleaned = foldPinyin(query);
  if (!cleaned) {
    return [];
  }

  const table = await characters();
  const results: CharacterPreview[] = [];
  for (const [character, entry] of Object.entries(table)) {
    if (foldPinyin(entry.p).startsWith(cleaned)) {
      results.push({ character, pinyin: entry.p });
      if (results.length >= 12) {
        break;
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Pinyin display: "kai1 hua1" → "kāi huā"（轻声 5 只去数字）
// 标调位置按小学规则：a 优先，其次 o、e；iu/ui 标在后一个字母；兜底标最后一个元音。

const TONE_MARKS: Record<string, string[]> = {
  a: ["ā", "á", "ǎ", "à"],
  o: ["ō", "ó", "ǒ", "ò"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  u: ["ū", "ú", "ǔ", "ù"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
};

function toneMarkSyllable(syllable: string): string {
  const toneMatch = syllable.match(/[1-5]/);
  const base = syllable.replace(/[0-9]/g, "");
  if (!toneMatch || toneMatch[0] === "5") {
    return base;
  }
  const tone = Number(toneMatch[0]);

  const lower = base.toLowerCase();
  let target = lower.indexOf("a");
  if (target < 0) target = lower.indexOf("o");
  if (target < 0) target = lower.indexOf("e");
  if (target < 0) {
    const iu = lower.indexOf("iu");
    const ui = lower.indexOf("ui");
    if (iu >= 0) {
      target = iu + 1;
    } else if (ui >= 0) {
      target = ui + 1;
    }
  }
  if (target < 0) {
    for (let index = lower.length - 1; index >= 0; index -= 1) {
      if ("aeiouvü".includes(lower[index])) {
        target = index;
        break;
      }
    }
  }
  if (target < 0) {
    return base;
  }

  const marked = TONE_MARKS[lower[target]]?.[tone - 1];
  return marked ? base.slice(0, target) + marked + base.slice(target + 1) : base;
}

/** Pinyin with tone marks for display ("sha4ng" → "shàng"). */
export function displayPinyin(pinyin: string): string {
  return pinyin
    .split(/(\s+)/)
    .map((part) => (/\s/.test(part) ? part : toneMarkSyllable(part)))
    .join("");
}

// ---------------------------------------------------------------------------
// Curriculum (ordering precomputed at build time)

export interface BookSection {
  id: string;
  title: string;
  characters: string[];
}

const SECTION_TITLES = ["刚认识", "常说常用", "身边看到"];

export async function bookSections(sectionSize = 6): Promise<BookSection[]> {
  const order = await curriculum();
  const sections: BookSection[] = [];
  for (let index = 0; index < order.length; index += sectionSize) {
    const chunk = order.slice(index, index + sectionSize);
    const sectionNumber = sections.length;
    sections.push({
      id: `curriculum-section-${sectionNumber + 1}`,
      title: SECTION_TITLES[sectionNumber] ?? `继续探索 ${sectionNumber + 1}`,
      characters: chunk,
    });
  }
  return sections;
}

export async function starterCharacters(limit: number): Promise<string[]> {
  const order = await curriculum();
  return order.slice(0, limit);
}

export async function recommendedTodayCharacter(excluding: string[]): Promise<string | null> {
  const order = await curriculum();
  const viewed = new Set(excluding);
  return order.find((character) => !viewed.has(character)) ?? order[0] ?? null;
}

export async function curriculumCharacterSet(): Promise<Set<string>> {
  return new Set(await curriculum());
}
