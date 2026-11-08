import { GAME_CONTENT, WEAPON_KIND_INFO, type AttackMotion, type ItemId, type WeaponKind } from '@containment/shared';

export interface ArmPose {
  readonly rightX: number;
  readonly rightZ: number;
  readonly leftX: number;
  readonly leftZ: number;
  readonly lean: number;
  readonly twist: number;
  readonly lunge: number;
  readonly weaponX: number;
  readonly aim: number;
  readonly level: number;
}

type PoseKey = keyof ArmPose;

const POSE_KEYS: readonly PoseKey[] = ['rightX', 'rightZ', 'leftX', 'leftZ', 'lean', 'twist', 'lunge', 'weaponX', 'aim', 'level'];

export const REST_POSE: ArmPose = { rightX: 0, rightZ: 0, leftX: 0, leftZ: 0, lean: 0, twist: 0, lunge: 0, weaponX: 0, aim: 0, level: 0 };

const pose = (fields: Partial<ArmPose>): ArmPose => ({ ...REST_POSE, ...fields });

const GRIPS: Readonly<Record<WeaponKind, ArmPose>> = {
  unarmed: pose({ rightX: -0.15, leftX: -0.15 }),
  knife: pose({ rightX: -0.4, rightZ: 0.08, leftX: -0.25, weaponX: 0.15 }),
  baton: pose({ rightX: -0.35, rightZ: 0.06, weaponX: -0.95 }),
  blade: pose({ rightX: -0.45, rightZ: 0.12, leftX: -0.15, weaponX: -0.75 }),
  maul: pose({ rightX: -0.55, rightZ: -0.3, leftX: -0.8, leftZ: 0.55, twist: 0.15, weaponX: -1.6 }),
  polearm: pose({ rightX: -0.75, rightZ: -0.2, leftX: -1.0, leftZ: 0.6, twist: 0.3, level: 1, aim: -0.08 }),
  pistol: pose({ rightX: -0.35, rightZ: 0.05, weaponX: 0.4 }),
  carbine: pose({ rightX: -0.75, rightZ: -0.2, leftX: -1.0, leftZ: 0.6, twist: 0.3, level: 1, aim: 0.4 }),
  rifle: pose({ rightX: -0.75, rightZ: -0.2, leftX: -1.0, leftZ: 0.6, twist: 0.3, level: 1, aim: 0.45 }),
  scattergun: pose({ rightX: -0.75, rightZ: -0.2, leftX: -1.0, leftZ: 0.6, twist: 0.3, level: 1, aim: 0.4 }),
};

export function heldWeaponOf(gear: readonly ItemId[]): WeaponKind | null {
  for (const itemId of gear) {
    const equipment = GAME_CONTENT.items.get(itemId)?.equipment;
    if (equipment?.slot === 'primary' && equipment.weapon) return equipment.weapon.kind;
  }
  return null;
}

export const gripFor = (weapon: WeaponKind | null): ArmPose => GRIPS[weapon ?? 'unarmed'];

export const motionFor = (weapon: WeaponKind | null): AttackMotion => WEAPON_KIND_INFO[weapon ?? 'unarmed'].motion;

export function combinePoses(base: ArmPose, delta: ArmPose): ArmPose {
  const combined: Record<PoseKey, number> = { ...base };
  for (const key of POSE_KEYS) combined[key] = base[key] + delta[key];
  return { ...combined, level: Math.min(1, Math.max(0, combined.level)) };
}

type Keyframe = readonly [number, Partial<ArmPose>];

const smooth = (t: number): number => t * t * (3 - 2 * t);

function track(frames: readonly Keyframe[], progress: number): ArmPose {
  const t = Math.min(1, Math.max(0, progress));
  let index = 0;
  while (index < frames.length - 2 && t > frames[index + 1]![0]) index++;
  const [startAt, from] = frames[index]!;
  const [endAt, to] = frames[index + 1]!;
  const blend = smooth(endAt > startAt ? Math.min(1, Math.max(0, (t - startAt) / (endAt - startAt))) : 1);
  const result: Record<PoseKey, number> = { ...REST_POSE };
  for (const key of POSE_KEYS) {
    const a = from[key] ?? 0;
    const b = to[key] ?? 0;
    result[key] = a + (b - a) * blend;
  }
  return result;
}

const pistolAimed: Partial<ArmPose> = { rightX: -1.2, rightZ: -0.12, twist: -0.3, level: 1, leftX: 0.1 };
const pistolKick: Partial<ArmPose> = { ...pistolAimed, rightX: -1.35, aim: -0.45, lean: -0.04 };

const shouldered: Partial<ArmPose> = { rightX: -0.45, leftX: -0.45, aim: -0.4 };

const ATTACKS: Readonly<Record<AttackMotion, readonly Keyframe[]>> = {
  jab: [
    [0, {}],
    [0.15, { rightX: 0.2, twist: 0.15 }],
    [0.4, { rightX: -1.35, twist: -0.35, lunge: 0.06, leftX: -0.45 }],
    [1, {}],
  ],
  stab: [
    [0, {}],
    [0.2, { rightX: 0.25, rightZ: 0.15, twist: 0.25, weaponX: -0.2 }],
    [0.45, { rightX: -1.1, rightZ: -0.1, twist: -0.4, lunge: 0.09, weaponX: 1.15 }],
    [0.6, { rightX: -1.0, rightZ: -0.1, twist: -0.35, lunge: 0.08, weaponX: 1.05 }],
    [1, {}],
  ],
  strike: [
    [0, {}],
    [0.38, { rightX: -2.55, rightZ: 0.2, weaponX: -0.55, lean: -0.1, twist: 0.15 }],
    [0.58, { rightX: -0.55, rightZ: -0.05, weaponX: 0.55, lean: 0.22, twist: -0.25 }],
    [0.7, { rightX: -0.5, weaponX: 0.5, lean: 0.18, twist: -0.2 }],
    [1, {}],
  ],
  slash: [
    [0, {}],
    [0.35, { rightX: -2.1, rightZ: 0.85, weaponX: -0.35, twist: 0.45, lean: -0.05 }],
    [0.58, { rightX: -0.75, rightZ: -0.7, weaponX: 0.55, twist: -0.5, lean: 0.14 }],
    [0.7, { rightX: -0.6, rightZ: -0.75, weaponX: 0.5, twist: -0.45, lean: 0.1 }],
    [1, {}],
  ],
  slam: [
    [0, {}],
    [0.45, { rightX: -2.0, rightZ: 0.25, leftX: -1.8, leftZ: -0.2, weaponX: 0.6, lean: -0.18, twist: -0.1 }],
    [0.62, { rightX: -0.4, rightZ: 0.15, leftX: -0.25, leftZ: -0.1, weaponX: 2.9, lean: 0.38, lunge: 0.06, twist: -0.1 }],
    [0.8, { rightX: -0.35, leftX: -0.2, weaponX: 2.8, lean: 0.3, lunge: 0.05 }],
    [1, {}],
  ],
  lunge: [
    [0, {}],
    [0.22, { rightX: 0.3, leftX: 0.25, lunge: -0.06, twist: 0.1 }],
    [0.48, { rightX: -0.55, leftX: -0.45, lunge: 0.22, lean: 0.2, twist: -0.12 }],
    [0.62, { rightX: -0.5, leftX: -0.4, lunge: 0.2, lean: 0.18, twist: -0.1 }],
    [1, {}],
  ],
  snapShot: [
    [0, {}],
    [0.22, pistolAimed],
    [0.32, pistolKick],
    [0.48, pistolAimed],
    [0.8, pistolAimed],
    [1, {}],
  ],
  shoulderShot: [
    [0, {}],
    [0.22, shouldered],
    [0.34, { ...shouldered, aim: -0.62, rightX: -0.4, leftX: -0.4, lean: -0.07, lunge: -0.03 }],
    [0.5, shouldered],
    [0.82, shouldered],
    [1, {}],
  ],
  heavyShot: [
    [0, {}],
    [0.3, { ...shouldered, lean: 0.05 }],
    [0.45, { ...shouldered, lean: 0.05 }],
    [0.56, { ...shouldered, aim: -0.85, rightX: -0.35, leftX: -0.35, lean: -0.16, lunge: -0.05 }],
    [0.75, shouldered],
    [0.88, shouldered],
    [1, {}],
  ],
  blast: [
    [0, {}],
    [0.18, shouldered],
    [0.3, { ...shouldered, aim: -0.9, rightX: -0.25, leftX: -0.3, lean: -0.22, lunge: -0.08 }],
    [0.48, shouldered],
    [0.6, { ...shouldered, leftX: -0.1, leftZ: -0.15 }],
    [0.72, shouldered],
    [1, {}],
  ],
};

export const attackPose = (motion: AttackMotion, progress: number): ArmPose => track(ATTACKS[motion], progress);
