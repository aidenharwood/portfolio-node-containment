import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NATURE_BUILDERS, type NatureModel } from '../src/render/models/natureModels.ts';

const MODELS = Object.keys(NATURE_BUILDERS) as NatureModel[];
const VARIANTS = 8;
const FLORA: ReadonlySet<NatureModel> = new Set<NatureModel>(['wildflowers', 'tallGrass', 'fusedShards']);
const TREES: ReadonlySet<NatureModel> = new Set<NatureModel>(['broadleafTree', 'birchTree', 'windbentPine', 'deadTree']);

const variants = (model: NatureModel) => Array.from({ length: VARIANTS }, (_, seed) => NATURE_BUILDERS[model](seed));

test('every natural prop builds all of its placement variants', () => {
  for (const model of MODELS) {
    for (const [seed, parts] of variants(model).entries()) {
      assert.ok(parts.base.cells().length > 0, model + ' variant ' + seed + ' is empty');
      assert.ok(parts.heightVoxels > 0, model + ' variant ' + seed + ' has no height');
    }
  }
});

test('the variants of a natural prop differ in shape, not only in colour', () => {
  for (const model of MODELS) {
    const shapes = new Set(variants(model).map((parts) => parts.base.occupied().sort().join(' ')));
    assert.ok(shapes.size >= 4, model + ' has only ' + shapes.size + ' silhouettes across ' + VARIANTS + ' variants');
  }
});

test('natural props stand on the ground and stay their size', () => {
  for (const model of MODELS) {
    for (const [seed, parts] of variants(model).entries()) {
      const bounds = parts.base.bounds;
      assert.ok(bounds && bounds.min[1] <= 0, model + ' variant ' + seed + ' floats above the ground');
      const top = (bounds?.max[1] ?? 0) + 1;
      if (FLORA.has(model)) assert.ok(top <= 6, model + ' variant ' + seed + ' is ' + top + ' voxels tall, too tall to walk through');
      if (TREES.has(model)) assert.ok(top >= 14, model + ' variant ' + seed + ' is only ' + top + ' voxels tall');
    }
  }
});
