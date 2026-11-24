import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TileKindId, TilePoint } from '@containment/shared';
import { buildTileVolume, type OwnedLayout } from '../src/render/world/levelVoxels.ts';
import { STEP_VOXELS, TILE_RESOLUTION, ZONE_VOLUME_HEIGHT } from '../src/render/world/worldScale.ts';
import { VOXEL_EMPTY, VOXEL_SOLID } from '../src/render/voxel/voxelKinds.ts';

const R = TILE_RESOLUTION;

const layoutOf = (rows: readonly (readonly TileKindId[])[], heights: readonly (readonly number[])[] = [], owned: (point: TilePoint) => boolean = () => true): OwnedLayout => ({
  width: rows[0]?.length ?? 0,
  height: rows.length,
  tileAt: ({ x, y }) => rows[y]?.[x] ?? 'void',
  heightAt: ({ x, y }) => heights[y]?.[x] ?? 0,
  ownerAt: (point) => (rows[point.y]?.[point.x] && owned(point) ? 'district' : undefined),
});

const tileVoxels = (layout: OwnedLayout, tile: TilePoint): string => {
  const volume = buildTileVolume(layout, { x: tile.x, y: tile.y, width: 1, height: 1 });
  const voxels: string[] = [];
  for (let vy = 0; vy < ZONE_VOLUME_HEIGHT; vy++) {
    for (let lz = 0; lz < R; lz++) {
      for (let lx = 0; lx < R; lx++) {
        const vx = tile.x * R + lx;
        const vz = tile.y * R + lz;
        voxels.push(`${volume.kindAt(vx, vy, vz)}:${volume.colorAt(vx, vy, vz)}`);
      }
    }
  }
  return voxels.join(',');
};

const besideEast = (kind: TileKindId, east: TileKindId, eastOwned: boolean): OwnedLayout =>
  layoutOf(
    [
      ['grass', kind, 'void'],
      ['grass', kind, east],
      ['grass', kind, 'void'],
    ],
    [],
    (point) => eastOwned || point.x < 2,
  );

for (const kind of ['fence', 'brick', 'paving', 'barrier', 'rock'] as const) {
  test(`a ${kind} tile beside land water no district owns is drawn as it was beside void`, () => {
    const centre = { x: 1, y: 1 };
    assert.equal(tileVoxels(besideEast(kind, 'water', false), centre), tileVoxels(besideEast(kind, 'void', false), centre));
  });
}

test('a district tile beside water its own district owns still sees the water', () => {
  const centre = { x: 1, y: 1 };
  assert.notEqual(tileVoxels(besideEast('paving', 'water', true), centre), tileVoxels(besideEast('paving', 'void', true), centre));
});

test('earth under a raised tile drops to the height of lower land water beside it', () => {
  const layout = layoutOf(
    [
      ['water', 'water', 'water'],
      ['water', 'grass', 'water'],
      ['water', 'water', 'water'],
    ],
    [
      [1, 1, 1],
      [1, 3, 1],
      [1, 1, 1],
    ],
    (point) => point.x === 1 && point.y === 1,
  );
  const volume = buildTileVolume(layout, { x: 1, y: 1, width: 1, height: 1 });
  const vx = R + 3;
  const vz = R + 3;
  assert.equal(volume.kindAt(vx, STEP_VOXELS, vz), VOXEL_SOLID);
  assert.equal(volume.kindAt(vx, STEP_VOXELS * 3 - 1, vz), VOXEL_SOLID);
  assert.equal(volume.kindAt(vx, STEP_VOXELS - 1, vz), VOXEL_EMPTY);
});


const topOf = (volume: ReturnType<typeof buildTileVolume>, vx: number, vz: number): number => {
  for (let vy = volume.height - 1; vy >= 0; vy--) if (volume.kindAt(vx, vy, vz) !== VOXEL_EMPTY) return vy;
  return -1;
};

test('natural ground one step below its neighbour slopes up to meet it instead of standing as a stair', () => {
  const layout = layoutOf(
    [
      ['grass', 'grass', 'grass', 'grass'],
      ['grass', 'grass', 'grass', 'grass'],
      ['grass', 'grass', 'grass', 'grass'],
    ],
    [
      [1, 1, 2, 2],
      [1, 1, 2, 2],
      [1, 1, 2, 2],
    ],
  );
  const volume = buildTileVolume(layout, { x: 0, y: 0, width: 4, height: 3 });
  const vz = R + 3;
  const profile = Array.from({ length: R * 2 }, (_, index) => topOf(volume, R + index, vz));
  for (let index = 1; index < profile.length; index++) assert.ok(Math.abs((profile[index] as number) - (profile[index - 1] as number)) <= 1, profile.join(','));
  assert.equal(profile[0], STEP_VOXELS + 1);
  assert.equal(profile[profile.length - 1], STEP_VOXELS * 2 + 1);
});

test('flat natural ground and paving beside a rise keep their level tops', () => {
  const layout = layoutOf(
    [
      ['grass', 'grass', 'paving', 'grass'],
      ['grass', 'grass', 'paving', 'grass'],
      ['grass', 'grass', 'paving', 'grass'],
    ],
    [
      [1, 1, 1, 2],
      [1, 1, 1, 2],
      [1, 1, 1, 2],
    ],
  );
  const volume = buildTileVolume(layout, { x: 0, y: 0, width: 4, height: 3 });
  for (let lx = 0; lx < R; lx++) {
    assert.equal(topOf(volume, lx, R + 3), STEP_VOXELS + 1);
    assert.equal(topOf(volume, 2 * R + lx, R + 3) <= STEP_VOXELS + 2, true);
  }
});
