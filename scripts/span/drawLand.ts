import { writeFileSync } from 'node:fs';
import { drawLand, type LandPlan, type LandShape, type LandStep } from '../../packages/shared/src/world/landPlan.ts';
import { printLandPlan } from '../../packages/shared/src/world/printLandPlan.ts';
import type { TilePoint, TileRect } from '../../packages/shared/src/world/geometry.ts';
import { TILE_KINDS, type TileKindId } from '../../packages/shared/src/world/tiles.ts';
import { BASE_HEIGHT, COLUMNS, GATES, HEIGHT, LAND_ID, padHeightOf, padOf, PLACES, random, REGIONS, ROWS, SEAM_HALF, spillY, SQUARE, WIDTH } from './atlas.ts';

const OUT = new URL('../../packages/shared/src/content/land/the-span.json', import.meta.url);

const steps: LandStep[] = [];
const rect = (x: number, y: number, width: number, height: number): TileRect => ({ x: Math.round(x), y: Math.round(y), width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) });
const box = (x: number, y: number, width: number, height: number): LandShape => ({ kind: 'rect', rect: rect(x, y, width, height) });
const round = (cx: number, cy: number, r: number): LandShape => ({ kind: 'round', rect: rect(cx - r, cy - r, 2 * r, 2 * r) });
const octagon = (cx: number, cy: number, rx: number, ry: number): LandShape => ({ kind: 'octagon', rect: rect(cx - rx, cy - ry, 2 * rx, 2 * ry) });
const polygon = (points: readonly TilePoint[]): LandShape => ({ kind: 'polygon', points: points.map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) })) });
const fill = (shape: LandShape, tile: TileKindId): void => void steps.push({ kind: 'fill', shape, tile });
const rise = (shape: LandShape, height: number): void => void steps.push({ kind: 'rise', shape, height });
const ground = (shape: LandShape, tile: TileKindId, height: number): void => {
  fill(shape, tile);
  rise(shape, height);
};
const line = (points: readonly TilePoint[], width: number, tile: TileKindId): void => void steps.push({ kind: 'line', points: points.map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) })), width, tile });

const wave = (seed: number, along: number, amplitude = 3): number => amplitude * Math.sin(along / 37 + seed) + (amplitude / 2) * Math.sin(along / 11 + seed * 1.7);

const inPad = (x: number, y: number, margin = 4): boolean =>
  PLACES.some((place) => {
    const pad = padOf(place);
    return x >= pad.x - margin && y >= pad.y - margin && x < pad.x + pad.width + margin && y < pad.y + pad.height + margin;
  });
const nearGate = (x: number, y: number, reach = 14): boolean => GATES.some((gate) => Math.abs(gate.seam - x) < reach && Math.abs(gate.y - y) < reach);
const nearSeam = (x: number, reach = 10): boolean => REGIONS.some((region) => region.from > 0 && Math.abs(region.from - x) < reach);

function blobs(seed: number, area: TileRect, count: number, minR: number, maxR: number, tile: TileKindId, spacing = 3, keep: (x: number, y: number, r: number) => boolean = () => true): void {
  const next = random(seed);
  const placed: { x: number; y: number; r: number }[] = [];
  for (let attempt = 0; attempt < count * 40 && placed.length < count; attempt++) {
    const r = minR + next() * (maxR - minR);
    const x = area.x + r + next() * (area.width - 2 * r);
    const y = area.y + r + next() * (area.height - 2 * r);
    if (inPad(x, y, r + 3) || nearGate(x, y, r + 12) || nearSeam(x, r + 8)) continue;
    if (!keep(x, y, r)) continue;
    if (placed.some((other) => Math.hypot(other.x - x, other.y - y) < other.r + r + spacing)) continue;
    placed.push({ x, y, r });
    fill(round(x, y, r), tile);
  }
}

const north = (x: number): number => 18 + wave(1, x, 4);
const south = (x: number): number => HEIGHT - 18 + wave(2, x, 4);

fill(box(0, 0, WIDTH, HEIGHT), 'rock');
rise(box(0, 0, WIDTH, HEIGHT), 15);

const band: TilePoint[] = [];
for (let x = 12; x <= WIDTH - 12; x += 8) band.push({ x, y: north(x) });
for (let y = 24; y <= HEIGHT - 24; y += 8) band.push({ x: WIDTH - 12 + wave(3, y, 2), y });
for (let x = WIDTH - 12; x >= 12; x -= 8) band.push({ x, y: south(x) });
for (let y = HEIGHT - 24; y >= 24; y -= 8) band.push({ x: 12 + wave(4, y, 2), y });
ground(polygon(band), 'grass', BASE_HEIGHT);

const kestrel = REGIONS[0]!;
blobs(11, rect(kestrel.from + 14, 28, kestrel.to - kestrel.from - 24, HEIGHT - 56), 14, 2, 5, 'trees', 8);
ground(round(150, 96, 24), 'water', 0);
ground(round(156, 102, 12), 'water', 0);
line([{ x: 20, y: 240 }, { x: 70, y: 232 }, { x: 128, y: 236 }, { x: 186, y: 214 }], 3, 'paving');
line([{ x: 96, y: 40 }, { x: 96, y: 128 }], 3, 'paving');
line([{ x: 96, y: 256 }, { x: 96, y: 352 }], 3, 'paving');

const harrow = REGIONS[1]!;
const terraceTop = 24;
const terraceBands = [
  { y: 154, height: 3 },
  { y: 128, height: 4 },
  { y: 102, height: 5 },
  { y: 78, height: 6 },
  { y: terraceTop, height: 7 },
];
let bottom = 180;
for (const terrace of terraceBands) {
  const shape = box(harrow.from + 22, terrace.y, harrow.to - harrow.from - 44, bottom - terrace.y);
  ground(shape, 'grass', terrace.height);
  bottom = terrace.y;
}
for (let y = 104; y < 180; y += 26) {
  for (let x = harrow.from + 26; x < harrow.to - 30; x += 30) fill(box(x, y + 4, 22, 14), 'soil');
}
for (const y of [127, 153]) line([{ x: harrow.from + 24, y }, { x: harrow.to - 24, y }], 1, 'water');
for (const y of [127, 153]) for (const x of [harrow.from + 60, harrow.from + 120, harrow.from + 170]) fill(box(x, y, 3, 1), 'boards');
blobs(12, rect(harrow.from + 10, 190, harrow.to - harrow.from - 20, HEIGHT - 220), 30, 3, 7, 'soil', 4);
blobs(13, rect(harrow.from + 10, 190, harrow.to - harrow.from - 20, HEIGHT - 220), 12, 1.5, 3, 'trees', 9);

const halcyon = REGIONS[2]!;
ground(box(halcyon.from + 16, 40, halcyon.to - halcyon.from - 32, HEIGHT - 80), 'asphalt', 3);
for (let x = halcyon.from + 20; x < halcyon.to - 20; x += 34) {
  for (let y = 46; y < HEIGHT - 50; y += 34) {
    if (inPad(x + 12, y + 12, 14)) continue;
    fill(box(x, y, 22, 22), 'paving');
    const next = random(x * 31 + y);
    if (next() < 0.7) fill(box(x + 3, y + 3, 16 - Math.floor(next() * 6), 16 - Math.floor(next() * 6)), next() < 0.5 ? 'cladding' : 'blockwork');
  }
}

const wreck = REGIONS[3]!;
blobs(14, rect(wreck.from + 8, 24, wreck.to - wreck.from - 16, HEIGHT - 48), 40, 3, 9, 'gravel', 2);
blobs(15, rect(wreck.from + 8, 24, wreck.to - wreck.from - 16, HEIGHT - 48), 34, 2, 7, 'rust', 3);
blobs(16, rect(wreck.from + 8, 24, wreck.to - wreck.from - 16, HEIGHT - 48), 24, 2, 5, 'dirt', 3);
ground(octagon(700, 84, 40, 28), 'water', 0);
const hull = { x: 620, y: 140, width: 120, height: 34 };
ground(box(hull.x, hull.y, hull.width, hull.height), 'rust', 3);
ground(box(hull.x + 4, hull.y + 4, hull.width - 8, hull.height - 8), 'rust', 4);
ground(box(hull.x + 8, hull.y + 8, hull.width - 16, hull.height - 16), 'plating', 5);
fill(box(hull.x + 30, hull.y + 12, 6, 10), 'cladding');
fill(box(hull.x + 70, hull.y + 10, 10, 6), 'cladding');

const steppe = REGIONS[4]!;
fill(box(steppe.from + 6, 24, steppe.to - steppe.from - 12, HEIGHT - 48), 'soil');
blobs(17, rect(steppe.from + 8, 24, steppe.to - steppe.from - 16, HEIGHT - 48), 30, 2, 6, 'gravel', 3);
ground(round(836, 200, 46), 'grate', 3);
ground(round(836, 200, 38), 'soil', 4);
blobs(18, rect(steppe.from + 8, 24, steppe.to - steppe.from - 16, HEIGHT - 48), 14, 2, 5, 'water', 6, (x, y, r) => Math.hypot(x - 836, y - 200) > 50 + r);

const spindle = REGIONS[5]!;
fill(box(spindle.from + 6, 24, spindle.to - spindle.from - 12, HEIGHT - 48), 'concrete');
blobs(19, rect(spindle.from + 8, 24, spindle.to - spindle.from - 16, HEIGHT - 48), 24, 3, 7, 'plating', 2);
blobs(20, rect(spindle.from + 8, 24, spindle.to - spindle.from - 16, HEIGHT - 48), 10, 2, 4, 'coolant', 8);
blobs(21, rect(spindle.from + 8, 24, spindle.to - spindle.from - 16, HEIGHT - 48), 16, 1, 2, 'grate', 6);

const spill: TilePoint[] = [];
for (let x = 14; x <= WIDTH - 14; x += 6) spill.push({ x, y: spillY(x) });
for (const gate of GATES) if (Math.abs(spillY(gate.seam) - gate.y) < 16) throw new Error('the Spill runs into gate ' + gate.id);
line(spill, 5, 'water');
rise(polygon([...spill.map((point) => ({ x: point.x, y: point.y - 3 })), ...[...spill].reverse().map((point) => ({ x: point.x, y: point.y + 3 }))]), 0);
for (let x = 40; x < WIDTH - 30; x += 52) {
  const at = spill.reduce((best, point) => (Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best));
  if (nearSeam(at.x, 14)) continue;
  const deck = box(at.x - 1, at.y - 6, 3, 13);
  ground(deck, 'boards', at.x >= REGIONS[2]!.from + 16 && at.x < REGIONS[2]!.to - 16 ? 3 : BASE_HEIGHT);
}

const northRim: TilePoint[] = [{ x: 0, y: 0 }, { x: WIDTH, y: 0 }];
for (let x = WIDTH; x >= 0; x -= 8) northRim.push({ x, y: north(Math.min(WIDTH - 12, Math.max(12, x))) });
const southRim: TilePoint[] = [{ x: 0, y: HEIGHT }, { x: WIDTH, y: HEIGHT }];
for (let x = WIDTH; x >= 0; x -= 8) southRim.push({ x, y: south(Math.min(WIDTH - 12, Math.max(12, x))) });
const westRim: TilePoint[] = [{ x: 0, y: 0 }, { x: 0, y: HEIGHT }];
for (let y = HEIGHT; y >= 0; y -= 8) westRim.push({ x: 12 + wave(4, Math.min(HEIGHT - 24, Math.max(24, y)), 2), y });
const eastRim: TilePoint[] = [{ x: WIDTH, y: 0 }, { x: WIDTH, y: HEIGHT }];
for (let y = HEIGHT; y >= 0; y -= 8) eastRim.push({ x: WIDTH - 12 + wave(3, Math.min(HEIGHT - 24, Math.max(24, y)), 2), y });
for (const rim of [northRim, southRim, westRim, eastRim]) ground(polygon(rim), 'rock', 15);

for (const region of REGIONS) {
  if (region.from === 0) continue;
  const seam = region.from;
  ground(box(seam - SEAM_HALF, 0, SEAM_HALF * 2 + 1, HEIGHT), 'rock', 15);
}

for (const place of PLACES) {
  ground({ kind: 'rect', rect: padOf(place) }, place.pad, padHeightOf(place));
}

for (const gate of GATES) {
  ground(octagon(gate.seam - 12, gate.y + 1, 9, 7), 'paving', BASE_HEIGHT);
  ground(octagon(gate.seam + 13, gate.y + 1, 9, 7), 'paving', BASE_HEIGHT);
  ground(box(gate.seam - SEAM_HALF - 2, gate.y, SEAM_HALF * 2 + 5, 2), 'paving', BASE_HEIGHT);
}

const wards: LandStep[] = REGIONS.map((region) => ({ kind: 'ward', shape: box(region.from, 0, region.to - region.from, HEIGHT), ward: region.id }));
const gates: LandStep[] = GATES.map((gate) => ({ kind: 'gate', id: gate.id, rect: rect(gate.seam - 1, gate.y, 2, 2), tile: 'door' }));

const planOf = (pockets: readonly LandStep[]): LandPlan => ({ id: LAND_ID, squareSize: SQUARE, columns: COLUMNS, rows: ROWS, steps: [...steps, ...pockets, ...wards, ...gates] });

function pocketsOf(map: ReturnType<typeof drawLand>): LandStep[] {
  const seen = new Uint8Array(WIDTH * HEIGHT);
  const start = padOf(PLACES[0]!);
  const queue = [Math.floor(start.y + start.height / 2) * WIDTH + Math.floor(start.x + start.width / 2)];
  seen[queue[0]!] = 1;
  const walkable = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT && TILE_KINDS[map.tileAt({ x, y })].walkable;
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
  const out: LandStep[] = [];
  for (let y = 0; y < HEIGHT; y++) {
    let runStart = -1;
    for (let x = 0; x <= WIDTH; x++) {
      const pocket = x < WIDTH && walkable(x, y) && !seen[y * WIDTH + x];
      if (pocket && runStart < 0) runStart = x;
      if (!pocket && runStart >= 0) {
        out.push({ kind: 'fill', shape: box(runStart, y, x - runStart, 1), tile: 'rock' });
        runStart = -1;
      }
    }
  }
  return out;
}

let pocketSteps: LandStep[] = [];
let plan = planOf(pocketSteps);
let land = drawLand(plan);
for (let round = 0; round < 5; round++) {
  const found = pocketsOf(land);
  if (found.length === 0) break;
  console.log('pocket rows filled', found.length);
  pocketSteps = [...pocketSteps, ...found];
  plan = planOf(pocketSteps);
  land = drawLand(plan);
}
writeFileSync(OUT, printLandPlan(plan));

const SYMBOL: Partial<Record<TileKindId, string>> = { rock: '#', water: '~', grass: '.', trees: 'T', paving: '=', asphalt: '-', concrete: ':', gravel: ',', rust: '%', dirt: '`', soil: 's', plating: 'p', grate: 'g', coolant: 'c', boards: 'b', cladding: 'C', blockwork: 'Q', door: 'D', cliff: 'X' };
const scale = Number(process.argv[2] ?? 8);
const rows: string[] = [];
for (let y = 0; y < HEIGHT; y += scale) {
  let row = '';
  for (let x = 0; x < WIDTH; x += scale) {
    const counts = new Map<string, number>();
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const tile = land.tileAt({ x: x + dx, y: y + dy });
      const symbol = SYMBOL[tile] ?? '?';
      counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
    }
    row += [...counts].sort((a, b) => b[1] - a[1])[0]![0];
  }
  rows.push(row);
}
console.log(rows.join('\n'));
let walkable = 0;
for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) if (TILE_KINDS[land.tileAt({ x, y })].walkable) walkable++;
console.log('walkable', walkable, 'steps', plan.steps.length);
