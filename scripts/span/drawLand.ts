import { writeFileSync } from 'node:fs';
import { drawLand, type LandPlan, type LandShape, type LandStep } from '../../packages/shared/src/world/landPlan.ts';
import { printLandPlan } from '../../packages/shared/src/world/printLandPlan.ts';
import type { TilePoint, TileRect } from '../../packages/shared/src/world/geometry.ts';
import { TILE_KINDS, type TileKindId } from '../../packages/shared/src/world/tiles.ts';
import { codeAt, COLUMNS, HEIGHT, LAND_ID, MASSIF, padOf, PLACES, placeById, random, REGIONS, regionAtSquare, ROWS, SEAM_HALF, SQUARE, WIDTH } from './atlas.ts';
import { BRIDGE_PLANS_FOR_LAND, bridgeTiles } from './bridges.ts';
import { GATE_PLANS, isLandTile, isMassifTile, isRailTile, nearGate, nearPad, nearRail, railSegments, seamEdges, smooth } from './plan.ts';
import { maskPolygon } from './trace.ts';

const OUT = new URL('../../packages/shared/src/content/land/the-span.json', import.meta.url);

const steps: LandStep[] = [];
const rect = (x: number, y: number, width: number, height: number): TileRect => ({ x: Math.round(x), y: Math.round(y), width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) });
const box = (x: number, y: number, width: number, height: number): LandShape => ({ kind: 'rect', rect: rect(x, y, width, height) });
const round = (cx: number, cy: number, r: number): LandShape => ({ kind: 'round', rect: rect(cx - r, cy - r, 2 * r, 2 * r) });
const octagon = (cx: number, cy: number, rx: number, ry: number): LandShape => ({ kind: 'octagon', rect: rect(cx - rx, cy - ry, 2 * rx, 2 * ry) });
const polygon = (points: readonly TilePoint[]): LandShape => ({ kind: 'polygon', points });
const fill = (shape: LandShape, tile: TileKindId): void => void steps.push({ kind: 'fill', shape, tile });
const rise = (shape: LandShape, height: number): void => void steps.push({ kind: 'rise', shape, height });
const ground = (shape: LandShape, tile: TileKindId, height: number): void => {
  fill(shape, tile);
  rise(shape, height);
};
const line = (points: readonly TilePoint[], width: number, tile: TileKindId): void => void steps.push({ kind: 'line', points: points.map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) })), width, tile });
const masked = (inside: (x: number, y: number) => boolean): LandShape | undefined => {
  const points = maskPolygon(WIDTH, HEIGHT, inside);
  return points.length >= 3 ? polygon(points) : undefined;
};
const squareMask = (keep: (column: number, row: number) => boolean): LandShape | undefined => {
  const points = maskPolygon(COLUMNS, ROWS, keep).map((point) => ({ x: point.x * SQUARE, y: point.y * SQUARE }));
  return points.length >= 3 ? polygon(points) : undefined;
};

const keepClear = (x: number, y: number, margin: number): boolean => !nearPad(x, y, margin) && !nearRail(x, y, 3) && !nearGate(x, y, 12);

function blobs(seed: number, area: TileRect, count: number, minR: number, maxR: number, tile: TileKindId, spacing = 3, keep: (x: number, y: number, r: number) => boolean = () => true, height?: number): void {
  const next = random(seed);
  const placed: { x: number; y: number; r: number }[] = [];
  for (let attempt = 0; attempt < count * 40 && placed.length < count; attempt++) {
    const r = minR + next() * (maxR - minR);
    const x = area.x + r + next() * (area.width - 2 * r);
    const y = area.y + r + next() * (area.height - 2 * r);
    if (!keepClear(x, y, r + 3) || nearRail(x, y, r + 3) || nearGate(x, y, r + 12)) continue;
    if (!isLandTile(Math.round(x), Math.round(y)) || isMassifTile(Math.round(x), Math.round(y))) continue;
    if (!keep(x, y, r)) continue;
    if (placed.some((other) => Math.hypot(other.x - x, other.y - y) < other.r + r + spacing)) continue;
    placed.push({ x, y, r });
    fill(round(x, y, r), tile);
    if (height !== undefined) rise(round(x, y, r), height);
  }
}

const regionBox = (code: string): TileRect => {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (let row = 0; row < ROWS; row++) for (let column = 0; column < COLUMNS; column++) {
    if (codeAt(column, row) !== code) continue;
    left = Math.min(left, column * SQUARE);
    top = Math.min(top, row * SQUARE);
    right = Math.max(right, (column + 1) * SQUARE);
    bottom = Math.max(bottom, (row + 1) * SQUARE);
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
};
const inRegion = (code: string) => (x: number, y: number): boolean => codeAt(Math.floor(x / SQUARE), Math.floor(y / SQUARE)) === code;

ground(box(0, 0, WIDTH, HEIGHT), 'water', 0);

const landTiles = new Uint8Array(WIDTH * HEIGHT);
for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) landTiles[y * WIDTH + x] = isLandTile(x, y) ? 1 : 0;
const isLand = (x: number, y: number): boolean => landTiles[y * WIDTH + x] === 1;

REGIONS.forEach((region) => {
  const shape = masked((x, y) => isLand(x, y) && codeAt(Math.floor(x / SQUARE), Math.floor(y / SQUARE)) === region.code);
  if (shape) fill(shape, region.ground);
});
const massifShape = squareMask((column, row) => codeAt(column, row) === MASSIF);
if (massifShape) fill(massifShape, 'rock');

const MASSIF_LIFT: Readonly<Record<string, number>> = { H: 3, S: 0, G: 1, C: 1, K: 1, W: 0 };
REGIONS.forEach((region, index) => {
  for (let row = 0; row < ROWS; row++) for (let column = 0; column < COLUMNS; column++) {
    if (codeAt(column, row) !== region.code) continue;
    let nearMassif = false;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (codeAt(column + dc, row + dr) === MASSIF) nearMassif = true;
    const lift = nearMassif ? (MASSIF_LIFT[region.code] ?? 0) : 0;
    const [low, high] = region.relief;
    steps.push({ kind: 'relief', shape: box(column * SQUARE, row * SQUARE, SQUARE, SQUARE), seed: 101 + index * 37, low: Math.min(15, low + lift), high: Math.min(15, high + lift), scale: region.scale } as LandStep);
  }
});

const seaShape = masked((x, y) => !isLand(x, y));
if (seaShape) rise(seaShape, 0);

const spill: TilePoint[] = [
  { x: 4 * SQUARE + 56, y: 7 * SQUARE + 24 },
  { x: 4 * SQUARE + 24, y: 8 * SQUARE + 4 },
  { x: 3 * SQUARE + 52, y: 8 * SQUARE + 44 },
  { x: 3 * SQUARE + 40, y: 9 * SQUARE + 30 },
  { x: 2 * SQUARE + 50, y: 10 * SQUARE + 4 },
  { x: 2 * SQUARE + 24, y: 10 * SQUARE + 40 },
  { x: 1 * SQUARE + 52, y: 11 * SQUARE + 20 },
  { x: 1 * SQUARE + 30, y: 12 * SQUARE + 10 },
];
line(spill, 3, 'water');
rise(polygon([...spill.map((point) => ({ x: point.x - 2, y: point.y })), ...[...spill].reverse().map((point) => ({ x: point.x + 3, y: point.y }))]), 0);

for (let index = 1; index < spill.length; index++) {
  const a = spill[index - 1]!;
  const b = spill[index]!;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  if (nearRail(mx, my, 6)) continue;
  fill(round(mx, my, 4), 'boards');
}
ground(round(7 * SQUARE + 30, 11 * SQUARE + 26, 17), 'water', 0);
ground(round(10 * SQUARE + 40, 1 * SQUARE + 34, 21), 'water', 0);
ground(round(11 * SQUARE + 6, 1 * SQUARE + 40, 12), 'water', 0);

const terrain: LandPlan = { id: LAND_ID, squareSize: SQUARE, columns: COLUMNS, rows: ROWS, steps: [...steps] };
const relief = drawLand(terrain);

for (const place of PLACES) {
  const pad = padOf(place);
  let lowest = 15;
  for (let y = pad.y - 2; y < pad.y + pad.height + 2; y++) for (let x = pad.x - 2; x < pad.x + pad.width + 2; x++) {
    if (relief.tileAt({ x, y }) === 'water') continue;
    lowest = Math.min(lowest, relief.heightAt({ x, y }));
  }
  ground({ kind: 'rect', rect: pad }, place.pad, Math.max(1, lowest));
}

const K = regionBox('K');
blobs(31, K, 26, 2, 5, 'trees', 7);
blobs(32, K, 10, 3, 7, 'dirt', 5);
const H = regionBox('H');
blobs(41, H, 34, 3, 8, 'soil', 4);
blobs(42, H, 22, 1.5, 3.5, 'trees', 6);
const C = regionBox('C');
for (let y = C.y + 6; y < C.y + C.height - 8; y += 30) {
  for (let x = C.x + 6; x < C.x + C.width - 8; x += 30) {
    if (!inRegion('C')(x + 11, y + 11) || !isLand(x, y) || !isLand(x + 22, y + 22)) continue;
    if (nearPad(x + 11, y + 11, 18) || nearRail(x + 11, y + 11, 16) || nearGate(x + 11, y + 11, 22)) continue;
    fill(box(x, y, 22, 22), 'paving');
  }
}
const W = regionBox('W');
blobs(51, W, 40, 3, 8, 'gravel', 2);
blobs(52, W, 30, 2, 6, 'rust', 3);
blobs(53, W, 20, 2, 5, 'dirt', 3);
const G = regionBox('G');
blobs(61, G, 30, 2, 6, 'grate', 4);
blobs(62, G, 18, 2, 6, 'gravel', 3);
const S = regionBox('S');
blobs(71, S, 26, 3, 7, 'plating', 2);
blobs(72, S, 16, 1, 3, 'grate', 5);

const edges = seamEdges();
for (const edge of edges) {
  const shape = edge.vertical
    ? box(edge.line - SEAM_HALF, edge.from - SEAM_HALF, SEAM_HALF * 2, edge.to - edge.from + SEAM_HALF * 2)
    : box(edge.from - SEAM_HALF, edge.line - SEAM_HALF, edge.to - edge.from + SEAM_HALF * 2, SEAM_HALF * 2);
  ground(shape, 'rock', 15);
}
for (const gate of GATE_PLANS) {
  const sample = (x: number, y: number): number => relief.heightAt({ x, y });
  const h = gate.vertical
    ? Math.max(1, Math.min(sample(gate.x - 10, gate.y), sample(gate.x + 11, gate.y)))
    : Math.max(1, Math.min(sample(gate.x, gate.y - 10), sample(gate.x, gate.y + 11)));
  if (gate.vertical) {
    ground(octagon(gate.x - 9, gate.y + 1, 7, 6), 'paving', h);
    ground(octagon(gate.x + 11, gate.y + 1, 7, 6), 'paving', h);
    ground(box(gate.x - SEAM_HALF - 3, gate.y, SEAM_HALF * 2 + 8, 2), 'paving', h);
  } else {
    ground(octagon(gate.x + 1, gate.y - 9, 6, 7), 'paving', h);
    ground(octagon(gate.x + 1, gate.y + 11, 6, 7), 'paving', h);
    ground(box(gate.x, gate.y - SEAM_HALF - 3, 2, SEAM_HALF * 2 + 8), 'paving', h);
  }
}

steps.push({ kind: 'soften', shape: box(0, 0, WIDTH, HEIGHT) } as LandStep);

blobs(33, K, 4, 2, 4, 'water', 10, () => true);
blobs(63, G, 12, 2, 5, 'water', 7);
blobs(73, S, 10, 2, 4, 'coolant', 7);
blobs(74, S, 9, 2, 4, 'rock', 6, () => true, 15);
blobs(54, W, 8, 2, 4, 'rock', 6, () => true, 9);

for (let y = C.y + 6; y < C.y + C.height - 8; y += 30) {
  for (let x = C.x + 6; x < C.x + C.width - 8; x += 30) {
    if (!inRegion('C')(x + 11, y + 11) || !isLand(x, y) || !isLand(x + 22, y + 22)) continue;
    if (nearPad(x + 11, y + 11, 18) || nearRail(x + 11, y + 11, 16) || nearGate(x + 11, y + 11, 22)) continue;
    const next = random(x * 31 + y);
    const size = 10 + Math.floor(next() * 7);
    const tile = next() < 0.5 ? 'cladding' : 'blockwork';
    ground(box(x + 11 - size / 2, y + 11 - size / 2, size, size), tile, 9 + Math.floor(next() * 7));
  }
}

const hull = { x: 14 * SQUARE + 6, y: 3 * SQUARE + 12, width: 2 * SQUARE + 30, height: 26 };
ground(box(hull.x, hull.y, hull.width, hull.height), 'cladding', 9);
ground(box(hull.x + 8, hull.y + 4, hull.width - 16, hull.height - 8), 'cladding', 11);
ground(octagon(hull.x + hull.width + 4, hull.y + hull.height / 2, 10, 10), 'cladding', 10);

const massifRock = masked((x, y) => isMassifTile(x, y));
if (massifRock) ground(massifRock, 'rock', 15);

for (const segment of railSegments()) fill(box(segment.x, segment.y, segment.width, segment.height), 'track');

const wards: LandStep[] = REGIONS.flatMap((region) => {
  const shape = squareMask((column, row) => codeAt(column, row) === region.code);
  return shape ? [{ kind: 'ward', shape, ward: region.id } as LandStep] : [];
});
const gates: LandStep[] = GATE_PLANS.map((gate) => ({ kind: 'gate', id: gate.id, rect: rect(gate.x, gate.y, 2, 2), tile: 'door' }));

const planOf = (pockets: readonly LandStep[]): LandPlan => ({ id: LAND_ID, squareSize: SQUARE, columns: COLUMNS, rows: ROWS, steps: [...steps, ...pockets, ...wards, ...gates] });

const bridgeSet = new Set(bridgeTiles().map((tile) => tile.y * WIDTH + tile.x));

function pocketsOf(map: ReturnType<typeof drawLand>): { shape: LandShape | undefined; count: number; bySquare: Map<string, number> } {
  const seen = new Uint8Array(WIDTH * HEIGHT);
  const start = padOf(placeById('site-kestrel'));
  const walkable = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT && (TILE_KINDS[map.tileAt({ x, y })].walkable || bridgeSet.has(y * WIDTH + x));
  const first = Math.floor(start.y + start.height / 2) * WIDTH + Math.floor(start.x + start.width / 2);
  const queue = [first];
  seen[first] = 1;
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head]!;
    const x = index % WIDTH;
    const y = Math.floor(index / WIDTH);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (!walkable(nx, ny) || seen[ny * WIDTH + nx]) continue;
      seen[ny * WIDTH + nx] = 1;
      queue.push(ny * WIDTH + nx);
    }
  }
  let count = 0;
  const bySquare = new Map<string, number>();
  const pocket = (x: number, y: number): boolean => TILE_KINDS[map.tileAt({ x, y })].walkable && !seen[y * WIDTH + x];
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) if (pocket(x, y)) {
    count++;
    const key = Math.floor(x / SQUARE) + ',' + Math.floor(y / SQUARE);
    bySquare.set(key, (bySquare.get(key) ?? 0) + 1);
  }
  return { shape: count > 0 ? masked(pocket) : undefined, count, bySquare };
}

let pocketSteps: LandStep[] = [];
let plan = planOf(pocketSteps);
let land = drawLand(plan);
for (let pass = 0; pass < 4; pass++) {
  const found = pocketsOf(land);
  if (!found.shape) break;
  console.log('pocket tiles filled', found.count, [...found.bySquare].filter(([, n]) => n > 30).map(([key, n]) => key + ':' + n).join(' '));
  pocketSteps = [...pocketSteps, { kind: 'fill', shape: found.shape, tile: 'rock' }];
  plan = planOf(pocketSteps);
  land = drawLand(plan);
}
const text = printLandPlan(plan);
writeFileSync(OUT, text);

const SYMBOL: Partial<Record<TileKindId, string>> = { rock: '#', water: '~', grass: '.', trees: 'T', paving: '=', asphalt: '-', concrete: ':', gravel: ',', rust: '%', dirt: '`', soil: 's', plating: 'p', grate: 'g', coolant: 'c', boards: 'b', cladding: 'C', blockwork: 'Q', door: 'D', cliff: 'X', track: '+' };
const scale = Number(process.argv[2] ?? 8);
const rows: string[] = [];
const heights: string[] = [];
for (let y = 0; y < HEIGHT; y += scale) {
  let row = '';
  let hrow = '';
  for (let x = 0; x < WIDTH; x += scale) {
    const counts = new Map<string, number>();
    let hsum = 0;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const tile = land.tileAt({ x: x + dx, y: y + dy });
      const symbol = SYMBOL[tile] ?? '?';
      counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
      hsum += land.heightAt({ x: x + dx, y: y + dy });
    }
    row += [...counts].sort((a, b) => b[1] - a[1])[0]![0];
    hrow += Math.round(hsum / (scale * scale)).toString(16);
  }
  rows.push(row);
  heights.push(hrow);
}
console.log(rows.join('\n'));
console.log(heights.join('\n'));
let walkable = 0;
let cliffs = 0;
for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
  const kind = land.tileAt({ x, y });
  if (TILE_KINDS[kind].walkable) walkable++;
  if (kind === 'cliff') cliffs++;
}
console.log('walkable', walkable, 'cliffs', cliffs, 'steps', plan.steps.length, 'bytes', text.length, 'bridges', BRIDGE_PLANS_FOR_LAND.length);
void regionAtSquare;
void isRailTile;
