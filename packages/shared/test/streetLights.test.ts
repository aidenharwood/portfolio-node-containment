import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { isKerb } from '../src/world/streetLights.ts';
import type { TileKindId } from '../src/world/tiles.ts';
import type { TilePoint } from '../src/world/geometry.ts';

const LEGEND: Readonly<Record<string, TileKindId>> = { '"': 'grass', '=': 'paving', '~': 'water', '#': 'wall', ',': 'concrete', '*': 'gravel', '%': 'rust', ':': 'plating' };
const grid = (rows: readonly string[]) => (point: TilePoint): TileKindId => LEGEND[rows[point.y]?.[point.x] ?? ''] ?? 'void';

const TOWN = grid([
  '""""""""""""',
  '""""""""""""',
  '"====="""""=',
  '"====="""""=',
  '"====="""""=',
  '""""""""~~~~',
  '"#####""""""',
  '"#,,,#""""""',
  '"#,,,#""""""',
  '"#####""""""',
]);

describe('street lights', () => {
  test('the kerb is the ground beside a laid way', () => {
    assert.equal(isKerb(TOWN, { x: 2, y: 1 }, 'grass'), true);
    assert.equal(isKerb(TOWN, { x: 6, y: 3 }, 'grass'), true);
    assert.equal(isKerb(TOWN, { x: 10, y: 3 }, 'grass'), true);
  });

  test('the middle of a road, far grass, the water and an interior floor by a wall are not the kerb', () => {
    assert.equal(isKerb(TOWN, { x: 3, y: 3 }, 'grass'), false);
    assert.equal(isKerb(TOWN, { x: 1, y: 2 }, 'grass'), false);
    assert.equal(isKerb(TOWN, { x: 8, y: 1 }, 'grass'), false);
    assert.equal(isKerb(TOWN, { x: 9, y: 5 }, 'grass'), false);
    assert.equal(isKerb(TOWN, { x: 3, y: 7 }, 'grass'), false);
    assert.equal(isKerb(TOWN, { x: 2, y: 8 }, 'grass'), false);
  });

  test('a narrow path of one kind has no kerb down its middle', () => {
    const path = grid(['""""""', '"=="""', '"=="""', '""""""']);
    assert.equal(isKerb(path, { x: 1, y: 1 }, 'grass'), false);
    assert.equal(isKerb(path, { x: 3, y: 1 }, 'grass'), true);
  });

  test('natural ground of a paved kind is not a way where it is the region ground', () => {
    const wreck = grid(['******', '**%%**', '**%%**', '*::***', '******']);
    assert.equal(isKerb(wreck, { x: 0, y: 0 }, 'gravel'), false);
    assert.equal(isKerb(wreck, { x: 2, y: 1 }, 'gravel'), false);
    assert.equal(isKerb(wreck, { x: 3, y: 3 }, 'gravel'), true);
    assert.equal(isKerb(wreck, { x: 2, y: 1 }), true);
  });
});
