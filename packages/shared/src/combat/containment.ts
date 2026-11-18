import { levelForExperience, type SkillExperience } from '../character/skills.ts';
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

export const CONTAINMENT_THRESHOLD_PER_RESEARCH_LEVEL = 0.01;

export const MAX_CONTAINMENT_THRESHOLD = 0.25;

export const CONTAINMENT_EXPERIENCE_PER_INTEGRITY = 12;

export const containmentExperience = (creature: CreatureDefinition): number => creature.integrity * CONTAINMENT_EXPERIENCE_PER_INTEGRITY;

export const containmentLevelFor = (creature: CreatureDefinition): number => creature.containment?.requiredLevel ?? creature.level;

export const containmentResearchEdge = (creature: CreatureDefinition, skills: SkillExperience): number =>
  Math.max(0, levelForExperience(skills.research) - containmentLevelFor(creature));

export const containmentThresholdFraction = (researchEdge = 0): number =>
  Math.min(MAX_CONTAINMENT_THRESHOLD, CONTAINMENT_THRESHOLD + Math.max(0, researchEdge) * CONTAINMENT_THRESHOLD_PER_RESEARCH_LEVEL);

export const containmentThreshold = (maxIntegrity: number, researchEdge = 0): number =>
  Math.max(1, Math.floor(maxIntegrity * containmentThresholdFraction(researchEdge)));

export const containmentThresholdFor = (creature: CreatureDefinition, skills: SkillExperience): number =>
  containmentThreshold(creature.integrity, containmentResearchEdge(creature, skills));

export const isWeakenedForContainment = (integrity: number, maxIntegrity: number, researchEdge = 0): boolean =>
  integrity > 0 && integrity <= containmentThreshold(maxIntegrity, researchEdge);

export const isWeakenedFor = (creature: CreatureDefinition, integrity: number, skills: SkillExperience): boolean =>
  isWeakenedForContainment(integrity, creature.integrity, containmentResearchEdge(creature, skills));

export function isWithinContainmentReach(
  from: TilePoint,
  to: { readonly position: TilePoint; readonly size: number },
  hasSightline: (from: TilePoint, to: TilePoint) => boolean,
): boolean {
  const nearest = nearestFootprintTile(to.position, to.size, from);
  return chebyshevDistance(from, nearest) <= CONTAINMENT_REACH && hasSightline(from, nearest);
}

export function containmentReadiness(creature: CreatureDefinition, skills: SkillExperience): string | null {
  if (!isContainable(creature)) return `${creature.name} cannot be contained.`;
  const required = containmentLevelFor(creature);
  if (levelForExperience(skills.containment) < required) return `You need Containment level ${required} to contain ${creature.name}.`;
  return null;
}

export function containmentBlocker(creature: CreatureDefinition, integrity: number, skills: SkillExperience): string | null {
  const readiness = containmentReadiness(creature, skills);
  if (readiness) return readiness;
  if (!isWeakenedFor(creature, integrity, skills)) {
    return `${creature.name} is too strong to contain. Wear it down to ${containmentThresholdFor(creature, skills)} integrity first.`;
  }
  return null;
}

export const CONTAIN_INTERACTION = 1;
