import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chunkKey, chunkOf, type TileKindId, type TileLayout } from '@containment/shared';
import { FIXTURE_CONTENT } from '@containment/shared/fixtures';
import { Mesh } from 'three';
import { zoneOfLevel } from '../src/editor/previewLevel.ts';
import { buildChunkPlaceholder, tileTint } from '../src/render/world/chunkPlaceholder.ts';
import { chunkRegion } from '../src/render/world/chunkView.ts';
import { LevelScene } from '../src/render/world/levelScene.ts';
import { STEP_HEIGHT } from '../src/render/world/worldScale.ts';

const level = FIXTURE_CONTENT.levels.get('fx-wilds');
assert.ok(level);
const wilds = zoneOfLevel(FIXTURE_CONTENT, level);

const withFrames = (run: () => void): void => {
  const frame = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = ((next: () => void) => {
    next();
    return 0;
  }) as typeof requestAnimationFrame;
  try {
    run();
  } finally {
    globalThis.requestAnimationFrame = frame;
  }
};

test('every chunk queued to build that is not built yet stands in as a placeholder, and loses it once built', () => {
  withFrames(() => {
    const scene = new LevelScene(wilds, { content: FIXTURE_CONTENT });
    const focus = { x: 48, y: 16 };
    scene.stream(focus, 0, { build: 1, retain: 1 });
    scene.stream(focus, 0, { build: 1, retain: 1 });
    const centre = chunkKey(chunkOf(focus));
    assert.deepEqual(scene.builtChunks, [centre]);
    assert.ok(!scene.placeholderChunks.includes(centre));
    assert.ok(scene.placeholderChunks.length >= 3, scene.placeholderChunks.join(' '));
    scene.stream(focus, Infinity, { build: 1, retain: 1 });
    assert.deepEqual(scene.placeholderChunks, []);
    scene.dispose();
  });
});

test('the scene counts the chunks in its build reach that are not built yet', () => {
  withFrames(() => {
    const scene = new LevelScene(wilds, { content: FIXTURE_CONTENT });
    assert.equal(scene.pendingChunks, 0);
    const focus = { x: 48, y: 16 };
    const centre = chunkOf(focus);
    const inReach = (radius: number): number => {
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) if (chunkRegion({ cx: centre.cx + dx, cy: centre.cy + dy }, wilds)) count++;
      return count;
    };
    assert.ok(inReach(1) > 1 && inReach(2) > inReach(1));
    scene.stream(focus, 0, { build: 1, retain: 2 });
    assert.equal(scene.pendingChunks, inReach(1) - 1);
    scene.stream(focus, Infinity, { build: 1, retain: 2 });
    assert.equal(scene.pendingChunks, 0);
    scene.stream(focus, 0, { build: 2, retain: 2 });
    assert.equal(scene.pendingChunks, inReach(2) - inReach(1));
    scene.stream(focus, Infinity, { build: 2, retain: 2 });
    assert.equal(scene.pendingChunks, 0);
    assert.equal(scene.builtChunks.length, inReach(2));
    scene.dispose();
  });
});

test('walking east builds the chunk ahead before the one behind', () => {
  withFrames(() => {
    const scene = new LevelScene(wilds, { content: FIXTURE_CONTENT });
    for (let x = 36; x <= 48; x++) scene.stream({ x, y: 16 }, Infinity, { build: 0, retain: 1, ahead: 1 });
    const centre = chunkOf({ x: 48, y: 16 });
    assert.ok(scene.builtChunks.includes(chunkKey({ cx: centre.cx + 1, cy: centre.cy })), scene.builtChunks.join(' '));
    assert.ok(!scene.builtChunks.includes(chunkKey({ cx: centre.cx - 1, cy: centre.cy + 1 })), scene.builtChunks.join(' '));
    scene.dispose();
  });
});

test('a placeholder tile sits at the height of the floor it stands in for', () => {
  const layout: TileLayout = { width: 2, height: 1, tileAt: ({ x, y }): TileKindId => (y === 0 && x >= 0 && x < 2 ? 'grass' : 'void'), heightAt: ({ x }) => (x === 1 ? 2 : 1) };
  const placeholder = buildChunkPlaceholder(layout, { x: 0, y: 0, width: 2, height: 1 });
  assert.ok(placeholder);
  const mesh = placeholder.children[0];
  assert.ok(mesh instanceof Mesh);
  const heights = new Set<number>();
  const positions = mesh.geometry.getAttribute('position');
  for (let index = 0; index < positions.count; index++) heights.add(Math.round(positions.getY(index) * 1000) / 1000);
  assert.ok(heights.has(Math.round(STEP_HEIGHT * 1000) / 1000), [...heights].join(' '));
  assert.ok(heights.has(Math.round(2 * STEP_HEIGHT * 1000) / 1000), [...heights].join(' '));
  assert.ok(tileTint('grass').green > tileTint('grass').blue);
});
