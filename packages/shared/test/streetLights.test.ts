import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { evenlyAlong, isKerb } from '../src/world/streetLights.ts';
import type { TileKindId } from '../src/world/tiles.ts';
import type { TilePoint } from '../src/world/geometry.ts';

const ROWS = ['""""""""', '""""""""', '"=====""', '"=====""', '""""""""', '""""~~~~'];
const LEGEND: Readonly<Record<string, TileKindId>> = { '"': 'grass', '=': 'paving', '~': 'water' };
const kindAt = (point: TilePoint): TileKindId => LEGEND[ROWS[point.y]?.[point.x] ?? ''] ?? 'void';

describe('street lights', () => {
  test('the kerb is the ground at the edge of a paved way, not open grass, the middle of the way or the water', () => {
    assert.equal(isKerb(kindAt, { x: 2, y: 1 }), true);
    assert.equal(isKerb(kindAt, { x: 6, y: 3 }), true);
    assert.equal(isKerb(kindAt, { x: 1, y: 2 }), true);
    assert.equal(isKerb(kindAt, { x: 6, y: 0 }), false);
    assert.equal(isKerb(kindAt, { x: 1, y: 5 }), false);
    assert.equal(isKerb(kindAt, { x: 5, y: 5 }), false);
  });

  test('lamps spread evenly along a line, from end to end', () => {
    assert.deepEqual(evenlyAlong(21, 10), [0, 10, 20]);
    assert.deepEqual(evenlyAlong(25, 10), [0, 12, 24]);
    assert.deepEqual(evenlyAlong(5, 10), [2]);
    assert.deepEqual(evenlyAlong(0, 10), []);
  });
});
