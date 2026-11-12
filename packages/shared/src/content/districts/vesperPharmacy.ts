import { install } from '../installations.ts';
import type { AssemblyPlacement } from '../../world/assemblies.ts';
import { drawBlueprint, exit, link, patch, pillars, room } from '../../world/blueprint.ts';
import type { CreaturePlacement, DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { VESPER_LODGE_ANCHORS } from './vesperLodge.ts';
import { LITTER, scatterGroups, scatterPacks } from './populate.ts';
import { furnish, type Dressing } from './furnish.ts';
import { ATRIUM_ANCHORS } from './meridianAtrium.ts';

const plan = drawBlueprint({ width: 108, height: 101 }, [
  room('stockroom', 1, 1, 106, 23, 'plating'),
  room('dispensary', 77, 36, 30, 30, 'concrete'),
  room('surgery', 1, 26, 74, 50, 'carpet'),
  room('cold-store', 1, 78, 106, 22, 'plating'),
  patch(14, 34, 10, 6, 'coolant'),
  patch(50, 34, 10, 6, 'coolant'),
  patch(14, 62, 10, 6, 'coolant'),
  patch(50, 62, 10, 6, 'coolant'),
  link('dispensary', 'surgery', 2),
  link('dispensary', 'stockroom', 7, 'concrete'),
  link('dispensary', 'cold-store', 7, 'concrete'),
  pillars('surgery', 12, 10, 5),
  pillars('cold-store', 13, 8, 4),
  pillars('stockroom', 13, 8, 4),
  exit('east', 'dispensary', 'east', 13),
]);

export const VESPER_PHARMACY_ANCHORS = {
  
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [];

const fixtures: ObjectPlacement[] = [
    { instanceId: 'vp-still-a', objectId: 'tincture-still', position: plan.at('stockroom', 104, 0) },
    { instanceId: 'vp-still-b', objectId: 'tincture-still', position: plan.at('stockroom', 51, 8) },
    { instanceId: 'vp-still-c', objectId: 'tincture-still', position: plan.at('stockroom', 1, 21) },
    { instanceId: 'vp-still-d', objectId: 'tincture-still', position: plan.at('cold-store', 104, 20) },
    { instanceId: 'vp-still-e', objectId: 'tincture-still', position: plan.at('cold-store', 51, 11) },
    { instanceId: 'vp-still-f', objectId: 'tincture-still', position: plan.at('cold-store', 1, 1) },
    { instanceId: 'vp-dispensary-papers', objectId: 'litter-papers', position: plan.at('dispensary', 17, 2) },
    { instanceId: 'vp-stockroom-debris', objectId: 'litter-debris', position: plan.at('stockroom', 25, 14) },
    { instanceId: 'vp-cold-puddle', objectId: 'litter-puddle', position: plan.at('cold-store', 64, 2) },
  ];

const residents: CreaturePlacement[] = [
    { instanceId: 'vp-stock-wraith-a', creatureId: 'prescription-wraith', position: plan.at('stockroom', 96, 2) },
    { instanceId: 'vp-stock-wraith-b', creatureId: 'prescription-wraith', position: plan.at('stockroom', 70, 19) },
    { instanceId: 'vp-stock-wraith-c', creatureId: 'prescription-wraith', position: plan.at('stockroom', 32, 2) },
    { instanceId: 'vp-stock-wraith-d', creatureId: 'prescription-wraith', position: plan.at('stockroom', 13, 20) },
    { instanceId: 'vp-cold-wraith-a', creatureId: 'prescription-wraith', position: plan.at('cold-store', 89, 3) },
    { instanceId: 'vp-cold-wraith-b', creatureId: 'prescription-wraith', position: plan.at('cold-store', 64, 18) },
    { instanceId: 'vp-cold-wraith-c', creatureId: 'prescription-wraith', position: plan.at('cold-store', 29, 2) },
    { instanceId: 'vp-cold-wraith-d', creatureId: 'prescription-wraith', position: plan.at('cold-store', 6, 16) },
    { instanceId: 'vp-surgery-wraith-a', creatureId: 'prescription-wraith', position: plan.at('surgery', 44, 3) },
    { instanceId: 'vp-surgery-wraith-b', creatureId: 'prescription-wraith', position: plan.at('surgery', 44, 46) },
    { instanceId: 'vp-surgery-physician', creatureId: 'the-chief-physician', position: plan.at('surgery', 22, 25) },
  ];

const assemblies: AssemblyPlacement[] = [
  install('vp-surgery-door', 'surgery-door', plan.linkTile('dispensary', 'surgery', 0), 'west'),
];

const placed = [...npcs, ...fixtures, ...assemblies, ...residents];

const furnishings = scatterGroups(plan, placed, [
  ['stockroom', 'vp-stockroom-node', ['tincture-still'], 3],
  ['cold-store', 'vp-cold-node', ['tincture-still'], 3],
  ['dispensary', 'vp-dispensary-litter', LITTER, 5],
]);

const packs = scatterPacks(plan, [...placed, ...furnishings], [
  ['stockroom', 'vp-wraith-stockroom-pack', 'prescription-wraith', 12],
  ['cold-store', 'vp-wraith-cold-pack', 'prescription-wraith', 12],
  ['surgery', 'vp-wraith-surgery-pack', 'prescription-wraith', 4],
]);

const dressing: Dressing = {
  'stockroom': 'freight',
  'dispensary': 'medical',
  'surgery': { theme: 'medical', density: 'sparse' },
  'cold-store': 'cold',
};

export const VESPER_PHARMACY: DistrictDefinition = furnish(plan, {
  id: 'vesper-pharmacy',
  name: 'Vesper Pharmacy',
  subtitle: 'Vesper Wing — Dispensary and Surgery',
  tier: 13,
  region: 'vesper',
  deadEnd: true,
  recovery: { districtId: 'meridian-atrium', position: ATRIUM_ANCHORS.recovery },
  ambience: { darkness: 0.6, tint: '#140f18', fog: '#18131c', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: VESPER_PHARMACY_ANCHORS,
  areas: [
    plan.area('stockroom', 'Stockroom'),
    plan.area('dispensary', 'Dispensary'),
    plan.area('surgery', 'The Surgery', { multiCombat: true }),
    plan.area('cold-store', 'Cold Store'),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  assemblies,
  creatures: [...residents, ...packs],
  lights: [
    { position: plan.spot('dispensary', 17, 15), radius: 11, color: '#ffe8b8', intensity: 0.5 },
    { position: plan.spot('stockroom', 83, 8), radius: 13, color: '#c88ad8', intensity: 0.45 },
    { position: plan.spot('stockroom', 25, 8), radius: 14, color: '#c88ad8', intensity: 0.45 },
    { position: plan.spot('surgery', 59, 25), radius: 13, color: '#ffe8b8', intensity: 0.55 },
    { position: plan.spot('surgery', 18, 25), radius: 14, color: '#ff6a7a', intensity: 0.65 },
    { position: plan.spot('cold-store', 83, 11), radius: 13, color: '#c88ad8', intensity: 0.4 },
    { position: plan.spot('cold-store', 19, 13), radius: 14, color: '#ffe8b8', intensity: 0.4 },
  ],
}, dressing);
