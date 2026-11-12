import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT } from '../src/index.ts';
import { LEVEL_RECIPES } from '../src/content/levels/recipes.ts';
import { SHIPPED_CONTEXT } from '../src/content/levels/shippedContext.ts';
import type { DistrictDefinition } from '../src/world/district.ts';
import type { LevelContext } from '../src/world/level.ts';

test('every level recipe rebuilds its shipped level', () => {
  assert.equal(LEVEL_RECIPES.size, 9);
  for (const [id, recipe] of LEVEL_RECIPES) {
    assert.deepEqual(recipe(SHIPPED_CONTEXT), GAME_CONTENT.levels.get(id)?.definition, id);
  }
});

test('a district widened on its far side moves itself and what hangs beyond it, and nothing nearer the root', () => {
  const hydroponics = GAME_CONTENT.districts.get('hydroponics') as DistrictDefinition;
  const shift = (point: { x: number; y: number }) => ({ x: point.x + 1, y: point.y });
  const widened: DistrictDefinition = {
    ...hydroponics,
    map: hydroponics.map.map((row) => `${row} `),
    exits: Object.fromEntries(Object.entries(hydroponics.exits ?? {}).map(([name, exit]) => [name, name === 'east' ? { ...exit, tiles: exit.tiles.map(shift) } : exit])),
  };
  const context: LevelContext = { ...SHIPPED_CONTEXT, districtOf: (id) => (id === 'hydroponics' ? widened : SHIPPED_CONTEXT.districtOf(id)) };
  const recipe = LEVEL_RECIPES.get('main-floor');
  assert.ok(recipe);
  const fromCircuit = (level: ReturnType<typeof recipe>, id: string) => {
    const origin = (districtId: string) => level.districts.find((placement) => placement.districtId === districtId)?.origin ?? { x: NaN, y: NaN };
    return { x: origin(id).x - origin('meridian-circuit').x, y: origin(id).y - origin('meridian-circuit').y };
  };
  const before = recipe(SHIPPED_CONTEXT);
  const after = recipe(context);
  for (const id of ['hydroponics', 'vesper-causeway', 'vesper-wards']) assert.deepEqual(fromCircuit(after, id), { ...fromCircuit(before, id), x: fromCircuit(before, id).x - 1 }, id);
  for (const id of ['verdance-concourse', 'service-yards', 'meridian-atrium']) assert.deepEqual(fromCircuit(after, id), fromCircuit(before, id), id);
});
