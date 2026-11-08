import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { chunkOf, interestDelta, interestSet } from '../src/index.ts';

describe('chunk interest', () => {
  test('chunkOf floors tiles into 32-tile chunks', () => {
    assert.deepEqual(chunkOf({ x: 0, y: 0 }), { cx: 0, cy: 0 });
    assert.deepEqual(chunkOf({ x: 31, y: 32 }), { cx: 0, cy: 1 });
    assert.deepEqual(chunkOf({ x: 64, y: 95 }), { cx: 2, cy: 2 });
  });

  test('interestSet is the 3x3 block around a chunk', () => {
    const set = interestSet({ cx: 1, cy: 1 });
    assert.equal(set.size, 9);
    assert.ok(set.has('0,0') && set.has('2,2') && set.has('1,1'));
    assert.ok(!set.has('3,1'));
  });

  test('interestDelta from nothing enters all nine chunks', () => {
    assert.equal(interestDelta(null, { cx: 0, cy: 0 }).entered.length, 9);
    assert.deepEqual(interestDelta(null, { cx: 0, cy: 0 }).left, []);
  });

  test('interestDelta stepping one chunk east enters and leaves one column', () => {
    const delta = interestDelta({ cx: 1, cy: 1 }, { cx: 2, cy: 1 });
    assert.deepEqual([...delta.entered].sort(), ['3,0', '3,1', '3,2']);
    assert.deepEqual([...delta.left].sort(), ['0,0', '0,1', '0,2']);
  });

  test('interestDelta to the same chunk is empty', () => {
    assert.deepEqual(interestDelta({ cx: 4, cy: 4 }, { cx: 4, cy: 4 }), { entered: [], left: [] });
  });
});
