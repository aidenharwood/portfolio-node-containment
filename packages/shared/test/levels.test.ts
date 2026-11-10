import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  buildLevelIndex,
  createObjectWalkabilityGrid,
  createWalkabilityGrid,
  findLevelIssues,
  GAME_CONTENT,
  locate,
  tileKey,
  type DistrictDefinition,
  type GameContent,
  type LevelDefinition,
  type TilePoint,
  type WorldObjectDefinition,
} from '../src/index.ts';

const AMBIENCE = { darkness: 0.4, tint: '#000000', fog: '#000000' };

const room = (id: string, map: readonly string[], extras: Partial<DistrictDefinition> = {}): DistrictDefinition => ({
  id,
  name: id,
  subtitle: '',
  tier: 1,
  region: 'meridian-core',
  map,
  ambience: AMBIENCE,
  areas: [],
  npcs: [],
  objects: [],
  lights: [],
  ...extras,
});

const HATCH: WorldObjectDefinition = {
  id: 'fixture-hatch',
  name: 'Hatch',
  examine: 'A hatch.',
  model: 'bulkhead',
  blocksMovement: true,
  interactions: [{ verb: 'Enter', effects: [{ type: 'teleport', districtId: 'far', position: { x: 1, y: 1 } }] }],
};

const BOX = ['#####', '#...#', '#####'];

function fixtureContent(levels: readonly LevelDefinition[], districts: readonly DistrictDefinition[]): GameContent {
  const districtMap = new Map(districts.map((district) => [district.id, district]));
  const index = buildLevelIndex(levels, districtMap);
  return {
    ...GAME_CONTENT,
    districts: districtMap,
    levels: index.levels,
    levelOfDistrict: index.levelOfDistrict,
    worldObjects: new Map([...GAME_CONTENT.worldObjects, [HATCH.id, HATCH]]),
  };
}

const level = (districts: LevelDefinition['districts']): LevelDefinition => ({
  id: 'fixture',
  name: 'Fixture',
  kind: 'floor',
  depth: 0,
  districts,
  connectors: [],
  spawn: { districtId: districts[0]?.districtId ?? 'near', position: { x: 1, y: 1 } },
});

function reachableFrom(content: GameContent, levelId: string, start: TilePoint): Set<string> {
  const resolved = content.levels.get(levelId);
  assert.ok(resolved);
  const grid = createObjectWalkabilityGrid(resolved.layout, resolved.objects, (objectId) => content.worldObjects.get(objectId));
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length > 0) {
    const point = queue.pop() as TilePoint;
    if (seen.has(tileKey(point)) || !grid.isWalkable(point)) continue;
    seen.add(tileKey(point));
    queue.push({ x: point.x + 1, y: point.y }, { x: point.x - 1, y: point.y }, { x: point.x, y: point.y + 1 }, { x: point.x, y: point.y - 1 });
  }
  return seen;
}

describe('levels', () => {
  test('every district belongs to exactly one level', () => {
    assert.equal(GAME_CONTENT.levelOfDistrict.size, GAME_CONTENT.districts.size);
    const placements = [...GAME_CONTENT.levels.values()].flatMap((resolved) => resolved.definition.districts.map((placement) => placement.districtId));
    assert.equal(new Set(placements).size, placements.length);
  });

  test('locate translates district-local points into level points', () => {
    assert.deepEqual(locate(GAME_CONTENT, 'meridian-atrium', { x: 5, y: 28 }), { levelId: 'main-floor', position: { x: 61, y: 58 } });
  });

  test('locate is undefined for an unknown district', () => {
    assert.equal(locate(GAME_CONTENT, 'sector-nine', { x: 1, y: 1 }), undefined);
  });

  test('the Verdance Concourse joins the Atrium and Hydroponics', () => {
    const mainFloor = GAME_CONTENT.levels.get('main-floor');
    assert.ok(mainFloor);
    const target = locate(GAME_CONTENT, 'hydroponics', { x: 3, y: 12 });
    assert.ok(target);
    assert.ok(reachableFrom(GAME_CONTENT, 'main-floor', mainFloor.spawn).has(tileKey(target.position)));
  });

  test('the Service Concourse joins the Atrium and the Service Yards', () => {
    const mainFloor = GAME_CONTENT.levels.get('main-floor');
    assert.ok(mainFloor);
    const target = locate(GAME_CONTENT, 'service-yards', { x: 29, y: 27 });
    assert.ok(target);
    assert.ok(reachableFrom(GAME_CONTENT, 'main-floor', mainFloor.spawn).has(tileKey(target.position)));
  });

  test('the Intake Wing is reached by tram, not on foot', () => {
    const mainFloor = GAME_CONTENT.levels.get('main-floor');
    const intake = locate(GAME_CONTENT, 'intake-wing', { x: 4, y: 5 });
    assert.ok(mainFloor && intake);
    assert.ok(!reachableFrom(GAME_CONTENT, 'main-floor', mainFloor.spawn).has(tileKey(intake.position)));
    assert.ok([...GAME_CONTENT.tram.stations.values()].some((station) => station.districtId === 'intake-wing'));
  });

  test('every Deep district is joined to Deepwatch by corridor or pressure door', () => {
    const deep = GAME_CONTENT.levels.get('the-deep');
    assert.ok(deep);
    const reachable = reachableFrom(GAME_CONTENT, 'the-deep', deep.spawn);
    for (const [districtId, local] of [['deep-concourse', { x: 7, y: 4 }], ['furnace-causeway', { x: 45, y: 3 }]] as const) {
      const point = locate(GAME_CONTENT, districtId, local);
      assert.ok(point && reachable.has(tileKey(point.position)), districtId);
    }
  });

  test('the shipped content has no level issues', () => {
    assert.deepEqual(findLevelIssues(GAME_CONTENT), []);
  });

  test('findLevelIssues reports overlapping placements', () => {
    const content = fixtureContent(
      [level([{ districtId: 'near', origin: { x: 0, y: 0 } }, { districtId: 'far', origin: { x: 2, y: 0 } }])],
      [room('near', BOX), room('far', BOX)],
    );
    assert.ok(findLevelIssues(content).some((issue) => issue.includes('overlap')));
  });

  test('findLevelIssues reports unreachable walkable tiles', () => {
    const content = fixtureContent(
      [level([{ districtId: 'near', origin: { x: 0, y: 0 } }, { districtId: 'far', origin: { x: 10, y: 0 } }])],
      [room('near', BOX), room('far', BOX)],
    );
    assert.ok(findLevelIssues(content).some((issue) => issue.includes('unreachable')));
  });

  test('findLevelIssues reports duplicate instance ids within a level', () => {
    const npc = { instanceId: 'twin', npcId: [...GAME_CONTENT.npcs.keys()][0] as string, position: { x: 2, y: 1 } };
    const content = fixtureContent(
      [level([{ districtId: 'near', origin: { x: 0, y: 0 } }, { districtId: 'far', origin: { x: 5, y: 0 } }])],
      [room('near', ['#####', '#...D'], { npcs: [npc] }), room('far', ['#####', 'D...#'], { npcs: [npc] })],
    );
    assert.ok(findLevelIssues(content).some((issue) => issue.includes('instance id "twin"')));
  });

  test('findLevelIssues treats teleport destinations as reachable from their source object', () => {
    const content = fixtureContent(
      [level([{ districtId: 'near', origin: { x: 0, y: 0 } }, { districtId: 'far', origin: { x: 10, y: 0 } }])],
      [
        room('near', BOX, { objects: [{ instanceId: 'near-hatch', objectId: HATCH.id, position: { x: 3, y: 1 } }] }),
        room('far', BOX),
      ],
    );
    assert.deepEqual(findLevelIssues(content), []);
  });
});
