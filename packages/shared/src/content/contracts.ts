import { experienceForLevel, SKILL_INFO, type SkillId } from '../character/skills.ts';
import { COMMENDATION_ITEM_ID, type ContractCadence, type ContractDefinition, type ContractObjective } from '../contracts/contract.ts';
import { TIER_LEVEL_FLOORS } from '../crafting/tiers.ts';
import { CURRENCY_ITEM_ID } from '../economy/shop.ts';
import type { Condition } from '../rules/conditions.ts';

interface ContractDraft {
  readonly id: string;
  readonly name: string;
  readonly brief: string;
  readonly tier: number;
  readonly requires: readonly Condition[];
  readonly objective: ContractObjective;
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

const levelStepAt = (level: number): number => experienceForLevel(level + 1) - experienceForLevel(level);

function contract(cadence: ContractCadence, draft: ContractDraft): ContractDefinition {
  const skill = OBJECTIVE_SKILL[draft.objective.type];
  const scrip = SCRIP_PER_TIER[cadence] * draft.tier;
  const experience = Math.round(levelStepAt(TIER_LEVEL_FLOORS[draft.tier - 1] ?? 1) * LEVEL_SHARE[cadence]);
  const commendations = COMMENDATIONS[cadence] + Math.floor(draft.tier / 3) * (cadence === 'daily' ? 1 : 3);
  return {
    ...draft,
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

const cleared: Condition = { type: 'questCompleted', questId: 'cleared-for-transit' };
const fought = (atLeast: number): Condition => ({ type: 'combatLevel', atLeast });
const skill = (id: SkillId, atLeast: number): Condition => ({ type: 'skillLevel', skill: id, atLeast });
const after = (questId: string): Condition => ({ type: 'questCompleted', questId });

const defeat = (count: number, ...creatureIds: string[]): ContractObjective => ({ type: 'defeat', creatureIds, count });
const contain = (count: number, ...creatureIds: string[]): ContractObjective => ({ type: 'contain', creatureIds, count });
const gather = (count: number, ...itemIds: string[]): ContractObjective => ({ type: 'gather', itemIds, count });
const craft = (count: number, ...itemIds: string[]): ContractObjective => ({ type: 'craft', itemIds, count });

export const CONTRACTS: readonly ContractDefinition[] = [
  daily({ id: 'yard-sweep', name: 'Yard Sweep', brief: 'Scrap drones keep rebuilding themselves out of the Service Yards. Put them back in pieces.', tier: 1, requires: [cleared], objective: defeat(8, 'scrap-drone') }),
  daily({ id: 'mite-control', name: 'Mite Control', brief: 'Gloam mites are chewing through cable insulation again. Thin them out.', tier: 1, requires: [cleared], objective: defeat(10, 'gloam-mite') }),
  daily({ id: 'scrap-quota', name: 'Scrap Quota', brief: 'Requisitions is short of raw alloy. Pull it from the heaps in the Service Yards.', tier: 1, requires: [cleared], objective: gather(20, 'scrap-alloy') }),
  daily({ id: 'moss-harvest', name: 'Moss Harvest', brief: 'Medbay needs gloam moss for gel base. Bring in a fresh harvest.', tier: 1, requires: [cleared], objective: gather(15, 'gloam-moss') }),
  daily({ id: 'plate-run', name: 'Plate Run', brief: 'Press alloy plate at any refinery. The bulkhead crews go through it by the crate.', tier: 1, requires: [cleared], objective: craft(10, 'alloy-plate') }),
  daily({ id: 'gel-batch', name: 'Gel Batch', brief: 'Refine gel base for the synthesisers. Medbay will thank you, eventually.', tier: 1, requires: [cleared], objective: craft(8, 'gel-base') }),

  daily({ id: 'pruning-duty', name: 'Pruning Duty', brief: 'Hydroponics wants its walkways back from the thorn crawlers.', tier: 2, requires: [cleared, fought(4)], objective: defeat(8, 'thorn-crawler') }),
  daily({ id: 'spore-count', name: 'Spore Count', brief: 'Spore drifters are clouding the Hydroponics filters. Pop them before they bloom.', tier: 2, requires: [cleared, fought(6)], objective: defeat(6, 'spore-drifter') }),
  daily({ id: 'vine-stripping', name: 'Vine Stripping', brief: 'Strip strangler vine for fibre. Wear gloves. Wear two pairs.', tier: 2, requires: [cleared, skill('salvage', 4)], objective: gather(15, 'vine-fibre') }),
  daily({ id: 'resin-tap', name: 'Resin Tap', brief: 'Tap polymer resin from the old drums before it sets in the barrels for good.', tier: 2, requires: [cleared, skill('salvage', 3)], objective: gather(15, 'polymer-resin') }),
  daily({ id: 'cord-order', name: 'Cord Order', brief: 'Braid vine fibre into cord. Every lift on site hangs from something.', tier: 2, requires: [cleared, skill('refining', 4)], objective: craft(8, 'braided-cord') }),

  daily({ id: 'leech-purge', name: 'Leech Purge', brief: 'Pipe leeches have found the warm lines again. Clear the culverts and the Undercroft.', tier: 3, requires: [cleared, fought(5)], objective: defeat(10, 'pipe-leech') }),
  daily({ id: 'hound-cull', name: 'Hound Cull', brief: 'Rust hounds are running the Undercroft in packs. Break the packs up.', tier: 3, requires: [after('the-knocking'), fought(8)], objective: defeat(8, 'rust-hound') }),
  daily({ id: 'skimmer-sweep', name: 'Skimmer Sweep', brief: 'Silt skimmers are clogging the Waterworks intakes. Pumpwright Ngata wants them gone.', tier: 3, requires: [cleared, fought(6)], objective: defeat(10, 'silt-skimmer', 'sump-bloat') }),
  daily({ id: 'filament-pull', name: 'Filament Pull', brief: 'Strip conductive filament from severed conduits. Mind the live ends.', tier: 3, requires: [cleared, skill('salvage', 5)], objective: gather(15, 'conductive-filament') }),
  daily({ id: 'slag-haul', name: 'Slag Haul', brief: 'The smelters need ferrous slag. The Undercroft has plenty and does not want to give it up.', tier: 3, requires: [after('the-knocking'), skill('salvage', 10)], objective: gather(12, 'ferrous-slag') }),
  daily({ id: 'steel-pour', name: 'Steel Pour', brief: 'Refine hardened steel for the new bulkhead frames.', tier: 3, requires: [cleared, skill('refining', 10)], objective: craft(6, 'hardened-steel') }),

  daily({ id: 'thaw-patrol', name: 'Thaw Patrol', brief: 'The Cryovault is waking things that should stay frozen. Put them back to sleep.', tier: 4, requires: [after('a-council-of-one'), fought(12)], objective: defeat(8, 'frost-moth', 'rime-husk') }),
  daily({ id: 'rime-chipping', name: 'Rime Chipping', brief: 'Chip frost crystal from the split cryo lines.', tier: 4, requires: [after('a-council-of-one'), skill('salvage', 12)], objective: gather(12, 'frost-crystal') }),
  daily({ id: 'rime-alloy', name: 'Rime Alloy Order', brief: 'Deepwatch needs rime alloy for its pressure doors.', tier: 4, requires: [after('a-council-of-one'), skill('refining', 12)], objective: craft(5, 'rime-alloy') }),

  daily({ id: 'array-maintenance', name: 'Array Maintenance', brief: 'The Signal Array crew are still on shift. Relieve them, permanently.', tier: 5, requires: [after('cold-storage'), fought(16)], objective: defeat(8, 'relay-sentinel', 'echo-operator') }),
  daily({ id: 'copper-strip', name: 'Copper Strip', brief: 'Strip signal copper from the trunk lines before the carrier tone gets into your head.', tier: 5, requires: [after('cold-storage'), skill('salvage', 16)], objective: gather(12, 'signal-copper') }),
  daily({ id: 'relay-weave', name: 'Relay Weave Order', brief: 'Weave relay cloth for Deepwatch radio shielding.', tier: 5, requires: [after('cold-storage'), skill('refining', 16)], objective: craft(5, 'relay-weave') }),

  daily({ id: 'stack-clearance', name: 'Stack Clearance', brief: 'Clear ink eels and redactors from the Drowned Archive reading rooms.', tier: 6, requires: [after('dead-air'), fought(20)], objective: defeat(8, 'ink-eel', 'redactor') }),
  daily({ id: 'vellum-salvage', name: 'Vellum Salvage', brief: 'Recover archival vellum from the slumped stacks.', tier: 6, requires: [after('dead-air'), skill('salvage', 20)], objective: gather(12, 'archival-vellum', 'black-ink') }),
  daily({ id: 'vellum-weave', name: 'Vellum Weave Order', brief: 'Weave archival vellum into something that will hold a seal.', tier: 6, requires: [after('dead-air'), skill('refining', 20)], objective: craft(5, 'vellum-weave') }),

  daily({ id: 'gallery-sweep', name: 'Gallery Sweep', brief: 'Cinder wisps and slag golems are crowding the Furnace galleries.', tier: 7, requires: [after('original-contract'), fought(25)], objective: defeat(8, 'cinder-wisp', 'slag-golem') }),
  daily({ id: 'ember-mining', name: 'Ember Mining', brief: 'Mine ember ore from the reactor galleries. Sleeves down.', tier: 7, requires: [after('original-contract'), skill('salvage', 25)], objective: gather(12, 'ember-ore') }),
  daily({ id: 'furnace-steel', name: 'Furnace Steel Order', brief: 'Refine furnace steel for the Threshold scaffolds.', tier: 7, requires: [after('original-contract'), skill('refining', 25)], objective: craft(5, 'furnace-steel') }),

  daily({ id: 'below-patrol', name: 'Below Patrol', brief: 'Push back the hollow operatives and knocklings in Meridian Below.', tier: 8, requires: [after('stoking-the-fire'), fought(31)], objective: defeat(8, 'hollow-operative', 'knockling') }),
  daily({ id: 'mirror-chipping', name: 'Mirror Chipping', brief: 'Chip mirror glass from the far-side outcrops. Do not make eye contact.', tier: 8, requires: [after('stoking-the-fire'), skill('salvage', 30)], objective: gather(10, 'mirror-glass') }),
  daily({ id: 'mirror-alloy', name: 'Mirror Alloy Order', brief: 'Refine mirror alloy for the Threshold wards.', tier: 8, requires: [after('stoking-the-fire'), skill('refining', 30)], objective: craft(4, 'mirror-alloy') }),

  daily({ id: 'dead-letters', name: 'Return to Sender', brief: 'Clear franking clerks and courier echoes from the Dead Letter Office.', tier: 9, requires: [after('the-ninth-letter'), fought(35)], objective: defeat(8, 'franking-clerk', 'courier-echo') }),
  daily({ id: 'seal-alloy', name: 'Seal Alloy Order', brief: 'Refine seal alloy or letter weave for the last tier of seals.', tier: 9, requires: [after('the-ninth-letter'), skill('refining', 35)], objective: craft(4, 'seal-alloy', 'letter-weave') }),

  weekly({ id: 'pest-control', name: 'Site-wide Pest Control', brief: 'A week of keeping the upper Site clear of drones, mites and crawlers.', tier: 1, requires: [cleared], objective: defeat(40, 'scrap-drone', 'gloam-mite', 'thorn-crawler', 'spore-drifter') }),
  weekly({ id: 'stockpile', name: 'Stockpile Drive', brief: 'Requisitions is building a reserve. Bring in raw salvage of any kind from the upper Site.', tier: 1, requires: [cleared], objective: gather(80, 'scrap-alloy', 'synthweave-offcut', 'gloam-moss', 'polymer-resin', 'vine-fibre') }),
  weekly({ id: 'refinery-shift', name: 'Refinery Shift', brief: 'Put in a full week on the refinery line.', tier: 1, requires: [cleared], objective: craft(30, 'alloy-plate', 'synthweave-bolt', 'gel-base', 'polymer-sheet', 'braided-cord') }),
  weekly({ id: 'warden-recall', name: 'Warden Recall', brief: 'The Hollow Warden has re-formed in Sector 2. Contain it again and file the paperwork.', tier: 2, requires: [after('the-knocking'), skill('containment', 4)], objective: contain(1, 'hollow-warden') }),
  weekly({ id: 'undercroft-sweep', name: 'Undercroft Sweep', brief: 'A week clearing leeches, hounds and skimmers from the lower works.', tier: 3, requires: [cleared, fought(7)], objective: defeat(35, 'pipe-leech', 'rust-hound', 'silt-skimmer', 'sump-bloat') }),
  weekly({ id: 'foreman-recall', name: 'Foreman Recall', brief: 'The Foreman is back on the clock. Contain it.', tier: 3, requires: [after('the-knocking'), skill('containment', 10)], objective: contain(1, 'the-foreman') }),
  weekly({ id: 'mother-recall', name: 'Sump Mother Recall', brief: 'The outfall has a new Sump Mother. Contain her before she breeds.', tier: 3, requires: [cleared, skill('containment', 11)], objective: contain(1, 'sump-mother') }),
  weekly({ id: 'deep-survey', name: 'Deep Survey', brief: 'A week of fieldwork in the Cryovault and the Signal Array.', tier: 4, requires: [after('a-council-of-one'), fought(12)], objective: defeat(30, 'frost-moth', 'rime-husk', 'relay-sentinel', 'echo-operator') }),
  weekly({ id: 'curator-recall', name: 'Curator Recall', brief: 'The Curator has rearranged the Cryovault again. Contain it.', tier: 4, requires: [after('cold-storage'), skill('containment', 16)], objective: contain(1, 'the-curator') }),
  weekly({ id: 'choir-recall', name: 'Choir Recall', brief: 'The Choir is singing on the dish gantry. Contain it.', tier: 5, requires: [after('dead-air'), skill('containment', 21)], objective: contain(1, 'the-choir') }),
  weekly({ id: 'archive-recall', name: 'Archivist Recall', brief: 'The Last Archivist has reopened the sealed reading room. Contain it.', tier: 6, requires: [after('original-contract'), skill('containment', 26)], objective: contain(1, 'last-archivist') }),
  weekly({ id: 'deep-haul', name: 'Deep Haul', brief: 'A week of hauling deep materials up to Deepwatch.', tier: 6, requires: [after('dead-air'), skill('salvage', 20)], objective: gather(50, 'archival-vellum', 'black-ink', 'ember-ore', 'mirror-glass') }),
  weekly({ id: 'stoker-recall', name: 'Stoker Recall', brief: 'The Stoker is feeding the reactor again. Contain it.', tier: 7, requires: [after('stoking-the-fire'), skill('containment', 31)], objective: contain(1, 'the-stoker') }),
  weekly({ id: 'host-recall', name: 'Host Recall', brief: 'The Host is waiting at the Front Door. Contain it.', tier: 8, requires: [after('the-answer'), skill('containment', 37)], objective: contain(1, 'the-host') }),
  weekly({ id: 'postmaster-recall', name: 'Postmaster Recall', brief: 'The Postmaster is sorting again. Contain it.', tier: 9, requires: [after('dead-letter-office'), skill('containment', 40)], objective: contain(1, 'the-postmaster') }),
];
