import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveLevel, type ResolvedLevel } from '@containment/shared';
import { FIXTURE_CONTENT as GAME_CONTENT, FIXTURE_LAND, FIXTURE_WILDS } from '@containment/shared/fixtures';
import { districtAtLevelTile, levelIssues, levelPlan, tileImageOf } from '../src/editor/levelView.ts';
import { tileColor } from '../src/editor/planCanvas.ts';
import { landLevel } from '../src/editor/previewLevel.ts';

const level = GAME_CONTENT.levels.get('fx-floor') as ResolvedLevel;
const placed = (id: string) => level.districts.find((each) => each.districtId === id)?.rect ?? { x: NaN, y: NaN, width: 0, height: 0 };
const atrium = GAME_CONTENT.districts.get('fx-hub');

test('a tile in the hub plaza belongs to the hub', () => {
  const plaza = atrium?.rooms?.plaza;
  assert.ok(plaza);
  const tile = { x: placed('fx-hub').x + plaza.x + 5, y: placed('fx-hub').y + plaza.y + 5 };
  assert.deepEqual(districtAtLevelTile(GAME_CONTENT, level, tile), { districtId: 'fx-hub', local: { x: plaza.x + 5, y: plaza.y + 5 } });
});

test('a lane tile belongs to the field', () => {
  const boulevard = GAME_CONTENT.districts.get('fx-field')?.rooms?.lane;
  assert.ok(boulevard);
  const tile = { x: placed('fx-field').x + boulevard.x + 2, y: placed('fx-field').y + boulevard.y + 1 };
  assert.equal(districtAtLevelTile(GAME_CONTENT, level, tile)?.districtId, 'fx-field');
});

test('void between districts belongs to nobody', () => {
  assert.equal(districtAtLevelTile(GAME_CONTENT, level, { x: 0, y: 0 }), null);
});

test('the level plan outlines every district and offsets its marks', () => {
  const shapes = levelPlan(GAME_CONTENT, level, ['rooms', 'objects']);
  const outlines = shapes.filter((shape) => shape.kind === 'room' && shape.color === '#ffd23f');
  assert.equal(outlines.length, level.districts.length);
  const core = shapes.find((shape) => shape.kind === 'mark' && shape.label === 'crate');
  const local = atrium?.objects.find((object) => object.instanceId === 'hub-crate')?.position;
  assert.deepEqual([core?.x, core?.y], [placed('fx-hub').x + (local?.x ?? 0), placed('fx-hub').y + (local?.y ?? 0)]);
});

test('district issues are moved into level coordinates', () => {
  const issues = levelIssues(GAME_CONTENT, level, ['district fx-hub: something at 3,4', 'district fx-arena: elsewhere at 1,1', 'level fx-floor: seam at 60,20']);
  assert.deepEqual(issues.map((issue) => issue.tile), [{ x: placed('fx-hub').x + 3, y: placed('fx-hub').y + 4 }, { x: 60, y: 20 }]);
});

test('the level plan outlines each half of a split square by the tiles it owns', () => {
  const wilds = GAME_CONTENT.levels.get('fx-wilds') as ResolvedLevel;
  const outlines = levelPlan(GAME_CONTENT, wilds, ['rooms']).filter((shape) => shape.kind === 'room' && shape.color === '#ffd23f');
  const outline = (name: string) => outlines.find((shape) => shape.label === name);
  const west = outline('Test Gate West');
  const east = outline('Test Gate East');
  assert.ok(west && east);
  assert.ok(west.x + west.width <= east.x);
});

test('the tile image of a level with land paints the land no district owns', () => {
  const definition = { ...FIXTURE_WILDS, districts: FIXTURE_WILDS.districts.filter((placed) => placed.districtId !== 'fx-wild-east') };
  const level = resolveLevel(definition, GAME_CONTENT.districts, GAME_CONTENT.assemblies);
  const point = { x: 120, y: 16 };
  assert.equal(level.layout.tileAt(point), 'void');
  assert.equal(level.scene.tileAt(point), 'water');
  const image = tileImageOf(level);
  assert.equal(image.width, 128);
  const at = (point.y * image.width + point.x) * 4;
  const colour = tileColor('water');
  assert.deepEqual([...image.pixels.slice(at, at + 3)], [parseInt(colour.slice(1, 3), 16), parseInt(colour.slice(3, 5), 16), parseInt(colour.slice(5, 7), 16)]);
});

test('the land layer outlines every step of the land plan', () => {
  const wilds = GAME_CONTENT.levels.get('fx-wilds') as ResolvedLevel;
  const outlines = levelPlan(GAME_CONTENT, wilds, ['land']);
  const steps = FIXTURE_LAND.plan.steps;
  assert.equal(outlines.length, steps.length);
  assert.deepEqual(outlines.map((shape) => shape.step), steps.map((_, index) => index));
  assert.deepEqual(outlines[0]?.points, [{ x: 0, y: 0 }, { x: 128, y: 0 }, { x: 128, y: 32 }, { x: 0, y: 32 }]);
  const polygon = steps[1];
  assert.ok(polygon?.kind === 'fill' && polygon.shape.kind === 'polygon');
  assert.deepEqual([outlines[1]?.kind, outlines[1]?.points], ['polygon', polygon.shape.points]);
  const line = steps[3];
  assert.ok(line?.kind === 'line');
  assert.deepEqual([outlines[3]?.kind, outlines[3]?.points], ['polyline', line.points.map((point) => ({ x: point.x + 0.5, y: point.y + 0.5 }))]);
  assert.deepEqual([outlines[2]?.x, outlines[2]?.y, outlines[2]?.width, outlines[2]?.height], [24, 10, 16, 12]);
  assert.deepEqual([outlines[4]?.x, outlines[4]?.y, outlines[4]?.width, outlines[4]?.height], [48, 15, 1, 2]);
});

test('the squares layer labels each square by the districts cut from it', () => {
  const wilds = GAME_CONTENT.levels.get('fx-wilds') as ResolvedLevel;
  const squares = levelPlan(GAME_CONTENT, wilds, ['squares']);
  assert.deepEqual(
    squares.map((shape) => [shape.x, shape.y, shape.width, shape.height, shape.label]),
    [
      [0, 0, 32, 32, 'Test Wild West'],
      [32, 0, 32, 32, 'Test Gate West / Test Gate East'],
      [64, 0, 32, 32, 'Test Wild East'],
      [96, 0, 32, 32, '3,0'],
    ],
  );
});

test('a land level shows its steps and its squares by column and row', () => {
  const level = landLevel(FIXTURE_LAND, 'fx-land');
  const shapes = levelPlan(GAME_CONTENT, level, ['land', 'squares', 'rooms', 'objects']);
  assert.equal(shapes.filter((shape) => shape.step !== undefined).length, FIXTURE_LAND.plan.steps.length);
  assert.deepEqual(shapes.filter((shape) => shape.kind === 'square').map((shape) => shape.label), ['0,0', '1,0', '2,0', '3,0']);
});
