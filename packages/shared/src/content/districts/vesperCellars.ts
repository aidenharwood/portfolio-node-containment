import { drawBlueprint, link, patch, pillars, room } from '../../world/blueprint.ts';
import type { CreaturePlacement, DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { VESPER_LODGE_ANCHORS } from './vesperLodge.ts';
import { LITTER, scatterGroups, scatterPacks } from './populate.ts';

const plan = drawBlueprint({ width: 110, height: 84 }, [
  room('lift-landing', 89, 1, 20, 18, 'carpet'),
  room('mortuary', 2, 1, 84, 46, 'concrete'),
  room('cold-ward', 89, 22, 20, 60, 'plating'),
  room('almoners-office', 24, 50, 62, 32, 'rust'),
  room('cold-lockers', 2, 50, 20, 32, 'concrete', 'octagon'),
  patch(16, 12, 60, 2, 'coolant'),
  patch(30, 12, 4, 2, 'grate'),
  patch(56, 12, 4, 2, 'grate'),
  patch(16, 32, 60, 2, 'coolant'),
  patch(30, 32, 4, 2, 'grate'),
  patch(56, 32, 4, 2, 'grate'),
  patch(99, 34, 6, 6, 'coolant'),
  patch(93, 60, 7, 8, 'coolant'),
  link('lift-landing', 'mortuary', 3),
  link('lift-landing', 'cold-ward', 3),
  link('cold-ward', 'mortuary', 7, 'concrete'),
  link('mortuary', 'almoners-office', 3),
  link('cold-ward', 'almoners-office', 3),
  link('mortuary', 'cold-lockers', 7, 'concrete'),
  link('cold-lockers', 'almoners-office', 5, 'concrete'),
  pillars('mortuary', 12, 11, 6),
]);

export const VESPER_CELLARS_ANCHORS = {
  liftArrival: plan.at('lift-landing', 16, 3),
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [];

const fixtures: ObjectPlacement[] = [
  
    { instanceId: 'vcl-lift', objectId: 'vesper-lift-up', position: plan.at('lift-landing', 19, 1), facing: 'west' },
    { instanceId: 'vcl-sign', objectId: 'warning-sign', position: plan.at('lift-landing', 0, 0) },
    { instanceId: 'vcl-still-a', objectId: 'tincture-still', position: plan.at('mortuary', 82, 0) },
    { instanceId: 'vcl-still-b', objectId: 'tincture-still', position: plan.at('mortuary', 0, 21) },
    { instanceId: 'vcl-still-c', objectId: 'tincture-still', position: plan.at('cold-ward', 19, 58) },
    { instanceId: 'vcl-cabinet-a', objectId: 'herb-cabinet', position: plan.at('mortuary', 28, 0) },
    { instanceId: 'vcl-cabinet-b', objectId: 'herb-cabinet', position: plan.at('mortuary', 62, 45), facing: 'north' },
    { instanceId: 'vcl-cabinet-c', objectId: 'herb-cabinet', position: plan.at('cold-ward', 2, 0) },
    { instanceId: 'vcl-ledger', objectId: 'cellar-ledger', position: plan.at('almoners-office', 1, 30), facing: 'east' },
    { instanceId: 'vcl-mortuary-debris', objectId: 'litter-debris', position: plan.at('mortuary', 49, 2) },
    { instanceId: 'vcl-mortuary-gravel', objectId: 'litter-gravel', position: plan.at('mortuary', 14, 42) },
    { instanceId: 'vcl-ward-papers', objectId: 'litter-papers', position: plan.at('cold-ward', 11, 56) },
  ];

const residents: CreaturePlacement[] = [
    { instanceId: 'vcl-mortuary-attendant-a', creatureId: 'morgue-attendant', position: plan.at('mortuary', 77, 2) },
    { instanceId: 'vcl-mortuary-attendant-b', creatureId: 'morgue-attendant', position: plan.at('mortuary', 49, 21) },
    { instanceId: 'vcl-mortuary-attendant-c', creatureId: 'morgue-attendant', position: plan.at('mortuary', 14, 2) },
    { instanceId: 'vcl-mortuary-attendant-d', creatureId: 'morgue-attendant', position: plan.at('mortuary', 7, 24) },
    { instanceId: 'vcl-mortuary-attendant-e', creatureId: 'morgue-attendant', position: plan.at('mortuary', 63, 42) },
    { instanceId: 'vcl-mortuary-attendant-f', creatureId: 'morgue-attendant', position: plan.at('mortuary', 21, 43) },
    { instanceId: 'vcl-ward-attendant-a', creatureId: 'morgue-attendant', position: plan.at('cold-ward', 11, 25) },
    { instanceId: 'vcl-ward-attendant-b', creatureId: 'morgue-attendant', position: plan.at('cold-ward', 16, 56) },
    { instanceId: 'vcl-office-almoner', creatureId: 'the-almoner', position: plan.at('almoners-office', 24, 16) },
  ];

const placed = [...npcs, ...fixtures, ...residents];

const furnishings = scatterGroups(plan, placed, [
  ['mortuary', 'vcl-mortuary-node', ['tincture-still', 'herb-cabinet'], 4],
  ['cold-lockers', 'vcl-lockers-node', ['herb-cabinet', 'tincture-still'], 3],
  ['mortuary', 'vcl-mortuary-litter', LITTER, 10],
  ['cold-ward', 'vcl-ward-litter', LITTER, 5],
]);

const packs = scatterPacks(plan, [...placed, ...furnishings], [
  ['mortuary', 'vcl-attendant-mortuary-pack', 'morgue-attendant', 9],
  ['cold-ward', 'vcl-attendant-ward-pack', 'morgue-attendant', 5],
  ['cold-lockers', 'vcl-attendant-lockers-pack', 'morgue-attendant', 4],
]);

export const VESPER_CELLARS: DistrictDefinition = {
  id: 'vesper-cellars',
  name: 'The Cold Ward',
  subtitle: 'Vesper Wing — Cellars',
  tier: 13,
  region: 'vesper',
  recovery: { districtId: 'vesper-lodge', position: VESPER_LODGE_ANCHORS.recovery },
  ambience: { darkness: 0.72, tint: '#0c1416', fog: '#0f181a', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: VESPER_CELLARS_ANCHORS,
  areas: [
    plan.area('lift-landing', 'Lift Landing', { safe: true }),
    plan.area('mortuary', 'Mortuary'),
    plan.area('cold-ward', 'Cold Ward'),
    plan.area('almoners-office', 'Almoner\'s Office', { multiCombat: true }),
    plan.area('cold-lockers', 'Cold Lockers'),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  creatures: [...residents, ...packs],
  lights: [
    { position: plan.center('cold-lockers'), radius: 9, color: '#9fd8ff', intensity: 0.5 },
    { position: plan.spot('lift-landing', 16, 3), radius: 11, color: '#ffe8b8', intensity: 0.6 },
    { position: plan.spot('mortuary', 70, 21), radius: 13, color: '#6ad8b8', intensity: 0.45 },
    { position: plan.spot('mortuary', 21, 21), radius: 13, color: '#6ad8b8', intensity: 0.4 },
    { position: plan.spot('cold-ward', 11, 34), radius: 13, color: '#6ad8b8', intensity: 0.4 },
    { position: plan.spot('almoners-office', 37, 16), radius: 14, color: '#ffe8b8', intensity: 0.55 },
    { position: plan.spot('almoners-office', 6, 29), radius: 9, color: '#6ad8b8', intensity: 0.5 },
  ],
};
