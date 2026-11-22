import type { TilePoint } from '../../world/geometry.ts';
import type { WorldObjectDefinition } from '../../world/entities.ts';
import type { FurnishingKit } from '../furnishingKit.ts';
import { prefab, type Prefab } from '../prefabs/types.ts';
import { gate, landmark, LANDMARK_HOMES, prop } from '../catalog/landmarks.ts';

const tall = { mount: 'free', homes: LANDMARK_HOMES } as const;

export const SPAN_LANDMARKS: readonly WorldObjectDefinition[] = [
  prop({ id: 'kestrel-headframe', name: 'Kestrel Headframe', examine: 'The white winding tower over Site Kestrel. The wheel turns once an hour whether or not the lift moves, and every recruit learns to tell the time by it.', model: 'headframe', footprint: { width: 2, height: 2 }, light: { radius: 8, color: '#e8f2ff', intensity: 1 }, furnishing: tall }),
  prop({ id: 'commons-clock', name: 'Commons Clock', examine: 'The clock over Kestrel Commons. It shows ship time, colony time and Span time, and none of them agree.', model: 'clockTower', footprint: { width: 2, height: 2 }, light: { radius: 6, color: '#ffe2a8', intensity: 0.9 }, furnishing: tall }),
  prop({ id: 'cohort-bell', name: 'Cohort Bell', examine: 'A bell on a frame at the end of the Recruit Lines, rung once for every cohort that passes out. There is a gap in the list of names under it.', model: 'bellTower', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: [...LANDMARK_HOMES, 'civic', 'chapel'] } }),
  prop({ id: 'harrow-windpump', name: 'Harrow Windpump', examine: 'The great windpump that lifts water up the terraces. The sails turn in no wind at all; the Span breathes along its length.', model: 'windpump', footprint: { width: 2, height: 2 }, furnishing: tall }),
  prop({ id: 'grain-silo', name: 'Co-op Silo', examine: 'The Harrowgate co-op silo, painted with every harvest since the landing. The last three years are painted over in Orchard green.', model: 'coolingTower', footprint: { width: 3, height: 3 }, furnishing: tall }),
  prop({ id: 'orchard-gantry', name: 'Seed Gantry', examine: 'The gantry over Site Orchard’s seed vault. The hoist chains are wrapped in vine, and the vine is in flower.', model: 'gantryCrane', footprint: { width: 3, height: 3 }, light: { radius: 5, color: '#b6ff4f', intensity: 0.7 }, furnishing: tall }),
  prop({ id: 'aurelian-spire', name: 'Aurelian Spire', examine: 'The Aurelian Combine’s tower, forty floors of glass with every window lit. The top ten floors have not answered a call in a month.', model: 'directorateSpire', modelScale: 1.4, footprint: { width: 3, height: 3 }, light: { radius: 7, color: '#ff4fa8', intensity: 0.8 }, furnishing: tall }),
  prop({ id: 'brightly-billboard', name: 'Brightly Billboard', examine: 'A three-storey holo of a smiling man in a good suit. HALCYON: BRIGHTLY DONE. His eyes follow you, which the Combine insists is a feature.', model: 'holoBillboard', modelScale: 2.4, footprint: { width: 2, height: 2 }, light: { radius: 6, color: '#ff4fa8', intensity: 0.9 }, furnishing: tall }),
  prop({ id: 'neon-mast', name: 'Neon Mast', examine: 'A mast of stacked signs in three alphabets, none of which sell anything you can buy.', model: 'holoBillboard', modelScale: 1.6, footprint: { width: 2, height: 2 }, light: { radius: 5, color: '#4fe3ff', intensity: 0.8 }, furnishing: tall }),
  prop({ id: 'gallowglass-headframe', name: 'Gallowglass Headframe', examine: 'The headframe over Site Gallowglass, wrapped in Combine hoardings. NOTHING TO SEE, they say, in letters a metre high.', model: 'headframe', footprint: { width: 2, height: 2 }, light: { radius: 6, color: '#ff6a3a', intensity: 0.8 }, furnishing: tall }),
  prop({ id: 'meridian-bow', name: 'The Meridian’s Bow', examine: 'The bow of the colony ship Meridian, standing out of the scrap where it came down two hundred years ago. Her name is still legible. So is the hole.', model: 'beachedHull', modelScale: 1.6, footprint: { width: 6, height: 3 }, furnishing: tall }),
  prop({ id: 'rustwater-crane', name: 'Rustwater Crane', examine: 'The magnet crane the scavengers use to pull plate off the wreck. They named it Mother.', model: 'magnetCrane', footprint: { width: 2, height: 2 }, light: { radius: 6, color: '#ff6a3a', intensity: 0.8 }, furnishing: tall }),
  prop({ id: 'tallow-stack', name: 'Tallow Stack', examine: 'Site Tallow’s incinerator stack. It has been burning for two years with nobody to feed it.', model: 'chimney', modelScale: 2.4, footprint: { width: 2, height: 2 }, light: { radius: 6, color: '#ff7a2a', intensity: 0.8 }, furnishing: tall }),
  prop({ id: 'choir-bell', name: 'The Choir Bell', examine: 'A bell cast from precursor glass. The pilgrims ring it at the turn of every shift that Site Vesper no longer keeps.', model: 'bellTower', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: [...LANDMARK_HOMES, 'civic', 'chapel'] } }),
  prop({ id: 'vesper-beacon', name: 'Vesper Beacon', examine: 'Site Vesper’s beacon, still turning, still lit, sweeping a Site that has not answered in a year.', model: 'lighthouse', footprint: { width: 3, height: 3 }, light: { radius: 7, color: '#c79bff', intensity: 0.9, beam: 2 }, furnishing: tall }),
  prop({ id: 'precursor-pylon', name: 'Precursor Pylon', examine: 'A pylon of the Quiet, bent like warm wax and humming a note just under hearing.', model: 'utilityPole', modelScale: 2.2, furnishing: { mount: 'free', homes: ['street'] } }),
  prop({ id: 'last-post-mast', name: 'Last Post Searchlight', examine: 'The last Directorate searchlight on the Span, trained on the Spindle. The operators log what it sees. Mostly it sees itself.', model: 'floodMast', modelScale: 1.8, light: { radius: 7, color: '#d8e8ff', intensity: 0.9 }, furnishing: tall }),
  prop({ id: 'spindle-light', name: 'The Spindle', examine: 'The end of the Span: a precursor needle of dark glass with a light at the top that has never once gone out. Site Null was built at its foot.', model: 'lighthouse', modelScale: 1.6, footprint: { width: 3, height: 3 }, light: { radius: 8, color: '#7fd8ff', intensity: 1.1, beam: 2.4 }, furnishing: tall }),
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

const SEAM_GATE_TEXT: Readonly<Record<string, string>> = {
  'kestrel-north-gate': 'Past the Seam the land climbs in terraces toward the rim.',
  'kestrel-gate': 'Past the Seam the land climbs in terraces toward the rim.',
  'kestrel-south-gate': 'Past the Seam the land climbs in terraces toward the rim.',
  'harrow-north-gate': 'Past the Seam, the glow of Halcyon.',
  'harrow-gate': 'Past the Seam, the glow of Halcyon.',
  'harrow-south-gate': 'Past the Seam, the glow of Halcyon.',
  'halcyon-north-gate': 'Past the Seam, rust to the rim, and the wreck of the Meridian.',
  'halcyon-gate': 'Past the Seam, rust to the rim, and the wreck of the Meridian.',
  'halcyon-south-gate': 'Past the Seam, rust to the rim, and the wreck of the Meridian.',
  'wreck-north-gate': 'Past the Seam the ground turns to glass.',
  'wreck-gate': 'Past the Seam the ground turns to glass.',
  'wreck-south-gate': 'Past the Seam the ground turns to glass.',
  'steppe-north-gate': 'Past the Seam the Spindle fills the sky.',
  'steppe-gate': 'Past the Seam the Spindle fills the sky.',
  'steppe-south-gate': 'Past the Seam the Spindle fills the sky.',
};

export const SEAM_GATE_IDS: readonly string[] = Object.keys(SEAM_GATE_TEXT);

export const seamLeafOf = (gateId: string): string => `${gateId}-leaf`;

export const SEAM_GATES: readonly WorldObjectDefinition[] = SEAM_GATE_IDS.map((gateId) =>
  gate(seamLeafOf(gateId), 'Seam Gate', 'A gate of the Quiet through the Seam bulkhead, wedged open with Directorate jacks. The edges of the gap are perfectly smooth.', [], 'It will not move.', `The gate grinds aside. ${SEAM_GATE_TEXT[gateId]}`),
);

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

export const SPAN_KIT: FurnishingKit = {
  objects: [...SPAN_LANDMARKS, ...SEAM_GATES],
  prefabs: SPAN_LANDMARK_PREFABS,
  signatures: {},
};
