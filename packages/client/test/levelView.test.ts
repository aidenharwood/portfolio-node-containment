import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ResolvedLevel } from '@containment/shared';
import { FIXTURE_CONTENT as GAME_CONTENT } from '@containment/shared/fixtures';
import { districtAtLevelTile, levelIssues, levelPlan } from '../src/editor/levelView.ts';

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
