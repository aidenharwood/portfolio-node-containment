import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { buildDistrict, parseLayout, type DistrictLayout } from '@containment/shared';
import {
  addEntry,
  deleteEntry,
  deleteStep,
  duplicateEntry,
  eraseTiles,
  freshId,
  moveEntry,
  moveRoom,
  paintTiles,
  resizeRoom,
  rotateEntry,
  setDressing,
  setField,
  type EditResult,
} from '../src/editor/edits.ts';

const FIXTURE = new URL('../../shared/test/fixtures/sample-layout.json', import.meta.url);
const sample = (): DistrictLayout => parseLayout(JSON.parse(readFileSync(FIXTURE, 'utf8')));

const ok = (result: EditResult): DistrictLayout => {
  assert.ok(result.ok, result.ok ? '' : result.reason);
  return result.layout;
};

const objectAt = (layout: DistrictLayout, id: string) => buildDistrict(layout).objects.find((object) => object.instanceId === id);

describe('placement edits', () => {
  test('moving an object into another room re-expresses it in that room', () => {
    const moved = ok(moveEntry(sample(), { collection: 'objects', index: 0 }, { x: 19, y: 5 }));
    assert.deepEqual(moved.objects[0]?.at, { room: 'side', dx: 2, dy: 4 });
    assert.deepEqual(objectAt(moved, 'hall-planter')?.position, { x: 19, y: 5 });
  });

  test('moving an object onto a wall is refused', () => {
    const result = moveEntry(sample(), { collection: 'objects', index: 0 }, { x: 0, y: 0 });
    assert.equal(result.ok, false);
    assert.match(result.ok ? '' : result.reason, /wall/);
  });

  test('moving outside the district is refused', () => {
    assert.equal(moveEntry(sample(), { collection: 'npcs', index: 0 }, { x: 99, y: 3 }).ok, false);
  });

  test('rotating cycles south, west, north, east', () => {
    let layout = sample();
    const facings: (string | undefined)[] = [];
    for (let turn = 0; turn < 4; turn++) {
      layout = ok(rotateEntry(layout, { collection: 'objects', index: 0 }));
      facings.push(layout.objects[0]?.facing);
    }
    assert.deepEqual(facings, ['west', 'north', 'east', 'south']);
  });

  test('duplicating adds a fresh id one tile east', () => {
    const copied = ok(duplicateEntry(sample(), { collection: 'objects', index: 0 }));
    const copy = copied.objects.at(-1);
    assert.equal(copy?.id, 'sample-district-objects-1');
    assert.deepEqual(objectAt(copied, 'sample-district-objects-1')?.position, { x: 3, y: 2 });
  });

  test('fresh ids skip numbers already taken', () => {
    const layout = sample();
    const taken: DistrictLayout = { ...layout, objects: [...layout.objects, { id: 'sample-district-objects-1', object: 'planter', at: { room: 'hall', dx: 3, dy: 3 } }] };
    assert.equal(freshId(taken, 'objects'), 'sample-district-objects-2');
  });

  test('adding places a palette entry with a fresh id', () => {
    const added = ok(addEntry(sample(), 'objects', { object: 'trash-bin' }, { x: 4, y: 4 }));
    assert.deepEqual(added.objects.at(-1), { id: 'sample-district-objects-1', object: 'trash-bin', at: { room: 'hall', dx: 3, dy: 3 } });
  });

  test('deleting removes an entry, but anchors cannot be deleted', () => {
    assert.equal(ok(deleteEntry(sample(), { collection: 'objects', index: 0 })).objects.length, 1);
    assert.equal(deleteEntry(sample(), { collection: 'anchors', name: 'door' }).ok, false);
  });

  test('setting a known field changes it and an unknown field is refused', () => {
    assert.equal(ok(setField(sample(), { collection: 'lights', index: 0 }, 'radius', 12)).lights[0]?.radius, 12);
    assert.equal(setField(sample(), { collection: 'lights', index: 0 }, 'sparkle', 1).ok, false);
  });
});

describe('room and step edits', () => {
  test('moving a room carries its placements with it', () => {
    const before = buildDistrict(sample());
    const moved = ok(moveRoom(sample(), 'side', { x: 17, y: 2 }));
    const after = buildDistrict(moved);
    const position = (district: typeof before, id: string) => district.objects.find((object) => object.instanceId === id)?.position;
    assert.deepEqual(after.anchors?.desk, { x: (before.anchors?.desk?.x ?? 0), y: (before.anchors?.desk?.y ?? 0) + 1 });
    assert.deepEqual(position(after, 'hall-planter'), position(before, 'hall-planter'));
  });

  test('shrinking a room past a placement is refused and names it', () => {
    const result = resizeRoom(sample(), 'hall', { x: 1, y: 1, width: 8, height: 8 });
    assert.equal(result.ok, false);
    assert.match(result.ok ? '' : result.reason, /hall-bench/);
  });

  test('deleting a room that others name is refused and lists them', () => {
    const result = deleteStep(sample(), 0);
    assert.equal(result.ok, false);
    assert.match(result.ok ? '' : result.reason, /hall-planter/);
  });

  test('painting skips exit tiles and erasing removes paint', () => {
    const exitTile = buildDistrict(sample()).exits?.west?.tiles[0];
    assert.ok(exitTile);
    const painted = ok(paintTiles(sample(), [exitTile, { x: 5, y: 5 }], 'hazard'));
    assert.deepEqual(painted.tiles, [{ x: 5, y: 5, tile: 'hazard' }]);
    assert.deepEqual(ok(eraseTiles(painted, [{ x: 5, y: 5 }])).tiles, []);
  });

  test('dressing can be set and cleared', () => {
    const set = ok(setDressing(sample(), 'hall', { theme: 'civic', people: 2 }));
    assert.deepEqual(set.dressing.hall, { theme: 'civic', people: 2 });
    assert.equal(ok(setDressing(set, 'side', null)).dressing.side, undefined);
  });
});
