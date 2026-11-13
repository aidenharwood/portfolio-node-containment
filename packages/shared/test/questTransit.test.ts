import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  createObjectWalkabilityGrid,
  doorTilesOf,
  GAME_CONTENT,
  isPassageOpenFor,
  levelRegions,
  locate,
  planTransit,
  routeGoals,
  trackedQuest,
  transitHops,
  walkRegions,
  withOpenDoors,
  type ConditionContext,
  type LevelId,
  type QuestLog,
  type TransitTarget,
  type WalkRegions,
  type WorldLocation,
} from '../src/index.ts';

const regionCache = new Map<LevelId, WalkRegions>();

const regionsOf = (levelId: LevelId): WalkRegions | undefined => {
  const level = GAME_CONTENT.levels.get(levelId);
  if (!level) return undefined;
  const cached = regionCache.get(levelId);
  if (cached) return cached;
  const definitionOf = (objectId: string) => GAME_CONTENT.worldObjects.get(objectId);
  const grid = withOpenDoors(createObjectWalkabilityGrid(level.layout, level.objects, definitionOf), level.layout, doorTilesOf(level.objects, definitionOf), () => true);
  const regions = levelRegions(level, grid);
  regionCache.set(levelId, regions);
  return regions;
};

const at = (districtId: string, x: number, y: number): WorldLocation => {
  const location = locate(GAME_CONTENT, districtId, { x, y });
  assert.ok(location);
  return location;
};

const anchorAt = (districtId: string, anchorId: string): WorldLocation => {
  const point = GAME_CONTENT.districts.get(districtId)?.anchors?.[anchorId];
  assert.ok(point, `missing anchor ${districtId}/${anchorId}`);
  return at(districtId, point.x, point.y);
};

const targetsFor = (log: QuestLog): TransitTarget[] => {
  const tracked = trackedQuest(log, GAME_CONTENT.quests, null);
  assert.ok(tracked);
  return [...GAME_CONTENT.levels.values()].flatMap((level) =>
    routeGoals(tracked, { level, npcPositions: new Map(), creatures: [], depletedInstances: new Set() }, GAME_CONTENT).map((goal) => ({ levelId: level.id, goal })),
  );
};

const access = (stations: readonly string[], passages: readonly string[]) => ({
  knowsStation: (stationId: string) => stations.includes(stationId),
  canUsePassage: (objectId: string) => passages.includes(objectId),
});

const intakePlatform = (): WorldLocation => {
  const station = GAME_CONTENT.tram.stations.get('intake-transit');
  assert.ok(station);
  return { levelId: station.levelId, position: station.platformPoint };
};

describe('quest transit routing', () => {
  test('walk regions split tiles that cannot reach each other', () => {
    const open = new Set(['0,0', '1,0', '3,0']);
    const regions = walkRegions({ isWalkable: ({ x, y }) => open.has(`${x},${y}`) }, 4, 1);
    assert.equal(regions.regionAt({ x: 0, y: 0 }), regions.regionAt({ x: 1, y: 0 }));
    assert.notEqual(regions.regionAt({ x: 0, y: 0 }), regions.regionAt({ x: 3, y: 0 }));
    assert.equal(regions.regionAt({ x: 2, y: 0 }), -1);
    assert.equal(regions.regionAt({ x: 9, y: 9 }), -1);
  });

  test('a trainee heading for the Atrium is sent to the Intake tram', () => {
    const log: QuestLog = { 'cleared-for-transit': { questId: 'cleared-for-transit', status: 'active', stepIndex: 3, objectiveProgress: [0] } };
    const hops = transitHops(GAME_CONTENT, access(['intake-transit', 'atrium-transit'], []));
    const plan = planTransit(intakePlatform(), targetsFor(log), hops, regionsOf);
    assert.ok(plan);
    assert.equal(plan.hops.length, 1);
    assert.equal(plan.hops[0]?.kind, 'tram');
    assert.match(plan.hops[0]?.label ?? '', /Atrium Transit Bay/);
    assert.equal(plan.target.levelId, GAME_CONTENT.tram.stations.get('atrium-transit')?.levelId);
  });

  test('an undiscovered station is never offered as a way there', () => {
    const log: QuestLog = { 'cleared-for-transit': { questId: 'cleared-for-transit', status: 'active', stepIndex: 3, objectiveProgress: [0] } };
    const hops = transitHops(GAME_CONTENT, access(['intake-transit'], []));
    assert.equal(planTransit(intakePlatform(), targetsFor(log), hops, regionsOf), null);
  });

  test('a target on another level routes through a lift the player can use', () => {
    const lift = GAME_CONTENT.levels.get(at('meridian-atrium', 0, 0).levelId)?.objects.find((placement) => placement.objectId === 'atrium-service-lift');
    assert.ok(lift);
    const below = anchorAt('undercroft', 'liftArrival');
    const target: TransitTarget = { levelId: below.levelId, goal: { point: below.position, arriveAdjacent: false } };
    const origin = at('meridian-atrium', 6, 31);

    const blocked = planTransit(origin, [target], transitHops(GAME_CONTENT, access([], [])), regionsOf);
    assert.equal(blocked, null);

    const plan = planTransit(origin, [target], transitHops(GAME_CONTENT, access([], ['atrium-service-lift'])), regionsOf);
    assert.ok(plan);
    assert.equal(plan.hops[0]?.kind, 'passage');
    const board = plan.hops[0]?.board;
    assert.equal(board?.arriveAdjacent, true);
    const boarded = GAME_CONTENT.levels.get(at('meridian-atrium', 0, 0).levelId)?.objects.find((placement) => placement.position.x === board?.point.x && placement.position.y === board.point.y);
    assert.equal(boarded && (GAME_CONTENT.worldObjects.get(boarded.objectId)?.countsAs ?? boarded.objectId), 'atrium-service-lift');
    assert.equal(plan.hops[0]?.label, 'Use the Service Lift');
  });

  test('a target in reach on foot needs no transit', () => {
    const origin = at('meridian-atrium', 6, 31);
    const goal = at('meridian-atrium', 8, 31);
    const plan = planTransit(origin, [{ levelId: goal.levelId, goal: { point: goal.position, arriveAdjacent: false } }], transitHops(GAME_CONTENT, access(['atrium-transit'], [])), regionsOf);
    assert.ok(plan);
    assert.deepEqual(plan.hops, []);
  });

  test('a passage is open only when its teleport interaction is allowed', () => {
    const lift = GAME_CONTENT.worldObjects.get('atrium-service-lift');
    assert.ok(lift);
    const context = (flags: readonly string[]): ConditionContext => ({
      countItem: () => 0,
      questStanding: () => ({ status: 'notStarted' }),
      hasFlag: (flag) => flags.includes(flag),
      skills: {} as ConditionContext['skills'],
    });
    assert.equal(isPassageOpenFor(lift, context([])), false);
    assert.equal(isPassageOpenFor(lift, context(['clearance.undercroft'])), true);
  });
});
