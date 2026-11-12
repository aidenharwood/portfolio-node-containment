import { install } from '../installations.ts';
import type { AssemblyPlacement } from '../../world/assemblies.ts';
import { drawBlueprint, link, patch, pillars, room } from '../../world/blueprint.ts';
import type { CreaturePlacement, DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { scatterGroups, scatterPacks } from './populate.ts';
import { furnish, type Dressing } from './furnish.ts';

const plan = drawBlueprint({ width: 72, height: 52 }, [
  room('dead-letter-stacks', 1, 1, 23, 16, 'rust'),
  room('franking-hall', 26, 1, 20, 16, 'carpet'),
  room('returned-stacks', 48, 1, 23, 16, 'rust'),
  room('sorting-floor', 1, 18, 70, 18, 'concrete'),
  room('dispatch', 14, 37, 44, 14, 'grate', 'octagon'),
  patch(20, 46, 32, 1, 'hazard'),
  patch(30, 26, 12, 2, 'carpet'),
  link('dead-letter-stacks', 'franking-hall', 3),
  link('franking-hall', 'returned-stacks', 3),
  link('franking-hall', 'sorting-floor', 4),
  link('dead-letter-stacks', 'sorting-floor', 5, 'rust'),
  link('returned-stacks', 'sorting-floor', 5, 'rust'),
  link('sorting-floor', 'dispatch', 4),
  pillars('sorting-floor', 8, 6, 4),
]);

export const DEAD_LETTER_OFFICE_ANCHORS = {
  spawn: plan.at('franking-hall', 4, 6),
  chuteArrival: plan.at('franking-hall', 3, 2),
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [
    { instanceId: 'dlo-oduya', npcId: 'courier-oduya', position: plan.at('franking-hall', 12, 2) },
  ];

const fixtures: ObjectPlacement[] = [
  
    { instanceId: 'dlo-hall-desk', objectId: 'franking-counter', position: plan.at('franking-hall', 12, 0) },
    { instanceId: 'dlo-hall-cabinet-a', objectId: 'filing-cabinet', position: plan.at('franking-hall', 19, 0) },
    { instanceId: 'dlo-hall-cabinet-b', objectId: 'filing-cabinet', position: plan.at('franking-hall', 0, 15), facing: 'north' },
    { instanceId: 'dlo-hall-board', objectId: 'notice-board', position: plan.at('franking-hall', 2, 0) },
    { instanceId: 'dlo-hall-storage', objectId: 'storage-locker', position: plan.at('franking-hall', 19, 15), facing: 'north' },
    { instanceId: 'dlo-hall-bed', objectId: 'med-bed', position: plan.at('franking-hall', 17, 15) },
    { instanceId: 'dlo-sorting-pigeonhole-a', objectId: 'pigeonhole-thale', position: plan.at('sorting-floor', 7, 0) },
    { instanceId: 'dlo-sorting-pigeonhole-b', objectId: 'pigeonhole-achterberg', position: plan.at('sorting-floor', 62, 0) },
    { instanceId: 'dlo-sorting-rack-a', objectId: 'letter-rack', position: plan.at('sorting-floor', 23, 0) },
    { instanceId: 'dlo-sorting-rack-b', objectId: 'letter-rack', position: plan.at('sorting-floor', 46, 0) },
    { instanceId: 'dlo-sorting-rack-c', objectId: 'letter-rack', position: plan.at('sorting-floor', 3, 10) },
    { instanceId: 'dlo-sorting-rack-d', objectId: 'letter-rack', position: plan.at('sorting-floor', 66, 10) },
    { instanceId: 'dlo-sorting-sign', objectId: 'warning-sign', position: plan.at('sorting-floor', 69, 17), facing: 'north' },
    { instanceId: 'dlo-stacks-pigeonhole-a', objectId: 'pigeonhole-halvorsen', position: plan.at('dead-letter-stacks', 0, 3), facing: 'east' },
    { instanceId: 'dlo-stacks-pigeonhole-b', objectId: 'pigeonhole-sel', position: plan.at('dead-letter-stacks', 22, 14), facing: 'west' },
    { instanceId: 'dlo-stacks-shelf-a', objectId: 'letter-rack', position: plan.at('dead-letter-stacks', 3, 8) },
    { instanceId: 'dlo-stacks-shelf-b', objectId: 'letter-rack', position: plan.at('dead-letter-stacks', 19, 8) },
    { instanceId: 'dlo-stacks-cabinet', objectId: 'filing-cabinet', position: plan.at('dead-letter-stacks', 0, 15), facing: 'north' },
    { instanceId: 'dlo-engine', objectId: 'franking-engine', position: plan.at('dispatch', 22, 13) },
    { instanceId: 'dlo-dispatch-pillar-west', objectId: 'light-pillar', position: plan.at('dispatch', 1, 11) },
    { instanceId: 'dlo-dispatch-pillar-east', objectId: 'light-pillar', position: plan.at('dispatch', 42, 11) },
    { instanceId: 'dlo-dispatch-rack-a', objectId: 'letter-rack', position: plan.at('dispatch', 3, 0) },
    { instanceId: 'dlo-dispatch-rack-b', objectId: 'letter-rack', position: plan.at('dispatch', 40, 0) },
  ];

const residents: CreaturePlacement[] = [
    { instanceId: 'dlo-clerk-a', creatureId: 'franking-clerk', position: plan.at('sorting-floor', 2, 2) },
    { instanceId: 'dlo-clerk-b', creatureId: 'franking-clerk', position: plan.at('sorting-floor', 31, 3) },
    { instanceId: 'dlo-clerk-c', creatureId: 'franking-clerk', position: plan.at('sorting-floor', 62, 3) },
    { instanceId: 'dlo-clerk-d', creatureId: 'franking-clerk', position: plan.at('sorting-floor', 11, 15) },
    { instanceId: 'dlo-clerk-e', creatureId: 'franking-clerk', position: plan.at('sorting-floor', 38, 14) },
    { instanceId: 'dlo-clerk-f', creatureId: 'franking-clerk', position: plan.at('sorting-floor', 66, 16) },
    { instanceId: 'dlo-echo-a', creatureId: 'courier-echo', position: plan.at('dead-letter-stacks', 2, 2) },
    { instanceId: 'dlo-echo-b', creatureId: 'courier-echo', position: plan.at('dead-letter-stacks', 20, 3) },
    { instanceId: 'dlo-echo-c', creatureId: 'courier-echo', position: plan.at('dead-letter-stacks', 2, 12) },
    { instanceId: 'dlo-echo-d', creatureId: 'courier-echo', position: plan.at('dead-letter-stacks', 20, 13) },
    { instanceId: 'dlo-postmaster', creatureId: 'the-postmaster', position: plan.at('dispatch', 22, 7) },
    { instanceId: 'dlo-postmaster-add-clerk', creatureId: 'franking-clerk', position: plan.at('dispatch', 5, 11) },
    { instanceId: 'dlo-postmaster-add-echo', creatureId: 'courier-echo', position: plan.at('dispatch', 38, 11) },
  ];

const assemblies: AssemblyPlacement[] = [
  install('dlo-return', 'office-return-chute', plan.at('franking-hall', 0, 1), 'east'),
];

const placed = [...npcs, ...fixtures, ...assemblies, ...residents];

const furnishings = scatterGroups(plan, placed, [
  ['sorting-floor', 'dlo-sorting-litter', ['litter-papers'], 8],
  ['dispatch', 'dlo-dispatch-litter', ['litter-papers'], 6],
]);

const packs = scatterPacks(plan, [...placed, ...furnishings], [
  ['sorting-floor', 'dlo-clerk-sorting-pack', 'franking-clerk', 4],
  ['returned-stacks', 'dlo-echo-returned-pack', 'courier-echo', 4],
]);

const dressing: Dressing = {
  'dead-letter-stacks': 'post',
  'franking-hall': 'post',
  'returned-stacks': 'post',
  'sorting-floor': 'post',
  'dispatch': 'post',
};

export const DEAD_LETTER_OFFICE: DistrictDefinition = furnish(plan, {
  id: 'dead-letter-office',
  name: 'The Dead Letter Office',
  subtitle: 'Where the Post Went Instead',
  tier: 9,
  region: 'meridian-core',
  recovery: { districtId: 'dead-letter-office', position: DEAD_LETTER_OFFICE_ANCHORS.spawn },
  ambience: { darkness: 0.64, tint: '#1a1408', fog: '#18120a', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: DEAD_LETTER_OFFICE_ANCHORS,
  areas: [
    plan.area('franking-hall', 'The Franking Hall', { safe: true }),
    plan.area('sorting-floor', 'The Sorting Floor'),
    plan.area('dead-letter-stacks', 'The Dead Letter Stacks'),
    plan.area('dispatch', 'Dispatch', { multiCombat: true }),
    plan.area('returned-stacks', 'The Returned Stacks'),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  assemblies,
  creatures: [...residents, ...packs],
  lights: [
    { position: plan.center('returned-stacks'), radius: 8, color: '#b57cff', intensity: 0.5 },
    { position: plan.spot('franking-hall', 7, 3), radius: 11, color: '#ffcf8a', intensity: 0.55 },
    { position: plan.spot('sorting-floor', 15, 5), radius: 13, color: '#e8d8a8', intensity: 0.4 },
    { position: plan.spot('sorting-floor', 58, 12), radius: 13, color: '#b57cff', intensity: 0.4 },
    { position: plan.spot('dead-letter-stacks', 8, 8), radius: 12, color: '#c9a227', intensity: 0.35 },
    { position: plan.spot('dispatch', 22, 10), radius: 14, color: '#ff8a4a', intensity: 0.6 },
  ],
}, dressing);
