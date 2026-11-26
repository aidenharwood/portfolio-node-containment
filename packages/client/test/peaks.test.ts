import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT, type ResolvedLevel, type TileKindId, type TileLayout } from '@containment/shared';
import { CAMERA_LIMITS } from '../src/render/cameraRig.ts';
import { planLandmarks } from '../src/render/far/farLandmarks.ts';
import { rasterIndexAt, rasterizeScene, runPlan } from '../src/render/far/sceneRaster.ts';
import { ownedLayoutOf, planChunkStructure } from '../src/render/world/chunkStructure.ts';
import { decalsForLevel } from '../src/render/world/floorDecals.ts';
import { groundAt } from '../src/render/world/ground.ts';
import { centreRise, PEAK_MAX, peakFieldOf, peakRise } from '../src/render/world/peaks.ts';
import { FLOOR_LAYERS, STEP_VOXELS, TILE_RESOLUTION, WALL_LAYERS, ZONE_VOXEL_SIZE } from '../src/render/world/worldScale.ts';

const R = TILE_RESOLUTION;

test('a peak rises from the foot of the rock along its ridges, as far as the rock stands over its foot, never past its cap', () => {
  assert.equal(peakRise(0, 1), 0);
  assert.ok(peakRise(1, 1) > 0);
  assert.ok(peakRise(1, 1) < peakRise(6, 1));
  assert.ok(peakRise(12, 1) >= peakRise(6, 1));
  assert.ok(peakRise(30, 1) <= PEAK_MAX);
  assert.equal(peakRise(12, 0), 0);
  assert.equal(peakRise(12, 1, 2), 0);
  assert.ok(peakRise(12, 1, 6) > 0 && peakRise(12, 1, 6) < peakRise(12, 1, 9));
  assert.equal(peakRise(12, 1, 9), peakRise(12, 1, 14));
});

const SIZE = 48;
const inRock = (x: number, y: number): boolean => x >= 2 && y >= 2 && x < SIZE - 2 && y < SIZE - 2;
const massif: TileLayout = {
  width: SIZE,
  height: SIZE,
  tileAt: ({ x, y }) => (inRock(x, y) ? 'rock' : 'grass') as TileKindId,
  heightAt: ({ x, y }) => (inRock(x, y) ? 15 : 3),
};
const plateau: TileLayout = { ...massif, heightAt: ({ x, y }) => (inRock(x, y) ? 15 : 13) };

test('a field of rock is drawn as peaks that fall to the ground around it', () => {
  const field = peakFieldOf(massif);
  assert.equal(peakFieldOf(massif), field);
  let highest = 0;
  for (let vz = 0; vz < SIZE * R; vz++) {
    for (let vx = 0; vx < SIZE * R; vx++) {
      const rise = field.columnRise(vx, vz);
      const tx = Math.floor(vx / R);
      const ty = Math.floor(vz / R);
      const edge = Math.min(tx, ty, SIZE - 1 - tx, SIZE - 1 - ty);
      if (edge < 2) assert.equal(rise, 0, `${vx},${vz}`);
      if (edge === 2) assert.ok(rise <= 6, `${vx},${vz}: ${rise}`);
      highest = Math.max(highest, rise);
    }
  }
  assert.ok(highest >= 24, String(highest));
  assert.ok(highest <= PEAK_MAX);
  const low = peakFieldOf(plateau);
  for (let vz = 0; vz < SIZE * R; vz += 3) for (let vx = 0; vx < SIZE * R; vx += 3) assert.equal(low.columnRise(vx, vz), 0);
});

test('the Massif is drawn above its wall top in the chunks and in the far raster alike', () => {
  const overworld = GAME_CONTENT.levels.get('overworld') as ResolvedLevel;
  const layout = ownedLayoutOf(overworld, overworld.scene);
  const region = { x: 352, y: 288, width: 32, height: 32 };
  const plan = planChunkStructure(layout, decalsForLevel(overworld), region);
  for (const step of plan.steps) step();
  const structure = plan.result();
  let top = 0;
  for (const band of structure.walls) top = Math.max(top, band.parts.layers.solid?.geometry.boundingBox?.max.y ?? 0);
  const base = overworld.scene.heightAt({ x: 368, y: 304 });
  const wallTop = (base * STEP_VOXELS + WALL_LAYERS) * ZONE_VOXEL_SIZE;
  assert.ok(top > wallTop + 3, `${top} over ${wallTop}`);
  const raster = rasterizeScene(overworld.scene);
  let risen = 0;
  for (let y = region.y; y < region.y + region.height; y++) {
    for (let x = region.x; x < region.x + region.width; x++) {
      const rise = raster.rises[rasterIndexAt(raster, x, y)] ?? 0;
      assert.equal(rise, overworld.scene.tileAt({ x, y }) === 'rock' ? centreRise(overworld.scene, x, y) : 0);
      if (rise > 0) risen++;
    }
  }
  assert.ok(risen > 200, String(risen));
  assert.ok(FLOOR_LAYERS > 0);
});

const overworld = GAME_CONTENT.levels.get('overworld') as ResolvedLevel;
const scene = overworld.scene;
const isRock = (x: number, y: number): boolean => scene.tileAt({ x, y }) === 'rock';

test('the Massif breaks off the grid lines in spurs and lobes and climbs from its foot in ledges', () => {
  const south: number[] = [];
  for (let x = 386; x <= 555; x++) {
    let y = 720;
    while (y > 560 && !isRock(x, y)) y--;
    south.push(y);
  }
  assert.ok(Math.max(...south) - Math.min(...south) >= 12, `south foot ${Math.min(...south)}..${Math.max(...south)}`);
  assert.ok(south.filter((y) => y > 648).length >= south.length * 0.4, `${south.filter((y) => y > 648).length} of ${south.length} off the line`);
  const west: number[] = [];
  for (let y = 386; y <= 630; y++) {
    let x = 250;
    while (x < 340 && !isRock(x, y)) x++;
    west.push(x);
  }
  assert.ok(Math.max(...west) - Math.min(...west) >= 12, `west foot ${Math.min(...west)}..${Math.max(...west)}`);
  assert.ok(west.filter((x) => x < 312).length >= west.length * 0.25, `${west.filter((x) => x < 312).length} of ${west.length} off the line`);
  const levels = new Map<number, number>();
  let rock = 0;
  for (let y = 4 * 64; y < 10 * 64; y++) {
    for (let x = 5 * 64; x < 13 * 64; x++) {
      if (!isRock(x, y)) continue;
      rock++;
      const level = scene.heightAt({ x, y });
      levels.set(level, (levels.get(level) ?? 0) + 1);
    }
  }
  assert.ok([...levels.values()].filter((count) => count >= 1000).length >= 4, JSON.stringify([...levels]));
  assert.ok((levels.get(15) ?? 0) <= rock * 0.7, `${levels.get(15)} of ${rock} at the top step`);
});

test('the Spindle rises over the Massif from its southern foot, Kestrel Commons and Harrowgate at the lowest camera', () => {
  const spindle = runPlan(planLandmarks(overworld, GAME_CONTENT, scene))[0];
  assert.ok(spindle && spindle.height > 40);
  const field = peakFieldOf(scene);
  const crest = WALL_LAYERS * ZONE_VOXEL_SIZE;
  const top = (x: number, y: number): number => {
    const tx = Math.round(x);
    const ty = Math.round(y);
    const ground = scene.heightAt({ x: tx, y: ty }) * STEP_VOXELS * ZONE_VOXEL_SIZE;
    return isRock(tx, ty) ? ground + crest + field.columnRise(tx * R + R / 2, ty * R + R / 2) * ZONE_VOXEL_SIZE : ground;
  };
  const pitch = CAMERA_LIMITS.pitch.minimum;
  const distance = CAMERA_LIMITS.distance.maximum;
  const hiddenFrom = (fx: number, fy: number): number => {
    const length = Math.hypot(spindle.x - fx, spindle.z - fy);
    const cx = fx - ((spindle.x - fx) / length) * distance * Math.cos(pitch);
    const cy = fy - ((spindle.z - fy) / length) * distance * Math.cos(pitch);
    const eye = Math.max(groundAt(scene, fx, fy) + distance * Math.sin(pitch), groundAt(scene, cx, cy) + CAMERA_LIMITS.clearance);
    const span = Math.hypot(spindle.x - cx, spindle.z - cy);
    let hidden = 0;
    for (let along = 2; along < span - 6; along += 0.5) hidden = Math.max(hidden, eye + ((top(cx + ((spindle.x - cx) * along) / span, cy + ((spindle.z - cy) * along) / span) - eye) * span) / along);
    return hidden - (spindle.y - spindle.height);
  };
  assert.ok(hiddenFrom(505, 650) < 15, `southern foot hides ${hiddenFrom(505, 650)}`);
  assert.ok(hiddenFrom(360, 712) < 30, `Kestrel Commons hides ${hiddenFrom(360, 712)}`);
  assert.ok(hiddenFrom(190, 420) < 30, `Harrowgate hides ${hiddenFrom(190, 420)}`);
});
