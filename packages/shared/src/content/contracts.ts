import { experienceStepAt, SKILL_INFO, type SkillId } from '../character/skills.ts';
import { COMMENDATION_ITEM_ID, type ContractCadence, type ContractDefinition, type ContractObjective } from '../contracts/contract.ts';
import { TIER_LEVEL_FLOORS } from '../crafting/tiers.ts';
import { CURRENCY_ITEM_ID } from '../economy/shop.ts';
import type { Condition } from '../rules/conditions.ts';
import { WARD_RECIPES } from './catalog/items.ts';
import { TUTORIAL_QUEST_ID } from './span/quests/intake.ts';

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
const EXPERIENCE_FLOOR: Readonly<Record<ContractCadence, number>> = { daily: 20, weekly: 80 };

function contract(cadence: ContractCadence, draft: ContractDraft): ContractDefinition {
  const { skill: override, ...rest } = draft;
  const skill = override ?? OBJECTIVE_SKILL[draft.objective.type];
  const scrip = SCRIP_PER_TIER[cadence] * draft.tier;
  const experience = Math.max(EXPERIENCE_FLOOR[cadence], Math.round(experienceStepAt(TIER_LEVEL_FLOORS[draft.tier - 1] ?? 1) * LEVEL_SHARE[cadence]));
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
  daily({ id: 'rat-catching', name: 'Lawn Patrol', brief: 'The Commons lawns are thick with rats and the gulls are bolder every week. Thin them out.', tier: 1, requires: [arrived], objective: defeat(8, 'lawn-rat', 'courtyard-gull') }),
  daily({ id: 'allotment-watch', name: 'Seam Watch', brief: 'Feral hounds hunt along the Seam. Keep the packs off the Kestrel roads.', tier: 1, requires: [arrived], objective: defeat(6, 'feral-hound', 'lawn-rat') }),
  daily({ id: 'scrap-drive', name: 'Scrap Drive', brief: 'The Fabrication Shed is short of scrap. The piles round Kestrel Reach are free for the taking.', tier: 1, requires: [arrived], objective: gather(15, 'scrap-metal') }),
  daily({ id: 'eel-quota', name: 'Eel Quota', brief: 'The Mess wants lake eels. Check the traps.', tier: 1, requires: [arrived], objective: gather(8, 'basin-eel'), skill: 'biochemistry' }),
  daily({ id: 'bar-stock', name: 'Plate Stock', brief: 'Press scrap into plating. Every repair crew on the Span goes through it.', tier: 1, requires: [arrived], objective: craft(6, 'scrap-plating') }),
  daily({ id: 'kit-order', name: 'Kit Order', brief: 'The next cohort needs kit. Assemble scrap gear at a fabricator, any pieces.', tier: 1, requires: [arrived], objective: craft(3, ...SCRAP_GEAR), skill: 'engineering' }),
  daily({ id: 'wisp-drill', name: 'Wisp Drill', brief: 'Keep your hand in. Subdue and contain sim-wisps in the Training Yard.', tier: 1, requires: [arrived], objective: contain(3, 'sim-wisp') }),
  daily({ id: 'wire-pull', name: 'Wire Pull', brief: 'The signal crews are short of copper. Strip the old cable drums along the Seam.', tier: 2, requires: [arrived, skill('salvage', 5)], objective: gather(10, 'copper-wire') }),
  daily({ id: 'mite-control', name: 'Mite Control', brief: 'Kestrel’s practice mites are out again. Thin them before they reach the lake.', tier: 2, requires: [arrived, fought(5)], objective: defeat(8, 'grounds-mite') }),
  daily({ id: 'eel-wrangling', name: 'Furrow Clearing', brief: 'Furrow eels are spitting at the harvest crews. Put them back in the soil, one way or another.', tier: 3, requires: [arrived, fought(7)], objective: defeat(6, 'furrow-eel') }),
  daily({ id: 'dredge-quota', name: 'Dredge Quota', brief: 'Haul silt iron off the Spill bed for the Harrowgate smithy.', tier: 3, requires: [arrived, skill('salvage', 10)], objective: gather(12, 'silt-iron') }),
  daily({ id: 'reed-cutting', name: 'Reed Cutting', brief: 'The co-op wants green reeds for cloth. Cut them along the terraces.', tier: 3, requires: [arrived, skill('biochemistry', 10)], objective: gather(12, 'reed-bundle'), skill: 'biochemistry' }),
  daily({ id: 'culvert-survey', name: 'Seed Residue Survey', brief: 'Research wants fresh residue from the strained fields. It hums. Bring it anyway.', tier: 3, requires: [arrived, skill('research', 10)], objective: gather(6, 'culvert-trace'), skill: 'research' }),
  daily({ id: 'iron-pour', name: 'Ferro Rolling', brief: 'Roll silt iron into ferro plating for the Orchard fence.', tier: 3, requires: [arrived, skill('refining', 10)], objective: craft(4, 'ferro-plating') }),
  daily({ id: 'scarecoat-bagging', name: 'Coat Check', brief: 'Bag the scarecoats walking the Harrow rows. Alive, and do not try them on.', tier: 4, requires: [arrived, fought(10), skill('containment', 10)], objective: contain(2, 'scarecoat') }),
  daily({ id: 'crawler-cull', name: 'Crawler Cull', brief: 'Alley crawlers are nesting under the Halcyon overpasses. The Combine wants them gone and the Directorate wants it on record.', tier: 6, requires: [arrived, fought(18)], objective: defeat(8, 'alley-crawler') }),
  daily({ id: 'moth-jars', name: 'Moth Jars', brief: 'Catch neon moths alive for the Gallowglass study. Lure them off the signage first.', tier: 6, requires: [arrived, fought(16), skill('containment', 15)], objective: contain(3, 'neon-moth') }),
  daily({ id: 'hound-watch', name: 'Hound Watch', brief: 'Glass hounds from the Gallowglass breach are getting bolder. Break a few.', tier: 7, requires: [arrived, fought(22)], objective: defeat(6, 'glass-hound') }),
  daily({ id: 'hound-catch', name: 'Hound Catch', brief: 'Research wants glass hounds alive. Wear them down without cracking them.', tier: 7, requires: [arrived, fought(22), skill('containment', 15)], objective: contain(3, 'glass-hound') }),
  daily({ id: 'amber-survey', name: 'Amber Survey', brief: 'The Halcyon breach leaves amber residue faster than anyone can log it. Study it and bring samples.', tier: 6, requires: [arrived, skill('research', 20)], objective: gather(8, 'amber-trace'), skill: 'research' }),
  daily({ id: 'heavy-haul', name: 'Heavy Haul', brief: 'The Halcyon heaps have heavy stock in them. The Directorate wants it before the Combine does.', tier: 6, requires: [arrived, skill('salvage', 20)], objective: gather(12, 'heavy-scrap') }),
  daily({ id: 'steel-pour', name: 'Plasteel Press', brief: 'Press plasteel plating for the Gallowglass barricades.', tier: 6, requires: [arrived, skill('refining', 20)], objective: craft(4, 'plasteel-plating') }),
  daily({ id: 'kit-bench', name: 'Kit Bench', brief: 'Field teams go through kits faster than the refineries turn them out. Refine a few, any line.', tier: 6, requires: [arrived, skill('refining', 30)], objective: craft(4, 'overdrive-kit-3', 'optics-kit-3', 'tuning-kit-3') }),
  daily({ id: 'knock-shift', name: 'Knock Shift', brief: 'Mags wants the hull quiet for one night. Put down what knocks from inside it.', tier: 8, requires: [arrived, fought(28)], objective: defeat(6, 'hull-knocker') }),
  daily({ id: 'plate-salvage', name: 'Plate Salvage', brief: 'Cut hull plate off the Meridian’s scattered sections. Mind what walks in the bilge.', tier: 8, requires: [arrived, skill('salvage', 30)], objective: gather(10, 'hull-plate') }),
  daily({ id: 'wraith-tide', name: 'Bilge Run', brief: 'Bilge wraiths have walked out of the flooded decks again. Send them back.', tier: 9, requires: [arrived, fought(32)], objective: defeat(6, 'bilge-wraith') }),
  daily({ id: 'wraith-seal', name: 'Wraith Seal', brief: 'Draw bilge wraiths out of the water and seal them dry.', tier: 9, requires: [arrived, fought(32), skill('containment', 25)], objective: contain(2, 'bilge-wraith') }),
  daily({ id: 'prism-cull', name: 'Prism Cull', brief: 'Prism hounds are running down pilgrims on the Hymn Road.', tier: 10, requires: [arrived, fought(38)], objective: defeat(6, 'prism-hound', 'glass-stalker') }),
  daily({ id: 'null-rounds', name: 'Null Rounds', brief: 'Walk the Spindle rim and put down what is doing rounds in Directorate white.', tier: 12, requires: [arrived, fought(48)], objective: defeat(6, 'null-echo', 'null-stalker') }),
  daily({ id: 'range-recovery', name: 'Range Recovery', brief: 'Drill sentries have walked off the firing ranges and seam boars are rooting up the fences. Bring both back under control.', tier: 2, requires: [arrived, fought(3)], objective: defeat(8, 'drill-sentry', 'seam-boar') }),
  daily({ id: 'leech-jars', name: 'Leech Jars', brief: 'Research wants ditch leeches alive. Salt the ditch and lift them out.', tier: 3, requires: [arrived, fought(7), skill('containment', 8)], objective: contain(3, 'ditch-leech') }),
  daily({ id: 'seed-weeding', name: 'Seed Weeding', brief: 'Seed mites are sprouting along the mill steps. Weed them before they set.', tier: 4, requires: [arrived, fought(10)], objective: defeat(8, 'seed-mite', 'crop-magpie') }),
  daily({ id: 'thorn-cull', name: 'Thorn Cull', brief: 'The upper terraces are thick with thornbacks and barn crawlers. The co-op wants the rows walkable by harvest.', tier: 5, requires: [arrived, fought(14)], objective: defeat(6, 'thornback', 'barn-crawler') }),
  daily({ id: 'still-air', name: 'Still Air', brief: 'Bag windpump wights on a calm day, while they cannot turn.', tier: 5, requires: [arrived, fought(14), skill('containment', 16)], objective: contain(2, 'windpump-wight') }),
  daily({ id: 'billboard-blackout', name: 'Billboard Blackout', brief: 'Ad-wraiths and holo-shills are working the Halcyon crowds. Switch them off.', tier: 7, requires: [arrived, fought(20)], objective: defeat(6, 'ad-wraith', 'holo-shill') }),
  daily({ id: 'vent-jars', name: 'Vent Jars', brief: 'Vent moths are cooking the arcology ducts. Shut the vents and jar them.', tier: 7, requires: [arrived, fought(22), skill('containment', 20)], objective: contain(3, 'vent-moth') }),
  daily({ id: 'core-recovery', name: 'Core Recovery', brief: 'Knock rustlings down to their cores and bring the cores back sealed.', tier: 8, requires: [arrived, fought(26), skill('containment', 25)], objective: contain(2, 'rustling') }),
  daily({ id: 'crab-pots', name: 'Crab Pots', brief: 'Ballast crabs are walking out of the flooded tanks onto the haul roads. Put them back.', tier: 8, requires: [arrived, fought(26)], objective: defeat(6, 'ballast-crab') }),
  daily({ id: 'roll-call', name: 'Roll Call', brief: 'Misprints are standing in for the missing at Tallow. Dismiss them.', tier: 9, requires: [arrived, fought(32)], objective: defeat(6, 'misprint') }),
  daily({ id: 'shard-catch', name: 'Shard Catch', brief: 'Gather shard wisps whole off the steppe. Leave no piece behind.', tier: 10, requires: [arrived, fought(38), skill('containment', 40)], objective: contain(2, 'shard-wisp', 'glass-stalker') }),
  daily({ id: 'hymn-breaking', name: 'Hymn Breaking', brief: 'The Choir is singing on the high steppe again. Break the hymn.', tier: 11, requires: [arrived, fought(43)], objective: defeat(6, 'choir-echo', 'red-twin') }),
  daily({ id: 'twin-cells', name: 'Twin Cells', brief: 'Separate red twins by sound and seal each half in its own cell.', tier: 11, requires: [arrived, fought(43), skill('containment', 35)], objective: contain(2, 'red-twin') }),
  daily({ id: 'breaker-detail', name: 'Breaker Detail', brief: 'Cell-breakers and coolant wraiths are holding the Spindle rim. Clear a path.', tier: 12, requires: [arrived, fought(48)], objective: defeat(6, 'cell-breaker', 'coolant-wraith') }),
  daily({ id: 'cryo-seal', name: 'Cryo Seal', brief: 'Drain the channels and seal coolant wraiths dry.', tier: 12, requires: [arrived, fought(48), skill('containment', 48)], objective: contain(2, 'coolant-wraith') }),
  daily({ id: 'filing-error', name: 'Filing Error', brief: 'Null stalkers and clerks are filing the whole Spindle under breach. Correct the record.', tier: 13, requires: [arrived, fought(53)], objective: defeat(6, 'null-stalker', 'clerk-of-null') }),
  daily({ id: 'audit-trail', name: 'Audit Trail', brief: 'Seal clerks of Null and null stalkers while they are busy with their forms.', tier: 13, requires: [arrived, fought(53), skill('containment', 52)], objective: contain(2, 'clerk-of-null', 'null-stalker') }),
  weekly({ id: 'pest-control', name: 'Reach Pest Control', brief: 'A week keeping Kestrel Reach clear of rats, gulls and hounds.', tier: 1, requires: [arrived], objective: defeat(30, 'lawn-rat', 'courtyard-gull', 'feral-hound') }),
  weekly({ id: 'stockpile', name: 'Scrap Stockpile', brief: 'The Directorate is building a reserve. Salvage scrap from the piles round Kestrel.', tier: 1, requires: [arrived], objective: gather(60, 'scrap-metal') }),
  weekly({ id: 'cut-sweep', name: 'Terrace Sweep', brief: 'A week keeping the Harrow terraces clear of eels and magpies.', tier: 3, requires: [arrived, fought(7)], objective: defeat(40, 'furrow-eel', 'crop-magpie') }),
  weekly({ id: 'yard-sweep', name: 'Overpass Sweep', brief: 'A week breaking up crawlers and moths across Halcyon.', tier: 6, requires: [arrived, fought(18)], objective: defeat(40, 'alley-crawler', 'neon-moth') }),
  weekly({ id: 'fringe-sweep', name: 'Wreck Sweep', brief: 'A week holding the Wreckfield against knockers and rustlings.', tier: 8, requires: [arrived, fought(28)], objective: defeat(40, 'hull-knocker', 'rustling') }),
  weekly({ id: 'rivet-haul', name: 'Rivet Haul', brief: 'The Directorate wants the Meridian’s rivets. All of them, eventually. Start with twenty.', tier: 9, requires: [arrived, skill('salvage', 35)], objective: gather(20, 'hull-rivets') }),
  weekly({ id: 'trace-ledger', name: 'Trace Ledger', brief: 'Research wants a week of samples: seed residue, amber, anything that hums.', tier: 6, requires: [arrived, skill('research', 10)], objective: gather(30, 'culvert-trace', 'amber-trace'), skill: 'research' }),
  weekly({ id: 'refinery-shift', name: 'Refinery Shift', brief: 'Put in a full week on the refinery.', tier: 1, requires: [arrived], objective: craft(20, 'scrap-plating') }),
  weekly({ id: 'terrace-hold', name: 'Terrace Hold', brief: 'A week holding the upper Harrow terraces against thornbacks, wights and barn crawlers.', tier: 5, requires: [arrived, fought(14)], objective: defeat(40, 'thornback', 'windpump-wight', 'barn-crawler') }),
  weekly({ id: 'deck-sweep', name: 'Deck Sweep', brief: 'A week clearing the Meridian’s flooded decks of wraiths, misprints and crabs.', tier: 9, requires: [arrived, fought(32)], objective: defeat(40, 'bilge-wraith', 'misprint', 'ballast-crab') }),
  weekly({ id: 'steppe-sweep', name: 'Steppe Sweep', brief: 'A week keeping the Hymn Road open through hounds, stalkers and shard wisps.', tier: 10, requires: [arrived, fought(38)], objective: defeat(40, 'prism-hound', 'glass-stalker', 'shard-wisp') }),
  weekly({ id: 'choir-sweep', name: 'Choir Sweep', brief: 'A week silencing the high steppe, one echo and one twin at a time.', tier: 11, requires: [arrived, fought(43)], objective: defeat(40, 'choir-echo', 'red-twin') }),
  weekly({ id: 'rim-sweep', name: 'Rim Sweep', brief: 'A week walking the Spindle rim against echoes, breakers and coolant wraiths.', tier: 12, requires: [arrived, fought(48)], objective: defeat(40, 'null-echo', 'cell-breaker', 'coolant-wraith') }),
  weekly({ id: 'spindle-sweep', name: 'Spindle Sweep', brief: 'A week on the upper Spindle. Everything up there is doing rounds; do yours.', tier: 13, requires: [arrived, fought(53)], objective: defeat(40, 'null-stalker', 'clerk-of-null') }),
  weekly({ id: 'keeper-pruning', name: 'Pruning Season', brief: 'The Orchard Keeper keeps growing back. Cut it down three times this week.', tier: 5, requires: [arrived, fought(16)], objective: defeat(3, 'orchard-keeper') }),
  weekly({ id: 'brightly-ratings', name: 'Falling Ratings', brief: 'Mr Brightly is back on every screen in the undercity. Take him off the air, three times.', tier: 7, requires: [arrived, fought(25)], objective: defeat(3, 'mr-brightly') }),
  weekly({ id: 'cohort-dismissed', name: 'Cohort Dismissed', brief: 'The Cohort reforms on the Parade Ground every few days. Dismiss it three times.', tier: 9, requires: [arrived, fought(35)], objective: defeat(3, 'the-cohort') }),
  weekly({ id: 'precentor-silence', name: 'A Minute’s Silence', brief: 'Stop the Precentor’s hymn three times this week.', tier: 11, requires: [arrived, fought(45)], objective: defeat(3, 'the-precentor') }),
  weekly({ id: 'warden-review', name: 'Review the Reviewer', brief: 'The Warden of Null keeps reopening its review. Close it three times.', tier: 13, requires: [arrived, fought(55)], objective: defeat(3, 'warden-of-null') }),
  weekly({ id: 'keter-docket', name: 'Keter Docket', brief: 'Research wants keter-class specimens for the deep cells. Five of them, sealed.', tier: 12, requires: [arrived, fought(46), skill('containment', 35)], objective: contain(5, 'red-twin', 'coolant-wraith', 'null-stalker', 'mr-brightly', 'the-precentor', 'warden-of-null') }),
];
