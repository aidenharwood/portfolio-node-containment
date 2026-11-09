import type { RecipeDefinition } from '../crafting/recipes.ts';
import type { DialogueDefinition } from '../dialogue/dialogue.ts';
import type { AreaId, DialogueId, DistrictId, ItemId, NpcId, QuestId, WorldObjectId } from '../ids.ts';
import type { GameEffect } from '../rules/effects.ts';
import type { NpcDefinition, WorldObjectDefinition } from '../world/entities.ts';
import { objectiveGoal, type QuestDefinition, type QuestObjective, type QuestStepDefinition } from './questDefinition.ts';
import type { QuestLog } from './questProgress.ts';

export interface ActiveObjective {
  readonly objective: QuestObjective;
  readonly progress: number;
  readonly goal: number;
  readonly done: boolean;
}

export interface ActiveQuest {
  readonly quest: QuestDefinition;
  readonly step: QuestStepDefinition;
  readonly objectives: readonly ActiveObjective[];
}

export type NpcQuestMarker = 'objective' | 'available' | null;

export function activeQuests(log: QuestLog, quests: ReadonlyMap<QuestId, QuestDefinition>): ActiveQuest[] {
  const tracked: ActiveQuest[] = [];
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

export function trackedQuest(
  log: QuestLog,
  quests: ReadonlyMap<QuestId, QuestDefinition>,
  preferred: QuestId | null,
): ActiveQuest | undefined {
  const active = activeQuests(log, quests);
  return active.find(({ quest }) => quest.id === preferred) ?? active[0];
}

const openObjectives = (log: QuestLog, quests: ReadonlyMap<QuestId, QuestDefinition>, preferred: QuestId | null): QuestObjective[] =>
  (trackedQuest(log, quests, preferred)?.objectives ?? []).flatMap(({ objective, done }) => (done ? [] : [objective]));

export const isOfferUnlocked = (quest: QuestDefinition, log: QuestLog): boolean =>
  (quest.offerRequires ?? []).every((questId) => log[questId]?.status === 'completed');

const categoryOrder = (quest: QuestDefinition): number => ({ tutorial: 0, main: 1, side: 2 })[quest.category];

export function npcQuestMarker(
  npcId: NpcId,
  log: QuestLog,
  quests: ReadonlyMap<QuestId, QuestDefinition>,
  preferred: QuestId | null,
): NpcQuestMarker {
  const isObjective = openObjectives(log, quests, preferred).some(
    (objective) => (objective.type === 'talkTo' || objective.type === 'signal') && objective.npcId === npcId,
  );
  if (isObjective) return 'objective';
  const offersQuest = [...quests.values()].some((quest) => quest.offeredBy === npcId && !log[quest.id] && isOfferUnlocked(quest, log));
  return offersQuest ? 'available' : null;
}

export function objectiveCreatureIds(log: QuestLog, quests: ReadonlyMap<QuestId, QuestDefinition>, preferred: QuestId | null): Set<string> {
  const ids = new Set<string>();
  for (const objective of openObjectives(log, quests, preferred)) {
    if (objective.type === 'defeat' || objective.type === 'contain') ids.add(objective.creatureId);
  }
  return ids;
}

export interface ObjectiveArea {
  readonly districtId: DistrictId;
  readonly areaId: AreaId;
}

export function objectiveAreas(log: QuestLog, quests: ReadonlyMap<QuestId, QuestDefinition>, preferred: QuestId | null): ObjectiveArea[] {
  return openObjectives(log, quests, preferred).flatMap((objective) =>
    objective.type === 'enterArea' ? [{ districtId: objective.districtId, areaId: objective.areaId }] : [],
  );
}

export function objectIdsForObjective(
  objective: QuestObjective,
  objects: ReadonlyMap<WorldObjectId, WorldObjectDefinition>,
  recipes: ReadonlyMap<string, RecipeDefinition>,
): Set<WorldObjectId> {
  if (objective.type === 'interactWith') {
    return new Set([objective.objectId, ...[...objects.values()].filter((object) => object.countsAs === objective.objectId).map((object) => object.id)]);
  }
  if (objective.type === 'obtainItem') {
    const itemId = objective.itemId;
    return new Set(
      [...objects.values()]
        .filter((object) => object.interactions.some((interaction) => interaction.gather?.itemId === itemId || givesItem(interaction.effects, itemId)))
        .map((object) => object.id),
    );
  }
  if (objective.type !== 'gather' && objective.type !== 'craft') return new Set();
  const station = [...recipes.values()].find((recipe) => recipe.output.itemId === objective.itemId)?.station;
  const ids = new Set<WorldObjectId>();
  for (const object of objects.values()) {
    const matches = object.interactions.some((interaction) =>
      objective.type === 'gather'
        ? interaction.gather?.itemId === objective.itemId
        : interaction.effects.some((effect) => effect.type === 'openCrafting' && effect.station === station),
    );
    if (matches) ids.add(object.id);
  }
  return ids;
}

const givesItem = (effects: readonly GameEffect[] | undefined, itemId: ItemId): boolean =>
  (effects ?? []).some((effect) => effect.type === 'giveItem' && effect.itemId === itemId);

const dialogueGivesItem = (dialogue: DialogueDefinition, itemId: ItemId): boolean =>
  Object.values(dialogue.nodes).some((node) => givesItem(node.effects, itemId) || (node.options ?? []).some((option) => givesItem(option.effects, itemId)));

export function npcIdsForObjective(
  objective: QuestObjective,
  npcs: ReadonlyMap<NpcId, NpcDefinition>,
  dialogues: ReadonlyMap<DialogueId, DialogueDefinition>,
): Set<NpcId> {
  if (objective.type === 'talkTo') return new Set([objective.npcId]);
  if (objective.type === 'signal') return new Set(objective.npcId ? [objective.npcId] : []);
  if (objective.type !== 'obtainItem') return new Set();
  const itemId = objective.itemId;
  return new Set(
    [...npcs.values()]
      .filter((npc) => {
        const dialogue = npc.dialogueId ? dialogues.get(npc.dialogueId) : undefined;
        return dialogue !== undefined && dialogueGivesItem(dialogue, itemId);
      })
      .map((npc) => npc.id),
  );
}

export function objectiveObjectIds(
  log: QuestLog,
  quests: ReadonlyMap<QuestId, QuestDefinition>,
  preferred: QuestId | null,
  objects: ReadonlyMap<WorldObjectId, WorldObjectDefinition> = new Map(),
  recipes: ReadonlyMap<string, RecipeDefinition> = new Map(),
): Set<WorldObjectId> {
  const ids = new Set<WorldObjectId>();
  for (const objective of openObjectives(log, quests, preferred)) {
    for (const id of objectIdsForObjective(objective, objects, recipes)) ids.add(id);
  }
  return ids;
}
