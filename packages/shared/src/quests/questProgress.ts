import type { CreatureId } from '../combat/creatures.ts';
import type { AreaId, ItemId, NpcId, QuestId, WorldObjectId, DistrictId } from '../ids.ts';
import type { QuestStanding } from '../rules/conditions.ts';
import { objectiveGoal, type QuestDefinition, type QuestObjective, type QuestStepDefinition } from './questDefinition.ts';

export interface QuestProgress {
  readonly questId: QuestId;
  readonly status: 'active' | 'completed';
  readonly stepIndex: number;
  readonly objectiveProgress: readonly number[];
}

export type QuestLog = Readonly<Record<QuestId, QuestProgress>>;

export type QuestEvent =
  | { readonly type: 'talkedTo'; readonly npcId: NpcId }
  | { readonly type: 'enteredArea'; readonly districtId: DistrictId; readonly areaId: AreaId }
  | { readonly type: 'interactedWith'; readonly objectId: WorldObjectId }
  | { readonly type: 'signal'; readonly signal: string }
  | { readonly type: 'loadoutChanged' }
  | { readonly type: 'defeated'; readonly creatureId: CreatureId }
  | { readonly type: 'contained'; readonly creatureId: CreatureId }
  | { readonly type: 'usedItem'; readonly itemId: ItemId }
  | { readonly type: 'gathered'; readonly itemId: ItemId; readonly count: number }
  | { readonly type: 'crafted'; readonly itemId: ItemId; readonly count: number };

export interface QuestStateProbe {
  countItem(itemId: ItemId): number;
  isEquipped(itemId: ItemId): boolean;
}

export interface QuestAdvance {
  readonly progress: QuestProgress;
  readonly completedSteps: readonly QuestStepDefinition[];
  readonly questCompleted: boolean;
}

function progressFromEvent(objective: QuestObjective, current: number, event: QuestEvent): number {
  switch (objective.type) {
    case 'talkTo':
      return event.type === 'talkedTo' && event.npcId === objective.npcId ? current + 1 : current;
    case 'enterArea':
      return event.type === 'enteredArea' && event.districtId === objective.districtId && event.areaId === objective.areaId
        ? current + 1
        : current;
    case 'interactWith':
      return event.type === 'interactedWith' && event.objectId === objective.objectId ? current + 1 : current;
    case 'signal':
      return event.type === 'signal' && event.signal === objective.signal ? current + 1 : current;
    case 'defeat':
      return event.type === 'defeated' && event.creatureId === objective.creatureId ? current + 1 : current;
    case 'contain':
      return event.type === 'contained' && event.creatureId === objective.creatureId ? current + 1 : current;
    case 'useItem':
      return event.type === 'usedItem' && event.itemId === objective.itemId ? current + 1 : current;
    case 'gather':
      return event.type === 'gathered' && event.itemId === objective.itemId ? current + event.count : current;
    case 'craft':
      return event.type === 'crafted' && event.itemId === objective.itemId ? current + event.count : current;
    case 'obtainItem':
    case 'equipItem':
      return current;
  }
}

function progressFromState(objective: QuestObjective, current: number, probe: QuestStateProbe): number {
  switch (objective.type) {
    case 'obtainItem':
      return probe.countItem(objective.itemId);
    case 'equipItem':
      return probe.isEquipped(objective.itemId) ? 1 : 0;
    default:
      return current;
  }
}

const freshCounts = (step: QuestStepDefinition | undefined): number[] => step?.objectives.map(() => 0) ?? [];

export function startQuest(definition: QuestDefinition, probe: QuestStateProbe): QuestAdvance {
  const progress: QuestProgress = {
    questId: definition.id,
    status: 'active',
    stepIndex: 0,
    objectiveProgress: freshCounts(definition.steps[0]),
  };
  return advanceQuest(definition, progress, null, probe);
}

export function awaitsContainment(log: QuestLog, quests: ReadonlyMap<QuestId, QuestDefinition>, creatureId: CreatureId): boolean {
  return Object.values(log).some((progress) => {
    if (progress.status !== 'active') return false;
    const step = quests.get(progress.questId)?.steps[progress.stepIndex];
    return (
      step?.objectives.some(
        (objective, index) => objective.type === 'contain' && objective.creatureId === creatureId && (progress.objectiveProgress[index] ?? 0) < objective.count,
      ) ?? false
    );
  });
}

export function advanceQuest(
  definition: QuestDefinition,
  progress: QuestProgress,
  event: QuestEvent | null,
  probe: QuestStateProbe,
): QuestAdvance {
  if (progress.status === 'completed') return { progress, completedSteps: [], questCompleted: false };

  const completedSteps: QuestStepDefinition[] = [];
  let stepIndex = progress.stepIndex;
  let counts: number[] = [...progress.objectiveProgress];
  let pendingEvent = event;

  for (let step = definition.steps[stepIndex]; step; step = definition.steps[stepIndex]) {
    const eventForStep = pendingEvent;
    counts = step.objectives.map((objective, index) => {
      const current = counts[index] ?? 0;
      const afterEvent = eventForStep ? progressFromEvent(objective, current, eventForStep) : current;
      return Math.min(objectiveGoal(objective), progressFromState(objective, afterEvent, probe));
    });
    pendingEvent = null;

    const stepDone = step.objectives.every((objective, index) => (counts[index] ?? 0) >= objectiveGoal(objective));
    if (!stepDone) break;

    completedSteps.push(step);
    stepIndex++;
    counts = freshCounts(definition.steps[stepIndex]);
  }

  const questCompleted = stepIndex >= definition.steps.length;
  return {
    progress: {
      questId: definition.id,
      status: questCompleted ? 'completed' : 'active',
      stepIndex: Math.min(stepIndex, definition.steps.length - 1),
      objectiveProgress: questCompleted ? [] : counts,
    },
    completedSteps,
    questCompleted,
  };
}

export function questStanding(log: QuestLog, definition: QuestDefinition | undefined, questId: QuestId): QuestStanding {
  const progress = log[questId];
  if (!progress) return { status: 'notStarted' };
  if (progress.status === 'completed') return { status: 'completed' };
  return { status: 'active', stepId: definition?.steps[progress.stepIndex]?.id ?? '' };
}
