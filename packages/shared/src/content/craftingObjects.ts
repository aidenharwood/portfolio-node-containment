import type { GatheringSource } from '../crafting/gathering.ts';
import { STATION_INFO, type CraftingStation } from '../crafting/recipes.ts';
import type { WorldObjectDefinition, WorldObjectModel } from '../world/entities.ts';

const resourceNode = (
  id: string,
  name: string,
  examine: string,
  model: WorldObjectModel,
  verb: string,
  gather: Omit<GatheringSource, 'skill'>,
): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model,
  blocksMovement: true,
  interactions: [{ verb, effects: [], gather: { skill: 'salvage', ...gather } }],
});

const station = (
  id: string,
  station: CraftingStation,
  examine: string,
  model: WorldObjectModel,
  light: string,
): WorldObjectDefinition => ({
  id,
  name: STATION_INFO[station].name,
  examine,
  model,
  blocksMovement: true,
  light: { radius: 2.5, color: light, intensity: 0.7 },
  interactions: [{ verb: STATION_INFO[station].verb, effects: [{ type: 'openCrafting', station }] }],
});

export const RESOURCE_NODES: readonly WorldObjectDefinition[] = [
  resourceNode('scrap-heap', 'Scrap Heap', 'A heap of stripped plating and bent brackets. Requisitions calls it "inventory".', 'scrapHeap', 'Salvage', {
    level: 1,
    itemId: 'scrap-alloy',
    experience: 10,
    attemptTicks: 3,
    charges: 6,
    respawnTicks: 30,
    progressVerb: 'Salvaging',
  }),
  resourceNode('textile-bin', 'Textile Recycling Bin', 'Retired uniforms, waiting to be something else.', 'textileBin', 'Sort', {
    level: 1,
    itemId: 'synthweave-offcut',
    experience: 10,
    attemptTicks: 3,
    charges: 6,
    respawnTicks: 30,
    progressVerb: 'Sorting',
  }),
  resourceNode('moss-bed', 'Gloam Moss Bed', 'A licensed hydroponic tray of gloam moss. The licence is taped to the side, upside down.', 'mossBed', 'Harvest', {
    level: 1,
    itemId: 'gloam-moss',
    experience: 10,
    attemptTicks: 3,
    charges: 5,
    respawnTicks: 35,
    progressVerb: 'Harvesting',
  }),
  resourceNode('resin-drum', 'Resin Drum', 'A drum of slow-setting polymer resin. Scrape from the rim, not the middle.', 'resinDrum', 'Scrape', {
    level: 3,
    itemId: 'polymer-resin',
    experience: 16,
    attemptTicks: 4,
    charges: 5,
    respawnTicks: 40,
    progressVerb: 'Scraping',
  }),
  resourceNode('severed-conduit', 'Severed Conduit', 'A ruptured cable run, still sparking. Somebody chewed through it. Something.', 'severedConduit', 'Strip', {
    level: 5,
    itemId: 'conductive-filament',
    experience: 26,
    attemptTicks: 4,
    charges: 5,
    respawnTicks: 45,
    progressVerb: 'Stripping',
  }),
  resourceNode('spore-bloom', 'Lumen Bloom', 'A bloom of luminous fungus pushing through the floor seams. It leans towards warm bodies.', 'sporeBloom', 'Harvest', {
    level: 6,
    itemId: 'lumen-spores',
    experience: 30,
    attemptTicks: 4,
    charges: 4,
    respawnTicks: 50,
    progressVerb: 'Harvesting',
  }),
  resourceNode('strangler-vine', 'Strangler Vine', 'A thick vine wrapped around a planter frame, slowly tightening. It flinches when you look at it.', 'stranglerVine', 'Cut', {
    level: 4,
    itemId: 'vine-fibre',
    experience: 22,
    attemptTicks: 4,
    charges: 5,
    respawnTicks: 45,
    progressVerb: 'Cutting',
  }),
  resourceNode('slag-heap', 'Slag Heap', 'Cooled runoff from the old Undercroft smelters. Heavy, sharp and worth the effort.', 'slagHeap', 'Salvage', {
    level: 10,
    itemId: 'ferrous-slag',
    experience: 48,
    attemptTicks: 5,
    charges: 4,
    respawnTicks: 60,
    progressVerb: 'Salvaging',
  }),
];

export const CRAFTING_STATIONS_OBJECTS: readonly WorldObjectDefinition[] = [
  station('refinery', 'refinery', 'A compact smelter, press and loom in one housing. Raw salvage goes in; base parts come out.', 'refinery', '#ff9a4d'),
  station('fabricator', 'fabricator', 'A gantry assembler that turns base parts into issued equipment, given patterns and patience.', 'fabricator', '#4fd8ff'),
  station('synthesiser', 'synthesiser', 'A sealed bio-synthesiser for compounding field medicine. Smells of mint and antiseptic.', 'synthesiser', '#7cf29a'),
];

export const STORAGE_LOCKER: WorldObjectDefinition = {
  id: 'storage-locker',
  name: 'Personal Storage',
  examine: 'A biometric storage locker linked to your personnel file. Every locker on site opens onto the same shelves. Nobody can explain how.',
  model: 'storageLocker',
  blocksMovement: true,
  light: { radius: 1.8, color: '#4fd8ff', intensity: 0.5 },
  interactions: [{ verb: 'Open', effects: [{ type: 'openStorage' }] }],
};

export const CRAFTING_OBJECTS: readonly WorldObjectDefinition[] = [...RESOURCE_NODES, ...CRAFTING_STATIONS_OBJECTS, STORAGE_LOCKER];
