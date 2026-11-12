import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { QuestLog, RouteScene } from '@containment/shared';
import { guidanceGoals } from '../src/state/guidanceGoals.ts';

const scene: RouteScene = {
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
  depletedInstances: new Set(),
};

const stocking: QuestLog = {
  'scrap-run': { questId: 'scrap-run', status: 'active', stepIndex: 1, objectiveProgress: [0, 0] },
};

const slagPoints = [
  { point: { x: 2, y: 2 }, arriveAdjacent: true },
  { point: { x: 9, y: 4 }, arriveAdjacent: true },
];

describe('guidance goals', () => {
  test('a resource target routes to its placements', () => {
    assert.deepEqual(guidanceGoals({ kind: 'resource', objectId: 'slag-heap' }, {}, scene).goals, slagPoints);
  });

  test('a resource target ignores the quest log', () => {
    assert.deepEqual(guidanceGoals({ kind: 'resource', objectId: 'slag-heap' }, stocking, scene).goals, slagPoints);
  });

  test('a null target falls back to the default quest', () => {
    const { goals, allDepleted } = guidanceGoals(null, stocking, scene);
    assert.ok(goals.some((goal) => goal.point.x === 5 && goal.point.y === 5));
    assert.equal(allDepleted, false);
  });

  test('a quest target with no active quest gives no goals', () => {
    assert.deepEqual(guidanceGoals({ kind: 'quest', questId: 'scrap-run' }, {}, scene), { goals: [], allDepleted: false });
  });
});
