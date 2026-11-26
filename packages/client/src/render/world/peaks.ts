import type { TileKindId, TileLayout } from '@containment/shared';
import { noise3 } from '../voxel/palette.ts';
import { TILE_RESOLUTION } from './worldScale.ts';

const R = TILE_RESOLUTION;
export const PEAK_MAX = 64;
const REACH_TO = 10;
const RELIEF_FROM = 3;
const RELIEF_FULL = 9;
const RIDGE_FROM = 0.4;
const LEDGE = 8;
const LEDGE_SHARE = 0.4;
const DIAGONAL = Math.SQRT2;

export interface PeakField {
  readonly width: number;
  readonly height: number;
  tileRise(tx: number, ty: number): number;
  columnRise(vx: number, vz: number): number;
  isLedge(vx: number, vz: number): boolean;
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

function valueNoise(x: number, z: number, scale: number, salt: number): number {
  const gx = Math.floor(x / scale);
  const gz = Math.floor(z / scale);
  const fx = smooth(x / scale - gx);
  const fz = smooth(z / scale - gz);
  const top = noise3(gx, 0, gz, salt) * (1 - fx) + noise3(gx + 1, 0, gz, salt) * fx;
  const bottom = noise3(gx, 0, gz + 1, salt) * (1 - fx) + noise3(gx + 1, 0, gz + 1, salt) * fx;
  return top * (1 - fz) + bottom * fz;
}

export function ridgeAt(tx: number, ty: number): number {
  const broad = 1 - Math.abs(2 * valueNoise(tx, ty, 21, 907) - 1);
  const fine = 1 - Math.abs(2 * valueNoise(tx, ty, 8, 911) - 1);
  return Math.min(1, broad * broad * 0.75 + fine * 0.35);
}

const isMountain = (kind: TileKindId): boolean => kind === 'rock';

const SIDES = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;

interface Reach {
  readonly distance: Float32Array;
  readonly foot: Float32Array;
}

function footOf(layout: TileLayout, mountain: Uint8Array): Float32Array {
  const { width, height } = layout;
  const foot = new Float32Array(width * height).fill(-1);
  const queue = new Int32Array(width * height);
  let tail = 0;
  const inside = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < width && y < height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = y * width + x;
      if (!mountain[at]) continue;
      let highest = -1;
      for (const [dx, dy] of SIDES) if (inside(x + dx, y + dy) && !mountain[at + dy * width + dx]) highest = Math.max(highest, layout.heightAt({ x: x + dx, y: y + dy }));
      if (highest < 0) continue;
      foot[at] = highest;
      queue[tail++] = at;
    }
  }
  for (let head = 0; head < tail; head++) {
    const at = queue[head] as number;
    const x = at % width;
    const y = (at - x) / width;
    for (const [dx, dy] of SIDES) {
      const near = at + dy * width + dx;
      if (!inside(x + dx, y + dy) || !mountain[near] || (foot[near] as number) >= 0) continue;
      foot[near] = foot[at] as number;
      queue[tail++] = near;
    }
  }
  return foot;
}

function reachOf(layout: TileLayout): Reach {
  const { width, height } = layout;
  const distance = new Float32Array(width * height);
  const mountain = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      mountain[y * width + x] = isMountain(layout.tileAt({ x, y })) ? 1 : 0;
      distance[y * width + x] = mountain[y * width + x] ? Infinity : 0;
    }
  }
  const relax = (at: number, from: number, step: number): void => {
    const through = (distance[from] as number) + step;
    if (through < (distance[at] as number)) distance[at] = through;
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = y * width + x;
      if (distance[at] === 0) continue;
      if (x > 0) relax(at, at - 1, 1);
      if (y > 0) {
        relax(at, at - width, 1);
        if (x > 0) relax(at, at - width - 1, DIAGONAL);
        if (x + 1 < width) relax(at, at - width + 1, DIAGONAL);
      }
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const at = y * width + x;
      if (distance[at] === 0) continue;
      if (x + 1 < width) relax(at, at + 1, 1);
      if (y + 1 < height) {
        relax(at, at + width, 1);
        if (x + 1 < width) relax(at, at + width + 1, DIAGONAL);
        if (x > 0) relax(at, at + width - 1, DIAGONAL);
      }
    }
  }
  return { distance, foot: footOf(layout, mountain) };
}

export function peakRise(distance: number, ridge: number, relief = RELIEF_FULL): number {
  if (distance <= 0) return 0;
  const reach = smooth(Math.min(1, distance / REACH_TO));
  const crest = Math.max(0, (ridge - RIDGE_FROM) / (1 - RIDGE_FROM));
  const lift = smooth(Math.min(1, Math.max(0, (relief - RELIEF_FROM) / (RELIEF_FULL - RELIEF_FROM))));
  return PEAK_MAX * reach * lift * crest ** 1.2;
}

function terraced(rise: number): number {
  const band = Math.floor(rise / LEDGE);
  const within = (rise - band * LEDGE) / LEDGE;
  return Math.floor(band * LEDGE + Math.min(1, within / (1 - LEDGE_SHARE)) * LEDGE);
}

const FIELDS = new WeakMap<TileLayout, PeakField>();

export function peakFieldOf(layout: TileLayout): PeakField {
  const known = FIELDS.get(layout);
  if (known) return known;
  const { width, height } = layout;
  let rises: Float32Array | null = null;
  const risesOf = (): Float32Array => {
    if (rises) return rises;
    const { distance, foot } = reachOf(layout);
    const built = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const at = y * width + x;
        const reach = distance[at] as number;
        if (reach > 0) built[at] = peakRise(reach, ridgeAt(x, y), layout.heightAt({ x, y }) - Math.max(0, foot[at] as number));
      }
    }
    rises = built;
    return built;
  };
  const centre = (tx: number, ty: number): number => (tx < 0 || ty < 0 || tx >= width || ty >= height ? 0 : (risesOf()[ty * width + tx] as number));
  const smoothRise = (vx: number, vz: number): number => {
    const u = (vx + 0.5) / R - 0.5;
    const v = (vz + 0.5) / R - 0.5;
    const tx = Math.floor(u);
    const ty = Math.floor(v);
    const fx = u - tx;
    const fz = v - ty;
    const a = centre(tx, ty);
    const b = centre(tx + 1, ty);
    const c = centre(tx, ty + 1);
    const d = centre(tx + 1, ty + 1);
    return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
  };
  const field: PeakField = {
    width,
    height,
    tileRise: (tx, ty) => {
      let most = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) most = Math.max(most, centre(tx + dx, ty + dy));
      return Math.ceil(most);
    },
    columnRise: (vx, vz) => {
      if (!isMountain(layout.tileAt({ x: Math.floor(vx / R), y: Math.floor(vz / R) }))) return 0;
      return terraced(smoothRise(vx, vz));
    },
    isLedge: (vx, vz) => {
      const rise = smoothRise(vx, vz);
      const within = (rise - Math.floor(rise / LEDGE) * LEDGE) / LEDGE;
      return rise >= 1 && within >= 1 - LEDGE_SHARE;
    },
  };
  FIELDS.set(layout, field);
  return field;
}

export function centreRise(layout: TileLayout, tx: number, ty: number): number {
  return Math.round(peakFieldOf(layout).columnRise(tx * R + R / 2, ty * R + R / 2));
}
