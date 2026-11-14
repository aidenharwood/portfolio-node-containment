import { anchorsOf, buildDistrict, parseLayout } from '../../../src/world/layout.ts';
import type { DistrictLayout } from '../../../src/world/layoutSchema.ts';

import { registerFurnishingKit } from '../../../src/content/furnishingKit.ts';
import { FIXTURE_FURNISHING } from './furnishing.ts';

registerFurnishingKit(FIXTURE_FURNISHING);

export const FIXTURE_LAYOUTS = new Map<string, DistrictLayout>();

const build = (source: unknown) => {
  const layout = parseLayout(source);
  FIXTURE_LAYOUTS.set(layout.id, layout);
  return buildDistrict(layout);
};

const AMBIENCE = { darkness: 0.3, tint: '#2a2632', fog: '#3a3444', sky: '#5e5470' };

const room = (id: string, x: number, y: number, width: number, height: number, floor = 'concrete') => ({ kind: 'room', id, rect: { x, y, width, height }, floor, shape: 'rect' });
const link = (from: string, to: string, width: number, floor = 'door') => ({ kind: 'link', from, to, width, floor });
const exit = (id: string, roomId: string, side: string) => ({ kind: 'exit', id, room: roomId, side, width: 9, offset: 1, gate: false });
const patch = (x: number, y: number, width: number, height: number, tile: string) => ({ kind: 'patch', rect: { x, y, width, height }, tile });
const track = (width: number) => ({ kind: 'track', points: [{ x: 0, y: 28 }, { x: width - 2, y: 28 }] });
const at = (roomId: string, dx: number, dy: number) => ({ room: roomId, dx, dy });
const object = (id: string, objectId: string, roomId: string, dx: number, dy: number) => ({ id, object: objectId, at: at(roomId, dx, dy) });
const npc = (id: string, npcId: string, roomId: string, dx: number, dy: number) => ({ id, npc: npcId, at: at(roomId, dx, dy) });
const creature = (id: string, creatureId: string, roomId: string, dx: number, dy: number) => ({ id, creature: creatureId, at: at(roomId, dx, dy) });
const tramCar = (id: string) => ({ id, assembly: 'tram-car', at: at('tram-terminal', 3, 10), facing: 'north' });

const empty = { tiles: [], lights: [], decals: [], setPieces: [], furnish: {} };

export const FIXTURE_HUB = build({
  id: 'fx-hub',
  name: 'Test Hub',
  subtitle: 'Fixture',
  tier: 1,
  region: 'fx-home',
  condition: 'pristine',
  deadEnd: true,
  ambience: AMBIENCE,
  size: { width: 30, height: 32 },
  steps: [
    room('plaza', 2, 2, 12, 12),
    room('hall', 16, 2, 12, 12),
    room('tram-terminal', 2, 18, 12, 12, 'plating'),
    track(30),
    patch(2, 27, 12, 1, 'hazard'),
    link('plaza', 'hall', 3),
    link('plaza', 'tram-terminal', 3),
    exit('east', 'hall', 'east'),
  ],
  ...empty,
  setPieces: [{ id: 'hub-hall-ferns', prefab: 'fern-bench', at: at('hall', 2, 10), facing: 'north' }],
  areas: [
    { room: 'plaza', name: 'Test Plaza', safe: true },
    { room: 'hall', name: 'Test Hall', safe: true },
    { room: 'tram-terminal', name: 'Test Hub Platform', safe: true },
  ],
  anchors: { start: at('plaza', 6, 6), recovery: at('plaza', 6, 9), liftArrival: at('plaza', 10, 10), tramPlatform: at('tram-terminal', 6, 7) },
  recovery: { districtId: 'fx-hub', anchor: 'recovery' },
  objects: [
    object('hub-storage', 'storage-locker', 'plaza', 0, 0),
    object('hub-exchange', 'market-terminal', 'plaza', 2, 0),
    object('hub-contracts', 'contract-board', 'plaza', 4, 0),
    object('hub-lift', 'lift-down', 'plaza', 11, 0),
    object('hub-refinery', 'refinery', 'plaza', 0, 10),
    object('hub-fabricator', 'fabricator', 'plaza', 2, 10),
    object('hub-synthesiser', 'synthesiser', 'plaza', 4, 10),
    object('hub-bed', 'rest-bed', 'plaza', 11, 11),
    object('hub-plinth', 'plinth', 'hall', 4, 6),
    object('hub-crate', 'crate', 'hall', 9, 9),
  ],
  assemblies: [tramCar('hub-tram-car')],
  npcs: [
    npc('hub-trader', 'trader', 'plaza', 6, 3),
    npc('hub-medic', 'medic', 'plaza', 8, 3),
    npc('hub-registrar', 'registrar', 'plaza', 10, 3),
    npc('hub-handler', 'handler', 'plaza', 6, 8),
    npc('hub-wanderer', 'wanderer', 'hall', 6, 3),
  ],
  creatures: [],
  lights: [{ at: at('plaza', 6, 6), radius: 8, color: '#ffe0b0', intensity: 0.5 }],
  dressing: { plaza: { theme: 'camp', people: 0 }, hall: { theme: 'camp', people: 1, cast: ['wanderer'] }, 'tram-terminal': { theme: 'transit', people: 0 } },
});

export const FIXTURE_FIELD = build({
  id: 'fx-field',
  name: 'Test Field',
  subtitle: 'Fixture',
  tier: 1,
  region: 'fx-home',
  condition: 'worn',
  ambience: AMBIENCE,
  size: { width: 60, height: 32 },
  steps: [
    room('lane', 1, 2, 58, 10, 'asphalt'),
    room('safehouse', 2, 15, 10, 8),
    room('den', 16, 15, 12, 10),
    room('vault', 32, 15, 10, 8),
    room('range', 46, 15, 12, 10),
    track(60),
    link('lane', 'safehouse', 3),
    link('lane', 'den', 3),
    link('lane', 'vault', 2),
    link('lane', 'range', 3),
    exit('west', 'lane', 'west'),
    exit('east', 'lane', 'east'),
  ],
  ...empty,
  areas: [
    { room: 'lane', name: 'Test Lane' },
    { room: 'safehouse', name: 'Test Safehouse', safe: true },
    { room: 'den', name: 'Test Den' },
    { room: 'vault', name: 'Test Vault' },
    { room: 'range', name: 'Test Range' },
  ],
  anchors: { recovery: at('safehouse', 4, 4), safehouseDoorInside: at('safehouse', 4, 0), safehouseDoorOutside: at('lane', 5, 9), laneByNode: at('lane', 38, 3) },
  recovery: { districtId: 'fx-field', anchor: 'recovery' },
  objects: [
    object('field-scrap-a', 'scrap-heap', 'lane', 40, 1),
    object('field-scrap-b', 'scrap-heap', 'lane', 44, 7),
    object('field-deep-scrap', 'deep-scrap-heap', 'lane', 48, 3),
    object('field-crate', 'crate', 'lane', 10, 8),
    object('survey-a', 'survey-marker', 'lane', 12, 1),
    object('survey-b', 'survey-marker', 'lane', 14, 7),
    object('survey-c', 'survey-marker', 'lane', 16, 1),
    object('field-sign', 'sign', 'lane', 30, 0),
    object('vault-terminal', 'vault-terminal', 'vault', 5, 1),
    object('range-scrap', 'scrap-heap', 'range', 9, 7),
    { id: 'vault-door-a', object: 'vault-door', at: { link: ['lane', 'vault'], index: 0 } },
    { id: 'vault-door-b', object: 'vault-door', at: { link: ['lane', 'vault'], index: 1 } },
  ],
  assemblies: [],
  npcs: [],
  creatures: [
    creature('field-mite-a', 'gloam-mite', 'lane', 20, 4),
    creature('field-mite-b', 'gloam-mite', 'lane', 24, 6),
    creature('den-mite-a', 'gloam-mite', 'den', 3, 4),
    creature('den-mite-b', 'gloam-mite', 'den', 6, 5),
    creature('den-mite-c', 'gloam-mite', 'den', 8, 7),
    creature('range-drone-a', 'training-drone', 'range', 3, 3),
    creature('range-drone-b', 'training-drone', 'range', 8, 3),
    creature('range-lint-mite', 'lint-mite', 'range', 6, 7),
  ],
  dressing: {
    lane: { theme: 'camp', people: 0 },
    safehouse: { theme: 'camp', people: 0 },
    den: { theme: 'works', people: 0 },
    vault: { theme: 'cold', people: 0 },
    range: { theme: 'wet', people: 0 },
  },
});

export const FIXTURE_OUTPOST = build({
  id: 'fx-outpost',
  name: 'Test Outpost',
  subtitle: 'Fixture',
  tier: 1,
  region: 'fx-far',
  condition: 'worn',
  deadEnd: true,
  ambience: AMBIENCE,
  size: { width: 30, height: 32 },
  steps: [
    room('post', 1, 2, 12, 12),
    room('tram-terminal', 2, 18, 12, 12, 'plating'),
    track(30),
    patch(2, 27, 12, 1, 'hazard'),
    link('post', 'tram-terminal', 3),
    exit('west', 'post', 'west'),
  ],
  ...empty,
  areas: [
    { room: 'post', name: 'Test Post', safe: true },
    { room: 'tram-terminal', name: 'Test Outpost Platform', safe: true },
  ],
  anchors: { recovery: at('post', 6, 6), tramPlatform: at('tram-terminal', 6, 7) },
  recovery: { districtId: 'fx-outpost', anchor: 'recovery' },
  objects: [
    object('post-storage', 'storage-locker', 'post', 2, 0),
    object('post-mailbox', 'market-mailbox', 'post', 4, 0),
    object('post-contracts', 'contract-board', 'post', 6, 0),
  ],
  assemblies: [tramCar('post-tram-car')],
  npcs: [npc('post-trader', 'outpost-trader', 'post', 6, 4)],
  creatures: [],
  dressing: { post: { theme: 'camp', people: 0 }, 'tram-terminal': { theme: 'transit', people: 0 } },
});

export const FIXTURE_ISLAND = build({
  id: 'fx-island',
  name: 'Test Island',
  subtitle: 'Fixture',
  tier: 1,
  region: 'fx-home',
  condition: 'worn',
  deadEnd: true,
  reachedOnlyByTram: true,
  ambience: AMBIENCE,
  size: { width: 20, height: 32 },
  steps: [room('quay', 2, 4, 12, 10), room('tram-terminal', 2, 18, 12, 12, 'plating'), track(20), patch(2, 27, 12, 1, 'hazard'), link('quay', 'tram-terminal', 3)],
  ...empty,
  areas: [
    { room: 'quay', name: 'Test Quay', safe: true },
    { room: 'tram-terminal', name: 'Test Island Platform', safe: true },
  ],
  anchors: { quay: at('quay', 6, 5), tramPlatform: at('tram-terminal', 6, 7) },
  recovery: { districtId: 'fx-island', anchor: 'quay' },
  objects: [],
  assemblies: [tramCar('island-tram-car')],
  npcs: [],
  creatures: [],
  dressing: { quay: { theme: 'camp', people: 0 }, 'tram-terminal': { theme: 'transit', people: 0 } },
});

export const FIXTURE_ARENA = build({
  id: 'fx-arena',
  name: 'Test Arena',
  subtitle: 'Fixture',
  tier: 1,
  region: 'fx-home',
  condition: 'breached',
  ambience: AMBIENCE,
  size: { width: 26, height: 22 },
  steps: [room('landing', 2, 2, 8, 8), room('arena', 12, 2, 12, 12), room('nook', 14, 16, 6, 4), link('landing', 'arena', 3), link('arena', 'nook', 1)],
  ...empty,
  areas: [
    { room: 'landing', name: 'Test Landing', safe: true },
    { room: 'arena', name: 'Test Arena', multiCombat: true },
    { room: 'nook', name: 'Test Nook' },
  ],
  anchors: { landing: at('landing', 4, 4), recovery: at('landing', 4, 6) },
  recovery: { districtId: 'fx-arena', anchor: 'recovery' },
  objects: [object('arena-lift', 'lift-up', 'landing', 0, 0)],
  assemblies: [],
  npcs: [],
  creatures: [creature('arena-warden', 'hollow-warden', 'arena', 5, 5)],
  dressing: { landing: { theme: 'camp', people: 0 }, arena: { theme: 'wet', people: 0 }, nook: { theme: 'wet', people: 0 } },
});

export const FIXTURE_HUB_ANCHORS = anchorsOf(FIXTURE_HUB, ['start', 'recovery', 'liftArrival', 'tramPlatform']);
export const FIXTURE_OUTPOST_ANCHORS = anchorsOf(FIXTURE_OUTPOST, ['tramPlatform']);
export const FIXTURE_ISLAND_ANCHORS = anchorsOf(FIXTURE_ISLAND, ['tramPlatform']);
