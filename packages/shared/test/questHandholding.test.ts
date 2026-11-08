import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  focusedQuest,
  GAME_CONTENT,
  guidedQuest,
  npcQuestMarker,
  objectiveAreas,
  routeGoals,
  trackedQuests,
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
  test('any tracked quest raises objective markers in the world', () => {
    const log = activeAt('the-knocking', 0);
    assert.equal(npcQuestMarker('sergeant-kade', log, GAME_CONTENT.quests, 'the-knocking'), 'objective');
    assert.equal(npcQuestMarker('sergeant-kade', log, GAME_CONTENT.quests, null), 'objective');
  });

  test('only the tracked quest is guided when several are active', () => {
    const log = { ...activeAt('the-knocking', 0), ...activeAt('orientation-protocol', 4) };
    assert.equal(trackedQuests(log, GAME_CONTENT.quests).length, 2);
    assert.deepEqual(guidedQuest(log, GAME_CONTENT.quests, 'the-knocking').map(({ quest }) => quest.id), ['the-knocking']);
    assert.deepEqual(objectiveAreas(log, GAME_CONTENT.quests, 'the-knocking'), []);
    assert.notEqual(npcQuestMarker('sergeant-kade', log, GAME_CONTENT.quests, 'orientation-protocol'), 'objective');
    assert.deepEqual(objectiveAreas(log, GAME_CONTENT.quests, 'orientation-protocol'), [{ districtId: 'intake-wing', areaId: 'observation' }]);
  });

  test('with nothing tracked the first active quest is guided', () => {
    const log = { ...activeAt('the-knocking', 0), ...activeAt('orientation-protocol', 4) };
    assert.deepEqual(guidedQuest(log, GAME_CONTENT.quests, null).map(({ quest }) => quest.id), ['orientation-protocol']);
    assert.deepEqual(guidedQuest({}, GAME_CONTENT.quests, null), []);
  });

  test('a talk step routes to the NPC, preferring their live position', () => {
    const tracked = focusedQuest(activeAt('orientation-protocol', 0), GAME_CONTENT.quests, null);
    assert.ok(tracked);
    const levelId = [...GAME_CONTENT.levels.values()].find((resolved) => resolved.npcs.some((npc) => npc.npcId === 'officer-reyes'))?.id;
    assert.ok(levelId);
    const placed = routeGoals(tracked, sceneOf(levelId), GAME_CONTENT);
    assert.equal(placed.length, 1);
    assert.equal(placed[0]?.arriveAdjacent, true);
    const live = routeGoals(tracked, { ...sceneOf(levelId), npcPositions: new Map([['officer-reyes', { x: 3, y: 4 }]]) }, GAME_CONTENT);
    assert.deepEqual(live, [{ point: { x: 3, y: 4 }, arriveAdjacent: true }]);
  });

  test('a side quest talk step routes to its NPC too', () => {
    const tracked = focusedQuest(activeAt('the-knocking', 0), GAME_CONTENT.quests, 'the-knocking');
    assert.ok(tracked);
    const levelId = [...GAME_CONTENT.levels.values()].find((resolved) => resolved.npcs.some((npc) => npc.npcId === 'sergeant-kade'))?.id;
    assert.ok(levelId);
    assert.ok(routeGoals(tracked, sceneOf(levelId), GAME_CONTENT).length > 0);
  });

  test('an area step routes to the middle of the area', () => {
    const log = activeAt('orientation-protocol', 4);
    const tracked = focusedQuest(log, GAME_CONTENT.quests, null);
    assert.ok(tracked);
    const [target] = objectiveAreas(log, GAME_CONTENT.quests, null);
    const levelId = [...GAME_CONTENT.levels.values()].find((resolved) => resolved.areas.some((area) => area.districtId === target?.districtId && area.id === target?.areaId))?.id;
    assert.ok(levelId);
    const goals = routeGoals(tracked, sceneOf(levelId), GAME_CONTENT);
    assert.equal(goals.length, 1);
    assert.equal(goals[0]?.arriveAdjacent, false);
  });
});
