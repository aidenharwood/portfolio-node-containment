import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDistrict, chunkOf, type DistrictLayout } from '@containment/shared';
import { FIXTURE_CONTENT as GAME_CONTENT, FIXTURE_CONTEXT, FIXTURE_LAND, FIXTURE_LEVEL_RECIPES, FIXTURE_WILDS_LAYOUTS } from '@containment/shared/fixtures';
import { contentWith } from '../src/editor/contentWith.ts';
import { previewZone, zoneOfLevel } from '../src/editor/previewLevel.ts';
import { chunkSignature, objectChanges } from '../src/render/world/chunkSignature.ts';
import { LevelScene } from '../src/render/world/levelScene.ts';
import { planWallLighting } from '../src/render/world/wallLights.ts';
import type { ActiveZone } from '../src/state/worldState.ts';

const zone = previewZone(GAME_CONTENT, 'fx-field');
const lighting = planWallLighting(zone);
const first = zone.definition.objects[0];

const movedFirstObject = (by: number): ActiveZone => {
  const objects = zone.definition.objects.map((placement, index) => (index === 0 ? { ...placement, position: { x: placement.position.x + by, y: placement.position.y } } : placement));
  return { ...zone, definition: { ...zone.definition, objects } };
};

test('a chunk signature is stable for the same zone', () => {
  assert.ok(first);
  const coord = chunkOf(first.position);
  const a = chunkSignature(zone, coord, lighting);
  const b = chunkSignature(zone, coord, lighting);
  assert.equal(a.tiles, b.tiles);
  assert.deepEqual(objectChanges(a, b), { removed: [], added: [] });
});

test('moving an object shows up as one removal and one addition in its own chunk only', () => {
  assert.ok(first);
  const near = chunkOf(first.position);
  const moved = movedFirstObject(1);
  const changes = objectChanges(chunkSignature(zone, near, lighting), chunkSignature(moved, near, lighting));
  assert.deepEqual(changes.removed.map((placement) => placement.instanceId), [first.instanceId]);
  assert.deepEqual(changes.added.map(({ placement }) => placement.position), [{ x: first.position.x + 1, y: first.position.y }]);
  assert.equal(chunkSignature(moved, near, lighting).tiles, chunkSignature(zone, near, lighting).tiles);
  for (const other of [{ cx: near.cx + 1, cy: near.cy }, { cx: near.cx, cy: near.cy + 1 }]) {
    assert.deepEqual(objectChanges(chunkSignature(zone, other, lighting), chunkSignature(moved, other, lighting)), { removed: [], added: [] });
  }
});

test('an editable scene swaps a moved object in place without rebuilding its chunk', () => {
  assert.ok(first);
  const frame = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = ((run: () => void) => {
    run();
    return 0;
  }) as typeof requestAnimationFrame;
  try {
    const scene = new LevelScene(zone, { editable: true, content: GAME_CONTENT });
    const focus = { x: first.position.x, y: first.position.y };
    scene.stream(focus, Infinity, { build: 0, retain: 1 });
    scene.stream(focus, Infinity, { build: 0, retain: 1 });
    const before = scene.objects.get(first.instanceId);
    assert.ok(before);
    const result = scene.patch(movedFirstObject(1));
    assert.equal(result.rebuilt, 0);
    assert.equal(result.patched, 1);
    const after = scene.objects.get(first.instanceId);
    assert.ok(after && after !== before);
    assert.equal(after.placement.position.x, first.position.x + 1);
    scene.dispose();
  } finally {
    globalThis.requestAnimationFrame = frame;
  }
});

test('a chunk wholly in the margin keeps its signature through a district edit elsewhere', () => {
  const layout = FIXTURE_WILDS_LAYOUTS.get('fx-wild-east') as DistrictLayout;
  const changed: DistrictLayout = {
    ...layout,
    tiles: [...layout.tiles, { x: 5, y: 5, tile: 'brick' }],
    objects: [...layout.objects, { id: 'wild-east-extra-crate', object: 'crate', at: { room: 'ground', dx: 4, dy: 4 } }],
  };
  const edited = contentWith(GAME_CONTENT, new Map([['fx-wild-east', { layout: changed, district: buildDistrict(changed, FIXTURE_LAND) }]]), FIXTURE_LEVEL_RECIPES, FIXTURE_CONTEXT.hollowOf);
  const before = zoneOfLevel(GAME_CONTENT, GAME_CONTENT.levels.get('fx-wilds') as never);
  const after = zoneOfLevel(edited, edited.levels.get('fx-wilds') as never);
  const signatureOf = (zone: ActiveZone, coord: { cx: number; cy: number }) => chunkSignature(zone, coord, planWallLighting(zone));
  const edit = { cx: 2, cy: 0 };
  assert.notEqual(signatureOf(before, edit).tiles, signatureOf(after, edit).tiles);
  for (const margin of [{ cx: -1, cy: 0 }, { cx: -1, cy: -1 }, { cx: 0, cy: 1 }]) {
    const a = signatureOf(before, margin);
    const b = signatureOf(after, margin);
    assert.ok(a.tiles.length > 0);
    assert.equal(a.tiles, b.tiles);
    assert.equal(a.settle, b.settle);
    assert.deepEqual(objectChanges(a, b), { removed: [], added: [] });
  }
});
