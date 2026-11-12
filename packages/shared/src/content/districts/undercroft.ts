import { install } from '../installations.ts';
import type { AssemblyPlacement } from '../../world/assemblies.ts';
import { drawBlueprint, link, patch, pillars, room } from '../../world/blueprint.ts';
import type { CreaturePlacement, DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { ATRIUM_ANCHORS } from './meridianAtrium.ts';
import { LITTER, scatterGroups, scatterPacks } from './populate.ts';
import { furnish, type Dressing } from './furnish.ts';

const plan = drawBlueprint({ width: 110, height: 80 }, [
  room('landing', 1, 1, 18, 14, 'grate'),
  room('tunnel', 20, 5, 50, 5, 'rust'),
  room('junction-room', 72, 1, 20, 18, 'plating'),
  room('camp', 1, 17, 22, 16, 'concrete'),
  room('pump-hall', 25, 13, 44, 30, 'rust'),
  room('warrens', 1, 35, 22, 44, 'rust'),
  room('pipe-gallery', 72, 21, 25, 28, 'concrete'),
  room('east-corridor', 99, 1, 10, 48, 'rust'),
  room('flooded-sump', 25, 45, 43, 34, 'rust'),
  room('workshop', 70, 52, 39, 27, 'plating'),
  patch(30, 24, 34, 2, 'coolant'),
  patch(38, 24, 3, 2, 'grate'),
  patch(54, 24, 3, 2, 'grate'),
  patch(30, 32, 34, 2, 'coolant'),
  patch(46, 32, 3, 2, 'grate'),
  patch(32, 55, 12, 8, 'coolant'),
  patch(50, 62, 10, 10, 'coolant'),
  patch(6, 48, 4, 4, 'coolant'),
  patch(12, 62, 5, 5, 'coolant'),
  patch(84, 62, 12, 6, 'grate'),
  patch(70, 52, 39, 1, 'hazard'),
  link('landing', 'tunnel', 3),
  link('landing', 'camp', 5, 'concrete'),
  link('tunnel', 'junction-room', 5, 'rust'),
  link('tunnel', 'pump-hall', 5, 'rust'),
  link('camp', 'pump-hall', 3),
  link('camp', 'warrens', 3),
  link('pump-hall', 'pipe-gallery', 7, 'rust'),
  link('junction-room', 'pipe-gallery', 5, 'plating'),
  link('junction-room', 'east-corridor', 3),
  link('pipe-gallery', 'east-corridor', 5, 'rust'),
  link('east-corridor', 'workshop', 3),
  link('pump-hall', 'flooded-sump', 7, 'rust'),
  link('warrens', 'flooded-sump', 5, 'rust'),
  link('flooded-sump', 'workshop', 3),
  pillars('pump-hall', 9, 8, 4),
  pillars('flooded-sump', 10, 9, 5),
  pillars('pipe-gallery', 8, 8, 4),
]);

export const UNDERCROFT_ANCHORS = {
  liftArrival: plan.at('landing', 4, 3),
  sealLanding: plan.at('workshop', 37, 23),
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [
    { instanceId: 'undercroft-mags', npcId: 'mags', position: plan.at('camp', 18, 2) },
  ];

const fixtures: ObjectPlacement[] = [
  
    { instanceId: 'uc-landing-sign', objectId: 'warning-sign', position: plan.at('landing', 17, 0) },
    { instanceId: 'uc-camp-heater', objectId: 'camp-heater', position: plan.at('camp', 8, 3) },
    { instanceId: 'uc-camp-crate-a', objectId: 'supply-crate', position: plan.at('camp', 1, 1) },
    { instanceId: 'uc-camp-crate-b', objectId: 'supply-crate', position: plan.at('camp', 20, 14) },
    { instanceId: 'uc-camp-bench', objectId: 'briefing-bench', position: plan.at('camp', 2, 14) },
    { instanceId: 'uc-camp-storage', objectId: 'storage-locker', position: plan.at('camp', 0, 13), facing: 'east' },
    { instanceId: 'uc-landing-scrap', objectId: 'scrap-heap', position: plan.at('landing', 15, 13) },
    { instanceId: 'uc-slag-a', objectId: 'slag-heap', position: plan.at('pump-hall', 15, 29) },
    { instanceId: 'uc-slag-b', objectId: 'slag-heap', position: plan.at('pump-hall', 42, 29) },
    { instanceId: 'uc-slag-c', objectId: 'slag-heap', position: plan.at('pump-hall', 0, 26) },
    { instanceId: 'uc-slag-d', objectId: 'slag-heap', position: plan.at('workshop', 35, 26) },
    { instanceId: 'uc-junction-a', objectId: 'junction-box', position: plan.at('junction-room', 19, 3), facing: 'west' },
    { instanceId: 'uc-junction-b', objectId: 'junction-box', position: plan.at('pump-hall', 1, 29), facing: 'north' },
    { instanceId: 'uc-junction-c', objectId: 'junction-box', position: plan.at('east-corridor', 9, 1), facing: 'west' },
    { instanceId: 'uc-pump-north', objectId: 'pump-housing', position: plan.at('pump-hall', 24, 1) },
    { instanceId: 'uc-pump-south', objectId: 'pump-housing', position: plan.at('pump-hall', 24, 27) },
    { instanceId: 'uc-pipes-a', objectId: 'pipe-cluster', position: plan.at('pump-hall', 0, 0) },
    { instanceId: 'uc-pipes-b', objectId: 'pipe-cluster', position: plan.at('pump-hall', 43, 0) },
    { instanceId: 'uc-pipes-c', objectId: 'pipe-cluster', position: plan.at('warrens', 0, 43) },
    { instanceId: 'uc-pipes-d', objectId: 'pipe-cluster', position: plan.at('junction-room', 0, 0) },
    { instanceId: 'uc-rack-a', objectId: 'server-rack', position: plan.at('junction-room', 0, 17), facing: 'north' },
    { instanceId: 'uc-workshop-sign', objectId: 'warning-sign', position: plan.at('workshop', 38, 2), facing: 'west' },
    { instanceId: 'uc-workshop-crate', objectId: 'supply-crate', position: plan.at('workshop', 1, 26) },
  ];

const residents: CreaturePlacement[] = [
    { instanceId: 'uc-leech-hall-a', creatureId: 'pipe-leech', position: plan.at('pump-hall', 2, 2) },
    { instanceId: 'uc-leech-hall-b', creatureId: 'pipe-leech', position: plan.at('pump-hall', 41, 2) },
    { instanceId: 'uc-leech-hall-c', creatureId: 'pipe-leech', position: plan.at('pump-hall', 3, 27) },
    { instanceId: 'uc-leech-hall-d', creatureId: 'pipe-leech', position: plan.at('pump-hall', 42, 27) },
    { instanceId: 'uc-leech-warren-a', creatureId: 'pipe-leech', position: plan.at('warrens', 1, 1) },
    { instanceId: 'uc-leech-warren-b', creatureId: 'pipe-leech', position: plan.at('warrens', 19, 2) },
    { instanceId: 'uc-leech-warren-c', creatureId: 'pipe-leech', position: plan.at('warrens', 3, 42) },
    { instanceId: 'uc-leech-warren-d', creatureId: 'pipe-leech', position: plan.at('warrens', 20, 42) },
    { instanceId: 'uc-leech-warren-e', creatureId: 'pipe-leech', position: plan.at('warrens', 13, 3) },
    { instanceId: 'uc-hound-room-a', creatureId: 'rust-hound', position: plan.at('junction-room', 2, 3) },
    { instanceId: 'uc-hound-room-b', creatureId: 'rust-hound', position: plan.at('junction-room', 17, 16) },
    { instanceId: 'uc-hound-corridor', creatureId: 'rust-hound', position: plan.at('east-corridor', 3, 0) },
    { instanceId: 'uc-hound-hall', creatureId: 'rust-hound', position: plan.at('pump-hall', 32, 28) },
    { instanceId: 'uc-foreman', creatureId: 'the-foreman', position: plan.at('workshop', 24, 23) },
    { instanceId: 'uc-foreman-add-a', creatureId: 'pipe-leech', position: plan.at('workshop', 2, 13) },
    { instanceId: 'uc-foreman-add-b', creatureId: 'pipe-leech', position: plan.at('workshop', 37, 25) },
  ];

const assemblies: AssemblyPlacement[] = [
  install('uc-service-lift', 'undercroft-service-lift', plan.at('landing', 1, 0), 'south'),
  install('uc-camp-refinery', 'refinery', plan.at('camp', 3, 0), 'south'),
  install('uc-camp-fabricator', 'fabricator', plan.at('camp', 13, 0), 'south'),
  install('uc-camp-synthesiser', 'synthesiser', plan.at('camp', 19, 0), 'south'),
  install('uc-sector-three-seal', 'sector-three-seal', plan.at('workshop', 38, 23), 'west'),
];

const placed = [...npcs, ...fixtures, ...assemblies, ...residents];

const furnishings = scatterGroups(plan, placed, [
  ['flooded-sump', 'uc-sump-node', ['slag-heap'], 3],
  ['pipe-gallery', 'uc-gallery-node', ['junction-box'], 2],
  ['pump-hall', 'uc-hall-litter', LITTER, 8],
  ['flooded-sump', 'uc-sump-litter', LITTER, 8],
  ['warrens', 'uc-warrens-litter', LITTER, 6],
  ['tunnel', 'uc-tunnel-litter', LITTER, 4],
  ['east-corridor', 'uc-corridor-litter', LITTER, 4],
]);

const packs = scatterPacks(plan, [...placed, ...furnishings], [
  ['flooded-sump', 'uc-leech-sump-pack', 'pipe-leech', 6],
  ['pipe-gallery', 'uc-hound-gallery-pack', 'rust-hound', 4],
  ['warrens', 'uc-leech-warren-pack', 'pipe-leech', 3],
  ['pump-hall', 'uc-leech-hall-pack', 'pipe-leech', 3],
  ['east-corridor', 'uc-hound-corridor-pack', 'rust-hound', 2],
  ['tunnel', 'uc-leech-tunnel-pack', 'pipe-leech', 1],
]);

const dressing: Dressing = {
  'landing': 'camp',
  'tunnel': { theme: 'wet', density: 'sparse' },
  'junction-room': 'industrial',
  'camp': { theme: 'camp', density: 'dense' },
  'pump-hall': 'wet',
  'warrens': 'wet',
  'pipe-gallery': 'industrial',
  'east-corridor': 'industrial',
  'flooded-sump': 'wet',
  'workshop': 'industrial',
};

export const UNDERCROFT: DistrictDefinition = furnish(plan, {
  id: 'undercroft',
  name: 'The Undercroft',
  subtitle: 'Site Meridian — Abandoned Maintenance Level',
  tier: 3,
  region: 'meridian-core',
  recovery: { districtId: 'meridian-atrium', position: ATRIUM_ANCHORS.recovery },
  ambience: { darkness: 0.7, tint: '#10120c', fog: '#0d0f0a', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: UNDERCROFT_ANCHORS,
  areas: [
    plan.area('landing', 'Service Landing'),
    plan.area('tunnel', 'Cable Tunnel'),
    plan.area('junction-room', 'Junction Room'),
    plan.area('camp', 'Mags\' Camp', { safe: true }),
    plan.area('pump-hall', 'Pump Hall'),
    plan.area('warrens', 'Leech Warrens'),
    plan.area('east-corridor', 'East Service Corridor'),
    plan.area('workshop', 'Foreman\'s Workshop', { multiCombat: true }),
    plan.area('pipe-gallery', 'Pipe Gallery'),
    plan.area('flooded-sump', 'Flooded Sump'),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  assemblies,
  creatures: [...residents, ...packs],
  lights: [
    { position: plan.center('pipe-gallery'), radius: 10, color: '#ffb347', intensity: 0.5 },
    { position: plan.center('flooded-sump'), radius: 12, color: '#9fd8ff', intensity: 0.5 },
    { position: plan.spot('landing', 3, 2), radius: 7, color: '#c9a227', intensity: 0.5 },
    { position: plan.spot('camp', 8, 2), radius: 11, color: '#ff9a4d', intensity: 0.8 },
    { position: plan.spot('pump-hall', 7, 2), radius: 9, color: '#46c8a8', intensity: 0.45 },
    { position: plan.spot('pump-hall', 36, 26), radius: 9, color: '#46c8a8', intensity: 0.45 },
    { position: plan.spot('warrens', 8, 40), radius: 9, color: '#a83a3a', intensity: 0.4 },
    { position: plan.spot('junction-room', 3, 3), radius: 9, color: '#9fd8ff', intensity: 0.4 },
    { position: plan.spot('workshop', 24, 13), radius: 11, color: '#ff4d4d', intensity: 0.55 },
  ],
}, dressing);
