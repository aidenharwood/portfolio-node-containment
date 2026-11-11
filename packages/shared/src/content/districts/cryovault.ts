import { drawBlueprint, exit, link, patch, pillars, room, track } from '../../world/blueprint.ts';
import type { AssemblyPlacement } from '../../world/assemblies.ts';
import type { CreaturePlacement, DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { DEEPWATCH_ANCHORS } from './deepwatch.ts';
import { INDUSTRIAL_PROPS, LITTER, OFFICE_PROPS, scatterGroups, scatterPacks } from './populate.ts';

const plan = drawBlueprint({ width: 86, height: 62 }, [
  room('freezer-plant', 1, 1, 16, 20, 'grate'),
  room('fenn-nook', 18, 1, 15, 14, 'carpet'),
  room('thaw-room', 18, 16, 15, 9, 'plating'),
  room('pod-hall', 34, 1, 31, 20, 'concrete'),
  room('dock', 66, 1, 19, 24, 'grate'),
  room('cold-corridor', 1, 26, 84, 9, 'plating'),
  room('curator-office', 1, 36, 43, 25, 'carpet'),
  room('husk-ward', 45, 36, 40, 25, 'concrete'),
  patch(42, 9, 15, 2, 'coolant'),
  patch(52, 44, 10, 2, 'coolant'),
  patch(70, 52, 10, 2, 'coolant'),
  patch(14, 41, 17, 1, 'glass'),
  patch(14, 42, 1, 3, 'glass'),
  patch(30, 42, 1, 3, 'glass'),
  link('freezer-plant', 'fenn-nook', 3),
  link('fenn-nook', 'pod-hall', 3),
  link('fenn-nook', 'thaw-room', 3),
  link('pod-hall', 'dock', 9, 'concrete'),
  link('freezer-plant', 'cold-corridor', 3),
  link('thaw-room', 'cold-corridor', 5, 'plating'),
  link('pod-hall', 'cold-corridor', 5, 'concrete'),
  link('dock', 'cold-corridor', 9, 'grate'),
  link('cold-corridor', 'husk-ward', 9, 'concrete'),
  link('cold-corridor', 'curator-office', 3),
  link('husk-ward', 'curator-office', 3),
  pillars('cold-corridor', 10, 4, 4),
  pillars('pod-hall', 8, 8, 4),
  pillars('husk-ward', 9, 8, 5),
  patch(81, 1, 1, 24, 'hazard'),
  track([82, 0], [82, 60]),
  patch(84, 1, 1, 11, 'wall'),
  patch(84, 16, 1, 45, 'wall'),
  patch(81, 25, 1, 36, 'wall'),
  exit('east', 'dock', 'east', 2, { offset: 12, gate: true, floor: 'door' }),
]);

export const CRYOVAULT_ANCHORS = {
  tramPlatform: plan.at('dock', 12, 6),
  entrance: plan.at('dock', 14, 13),
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [
    { instanceId: 'cv-fenn', npcId: 'orderly-fenn', position: plan.at('fenn-nook', 3, 10) },
  ];

const fixtures: ObjectPlacement[] = [
  { instanceId: 'cv-tram-stop', objectId: 'tram-stop', position: plan.at('dock', 14, 2), facing: 'east' },
    { instanceId: 'cv-dock-sign', objectId: 'warning-sign', position: plan.at('dock', 14, 0) },
    { instanceId: 'cv-dock-crate-a', objectId: 'supply-crate', position: plan.at('dock', 13, 23) },
    { instanceId: 'cv-dock-crate-b', objectId: 'supply-crate', position: plan.at('dock', 14, 23) },
    { instanceId: 'cv-pod-a', objectId: 'cryo-pod', position: plan.at('pod-hall', 1, 1) },
    { instanceId: 'cv-pod-b', objectId: 'cryo-pod', position: plan.at('pod-hall', 29, 1) },
    { instanceId: 'cv-pod-c', objectId: 'cryo-pod', position: plan.at('pod-hall', 1, 18) },
    { instanceId: 'cv-pod-d', objectId: 'cryo-pod', position: plan.at('pod-hall', 29, 18) },
    { instanceId: 'cv-cold-pod-a', objectId: 'cold-pod', position: plan.at('pod-hall', 8, 0) },
    { instanceId: 'cv-cold-pod-b', objectId: 'cold-pod', position: plan.at('pod-hall', 19, 0) },
    { instanceId: 'cv-cold-pod-c', objectId: 'cold-pod', position: plan.at('pod-hall', 8, 19) },
    { instanceId: 'cv-cold-pod-d', objectId: 'cold-pod', position: plan.at('pod-hall', 19, 19) },
    { instanceId: 'cv-nook-heater', objectId: 'camp-heater', position: plan.at('fenn-nook', 1, 1) },
    { instanceId: 'cv-nook-storage', objectId: 'storage-locker', position: plan.at('fenn-nook', 14, 0) },
    { instanceId: 'cv-nook-bed', objectId: 'med-bed', position: plan.at('fenn-nook', 13, 13) },
    { instanceId: 'cv-nook-bench', objectId: 'briefing-bench', position: plan.at('fenn-nook', 1, 12) },
    { instanceId: 'cv-crystal-a', objectId: 'rime-crystal', position: plan.at('freezer-plant', 1, 1) },
    { instanceId: 'cv-crystal-b', objectId: 'rime-crystal', position: plan.at('freezer-plant', 14, 1) },
    { instanceId: 'cv-crystal-c', objectId: 'rime-crystal', position: plan.at('freezer-plant', 1, 18) },
    { instanceId: 'cv-crystal-d', objectId: 'rime-crystal', position: plan.at('freezer-plant', 14, 18) },
    { instanceId: 'cv-plant-pipes', objectId: 'pipe-cluster', position: plan.at('freezer-plant', 3, 0) },
    { instanceId: 'cv-corridor-pillar-west', objectId: 'light-pillar', position: plan.at('cold-corridor', 0, 2) },
    { instanceId: 'cv-corridor-pillar-east', objectId: 'light-pillar', position: plan.at('cold-corridor', 79, 0) },
    { instanceId: 'cv-ward-pod-a', objectId: 'cold-pod', position: plan.at('husk-ward', 1, 1) },
    { instanceId: 'cv-ward-pod-b', objectId: 'cold-pod', position: plan.at('husk-ward', 35, 1) },
    { instanceId: 'cv-ward-pod-c', objectId: 'cold-pod', position: plan.at('husk-ward', 1, 24) },
    { instanceId: 'cv-ward-pod-d', objectId: 'cold-pod', position: plan.at('husk-ward', 35, 24) },
    { instanceId: 'cv-ward-crystal-a', objectId: 'rime-crystal', position: plan.at('husk-ward', 18, 12) },
    { instanceId: 'cv-ward-crystal-b', objectId: 'rime-crystal', position: plan.at('husk-ward', 18, 22) },
    { instanceId: 'cv-ledger', objectId: 'curator-ledger', position: plan.at('curator-office', 21, 6) },
    { instanceId: 'cv-office-rack-a', objectId: 'server-rack', position: plan.at('curator-office', 1, 0) },
    { instanceId: 'cv-office-rack-b', objectId: 'server-rack', position: plan.at('curator-office', 42, 0) },
    { instanceId: 'cv-office-pod-a', objectId: 'cold-pod', position: plan.at('curator-office', 1, 24) },
    { instanceId: 'cv-office-pod-b', objectId: 'cold-pod', position: plan.at('curator-office', 42, 24) },
    { instanceId: 'cv-office-sign', objectId: 'warning-sign', position: plan.at('curator-office', 26, 0) },
  ];

const assemblies: AssemblyPlacement[] = [
  { instanceId: 'cv-tram-car', assemblyId: 'tram-car', position: plan.spot('dock', 16, 4), facing: 'east' },
  { instanceId: 'cv-line-bridge', assemblyId: 'bridge', position: plan.spot('dock', 15, 12), facing: 'east', span: 2 },];

const residents: CreaturePlacement[] = [
    { instanceId: 'cv-moth-hall-a', creatureId: 'frost-moth', position: plan.at('pod-hall', 3, 2) },
    { instanceId: 'cv-moth-hall-b', creatureId: 'frost-moth', position: plan.at('pod-hall', 24, 17) },
    { instanceId: 'cv-moth-hall-c', creatureId: 'frost-moth', position: plan.at('pod-hall', 14, 16) },
    { instanceId: 'cv-moth-corridor-a', creatureId: 'frost-moth', position: plan.at('cold-corridor', 21, 1) },
    { instanceId: 'cv-moth-corridor-b', creatureId: 'frost-moth', position: plan.at('cold-corridor', 56, 1) },
    { instanceId: 'cv-moth-corridor-c', creatureId: 'frost-moth', position: plan.at('cold-corridor', 78, 1) },
    { instanceId: 'cv-plant-mote-a', creatureId: 'frost-mote', position: plan.at('freezer-plant', 2, 3) },
    { instanceId: 'cv-plant-mote-b', creatureId: 'frost-mote', position: plan.at('freezer-plant', 13, 2) },
    { instanceId: 'cv-plant-mote-c', creatureId: 'frost-mote', position: plan.at('freezer-plant', 3, 17) },
    { instanceId: 'cv-plant-mote-d', creatureId: 'frost-mote', position: plan.at('freezer-plant', 14, 16) },
    { instanceId: 'cv-plant-mote-e', creatureId: 'frost-mote', position: plan.at('freezer-plant', 1, 16) },
    { instanceId: 'cv-husk-ward-a', creatureId: 'rime-husk', position: plan.at('husk-ward', 8, 2) },
    { instanceId: 'cv-husk-ward-b', creatureId: 'rime-husk', position: plan.at('husk-ward', 28, 2) },
    { instanceId: 'cv-husk-ward-c', creatureId: 'rime-husk', position: plan.at('husk-ward', 13, 12) },
    { instanceId: 'cv-husk-ward-d', creatureId: 'rime-husk', position: plan.at('husk-ward', 31, 22) },
    { instanceId: 'cv-husk-ward-e', creatureId: 'rime-husk', position: plan.at('husk-ward', 6, 23) },
    { instanceId: 'cv-husk-office-a', creatureId: 'rime-husk', position: plan.at('curator-office', 3, 22) },
    { instanceId: 'cv-husk-office-b', creatureId: 'rime-husk', position: plan.at('curator-office', 39, 22) },
    { instanceId: 'cv-curator', creatureId: 'the-curator', position: plan.at('curator-office', 21, 15) },
  ];

const placed = [...npcs, ...fixtures, ...assemblies, ...residents];

const furnishings = scatterGroups(plan, placed, [
  ['husk-ward', 'cv-ward-node', ['rime-crystal'], 2],
  ['freezer-plant', 'cv-plant-node', ['rime-crystal'], 2],
  ['cold-corridor', 'cv-corridor-litter', LITTER, 8],
  ['thaw-room', 'cv-thaw-prop', ['briefing-bench', 'water-cooler', 'wall-locker'], 4],
  ['dock', 'cv-dock-prop', INDUSTRIAL_PROPS, 4],
  ['pod-hall', 'cv-hall-litter', LITTER, 4],
  ['husk-ward', 'cv-ward-litter', LITTER, 5],
  ['curator-office', 'cv-office-prop', OFFICE_PROPS, 5],
]);

const packs = scatterPacks(plan, [...placed, ...furnishings], [
  ['cold-corridor', 'cv-moth-corridor-pack', 'frost-moth', 4],
  ['husk-ward', 'cv-husk-ward-pack', 'rime-husk', 3],
  ['pod-hall', 'cv-moth-hall-pack', 'frost-moth', 2],
  ['freezer-plant', 'cv-plant-mote-pack', 'frost-mote', 2],
]);

export const CRYOVAULT: DistrictDefinition = {
  id: 'cryovault',
  name: 'The Cryovault',
  subtitle: 'Site Meridian — Cold Storage, Dormant Holdings',
  tier: 4,
  region: 'meridian-core',
  deadEnd: true,
  recovery: { districtId: 'deepwatch', position: DEEPWATCH_ANCHORS.recovery },
  ambience: { darkness: 0.6, tint: '#081420', fog: '#0c1a28', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: CRYOVAULT_ANCHORS,
  areas: [
    plan.area('dock', 'Receiving Dock'),
    plan.area('pod-hall', 'Pod Hall'),
    plan.area('fenn-nook', 'Fenn\'s Nook', { safe: true }),
    plan.area('freezer-plant', 'Freezer Plant'),
    plan.area('cold-corridor', 'Cold Corridor'),
    plan.area('husk-ward', 'Husk Ward'),
    plan.area('curator-office', 'Curator\'s Office', { multiCombat: true }),
    plan.area('thaw-room', 'Thaw Room'),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  assemblies,
  creatures: [...residents, ...packs],
  lights: [
    { position: plan.center('thaw-room'), radius: 7, color: '#ffd27f', intensity: 0.5 },
    { position: plan.center('cold-corridor'), radius: 12, color: '#7ae0ff', intensity: 0.5 },
    { position: plan.spot('dock', 9, 3), radius: 9, color: '#ffcf4d', intensity: 0.45 },
    { position: plan.spot('pod-hall', 14, 3), radius: 13, color: '#7ae0ff', intensity: 0.55 },
    { position: plan.spot('fenn-nook', 3, 3), radius: 9, color: '#ff9a4d', intensity: 0.7 },
    { position: plan.spot('freezer-plant', 3, 3), radius: 9, color: '#c8f0ff', intensity: 0.5 },
    { position: plan.spot('cold-corridor', 40, 1), radius: 13, color: '#9fd8ff', intensity: 0.4 },
    { position: plan.spot('husk-ward', 18, 12), radius: 13, color: '#7ae0ff', intensity: 0.45 },
    { position: plan.spot('curator-office', 21, 12), radius: 13, color: '#c8f0ff', intensity: 0.6 },
  ],
};
