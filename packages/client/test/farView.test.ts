import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chunkKey, chunkOf } from '@containment/shared';
import { FIXTURE_CONTENT } from '@containment/shared/fixtures';
import { Color, Mesh, Vector3 } from 'three';
import { zoneOfLevel } from '../src/editor/previewLevel.ts';
import { blendedOf, chunkMaskBounds, FarView, lightColors, writeChunkMask } from '../src/render/far/farView.ts';
import { createChunkMask } from '../src/render/far/farMaterial.ts';
import { createAmbienceLight, lightAmbience } from '../src/render/sceneLook.ts';
import { createBlendedAmbience } from '../src/render/world/ambienceBlend.ts';
import { LevelScene } from '../src/render/world/levelScene.ts';

const level = FIXTURE_CONTENT.levels.get('fx-wilds');
assert.ok(level);
const wilds = zoneOfLevel(FIXTURE_CONTENT, level);

test('the chunk mask covers the scene and marks exactly the chunks the near scene draws', () => {
  const bounds = chunkMaskBounds(wilds.layout);
  assert.equal(bounds.x, Math.floor(wilds.layout.bounds.x / 32));
  assert.equal(bounds.x + bounds.width - 1, Math.floor((wilds.layout.bounds.x + wilds.layout.bounds.width - 1) / 32));
  const mask = createChunkMask(bounds.x, bounds.y, bounds.width, bounds.height);
  writeChunkMask(mask, [{ cx: bounds.x, cy: bounds.y }, { cx: bounds.x + 1, cy: bounds.y + 1 }, { cx: -50, cy: 0 }]);
  const data = mask.texture.image.data as Uint8Array;
  assert.equal(data.filter((value) => value > 0).length, 2);
  assert.equal(data[0], 255);
  assert.equal(data[bounds.width + 1], 255);
  writeChunkMask(mask, []);
  assert.equal(data.filter((value) => value > 0).length, 0);
  mask.texture.dispose();
});

test('a darker district lights its far land darker than a bright one', () => {
  const light = createAmbienceLight();
  const sky = new Color();
  const ground = new Color();
  const key = new Color();
  const brightness = (ambience: Parameters<typeof blendedOf>[0]): number => {
    lightColors(lightAmbience(blendedOf(ambience, createBlendedAmbience()), light), sky, ground, key);
    return sky.r + sky.g + sky.b + key.r + key.g + key.b;
  };
  assert.ok(brightness({ darkness: 0.1, tint: '#9fc8f0', fog: '#a0b0c0', sky: '#9fc8f0' }) > brightness({ darkness: 0.8, tint: '#2a1838', fog: '#2a1838' }));
});

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

const until = async (ready: () => boolean): Promise<void> => {
  for (let tries = 0; tries < 400 && !ready(); tries++) await new Promise((resolve) => setTimeout(resolve, 5));
};

test('the far view builds the whole land once, follows the near scene, and frees its meshes', async () => {
  const far = new FarView(level, wilds.layout, 900);
  await until(() => far.ready);
  assert.ok(far.ready);
  const meshes = far.root.children.filter((child): child is Mesh => child instanceof Mesh && child.name === 'farTerrain');
  assert.ok(meshes.length > 0);
  for (const mesh of meshes) {
    assert.ok(mesh.geometry.getAttribute('chunk'));
    assert.ok(mesh.geometry.getAttribute('mood'));
    assert.ok(mesh.geometry.boundingSphere);
  }
  const scene = new LevelScene(wilds, { content: FIXTURE_CONTENT, editable: true });
  const focus = { x: 48, y: 16 };
  withFrames(() => {
    scene.stream(focus, 0, { build: 1, retain: 1 });
    scene.stream(focus, 0, { build: 1, retain: 1 });
  });
  const drawn = scene.drawnChunks;
  assert.deepEqual(new Set(drawn.map(chunkKey)), new Set([...scene.builtChunks, ...scene.placeholderChunks]));
  assert.ok(drawn.some((coord) => chunkKey(coord) === chunkKey(chunkOf(focus))));
  far.update({ camera: new Vector3(48, 10, 30), focus: new Vector3(48, 0, 16), ambience: createBlendedAmbience(), background: new Color(0.3, 0.4, 0.5), drawn });
  let disposed = 0;
  for (const mesh of meshes) mesh.geometry.addEventListener('dispose', () => disposed++);
  far.dispose();
  assert.equal(disposed, meshes.length);
  scene.dispose();
});
