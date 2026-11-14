import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT } from '../src/index.ts';
import { LEVEL_RECIPES } from '../src/content/levels/recipes.ts';
import { SHIPPED_CONTEXT } from '../src/content/levels/shippedContext.ts';
import type { DistrictDefinition } from '../src/world/district.ts';
import { joinDistricts } from '../src/world/levelPlan.ts';
import { FIXTURE_FIELD, FIXTURE_HUB, FIXTURE_OUTPOST } from './fixtures/world/districts.ts';

test('every level recipe rebuilds its shipped level', () => {
  assert.equal(LEVEL_RECIPES.size, GAME_CONTENT.levels.size);
  for (const [id, recipe] of LEVEL_RECIPES) {
    assert.deepEqual(recipe(SHIPPED_CONTEXT), GAME_CONTENT.levels.get(id)?.definition, id);
  }
});

test('a district widened on its far side moves what hangs beyond it, and nothing nearer the root', () => {
  const shift = (point: { x: number; y: number }) => ({ x: point.x + 1, y: point.y });
  const widened: DistrictDefinition = {
    ...FIXTURE_FIELD,
    map: FIXTURE_FIELD.map.map((row) => `${row} `),
    exits: Object.fromEntries(Object.entries(FIXTURE_FIELD.exits ?? {}).map(([name, exit]) => [name, name === 'east' ? { ...exit, tiles: exit.tiles.map(shift) } : exit])),
  };
  const join = (field: DistrictDefinition) =>
    joinDistricts([FIXTURE_HUB, field, FIXTURE_OUTPOST], 'fx-hub', [
      { districtId: 'fx-field', exit: 'west', to: 'fx-hub', toExit: 'east' },
      { districtId: 'fx-outpost', exit: 'west', to: 'fx-field', toExit: 'east' },
    ]);
  const origin = (placements: ReturnType<typeof join>, id: string) => placements.find((placement) => placement.districtId === id)?.origin;
  const before = join(FIXTURE_FIELD);
  const after = join(widened);
  assert.deepEqual(origin(after, 'fx-hub'), origin(before, 'fx-hub'));
  assert.deepEqual(origin(after, 'fx-field'), origin(before, 'fx-field'));
  assert.equal(origin(after, 'fx-outpost')?.x, (origin(before, 'fx-outpost')?.x ?? 0) + 1);
});
