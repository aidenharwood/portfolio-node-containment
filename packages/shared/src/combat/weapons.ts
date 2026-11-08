export type CombatStyle = 'melee' | 'ranged';

export type WeaponGrip = 'oneHanded' | 'twoHanded';

export const WEAPON_KINDS = ['unarmed', 'knife', 'baton', 'blade', 'maul', 'polearm', 'pistol', 'carbine', 'rifle', 'scattergun'] as const;

export type WeaponKind = (typeof WEAPON_KINDS)[number];

export type HeldWeaponKind = Exclude<WeaponKind, 'unarmed'>;

export type AttackMotion = 'jab' | 'stab' | 'strike' | 'slash' | 'slam' | 'lunge' | 'snapShot' | 'shoulderShot' | 'heavyShot' | 'blast';

export type ProjectileKind = 'dart' | 'bolt' | 'tracer' | 'pellets' | 'spit';

export interface WeaponKindInfo {
  readonly name: string;
  readonly style: CombatStyle;
  readonly grip: WeaponGrip;
  readonly motion: AttackMotion;
  readonly projectile: ProjectileKind | null;
  readonly damageScale: number;
}

export const WEAPON_KIND_INFO: Readonly<Record<WeaponKind, WeaponKindInfo>> = {
  unarmed: { name: 'Unarmed', style: 'melee', grip: 'oneHanded', motion: 'jab', projectile: null, damageScale: 1 },
  knife: { name: 'Knife', style: 'melee', grip: 'oneHanded', motion: 'stab', projectile: null, damageScale: 0.75 },
  baton: { name: 'Baton', style: 'melee', grip: 'oneHanded', motion: 'strike', projectile: null, damageScale: 1 },
  blade: { name: 'Blade', style: 'melee', grip: 'oneHanded', motion: 'slash', projectile: null, damageScale: 1 },
  maul: { name: 'Maul', style: 'melee', grip: 'twoHanded', motion: 'slam', projectile: null, damageScale: 1 },
  polearm: { name: 'Polearm', style: 'melee', grip: 'twoHanded', motion: 'lunge', projectile: null, damageScale: 0.9 },
  pistol: { name: 'Pistol', style: 'ranged', grip: 'oneHanded', motion: 'snapShot', projectile: 'dart', damageScale: 1 },
  carbine: { name: 'Carbine', style: 'ranged', grip: 'twoHanded', motion: 'shoulderShot', projectile: 'bolt', damageScale: 1 },
  rifle: { name: 'Rifle', style: 'ranged', grip: 'twoHanded', motion: 'heavyShot', projectile: 'tracer', damageScale: 1.35 },
  scattergun: { name: 'Scattergun', style: 'ranged', grip: 'twoHanded', motion: 'blast', projectile: 'pellets', damageScale: 1.15 },
};

export interface WeaponProfile {
  readonly kind: WeaponKind;
  readonly range: number;
  readonly speedTicks: number;
}

export const UNARMED: WeaponProfile = { kind: 'unarmed', range: 1, speedTicks: 4 };

export const weaponStyle = (weapon: WeaponProfile): CombatStyle => WEAPON_KIND_INFO[weapon.kind].style;

export const isTwoHandedWeapon = (weapon: WeaponProfile | undefined): boolean =>
  weapon !== undefined && WEAPON_KIND_INFO[weapon.kind].grip === 'twoHanded';

export function attackPace(speedTicks: number): 'Fast' | 'Quick' | 'Steady' | 'Slow' {
  if (speedTicks <= 3) return 'Fast';
  if (speedTicks === 4) return 'Quick';
  if (speedTicks === 5) return 'Steady';
  return 'Slow';
}
