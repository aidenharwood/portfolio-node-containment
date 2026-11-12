import {
  clearanceLevelFor,
  clearanceName,
  clearancePrice,
  clearanceTierOf,
  countItem,
  nextClearanceTier,
  deriveCombatProfile,
  equipmentStats,
  isEquipped,
  combatLevel,
  PRONOUN_SETS,
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
  type WorldObjectId,
} from '@containment/shared';
import type { Player } from '../world/player.ts';

export const conditionContextFor = (player: Player, content: GameContent): ConditionContext => ({
  countItem: (itemId) => countItem(player.record.inventory, itemId),
  questStanding: (questId) => questStanding(player.record.quests, content.quests.get(questId), questId),
  hasFlag: (flag) => player.hasFlag(flag),
  get skills() {
    return player.record.skills;
  },
});

export const questProbeFor = (player: Player): QuestStateProbe => ({
  countItem: (itemId) => countItem(player.record.inventory, itemId),
  isEquipped: (itemId) => isEquipped(player.record.equipment, itemId),
});

export const dialogueTemplateValuesFor = (player: Player): Record<string, string> => {
  const pronouns = PRONOUN_SETS[player.record.pronouns];
  const nextClearance = nextClearanceTier(player.record.flags);
  return {
    name: player.record.name,
    subject: pronouns.subject,
    object: pronouns.object,
    possessive: pronouns.possessive,
    clearance: clearanceTierOf(player.record.flags) === 0 ? 'no clearance' : clearanceName(clearanceTierOf(player.record.flags)),
    nextClearance: nextClearance === null ? '' : clearanceName(nextClearance),
    nextClearancePrice: nextClearance === null ? '' : String(clearancePrice(nextClearance)),
    nextClearanceLevel: nextClearance === null ? '' : String(clearanceLevelFor(nextClearance)),
  };
};

export const selfStateOf = (player: Player, content: GameContent): SelfState => {
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
    profile: deriveCombatProfile(player.record.skills, gearStats),
    combatLevel: combatLevel(player.record.skills),
    vitals: player.vitals(),
    discoveredStations: [...content.tram.stations.keys()].filter((stationId) => isStationKnown(content.tram, stationId, (flag) => player.hasFlag(flag))),
    visitedLevels: [...content.levels.keys()].filter((levelId) => player.hasFlag(visitedLevelFlag(levelId))),
    visitedDistricts: [...content.districts.keys()].filter((districtId) => player.hasFlag(visitedDistrictFlag(districtId))),
    openDoors: [...openDoorsOf(player, content)],
    openPassages: openPassagesOf(player, content),
    studiedCreatures: studiedCreaturesOf(player.record.flags),
    containmentClearance: clearanceTierOf(player.record.flags),
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
