import { drawBlueprint, exit, patch, pillars, room } from '../../world/blueprint.ts';
import type { AssemblyPlacement } from '../../world/assemblies.ts';
import type { DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { CIVIC_PROPS, OFFICE_PROPS, scatterGroups } from './populate.ts';

const plan = drawBlueprint({ width: 60, height: 46 }, [
  room('gatehouse', 1, 1, 58, 44, 'carpet'),
  patch(1, 42, 58, 1, 'hazard'),
  patch(1, 43, 58, 2, 'track'),
  pillars('gatehouse', 9, 9, 6),
  exit('west', 'gatehouse', 'west', 2, { gate: true, floor: 'door' }),
  exit('east', 'gatehouse', 'east', 13),
]);

export const CALDER_GATEHOUSE_ANCHORS = {
  recovery: plan.at('gatehouse', 28, 20),
  liftArrival: plan.at('gatehouse', 55, 4),
  tramPlatform: plan.at('gatehouse', 8, 39),
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [
    { instanceId: 'cg-brandt', npcId: 'warden-brandt', position: plan.at('gatehouse', 25, 3) },
    { instanceId: 'cg-sorrel', npcId: 'quartermaster-sorrel', position: plan.at('gatehouse', 55, 31) },
  ];

const fixtures: ObjectPlacement[] = [
  { instanceId: 'cg-gate-a', objectId: 'calder-gate', position: plan.exits.west?.tiles[0] as TilePoint, facing: 'east' },
  { instanceId: 'cg-gate-b', objectId: 'calder-gate', position: plan.exits.west?.tiles[1] as TilePoint, facing: 'east' },
    { instanceId: 'cg-storage', objectId: 'storage-locker', position: plan.at('gatehouse', 0, 1), facing: 'east' },
    { instanceId: 'cg-mailbox', objectId: 'market-mailbox', position: plan.at('gatehouse', 0, 31), facing: 'east' },
    { instanceId: 'cg-contracts', objectId: 'contract-board', position: plan.at('gatehouse', 10, 0) },
    { instanceId: 'cg-med-bed', objectId: 'med-bed', position: plan.at('gatehouse', 57, 1), facing: 'west' },
    { instanceId: 'cg-lift', objectId: 'calder-lift-down', position: plan.at('gatehouse', 57, 3), facing: 'west' },
    { instanceId: 'cg-tram-stop', objectId: 'tram-stop', position: plan.at('gatehouse', 1, 40), facing: 'east' },
  ];

const assemblies: AssemblyPlacement[] = [
  
    { instanceId: 'cg-tram-car', assemblyId: 'tram-car', position: plan.spot('gatehouse', 3, 42), facing: 'north' },
  ];

const placed = [...npcs, ...fixtures, ...assemblies];

const furnishings = scatterGroups(plan, placed, [
  ['gatehouse', 'cg-prop', OFFICE_PROPS, 14],
  ['gatehouse', 'cg-civic', CIVIC_PROPS, 8],
]);

export const CALDER_GATEHOUSE: DistrictDefinition = {
  id: 'calder-gatehouse',
  name: 'Calder Gatehouse',
  subtitle: 'Site Calder — Outpost',
  tier: 10,
  region: 'calder',
  recovery: { districtId: 'calder-gatehouse', position: plan.at('gatehouse', 28, 20) },
  ambience: { darkness: 0.42, tint: '#1a1410', fog: '#1e1712' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: CALDER_GATEHOUSE_ANCHORS,
  areas: [
    plan.area('gatehouse', 'Calder Gatehouse', { safe: true }),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  assemblies,
  lights: [
    { position: plan.spot('gatehouse', 25, 3), radius: 11, color: '#ffcf4d', intensity: 0.6 },
    { position: plan.spot('gatehouse', 3, 29), radius: 9, color: '#ffd27f', intensity: 0.5 },
    { position: plan.spot('gatehouse', 55, 29), radius: 9, color: '#ff9a6a', intensity: 0.45 },
    { position: plan.spot('gatehouse', 32, 41), radius: 9, color: '#ffd27f', intensity: 0.5 },
  ],
};
