import { valueNoise } from '../../packages/shared/src/world/noise.ts';
import { codeAt, COLUMNS, DROP, HEIGHT, HULL, MASSIF, PLACES, padOf, RAIL, regionAtSquare, ROWS, SEA, SEAMS, SEAM_HALF, SQUARE, WIDTH, type RailPoint } from './atlas.ts';

const hash = (x: number, y: number, seed: number): number => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

const fade = (t: number): number => t * t * (3 - 2 * t);

export function smooth(x: number, y: number, seed: number, scale: number): number {
  let total = 0;
  let weight = 0;
  let amplitude = 1;
  let frequency = 1 / scale;
  for (let octave = 0; octave < 3; octave++) {
    const fx = x * frequency;
    const fy = y * frequency;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = fade(fx - ix);
    const ty = fade(fy - iy);
    const s = seed + octave * 97;
    const top = hash(ix, iy, s) * (1 - tx) + hash(ix + 1, iy, s) * tx;
    const bottom = hash(ix, iy + 1, s) * (1 - tx) + hash(ix + 1, iy + 1, s) * tx;
    total += amplitude * (top * (1 - ty) + bottom * ty);
    weight += amplitude;
    amplitude /= 2;
    frequency *= 2;
  }
  return total / weight;
}

export const isLandCode = (code: string): boolean => code !== SEA && code !== DROP;

export function distanceToCode(x: number, y: number, matches: (code: string) => boolean, reach: number): number {
  const column = Math.floor(x / SQUARE);
  const row = Math.floor(y / SQUARE);
  let best = Infinity;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const c = column + dc;
    const r = row + dr;
    if (!matches(codeAt(c, r)) && !(c < 0 || r < 0 || c >= COLUMNS || r >= ROWS ? matches(SEA) : false)) continue;
    const left = c * SQUARE;
    const top = r * SQUARE;
    const dx = Math.max(left - x, 0, x - (left + SQUARE - 1));
    const dy = Math.max(top - y, 0, y - (top + SQUARE - 1));
    best = Math.min(best, Math.max(dx, dy));
  }
  return Math.min(best, reach);
}

export const nearPad = (x: number, y: number, margin: number): boolean =>
  PLACES.some((place) => {
    const pad = padOf(place);
    return x >= pad.x - margin && y >= pad.y - margin && x < pad.x + pad.width + margin && y < pad.y + pad.height + margin;
  });

export function seaDistance(x: number, y: number): number {
  const column = Math.floor(x / SQUARE);
  const row = Math.floor(y / SQUARE);
  let best = Infinity;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (isLandCode(codeAt(column + dc, row + dr))) continue;
    const left = (column + dc) * SQUARE;
    const top = (row + dr) * SQUARE;
    best = Math.min(best, Math.hypot(Math.max(left - x, 0, x - (left + SQUARE - 1)), Math.max(top - y, 0, y - (top + SQUARE - 1))));
  }
  return best;
}

const ease = (from: number, to: number, value: number): number => {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

const boxDistance = (box: { x: number; y: number; width: number; height: number }, x: number, y: number): number =>
  Math.max(box.x - x, 0, x - (box.x + box.width - 1), box.y - y, y - (box.y + box.height - 1));

const COAST_INSET = 7;
const COAST_SWING = 14;
const COAST_RIPPLE = 6;
const COVE_DEPTH = 10;
const HEADLAND_REACH = 5;
const KEPT_COAST = 4;
const COAST_MIN = 2;
const COAST_MAX = 22;

export function coastInset(x: number, y: number): number {
  const swing = COAST_SWING * (valueNoise(11, x / 40, y / 40) - 0.5) + COAST_RIPPLE * (valueNoise(12, x / 12, y / 12) - 0.5);
  const cove = COVE_DEPTH * ease(0.58, 0.82, valueNoise(13, x / 84, y / 84));
  const headland = HEADLAND_REACH * ease(0.6, 0.85, valueNoise(14, x / 64, y / 64));
  const pads = Math.min(...PLACES.map((place) => boxDistance(padOf(place), x, y)));
  const rail = Math.min(...SEGMENTS.map((segment) => boxDistance(segment, x, y)));
  const gates = Math.min(...GATE_PLANS.map((gate) => Math.max(Math.abs(gate.x + 0.5 - x), Math.abs(gate.y + 0.5 - y))));
  const hull = boxDistance({ ...HULL, width: HULL.width + 14 }, x, y);
  const calm = Math.min(ease(4, 22, pads), ease(6, 26, rail), ease(10, 30, gates), ease(8, 40, hull));
  const inset = COAST_INSET + swing + cove - headland;
  return Math.min(COAST_MAX, Math.max(COAST_MIN, KEPT_COAST + (inset - KEPT_COAST) * calm));
}

export function isLandTile(x: number, y: number): boolean {
  const code = codeAt(Math.floor(x / SQUARE), Math.floor(y / SQUARE));
  if (!isLandCode(code)) return false;
  if (nearPad(x, y, 4)) return true;
  const toSea = seaDistance(x, y);
  return toSea > COAST_MAX || toSea > coastInset(x, y);
}

export function isMassifTile(x: number, y: number): boolean {
  const code = codeAt(Math.floor(x / SQUARE), Math.floor(y / SQUARE));
  if (code === MASSIF) return true;
  if (!isLandCode(code)) return false;
  if (nearPad(x, y, 6) || nearRail(x, y, 5) || nearGate(x, y, 14)) return false;
  const toMassif = distanceToCode(x, y, (other) => other === MASSIF, 20);
  return toMassif < 1 + 11 * smooth(x, y, 23, 14);
}

export interface Segment {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly horizontal: boolean;
}

export const TRACK_GAUGE = 2;

export function railSegments(): Segment[] {
  const out: Segment[] = [];
  for (const line of RAIL) {
    for (let index = 1; index < line.length; index++) {
      const a = line[index - 1] as RailPoint;
      const b = line[index] as RailPoint;
      const horizontal = a.y === b.y;
      if (!horizontal && a.x !== b.x) throw new Error('rail segment is not straight');
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      out.push({ x, y, width: Math.abs(b.x - a.x) + TRACK_GAUGE, height: Math.abs(b.y - a.y) + TRACK_GAUGE, horizontal });
    }
  }
  return out;
}

const SEGMENTS = railSegments();

export const isRailTile = (x: number, y: number): boolean => SEGMENTS.some((s) => x >= s.x && y >= s.y && x < s.x + s.width && y < s.y + s.height);

export function nearRail(x: number, y: number, margin: number): boolean {
  return SEGMENTS.some((s) => x >= s.x - margin && y >= s.y - margin && x < s.x + s.width + margin && y < s.y + s.height + margin);
}

export interface SeamEdge {
  readonly seam: number;
  readonly vertical: boolean;
  readonly line: number;
  readonly from: number;
  readonly to: number;
}

export function seamEdges(): SeamEdge[] {
  const out: SeamEdge[] = [];
  SEAMS.forEach((seam, index) => {
    const [a, b] = seam.between;
    const pair = (p: string, q: string): boolean => (p === a && q === b) || (p === b && q === a);
    for (let row = 0; row < ROWS; row++) for (let column = 0; column < COLUMNS; column++) {
      const here = codeAt(column, row);
      if (pair(here, codeAt(column + 1, row))) out.push({ seam: index, vertical: true, line: (column + 1) * SQUARE, from: row * SQUARE, to: (row + 1) * SQUARE });
      if (pair(here, codeAt(column, row + 1))) out.push({ seam: index, vertical: false, line: (row + 1) * SQUARE, from: column * SQUARE, to: (column + 1) * SQUARE });
    }
  });
  return out;
}

export interface GatePlan {
  readonly id: string;
  readonly vertical: boolean;
  readonly x: number;
  readonly y: number;
}

export function gatePlans(): GatePlan[] {
  const edges = seamEdges();
  const out: GatePlan[] = [];
  SEAMS.forEach((seam, index) => {
    const mine = edges.filter((edge) => edge.seam === index);
    const candidates: { vertical: boolean; x: number; y: number }[] = [];
    for (const edge of mine) {
      for (let along = edge.from + 8; along <= edge.to - 10; along += 2) {
        const x = edge.vertical ? edge.line - 1 : along;
        const y = edge.vertical ? along : edge.line - 1;
        if (nearRail(x, y, 12)) continue;
        candidates.push({ vertical: edge.vertical, x, y });
      }
    }
    if (candidates.length < seam.gates.length) throw new Error('seam ' + seam.between.join('|') + ' has no room for its gates');
    const picked: typeof candidates = [];
    const count = seam.gates.length;
    for (let gate = 0; gate < count; gate++) {
      const target = Math.round(((gate + 0.5) / count) * (candidates.length - 1));
      picked.push(candidates[target]!);
    }
    picked.forEach((spot, gate) => out.push({ id: seam.gates[gate]!, ...spot }));
  });
  return out;
}

export const GATE_PLANS = gatePlans();

export function nearGate(x: number, y: number, reach: number): boolean {
  return GATE_PLANS.some((gate) => Math.abs(gate.x + 0.5 - x) < reach && Math.abs(gate.y + 0.5 - y) < reach);
}

export const isSeamTile = (x: number, y: number): boolean =>
  seamEdges().some((edge) => {
    const across = edge.vertical ? x : y;
    const along = edge.vertical ? y : x;
    return Math.abs(across + 0.5 - edge.line) <= SEAM_HALF + 0.5 && along >= edge.from - SEAM_HALF && along < edge.to + SEAM_HALF;
  });

export interface BridgePlan {
  readonly x: number;
  readonly y: number;
  readonly horizontal: boolean;
}

export const BRIDGE_SPACING = 24;

export function bridgePlans(): BridgePlan[] {
  const out: BridgePlan[] = [];
  for (const segment of SEGMENTS) {
    const length = segment.horizontal ? segment.width : segment.height;
    for (let along = 10; along < length - 10; along += BRIDGE_SPACING) {
      const x = segment.horizontal ? segment.x + along : segment.x;
      const y = segment.horizontal ? segment.y : segment.y + along;
      if (nearPad(x, y, 3) || nearGate(x, y, 10) || isSeamTile(x, y) || isSeamTile(x + 1, y + 1)) continue;
      const lx = x % SQUARE;
      const ly = y % SQUARE;
      if (lx < 4 || ly < 4 || lx > SQUARE - 6 || ly > SQUARE - 6) continue;
      out.push({ x, y, horizontal: segment.horizontal });
    }
  }
  return out;
}

export { WIDTH, HEIGHT, regionAtSquare };
