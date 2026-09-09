/** Shared data shapes — mirror of the iOS app's Models (CharacterInfo.swift 等). */

export interface StrokeMedianPoint {
  x: number;
  y: number;
}

export interface StrokeSegment {
  strokeIndex: number;
  path: string;
  medianPoints: StrokeMedianPoint[];
}

export interface WordItem {
  w: string;
  p: string;
}

export interface SentenceItem {
  s: string;
  p: string;
}

export interface Supplement {
  r?: string;
  st?: string;
  c?: string[];
  dc?: string;
  h?: string;
}

/** Everything known about one character — the web twin of CharacterInfo. */
export interface CharacterInfo {
  character: string;
  pinyin: string;
  definition: string | null;
  radical: string | null;
  structure: string | null;
  components: string[] | null;
  decomposition: string | null;
  learningHint: string | null;
  strokeCount: number;
  strokes: StrokeSegment[];
  words: WordItem[];
  sentences: SentenceItem[];
}

/** Persisted 字本子 state — mirror of LibraryState.swift. */
export interface LibraryState {
  recentCharacters: string[];
  unlockedCharacters: string[];
  favoriteCharacters: string[];
}

/** Ranked handwriting candidate — mirror of HandwriteCandidate.swift. */
export interface HandwriteCandidate {
  character: string;
  score: number;
  pinyin: string | null;
}

/** Lightweight result for search lists (no stroke data fetched). */
export interface CharacterPreview {
  character: string;
  pinyin: string;
}
