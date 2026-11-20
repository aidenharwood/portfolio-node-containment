import { experienceForLevel, SKILL_INFO, type SkillId } from '../character/skills.ts';
import { COMMENDATION_ITEM_ID, type ContractCadence, type ContractDefinition, type ContractObjective } from '../contracts/contract.ts';
import { TIER_LEVEL_FLOORS } from '../crafting/tiers.ts';
import { CURRENCY_ITEM_ID } from '../economy/shop.ts';
import type { Condition } from '../rules/conditions.ts';
import { WARD_RECIPES } from './catalog/items.ts';
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

export const SCRAP_GEAR: readonly string[] = WARD_RECIPES.filter((recipe) => recipe.station === 'fabricator' && recipe.level === 1).map((recipe) => recipe.output.itemId);

export const CONTRACTS: readonly ContractDefinition[] = [
  daily({ id: 'rat-catching', name: 'Rat Catching', brief: 'The station rats have started sitting on the benches. Move them on, permanently.', tier: 1, requires: [arrived], objective: defeat(8, 'canal-rat', 'pigeon') }),
  daily({ id: 'allotment-watch', name: 'Allotment Watch', brief: 'Agnes Pole has filed a complaint about dogs and magpies. A long one.', tier: 1, requires: [arrived], objective: defeat(6, 'stray-dog', 'scrap-magpie') }),
  daily({ id: 'scrap-drive', name: 'Scrap Drive', brief: 'Fenwick is short of scrap for bar. The piles round the Ward are free for the taking.', tier: 1, requires: [arrived], objective: gather(15, 'scrap-metal') }),
  daily({ id: 'eel-quota', name: 'Eel Quota', brief: 'The Directorate canteen wants basin eels. Check the traps on the quay.', tier: 1, requires: [arrived], objective: gather(8, 'basin-eel'), skill: 'biochemistry' }),
  daily({ id: 'bar-stock', name: 'Plate Stock', brief: 'Press scrap into plating. Every repair crew in the Ward goes through it.', tier: 1, requires: [arrived], objective: craft(6, 'scrap-plating') }),
  daily({ id: 'kit-order', name: 'Kit Order', brief: 'New arrivals need kit. Assemble scrap gear at a fabricator, any pieces.', tier: 1, requires: [arrived], objective: craft(3, ...SCRAP_GEAR), skill: 'engineering' }),
  daily({ id: 'wisp-drill', name: 'Wisp Drill', brief: 'Keep your hand in. Subdue and contain the crate wisps in the rail yard.', tier: 1, requires: [arrived], objective: contain(3, 'crate-wisp') }),
  daily({ id: 'wire-pull', name: 'Wire Pull', brief: 'The signal crews are short of copper. Strip the old cable drums along the Cut before somebody less official does.', tier: 2, requires: [arrived, skill('salvage', 5)], objective: gather(10, 'copper-wire') }),
  daily({ id: 'mite-control', name: 'Mite Control', brief: 'Gutter mites are chewing the Cut lock gates again. Thin them out.', tier: 3, requires: [arrived, fought(5)], objective: defeat(8, 'gutter-mite') }),
  daily({ id: 'eel-wrangling', name: 'Eel Wrangling', brief: 'Silt eels are crawling out on the Cut towpath. Put them back in the water, one way or another.', tier: 3, requires: [arrived, fought(7)], objective: defeat(6, 'silt-eel') }),
  daily({ id: 'dredge-quota', name: 'Dredge Quota', brief: 'Haul silt iron off the basin floor for the foundry.', tier: 3, requires: [arrived, skill('salvage', 10)], objective: gather(12, 'silt-iron') }),
  daily({ id: 'reed-cutting', name: 'Reed Cutting', brief: 'The chandlery wants green reeds for canvas. Cut them along the Cut.', tier: 3, requires: [arrived, skill('biochemistry', 10)], objective: gather(12, 'reed-bundle'), skill: 'biochemistry' }),
  daily({ id: 'culvert-survey', name: 'Culvert Survey', brief: 'Research wants fresh samples of the culvert residue. It hums. Bring it anyway.', tier: 3, requires: [arrived, skill('research', 10)], objective: gather(6, 'culvert-trace'), skill: 'research' }),
  daily({ id: 'crawler-cull', name: 'Crawler Cull', brief: 'Scrap crawlers have got into the Scrapyards cranes. Hallam wants them in pieces.', tier: 4, requires: [arrived, fought(10)], objective: defeat(8, 'scrap-crawler') }),
  daily({ id: 'iron-pour', name: 'Ferro Rolling', brief: 'Roll basin iron into ferro plating for the pump house. Kofi is counting.', tier: 3, requires: [arrived, skill('refining', 10)], objective: craft(4, 'ferro-plating') }),
  daily({ id: 'hound-watch', name: 'Hound Watch', brief: 'The glass hounds are getting bolder. Break a few before they decide the intake is theirs.', tier: 6, requires: [arrived, fought(18)], objective: defeat(6, 'glass-hound') }),
  daily({ id: 'hound-catch', name: 'Hound Catch', brief: 'Research wants glass hounds alive. Wear them down without cracking them and seal them in the padded cells.', tier: 6, requires: [arrived, fought(18), skill('containment', 15)], objective: contain(3, 'glass-hound') }),
  daily({ id: 'amber-survey', name: 'Amber Survey', brief: 'Amber Holding on B1 leaves residue faster than the lab can log it. Study it and bring the samples.', tier: 6, requires: [arrived, skill('research', 20)], objective: gather(8, 'amber-trace'), skill: 'research' }),
  daily({ id: 'heavy-haul', name: 'Heavy Haul', brief: 'The Scrapyards heaps have heavy stock in them. The foundry wants it before Hallam sells it.', tier: 6, requires: [arrived, skill('salvage', 20)], objective: gather(12, 'heavy-scrap') }),
  daily({ id: 'steel-pour', name: 'Plasteel Press', brief: 'Press plasteel plating. The Cordon post goes through it faster than anyone will say.', tier: 6, requires: [arrived, skill('refining', 20)], objective: craft(4, 'plasteel-plating') }),
  daily({ id: 'kit-bench', name: 'Kit Bench', brief: 'The Fringe watch go through field kits faster than the refinery turns them out. Refine a few, any line.', tier: 5, requires: [arrived, skill('refining', 25)], objective: craft(4, 'overdrive-kit-3', 'optics-kit-3', 'tuning-kit-3') }),
  daily({ id: 'knock-shift', name: 'Knock Shift', brief: 'Corporal Sato wants the Fringe quiet for one night. Put down what crawls out of the hull.', tier: 7, requires: [arrived, fought(24)], objective: defeat(6, 'hull-knocker') }),
  daily({ id: 'plate-salvage', name: 'Plate Salvage', brief: 'Cut hull plate off the wrecks on the Fringe. Mind the tide, and what walks in it.', tier: 8, requires: [arrived, skill('salvage', 30)], objective: gather(10, 'hull-plate') }),
  daily({ id: 'wraith-tide', name: 'Wraith Tide', brief: 'Tide wraiths came up the slipway again. Send them back down it.', tier: 8, requires: [arrived, fought(30)], objective: defeat(6, 'tide-wraith') }),
  daily({ id: 'wraith-seal', name: 'Wraith Seal', brief: 'Draw tide wraiths off the slipway while they are dry and seal them in the drained cells.', tier: 8, requires: [arrived, fought(30), skill('containment', 25)], objective: contain(2, 'tide-wraith') }),
  weekly({ id: 'pest-control', name: 'Ward Pest Control', brief: 'A week keeping the Ward clear of rats, pigeons, dogs and magpies.', tier: 1, requires: [arrived], objective: defeat(30, 'canal-rat', 'pigeon', 'stray-dog', 'scrap-magpie') }),
  weekly({ id: 'stockpile', name: 'Scrap Stockpile', brief: 'The Directorate is building a reserve. Salvage scrap from the piles round the Ward.', tier: 1, requires: [arrived], objective: gather(60, 'scrap-metal') }),
  weekly({ id: 'cut-sweep', name: 'Cut Sweep', brief: 'A week keeping the Cut clear of mites and eels.', tier: 3, requires: [arrived, fought(5)], objective: defeat(40, 'gutter-mite', 'silt-eel') }),
  weekly({ id: 'yard-sweep', name: 'Yard Sweep', brief: 'A week breaking up crawlers and rustlings in the Scrapyards.', tier: 4, requires: [arrived, fought(10)], objective: defeat(40, 'scrap-crawler', 'rustling') }),
  weekly({ id: 'fringe-sweep', name: 'Fringe Sweep', brief: 'A week holding the Shipyard Fringe against the hull knockers and tide wraiths.', tier: 7, requires: [arrived, fought(24)], objective: defeat(40, 'hull-knocker', 'tide-wraith') }),
  weekly({ id: 'rivet-haul', name: 'Rivet Haul', brief: 'The Directorate wants the old hull rivets back out of the Cordon barricades. All of them, eventually. Start with twenty.', tier: 7, requires: [arrived, skill('salvage', 35)], objective: gather(20, 'hull-rivets') }),
  weekly({ id: 'trace-ledger', name: 'Trace Ledger', brief: 'Research wants a week of samples: culvert residue, amber, anything that hums.', tier: 6, requires: [arrived, skill('research', 10)], objective: gather(30, 'culvert-trace', 'amber-trace'), skill: 'research' }),
  weekly({ id: 'refinery-shift', name: 'Refinery Shift', brief: 'Put in a full week on the refinery.', tier: 1, requires: [arrived], objective: craft(20, 'scrap-plating') }),
];
