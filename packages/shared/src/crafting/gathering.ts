import type { SkillId } from '../character/skills.ts';
import type { ItemId } from '../ids.ts';

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

export function gatherChance(source: GatheringSource, level: number): number {
  if (level < source.level) return 0;
  return Math.min(MAX_GATHER_CHANCE, 0.5 + (level - source.level) * 0.04);
}
