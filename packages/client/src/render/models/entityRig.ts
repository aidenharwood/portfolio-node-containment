import type { Group } from 'three';

export interface EntityPose {
  readonly moving: boolean;
  readonly walkPhase: number;
  readonly time: number;
  readonly attackProgress: number | null;
  readonly hurtProgress: number | null;
}

export interface EntityRig {
  readonly root: Group;
  readonly height: number;
  animate(pose: EntityPose): void;
}

export const swingCurve = (progress: number | null): number => (progress === null ? 0 : Math.sin(Math.PI * Math.min(1, Math.max(0, progress))));
