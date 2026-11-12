import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decalIndex, type FloorDecal } from '@containment/shared';
import { decalColor } from '../src/render/world/floorDecals.ts';
import { lighten } from '../src/render/voxel/palette.ts';

const BASE = 0x202020;

function sample(decals: readonly FloorDecal[], vx: number, vz: number, grain = 0.5) {
  const tx = Math.floor(vx / 16);
  const ty = Math.floor(vz / 16);
  const cells = decalIndex(decals).get(`${tx},${ty}`) ?? [];
  return decalColor(cells, vx - tx * 16, vz - ty * 16, BASE, grain);
}

test('a bordered rug colours its edge and leaves the middle', () => {
  const rug: FloorDecal = { kind: 'rug', rect: { x: 0, y: 0, width: 3, height: 3 }, pattern: 'border' };
  assert.equal(sample([rug], 1, 24)?.color, 0x7a2f3a);
  assert.equal(sample([rug], 24, 24), null);
});

test('compass paints the inner disc and leaves off-spoke voxels', () => {
  const rect = { x: 0, y: 0, width: 5, height: 5 };
  const compass: FloorDecal = { kind: 'inlay', rect, pattern: 'compass' };
  assert.equal(sample([compass], 40, 40)?.color, lighten(0xc9b27a, 0.35));
  assert.equal(sample([compass], 62, 50), null);
  assert.equal(sample([compass], 40 + 34, 40)?.color, 0xc9b27a);
});

test('a later decal overrides an earlier one', () => {
  const rect = { x: 0, y: 0, width: 1, height: 1 };
  const decals: FloorDecal[] = [
    { kind: 'rug', rect },
    { kind: 'lane-paint', rect },
  ];
  assert.equal(sample(decals, 5, 5)?.color, 0xd8c040);
});

test('alien veins report emissive', () => {
  const vein: FloorDecal = { kind: 'alien-vein', rect: { x: 0, y: 0, width: 1, height: 1 } };
  assert.deepEqual(sample([vein], 5, 5, 0.9), { color: 0x9a3fd8, emissive: true });
  assert.equal(sample([vein], 5, 5, 0.5), null);
});

test('tint replaces the kind colour', () => {
  const rug: FloorDecal = { kind: 'rug', rect: { x: 0, y: 0, width: 1, height: 1 }, tint: '#102030' };
  assert.equal(sample([rug], 5, 5)?.color, 0x102030);
});
