import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createObjectWalkabilityGrid, fitsFootprint, footprintCentre, footprintTiles, isInFootprint, nearestFootprintTile, objectFootprintTiles, parseTileLayout, sizeOf, tileKey, type ObjectPlacement, type WorldObjectDefinition } from '../src/index.ts';
import { positionsOf, positionsOfWith } from '../src/content/districts/populate.ts';

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

describe('object footprints', () => {
  const wide = { id: 'wide', name: 'Wide', examine: '', model: 'crate', blocksMovement: true, footprint: { width: 3, height: 2 }, interactions: [] } as unknown as WorldObjectDefinition;
  const keys = (tiles: { x: number; y: number }[]) => tiles.map(tileKey).sort();

  test('a footprint spans its width and height from the position and swaps when facing east or west', () => {
    const south = objectFootprintTiles(wide, { position: { x: 10, y: 5 }, facing: 'south' });
    assert.equal(south.length, 6);
    assert.deepEqual([Math.min(...south.map((t) => t.x)), Math.max(...south.map((t) => t.x))], [10, 12]);
    assert.deepEqual([Math.min(...south.map((t) => t.y)), Math.max(...south.map((t) => t.y))], [5, 6]);
    const east = objectFootprintTiles(wide, { position: { x: 10, y: 5 }, facing: 'east' });
    assert.equal(east.length, 6);
    assert.deepEqual([Math.min(...east.map((t) => t.x)), Math.max(...east.map((t) => t.x))], [10, 11]);
    assert.deepEqual([Math.min(...east.map((t) => t.y)), Math.max(...east.map((t) => t.y))], [5, 7]);
    assert.deepEqual(objectFootprintTiles(wide, { position: { x: 10, y: 5 }, facing: 'north' }), south);
    assert.deepEqual(objectFootprintTiles({ ...wide, footprint: undefined }, { position: { x: 2, y: 3 } }), [{ x: 2, y: 3 }]);
    assert.deepEqual(objectFootprintTiles(undefined, { position: { x: 2, y: 3 } }), [{ x: 2, y: 3 }]);
  });

  test('the walkability grid blocks every footprint tile', () => {
    const layout = parseTileLayout(Array.from({ length: 20 }, () => '.'.repeat(30)));
    const placements = [{ instanceId: 'w', objectId: 'wide', position: { x: 10, y: 5 } }] as unknown as ObjectPlacement[];
    const grid = createObjectWalkabilityGrid(layout, placements, () => wide);
    for (const tile of objectFootprintTiles(wide, placements[0]!)) assert.equal(grid.isWalkable(tile), false);
    assert.equal(grid.isWalkable({ x: 13, y: 5 }), true);
    const turned = createObjectWalkabilityGrid(layout, [{ ...placements[0]!, facing: 'east' }], () => wide);
    assert.equal(turned.isWalkable({ x: 12, y: 5 }), true);
    assert.equal(turned.isWalkable({ x: 11, y: 7 }), false);
  });

  test('positionsOfWith expands object placements through the footprint', () => {
    const placements = [{ instanceId: 'w', objectId: 'wide', position: { x: 10, y: 5 } }] as unknown as ObjectPlacement[];
    assert.deepEqual(keys(positionsOfWith(() => wide, placements)), keys(objectFootprintTiles(wide, placements[0]!)));
    assert.deepEqual(positionsOf(placements), [{ x: 10, y: 5 }]);
  });
});
