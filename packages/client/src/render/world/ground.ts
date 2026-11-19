import { MAX_TERRAIN_HEIGHT, type TileLayout } from '@containment/shared';
import type { Vector3 } from 'three';
import { STEP_HEIGHT } from './worldScale.ts';

export const groundAt = (layout: TileLayout, x: number, y: number): number => layout.heightAt({ x: Math.round(x), y: Math.round(y) }) * STEP_HEIGHT;

const RAY_STEP = 0.1;
const REFINE_STEPS = 8;
const HIGHEST_GROUND = MAX_TERRAIN_HEIGHT * STEP_HEIGHT;

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
