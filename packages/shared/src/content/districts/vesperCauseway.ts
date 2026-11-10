import type { AssemblyPlacement } from '../../world/assemblies.ts';
import { drawBlueprint, exit, link, pillars, room, track } from '../../world/blueprint.ts';
import type { DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { HYDROPONICS_ANCHORS } from './hydroponics.ts';
import { CIVIC_PROPS, LITTER, scatterGroups } from './populate.ts';

const plan = drawBlueprint({ width: 80, height: 71 }, [
  room('sanatorium-rise', 14, 0, 13, 57, 'concrete'),
  room('walk', 14, 57, 66, 13, 'concrete'),
  room('porters-yard', 32, 20, 40, 30, 'plating'),
  link('walk', 'porters-yard', 7, 'concrete'),
  link('sanatorium-rise', 'porters-yard', 5, 'concrete'),
  pillars('walk', 8, 6, 3),
  track([0, 16], [78, 16]),
  exit('east', 'walk', 'east', 13),
  exit('north', 'sanatorium-rise', 'north', 13),
]);

export const VESPER_CAUSEWAY_ANCHORS = {
  
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [];

const fixtures: ObjectPlacement[] = [
  
    { instanceId: 'vsw-sign', objectId: 'warning-sign', position: plan.at('walk', 63, 0) },
    { instanceId: 'vsw-bench', objectId: 'briefing-bench', position: plan.at('walk', 46, 0) },
    { instanceId: 'vsw-pipes', objectId: 'pipe-cluster', position: plan.at('walk', 15, 12) },
    { instanceId: 'vsw-papers', objectId: 'litter-papers', position: plan.at('walk', 37, 2) },
    { instanceId: 'vsw-debris', objectId: 'litter-debris', position: plan.at('walk', 6, 1) },
    { instanceId: 'vsw-puddle', objectId: 'litter-puddle', position: plan.at('walk', 56, 3) },
  ];

const assemblies: AssemblyPlacement[] = [1, 4, 7, 10].map((dx, index) => ({
  instanceId: `vsw-line-bridge-${index + 1}`,
  assemblyId: 'bridge',
  position: plan.spot('sanatorium-rise', dx, 15),
  facing: 'south',
  span: 2,
}));

const placed = [...npcs, ...fixtures];

const furnishings = scatterGroups(plan, placed, [
  ['walk', 'vsw-prop', CIVIC_PROPS, 8],
  ['walk', 'vsw-litter', LITTER, 6],
  ['sanatorium-rise', 'vsw-rise-litter', LITTER, 8],
  ['porters-yard', 'vsw-yard-prop', ['briefing-bench', 'planter', 'wall-locker', 'storage-rack'], 10],
]);

export const VESPER_CAUSEWAY: DistrictDefinition = {
  id: 'vesper-causeway',
  name: 'Sanatorium Walk',
  subtitle: 'Vesper Wing — Covered Walk',
  tier: 12,
  region: 'vesper',
  recovery: { districtId: 'hydroponics', position: HYDROPONICS_ANCHORS.tramPlatform },
  ambience: { darkness: 0.58, tint: '#0f1614', fog: '#121a18', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: VESPER_CAUSEWAY_ANCHORS,
  areas: [
    plan.area('walk', 'Sanatorium Walk'),
    plan.area('sanatorium-rise', 'Sanatorium Rise'),
    plan.area('porters-yard', 'Porters\' Yard'),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  assemblies,
  lights: [
    { position: plan.center('sanatorium-rise'), radius: 9, color: '#d8e7ef', intensity: 0.5 },
    { position: plan.center('porters-yard'), radius: 9, color: '#c8ffe0', intensity: 0.5 },
    { position: plan.spot('walk', 59, 2), radius: 9, color: '#6ad8b8', intensity: 0.4 },
    { position: plan.spot('walk', 31, 2), radius: 9, color: '#ffe8b8', intensity: 0.35 },
    { position: plan.spot('walk', 3, 2), radius: 9, color: '#6ad8b8', intensity: 0.45 },
  ],
};
