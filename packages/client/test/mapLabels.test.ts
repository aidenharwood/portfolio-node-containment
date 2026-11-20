import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT, isWalkableTile, type ResolvedLevel, type TileRect } from '@containment/shared';
import { FIXTURE_CONTENT } from '@containment/shared/fixtures';
import { districtLabels, regionLabels } from '../src/hud/mapLabels.ts';

const wilds = FIXTURE_CONTENT.levels.get('fx-wilds') as ResolvedLevel;

const inside = (rect: TileRect, point: { x: number; y: number }): boolean => point.x >= rect.x && point.y >= rect.y && point.x < rect.x + rect.width && point.y < rect.y + rect.height;

test('the two halves of a split square are labelled on their own walkable tiles', () => {
  const labels = new Map(districtLabels(wilds).map((label) => [label.districtId, label]));
  const west = labels.get('fx-wild-gate-west');
  const east = labels.get('fx-wild-gate-east');
  assert.ok(west && east);
  assert.notDeepEqual(west.at, east.at);
  for (const label of [west, east]) {
    assert.equal(wilds.layout.districtAt(label.at), label.districtId);
    assert.ok(isWalkableTile(wilds.layout, label.at));
  }
  assert.ok(west.bounds.x + west.bounds.width <= east.bounds.x);
});

test('each region gets one label, at the district nearest its middle', () => {
  const labels = regionLabels(wilds, FIXTURE_CONTENT);
  const home = labels.filter((label) => label.regionId === 'fx-home');
  const far = labels.filter((label) => label.regionId === 'fx-far');
  assert.equal(home.length, 1);
  assert.equal(far.length, 1);
  assert.ok((home[0]?.x ?? Infinity) < (far[0]?.x ?? -Infinity));
});

test('shipped overworld labels stay inside their placements and keep whole rectangles', () => {
  const level = GAME_CONTENT.levels.get('overworld') as ResolvedLevel;
  assert.ok(level);
  const labels = new Map(districtLabels(level).map((label) => [label.districtId, label]));
  for (const { districtId, rect } of level.districts) {
    const label = labels.get(districtId);
    assert.ok(label, districtId);
    assert.ok(inside(rect, label.at), districtId);
    const owns = (x: number, y: number) => level.layout.districtAt({ x, y }) === districtId;
    const columns = Array.from({ length: rect.width }, (_, index) => rect.x + index);
    const rows = Array.from({ length: rect.height }, (_, index) => rect.y + index);
    const edges =
      columns.some((x) => owns(x, rect.y)) &&
      columns.some((x) => owns(x, rect.y + rect.height - 1)) &&
      rows.some((y) => owns(rect.x, y)) &&
      rows.some((y) => owns(rect.x + rect.width - 1, y));
    if (edges) assert.deepEqual(label.bounds, rect, districtId);
  }
});
