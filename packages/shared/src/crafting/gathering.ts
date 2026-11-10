import type { SkillId } from '../character/skills.ts';
import type { ItemId } from '../ids.ts';
import { TIER_LEVEL_FLOORS, tierForLevel } from './tiers.ts';

export interface GatheringSource {
  readonly skill: SkillId;
  readonly level: number;
  readonly itemId: ItemId;
  readonly experience: number;
  readonly attemptTicks: number;
  readonly charges: number;
  readonly respawnTicks: number;
  readonly progressVerb: string;
}

export const MAX_GATHER_CHANCE = 0.95;

export const MIN_DEPLETION_CHANCE = 0.15;

export function gatherChance(source: GatheringSource, level: number): number {
  if (level < source.level) return 0;
  return Math.min(MAX_GATHER_CHANCE, 0.5 + (level - source.level) * 0.04);
}

export function depletionChance(source: GatheringSource): number {
  const steps = TIER_LEVEL_FLOORS.length - 1;
  const tier = Math.min(tierForLevel(source.level), TIER_LEVEL_FLOORS.length);
  return MIN_DEPLETION_CHANCE + ((1 - MIN_DEPLETION_CHANCE) * (tier - 1)) / steps;
}
