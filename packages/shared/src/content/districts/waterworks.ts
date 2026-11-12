import { drawBlueprint, exit, link, patch, room } from '../../world/blueprint.ts';
import type { CreaturePlacement, DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { LITTER, scatterGroups, scatterPacks } from './populate.ts';
import { furnish, type Dressing } from './furnish.ts';

const plan = drawBlueprint({ width: 116, height: 91 }, [
  room('filtration-beds', 1, 1, 114, 33, 'plating'),
  room('valve-gallery', 1, 36, 26, 28, 'grate'),
  room('pump-house', 1, 66, 26, 24, 'concrete'),
  room('settling-tanks', 29, 36, 50, 28, 'concrete'),
  room('intake-screens', 29, 66, 50, 24, 'rust'),
  room('outfall', 81, 36, 34, 54, 'grate'),
  patch(8, 9, 100, 3, 'coolant'),
  patch(8, 22, 100, 3, 'coolant'),
  patch(28, 9, 3, 3, 'grate'),
  patch(58, 9, 3, 3, 'grate'),
  patch(88, 9, 3, 3, 'grate'),
  patch(28, 22, 3, 3, 'grate'),
  patch(58, 22, 3, 3, 'grate'),
  patch(88, 22, 3, 3, 'grate'),
  patch(35, 40, 16, 8, 'coolant'),
  patch(57, 40, 16, 8, 'coolant'),
  patch(35, 52, 16, 8, 'coolant'),
  patch(57, 52, 16, 8, 'coolant'),
  patch(90, 60, 16, 20, 'coolant'),
  link('pump-house', 'valve-gallery', 3),
  link('pump-house', 'intake-screens', 3),
  link('valve-gallery', 'filtration-beds', 7, 'grate'),
  link('valve-gallery', 'settling-tanks', 5, 'concrete'),
  link('filtration-beds', 'settling-tanks', 7, 'concrete'),
  link('filtration-beds', 'outfall', 7, 'grate'),
  link('settling-tanks', 'outfall', 5, 'concrete'),
  link('settling-tanks', 'intake-screens', 5, 'concrete'),
  link('intake-screens', 'outfall', 5, 'grate'),
  exit('south', 'pump-house', 'south', 13),
  exit('east', 'outfall', 'east', 13),
]);

export const WATERWORKS_ANCHORS = {
  recovery: plan.at('pump-house', 3, 6),
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [
    { instanceId: 'ww-ngata', npcId: 'pumpwright-ngata', position: plan.at('pump-house', 13, 12) },
  ];

const fixtures: ObjectPlacement[] = [
  
    { instanceId: 'ww-sign', objectId: 'warning-sign', position: plan.at('pump-house', 0, 0) },
    { instanceId: 'ww-med-bed', objectId: 'med-bed', position: plan.at('pump-house', 0, 1), facing: 'east' },
    { instanceId: 'ww-storage', objectId: 'storage-locker', position: plan.at('pump-house', 0, 22), facing: 'east' },
    { instanceId: 'ww-assay', objectId: 'waterworks-assay', position: plan.at('pump-house', 25, 22), facing: 'west' },
    { instanceId: 'ww-valve-a', objectId: 'waterworks-valve-a', position: plan.at('valve-gallery', 0, 2), facing: 'east' },
    { instanceId: 'ww-valve-b', objectId: 'waterworks-valve-b', position: plan.at('valve-gallery', 25, 10), facing: 'west' },
    { instanceId: 'ww-valve-c', objectId: 'waterworks-valve-c', position: plan.at('valve-gallery', 0, 25), facing: 'east' },
    { instanceId: 'ww-gallery-pipes-a', objectId: 'pipe-cluster', position: plan.at('valve-gallery', 2, 0) },
    { instanceId: 'ww-gallery-pipes-b', objectId: 'pipe-cluster', position: plan.at('valve-gallery', 23, 0) },
    { instanceId: 'ww-tap-a', objectId: 'waterworks-tap-a', position: plan.at('filtration-beds', 1, 0), facing: 'south' },
    { instanceId: 'ww-tap-b', objectId: 'waterworks-tap-b', position: plan.at('filtration-beds', 54, 16) },
    { instanceId: 'ww-tap-c', objectId: 'waterworks-tap-c', position: plan.at('filtration-beds', 113, 30), facing: 'west' },
    { instanceId: 'ww-beds-conduit', objectId: 'severed-conduit', position: plan.at('filtration-beds', 113, 0) },
    { instanceId: 'ww-beds-scrap', objectId: 'scrap-heap', position: plan.at('filtration-beds', 34, 32) },
    { instanceId: 'ww-beds-pipes', objectId: 'pipe-cluster', position: plan.at('filtration-beds', 90, 32) },
    { instanceId: 'ww-beds-puddle', objectId: 'litter-puddle', position: plan.at('filtration-beds', 8, 16) },
    { instanceId: 'ww-beds-papers', objectId: 'litter-papers', position: plan.at('filtration-beds', 100, 1) },
    { instanceId: 'ww-tanks-resin', objectId: 'resin-drum', position: plan.at('settling-tanks', 0, 27) },
    { instanceId: 'ww-tanks-debris', objectId: 'litter-debris', position: plan.at('settling-tanks', 25, 12) },
    { instanceId: 'ww-tanks-puddle', objectId: 'litter-puddle', position: plan.at('settling-tanks', 48, 26) },
    { instanceId: 'ww-outfall-pump', objectId: 'waterworks-outfall-pump', position: plan.at('outfall', 33, 8), facing: 'west' },
    { instanceId: 'ww-outfall-rubble', objectId: 'litter-rubble', position: plan.at('outfall', 1, 52) },
    { instanceId: 'ww-screens-scrap', objectId: 'scrap-heap', position: plan.at('intake-screens', 0, 23) },
    { instanceId: 'ww-screens-conduit', objectId: 'severed-conduit', position: plan.at('intake-screens', 49, 0) },
    { instanceId: 'ww-screens-gravel', objectId: 'litter-gravel', position: plan.at('intake-screens', 46, 2) },
  ];

const residents: CreaturePlacement[] = [
    { instanceId: 'ww-gallery-skimmer-a', creatureId: 'silt-skimmer', position: plan.at('valve-gallery', 3, 3) },
    { instanceId: 'ww-gallery-skimmer-b', creatureId: 'silt-skimmer', position: plan.at('valve-gallery', 22, 25) },
    { instanceId: 'ww-beds-skimmer-a', creatureId: 'silt-skimmer', position: plan.at('filtration-beds', 13, 1) },
    { instanceId: 'ww-beds-skimmer-b', creatureId: 'silt-skimmer', position: plan.at('filtration-beds', 85, 1) },
    { instanceId: 'ww-beds-skimmer-c', creatureId: 'silt-skimmer', position: plan.at('filtration-beds', 44, 12) },
    { instanceId: 'ww-beds-skimmer-d', creatureId: 'silt-skimmer', position: plan.at('filtration-beds', 100, 16) },
    { instanceId: 'ww-beds-skimmer-e', creatureId: 'silt-skimmer', position: plan.at('filtration-beds', 3, 30) },
    { instanceId: 'ww-beds-skimmer-f', creatureId: 'silt-skimmer', position: plan.at('filtration-beds', 79, 30) },
    { instanceId: 'ww-screens-skimmer-a', creatureId: 'silt-skimmer', position: plan.at('intake-screens', 3, 3) },
    { instanceId: 'ww-screens-leech-a', creatureId: 'pipe-leech', position: plan.at('intake-screens', 47, 21) },
    { instanceId: 'ww-screens-leech-b', creatureId: 'pipe-leech', position: plan.at('intake-screens', 1, 20) },
    { instanceId: 'ww-tanks-bloat-a', creatureId: 'sump-bloat', position: plan.at('settling-tanks', 25, 3) },
    { instanceId: 'ww-tanks-bloat-b', creatureId: 'sump-bloat', position: plan.at('settling-tanks', 25, 22) },
    { instanceId: 'ww-tanks-bloat-c', creatureId: 'sump-bloat', position: plan.at('settling-tanks', 1, 12) },
    { instanceId: 'ww-tanks-bloat-d', creatureId: 'sump-bloat', position: plan.at('settling-tanks', 48, 12) },
    { instanceId: 'ww-tanks-bloat-e', creatureId: 'sump-bloat', position: plan.at('settling-tanks', 7, 27) },
    { instanceId: 'ww-outfall-skimmer-a', creatureId: 'silt-skimmer', position: plan.at('outfall', 2, 1) },
    { instanceId: 'ww-outfall-skimmer-b', creatureId: 'silt-skimmer', position: plan.at('outfall', 31, 2) },
    { instanceId: 'ww-outfall-mother', creatureId: 'sump-mother', position: plan.at('outfall', 12, 23) },
  ];

const placed = [...npcs, ...fixtures, ...residents];

const furnishings = scatterGroups(plan, placed, [
  ['valve-gallery', 'ww-valve-node', ['severed-conduit'], 2],
  ['filtration-beds', 'ww-filtration-node', ['severed-conduit', 'scrap-heap'], 4],
  ['intake-screens', 'ww-intake-node', ['scrap-heap'], 3],
  ['outfall', 'ww-outfall-node', ['resin-drum'], 2],
  ['settling-tanks', 'ww-settling-litter', LITTER, 6],
  ['outfall', 'ww-outfall-litter', LITTER, 6],
]);

const packs = scatterPacks(plan, [...placed, ...furnishings], [
  ['filtration-beds', 'ww-skimmer-filtration-pack', 'silt-skimmer', 10],
  ['settling-tanks', 'ww-skimmer-settling-pack', 'silt-skimmer', 5],
  ['intake-screens', 'ww-leech-intake-pack', 'pipe-leech', 4],
  ['valve-gallery', 'ww-leech-valve-pack', 'pipe-leech', 2],
  ['outfall', 'ww-bloat-outfall-pack', 'sump-bloat', 5],
]);

const dressing: Dressing = {
  'filtration-beds': 'wet',
  'valve-gallery': 'wet',
  'pump-house': 'camp',
  'settling-tanks': 'wet',
  'intake-screens': 'wet',
  'outfall': 'wet',
};

export const WATERWORKS: DistrictDefinition = furnish(plan, {
  id: 'waterworks',
  name: 'Meridian Waterworks',
  subtitle: 'Site Meridian — Reclamation and Outflow',
  tier: 3,
  region: 'meridian-core',
  recovery: { districtId: 'waterworks', position: plan.at('pump-house', 3, 6) },
  ambience: { darkness: 0.66, tint: '#071419', fog: '#0a1a20', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: WATERWORKS_ANCHORS,
  areas: [
    plan.area('valve-gallery', 'Valve Gallery'),
    plan.area('pump-house', 'Pump House', { safe: true }),
    plan.area('intake-screens', 'Intake Screens'),
    plan.area('filtration-beds', 'Filtration Beds'),
    plan.area('settling-tanks', 'Settling Tanks'),
    plan.area('outfall', 'The Outfall', { multiCombat: true }),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  creatures: [...residents, ...packs],
  lights: [
    { position: plan.spot('pump-house', 13, 12), radius: 11, color: '#ffcf4d', intensity: 0.55 },
    { position: plan.spot('valve-gallery', 13, 10), radius: 11, color: '#4fd8ff', intensity: 0.45 },
    { position: plan.spot('intake-screens', 25, 12), radius: 9, color: '#c87a3a', intensity: 0.4 },
    { position: plan.spot('filtration-beds', 23, 12), radius: 14, color: '#4fd8ff', intensity: 0.5 },
    { position: plan.spot('filtration-beds', 95, 12), radius: 14, color: '#6ae0c8', intensity: 0.45 },
    { position: plan.spot('settling-tanks', 25, 12), radius: 14, color: '#3ab8a0', intensity: 0.45 },
    { position: plan.spot('outfall', 21, 24), radius: 13, color: '#9a4dff', intensity: 0.55 },
  ],
}, dressing);
