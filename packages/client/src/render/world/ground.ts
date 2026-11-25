import { MAX_TERRAIN_HEIGHT, TILE_KINDS, type TileKindId, type TileLayout } from '@containment/shared';
import type { Vector3 } from 'three';
import { STEP_HEIGHT, STEP_VOXELS, TILE_RESOLUTION, ZONE_VOXEL_SIZE } from './worldScale.ts';

const R = TILE_RESOLUTION;

export const SLOPED: ReadonlySet<TileKindId> = new Set<TileKindId>(['grass', 'dirt', 'gravel', 'soil']);
export const SLOPE_REACH = STEP_VOXELS / 2;
const SMOOTH_REACH = 2;

const AROUND: readonly (readonly [number, number])[] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

const baseOf = (layout: TileLayout, x: number, y: number): number => layout.heightAt({ x, y }) * STEP_VOXELS;

function leansToward(kind: TileKindId, height: number, base: number): boolean {
  if (SLOPED.has(kind)) return true;
  if (kind === 'water') return height < base;
  return kind !== 'door' && kind !== 'track' && TILE_KINDS[kind].walkable;
}

const levels = (kind: TileKindId): boolean => SLOPED.has(kind) || (kind !== 'door' && TILE_KINDS[kind].walkable);

const CENTRES = new WeakMap<TileLayout, Float32Array>();

function centreOf(layout: TileLayout, tx: number, ty: number): number {
  const kept = tx >= 0 && ty >= 0 && tx < layout.width && ty < layout.height;
  let centres: Float32Array | undefined;
  if (kept) {
    centres = CENTRES.get(layout);
    if (!centres) {
      centres = new Float32Array(layout.width * layout.height).fill(Number.NaN);
      CENTRES.set(layout, centres);
    }
    const known = centres[ty * layout.width + tx] as number;
    if (!Number.isNaN(known)) return known;
  }
  const base = baseOf(layout, tx, ty);
  let total = 0;
  let weight = 0;
  for (let dy = -SMOOTH_REACH; dy <= SMOOTH_REACH; dy++) {
    for (let dx = -SMOOTH_REACH; dx <= SMOOTH_REACH; dx++) {
      const height = baseOf(layout, tx + dx, ty + dy);
      if (Math.abs(height - base) > STEP_VOXELS || !levels(layout.tileAt({ x: tx + dx, y: ty + dy }))) continue;
      const share = (SMOOTH_REACH + 1 - Math.abs(dx)) * (SMOOTH_REACH + 1 - Math.abs(dy));
      total += share * height;
      weight += share;
    }
  }
  const centre = weight > 0 ? total / weight : base;
  if (centres) centres[ty * layout.width + tx] = centre;
  return centre;
}

function slopeHeights(layout: TileLayout, tx: number, ty: number): number[] | null {
  if (!SLOPED.has(layout.tileAt({ x: tx, y: ty }))) return null;
  const base = baseOf(layout, tx, ty);
  const centre = centreOf(layout, tx, ty);
  const heights = [centre, centre, centre, centre, centre, centre, centre, centre, centre];
  let uneven = centre !== base;
  for (const [dx, dy] of AROUND) {
    const kind = layout.tileAt({ x: tx + dx, y: ty + dy });
    const height = baseOf(layout, tx + dx, ty + dy);
    if (Math.abs(height - base) > STEP_VOXELS || !leansToward(kind, height, base)) continue;
    const lean = SLOPED.has(kind) ? centreOf(layout, tx + dx, ty + dy) : height;
    heights[(dy + 1) * 3 + dx + 1] = lean;
    if (lean !== base) uneven = true;
  }
  return uneven ? heights : null;
}

function offsetIn(heights: readonly number[], base: number, lx: number, lz: number): number {
  const u = (lx + 0.5) / R - 0.5;
  const v = (lz + 0.5) / R - 0.5;
  const sx = u < 0 ? -1 : 1;
  const sz = v < 0 ? -1 : 1;
  const fx = Math.abs(u);
  const fz = Math.abs(v);
  const at = (dx: number, dy: number): number => heights[(dy + 1) * 3 + dx + 1] as number;
  const height = (1 - fx) * (1 - fz) * at(0, 0) + fx * (1 - fz) * at(sx, 0) + (1 - fx) * fz * at(0, sz) + fx * fz * at(sx, sz);
  return Math.max(-SLOPE_REACH, Math.min(SLOPE_REACH, Math.round(height - base)));
}

export function slopeOffsets(layout: TileLayout, tx: number, ty: number): Int8Array | null {
  const heights = slopeHeights(layout, tx, ty);
  if (!heights) return null;
  const base = baseOf(layout, tx, ty);
  const offsets = new Int8Array(R * R);
  let moved = false;
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const offset = offsetIn(heights, base, lx, lz);
      offsets[lz * R + lx] = offset;
      if (offset !== 0) moved = true;
    }
  }
  return moved ? offsets : null;
}

export function slopeHeadroom(layout: TileLayout, tx: number, ty: number): number {
  const offsets = slopeOffsets(layout, tx, ty);
  return offsets ? Math.max(0, ...offsets) : 0;
}

export function groundAt(layout: TileLayout, x: number, y: number): number {
  const tx = Math.round(x);
  const ty = Math.round(y);
  const ground = layout.heightAt({ x: tx, y: ty }) * STEP_HEIGHT;
  const heights = slopeHeights(layout, tx, ty);
  if (!heights) return ground;
  const lx = Math.max(0, Math.min(R - 1, Math.floor((x - tx + 0.5) * R)));
  const lz = Math.max(0, Math.min(R - 1, Math.floor((y - ty + 0.5) * R)));
  return ground + offsetIn(heights, baseOf(layout, tx, ty), lx, lz) * ZONE_VOXEL_SIZE;
}

const RAY_STEP = 0.1;
const REFINE_STEPS = 8;
const HIGHEST_GROUND = MAX_TERRAIN_HEIGHT * STEP_HEIGHT + SLOPE_REACH * ZONE_VOXEL_SIZE;

export function rayGround(layout: TileLayout, origin: Vector3, direction: Vector3, out: Vector3): Vector3 | null {
  if (direction.y > -1e-6) return null;
  const pointAt = (t: number): Vector3 => out.copy(direction).multiplyScalar(t).add(origin);
  const below = (t: number): boolean => {
    const point = pointAt(t);
    return point.y <= groundAt(layout, point.x, point.z);
  };
  const start = Math.max(0, (origin.y - HIGHEST_GROUND) / -direction.y);
  const end = origin.y / -direction.y;
  let previous = start;
  for (let t = start; t < end; t += RAY_STEP) {
    if (below(t)) {
      let low = previous;
      let high = t;
      for (let step = 0; step < REFINE_STEPS; step++) {
        const middle = (low + high) / 2;
        if (below(middle)) high = middle;
        else low = middle;
      }
      return pointAt(high);
    }
    previous = t;
  }
  return pointAt(end);
}
