import type { AssemblyPlacement } from '../../world/assemblies.ts';
import { drawBlueprint, exit, hollow, link, patch, pillars, room, track } from '../../world/blueprint.ts';
import type { DistrictDefinition, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { ATRIUM_ANCHORS } from './meridianAtrium.ts';
import { CIVIC_PROPS, INDUSTRIAL_PROPS, LITTER, OFFICE_PROPS, scatterGroups } from './populate.ts';

export const CIRCUIT_HOLLOW_FOR_ATRIUM: TilePoint = { x: 39, y: 88 };

const plan = drawBlueprint({ width: 204, height: 206 }, [
  room('north-boulevard', 26, 1, 152, 13, 'plating'),
  room('south-boulevard', 26, 192, 152, 13, 'plating'),
  room('west-boulevard', 26, 14, 13, 178, 'plating'),
  room('east-boulevard', 165, 14, 13, 178, 'plating'),
  room('signal-court', 14, 1, 25, 25, 'concrete'),
  room('pump-court', 165, 1, 25, 25, 'concrete'),
  room('lantern-court', 14, 180, 25, 25, 'concrete'),
  room('ledger-court', 165, 180, 25, 25, 'concrete'),
  room('west-dormitory', 1, 28, 24, 40, 'carpet'),
  room('canteen', 1, 70, 24, 40, 'plating'),
  room('west-stores', 1, 112, 24, 24, 'concrete'),
  room('reading-room', 1, 160, 24, 18, 'carpet'),
  room('east-barracks', 179, 28, 24, 40, 'carpet'),
  room('mess-hall', 179, 70, 24, 40, 'plating'),
  room('east-stores', 179, 112, 24, 24, 'concrete'),
  room('duty-office', 179, 160, 24, 18, 'carpet'),
  hollow(CIRCUIT_HOLLOW_FOR_ATRIUM.x, CIRCUIT_HOLLOW_FOR_ATRIUM.y, 126, 104),
  hollow(51, 14, 102, 74),
  link('west-boulevard', 'west-dormitory', 7, 'plating'),
  link('west-boulevard', 'canteen', 7, 'plating'),
  link('west-boulevard', 'west-stores', 7, 'plating'),
  link('west-boulevard', 'reading-room', 5, 'plating'),
  link('east-boulevard', 'east-barracks', 7, 'plating'),
  link('east-boulevard', 'mess-hall', 7, 'plating'),
  link('east-boulevard', 'east-stores', 7, 'plating'),
  link('east-boulevard', 'duty-office', 5, 'plating'),
  link('west-dormitory', 'canteen', 3),
  link('canteen', 'west-stores', 3),
  link('east-barracks', 'mess-hall', 3),
  link('mess-hall', 'east-stores', 3),
  patch(26, 205, 152, 1, 'glass'),
  track([0, 189], [37, 189]),
  track([165, 189], [202, 189]),
  pillars('north-boulevard', 8, 6, 3),
  pillars('south-boulevard', 8, 6, 3),
  pillars('west-boulevard', 6, 8, 3),
  pillars('east-boulevard', 6, 8, 3),
  exit('west', 'west-boulevard', 'west', 13, { offset: 129 }),
  exit('east', 'east-boulevard', 'east', 13, { offset: 129 }),
]);

const landmarks: ObjectPlacement[] = [
  { instanceId: 'circuit-signal-mast', objectId: 'relay-dish', position: plan.at('signal-court', 12, 12) },
  { instanceId: 'circuit-pump-works', objectId: 'pump-housing', position: plan.at('pump-court', 12, 12) },
  { instanceId: 'circuit-lantern-a', objectId: 'light-pillar', position: plan.at('lantern-court', 11, 11) },
  { instanceId: 'circuit-lantern-b', objectId: 'light-pillar', position: plan.at('lantern-court', 13, 11) },
  { instanceId: 'circuit-lantern-c', objectId: 'light-pillar', position: plan.at('lantern-court', 11, 13) },
  { instanceId: 'circuit-lantern-d', objectId: 'light-pillar', position: plan.at('lantern-court', 13, 13) },
  { instanceId: 'circuit-ledger-a', objectId: 'server-rack', position: plan.at('ledger-court', 11, 12) },
  { instanceId: 'circuit-ledger-b', objectId: 'server-rack', position: plan.at('ledger-court', 12, 12) },
  { instanceId: 'circuit-ledger-c', objectId: 'server-rack', position: plan.at('ledger-court', 13, 12) },
  { instanceId: 'circuit-tallow-seal-a', objectId: 'warning-sign', position: plan.at('north-boulevard', 74, 0) },
  { instanceId: 'circuit-tallow-seal-b', objectId: 'warning-sign', position: plan.at('north-boulevard', 77, 0) },
  { instanceId: 'circuit-chasm-rail-sign', objectId: 'warning-sign', position: plan.at('south-boulevard', 76, 12) },
];

const LINE_BRIDGE_COLUMNS = [3, 7, 17, 21];

const assemblies: AssemblyPlacement[] = ['lantern-court', 'ledger-court'].flatMap((court) =>
  LINE_BRIDGE_COLUMNS.map((dx, index) => ({ instanceId: `${court}-line-bridge-${index + 1}`, assemblyId: 'bridge', position: plan.spot(court, dx, 8), span: 2 })),
);

const furnishings = scatterGroups(plan, landmarks, [
  ['north-boulevard', 'circuit-north-prop', CIVIC_PROPS, 12],
  ['south-boulevard', 'circuit-south-prop', CIVIC_PROPS, 12],
  ['west-boulevard', 'circuit-west-prop', CIVIC_PROPS, 12],
  ['east-boulevard', 'circuit-east-prop', CIVIC_PROPS, 12],
  ['north-boulevard', 'circuit-north-litter', LITTER, 10],
  ['south-boulevard', 'circuit-south-litter', LITTER, 10],
  ['west-boulevard', 'circuit-west-litter', LITTER, 10],
  ['east-boulevard', 'circuit-east-litter', LITTER, 10],
  ['signal-court', 'signal-court-prop', CIVIC_PROPS, 6],
  ['pump-court', 'pump-court-prop', INDUSTRIAL_PROPS, 6],
  ['lantern-court', 'lantern-court-prop', CIVIC_PROPS, 6],
  ['ledger-court', 'ledger-court-prop', OFFICE_PROPS, 6],
  ['west-dormitory', 'west-dormitory-prop', ['briefing-bench', 'wall-locker', 'planter', 'water-cooler'], 16],
  ['canteen', 'canteen-prop', ['office-desk', 'briefing-bench', 'water-cooler', 'planter'], 16],
  ['west-stores', 'west-stores-prop', INDUSTRIAL_PROPS, 10],
  ['reading-room', 'reading-room-prop', ['office-desk', 'filing-cabinet', 'planter'], 8],
  ['east-barracks', 'east-barracks-prop', ['briefing-bench', 'wall-locker', 'planter', 'water-cooler'], 16],
  ['mess-hall', 'mess-hall-prop', ['office-desk', 'briefing-bench', 'water-cooler', 'planter'], 16],
  ['east-stores', 'east-stores-prop', INDUSTRIAL_PROPS, 10],
  ['duty-office', 'duty-office-prop', OFFICE_PROPS, 8],
]);

export const MERIDIAN_CIRCUIT: DistrictDefinition = {
  id: 'meridian-circuit',
  name: 'The Circuit',
  subtitle: 'Site Meridian — Ring Boulevard',
  tier: 1,
  region: 'meridian-core',
  recovery: { districtId: 'meridian-atrium', position: ATRIUM_ANCHORS.recovery },
  ambience: { darkness: 0.42, tint: '#0a151c', fog: '#0c1a24' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  areas: [
    plan.area('north-boulevard', 'Quarantine Row'),
    plan.area('south-boulevard', 'Chasm Promenade'),
    plan.area('west-boulevard', 'Verdance Walk'),
    plan.area('east-boulevard', 'Service Walk'),
    plan.area('signal-court', 'Signal Court'),
    plan.area('pump-court', 'Pump Court'),
    plan.area('lantern-court', 'Lantern Court'),
    plan.area('ledger-court', 'Ledger Court'),
    plan.area('west-dormitory', 'West Dormitory'),
    plan.area('canteen', 'Staff Canteen'),
    plan.area('west-stores', 'West Stores'),
    plan.area('reading-room', 'Reading Room'),
    plan.area('east-barracks', 'Response Barracks'),
    plan.area('mess-hall', 'Mess Hall'),
    plan.area('east-stores', 'East Stores'),
    plan.area('duty-office', 'Duty Office'),
  ],
  npcs: [],
  objects: [...landmarks, ...furnishings],
  assemblies,
  lights: [
    { position: plan.center('signal-court'), radius: 10, color: '#9fd8ff', intensity: 0.6 },
    { position: plan.center('pump-court'), radius: 10, color: '#ffb347', intensity: 0.6 },
    { position: plan.center('lantern-court'), radius: 10, color: '#ffcf4d', intensity: 0.6 },
    { position: plan.center('ledger-court'), radius: 10, color: '#7cf29a', intensity: 0.6 },
    { position: plan.center('north-boulevard'), radius: 9, color: '#ff4d4d', intensity: 0.45 },
    { position: plan.center('south-boulevard'), radius: 9, color: '#9fd8ff', intensity: 0.45 },
    { position: plan.center('west-boulevard'), radius: 9, color: '#7cf29a', intensity: 0.45 },
    { position: plan.center('east-boulevard'), radius: 9, color: '#ffd27f', intensity: 0.45 },
  ],
};
