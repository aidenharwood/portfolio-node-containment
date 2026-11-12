import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  trackedQuest,
  GAME_CONTENT,
  npcQuestMarker,
  objectiveAreas,
  routeGoals,
  objectiveDistricts,
  activeQuests,
  objectUseFlag,
  usedObjectsOf,
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
    assert.equal(activeQuests(log, GAME_CONTENT.quests).length, 2);
    assert.equal(trackedQuest(log, GAME_CONTENT.quests, 'missing')?.quest.id, 'orientation-protocol');
    assert.equal(trackedQuest(log, GAME_CONTENT.quests, 'the-knocking')?.quest.id, 'the-knocking');
    assert.deepEqual(objectiveAreas(log, GAME_CONTENT.quests, 'the-knocking'), []);
    assert.notEqual(npcQuestMarker('sergeant-kade', log, GAME_CONTENT.quests, 'orientation-protocol'), 'objective');
    assert.deepEqual(objectiveAreas(log, GAME_CONTENT.quests, 'orientation-protocol'), [{ districtId: 'intake-wing', areaId: 'observation' }]);
  });

  test('with nothing tracked the first active quest is guided', () => {
    const log = { ...activeAt('the-knocking', 0), ...activeAt('orientation-protocol', 4) };
    assert.equal(trackedQuest(log, GAME_CONTENT.quests, null)?.quest.id, 'orientation-protocol');
    assert.equal(trackedQuest({}, GAME_CONTENT.quests, null), undefined);
  });

  test('a talk step routes to the NPC, preferring their live position', () => {
    const tracked = trackedQuest(activeAt('orientation-protocol', 0), GAME_CONTENT.quests, null);
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
    const tracked = trackedQuest(activeAt('the-knocking', 0), GAME_CONTENT.quests, 'the-knocking');
    assert.ok(tracked);
    const levelId = [...GAME_CONTENT.levels.values()].find((resolved) => resolved.npcs.some((npc) => npc.npcId === 'sergeant-kade'))?.id;
    assert.ok(levelId);
    assert.ok(routeGoals(tracked, sceneOf(levelId), GAME_CONTENT).length > 0);
  });

  test('a fetch step routes to the object that hands out the item', () => {
    const quest = GAME_CONTENT.quests.get('orientation-protocol');
    const stepIndex = quest?.steps.findIndex((step) => step.id === 'retrieve-sample') ?? -1;
    const tracked = trackedQuest(activeAt('orientation-protocol', stepIndex), GAME_CONTENT.quests, null);
    assert.ok(tracked);
    const levelId = [...GAME_CONTENT.levels.values()].find((resolved) => resolved.objects.some((object) => object.objectId === 'sample-cabinet'))?.id;
    assert.ok(levelId);
    const cabinets = level(levelId).objects.filter((object) => object.objectId === 'sample-cabinet').map((object) => object.position);
    const goals = routeGoals(tracked, sceneOf(levelId), GAME_CONTENT);
    assert.ok(goals.length > 0);
    assert.ok(goals.every((goal) => cabinets.some((point) => point.x === goal.point.x && point.y === goal.point.y)));
  });

  for (const [questId, stepId] of [
    ['the-knocking', 'override'],
    ['original-contract', 'key'],
  ] as const) {
    test(`a fetch step for ${questId} routes to the NPC whose dialogue hands it over`, () => {
      const quest = GAME_CONTENT.quests.get(questId);
      const stepIndex = quest?.steps.findIndex((step) => step.id === stepId) ?? -1;
      assert.ok(stepIndex >= 0);
      const tracked = trackedQuest(activeAt(questId, stepIndex), GAME_CONTENT.quests, questId);
      assert.ok(tracked);
      const levelId = [...GAME_CONTENT.levels.values()].find((resolved) => resolved.npcs.some((npc) => npc.npcId === 'engineer-lund'))?.id;
      assert.ok(levelId);
      const live = routeGoals(tracked, { ...sceneOf(levelId), npcPositions: new Map([['engineer-lund', { x: 7, y: 9 }]]) }, GAME_CONTENT);
      assert.deepEqual(live, [{ point: { x: 7, y: 9 }, arriveAdjacent: true }]);
      assert.ok(objectiveDistricts(tracked.objectives, GAME_CONTENT).size > 0);
    });
  }

  test('a multi-object step stops routing to the objects this character already used', () => {
    const quest = GAME_CONTENT.quests.get('the-far-side');
    const stepIndex = quest?.steps.findIndex((step) => step.id === 'restore-power') ?? -1;
    const tracked = trackedQuest(activeAt('the-far-side', stepIndex), GAME_CONTENT.quests, null);
    assert.ok(tracked);
    const levelId = [...GAME_CONTENT.levels.values()].find((resolved) => resolved.objects.some((object) => object.instanceId === 'uc-junction-a'))?.id;
    assert.ok(levelId);
    const junction = (instanceId: string) => level(levelId).objects.find((object) => object.instanceId === instanceId)?.position;
    const flags = [objectUseFlag('undercroft', 'uc-junction-a', 0), objectUseFlag('undercroft', 'uc-junction-c', 0), 'visited:undercroft'];
    assert.deepEqual(usedObjectsOf(flags), ['uc-junction-a', 'uc-junction-c']);
    const goals = routeGoals(tracked, { ...sceneOf(levelId), depletedInstances: new Set(usedObjectsOf(flags)) }, GAME_CONTENT);
    const routed = (instanceId: string) => goals.some((goal) => goal.point === junction(instanceId));
    assert.ok(routed('uc-junction-b'));
    assert.ok(!routed('uc-junction-a') && !routed('uc-junction-c'));
  });

  test('an area step routes to the middle of the area', () => {
    const log = activeAt('orientation-protocol', 4);
    const tracked = trackedQuest(log, GAME_CONTENT.quests, null);
    assert.ok(tracked);
    const [target] = objectiveAreas(log, GAME_CONTENT.quests, null);
    const levelId = [...GAME_CONTENT.levels.values()].find((resolved) => resolved.areas.some((area) => area.districtId === target?.districtId && area.id === target?.areaId))?.id;
    assert.ok(levelId);
    const goals = routeGoals(tracked, sceneOf(levelId), GAME_CONTENT);
    assert.equal(goals.length, 1);
    assert.equal(goals[0]?.arriveAdjacent, false);
  });
});
