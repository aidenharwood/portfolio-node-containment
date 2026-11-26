import type { TilePoint } from '../../world/geometry.ts';
import type { WorldObjectDefinition, WorldObjectModel } from '../../world/entities.ts';
import type { FurnishingProfile } from '../furnishingCatalogue.ts';
import type { FurnishingKit } from '../furnishingKit.ts';
import { prefab, type Prefab } from '../prefabs/types.ts';
import { landmark, LANDMARK_HOMES, prop } from '../catalog/landmarks.ts';
import { SPAN_CONTAINMENT_PROPS, SPAN_STREET_PROPS } from './kits.ts';

const tall = { mount: 'free', homes: LANDMARK_HOMES } as const;

export const SPAN_LANDMARKS: readonly WorldObjectDefinition[] = [
  prop({ id: 'kestrel-headframe', name: 'Kestrel Headframe', examine: 'The white winding tower over Site Kestrel. The wheel turns once an hour whether or not the lift moves, and every recruit learns to tell the time by it.', model: 'headframe', footprint: { width: 2, height: 2 }, light: { radius: 8, color: '#e8f2ff', intensity: 1 }, furnishing: tall }),
  prop({ id: 'commons-clock', name: 'Commons Clock', examine: 'The clock over Kestrel Commons. It shows ship time, colony time and Span time, and none of them agree.', model: 'clockTower', footprint: { width: 2, height: 2 }, light: { radius: 6, color: '#ffe2a8', intensity: 0.9 }, furnishing: tall }),
  prop({ id: 'cohort-bell', name: 'Cohort Bell', examine: 'A resonator in a lattice mast at the end of the Recruit Lines, rung once for every cohort that passes out. There is a gap in the list of names under it.', model: 'bellTower', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: [...LANDMARK_HOMES, 'civic', 'chapel'] } }),
  prop({ id: 'harrow-windpump', name: 'Harrow Windpump', examine: 'The great windpump that lifts water up the terraces. The blades turn in no wind at all; the Span breathes along its length.', model: 'windpump', footprint: { width: 2, height: 2 }, furnishing: tall }),
  prop({ id: 'grain-silo', name: 'Co-op Silo', examine: 'The Harrowgate co-op silo, painted with every harvest since the landing. The last three years are painted over in Orchard green.', model: 'coolingTower', footprint: { width: 3, height: 3 }, furnishing: tall }),
  prop({ id: 'orchard-gantry', name: 'Seed Gantry', examine: 'The gantry over Site Orchard’s seed vault. The hoist chains are wrapped in vine, and the vine is in flower.', model: 'gantryCrane', footprint: { width: 3, height: 3 }, light: { radius: 5, color: '#b6ff4f', intensity: 0.7 }, furnishing: tall }),
  prop({ id: 'aurelian-spire', name: 'Aurelian Spire', examine: 'The Aurelian Combine’s tower, forty floors of glass with every window lit. The top ten floors have not answered a call in a month.', model: 'directorateSpire', modelScale: 1.4, footprint: { width: 3, height: 3 }, light: { radius: 7, color: '#ff4fa8', intensity: 0.8 }, furnishing: tall }),
  prop({ id: 'brightly-billboard', name: 'Brightly Billboard', examine: 'A three-storey holo of a smiling man in a good suit. HALCYON: BRIGHTLY DONE. His eyes follow you, which the Combine insists is a feature.', model: 'holoBillboard', modelScale: 2.4, footprint: { width: 2, height: 2 }, light: { radius: 6, color: '#ff4fa8', intensity: 0.9 }, furnishing: tall }),
  prop({ id: 'neon-mast', name: 'Neon Mast', examine: 'A mast of stacked signs in three alphabets, none of which sell anything you can buy.', model: 'holoBillboard', modelScale: 1.6, footprint: { width: 2, height: 2 }, light: { radius: 5, color: '#4fe3ff', intensity: 0.8 }, furnishing: tall }),
  prop({ id: 'gallowglass-headframe', name: 'Gallowglass Headframe', examine: 'The headframe over Site Gallowglass, wrapped in Combine hoardings. NOTHING TO SEE, they say, in letters a metre high.', model: 'headframe', footprint: { width: 2, height: 2 }, light: { radius: 6, color: '#ff6a3a', intensity: 0.8 }, furnishing: tall }),
  prop({ id: 'meridian-bow', name: 'The Meridian’s Bow', examine: 'The bow of the colony ship Meridian, standing out of the scrap where it came down two hundred years ago. Her name is still legible. So is the hole.', model: 'beachedHull', modelScale: 1.6, footprint: { width: 6, height: 3 }, furnishing: tall }),
  prop({ id: 'rustwater-crane', name: 'Rustwater Crane', examine: 'The magnet crane the scavengers use to pull plate off the wreck. They named it Mother.', model: 'magnetCrane', footprint: { width: 2, height: 2 }, light: { radius: 6, color: '#ff6a3a', intensity: 0.8 }, furnishing: tall }),
  prop({ id: 'tallow-stack', name: 'Tallow Stack', examine: 'Site Tallow’s incinerator stack. It has been burning for two years with nobody to feed it.', model: 'chimney', modelScale: 2.4, footprint: { width: 2, height: 2 }, light: { radius: 6, color: '#ff7a2a', intensity: 0.8 }, furnishing: tall }),
  prop({ id: 'choir-bell', name: 'The Choir Bell', examine: 'A bell cast from precursor glass. The pilgrims ring it at the turn of every shift that Site Vesper no longer keeps.', model: 'glassBell', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: [...LANDMARK_HOMES, 'civic', 'chapel'] } }),
  prop({ id: 'vesper-beacon', name: 'Vesper Beacon', examine: 'Site Vesper’s beacon, still turning, still lit, sweeping a Site that has not answered in a year.', model: 'lighthouse', footprint: { width: 3, height: 3 }, light: { radius: 7, color: '#c79bff', intensity: 0.9, beam: 2 }, furnishing: tall }),
  prop({ id: 'precursor-pylon', name: 'Precursor Pylon', examine: 'A pylon of the Quiet, bent like warm wax and humming a note just under hearing.', model: 'precursorPylon', modelScale: 2.2, furnishing: { mount: 'free', homes: ['street'] } }),
  prop({ id: 'last-post-mast', name: 'Last Post Searchlight', examine: 'The last Directorate searchlight on the Span, trained on the Spindle. The operators log what it sees. Mostly it sees itself.', model: 'floodMast', modelScale: 1.8, light: { radius: 7, color: '#d8e8ff', intensity: 0.9 }, furnishing: tall }),
  prop({ id: 'spindle-light', name: 'The Spindle', examine: 'A precursor needle of dark glass on the summit of the Quiet Massif, seen from every shore of the Span, with a light at the top that has never once gone out. Site Null was built at its foot.', model: 'precursorNeedle', modelScale: 1.6, footprint: { width: 3, height: 3 }, light: { radius: 8, color: '#7fd8ff', intensity: 1.1, beam: 2.4 }, furnishing: tall }),
];

export const SPAN_LANDMARK_PREFABS: readonly Prefab[] = [
  landmark('kestrel-headframe'),
  landmark('commons-clock'),
  landmark('cohort-bell'),
  landmark('harrow-windpump'),
  landmark('grain-silo'),
  landmark('orchard-gantry'),
  landmark('aurelian-spire'),
  landmark('brightly-billboard'),
  landmark('neon-mast'),
  landmark('gallowglass-headframe'),
  landmark('meridian-bow'),
  landmark('rustwater-crane'),
  landmark('tallow-stack'),
  landmark('choir-bell'),
  landmark('vesper-beacon'),
  landmark('last-post-mast'),
  landmark('spindle-light'),
  prefab('landmark-pylon-line', ['focal'], [[0, 0, 'precursor-pylon'], [4, 2, 'precursor-pylon'], [8, 0, 'precursor-pylon']]),
];

export interface LiftEnd {
  readonly id: string;
  readonly verb: 'Descend' | 'Ascend';
  readonly where: string;
  readonly site: string;
  readonly districtId: string;
  readonly position: TilePoint;
  readonly clearance?: string;
}

export const liftObject = (end: LiftEnd): WorldObjectDefinition => ({
  id: end.id,
  name: 'Lift',
  examine: `The ${end.site} lift. ${end.verb === 'Descend' ? 'Down' : 'Up'} to ${end.where}.`,
  model: 'liftDoor',
  blocksMovement: true,
  furnishing: { mount: 'wall', homes: ['transit', 'containment', 'office'] },
  interactions: [
    {
      verb: end.verb,
      ...(end.clearance ? { conditions: [{ type: 'hasFlag' as const, flag: end.clearance }], failureText: 'The lift reads your pass and does not move. You do not have clearance for that level yet.' } : {}),
      effects: [{ type: 'teleport', districtId: end.districtId, position: end.position }],
    },
  ],
});

const WILD_HOMES = ['street', 'garden'] as const;
const growth = { mount: 'free', homes: WILD_HOMES } as const;
const rows = { mount: 'free', homes: WILD_HOMES, inRows: true } as const;

const wild = (id: string, name: string, examine: string, model: WorldObjectModel, furnishing: FurnishingProfile, footprint?: { width: number; height: number }): WorldObjectDefinition =>
  prop({ id, name, examine, model, modelScale: 2, furnishing, ...(footprint ? { footprint } : {}) });

const flora = (id: string, name: string, examine: string, model: WorldObjectModel): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model,
  modelScale: 2,
  blocksMovement: false,
  furnishing: { mount: 'flat', homes: WILD_HOMES },
  interactions: [],
});

export const SPAN_WILD_PROPS: readonly WorldObjectDefinition[] = [
  wild('broadleaf-tree', 'Oak', 'A colony oak grown from ship’s stock. A Directorate tag nailed to the trunk reads SPECIMEN: STABLE.', 'broadleafTree', growth),
  wild('birch-tree', 'Birch', 'Paper-white bark peeling in strips. Somebody carved a cohort number into it, and somebody else crossed it out.', 'birchTree', growth),
  wild('orchard-tree', 'Apple Tree', 'An old co-op apple tree, pruned and propped. The fruit is counted twice a year, and the count never matches.', 'orchardTree', rows),
  wild('windbent-pine', 'Wind Pine', 'A pine bent flat by a wind that only blows on the summit. It leans the same way whichever way it is planted.', 'windbentPine', growth),
  wild('dead-tree', 'Dead Tree', 'Bare, bleached and streaked with rust where the scrap rain fell. Nothing nests in it.', 'deadTree', growth),
  wild('bush', 'Bush', 'Bramble, and something in among it with too many leaves.', 'bush', growth),
  wild('hedgerow', 'Hedgerow', 'A field hedge laid by hand, older than the terrace it marks.', 'hedgerow', rows),
  wild('field-wall', 'Dry-stone Wall', 'Field stones stacked without mortar. Every co-op child is taught to put back the one they knock off.', 'fieldWall', rows),
  wild('hay-bale', 'Hay Bale', 'Cut, rolled and left for a quota collection that never came.', 'hayBale', growth),
  wild('boulder', 'Boulder', 'A boulder of Span rock, warmer than the air around it.', 'boulder', growth),
  wild('rock-outcrop', 'Rock Outcrop', 'Layered rock breaking through the ground: the bones of the Massif.', 'rockOutcrop', growth, { width: 2, height: 2 }),
  wild('obsidian-outcrop', 'Obsidian Spur', 'Black glass forced up out of the soil in spurs. It rings faintly when the wind changes.', 'obsidianOutcrop', growth, { width: 2, height: 2 }),
  wild('glass-crystals', 'Glass Crystals', 'Precursor glass grown into crystals overnight. The light inside them is not a reflection.', 'glassCrystals', growth),
  flora('fused-shards', 'Fused Shards', 'Sand fused into glass by something that passed this way once and did not stop.', 'fusedShards'),
  wild('scrap-mound', 'Scrap Mound', 'Plate, girder and cable from the Meridian, too far gone even for the scavengers.', 'scrapMound', growth),
  wild('tyre-heap', 'Tyre Heap', 'Tyres from vehicles nobody on the Span has ever seen run. The rubber is still soft.', 'tyreHeap', growth),
  wild('wrecked-panel', 'Wrecked Panel', 'A hull panel from the Meridian, driven edge-first into the ground. The stencil still says DO NOT.', 'wreckedPanel', growth, { width: 2, height: 1 }),
  wild('overgrown-planter', 'Overgrown Planter', 'A Combine planter gone wild. The plant has outgrown its box and started on the street.', 'overgrownPlanter', growth),
  wild('rubble-heap', 'Rubble', 'Broken concrete and twisted rebar from something that used to stand here.', 'rubbleHeap', growth),
  wild('ruin-wall', 'Ruined Wall', 'A stub of wall from a settlement older than the Directorate’s records. The stones are numbered.', 'ruinWall', growth, { width: 2, height: 1 }),
  wild('tree-stump', 'Tree Stump', 'A stump, cut clean. The rings are too regular to count.', 'treeStump', growth),
  wild('fallen-log', 'Fallen Log', 'A trunk brought down in a storm and going slowly back into the ground.', 'fallenLog', growth, { width: 2, height: 1 }),
  flora('wildflowers', 'Wildflowers', 'Wildflowers. The Directorate’s botanists list them as harmless, with a question mark.', 'wildflowers'),
  flora('tall-grass', 'Tall Grass', 'Long grass nodding in a wind you cannot feel.', 'tallGrass'),
];

export const SPAN_KIT: FurnishingKit = {
  objects: [...SPAN_LANDMARKS, ...SPAN_WILD_PROPS, ...SPAN_STREET_PROPS, ...SPAN_CONTAINMENT_PROPS],
  prefabs: SPAN_LANDMARK_PREFABS,
  signatures: {},
};
