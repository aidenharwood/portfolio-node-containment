import { createStartingSkills } from '../character/skills.ts';
import { CONTRACT_CADENCES, CONTRACTS_OFFERED, type ContractDefinition } from '../contracts/contract.ts';
import { TIER_LEVEL_FLOORS } from '../crafting/tiers.ts';
import { areConditionsMet, type ConditionContext } from '../rules/conditions.ts';
import type { GameContent } from './gameContent.ts';

const INDUCTION_QUEST_IDS = new Set(['orientation-protocol', 'field-fabrication', 'live-fire', 'cleared-for-transit']);

const freshFromInduction: ConditionContext = {
  countItem: () => 0,
  questStanding: (questId) => (INDUCTION_QUEST_IDS.has(questId) ? { status: 'completed' } : { status: 'notStarted' }),
  hasFlag: () => false,
  skills: createStartingSkills(),
};

function placedCreatureIds(content: GameContent): Set<string> {
  return new Set([...content.districts.values()].flatMap((district) => (district.creatures ?? []).map((placement) => placement.creatureId)));
}

function gatherableItemIds(content: GameContent): Set<string> {
  return new Set([...content.worldObjects.values()].flatMap((object) => object.interactions.flatMap((interaction) => (interaction.gather ? [interaction.gather.itemId] : []))));
}

export function findContractIssues(content: GameContent): string[] {
  const issues: string[] = [];
  const placed = placedCreatureIds(content);
  const gatherable = gatherableItemIds(content);
  const craftable = new Set([...content.recipes.values()].map((recipe) => recipe.output.itemId));

  const checkContract = (contract: ContractDefinition) => {
    const where = `contract "${contract.id}"`;
    const report = (problem: string) => issues.push(`${where}: ${problem}`);
    if (!Number.isInteger(contract.tier) || contract.tier < 1 || contract.tier > TIER_LEVEL_FLOORS.length) report(`tier ${contract.tier} is outside 1-${TIER_LEVEL_FLOORS.length}`);
    const { objective } = contract;
    if (!Number.isInteger(objective.count) || objective.count < 1) report(`objective count ${objective.count} must be a positive whole number`);
    if (contract.commendations < 1) report('pays no commendations');
    if (objective.type === 'defeat' || objective.type === 'contain') {
      if (objective.creatureIds.length === 0) report('names no creatures');
      for (const creatureId of objective.creatureIds) {
        const creature = content.creatures.get(creatureId);
        if (!creature) report(`unknown creature "${creatureId}"`);
        else if (!placed.has(creatureId)) report(`creature "${creatureId}" is not placed in any district`);
        else if (objective.type === 'contain' && !creature.containment) report(`creature "${creatureId}" cannot be contained`);
      }
    } else {
      if (objective.itemIds.length === 0) report('names no items');
      for (const itemId of objective.itemIds) {
        if (!content.items.has(itemId)) report(`unknown item "${itemId}"`);
        else if (objective.type === 'gather' && !gatherable.has(itemId)) report(`item "${itemId}" has no resource node`);
        else if (objective.type === 'craft' && !craftable.has(itemId)) report(`item "${itemId}" has no recipe`);
      }
    }
    for (const condition of contract.requires) {
      if ((condition.type === 'questCompleted' || condition.type === 'questActive' || condition.type === 'questNotStarted') && !content.quests.has(condition.questId)) {
        report(`unknown quest "${condition.questId}"`);
      }
      if (condition.type === 'combatLevel' && (!Number.isInteger(condition.atLeast) || condition.atLeast < 1)) report(`combat level ${condition.atLeast} must be a positive whole number`);
    }
    for (const effect of contract.rewards) {
      if (effect.type === 'giveItem' && !content.items.has(effect.itemId)) report(`reward item "${effect.itemId}" is unknown`);
    }
  };

  const contracts = [...content.contracts.values()];
  contracts.forEach(checkContract);
  for (const cadence of CONTRACT_CADENCES) {
    const starters = contracts.filter((contract) => contract.cadence === cadence && areConditionsMet(contract.requires, freshFromInduction));
    if (starters.length < CONTRACTS_OFFERED[cadence]) {
      issues.push(`contracts: only ${starters.length} ${cadence} contracts are open to an operative fresh out of Induction; the board offers ${CONTRACTS_OFFERED[cadence]}`);
    }
  }
  const boards = [...content.worldObjects.values()].filter((object) => object.interactions.some((interaction) => interaction.effects.some((effect) => effect.type === 'openContracts')));
  const boardIds = new Set(boards.map((board) => board.id));
  const placedBoards = [...content.districts.values()].flatMap((district) => district.objects.filter((placement) => boardIds.has(placement.objectId)));
  if (contracts.length > 0 && placedBoards.length === 0) issues.push('contracts: no contract board is placed in any district');
  return issues;
}
