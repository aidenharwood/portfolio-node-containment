import { readFileSync, writeFileSync } from 'node:fs';
import { drawLand, type LandMap, type LandPlan, type LandShape, type LandStep } from '../packages/shared/src/world/landPlan.ts';
import { printLandPlan } from '../packages/shared/src/world/printLandPlan.ts';
import type { TilePoint, TileRect } from '../packages/shared/src/world/geometry.ts';
import { TILE_KINDS, type TileKindId } from '../packages/shared/src/world/tiles.ts';

type Point = { readonly x: number; readonly y: number };

const SVG_FILE = new URL('../docs/superpowers/specs/2026-11-19-hinterland-atlas.svg', import.meta.url);
const OUT_FILE = new URL('../packages/shared/src/content/land/hinterland.json', import.meta.url);
const SIZE = 64;
const COLUMNS = 12;
const ROWS = 10;
const WIDTH = SIZE * COLUMNS;
const HEIGHT = SIZE * ROWS;
const SCALE = 64 / 60;
const TOLERANCE = 1;
const LOW_WARD = 'low-ward';

const T = (value: number): number => Math.round(value * SCALE);
const tile = (point: Point): TilePoint => ({ x: T(point.x), y: T(point.y) });

interface SvgElement {
  readonly tag: string;
  readonly attributes: Readonly<Record<string, string>>;
}

function readSvg(): SvgElement[] {
  const text = readFileSync(SVG_FILE, 'utf8');
  const elements: SvgElement[] = [];
  for (const match of text.matchAll(/<(path|rect|circle)\b([^>]*?)\/?>/g)) {
    const attributes: Record<string, string> = {};
    for (const attribute of (match[2] as string).matchAll(/([a-z-]+)="([^"]*)"/g)) attributes[attribute[1] as string] = attribute[2] as string;
    elements.push({ tag: match[1] as string, attributes });
  }
  return elements;
}

function cubic(a: Point, b: Point, c: Point, d: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
  };
}

function samplePath(d: string): Point[] {
  const tokens = d.match(/[MLHVCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  const points: Point[] = [];
  let index = 0;
  let command = '';
  let current: Point = { x: 0, y: 0 };
  let start: Point = current;
  const number = (): number => Number(tokens[index++]);
  while (index < tokens.length) {
    if (/^[A-Za-z]$/.test(tokens[index] as string)) command = tokens[index++] as string;
    if (command === 'M') {
      current = { x: number(), y: number() };
      start = current;
      points.push(current);
      command = 'L';
    } else if (command === 'L') {
      current = { x: number(), y: number() };
      points.push(current);
    } else if (command === 'H') {
      current = { x: number(), y: current.y };
      points.push(current);
    } else if (command === 'V') {
      current = { x: current.x, y: number() };
      points.push(current);
    } else if (command === 'C') {
      const b = { x: number(), y: number() };
      const c = { x: number(), y: number() };
      const end = { x: number(), y: number() };
      const length = Math.hypot(b.x - current.x, b.y - current.y) + Math.hypot(c.x - b.x, c.y - b.y) + Math.hypot(end.x - c.x, end.y - c.y);
      const steps = Math.max(1, Math.ceil((length * SCALE) / 2));
      for (let step = 1; step <= steps; step++) points.push(cubic(current, b, c, end, step / steps));
      current = end;
    } else if (command === 'Z' || command === 'z') {
      current = start;
    } else {
      throw new Error('unsupported path command ' + command);
    }
  }
  return points;
}

function distanceToSegment(point: TilePoint, a: TilePoint, b: TilePoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function simplify(points: readonly TilePoint[], tolerance: number, accept: (from: number, to: number) => boolean = () => true): TilePoint[] {
  if (points.length < 3) return [...points];
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [from, to] = stack.pop() as [number, number];
    if (to - from < 2) continue;
    let farthest = from + 1;
    let distance = -1;
    for (let index = from + 1; index < to; index++) {
      const away = distanceToSegment(points[index] as TilePoint, points[from] as TilePoint, points[to] as TilePoint);
      if (away > distance) {
        distance = away;
        farthest = index;
      }
    }
    if (distance <= tolerance && accept(from, to)) continue;
    if (distance <= tolerance) farthest = Math.floor((from + to) / 2);
    keep[farthest] = 1;
    stack.push([from, farthest], [farthest, to]);
  }
  return points.filter((_, index) => keep[index] === 1);
}

function dedupe(points: readonly TilePoint[]): TilePoint[] {
  const out: TilePoint[] = [];
  for (const point of points) {
    const last = out[out.length - 1];
    if (!last || last.x !== point.x || last.y !== point.y) out.push(point);
  }
  return out;
}

const toTiles = (points: readonly Point[]): TilePoint[] => simplify(dedupe(points.map(tile)), TOLERANCE);

function closedTiles(points: readonly Point[]): TilePoint[] {
  const tiles = toTiles(points);
  const first = tiles[0] as TilePoint;
  const last = tiles[tiles.length - 1] as TilePoint;
  return first.x === last.x && first.y === last.y ? tiles.slice(0, -1) : tiles;
}

const polygon = (points: readonly Point[]): LandShape => ({ kind: 'polygon', points: closedTiles(points) });
const tilePolygon = (points: readonly TilePoint[]): LandShape => ({ kind: 'polygon', points: [...points] });
const rect = (x: number, y: number, width: number, height: number): TileRect => ({ x, y, width, height });
const svgRound = (cx: number, cy: number, r: number): LandShape => ({ kind: 'round', rect: rect(T(cx - r), T(cy - r), T(cx + r) - T(cx - r), T(cy + r) - T(cy - r)) });
const tileRound = (cx: number, cy: number, r: number): LandShape => ({ kind: 'round', rect: rect(Math.round(cx - r), Math.round(cy - r), Math.max(1, Math.round(2 * r)), Math.max(1, Math.round(2 * r))) });

function circlePoints(cx: number, cy: number, r: number, count: number): Point[] {
  return Array.from({ length: count + 1 }, (_, index) => ({ x: cx + r * Math.cos((index / count) * Math.PI * 2), y: cy + r * Math.sin((index / count) * Math.PI * 2) }));
}

function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function insidePolygon(points: readonly TilePoint[], x: number, y: number): boolean {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const a = points[index] as TilePoint;
    const b = points[previous] as TilePoint;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function scatter(shape: LandShape, seed: number, count: number, minRadius: number, maxRadius: number, spacing: number): { x: number; y: number; r: number }[] {
  if (shape.kind !== 'polygon') return [];
  const next = random(seed);
  const xs = shape.points.map((point) => point.x);
  const ys = shape.points.map((point) => point.y);
  const [left, right, top, bottom] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const placed: { x: number; y: number; r: number }[] = [];
  for (let attempt = 0; attempt < count * 30 && placed.length < count; attempt++) {
    const r = minRadius + next() * (maxRadius - minRadius);
    const x = left + next() * (right - left);
    const y = top + next() * (bottom - top);
    if (!insidePolygon(shape.points, x, y) || !insidePolygon(shape.points, x + r, y) || !insidePolygon(shape.points, x - r, y) || !insidePolygon(shape.points, x, y + r) || !insidePolygon(shape.points, x, y - r)) continue;
    if (placed.some((other) => Math.hypot(other.x - x, other.y - y) < other.r + r + spacing)) continue;
    placed.push({ x, y, r });
  }
  return placed;
}

const svg = readSvg();
const paths = (predicate: (attributes: Readonly<Record<string, string>>) => boolean): Point[][] =>
  svg.filter((element) => element.tag === 'path' && predicate(element.attributes)).map((element) => samplePath(element.attributes.d as string));
const one = (predicate: (attributes: Readonly<Record<string, string>>) => boolean, index = 0): Point[] => {
  const found = paths(predicate)[index];
  if (!found) throw new Error('missing a map shape');
  return found;
};
const fillOf = (pattern: string, index = 0): Point[] => one((a) => a.fill === 'url(#' + pattern + ')' && a.d !== undefined && !a.d.includes('l'), index);

const moorNorth = fillOf('moor', 0);
const moorSouth = fillOf('moor', 1);
const overgrown = fillOf('overgrown');
const high = fillOf('high');
const mount = fillOf('mount');
const marsh = fillOf('marsh');
const woods = fillOf('woods');
const blight = fillOf('blight');
const shipyards = fillOf('industry', 0);
const ironside = fillOf('industry', 1);
const heightsTown = fillOf('town', 0);
const hamlet = fillOf('town', 1);
const flooded = fillOf('flooded');
const sea = one((a) => a.class === 'water');
const channels = paths((a) => a['stroke-width'] === '3.2');
const creek = one((a) => a['stroke-width'] === '4.5');
const river = one((a) => a['stroke-width'] === '7', 0);
const townRiver = one((a) => a['stroke-width'] === '7', 1);
const cliffs = paths((a) => a.class === 'cliff1');
const roads = paths((a) => a.class === 'rd');
const [, , , ledgeCliff, northCliff, ashCliff] = cliffs as [Point[], Point[], Point[], Point[], Point[], Point[]];
const svgRects = svg.filter((element) => element.tag === 'rect').map((element) => element.attributes);
const slipways = svgRects.filter((a) => a.fill === '#b59c78');
const huts = svgRects.filter((a) => a.fill === '#8b6b4e');

const steps: LandStep[] = [];
const fill = (shape: LandShape, tileKind: TileKindId): void => void steps.push({ kind: 'fill', shape, tile: tileKind });
const rise = (shape: LandShape, height: number): void => void steps.push({ kind: 'rise', shape, height });
const line = (points: readonly TilePoint[], width: number, tileKind: TileKindId): void => void steps.push({ kind: 'line', points: [...points], width, tile: tileKind });
const ground = (shape: LandShape, tileKind: TileKindId, height: number): void => {
  fill(shape, tileKind);
  rise(shape, height);
};
const blobs = (shape: LandShape, seed: number, count: number, minRadius: number, maxRadius: number, spacing: number, tileKind: TileKindId): void => {
  for (const blob of scatter(shape, seed, count, minRadius, maxRadius, spacing)) fill(tileRound(blob.x, blob.y, blob.r), tileKind);
};

const wander = (seed: number, along: number): number => 3 * Math.sin(along / 23 + seed) + 2 * Math.sin(along / 9 + seed * 2.3);

const openLand: TilePoint[] = [];
for (let x = 10; x <= WIDTH - 10; x += 12) openLand.push({ x, y: Math.round(12 + wander(1, x)) });
for (let y = 12; y <= HEIGHT - 10; y += 12) openLand.push({ x: Math.round(WIDTH - 14 + wander(2, y)), y });
for (let x = WIDTH - 10; x >= 10; x -= 12) openLand.push({ x, y: Math.round(HEIGHT - 12 + wander(3, x)) });
for (let y = HEIGHT - 12; y >= 12; y -= 12) openLand.push({ x: Math.round(12 + wander(4, y)), y });

steps.push({ kind: 'fill', shape: { kind: 'rect', rect: rect(0, 0, WIDTH, HEIGHT) }, tile: 'rock' });
rise({ kind: 'rect', rect: rect(0, 0, WIDTH, HEIGHT) }, 10);
ground(tilePolygon(openLand), 'grass', 2);
ground(polygon(sea), 'water', 0);

const moorNorthShape = polygon(moorNorth);
blobs(moorNorthShape, 11, 40, 2, 6, 6, 'dirt');
const overgrownShape = polygon(overgrown);
fill(overgrownShape, 'paving');
blobs(overgrownShape, 12, 70, 2, 6, 2, 'grass');
blobs(overgrownShape, 13, 25, 1, 2.5, 8, 'trees');
const valley = polygon([
  { x: 238, y: 392 },
  { x: 238, y: 372 },
  { x: 262, y: 364 },
  { x: 300, y: 361 },
  { x: 320, y: 340 },
  { x: 350, y: 310 },
  { x: 390, y: 298 },
  { x: 425, y: 304 },
  { x: 452, y: 324 },
  { x: 462, y: 362 },
  { x: 440, y: 382 },
  { x: 360, y: 393 },
]);
rise(valley, 1);
const marshShape = polygon(marsh);
ground(marshShape, 'grass', 0);
blobs(marshShape, 14, 60, 1, 3, 4, 'water');
blobs(marshShape, 15, 30, 1.5, 4, 5, 'dirt');
const woodsShape = polygon(woods);
ground(woodsShape, 'grass', 1);
blobs(woodsShape, 16, 160, 2.5, 7, 3, 'trees');
const moorSouthShape = polygon(moorSouth);
blobs(moorSouthShape, 17, 18, 2, 5, 6, 'dirt');
const highShape = polygon(high);
ground(highShape, 'grass', 6);
blobs(highShape, 18, 30, 1.5, 4, 8, 'trees');
const blightShape = polygon(blight);
ground(blightShape, 'soil', 6);
const scars = random(19);
for (let scar = 0; scar < 40; scar++) {
  const x = 610 + scars() * 140;
  const y = 150 + scars() * 330;
  if (blightShape.kind === 'polygon' && !insidePolygon(blightShape.points, T(x), T(y))) continue;
  const angle = scars() * Math.PI;
  const length = 6 + scars() * 14;
  line([tile({ x, y }), tile({ x: x + Math.cos(angle) * length, y: y + Math.sin(angle) * length })], scars() < 0.5 ? 1 : 3, 'rust');
}
ground(polygon([{ x: 700, y: 40 }, { x: 676, y: 100 }, ...ashCliff, { x: 700, y: 505 }, { x: 740, y: 505 }, { x: 740, y: 20 }]), 'rock', 10);
ground(polygon(mount), 'rock', 12);

ground(polygon([
  { x: 474, y: 0 },
  { x: 498, y: 6 },
  { x: 492, y: 60 },
  { x: 497, y: 110 },
  { x: 510, y: 158 },
  { x: 520, y: 178 },
  { x: 490, y: 192 },
  { x: 466, y: 188 },
  { x: 462, y: 150 },
  { x: 458, y: 120 },
  { x: 460, y: 90 },
  { x: 466, y: 70 },
  { x: 474, y: 52 },
  { x: 477, y: 30 },
]), 'rock', 9);
ground(polygon([
  { x: 512, y: 160 },
  { x: 586, y: 160 },
  { x: 583, y: 200 },
  { x: 581, y: 252 },
  { x: 586, y: 300 },
  { x: 584, y: 330 },
  { x: 560, y: 318 },
  { x: 530, y: 296 },
  { x: 516, y: 290 },
  { x: 518, y: 220 },
]), 'rock', 8);
ground(polygon([...cliffs[2] as Point[], { x: 528, y: 287 }, { x: 550, y: 296 }, { x: 566, y: 312 }]), 'grass', 6);
blobs(polygon(cliffs[2] as Point[]), 20, 6, 1.5, 3, 6, 'trees');

const ledgeWest = ledgeCliff.filter((_, index) => index % 2 === 0);
const ledge = [
  { x: 562, y: 168 },
  { x: 604, y: 168 },
  ...roads[11]!.filter((point) => point.y > 175 && point.y < 470).map((point) => ({ x: point.x + 13, y: point.y })),
  { x: 626, y: 470 },
  { x: 640, y: 487 },
  { x: 600, y: 480 },
  ...[...ledgeWest].reverse(),
  { x: 576, y: 190 },
  { x: 562, y: 190 },
];
ground(polygon(ledge), 'grass', 4);
rise(polygon([
  { x: 598, y: 478 },
  { x: 640, y: 486 },
  { x: 686, y: 496 },
  { x: 704, y: 590 },
  { x: 670, y: 594 },
  { x: 600, y: 530 },
  { x: 587, y: 512 },
  { x: 587, y: 495 },
]), 4);
rise(polygon(sea), 0);

ground(svgRound(660, 282, 41.5), 'gravel', 6);
ground(svgRound(660, 282, 30), 'water', 1);

const shipyardsShape = polygon(shipyards);
ground(shipyardsShape, 'concrete', 2);
for (const slip of slipways) ground({ kind: 'rect', rect: rect(T(Number(slip.x)), T(Number(slip.y)) - 2, T(Number(slip.width)), T(Number(slip.height)) + 2) }, 'concrete', 1);
ground(polygon(heightsTown), 'paving', 6);
ground(polygon(ironside), 'concrete', 4);
ground(svgRound(516, 342, 57), 'paving', 2);
const floodedShape = polygon(flooded);
ground(floodedShape, 'gravel', 1);
blobs(floodedShape, 21, 30, 1, 3, 3, 'water');
ground(polygon(hamlet), 'paving', 4);
for (const hut of huts) fill({ kind: 'rect', rect: rect(T(Number(hut.x)), T(Number(hut.y)), T(Number(hut.width)), T(Number(hut.height))) }, 'boards');

const northBand = [
  { x: -10, y: -10 },
  { x: 740, y: -10 },
  { x: 740, y: 20 },
  ...[...northCliff].reverse().map((point) => ({ x: point.x, y: point.y + 6 + wander(5, point.x) })),
  { x: 30, y: 30 },
  { x: -10, y: 40 },
];
ground(polygon(northBand), 'rock', 10);

line(toTiles(circlePoints(516, 342, 57, 96)), 3, 'brick');
line(toTiles(river), 7, 'water');
line(toTiles(townRiver), 7, 'water');
for (const channel of channels) {
  const points = toTiles(channel);
  const start = points.findIndex((point) => Math.hypot(point.x - (points[0] as TilePoint).x, point.y - (points[0] as TilePoint).y) >= 14);
  const trimmed = points[0]!.y < 452 ? points.slice(Math.max(1, start)) : points;
  line(trimmed, 3, 'water');
  for (const fraction of [0.35, 0.7]) {
    const at = Math.floor(trimmed.length * fraction);
    const a = trimmed[Math.max(0, at - 1)] as TilePoint;
    const b = trimmed[Math.min(trimmed.length - 1, at + 1)] as TilePoint;
    const centre = trimmed[at] as TilePoint;
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / length;
    const ny = (b.x - a.x) / length;
    line([{ x: Math.round(centre.x - nx * 5), y: Math.round(centre.y - ny * 5) }, { x: Math.round(centre.x + nx * 5), y: Math.round(centre.y + ny * 5) }], 3, 'boards');
  }
}
line(toTiles([{ x: 493, y: 391 }, ...creek, { x: 456, y: 556 }]), 5, 'water');

line([tile({ x: 498, y: 322 }), tile({ x: 534, y: 326 })], 3, 'boards');
line([tile({ x: 520, y: 92 }), tile({ x: 566, y: 94 })], 3, 'concrete');

const nearTown = new Set([0, 1, 4, 5, 6, 7, 8, 10, 12]);
roads.forEach((road, index) => {
  line(toTiles(road), nearTown.has(index) ? 5 : 3, nearTown.has(index) ? 'asphalt' : index === 11 || index === 9 ? 'gravel' : 'dirt');
});
line([{ x: 347, y: 108 }, { x: 347, y: 168 }], 3, 'gravel');

const block = (x: number, y: number, width: number, height: number): void => fill({ kind: 'rect', rect: rect(x, y, width, height) }, 'brick');
const corridor = (x: number, y: number, width: number, height: number, tileKind: TileKindId): void => fill({ kind: 'rect', rect: rect(x, y, width, height) }, tileKind);

block(484, 349, 14, 13);
corridor(484, 353, 14, 5, 'asphalt');
block(544, 419, 13, 14);
corridor(548, 419, 5, 14, 'asphalt');
block(494, 401, 26, 13);
corridor(494, 405, 26, 5, 'gravel');
line([{ x: 588, y: 181 }, { x: 640, y: 181 }], 3, 'brick');
block(600, 175, 22, 12);
corridor(607, 175, 5, 12, 'gravel');

fill({ kind: 'rect', rect: rect(343, 151, 2, 12) }, 'rock');
fill({ kind: 'rect', rect: rect(350, 151, 2, 12) }, 'rock');
steps.push({ kind: 'ramp', rect: rect(345, 152, 5, 10), side: 'north', from: 2, to: 6 });
fill({ kind: 'rect', rect: rect(470, 72, 70, 5) }, 'concrete');
rise({ kind: 'rect', rect: rect(470, 72, 35, 5) }, 6);
steps.push({ kind: 'ramp', rect: rect(505, 72, 12, 5), side: 'east', from: 6, to: 4 });
rise({ kind: 'rect', rect: rect(517, 72, 23, 5) }, 4);
fill({ kind: 'rect', rect: rect(589, 302, 4, 21) }, 'gravel');
steps.push({ kind: 'ramp', rect: rect(589, 302, 4, 21), side: 'north', from: 2, to: 6 });
fill({ kind: 'rect', rect: rect(640, 296, 22, 5) }, 'gravel');
rise({ kind: 'rect', rect: rect(640, 296, 22, 5) }, 4);
rise({ kind: 'rect', rect: rect(662, 296, 2, 5) }, 5);
rise({ kind: 'rect', rect: rect(608, 178, 3, 2) }, 4);
rise({ kind: 'rect', rect: rect(606, 530, 18, 10) }, 2);
rise({ kind: 'rect', rect: rect(624, 532, 2, 6) }, 3);
rise({ kind: 'rect', rect: rect(626, 530, 16, 10) }, 4);

const lowWard = tilePolygon([
  { x: 128, y: 256 },
  { x: 320, y: 256 },
  { x: 320, y: 320 },
  { x: 384, y: 320 },
  { x: 384, y: 384 },
  { x: 256, y: 384 },
  { x: 256, y: 448 },
  { x: 128, y: 448 },
]);
ground(lowWard, 'paving', 0);

const GATES: readonly { id: string; rect: TileRect }[] = [
  { id: 'the-incline', rect: rect(345, 156, 5, 2) },
  { id: 'west-gate', rect: rect(490, 353, 2, 5) },
  { id: 'causeway', rect: rect(506, 405, 2, 5) },
  { id: 'viaduct', rect: rect(509, 72, 2, 5) },
  { id: 'floodgate', rect: rect(548, 425, 5, 2) },
  { id: 'seawall', rect: rect(624, 532, 2, 6) },
  { id: 'blight-road', rect: rect(607, 178, 5, 2) },
  { id: 'crater-rim', rect: rect(662, 296, 2, 5) },
];

const SEEDS: readonly { ward: string; at: Point }[] = [
  { ward: 'old-shipyards', at: { x: 69, y: 170 } },
  { ward: 'old-shipyards', at: { x: 400, y: 330 } },
  { ward: 'tidemarsh', at: { x: 177, y: 480 } },
  { ward: 'tidemarsh', at: { x: 372, y: 470 } },
  { ward: 'the-heights', at: { x: 336, y: 60 } },
  { ward: 'old-town', at: { x: 530, y: 370 } },
  { ward: 'old-town', at: { x: 490, y: 320 } },
  { ward: 'old-town', at: { x: 560, y: 268 } },
  { ward: 'ironside', at: { x: 560, y: 130 } },
  { ward: 'ironside', at: { x: 515, y: 80 } },
  { ward: 'drowned-quarter', at: { x: 522, y: 500 } },
  { ward: 'drowned-quarter', at: { x: 540, y: 430 } },
  { ward: 'the-lantern', at: { x: 612, y: 505 } },
  { ward: 'the-lantern', at: { x: 600, y: 300 } },
  { ward: 'the-blight', at: { x: 690, y: 200 } },
  { ward: 'the-blight', at: { x: 660, y: 245 } },
];

const plan = (wardSteps: readonly LandStep[], extra: readonly LandStep[]): LandPlan => ({
  id: 'hinterland',
  squareSize: SIZE,
  columns: COLUMNS,
  rows: ROWS,
  steps: [...steps, ...extra, ...wardSteps, ...GATES.map((gate) => ({ kind: 'gate' as const, id: gate.id, rect: gate.rect, tile: 'door' as const }))],
});

const inLowWard = (x: number, y: number): boolean => lowWard.kind === 'polygon' && insidePolygon(lowWard.points, x + 0.5, y + 0.5);
const OFFSETS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

function components(land: LandMap): { label: Int32Array; sizes: number[] } {
  const gateTiles = new Set(Object.values(land.gates).flatMap((tiles) => tiles.map((point) => point.y * WIDTH + point.x)));
  const label = new Int32Array(WIDTH * HEIGHT).fill(-1);
  const sizes: number[] = [];
  const queue = new Int32Array(WIDTH * HEIGHT);
  for (let start = 0; start < WIDTH * HEIGHT; start++) {
    const sx = start % WIDTH;
    const sy = Math.floor(start / WIDTH);
    if (label[start] !== -1 || gateTiles.has(start) || inLowWard(sx, sy) || !TILE_KINDS[land.tileAt({ x: sx, y: sy })].walkable) continue;
    const id = sizes.length;
    label[start] = id;
    queue[0] = start;
    let tail = 1;
    for (let head = 0; head < tail; head++) {
      const index = queue[head] as number;
      const x = index % WIDTH;
      const y = Math.floor(index / WIDTH);
      for (const offset of OFFSETS) {
        const nx = x + offset.x;
        const ny = y + offset.y;
        if (nx < 0 || ny < 0 || nx >= WIDTH || ny >= HEIGHT) continue;
        const next = ny * WIDTH + nx;
        if (label[next] !== -1 || gateTiles.has(next) || inLowWard(nx, ny) || !TILE_KINDS[land.tileAt({ x: nx, y: ny })].walkable) continue;
        label[next] = id;
        queue[tail++] = next;
      }
    }
    sizes.push(tail);
  }
  return { label, sizes };
}

function pathBetween(land: LandMap, label: Int32Array, from: TilePoint, to: TilePoint): string {
  const parent = new Int32Array(WIDTH * HEIGHT).fill(-2);
  const queue = [from.y * WIDTH + from.x];
  parent[queue[0] as number] = -1;
  const own = label[queue[0] as number];
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head] as number;
    if (index === to.y * WIDTH + to.x) break;
    for (const offset of OFFSETS) {
      const nx = (index % WIDTH) + offset.x;
      const ny = Math.floor(index / WIDTH) + offset.y;
      if (nx < 0 || ny < 0 || nx >= WIDTH || ny >= HEIGHT) continue;
      const next = ny * WIDTH + nx;
      if (parent[next] !== -2 || label[next] !== own) continue;
      parent[next] = index;
      queue.push(next);
    }
  }
  const route: string[] = [];
  for (let at = to.y * WIDTH + to.x; at >= 0; at = parent[at] as number) route.push((at % WIDTH) + ',' + Math.floor(at / WIDTH) + ':' + land.heightAt({ x: at % WIDTH, y: Math.floor(at / WIDTH) }));
  return route.reverse().filter((_, index) => index % 6 === 0).join(' ');
}

function traceOuter(mask: Uint8Array): TilePoint[] {
  const inside = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT && mask[y * WIDTH + x] === 1;
  const outgoing = new Map<number, { to: TilePoint; dir: number }[]>();
  const key = (x: number, y: number): number => y * (WIDTH + 1) + x;
  for (let index = 0; index < WIDTH * HEIGHT; index++) {
    if (mask[index] !== 1) continue;
    const x = index % WIDTH;
    const y = Math.floor(index / WIDTH);
    const add = (fx: number, fy: number, tx: number, ty: number, dir: number): void => {
      const list = outgoing.get(key(fx, fy)) ?? [];
      list.push({ to: { x: tx, y: ty }, dir });
      outgoing.set(key(fx, fy), list);
    };
    if (!inside(x, y - 1)) add(x, y, x + 1, y, 0);
    if (!inside(x + 1, y)) add(x + 1, y, x + 1, y + 1, 1);
    if (!inside(x, y + 1)) add(x + 1, y + 1, x, y + 1, 2);
    if (!inside(x - 1, y)) add(x, y + 1, x, y, 3);
  }
  const used = new Set<string>();
  const loops: TilePoint[][] = [];
  for (const [from, list] of outgoing) {
    for (const first of list) {
      const fromPoint = { x: from % (WIDTH + 1), y: Math.floor(from / (WIDTH + 1)) };
      const firstKey = fromPoint.x + ',' + fromPoint.y + '>' + first.dir;
      if (used.has(firstKey)) continue;
      const loop: TilePoint[] = [];
      let at = fromPoint;
      let edge = first;
      for (;;) {
        const edgeKey = at.x + ',' + at.y + '>' + edge.dir;
        if (used.has(edgeKey)) break;
        used.add(edgeKey);
        loop.push(at);
        at = edge.to;
        const choices = outgoing.get(key(at.x, at.y)) ?? [];
        const right = choices.find((choice) => choice.dir === (edge.dir + 1) % 4);
        const straight = choices.find((choice) => choice.dir === edge.dir);
        const left = choices.find((choice) => choice.dir === (edge.dir + 3) % 4);
        const next = right ?? straight ?? left;
        if (!next) break;
        edge = next;
      }
      loops.push(loop);
    }
  }
  const area = (loop: readonly TilePoint[]): number => loop.reduce((sum, point, index) => {
    const next = loop[(index + 1) % loop.length] as TilePoint;
    return sum + point.x * next.y - next.x * point.y;
  }, 0) / 2;
  return loops.reduce((best, loop) => (area(loop) > area(best) ? loop : best));
}

function sliverHasProtected(points: readonly TilePoint[], protectedTiles: Uint8Array): boolean {
  const ys = points.map((point) => point.y);
  for (let y = Math.max(0, Math.min(...ys)); y < Math.min(HEIGHT, Math.max(...ys)); y++) {
    const centre = y + 0.5;
    const crossings: number[] = [];
    for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
      const a = points[index] as TilePoint;
      const b = points[previous] as TilePoint;
      if (a.y > centre !== b.y > centre) crossings.push(((b.x - a.x) * (centre - a.y)) / (b.y - a.y) + a.x);
    }
    crossings.sort((first, second) => first - second);
    for (let index = 0; index + 1 < crossings.length; index += 2) {
      const from = Math.max(0, Math.ceil((crossings[index] as number) - 0.5));
      const to = Math.min(WIDTH, Math.ceil((crossings[index + 1] as number) - 0.5));
      for (let x = from; x < to; x++) if (protectedTiles[y * WIDTH + x] === 1) return true;
    }
  }
  return false;
}

function simplifyLoop(loop: readonly TilePoint[], protectedTiles: Uint8Array): TilePoint[] {
  const corners = loop.filter((point, index) => {
    const before = loop[(index + loop.length - 1) % loop.length] as TilePoint;
    const after = loop[(index + 1) % loop.length] as TilePoint;
    return (point.x - before.x) * (after.y - point.y) - (point.y - before.y) * (after.x - point.x) !== 0;
  });
  let far = 0;
  corners.forEach((point, index) => {
    if (Math.hypot(point.x - corners[0]!.x, point.y - corners[0]!.y) > Math.hypot(corners[far]!.x - corners[0]!.x, corners[far]!.y - corners[0]!.y)) far = index;
  });
  const half = (chain: readonly TilePoint[]): TilePoint[] =>
    simplify(chain, TOLERANCE, (from, to) => to - from < 2 || !sliverHasProtected(chain.slice(from, to + 1), protectedTiles));
  const first = half(corners.slice(0, far + 1));
  const second = half([...corners.slice(far), corners[0] as TilePoint]);
  return [...first, ...second.slice(1, -1)];
}

function wardSteps(land: LandMap, pocketSteps: LandStep[]): LandStep[] {
  const { label, sizes } = components(land);
  const wardOfComponent = new Map<number, string>();
  const problems: string[] = [];
  for (const seed of SEEDS) {
    const at = tile(seed.at);
    const component = label[at.y * WIDTH + at.x] as number;
    if (component < 0) {
      problems.push('seed ' + seed.ward + ' at ' + at.x + ',' + at.y + ' is not on walkable land (' + land.tileAt(at) + ')');
      continue;
    }
    const known = wardOfComponent.get(component);
    if (known !== undefined && known !== seed.ward) problems.push('wards ' + known + ' and ' + seed.ward + ' share land (seed ' + at.x + ',' + at.y + '): ' + pathBetween(land, label, at, tile((SEEDS.find((other) => other.ward === known && label[tile(other.at).y * WIDTH + tile(other.at).x] === component) as { at: Point }).at)));
    wardOfComponent.set(component, seed.ward);
  }
  const perWard = new Map<string, Set<number>>();
  for (const [component, name] of wardOfComponent) perWard.set(name, (perWard.get(name) ?? new Set()).add(component));
  for (const [name, set] of perWard) if (set.size > 1) console.log('ward ' + name + ' is in ' + set.size + ' pieces: ' + [...set].map((component) => sizes[component]).join(', '));
  if (problems.length > 0) {
    writeFileSync(OUT_FILE, printLandPlan(plan([], pocketSteps)));
    throw new Error(problems.join('\n'));
  }
  const pocketMask = new Uint8Array(WIDTH * HEIGHT);
  let pockets = 0;
  for (let index = 0; index < WIDTH * HEIGHT; index++) {
    const component = label[index] as number;
    if (component >= 0 && !wardOfComponent.has(component)) {
      pocketMask[index] = 1;
      pockets++;
    }
  }
  if (pockets > 0) {
    const seen = new Uint8Array(WIDTH * HEIGHT);
    for (let index = 0; index < WIDTH * HEIGHT; index++) {
      if (pocketMask[index] !== 1 || seen[index] === 1) continue;
      const component = label[index] as number;
      const mask = new Uint8Array(WIDTH * HEIGHT);
      for (let other = 0; other < WIDTH * HEIGHT; other++) if (label[other] === component) {
        mask[other] = 1;
        seen[other] = 1;
      }
      const loop = traceOuter(mask);
      const x = index % WIDTH;
      const y = Math.floor(index / WIDTH);
      console.log('pocket of ' + sizes[component] + ' tiles at ' + x + ',' + y + ' turned to rock');
      pocketSteps.push({ kind: 'fill', shape: tilePolygon(dedupe(loop)), tile: 'rock' });
    }
    return [];
  }
  const names = [...new Set(SEEDS.map((seed) => seed.ward)), LOW_WARD];
  const ward = new Int16Array(WIDTH * HEIGHT).fill(-1);
  const queue = new Int32Array(WIDTH * HEIGHT);
  let tail = 0;
  for (let index = 0; index < WIDTH * HEIGHT; index++) {
    const x = index % WIDTH;
    const y = Math.floor(index / WIDTH);
    if (inLowWard(x, y)) {
      ward[index] = names.indexOf(LOW_WARD);
      continue;
    }
    const component = label[index] as number;
    if (component >= 0) {
      ward[index] = names.indexOf(wardOfComponent.get(component) as string);
      queue[tail++] = index;
    }
  }
  for (let head = 0; head < tail; head++) {
    const index = queue[head] as number;
    const x = index % WIDTH;
    const y = Math.floor(index / WIDTH);
    for (const offset of OFFSETS) {
      const nx = x + offset.x;
      const ny = y + offset.y;
      if (nx < 0 || ny < 0 || nx >= WIDTH || ny >= HEIGHT) continue;
      const next = ny * WIDTH + nx;
      if (ward[next] !== -1) continue;
      ward[next] = ward[index] as number;
      queue[tail++] = next;
    }
  }
  const protectedTiles = new Uint8Array(WIDTH * HEIGHT);
  for (let index = 0; index < WIDTH * HEIGHT; index++) if (TILE_KINDS[land.tileAt({ x: index % WIDTH, y: Math.floor(index / WIDTH) })].walkable) protectedTiles[index] = 1;
  const regions: { ward: string; points: TilePoint[]; area: number }[] = [];
  const done = new Uint8Array(WIDTH * HEIGHT);
  for (let index = 0; index < WIDTH * HEIGHT; index++) {
    if (done[index] === 1 || ward[index] === names.indexOf(LOW_WARD)) continue;
    const own = ward[index] as number;
    const mask = new Uint8Array(WIDTH * HEIGHT);
    const stack = [index];
    done[index] = 1;
    let area = 0;
    while (stack.length > 0) {
      const at = stack.pop() as number;
      mask[at] = 1;
      area++;
      const x = at % WIDTH;
      const y = Math.floor(at / WIDTH);
      for (const offset of OFFSETS) {
        const nx = x + offset.x;
        const ny = y + offset.y;
        if (nx < 0 || ny < 0 || nx >= WIDTH || ny >= HEIGHT) continue;
        const next = ny * WIDTH + nx;
        if (done[next] === 1 || ward[next] !== own) continue;
        done[next] = 1;
        stack.push(next);
      }
    }
    regions.push({ ward: names[own] as string, points: simplifyLoop(traceOuter(mask), protectedTiles), area });
  }
  regions.sort((a, b) => b.area - a.area);
  return [
    ...regions.map((region) => ({ kind: 'ward' as const, shape: tilePolygon(region.points), ward: region.ward })),
    { kind: 'ward' as const, shape: lowWard, ward: LOW_WARD },
  ];
}

const pocketSteps: LandStep[] = [];
let wards: LandStep[] = [];
for (let round = 0; round < 6 && wards.length === 0; round++) {
  const land = drawLand(plan([], pocketSteps));
  wards = wardSteps(land, pocketSteps);
}
if (wards.length === 0) throw new Error('pockets kept appearing');
const finished = plan(wards, pocketSteps);
writeFileSync(OUT_FILE, printLandPlan(finished));
console.log('steps ' + finished.steps.length + ', ward points ' + wards.reduce((sum, step) => sum + (step.kind === 'ward' && step.shape.kind === 'polygon' ? step.shape.points.length : 0), 0));
