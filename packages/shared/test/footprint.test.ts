import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { fitsFootprint, footprintCentre, footprintTiles, isInFootprint, nearestFootprintTile, sizeOf, tileKey } from '../src/index.ts';

describe('footprints', () => {
  test('a 2×2 footprint covers four tiles from its north-west anchor', () => {
    assert.deepEqual(footprintTiles({ x: 3, y: 4 }, 2), [
      { x: 3, y: 4 },
      { x: 4, y: 4 },
      { x: 3, y: 5 },
      { x: 4, y: 5 },
    ]);
    assert.deepEqual(footprintTiles({ x: 3, y: 4 }, 1), [{ x: 3, y: 4 }]);
  });

  test('the nearest covered tile clamps the point into the square', () => {
    assert.deepEqual(nearestFootprintTile({ x: 3, y: 4 }, 2, { x: 9, y: 0 }), { x: 4, y: 4 });
    assert.deepEqual(nearestFootprintTile({ x: 3, y: 4 }, 2, { x: 0, y: 5 }), { x: 3, y: 5 });
    assert.deepEqual(nearestFootprintTile({ x: 3, y: 4 }, 1, { x: 9, y: 9 }), { x: 3, y: 4 });
  });

  test('the centre sits between the covered tiles', () => {
    assert.deepEqual(footprintCentre({ x: 3, y: 4 }, 2), { x: 3.5, y: 4.5 });
    assert.deepEqual(footprintCentre({ x: 3, y: 4 }, 1), { x: 3, y: 4 });
  });

  test('membership and fit', () => {
    assert.equal(isInFootprint({ x: 4, y: 5 }, { x: 3, y: 4 }, 2), true);
    assert.equal(isInFootprint({ x: 5, y: 5 }, { x: 3, y: 4 }, 2), false);
    const blocked = new Set([tileKey({ x: 4, y: 5 })]);
    const grid = { isWalkable: (point: { x: number; y: number }) => !blocked.has(tileKey(point)) };
    assert.equal(fitsFootprint(grid, { x: 3, y: 4 }, 2), false);
    assert.equal(fitsFootprint(grid, { x: 0, y: 0 }, 2), true);
  });

  test('size defaults to one', () => {
    assert.equal(sizeOf({}), 1);
    assert.equal(sizeOf({ size: 2 }), 2);
  });
});
