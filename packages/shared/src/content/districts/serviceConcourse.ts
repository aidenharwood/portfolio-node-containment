import { drawBlueprint, exit, link, patch, pillars, room, track } from '../../world/blueprint.ts';
import type { AssemblyPlacement } from '../../world/assemblies.ts';
import type { DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { ATRIUM_ANCHORS } from './meridianAtrium.ts';
import { INDUSTRIAL_PROPS, LITTER, OFFICE_PROPS, scatterGroups } from './populate.ts';

const plan = drawBlueprint({ width: 100, height: 47 }, [
  room('concourse', 0, 17, 100, 13, 'concrete'),
  room('freight-office', 6, 1, 38, 14, 'plating'),
  room('container-stacks', 56, 1, 38, 14, 'rust'),
  room('drivers-rest', 6, 32, 38, 14, 'carpet'),
  room('salvage-lot', 56, 32, 38, 14, 'rust'),
  link('concourse', 'freight-office', 7, 'concrete'),
  link('concourse', 'container-stacks', 7, 'concrete'),
  link('concourse', 'drivers-rest', 7, 'concrete'),
  link('concourse', 'salvage-lot', 7, 'concrete'),
  patch(46, 17, 8, 1, 'hazard'),
  patch(46, 29, 8, 1, 'hazard'),
  pillars('concourse', 8, 6, 3),
  track([98, 36], [98, 45]),
  exit('west', 'concourse', 'west', 13),
  exit('east', 'concourse', 'east', 13),
]);

export const SERVICE_CONCOURSE_ANCHORS = {
  
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [];

const fixtures: ObjectPlacement[] = [
  
    { instanceId: 'sc-pipes-a', objectId: 'pipe-cluster', position: plan.at('concourse', 16, 0) },
    { instanceId: 'sc-pipes-b', objectId: 'pipe-cluster', position: plan.at('concourse', 96, 12) },
    { instanceId: 'sc-debris', objectId: 'litter-debris', position: plan.at('concourse', 56, 1) },
    { instanceId: 'sc-papers', objectId: 'litter-papers', position: plan.at('concourse', 98, 3) },
    { instanceId: 'sc-puddle', objectId: 'litter-puddle', position: plan.at('concourse', 2, 3) },
    { instanceId: 'sc-rubble', objectId: 'litter-rubble', position: plan.at('concourse', 96, 1) },
  ];

const assemblies: AssemblyPlacement[] = [
  
    { instanceId: 'sc-cable-run', assemblyId: 'cable-run', position: plan.spot('concourse', 1, 2), facing: 'east', span: 9 },
  ];

const placed = [...npcs, ...fixtures, ...assemblies];

const furnishings = scatterGroups(plan, placed, [
  ['concourse', 'sc-prop', INDUSTRIAL_PROPS, 10],
  ['concourse', 'sc-litter', LITTER, 8],
  ['freight-office', 'freight-office-prop', OFFICE_PROPS, 8],
  ['container-stacks', 'container-stacks-prop', ['storage-rack', 'pipe-cluster', 'wall-locker'], 10],
  ['drivers-rest', 'drivers-rest-prop', ['briefing-bench', 'water-cooler', 'wall-locker', 'planter'], 8],
  ['salvage-lot', 'salvage-lot-prop', ['pipe-cluster', 'litter-rubble', 'storage-rack'], 10],
]);

export const SERVICE_CONCOURSE: DistrictDefinition = {
  id: 'service-concourse',
  name: 'Service Concourse',
  subtitle: 'Site Meridian — East Transit Corridor',
  tier: 1,
  region: 'meridian-core',
  recovery: { districtId: 'meridian-atrium', position: ATRIUM_ANCHORS.recovery },
  ambience: { darkness: 0.52, tint: '#16110a', fog: '#1a140c' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: SERVICE_CONCOURSE_ANCHORS,
  areas: [
    plan.area('concourse', 'Service Concourse'),
    plan.area('freight-office', 'Freight Office'),
    plan.area('container-stacks', 'Container Stacks'),
    plan.area('drivers-rest', 'Drivers\' Rest'),
    plan.area('salvage-lot', 'Salvage Lot'),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  assemblies,
  lights: [
    { position: plan.center('freight-office'), radius: 9, color: '#ffd27f', intensity: 0.5 },
    { position: plan.center('container-stacks'), radius: 9, color: '#ffb347', intensity: 0.5 },
    { position: plan.center('drivers-rest'), radius: 9, color: '#ffcf4d', intensity: 0.5 },
    { position: plan.center('salvage-lot'), radius: 9, color: '#ff8a4d', intensity: 0.5 },
    { position: plan.spot('concourse', 3, 2), radius: 9, color: '#ffb347', intensity: 0.45 },
    { position: plan.spot('concourse', 96, 2), radius: 9, color: '#ffd27f', intensity: 0.45 },
  ],
};
