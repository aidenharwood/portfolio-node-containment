import { drawBlueprint, exit, link, patch, pillars, room } from '../../world/blueprint.ts';
import type { AssemblyPlacement } from '../../world/assemblies.ts';
import type { DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { CIVIC_PROPS, INDUSTRIAL_PROPS, scatterGroups } from './populate.ts';

const plan = drawBlueprint({ width: 68, height: 48 }, [
  room('command-post', 1, 1, 16, 12, 'carpet'),
  room('concourse', 18, 1, 32, 12, 'concrete'),
  room('workshop', 51, 1, 16, 12, 'grate'),
  room('platform-hall', 1, 14, 66, 16, 'plating'),
  room('infirmary', 1, 31, 20, 16, 'plating'),
  room('stores', 22, 31, 24, 16, 'concrete'),
  room('lift-gallery', 47, 31, 20, 16, 'grate'),
  patch(65, 14, 2, 16, 'track'),
  patch(64, 14, 1, 16, 'hazard'),
  patch(31, 5, 6, 4, 'glass'),
  patch(32, 6, 4, 2, 'coolant'),
  link('command-post', 'concourse', 3),
  link('concourse', 'workshop', 3),
  link('command-post', 'platform-hall', 3),
  link('concourse', 'platform-hall', 12, 'plating'),
  link('workshop', 'platform-hall', 3),
  link('platform-hall', 'infirmary', 3),
  link('platform-hall', 'stores', 10, 'plating'),
  link('platform-hall', 'lift-gallery', 3),
  link('infirmary', 'stores', 3),
  link('stores', 'lift-gallery', 3),
  pillars('platform-hall', 8, 8, 4),
  pillars('lift-gallery', 6, 6, 4),
  exit('north', 'concourse', 'north', 13, { floor: 'grate' }),
  exit('south', 'stores', 'south', 13, { floor: 'grate' }),
  exit('west', 'platform-hall', 'west', 9, { offset: 6, floor: 'grate' }),
  exit('east', 'lift-gallery', 'east', 9, { floor: 'grate' }),
]);

export const DEEPWATCH_ANCHORS = {
  liftArrival: plan.at('platform-hall', 2, 2),
  recovery: plan.at('infirmary', 7, 13),
  thresholdLanding: plan.at('concourse', 14, 2),
  tramPlatform: plan.at('platform-hall', 60, 8),
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [
    { instanceId: 'dw-thale', npcId: 'director-thale', position: plan.at('command-post', 3, 2) },
    { instanceId: 'dw-bui', npcId: 'quartermaster-bui', position: plan.at('stores', 12, 3) },
    { instanceId: 'dw-penhallow', npcId: 'dr-penhallow', position: plan.at('infirmary', 7, 3) },
    { instanceId: 'dw-duval', npcId: 'artificer-duval', position: plan.at('workshop', 3, 3) },
  ];

const fixtures: ObjectPlacement[] = [
  
    { instanceId: 'dw-tram-stop', objectId: 'tram-stop', position: plan.at('platform-hall', 62, 15), facing: 'east' },
    { instanceId: 'dw-tram', objectId: 'deepwatch-deep-line', position: plan.at('platform-hall', 0, 2), facing: 'east' },
    { instanceId: 'dw-threshold-a', objectId: 'deepwatch-threshold-door', position: plan.at('concourse', 14, 0) },
    { instanceId: 'dw-threshold-b', objectId: 'deepwatch-threshold-door', position: plan.at('concourse', 17, 0) },
    { instanceId: 'dw-pillar-west', objectId: 'light-pillar', position: plan.at('concourse', 0, 0) },
    { instanceId: 'dw-pillar-east', objectId: 'light-pillar', position: plan.at('concourse', 31, 0) },
    { instanceId: 'dw-concourse-sign', objectId: 'warning-sign', position: plan.at('concourse', 9, 0) },
    { instanceId: 'dw-council', objectId: 'council-terminal', position: plan.at('command-post', 1, 0) },
    { instanceId: 'dw-command-rack-a', objectId: 'server-rack', position: plan.at('command-post', 14, 0) },
    { instanceId: 'dw-command-rack-b', objectId: 'server-rack', position: plan.at('command-post', 15, 0) },
    { instanceId: 'dw-command-bench', objectId: 'briefing-bench', position: plan.at('command-post', 13, 10) },
    { instanceId: 'dw-refinery', objectId: 'refinery', position: plan.at('workshop', 15, 1), facing: 'west' },
    { instanceId: 'dw-fabricator', objectId: 'fabricator', position: plan.at('workshop', 15, 3), facing: 'west' },
    { instanceId: 'dw-synthesiser', objectId: 'synthesiser', position: plan.at('workshop', 15, 11), facing: 'west' },
    { instanceId: 'dw-workshop-storage', objectId: 'storage-locker', position: plan.at('workshop', 0, 0) },
    { instanceId: 'dw-workshop-crate', objectId: 'supply-crate', position: plan.at('workshop', 1, 11) },
    { instanceId: 'dw-hall-directory', objectId: 'intake-kiosk', position: plan.at('platform-hall', 1, 15) },
    { instanceId: 'dw-hall-planter-a', objectId: 'planter', position: plan.at('platform-hall', 12, 0) },
    { instanceId: 'dw-hall-planter-b', objectId: 'planter', position: plan.at('platform-hall', 53, 0) },
    { instanceId: 'dw-hall-sign', objectId: 'warning-sign', position: plan.at('platform-hall', 60, 0) },
    { instanceId: 'dw-hall-bench-a', objectId: 'briefing-bench', position: plan.at('platform-hall', 25, 3) },
    { instanceId: 'dw-hall-bench-b', objectId: 'briefing-bench', position: plan.at('platform-hall', 40, 3) },
    { instanceId: 'dw-infirmary-storage', objectId: 'storage-locker', position: plan.at('infirmary', 0, 0), facing: 'east' },
    { instanceId: 'dw-bed-a', objectId: 'med-bed', position: plan.at('infirmary', 1, 15) },
    { instanceId: 'dw-bed-b', objectId: 'med-bed', position: plan.at('infirmary', 3, 15) },
    { instanceId: 'dw-bed-c', objectId: 'med-bed', position: plan.at('infirmary', 12, 15) },
    { instanceId: 'dw-bed-d', objectId: 'med-bed', position: plan.at('infirmary', 17, 15) },
    { instanceId: 'dw-stores-crate-a', objectId: 'supply-crate', position: plan.at('stores', 0, 0) },
    { instanceId: 'dw-stores-crate-b', objectId: 'supply-crate', position: plan.at('stores', 23, 0) },
    { instanceId: 'dw-stores-crate-c', objectId: 'supply-crate', position: plan.at('stores', 0, 15) },
    { instanceId: 'dw-stores-storage', objectId: 'storage-locker', position: plan.at('stores', 23, 15) },
    { instanceId: 'dw-gallery-pillar-a', objectId: 'light-pillar', position: plan.at('lift-gallery', 0, 15) },
    { instanceId: 'dw-gallery-pillar-b', objectId: 'light-pillar', position: plan.at('lift-gallery', 19, 15) },
    { instanceId: 'dw-gallery-papers', objectId: 'litter-papers', position: plan.at('lift-gallery', 2, 2) },
    { instanceId: 'dw-gallery-sign', objectId: 'warning-sign', position: plan.at('lift-gallery', 19, 0) },
    { instanceId: 'dw-command-desk', objectId: 'office-desk', position: plan.at('command-post', 0, 3), facing: 'east' },
    { instanceId: 'dw-command-cabinet', objectId: 'filing-cabinet', position: plan.at('command-post', 0, 11), facing: 'east' },
    { instanceId: 'dw-command-notices', objectId: 'notice-board', position: plan.at('command-post', 12, 0) },
    { instanceId: 'dw-command-shelf', objectId: 'wall-shelf', position: plan.at('command-post', 15, 11), facing: 'west' },
    { instanceId: 'dw-stores-rack-a', objectId: 'storage-rack', position: plan.at('stores', 0, 2), facing: 'east' },
    { instanceId: 'dw-stores-rack-b', objectId: 'storage-rack', position: plan.at('stores', 0, 12), facing: 'east' },
    { instanceId: 'dw-stores-rack-c', objectId: 'storage-rack', position: plan.at('stores', 23, 2), facing: 'west' },
    { instanceId: 'dw-stores-rack-d', objectId: 'storage-rack', position: plan.at('stores', 23, 12), facing: 'west' },
    { instanceId: 'dw-stores-desk', objectId: 'office-desk', position: plan.at('stores', 2, 15), facing: 'north' },
    { instanceId: 'dw-infirmary-shelf-a', objectId: 'wall-shelf', position: plan.at('infirmary', 19, 1), facing: 'west' },
    { instanceId: 'dw-infirmary-shelf-b', objectId: 'wall-shelf', position: plan.at('infirmary', 19, 3), facing: 'west' },
    { instanceId: 'dw-infirmary-cooler', objectId: 'water-cooler', position: plan.at('infirmary', 19, 0), facing: 'west' },
    { instanceId: 'dw-infirmary-desk', objectId: 'office-desk', position: plan.at('infirmary', 0, 3), facing: 'east' },
    { instanceId: 'dw-infirmary-notices', objectId: 'notice-board', position: plan.at('infirmary', 2, 0) },
  ];

const assemblies: AssemblyPlacement[] = [
  { instanceId: 'dw-tram-car', assemblyId: 'tram-car', position: plan.spot('platform-hall', 64, 5), facing: 'west' },];

const placed = [...npcs, ...fixtures, ...assemblies];

const furnishings = scatterGroups(plan, placed, [
  ['platform-hall', 'dw-hall-prop', CIVIC_PROPS, 10],
  ['concourse', 'dw-concourse-prop', CIVIC_PROPS, 6],
  ['stores', 'dw-stores-prop', INDUSTRIAL_PROPS, 6],
  ['lift-gallery', 'dw-gallery-prop', CIVIC_PROPS, 4],
  ['infirmary', 'dw-infirmary-prop', ['planter', 'water-cooler'], 3],
]);

export const DEEPWATCH: DistrictDefinition = {
  id: 'deepwatch',
  name: 'Deepwatch Station',
  subtitle: 'Site Meridian — Forward Base, Sector 3 Annex',
  tier: 4,
  region: 'meridian-core',
  ambience: { darkness: 0.42, tint: '#0a1018', fog: '#0c141e' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: DEEPWATCH_ANCHORS,
  areas: [
    plan.area('command-post', 'Command Post', { safe: true }),
    plan.area('concourse', 'Threshold Concourse', { safe: true }),
    plan.area('workshop', 'Deepwatch Workshop', { safe: true }),
    plan.area('platform-hall', 'Platform Hall', { safe: true }),
    plan.area('infirmary', 'Infirmary', { safe: true }),
    plan.area('stores', 'Stores', { safe: true }),
    plan.area('lift-gallery', 'South Gallery', { safe: true }),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  assemblies,
  lights: [
    { position: plan.spot('command-post', 3, 2), radius: 11, color: '#ffd27f', intensity: 0.5 },
    { position: plan.spot('concourse', 14, 2), radius: 13, color: '#b57cff', intensity: 0.45 },
    { position: plan.spot('workshop', 12, 2), radius: 11, color: '#ffb36b', intensity: 0.55 },
    { position: plan.spot('platform-hall', 14, 2), radius: 13, color: '#9fd8ff', intensity: 0.5 },
    { position: plan.spot('platform-hall', 51, 2), radius: 13, color: '#9fd8ff', intensity: 0.5 },
    { position: plan.spot('infirmary', 7, 12), radius: 11, color: '#d8fff0', intensity: 0.5 },
    { position: plan.spot('stores', 12, 12), radius: 11, color: '#ffcf4d', intensity: 0.45 },
    { position: plan.spot('lift-gallery', 10, 12), radius: 11, color: '#ff9a4d', intensity: 0.5 },
  ],
};
