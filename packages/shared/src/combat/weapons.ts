import type { SkillId } from '../character/skills.ts';
import type { GearMotif } from '../gear/items.ts';
import type { StatId } from '../gear/stats.ts';

export const COMBAT_STYLES = ['melee', 'ranged', 'psionic'] as const;

export type CombatStyle = (typeof COMBAT_STYLES)[number];

export interface CombatStyleInfo {
  readonly name: string;
  readonly skill: SkillId;
  readonly offenceStat: Extract<StatId, 'power' | 'accuracy' | 'focus'>;
  readonly defenceStat: Extract<StatId, 'armor' | 'deflection' | 'cognitiveWard'>;
  readonly beats: CombatStyle;
  readonly line: GearMotif;
}

export const COMBAT_STYLE_INFO: Readonly<Record<CombatStyle, CombatStyleInfo>> = {
  melee: { name: 'Melee', skill: 'closeQuarters', offenceStat: 'power', defenceStat: 'armor', beats: 'ranged', line: 'bulwark' },
  ranged: { name: 'Ranged', skill: 'marksmanship', offenceStat: 'accuracy', defenceStat: 'deflection', beats: 'psionic', line: 'skirmisher' },
  psionic: { name: 'Psionic', skill: 'psionics', offenceStat: 'focus', defenceStat: 'cognitiveWard', beats: 'melee', line: 'warden' },
};

export const isCombatStyle = (value: string): value is CombatStyle => (COMBAT_STYLES as readonly string[]).includes(value);

export const styleBeating = (style: CombatStyle): CombatStyle =>
  COMBAT_STYLES.find((other) => COMBAT_STYLE_INFO[other].beats === style) ?? style;

export const styleOfLine = (line: GearMotif): CombatStyle =>
  COMBAT_STYLES.find((style) => COMBAT_STYLE_INFO[style].line === line) ?? 'melee';

export type WeaponGrip = 'oneHanded' | 'twoHanded';

export const WEAPON_KINDS = ['unarmed', 'knife', 'baton', 'blade', 'maul', 'polearm', 'pistol', 'carbine', 'rifle', 'scattergun', 'focus', 'resonator'] as const;

export type WeaponKind = (typeof WEAPON_KINDS)[number];

export type HeldWeaponKind = Exclude<WeaponKind, 'unarmed'>;

export type AttackMotion = 'jab' | 'stab' | 'strike' | 'slash' | 'slam' | 'lunge' | 'snapShot' | 'shoulderShot' | 'heavyShot' | 'blast' | 'channel' | 'invoke';

export type ProjectileKind = 'dart' | 'bolt' | 'tracer' | 'pellets' | 'spit' | 'pulse' | 'wave';

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
  focus: { name: 'Focus', style: 'psionic', grip: 'oneHanded', motion: 'channel', projectile: 'pulse', damageScale: 1 },
  resonator: { name: 'Resonator', style: 'psionic', grip: 'twoHanded', motion: 'invoke', projectile: 'wave', damageScale: 1.3 },
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
