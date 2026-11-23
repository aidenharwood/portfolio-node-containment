import { combatLevel, createStartingSkills, experienceForLevel, levelForExperience, SKILL_IDS, type SkillId } from '../src/character/skills.ts';
import { deriveCombatProfile } from '../src/character/derivedStats.ts';
import { combatExperience, creatureAttackProfile, defenceAgainst, hitChance, playerAttackProfile } from '../src/combat/combatMath.ts';
import { containmentExperience, containmentLevelFor, containmentThresholdFraction } from '../src/combat/containment.ts';
import type { CreatureDefinition } from '../src/combat/creatures.ts';
import { creatureDefence, REPEAT_STUDY_COOLDOWN_TICKS, STUDY_TICKS, studyExperience } from '../src/combat/study.ts';
import { REGENERATION_INTERVAL_TICKS, regenerationPerInterval } from '../src/combat/regeneration.ts';
import { COMBAT_STYLE_INFO, WEAPON_KIND_INFO, type WeaponKind } from '../src/combat/weapons.ts';
import { equipmentStats, type EquipmentState } from '../src/gear/equipment.ts';
import { depletionChance, gatherChance, type GatheringSource } from '../src/crafting/gathering.ts';
import { skillGuide } from '../src/crafting/skillGuide.ts';
import { gatheringSourcesOf } from '../src/content/craftingIntegrity.ts';
import { ladderArmourId, ladderWeaponId, MATERIAL_LADDER } from '../src/content/catalog/items.ts';
import { GAME_CONTENT } from '../src/index.ts';
import type { QuestDefinition } from '../src/quests/questDefinition.ts';
import { questOfferConditions } from '../src/quests/questRequirements.ts';
import type { GameEffect } from '../src/rules/effects.ts';

export const TICK_SECONDS = 0.3;
export const hoursOf = (ticks: number): number => (ticks * TICK_SECONDS) / 3600;
export const levelStep = (level: number): number => experienceForLevel(level + 1) - experienceForLevel(level);

const FIGHT_OVERHEAD_TICKS = 20;
const FIGHT_PRACTICAL = 1.5;
const GATHER_WALK_TICKS = 20;
const GATHER_PRACTICAL = 2;
const CRAFT_PRACTICAL = 2;
const STUDY_WALK_TICKS = 10;
const SAFE_LOSS = 0.5;
const CONTAIN_TICKS = 4;

export type Style = keyof typeof COMBAT_STYLE_INFO;
export const STYLES = Object.keys(COMBAT_STYLE_INFO) as Style[];

const BODY_SLOTS = ['head', 'torso', 'hands', 'legs', 'feet'] as const;
const LINE_WEAPONS: Readonly<Record<Style, readonly WeaponKind[]>> = { melee: ['baton', 'blade', 'maul'], ranged: ['pistol', 'carbine', 'rifle'], psionic: ['focus', 'resonator'] };

const rungAt = (level: number) => MATERIAL_LADDER.filter((rung) => rung.level <= level).at(-1)!;

function lineGear(style: Style, level: number): EquipmentState {
  const rung = rungAt(level);
  const perTick = (kind: WeaponKind): number => {
    const weapon = GAME_CONTENT.items.get(ladderWeaponId(rung, kind))?.equipment;
    if (!weapon?.weapon) return 0;
    const rating = level + Object.values(weapon.stats).reduce((sum, value) => sum + (value ?? 0), 0);
    const maxHit = 1 + Math.floor((rating * WEAPON_KIND_INFO[weapon.weapon.kind].damageScale) / 4);
    return (hitChance(rating, level) * (1 + maxHit)) / 2 / weapon.weapon.speedTicks;
  };
  const weapon = LINE_WEAPONS[style].reduce((top, kind) => (perTick(kind) > perTick(top) ? kind : top));
  return { primary: ladderWeaponId(rung, weapon), ...Object.fromEntries(BODY_SLOTS.map((slot) => [slot, ladderArmourId(rung, COMBAT_STYLE_INFO[style].line, slot)])) };
}

export const typicalFortitude = (level: number): number => levelForExperience(experienceForLevel(level) / 2);

const styleSkills = (style: Style, level: number) => createStartingSkills({ [COMBAT_STYLE_INFO[style].skill]: experienceForLevel(level), fortitude: experienceForLevel(typicalFortitude(level)) });

export interface Fight {
  readonly creature: CreatureDefinition;
  readonly ticks: number;
  readonly lost: number;
  readonly experience: number;
}

export function fightAt(style: Style, level: number, creature: CreatureDefinition, share = 1): Fight {
  const gear = lineGear(style, level);
  const skills = styleSkills(style, level);
  const attack = playerAttackProfile(skills, gear, GAME_CONTENT.items);
  const profile = deriveCombatProfile(skills, equipmentStats(gear, GAME_CONTENT.items));
  const swing = hitChance(attack.accuracy, creatureDefence(creature, attack.style, false)) * (1 + attack.maxHit) / 2;
  const fight = ((creature.integrity * share) / swing) * attack.speedTicks;
  const theirs = creatureAttackProfile(creature);
  const taken = (fight / theirs.speedTicks) * hitChance(theirs.accuracy, defenceAgainst(profile, creature.attack.style)) * (1 + theirs.maxHit) / 2;
  const healing = (taken / regenerationPerInterval(profile.integrity)) * REGENERATION_INTERVAL_TICKS;
  const damageExperience = combatExperience(attack.style, Math.round(creature.integrity * share))[0]?.amount ?? 0;
  return { creature, ticks: (fight + Math.max(FIGHT_OVERHEAD_TICKS, healing)) * FIGHT_PRACTICAL, lost: taken / profile.integrity, experience: creature.experience + damageExperience };
}

export const farmable = (): CreatureDefinition[] => {
  const spots = new Map<string, number>();
  for (const district of GAME_CONTENT.districts.values()) {
    for (const placement of district.creatures ?? []) spots.set(placement.creatureId, (spots.get(placement.creatureId) ?? 0) + 1);
  }
  return [...spots].filter(([, count]) => count >= 2).map(([id]) => GAME_CONTENT.creatures.get(id)!).filter((creature) => creature && !creature.encounter);
};

export function bestFarm(style: Style, level: number, creatures = farmable()): Fight | undefined {
  return creatures
    .map((creature) => fightAt(style, level, creature))
    .filter((fight) => fight.lost <= SAFE_LOSS)
    .sort((a, b) => b.experience / b.ticks - a.experience / a.ticks)[0];
}

export function combatHours(style: Style, from: number, to: number, creatures = farmable()): number {
  let ticks = 0;
  for (let level = from; level < to; level++) {
    const farm = bestFarm(style, level, creatures);
    if (!farm) return Infinity;
    ticks += (levelStep(level) * farm.ticks) / farm.experience;
  }
  return hoursOf(ticks);
}

const placedGatherSources = (skill?: SkillId): GatheringSource[] => {
  const sources: GatheringSource[] = [];
  const skills = skill ? [skill] : (['salvage', 'research', 'biochemistry'] as SkillId[]);
  for (const each of skills) {
    for (const entry of skillGuide(GAME_CONTENT, each)) {
      if (entry.kind !== 'gather' || entry.onlyDuring || entry.locations.length === 0) continue;
      const source = gatheringSourcesOf(GAME_CONTENT, entry.objectId).find((candidate) => candidate.itemId === entry.itemId && candidate.skill === each);
      if (source) sources.push(source);
    }
  }
  return sources;
};

export const gatherTicks = (source: GatheringSource, level: number): number =>
  (source.attemptTicks / gatherChance(source, level) + (GATHER_WALK_TICKS * depletionChance(source)) / source.charges) * GATHER_PRACTICAL;

export interface Method {
  readonly name: string;
  readonly level: number;
  readonly perTick: (level: number) => number;
}

export const gatherMethods = (skill: SkillId): Method[] =>
  placedGatherSources(skill).map((source) => ({ name: source.itemId, level: source.level, perTick: (level: number) => source.experience / gatherTicks(source, level) }));

const supplyMemo = new Map<string, number>();

export function supplyTicks(itemId: string, seen = new Set<string>()): number {
  const known = supplyMemo.get(itemId);
  if (known !== undefined) return known;
  if (seen.has(itemId)) return Infinity;
  const next = new Set([...seen, itemId]);
  const options: number[] = [];
  for (const source of placedGatherSources()) if (source.itemId === itemId) options.push(gatherTicks(source, source.level + 10));
  for (const recipe of GAME_CONTENT.recipes.values()) {
    if (recipe.output.itemId !== itemId) continue;
    options.push((recipe.ticks * CRAFT_PRACTICAL + recipe.inputs.reduce((sum, input) => sum + input.count * supplyTicks(input.itemId, next), 0)) / recipe.output.count);
  }
  if (options.length === 0) for (const shop of GAME_CONTENT.shops.values()) if (!shop.currency && shop.listings.some((listing) => listing.itemId === itemId)) options.push(1);
  if (options.length === 0) {
    for (const creature of farmable()) {
      const entry = creature.loot.find((loot) => loot.itemId === itemId);
      if (entry) options.push(fightAt('melee', creature.level + 5, creature).ticks / (entry.chance * entry.count));
    }
  }
  const best = options.length ? Math.min(...options) : Infinity;
  if (seen.size === 0) supplyMemo.set(itemId, best);
  return best;
}

export const recipeMethods = (skill: SkillId): Method[] =>
  [...GAME_CONTENT.recipes.values()]
    .filter((recipe) => recipe.skill === skill && GAME_CONTENT.items.get(recipe.output.itemId)?.category !== 'quest')
    .map((recipe): Method => {
      const ticks = recipe.ticks * CRAFT_PRACTICAL + recipe.inputs.reduce((sum, input) => sum + input.count * supplyTicks(input.itemId), 0);
      return { name: recipe.id, level: recipe.level, perTick: () => recipe.experience / ticks };
    })
    .filter((method) => Number.isFinite(method.perTick(method.level)));

export const studyMethods = (): Method[] =>
  farmable().map((creature) => ({
    name: `study ${creature.id}`,
    level: creature.level,
    perTick: () => studyExperience(creature, false) / Math.max(REPEAT_STUDY_COOLDOWN_TICKS, (STUDY_TICKS + STUDY_WALK_TICKS) * GATHER_PRACTICAL),
  }));

export function containFight(level: number, creature: CreatureDefinition): Fight {
  const fights = STYLES.map((style) => fightAt(style, Math.max(level, creature.level), creature, 1 - containmentThresholdFraction(0))).filter((fight) => fight.lost <= SAFE_LOSS);
  const fight = fights.sort((a, b) => a.ticks - b.ticks)[0] ?? fightAt('melee', Math.max(level, creature.level), creature, 1 - containmentThresholdFraction(0));
  return { ...fight, ticks: fight.ticks + CONTAIN_TICKS, experience: containmentExperience(creature) };
}

export const containMethods = (): Method[] =>
  farmable()
    .filter((creature) => creature.containment)
    .map((creature) => ({
      name: creature.id,
      level: containmentLevelFor(creature),
      perTick: (level: number) => {
        const fight = containFight(level, creature);
        return fight.lost <= SAFE_LOSS ? fight.experience / fight.ticks : 0;
      },
    }));

export const methodsFor = (skill: SkillId): Method[] => {
  if (skill === 'containment') return containMethods();
  if (skill === 'research') return [...gatherMethods(skill), ...studyMethods()];
  return [...gatherMethods(skill), ...recipeMethods(skill)];
};

export function bestMethod(methods: readonly Method[], level: number): { method: Method; perTick: number } | undefined {
  return methods
    .filter((method) => method.level <= level)
    .map((method) => ({ method, perTick: method.perTick(level) }))
    .filter((entry) => entry.perTick > 0)
    .sort((a, b) => b.perTick - a.perTick)[0];
}

export function skillHours(skill: SkillId, from: number, to: number, methods = methodsFor(skill)): number {
  let ticks = 0;
  for (let level = from; level < to; level++) {
    const best = bestMethod(methods, level);
    if (!best) return Infinity;
    ticks += levelStep(level) / best.perTick;
  }
  return hoursOf(ticks);
}

export interface QuestGate {
  readonly questId: string;
  readonly where: string;
  readonly measure: string;
  readonly gate: number;
  readonly held: number;
}

export interface QuestRun {
  readonly order: readonly string[];
  readonly gates: readonly QuestGate[];
  readonly paid: Readonly<Record<string, number>>;
}

const REWARD_STYLE: SkillId = 'closeQuarters';

export function questOnlyRun(): QuestRun {
  const quests = [...GAME_CONTENT.quests.values()];
  const experience: Record<string, number> = Object.fromEntries(SKILL_IDS.map((skill) => [skill, 0]));
  const paid: Record<string, number> = Object.fromEntries(SKILL_IDS.map((skill) => [skill, 0]));
  const done = new Set<string>();
  const flags = new Set<string>();
  const order: string[] = [];
  const gates: QuestGate[] = [];
  const skills = () => createStartingSkills(experience);
  const measureLevel = (measure: string): number => (measure === 'combat' ? combatLevel(skills()) : levelForExperience(experience[measure] ?? 0));
  const meetGate = (questId: string, where: string, measure: string, gate: number) => gates.push({ questId, where, measure, gate, held: measureLevel(measure) });
  const grant = (effect: GameEffect) => {
    if (effect.type === 'grantExperience') {
      experience[effect.skill] = (experience[effect.skill] ?? 0) + effect.amount;
      paid[effect.skill] = (paid[effect.skill] ?? 0) + effect.amount;
    }
    if (effect.type === 'grantStyleExperience') {
      experience[REWARD_STYLE] = (experience[REWARD_STYLE] ?? 0) + effect.amount;
      paid.style = (paid.style ?? 0) + effect.amount;
    }
    if (effect.type === 'setFlag') flags.add(effect.flag);
  };
  const followUps = new Set(quests.flatMap((quest) => (quest.followUpQuestId ? [quest.followUpQuestId] : [])));
  const leadsInto = new Map(quests.flatMap((quest) => (quest.followUpQuestId ? [[quest.followUpQuestId, quest.id] as const] : [])));
  const gatesOf = (quest: QuestDefinition) => questOfferConditions(quest, GAME_CONTENT);
  const available = (quest: QuestDefinition): boolean => {
    if (done.has(quest.id)) return false;
    const before = leadsInto.get(quest.id);
    if (before && !done.has(before)) return false;
    if (followUps.has(quest.id) && !before) return false;
    return gatesOf(quest).every((condition) => condition.type !== 'questCompleted' || done.has(condition.questId));
  };
  for (;;) {
    const next = quests.filter(available).sort((a, b) => (a.recommendedLevel ?? 1) - (b.recommendedLevel ?? 1) || quests.indexOf(a) - quests.indexOf(b))[0];
    if (!next) break;
    for (const condition of gatesOf(next)) {
      if (condition.type === 'skillLevel') meetGate(next.id, 'offer', condition.skill, condition.atLeast);
      if (condition.type === 'combatLevel') meetGate(next.id, 'offer', 'combat', condition.atLeast);
    }
    for (const step of next.steps) {
      for (const objective of step.objectives) {
        if (objective.type === 'reach' && objective.measure !== 'questPoints') meetGate(next.id, step.id, objective.measure, objective.level);
      }
      for (const effect of step.onComplete ?? []) grant(effect);
    }
    for (const effect of next.rewards) grant(effect);
    done.add(next.id);
    order.push(next.id);
  }
  void flags;
  return { order, gates, paid };
}

export function lastUnlock(skill: SkillId): number {
  const levels = skillGuide(GAME_CONTENT, skill).filter((entry) => entry.kind === 'gather' || entry.kind === 'recipe' || entry.kind === 'contain').map((entry) => entry.level);
  return Math.max(...levels);
}
