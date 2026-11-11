import { install } from '../installations.ts';
import type { AssemblyPlacement } from '../../world/assemblies.ts';
import { drawBlueprint, link, patch, pillars, room } from '../../world/blueprint.ts';
import type { CreaturePlacement, DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { SECTOR_THREE_ANCHORS } from './sectorThree.ts';
import { INDUSTRIAL_PROPS, LITTER, scatterGroups, scatterPacks } from './populate.ts';
import { furnish, type Dressing } from './furnish.ts';

const plan = drawBlueprint({ width: 100, height: 75 }, [
  room('arrival', 1, 1, 24, 22, 'grate'),
  room('empty-medbay', 26, 1, 48, 22, 'plating'),
  room('engineering-below', 75, 1, 24, 22, 'grate'),
  room('west-hall', 1, 24, 24, 13, 'plating'),
  room('inverted-plaza', 26, 24, 48, 33, 'concrete', 'octagon'),
  room('east-hall', 75, 24, 24, 13, 'plating'),
  room('wrong-workshop', 1, 38, 24, 19, 'grate'),
  room('quiet-range', 75, 38, 24, 19, 'concrete'),
  room('mirror-commissary', 1, 58, 24, 16, 'rust'),
  room('the-front-door', 26, 58, 48, 16, 'plating'),
  room('drowned-records', 75, 58, 24, 16, 'rust'),
  patch(36, 31, 28, 19, 'plating'),
  room('the-well', 44, 35, 12, 11, 'coolant', 'round'),
  patch(1, 1, 24, 2, 'track'),
  patch(1, 3, 24, 1, 'hazard'),
  patch(42, 60, 16, 1, 'hazard'),
  link('mirror-commissary', 'the-front-door', 3),
  link('drowned-records', 'the-front-door', 3),
  link('inverted-plaza', 'the-front-door', 14, 'plating'),
  link('wrong-workshop', 'inverted-plaza', 3),
  link('quiet-range', 'inverted-plaza', 3),
  link('west-hall', 'inverted-plaza', 9, 'plating'),
  link('east-hall', 'inverted-plaza', 9, 'plating'),
  link('west-hall', 'arrival', 5),
  link('east-hall', 'engineering-below', 5),
  link('inverted-plaza', 'empty-medbay', 6),
  link('arrival', 'empty-medbay', 3),
  link('wrong-workshop', 'mirror-commissary', 3),
  link('quiet-range', 'drowned-records', 3),
  pillars('inverted-plaza', 9, 9, 5),
  pillars('the-front-door', 12, 12, 4),
]);

export const MERIDIAN_BELOW_ANCHORS = {
  arrival: plan.at('arrival', 4, 7),
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [
    { instanceId: 'mb-kessler', npcId: 'dr-kessler', position: plan.at('empty-medbay', 22, 3) },
    { instanceId: 'mb-guest', npcId: 'the-guest', position: plan.at('the-front-door', 22, 13) },
  ];

const fixtures: ObjectPlacement[] = [
  { instanceId: 'mb-bed-a', objectId: 'med-bed', position: plan.at('empty-medbay', 2, 1) },
  { instanceId: 'mb-bed-b', objectId: 'med-bed', position: plan.at('empty-medbay', 5, 1) },
  { instanceId: 'mb-bed-c', objectId: 'med-bed', position: plan.at('empty-medbay', 8, 1) },
  { instanceId: 'mb-bed-d', objectId: 'med-bed', position: plan.at('empty-medbay', 39, 1) },
  { instanceId: 'mb-bed-e', objectId: 'med-bed', position: plan.at('empty-medbay', 42, 1) },
  { instanceId: 'mb-bed-f', objectId: 'med-bed', position: plan.at('empty-medbay', 45, 1) },
  { instanceId: 'mb-plaza-pillar-nw', objectId: 'light-pillar', position: plan.at('inverted-plaza', 10, 4) },
  { instanceId: 'mb-plaza-pillar-ne', objectId: 'light-pillar', position: plan.at('inverted-plaza', 37, 4) },
  { instanceId: 'mb-plaza-pillar-sw', objectId: 'light-pillar', position: plan.at('inverted-plaza', 10, 28) },
  { instanceId: 'mb-plaza-pillar-se', objectId: 'light-pillar', position: plan.at('inverted-plaza', 37, 28) },
    { instanceId: 'mb-arrival-mirror', objectId: 'mirror-pane', position: plan.at('arrival', 23, 18), facing: 'west' },
    { instanceId: 'mb-arrival-sign', objectId: 'warning-sign', position: plan.at('arrival', 0, 6), facing: 'east' },
    { instanceId: 'mb-lantern-medbay', objectId: 'far-lantern', position: plan.at('empty-medbay', 47, 20) },
    { instanceId: 'mb-shard-engineering-a', objectId: 'mirror-shard', position: plan.at('engineering-below', 1, 1) },
    { instanceId: 'mb-shard-engineering-b', objectId: 'mirror-shard', position: plan.at('engineering-below', 22, 9) },
    { instanceId: 'mb-shard-engineering-c', objectId: 'mirror-shard', position: plan.at('engineering-below', 7, 20) },
    { instanceId: 'mb-engineering-pipes-a', objectId: 'pipe-cluster', position: plan.at('engineering-below', 0, 0) },
    { instanceId: 'mb-engineering-pipes-b', objectId: 'pipe-cluster', position: plan.at('engineering-below', 23, 21) },
    { instanceId: 'mb-workshop-storage', objectId: 'storage-locker', position: plan.at('wrong-workshop', 0, 3), facing: 'east' },
    { instanceId: 'mb-lantern-workshop', objectId: 'far-lantern', position: plan.at('wrong-workshop', 22, 1) },
    { instanceId: 'mb-shard-workshop', objectId: 'mirror-shard', position: plan.at('wrong-workshop', 12, 18) },
    { instanceId: 'mb-plaza-mirror-a', objectId: 'mirror-pane', position: plan.at('inverted-plaza', 6, 3) },
    { instanceId: 'mb-plaza-mirror-b', objectId: 'mirror-pane', position: plan.at('inverted-plaza', 41, 3) },
    { instanceId: 'mb-plaza-mirror-c', objectId: 'mirror-pane', position: plan.at('inverted-plaza', 6, 30) },
    { instanceId: 'mb-plaza-mirror-d', objectId: 'mirror-pane', position: plan.at('inverted-plaza', 41, 30) },
    { instanceId: 'mb-lantern-plaza', objectId: 'far-lantern', position: plan.at('inverted-plaza', 22, 32) },
    { instanceId: 'mb-shard-plaza-a', objectId: 'mirror-shard', position: plan.at('inverted-plaza', 3, 15) },
    { instanceId: 'mb-shard-plaza-b', objectId: 'mirror-shard', position: plan.at('inverted-plaza', 44, 20) },
    { instanceId: 'mb-range-sign', objectId: 'warning-sign', position: plan.at('quiet-range', 23, 18), facing: 'north' },
    { instanceId: 'mb-front-door', objectId: 'front-door', position: plan.at('the-front-door', 22, 15), facing: 'north' },
    { instanceId: 'mb-door-pillar-west', objectId: 'light-pillar', position: plan.at('the-front-door', 0, 15) },
    { instanceId: 'mb-door-pillar-east', objectId: 'light-pillar', position: plan.at('the-front-door', 47, 15) },
    { instanceId: 'mb-commissary-storage-a', objectId: 'storage-locker', position: plan.at('mirror-commissary', 21, 15), facing: 'north' },
    { instanceId: 'mb-commissary-storage-b', objectId: 'storage-locker', position: plan.at('mirror-commissary', 22, 15), facing: 'north' },
    { instanceId: 'mb-commissary-planter', objectId: 'planter', position: plan.at('mirror-commissary', 23, 0) },
    { instanceId: 'mb-records-rack-a', objectId: 'server-rack', position: plan.at('drowned-records', 1, 15), facing: 'north' },
    { instanceId: 'mb-records-rack-b', objectId: 'server-rack', position: plan.at('drowned-records', 2, 15), facing: 'north' },
    { instanceId: 'mb-records-rack-c', objectId: 'server-rack', position: plan.at('drowned-records', 21, 15), facing: 'north' },
    { instanceId: 'mb-records-rack-d', objectId: 'server-rack', position: plan.at('drowned-records', 22, 15), facing: 'north' },
  ];

const residents: CreaturePlacement[] = [
    { instanceId: 'mb-hollow-workshop-a', creatureId: 'hollow-operative', position: plan.at('wrong-workshop', 7, 2) },
    { instanceId: 'mb-hollow-workshop-b', creatureId: 'hollow-operative', position: plan.at('wrong-workshop', 20, 15) },
    { instanceId: 'mb-hollow-workshop-c', creatureId: 'hollow-operative', position: plan.at('wrong-workshop', 3, 8) },
    { instanceId: 'mb-hollow-plaza-a', creatureId: 'hollow-operative', position: plan.at('inverted-plaza', 2, 12) },
    { instanceId: 'mb-hollow-plaza-b', creatureId: 'hollow-operative', position: plan.at('inverted-plaza', 45, 3) },
    { instanceId: 'mb-hollow-plaza-c', creatureId: 'hollow-operative', position: plan.at('inverted-plaza', 28, 30) },
    { instanceId: 'mb-drill-a', creatureId: 'hollow-drill', position: plan.at('engineering-below', 3, 3) },
    { instanceId: 'mb-drill-b', creatureId: 'hollow-drill', position: plan.at('engineering-below', 20, 2) },
    { instanceId: 'mb-drill-c', creatureId: 'hollow-drill', position: plan.at('engineering-below', 12, 12) },
    { instanceId: 'mb-drill-d', creatureId: 'hollow-drill', position: plan.at('engineering-below', 21, 18) },
    { instanceId: 'mb-drill-e', creatureId: 'hollow-drill', position: plan.at('engineering-below', 2, 18) },
    { instanceId: 'mb-knockling-range-a', creatureId: 'knockling', position: plan.at('quiet-range', 3, 2) },
    { instanceId: 'mb-knockling-range-b', creatureId: 'knockling', position: plan.at('quiet-range', 21, 12) },
    { instanceId: 'mb-knockling-range-c', creatureId: 'knockling', position: plan.at('quiet-range', 7, 16) },
    { instanceId: 'mb-knockling-records', creatureId: 'knockling', position: plan.at('drowned-records', 7, 2) },
    { instanceId: 'mb-knockling-commissary', creatureId: 'knockling', position: plan.at('mirror-commissary', 12, 3) },
    { instanceId: 'mb-host', creatureId: 'the-host', position: plan.at('the-front-door', 22, 2) },
    { instanceId: 'mb-host-add-hollow', creatureId: 'hollow-operative', position: plan.at('the-front-door', 3, 13) },
    { instanceId: 'mb-host-add-knockling', creatureId: 'knockling', position: plan.at('the-front-door', 41, 13) },
  ];

const assemblies: AssemblyPlacement[] = [
  install('mb-return', 'far-side-return', plan.at('arrival', 0, 2), 'east'),
  install('mb-refinery', 'refinery', plan.at('wrong-workshop', 0, 16), 'east'),
  install('mb-fabricator', 'fabricator', plan.at('wrong-workshop', 0, 13), 'east'),
  install('mb-synthesiser', 'synthesiser', plan.at('wrong-workshop', 0, 10), 'east'),
];

const placed = [...npcs, ...fixtures, ...assemblies, ...residents];

const furnishings = scatterGroups(plan, placed, [
  ['inverted-plaza', 'mb-plaza-litter', LITTER, 8],
  ['inverted-plaza', 'mb-plaza-node', ['mirror-shard'], 2],
  ['west-hall', 'mb-west-prop', ['light-pillar', 'briefing-bench', 'planter'], 4],
  ['east-hall', 'mb-east-prop', INDUSTRIAL_PROPS, 4],
  ['arrival', 'mb-arrival-litter', LITTER, 3],
  ['empty-medbay', 'mb-medbay-prop', ['water-cooler', 'wall-locker'], 4],
  ['wrong-workshop', 'mb-workshop-prop', ['storage-rack', 'pipe-cluster'], 3],
  ['quiet-range', 'mb-range-litter', LITTER, 4],
  ['mirror-commissary', 'mb-commissary-prop', ['briefing-bench', 'planter'], 3],
  ['drowned-records', 'mb-records-prop', ['server-rack', 'filing-cabinet'], 4],
  ['engineering-below', 'mb-engineering-prop', ['pipe-cluster', 'server-rack'], 3],
  ['the-front-door', 'mb-door-litter', ['litter-papers', 'litter-puddle'], 3],
]);

const packs = scatterPacks(plan, [...placed, ...furnishings], [
  ['west-hall', 'mb-hollow-west-pack', 'hollow-operative', 3],
  ['east-hall', 'mb-knockling-east-pack', 'knockling', 3],
  ['inverted-plaza', 'mb-hollow-plaza-pack', 'hollow-operative', 4],
  ['wrong-workshop', 'mb-hollow-workshop-pack', 'hollow-operative', 2],
  ['quiet-range', 'mb-knockling-range-pack', 'knockling', 2],
  ['mirror-commissary', 'mb-knockling-commissary-pack', 'knockling', 1],
  ['drowned-records', 'mb-knockling-records-pack', 'knockling', 1],
]);

const dressing: Dressing = {
  'arrival': 'civic',
  'empty-medbay': 'medical',
  'engineering-below': 'industrial',
  'west-hall': 'civic',
  'inverted-plaza': 'civic',
  'east-hall': 'civic',
  'wrong-workshop': 'industrial',
  'quiet-range': { theme: 'camp', density: 'sparse' },
  'mirror-commissary': 'office',
  'the-front-door': 'works',
  'drowned-records': 'archive',
};

export const MERIDIAN_BELOW: DistrictDefinition = furnish(plan, {
  id: 'meridian-below',
  name: 'Meridian Below',
  subtitle: 'The Far Side of the Door',
  tier: 8,
  region: 'meridian-core',
  recovery: { districtId: 'sector-three', position: SECTOR_THREE_ANCHORS.knockReturn },
  ambience: { darkness: 0.68, tint: '#120a1c', fog: '#140c22', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: MERIDIAN_BELOW_ANCHORS,
  areas: [
    plan.area('arrival', 'Arrival'),
    plan.area('empty-medbay', 'The Empty Medbay', { safe: true }),
    plan.area('engineering-below', 'Engineering, Inverted'),
    plan.area('wrong-workshop', 'The Wrong Workshop'),
    plan.area('inverted-plaza', 'The Inverted Plaza'),
    plan.area('quiet-range', 'The Quiet Range'),
    plan.area('the-front-door', 'The Front Door', { multiCombat: true }),
    plan.area('mirror-commissary', 'Mirror Commissary'),
    plan.area('drowned-records', 'Records, Reflected'),
    plan.area('west-hall', 'Verdance Gate, Reversed'),
    plan.area('east-hall', 'Service Gate, Reversed'),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  assemblies,
  creatures: [...residents, ...packs],
  lights: [
    { position: plan.center('the-well'), radius: 10, color: '#b57cff', intensity: 0.5 },
    { position: plan.center('west-hall'), radius: 8, color: '#b57cff', intensity: 0.5 },
    { position: plan.center('east-hall'), radius: 8, color: '#ff4d4d', intensity: 0.5 },
    { position: plan.spot('arrival', 12, 11), radius: 11, color: '#b57cff', intensity: 0.5 },
    { position: plan.spot('empty-medbay', 22, 3), radius: 14, color: '#d8fff0', intensity: 0.35 },
    { position: plan.spot('engineering-below', 12, 9), radius: 13, color: '#b57cff', intensity: 0.4 },
    { position: plan.spot('wrong-workshop', 12, 10), radius: 12, color: '#ffb347', intensity: 0.35 },
    { position: plan.spot('inverted-plaza', 22, 17), radius: 14, color: '#b57cff', intensity: 0.55 },
    { position: plan.spot('quiet-range', 12, 9), radius: 13, color: '#ff4d4d', intensity: 0.35 },
    { position: plan.spot('the-front-door', 22, 3), radius: 14, color: '#b57cff', intensity: 0.8 },
  ],
}, dressing);
