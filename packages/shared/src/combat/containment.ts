import { levelForExperience, type SkillExperience } from '../character/skills.ts';
import { TIER_LEVEL_FLOORS, tierForLevel } from '../crafting/tiers.ts';
import { nearestFootprintTile } from '../world/footprint.ts';
import { chebyshevDistance, type TilePoint } from '../world/geometry.ts';
import type { ContainmentClass, CreatureDefinition } from './creatures.ts';

export const CONTAINMENT_THRESHOLD = 0.1;

export const CONTAINMENT_REACH = 2;

export interface ContainmentClassInfo {
  readonly name: string;
  readonly summary: string;
}

export const CONTAINMENT_CLASS_INFO: Readonly<Record<ContainmentClass, ContainmentClassInfo>> = {
  safe: { name: 'Safe', summary: 'Reliably contained when procedures are followed.' },
  euclid: { name: 'Euclid', summary: 'Contained, but not well understood. Expect deviations.' },
  keter: { name: 'Keter', summary: 'Resists containment. Every successful re-housing is provisional.' },
};

export const isContainable = (creature: CreatureDefinition): boolean => creature.containment !== undefined;

export const containmentThreshold = (maxIntegrity: number): number => Math.max(1, Math.floor(maxIntegrity * CONTAINMENT_THRESHOLD));

export const isWeakenedForContainment = (integrity: number, maxIntegrity: number): boolean =>
  integrity > 0 && integrity <= containmentThreshold(maxIntegrity);

export const containmentLevelFor = (creature: CreatureDefinition): number => creature.containment?.requiredLevel ?? creature.level;

export const clearanceTierFor = (creature: CreatureDefinition): number => tierForLevel(containmentLevelFor(creature));

export function isWithinContainmentReach(
  from: TilePoint,
  to: { readonly position: TilePoint; readonly size: number },
  hasSightline: (from: TilePoint, to: TilePoint) => boolean,
): boolean {
  const nearest = nearestFootprintTile(to.position, to.size, from);
  return chebyshevDistance(from, nearest) <= CONTAINMENT_REACH && hasSightline(from, nearest);
}

export const CLEARANCE_TIERS = TIER_LEVEL_FLOORS.length;

const CLEARANCE_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'] as const;

export const clearanceFlag = (tier: number): string => `containment-clearance-${tier}`;

export const clearanceName = (tier: number): string => `Clearance ${CLEARANCE_NUMERALS[tier - 1] ?? tier}`;

export const clearancePrice = (tier: number): number => 25 * tier * tier;

export const clearanceLevelFor = (tier: number): number => TIER_LEVEL_FLOORS[tier - 1] ?? 1;

export function clearanceTierOf(flags: readonly string[]): number {
  let tier = 0;
  while (tier < CLEARANCE_TIERS && flags.includes(clearanceFlag(tier + 1))) tier += 1;
  return tier;
}

export function nextClearanceTier(flags: readonly string[]): number | null {
  const tier = clearanceTierOf(flags) + 1;
  return tier <= CLEARANCE_TIERS ? tier : null;
}

export function clearanceRefusal(flags: readonly string[], skills: SkillExperience, scrip: number): string | null {
  const tier = nextClearanceTier(flags);
  if (tier === null) return 'You already hold the highest containment clearance.';
  const level = clearanceLevelFor(tier);
  if (levelForExperience(skills.containment) < level) return `${clearanceName(tier)} requires Containment level ${level}.`;
  const price = clearancePrice(tier);
  if (scrip < price) return `${clearanceName(tier)} costs ${price} scrip.`;
  return null;
}

export function containmentReadiness(creature: CreatureDefinition, skills: SkillExperience, clearance: number): string | null {
  if (!isContainable(creature)) return `${creature.name} cannot be contained.`;
  const required = containmentLevelFor(creature);
  if (levelForExperience(skills.containment) < required) return `You need Containment level ${required} to contain ${creature.name}.`;
  const tier = clearanceTierFor(creature);
  if (clearance < tier) return `You need containment ${clearanceName(tier)} to contain ${creature.name}. The Registrar in the Intake Wing issues it.`;
  return null;
}

export function containmentBlocker(creature: CreatureDefinition, integrity: number, skills: SkillExperience, clearance: number): string | null {
  const readiness = containmentReadiness(creature, skills, clearance);
  if (readiness) return readiness;
  if (!isWeakenedForContainment(integrity, creature.integrity)) {
    return `${creature.name} is too strong to contain. Wear it down to ${containmentThreshold(creature.integrity)} integrity first.`;
  }
  return null;
}

export const CONTAIN_INTERACTION = 1;
