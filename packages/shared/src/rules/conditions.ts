import { combatLevel, levelForExperience, type SkillExperience, type SkillId } from '../character/skills.ts';
import type { ItemId, QuestId } from '../ids.ts';

export type Condition =
  | { readonly type: 'hasItem'; readonly itemId: ItemId; readonly count?: number }
  | { readonly type: 'lacksItem'; readonly itemId: ItemId }
  | { readonly type: 'questNotStarted'; readonly questId: QuestId }
  | { readonly type: 'questActive'; readonly questId: QuestId; readonly stepId?: string }
  | { readonly type: 'questCompleted'; readonly questId: QuestId }
  | { readonly type: 'hasFlag'; readonly flag: string }
  | { readonly type: 'lacksFlag'; readonly flag: string }
  | { readonly type: 'skillLevel'; readonly skill: SkillId; readonly atLeast: number }
  | { readonly type: 'combatLevel'; readonly atLeast: number };

export type QuestStanding =
  | { readonly status: 'notStarted' }
  | { readonly status: 'active'; readonly stepId: string }
  | { readonly status: 'completed' };

export interface ConditionContext {
  countItem(itemId: ItemId): number;
  questStanding(questId: QuestId): QuestStanding;
  hasFlag(flag: string): boolean;
  readonly skills: SkillExperience;
}

export function isConditionMet(condition: Condition, context: ConditionContext): boolean {
  switch (condition.type) {
    case 'hasItem':
      return context.countItem(condition.itemId) >= (condition.count ?? 1);
    case 'lacksItem':
      return context.countItem(condition.itemId) === 0;
    case 'questNotStarted':
      return context.questStanding(condition.questId).status === 'notStarted';
    case 'questActive': {
      const standing = context.questStanding(condition.questId);
      return standing.status === 'active' && (condition.stepId === undefined || standing.stepId === condition.stepId);
    }
    case 'questCompleted':
      return context.questStanding(condition.questId).status === 'completed';
    case 'hasFlag':
      return context.hasFlag(condition.flag);
    case 'lacksFlag':
      return !context.hasFlag(condition.flag);
    case 'skillLevel':
      return levelForExperience(context.skills[condition.skill]) >= condition.atLeast;
    case 'combatLevel':
      return combatLevel(context.skills) >= condition.atLeast;
  }
}

export const areConditionsMet = (conditions: readonly Condition[] | undefined, context: ConditionContext): boolean =>
  (conditions ?? []).every((condition) => isConditionMet(condition, context));
