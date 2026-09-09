/**
 * 画给我看 — OfflineHandwriteRecognitionService 的 TS 移植。
 *
 * 索引是 makemeahanzi 中线（y 向上）归一化到 ±0.5 的结果；画布采集的是
 * 屏幕 y 向下坐标，所以打分前先把输入 y 取反（iOS 版少了这一步，属于
 * 已知隐患，Web 版直接做对）。其余阈值与权重逐项对照 Swift 实现。
 */

import type { HandwriteCandidate } from "./types";

export interface StrokePoint {
  x: number;
  y: number;
}

export type HandwriteStroke = StrokePoint[];

interface IndexEntry {
  character: string;
  pinyin?: string;
  strokeCount: number;
  strokes: { points: StrokePoint[] }[];
}

const MINIMUM_SCORE = 0.25;
const LOW_SCORE_FALLBACK = 0.08;
const MAX_CANDIDATES = 6;
const MINIMUM_DRAWING_LENGTH = 16;
const SAMPLE_COUNT = 20;

let indexPromise: Promise<IndexEntry[]> | null = null;

function loadIndex(): Promise<IndexEntry[]> {
  indexPromise ??= fetch("./data/handwrite_index.json").then((response) => {
    if (!response.ok) {
      throw new Error(`handwrite index ${response.status}`);
    }
    return response.json() as Promise<IndexEntry[]>;
  });
  return indexPromise;
}

export async function recognize(strokes: HandwriteStroke[]): Promise<HandwriteCandidate[]> {
  if (strokes.some((stroke) => stroke.length < 2)) {
    throw new Error("invalid-stroke");
  }

  const drawingLength = strokes.reduce((total, stroke) => total + pathLength(stroke), 0);
  if (drawingLength < MINIMUM_DRAWING_LENGTH) {
    return [];
  }

  const index = await loadIndex();

  // 画布 y 向下 → 索引 y 向上：取反后再归一化
  const normalizedInput = normalize(
    strokes.map((stroke) => stroke.map((point) => ({ x: point.x, y: -point.y })))
  );
  if (normalizedInput.length === 0) {
    return [];
  }

  const scored = index
    .map((entry) => ({
      character: entry.character,
      pinyin: entry.pinyin ?? null,
      score: scoreInput(normalizedInput, entry),
    }))
    .sort((a, b) => b.score - a.score || (a.character < b.character ? -1 : 1));

  const confident = scored.filter((candidate) => candidate.score >= MINIMUM_SCORE);
  const pool = confident.length > 0 ? confident : scored.filter((c) => c.score >= LOW_SCORE_FALLBACK);
  return pool.slice(0, MAX_CANDIDATES);
}

function scoreInput(input: StrokePoint[][], entry: IndexEntry): number {
  const indexed = normalize(entry.strokes.map((stroke) => stroke.points));
  if (input.length === 0 || indexed.length === 0) {
    return 0;
  }

  const comparedCount = Math.min(input.length, indexed.length);
  const strokeScores: number[] = [];
  for (let index = 0; index < comparedCount; index += 1) {
    strokeScores.push(scoreStroke(input[index], indexed[index]));
  }

  const strokeCountDelta = Math.abs(input.length - indexed.length);
  const strokeCountPenalty = Math.max(0.55, 1 - strokeCountDelta * 0.12);
  return (strokeScores.reduce((total, value) => total + value, 0) / strokeScores.length) * strokeCountPenalty;
}

function scoreStroke(input: StrokePoint[], indexed: StrokePoint[]): number {
  if (input.length <= 1 || indexed.length <= 1) {
    return 0;
  }

  const resampledInput = resample(input, SAMPLE_COUNT);
  const resampledIndexed = resample(indexed, SAMPLE_COUNT);

  const distanceScore = Math.max(0, 1 - averageDistance(resampledInput, resampledIndexed) * 1.7);
  const startScore = Math.max(0, 1 - distance(input[0], indexed[0]) * 2.2);
  const endScore = Math.max(0, 1 - distance(input[input.length - 1], indexed[indexed.length - 1]) * 2.2);
  const lengthScore = Math.max(0, 1 - Math.abs(pathLength(input) - pathLength(indexed)) * 1.8);
  const directionScore = (directionDot(input, indexed) + 1) / 2;

  return (
    distanceScore * 0.45 +
    startScore * 0.15 +
    endScore * 0.15 +
    lengthScore * 0.1 +
    directionScore * 0.15
  );
}

/** 边界盒居中并按最长边缩放到 ±0.5（y 方向保持传入姿态，翻转在调用侧做）。 */
function normalize(strokes: StrokePoint[][]): StrokePoint[][] {
  const allPoints = strokes.flat();
  if (allPoints.length === 0) {
    return [];
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of allPoints) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  const scale = Math.max(maxX - minX, maxY - minY, 1);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return strokes.map((stroke) =>
    stroke.map((point) => ({
      x: (point.x - centerX) / scale,
      y: (point.y - centerY) / scale,
    }))
  );
}

function resample(points: StrokePoint[], sampleCount: number): StrokePoint[] {
  if (points.length <= 1 || sampleCount <= 1) {
    return points;
  }

  const totalLength = pathLength(points);
  if (totalLength === 0) {
    return Array.from({ length: sampleCount }, () => points[0]);
  }

  const step = totalLength / (sampleCount - 1);
  const output: StrokePoint[] = [points[0]];
  let accumulated = 0;
  let index = 1;
  let previous = points[0];

  while (index < points.length) {
    const current = points[index];
    const segment = distance(previous, current);

    if (accumulated + segment >= step) {
      const remainder = step - accumulated;
      const ratio = segment === 0 ? 0 : remainder / segment;
      const interpolated: StrokePoint = {
        x: previous.x + (current.x - previous.x) * ratio,
        y: previous.y + (current.y - previous.y) * ratio,
      };
      output.push(interpolated);
      previous = interpolated;
      accumulated = 0;
    } else {
      accumulated += segment;
      previous = current;
      index += 1;
    }
  }

  while (output.length < sampleCount) {
    output.push(points[points.length - 1]);
  }

  return output;
}

function averageDistance(lhs: StrokePoint[], rhs: StrokePoint[]): number {
  if (lhs.length === 0) {
    return 1;
  }
  let total = 0;
  for (let index = 0; index < lhs.length; index += 1) {
    total += distance(lhs[index], rhs[index]);
  }
  return total / lhs.length;
}

function directionDot(input: StrokePoint[], expected: StrokePoint[]): number {
  const inputVector = directionVector(input);
  const expectedVector = directionVector(expected);
  if (!inputVector || !expectedVector) {
    return 1;
  }
  return inputVector.x * expectedVector.x + inputVector.y * expectedVector.y;
}

function directionVector(points: StrokePoint[]): StrokePoint | null {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) {
    return null;
  }
  const length = distance(first, last);
  if (length === 0) {
    return null;
  }
  return { x: (last.x - first.x) / length, y: (last.y - first.y) / length };
}

function pathLength(points: StrokePoint[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += distance(points[index - 1], points[index]);
  }
  return total;
}

function distance(lhs: StrokePoint, rhs: StrokePoint): number {
  return Math.hypot(rhs.x - lhs.x, rhs.y - lhs.y);
}
