import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT, type WorldObjectModel } from '@containment/shared';
import { CONTAINMENT_BUILDERS } from '../src/render/models/containmentModels.ts';
import { STREET_BUILDERS } from '../src/render/models/streetModels.ts';
import { columnCells, columnHeight, glyphInterior, glyphOutline, KANA, LETTERS, SYMBOLS, textCells, textWidth } from '../src/render/models/glyphs.ts';
import type { ObjectModelParts } from '../src/render/models/objectModels.ts';

const BUILDERS: Readonly<Record<string, (seed: number) => ObjectModelParts>> = { ...STREET_BUILDERS, ...CONTAINMENT_BUILDERS };
const MODELS = Object.keys(BUILDERS) as WorldObjectModel[];
const VARIANTS = 8;
const variants = (model: WorldObjectModel) => Array.from({ length: VARIANTS }, (_, seed) => (BUILDERS[model] as (seed: number) => ObjectModelParts)(seed));
const mountOf = (model: WorldObjectModel) => [...GAME_CONTENT.worldObjects.values()].find((object) => object.model === model)?.furnishing?.mount;

test('every street and containment piece is a placeable object', () => {
  for (const model of MODELS) assert.ok(mountOf(model), model + ' has no object with a furnishing profile');
});

test('every kit piece builds all of its placement variants standing on the ground', () => {
  for (const model of MODELS) {
    for (const [seed, parts] of variants(model).entries()) {
      const bounds = parts.base.bounds;
      assert.ok(bounds, model + ' variant ' + seed + ' is empty');
      assert.ok(parts.heightVoxels > 0, model + ' variant ' + seed + ' has no height');
      if (mountOf(model) !== 'wall') assert.ok(bounds.min[1] <= 0, model + ' variant ' + seed + ' floats above the ground');
    }
  }
});

test('the variants of a kit piece differ in shape, not only in colour', () => {
  for (const model of MODELS) {
    const shapes = new Set(variants(model).map((parts) => [parts.base, ...parts.animated.map((part) => part.model)].map((each) => each.occupied().sort().join(' ')).join('|')));
    assert.ok(shapes.size >= 3, model + ' has only ' + shapes.size + ' silhouettes across ' + VARIANTS + ' variants');
  }
});

test('wall pieces hang against the wall behind their tile and reach no further back', () => {
  for (const model of MODELS) {
    if (mountOf(model) !== 'wall') continue;
    for (const [seed, parts] of variants(model).entries()) {
      const bounds = parts.base.bounds!;
      if (model === 'razorWire') {
        assert.ok(bounds.min[2] >= -20 && bounds.max[2] <= -11, 'razor wire variant ' + seed + ' does not sit on the fence line');
        continue;
      }
      assert.equal(bounds.min[2], -8, model + ' variant ' + seed + ' does not touch its wall');
    }
  }
});

test('letters are three by five and words lay out with a gap between them', () => {
  for (const [char, glyph] of Object.entries(LETTERS)) {
    assert.equal(glyph.length, 5, char);
    for (const row of glyph) assert.equal(row.length, 3, char);
  }
  assert.equal(textWidth('BAR'), 11);
  assert.equal(Math.max(...textCells('BAR').map((cell) => cell.x)), 10);
  assert.equal(columnHeight([LETTERS.B!, LETTERS.A!]), 11);
  assert.equal(Math.max(...columnCells([LETTERS.B!, LETTERS.A!]).map((cell) => cell.y)), 10);
  assert.throws(() => textCells('Q?'));
});

test('a symbol splits into a lit outline and a filled interior', () => {
  for (const [name, glyph] of Object.entries({ ...SYMBOLS, kana: KANA[0]! })) {
    const outline = glyphOutline(glyph);
    const inside = glyphInterior(glyph);
    const total = glyph.join('').split('').filter((cell) => cell === '#').length;
    assert.equal(outline.length + inside.length, total, name);
    assert.ok(outline.length > 0, name);
  }
  assert.ok(glyphInterior(SYMBOLS.heart!).length > 0);
});
