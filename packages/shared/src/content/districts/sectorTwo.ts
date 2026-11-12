import { drawBlueprint, exit, link, patch, pillars, room } from '../../world/blueprint.ts';
import type { CreaturePlacement, DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { ATRIUM_ANCHORS } from './meridianAtrium.ts';
import { LITTER, scatterGroups, scatterPacks } from './populate.ts';
import { furnish, type Dressing } from './furnish.ts';

const plan = drawBlueprint({ width: 112, height: 74 }, [
  room('research-lab', 6, 1, 36, 24, 'carpet'),
  room('observation-gallery', 44, 1, 16, 24, 'grate'),
  room('inner-chamber', 62, 1, 44, 24, 'concrete'),
  room('corridor', 6, 27, 100, 22, 'plating'),
  room('storage', 6, 51, 38, 22, 'concrete'),
  room('airlock', 49, 60, 14, 13, 'grate'),
  room('isolation-ward', 68, 51, 38, 22, 'plating'),
  patch(30, 33, 6, 2, 'coolant'),
  patch(84, 36, 3, 3, 'coolant'),
  patch(50, 37, 12, 1, 'hazard'),
  patch(70, 8, 7, 7, 'glass'),
  patch(71, 9, 5, 5, 'coolant'),
  patch(90, 8, 7, 7, 'glass'),
  patch(91, 9, 5, 5, 'coolant'),
  link('airlock', 'corridor', 4, 'grate'),
  link('research-lab', 'corridor', 3),
  link('observation-gallery', 'corridor', 3),
  link('inner-chamber', 'corridor', 3),
  link('research-lab', 'observation-gallery', 3),
  link('observation-gallery', 'inner-chamber', 3),
  link('storage', 'corridor', 3),
  link('isolation-ward', 'corridor', 3),
  pillars('corridor', 10, 8, 4),
  exit('south', 'airlock', 'south', 2, { gate: true, floor: 'door' }),
]);

export const SECTOR_TWO_ANCHORS = {
  
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [];

const fixtures: ObjectPlacement[] = [
  
    { instanceId: 's2-airlock-sign', objectId: 'warning-sign', position: plan.at('airlock', 12, 0) },
    { instanceId: 's2-corridor-sign', objectId: 'warning-sign', position: plan.at('corridor', 35, 0) },
    { instanceId: 's2-lab-terminal', objectId: 'halvorsen-terminal', position: plan.at('research-lab', 14, 0) },
    { instanceId: 's2-lab-rack-a', objectId: 'server-rack', position: plan.at('research-lab', 0, 0) },
    { instanceId: 's2-lab-rack-b', objectId: 'server-rack', position: plan.at('research-lab', 1, 0) },
    { instanceId: 's2-lab-bench', objectId: 'briefing-bench', position: plan.at('research-lab', 3, 21) },
    { instanceId: 's2-lab-crate-a', objectId: 'supply-crate', position: plan.at('research-lab', 34, 22) },
    { instanceId: 's2-lab-crate-b', objectId: 'supply-crate', position: plan.at('research-lab', 33, 23) },
    { instanceId: 's2-sector-three-door', objectId: 'sector-three-door', position: plan.at('inner-chamber', 22, 0) },
    { instanceId: 's2-chamber-sign', objectId: 'warning-sign', position: plan.at('inner-chamber', 1, 0) },
    { instanceId: 's2-nest-a', objectId: 'gloam-nest', position: plan.at('storage', 36, 20) },
    { instanceId: 's2-nest-b', objectId: 'gloam-nest', position: plan.at('storage', 0, 0) },
    { instanceId: 's2-storage-crate-a', objectId: 'supply-crate', position: plan.at('storage', 2, 21) },
    { instanceId: 's2-storage-crate-b', objectId: 'supply-crate', position: plan.at('storage', 37, 1) },
    { instanceId: 's2-ward-bench-a', objectId: 'briefing-bench', position: plan.at('isolation-ward', 2, 20) },
    { instanceId: 's2-ward-bench-b', objectId: 'briefing-bench', position: plan.at('isolation-ward', 34, 20) },
    { instanceId: 's2-conduit-a', objectId: 'severed-conduit', position: plan.at('corridor', 3, 0) },
    { instanceId: 's2-conduit-b', objectId: 'severed-conduit', position: plan.at('corridor', 60, 0) },
    { instanceId: 's2-conduit-c', objectId: 'severed-conduit', position: plan.at('corridor', 99, 21) },
    { instanceId: 's2-bloom-a', objectId: 'spore-bloom', position: plan.at('storage', 35, 21) },
    { instanceId: 's2-bloom-b', objectId: 'spore-bloom', position: plan.at('isolation-ward', 37, 0) },
    { instanceId: 's2-bloom-c', objectId: 'spore-bloom', position: plan.at('research-lab', 35, 0) },
    { instanceId: 's2-scrap', objectId: 'scrap-heap', position: plan.at('airlock', 13, 12) },
  ];

const residents: CreaturePlacement[] = [
    { instanceId: 's2-mite-corridor-a', creatureId: 'gloam-mite', position: plan.at('corridor', 23, 1) },
    { instanceId: 's2-mite-corridor-b', creatureId: 'gloam-mite', position: plan.at('corridor', 35, 3) },
    { instanceId: 's2-mite-corridor-c', creatureId: 'gloam-mite', position: plan.at('corridor', 68, 2) },
    { instanceId: 's2-mite-corridor-d', creatureId: 'gloam-mite', position: plan.at('corridor', 80, 0) },
    { instanceId: 's2-mite-corridor-e', creatureId: 'gloam-mite', position: plan.at('corridor', 97, 3) },
    { instanceId: 's2-mite-storage-a', creatureId: 'gloam-mite', position: plan.at('storage', 3, 2) },
    { instanceId: 's2-mite-storage-b', creatureId: 'gloam-mite', position: plan.at('storage', 34, 3) },
    { instanceId: 's2-mite-lab', creatureId: 'gloam-mite', position: plan.at('research-lab', 32, 3) },
    { instanceId: 's2-warden', creatureId: 'hollow-warden', position: plan.at('inner-chamber', 22, 22) },
    { instanceId: 's2-wraith-a', creatureId: 'static-wraith', position: plan.at('isolation-ward', 11, 2) },
    { instanceId: 's2-wraith-b', creatureId: 'static-wraith', position: plan.at('isolation-ward', 35, 20) },
  ];

const placed = [...npcs, ...fixtures, ...residents];

const furnishings = scatterGroups(plan, placed, [
  ['corridor', 's2-corridor-node', ['severed-conduit'], 3],
  ['storage', 's2-storage-node', ['spore-bloom'], 3],
  ['isolation-ward', 's2-ward-node', ['scrap-heap'], 2],
  ['corridor', 's2-corridor-litter', LITTER, 10],
]);

const packs = scatterPacks(plan, [...placed, ...furnishings], [
  ['corridor', 's2-mite-corridor-pack', 'gloam-mite', 8],
  ['storage', 's2-mite-storage-pack', 'gloam-mite', 4],
  ['isolation-ward', 's2-mite-ward-pack', 'gloam-mite', 3],
  ['observation-gallery', 's2-mite-gallery-pack', 'gloam-mite', 2],
  ['research-lab', 's2-wraith-lab-pack', 'static-wraith', 2],
  ['inner-chamber', 's2-wraith-chamber-pack', 'static-wraith', 2],
]);

const dressing: Dressing = {
  'research-lab': 'lab',
  'observation-gallery': 'lab',
  'inner-chamber': { theme: 'lab', density: 'sparse' },
  'corridor': 'lab',
  'storage': 'freight',
  'airlock': { theme: 'works', density: 'sparse' },
  'isolation-ward': 'medical',
};

export const SECTOR_TWO: DistrictDefinition = furnish(plan, {
  id: 'sector-two',
  name: 'Sector 2',
  subtitle: 'Quarantine — Do Not Enter',
  tier: 2,
  condition: 'breached',
  region: 'meridian-core',
  deadEnd: true,
  recovery: { districtId: 'meridian-atrium', position: ATRIUM_ANCHORS.recovery },
  ambience: { darkness: 0.74, tint: '#160709', fog: '#12090b', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: SECTOR_TWO_ANCHORS,
  areas: [
    plan.area('airlock', 'Quarantine Airlock'),
    plan.area('corridor', 'Breach Corridor'),
    plan.area('research-lab', 'Halvorsen\'s Lab'),
    plan.area('inner-chamber', 'Inner Chamber', { multiCombat: true }),
    plan.area('storage', 'Infested Storage'),
    plan.area('isolation-ward', 'Isolation Ward'),
    plan.area('observation-gallery', 'Observation Gallery'),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  creatures: [...residents, ...packs],
  lights: [
    { position: plan.center('observation-gallery'), radius: 9, color: '#ff4d4d', intensity: 0.5 },
    { position: plan.spot('airlock', 3, 2), radius: 7, color: '#ff6a4d', intensity: 0.6 },
    { position: plan.spot('corridor', 19, 2), radius: 9, color: '#ff4d4d', intensity: 0.5 },
    { position: plan.spot('corridor', 76, 2), radius: 9, color: '#ff4d4d', intensity: 0.5 },
    { position: plan.spot('research-lab', 15, 3), radius: 9, color: '#9fd8ff', intensity: 0.45 },
    { position: plan.spot('inner-chamber', 22, 3), radius: 9, color: '#c79bff', intensity: 0.55 },
    { position: plan.spot('storage', 19, 2), radius: 7, color: '#7a3cff', intensity: 0.45 },
    { position: plan.spot('isolation-ward', 19, 2), radius: 7, color: '#c8f6ff', intensity: 0.4 },
  ],
}, dressing);
