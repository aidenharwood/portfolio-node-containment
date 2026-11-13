import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONTENT, resolveLevel, type DistrictDefinition, type GameContent, type LevelDefinition, type ObjectPlacement, type WorldObjectDefinition } from '../src/index.ts';
import { FURNISHING_PROFILES, REPEAT_LIMIT, RHYTHM_LIMIT, ROOM_SIGNATURES } from '../src/content/furnishingCatalogue.ts';
import { furnish, type Dressing } from '../src/content/districts/furnish.ts';
import { setPiece } from '../src/content/districts/setPiece.ts';
import { findPlacementIssues } from '../src/content/placementIntegrity.ts';
import { DRESSING_THEMES } from '../src/content/prefabs/types.ts';
import type { Facing } from '../src/world/geometry.ts';
import { drawBlueprint, link, room } from '../src/world/blueprint.ts';

const plan = drawBlueprint({ width: 40, height: 26 }, [room('hall', 1, 1, 20, 20, 'plating'), room('annex', 24, 1, 10, 8, 'ceramic'), link('hall', 'annex', 2, 'door')]);

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
  return {
    ...GAME_CONTENT,
    worldObjects,
    districts,
    levels: new Map([[level.id, resolveLevel(level, districts, GAME_CONTENT.assemblies)]]),
    levelOfDistrict: new Map([[district.id, level.id]]),
  } as GameContent;
};

const place = (instanceId: string, objectId: string, at: string, dx: number, dy: number, facing?: Facing): ObjectPlacement => ({
  instanceId,
  objectId,
  position: plan.at(at, dx, dy),
  ...(facing ? { facing } : {}),
});

const SIGNED: readonly ObjectPlacement[] = [place('bench', 'briefing-bench', 'hall', 6, 6), place('planter', 'planter', 'hall', 8, 6), place('cot', 'gurney', 'annex', 5, 4)];

const issuesOf = (objects: readonly ObjectPlacement[], dressing: Dressing = { hall: 'civic', annex: 'ward' }, overrides: Partial<DistrictDefinition> = {}, options = {}): string[] =>
  findPlacementIssues(contentWith(furnish(plan, baseDistrict({ objects: [...SIGNED, ...objects], ...overrides }), dressing, options)));

const about = (issues: readonly string[], ...words: readonly string[]): string[] => issues.filter((issue) => words.every((word) => issue.includes(word)));

describe('placement rules', () => {
  test('a furnished room with a purpose, a signature piece and its pieces in place has no placement issues', () => {
    assert.deepEqual(issuesOf([]), []);
  });

  test('a room of a furnished district that names no theme is reported, and a raw district is left alone', () => {
    assert.equal(about(issuesOf([], { hall: 'civic' }), 'room "annex"', 'has no theme').length, 1);
    assert.deepEqual(about(findPlacementIssues(contentWith(baseDistrict())), 'has no theme'), []);
  });

  test('a dressing object with no furnishing profile is reported once', () => {
    const prop: WorldObjectDefinition = { id: 'odd-prop', name: 'Odd Prop', examine: '', model: 'crate', blocksMovement: true, interactions: [] };
    const objects = new Map([...GAME_CONTENT.worldObjects, ['odd-prop', prop]]);
    const district = furnish(plan, baseDistrict({ objects: [...SIGNED, place('odd-1', 'odd-prop', 'hall', 12, 12), place('odd-2', 'odd-prop', 'hall', 14, 12)] }), { hall: 'civic', annex: 'ward' });
    assert.equal(about(findPlacementIssues(contentWith(district, objects)), '"odd-prop"', 'no furnishing profile').length, 1);
  });

  test('an object outside its home themes is reported, unless the room also takes that theme', () => {
    const pew = [place('pew', 'pew', 'hall', 10, 10)];
    assert.equal(about(issuesOf(pew), 'Pew does not belong in civic room "hall"').length, 1);
    assert.deepEqual(about(issuesOf(pew, { hall: { theme: 'civic', also: ['chapel'] }, annex: 'ward' }), 'does not belong'), []);
  });

  test('a themed room without any of its signature pieces is reported', () => {
    assert.equal(about(issuesOf([], { hall: 'canteen', annex: 'ward' }), 'room "hall"', 'signature pieces').length, 1);
  });

  test('a ceramic floor is reported in a room whose theme does not take it', () => {
    assert.equal(about(issuesOf([], { hall: 'civic', annex: 'freight' }), 'room "annex"', 'ceramic floor').length, 1);
  });

  test('a blocking piece beside a doorway is reported, and one two tiles away is not', () => {
    const door = plan.linkTile('hall', 'annex');
    const beside: ObjectPlacement = { instanceId: 'crate', objectId: 'packing-crate', position: { x: door.x - 1, y: door.y } };
    const clear: ObjectPlacement = { instanceId: 'crate', objectId: 'packing-crate', position: { x: door.x - 2, y: door.y } };
    assert.equal(about(issuesOf([beside]), '"crate"', 'crowds a doorway').length, 1);
    assert.deepEqual(about(issuesOf([clear]), 'crowds a doorway'), []);
  });

  test('a bookcase standing free is reported, with the turn to make when a wall is beside it', () => {
    assert.equal(about(issuesOf([place('case', 'bookcase', 'hall', 10, 10)], { hall: 'archive', annex: 'ward' }), '"case"', 'nothing behind it').length, 1);
    const beside = about(issuesOf([place('case', 'bookcase', 'hall', 0, 10)], { hall: 'archive', annex: 'ward' }), '"case"', 'nothing behind it');
    assert.equal(beside.length, 1);
    assert.ok(beside[0]?.includes('turn it to face east'), beside[0]);
  });

  test('a bookcase backed onto the wall, onto racking, or back to back with another passes', () => {
    const dressing: Dressing = { hall: 'archive', annex: 'ward' };
    assert.deepEqual(about(issuesOf([place('case', 'bookcase', 'hall', 0, 10, 'east')], dressing), 'nothing behind it'), []);
    assert.deepEqual(about(issuesOf([place('a', 'bookcase', 'hall', 10, 10, 'north'), place('b', 'bookcase', 'hall', 10, 11, 'south')], dressing), 'nothing behind it'), []);
    assert.deepEqual(about(issuesOf([place('rack', 'storage-rack', 'hall', 10, 9), place('case', 'bookcase', 'hall', 10, 10, 'south')], dressing), 'nothing behind it'), []);
  });

  test('a bench facing a wall is reported, and one facing the room is not', () => {
    assert.equal(about(issuesOf([place('wallward', 'briefing-bench', 'hall', 10, 0, 'north')]), '"wallward"', 'its face to a wall').length, 1);
    assert.deepEqual(about(issuesOf([place('roomward', 'briefing-bench', 'hall', 10, 0, 'south')]), 'sits with'), []);
  });

  test('a chair must face a desk; a stool only needs a table within reach', () => {
    const dressing: Dressing = { hall: 'office', annex: 'ward' };
    const desk = place('desk', 'office-desk', 'hall', 10, 10);
    assert.equal(about(issuesOf([desk, place('chair', 'office-chair', 'hall', 5, 5)], dressing), '"chair"', 'serves nothing').length, 1);
    assert.equal(about(issuesOf([desk, place('chair', 'office-chair', 'hall', 10, 11)], dressing), '"chair"', 'rather than facing').length, 1);
    assert.deepEqual(about(issuesOf([desk, place('chair', 'office-chair', 'hall', 10, 11, 'north')], dressing), '"chair"'), []);
    assert.deepEqual(about(issuesOf([place('bench', 'workbench', 'hall', 10, 10), place('stool', 'stool', 'hall', 12, 11)], { hall: 'industrial', annex: 'ward' }), '"stool"'), []);
  });

  test(`more than ${RHYTHM_LIMIT} of one prop on a fixed pitch is reported, but rows of row furniture are not`, () => {
    const planters = (count: number) => Array.from({ length: count }, (_, index) => place(`planter-${index}`, 'planter', 'hall', 2 + index * 3, 14));
    assert.equal(about(issuesOf(planters(RHYTHM_LIMIT + 1)), `${RHYTHM_LIMIT + 1} × planter`, 'every 3 tiles').length, 1);
    assert.deepEqual(about(issuesOf(planters(RHYTHM_LIMIT)), 'repeat every'), []);
    const pews = Array.from({ length: 6 }, (_, index) => place(`pew-${index}`, 'pew', 'hall', 8, 2 + index * 3));
    assert.deepEqual(about(issuesOf(pews, { hall: 'chapel', annex: 'ward' }), 'repeat every'), []);
  });

  test(`a set-piece used more than ${REPEAT_LIMIT} times in one room is reported`, () => {
    const pieces = Array.from({ length: REPEAT_LIMIT + 1 }, (_, index) => setPiece(plan, 'hall', 'fern-bench', 2 + (index % 2) * 10, 2 + Math.floor(index / 2) * 5 + index));
    const issues = issuesOf([], { hall: 'civic', annex: 'ward' }, {}, { setPieces: pieces });
    assert.equal(about(issues, `${REPEAT_LIMIT + 1} × the fern-bench set-piece`).length, 1);
  });

  test('an uncanny district may turn its furniture the wrong way round', () => {
    const backwards = [place('case', 'bookcase', 'hall', 10, 10)];
    assert.deepEqual(about(issuesOf(backwards, { hall: 'archive', annex: 'ward' }, { condition: 'uncanny' }), 'nothing behind it'), []);
  });

  test('an object players use that dressing has boxed in is reported', () => {
    const locker = place('locker', 'storage-locker', 'hall', 10, 10);
    const box = [place('n', 'packing-crate', 'hall', 10, 9), place('s', 'packing-crate', 'hall', 10, 11), place('w', 'packing-crate', 'hall', 9, 10), place('e', 'packing-crate', 'hall', 11, 10)];
    assert.equal(about(issuesOf([locker, ...box]), '"locker"', 'boxed in').length, 1);
  });
});

describe('furnishing catalogue', () => {
  test('every profile and signature names a real object', () => {
    for (const id of Object.keys(FURNISHING_PROFILES)) assert.ok(GAME_CONTENT.worldObjects.has(id), id);
    for (const [theme, ids] of Object.entries(ROOM_SIGNATURES)) for (const id of ids) assert.ok(GAME_CONTENT.worldObjects.has(id), `${theme}: ${id}`);
  });

  test('every profile has a home and every signature piece can stand in its own theme', () => {
    for (const [id, profile] of Object.entries(FURNISHING_PROFILES)) assert.ok(profile.homes.length > 0, id);
    for (const theme of DRESSING_THEMES) {
      for (const id of ROOM_SIGNATURES[theme]) {
        const homes = FURNISHING_PROFILES[id]?.homes;
        assert.ok(homes === undefined || homes.includes(theme), `${id} signs ${theme} rooms but cannot stand in one`);
      }
    }
  });

  test('seats say what they serve and only backed pieces stop at their backs', () => {
    for (const [id, profile] of Object.entries(FURNISHING_PROFILES)) {
      if (profile.mount === 'seat') assert.ok(profile.seatsAt, id);
      if (profile.seatsAt) assert.equal(profile.mount, 'seat', id);
    }
  });
});
