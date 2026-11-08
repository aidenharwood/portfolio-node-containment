import type { AttackMotion } from '@containment/shared';
import type { Group } from 'three';

export interface EntityPose {
  readonly moving: boolean;
  readonly walkPhase: number;
  readonly time: number;
  readonly attackProgress: number | null;
  readonly attackMotion?: AttackMotion | null;
  readonly hurtProgress: number | null;
}

export interface EntityRig {
  readonly root: Group;
  readonly height: number;
  animate(pose: EntityPose): void;
}

export const swingCurve = (progress: number | null): number => (progress === null ? 0 : Math.sin(Math.PI * Math.min(1, Math.max(0, progress))));

const DEFAULT_ATTACK_MS = 380;

const ATTACK_DURATION_MS: Readonly<Record<AttackMotion, number>> = {
  jab: 300,
  stab: 260,
  strike: 380,
  slash: 420,
  slam: 600,
  lunge: 440,
  snapShot: 340,
  shoulderShot: 400,
  heavyShot: 560,
  blast: 480,
};

export const attackDurationMs = (motion: AttackMotion | null | undefined): number => (motion ? ATTACK_DURATION_MS[motion] : DEFAULT_ATTACK_MS);
