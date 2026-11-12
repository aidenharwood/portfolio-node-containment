import type { Vector3 } from 'three';

export interface AssignableLight {
  readonly position: Vector3;
}

export interface LightAssignment<T> {
  readonly lights: readonly T[];
  readonly edge: number;
}

export function assignLights<T extends AssignableLight>(lights: readonly T[], focus: Vector3, limit: number): LightAssignment<T> {
  const sorted = [...lights].sort((a, b) => a.position.distanceToSquared(focus) - b.position.distanceToSquared(focus));
  const nearest = sorted.slice(0, limit);
  const last = nearest[nearest.length - 1];
  return { lights: nearest, edge: sorted.length > limit && last ? last.position.distanceTo(focus) : Infinity };
}
