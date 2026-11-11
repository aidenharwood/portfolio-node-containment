import { install } from '../installations.ts';
import { drawBlueprint, exit, link, patch, pillars, room } from '../../world/blueprint.ts';
import type { AssemblyPlacement } from '../../world/assemblies.ts';
import type { CreaturePlacement, DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { DEEPWATCH_ANCHORS } from './deepwatch.ts';
import { INDUSTRIAL_PROPS, LITTER, OFFICE_PROPS, scatterGroups, scatterPacks } from './populate.ts';
import { furnish, type Dressing } from './furnish.ts';
import { ambientCast } from '../ambientNpcs.ts';

const plan = drawBlueprint({ width: 86, height: 62 }, [
  room('uplink-lobby', 1, 1, 22, 18, 'plating'),
  room('relay-floor', 24, 1, 36, 26, 'grate'),
  room('operator-pit', 61, 1, 24, 26, 'carpet'),
  room('cable-run', 1, 20, 22, 25, 'rust'),
  room('spool-store', 1, 46, 22, 15, 'concrete'),
  room('dish-gantry', 24, 28, 61, 33, 'concrete'),
  patch(30, 13, 24, 1, 'hazard'),
  patch(66, 17, 14, 2, 'glass'),
  patch(44, 38, 20, 1, 'hazard'),
  patch(44, 52, 20, 1, 'hazard'),
  link('uplink-lobby', 'relay-floor', 3),
  link('uplink-lobby', 'cable-run', 3),
  link('relay-floor', 'operator-pit', 3),
  link('relay-floor', 'dish-gantry', 3),
  link('operator-pit', 'dish-gantry', 3),
  link('cable-run', 'dish-gantry', 3),
  link('cable-run', 'spool-store', 7, 'rust'),
  link('spool-store', 'dish-gantry', 5, 'concrete'),
  pillars('relay-floor', 7, 7, 4),
  pillars('dish-gantry', 10, 8, 5),
  patch(1, 4, 22, 1, 'hazard'),
  patch(0, 2, 86, 2, 'track'),
  patch(45, 0, 2, 2, 'track'),
  patch(1, 1, 11, 1, 'wall'),
  patch(16, 1, 29, 1, 'wall'),
  patch(47, 1, 38, 1, 'wall'),
  patch(24, 4, 61, 1, 'wall'),
  exit('north', 'uplink-lobby', 'north', 2, { offset: 12, gate: true, floor: 'door' }),
]);

export const SIGNAL_ARRAY_ANCHORS = {
  tramPlatform: plan.at('uplink-lobby', 6, 7),
  entrance: plan.at('uplink-lobby', 12, 5),
  chuteLanding: plan.at('operator-pit', 22, 5),
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [
    { instanceId: 'sa-achterberg', npcId: 'officer-achterberg', position: plan.at('uplink-lobby', 18, 15) },
  ];

const fixtures: ObjectPlacement[] = [
  { instanceId: 'sa-tram-stop', objectId: 'tram-stop', position: plan.at('uplink-lobby', 2, 5), facing: 'north' },
    { instanceId: 'sa-lobby-storage', objectId: 'storage-locker', position: plan.at('uplink-lobby', 21, 5), facing: 'west' },
    { instanceId: 'sa-lobby-bed', objectId: 'med-bed', position: plan.at('uplink-lobby', 20, 17) },
    { instanceId: 'sa-lobby-sign', objectId: 'warning-sign', position: plan.at('uplink-lobby', 21, 12), facing: 'west' },
    { instanceId: 'sa-console-a', objectId: 'relay-console', position: plan.at('relay-floor', 1, 4) },
    { instanceId: 'sa-console-b', objectId: 'relay-console', position: plan.at('relay-floor', 16, 4) },
    { instanceId: 'sa-console-c', objectId: 'relay-console', position: plan.at('relay-floor', 34, 4) },
    { instanceId: 'sa-floor-rack-a', objectId: 'server-rack', position: plan.at('relay-floor', 7, 4) },
    { instanceId: 'sa-floor-rack-b', objectId: 'server-rack', position: plan.at('relay-floor', 27, 4) },
    { instanceId: 'sa-floor-rack-c', objectId: 'server-rack', position: plan.at('relay-floor', 1, 25), facing: 'north' },
    { instanceId: 'sa-floor-rack-d', objectId: 'server-rack', position: plan.at('relay-floor', 34, 25), facing: 'north' },
    { instanceId: 'sa-patch-floor', objectId: 'patch-point', position: plan.at('relay-floor', 5, 25), facing: 'north' },
    { instanceId: 'sa-outbox', objectId: 'outbox-terminal', position: plan.at('operator-pit', 12, 4) },
    { instanceId: 'sa-pit-rack-a', objectId: 'server-rack', position: plan.at('operator-pit', 1, 4) },
    { instanceId: 'sa-pit-rack-b', objectId: 'server-rack', position: plan.at('operator-pit', 19, 4) },
    { instanceId: 'sa-pit-bench-a', objectId: 'briefing-bench', position: plan.at('operator-pit', 2, 22) },
    { instanceId: 'sa-pit-bench-b', objectId: 'briefing-bench', position: plan.at('operator-pit', 21, 22) },
    { instanceId: 'sa-patch-pit', objectId: 'patch-point', position: plan.at('operator-pit', 23, 25), facing: 'north' },
    { instanceId: 'sa-cable-a', objectId: 'signal-cable', position: plan.at('cable-run', 0, 2) },
    { instanceId: 'sa-cable-b', objectId: 'signal-cable', position: plan.at('cable-run', 21, 5) },
    { instanceId: 'sa-cable-c', objectId: 'signal-cable', position: plan.at('cable-run', 0, 14) },
    { instanceId: 'sa-cable-d', objectId: 'signal-cable', position: plan.at('cable-run', 21, 22) },
    { instanceId: 'sa-cable-pipes', objectId: 'pipe-cluster', position: plan.at('cable-run', 11, 24) },
    { instanceId: 'sa-patch-cable', objectId: 'patch-point', position: plan.at('cable-run', 21, 10), facing: 'west' },
    { instanceId: 'sa-dish-a', objectId: 'relay-dish', position: plan.at('dish-gantry', 2, 1) },
    { instanceId: 'sa-dish-b', objectId: 'relay-dish', position: plan.at('dish-gantry', 58, 1) },
    { instanceId: 'sa-dish-c', objectId: 'relay-dish', position: plan.at('dish-gantry', 2, 31) },
    { instanceId: 'sa-dish-d', objectId: 'relay-dish', position: plan.at('dish-gantry', 58, 31) },
    { instanceId: 'sa-array-core', objectId: 'array-core', position: plan.at('dish-gantry', 31, 32), facing: 'north' },
    { instanceId: 'sa-gantry-sign', objectId: 'warning-sign', position: plan.at('dish-gantry', 60, 0) },
    { instanceId: 'sa-patch-gantry', objectId: 'patch-point', position: plan.at('dish-gantry', 0, 32), facing: 'north' },
  ];

const assemblies: AssemblyPlacement[] = [
  install('sa-return-chute', 'return-chute', plan.at('operator-pit', 23, 5), 'west'),
  { instanceId: 'sa-tram-car', assemblyId: 'tram-car', position: plan.spot('uplink-lobby', 3, 1), facing: 'north' },
  { instanceId: 'sa-line-bridge', assemblyId: 'bridge', position: plan.spot('uplink-lobby', 12, 0), facing: 'south', span: 2 },];

const residents: CreaturePlacement[] = [
    { instanceId: 'sa-sentinel-a', creatureId: 'relay-sentinel', position: plan.at('relay-floor', 3, 5) },
    { instanceId: 'sa-sentinel-b', creatureId: 'relay-sentinel', position: plan.at('relay-floor', 21, 5) },
    { instanceId: 'sa-sentinel-c', creatureId: 'relay-sentinel', position: plan.at('relay-floor', 32, 4) },
    { instanceId: 'sa-sentinel-d', creatureId: 'relay-sentinel', position: plan.at('relay-floor', 10, 22) },
    { instanceId: 'sa-sentinel-e', creatureId: 'relay-sentinel', position: plan.at('relay-floor', 25, 23) },
    { instanceId: 'sa-sentinel-f', creatureId: 'relay-sentinel', position: plan.at('relay-floor', 2, 23) },
    { instanceId: 'sa-sentinel-gantry', creatureId: 'relay-sentinel', position: plan.at('dish-gantry', 16, 2) },
    { instanceId: 'sa-operator-a', creatureId: 'echo-operator', position: plan.at('operator-pit', 2, 5) },
    { instanceId: 'sa-operator-b', creatureId: 'echo-operator', position: plan.at('operator-pit', 21, 4) },
    { instanceId: 'sa-operator-c', creatureId: 'echo-operator', position: plan.at('operator-pit', 3, 24) },
    { instanceId: 'sa-operator-d', creatureId: 'echo-operator', position: plan.at('operator-pit', 22, 23) },
    { instanceId: 'sa-operator-gantry-a', creatureId: 'echo-operator', position: plan.at('dish-gantry', 7, 19) },
    { instanceId: 'sa-operator-gantry-b', creatureId: 'echo-operator', position: plan.at('dish-gantry', 53, 24) },
    { instanceId: 'sa-choir', creatureId: 'the-choir', position: plan.at('dish-gantry', 31, 19) },
  ];

const placed = [...npcs, ...fixtures, ...assemblies, ...residents];

const furnishings = scatterGroups(plan, placed, [
  ['cable-run', 'sa-cable-node', ['signal-cable'], 2],
  ['spool-store', 'sa-spool-node', ['signal-cable'], 2],
  ['relay-floor', 'sa-floor-litter', LITTER, 6],
  ['dish-gantry', 'sa-gantry-litter', LITTER, 8],
  ['spool-store', 'sa-spool-prop', INDUSTRIAL_PROPS, 5],
  ['operator-pit', 'sa-pit-prop', OFFICE_PROPS, 4],
]);

const packs = scatterPacks(plan, [...placed, ...furnishings], [
  ['relay-floor', 'sa-sentinel-floor-pack', 'relay-sentinel', 4],
  ['dish-gantry', 'sa-operator-gantry-pack', 'echo-operator', 4],
  ['cable-run', 'sa-sentinel-cable-pack', 'relay-sentinel', 2],
  ['spool-store', 'sa-operator-spool-pack', 'echo-operator', 2],
]);

const dressing: Dressing = {
  'uplink-lobby': 'office',
  'relay-floor': 'industrial',
  'operator-pit': 'office',
  'cable-run': 'industrial',
  'spool-store': 'freight',
  'dish-gantry': 'industrial',
};

export const SIGNAL_ARRAY: DistrictDefinition = furnish(plan, {
  id: 'signal-array',
  name: 'The Signal Array',
  subtitle: 'Site Meridian — Long-Range Communications',
  tier: 5,
  region: 'meridian-core',
  deadEnd: true,
  recovery: { districtId: 'deepwatch', position: DEEPWATCH_ANCHORS.recovery },
  ambience: { darkness: 0.62, tint: '#16100a', fog: '#140e0a', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: SIGNAL_ARRAY_ANCHORS,
  areas: [
    plan.area('uplink-lobby', 'Uplink Lobby', { safe: true }),
    plan.area('relay-floor', 'Relay Floor'),
    plan.area('operator-pit', 'Operator Pit'),
    plan.area('cable-run', 'Cable Run'),
    plan.area('dish-gantry', 'Dish Gantry', { multiCombat: true }),
    plan.area('spool-store', 'Spool Store'),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  assemblies,
  creatures: [...residents, ...packs],
  lights: [
    { position: plan.center('spool-store'), radius: 8, color: '#ffb347', intensity: 0.5 },
    { position: plan.spot('uplink-lobby', 11, 3), radius: 9, color: '#ffcf4d', intensity: 0.5 },
    { position: plan.spot('relay-floor', 16, 11), radius: 14, color: '#ffb87a', intensity: 0.5 },
    { position: plan.spot('operator-pit', 12, 11), radius: 13, color: '#8afff0', intensity: 0.45 },
    { position: plan.spot('cable-run', 11, 12), radius: 11, color: '#ff9a4d', intensity: 0.4 },
    { position: plan.spot('dish-gantry', 12, 13), radius: 13, color: '#ffb87a', intensity: 0.45 },
    { position: plan.spot('dish-gantry', 31, 19), radius: 14, color: '#8afff0', intensity: 0.65 },
    { position: plan.spot('dish-gantry', 53, 13), radius: 13, color: '#ffb87a', intensity: 0.45 },
  ],
}, dressing, { cast: ambientCast('deckhand', 'researcher', 'operative', 'technician') });
