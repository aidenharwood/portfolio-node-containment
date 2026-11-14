import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isConditionMet, isSafeIn, questPointsEarned, type ConditionContext, type QuestDefinition } from '../src/index.ts';

const quest = (id: string, category: QuestDefinition['category'], questPoints?: number): QuestDefinition => ({
  id,
  name: id,
  category,
  summary: id,
  steps: [{ id: 'only', journal: 'Do it.', objectives: [{ type: 'talkTo', npcId: 'someone', label: 'Talk' }] }],
  rewards: [],
  rewardSummary: [],
  ...(questPoints === undefined ? {} : { questPoints }),
});

test('completed quests award quest points, tutorials none by default', () => {
  const quests = new Map([quest('tutorial', 'tutorial'), quest('novice', 'side'), quest('epic', 'main', 3), quest('unfinished', 'side')].map((entry) => [entry.id, entry]));
  const log = {
    tutorial: { questId: 'tutorial', status: 'completed', stepIndex: 0, objectiveProgress: [] },
    novice: { questId: 'novice', status: 'completed', stepIndex: 0, objectiveProgress: [] },
    epic: { questId: 'epic', status: 'completed', stepIndex: 0, objectiveProgress: [] },
    unfinished: { questId: 'unfinished', status: 'active', stepIndex: 0, objectiveProgress: [0] },
  } as const;
  assert.equal(questPointsEarned(log, quests), 4);
});

test('a quest point condition compares against the points earned', () => {
  const context: ConditionContext = { countItem: () => 0, questStanding: () => ({ status: 'notStarted' }), hasFlag: () => false, questPoints: () => 5, skills: {} as ConditionContext['skills'] };
  assert.equal(isConditionMet({ type: 'questPoints', atLeast: 5 }, context), true);
  assert.equal(isConditionMet({ type: 'questPoints', atLeast: 6 }, context), false);
});

test('the innermost area decides whether a tile is safe', () => {
  const areas = [
    { rect: { x: 0, y: 0, width: 20, height: 20 }, safe: true },
    { rect: { x: 5, y: 5, width: 4, height: 4 }, safe: false },
  ];
  assert.equal(isSafeIn(areas, { x: 1, y: 1 }), true);
  assert.equal(isSafeIn(areas, { x: 6, y: 6 }), false);
  assert.equal(isSafeIn(areas, { x: 30, y: 30 }), false);
});
