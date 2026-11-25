import type { TilePoint } from '../../packages/shared/src/world/geometry.ts';
import type { LandShape, LandStep } from '../../packages/shared/src/world/landPlan.ts';
import { contrastNoise, valueNoise } from '../../packages/shared/src/world/noise.ts';
import { codeAt, HEIGHT, padOf, PLACES, REGIONS, SQUARE, WIDTH, type RegionSpec } from './atlas.ts';
import { joinLoops, maskLoops, smoothLoop } from './trace.ts';

export interface Lake {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

export interface ReliefInput {
  readonly land: Uint8Array;
  readonly massif: Uint8Array;
  readonly lakes: readonly Lake[];
  readonly river: readonly TilePoint[];
  readonly riverLevel: (along: number) => number;
  readonly footprints: readonly (readonly TilePoint[])[];
  readonly sites: readonly { readonly x: number; readonly y: number; readonly width: number; readonly height: number }[];
}

export interface Relief {
  readonly coast: Float32Array;
  readonly heights: Uint8Array;
  readonly beach: Uint8Array;
  readonly steps: LandStep[];
}

interface Probe {
  readonly x: number;
  readonly y: number;
  readonly coast: number;
  readonly massif: number;
  readonly macro: number;
  readonly headland: number;
}

interface Shaper {
  readonly inland: (probe: Probe) => number;
  readonly ramp: (probe: Probe) => number;
  readonly hills: number;
}

const clamp = (value: number, low: number, high: number): number => (value < low ? low : value > high ? high : value);
const smoothstep = (from: number, to: number, value: number): number => {
  const t = clamp((value - from) / (to - from), 0, 1);
  return t * t * (3 - 2 * t);
};
const signed = (value: number): number => (value - 0.5) * 2;

const INFINITE = 1e10;

export function distanceField(width: number, height: number, source: Uint8Array): Float32Array {
  const grid = new Float64Array(width * height);
  for (let index = 0; index < grid.length; index++) grid[index] = source[index] ? 0 : INFINITE;
  const longest = Math.max(width, height);
  const f = new Float64Array(longest);
  const d = new Float64Array(longest);
  const z = new Float64Array(longest + 1);
  const v = new Int32Array(longest);
  const pass = (length: number, start: number, stride: number): void => {
    for (let index = 0; index < length; index++) f[index] = grid[start + index * stride]!;
    let k = 0;
    v[0] = 0;
    z[0] = -Infinity;
    z[1] = Infinity;
    for (let q = 1; q < length; q++) {
      let s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
      while (s <= z[k]!) {
        k--;
        s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < length; q++) {
      while (z[k + 1]! < q) k++;
      const offset = q - v[k]!;
      d[q] = offset * offset + f[v[k]!]!;
    }
    for (let index = 0; index < length; index++) grid[start + index * stride] = d[index]!;
  };
  for (let x = 0; x < width; x++) pass(height, x, width);
  for (let y = 0; y < height; y++) pass(width, y * width, 1);
  const out = new Float32Array(width * height);
  for (let index = 0; index < out.length; index++) out[index] = Math.sqrt(grid[index]!);
  return out;
}

const MACRO_SCALE = 100;
const macroAt = (x: number, y: number): number => signed(contrastNoise(907, x / MACRO_SCALE, y / MACRO_SCALE, 3, 0.45, 2));
const headlandAt = (x: number, y: number): number => smoothstep(0.42, 0.72, contrastNoise(613, x / 70, y / 70, 2, 0.45, 1.6));
const tableEdgeAt = (x: number, y: number): number => 24 + 12 * signed(contrastNoise(331, x / 60, y / 60, 2, 0.45, 1.8));
const beachWidthAt = (x: number, y: number): number => 1.5 + 2.5 * valueNoise(457, x / 24, y / 24);

function dunesAt(x: number, y: number): number {
  const field = smoothstep(0.42, 0.68, contrastNoise(271, x / 110, y / 110, 2, 0.45, 1.6));
  if (field === 0) return 0;
  const bend = signed(valueNoise(283, x / 90, y / 90));
  const angle = 0.55 + 0.5 * bend;
  const phase = (x * Math.cos(angle) + y * Math.sin(angle)) / 15 + 1.2 * signed(valueNoise(293, x / 40, y / 40));
  return 1.6 * field * Math.sin(phase * Math.PI * 2);
}

const SHAPERS: Readonly<Record<string, Shaper>> = {
  K: {
    inland: (p) => 3.5 + 5.5 * smoothstep(8, 120, p.coast) + 4.5 * p.macro + 3 * (1 - smoothstep(0, 30, p.massif)),
    ramp: (p) => 14 + 46 * (1 - p.headland),
    hills: 4,
  },
  H: {
    inland: (p) => 2.5 + 10.5 * Math.pow(p.coast / (p.coast + p.massif + 1), 0.8) + 2.5 * p.macro + 2 * (1 - smoothstep(0, 24, p.massif)),
    ramp: (p) => 10 + 30 * (1 - p.headland),
    hills: 3.5,
  },
  C: {
    inland: (p) => 4 + 2.5 * smoothstep(0, 70, p.coast) + 2.5 * (1 - smoothstep(0, 60, p.massif)) + 2 * p.macro,
    ramp: (p) => 8 + 20 * (1 - p.headland),
    hills: 2.5,
  },
  W: {
    inland: (p) => 2 + 2.5 * smoothstep(0, 50, p.coast) + 1.3 * p.macro + dunesAt(p.x, p.y),
    ramp: (p) => 8 + 16 * (1 - p.headland),
    hills: 2.5,
  },
  G: {
    inland: (p) => {
      const edge = tableEdgeAt(p.x, p.y);
      const table = smoothstep(edge - 6, edge + 6, p.coast);
      return 4.5 + 7.5 * table + p.macro * (0.8 + 0.6 * table) + 2 * (1 - smoothstep(0, 24, p.massif));
    },
    ramp: (p) => 6 + 6 * (1 - p.headland),
    hills: 3.5,
  },
  S: {
    inland: (p) => 11.5 + 1.6 * p.macro + 1.2 * (1 - smoothstep(0, 16, p.massif)),
    ramp: () => 4,
    hills: 3,
  },
};

const BEACH_LEVEL = 1;
const BEACH_BELOW = 3.2;
const BORDER_BLEND = 14;
const PAD_REACH = 20;
const SITE_REACH = 16;
const LAKE_REACH = 30;
const RIVER_CORE = 3;
const RIVER_REACH = 30;
const SITE_SPREAD = 10;
const HILL_GAIN = 2.2;
const CONTOUR_TOLERANCE = 1.6;

interface Flat {
  readonly target: number;
  readonly reach: number;
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly distance: (x: number, y: number) => number;
}

const rectDistance = (rect: { x: number; y: number; width: number; height: number }) => (x: number, y: number): number =>
  Math.hypot(Math.max(rect.x - x, 0, x - (rect.x + rect.width - 1)), Math.max(rect.y - y, 0, y - (rect.y + rect.height - 1)));

function segmentDistance(px: number, py: number, a: TilePoint, b: TilePoint): { distance: number; t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : clamp(((px - a.x) * dx + (py - a.y) * dy) / length, 0, 1);
  return { distance: Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy)), t };
}

export function riverReach(river: readonly TilePoint[], x: number, y: number): { distance: number; along: number } {
  let best = { distance: Infinity, along: 0 };
  let travelled = 0;
  for (let index = 1; index < river.length; index++) {
    const a = river[index - 1]!;
    const b = river[index]!;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const near = segmentDistance(x, y, a, b);
    if (near.distance < best.distance) best = { distance: near.distance, along: travelled + near.t * length };
    travelled += length;
  }
  return best;
}

export function shapeRelief(input: ReliefInput): Relief {
  const size = WIDTH * HEIGHT;
  const sea = new Uint8Array(size);
  for (let index = 0; index < size; index++) sea[index] = input.land[index] ? 0 : 1;
  const coast = distanceField(WIDTH, HEIGHT, sea);
  const massif = distanceField(WIDTH, HEIGHT, input.massif);
  const blend = borderBlend();

  const shaped = new Float32Array(size);
  const beach = new Uint8Array(size);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const index = y * WIDTH + x;
      const shares = blend(x, y);
      if (shares.length === 0) continue;
      const probe: Probe = { x, y, coast: coast[index]!, massif: massif[index]!, macro: macroAt(x, y), headland: headlandAt(x, y) };
      let level = 0;
      for (const { region, weight } of shares) {
        const shaper = SHAPERS[region.code]!;
        const inland = clamp(shaper.inland(probe), region.relief[0], region.relief[1]);
        level += weight * (BEACH_LEVEL + (inland - BEACH_LEVEL) * smoothstep(0, shaper.ramp(probe), probe.coast));
      }
      shaped[index] = level;
      if (input.land[index] && probe.coast <= beachWidthAt(x, y) && level <= BEACH_BELOW) beach[index] = 1;
    }
  }
  for (const lake of input.lakes) {
    const reach = lake.r + LAKE_REACH;
    for (let y = Math.max(0, Math.floor(lake.y - reach)); y < Math.min(HEIGHT, Math.ceil(lake.y + reach)); y++) {
      for (let x = Math.max(0, Math.floor(lake.x - reach)); x < Math.min(WIDTH, Math.ceil(lake.x + reach)); x++) {
        const index = y * WIDTH + x;
        const weight = smoothstep(lake.r, reach, Math.hypot(x - lake.x, y - lake.y));
        shaped[index] = BEACH_LEVEL + (shaped[index]! - BEACH_LEVEL) * weight;
      }
    }
  }
  if (input.river.length > 1) {
    const xs = input.river.map((point) => point.x);
    const ys = input.river.map((point) => point.y);
    for (let y = Math.max(0, Math.min(...ys) - RIVER_REACH); y < Math.min(HEIGHT, Math.max(...ys) + RIVER_REACH); y++) {
      for (let x = Math.max(0, Math.min(...xs) - RIVER_REACH); x < Math.min(WIDTH, Math.max(...xs) + RIVER_REACH); x++) {
        const near = riverReach(input.river, x, y);
        if (near.distance >= RIVER_REACH) continue;
        const index = y * WIDTH + x;
        const bank = input.riverLevel(near.along) + 1;
        shaped[index] = bank + (shaped[index]! - bank) * smoothstep(RIVER_CORE, RIVER_REACH, near.distance);
      }
    }
  }

  const meanOver = (tiles: readonly TilePoint[]): number => tiles.reduce((total, tile) => total + shaped[tile.y * WIDTH + tile.x]!, 0) / Math.max(1, tiles.length);
  const flats: Flat[] = [];
  for (const place of PLACES) {
    const pad = padOf(place);
    const tiles: TilePoint[] = [];
    for (let y = pad.y; y < pad.y + pad.height; y++) for (let x = pad.x; x < pad.x + pad.width; x++) tiles.push({ x, y });
    flats.push({ target: Math.round(meanOver(tiles)), reach: PAD_REACH, left: pad.x - PAD_REACH, top: pad.y - PAD_REACH, right: pad.x + pad.width + PAD_REACH, bottom: pad.y + pad.height + PAD_REACH, distance: rectDistance(pad) });
  }
  for (const site of input.sites) {
    const tiles: TilePoint[] = [];
    for (let y = site.y; y < site.y + site.height; y++) for (let x = site.x; x < site.x + site.width; x++) tiles.push({ x, y });
    flats.push({ target: Math.round(meanOver(tiles)), reach: SITE_SPREAD, left: site.x - SITE_SPREAD, top: site.y - SITE_SPREAD, right: site.x + site.width + SITE_SPREAD, bottom: site.y + site.height + SITE_SPREAD, distance: rectDistance(site) });
  }
  for (const tiles of input.footprints) {
    if (tiles.length === 0) continue;
    const xs = tiles.map((tile) => tile.x);
    const ys = tiles.map((tile) => tile.y);
    flats.push({
      target: Math.round(meanOver(tiles)),
      reach: SITE_REACH,
      left: Math.min(...xs) - SITE_REACH,
      top: Math.min(...ys) - SITE_REACH,
      right: Math.max(...xs) + SITE_REACH + 1,
      bottom: Math.max(...ys) + SITE_REACH + 1,
      distance: (x, y) => tiles.reduce((best, tile) => Math.min(best, Math.hypot(x - tile.x, y - tile.y)), Infinity),
    });
  }
  const pull = new Float32Array(size);
  const sum = new Float32Array(size);
  const weightSum = new Float32Array(size);
  for (const flat of flats) {
    for (let y = Math.max(0, flat.top); y < Math.min(HEIGHT, flat.bottom); y++) {
      for (let x = Math.max(0, flat.left); x < Math.min(WIDTH, flat.right); x++) {
        const distance = flat.distance(x, y);
        if (distance >= flat.reach) continue;
        const index = y * WIDTH + x;
        const strength = 1 - smoothstep(0, flat.reach, distance);
        const weight = strength / ((distance + 1) * (distance + 1));
        pull[index] = Math.max(pull[index]!, strength);
        sum[index] = sum[index]! + weight * flat.target;
        weightSum[index] = weightSum[index]! + weight;
      }
    }
  }
  const field = new Float32Array(size);
  for (let index = 0; index < size; index++) {
    const strength = pull[index]!;
    if (strength === 0 || weightSum[index] === 0) {
      field[index] = shaped[index]!;
      continue;
    }
    const target = sum[index]! / weightSum[index]!;
    field[index] = target + (shaped[index]! - target) * (1 - strength);
  }
  for (let index = 0; index < size; index++) if (beach[index] && pull[index]! < 0.2) field[index] = BEACH_LEVEL;
  for (let index = 0; index < size; index++) if (pull[index]! >= 0.2) beach[index] = 0;

  const heights = new Uint8Array(size);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const shares = blend(x, y);
      if (shares.length === 0) continue;
      const index = y * WIDTH + x;
      const level = field[index]!;
      const calm = (1 - pull[index]!) * smoothstep(0, 3, level - BEACH_LEVEL);
      let hill = 0;
      if (calm > 0) {
        for (const { region, weight } of shares) {
          hill += weight * (SHAPERS[region.code]!.hills * calm * signed(contrastNoise(101 + REGIONS.indexOf(region) * 37, x / region.scale, y / region.scale, 2, 0.45, HILL_GAIN)));
        }
      }
      heights[index] = clamp(Math.round(level + hill), 0, 15);
    }
  }
  return { coast, heights, beach, steps: contourRises(heights) };
}

interface Share {
  readonly region: RegionSpec;
  readonly weight: number;
}

function borderBlend(): (x: number, y: number) => readonly Share[] {
  const codes = REGIONS.map((region) => region.code);
  const reach = REGIONS.map((region) => {
    const inside = new Uint8Array(WIDTH * HEIGHT);
    for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) if (codeAt(Math.floor(x / SQUARE), Math.floor(y / SQUARE)) === region.code) inside[y * WIDTH + x] = 1;
    return distanceField(WIDTH, HEIGHT, inside);
  });
  const alone = REGIONS.map((region) => [{ region, weight: 1 }]);
  return (x, y) => {
    const own = codes.indexOf(codeAt(Math.floor(x / SQUARE), Math.floor(y / SQUARE)));
    if (own < 0) return [];
    const index = y * WIDTH + x;
    const shares: Share[] = [];
    let others = 0;
    REGIONS.forEach((region, regionIndex) => {
      if (regionIndex === own) return;
      const weight = 0.5 * (1 - smoothstep(0, BORDER_BLEND, reach[regionIndex]![index]! - 0.5));
      if (weight <= 0) return;
      shares.push({ region, weight });
      others += weight;
    });
    if (shares.length === 0) return alone[own]!;
    const scale = others > 1 ? 1 / others : 1;
    return [{ region: REGIONS[own]!, weight: 1 - others * scale }, ...shares.map((share) => ({ region: share.region, weight: share.weight * scale }))];
  };
}

function contourRises(heights: Uint8Array): LandStep[] {
  const steps: LandStep[] = [];
  for (const region of REGIONS) {
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (let y = 0; y < HEIGHT; y += SQUARE) for (let x = 0; x < WIDTH; x += SQUARE) {
      if (codeAt(x / SQUARE, y / SQUARE) !== region.code) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + SQUARE);
      bottom = Math.max(bottom, y + SQUARE);
    }
    if (right < left) continue;
    const width = right - left;
    const height = bottom - top;
    const levels = new Int8Array(width * height).fill(-1);
    let highest = 0;
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
      if (codeAt(Math.floor(x / SQUARE), Math.floor(y / SQUARE)) !== region.code) continue;
      const level = heights[y * WIDTH + x]!;
      levels[(y - top) * width + (x - left)] = level;
      highest = Math.max(highest, level);
    }
    for (let level = 1; level <= highest; level++) {
      const loops = maskLoops(width, height, (x, y) => levels[y * width + x]! >= level);
      const points = joinLoops(loops.map((loop) => smoothLoop(loop, CONTOUR_TOLERANCE)), left, top);
      if (points.length < 3) continue;
      const shape: LandShape = { kind: 'polygon', points };
      steps.push({ kind: 'rise', shape, height: level });
    }
  }
  return steps;
}
