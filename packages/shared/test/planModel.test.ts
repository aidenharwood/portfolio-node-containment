import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONTENT, type GameContent } from '../src/index.ts';
import type { DistrictDefinition } from '../src/world/district.ts';
import { asciiPlan, issuesFor, planMarks, issuesFromMessages } from '../src/world/planModel.ts';

const atrium = GAME_CONTENT.districts.get('meridian-atrium') as DistrictDefinition;

const withObjects = (objects: DistrictDefinition['objects']): GameContent => {
  const district: DistrictDefinition = { ...atrium, objects, assemblies: [] };
  return { ...GAME_CONTENT, districts: new Map([...GAME_CONTENT.districts, [district.id, district]]) };
};

describe('planMarks', () => {
  test('a 3x2 object facing east covers a 2-wide, 3-tall block', () => {
    const content = withObjects([{ instanceId: 'kiosk', objectId: 'glass-kiosk', position: { x: 40, y: 30 }, facing: 'east' }]);
    const mark = planMarks(content, atrium.id).find((each) => each.id === 'kiosk');
    assert.ok(mark);
    const xs = new Set(mark.tiles.map((tile) => tile.x));
    const ys = new Set(mark.tiles.map((tile) => tile.y));
    assert.deepEqual([xs.size, ys.size, mark.tiles.length], [2, 3, 6]);
    assert.equal(mark.facing, 'east');
  });

  test('marks are classed as fixture, dressing, set-piece, litter or quest', () => {
    const content = withObjects([
      { instanceId: 'a', objectId: 'planter', position: { x: 40, y: 30 } },
      { instanceId: 'plaza-dressing-1-1', objectId: 'planter', position: { x: 42, y: 30 } },
      { instanceId: 'atrium-plaza-ring/1', objectId: 'bench-curve', position: { x: 44, y: 30 } },
      { instanceId: 'plaza-litter-1', objectId: 'litter-papers', position: { x: 48, y: 30 } },
      { instanceId: 'board', objectId: 'contract-board', position: { x: 50, y: 30 } },
    ]);
    const kinds = Object.fromEntries(planMarks(content, atrium.id).map((mark) => [mark.id, mark.kind]));
    assert.deepEqual([kinds.a, kinds['plaza-dressing-1-1'], kinds['atrium-plaza-ring/1'], kinds['plaza-litter-1'], kinds.board], ['fixture', 'dressing', 'set-piece', 'litter', 'quest']);
  });

  test('assembly pieces are never set-pieces even though their ids contain a slash', () => {
    const marks = planMarks(GAME_CONTENT, atrium.id);
    const tram = marks.filter((mark) => mark.id.startsWith('atrium-tram-car'));
    const refinery = marks.filter((mark) => mark.id.startsWith('workshop-refinery'));
    assert.ok(tram.length > 0 && refinery.length > 0);
    for (const mark of [...tram, ...refinery]) assert.notEqual(mark.kind, 'set-piece', mark.id);
  });

  test('npcs, lights and anchors get marks of their own', () => {
    const kinds = new Set(planMarks(GAME_CONTENT, atrium.id).map((mark) => mark.kind));
    for (const kind of ['npc', 'light', 'anchor'] as const) assert.ok(kinds.has(kind), kind);
  });
});

describe('issuesFor', () => {
  test('a district issue keeps its district tile', () => {
    assert.deepEqual(issuesFromMessages(GAME_CONTENT, atrium.id, ['district meridian-atrium: room "plaza" has 16 unreachable walkable tile(s), first at 62,39']), [
      { message: 'room "plaza" has 16 unreachable walkable tile(s), first at 62,39', tile: { x: 62, y: 39 } },
    ]);
  });

  test('a level issue is moved into the district it lands in', () => {
    const issues = issuesFromMessages(GAME_CONTENT, atrium.id, ['level main-floor: 16 walkable tiles are unreachable from the spawn (first at 601,163)']);
    assert.deepEqual(issues.map((issue) => issue.tile), [{ x: 62, y: 39 }]);
    assert.deepEqual(issuesFromMessages(GAME_CONTENT, 'meridian-circuit', ['level main-floor: 16 walkable tiles are unreachable from the spawn (first at 601,163)']), []);
  });

  test('issues about other districts are left out', () => {
    assert.deepEqual(issuesFromMessages(GAME_CONTENT, atrium.id, ['district sector-two: something at 3,4']), []);
  });

  test('the shipped atrium has no issues', () => {
    assert.deepEqual(issuesFor(GAME_CONTENT, atrium.id), []);
  });
});

describe('asciiPlan', () => {
  test('prints the plaza with a ruler and the core as a fixture', () => {
    const lines = asciiPlan(GAME_CONTENT, atrium.id, 'plaza').split('\n');
    const plaza = atrium.rooms?.plaza;
    assert.ok(plaza);
    assert.equal(lines.length, plaza.height + 1);
    const core = atrium.objects.find((object) => object.instanceId === 'atrium-core');
    assert.ok(core);
    const row = lines[core.position.y - plaza.y + 1] ?? '';
    const gutter = row.length - plaza.width;
    assert.equal(row[gutter + core.position.x - plaza.x], 'F');
  });

  test('an unknown room throws', () => {
    assert.throws(() => asciiPlan(GAME_CONTENT, atrium.id, 'nowhere'), /nowhere/);
  });
});
