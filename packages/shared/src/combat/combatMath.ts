import { deriveCombatProfile } from '../character/derivedStats.ts';
import type { SkillExperience, SkillId } from '../character/skills.ts';
import { equipmentStats, type EquipmentState } from '../gear/equipment.ts';
import type { ItemCatalog } from '../gear/items.ts';
import { chebyshevDistance, isCardinallyAdjacent, type TilePoint } from '../world/geometry.ts';
import type { CreatureDefinition } from './creatures.ts';
import { UNARMED, WEAPON_KIND_INFO, type CombatStyle, type WeaponKind, type WeaponProfile } from './weapons.ts';

export interface AttackProfile {
  readonly style: CombatStyle;
  readonly accuracy: number;
  readonly maxHit: number;
  readonly range: number;
  readonly speedTicks: number;
  readonly weapon?: WeaponKind;
}

export interface AttackOutcome {
  readonly hit: boolean;
  readonly damage: number;
}

export interface ExperienceAward {
  readonly skill: SkillId;
  readonly amount: number;
}

const MIN_HIT_CHANCE = 0.1;
const MAX_HIT_CHANCE = 0.95;
const RATING_FLOOR = 8;
const DEFENCE_WEIGHT = 0.9;
const RATING_PER_MAX_HIT = 4;
const STYLE_EXPERIENCE_PER_DAMAGE = 4;
const FORTITUDE_EXPERIENCE_PER_DAMAGE = 4 / 3;

export function weaponOf(equipment: EquipmentState, items: ItemCatalog): WeaponProfile {
  const primary = equipment.primary ? items.get(equipment.primary) : undefined;
  return primary?.equipment?.weapon ?? UNARMED;
}

export function playerAttackProfile(skills: SkillExperience, equipment: EquipmentState, items: ItemCatalog): AttackProfile {
  const weapon = weaponOf(equipment, items);
  const kind = WEAPON_KIND_INFO[weapon.kind];
  const profile = deriveCombatProfile(skills, equipmentStats(equipment, items));
  const accuracy = kind.style === 'melee' ? profile.meleeRating : profile.rangedRating;
  return {
    style: kind.style,
    accuracy,
    maxHit: 1 + Math.floor((accuracy * kind.damageScale) / RATING_PER_MAX_HIT),
    range: weapon.range,
    speedTicks: weapon.speedTicks,
    weapon: weapon.kind,
  };
}

export const creatureAttackProfile = (creature: CreatureDefinition): AttackProfile => ({ ...creature.attack });

export function hitChance(accuracy: number, defence: number): number {
  const attack = accuracy + RATING_FLOOR;
  const guard = (defence + RATING_FLOOR) * DEFENCE_WEIGHT;
  return Math.min(MAX_HIT_CHANCE, Math.max(MIN_HIT_CHANCE, attack / (attack + guard)));
}

export function rollAttack(attack: AttackProfile, defence: number, random: () => number): AttackOutcome {
  if (random() >= hitChance(attack.accuracy, defence)) return { hit: false, damage: 0 };
  return { hit: true, damage: 1 + Math.min(attack.maxHit - 1, Math.floor(random() * attack.maxHit)) };
}

export function isWithinAttackRange(
  attack: Pick<AttackProfile, 'style' | 'range'>,
  from: TilePoint,
  to: TilePoint,
  hasLineOfSight: (from: TilePoint, to: TilePoint) => boolean,
): boolean {
  if (attack.style === 'melee') return attack.range <= 1 ? isCardinallyAdjacent(from, to) : isWithinReach(attack.range, from, to, hasLineOfSight);
  const distance = chebyshevDistance(from, to);
  return distance >= 1 && distance <= attack.range && hasLineOfSight(from, to);
}

function isWithinReach(
  reach: number,
  from: TilePoint,
  to: TilePoint,
  hasLineOfSight: (from: TilePoint, to: TilePoint) => boolean,
): boolean {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  const inLine = (dx === 0) !== (dy === 0);
  return inLine && dx + dy <= reach && hasLineOfSight(from, to);
}

export function combatExperience(style: CombatStyle, damage: number): ExperienceAward[] {
  if (damage <= 0) return [];
  return [
    { skill: style === 'melee' ? 'closeQuarters' : 'marksmanship', amount: damage * STYLE_EXPERIENCE_PER_DAMAGE },
    { skill: 'fortitude', amount: Math.round(damage * FORTITUDE_EXPERIENCE_PER_DAMAGE) },
  ];
}

export function defeatExperience(style: CombatStyle, experience: number): ExperienceAward[] {
  if (experience <= 0) return [];
  return [
    { skill: style === 'melee' ? 'closeQuarters' : 'marksmanship', amount: experience },
    { skill: 'fortitude', amount: Math.round(experience / 3) },
  ];
}

const MIN_RESPAWN_FRACTION = 0.35;
const RESPAWN_SPEEDUP_PER_PLAYER = 0.15;

export function scaledRespawnTicks(baseTicks: number, population: number): number {
  const scaled = baseTicks / (1 + RESPAWN_SPEEDUP_PER_PLAYER * Math.max(0, population - 1));
  return Math.max(Math.ceil(baseTicks * MIN_RESPAWN_FRACTION), Math.round(scaled));
}

export const AGGRESSION_LEVEL_GAP = 4;

export const ignoresOutclassedPlayer = (creatureLevel: number, playerCombatLevel: number): boolean =>
  playerCombatLevel > creatureLevel + AGGRESSION_LEVEL_GAP;

export function relativeThreat(playerRating: number, creatureLevel: number): 'trivial' | 'even' | 'dangerous' {
  const gap = creatureLevel - playerRating;
  if (gap <= -3) return 'trivial';
  if (gap >= 3) return 'dangerous';
  return 'even';
}
