import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  createObjectWalkabilityGrid,
  doorTilesOf,
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
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

const regionCache = new Map<LevelId, WalkRegions>();

const regionsOf = (levelId: LevelId): WalkRegions | undefined => {
  const level = FIXTURE_CONTENT.levels.get(levelId);
  if (!level) return undefined;
  const cached = regionCache.get(levelId);
  if (cached) return cached;
  const definitionOf = (objectId: string) => FIXTURE_CONTENT.worldObjects.get(objectId);
  const grid = withOpenDoors(createObjectWalkabilityGrid(level.layout, level.objects, definitionOf), level.layout, doorTilesOf(level.objects, definitionOf), () => true);
  const regions = levelRegions(level, grid);
  regionCache.set(levelId, regions);
  return regions;
};

const at = (districtId: string, x: number, y: number): WorldLocation => {
  const location = locate(FIXTURE_CONTENT, districtId, { x, y });
  assert.ok(location);
  return location;
};

const anchorAt = (districtId: string, anchorId: string): WorldLocation => {
  const point = FIXTURE_CONTENT.districts.get(districtId)?.anchors?.[anchorId];
  assert.ok(point, `missing anchor ${districtId}/${anchorId}`);
  return at(districtId, point.x, point.y);
};

const targetsFor = (log: QuestLog): TransitTarget[] => {
  const tracked = trackedQuest(log, FIXTURE_CONTENT.quests, null);
  assert.ok(tracked);
  return [...FIXTURE_CONTENT.levels.values()].flatMap((level) =>
    routeGoals(tracked, { level, npcPositions: new Map(), creatures: [], depletedInstances: new Set() }, FIXTURE_CONTENT).map((goal) => ({ levelId: level.id, goal })),
  );
};

const access = (stations: readonly string[], passages: readonly string[]) => ({
  knowsStation: (stationId: string) => stations.includes(stationId),
  canUsePassage: (objectId: string) => passages.includes(objectId),
});

const hubPlatform = (): WorldLocation => {
  const station = FIXTURE_CONTENT.tram.stations.get('hub-station');
  assert.ok(station);
  return { levelId: station.levelId, position: station.platformPoint };
};

const islandTarget = (): TransitTarget => {
  const quay = anchorAt('fx-island', 'quay');
  return { levelId: quay.levelId, goal: { point: quay.position, arriveAdjacent: false } };
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

  test('a target reached only by tram routes through a known station', () => {
    const hops = transitHops(FIXTURE_CONTENT, access(['hub-station', 'island-station'], []));
    const plan = planTransit(hubPlatform(), [islandTarget()], hops, regionsOf);
    assert.ok(plan);
    assert.equal(plan.hops.length, 1);
    assert.equal(plan.hops[0]?.kind, 'tram');
    assert.match(plan.hops[0]?.label ?? '', /Island Station/);
    assert.equal(plan.target.levelId, FIXTURE_CONTENT.tram.stations.get('island-station')?.levelId);
  });

  test('an undiscovered station is never offered as a way there', () => {
    const hops = transitHops(FIXTURE_CONTENT, access(['hub-station'], []));
    assert.equal(planTransit(hubPlatform(), [islandTarget()], hops, regionsOf), null);
  });

  test('a quest objective on another level becomes a transit target', () => {
    const log: QuestLog = { 'vault-run': { questId: 'vault-run', status: 'active', stepIndex: 4, objectiveProgress: [0] } };
    const targets = targetsFor(log);
    assert.ok(targets.some((target) => target.levelId === 'fx-depths'));
  });

  test('a target on another level routes through a lift the player can use', () => {
    const below = anchorAt('fx-arena', 'landing');
    const target: TransitTarget = { levelId: below.levelId, goal: { point: below.position, arriveAdjacent: false } };
    const origin = at('fx-hub', 8, 8);

    const blocked = planTransit(origin, [target], transitHops(FIXTURE_CONTENT, access([], [])), regionsOf);
    assert.equal(blocked, null);

    const plan = planTransit(origin, [target], transitHops(FIXTURE_CONTENT, access([], ['lift-down'])), regionsOf);
    assert.ok(plan);
    assert.equal(plan.hops[0]?.kind, 'passage');
    assert.equal(plan.hops[0]?.board?.arriveAdjacent, true);
    assert.equal(plan.hops[0]?.label, 'Use the Lift Down');
  });

  test('a target in reach on foot needs no transit', () => {
    const origin = at('fx-hub', 6, 6);
    const goal = at('fx-hub', 8, 8);
    const plan = planTransit(origin, [{ levelId: goal.levelId, goal: { point: goal.position, arriveAdjacent: false } }], transitHops(FIXTURE_CONTENT, access(['hub-station'], [])), regionsOf);
    assert.ok(plan);
    assert.deepEqual(plan.hops, []);
  });

  test('a passage is open only when its teleport interaction is allowed', () => {
    const lift = FIXTURE_CONTENT.worldObjects.get('lift-down');
    assert.ok(lift);
    const context = (flags: readonly string[]): ConditionContext => ({
      countItem: () => 0,
      questStanding: () => ({ status: 'notStarted' }),
      questPoints: () => 0,
      hasFlag: (flag) => flags.includes(flag),
      skills: {} as ConditionContext['skills'],
    });
    assert.equal(isPassageOpenFor(lift, context([])), false);
    assert.equal(isPassageOpenFor(lift, context(['clearance.depths'])), true);
  });
});
