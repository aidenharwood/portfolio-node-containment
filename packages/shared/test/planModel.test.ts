import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { type GameContent } from '../src/index.ts';
import type { DistrictDefinition } from '../src/world/district.ts';
import { asciiPlan, issuesFor, planMarks, issuesFromMessages } from '../src/world/planModel.ts';
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

const atrium = FIXTURE_CONTENT.districts.get('fx-hub') as DistrictDefinition;

const withObjects = (objects: DistrictDefinition['objects']): GameContent => {
  const district: DistrictDefinition = { ...atrium, objects, assemblies: [] };
  return { ...FIXTURE_CONTENT, districts: new Map([...FIXTURE_CONTENT.districts, [district.id, district]]) };
};

describe('planMarks', () => {
  test('a 3x2 object facing east covers a 2-wide, 3-tall block', () => {
    const content = withObjects([{ instanceId: 'kiosk', objectId: 'transit-shelter', position: { x: 4, y: 4 }, facing: 'east' }]);
    const mark = planMarks(content, atrium.id).find((each) => each.id === 'kiosk');
    assert.ok(mark);
    const xs = new Set(mark.tiles.map((tile) => tile.x));
    const ys = new Set(mark.tiles.map((tile) => tile.y));
    assert.deepEqual([xs.size, ys.size, mark.tiles.length], [2, 3, 6]);
    assert.equal(mark.facing, 'east');
  });

  test('marks are classed as fixture, dressing, set-piece, litter or quest', () => {
    const content = withObjects([
      { instanceId: 'a', objectId: 'planter', position: { x: 4, y: 4 } },
      { instanceId: 'plaza-dressing-1-1', objectId: 'planter', position: { x: 6, y: 4 } },
      { instanceId: 'atrium-plaza-ring/1', objectId: 'bench-curve', position: { x: 8, y: 4 } },
      { instanceId: 'plaza-litter-1', objectId: 'litter-papers', position: { x: 4, y: 8 } },
      { instanceId: 'board', objectId: 'contract-board', position: { x: 6, y: 8 } },
    ]);
    const kinds = Object.fromEntries(planMarks(content, atrium.id).map((mark) => [mark.id, mark.kind]));
    assert.deepEqual([kinds.a, kinds['plaza-dressing-1-1'], kinds['atrium-plaza-ring/1'], kinds['plaza-litter-1'], kinds.board], ['fixture', 'dressing', 'set-piece', 'litter', 'quest']);
  });

  test('assembly pieces are never set-pieces even though their ids contain a slash', () => {
    const marks = planMarks(FIXTURE_CONTENT, atrium.id);
    const tram = marks.filter((mark) => mark.id.startsWith('hub-tram-car'));
    assert.ok(tram.length > 0);
    for (const mark of tram) assert.notEqual(mark.kind, 'set-piece', mark.id);
  });

  test('npcs, lights and anchors get marks of their own', () => {
    const kinds = new Set(planMarks(FIXTURE_CONTENT, atrium.id).map((mark) => mark.kind));
    for (const kind of ['npc', 'light', 'anchor'] as const) assert.ok(kinds.has(kind), kind);
  });
});

describe('issuesFor', () => {
  test('a district issue keeps its district tile', () => {
    assert.deepEqual(issuesFromMessages(FIXTURE_CONTENT, atrium.id, ['district fx-hub: room "plaza" has 16 unreachable walkable tile(s), first at 12,9']), [
      { message: 'room "plaza" has 16 unreachable walkable tile(s), first at 12,9', tile: { x: 12, y: 9 } },
    ]);
  });

  test('a level issue is moved into the district it lands in', () => {
    const origin = FIXTURE_CONTENT.levels.get('fx-floor')?.definition.districts.find((placement) => placement.districtId === atrium.id)?.origin as { x: number; y: number };
    const message = `level fx-floor: 16 walkable tiles are unreachable from the spawn (first at ${origin.x + 12},${origin.y + 9})`;
    const issues = issuesFromMessages(FIXTURE_CONTENT, atrium.id, [message]);
    assert.deepEqual(issues.map((issue) => issue.tile), [{ x: 12, y: 9 }]);
    assert.deepEqual(issuesFromMessages(FIXTURE_CONTENT, 'fx-field', [message]), []);
  });

  test('a zone issue keeps its district tile', () => {
    assert.deepEqual(issuesFromMessages(FIXTURE_CONTENT, atrium.id, ['zone fx-hub: two objects share tile 3,4', 'zone fx-hub: unknown object "plantr"']), [
      { message: 'two objects share tile 3,4', tile: { x: 3, y: 4 } },
      { message: 'unknown object "plantr"' },
    ]);
  });

  test('issues about other districts are left out', () => {
    assert.deepEqual(issuesFromMessages(FIXTURE_CONTENT, atrium.id, ['district fx-field: something at 3,4']), []);
  });

  test('the fixture hub has no issues', () => {
    assert.deepEqual(issuesFor(FIXTURE_CONTENT, atrium.id), []);
  });
});

describe('asciiPlan', () => {
  test('prints a room with a ruler and a placed object as a fixture', () => {
    const lines = asciiPlan(FIXTURE_CONTENT, atrium.id, 'hall').split('\n');
    const plaza = atrium.rooms?.hall;
    assert.ok(plaza);
    assert.equal(lines.length, plaza.height + 1);
    const core = atrium.objects.find((object) => object.instanceId === 'hub-crate');
    assert.ok(core);
    const row = lines[core.position.y - plaza.y + 1] ?? '';
    const gutter = row.length - plaza.width;
    assert.equal(row[gutter + core.position.x - plaza.x], 'F');
  });

  test('an unknown room throws', () => {
    assert.throws(() => asciiPlan(FIXTURE_CONTENT, atrium.id, 'nowhere'), /nowhere/);
  });
});
