import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT } from '@containment/shared';
import { RUIN_BUILDERS } from '../src/render/models/ruinModels.ts';

const VOXELS_PER_TILE = 16;
const MAX_HEIGHT = 32;
const SCAN = 64;

test('ruin models fit their footprint and stay under the height cap', () => {
  const definitions = [...GAME_CONTENT.worldObjects.values()].filter((definition) => definition.model in RUIN_BUILDERS);
  assert.equal(definitions.length, Object.keys(RUIN_BUILDERS).length);
  for (const definition of definitions) {
    const { width, height } = definition.footprint ?? { width: 1, height: 1 };
    const halfX = (width * VOXELS_PER_TILE) / 2;
    const halfZ = (height * VOXELS_PER_TILE) / 2;
    const built = RUIN_BUILDERS[definition.model as keyof typeof RUIN_BUILDERS](3);
    assert.ok(built.heightVoxels < MAX_HEIGHT, `${definition.id} height`);
    let filled = 0;
    for (let x = -SCAN; x <= SCAN; x++) {
      for (let y = -2; y <= MAX_HEIGHT + 8; y++) {
        for (let z = -SCAN; z <= SCAN; z++) {
          if (!built.base.has(x, y, z)) continue;
          filled += 1;
          assert.ok(x >= -halfX && x < halfX && z >= -halfZ && z < halfZ, `${definition.id} voxel ${x},${y},${z} leaves its footprint`);
          assert.ok(y >= 0 && y < built.heightVoxels, `${definition.id} voxel ${x},${y},${z} outside its height`);
        }
      }
    }
    assert.ok(filled > 0, `${definition.id} is empty`);
  }
});
