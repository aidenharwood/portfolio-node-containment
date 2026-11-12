import assert from 'node:assert/strict';
import type { ObjectModelParts } from '../../src/render/models/objectModels.ts';

const VOXELS_PER_TILE = 16;

export interface HeightRange {
  readonly min: number;
  readonly max: number;
}

export function assertModelFits(label: string, built: ObjectModelParts, footprint: { readonly width: number; readonly height: number }, heights: HeightRange): void {
  const halfX = (footprint.width * VOXELS_PER_TILE) / 2;
  const halfZ = (footprint.height * VOXELS_PER_TILE) / 2;
  assert.ok(built.heightVoxels >= heights.min && built.heightVoxels <= heights.max, `${label} stands ${built.heightVoxels} voxels tall, outside ${heights.min}..${heights.max}`);
  const pieces = [built.base, ...built.animated.map((part) => part.model)];
  assert.ok(built.base.bounds, `${label} is empty`);
  for (const piece of pieces) {
    const bounds = piece.bounds;
    if (!bounds) continue;
    const [minX, minY, minZ] = bounds.min;
    const [maxX, maxY, maxZ] = bounds.max;
    assert.ok(minX >= -halfX && maxX <= halfX, `${label} spans x ${minX}..${maxX - 1}, outside ${-halfX}..${halfX - 1}`);
    assert.ok(minZ >= -halfZ && maxZ <= halfZ, `${label} spans z ${minZ}..${maxZ - 1}, outside ${-halfZ}..${halfZ - 1}`);
    assert.ok(minY >= 0 && maxY <= built.heightVoxels, `${label} spans y ${minY}..${maxY - 1}, outside 0..${built.heightVoxels - 1}`);
  }
}
