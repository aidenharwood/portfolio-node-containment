import { writeFileSync } from 'node:fs';
import { isInsideShape } from '../../packages/shared/src/world/blueprint.ts';
import { drawLand, type LandPlan, type LandShape, type LandStep } from '../../packages/shared/src/world/landPlan.ts';
import { printLandPlan } from '../../packages/shared/src/world/printLandPlan.ts';
import type { TilePoint, TileRect } from '../../packages/shared/src/world/geometry.ts';
import { TILE_KINDS, type TileKindId } from '../../packages/shared/src/world/tiles.ts';
import { valueNoise } from '../../packages/shared/src/world/noise.ts';
import { codeAt, COLUMNS, HEIGHT, HULL, LAND_ID, landSquares, MASSIF, padOf, placeAt, PLACES, placeById, random, REGIONS, regionAtSquare, regionOfCode, ROWS, SQUARE, WIDTH } from './atlas.ts';
import { LAYOUT_SOURCES } from '../../packages/shared/src/content/districts/layouts/index.ts';
import { BRIDGE_PLANS_FOR_LAND, bridgeTiles } from './bridges.ts';
import { isLandTile, isSeamTile, nearPad, nearRail, nearSeam, railSegments, seamEdges } from './plan.ts';
import { LEDGE_LEVELS, massifLevels, massifMask, screeMask } from './massif.ts';
import { gradeRail } from './grade.ts';
import { megastructureTiles } from './megastructures.ts';
import { buildingSpecOf, WILD_POIS } from './wilds.ts';
import { QUEST_PLACEMENTS } from './extras/quests.ts';
import { distanceField, riverReach, shapeRelief, type Lake } from './relief.ts';
import { joinLoops, maskLoops, maskPolygon, smoothLoop } from './trace.ts';

const OUT = process.env.SPAN_LAND_OUT ?? new URL('../../packages/shared/src/content/land/the-span.json', import.meta.url);

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
const SMOOTHING = 1.2;
const smoothed = (inside: (x: number, y: number) => boolean): LandShape | undefined => {
  const points = joinLoops(maskLoops(WIDTH, HEIGHT, inside).map((loop) => smoothLoop(loop, SMOOTHING)));
  return points.length >= 3 ? polygon(points) : undefined;
};
const lineDrawn = (points: readonly TilePoint[], width: number): ((x: number, y: number) => boolean) => {
  const drawn = drawLand({ id: LAND_ID, squareSize: SQUARE, columns: COLUMNS, rows: ROWS, steps: [{ kind: 'line', points, width, tile: 'water' }] });
  return (x, y) => drawn.tileAt({ x, y }) === 'water';
};
const squareMask = (keep: (column: number, row: number) => boolean): LandShape | undefined => {
  const points = maskPolygon(COLUMNS, ROWS, keep).map((point) => ({ x: point.x * SQUARE, y: point.y * SQUARE }));
  return points.length >= 3 ? polygon(points) : undefined;
};

const keepClear = (x: number, y: number, margin: number): boolean => !nearPad(x, y, margin) && !nearRail(x, y, 3);

function blobs(seed: number, area: TileRect, count: number, minR: number, maxR: number, tile: TileKindId, spacing = 3, keep: (x: number, y: number, r: number) => boolean = () => true, height?: number | ((x: number, y: number, r: number) => number)): void {
  const next = random(seed);
  const placed: { x: number; y: number; r: number }[] = [];
  for (let attempt = 0; attempt < count * 40 && placed.length < count; attempt++) {
    const r = minR + next() * (maxR - minR);
    const x = area.x + r + next() * (area.width - 2 * r);
    const y = area.y + r + next() * (area.height - 2 * r);
    if (!keepClear(x, y, r + 3) || nearRail(x, y, r + 3)) continue;
    if (!isLandTile(Math.round(x), Math.round(y)) || isMassif(Math.round(x), Math.round(y))) continue;
    if (!keep(x, y, r)) continue;
    if (placed.some((other) => Math.hypot(other.x - x, other.y - y) < other.r + r + spacing)) continue;
    placed.push({ x, y, r });
    fill(round(x, y, r), tile);
    if (height !== undefined) rise(round(x, y, r), typeof height === 'number' ? height : height(x, y, r));
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
const SPILL_CLEAR = 6;
const massifTiles = massifMask((x, y) => riverReach(spill, x, y).distance < SPILL_CLEAR);
const isMassif = (x: number, y: number): boolean => massifTiles[y * WIDTH + x] === 1;

const SPILL_HEAD = 7;
const spillLength = spill.slice(1).reduce((total, point, index) => total + Math.hypot(point.x - spill[index]!.x, point.y - spill[index]!.y), 0);
const spillLevel = (along: number): number => Math.max(0, Math.round(SPILL_HEAD * (1 - along / spillLength)));
const LAKES: readonly Lake[] = [
  { x: 7 * SQUARE + 30, y: 11 * SQUARE + 26, r: 17 },
  { x: 10 * SQUARE + 40, y: 1 * SQUARE + 34, r: 21 },
  { x: 11 * SQUARE + 6, y: 1 * SQUARE + 40, r: 12 },
];
const squareOf = new Map(Object.values(LAYOUT_SOURCES).flatMap((source) => {
  const layout = source as { readonly id?: string; readonly square?: { readonly column: number; readonly row: number } };
  return layout.id && layout.square ? [[layout.id, layout.square] as const] : [];
}));
const C = regionBox('C');
const towers: { x: number; y: number; size: number; tile: TileKindId; height: number }[] = [];
for (let y = C.y + 6; y < C.y + C.height - 8; y += 30) {
  for (let x = C.x + 6; x < C.x + C.width - 8; x += 30) {
    if (!inRegion('C')(x + 11, y + 11) || !isLand(x, y) || !isLand(x + 22, y + 22)) continue;
    if (nearPad(x + 11, y + 11, 18) || nearRail(x + 11, y + 11, 16) || nearSeam(x + 11, y + 11, 22)) continue;
    const next = random(x * 31 + y);
    const size = 10 + Math.floor(next() * 7);
    towers.push({ x, y, size, tile: next() < 0.5 ? 'cladding' : 'blockwork', height: 9 + Math.floor(next() * 7) });
  }
}
const footprints = megastructureTiles((id) => squareOf.get(id));

const SITE = { x: 34, y: 32 };
const SITE_RING = 2;
const SITE_APRON = 3;
const SITE_FORECOURT = 9;
const SEAM_CLEAR = 3;
const blocked = new Uint8Array(WIDTH * HEIGHT);
const block = (left: number, top: number, width: number, height: number): void => {
  for (let y = Math.max(0, top); y < Math.min(HEIGHT, top + height); y++) for (let x = Math.max(0, left); x < Math.min(WIDTH, left + width); x++) blocked[y * WIDTH + x] = 1;
};
for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) if (!isLand(x, y) || massifTiles[y * WIDTH + x] || nearRail(x, y, 4) || riverReach(spill, x, y).distance < 5) blocked[y * WIDTH + x] = 1;
for (const edge of seamEdges()) {
  if (edge.vertical) block(edge.line - SEAM_CLEAR, edge.from - SEAM_CLEAR, SEAM_CLEAR * 2, edge.to - edge.from + SEAM_CLEAR * 2);
  else block(edge.from - SEAM_CLEAR, edge.line - SEAM_CLEAR, edge.to - edge.from + SEAM_CLEAR * 2, SEAM_CLEAR * 2);
}
for (const lake of LAKES) block(lake.x - lake.r - 2, lake.y - lake.r - 2, 2 * lake.r + 4, 2 * lake.r + 4);
block(HULL.x, HULL.y, HULL.width, HULL.height);
block(HULL.x + HULL.width - 6, HULL.y + HULL.height / 2 - 10, 20, 21);
for (const tower of towers) block(tower.x + 11 - tower.size / 2 - 2, tower.y + 11 - tower.size / 2 - 2, tower.size + 4, tower.size + 4);
for (const tiles of footprints) for (const tile of tiles) block(tile.x - 3, tile.y - 3, 7, 7);
for (const [id, placements] of Object.entries(QUEST_PLACEMENTS)) {
  const square = squareOf.get(id);
  if (!square) continue;
  for (const placement of [...(placements.objects ?? []), ...(placements.npcs ?? [])]) {
    if (!('room' in placement.at) || placement.at.room !== 'ground') continue;
    block(square.column * SQUARE + placement.at.dx - 5, square.row * SQUARE + placement.at.dy - 5, 12, 12);
  }
}
const blockedSum = new Int32Array((WIDTH + 1) * (HEIGHT + 1));
for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) blockedSum[(y + 1) * (WIDTH + 1) + x + 1] = blocked[y * WIDTH + x]! + blockedSum[y * (WIDTH + 1) + x + 1]! + blockedSum[(y + 1) * (WIDTH + 1) + x]! - blockedSum[y * (WIDTH + 1) + x]!;
const blockedIn = (x: number, y: number, width: number, height: number): number =>
  blockedSum[(y + height) * (WIDTH + 1) + x + width]! - blockedSum[y * (WIDTH + 1) + x + width]! - blockedSum[(y + height) * (WIDTH + 1) + x]! + blockedSum[y * (WIDTH + 1) + x]!;
const clearance = distanceField(WIDTH, HEIGHT, blocked);
const wildAt = new Map([...squareOf].map(([id, square]) => [square.column + ',' + square.row, id] as const));
const siteOf = (column: number, row: number, region: string): { x: number; y: number; width: number; height: number } => {
  const poi = WILD_POIS[wildAt.get(column + ',' + row) ?? ''];
  const size = poi ? buildingSpecOf(poi, region, 0, 0) : { w: 10, h: 8 };
  const flat = { width: size.w + 2 * SITE_RING, height: size.h + 2 * SITE_RING };
  const zone = { width: size.w + 2 * SITE_APRON, height: size.h + 2 * SITE_APRON + SITE_FORECOURT };
  let best: { x: number; y: number } | undefined;
  let score = Infinity;
  for (let y = 1; y + zone.height <= SQUARE - 1; y++) {
    for (let x = 1; x + zone.width <= SQUARE - 1; x++) {
      if (blockedIn(column * SQUARE + x, row * SQUARE + y, zone.width, zone.height) > 0) continue;
      const value = Math.hypot(x + zone.width / 2 - SITE.x, y + flat.height / 2 - SITE.y);
      if (value < score) {
        score = value;
        best = { x, y };
      }
    }
  }
  if (!best) {
    let open = -1;
    for (let y = 8; y <= SQUARE - 8; y++) for (let x = 8; x <= SQUARE - 8; x++) {
      const room = clearance[(row * SQUARE + y) * WIDTH + column * SQUARE + x]!;
      if (room > open) {
        open = room;
        best = { x: x - Math.floor(zone.width / 2), y: y - Math.floor(flat.height / 2) };
      }
    }
  }
  const at = best ?? { x: SITE.x - Math.floor(zone.width / 2), y: SITE.y - Math.floor(flat.height / 2) };
  const inset = SITE_APRON - SITE_RING;
  return { x: column * SQUARE + at.x + inset, y: row * SQUARE + at.y + inset, width: flat.width, height: flat.height };
};
const sites = landSquares().filter((square) => !placeAt(square.column, square.row)).map((square) => siteOf(square.column, square.row, square.region.id));
const shaped = shapeRelief({ land: landTiles, massif: massifTiles, lakes: LAKES, river: spill, riverLevel: spillLevel, footprints, sites });

const FRONTIER_SWAY = 28;
const sway = (seed: number, x: number, y: number): number => FRONTIER_SWAY * (valueNoise(seed, x / 36, y / 36) - 0.5) + (FRONTIER_SWAY / 3) * (valueNoise(seed + 1, x / 9, y / 9) - 0.5);
const groundCode = new Uint8Array(WIDTH * HEIGHT);
for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
  const own = codeAt(Math.floor(x / SQUARE), Math.floor(y / SQUARE));
  const swayed = codeAt(Math.floor((x + sway(811, x, y)) / SQUARE), Math.floor((y + sway(823, x, y)) / SQUARE));
  groundCode[y * WIDTH + x] = (regionOfCode(swayed) ? swayed : own).charCodeAt(0);
}
const groundIs = (code: string, x: number, y: number): boolean => groundCode[y * WIDTH + x] === code.charCodeAt(0);

REGIONS.forEach((region) => {
  const shape = masked((x, y) => isLand(x, y) && groundIs(region.code, x, y));
  if (shape) fill(shape, region.ground);
  const shore = masked((x, y) => shaped.beach[y * WIDTH + x] === 1 && groundIs(region.code, x, y));
  if (shore) fill(shore, region.shore);
});
const massifShape = squareMask((column, row) => codeAt(column, row) === MASSIF);
if (massifShape) fill(massifShape, 'rock');
steps.push(...shaped.steps);

const seaShape = masked((x, y) => !isLand(x, y));
if (seaShape) rise(seaShape, 0);

line(spill, 3, 'water');
const inSpill = lineDrawn(spill, 3);
const spillLevels = new Int8Array(WIDTH * HEIGHT).fill(-1);
const SPILL_FALL = 3;
for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) if (inSpill(x, y)) spillLevels[y * WIDTH + x] = Math.min(spillLevel(riverReach(spill, x, y).along), Math.floor(shaped.coast[y * WIDTH + x]! / SPILL_FALL));
for (let level = 0; level <= SPILL_HEAD; level++) {
  const reach = masked((x, y) => spillLevels[y * WIDTH + x] === level);
  if (reach) rise(reach, level);
}

for (let index = 1; index < spill.length; index++) {
  const a = spill[index - 1]!;
  const b = spill[index]!;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  if (nearRail(mx, my, 6)) continue;
  fill(round(mx, my, 4), 'boards');
}
for (const lake of LAKES) ground(round(lake.x, lake.y, lake.r), 'water', 0);

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
for (const tower of towers) fill(box(tower.x, tower.y, 22, 22), 'paving');
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

const SEAM_UNDER: ReadonlySet<TileKindId> = new Set<TileKindId>(['water', 'boards', 'rock']);
const seamLine = masked((x, y) => isSeamTile(x, y) && isLand(x, y) && !massifTiles[y * WIDTH + x] && !SEAM_UNDER.has(relief.tileAt({ x, y })));
if (seamLine) fill(seamLine, 'plating');

const graded = drawLand({ id: LAND_ID, squareSize: SQUARE, columns: COLUMNS, rows: ROWS, steps: [...steps] });
const railRises = gradeRail((x, y) => graded.heightAt({ x, y }));
const layRail = (): void => {
  for (const segment of railSegments()) fill(box(segment.x, segment.y, segment.width, segment.height), 'track');
  for (const railRise of railRises) rise({ kind: 'rect', rect: railRise.rect }, railRise.height);
};
layRail();

const lowestUnder = (x: number, y: number, r: number): number => {
  const shape = round(x, y, r);
  if (shape.kind === 'polygon') return 0;
  let lowest = 15;
  for (let ty = shape.rect.y; ty < shape.rect.y + shape.rect.height; ty++) {
    for (let tx = shape.rect.x; tx < shape.rect.x + shape.rect.width; tx++) if (isInsideShape(shape.kind, shape.rect, { x: tx, y: ty })) lowest = Math.min(lowest, graded.heightAt({ x: tx, y: ty }));
  }
  return lowest;
};
blobs(33, K, 4, 2, 4, 'water', 10, () => true, lowestUnder);
blobs(63, G, 12, 2, 5, 'water', 7, () => true, lowestUnder);
blobs(73, S, 10, 2, 4, 'coolant', 7, () => true, lowestUnder);

const SCREE_SHORE = 3;
const SCREE_UNDER: ReadonlySet<TileKindId> = new Set<TileKindId>(['grass', 'soil', 'dirt', 'gravel', 'trees', 'concrete', 'asphalt']);
const siteNear = (x: number, y: number): boolean => sites.some((site) => x >= site.x - 3 && y >= site.y - 3 && x < site.x + site.width + 3 && y < site.y + site.height + 3);
const sloped = drawLand({ id: LAND_ID, squareSize: SQUARE, columns: COLUMNS, rows: ROWS, steps: [...steps] });
const screes = screeMask(
  distanceField(WIDTH, HEIGHT, massifTiles),
  (x, y) => isLand(x, y) && !isMassif(x, y) && shaped.coast[y * WIDTH + x]! > SCREE_SHORE && regionOfCode(codeAt(Math.floor(x / SQUARE), Math.floor(y / SQUARE))) !== undefined && SCREE_UNDER.has(sloped.tileAt({ x, y })) && !nearPad(x, y, 4) && !nearRail(x, y, 4) && !nearSeam(x, y, 4) && !siteNear(x, y) && !blocked[y * WIDTH + x],
);
const screeShape = smoothed((x, y) => screes[y * WIDTH + x] === 1);
if (screeShape) fill(screeShape, 'gravel');

steps.push({ kind: 'soften', shape: box(0, 0, WIDTH, HEIGHT) } as LandStep);

blobs(74, S, 9, 2, 4, 'rock', 6, () => true, 15);
blobs(54, W, 8, 2, 4, 'rock', 6, () => true, 9);

for (const tower of towers) ground(box(tower.x + 11 - tower.size / 2, tower.y + 11 - tower.size / 2, tower.size, tower.size), tower.tile, tower.height);

ground(box(HULL.x, HULL.y, HULL.width, HULL.height), 'cladding', 9);
ground(box(HULL.x + 8, HULL.y + 4, HULL.width - 16, HULL.height - 8), 'cladding', 11);
ground(octagon(HULL.x + HULL.width + 4, HULL.y + HULL.height / 2, 10, 10), 'cladding', 10);

const massifRock = masked(isMassif);
if (massifRock) fill(massifRock, 'rock');
const settled = drawLand({ id: LAND_ID, squareSize: SQUARE, columns: COLUMNS, rows: ROWS, steps: [...steps] });
const ledges = massifLevels(massifTiles, (x, y) => settled.heightAt({ x, y }));
const LEDGE_EDGE = 1;
const ledgeLevels = [...new Set(ledges.levels)].filter((value) => value > 0).sort((a, b) => a - b);
const ledgeAt = (x: number, y: number): number => (isMassif(x, y) ? ledges.levels[y * WIDTH + x]! : 0);
const inner = (x: number, y: number): boolean => ledges.depth[y * WIDTH + x]! > LEDGE_EDGE;
const onLedge = (x: number, y: number): boolean => LEDGE_LEVELS.includes(ledgeAt(x, y));
for (const level of LEDGE_LEVELS) {
  const shape = smoothed((x, y) => inner(x, y) && ledgeAt(x, y) >= level);
  if (shape) rise(shape, level);
}
for (const level of ledgeLevels) {
  const shape = masked((x, y) => isMassif(x, y) && (!inner(x, y) || !onLedge(x, y)) && ledgeAt(x, y) === level);
  if (shape) rise(shape, level);
}

layRail();

const wards: LandStep[] = REGIONS.flatMap((region) => {
  const shape = squareMask((column, row) => codeAt(column, row) === region.code);
  return shape ? [{ kind: 'ward', shape, ward: region.id } as LandStep] : [];
});
const planOf = (pockets: readonly LandStep[]): LandPlan => ({ id: LAND_ID, squareSize: SQUARE, columns: COLUMNS, rows: ROWS, steps: [...steps, ...pockets, ...wards] });

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
