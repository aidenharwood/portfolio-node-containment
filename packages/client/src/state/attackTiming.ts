import type { AttackMotion } from '@containment/shared';

export const DEFAULT_ATTACK_MS = 380;

export const CREATURE_CONTACT = 0.45;

export const ATTACK_DURATION_MS: Readonly<Record<AttackMotion, number>> = {
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
  channel: 460,
  invoke: 620,
};

export const ATTACK_CONTACT: Readonly<Record<AttackMotion, number>> = {
  jab: 0.35,
  stab: 0.4,
  strike: 0.45,
  slash: 0.45,
  slam: 0.5,
  lunge: 0.45,
  snapShot: 0.3,
  shoulderShot: 0.32,
  heavyShot: 0.42,
  blast: 0.3,
  channel: 0.5,
  invoke: 0.5,
};

export const attackDurationMs = (motion: AttackMotion | null | undefined): number => (motion ? ATTACK_DURATION_MS[motion] : DEFAULT_ATTACK_MS);

export const attackContactMs = (motion: AttackMotion | null | undefined): number => (motion ? ATTACK_CONTACT[motion] * ATTACK_DURATION_MS[motion] : CREATURE_CONTACT * DEFAULT_ATTACK_MS);
