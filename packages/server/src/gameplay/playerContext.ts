import {
  countItem,
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
  tramStationFlag,
  visitedLevelFlag,
} from '@containment/shared';
import type { Player } from '../world/player.ts';

export const conditionContextFor = (player: Player, content: GameContent): ConditionContext => ({
  countItem: (itemId) => countItem(player.record.inventory, itemId),
  questStanding: (questId) => questStanding(player.record.quests, content.quests.get(questId), questId),
  hasFlag: (flag) => player.hasFlag(flag),
});

export const questProbeFor = (player: Player): QuestStateProbe => ({
  countItem: (itemId) => countItem(player.record.inventory, itemId),
  isEquipped: (itemId) => isEquipped(player.record.equipment, itemId),
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
    discoveredStations: [...content.tram.stations.keys()].filter((stationId) => player.hasFlag(tramStationFlag(stationId))),
    visitedLevels: [...content.levels.keys()].filter((levelId) => player.hasFlag(visitedLevelFlag(levelId))),
  };
};
