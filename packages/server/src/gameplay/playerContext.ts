import {
  countItem,
  boostViews,
  deriveCombatProfile,
  equipmentStats,
  isEquipped,
  combatLevel,
  levelForExperience,
  PRONOUN_SETS,
  questPointsEarned,
  questStanding,
  type ConditionContext,
  type GameContent,
  type QuestStateProbe,
  type SelfState,
  isStationKnown,
  isDoorOpenFor,
  isPassageOpenFor,
  visitedDistrictFlag,
  visitedLevelFlag,
  studiedCreaturesOf,
  usedObjectsOf,
  type WorldObjectId,
} from '@containment/shared';
import type { Player } from '../world/player.ts';

export const conditionContextFor = (player: Player, content: GameContent): ConditionContext => ({
  countItem: (itemId) => countItem(player.record.inventory, itemId),
  questStanding: (questId) => questStanding(player.record.quests, content.quests.get(questId), questId),
  hasFlag: (flag) => player.hasFlag(flag),
  questPoints: () => questPointsEarned(player.record.quests, content.quests),
  get skills() {
    return player.record.skills;
  },
});

export const questProbeFor = (player: Player, content: GameContent): QuestStateProbe => ({
  countItem: (itemId) => countItem(player.record.inventory, itemId),
  isEquipped: (itemId) => isEquipped(player.record.equipment, itemId),
  levelOf: (measure) => {
    if (measure === 'combat') return combatLevel(player.record.skills);
    if (measure === 'questPoints') return questPointsEarned(player.record.quests, content.quests);
    return levelForExperience(player.record.skills[measure]);
  },
});

export const dialogueTemplateValuesFor = (player: Player): Record<string, string> => {
  const pronouns = PRONOUN_SETS[player.record.pronouns];
  return {
    name: player.record.name,
    subject: pronouns.subject,
    object: pronouns.object,
    possessive: pronouns.possessive,
  };
};

export const selfStateOf = (player: Player, content: GameContent, clock: { readonly tick: number; readonly tickMs: number }): SelfState => {
  const gearStats = equipmentStats(player.record.equipment, content.items);
  return {
    characterId: player.record.id,
    name: player.record.name,
    pronouns: player.record.pronouns,
    skills: player.record.skills,
    inventory: player.record.inventory,
    storage: player.record.storage,
    equipment: player.record.equipment,
    quests: player.record.quests,
    stats: gearStats,
    profile: deriveCombatProfile(player.record.skills, player.combatStats(content.items)),
    boosts: boostViews(player.boosts, clock.tick, clock.tickMs),
    combatLevel: combatLevel(player.record.skills),
    vitals: player.vitals(),
    discoveredStations: [...content.tram.stations.keys()].filter((stationId) => isStationKnown(content.tram, stationId, (flag) => player.hasFlag(flag))),
    visitedLevels: [...content.levels.keys()].filter((levelId) => player.hasFlag(visitedLevelFlag(levelId))),
    visitedDistricts: [...content.districts.keys()].filter((districtId) => player.hasFlag(visitedDistrictFlag(districtId))),
    openDoors: [...openDoorsOf(player, content)],
    openPassages: openPassagesOf(player, content),
    studiedCreatures: studiedCreaturesOf(player.record.flags),
    usedObjects: usedObjectsOf(player.record.flags),
    contracts: player.record.contracts,
  };
};

export function openDoorsOf(player: Player, content: GameContent): Set<WorldObjectId> {
  const context = conditionContextFor(player, content);
  const open = new Set<WorldObjectId>();
  for (const definition of content.worldObjects.values()) {
    if (definition.door && !definition.countsAs && isDoorOpenFor(definition.id, definition.door, context)) open.add(definition.id);
  }
  return open;
}

export function openPassagesOf(player: Player, content: GameContent): WorldObjectId[] {
  const context = conditionContextFor(player, content);
  return [...content.worldObjects.values()].filter((definition) => !definition.countsAs && isPassageOpenFor(definition, context)).map((definition) => definition.id);
}
