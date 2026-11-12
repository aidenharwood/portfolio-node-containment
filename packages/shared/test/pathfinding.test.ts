import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createWalkabilityGrid, findPath, parseTileLayout, walkableTilesNear } from '../src/index.ts';

const layout = parseTileLayout([
  '#######',
  '#.....#',
  '#.###.#',
  '#.#...#',
  '#######',
]);
const grid = createWalkabilityGrid(layout, []);

describe('findPath', () => {
  test('routes around walls to reach the destination', () => {
    const path = findPath(grid, { from: { x: 1, y: 3 }, to: { x: 3, y: 3 } });
    assert.ok(path);
    assert.deepEqual(path.at(-1), { x: 3, y: 3 });
    for (const step of path) assert.ok(grid.isWalkable(step));
  });

  test('never cuts diagonally across wall corners', () => {
    const path = findPath(grid, { from: { x: 1, y: 1 }, to: { x: 5, y: 3 } });
    assert.ok(path);
    let previous = { x: 1, y: 1 };
    for (const step of path) {
      const diagonal = step.x !== previous.x && step.y !== previous.y;
      if (diagonal) {
        assert.ok(grid.isWalkable({ x: step.x, y: previous.y }));
        assert.ok(grid.isWalkable({ x: previous.x, y: step.y }));
      }
      previous = step;
    }
  });

  test('stops on a tile cardinally adjacent to an unwalkable target', () => {
    const path = findPath(grid, { from: { x: 1, y: 1 }, to: { x: 3, y: 2 }, arriveAdjacent: true });
    assert.ok(path);
    const end = path.at(-1);
    assert.ok(end);
    assert.equal(Math.abs(end.x - 3) + Math.abs(end.y - 2), 1);
  });

  test('returns null when the destination is a wall', () => {
    assert.equal(findPath(grid, { from: { x: 1, y: 1 }, to: { x: 0, y: 0 } }), null);
  });

  test('returns an empty path when already at the destination', () => {
    assert.deepEqual(findPath(grid, { from: { x: 1, y: 1 }, to: { x: 1, y: 1 } }), []);
  });
});

describe('walkableTilesNear', () => {
  test('keeps a walkable target as it is', () => {
    assert.deepEqual(walkableTilesNear(grid, { x: 3, y: 1 }, { x: 1, y: 1 }), [{ x: 3, y: 1 }]);
  });

  test('snaps a wall to the closest walkable tile, preferring the side nearer the walker', () => {
    const [nearest] = walkableTilesNear(grid, { x: 3, y: 2 }, { x: 3, y: 1 });
    assert.deepEqual(nearest, { x: 3, y: 1 });
    const [fromBelow] = walkableTilesNear(grid, { x: 3, y: 2 }, { x: 4, y: 3 });
    assert.deepEqual(fromBelow, { x: 3, y: 3 });
  });

  test('snaps tiles outside the map back inside', () => {
    const [nearest] = walkableTilesNear(grid, { x: 3, y: -1 }, { x: 1, y: 1 });
    assert.deepEqual(nearest, { x: 3, y: 1 });
  });

  test('gives up when nothing walkable is in range', () => {
    assert.deepEqual(walkableTilesNear(grid, { x: 40, y: 40 }, { x: 1, y: 1 }), []);
  });
});

describe('findPath goals', () => {
  const open = { isWalkable: (point: { x: number; y: number }) => point.x >= 0 && point.y >= 0 && point.x < 10 && point.y < 10 };

  test('a custom goal replaces the destination test', () => {
    const path = findPath(open, { from: { x: 0, y: 0 }, to: { x: 5, y: 5 }, isGoal: (point) => point.x === 3 });
    assert.ok(path);
    assert.equal(path.at(-1)?.x, 3);
  });

  test('a custom goal may lie beside an unwalkable destination', () => {
    const blockedTarget = { isWalkable: (point: { x: number; y: number }) => open.isWalkable(point) && !(point.x === 5 && point.y === 5) };
    const path = findPath(blockedTarget, { from: { x: 0, y: 0 }, to: { x: 5, y: 5 }, isGoal: (point) => point.x === 4 && point.y === 5 });
    assert.deepEqual(path?.at(-1), { x: 4, y: 5 });
  });
});
