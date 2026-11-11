import { drawBlueprint, exit, link, patch, pillars, room } from '../../world/blueprint.ts';
import type { CreaturePlacement, DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { HYDROPONICS_ANCHORS } from './hydroponics.ts';
import { LITTER, scatterGroups, scatterPacks } from './populate.ts';

const plan = drawBlueprint({ width: 120, height: 96 }, [
  room('north-ward', 1, 1, 118, 30, 'plating'),
  room('ward-corridor', 1, 34, 55, 24, 'plating'),
  room('south-ward', 59, 34, 60, 38, 'plating'),
  room('linen-store', 1, 60, 55, 12, 'carpet'),
  room('admissions', 47, 75, 26, 20, 'concrete'),
  patch(10, 15, 98, 1, 'carpet'),
  patch(66, 52, 46, 1, 'carpet'),
  link('admissions', 'south-ward', 9, 'concrete'),
  link('admissions', 'linen-store', 3),
  link('south-ward', 'north-ward', 9, 'plating'),
  link('ward-corridor', 'north-ward', 7, 'plating'),
  link('ward-corridor', 'south-ward', 5, 'plating'),
  link('ward-corridor', 'linen-store', 3),
  pillars('north-ward', 12, 9, 5),
  pillars('south-ward', 10, 9, 5),
  exit('south', 'admissions', 'south', 13),
  exit('west', 'ward-corridor', 'west', 2, { gate: true, floor: 'door' }),
]);

export const VESPER_WARDS_ANCHORS = {
  
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [];

const fixtures: ObjectPlacement[] = [
  
    { instanceId: 'vw-admissions-sign', objectId: 'warning-sign', position: plan.at('admissions', 25, 0) },
    { instanceId: 'vw-cabinet-a', objectId: 'herb-cabinet', position: plan.at('north-ward', 116, 0) },
    { instanceId: 'vw-cabinet-b', objectId: 'herb-cabinet', position: plan.at('north-ward', 63, 0) },
    { instanceId: 'vw-cabinet-c', objectId: 'herb-cabinet', position: plan.at('north-ward', 0, 14), facing: 'east' },
    { instanceId: 'vw-cabinet-d', objectId: 'herb-cabinet', position: plan.at('north-ward', 75, 29), facing: 'north' },
    { instanceId: 'vw-cabinet-e', objectId: 'herb-cabinet', position: plan.at('south-ward', 59, 36), facing: 'west' },
    { instanceId: 'vw-cabinet-f', objectId: 'herb-cabinet', position: plan.at('south-ward', 2, 0) },
    { instanceId: 'vw-bell', objectId: 'vesper-lodge-bell', position: plan.at('ward-corridor', 0, 20), facing: 'east' },
    { instanceId: 'vw-chart-a', objectId: 'vesper-chart-a', position: plan.at('south-ward', 53, 0) },
    { instanceId: 'vw-chart-b', objectId: 'vesper-chart-b', position: plan.at('south-ward', 28, 37), facing: 'north' },
    { instanceId: 'vw-chart-c', objectId: 'vesper-chart-c', position: plan.at('south-ward', 4, 0) },
    { instanceId: 'vw-north-bench', objectId: 'briefing-bench', position: plan.at('north-ward', 44, 15) },
    { instanceId: 'vw-admissions-papers', objectId: 'litter-papers', position: plan.at('admissions', 9, 2) },
    { instanceId: 'vw-corridor-debris', objectId: 'litter-debris', position: plan.at('ward-corridor', 33, 21) },
    { instanceId: 'vw-south-puddle', objectId: 'litter-puddle', position: plan.at('south-ward', 39, 13) },
    { instanceId: 'vw-south-papers', objectId: 'litter-papers', position: plan.at('south-ward', 12, 24) },
  ];

const residents: CreaturePlacement[] = [
    { instanceId: 'vw-north-orderly-a', creatureId: 'ward-orderly', position: plan.at('north-ward', 101, 1) },
    { instanceId: 'vw-north-orderly-b', creatureId: 'ward-orderly', position: plan.at('north-ward', 76, 15) },
    { instanceId: 'vw-north-orderly-c', creatureId: 'ward-orderly', position: plan.at('north-ward', 38, 1) },
    { instanceId: 'vw-north-orderly-d', creatureId: 'ward-orderly', position: plan.at('north-ward', 19, 28) },
    { instanceId: 'vw-north-orderly-e', creatureId: 'ward-orderly', position: plan.at('north-ward', 57, 28) },
    { instanceId: 'vw-north-orderly-f', creatureId: 'ward-orderly', position: plan.at('north-ward', 2, 1) },
    { instanceId: 'vw-corridor-orderly-a', creatureId: 'ward-orderly', position: plan.at('ward-corridor', 29, 2) },
    { instanceId: 'vw-corridor-orderly-b', creatureId: 'ward-orderly', position: plan.at('ward-corridor', 9, 21) },
    { instanceId: 'vw-south-nurse-a', creatureId: 'night-nurse', position: plan.at('south-ward', 56, 13) },
    { instanceId: 'vw-south-nurse-b', creatureId: 'night-nurse', position: plan.at('south-ward', 41, 2) },
    { instanceId: 'vw-south-nurse-c', creatureId: 'night-nurse', position: plan.at('south-ward', 35, 36) },
    { instanceId: 'vw-south-nurse-d', creatureId: 'night-nurse', position: plan.at('south-ward', 23, 1) },
    { instanceId: 'vw-south-nurse-e', creatureId: 'night-nurse', position: plan.at('south-ward', 11, 35) },
    { instanceId: 'vw-south-nurse-f', creatureId: 'night-nurse', position: plan.at('south-ward', 2, 24) },
    { instanceId: 'vw-south-nurse-g', creatureId: 'night-nurse', position: plan.at('south-ward', 50, 36) },
    { instanceId: 'vw-south-nurse-h', creatureId: 'night-nurse', position: plan.at('south-ward', 26, 24) },
  ];

const placed = [...npcs, ...fixtures, ...residents];

const furnishings = scatterGroups(plan, placed, [
  ['north-ward', 'vw-north-node', ['herb-cabinet'], 4],
  ['south-ward', 'vw-south-node', ['herb-cabinet'], 3],
  ['linen-store', 'vw-linen-node', ['herb-cabinet'], 2],
  ['north-ward', 'vw-north-prop', ['water-cooler', 'briefing-bench', 'wall-locker'], 12],
  ['south-ward', 'vw-south-prop', ['water-cooler', 'briefing-bench', 'wall-locker'], 8],
  ['ward-corridor', 'vw-corridor-litter', LITTER, 6],
  ['linen-store', 'vw-linen-prop', ['storage-rack', 'wall-locker'], 6],
]);

const packs = scatterPacks(plan, [...placed, ...furnishings], [
  ['north-ward', 'vw-orderly-north-pack', 'ward-orderly', 10],
  ['south-ward', 'vw-orderly-south-pack', 'ward-orderly', 6],
  ['south-ward', 'vw-nurse-south-pack', 'night-nurse', 6],
  ['ward-corridor', 'vw-nurse-corridor-pack', 'night-nurse', 4],
  ['linen-store', 'vw-nurse-linen-pack', 'night-nurse', 2],
]);

export const VESPER_WARDS: DistrictDefinition = {
  id: 'vesper-wards',
  name: 'Vesper Wards',
  subtitle: 'Vesper Wing — General Wards',
  tier: 12,
  region: 'vesper',
  recovery: { districtId: 'hydroponics', position: HYDROPONICS_ANCHORS.tramPlatform },
  ambience: { darkness: 0.6, tint: '#0f1614', fog: '#121a18', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: VESPER_WARDS_ANCHORS,
  areas: [
    plan.area('north-ward', 'North Ward'),
    plan.area('admissions', 'Admissions'),
    plan.area('ward-corridor', 'Ward Corridor'),
    plan.area('south-ward', 'South Ward'),
    plan.area('linen-store', 'Linen Store'),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  creatures: [...residents, ...packs],
  lights: [
    { position: plan.center('linen-store'), radius: 9, color: '#c8ffe0', intensity: 0.5 },
    { position: plan.spot('admissions', 16, 10), radius: 11, color: '#6ad8b8', intensity: 0.5 },
    { position: plan.spot('north-ward', 95, 2), radius: 13, color: '#ffe8b8', intensity: 0.45 },
    { position: plan.spot('north-ward', 51, 15), radius: 14, color: '#6ad8b8', intensity: 0.5 },
    { position: plan.spot('north-ward', 13, 15), radius: 13, color: '#ffe8b8', intensity: 0.45 },
    { position: plan.spot('ward-corridor', 29, 12), radius: 14, color: '#6ad8b8', intensity: 0.5 },
    { position: plan.spot('ward-corridor', 2, 3), radius: 9, color: '#ffe8b8', intensity: 0.55 },
    { position: plan.spot('south-ward', 47, 24), radius: 13, color: '#ffe8b8', intensity: 0.4 },
    { position: plan.spot('south-ward', 17, 34), radius: 14, color: '#6ad8b8', intensity: 0.45 },
  ],
};
