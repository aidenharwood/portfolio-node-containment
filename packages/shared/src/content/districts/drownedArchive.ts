import { install } from '../installations.ts';
import { drawBlueprint, exit, link, patch, pillars, room, track } from '../../world/blueprint.ts';
import type { AssemblyPlacement } from '../../world/assemblies.ts';
import type { CreaturePlacement, DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { DEEPWATCH_ANCHORS } from './deepwatch.ts';
import { LITTER, scatterGroups, scatterPacks } from './populate.ts';
import { furnish, type Dressing } from './furnish.ts';
import { ambientCast } from '../ambientNpcs.ts';
import { ATRIUM_ANCHORS } from './meridianAtrium.ts';

const plan = drawBlueprint({ width: 86, height: 62 }, [
  room('flood-stair', 1, 1, 20, 18, 'plating'),
  room('stacks', 22, 1, 63, 20, 'concrete'),
  room('sluice-hall', 1, 20, 20, 24, 'grate'),
  room('drying-room', 1, 45, 20, 16, 'concrete'),
  room('reading-rooms', 22, 22, 32, 39, 'carpet'),
  room('sealed-room', 55, 22, 30, 39, 'carpet'),
  patch(28, 7, 50, 2, 'coolant'),
  patch(28, 14, 50, 2, 'coolant'),
  patch(40, 7, 3, 2, 'grate'),
  patch(60, 7, 3, 2, 'grate'),
  patch(50, 14, 3, 2, 'grate'),
  patch(70, 14, 3, 2, 'grate'),
  patch(8, 24, 2, 16, 'coolant'),
  patch(8, 31, 2, 2, 'grate'),
  patch(32, 36, 12, 8, 'coolant'),
  patch(64, 44, 12, 5, 'coolant'),
  link('flood-stair', 'stacks', 3),
  link('flood-stair', 'sluice-hall', 3),
  link('stacks', 'reading-rooms', 5, 'carpet'),
  link('stacks', 'sealed-room', 2),
  link('sluice-hall', 'reading-rooms', 3),
  link('sluice-hall', 'drying-room', 5, 'concrete'),
  link('drying-room', 'reading-rooms', 3),
  pillars('reading-rooms', 8, 8, 4),
  patch(4, 1, 1, 18, 'hazard'),
  track([2, 0], [2, 60]),
  patch(1, 1, 1, 11, 'wall'),
  patch(1, 16, 1, 45, 'wall'),
  patch(4, 19, 1, 42, 'wall'),
  exit('west', 'flood-stair', 'west', 2, { offset: 12, gate: true, floor: 'door' }),
]);

export const DROWNED_ARCHIVE_ANCHORS = {
  tramPlatform: plan.at('flood-stair', 8, 6),
  entrance: plan.at('flood-stair', 5, 12),
  sealedApproach: plan.at('stacks', 47, 19),
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [
    { instanceId: 'da-pim', npcId: 'clerk-pim', position: plan.at('flood-stair', 17, 16) },
  ];

const fixtures: ObjectPlacement[] = [
  { instanceId: 'da-tram-stop', objectId: 'tram-stop', position: plan.at('flood-stair', 5, 2), facing: 'west' },
    { instanceId: 'da-stair-storage', objectId: 'storage-locker', position: plan.at('flood-stair', 19, 2), facing: 'west' },
    { instanceId: 'da-shelf-a', objectId: 'archive-shelf', position: plan.at('stacks', 2, 0) },
    { instanceId: 'da-shelf-b', objectId: 'archive-shelf', position: plan.at('stacks', 9, 0) },
    { instanceId: 'da-shelf-c', objectId: 'archive-shelf', position: plan.at('stacks', 18, 0) },
    { instanceId: 'da-shelf-d', objectId: 'archive-shelf', position: plan.at('stacks', 27, 0) },
    { instanceId: 'da-shelf-e', objectId: 'archive-shelf', position: plan.at('stacks', 35, 0) },
    { instanceId: 'da-shelf-f', objectId: 'archive-shelf', position: plan.at('stacks', 44, 0) },
    { instanceId: 'da-shelf-g', objectId: 'archive-shelf', position: plan.at('stacks', 60, 0) },
    { instanceId: 'da-vellum-a', objectId: 'vellum-stack', position: plan.at('stacks', 1, 19), facing: 'north' },
    { instanceId: 'da-vellum-b', objectId: 'vellum-stack', position: plan.at('stacks', 29, 19), facing: 'north' },
    { instanceId: 'da-vellum-c', objectId: 'vellum-stack', position: plan.at('stacks', 62, 3), facing: 'west' },
    { instanceId: 'da-ink-a', objectId: 'ink-pool', position: plan.at('stacks', 40, 19) },
    { instanceId: 'da-ink-b', objectId: 'ink-pool', position: plan.at('stacks', 61, 19) },
    { instanceId: 'da-sluice-a', objectId: 'sluice-valve', position: plan.at('sluice-hall', 4, 2), facing: 'east' },
    { instanceId: 'da-sluice-b', objectId: 'sluice-valve', position: plan.at('sluice-hall', 19, 5), facing: 'west' },
    { instanceId: 'da-sluice-c', objectId: 'sluice-valve', position: plan.at('sluice-hall', 4, 21), facing: 'east' },
    { instanceId: 'da-sluice-shelf-a', objectId: 'archive-shelf', position: plan.at('sluice-hall', 4, 23), facing: 'north' },
    { instanceId: 'da-sluice-shelf-b', objectId: 'archive-shelf', position: plan.at('sluice-hall', 18, 23), facing: 'north' },
    { instanceId: 'da-sluice-ink', objectId: 'ink-pool', position: plan.at('sluice-hall', 16, 18) },
    { instanceId: 'da-reading-shelf-a', objectId: 'archive-shelf', position: plan.at('reading-rooms', 0, 0) },
    { instanceId: 'da-reading-shelf-b', objectId: 'archive-shelf', position: plan.at('reading-rooms', 31, 0) },
    { instanceId: 'da-reading-shelf-c', objectId: 'archive-shelf', position: plan.at('reading-rooms', 0, 38), facing: 'north' },
    { instanceId: 'da-reading-shelf-d', objectId: 'archive-shelf', position: plan.at('reading-rooms', 31, 38), facing: 'north' },
    { instanceId: 'da-reading-vellum-a', objectId: 'vellum-stack', position: plan.at('reading-rooms', 0, 2), facing: 'east' },
    { instanceId: 'da-reading-vellum-b', objectId: 'vellum-stack', position: plan.at('reading-rooms', 31, 35), facing: 'west' },
    { instanceId: 'da-reading-bench-a', objectId: 'briefing-bench', position: plan.at('reading-rooms', 16, 2) },
    { instanceId: 'da-reading-bench-b', objectId: 'briefing-bench', position: plan.at('reading-rooms', 16, 36) },
    { instanceId: 'da-lectern', objectId: 'charter-lectern', position: plan.at('sealed-room', 17, 37) },
    { instanceId: 'da-sealed-shelf-a', objectId: 'archive-shelf', position: plan.at('sealed-room', 0, 0) },
    { instanceId: 'da-sealed-shelf-b', objectId: 'archive-shelf', position: plan.at('sealed-room', 29, 38), facing: 'north' },
  ];

const assemblies: AssemblyPlacement[] = [
  install('da-sealed-door', 'sealed-reading-door', plan.linkTile('stacks', 'sealed-room', 1), 'north'),
  { instanceId: 'da-tram-car', assemblyId: 'tram-car', position: plan.spot('flood-stair', 1, 4), facing: 'west' },
  { instanceId: 'da-line-bridge', assemblyId: 'bridge', position: plan.spot('flood-stair', 0, 12), facing: 'east', span: 2 },];

const residents: CreaturePlacement[] = [
    { instanceId: 'da-eel-stacks-a', creatureId: 'ink-eel', position: plan.at('stacks', 3, 1) },
    { instanceId: 'da-eel-stacks-b', creatureId: 'ink-eel', position: plan.at('stacks', 22, 1) },
    { instanceId: 'da-eel-stacks-c', creatureId: 'ink-eel', position: plan.at('stacks', 42, 16) },
    { instanceId: 'da-eel-stacks-d', creatureId: 'ink-eel', position: plan.at('stacks', 16, 18) },
    { instanceId: 'da-eel-stacks-e', creatureId: 'ink-eel', position: plan.at('stacks', 59, 18) },
    { instanceId: 'da-eel-stacks-f', creatureId: 'ink-eel', position: plan.at('stacks', 50, 1) },
    { instanceId: 'da-eel-sluice-a', creatureId: 'ink-eel', position: plan.at('sluice-hall', 5, 6) },
    { instanceId: 'da-eel-sluice-b', creatureId: 'ink-eel', position: plan.at('sluice-hall', 16, 3) },
    { instanceId: 'da-eel-sluice-c', creatureId: 'ink-eel', position: plan.at('sluice-hall', 16, 13) },
    { instanceId: 'da-redactor-a', creatureId: 'redactor', position: plan.at('reading-rooms', 2, 1) },
    { instanceId: 'da-redactor-b', creatureId: 'redactor', position: plan.at('reading-rooms', 29, 2) },
    { instanceId: 'da-redactor-c', creatureId: 'redactor', position: plan.at('reading-rooms', 3, 31) },
    { instanceId: 'da-redactor-d', creatureId: 'redactor', position: plan.at('reading-rooms', 28, 28) },
    { instanceId: 'da-redactor-e', creatureId: 'redactor', position: plan.at('reading-rooms', 22, 37) },
    { instanceId: 'da-redactor-sealed', creatureId: 'redactor', position: plan.at('sealed-room', 2, 3) },
    { instanceId: 'da-last-archivist', creatureId: 'last-archivist', position: plan.at('sealed-room', 12, 14) },
  ];

const placed = [...npcs, ...fixtures, ...assemblies, ...residents];

const furnishings = scatterGroups(plan, placed, [
  ['stacks', 'da-stacks-node', ['vellum-stack'], 2],
  ['drying-room', 'da-drying-node', ['vellum-stack', 'ink-pool'], 2],
  ['stacks', 'da-stacks-litter', LITTER, 8],
  ['reading-rooms', 'da-reading-litter', ['litter-papers'], 6],
  ['sluice-hall', 'da-sluice-litter', LITTER, 4],
]);

const packs = scatterPacks(plan, [...placed, ...furnishings], [
  ['stacks', 'da-eel-stacks-pack', 'ink-eel', 5],
  ['reading-rooms', 'da-redactor-reading-pack', 'redactor', 3],
  ['drying-room', 'da-eel-drying-pack', 'ink-eel', 2],
  ['sluice-hall', 'da-eel-sluice-pack', 'ink-eel', 1],
]);

const dressing: Dressing = {
  'flood-stair': 'camp',
  'stacks': 'archive',
  'sluice-hall': 'wet',
  'drying-room': 'archive',
  'reading-rooms': 'archive',
  'sealed-room': { theme: 'archive', density: 'sparse' },
};

export const DROWNED_ARCHIVE: DistrictDefinition = furnish(plan, {
  id: 'drowned-archive',
  name: 'The Drowned Archive',
  subtitle: 'Site Meridian — Records Division, Lower Stacks',
  tier: 6,
  region: 'meridian-core',
  deadEnd: true,
  recovery: { districtId: 'meridian-atrium', position: ATRIUM_ANCHORS.recovery },
  ambience: { darkness: 0.66, tint: '#0e0a18', fog: '#0c0816', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: DROWNED_ARCHIVE_ANCHORS,
  areas: [
    plan.area('flood-stair', 'Flood Stair', { safe: true }),
    plan.area('stacks', 'The Drowned Stacks'),
    plan.area('sluice-hall', 'Sluice Hall'),
    plan.area('reading-rooms', 'Reading Rooms'),
    plan.area('sealed-room', 'Sealed Reading Room', { multiCombat: true }),
    plan.area('drying-room', 'Drying Room'),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  assemblies,
  creatures: [...residents, ...packs],
  lights: [
    { position: plan.center('drying-room'), radius: 8, color: '#b57cff', intensity: 0.5 },
    { position: plan.spot('flood-stair', 16, 3), radius: 9, color: '#ffcf4d', intensity: 0.5 },
    { position: plan.spot('stacks', 14, 3), radius: 13, color: '#7a5aff', intensity: 0.45 },
    { position: plan.spot('stacks', 48, 3), radius: 13, color: '#b57cff', intensity: 0.45 },
    { position: plan.spot('sluice-hall', 10, 12), radius: 10, color: '#c9a227', intensity: 0.4 },
    { position: plan.spot('reading-rooms', 16, 17), radius: 13, color: '#9fd8ff', intensity: 0.4 },
    { position: plan.spot('sealed-room', 12, 17), radius: 13, color: '#b57cff', intensity: 0.65 },
  ],
}, dressing, { cast: ambientCast('deckhand', 'researcher', 'operative', 'technician') });
