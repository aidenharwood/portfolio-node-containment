import { drawBlueprint, exit, link, patch, pillars, room } from '../../world/blueprint.ts';
import type { AssemblyPlacement } from '../../world/assemblies.ts';
import type { CreaturePlacement, DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { DEEPWATCH_ANCHORS } from './deepwatch.ts';
import { LITTER, scatterGroups, scatterPacks } from './populate.ts';

const plan = drawBlueprint({ width: 86, height: 62 }, [
  room('ember-galleries', 1, 1, 84, 22, 'rust'),
  room('foundry', 1, 24, 31, 37, 'rust'),
  room('slag-pit', 33, 24, 20, 17, 'rust'),
  room('reactor-heart', 54, 24, 31, 37, 'plating'),
  room('coolant-lock', 33, 43, 20, 18, 'plating'),
  patch(10, 5, 66, 1, 'hazard'),
  patch(18, 9, 5, 3, 'coolant'),
  patch(60, 9, 5, 3, 'coolant'),
  patch(8, 34, 16, 2, 'coolant'),
  patch(8, 50, 16, 2, 'coolant'),
  patch(14, 34, 2, 2, 'grate'),
  patch(14, 50, 2, 2, 'grate'),
  patch(62, 34, 15, 2, 'hazard'),
  patch(62, 50, 15, 2, 'hazard'),
  patch(62, 36, 2, 14, 'hazard'),
  patch(75, 36, 2, 14, 'hazard'),
  link('ember-galleries', 'foundry', 9, 'rust'),
  link('ember-galleries', 'slag-pit', 9, 'rust'),
  link('ember-galleries', 'reactor-heart', 2),
  link('foundry', 'slag-pit', 7, 'rust'),
  link('slag-pit', 'coolant-lock', 5, 'plating'),
  pillars('ember-galleries', 10, 7, 4),
  patch(33, 57, 20, 1, 'hazard'),
  patch(0, 58, 86, 2, 'track'),
  patch(1, 60, 40, 1, 'wall'),
  patch(45, 60, 40, 1, 'wall'),
  patch(75, 60, 2, 2, 'track'),
  patch(1, 57, 31, 1, 'wall'),
  patch(54, 57, 31, 1, 'wall'),
  exit('south', 'coolant-lock', 'south', 2, { offset: 9, gate: true, floor: 'door' }),
]);

export const FURNACE_ANCHORS = {
  tramPlatform: plan.at('coolant-lock', 6, 11),
  entrance: plan.at('coolant-lock', 9, 12),
  reactorApproach: plan.at('ember-galleries', 67, 21),
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [
    { instanceId: 'fu-brann', npcId: 'stoker-brann', position: plan.at('coolant-lock', 17, 12) },
  ];

const fixtures: ObjectPlacement[] = [
  { instanceId: 'fu-blast-door-a', objectId: 'furnace-door', position: plan.exits.south?.tiles[0] as TilePoint, facing: 'north' },
  { instanceId: 'fu-blast-door-b', objectId: 'furnace-door', position: plan.exits.south?.tiles[1] as TilePoint, facing: 'north' },
  { instanceId: 'fu-reactor-door-a', objectId: 'reactor-door', position: plan.linkTile('ember-galleries', 'reactor-heart', 0), facing: 'north' },
  { instanceId: 'fu-reactor-door-b', objectId: 'reactor-door', position: plan.linkTile('ember-galleries', 'reactor-heart', 1), facing: 'north' },
  { instanceId: 'fu-tram-stop', objectId: 'tram-stop', position: plan.at('coolant-lock', 2, 13), facing: 'south' },
    { instanceId: 'fu-lock-storage', objectId: 'storage-locker', position: plan.at('coolant-lock', 19, 12), facing: 'west' },
    { instanceId: 'fu-lock-bed', objectId: 'med-bed', position: plan.at('coolant-lock', 0, 10) },
    { instanceId: 'fu-lock-synthesiser', objectId: 'synthesiser', position: plan.at('coolant-lock', 19, 10), facing: 'west' },
    { instanceId: 'fu-seam-a', objectId: 'ember-seam', position: plan.at('ember-galleries', 2, 0) },
    { instanceId: 'fu-seam-b', objectId: 'ember-seam', position: plan.at('ember-galleries', 30, 0) },
    { instanceId: 'fu-seam-c', objectId: 'ember-seam', position: plan.at('ember-galleries', 59, 0) },
    { instanceId: 'fu-seam-d', objectId: 'ember-seam', position: plan.at('ember-galleries', 83, 18), facing: 'west' },
    { instanceId: 'fu-seam-e', objectId: 'ember-seam', position: plan.at('ember-galleries', 12, 21) },
    { instanceId: 'fu-gallery-pipes-a', objectId: 'pipe-cluster', position: plan.at('ember-galleries', 44, 0) },
    { instanceId: 'fu-gallery-pipes-b', objectId: 'pipe-cluster', position: plan.at('ember-galleries', 81, 0) },
    { instanceId: 'fu-valve-a', objectId: 'pressure-valve', position: plan.at('foundry', 0, 1), facing: 'east' },
    { instanceId: 'fu-valve-b', objectId: 'pressure-valve', position: plan.at('foundry', 30, 16), facing: 'west' },
    { instanceId: 'fu-valve-c', objectId: 'pressure-valve', position: plan.at('foundry', 0, 31), facing: 'east' },
    { instanceId: 'fu-foundry-slag-a', objectId: 'slag-heap', position: plan.at('foundry', 2, 16) },
    { instanceId: 'fu-foundry-slag-b', objectId: 'slag-heap', position: plan.at('foundry', 28, 32) },
    { instanceId: 'fu-foundry-seam', objectId: 'ember-seam', position: plan.at('foundry', 13, 32) },
    { instanceId: 'fu-foundry-pump', objectId: 'pump-housing', position: plan.at('foundry', 23, 1) },
    { instanceId: 'fu-reactor-core', objectId: 'furnace-core', position: plan.at('reactor-heart', 15, 20) },
    { instanceId: 'fu-reactor-console', objectId: 'reactor-console', position: plan.at('reactor-heart', 0, 31), facing: 'east' },
    { instanceId: 'fu-reactor-pipes-a', objectId: 'pipe-cluster', position: plan.at('reactor-heart', 30, 0) },
    { instanceId: 'fu-reactor-pipes-b', objectId: 'pipe-cluster', position: plan.at('reactor-heart', 30, 32) },
  ];

const assemblies: AssemblyPlacement[] = [
  { instanceId: 'fu-tram-car', assemblyId: 'tram-car', position: plan.spot('coolant-lock', 1, 15), facing: 'north' },
  { instanceId: 'fu-line-bridge', assemblyId: 'bridge', position: plan.spot('coolant-lock', 9, 14), facing: 'south', span: 2 },];

const residents: CreaturePlacement[] = [
    { instanceId: 'fu-wisp-a', creatureId: 'cinder-wisp', position: plan.at('ember-galleries', 6, 1) },
    { instanceId: 'fu-wisp-b', creatureId: 'cinder-wisp', position: plan.at('ember-galleries', 39, 1) },
    { instanceId: 'fu-wisp-c', creatureId: 'cinder-wisp', position: plan.at('ember-galleries', 71, 2) },
    { instanceId: 'fu-wisp-d', creatureId: 'cinder-wisp', position: plan.at('ember-galleries', 30, 20) },
    { instanceId: 'fu-wisp-e', creatureId: 'cinder-wisp', position: plan.at('ember-galleries', 47, 20) },
    { instanceId: 'fu-wisp-f', creatureId: 'cinder-wisp', position: plan.at('ember-galleries', 81, 20) },
    { instanceId: 'fu-wisp-foundry', creatureId: 'cinder-wisp', position: plan.at('foundry', 3, 31) },
    { instanceId: 'fu-golem-a', creatureId: 'slag-golem', position: plan.at('foundry', 4, 1) },
    { instanceId: 'fu-golem-b', creatureId: 'slag-golem', position: plan.at('foundry', 19, 2) },
    { instanceId: 'fu-golem-c', creatureId: 'slag-golem', position: plan.at('foundry', 11, 16) },
    { instanceId: 'fu-golem-d', creatureId: 'slag-golem', position: plan.at('foundry', 23, 20) },
    { instanceId: 'fu-golem-e', creatureId: 'slag-golem', position: plan.at('foundry', 18, 30) },
    { instanceId: 'fu-golem-reactor', creatureId: 'slag-golem', position: plan.at('reactor-heart', 2, 2) },
    { instanceId: 'fu-wisp-reactor', creatureId: 'cinder-wisp', position: plan.at('reactor-heart', 26, 30) },
    { instanceId: 'fu-stoker', creatureId: 'the-stoker', position: plan.at('reactor-heart', 15, 13) },
  ];

const placed = [...npcs, ...fixtures, ...assemblies, ...residents];

const furnishings = scatterGroups(plan, placed, [
  ['ember-galleries', 'fu-galleries-node', ['ember-seam'], 3],
  ['foundry', 'fu-foundry-node', ['ember-seam', 'slag-heap'], 2],
  ['ember-galleries', 'fu-galleries-litter', LITTER, 8],
  ['foundry', 'fu-foundry-litter', LITTER, 6],
  ['slag-pit', 'fu-pit-prop', ['slag-heap', 'pipe-cluster', 'litter-gravel'], 5],
]);

const packs = scatterPacks(plan, [...placed, ...furnishings], [
  ['ember-galleries', 'fu-wisp-galleries-pack', 'cinder-wisp', 6],
  ['foundry', 'fu-golem-foundry-pack', 'slag-golem', 3],
  ['slag-pit', 'fu-wisp-pit-pack', 'cinder-wisp', 2],
]);

export const FURNACE: DistrictDefinition = {
  id: 'furnace',
  name: 'The Furnace',
  subtitle: 'Site Meridian — Primary Reactor',
  tier: 7,
  region: 'meridian-core',
  deadEnd: true,
  recovery: { districtId: 'deepwatch', position: DEEPWATCH_ANCHORS.recovery },
  ambience: { darkness: 0.55, tint: '#1c0a04', fog: '#1a0c06', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: FURNACE_ANCHORS,
  areas: [
    plan.area('coolant-lock', 'Coolant Lock', { safe: true }),
    plan.area('ember-galleries', 'Ember Galleries'),
    plan.area('foundry', 'Foundry Floor'),
    plan.area('reactor-heart', 'Reactor Heart', { multiCombat: true }),
    plan.area('slag-pit', 'Slag Pit'),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  assemblies,
  creatures: [...residents, ...packs],
  lights: [
    { position: plan.center('slag-pit'), radius: 9, color: '#ff7a2f', intensity: 0.5 },
    { position: plan.spot('coolant-lock', 16, 3), radius: 9, color: '#9fd8ff', intensity: 0.5 },
    { position: plan.spot('ember-galleries', 18, 3), radius: 13, color: '#ff7a2a', intensity: 0.55 },
    { position: plan.spot('ember-galleries', 65, 3), radius: 13, color: '#ff9a4d', intensity: 0.55 },
    { position: plan.spot('foundry', 8, 16), radius: 12, color: '#ff4d2a', intensity: 0.5 },
    { position: plan.spot('foundry', 23, 30), radius: 12, color: '#ffb347', intensity: 0.45 },
    { position: plan.spot('reactor-heart', 15, 20), radius: 14, color: '#ff7a2a', intensity: 0.85 },
  ],
};
