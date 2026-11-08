import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  focusedHandheldQuest,
  GAME_CONTENT,
  isHandheld,
  npcQuestMarker,
  objectiveAreas,
  routeGoals,
  trackedQuests,
  type QuestDefinition,
  type QuestLog,
  type RouteScene,
} from '../src/index.ts';

const activeAt = (questId: string, stepIndex: number): QuestLog => ({
  [questId]: { questId, status: 'active', stepIndex, objectiveProgress: [0] },
});

const level = (id: string) => {
  const resolved = GAME_CONTENT.levels.get(id);
  assert.ok(resolved);
  return resolved;
};

const sceneOf = (levelId: string): RouteScene => ({ level: level(levelId), npcPositions: new Map(), creatures: [], depletedInstances: new Set() });

describe('quest handholding', () => {
  test('tutorial quests are handheld and every other quest is journal-only by default', () => {
    for (const quest of GAME_CONTENT.quests.values()) {
      if (quest.handheld === undefined) assert.equal(isHandheld(quest), quest.category === 'tutorial', quest.id);
    }
  });

  test('the per-quest flag overrides the category default both ways', () => {
    const base = GAME_CONTENT.quests.get('the-knocking') as QuestDefinition;
    assert.equal(isHandheld({ ...base, handheld: true }), true);
    assert.equal(isHandheld({ ...base, category: 'tutorial', handheld: false }), false);
  });

  test('journal-only quests raise no objective markers in the world but stay in the journal', () => {
    const log = activeAt('the-knocking', 0);
    assert.equal(trackedQuests(log, GAME_CONTENT.quests).length, 1);
    assert.notEqual(npcQuestMarker('sergeant-kade', log, GAME_CONTENT.quests), 'objective');
    assert.equal(focusedHandheldQuest(log, GAME_CONTENT.quests, 'the-knocking'), undefined);
  });

  test('flagging a quest as handheld brings its markers back', () => {
    const base = GAME_CONTENT.quests.get('the-knocking') as QuestDefinition;
    const quests = new Map([...GAME_CONTENT.quests, ['the-knocking', { ...base, handheld: true }]]);
    assert.equal(npcQuestMarker('sergeant-kade', activeAt('the-knocking', 0), quests), 'objective');
  });

  test('a handheld talk step routes to the NPC, preferring their live position', () => {
    const tracked = focusedHandheldQuest(activeAt('orientation-protocol', 0), GAME_CONTENT.quests, null);
    assert.ok(tracked);
    const levelId = [...GAME_CONTENT.levels.values()].find((resolved) => resolved.npcs.some((npc) => npc.npcId === 'officer-reyes'))?.id;
    assert.ok(levelId);
    const placed = routeGoals(tracked, sceneOf(levelId), GAME_CONTENT);
    assert.equal(placed.length, 1);
    assert.equal(placed[0]?.arriveAdjacent, true);
    const live = routeGoals(tracked, { ...sceneOf(levelId), npcPositions: new Map([['officer-reyes', { x: 3, y: 4 }]]) }, GAME_CONTENT);
    assert.deepEqual(live, [{ point: { x: 3, y: 4 }, arriveAdjacent: true }]);
  });

  test('a handheld area step routes to the middle of the area', () => {
    const log = activeAt('orientation-protocol', 4);
    const tracked = focusedHandheldQuest(log, GAME_CONTENT.quests, null);
    assert.ok(tracked);
    const [target] = objectiveAreas(log, GAME_CONTENT.quests);
    const levelId = [...GAME_CONTENT.levels.values()].find((resolved) => resolved.areas.some((area) => area.districtId === target?.districtId && area.id === target?.areaId))?.id;
    assert.ok(levelId);
    const goals = routeGoals(tracked, sceneOf(levelId), GAME_CONTENT);
    assert.equal(goals.length, 1);
    assert.equal(goals[0]?.arriveAdjacent, false);
  });
});
