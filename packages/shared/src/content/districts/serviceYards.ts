import { drawBlueprint, exit, link, patch, pillars, room } from '../../world/blueprint.ts';
import type { AssemblyPlacement } from '../../world/assemblies.ts';
import type { CreaturePlacement, DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { ATRIUM_ANCHORS } from './meridianAtrium.ts';
import { LITTER, scatterGroups, scatterPacks } from './populate.ts';
import { furnish, type Dressing } from './furnish.ts';

const plan = drawBlueprint({ width: 124, height: 88 }, [
  room('loading-dock', 1, 1, 28, 25, 'rust'),
  room('cold-store', 1, 28, 28, 28, 'concrete'),
  room('yard-office', 1, 58, 28, 29, 'plating'),
  room('scrap-yard', 31, 1, 60, 40, 'rust'),
  room('culverts', 93, 1, 30, 40, 'soil'),
  room('laundry', 31, 43, 44, 41, 'concrete'),
  room('gantry-yard', 77, 43, 46, 41, 'concrete'),
  patch(1, 84, 28, 1, 'hazard'),
  patch(0, 85, 124, 2, 'track'),
  patch(107, 1, 3, 40, 'coolant'),
  patch(77, 62, 46, 1, 'hazard'),
  link('cold-store', 'loading-dock', 3),
  link('yard-office', 'cold-store', 3),
  link('cold-store', 'laundry', 3),
  link('cold-store', 'scrap-yard', 5, 'concrete'),
  link('yard-office', 'laundry', 3),
  link('loading-dock', 'scrap-yard', 5, 'rust'),
  link('scrap-yard', 'culverts', 7, 'rust'),
  link('scrap-yard', 'laundry', 7, 'concrete'),
  link('scrap-yard', 'gantry-yard', 7, 'concrete'),
  link('laundry', 'gantry-yard', 9, 'concrete'),
  link('gantry-yard', 'culverts', 9, 'concrete'),
  pillars('gantry-yard', 9, 9, 5),
  exit('west', 'yard-office', 'west', 13),
  exit('north', 'culverts', 'north', 13, { offset: 0 }),
]);

export const SERVICE_YARDS_ANCHORS = {
  tramPlatform: plan.at('yard-office', 6, 22),
} satisfies Record<string, TilePoint>;

const npcs: NpcPlacement[] = [
    { instanceId: 'yards-quill', npcId: 'yardmaster-quill', position: plan.at('yard-office', 25, 8) },
  ];

const fixtures: ObjectPlacement[] = [
  
    { instanceId: 'yd-dock-scrap-a', objectId: 'scrap-heap', position: plan.at('loading-dock', 1, 1) },
    { instanceId: 'yd-dock-scrap-b', objectId: 'scrap-heap', position: plan.at('loading-dock', 25, 1) },
    { instanceId: 'yd-dock-crate', objectId: 'supply-crate', position: plan.at('loading-dock', 0, 24) },
    { instanceId: 'yd-dock-debris', objectId: 'litter-debris', position: plan.at('loading-dock', 14, 3) },
    { instanceId: 'yards-tram-stop', objectId: 'tram-stop', position: plan.at('yard-office', 1, 19), facing: 'east' },
    { instanceId: 'yards-storage', objectId: 'storage-locker', position: plan.at('yard-office', 27, 1), facing: 'west' },
    { instanceId: 'yards-kiosk', objectId: 'intake-kiosk', position: plan.at('yard-office', 0, 1), facing: 'east' },
    { instanceId: 'yards-bench', objectId: 'briefing-bench', position: plan.at('yard-office', 25, 1) },
    { instanceId: 'yards-office-papers', objectId: 'litter-papers', position: plan.at('yard-office', 3, 2) },
    { instanceId: 'yards-office-sign', objectId: 'warning-sign', position: plan.at('yard-office', 27, 3), facing: 'west' },
    { instanceId: 'yd-scrap-a', objectId: 'scrap-heap', position: plan.at('scrap-yard', 3, 2) },
    { instanceId: 'yd-scrap-b', objectId: 'scrap-heap', position: plan.at('scrap-yard', 20, 1) },
    { instanceId: 'yd-scrap-c', objectId: 'scrap-heap', position: plan.at('scrap-yard', 42, 3) },
    { instanceId: 'yd-scrap-d', objectId: 'scrap-heap', position: plan.at('scrap-yard', 57, 22) },
    { instanceId: 'yd-scrap-e', objectId: 'scrap-heap', position: plan.at('scrap-yard', 28, 31) },
    { instanceId: 'yd-scrap-crate-a', objectId: 'supply-crate', position: plan.at('scrap-yard', 59, 0) },
    { instanceId: 'yd-scrap-crate-b', objectId: 'supply-crate', position: plan.at('scrap-yard', 58, 0) },
    { instanceId: 'yd-scrap-crate-c', objectId: 'supply-crate', position: plan.at('scrap-yard', 59, 39) },
    { instanceId: 'yd-scrap-debris-a', objectId: 'litter-debris', position: plan.at('scrap-yard', 9, 27) },
    { instanceId: 'yd-scrap-debris-b', objectId: 'litter-debris', position: plan.at('scrap-yard', 39, 22) },
    { instanceId: 'yd-scrap-debris-c', objectId: 'litter-debris', position: plan.at('scrap-yard', 56, 2) },
    { instanceId: 'yd-scrap-puddle', objectId: 'litter-puddle', position: plan.at('scrap-yard', 25, 12) },
    { instanceId: 'yd-cold-resin-a', objectId: 'resin-drum', position: plan.at('cold-store', 1, 1) },
    { instanceId: 'yd-cold-resin-b', objectId: 'resin-drum', position: plan.at('cold-store', 1, 24) },
    { instanceId: 'yd-cold-crate-a', objectId: 'supply-crate', position: plan.at('cold-store', 26, 1) },
    { instanceId: 'yd-cold-crate-b', objectId: 'supply-crate', position: plan.at('cold-store', 26, 24) },
    { instanceId: 'yd-cold-puddle', objectId: 'litter-puddle', position: plan.at('cold-store', 8, 1) },
    { instanceId: 'yd-laundry-bin-a', objectId: 'textile-bin', position: plan.at('laundry', 1, 1) },
    { instanceId: 'yd-laundry-bin-b', objectId: 'textile-bin', position: plan.at('laundry', 15, 1) },
    { instanceId: 'yd-laundry-bin-c', objectId: 'textile-bin', position: plan.at('laundry', 40, 1) },
    { instanceId: 'yd-laundry-bin-d', objectId: 'textile-bin', position: plan.at('laundry', 42, 39) },
    { instanceId: 'yd-laundry-papers-a', objectId: 'litter-papers', position: plan.at('laundry', 28, 9) },
    { instanceId: 'yd-laundry-papers-b', objectId: 'litter-papers', position: plan.at('laundry', 2, 38) },
    { instanceId: 'yd-moss-a', objectId: 'moss-bed', position: plan.at('culverts', 1, 1) },
    { instanceId: 'yd-moss-b', objectId: 'moss-bed', position: plan.at('culverts', 3, 38) },
    { instanceId: 'yd-moss-c', objectId: 'moss-bed', position: plan.at('culverts', 28, 1) },
    { instanceId: 'yd-moss-d', objectId: 'moss-bed', position: plan.at('culverts', 28, 38) },
    { instanceId: 'yd-culvert-resin', objectId: 'resin-drum', position: plan.at('culverts', 29, 20) },
    { instanceId: 'yd-culvert-puddle', objectId: 'litter-puddle', position: plan.at('culverts', 2, 3) },
    { instanceId: 'yards-desk-a', objectId: 'office-desk', position: plan.at('yard-office', 2, 0) },
    { instanceId: 'yards-desk-b', objectId: 'office-desk', position: plan.at('yard-office', 24, 0) },
    { instanceId: 'yards-cabinet', objectId: 'filing-cabinet', position: plan.at('yard-office', 27, 2), facing: 'west' },
    { instanceId: 'yards-cooler', objectId: 'water-cooler', position: plan.at('yard-office', 0, 0), facing: 'east' },
  ];

const assemblies: AssemblyPlacement[] = [
  { instanceId: 'yd-culvert-bridge', assemblyId: 'bridge', position: plan.spot('culverts', 13, 12), facing: 'east', span: 3 },
  { instanceId: 'yd-culvert-catwalk', assemblyId: 'catwalk', position: plan.spot('culverts', 13, 28), facing: 'east', span: 3 },
    { instanceId: 'yards-tram-car', assemblyId: 'tram-car', position: plan.spot('yard-office', 2, 27), facing: 'north' },
    { instanceId: 'yd-scrap-cable-run', assemblyId: 'cable-run', position: plan.spot('scrap-yard', 1, 38), facing: 'east', span: 6 },
  ];

const residents: CreaturePlacement[] = [
    { instanceId: 'yd-dock-drone-a', creatureId: 'scrap-drone', position: plan.at('loading-dock', 3, 22) },
    { instanceId: 'yd-dock-drone-b', creatureId: 'scrap-drone', position: plan.at('loading-dock', 24, 3) },
    { instanceId: 'yd-drone-a', creatureId: 'scrap-drone', position: plan.at('scrap-yard', 11, 12) },
    { instanceId: 'yd-drone-b', creatureId: 'scrap-drone', position: plan.at('scrap-yard', 34, 8) },
    { instanceId: 'yd-drone-c', creatureId: 'scrap-drone', position: plan.at('scrap-yard', 50, 36) },
    { instanceId: 'yd-drone-d', creatureId: 'scrap-drone', position: plan.at('scrap-yard', 17, 36) },
    { instanceId: 'yd-cold-lint-a', creatureId: 'lint-mite', position: plan.at('cold-store', 3, 3) },
    { instanceId: 'yd-cold-lint-b', creatureId: 'lint-mite', position: plan.at('cold-store', 19, 2) },
    { instanceId: 'yd-cold-lint-c', creatureId: 'lint-mite', position: plan.at('cold-store', 25, 22) },
    { instanceId: 'yd-cold-lint-d', creatureId: 'lint-mite', position: plan.at('cold-store', 8, 24) },
    { instanceId: 'yd-cold-lint-e', creatureId: 'lint-mite', position: plan.at('cold-store', 24, 24) },
    { instanceId: 'yd-laundry-mite-a', creatureId: 'gloam-mite', position: plan.at('laundry', 3, 20) },
    { instanceId: 'yd-laundry-mite-b', creatureId: 'gloam-mite', position: plan.at('laundry', 34, 31) },
    { instanceId: 'yd-culvert-mite-a', creatureId: 'gloam-mite', position: plan.at('culverts', 2, 31) },
    { instanceId: 'yd-culvert-mite-b', creatureId: 'gloam-mite', position: plan.at('culverts', 27, 31) },
  ];

const placed = [...npcs, ...fixtures, ...assemblies, ...residents];

const furnishings = scatterGroups(plan, placed, [
  ['scrap-yard', 'yd-scrap-node', ['scrap-heap'], 5],
  ['gantry-yard', 'yd-gantry-node', ['scrap-heap', 'resin-drum'], 5],
  ['laundry', 'yd-laundry-node', ['textile-bin'], 4],
  ['culverts', 'yd-culvert-node', ['moss-bed'], 3],
  ['scrap-yard', 'yd-scrap-litter', LITTER, 10],
  ['laundry', 'yd-laundry-litter', LITTER, 6],
]);

const packs = scatterPacks(plan, [...placed, ...furnishings], [
  ['scrap-yard', 'yd-drone-scrap-pack', 'scrap-drone', 8],
  ['gantry-yard', 'yd-drone-gantry-pack', 'scrap-drone', 7],
  ['laundry', 'yd-lint-laundry-pack', 'lint-mite', 7],
  ['culverts', 'yd-mite-culvert-pack', 'gloam-mite', 4],
  ['cold-store', 'yd-mite-cold-pack', 'gloam-mite', 3],
]);

const dressing: Dressing = {
  'loading-dock': 'freight',
  'cold-store': 'cold',
  'yard-office': 'office',
  'scrap-yard': 'freight',
  'culverts': 'wet',
  'laundry': 'industrial',
  'gantry-yard': 'freight',
};

export const SERVICE_YARDS: DistrictDefinition = furnish(plan, {
  id: 'service-yards',
  name: 'Service Yards',
  subtitle: 'Site Meridian — Salvage and Laundry',
  tier: 1,
  region: 'meridian-core',
  recovery: { districtId: 'meridian-atrium', position: ATRIUM_ANCHORS.recovery },
  ambience: { darkness: 0.6, tint: '#140f08', fog: '#1a140c', fixtures: 'failing' },
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  anchors: SERVICE_YARDS_ANCHORS,
  areas: [
    plan.area('loading-dock', 'Loading Dock'),
    plan.area('yard-office', 'Yard Office', { safe: true }),
    plan.area('scrap-yard', 'Scrap Yard'),
    plan.area('cold-store', 'Cold Store'),
    plan.area('laundry', 'Laundry Depot'),
    plan.area('culverts', 'Moss Culverts'),
    plan.area('gantry-yard', 'Gantry Yard'),
  ],
  npcs,
  objects: [...fixtures, ...furnishings],
  assemblies,
  creatures: [...residents, ...packs],
  lights: [
    { position: plan.center('gantry-yard'), radius: 11, color: '#ffb347', intensity: 0.5 },
    { position: plan.spot('loading-dock', 14, 3), radius: 9, color: '#ffb347', intensity: 0.45 },
    { position: plan.spot('yard-office', 14, 8), radius: 11, color: '#ffd27f', intensity: 0.6 },
    { position: plan.spot('scrap-yard', 14, 8), radius: 13, color: '#ff9a4d', intensity: 0.45 },
    { position: plan.spot('scrap-yard', 48, 27), radius: 13, color: '#ff9a4d', intensity: 0.4 },
    { position: plan.spot('cold-store', 14, 22), radius: 9, color: '#9fd8ff', intensity: 0.35 },
    { position: plan.spot('laundry', 22, 20), radius: 11, color: '#d8e7ef', intensity: 0.4 },
    { position: plan.spot('culverts', 17, 20), radius: 13, color: '#7cf29a', intensity: 0.45 },
  ],
}, dressing);
