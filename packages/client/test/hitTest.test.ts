import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseLayout, type DistrictDefinition } from '@containment/shared';
import { FIXTURE_CONTENT, FIXTURE_LAYOUT_SOURCES } from '@containment/shared/fixtures';
import { hitsAt } from '../src/editor/hitTest.ts';

const hub = FIXTURE_CONTENT.districts.get('fx-hub') as DistrictDefinition;
const layout = parseLayout(FIXTURE_LAYOUT_SOURCES['fx-hub']);
const hit = (tile: { x: number; y: number }) => hitsAt(layout, hub, tile, FIXTURE_CONTENT);

test('a set-piece piece selects its set-piece entry first', () => {
  const piece = hub.objects.find((object) => object.instanceId.startsWith('hub-hall-ferns/'));
  assert.ok(piece);
  const index = layout.setPieces.findIndex((entry) => entry.id === 'hub-hall-ferns');
  assert.deepEqual(hit(piece.position)[0], { kind: 'entry', ref: { collection: 'setPieces', index } });
});

test('a member of a room’s generated crowd selects its room dressing', () => {
  const crowd = hub.npcs.find((npc) => npc.instanceId.startsWith('fx-hub-hall-crowd-'));
  assert.ok(crowd);
  assert.deepEqual(hit(crowd.position)[0], { kind: 'dressing', room: 'hall' });
});

test('a placed object selects its entry, with the room underneath', () => {
  const crate = hub.objects.find((object) => object.instanceId === 'hub-crate');
  assert.ok(crate);
  const hits = hit(crate.position);
  assert.deepEqual(hits[0], { kind: 'entry', ref: { collection: 'objects', index: layout.objects.findIndex((entry) => entry.id === 'hub-crate') } });
  assert.ok(hits.some((each) => each.kind === 'room' && each.room === 'hall'));
  const roomAt = hits.findIndex((each) => each.kind === 'room');
  assert.ok(hits.slice(roomAt + 1).every((each) => each.kind === 'step'));
});

test('an empty floor tile yields only its room', () => {
  const plaza = hub.rooms?.plaza;
  assert.ok(plaza);
  const occupied = (x: number, y: number) => [...hub.objects, ...hub.npcs].some((thing) => thing.position.x === x && thing.position.y === y);
  const free = Array.from({ length: 6 }, (_, step) => ({ x: plaza.x + 3 + step, y: plaza.y + 5 })).find((point) => !occupied(point.x, point.y));
  assert.ok(free);
  const hits = hit(free).filter((each) => each.kind !== 'entry' || each.ref.collection !== 'decals');
  assert.deepEqual(hits, [{ kind: 'room', room: 'plaza' }]);
});

test('an npc placed in the layout selects its entry', () => {
  const handler = hub.npcs.find((npc) => npc.instanceId === 'hub-handler');
  assert.ok(handler);
  assert.deepEqual(hit(handler.position)[0], { kind: 'entry', ref: { collection: 'npcs', index: layout.npcs.findIndex((entry) => entry.id === 'hub-handler') } });
});
