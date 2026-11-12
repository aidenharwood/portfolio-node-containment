import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT, type ResolvedLevel } from '@containment/shared';
import { districtAtLevelTile, levelIssues, levelPlan } from '../src/editor/levelView.ts';

const level = GAME_CONTENT.levels.get('main-floor') as ResolvedLevel;
const placed = (id: string) => level.districts.find((each) => each.districtId === id)?.rect ?? { x: NaN, y: NaN, width: 0, height: 0 };
const atrium = GAME_CONTENT.districts.get('meridian-atrium');

test('a tile in the atrium plaza belongs to the atrium, even inside the circuit', () => {
  const plaza = atrium?.rooms?.plaza;
  assert.ok(plaza);
  const tile = { x: placed('meridian-atrium').x + plaza.x + 20, y: placed('meridian-atrium').y + plaza.y + 20 };
  assert.deepEqual(districtAtLevelTile(GAME_CONTENT, level, tile), { districtId: 'meridian-atrium', local: { x: plaza.x + 20, y: plaza.y + 20 } });
});

test('a boulevard tile belongs to the circuit', () => {
  const boulevard = GAME_CONTENT.districts.get('meridian-circuit')?.rooms?.['north-boulevard'];
  assert.ok(boulevard);
  const tile = { x: placed('meridian-circuit').x + boulevard.x + 2, y: placed('meridian-circuit').y + boulevard.y + 1 };
  assert.equal(districtAtLevelTile(GAME_CONTENT, level, tile)?.districtId, 'meridian-circuit');
});

test('void between districts belongs to nobody', () => {
  assert.equal(districtAtLevelTile(GAME_CONTENT, level, { x: 0, y: 0 }), null);
});

test('the level plan outlines every district and offsets its marks', () => {
  const shapes = levelPlan(GAME_CONTENT, level, ['rooms', 'objects']);
  const outlines = shapes.filter((shape) => shape.kind === 'room' && shape.color === '#ffd23f');
  assert.equal(outlines.length, level.districts.length);
  const core = shapes.find((shape) => shape.kind === 'mark' && shape.label === 'atrium-core');
  const local = atrium?.objects.find((object) => object.instanceId === 'atrium-core')?.position;
  assert.deepEqual([core?.x, core?.y], [placed('meridian-atrium').x + (local?.x ?? 0), placed('meridian-atrium').y + (local?.y ?? 0)]);
});

test('district issues are moved into level coordinates', () => {
  const issues = levelIssues(GAME_CONTENT, level, ['district meridian-atrium: something at 3,4', 'district undercroft: elsewhere at 1,1', 'level main-floor: seam at 600,200']);
  assert.deepEqual(issues.map((issue) => issue.tile), [{ x: placed('meridian-atrium').x + 3, y: placed('meridian-atrium').y + 4 }, { x: 600, y: 200 }]);
});
