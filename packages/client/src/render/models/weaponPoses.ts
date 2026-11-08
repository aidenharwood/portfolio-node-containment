import { GAME_CONTENT, WEAPON_KIND_INFO, type AttackMotion, type ItemId, type WeaponKind } from '@containment/shared';

export interface ArmPose {
  readonly rightX: number;
  readonly rightZ: number;
  readonly leftX: number;
  readonly leftZ: number;
  readonly lean: number;
  readonly twist: number;
  readonly lunge: number;
}

export const REST_POSE: ArmPose = { rightX: 0, rightZ: 0, leftX: 0, leftZ: 0, lean: 0, twist: 0, lunge: 0 };

const MAUL_GRIP: ArmPose = { ...REST_POSE, rightX: -0.35, rightZ: -0.25, leftX: -0.5, leftZ: 0.45 };
const POLEARM_GRIP: ArmPose = { ...REST_POSE, rightX: -0.25, rightZ: -0.1, leftX: -0.6, leftZ: 0.35 };
const LONG_GUN_GRIP: ArmPose = { ...REST_POSE, rightX: -0.12, rightZ: -0.05, leftX: -0.7, leftZ: 0.45 };

export function heldWeaponOf(gear: readonly ItemId[]): WeaponKind | null {
  for (const itemId of gear) {
    const equipment = GAME_CONTENT.items.get(itemId)?.equipment;
    if (equipment?.slot === 'primary' && equipment.weapon) return equipment.weapon.kind;
  }
  return null;
}

export function gripFor(weapon: WeaponKind | null): ArmPose {
  if (!weapon) return REST_POSE;
  const info = WEAPON_KIND_INFO[weapon];
  if (info.grip === 'oneHanded') return REST_POSE;
  if (info.style === 'ranged') return LONG_GUN_GRIP;
  return weapon === 'polearm' ? POLEARM_GRIP : MAUL_GRIP;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const ease = (value: number): number => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

const windUpThenStrike = (progress: number, peak: number): number =>
  progress < peak ? ease(progress / peak) : 1 - ease((progress - peak) / (1 - peak));

const pulse = (progress: number, at: number, width: number): number => Math.exp(-(((progress - at) / width) ** 2));

const aimHold = (progress: number, raise: number): number => Math.min(clamp01(progress / raise), clamp01((1 - progress) / 0.2));

export function attackPose(motion: AttackMotion, progress: number): ArmPose {
  const arc = Math.sin(Math.PI * clamp01(progress));
  switch (motion) {
    case 'jab':
      return { ...REST_POSE, rightX: -1.3 * arc, twist: 0.2 * arc };
    case 'stab':
      return { ...REST_POSE, rightX: -1.35 * arc, twist: -0.3 * arc, lunge: 0.05 * arc };
    case 'strike':
      return { ...REST_POSE, rightX: -2.1 * arc, lean: 0.18 * arc };
    case 'slash': {
      const sweep = ease(progress);
      return { ...REST_POSE, rightX: -1.3 * arc, rightZ: (0.9 - 1.9 * sweep) * arc, twist: (-0.3 + 0.7 * sweep) * arc };
    }
    case 'slam': {
      const raised = windUpThenStrike(progress, 0.55);
      const impact = progress > 0.55 ? pulse(progress, 0.72, 0.14) : 0;
      return { ...REST_POSE, rightX: -2.5 * raised + 0.25 * impact, leftX: -2.3 * raised + 0.25 * impact, lean: -0.12 * raised + 0.3 * impact };
    }
    case 'lunge':
      return { ...REST_POSE, rightX: -0.15 * arc, leftX: -0.1 * arc, lean: 0.2 * arc, lunge: 0.16 * arc };
    case 'snapShot': {
      const kick = pulse(progress, 0.35, 0.08);
      return { ...REST_POSE, rightX: -0.2 * aimHold(progress, 0.2) - 0.3 * kick, lean: -0.05 * kick };
    }
    case 'shoulderShot': {
      const aim = aimHold(progress, 0.25);
      const kick = pulse(progress, 0.4, 0.08);
      return { ...REST_POSE, rightX: -0.05 * aim - 0.22 * kick, leftX: -0.05 * aim - 0.18 * kick, lean: -0.08 * kick };
    }
    case 'heavyShot': {
      const aim = aimHold(progress, 0.35);
      const kick = pulse(progress, 0.55, 0.1);
      return { ...REST_POSE, rightX: -0.05 * aim - 0.32 * kick, leftX: -0.05 * aim - 0.28 * kick, lean: -0.16 * kick, lunge: -0.04 * kick };
    }
    case 'blast': {
      const aim = aimHold(progress, 0.2);
      const kick = pulse(progress, 0.32, 0.1);
      return { ...REST_POSE, rightX: -0.05 * aim - 0.42 * kick, leftX: -0.05 * aim - 0.38 * kick, lean: -0.22 * kick, lunge: -0.07 * kick };
    }
  }
}
