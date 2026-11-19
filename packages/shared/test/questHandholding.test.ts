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
  objectiveCreatureIds,
  areaGoal,
  GAME_CONTENT,
  type ActiveQuest,
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

  test('a reach step routes toward its hinted objects and the creatures not yet studied', () => {
    const quest = FIXTURE_CONTENT.quests.get('survey');
    assert.ok(quest?.steps[0]);
    const objective = {
      type: 'reach',
      measure: 'research',
      level: 25,
      label: 'Reach Research 25',
      toward: { objects: ['survey-marker'], creatures: ['training-drone'], study: ['gloam-mite', 'lint-mite'] },
    } as const;
    const tracked: ActiveQuest = { quest, step: quest.steps[0], objectives: [{ objective, progress: 10, goal: 25, done: false }] };
    const at = (x: number) => ({ x, y: 1 });
    const creatures = [
      { creatureId: 'training-drone', position: at(1) },
      { creatureId: 'gloam-mite', position: at(2) },
      { creatureId: 'lint-mite', position: at(3) },
    ];
    const markers = level('fx-floor').objects.filter((object) => object.objectId === 'survey-marker').length;
    assert.ok(markers > 0);
    const goals = routeGoals(tracked, { ...sceneOf('fx-floor'), creatures, studiedCreatures: new Set(['gloam-mite']) }, FIXTURE_CONTENT);
    const xs = goals.slice(markers).map((goal) => goal.point.x);
    assert.equal(goals.length, markers + 2);
    assert.deepEqual(xs, [1, 3]);
    assert.ok(objectiveDistricts(tracked.objectives, FIXTURE_CONTENT).size > 0);
    const log: QuestLog = { 'probe': { questId: 'probe', status: 'active', stepIndex: 0, objectiveProgress: [10] } };
    const quests = new Map([['probe', { ...quest, id: 'probe', steps: [{ id: 'ready', journal: 'Ready.', objectives: [objective] }] }]]);
    assert.deepEqual([...objectiveCreatureIds(log, quests, 'probe', new Set(['lint-mite']))].sort(), ['gloam-mite', 'training-drone']);
  });

  test('an area step routes to the middle of the area', () => {
    const log = activeAt('vault-run', stepOf('vault-run', 'enter'));
    const tracked = trackedQuest(log, FIXTURE_CONTENT.quests, null);
    assert.ok(tracked);
    const goals = routeGoals(tracked, sceneOf('fx-floor'), FIXTURE_CONTENT);
    assert.equal(goals.length, 1);
    assert.equal(goals[0]?.arriveAdjacent, false);
  });

  test('an area step in a split square routes to a tile its own district owns', () => {
    const quest = FIXTURE_CONTENT.quests.get('survey');
    assert.ok(quest?.steps[0]);
    const wilds = level('fx-wilds');
    for (const districtId of ['fx-wild-gate-east', 'fx-wild-gate-west']) {
      const objective = { type: 'enterArea', districtId, areaId: 'ground', label: 'Go to the gate' } as const;
      const tracked: ActiveQuest = { quest, step: quest.steps[0], objectives: [{ objective, progress: 0, goal: 1, done: false }] };
      const area = wilds.areas.find((candidate) => candidate.districtId === districtId && candidate.id === 'ground');
      assert.ok(area);
      const goals = routeGoals(tracked, sceneOf('fx-wilds'), FIXTURE_CONTENT);
      assert.deepEqual(goals, [{ point: areaGoal(wilds, area), arriveAdjacent: false }]);
      assert.equal(wilds.layout.districtAt(goals[0]?.point as { x: number; y: number }), districtId);
    }
  });

  test('a shipped area step whose centre is walkable and owned still routes to its centre', () => {
    const levelId = GAME_CONTENT.levelOfDistrict.get('tenements');
    assert.ok(levelId);
    const shipped = GAME_CONTENT.levels.get(levelId);
    const quest = GAME_CONTENT.quests.get('rent-day');
    assert.ok(shipped && quest);
    const stepIndex = quest.steps.findIndex((step) => step.id === 'search');
    const tracked = trackedQuest({ 'rent-day': { questId: 'rent-day', status: 'active', stepIndex, objectiveProgress: [0] } }, GAME_CONTENT.quests, 'rent-day');
    assert.ok(tracked);
    const area = shipped.areas.find((candidate) => candidate.districtId === 'tenements' && candidate.id === 'home-gale');
    assert.ok(area);
    const goals = routeGoals(tracked, { level: shipped, npcPositions: new Map(), creatures: [], depletedInstances: new Set() }, GAME_CONTENT);
    assert.deepEqual(goals, [{ point: { x: area.rect.x + Math.floor(area.rect.width / 2), y: area.rect.y + Math.floor(area.rect.height / 2) }, arriveAdjacent: false }]);
  });
});
