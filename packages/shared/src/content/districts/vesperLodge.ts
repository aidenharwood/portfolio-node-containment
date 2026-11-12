import { install } from '../installations.ts';
import { drawBlueprint, exit, patch, pillars, room, track } from '../../world/blueprint.ts';
import type { AssemblyPlacement } from '../../world/assemblies.ts';
import type { DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { scatterGroups } from './populate.ts';
import { furnish, type Dressing } from './furnish.ts';
import { ambientCast } from '../ambientNpcs.ts';
import { ATRIUM_ANCHORS } from './meridianAtrium.ts';

const plan = drawBlueprint({ width: 60, height: 46 }, [
  room('lodge', 1, 1, 58, 44, 'carpet'),
  pillars('lodge', 9, 9, 6),
  patch(54, 1, 1, 44, 'hazard'),
  track([55, 0], [55, 44]),
  exit('east', 'lodge', 'east', 2, { gate: true, floor: 'door' }),
  exit('west', 'lodge', 'west', 13),
]);

export const VESPER_LODGE_ANCHORS = {
  liftArrival: plan.at('lodge', 2, 4),
  tramPlatform: plan.at('lodge', 50, 12),
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [
    { instanceId: 'vl-ashby', npcId: 'matron-ashby', position: plan.at('lodge', 32, 3) },
    { instanceId: 'vl-lowe', npcId: 'apothecary-lowe', position: plan.at('lodge', 2, 31) },
  ];

const fixtures: ObjectPlacement[] = [
    { instanceId: 'vl-storage', objectId: 'storage-locker', position: plan.at('lodge', 57, 1), facing: 'west' },
    { instanceId: 'vl-mailbox', objectId: 'market-mailbox', position: plan.at('lodge', 57, 31), facing: 'west' },
    { instanceId: 'vl-contracts', objectId: 'contract-board', position: plan.at('lodge', 47, 0) },
    { instanceId: 'vl-tram-stop', objectId: 'tram-stop', position: plan.at('lodge', 52, 16), facing: 'west' },
  ];

const assemblies: AssemblyPlacement[] = [
  install('vl-gate', 'vesper-gate', plan.exits.east?.tiles[0] as TilePoint, 'west'),
  install('vl-lift', 'vesper-lift-down', plan.at('lodge', 0, 3), 'east'),
  
    { instanceId: 'vl-tram-car', assemblyId: 'tram-car', position: plan.spot('lodge', 54, 8), facing: 'east' },
    { instanceId: 'vl-line-bridge', assemblyId: 'bridge', position: plan.spot('lodge', 53, 21), facing: 'east', span: 2 },
  ];

const placed = [...npcs, ...fixtures, ...assemblies];

const furnishings = scatterGroups(plan, placed, [
]);

const dressing: Dressing = {
  'lodge': { theme: 'camp', density: 'dense' },
};

export const VESPER_LODGE: DistrictDefinition = furnish(plan, {
  id: 'vesper-lodge',
  name: 'Porter\'s Lodge',
  subtitle: 'Site Vesper — Outpost',
  tier: 12,
  region: 'vesper',
  recovery: { districtId: 'meridian-atrium', position: ATRIUM_ANCHORS.recovery },
  ambience: { darkness: 0.4, tint: '#101614', fog: '#141a18' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: VESPER_LODGE_ANCHORS,
  areas: [
    plan.area('lodge', 'Porter\'s Lodge', { safe: true }),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  assemblies,
  lights: [
    { position: plan.spot('lodge', 32, 3), radius: 11, color: '#ffe8b8', intensity: 0.6 },
    { position: plan.spot('lodge', 54, 29), radius: 9, color: '#6ad8b8', intensity: 0.5 },
    { position: plan.spot('lodge', 2, 29), radius: 9, color: '#ffe8b8', intensity: 0.45 },
    { position: plan.spot('lodge', 32, 41), radius: 9, color: '#6ad8b8', intensity: 0.5 },
  ],
}, dressing, { cast: ambientCast('porter', 'orderly', 'operative') });
