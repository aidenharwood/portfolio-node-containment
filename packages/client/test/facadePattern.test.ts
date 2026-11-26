import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type TileKindId, type WallMaterialId } from '@containment/shared';
import { rooflineGlow, towerBlock, towerFacade, wallFacade, windowGlow, type FacadeVoxel } from '../src/render/far/facadePattern.ts';
import { buildChunkPlaceholder } from '../src/render/world/chunkPlaceholder.ts';
import { buildTileVolume, litWindowGlow, rooflineNeonGlow, type OwnedLayout, type Side } from '../src/render/world/levelVoxels.ts';
import { TILE_RESOLUTION } from '../src/render/world/worldScale.ts';
import { VOXEL_EMISSIVE, VOXEL_EMPTY } from '../src/render/voxel/voxelKinds.ts';
import type { DenseVolume } from '../src/render/voxel/denseVolume.ts';
import { Mesh } from 'three';

const R = TILE_RESOLUTION;
const STREET = 2;
const RAISED = 6;
const INWARD: Readonly<Record<Side, readonly [number, number]>> = { north: [0, 1], south: [0, -1], west: [1, 0], east: [-1, 0] };

function towerLayout(material: WallMaterialId): OwnedLayout {
  const inside = (x: number, y: number): boolean => x >= 4 && x < 10 && y >= 4 && y < 10;
  return {
    width: 16,
    height: 16,
    tileAt: ({ x, y }) => (x < 0 || y < 0 || x >= 16 || y >= 16 ? 'void' : inside(x, y) ? material : 'asphalt'),
    heightAt: ({ x, y }) => (inside(x, y) ? RAISED : STREET),
    interiorAt: () => false,
  };
}

function rowLayout(material: WallMaterialId): OwnedLayout {
  return {
    width: 16,
    height: 10,
    tileAt: ({ x, y }): TileKindId => (x < 0 || y < 0 || x >= 16 || y >= 10 ? 'void' : y === 4 && x >= 2 && x < 14 ? material : y < 4 ? 'concrete' : 'asphalt'),
    heightAt: () => STREET,
    interiorAt: ({ y }) => y < 4,
  };
}

function paintedAt(volume: DenseVolume, side: Side, vx: number, vy: number, vz: number): FacadeVoxel | null {
  const [ix, iz] = INWARD[side];
  for (const [x, z] of [[vx, vz], [vx + ix, vz + iz]] as const) {
    const kind = volume.kindAt(x, vy, z);
    if (kind !== VOXEL_EMPTY) return { color: volume.colorAt(x, vy, z), emissive: kind === VOXEL_EMISSIVE };
  }
  return null;
}

interface Face {
  readonly side: Side;
  readonly tile: readonly [number, number];
  readonly voxel: (step: number) => readonly [number, number, number];
}

const towerFaces: readonly Face[] = [5, 6, 7, 8].flatMap((t) => [
  { side: 'north' as const, tile: [t, 4] as const, voxel: (lx: number) => [t * R + lx, 0, 4 * R] as const },
  { side: 'south' as const, tile: [t, 9] as const, voxel: (lx: number) => [t * R + lx, 0, 9 * R + R - 1] as const },
  { side: 'east' as const, tile: [9, t] as const, voxel: (lz: number) => [9 * R + R - 1, 0, t * R + lz] as const },
]);

for (const material of ['cladding', 'blockwork', 'brick'] as const) {
  test(`the tower facade mirror matches the painted ${material} tower voxel for voxel`, () => {
    const volume = buildTileVolume(towerLayout(material), { x: 4, y: 4, width: 6, height: 6 });
    const street = STREET * 4;
    const top = RAISED * 4 + 17;
    let compared = 0;
    let glowing = 0;
    for (const face of towerFaces) {
      const [tx, ty] = face.tile;
      for (let step = 0; step < R; step++) {
        const [vx, , vz] = face.voxel(step);
        const along = face.side === 'east' ? vz : vx;
        for (let vy = street + 2; vy < top; vy++) {
          const painted = paintedAt(volume, face.side, vx, vy, vz);
          const mirror = towerFacade(material, face.side, along, vy, street, top, towerBlock(tx, ty));
          assert.deepEqual(painted, mirror, `${face.side} face of ${tx},${ty} at along ${along}, height ${vy}`);
          compared++;
          if (mirror.emissive) glowing++;
        }
      }
    }
    assert.ok(compared > 2500);
    assert.ok(glowing > compared * 0.05, 'some of the tower is lit');
  });
}

for (const material of ['cladding', 'brick', 'wall'] as const) {
  test(`the wall facade mirror matches the painted windows, neon and bands of a ${material} building`, () => {
    const volume = buildTileVolume(rowLayout(material), { x: 2, y: 4, width: 12, height: 1 });
    const floor = STREET * 4 + 2;
    let features = 0;
    for (let tx = 3; tx < 13; tx++) {
      for (let lx = 0; lx < R; lx++) {
        for (let h = 2; h < 15; h++) {
          const mirror = wallFacade(material, tx, 4, 'south', h, lx);
          if (!mirror) continue;
          features++;
          assert.deepEqual(paintedAt(volume, 'south', tx * R + lx, floor + h, 4 * R + R - 1), mirror, `tile ${tx} at u ${lx}, h ${h}`);
        }
      }
    }
    assert.ok(features > 40);
  });
}

test('the window and roofline glows agree with the near painter everywhere', () => {
  for (const material of ['cladding', 'blockwork', 'brick', 'wall'] as const) {
    for (const side of ['north', 'south', 'east', 'west'] as const) {
      for (let tx = 0; tx < 60; tx += 3) {
        for (let ty = 0; ty < 60; ty += 5) {
          assert.equal(windowGlow(material, tx, ty, side), litWindowGlow(material, tx, ty, side));
          assert.equal(rooflineGlow(material, tx, ty, side), rooflineNeonGlow(material, tx, ty, side));
        }
      }
    }
  }
});

test('chunk placeholders light the windows of towers and buildings', () => {
  const layer = (group: ReturnType<typeof buildChunkPlaceholder>, name: string) => group?.children.find((child): child is Mesh => child instanceof Mesh && child.name === name) ?? null;
  const tower = buildChunkPlaceholder(towerLayout('cladding'), { x: 0, y: 0, width: 16, height: 16 });
  const lit = layer(tower, 'emissive');
  assert.ok(lit, 'a tower placeholder has an emissive layer');
  assert.ok(lit.geometry.getIndex()!.count >= 6 * 20, 'with many lit panes');
  const row = buildChunkPlaceholder(rowLayout('brick'), { x: 0, y: 0, width: 16, height: 10 });
  assert.ok(layer(row, 'emissive'), 'a lit building placeholder has an emissive layer');
  const plain = buildChunkPlaceholder({ width: 8, height: 8, tileAt: () => 'grass', heightAt: () => 1 }, { x: 0, y: 0, width: 8, height: 8 });
  assert.equal(layer(plain, 'emissive'), null);
});
