import type { CraftingStation } from '../../crafting/recipes.ts';
import type { GatheringSource } from '../../crafting/gathering.ts';
import type { SkillId } from '../../character/skills.ts';
import type { WorldObjectDefinition, WorldObjectModel } from '../../world/entities.ts';
import { DRESSING_THEMES } from '../prefabs/types.ts';

const spot = (id: string, name: string, examine: string, model: WorldObjectModel, verb: string, gather: Omit<GatheringSource, 'attemptTicks'> & { readonly attemptTicks?: number }, blocksMovement = true): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model,
  blocksMovement,
  furnishing: { mount: 'free', homes: DRESSING_THEMES },
  interactions: [{ verb, effects: [], gather: { attemptTicks: 4, ...gather } }],
});

const source = (skill: SkillId, level: number, itemId: string, experience: number, progressVerb: string, charges = 4, respawnTicks = 40) => ({ skill, level, itemId, experience, progressVerb, charges, respawnTicks });

const station = (id: string, name: string, examine: string, model: WorldObjectModel, kind: CraftingStation, verb: string): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model,
  blocksMovement: true,
  furnishing: { mount: 'free', homes: ['shop', 'works', 'industrial', 'lab', 'street', 'office'] },
  interactions: [{ verb, effects: [{ type: 'openCrafting', station: kind }] }],
});

export const WARD_SPOTS: readonly WorldObjectDefinition[] = [
  spot('scrap-pile', 'Scrap Pile', 'A heap of bent metal somebody left for anyone who wants it.', 'scrapPile', 'Salvage', source('salvage', 1, 'scrap-metal', 10, 'Salvaging')),
  spot('dredge-spot', 'Dredge Winch', 'A rusty winch over the basin. Drop the hook, haul up silt and whatever is in it.', 'dredgeWinch', 'Dredge', source('salvage', 10, 'silt-iron', 24, 'Dredging', 5, 50)),
  spot('eel-trap', 'Eel Trap', 'A wicker trap on a rope, hung off the quay.', 'eelTrap', 'Check', source('biochemistry', 1, 'basin-eel', 10, 'Checking the trap', 3, 40)),
  spot('reed-bed', 'Reed Bed', 'Tough reeds growing thick along the canal bank.', 'reedBed', 'Cut', source('biochemistry', 10, 'reed-bundle', 22, 'Cutting reeds', 5, 50)),
  spot('faint-trace', 'Faint Trace', 'A smear of glowing dust where something passed through.', 'anomalyTrace', 'Study', source('research', 1, 'trace-dust', 12, 'Studying the trace', 3, 60), false),
  spot('culvert-trace', 'Culvert Trace', 'A bright smear of residue on the culvert stones. It hums.', 'anomalyTrace', 'Study', source('research', 10, 'culvert-trace', 26, 'Studying the trace', 3, 70), false),
  spot('culture-bench', 'Culture Bench', 'A lab bench of trays growing pale fibre. Nobody minds if you harvest it.', 'labBench', 'Harvest', source('biochemistry', 20, 'lab-culture', 44, 'Harvesting culture', 4, 60)),
  spot('amber-trace', 'Amber Trace', 'A warm amber smear on the holding-cell floor.', 'anomalyTrace', 'Study', source('research', 20, 'amber-trace', 46, 'Studying the trace', 3, 70), false),
  spot('wreck-plate', 'Wreck Plate', 'Ship plate peeled off a wreck on the slipway. Cut it free.', 'scrapPile', 'Salvage', source('salvage', 30, 'hull-plate', 70, 'Cutting plate', 4, 70)),
  spot('tide-weed', 'Tide Weed', 'Dark weed swaying in the shallows, against the current.', 'reedBed', 'Cut', source('biochemistry', 30, 'tide-weed', 66, 'Cutting weed', 4, 70)),
  spot('hull-trace', 'Hull Trace', 'A violet smear on the slipway. It knocks if you put your ear to it.', 'anomalyTrace', 'Study', source('research', 30, 'hull-trace', 68, 'Studying the trace', 3, 80), false),
  spot('directorate-salvage', 'Breached Fittings', 'Cell fittings and pale panel, torn loose. Salvage what you can carry.', 'scrapPile', 'Salvage', source('salvage', 40, 'directorate-salvage', 100, 'Salvaging', 4, 80)),
  spot('red-moss', 'Red Moss', 'Moss as red as the warning lights. It leans towards the cells.', 'reedBed', 'Harvest', source('biochemistry', 40, 'red-moss', 96, 'Harvesting moss', 4, 80)),
  spot('red-trace', 'Red Trace', 'A cold red smear. It goes quiet when you look at it.', 'anomalyTrace', 'Study', source('research', 40, 'red-trace', 100, 'Studying the trace', 3, 90), false),
  spot('vault-residue', 'Vault Residue', 'Black glassy crust on the Vault floor. Your reflection in it is late.', 'scrapPile', 'Salvage', source('salvage', 50, 'vault-residue', 140, 'Salvaging', 4, 90)),
  spot('vault-bloom', 'Vault Bloom', 'Pale flowers in the dark, all turned towards you.', 'reedBed', 'Harvest', source('biochemistry', 50, 'vault-bloom', 136, 'Harvesting bloom', 4, 90)),
  spot('vault-trace', 'Vault Trace', 'A bright blue residue. It pulses slowly, like breathing.', 'anomalyTrace', 'Study', source('research', 50, 'vault-trace', 140, 'Studying the trace', 3, 100), false),
];

export const SCRAP_HEAP_SALVAGE = { verb: 'Salvage', effects: [], gather: { attemptTicks: 5, ...source('salvage', 20, 'heavy-scrap', 42, 'Salvaging', 5, 60) } } as const;

export const WARD_STATIONS: readonly WorldObjectDefinition[] = [
  station('ward-refinery', 'Refinery', 'A brick furnace. Fenwick lets anyone use it, for a nod.', 'refinery', 'refinery', 'Refine'),
  station('ward-fabricator', 'Fabricator', 'A workbench with a press arm and a lot of clamps.', 'fabricator', 'fabricator', 'Assemble'),
  station('ward-synthesiser', 'Synthesiser', 'Two glass vats, a burner and a lot of tubing.', 'synthesiser', 'synthesiser', 'Synthesise'),
];

export const ALLOTMENT_HARVEST = { verb: 'Harvest', effects: [], gather: { attemptTicks: 4, ...source('biochemistry', 1, 'allotment-greens', 10, 'Harvesting', 3, 50) } } as const;
