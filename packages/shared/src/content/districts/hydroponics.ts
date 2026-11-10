import { drawBlueprint, exit, link, patch, room, track } from '../../world/blueprint.ts';
import type { AssemblyPlacement } from '../../world/assemblies.ts';
import type { CreaturePlacement, DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { ATRIUM_ANCHORS } from './meridianAtrium.ts';
import { LITTER, scatterGroups, scatterPacks } from './populate.ts';

const plan = drawBlueprint({ width: 105, height: 68 }, [
  room('platform', 1, 14, 22, 26, 'grate'),
  room('seed-vault', 1, 42, 22, 14, 'carpet'),
  room('nursery', 26, 1, 30, 30, 'soil'),
  room('greenhouse', 26, 34, 30, 32, 'soil'),
  room('grow-hall', 60, 1, 44, 65, 'soil'),
  patch(1, 14, 2, 26, 'track'),
  patch(3, 14, 1, 26, 'hazard'),
  track([0, 1], [1, 1], [1, 11]),
  patch(31, 7, 20, 2, 'coolant'),
  patch(31, 15, 20, 2, 'coolant'),
  patch(31, 23, 20, 2, 'coolant'),
  patch(32, 39, 2, 22, 'coolant'),
  patch(40, 39, 2, 22, 'coolant'),
  patch(48, 39, 2, 22, 'coolant'),
  patch(66, 6, 2, 26, 'coolant'),
  patch(78, 6, 2, 26, 'coolant'),
  patch(90, 6, 2, 26, 'coolant'),
  patch(66, 58, 32, 2, 'coolant'),
  room('heart-bed', 74, 40, 14, 14, 'concrete', 'round'),
  link('platform', 'nursery', 3),
  link('platform', 'greenhouse', 3),
  link('platform', 'seed-vault', 3),
  link('seed-vault', 'greenhouse', 3),
  link('nursery', 'greenhouse', 9, 'concrete'),
  link('nursery', 'grow-hall', 9, 'concrete'),
  link('greenhouse', 'grow-hall', 9, 'concrete'),
  exit('east', 'grow-hall', 'east', 13),
  exit('west', 'seed-vault', 'west', 13, { offset: 0 }),
]);

export const HYDROPONICS_ANCHORS = {
  tramPlatform: plan.at('platform', 4, 5),
  foldReturn: plan.at('heart-bed', 5, 8),
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [
    { instanceId: 'hydro-oyelaran', npcId: 'botanist-oyelaran', position: plan.at('platform', 19, 2) },
  ];

const fixtures: ObjectPlacement[] = [
  
    { instanceId: 'hydro-fold-anomaly', objectId: 'verdance-anomaly', position: plan.at('heart-bed', 3, 2) },
    { instanceId: 'hydro-tram-stop', objectId: 'tram-stop', position: plan.at('platform', 2, 24), facing: 'east' },
    { instanceId: 'hydro-platform-sign', objectId: 'warning-sign', position: plan.at('platform', 21, 0) },
    { instanceId: 'hydro-platform-storage', objectId: 'storage-locker', position: plan.at('platform', 21, 23), facing: 'west' },
    { instanceId: 'hydro-seed-vault', objectId: 'seed-vault-console', position: plan.at('seed-vault', 3, 13), facing: 'north' },
    { instanceId: 'hydro-vault-rack-a', objectId: 'server-rack', position: plan.at('seed-vault', 0, 0) },
    { instanceId: 'hydro-vault-rack-b', objectId: 'server-rack', position: plan.at('seed-vault', 21, 0) },
    { instanceId: 'hydro-moss-a', objectId: 'moss-bed', position: plan.at('nursery', 1, 0) },
    { instanceId: 'hydro-moss-b', objectId: 'moss-bed', position: plan.at('nursery', 28, 0) },
    { instanceId: 'hydro-vine-nursery-a', objectId: 'strangler-vine', position: plan.at('nursery', 0, 9) },
    { instanceId: 'hydro-vine-nursery-b', objectId: 'strangler-vine', position: plan.at('nursery', 29, 26) },
    { instanceId: 'hydro-resin', objectId: 'resin-drum', position: plan.at('nursery', 29, 29) },
    { instanceId: 'hydro-bloom-a', objectId: 'spore-bloom', position: plan.at('greenhouse', 1, 8) },
    { instanceId: 'hydro-bloom-b', objectId: 'spore-bloom', position: plan.at('greenhouse', 26, 23) },
    { instanceId: 'hydro-bloom-c', objectId: 'spore-bloom', position: plan.at('greenhouse', 29, 31) },
    { instanceId: 'hydro-vine-hall-a', objectId: 'strangler-vine', position: plan.at('grow-hall', 1, 1) },
    { instanceId: 'hydro-vine-hall-b', objectId: 'strangler-vine', position: plan.at('grow-hall', 36, 10) },
    { instanceId: 'hydro-vine-hall-c', objectId: 'strangler-vine', position: plan.at('grow-hall', 43, 30) },
    { instanceId: 'hydro-vine-hall-d', objectId: 'strangler-vine', position: plan.at('grow-hall', 1, 62) },
    { instanceId: 'hydro-vine-heart', objectId: 'strangler-vine', position: plan.at('grow-hall', 40, 58) },
    { instanceId: 'hydro-heart-planter-a', objectId: 'planter', position: plan.at('heart-bed', 0, 0) },
    { instanceId: 'hydro-heart-planter-b', objectId: 'planter', position: plan.at('heart-bed', 13, 13) },
  ];

const assemblies: AssemblyPlacement[] = [
  
    { instanceId: 'hydro-tram-car', assemblyId: 'tram-car', position: plan.spot('platform', 0, 0), facing: 'east' },
  ];

const residents: CreaturePlacement[] = [
    { instanceId: 'hydro-crawler-nursery-a', creatureId: 'thorn-crawler', position: plan.at('nursery', 9, 9) },
    { instanceId: 'hydro-crawler-nursery-b', creatureId: 'thorn-crawler', position: plan.at('nursery', 26, 28) },
    { instanceId: 'hydro-crawler-hall-a', creatureId: 'thorn-crawler', position: plan.at('grow-hall', 11, 3) },
    { instanceId: 'hydro-crawler-hall-b', creatureId: 'thorn-crawler', position: plan.at('grow-hall', 32, 20) },
    { instanceId: 'hydro-crawler-hall-c', creatureId: 'thorn-crawler', position: plan.at('grow-hall', 2, 30) },
    { instanceId: 'hydro-crawler-hall-d', creatureId: 'thorn-crawler', position: plan.at('grow-hall', 42, 44) },
    { instanceId: 'hydro-drifter-a', creatureId: 'spore-drifter', position: plan.at('greenhouse', 9, 13) },
    { instanceId: 'hydro-drifter-b', creatureId: 'spore-drifter', position: plan.at('greenhouse', 28, 3) },
    { instanceId: 'hydro-drifter-c', creatureId: 'spore-drifter', position: plan.at('heart-bed', 2, 2) },
    { instanceId: 'hydro-drifter-d', creatureId: 'spore-drifter', position: plan.at('grow-hall', 3, 58) },
  ];

const placed = [...npcs, ...fixtures, ...assemblies, ...residents];

const furnishings = scatterGroups(plan, placed, [
  ['nursery', 'hydro-nursery-node', ['moss-bed', 'strangler-vine'], 5],
  ['greenhouse', 'hydro-greenhouse-node', ['spore-bloom'], 4],
  ['grow-hall', 'hydro-hall-node', ['strangler-vine', 'resin-drum', 'moss-bed'], 8],
  ['grow-hall', 'hydro-hall-litter', LITTER, 8],
  ['nursery', 'hydro-nursery-planter', ['planter'], 5],
  ['greenhouse', 'hydro-greenhouse-planter', ['planter'], 5],
]);

const packs = scatterPacks(plan, [...placed, ...furnishings], [
  ['nursery', 'hydro-crawler-nursery-pack', 'thorn-crawler', 5],
  ['grow-hall', 'hydro-crawler-hall-pack', 'thorn-crawler', 9],
  ['greenhouse', 'hydro-drifter-greenhouse-pack', 'spore-drifter', 4],
  ['grow-hall', 'hydro-drifter-hall-pack', 'spore-drifter', 5],
]);

export const HYDROPONICS: DistrictDefinition = {
  id: 'hydroponics',
  name: 'Verdance Hydroponics',
  subtitle: 'Site Meridian — Agricultural Containment Deck',
  tier: 2,
  region: 'meridian-core',
  recovery: { districtId: 'meridian-atrium', position: ATRIUM_ANCHORS.recovery },
  ambience: { darkness: 0.62, tint: '#08160c', fog: '#0a1a10', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: HYDROPONICS_ANCHORS,
  areas: [
    plan.area('platform', 'Tram Platform', { safe: true }),
    plan.area('seed-vault', 'Seed Vault'),
    plan.area('nursery', 'Nursery Beds'),
    plan.area('greenhouse', 'Spore Greenhouse'),
    plan.area('grow-hall', 'Overgrown Grow Hall'),
    plan.area('heart-bed', 'The Heart Bed'),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  assemblies,
  creatures: [...residents, ...packs],
  lights: [
    { position: plan.spot('platform', 3, 9), radius: 11, color: '#ffcf4d', intensity: 0.55 },
    { position: plan.spot('seed-vault', 3, 2), radius: 7, color: '#9fd8ff', intensity: 0.45 },
    { position: plan.spot('nursery', 15, 15), radius: 13, color: '#7cf29a', intensity: 0.5 },
    { position: plan.spot('greenhouse', 15, 18), radius: 13, color: '#8ad8ff', intensity: 0.5 },
    { position: plan.spot('grow-hall', 19, 13), radius: 14, color: '#7cf29a', intensity: 0.45 },
    { position: plan.spot('heart-bed', 2, 2), radius: 13, color: '#c8ff7a', intensity: 0.6 },
  ],
};
