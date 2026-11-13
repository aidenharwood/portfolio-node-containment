import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT, LAYOUT_SOURCES, parseLayout, type DistrictDefinition } from '@containment/shared';
import { hitsAt } from '../src/editor/hitTest.ts';

const atrium = GAME_CONTENT.districts.get('meridian-atrium') as DistrictDefinition;
const layout = parseLayout(LAYOUT_SOURCES['meridian-atrium']);

test('a set-piece piece selects its set-piece entry first', () => {
  const piece = atrium.objects.find((object) => object.instanceId === 'atrium-plaza-core-ring/1');
  assert.ok(piece);
  const index = layout.setPieces.findIndex((entry) => entry.id === 'atrium-plaza-core-ring');
  assert.deepEqual(hitsAt(layout, atrium, piece.position)[0], { kind: 'entry', ref: { collection: 'setPieces', index } });
});

test('a member of a room’s generated crowd selects its room dressing', () => {
  const crowd = atrium.npcs.find((npc) => npc.instanceId.startsWith('meridian-atrium-requisitions-crowd-'));
  assert.ok(crowd);
  assert.deepEqual(hitsAt(layout, atrium, crowd.position)[0], { kind: 'dressing', room: 'requisitions' });
});

test('a placed object selects its entry, with the room underneath', () => {
  const core = atrium.objects.find((object) => object.instanceId === 'atrium-core');
  assert.ok(core);
  const hits = hitsAt(layout, atrium, core.position);
  assert.deepEqual(hits[0], { kind: 'entry', ref: { collection: 'objects', index: layout.objects.findIndex((entry) => entry.id === 'atrium-core') } });
  assert.ok(hits.some((hit) => hit.kind === 'room' && hit.room === 'plaza'));
  const roomAt = hits.findIndex((hit) => hit.kind === 'room');
  assert.ok(hits.slice(roomAt + 1).every((hit) => hit.kind === 'step'));
});

test('an empty floor tile yields only its room', () => {
  const plaza = atrium.rooms?.plaza;
  assert.ok(plaza);
  const occupied = (x: number, y: number) => [...atrium.objects, ...atrium.npcs].some((thing) => thing.position.x === x && thing.position.y === y);
  const free = Array.from({ length: 10 }, (_, step) => ({ x: plaza.x + 3 + step, y: plaza.y + 20 })).find((point) => !occupied(point.x, point.y));
  assert.ok(free);
  const tile = free;
  const hits = hitsAt(layout, atrium, tile).filter((hit) => hit.kind !== 'entry' || hit.ref.collection !== 'decals');
  assert.deepEqual(hits, [{ kind: 'room', room: 'plaza' }]);
});

test('an npc placed in the layout selects its entry', () => {
  const ames = atrium.npcs.find((npc) => npc.instanceId === 'atrium-ames');
  assert.ok(ames);
  assert.deepEqual(hitsAt(layout, atrium, ames.position)[0], { kind: 'entry', ref: { collection: 'npcs', index: layout.npcs.findIndex((entry) => entry.id === 'atrium-ames') } });
});
