import { drawBlueprint, link, patch, room } from '../../world/blueprint.ts';
import type { DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { LITTER, scatterGroups } from './populate.ts';

const plan = drawBlueprint({ width: 38, height: 33 }, [
  room('threshold', 4, 1, 30, 22, 'concrete', 'octagon'),
  room('reflecting-hall', 4, 24, 30, 8, 'plating'),
  patch(11, 6, 16, 12, 'carpet'),
  patch(10, 2, 4, 3, 'coolant'),
  patch(24, 2, 4, 3, 'coolant'),
  patch(9, 5, 1, 1, 'glass'),
  patch(28, 5, 1, 1, 'glass'),
  patch(9, 18, 1, 1, 'glass'),
  patch(28, 18, 1, 1, 'glass'),
  patch(9, 27, 20, 2, 'coolant'),
  link('threshold', 'reflecting-hall', 3, 'concrete', 5),
  link('threshold', 'reflecting-hall', 3, 'concrete', 22),
]);

export const SECTOR_THREE_ANCHORS = {
  arrival: plan.at('threshold', 2, 10),
  deepwatchArrival: plan.at('threshold', 27, 10),
  knockReturn: plan.at('threshold', 15, 7),
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [
    { instanceId: 's3-halvorsen', npcId: 'dr-halvorsen', position: plan.at('threshold', 16, 12) },
  ];

const fixtures: ObjectPlacement[] = [
  { instanceId: 's3-return-a', objectId: 'sector-three-return', position: plan.at('threshold', 0, 10), facing: 'east' },
  { instanceId: 's3-return-b', objectId: 'sector-three-return', position: plan.at('threshold', 0, 11), facing: 'east' },
  { instanceId: 's3-deepwatch-a', objectId: 'sector-three-deepwatch-door', position: plan.at('threshold', 29, 10), facing: 'west' },
  { instanceId: 's3-deepwatch-b', objectId: 'sector-three-deepwatch-door', position: plan.at('threshold', 29, 11), facing: 'west' },
  { instanceId: 's3-knock', objectId: 'the-knock', position: plan.at('threshold', 15, 3) },
    { instanceId: 's3-lantern-echo', objectId: 'lantern-echo', position: plan.at('threshold', 26, 19) },
  ];

const placed = [...npcs, ...fixtures];

const furnishings = scatterGroups(plan, placed, [
  ['reflecting-hall', 's3-hall-prop', ['light-pillar', 'briefing-bench'], 4],
  ['threshold', 's3-threshold-litter', LITTER, 4],
]);

export const SECTOR_THREE: DistrictDefinition = {
  id: 'sector-three',
  name: 'Sector 3',
  subtitle: 'The Threshold',
  tier: 4,
  region: 'meridian-core',
  ambience: { darkness: 0.55, tint: '#120a1c', fog: '#140c22', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: SECTOR_THREE_ANCHORS,
  areas: [
    plan.area('threshold', 'The Threshold', { safe: true }),
    plan.area('reflecting-hall', 'The Reflecting Hall', { safe: true }),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  lights: [
    { position: plan.center('reflecting-hall'), radius: 8, color: '#b57cff', intensity: 0.5 },
    { position: plan.spot('threshold', 16, 2), radius: 12, color: '#b57cff', intensity: 0.8 },
    { position: plan.spot('threshold', 3, 12), radius: 7, color: '#ffb347', intensity: 0.4 },
    { position: plan.spot('threshold', 26, 19), radius: 7, color: '#ffb347', intensity: 0.5 },
  ],
};
