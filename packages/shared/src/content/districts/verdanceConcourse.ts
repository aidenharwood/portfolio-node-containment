import { drawBlueprint, exit, link, patch, pillars, room } from '../../world/blueprint.ts';
import type { AssemblyPlacement } from '../../world/assemblies.ts';
import type { DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { ATRIUM_ANCHORS } from './meridianAtrium.ts';
import { CIVIC_PROPS, INDUSTRIAL_PROPS, LITTER, OFFICE_PROPS, scatterGroups } from './populate.ts';
import { furnish, type Dressing } from './furnish.ts';

const plan = drawBlueprint({ width: 100, height: 47 }, [
  room('concourse', 0, 17, 100, 13, 'plating'),
  room('seed-exchange', 6, 1, 38, 14, 'soil'),
  room('irrigation-plant', 56, 1, 38, 14, 'grate'),
  room('gardeners-row', 6, 32, 38, 14, 'carpet'),
  room('compost-yard', 56, 32, 38, 14, 'soil'),
  link('concourse', 'seed-exchange', 7, 'plating'),
  link('concourse', 'irrigation-plant', 7, 'plating'),
  link('concourse', 'gardeners-row', 7, 'plating'),
  link('concourse', 'compost-yard', 7, 'plating'),
  patch(48, 1, 3, 45, 'coolant'),
  pillars('concourse', 8, 6, 3),
  exit('west', 'concourse', 'west', 13),
  exit('east', 'concourse', 'east', 13),
]);

export const VERDANCE_CONCOURSE_ANCHORS = {
  
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [];

const fixtures: ObjectPlacement[] = [
  
    { instanceId: 'vc-puddle', objectId: 'litter-puddle', position: plan.at('concourse', 20, 2) },
    { instanceId: 'vc-papers', objectId: 'litter-papers', position: plan.at('concourse', 96, 1) },
    { instanceId: 'vc-debris', objectId: 'litter-debris', position: plan.at('concourse', 2, 12) },
    { instanceId: 'vc-gravel', objectId: 'litter-gravel', position: plan.at('concourse', 98, 2) },
  ];

const assemblies: AssemblyPlacement[] = [
  { instanceId: 'vc-bridge-north', assemblyId: 'bridge', position: plan.spot('concourse', 47, 1), facing: 'east', span: 3 },
  { instanceId: 'vc-bridge-south', assemblyId: 'bridge', position: plan.spot('concourse', 47, 10), facing: 'east', span: 3 },
    { instanceId: 'vc-cable-run', assemblyId: 'cable-run', position: plan.spot('concourse', 79, 12), facing: 'east', span: 3 },
  ];

const placed = [...npcs, ...fixtures, ...assemblies];

const furnishings = scatterGroups(plan, placed, [
  ['concourse', 'vc-prop', CIVIC_PROPS, 10],
  ['concourse', 'vc-litter', LITTER, 8],
  ['seed-exchange', 'seed-exchange-prop', ['planter', 'planter', 'briefing-bench', 'storage-rack'], 8],
  ['irrigation-plant', 'irrigation-plant-prop', INDUSTRIAL_PROPS, 8],
  ['gardeners-row', 'gardeners-row-prop', OFFICE_PROPS, 8],
  ['compost-yard', 'compost-yard-prop', ['planter', 'litter-gravel', 'storage-rack'], 8],
]);

const dressing: Dressing = {
  'concourse': 'garden',
  'seed-exchange': { theme: 'garden', density: 'dense' },
  'irrigation-plant': 'wet',
  'gardeners-row': 'garden',
  'compost-yard': 'garden',
};

export const VERDANCE_CONCOURSE: DistrictDefinition = furnish(plan, {
  id: 'verdance-concourse',
  name: 'Verdance Concourse',
  subtitle: 'Site Meridian — West Transit Corridor',
  tier: 1,
  region: 'meridian-core',
  recovery: { districtId: 'meridian-atrium', position: ATRIUM_ANCHORS.recovery },
  ambience: { darkness: 0.5, tint: '#0a1a12', fog: '#0c1e14' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: VERDANCE_CONCOURSE_ANCHORS,
  areas: [
    plan.area('concourse', 'Verdance Concourse'),
    plan.area('seed-exchange', 'Seed Exchange', { safe: true }),
    plan.area('irrigation-plant', 'Irrigation Plant'),
    plan.area('gardeners-row', 'Gardeners\' Row', { safe: true }),
    plan.area('compost-yard', 'Compost Yard'),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  assemblies,
  lights: [
    { position: plan.center('seed-exchange'), radius: 9, color: '#7cf29a', intensity: 0.5 },
    { position: plan.center('irrigation-plant'), radius: 9, color: '#4fd8ff', intensity: 0.5 },
    { position: plan.center('gardeners-row'), radius: 9, color: '#ffd27f', intensity: 0.5 },
    { position: plan.center('compost-yard'), radius: 9, color: '#c8ff7a', intensity: 0.5 },
    { position: plan.spot('concourse', 3, 2), radius: 9, color: '#7cf29a', intensity: 0.5 },
    { position: plan.spot('concourse', 54, 2), radius: 7, color: '#4fd8ff', intensity: 0.55 },
    { position: plan.spot('concourse', 97, 2), radius: 9, color: '#9fd8ff', intensity: 0.45 },
  ],
}, dressing);
