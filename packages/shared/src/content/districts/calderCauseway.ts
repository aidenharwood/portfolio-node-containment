import type { AssemblyPlacement } from '../../world/assemblies.ts';
import { drawBlueprint, exit, link, patch, pillars, room, track } from '../../world/blueprint.ts';
import type { DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { WATERWORKS_ANCHORS } from './waterworks.ts';
import { LITTER, scatterGroups } from './populate.ts';
import { furnish, type Dressing } from './furnish.ts';

const plan = drawBlueprint({ width: 67, height: 70 }, [
  room('causeway', 0, 1, 66, 13, 'concrete'),
  room('salt-road', 53, 14, 13, 56, 'concrete'),
  room('weighbridge', 6, 20, 40, 30, 'rust'),
  link('causeway', 'weighbridge', 7, 'concrete'),
  link('weighbridge', 'salt-road', 5, 'concrete'),
  patch(16, 30, 20, 1, 'hazard'),
  patch(16, 40, 20, 1, 'hazard'),
  pillars('causeway', 8, 6, 3),
  track([0, 52], [65, 52]),
  exit('west', 'causeway', 'west', 13),
  exit('south', 'salt-road', 'south', 13),
]);

export const CALDER_CAUSEWAY_ANCHORS = {
  
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [];

const fixtures: ObjectPlacement[] = [
  
    { instanceId: 'cc-sign', objectId: 'warning-sign', position: plan.at('causeway', 2, 0) },
    { instanceId: 'cc-pipes-a', objectId: 'pipe-cluster', position: plan.at('causeway', 19, 0) },
    { instanceId: 'cc-pipes-b', objectId: 'pipe-cluster', position: plan.at('causeway', 50, 12) },
    { instanceId: 'cc-puddle', objectId: 'litter-puddle', position: plan.at('causeway', 28, 2) },
    { instanceId: 'cc-rubble', objectId: 'litter-rubble', position: plan.at('causeway', 59, 1) },
    { instanceId: 'cc-gravel', objectId: 'litter-gravel', position: plan.at('causeway', 9, 3) },
  ];

const assemblies: AssemblyPlacement[] = [1, 4, 7, 10].map((dx, index) => ({
  instanceId: `cc-line-bridge-${index + 1}`,
  assemblyId: 'bridge',
  position: plan.spot('salt-road', dx, 37),
  facing: 'south',
  span: 2,
}));

const placed = [...npcs, ...fixtures];

const furnishings = scatterGroups(plan, placed, [
  ['causeway', 'cc-litter', LITTER, 6],
  ['salt-road', 'cc-road-litter', LITTER, 8],
]);

const dressing: Dressing = {
  'causeway': 'mine',
  'salt-road': 'mine',
  'weighbridge': 'mine',
};

export const CALDER_CAUSEWAY: DistrictDefinition = furnish(plan, {
  id: 'calder-causeway',
  name: 'Calder Causeway',
  subtitle: 'Calder Wing — Sealed Salt Road',
  tier: 10,
  region: 'calder',
  recovery: { districtId: 'waterworks', position: WATERWORKS_ANCHORS.recovery },
  ambience: { darkness: 0.62, tint: '#1a1210', fog: '#20160f', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: CALDER_CAUSEWAY_ANCHORS,
  areas: [
    plan.area('causeway', 'Calder Causeway'),
    plan.area('salt-road', 'Salt Road'),
    plan.area('weighbridge', 'Weighbridge', { safe: true }),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  assemblies,
  lights: [
    { position: plan.center('salt-road'), radius: 9, color: '#ffd27f', intensity: 0.5 },
    { position: plan.center('weighbridge'), radius: 9, color: '#ffb347', intensity: 0.5 },
    { position: plan.spot('causeway', 6, 2), radius: 9, color: '#ff9a6a', intensity: 0.4 },
    { position: plan.spot('causeway', 34, 2), radius: 9, color: '#ffd27f', intensity: 0.35 },
    { position: plan.spot('causeway', 62, 2), radius: 9, color: '#ff9a6a', intensity: 0.45 },
  ],
}, dressing);
