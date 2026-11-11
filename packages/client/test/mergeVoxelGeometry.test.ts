import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mergeVoxelGeometries } from '../src/render/voxel/mergeVoxelGeometry.ts';
import { VoxelModel } from '../src/render/voxel/voxelModel.ts';

const prop = (size: number): BufferGeometry => {
  const model = new VoxelModel();
  model.fill(0, 0, 0, size, size + 1, size - 1, (x, y, z) => 0x101010 * ((x + y + z) % 8));
  return model.mesh(1 / 16).solid!;
};

const close = (actual: ArrayLike<number>, expected: ArrayLike<number>) => {
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < expected.length; index++) assert.ok(Math.abs(actual[index]! - expected[index]!) < 1e-5, `entry ${index}: ${actual[index]} vs ${expected[index]}`);
};

test('merging voxel geometries matches transforming and merging them with three', () => {
  const transforms = [
    new Matrix4(),
    new Matrix4().compose(new Vector3(12, 0, -4), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2), new Vector3(1.5, 1.5, 1.5)),
    new Matrix4().compose(new Vector3(-3, 0, 7), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI), new Vector3(0.8, 0.8, 0.8)),
  ];
  const parts = [prop(2), prop(4), prop(3)].map((geometry, index) => ({ geometry, transform: transforms[index]! }));
  const ours = mergeVoxelGeometries(parts);
  const reference = mergeGeometries(parts.map(({ geometry, transform }) => geometry.clone().applyMatrix4(transform)));
  for (const name of ['position', 'normal', 'color']) close(ours.attributes[name]!.array, reference.attributes[name]!.array);
  assert.deepEqual([...ours.index!.array], [...reference.index!.array]);
});

test('merging without transforms copies geometry unchanged', () => {
  const parts = [prop(2), prop(5)].map((geometry) => ({ geometry }));
  const ours = mergeVoxelGeometries(parts);
  const reference = mergeGeometries(parts.map(({ geometry }) => geometry));
  for (const name of ['position', 'normal', 'color']) assert.deepEqual([...ours.attributes[name]!.array], [...reference.attributes[name]!.array]);
  assert.deepEqual([...ours.index!.array], [...reference.index!.array]);
});
