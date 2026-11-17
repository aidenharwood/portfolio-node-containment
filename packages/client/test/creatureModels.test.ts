import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCreatureModel, creatureLookAirborne, CREATURE_LOOK_KEYS } from '../src/render/models/wardCreatureModels.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS } from '../src/render/voxel/voxelKinds.ts';

const NEIGHBOURS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;

const componentCount = (key: string): number => {
  const model = buildCreatureModel(key);
  const unseen = new Set(model.occupied());
  let components = 0;
  while (unseen.size > 0) {
    components++;
    const start = unseen.values().next().value as string;
    unseen.delete(start);
    const queue = [start];
    while (queue.length > 0) {
      const [x, y, z] = (queue.pop() as string).split(',').map(Number) as [number, number, number];
      for (const [dx, dy, dz] of NEIGHBOURS) {
        const next = `${x + dx},${y + dy},${z + dz}`;
        if (unseen.delete(next)) queue.push(next);
      }
    }
  }
  return components;
};

test('every creature is one connected piece', () => {
  for (const key of CREATURE_LOOK_KEYS) assert.equal(componentCount(key), 1, `${key} has floating parts`);
});

test('grounded creatures stand on the ground', () => {
  for (const key of CREATURE_LOOK_KEYS) {
    if (creatureLookAirborne(key)) continue;
    assert.equal(buildCreatureModel(key).bounds?.min[1], 0, `${key} floats above the ground`);
  }
});

test('every glowing creature shows some of its glow', () => {
  for (const key of CREATURE_LOOK_KEYS) {
    const model = buildCreatureModel(key);
    const glowing = model.cells().filter((cell) => cell.kind === VOXEL_EMISSIVE);
    if (glowing.length === 0) continue;
    const visible = glowing.some((cell) => NEIGHBOURS.some(([dx, dy, dz]) => {
      const kind = model.kindAt(cell.x + dx, cell.y + dy, cell.z + dz);
      return !model.has(cell.x + dx, cell.y + dy, cell.z + dz) || kind === VOXEL_GLASS;
    }));
    assert.ok(visible, `${key} hides all of its emissive voxels`);
  }
});

test('no creature is accidentally washed out to white', () => {
  for (const key of CREATURE_LOOK_KEYS) {
    const cells = buildCreatureModel(key).cells();
    const white = cells.filter((cell) => (cell.color >> 16 & 0xff) > 0xf0 && (cell.color >> 8 & 0xff) > 0xf0 && (cell.color & 0xff) > 0xf0);
    assert.ok(white.length < cells.length * 0.05, `${key} is ${white.length} of ${cells.length} near-white voxels`);
  }
});
