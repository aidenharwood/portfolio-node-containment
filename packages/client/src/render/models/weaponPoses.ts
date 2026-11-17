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
  maul: pose({ rightX: -0.55, rightZ: -0.35, leftX: -0.8, leftZ: 0.55, twist: 0.15, weaponX: -1.0 }),
  polearm: pose({ rightX: -0.75, rightZ: -0.2, leftX: -1.0, leftZ: 0.6, twist: 0.3, level: 1, aim: -0.08 }),
  pistol: pose({ rightX: -0.35, rightZ: 0.05, weaponX: 0.4 }),
  carbine: pose({ rightX: -0.6, rightZ: -0.75, leftX: -0.7, leftZ: 0.7, level: 1, aim: 0.4 }),
  rifle: pose({ rightX: -0.6, rightZ: -0.75, leftX: -0.7, leftZ: 0.7, level: 1, aim: 0.4 }),
  scattergun: pose({ rightX: -0.6, rightZ: -0.75, leftX: -0.7, leftZ: 0.7, level: 1, aim: 0.4 }),
  focus: pose({ rightX: -0.45, rightZ: 0.05, weaponX: 0.25 }),
  resonator: pose({ rightX: -0.7, rightZ: -0.25, leftX: -0.7, leftZ: 0.25, level: 1, aim: -0.15 }),
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

type Ease = 'in' | 'out' | 'smooth';

type Keyframe = readonly [number, Partial<ArmPose>, Ease?];

const EASES: Readonly<Record<Ease, (t: number) => number>> = { in: (t) => t ** 3, out: (t) => 1 - (1 - t) ** 3, smooth: (t) => t * t * (3 - 2 * t) };

function track(frames: readonly Keyframe[], progress: number): ArmPose {
  const t = Math.min(1, Math.max(0, progress));
  let index = 0;
  while (index < frames.length - 2 && t > frames[index + 1]![0]) index++;
  const [startAt, from] = frames[index]!;
  const [endAt, to, ease] = frames[index + 1]!;
  const blend = EASES[ease ?? 'smooth'](endAt > startAt ? Math.min(1, Math.max(0, (t - startAt) / (endAt - startAt))) : 1);
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

const shouldered: Partial<ArmPose> = { rightX: -0.5, rightZ: -0.1, leftX: -0.5, aim: -0.4 };

const focusRaised: Partial<ArmPose> = { rightX: -1.3, rightZ: -0.05, twist: -0.2, level: 1, weaponX: 0.3 };
const latticeHeld: Partial<ArmPose> = { rightX: -1.1, leftX: -1.1, rightZ: -0.1, leftZ: 0.1, level: 1 };

const strikeContact: Partial<ArmPose> = { rightX: -0.75, rightZ: -0.05, weaponX: 2.4, lean: 0.22, twist: -0.25 };
const slashContact: Partial<ArmPose> = { rightX: -0.7, rightZ: -0.5, weaponX: 1.8, twist: -0.4, lean: 0.12 };
const slamContact: Partial<ArmPose> = { rightX: -0.4, rightZ: 0.15, leftX: -0.25, leftZ: -0.1, weaponX: 2.3, lean: 0.28, lunge: 0.05, twist: -0.1 };
const stabContact: Partial<ArmPose> = { rightX: -1.1, rightZ: -0.1, twist: -0.4, lunge: 0.09, weaponX: 1.15 };
const lungeContact: Partial<ArmPose> = { rightX: -0.55, leftX: -0.45, lunge: 0.22, lean: 0.2, twist: -0.12 };

const ATTACKS: Readonly<Record<AttackMotion, readonly Keyframe[]>> = {
  channel: [
    [0, {}],
    [0.25, { ...focusRaised, lean: -0.06 }],
    [0.42, { ...focusRaised, lean: -0.06, rightX: -1.4 }],
    [0.5, { ...focusRaised, rightX: -1.55, lean: 0.08, lunge: 0.03 }, 'in'],
    [0.8, focusRaised, 'out'],
    [1, {}],
  ],
  invoke: [
    [0, {}],
    [0.28, { ...latticeHeld, rightX: -1.6, leftX: -1.6, lean: -0.14 }],
    [0.42, { ...latticeHeld, rightX: -1.7, leftX: -1.7, lean: -0.16 }],
    [0.5, { ...latticeHeld, lean: 0.2, lunge: 0.06 }, 'in'],
    [0.8, latticeHeld, 'out'],
    [1, {}],
  ],
  jab: [
    [0, {}],
    [0.15, { rightX: 0.2, twist: 0.15 }],
    [0.35, { rightX: -1.35, twist: -0.35, lunge: 0.06, leftX: -0.45 }, 'in'],
    [1, {}, 'out'],
  ],
  stab: [
    [0, {}],
    [0.2, { rightX: 0.25, rightZ: 0.15, twist: 0.25, weaponX: -0.2 }],
    [0.4, stabContact, 'in'],
    [0.48, stabContact],
    [1, {}, 'out'],
  ],
  strike: [
    [0, {}],
    [0.3, { rightX: -2.55, rightZ: 0.2, weaponX: 0.9, lean: -0.1, twist: 0.15 }],
    [0.45, strikeContact, 'in'],
    [0.53, strikeContact],
    [1, {}, 'out'],
  ],
  slash: [
    [0, {}],
    [0.3, { rightX: -1.9, rightZ: 1.0, weaponX: 0.2, twist: 0.55, lean: -0.05 }],
    [0.4, { ...slashContact, rightZ: 0.4, weaponX: 1.8, twist: 0.2 }, 'in'],
    [0.45, slashContact],
    [0.53, slashContact],
    [1, {}, 'out'],
  ],
  slam: [
    [0, {}],
    [0.35, { rightX: -2.0, rightZ: 0.25, leftX: -1.8, leftZ: -0.2, weaponX: 0.3, lean: -0.18, twist: -0.1 }],
    [0.5, slamContact, 'in'],
    [0.58, slamContact],
    [1, {}, 'out'],
  ],
  lunge: [
    [0, {}],
    [0.22, { rightX: 0.3, leftX: 0.25, lunge: -0.06, twist: 0.1 }],
    [0.45, lungeContact, 'in'],
    [0.53, lungeContact],
    [1, {}, 'out'],
  ],
  snapShot: [
    [0, {}],
    [0.2, pistolAimed],
    [0.3, pistolAimed, 'in'],
    [0.36, pistolKick, 'out'],
    [0.5, pistolAimed],
    [0.8, pistolAimed],
    [1, {}],
  ],
  shoulderShot: [
    [0, {}],
    [0.22, shouldered],
    [0.32, shouldered, 'in'],
    [0.38, { ...shouldered, aim: -0.62, rightX: -0.4, leftX: -0.4, lean: -0.07, lunge: -0.03 }, 'out'],
    [0.52, shouldered],
    [0.82, shouldered],
    [1, {}],
  ],
  heavyShot: [
    [0, {}],
    [0.25, { ...shouldered, lean: 0.05 }],
    [0.36, { ...shouldered, lean: 0.05 }],
    [0.42, { ...shouldered, lean: 0.05 }, 'in'],
    [0.48, { ...shouldered, aim: -0.85, rightX: -0.35, leftX: -0.35, lean: -0.16, lunge: -0.05 }, 'out'],
    [0.66, shouldered],
    [0.88, shouldered],
    [1, {}],
  ],
  blast: [
    [0, {}],
    [0.18, shouldered],
    [0.3, shouldered, 'in'],
    [0.36, { ...shouldered, aim: -0.9, rightX: -0.25, leftX: -0.3, lean: -0.22, lunge: -0.08 }, 'out'],
    [0.5, shouldered],
    [0.6, { ...shouldered, leftX: -0.1, leftZ: -0.15 }],
    [0.72, shouldered],
    [1, {}],
  ],
};

export const attackKeyTimes = (motion: AttackMotion): readonly number[] => ATTACKS[motion].map(([time]) => time);

export const attackPose = (motion: AttackMotion, progress: number): ArmPose => track(ATTACKS[motion], progress);

export type PoseMotion = AttackMotion | 'work';

export const WORK_MS = 450;

export const WORK_CONTACT = 0.45;

export const LOWERED_GRIP: ArmPose = pose({ rightX: -0.2, leftX: -0.1, weaponX: -1.2 });

const WORK: readonly Keyframe[] = [
  [0, {}],
  [0.3, { rightX: -2.2, leftX: -2.0, leftZ: -0.3, lean: -0.12 }],
  [WORK_CONTACT, { rightX: -0.6, leftX: -0.5, leftZ: -0.2, lean: 0.25 }, 'in'],
  [0.53, { rightX: -0.6, leftX: -0.5, leftZ: -0.2, lean: 0.25 }],
  [1, {}, 'out'],
];

export const workPose = (progress: number): ArmPose => track(WORK, progress);
