import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type DistrictDefinition } from '@containment/shared';
import { FIXTURE_CONTENT as GAME_CONTENT } from '@containment/shared/fixtures';
import { previewLevel, previewZone } from '../src/editor/previewLevel.ts';

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
