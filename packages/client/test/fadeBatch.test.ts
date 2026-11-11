import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Mesh, type Object3D } from 'three';
import { FadeBatch } from '../src/render/world/fadeBatch.ts';
import { VOXEL_MATERIALS } from '../src/render/voxel/voxelMaterials.ts';
import { VoxelModel } from '../src/render/voxel/voxelModel.ts';
import type { VoxelMeshes } from '../src/render/voxel/voxelMesher.ts';

const block = (x: number): VoxelMeshes => {
  const model = new VoxelModel();
  model.fill(x, 0, 0, x + 1, 1, 1, 0x808080);
  return model.mesh(1);
};

const meshes = (root: Object3D): Mesh[] => {
  const found: Mesh[] = [];
  root.traverse((child) => {
    if (child instanceof Mesh) found.push(child);
  });
  return found;
};

const drawnTriangles = (batch: FadeBatch): number[][] => {
  const merged = meshes(batch.root).find((mesh) => mesh.material === VOXEL_MATERIALS.solid)!;
  const index = merged.geometry.index!;
  const triangles: number[][] = [];
  for (let offset = merged.geometry.drawRange.start; offset < Math.min(index.count, merged.geometry.drawRange.count); offset += 3) {
    triangles.push([index.getX(offset), index.getX(offset + 1), index.getX(offset + 2)]);
  }
  return triangles;
};

test('fading a piece removes only its triangles from the merged mesh and shows a faded copy', () => {
  const pieces = [block(0), block(4), block(8)];
  const batch = new FadeBatch(pieces);
  const perPiece = pieces[0]!.solid!.index!.count / 3;
  const all = drawnTriangles(batch);
  assert.equal(all.length, perPiece * 3);
  assert.equal(meshes(batch.root).length, 1);

  batch.setFaded(1, true);
  batch.flush();
  const remaining = drawnTriangles(batch);
  assert.deepEqual(remaining, [...all.slice(0, perPiece), ...all.slice(perPiece * 2)]);
  const faded = meshes(batch.root).filter((mesh) => mesh.material === VOXEL_MATERIALS.fadedSolid);
  assert.equal(faded.length, 1);
  assert.equal(faded[0]!.visible && faded[0]!.parent!.visible, true);
  assert.equal(faded[0]!.castShadow, false);
  assert.equal(faded[0]!.geometry, pieces[1]!.solid);

  batch.setFaded(1, false);
  batch.flush();
  assert.deepEqual(drawnTriangles(batch), all);
  assert.equal(faded[0]!.parent!.visible, false);
});

test('batch options carry over to the merged and faded meshes', () => {
  const batch = new FadeBatch([block(0), block(2)], { castShadow: false, receiveShadow: false });
  batch.setFaded(0, true);
  batch.flush();
  for (const mesh of meshes(batch.root)) {
    assert.equal(mesh.castShadow, false);
    assert.equal(mesh.receiveShadow, false);
  }
});
