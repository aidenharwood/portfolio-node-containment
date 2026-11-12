import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT } from '@containment/shared';
import { RUIN_BUILDERS } from '../src/render/models/ruinModels.ts';
import { assertModelFits } from './support/modelBounds.ts';

const UNDER_HEIGHT_CAP = { min: 1, max: 31 };

test('ruin models fit their footprint and stay under the height cap', () => {
  const definitions = [...GAME_CONTENT.worldObjects.values()].filter((definition) => definition.model in RUIN_BUILDERS);
  assert.equal(definitions.length, Object.keys(RUIN_BUILDERS).length);
  for (const definition of definitions) {
    const built = RUIN_BUILDERS[definition.model as keyof typeof RUIN_BUILDERS](3);
    assertModelFits(definition.id, built, definition.footprint ?? { width: 1, height: 1 }, UNDER_HEIGHT_CAP);
  }
});
