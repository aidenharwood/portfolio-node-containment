import { drawBlueprint, link, patch, pillars, room } from '../../world/blueprint.ts';
import type { CreaturePlacement, DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { CALDER_GATEHOUSE_ANCHORS } from './calderGatehouse.ts';
import { LITTER, scatterGroups, scatterPacks } from './populate.ts';
import { furnish, type Dressing } from './furnish.ts';

const plan = drawBlueprint({ width: 110, height: 84 }, [
  room('lift-landing', 1, 1, 20, 18, 'carpet'),
  room('old-workings', 24, 1, 84, 46, 'concrete'),
  room('flooded-drift', 1, 22, 20, 60, 'plating'),
  room('foremans-office', 24, 50, 62, 32, 'rust'),
  room('salt-pockets', 88, 50, 20, 32, 'concrete', 'octagon'),
  patch(34, 12, 60, 2, 'coolant'),
  patch(50, 12, 4, 2, 'grate'),
  patch(76, 12, 4, 2, 'grate'),
  patch(34, 32, 60, 2, 'coolant'),
  patch(50, 32, 4, 2, 'grate'),
  patch(76, 32, 4, 2, 'grate'),
  patch(5, 34, 6, 6, 'coolant'),
  patch(10, 60, 7, 8, 'coolant'),
  link('lift-landing', 'old-workings', 3),
  link('lift-landing', 'flooded-drift', 3),
  link('flooded-drift', 'old-workings', 7, 'concrete'),
  link('old-workings', 'foremans-office', 3),
  link('flooded-drift', 'foremans-office', 3),
  link('old-workings', 'salt-pockets', 7, 'concrete'),
  link('salt-pockets', 'foremans-office', 5, 'concrete'),
  pillars('old-workings', 12, 11, 6),
]);

export const CALDER_DEEPS_ANCHORS = {
  liftArrival: plan.at('lift-landing', 3, 3),
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [];

const fixtures: ObjectPlacement[] = [
  
    { instanceId: 'cd-lift', objectId: 'calder-lift-up', position: plan.at('lift-landing', 0, 1), facing: 'east' },
    { instanceId: 'cd-sign', objectId: 'warning-sign', position: plan.at('lift-landing', 19, 0) },
    { instanceId: 'cd-seam-a', objectId: 'salt-seam', position: plan.at('old-workings', 1, 0) },
    { instanceId: 'cd-seam-b', objectId: 'salt-seam', position: plan.at('old-workings', 83, 21) },
    { instanceId: 'cd-seam-c', objectId: 'salt-seam', position: plan.at('flooded-drift', 0, 58) },
    { instanceId: 'cd-geode-a', objectId: 'geode-cluster', position: plan.at('old-workings', 55, 0) },
    { instanceId: 'cd-geode-b', objectId: 'geode-cluster', position: plan.at('old-workings', 21, 44) },
    { instanceId: 'cd-geode-c', objectId: 'geode-cluster', position: plan.at('flooded-drift', 18, 1) },
    { instanceId: 'cd-time-clock', objectId: 'deeps-time-clock', position: plan.at('foremans-office', 60, 30), facing: 'west' },
    { instanceId: 'cd-workings-rubble', objectId: 'litter-rubble', position: plan.at('old-workings', 35, 2) },
    { instanceId: 'cd-workings-gravel', objectId: 'litter-gravel', position: plan.at('old-workings', 70, 42) },
    { instanceId: 'cd-drift-debris', objectId: 'litter-debris', position: plan.at('flooded-drift', 8, 56) },
  ];

const residents: CreaturePlacement[] = [
    { instanceId: 'cd-workings-wight-a', creatureId: 'deep-shift-wight', position: plan.at('old-workings', 7, 2) },
    { instanceId: 'cd-workings-wight-b', creatureId: 'deep-shift-wight', position: plan.at('old-workings', 35, 21) },
    { instanceId: 'cd-workings-wight-c', creatureId: 'deep-shift-wight', position: plan.at('old-workings', 70, 2) },
    { instanceId: 'cd-workings-wight-d', creatureId: 'deep-shift-wight', position: plan.at('old-workings', 77, 24) },
    { instanceId: 'cd-workings-wight-e', creatureId: 'deep-shift-wight', position: plan.at('old-workings', 21, 42) },
    { instanceId: 'cd-workings-wight-f', creatureId: 'deep-shift-wight', position: plan.at('old-workings', 63, 43) },
    { instanceId: 'cd-drift-wight-a', creatureId: 'deep-shift-wight', position: plan.at('flooded-drift', 8, 25) },
    { instanceId: 'cd-drift-wight-b', creatureId: 'deep-shift-wight', position: plan.at('flooded-drift', 3, 56) },
    { instanceId: 'cd-drift-crawler-a', creatureId: 'brine-crawler', position: plan.at('flooded-drift', 16, 2) },
    { instanceId: 'cd-drift-crawler-b', creatureId: 'brine-crawler', position: plan.at('flooded-drift', 17, 57) },
    { instanceId: 'cd-workings-crawler-a', creatureId: 'brine-crawler', position: plan.at('old-workings', 42, 3) },
    { instanceId: 'cd-workings-crawler-b', creatureId: 'brine-crawler', position: plan.at('old-workings', 82, 43) },
    { instanceId: 'cd-office-foreman', creatureId: 'the-shift-foreman', position: plan.at('foremans-office', 37, 16) },
  ];

const placed = [...npcs, ...fixtures, ...residents];

const furnishings = scatterGroups(plan, placed, [
  ['old-workings', 'cd-workings-node', ['salt-seam', 'geode-cluster'], 4],
  ['salt-pockets', 'cd-pockets-node', ['geode-cluster', 'salt-seam'], 3],
  ['old-workings', 'cd-workings-litter', LITTER, 10],
  ['flooded-drift', 'cd-drift-litter', LITTER, 5],
]);

const packs = scatterPacks(plan, [...placed, ...furnishings], [
  ['old-workings', 'cd-wight-workings-pack', 'deep-shift-wight', 8],
  ['flooded-drift', 'cd-crawler-drift-pack', 'brine-crawler', 4],
  ['salt-pockets', 'cd-wight-pockets-pack', 'deep-shift-wight', 3],
]);

const dressing: Dressing = {
  'lift-landing': 'mine',
  'old-workings': 'mine',
  'flooded-drift': 'wet',
  'foremans-office': { theme: 'mine', density: 'sparse' },
  'salt-pockets': 'mine',
};

export const CALDER_DEEPS: DistrictDefinition = furnish(plan, {
  id: 'calder-deeps',
  name: 'Calder Deeps',
  subtitle: 'Calder Wing — The Lowest Gallery',
  tier: 11,
  region: 'calder',
  recovery: { districtId: 'calder-gatehouse', position: CALDER_GATEHOUSE_ANCHORS.recovery },
  ambience: { darkness: 0.72, tint: '#160f0c', fog: '#1c130e', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: CALDER_DEEPS_ANCHORS,
  areas: [
    plan.area('lift-landing', 'Lift Landing', { safe: true }),
    plan.area('old-workings', 'Old Workings'),
    plan.area('flooded-drift', 'Flooded Drift'),
    plan.area('foremans-office', 'Foreman\'s Office', { multiCombat: true }),
    plan.area('salt-pockets', 'Salt Pockets'),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  creatures: [...residents, ...packs],
  lights: [
    { position: plan.center('salt-pockets'), radius: 9, color: '#9fd8ff', intensity: 0.5 },
    { position: plan.spot('lift-landing', 3, 3), radius: 11, color: '#ffcf4d', intensity: 0.6 },
    { position: plan.spot('old-workings', 14, 21), radius: 13, color: '#ff9a6a', intensity: 0.45 },
    { position: plan.spot('old-workings', 63, 21), radius: 13, color: '#ffd27f', intensity: 0.4 },
    { position: plan.spot('flooded-drift', 8, 34), radius: 13, color: '#ff9a6a', intensity: 0.4 },
    { position: plan.spot('foremans-office', 24, 16), radius: 14, color: '#ffd27f', intensity: 0.55 },
    { position: plan.spot('foremans-office', 55, 29), radius: 9, color: '#ff9a6a', intensity: 0.5 },
  ],
}, dressing);
