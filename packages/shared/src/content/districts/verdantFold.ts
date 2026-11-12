import { install } from '../installations.ts';
import type { AssemblyPlacement } from '../../world/assemblies.ts';
import { drawBlueprint, link, patch, room } from '../../world/blueprint.ts';
import type { DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { scatterGroups } from './populate.ts';
import { furnish, type Dressing } from './furnish.ts';

const plan = drawBlueprint({ width: 46, height: 30 }, [
  room('grove', 10, 1, 26, 28, 'soil', 'round'),
  room('west-crease', 1, 9, 8, 12, 'soil', 'round'),
  room('east-crease', 37, 9, 8, 12, 'soil', 'round'),
  patch(14, 7, 5, 3, 'coolant'),
  patch(28, 20, 5, 3, 'coolant'),
  patch(20, 11, 7, 6, 'concrete'),
  link('west-crease', 'grove', 3, 'soil'),
  link('grove', 'east-crease', 3, 'soil'),
]);

export const VERDANT_FOLD_ANCHORS = {
  arrival: plan.at('grove', 13, 24),
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [];

const fixtures: ObjectPlacement[] = [
  { instanceId: 'fold-heartwood', objectId: 'fold-heartwood', position: plan.at('grove', 13, 13) },
    { instanceId: 'fold-planter-a', objectId: 'planter', position: plan.at('grove', 3, 17) },
    { instanceId: 'fold-planter-b', objectId: 'planter', position: plan.at('grove', 23, 21) },
  ];

const assemblies: AssemblyPlacement[] = [
  install('fold-exit', 'verdant-fold-exit', plan.at('grove', 13, 27), 'north'),
];

const placed = [...npcs, ...fixtures, ...assemblies];

const furnishings = scatterGroups(plan, placed, [
  ['grove', 'vf-grove-litter', ['litter-gravel', 'litter-puddle'], 4],
]);

const dressing: Dressing = {
  'grove': { theme: 'garden', density: 'dense', composition: 'court' },
};

export const VERDANT_FOLD: DistrictDefinition = furnish(plan, {
  id: 'verdant-fold',
  name: 'The Verdant Fold',
  subtitle: 'A Garden Folded Out of Hydroponics',
  tier: 2,
  condition: 'uncanny',
  region: 'meridian-core',
  ambience: { darkness: 0.55, tint: '#140a1e', fog: '#0c1a12' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: VERDANT_FOLD_ANCHORS,
  areas: [
    plan.area('grove', 'The Folded Grove'),
    plan.area('west-crease', 'The Left Crease'),
    plan.area('east-crease', 'The Right Crease'),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  assemblies,
  lights: [
    { position: plan.center('west-crease'), radius: 5, color: '#b57cff', intensity: 0.5 },
    { position: plan.center('east-crease'), radius: 5, color: '#b57cff', intensity: 0.5 },
    { position: plan.spot('grove', 19, 10), radius: 11, color: '#7cf29a', intensity: 0.8 },
    { position: plan.spot('grove', 6, 3), radius: 9, color: '#b57cff', intensity: 0.6 },
    { position: plan.spot('grove', 17, 25), radius: 9, color: '#9fd8ff', intensity: 0.5 },
  ],
}, dressing);
