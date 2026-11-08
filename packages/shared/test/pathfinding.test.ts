import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createWalkabilityGrid, findPath, parseTileLayout } from '../src/index.ts';

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
