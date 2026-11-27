import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHUNK_SIZE, TILE_KIND_IDS, type RegionId, type TileKindId } from '@containment/shared';
import { FIXTURE_CONTENT } from '@containment/shared/fixtures';
import { Color } from 'three';
import { farLevelOf, planFarBuild } from '../src/render/far/farBuild.ts';
import { farTileColor } from '../src/render/far/farPalette.ts';
import { coarsenRows, createFarCells, FAR_SEA_FLOOR, FAR_SINK, meshFarSector, type FarCellSource, type FarTileArrays } from '../src/render/far/farTerrainMesher.ts';
import { createSceneRaster, kindIndexOf, rasterizeScene, runPlan, type SceneRaster } from '../src/render/far/sceneRaster.ts';
import { buildTileVolume, type OwnedLayout } from '../src/render/world/levelVoxels.ts';
import { STEP_HEIGHT, TILE_RESOLUTION, ZONE_VOLUME_HEIGHT } from '../src/render/world/worldScale.ts';
import { VOXEL_EMPTY } from '../src/render/voxel/voxelKinds.ts';

const wilds = FIXTURE_CONTENT.levels.get('fx-wilds');
assert.ok(wilds);

function syntheticRaster(width: number, height: number, paint: (x: number, y: number) => readonly [TileKindId, number]): SceneRaster {
  const raster = createSceneRaster({ x: 0, y: 0, width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [kind, step] = paint(x, y);
      raster.kinds[y * width + x] = kindIndexOf(kind);
      raster.heights[y * width + x] = step;
    }
  }
  return raster;
}

const plainSource = (raster: SceneRaster): FarCellSource => ({
  raster,
  topOffsets: new Float32Array(TILE_KIND_IDS.length),
  slack: new Float32Array(TILE_KIND_IDS.length),
  colorOf: (_kind, _x, _y, out) => out.fill(0.5),
  sideOf: (_kind, _x, _y, top, out) => {
    for (let channel = 0; channel < 3; channel++) out[channel] = (top[channel] as number) * 0.8;
  },
  moodAt: () => 0,
});

interface Quad {
  readonly normal: readonly [number, number, number];
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
  readonly chunk: readonly [number, number];
  readonly facade: readonly number[];
}

function quadsOf(tile: FarTileArrays): Quad[] {
  const quads: Quad[] = [];
  for (let start = 0; start < tile.positions.length / 3; start += 4) {
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (let corner = start; corner < start + 4; corner++) {
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis] as number, tile.positions[corner * 3 + axis] as number);
        max[axis] = Math.max(max[axis] as number, tile.positions[corner * 3 + axis] as number);
      }
    }
    quads.push({ normal: [tile.normals[start * 3] as number, tile.normals[start * 3 + 1] as number, tile.normals[start * 3 + 2] as number], min, max, chunk: [tile.chunks[start * 2] as number, tile.chunks[start * 2 + 1] as number], facade: [...tile.facades.subarray(start * 4, start * 4 + 4)] });
  }
  return quads;
}

function meshAll(raster: SceneRaster, cell: 4 | 8 = 4): Quad[] {
  const cells = createFarCells(raster, cell);
  coarsenRows(plainSource(raster), cells, 0, cells.rows);
  return quadsOf(meshFarSector(cells, { column: 0, row: 0, columns: cells.columns, rows: cells.rows }));
}

const tops = (quads: readonly Quad[]): Quad[] => quads.filter((quad) => quad.normal[1] > 100);
const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-5;

test('flat far ground merges into one top per row per chunk, and no quad crosses a chunk edge', () => {
  const quads = meshAll(syntheticRaster(64, 32, () => ['grass', 1]));
  assert.equal(tops(quads).length, 8 * 2);
  for (const quad of quads) {
    const inward = (axis: 0 | 2): number => (quad.min[axis] + quad.max[axis]) / 2 + 0.5 - Math.sign(quad.normal[axis]) * 0.25;
    const chunkX = Math.floor(inward(0) / CHUNK_SIZE);
    const chunkY = Math.floor(inward(2) / CHUNK_SIZE);
    assert.deepEqual(quad.chunk, [chunkX, chunkY]);
    assert.ok(quad.min[0] + 0.5 >= chunkX * CHUNK_SIZE - 1e-3 && quad.max[0] + 0.5 <= (chunkX + 1) * CHUNK_SIZE + 1e-3);
    assert.ok(quad.min[2] + 0.5 >= chunkY * CHUNK_SIZE - 1e-3 && quad.max[2] + 0.5 <= (chunkY + 1) * CHUNK_SIZE + 1e-3);
  }
  for (const top of tops(quads)) assert.ok(close(top.min[1], STEP_HEIGHT - FAR_SINK));
  assert.ok(quads.filter((quad) => quad.normal[1] === 0).every((side) => close(side.min[1], FAR_SEA_FLOOR)), 'only the outer coast has sides');
});

test('a cell that is at least three eighths wall keeps the wall height, so towers survive', () => {
  const quads = meshAll(syntheticRaster(32, 32, (x, y) => (x < 4 && y < 4 && (x < 2 || y === 0) ? ['cladding', 6] : ['grass', 1])));
  const tower = tops(quads).find((quad) => quad.min[0] < 0 && quad.min[2] < 0 && quad.max[0] <= 3.5);
  assert.ok(tower);
  assert.ok(close(tower.min[1], 6 * STEP_HEIGHT - FAR_SINK));
});

test('building sides carry their facade material, top and street level for the window pattern, and nothing else does', () => {
  const quads = meshAll(syntheticRaster(32, 32, (x, y) => (x >= 8 && x < 16 && y >= 8 && y < 16 ? ['cladding', 6] : x >= 24 ? ['rock', 4] : ['asphalt', 2])));
  const sides = quads.filter((quad) => quad.normal[1] === 0 && quad.min[0] >= 7.4 && quad.max[0] <= 15.6 && quad.min[2] >= 7.4 && quad.max[2] <= 15.6);
  assert.ok(sides.length >= 8);
  for (const side of sides) assert.deepEqual(side.facade, [4, 6 * 4 + 1, 2 * 4 + 2, 0]);
  for (const quad of quads) if (!sides.includes(quad)) assert.deepEqual(quad.facade, [0, 0, 0, 0]);
});

test('sea at step zero is left to the sea plane, and land beside it drops to the sea floor', () => {
  const quads = meshAll(syntheticRaster(32, 32, (x) => (x < 16 ? ['water', 0] : ['grass', 0])));
  assert.ok(tops(quads).every((quad) => quad.min[0] >= 15.5 - 1e-3));
  const coast = quads.filter((quad) => quad.normal[0] < -100);
  assert.equal(coast.length, 8);
  for (const side of coast) assert.ok(close(side.min[1], FAR_SEA_FLOOR) && close(side.max[1], -FAR_SINK));
});

test('sides face only lower neighbours and stop at their height, also across sectors', () => {
  const raster = syntheticRaster(32, 32, (x) => (x < 8 ? ['grass', 3] : ['grass', 1]));
  const cells = createFarCells(raster, 4);
  coarsenRows(plainSource(raster), cells, 0, cells.rows);
  const west = quadsOf(meshFarSector(cells, { column: 0, row: 0, columns: 2, rows: cells.rows }));
  const east = quadsOf(meshFarSector(cells, { column: 2, row: 0, columns: cells.columns - 2, rows: cells.rows }));
  const steps = west.filter((quad) => quad.normal[0] > 100 && close(quad.min[0], 7.5));
  assert.equal(steps.length, 8);
  for (const side of steps) assert.ok(close(side.min[1], STEP_HEIGHT - FAR_SINK) && close(side.max[1], 3 * STEP_HEIGHT - FAR_SINK));
  assert.ok(!east.some((quad) => quad.normal[0] < -100 && close(quad.min[0], 7.5)), 'the lower side has no face back up');
});

test('at a chunk edge a far cell hangs a skirt down to the lowest near ground beyond it', () => {
  const raster = syntheticRaster(64, 32, (x, y) => (x === 32 && y === 2 ? ['grass', 0] : ['grass', 2]));
  const quads = meshAll(raster);
  const skirt = quads.find((quad) => quad.normal[0] > 100 && close(quad.min[0], 31.5) && quad.min[2] < 4);
  assert.ok(skirt);
  assert.ok(close(skirt.max[1], 2 * STEP_HEIGHT - FAR_SINK));
  assert.ok(close(skirt.min[1], 0));
  assert.equal(quads.filter((quad) => quad.normal[0] > 100 && close(quad.min[0], 31.5)).length, 1);
});

function paintedBlock(kind: TileKindId, region: RegionId, tx: number, ty: number): [number, number, number] {
  const layout: OwnedLayout = { width: 4096, height: 4096, tileAt: ({ x, y }) => (x >= tx - 1 && y >= ty - 1 && x <= tx + 4 && y <= ty + 4 ? kind : 'void'), heightAt: () => 0, regionAt: () => region };
  const volume = buildTileVolume(layout, { x: tx, y: ty, width: 4, height: 4 });
  const color = new Color();
  const sum: [number, number, number] = [0, 0, 0];
  let count = 0;
  const R = TILE_RESOLUTION;
  for (let vz = ty * R; vz < (ty + 4) * R; vz++) {
    for (let vx = tx * R; vx < (tx + 4) * R; vx++) {
      for (let vy = ZONE_VOLUME_HEIGHT - 1; vy >= 0; vy--) {
        if (volume.kindAt(vx, vy, vz) === VOXEL_EMPTY) continue;
        color.setHex(volume.colorAt(vx, vy, vz));
        sum[0] += color.r;
        sum[1] += color.g;
        sum[2] += color.b;
        count++;
        break;
      }
    }
  }
  return [sum[0] / count, sum[1] / count, sum[2] / count];
}

function farBlock(kind: TileKindId, region: RegionId, tx: number, ty: number): [number, number, number] {
  const sum: [number, number, number] = [0, 0, 0];
  for (let y = ty; y < ty + 4; y++) {
    for (let x = tx; x < tx + 4; x++) {
      const color = farTileColor(kind, region, x, y);
      for (let channel = 0; channel < 3; channel++) sum[channel] = (sum[channel] as number) + (color[channel] as number) / 16;
    }
  }
  return sum;
}

test('far ground takes the colour the near painter gives that ground in its region', () => {
  for (const [kind, region, tx, ty] of [['grass', 'kestrel-reach', 400, 760], ['grass', 'harrow-terraces', 210, 455], ['dirt', 'wreckfield', 700, 150], ['gravel', 'glass-steppe', 880, 480], ['asphalt', 'halcyon', 300, 200]] as const) {
    const painted = paintedBlock(kind, region, tx, ty);
    const far = farBlock(kind, region, tx, ty);
    for (let channel = 0; channel < 3; channel++) assert.ok(Math.abs((far[channel] as number) - (painted[channel] as number)) < 0.1 * (painted[channel] as number) + 0.002, `${kind} in ${region}: far ${far.map((value) => value.toFixed(4))} painted ${painted.map((value) => value.toFixed(4))}`);
  }
});

test('a far build of a land level meshes every sector inside the scene with moods it can light', () => {
  const raster = rasterizeScene(wilds.scene);
  const build = runPlan(planFarBuild(farLevelOf(wilds), raster, 4));
  assert.ok(build.tiles.length > 0);
  assert.ok(build.moods.length > 0 && build.moods.length <= 32);
  for (const tile of build.tiles) {
    assert.equal(tile.positions.length / 3, tile.colors.length / 3);
    assert.equal(tile.indices.length % 6, 0);
    for (const mood of tile.moods) assert.ok(mood < build.moods.length);
    assert.ok(tile.min[0] >= raster.x - 0.5 - 1e-3 && tile.max[0] <= raster.x + raster.width - 0.5 + 1e-3);
  }
});
