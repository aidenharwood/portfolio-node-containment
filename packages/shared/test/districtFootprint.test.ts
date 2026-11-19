import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';
import { areaGoal, footprintsOf } from '../src/world/districtFootprint.ts';
import type { TilePoint, TileRect } from '../src/world/geometry.ts';
import type { ResolvedArea, ResolvedLevel } from '../src/world/levelLayout.ts';
import { TILE_KINDS } from '../src/world/tiles.ts';

const wilds = FIXTURE_CONTENT.levels.get('fx-wilds') as ResolvedLevel;

const overlaps = (a: TileRect, b: TileRect): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const groundOf = (districtId: string): ResolvedArea => {
  const area = wilds.areas.find((candidate) => candidate.districtId === districtId && candidate.id === 'ground');
  assert.ok(area);
  return area;
};

const ownedWalkable = (districtId: string, point: TilePoint): boolean =>
  wilds.layout.districtAt(point) === districtId && TILE_KINDS[wilds.layout.tileAt(point)].walkable;

describe('district footprints', () => {
  test('the halves of a split square have the same placement but footprints that do not overlap', () => {
    const footprints = footprintsOf(wilds);
    const rectOf = (id: string) => wilds.districts.find((placement) => placement.districtId === id)?.rect;
    assert.deepEqual(rectOf('fx-wild-gate-west'), rectOf('fx-wild-gate-east'));
    const west = footprints.get('fx-wild-gate-west');
    const east = footprints.get('fx-wild-gate-east');
    assert.ok(west && east);
    assert.ok(!overlaps(west.bounds, east.bounds));
    assert.ok(ownedWalkable('fx-wild-gate-west', west.label));
    assert.ok(ownedWalkable('fx-wild-gate-east', east.label));
    assert.ok(west.tiles > 0 && east.tiles > 0);
  });

  test('a district that owns its whole rectangle has it as bounds and its centre as label', () => {
    const footprint = footprintsOf(wilds).get('fx-wild-west');
    const rect = wilds.districts.find((placement) => placement.districtId === 'fx-wild-west')?.rect;
    assert.ok(footprint && rect);
    assert.deepEqual(footprint.bounds, rect);
    assert.equal(footprint.tiles, rect.width * rect.height);
    assert.deepEqual(footprint.label, { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
  });

  test('footprints are worked out once per layout', () => {
    assert.equal(footprintsOf(wilds), footprintsOf(wilds));
    assert.equal(footprintsOf({ layout: wilds.layout, districts: wilds.districts }), footprintsOf(wilds));
  });
});

describe('area goals', () => {
  test('a split square area aims at a walkable tile its own district owns', () => {
    const east = groundOf('fx-wild-gate-east');
    const west = groundOf('fx-wild-gate-west');
    assert.deepEqual(east.rect, west.rect);
    const eastGoal = areaGoal(wilds, east);
    const westGoal = areaGoal(wilds, west);
    assert.ok(ownedWalkable('fx-wild-gate-east', eastGoal));
    assert.ok(ownedWalkable('fx-wild-gate-west', westGoal));
    assert.notDeepEqual(eastGoal, westGoal);
  });

  test('an area with no walkable tile it owns aims at its centre', () => {
    const area = { ...groundOf('fx-wild-west'), districtId: 'nowhere' };
    assert.deepEqual(areaGoal(wilds, area), { x: area.rect.x + Math.floor(area.rect.width / 2), y: area.rect.y + Math.floor(area.rect.height / 2) });
  });
});
