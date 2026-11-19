import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chunkOf, type ResolvedLevel, type TilePoint } from '@containment/shared';
import { FIXTURE_CONTENT } from '@containment/shared/fixtures';
import { zoneOfLevel } from '../src/editor/previewLevel.ts';
import { chunkRegion } from '../src/render/world/chunkView.ts';
import { BUILD_RADIUS, LevelScene } from '../src/render/world/levelScene.ts';

const levelOf = (id: string): ResolvedLevel => {
  const level = FIXTURE_CONTENT.levels.get(id);
  assert.ok(level);
  return level;
};

const wilds = zoneOfLevel(FIXTURE_CONTENT, levelOf('fx-wilds'));
const floor = zoneOfLevel(FIXTURE_CONTENT, levelOf('fx-floor'));

test('a level with land has chunk regions in the margin past its edges', () => {
  assert.deepEqual(chunkRegion({ cx: -1, cy: -1 }, wilds), { x: -32, y: -32, width: 32, height: 32 });
  assert.equal(chunkRegion({ cx: -2, cy: 0 }, wilds), null);
  assert.deepEqual(chunkRegion({ cx: 4, cy: 0 }, wilds), { x: 128, y: 0, width: 32, height: 32 });
});

test('a level without land has no chunk regions past its edges', () => {
  assert.equal(chunkRegion({ cx: -1, cy: 0 }, floor), null);
  assert.equal(chunkRegion({ cx: 0, cy: -1 }, floor), null);
  assert.ok(chunkRegion({ cx: 0, cy: 0 }, floor));
});

test('every chunk within build reach of the outermost walkable tiles has a region', () => {
  const { layout } = wilds.definition;
  const walkable: TilePoint[] = [];
  for (let y = 0; y < layout.height; y++) {
    for (let x = 0; x < layout.width; x++) if (wilds.grid.isWalkable({ x, y })) walkable.push({ x, y });
  }
  assert.ok(walkable.length > 0);
  const outermost = [
    walkable.reduce((best, point) => (point.x < best.x ? point : best)),
    walkable.reduce((best, point) => (point.x > best.x ? point : best)),
    walkable.reduce((best, point) => (point.y < best.y ? point : best)),
    walkable.reduce((best, point) => (point.y > best.y ? point : best)),
  ];
  for (const point of outermost) {
    const centre = chunkOf(point);
    for (let dy = -BUILD_RADIUS; dy <= BUILD_RADIUS; dy++) {
      for (let dx = -BUILD_RADIUS; dx <= BUILD_RADIUS; dx++) assert.ok(chunkRegion({ cx: centre.cx + dx, cy: centre.cy + dy }, wilds), `chunk ${centre.cx + dx},${centre.cy + dy} near ${point.x},${point.y}`);
    }
  }
});

test('a scene builds the chunks in the margin of a level with land', () => {
  const frame = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = ((run: () => void) => {
    run();
    return 0;
  }) as typeof requestAnimationFrame;
  try {
    const scene = new LevelScene(wilds, { editable: true, content: FIXTURE_CONTENT });
    const focus = { x: -16, y: 16 };
    scene.stream(focus, Infinity, { build: 0, retain: 1 });
    scene.stream(focus, Infinity, { build: 0, retain: 1 });
    assert.deepEqual(scene.builtChunks, ['-1,0']);
    scene.dispose();
  } finally {
    globalThis.requestAnimationFrame = frame;
  }
});
