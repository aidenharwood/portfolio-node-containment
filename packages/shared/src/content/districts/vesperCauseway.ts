import { drawBlueprint, exit, link, pillars, room } from '../../world/blueprint.ts';
import type { DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { HYDROPONICS_ANCHORS } from './hydroponics.ts';
import { LITTER, scatterGroups } from './populate.ts';
import { furnish, type Dressing } from './furnish.ts';
import { ATRIUM_ANCHORS } from './meridianAtrium.ts';

const plan = drawBlueprint({ width: 80, height: 71 }, [
  room('sanatorium-rise', 14, 0, 13, 57, 'concrete'),
  room('walk', 14, 57, 66, 13, 'concrete'),
  room('porters-yard', 32, 20, 40, 30, 'plating'),
  link('walk', 'porters-yard', 7, 'concrete'),
  link('sanatorium-rise', 'porters-yard', 5, 'concrete'),
  pillars('walk', 8, 6, 3),
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

const placed = [...npcs, ...fixtures];

const furnishings = scatterGroups(plan, placed, [
  ['walk', 'vsw-litter', LITTER, 6],
  ['sanatorium-rise', 'vsw-rise-litter', LITTER, 8],
]);

const dressing: Dressing = {
  'sanatorium-rise': 'ward',
  'walk': 'civic',
  'porters-yard': 'ward',
};

export const VESPER_CAUSEWAY: DistrictDefinition = furnish(plan, {
  id: 'vesper-causeway',
  name: 'Sanatorium Walk',
  subtitle: 'Vesper Wing — Covered Walk',
  tier: 12,
  region: 'vesper',
  recovery: { districtId: 'meridian-atrium', position: ATRIUM_ANCHORS.recovery },
  ambience: { darkness: 0.58, tint: '#0f1614', fog: '#121a18', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: VESPER_CAUSEWAY_ANCHORS,
  areas: [
    plan.area('walk', 'Sanatorium Walk'),
    plan.area('sanatorium-rise', 'Sanatorium Rise'),
    plan.area('porters-yard', 'Porters\' Yard', { safe: true }),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  lights: [
    { position: plan.center('sanatorium-rise'), radius: 9, color: '#d8e7ef', intensity: 0.5 },
    { position: plan.center('porters-yard'), radius: 9, color: '#c8ffe0', intensity: 0.5 },
    { position: plan.spot('walk', 59, 2), radius: 9, color: '#6ad8b8', intensity: 0.4 },
    { position: plan.spot('walk', 31, 2), radius: 9, color: '#ffe8b8', intensity: 0.35 },
    { position: plan.spot('walk', 3, 2), radius: 9, color: '#6ad8b8', intensity: 0.45 },
  ],
}, dressing);
