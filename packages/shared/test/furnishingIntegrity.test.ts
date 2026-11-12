import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { findFurnishingIssues, findWorldDesignIssues, GAME_CONTENT, resolveLevel, type DistrictDefinition, type GameContent, type LevelDefinition, type ObjectPlacement, type WorldObjectDefinition } from '../src/index.ts';
import { dressingObjectOf, furnish } from '../src/content/districts/furnish.ts';
import { setPiece } from '../src/content/districts/setPiece.ts';
import { WORLD_OBJECTS } from '../src/content/worldObjects.ts';
import { drawBlueprint, link, room } from '../src/world/blueprint.ts';

const plan = drawBlueprint({ width: 40, height: 26 }, [room('hall', 1, 1, 20, 20, 'plating'), room('annex', 24, 1, 10, 8, 'plating'), link('hall', 'annex', 2, 'door')]);

const baseDistrict = (overrides: Partial<DistrictDefinition> = {}): DistrictDefinition => ({
  id: 'test-yard',
  name: 'Test Yard',
  subtitle: '',
  tier: 1,
  region: 'meridian-core',
  map: plan.map,
  rooms: plan.rooms,
  exits: plan.exits,
  ambience: { darkness: 0.5, tint: '#000000', fog: '#000000' },
  areas: [],
  npcs: [],
  objects: [],
  lights: [],
  ...overrides,
});

const contentWith = (district: DistrictDefinition, worldObjects: ReadonlyMap<string, WorldObjectDefinition> = GAME_CONTENT.worldObjects): GameContent => {
  const level: LevelDefinition = {
    id: 'test-level',
    name: 'Test',
    kind: 'floor',
    depth: 0,
    districts: [{ districtId: district.id, origin: { x: 3, y: 4 } }],
    connectors: [],
    spawn: { districtId: district.id, position: plan.at('hall', 10, 10) },
  };
  const districts = new Map([[district.id, district]]);
  return { ...GAME_CONTENT, worldObjects, districts, levels: new Map([[level.id, resolveLevel(level, districts, GAME_CONTENT.assemblies)]]) } as GameContent;
};

const locker = (instanceId: string, dx: number, dy: number): ObjectPlacement => ({ instanceId, objectId: 'storage-locker', position: plan.at('hall', dx, dy) });

describe('furnishing integrity', () => {
  test('a clean synthetic district has no furnishing issues', () => {
    assert.deepEqual(findFurnishingIssues(contentWith(baseDistrict())), []);
  });

  test('a fixture line sealing a corner of a room is reported as unreachable tiles', () => {
    const seal = [locker('seal-a', 0, 2), locker('seal-b', 1, 2), locker('seal-c', 2, 2), locker('seal-d', 2, 1), locker('seal-e', 2, 0)];
    const issues = findFurnishingIssues(contentWith(baseDistrict({ objects: seal })));
    assert.ok(issues.some((issue) => issue.includes('room "hall"') && issue.includes('unreachable')), issues.join('\n'));
  });

  test('a decal on a door tile is reported', () => {
    const door = plan.linkTile('hall', 'annex');
    const issues = findFurnishingIssues(contentWith(baseDistrict({ decals: [{ kind: 'rug', rect: { x: door.x, y: door.y, width: 1, height: 1 } }] })));
    assert.ok(issues.some((issue) => issue.includes('decal') && issue.includes(`${door.x},${door.y}`)), issues.join('\n'));
  });

  test('composed dressing beside a room opening is reported', () => {
    const door = plan.linkTile('hall', 'annex');
    const crowding: ObjectPlacement = { instanceId: 'test-yard-hall-dressing-1-1', objectId: 'planter', position: { x: door.x - 1, y: door.y } };
    const issues = findFurnishingIssues(contentWith(baseDistrict({ objects: [crowding] })));
    assert.ok(issues.some((issue) => issue.includes('test-yard-hall-dressing-1-1') && issue.includes('opening')), issues.join('\n'));
  });

  test('an uncanny mirror piece on or beside a door is reported', () => {
    const door = plan.linkTile('hall', 'annex');
    const onDoor: ObjectPlacement = { instanceId: 'test-yard-hall-mirror-1', objectId: 'planter', position: door };
    const covered = findFurnishingIssues(contentWith(baseDistrict({ objects: [onDoor] })));
    assert.ok(covered.some((issue) => issue.includes('test-yard-hall-mirror-1') && issue.includes('door tile')), covered.join('\n'));
    const beside: ObjectPlacement = { ...onDoor, position: { x: door.x - 2, y: door.y } };
    const crowded = findFurnishingIssues(contentWith(baseDistrict({ objects: [beside] })));
    assert.ok(crowded.some((issue) => issue.includes('test-yard-hall-mirror-1') && issue.includes('opening')), crowded.join('\n'));
  });

  test('a landmark room without a focal set-piece is reported', () => {
    const district = furnish(plan, baseDistrict(), { hall: 'civic' }, { landmarks: ['hall', 'nowhere'] });
    const issues = findFurnishingIssues(contentWith(district));
    assert.ok(issues.some((issue) => issue.includes('landmark room "hall"') && issue.includes('focal')), issues.join('\n'));
    assert.ok(issues.some((issue) => issue.includes('landmark room "nowhere"') && issue.includes('no such room')), issues.join('\n'));
  });

  test('a landmark room holding a focal set-piece passes', () => {
    const district = furnish(plan, baseDistrict(), { hall: 'mine' }, { landmarks: ['hall'], setPieces: [setPiece(plan, 'hall', 'ore-heap', 8, 9)] });
    assert.deepEqual(findFurnishingIssues(contentWith(district)).filter((issue) => issue.includes('landmark')), []);
  });

  test('a 20×20 room dressed with one prefab is reported', () => {
    const district = baseDistrict({ dressingLog: [{ room: 'hall', composition: 'court', formal: false, prefabs: ['planter-bay', 'planter-bay'], additions: [], setPieces: [] }] });
    const issues = findFurnishingIssues(contentWith(district));
    assert.ok(issues.some((issue) => issue.includes('room "hall"') && issue.includes('distinct prefab')), issues.join('\n'));
  });

  test('an informal room using one prefab more than three times is reported', () => {
    const prefabs = ['a', 'a', 'a', 'a', 'b', 'c'];
    const informal = findFurnishingIssues(contentWith(baseDistrict({ dressingLog: [{ room: 'hall', composition: 'court', formal: false, prefabs, additions: [], setPieces: [] }] })));
    assert.ok(informal.some((issue) => issue.includes('"a"') && issue.includes('4 times')), informal.join('\n'));
    const formal = findFurnishingIssues(contentWith(baseDistrict({ dressingLog: [{ room: 'hall', composition: 'radial', formal: true, prefabs, additions: [], setPieces: [] }] })));
    assert.deepEqual(formal, []);
  });

  test('furnish logs each dressed room with its composition and prefabs', () => {
    const district = furnish(plan, baseDistrict(), { hall: { theme: 'civic', composition: 'court' }, annex: 'office' });
    const hall = district.dressingLog?.find((entry) => entry.room === 'hall');
    const annex = district.dressingLog?.find((entry) => entry.room === 'annex');
    assert.equal(hall?.composition, 'court');
    assert.equal(annex?.composition, 'workroom');
    assert.ok((hall?.prefabs.length ?? 0) > 0);
  });
});

describe('fixtures against walls', () => {
  const wideLocker: WorldObjectDefinition = { ...GAME_CONTENT.worldObjects.get('storage-locker')!, id: 'wide-locker', footprint: { width: 3, height: 1 } };
  const squareLocker: WorldObjectDefinition = { ...GAME_CONTENT.worldObjects.get('storage-locker')!, id: 'square-locker', footprint: { width: 2, height: 2 } };
  const objects = new Map([...GAME_CONTENT.worldObjects, ['wide-locker', wideLocker], ['square-locker', squareLocker]]);
  const squareIssues = (dy: number) =>
    findWorldDesignIssues(contentWith(baseDistrict({ objects: [{ instanceId: 'square', objectId: 'square-locker', position: plan.at('hall', 9, dy), facing: 'north' }] }), objects)).filter((issue) =>
      issue.includes('"square"'),
    );
  const fixtureIssues = (dy: number) =>
    findWorldDesignIssues(contentWith(baseDistrict({ objects: [{ instanceId: 'wide', objectId: 'wide-locker', position: plan.at('hall', 4, dy), facing: 'south' }] }), objects)).filter((issue) =>
      issue.includes('"wide"'),
    );

  test('a 3×1 wall fixture with its back edge on the wall passes', () => {
    assert.deepEqual(fixtureIssues(0), []);
  });

  test('the same fixture one tile off the wall is reported', () => {
    assert.equal(fixtureIssues(1).length, 1);
  });

  test('a 2×2 fixture facing north passes when its far back edge meets the south wall', () => {
    assert.deepEqual(squareIssues(18), []);
  });

  test('a 2×2 fixture facing north is reported one tile off the south wall, and with only its anchor row on the north wall', () => {
    assert.equal(squareIssues(17).length, 1);
    assert.equal(squareIssues(0).length, 1);
  });
});

describe('dressing lookup', () => {
  test('every world object with a footprint resolves through the dressing lookup', () => {
    for (const definition of WORLD_OBJECTS.filter((object) => object.footprint)) {
      assert.equal(dressingObjectOf(definition.id)?.footprint, definition.footprint, definition.id);
    }
  });
});
