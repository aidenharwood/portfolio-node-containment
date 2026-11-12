import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { resourceRouteGoals, type RouteScene } from '../src/index.ts';

const scene = (depleted: readonly string[] = []): RouteScene => ({
  level: {
    areas: [],
    npcs: [],
    creatures: [],
    objects: [
      { instanceId: 'a', objectId: 'slag-heap', position: { x: 2, y: 2 } },
      { instanceId: 'b', objectId: 'slag-heap', position: { x: 9, y: 4 } },
      { instanceId: 'c', objectId: 'scrap-heap', position: { x: 5, y: 5 } },
    ],
  },
  npcPositions: new Map(),
  creatures: [],
  depletedInstances: new Set(depleted),
});

describe('resource route goals', () => {
  test('returns an adjacent goal for each live placement of the node', () => {
    assert.deepEqual(resourceRouteGoals('slag-heap', scene()), {
      goals: [
        { point: { x: 2, y: 2 }, arriveAdjacent: true },
        { point: { x: 9, y: 4 }, arriveAdjacent: true },
      ],
      allDepleted: false,
    });
  });

  test('skips depleted instances', () => {
    assert.deepEqual(resourceRouteGoals('slag-heap', scene(['a'])), {
      goals: [{ point: { x: 9, y: 4 }, arriveAdjacent: true }],
      allDepleted: false,
    });
  });

  test('falls back to every placement when all are depleted', () => {
    const result = resourceRouteGoals('slag-heap', scene(['a', 'b']));
    assert.equal(result.allDepleted, true);
    assert.equal(result.goals.length, 2);
  });

  test('returns nothing for a node not on the level', () => {
    assert.deepEqual(resourceRouteGoals('strangler-vine', scene()), { goals: [], allDepleted: false });
  });
});
