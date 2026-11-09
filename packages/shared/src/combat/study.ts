import { experienceForLevel } from '../character/skills.ts';
import { chebyshevDistance, type TilePoint } from '../world/geometry.ts';
import type { CreatureDefinition, CreatureId } from './creatures.ts';
import type { CombatStyle } from './weapons.ts';

export const STUDY_INTERACTION = 2;

export const STUDY_REACH = 4;

export const STUDY_TICKS = 6;

export const EXPLOITED_DEFENCE_FACTOR = 0.7;

const FIRST_STUDY_BASE_EXPERIENCE = 60;
const FIRST_STUDY_LEVEL_SHARE = 1.5;
const REPEAT_STUDY_SHARE = 0.1;

export const studiedFlag = (creatureId: CreatureId): string => `studied:${creatureId}`;

export const STUDIED_FLAG_PREFIX = 'studied:';

export const studiedCreaturesOf = (flags: readonly string[]): CreatureId[] =>
  flags.filter((flag) => flag.startsWith(STUDIED_FLAG_PREFIX)).map((flag) => flag.slice(STUDIED_FLAG_PREFIX.length));

export function studyBlocker(creature: CreatureDefinition, analysis: number): string | null {
  if (analysis < creature.level) return `You need Analysis ${creature.level} to study ${creature.name}. Analysis is your Research level plus Insight.`;
  return null;
}

export const isWithinStudyReach = (from: TilePoint, to: TilePoint, hasSightline: (from: TilePoint, to: TilePoint) => boolean): boolean =>
  chebyshevDistance(from, to) <= STUDY_REACH && hasSightline(from, to);

export function studyExperience(creature: CreatureDefinition, firstStudy: boolean): number {
  const levelStep = experienceForLevel(creature.level + 1) - experienceForLevel(creature.level);
  const discovery = FIRST_STUDY_BASE_EXPERIENCE + Math.round(levelStep * FIRST_STUDY_LEVEL_SHARE);
  return firstStudy ? discovery : Math.max(1, Math.round(discovery * REPEAT_STUDY_SHARE));
}

export const exploitsWeakness = (creature: CreatureDefinition, style: CombatStyle, studied: boolean): boolean =>
  studied && creature.weakness === style;

export const effectiveDefence = (creature: CreatureDefinition, style: CombatStyle, studied: boolean): number =>
  exploitsWeakness(creature, style, studied) ? Math.floor(creature.defence * EXPLOITED_DEFENCE_FACTOR) : creature.defence;
