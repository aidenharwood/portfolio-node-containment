import { drawBlueprint, exit, link, patch, pillars, room } from '../../world/blueprint.ts';
import type { CreaturePlacement, DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { WATERWORKS_ANCHORS } from './waterworks.ts';
import { LITTER, scatterGroups, scatterPacks } from './populate.ts';
import { furnish, type Dressing } from './furnish.ts';
import { ATRIUM_ANCHORS } from './meridianAtrium.ts';

const plan = drawBlueprint({ width: 120, height: 96 }, [
  room('salt-landing', 50, 1, 26, 20, 'concrete'),
  room('brine-pans', 1, 24, 118, 30, 'plating'),
  room('wight-drifts', 1, 57, 60, 38, 'concrete'),
  room('gate-approach', 64, 57, 55, 24, 'plating'),
  room('tally-house', 64, 84, 55, 11, 'grate'),
  patch(8, 31, 104, 3, 'coolant'),
  patch(8, 44, 104, 3, 'coolant'),
  patch(30, 31, 4, 3, 'grate'),
  patch(60, 31, 4, 3, 'grate'),
  patch(90, 31, 4, 3, 'grate'),
  patch(30, 44, 4, 3, 'grate'),
  patch(60, 44, 4, 3, 'grate'),
  patch(90, 44, 4, 3, 'grate'),
  link('salt-landing', 'brine-pans', 9, 'concrete'),
  link('brine-pans', 'wight-drifts', 7, 'concrete'),
  link('brine-pans', 'gate-approach', 9, 'plating'),
  link('wight-drifts', 'gate-approach', 5, 'plating'),
  link('gate-approach', 'tally-house', 3),
  link('wight-drifts', 'tally-house', 5, 'concrete'),
  pillars('wight-drifts', 9, 9, 5),
  exit('north', 'salt-landing', 'north', 13),
  exit('east', 'gate-approach', 'east', 2, { gate: true, floor: 'door' }),
]);

export const BRINE_GALLERIES_ANCHORS = {
  
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [];

const fixtures: ObjectPlacement[] = [
  
    { instanceId: 'bg-landing-sign', objectId: 'warning-sign', position: plan.at('salt-landing', 0, 0) },
    { instanceId: 'bg-seam-a', objectId: 'salt-seam', position: plan.at('brine-pans', 1, 0) },
    { instanceId: 'bg-seam-b', objectId: 'salt-seam', position: plan.at('brine-pans', 54, 0) },
    { instanceId: 'bg-seam-c', objectId: 'salt-seam', position: plan.at('brine-pans', 116, 15) },
    { instanceId: 'bg-seam-d', objectId: 'salt-seam', position: plan.at('brine-pans', 41, 28) },
    { instanceId: 'bg-seam-e', objectId: 'salt-seam', position: plan.at('wight-drifts', 0, 36) },
    { instanceId: 'bg-seam-f', objectId: 'salt-seam', position: plan.at('wight-drifts', 58, 1) },
    { instanceId: 'bg-intercom', objectId: 'calder-gate-intercom', position: plan.at('gate-approach', 54, 20), facing: 'west' },
    { instanceId: 'bg-tally-a', objectId: 'calder-tally-a', position: plan.at('wight-drifts', 4, 0) },
    { instanceId: 'bg-tally-b', objectId: 'calder-tally-b', position: plan.at('wight-drifts', 29, 37), facing: 'north' },
    { instanceId: 'bg-tally-c', objectId: 'calder-tally-c', position: plan.at('wight-drifts', 53, 0) },
    { instanceId: 'bg-pans-pipes', objectId: 'pipe-cluster', position: plan.at('brine-pans', 98, 0) },
    { instanceId: 'bg-landing-rubble', objectId: 'litter-rubble', position: plan.at('salt-landing', 16, 2) },
    { instanceId: 'bg-approach-debris', objectId: 'litter-debris', position: plan.at('gate-approach', 21, 21) },
    { instanceId: 'bg-drifts-gravel', objectId: 'litter-gravel', position: plan.at('wight-drifts', 20, 13) },
    { instanceId: 'bg-drifts-papers', objectId: 'litter-papers', position: plan.at('wight-drifts', 47, 24) },
  ];

const residents: CreaturePlacement[] = [
    { instanceId: 'bg-pans-crawler-a', creatureId: 'brine-crawler', position: plan.at('brine-pans', 16, 1) },
    { instanceId: 'bg-pans-crawler-b', creatureId: 'brine-crawler', position: plan.at('brine-pans', 41, 15) },
    { instanceId: 'bg-pans-crawler-c', creatureId: 'brine-crawler', position: plan.at('brine-pans', 79, 1) },
    { instanceId: 'bg-pans-crawler-d', creatureId: 'brine-crawler', position: plan.at('brine-pans', 98, 28) },
    { instanceId: 'bg-pans-crawler-e', creatureId: 'brine-crawler', position: plan.at('brine-pans', 60, 28) },
    { instanceId: 'bg-pans-crawler-f', creatureId: 'brine-crawler', position: plan.at('brine-pans', 115, 1) },
    { instanceId: 'bg-approach-crawler-a', creatureId: 'brine-crawler', position: plan.at('gate-approach', 25, 2) },
    { instanceId: 'bg-approach-crawler-b', creatureId: 'brine-crawler', position: plan.at('gate-approach', 45, 21) },
    { instanceId: 'bg-drifts-wight-a', creatureId: 'salt-wight', position: plan.at('wight-drifts', 3, 13) },
    { instanceId: 'bg-drifts-wight-b', creatureId: 'salt-wight', position: plan.at('wight-drifts', 18, 2) },
    { instanceId: 'bg-drifts-wight-c', creatureId: 'salt-wight', position: plan.at('wight-drifts', 24, 36) },
    { instanceId: 'bg-drifts-wight-d', creatureId: 'salt-wight', position: plan.at('wight-drifts', 36, 1) },
    { instanceId: 'bg-drifts-wight-e', creatureId: 'salt-wight', position: plan.at('wight-drifts', 48, 35) },
    { instanceId: 'bg-drifts-wight-f', creatureId: 'salt-wight', position: plan.at('wight-drifts', 57, 24) },
    { instanceId: 'bg-drifts-wight-g', creatureId: 'salt-wight', position: plan.at('wight-drifts', 9, 36) },
    { instanceId: 'bg-drifts-wight-h', creatureId: 'salt-wight', position: plan.at('wight-drifts', 33, 24) },
  ];

const placed = [...npcs, ...fixtures, ...residents];

const furnishings = scatterGroups(plan, placed, [
  ['brine-pans', 'bg-pans-node', ['salt-seam'], 4],
  ['wight-drifts', 'bg-drifts-node', ['salt-seam'], 3],
  ['tally-house', 'bg-tally-node', ['salt-seam'], 2],
  ['wight-drifts', 'bg-drifts-litter', LITTER, 8],
  ['gate-approach', 'bg-approach-litter', LITTER, 5],
]);

const packs = scatterPacks(plan, [...placed, ...furnishings], [
  ['brine-pans', 'bg-crawler-pans-pack', 'brine-crawler', 12],
  ['tally-house', 'bg-crawler-tally-pack', 'brine-crawler', 3],
  ['wight-drifts', 'bg-wight-drifts-pack', 'salt-wight', 9],
  ['gate-approach', 'bg-wight-approach-pack', 'salt-wight', 4],
]);

const dressing: Dressing = {
  'salt-landing': 'mine',
  'brine-pans': 'mine',
  'wight-drifts': 'mine',
  'gate-approach': 'mine',
  'tally-house': 'office',
};

export const BRINE_GALLERIES: DistrictDefinition = furnish(plan, {
  id: 'brine-galleries',
  name: 'Brine Galleries',
  subtitle: 'Calder Wing — Saltworks Level',
  tier: 10,
  region: 'calder',
  recovery: { districtId: 'meridian-atrium', position: ATRIUM_ANCHORS.recovery },
  ambience: { darkness: 0.64, tint: '#1c1210', fog: '#24170f', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: BRINE_GALLERIES_ANCHORS,
  areas: [
    plan.area('brine-pans', 'Brine Pans'),
    plan.area('salt-landing', 'Salt Landing'),
    plan.area('gate-approach', 'Gate Approach'),
    plan.area('wight-drifts', 'The Drifts'),
    plan.area('tally-house', 'Tally House'),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  creatures: [...residents, ...packs],
  lights: [
    { position: plan.center('tally-house'), radius: 9, color: '#9fd8ff', intensity: 0.5 },
    { position: plan.spot('salt-landing', 9, 10), radius: 11, color: '#ff9a6a', intensity: 0.5 },
    { position: plan.spot('brine-pans', 22, 2), radius: 13, color: '#ffb3a0', intensity: 0.45 },
    { position: plan.spot('brine-pans', 66, 15), radius: 14, color: '#ff9a6a', intensity: 0.5 },
    { position: plan.spot('brine-pans', 104, 15), radius: 13, color: '#ffd27f', intensity: 0.45 },
    { position: plan.spot('gate-approach', 25, 12), radius: 14, color: '#ff9a6a', intensity: 0.5 },
    { position: plan.spot('gate-approach', 52, 3), radius: 9, color: '#ffd27f', intensity: 0.55 },
    { position: plan.spot('wight-drifts', 12, 24), radius: 13, color: '#ffd27f', intensity: 0.4 },
    { position: plan.spot('wight-drifts', 42, 34), radius: 14, color: '#ff9a6a', intensity: 0.45 },
  ],
}, dressing);
