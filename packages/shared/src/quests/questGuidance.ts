import type { CreatureId } from '../combat/creatures.ts';
import type { RecipeDefinition } from '../crafting/recipes.ts';
import type { ShopDefinition } from '../economy/shop.ts';
import { dialogueEffects, type DialogueDefinition } from '../dialogue/dialogue.ts';
import type { AreaId, DialogueId, DistrictId, ItemId, NpcId, QuestId, WorldObjectId } from '../ids.ts';
import { givenItems, type GameEffect } from '../rules/effects.ts';
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

export type GuidanceTarget =
  | { readonly kind: 'quest'; readonly questId: QuestId }
  | { readonly kind: 'resource'; readonly objectId: WorldObjectId };

export type NpcQuestMarker ='objective' | 'available' | null;

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

export function pendingQuest(
  log: QuestLog,
  quests: ReadonlyMap<QuestId, QuestDefinition>,
  preferred: QuestId | null,
  npcs?: ReadonlyMap<NpcId, { readonly name: string }>,
): ActiveQuest | undefined {
  const quest = preferred ? quests.get(preferred) : undefined;
  if (!quest?.offeredBy || log[quest.id]) return undefined;
  const giver = npcs?.get(quest.offeredBy)?.name ?? 'the quest giver';
  const objective: QuestObjective = { type: 'talkTo', npcId: quest.offeredBy, label: `Speak with ${giver} to begin` };
  return {
    quest,
    step: { id: 'offer', journal: `Speak with ${giver} to begin.`, objectives: [objective] },
    objectives: [{ objective, progress: 0, goal: 1, done: false }],
  };
}

export function trackedQuest(
  log: QuestLog,
  quests: ReadonlyMap<QuestId, QuestDefinition>,
  preferred: QuestId | null,
  npcs?: ReadonlyMap<NpcId, { readonly name: string }>,
): ActiveQuest | undefined {
  const active = activeQuests(log, quests);
  return active.find(({ quest }) => quest.id === preferred) ?? pendingQuest(log, quests, preferred, npcs) ?? active[0];
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

export function creatureIdsForObjective(objective: QuestObjective, studied: ReadonlySet<string> = new Set()): CreatureId[] {
  if (objective.type === 'defeat' || objective.type === 'contain') return [objective.creatureId];
  if (objective.type !== 'reach' || !objective.toward) return [];
  return [...(objective.toward.creatures ?? []), ...(objective.toward.study ?? []).filter((creatureId) => !studied.has(creatureId))];
}

export function objectiveCreatureIds(
  log: QuestLog,
  quests: ReadonlyMap<QuestId, QuestDefinition>,
  preferred: QuestId | null,
  studied: ReadonlySet<string> = new Set(),
): Set<string> {
  return new Set(openObjectives(log, quests, preferred).flatMap((objective) => creatureIdsForObjective(objective, studied)));
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
  if (objective.type === 'reach') return new Set(objective.toward?.objects ?? []);
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
  givenItems(effects).some((grant) => grant.itemId === itemId);

const dialogueGivesItem = (dialogue: DialogueDefinition, itemId: ItemId): boolean => givesItem(dialogueEffects(dialogue), itemId);

export function npcIdsForObjective(
  objective: QuestObjective,
  npcs: ReadonlyMap<NpcId, NpcDefinition>,
  dialogues: ReadonlyMap<DialogueId, DialogueDefinition>,
  shops: ReadonlyMap<string, ShopDefinition> = new Map(),
): Set<NpcId> {
  if (objective.type === 'talkTo') return new Set([objective.npcId]);
  if (objective.type === 'signal') return new Set(objective.npcId ? [objective.npcId] : []);
  if (objective.type !== 'obtainItem') return new Set();
  const itemId = objective.itemId;
  return new Set(
    [...npcs.values()]
      .filter((npc) => {
        const dialogue = npc.dialogueId ? dialogues.get(npc.dialogueId) : undefined;
        const shop = npc.shopId ? shops.get(npc.shopId) : undefined;
        return (dialogue !== undefined && dialogueGivesItem(dialogue, itemId)) || (shop?.listings.some((listing) => listing.itemId === itemId) ?? false);
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
