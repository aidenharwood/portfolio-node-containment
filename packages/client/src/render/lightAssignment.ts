import { MathUtils, type Vector3 } from 'three';

const SHADOW_FADE_START = 0.6;

export interface AssignableLight {
  readonly position: Vector3;
  readonly shadow: boolean;
}

export interface LightLimits {
  readonly shadowed: number;
  readonly field: number;
}

export interface LightAssignment<T> {
  readonly shadowed: readonly T[];
  readonly field: readonly T[];
  readonly edge: number;
  readonly shadowEdge: number;
}

export function assignLights<T extends AssignableLight>(lights: readonly T[], focus: Vector3, limits: LightLimits): LightAssignment<T> {
  const sorted = [...lights].sort((a, b) => a.position.distanceToSquared(focus) - b.position.distanceToSquared(focus));
  const casters = sorted.filter((light) => light.shadow);
  const shadowed = casters.slice(0, limits.shadowed);
  const nextCaster = casters[limits.shadowed];
  const field = sorted.filter((light) => !shadowed.includes(light)).slice(0, limits.field);
  const overflow = sorted.length > shadowed.length + field.length;
  const last = field[field.length - 1];
  return {
    shadowed,
    field,
    edge: overflow && last ? last.position.distanceTo(focus) : Infinity,
    shadowEdge: nextCaster ? nextCaster.position.distanceTo(focus) : Infinity,
  };
}

export const shadowStrength = (distance: number, shadowEdge: number): number => 1 - MathUtils.smoothstep(distance, shadowEdge * SHADOW_FADE_START, shadowEdge);
