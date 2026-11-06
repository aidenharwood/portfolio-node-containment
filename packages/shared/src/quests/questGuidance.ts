import type { RecipeDefinition } from '../crafting/recipes.ts';
import type { NpcId, QuestId, WorldObjectId } from '../ids.ts';
import type { WorldObjectDefinition } from '../world/entities.ts';
import { objectiveGoal, type QuestDefinition, type QuestObjective, type QuestStepDefinition } from './questDefinition.ts';
import type { QuestLog } from './questProgress.ts';

export interface TrackedObjective {
  readonly objective: QuestObjective;
  readonly progress: number;
  readonly goal: number;
  readonly done: boolean;
}

export interface TrackedQuest {
  readonly quest: QuestDefinition;
  readonly step: QuestStepDefinition;
  readonly objectives: readonly TrackedObjective[];
}

export type NpcQuestMarker = 'objective' | 'available' | null;

export function trackedQuests(log: QuestLog, quests: ReadonlyMap<QuestId, QuestDefinition>): TrackedQuest[] {
  const tracked: TrackedQuest[] = [];
  for (const progress of Object.values(log)) {
    const quest = quests.get(progress.questId);
    const step = quest?.steps[progress.stepIndex];
    if (progress.status !== 'active' || !quest || !step) continue;
    tracked.push({
      quest,
      step,
      objectives: step.objectives.map((objective, index) => {
        const goal = objectiveGoal(objective);
        const current = progress.objectiveProgress[index] ?? 0;
        return { objective, progress: current, goal, done: current >= goal };
      }),
    });
  }
  return tracked.sort((a, b) => categoryOrder(a.quest) - categoryOrder(b.quest));
}

const categoryOrder = (quest: QuestDefinition): number => ({ tutorial: 0, main: 1, side: 2 })[quest.category];

export function npcQuestMarker(npcId: NpcId, log: QuestLog, quests: ReadonlyMap<QuestId, QuestDefinition>): NpcQuestMarker {
  const isObjective = trackedQuests(log, quests).some(({ objectives }) =>
    objectives.some(
      ({ objective, done }) =>
        !done && (objective.type === 'talkTo' || objective.type === 'signal') && objective.npcId === npcId,
    ),
  );
  if (isObjective) return 'objective';
  const offersQuest = [...quests.values()].some((quest) => quest.offeredBy === npcId && !log[quest.id]);
  return offersQuest ? 'available' : null;
}

export function objectiveCreatureIds(log: QuestLog, quests: ReadonlyMap<QuestId, QuestDefinition>): Set<string> {
  const ids = new Set<string>();
  for (const { objectives } of trackedQuests(log, quests)) {
    for (const { objective, done } of objectives) {
      if (!done && objective.type === 'defeat') ids.add(objective.creatureId);
    }
  }
  return ids;
}

export function objectiveObjectIds(
  log: QuestLog,
  quests: ReadonlyMap<QuestId, QuestDefinition>,
  objects: ReadonlyMap<WorldObjectId, WorldObjectDefinition> = new Map(),
  recipes: ReadonlyMap<string, RecipeDefinition> = new Map(),
): Set<WorldObjectId> {
  const ids = new Set<WorldObjectId>();
  const stationFor = (itemId: string) => [...recipes.values()].find((recipe) => recipe.output.itemId === itemId)?.station;
  for (const { objectives } of trackedQuests(log, quests)) {
    for (const { objective, done } of objectives) {
      if (done) continue;
      if (objective.type === 'interactWith') ids.add(objective.objectId);
      for (const object of objects.values()) {
        const gathers = objective.type === 'gather' && object.interactions.some((interaction) => interaction.gather?.itemId === objective.itemId);
        const crafts =
          objective.type === 'craft' &&
          object.interactions.some((interaction) =>
            interaction.effects.some((effect) => effect.type === 'openCrafting' && effect.station === stationFor(objective.itemId)),
          );
        if (gathers || crafts) ids.add(object.id);
      }
    }
  }
  return ids;
}
