import { deriveCombatProfile } from '../character/derivedStats.ts';
import { combatLevel, createStartingSkills, experienceForLevel, SKILL_IDS, SKILL_LEVEL_CAP, type SkillId } from '../character/skills.ts';
import { containmentLevelFor } from '../combat/containment.ts';
import type { CreatureId } from '../combat/creatures.ts';
import { studyExperience } from '../combat/study.ts';
import type { ContractId } from '../contracts/contract.ts';
import type { GameContent } from '../content/gameContent.ts';
import type { EquipmentSlot } from '../gear/slots.ts';
import { STAT_IDS, type StatId } from '../gear/stats.ts';
import type { ItemId, QuestId, WorldObjectId } from '../ids.ts';
import { questOfferConditions } from '../quests/questRequirements.ts';
import type { Condition } from '../rules/conditions.ts';
import type { ResolvedLevel } from '../world/levelLayout.ts';
import { placementLocations, type SourceLocation } from './itemSources.ts';
import { STATION_INFO, type CraftingStation } from './recipes.ts';

export type SkillGuideEntry =
  | { readonly kind: 'gather'; readonly name: string; readonly level: number; readonly objectId: WorldObjectId; readonly verb: string; readonly itemId: ItemId; readonly experience: number; readonly onlyDuring: QuestId | null; readonly locations: readonly SourceLocation[] }
  | { readonly kind: 'recipe'; readonly name: string; readonly level: number; readonly recipeId: string; readonly station: CraftingStation; readonly itemId: ItemId; readonly count: number; readonly experience: number }
  | { readonly kind: 'equip'; readonly name: string; readonly level: number; readonly itemId: ItemId; readonly slot: EquipmentSlot }
  | { readonly kind: 'contain'; readonly name: string; readonly level: number; readonly creatureId: CreatureId; readonly experience: number; readonly locations: readonly SourceLocation[] }
  | { readonly kind: 'study'; readonly name: string; readonly level: number; readonly creatureId: CreatureId; readonly experience: number; readonly locations: readonly SourceLocation[] }
  | { readonly kind: 'quest'; readonly name: string; readonly level: number; readonly questId: QuestId }
  | { readonly kind: 'contract'; readonly name: string; readonly level: number; readonly contractId: ContractId }
  | { readonly kind: 'story'; readonly name: string; readonly level: number; readonly questId: QuestId }
  | { readonly kind: 'fight'; readonly name: string; readonly level: number; readonly creatureId: CreatureId; readonly locations: readonly SourceLocation[] };

export type SkillGuideKind = SkillGuideEntry['kind'];

export const SKILL_GUIDE_KINDS: readonly SkillGuideKind[] = ['gather', 'recipe', 'equip', 'contain', 'study', 'quest', 'story', 'contract', 'fight'];

export const FIGHT_GUIDE_SKILLS: readonly SkillId[] = ['closeQuarters', 'marksmanship', 'psionics'];

export const isUnlockEntry = (entry: SkillGuideEntry): boolean => entry.kind !== 'fight';

export const skillUnlockEntries = (entries: readonly SkillGuideEntry[]): SkillGuideEntry[] => entries.filter(isUnlockEntry);

const skillGates = (conditions: readonly Condition[] | undefined): { skill: SkillId; level: number }[] =>
  (conditions ?? []).flatMap((condition) => (condition.type === 'skillLevel' ? [{ skill: condition.skill, level: condition.atLeast }] : []));

function placementIndex<T extends { readonly position: { readonly x: number; readonly y: number } }>(
  content: GameContent,
  pick: (level: ResolvedLevel) => readonly T[],
  keyOf: (placement: T) => string,
): (key: string) => SourceLocation[] {
  const index = new Map<string, Map<string, T['position'][]>>();
  for (const level of content.levels.values()) {
    for (const placement of pick(level)) {
      const perLevel = index.get(keyOf(placement)) ?? new Map<string, T['position'][]>();
      perLevel.set(level.id, [...(perLevel.get(level.id) ?? []), placement.position]);
      index.set(keyOf(placement), perLevel);
    }
  }
  return (key) => placementLocations(content, (level) => index.get(key)?.get(level.id) ?? []);
}

function buildSkillGuides(content: GameContent): ReadonlyMap<SkillId, readonly SkillGuideEntry[]> {
  const guides = new Map<SkillId, SkillGuideEntry[]>(SKILL_IDS.map((skill) => [skill, []]));
  const add = (skill: SkillId, entry: SkillGuideEntry) => guides.get(skill)?.push(entry);
  const objectsAt = placementIndex(content, (level) => level.objects, (placement) => placement.objectId);
  const creaturesAt = placementIndex(content, (level) => level.creatures, (placement) => placement.creatureId);

  for (const object of content.worldObjects.values()) {
    for (const interaction of object.interactions) {
      const gather = interaction.gather;
      if (!gather) continue;
      const onlyDuring = interaction.conditions?.find((condition) => condition.type === 'questActive')?.questId ?? null;
      add(gather.skill, { kind: 'gather', name: object.name, level: gather.level, objectId: object.id, verb: interaction.verb, itemId: gather.itemId, experience: gather.experience, onlyDuring, locations: objectsAt(object.id) });
    }
  }

  for (const recipe of content.recipes.values()) {
    const name = content.items.get(recipe.output.itemId)?.name ?? recipe.output.itemId;
    add(recipe.skill, { kind: 'recipe', name, level: recipe.level, recipeId: recipe.id, station: recipe.station, itemId: recipe.output.itemId, count: recipe.output.count, experience: recipe.experience });
  }

  for (const item of content.items.values()) {
    const equipment = item.equipment;
    if (!equipment) continue;
    for (const [skill, level] of Object.entries(equipment.requirements?.skills ?? {}) as [SkillId, number | undefined][]) {
      if (level !== undefined) add(skill, { kind: 'equip', name: item.name, level, itemId: item.id, slot: equipment.slot });
    }
  }

  for (const creature of content.creatures.values()) {
    const locations = creaturesAt(creature.id);
    if (creature.containment) {
      add('containment', { kind: 'contain', name: creature.name, level: containmentLevelFor(creature), creatureId: creature.id, experience: creature.containment.experience, locations });
    }
    for (const skill of FIGHT_GUIDE_SKILLS) add(skill, { kind: 'fight', name: creature.name, level: creature.level, creatureId: creature.id, locations });
    add('research', { kind: 'study', name: creature.name, level: creature.level, creatureId: creature.id, experience: studyExperience(creature, true), locations });
  }

  for (const quest of content.quests.values()) {
    for (const gate of skillGates(questOfferConditions(quest, content))) add(gate.skill, { kind: 'quest', name: quest.name, level: gate.level, questId: quest.id });
  }

  for (const quest of content.quests.values()) {
    const seen = new Set<string>();
    for (const step of quest.steps) {
      for (const objective of step.objectives) {
        if (objective.type !== 'reach' || objective.measure === 'combat' || objective.measure === 'questPoints') continue;
        const key = `${objective.measure}:${objective.level}`;
        if (seen.has(key)) continue;
        seen.add(key);
        add(objective.measure, { kind: 'story', name: quest.name, level: objective.level, questId: quest.id });
      }
    }
  }

  for (const contract of content.contracts.values()) {
    for (const gate of skillGates(contract.requires)) add(gate.skill, { kind: 'contract', name: contract.name, level: gate.level, contractId: contract.id });
  }

  for (const entries of guides.values()) {
    entries.sort((a, b) => a.level - b.level || SKILL_GUIDE_KINDS.indexOf(a.kind) - SKILL_GUIDE_KINDS.indexOf(b.kind) || a.name.localeCompare(b.name));
  }
  return guides;
}

const GUIDE_CACHE = new WeakMap<GameContent, ReadonlyMap<SkillId, readonly SkillGuideEntry[]>>();

export function skillGuides(content: GameContent): ReadonlyMap<SkillId, readonly SkillGuideEntry[]> {
  const cached = GUIDE_CACHE.get(content);
  if (cached) return cached;
  const built = buildSkillGuides(content);
  GUIDE_CACHE.set(content, built);
  return built;
}

export const skillGuide = (content: GameContent, skill: SkillId): readonly SkillGuideEntry[] => skillGuides(content).get(skill) ?? [];

export function skillGuideLabel(entry: SkillGuideEntry): string {
  switch (entry.kind) {
    case 'gather':
      return `${entry.verb} ${entry.name}`;
    case 'recipe':
      return `${STATION_INFO[entry.station].verb} ${entry.name}`;
    case 'equip':
      return `Equip ${entry.name}`;
    case 'contain':
      return `Contain ${entry.name}`;
    case 'study':
      return `Study ${entry.name}`;
    case 'quest':
      return `Quest: ${entry.name}`;
    case 'story':
      return `Story: ${entry.name}`;
    case 'contract':
      return `Contract: ${entry.name}`;
    case 'fight':
      return `Fight ${entry.name}`;
  }
}

export const skillUnlocksBetween = (entries: readonly SkillGuideEntry[], fromLevel: number, toLevel: number): SkillGuideEntry[] =>
  entries.filter((entry) => isUnlockEntry(entry) && entry.level > fromLevel && entry.level <= toLevel);

export function nextSkillUnlocks(entries: readonly SkillGuideEntry[], level: number): SkillGuideEntry[] {
  const unlocks = skillUnlockEntries(entries);
  const next = unlocks.find((entry) => entry.level > level);
  return next ? unlocks.filter((entry) => entry.level === next.level) : [];
}

const everyLevels = (count: number): string => (count === 1 ? 'every level' : `every ${count} levels`);

export function skillMilestones(skill: SkillId): string[] {
  if (skill !== 'fortitude') return [];
  const atLevel = (level: number) => createStartingSkills({ fortitude: experienceForLevel(level) });
  const noGear = Object.fromEntries(STAT_IDS.map((stat) => [stat, 0])) as Record<StatId, number>;
  const profileAt = (level: number) => deriveCombatProfile(atLevel(level), noGear);
  const integrityPerLevel = profileAt(2).integrity - profileAt(1).integrity;
  const guardAt = (level: number) => profileAt(level).meleeDefence;
  const guardLevels = Array.from({ length: SKILL_LEVEL_CAP - 1 }, (_, index) => index + 2).filter((level) => guardAt(level) > guardAt(level - 1));
  const guardEvery = (guardLevels[1] ?? 0) - (guardLevels[0] ?? 0);
  const combatGain = combatLevel(atLevel(SKILL_LEVEL_CAP)) - combatLevel(atLevel(2));
  const combatEvery = Math.max(1, Math.round((SKILL_LEVEL_CAP - 2) / Math.max(1, combatGain)));
  return [
    `+${integrityPerLevel} integrity ${everyLevels(1)}.`,
    `+1 guard (melee, ranged, psionic and hazard defence) ${everyLevels(guardEvery)}.`,
    `+1 combat level ${everyLevels(combatEvery)}.`,
  ];
}

export function summariseUnlocks(entries: readonly SkillGuideEntry[], limit = 3): string {
  const labels = [...new Set(entries.map(skillGuideLabel))];
  const shown = labels.slice(0, limit).join(', ');
  const hidden = labels.length - limit;
  return hidden > 0 ? `${shown} and ${hidden} more` : shown;
}
