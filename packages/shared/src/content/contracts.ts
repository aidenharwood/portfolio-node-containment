import { experienceForLevel, SKILL_INFO, type SkillId } from '../character/skills.ts';
import { COMMENDATION_ITEM_ID, type ContractCadence, type ContractDefinition, type ContractObjective } from '../contracts/contract.ts';
import { TIER_LEVEL_FLOORS } from '../crafting/tiers.ts';
import { CURRENCY_ITEM_ID } from '../economy/shop.ts';
import type { Condition } from '../rules/conditions.ts';
import { TUTORIAL_QUEST_ID } from './ward/quests.ts';

interface ContractDraft {
  readonly id: string;
  readonly name: string;
  readonly brief: string;
  readonly tier: number;
  readonly requires: readonly Condition[];
  readonly objective: ContractObjective;
  readonly skill?: SkillId;
}

const OBJECTIVE_SKILL: Readonly<Record<ContractObjective['type'], SkillId>> = {
  defeat: 'fortitude',
  contain: 'containment',
  gather: 'salvage',
  craft: 'refining',
};

const SCRIP_PER_TIER: Readonly<Record<ContractCadence, number>> = { daily: 45, weekly: 220 };
const COMMENDATIONS: Readonly<Record<ContractCadence, number>> = { daily: 3, weekly: 12 };
const LEVEL_SHARE: Readonly<Record<ContractCadence, number>> = { daily: 0.5, weekly: 2 };
const EXPERIENCE_FLOOR: Readonly<Record<ContractCadence, number>> = { daily: 150, weekly: 600 };

const levelStepAt = (level: number): number => experienceForLevel(level + 1) - experienceForLevel(level);

function contract(cadence: ContractCadence, draft: ContractDraft): ContractDefinition {
  const { skill: override, ...rest } = draft;
  const skill = override ?? OBJECTIVE_SKILL[draft.objective.type];
  const scrip = SCRIP_PER_TIER[cadence] * draft.tier;
  const experience = Math.max(EXPERIENCE_FLOOR[cadence], Math.round(levelStepAt(TIER_LEVEL_FLOORS[draft.tier - 1] ?? 1) * LEVEL_SHARE[cadence]));
  const commendations = COMMENDATIONS[cadence] + Math.floor(draft.tier / 3) * (cadence === 'daily' ? 1 : 3);
  return {
    ...rest,
    id: `${cadence}:${draft.id}`,
    cadence,
    commendations,
    rewards: [
      { type: 'giveItem', itemId: CURRENCY_ITEM_ID, count: scrip },
      { type: 'grantExperience', skill, amount: experience },
      { type: 'giveItem', itemId: COMMENDATION_ITEM_ID, count: commendations },
    ],
    rewardSummary: `${scrip} scrip, ${experience} ${SKILL_INFO[skill].name} XP, ${commendations} commendations`,
  };
}

const daily = (draft: ContractDraft) => contract('daily', draft);
const weekly = (draft: ContractDraft) => contract('weekly', draft);

const arrived: Condition = { type: 'questCompleted', questId: TUTORIAL_QUEST_ID };
const fought = (atLeast: number): Condition => ({ type: 'combatLevel', atLeast });
const skill = (id: SkillId, atLeast: number): Condition => ({ type: 'skillLevel', skill: id, atLeast });

const defeat = (count: number, ...creatureIds: string[]): ContractObjective => ({ type: 'defeat', creatureIds, count });
const contain = (count: number, ...creatureIds: string[]): ContractObjective => ({ type: 'contain', creatureIds, count });
const gather = (count: number, ...itemIds: string[]): ContractObjective => ({ type: 'gather', itemIds, count });
const craft = (count: number, ...itemIds: string[]): ContractObjective => ({ type: 'craft', itemIds, count });

const SCRAP_GEAR = ['scrap-baton', 'scrap-blade', 'scrap-helm', 'scrap-plate', 'scrap-gauntlets', 'scrap-greaves', 'scrap-boots', 'patchwork-hood', 'patchwork-jacket', 'sackcloth-cowl', 'sackcloth-robe'];

export const CONTRACTS: readonly ContractDefinition[] = [
  daily({ id: 'rat-catching', name: 'Rat Catching', brief: 'The station rats have started sitting on the benches. Move them on, permanently.', tier: 1, requires: [arrived], objective: defeat(8, 'canal-rat', 'pigeon') }),
  daily({ id: 'allotment-watch', name: 'Allotment Watch', brief: 'Agnes Pole has filed a complaint about dogs and magpies. A long one.', tier: 1, requires: [arrived], objective: defeat(6, 'stray-dog', 'scrap-magpie') }),
  daily({ id: 'scrap-drive', name: 'Scrap Drive', brief: 'Fenwick is short of scrap for bar. The piles round the Ward are free for the taking.', tier: 1, requires: [arrived], objective: gather(15, 'scrap-metal') }),
  daily({ id: 'eel-quota', name: 'Eel Quota', brief: 'The Directorate canteen wants basin eels. Check the traps on the quay.', tier: 1, requires: [arrived], objective: gather(8, 'basin-eel'), skill: 'biochemistry' }),
  daily({ id: 'bar-stock', name: 'Bar Stock', brief: 'Refine scrap into bar. Every repair crew in the Ward goes through it.', tier: 1, requires: [arrived], objective: craft(6, 'scrap-bar') }),
  daily({ id: 'kit-order', name: 'Kit Order', brief: 'New arrivals need kit. Assemble scrap gear at a fabricator, any pieces.', tier: 1, requires: [arrived], objective: craft(3, ...SCRAP_GEAR), skill: 'engineering' }),
  daily({ id: 'wisp-drill', name: 'Wisp Drill', brief: 'Keep your hand in. Subdue and contain the crate wisps in the rail yard.', tier: 1, requires: [arrived], objective: contain(3, 'crate-wisp') }),
  daily({ id: 'mite-control', name: 'Mite Control', brief: 'Gutter mites are chewing the Cut lock gates again. Thin them out.', tier: 3, requires: [arrived, fought(5)], objective: defeat(8, 'gutter-mite') }),
  daily({ id: 'iron-pour', name: 'Iron Pour', brief: 'Refine basin iron for the pump house. Kofi is counting.', tier: 3, requires: [arrived, skill('refining', 10)], objective: craft(4, 'iron-bar') }),
  weekly({ id: 'pest-control', name: 'Ward Pest Control', brief: 'A week keeping the Ward clear of rats, pigeons, dogs and magpies.', tier: 1, requires: [arrived], objective: defeat(30, 'canal-rat', 'pigeon', 'stray-dog', 'scrap-magpie') }),
  weekly({ id: 'stockpile', name: 'Scrap Stockpile', brief: 'The Directorate is building a reserve. Salvage scrap from the piles round the Ward.', tier: 1, requires: [arrived], objective: gather(60, 'scrap-metal') }),
  weekly({ id: 'refinery-shift', name: 'Refinery Shift', brief: 'Put in a full week on the refinery.', tier: 1, requires: [arrived], objective: craft(20, 'scrap-bar') }),
];
