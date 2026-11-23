import { roundExperience } from '../character/skills.ts';
import { chebyshevDistance, type TilePoint } from '../world/geometry.ts';
import { killValue } from './combatMath.ts';
import type { CreatureDefinition, CreatureId } from './creatures.ts';
import { COMBAT_STYLE_INFO, styleBeating, type CombatStyle } from './weapons.ts';

export const STUDY_INTERACTION = 2;

export const STUDY_REACH = 4;

export const STUDY_TICKS = 6;

export const REPEAT_STUDY_COOLDOWN_TICKS = 100;

export const EXPLOITED_DEFENCE_FACTOR = 0.7;

export const FIRST_STUDY_KILL_SHARE = 5;
export const REPEAT_STUDY_SHARE = 0.15;

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
  const discovery = killValue(creature) * FIRST_STUDY_KILL_SHARE;
  return roundExperience(Math.max(0.1, firstStudy ? discovery : discovery * REPEAT_STUDY_SHARE));
}

export const GUARD_STRONG_FACTOR = 1.15;

export const GUARD_WEAK_FACTOR = 0.8;

export function weaknessOf(creature: CreatureDefinition): CombatStyle | null {
  if (!creature.guard) return null;
  const own = (Object.keys(COMBAT_STYLE_INFO) as CombatStyle[]).find((style) => COMBAT_STYLE_INFO[style].line === creature.guard);
  return own ? styleBeating(own) : null;
}

export function guardFactor(creature: CreatureDefinition, style: CombatStyle): number {
  if (!creature.guard) return 1;
  if (weaknessOf(creature) === style) return GUARD_WEAK_FACTOR;
  if (creature.guard === 'warden' && style === 'melee') return 1;
  return GUARD_STRONG_FACTOR;
}

export const exploitsWeakness = (creature: CreatureDefinition, style: CombatStyle, studied: boolean): boolean =>
  studied && weaknessOf(creature) === style;

export function creatureDefence(creature: CreatureDefinition, style: CombatStyle, studied: boolean): number {
  const guarded = Math.round(creature.defence * guardFactor(creature, style));
  return exploitsWeakness(creature, style, studied) ? Math.floor(guarded * EXPLOITED_DEFENCE_FACTOR) : guarded;
}
