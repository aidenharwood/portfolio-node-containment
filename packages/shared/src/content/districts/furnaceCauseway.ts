import { drawBlueprint, exit, patch, pillars, room } from '../../world/blueprint.ts';
import type { AssemblyPlacement } from '../../world/assemblies.ts';
import type { DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { DEEPWATCH_ANCHORS } from './deepwatch.ts';
import { INDUSTRIAL_PROPS, LITTER, scatterGroups } from './populate.ts';
import { furnish, type Dressing } from './furnish.ts';
import { ambientCast } from '../ambientNpcs.ts';

const plan = drawBlueprint({ width: 41, height: 70 }, [
  room('furnace-approach', 14, 1, 13, 25, 'grate'),
  room('ember-landing', 1, 26, 39, 18, 'rust'),
  room('causeway', 14, 44, 13, 25, 'grate'),
  patch(14, 54, 13, 3, 'coolant'),
  patch(5, 31, 6, 6, 'coolant'),
  patch(30, 31, 6, 6, 'coolant'),
  pillars('furnace-approach', 8, 6, 4),
  pillars('ember-landing', 9, 6, 4),
  exit('south', 'causeway', 'south', 13),
  exit('north', 'furnace-approach', 'north', 2, { offset: 5, gate: true }),
]);

export const FURNACE_CAUSEWAY_ANCHORS = {
  furnaceGate: plan.at('furnace-approach', 6, 0),
  landing: plan.at('ember-landing', 19, 4),
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [];

const fixtures: ObjectPlacement[] = [
  { instanceId: 'fc-furnace-sign', objectId: 'warning-sign', position: plan.at('furnace-approach', 2, 0) },
  { instanceId: 'fc-ember-brazier', objectId: 'light-pillar', position: plan.at('ember-landing', 19, 9) },
    { instanceId: 'fc-pipes-a', objectId: 'pipe-cluster', position: plan.at('causeway', 4, 0) },
    { instanceId: 'fc-pipes-b', objectId: 'pipe-cluster', position: plan.at('causeway', 8, 24) },
    { instanceId: 'fc-debris', objectId: 'litter-debris', position: plan.at('causeway', 5, 2) },
    { instanceId: 'fc-puddle', objectId: 'litter-puddle', position: plan.at('causeway', 7, 1) },
    { instanceId: 'fc-rubble', objectId: 'litter-rubble', position: plan.at('causeway', 8, 0) },
    { instanceId: 'fc-gravel', objectId: 'litter-gravel', position: plan.at('causeway', 3, 3) },
  ];

const assemblies: AssemblyPlacement[] = [
  { instanceId: 'fc-bridge-north', assemblyId: 'bridge', position: plan.spot('causeway', 2, 9), facing: 'south', span: 3 },
  { instanceId: 'fc-bridge-south', assemblyId: 'bridge', position: plan.spot('causeway', 9, 9), facing: 'south', span: 3 },
  { instanceId: 'fc-cable-run', assemblyId: 'cable-run', position: plan.spot('furnace-approach', 9, 2), facing: 'south', span: 14 },];

const placed = [...npcs, ...fixtures, ...assemblies];

const furnishings = scatterGroups(plan, placed, [
  ['ember-landing', 'fc-landing-prop', INDUSTRIAL_PROPS, 6],
  ['ember-landing', 'fc-landing-litter', LITTER, 6],
  ['furnace-approach', 'fc-approach-litter', LITTER, 4],
]);

const dressing: Dressing = {
  'furnace-approach': 'industrial',
  'ember-landing': 'camp',
  'causeway': { theme: 'industrial', density: 'sparse' },
};

export const FURNACE_CAUSEWAY: DistrictDefinition = furnish(plan, {
  id: 'furnace-causeway',
  name: 'Furnace Causeway',
  subtitle: 'The Deep — Reactor Approach',
  tier: 4,
  region: 'meridian-core',
  recovery: { districtId: 'deepwatch', position: DEEPWATCH_ANCHORS.recovery },
  ambience: { darkness: 0.62, tint: '#1a0a04', fog: '#200c06', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: FURNACE_CAUSEWAY_ANCHORS,
  areas: [
    plan.area('causeway', 'Furnace Causeway'),
    plan.area('furnace-approach', 'Furnace Approach'),
    plan.area('ember-landing', 'Ember Landing', { safe: true }),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  assemblies,
  lights: [
    { position: plan.center('ember-landing'), radius: 12, color: '#ff7a2f', intensity: 0.5 },
    { position: plan.center('furnace-approach'), radius: 9, color: '#ff7a2f', intensity: 0.5 },
    { position: plan.spot('causeway', 3, 2), radius: 6, color: '#ff9a4d', intensity: 0.45 },
    { position: plan.spot('causeway', 6, 2), radius: 6, color: '#4fd8ff', intensity: 0.5 },
    { position: plan.spot('causeway', 8, 2), radius: 7, color: '#ff7a2a', intensity: 0.55 },
  ],
}, dressing, { cast: ambientCast('deckhand', 'researcher', 'operative', 'technician') });
