import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { QuestLog, RouteScene } from '@containment/shared';
import { FIXTURE_CONTENT } from '@containment/shared/fixtures';
import { guidanceGoals as goalsIn, guidedQuest as questIn } from '../src/state/guidanceGoals.ts';

const guidanceGoals = (...args: [Parameters<typeof goalsIn>[0], Parameters<typeof goalsIn>[1], Parameters<typeof goalsIn>[2]]) => goalsIn(...args, FIXTURE_CONTENT);
const guidedQuest = (...args: [Parameters<typeof questIn>[0], Parameters<typeof questIn>[1]]) => questIn(...args, FIXTURE_CONTENT);

const scene: RouteScene = {
  level: {
    areas: [],
    npcs: [],
    creatures: [],
    objects: [
      { instanceId: 'a', objectId: 'deep-scrap-heap', position: { x: 2, y: 2 } },
      { instanceId: 'b', objectId: 'deep-scrap-heap', position: { x: 9, y: 4 } },
      { instanceId: 'c', objectId: 'survey-marker', position: { x: 5, y: 5 } },
    ],
  },
  npcPositions: new Map(),
  creatures: [],
  depletedInstances: new Set(),
};

const stocking: QuestLog = {
  survey: { questId: 'survey', status: 'active', stepIndex: 1, objectiveProgress: [0] },
};

const slagPoints = [
  { point: { x: 2, y: 2 }, arriveAdjacent: true },
  { point: { x: 9, y: 4 }, arriveAdjacent: true },
];

describe('guidance goals', () => {
  test('a resource target routes to its placements', () => {
    assert.deepEqual(guidanceGoals({ kind: 'resource', objectId: 'deep-scrap-heap' }, {}, scene).goals, slagPoints);
  });

  test('a resource target ignores the quest log', () => {
    assert.deepEqual(guidanceGoals({ kind: 'resource', objectId: 'deep-scrap-heap' }, stocking, scene).goals, slagPoints);
  });

  test('a null target falls back to the default quest', () => {
    const { goals, allDepleted } = guidanceGoals(null, stocking, scene);
    assert.ok(goals.some((goal) => goal.point.x === 5 && goal.point.y === 5));
    assert.equal(allDepleted, false);
  });

  test('no quest counts as guided while a resource is tracked, so the journal can track one again', () => {
    assert.equal(guidedQuest({ kind: 'resource', objectId: 'deep-scrap-heap' }, stocking), null);
    assert.equal(guidedQuest(null, stocking)?.quest.id, 'survey');
    assert.equal(guidedQuest({ kind: 'quest', questId: 'survey' }, stocking)?.quest.id, 'survey');
  });

  test('a quest target with no active quest gives no goals', () => {
    assert.deepEqual(guidanceGoals({ kind: 'quest', questId: 'survey' }, {}, scene), { goals: [], allDepleted: false });
  });
});
