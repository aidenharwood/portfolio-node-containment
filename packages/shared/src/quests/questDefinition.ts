import type { AreaId, ItemId, NpcId, QuestId, WorldObjectId, DistrictId } from '../ids.ts';
import type { CreatureId } from '../combat/creatures.ts';
import type { GameEffect } from '../rules/effects.ts';

export type QuestObjective =
  | { readonly type: 'talkTo'; readonly npcId: NpcId; readonly label: string }
  | { readonly type: 'enterArea'; readonly districtId: DistrictId; readonly areaId: AreaId; readonly label: string }
  | { readonly type: 'obtainItem'; readonly itemId: ItemId; readonly count: number; readonly label: string }
  | { readonly type: 'equipItem'; readonly itemId: ItemId; readonly label: string }
  | { readonly type: 'interactWith'; readonly objectId: WorldObjectId; readonly count?: number; readonly label: string }
  | { readonly type: 'signal'; readonly signal: string; readonly label: string; readonly npcId?: NpcId }
  | { readonly type: 'defeat'; readonly creatureId: CreatureId; readonly count: number; readonly label: string }
  | { readonly type: 'contain'; readonly creatureId: CreatureId; readonly count: number; readonly label: string }
  | { readonly type: 'useItem'; readonly itemId: ItemId; readonly label: string }
  | { readonly type: 'gather'; readonly itemId: ItemId; readonly count: number; readonly label: string }
  | { readonly type: 'craft'; readonly itemId: ItemId; readonly count: number; readonly label: string };

export interface QuestStepDefinition {
  readonly id: string;
  readonly journal: string;
  readonly objectives: readonly QuestObjective[];
  readonly onComplete?: readonly GameEffect[];
}

export type QuestCategory = 'tutorial' | 'main' | 'side';

export interface QuestDefinition {
  readonly id: QuestId;
  readonly name: string;
  readonly category: QuestCategory;
  readonly summary: string;
  readonly steps: readonly QuestStepDefinition[];
  readonly rewards: readonly GameEffect[];
  readonly rewardSummary: readonly string[];
  readonly followUpQuestId?: QuestId;
  readonly offeredBy?: NpcId;
  readonly offerRequires?: readonly QuestId[];
  readonly recommendedLevel?: number;
}

export const objectiveGoal = (objective: QuestObjective): number => {
  switch (objective.type) {
    case 'obtainItem':
      return objective.count;
    case 'interactWith':
      return objective.count ?? 1;
    case 'defeat':
    case 'contain':
    case 'gather':
    case 'craft':
      return objective.count;
    default:
      return 1;
  }
};
