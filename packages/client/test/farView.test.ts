import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chunkKey, chunkOf, GAME_CONTENT } from '@containment/shared';
import { FIXTURE_CONTENT } from '@containment/shared/fixtures';
import { Box3, Color, Mesh, Vector3 } from 'three';
import { zoneOfLevel } from '../src/editor/previewLevel.ts';
import { blendedOf, chunkMaskBounds, FarView, lightColors, writeChunkMask } from '../src/render/far/farView.ts';
import { createChunkMask, createFarUniforms } from '../src/render/far/farMaterial.ts';
import { planLandmarks, type Landmark } from '../src/render/far/farLandmarks.ts';
import { FAR_SEA_LEVEL, FarSea, seaRadiance } from '../src/render/far/farSea.ts';
import { FAR_SINK } from '../src/render/far/farTerrainMesher.ts';
import { beaconPixels, LandmarkBeacons, NEEDLE_FROM } from '../src/render/far/landmarkBeacons.ts';
import { SPINDLE_CROWN, SPINDLE_HEIGHT_VOXELS, spindleRadius } from '../src/render/models/cityModels.ts';
import { runPlan } from '../src/render/far/sceneRaster.ts';
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
  assert.ok(far.root.children.some((child) => child.name === 'farSea'));
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
  far.update({ camera: new Vector3(48, 10, 30), focus: new Vector3(48, 0, 16), ambience: createBlendedAmbience(), drawn });
  let disposed = 0;
  for (const mesh of meshes) mesh.geometry.addEventListener('dispose', () => disposed++);
  far.dispose();
  assert.equal(disposed, meshes.length);
  scene.dispose();
});

test('the far sea lies below every far shore, follows the camera to the far plane and takes the camera light', () => {
  assert.ok(FAR_SEA_LEVEL < -FAR_SINK - 0.05);
  const uniforms = createFarUniforms(createChunkMask(0, 0, 1, 1));
  const sea = new FarSea(uniforms);
  uniforms.nearSky.value.setRGB(0.5, 0.5, 0.5);
  uniforms.nearKey.value.setRGB(1, 1, 1);
  sea.update(new Vector3(100, 20, 200), 900);
  assert.deepEqual([sea.mesh.position.x, sea.mesh.position.y, sea.mesh.position.z], [100, FAR_SEA_LEVEL, 200]);
  assert.equal(sea.mesh.scale.x, 900);
  const dim = seaRadiance(new Color(0.1, 0.1, 0.1), new Color(0.1, 0.1, 0.1), new Color());
  const bright = seaRadiance(new Color(2, 2, 2), new Color(3, 3, 3), new Color());
  assert.ok(bright.g > dim.g);
  assert.ok(seaRadiance(new Color(50, 50, 50), new Color(50, 50, 50), new Color()).g <= 0.85 + 1e-6);
  sea.dispose();
});

test('the tallest landmarks, the Spindle among them, get beacons that grow with their height', () => {
  const overworld = GAME_CONTENT.levels.get('overworld');
  assert.ok(overworld);
  const landmarks = runPlan(planLandmarks(overworld, GAME_CONTENT, overworld.scene));
  assert.ok(landmarks.length >= 5);
  for (let index = 1; index < landmarks.length; index++) assert.ok((landmarks[index - 1] as Landmark).height >= (landmarks[index] as Landmark).height);
  const spindle = overworld.objects.find((placement) => placement.objectId === 'spindle-light');
  assert.ok(spindle);
  assert.ok(landmarks.some((landmark) => Math.abs(landmark.x - spindle.position.x) < 3 && Math.abs(landmark.z - spindle.position.y) < 3 && landmark.y > 12));
  assert.ok(beaconPixels(18) > beaconPixels(13));
  assert.ok(beaconPixels(1000) <= 30);
  const beacons = new LandmarkBeacons(landmarks);
  assert.equal(beacons.points.geometry.getAttribute('size').count, landmarks.length);
  beacons.dispose();
});

test('the Spindle is a needle whose tip stands about eighty units up, drawn in the far view inside its own outline', () => {
  const overworld = GAME_CONTENT.levels.get('overworld');
  assert.ok(overworld);
  const landmarks = runPlan(planLandmarks(overworld, GAME_CONTENT, overworld.scene));
  const needles = landmarks.filter((landmark) => landmark.height >= NEEDLE_FROM);
  assert.equal(needles.length, 1);
  const spindle = needles[0] as Landmark;
  const placement = overworld.objects.find((object) => object.objectId === 'spindle-light');
  assert.ok(placement);
  assert.ok(Math.abs(spindle.x - placement.position.x) < 3 && Math.abs(spindle.z - placement.position.y) < 3);
  assert.ok(spindle.y >= 78 && spindle.y <= 100, String(spindle.y));
  assert.ok(landmarks.every((landmark) => landmark === spindle || landmark.y < spindle.y / 2));
  const beacons = new LandmarkBeacons(landmarks);
  assert.ok(beacons.needles);
  assert.equal(beacons.needles.parent, beacons.points);
  const positions = beacons.needles.geometry.getAttribute('position');
  const box = new Box3().setFromBufferAttribute(positions as never);
  assert.ok(box.max.y < spindle.y && box.max.y > spindle.y - 3, String(box.max.y));
  const unit = spindle.height / SPINDLE_HEIGHT_VOXELS;
  const foot = spindle.y - spindle.height;
  for (let index = 0; index < positions.count; index++) {
    const voxel = Math.round((positions.getY(index) - foot) / unit);
    const reach = Math.hypot(positions.getX(index) - spindle.x, positions.getZ(index) - spindle.z) / unit;
    const outline = voxel > SPINDLE_CROWN ? 1.4 : spindleRadius(voxel) - 0.71;
    assert.ok(reach < outline, `${voxel}: ${reach} over ${outline}`);
  }
  beacons.dispose();
});
