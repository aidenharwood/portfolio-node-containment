import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  trackedQuest,
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
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

const activeAt = (questId: string, stepIndex: number): QuestLog => ({
  [questId]: { questId, status: 'active', stepIndex, objectiveProgress: [0] },
});

const level = (id: string) => {
  const resolved = FIXTURE_CONTENT.levels.get(id);
  assert.ok(resolved);
  return resolved;
};

const sceneOf = (levelId: string): RouteScene => ({ level: level(levelId), npcPositions: new Map(), creatures: [], depletedInstances: new Set() });

const stepOf = (questId: string, stepId: string): number => FIXTURE_CONTENT.quests.get(questId)?.steps.findIndex((step) => step.id === stepId) ?? -1;

describe('quest handholding', () => {
  test('any tracked quest raises objective markers in the world', () => {
    const log = activeAt('survey', 0);
    assert.equal(npcQuestMarker('registrar', log, FIXTURE_CONTENT.quests, 'survey'), 'objective');
    assert.equal(npcQuestMarker('registrar', log, FIXTURE_CONTENT.quests, null), 'objective');
  });

  test('only the tracked quest is guided when several are active', () => {
    const log = { ...activeAt('survey', 0), ...activeAt('vault-run', stepOf('vault-run', 'enter')) };
    assert.equal(activeQuests(log, FIXTURE_CONTENT.quests).length, 2);
    assert.equal(trackedQuest(log, FIXTURE_CONTENT.quests, 'missing')?.quest.id, 'vault-run');
    assert.equal(trackedQuest(log, FIXTURE_CONTENT.quests, 'survey')?.quest.id, 'survey');
    assert.deepEqual(objectiveAreas(log, FIXTURE_CONTENT.quests, 'survey'), []);
    assert.notEqual(npcQuestMarker('registrar', log, FIXTURE_CONTENT.quests, 'vault-run'), 'objective');
    assert.deepEqual(objectiveAreas(log, FIXTURE_CONTENT.quests, 'vault-run'), [{ districtId: 'fx-field', areaId: 'vault' }]);
  });

  test('with nothing tracked the first active main quest is guided', () => {
    const log = { ...activeAt('survey', 0), ...activeAt('vault-run', 0) };
    assert.equal(trackedQuest(log, FIXTURE_CONTENT.quests, null)?.quest.id, 'vault-run');
    assert.equal(trackedQuest({}, FIXTURE_CONTENT.quests, null), undefined);
  });

  test('a talk step routes to the NPC, preferring their live position', () => {
    const tracked = trackedQuest(activeAt('survey', 0), FIXTURE_CONTENT.quests, null);
    assert.ok(tracked);
    const placed = routeGoals(tracked, sceneOf('fx-floor'), FIXTURE_CONTENT);
    assert.equal(placed.length, 1);
    assert.equal(placed[0]?.arriveAdjacent, true);
    const live = routeGoals(tracked, { ...sceneOf('fx-floor'), npcPositions: new Map([['registrar', { x: 3, y: 4 }]]) }, FIXTURE_CONTENT);
    assert.deepEqual(live, [{ point: { x: 3, y: 4 }, arriveAdjacent: true }]);
  });

  test('a fetch step routes to the object that hands out the item', () => {
    const tracked = trackedQuest(activeAt('vault-run', stepOf('vault-run', 'log')), FIXTURE_CONTENT.quests, null);
    assert.ok(tracked);
    const terminals = level('fx-floor').objects.filter((object) => object.objectId === 'vault-terminal').map((object) => object.position);
    const goals = routeGoals(tracked, sceneOf('fx-floor'), FIXTURE_CONTENT);
    assert.ok(goals.length > 0);
    assert.ok(goals.every((goal) => terminals.some((point) => point.x === goal.point.x && point.y === goal.point.y)));
  });

  test('a fetch step routes to the NPC whose dialogue hands the item over', () => {
    const tracked = trackedQuest(activeAt('vault-run', stepOf('vault-run', 'brief')), FIXTURE_CONTENT.quests, 'vault-run');
    assert.ok(tracked);
    const live = routeGoals(tracked, { ...sceneOf('fx-floor'), npcPositions: new Map([['handler', { x: 7, y: 9 }]]) }, FIXTURE_CONTENT);
    assert.deepEqual(live, [{ point: { x: 7, y: 9 }, arriveAdjacent: true }]);
    assert.ok(objectiveDistricts(tracked.objectives, FIXTURE_CONTENT).size > 0);
  });

  test('a multi-object step stops routing to the objects this character already used', () => {
    const tracked = trackedQuest(activeAt('survey', stepOf('survey', 'mark')), FIXTURE_CONTENT.quests, null);
    assert.ok(tracked);
    const marker = (instanceId: string) => level('fx-floor').objects.find((object) => object.instanceId === instanceId)?.position;
    const flags = [objectUseFlag('fx-field', 'survey-a', 0), objectUseFlag('fx-field', 'survey-c', 0), 'visited:fx-floor'];
    assert.deepEqual(usedObjectsOf(flags), ['survey-a', 'survey-c']);
    const goals = routeGoals(tracked, { ...sceneOf('fx-floor'), depletedInstances: new Set(usedObjectsOf(flags)) }, FIXTURE_CONTENT);
    const routed = (instanceId: string) => goals.some((goal) => goal.point === marker(instanceId));
    assert.ok(routed('survey-b'));
    assert.ok(!routed('survey-a') && !routed('survey-c'));
  });

  test('an area step routes to the middle of the area', () => {
    const log = activeAt('vault-run', stepOf('vault-run', 'enter'));
    const tracked = trackedQuest(log, FIXTURE_CONTENT.quests, null);
    assert.ok(tracked);
    const goals = routeGoals(tracked, sceneOf('fx-floor'), FIXTURE_CONTENT);
    assert.equal(goals.length, 1);
    assert.equal(goals[0]?.arriveAdjacent, false);
  });
});
