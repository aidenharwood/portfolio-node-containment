import { install } from '../installations.ts';
import type { AssemblyPlacement } from '../../world/assemblies.ts';
import { drawBlueprint, exit, link, patch, pillars, room } from '../../world/blueprint.ts';
import type { CreaturePlacement, DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { CALDER_GATEHOUSE_ANCHORS } from './calderGatehouse.ts';
import { LITTER, scatterGroups, scatterPacks } from './populate.ts';
import { furnish, type Dressing } from './furnish.ts';

const plan = drawBlueprint({ width: 108, height: 101 }, [
  room('cloister', 1, 1, 106, 23, 'plating'),
  room('nave-steps', 1, 36, 30, 30, 'concrete'),
  room('the-nave', 33, 26, 74, 50, 'carpet'),
  room('reliquary', 1, 78, 106, 22, 'plating'),
  patch(48, 34, 10, 6, 'coolant'),
  patch(84, 34, 10, 6, 'coolant'),
  patch(48, 62, 10, 6, 'coolant'),
  patch(84, 62, 10, 6, 'coolant'),
  link('nave-steps', 'the-nave', 2),
  link('nave-steps', 'cloister', 7, 'concrete'),
  link('nave-steps', 'reliquary', 7, 'concrete'),
  pillars('the-nave', 12, 10, 5),
  pillars('reliquary', 13, 8, 4),
  pillars('cloister', 13, 8, 4),
  exit('west', 'nave-steps', 'west', 13),
]);

export const SALT_CATHEDRAL_ANCHORS = {
  
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [];

const fixtures: ObjectPlacement[] = [
    { instanceId: 'sc-geode-a', objectId: 'geode-cluster', position: plan.at('cloister', 1, 0) },
    { instanceId: 'sc-geode-b', objectId: 'geode-cluster', position: plan.at('cloister', 54, 8) },
    { instanceId: 'sc-geode-c', objectId: 'geode-cluster', position: plan.at('cloister', 104, 21) },
    { instanceId: 'sc-geode-d', objectId: 'geode-cluster', position: plan.at('reliquary', 1, 20) },
    { instanceId: 'sc-geode-e', objectId: 'geode-cluster', position: plan.at('reliquary', 54, 11) },
    { instanceId: 'sc-geode-f', objectId: 'geode-cluster', position: plan.at('reliquary', 104, 1) },
    { instanceId: 'sc-steps-rubble', objectId: 'litter-rubble', position: plan.at('nave-steps', 12, 2) },
    { instanceId: 'sc-cloister-papers', objectId: 'litter-papers', position: plan.at('cloister', 80, 14) },
    { instanceId: 'sc-reliquary-gravel', objectId: 'litter-gravel', position: plan.at('reliquary', 41, 2) },
  ];

const residents: CreaturePlacement[] = [
    { instanceId: 'sc-cloister-acolyte-a', creatureId: 'cathedral-acolyte', position: plan.at('cloister', 9, 2) },
    { instanceId: 'sc-cloister-acolyte-b', creatureId: 'cathedral-acolyte', position: plan.at('cloister', 35, 19) },
    { instanceId: 'sc-cloister-acolyte-c', creatureId: 'cathedral-acolyte', position: plan.at('cloister', 73, 2) },
    { instanceId: 'sc-cloister-acolyte-d', creatureId: 'cathedral-acolyte', position: plan.at('cloister', 92, 20) },
    { instanceId: 'sc-reliquary-acolyte-a', creatureId: 'cathedral-acolyte', position: plan.at('reliquary', 16, 3) },
    { instanceId: 'sc-reliquary-acolyte-b', creatureId: 'cathedral-acolyte', position: plan.at('reliquary', 41, 18) },
    { instanceId: 'sc-reliquary-acolyte-c', creatureId: 'cathedral-acolyte', position: plan.at('reliquary', 76, 2) },
    { instanceId: 'sc-reliquary-acolyte-d', creatureId: 'cathedral-acolyte', position: plan.at('reliquary', 99, 16) },
    { instanceId: 'sc-nave-acolyte-a', creatureId: 'cathedral-acolyte', position: plan.at('the-nave', 29, 3) },
    { instanceId: 'sc-nave-acolyte-b', creatureId: 'cathedral-acolyte', position: plan.at('the-nave', 29, 46) },
    { instanceId: 'sc-nave-bishop', creatureId: 'the-salt-bishop', position: plan.at('the-nave', 51, 25) },
  ];

const assemblies: AssemblyPlacement[] = [
  install('sc-nave-door', 'nave-door', plan.linkTile('nave-steps', 'the-nave', 1), 'east'),
];

const placed = [...npcs, ...fixtures, ...assemblies, ...residents];

const furnishings = scatterGroups(plan, placed, [
  ['cloister', 'sc-cloister-node', ['geode-cluster'], 3],
  ['reliquary', 'sc-reliquary-node', ['geode-cluster'], 3],
  ['cloister', 'sc-cloister-litter', LITTER, 8],
  ['reliquary', 'sc-reliquary-litter', LITTER, 8],
  ['nave-steps', 'sc-steps-litter', LITTER, 5],
]);

const packs = scatterPacks(plan, [...placed, ...furnishings], [
  ['cloister', 'sc-acolyte-cloister-pack', 'cathedral-acolyte', 12],
  ['reliquary', 'sc-acolyte-reliquary-pack', 'cathedral-acolyte', 12],
  ['the-nave', 'sc-acolyte-nave-pack', 'cathedral-acolyte', 4],
]);

const dressing: Dressing = {
  'cloister': 'chapel',
  'nave-steps': 'chapel',
  'the-nave': { theme: 'chapel', density: 'sparse' },
  'reliquary': 'chapel',
};

export const SALT_CATHEDRAL: DistrictDefinition = furnish(plan, {
  id: 'salt-cathedral',
  name: 'Salt Cathedral',
  subtitle: 'Calder Wing — The Nave',
  tier: 11,
  condition: 'alien',
  region: 'calder',
  deadEnd: true,
  recovery: { districtId: 'calder-gatehouse', position: CALDER_GATEHOUSE_ANCHORS.recovery },
  ambience: { darkness: 0.6, tint: '#1a141c', fog: '#1e1820', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: SALT_CATHEDRAL_ANCHORS,
  areas: [
    plan.area('cloister', 'Salt Cloister'),
    plan.area('nave-steps', 'Nave Steps'),
    plan.area('the-nave', 'The Nave', { multiCombat: true }),
    plan.area('reliquary', 'Reliquary'),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  assemblies,
  creatures: [...residents, ...packs],
  lights: [
    { position: plan.spot('nave-steps', 12, 15), radius: 11, color: '#ffd27f', intensity: 0.5 },
    { position: plan.spot('cloister', 22, 8), radius: 13, color: '#ffd27f', intensity: 0.45 },
    { position: plan.spot('cloister', 80, 8), radius: 14, color: '#ffb3c8', intensity: 0.45 },
    { position: plan.spot('the-nave', 14, 25), radius: 13, color: '#ffd27f', intensity: 0.55 },
    { position: plan.spot('the-nave', 59, 25), radius: 14, color: '#ffb3c8', intensity: 0.7 },
    { position: plan.spot('reliquary', 22, 11), radius: 13, color: '#ffd27f', intensity: 0.4 },
    { position: plan.spot('reliquary', 86, 13), radius: 14, color: '#ffb3c8', intensity: 0.45 },
  ],
}, dressing, { decalSwaps: { 'alien-vein': 'salt-crust' } });
