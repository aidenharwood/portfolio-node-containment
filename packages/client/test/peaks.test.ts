import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT, type ResolvedLevel, type TileKindId, type TileLayout } from '@containment/shared';
import { rasterIndexAt, rasterizeScene } from '../src/render/far/sceneRaster.ts';
import { ownedLayoutOf, planChunkStructure } from '../src/render/world/chunkStructure.ts';
import { decalsForLevel } from '../src/render/world/floorDecals.ts';
import { centreRise, PEAK_MAX, peakFieldOf, peakRise } from '../src/render/world/peaks.ts';
import { FLOOR_LAYERS, STEP_VOXELS, TILE_RESOLUTION, WALL_LAYERS, ZONE_VOXEL_SIZE } from '../src/render/world/worldScale.ts';

const R = TILE_RESOLUTION;

test('a peak rises only well inside the rock, along its ridges and never past its cap', () => {
  assert.equal(peakRise(1, 1), 0);
  assert.equal(peakRise(2, 1), 0);
  assert.ok(peakRise(6, 1) > 0);
  assert.ok(peakRise(12, 1) >= peakRise(6, 1));
  assert.ok(peakRise(30, 1) <= PEAK_MAX);
  assert.equal(peakRise(12, 0), 0);
});

const SIZE = 48;
const massif: TileLayout = {
  width: SIZE,
  height: SIZE,
  tileAt: ({ x, y }) => (x >= 2 && y >= 2 && x < SIZE - 2 && y < SIZE - 2 ? 'rock' : 'grass') as TileKindId,
  heightAt: () => 3,
};

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
      if (edge <= 2) assert.equal(rise, 0, `${vx},${vz}`);
      highest = Math.max(highest, rise);
    }
  }
  assert.ok(highest >= 24, String(highest));
  assert.ok(highest <= PEAK_MAX);
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
