import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type DistrictDefinition } from '@containment/shared';
import { FIXTURE_CONTENT as GAME_CONTENT, FIXTURE_LAND } from '@containment/shared/fixtures';
import { landLevel, previewLevel, previewZone, zoneOfLevel } from '../src/editor/previewLevel.ts';
import { previewReach, previewTarget, streamFocusOf } from '../src/editor/previewView.ts';
import { groundAt } from '../src/render/world/ground.ts';

const atrium = GAME_CONTENT.districts.get('fx-hub') as DistrictDefinition;

test('a preview level holds one district at its own coordinates', () => {
  const level = previewLevel(GAME_CONTENT, atrium.id);
  assert.equal(level.layout.width, atrium.map[0]?.length);
  assert.equal(level.layout.height, atrium.map.length);
  const core = level.objects.find((object) => object.instanceId === 'hub-crate');
  assert.deepEqual(core?.position, atrium.objects.find((object) => object.instanceId === 'hub-crate')?.position);
  assert.ok(level.spawn.x >= 0 && level.spawn.y >= 0 && level.spawn.x < level.layout.width && level.spawn.y < level.layout.height);
});

test('a preview zone walks the same tiles as the level', () => {
  const zone = previewZone(GAME_CONTENT, atrium.id);
  const plaza = atrium.rooms?.plaza;
  assert.ok(plaza);
  assert.equal(zone.grid.isWalkable({ x: plaza.x + 2, y: plaza.y + 5 }), true);
  assert.equal(zone.grid.isWalkable({ x: 0, y: 0 }), false);
});

test('every district can be previewed', () => {
  for (const id of GAME_CONTENT.districts.keys()) assert.doesNotThrow(() => previewLevel(GAME_CONTENT, id), id);
});

test('a land level draws the land in its scene and has nothing to walk on', () => {
  const level = landLevel(FIXTURE_LAND, 'fx-land');
  assert.deepEqual(level.districts, []);
  assert.deepEqual(level.objects, []);
  assert.deepEqual(level.areas, []);
  assert.deepEqual(level.spawn, { x: FIXTURE_LAND.width / 2, y: FIXTURE_LAND.height / 2 });
  for (let y = 0; y < FIXTURE_LAND.height; y++) {
    for (let x = 0; x < FIXTURE_LAND.width; x++) {
      assert.equal(level.scene.tileAt({ x, y }), FIXTURE_LAND.tileAt({ x, y }));
      assert.equal(level.scene.heightAt({ x, y }), FIXTURE_LAND.heightAt({ x, y }));
      assert.equal(level.layout.tileAt({ x, y }), 'void');
      assert.equal(level.layout.districtAt({ x, y }), undefined);
    }
  }
  const zone = zoneOfLevel(GAME_CONTENT, level);
  for (let y = 0; y < FIXTURE_LAND.height; y++) for (let x = 0; x < FIXTURE_LAND.width; x++) assert.equal(zone.grid.isWalkable({ x, y }), false);
});

test('the 3D preview orbits the ground, builds around the camera and leaves the distance to the far view', () => {
  const zone = zoneOfLevel(GAME_CONTENT, landLevel(FIXTURE_LAND, 'fx-land'));
  const focus = { x: Math.floor(zone.layout.width / 2), y: Math.floor(zone.layout.height / 2) };
  assert.equal(previewTarget(zone, focus).y, groundAt(zone.layout, focus.x, focus.y));
  assert.equal(previewTarget(null, focus).y, 0);
  assert.deepEqual(streamFocusOf({ x: 100, z: 100 }, { x: 110, z: 100 }), { x: 110, y: 100 });
  assert.deepEqual(streamFocusOf({ x: 100, z: 100 }, { x: 100, z: 400 }, 24), { x: 100, y: 124 });
  assert.deepEqual(previewReach(8, true), { build: 2, retain: 3 });
  assert.deepEqual(previewReach(5, false), { build: 5, retain: 5 });
});
