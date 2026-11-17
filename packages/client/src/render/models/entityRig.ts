import type { PoseMotion } from './weaponPoses.ts';
import type { Group, Vector3 } from 'three';

export interface EntityPose {
  readonly moving: boolean;
  readonly walkPhase: number;
  readonly time: number;
  readonly attackProgress: number | null;
  readonly attackMotion?: PoseMotion | null;
  readonly hurtProgress: number | null;
  readonly dying?: number;
}

export interface EntityRig {
  readonly root: Group;
  readonly height: number;
  readonly airborne?: boolean;
  readonly accent?: number;
  animate(pose: EntityPose): void;
  muzzle?(out: Vector3): boolean;
  palette?(): readonly number[];
  readonly spirit?: boolean;
}

export const swingCurve = (progress: number | null): number => (progress === null ? 0 : Math.sin(Math.PI * Math.min(1, Math.max(0, progress))));
