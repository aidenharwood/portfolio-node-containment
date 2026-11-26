import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONTENT } from '../src/index.ts';
import type { TilePoint } from '../src/world/geometry.ts';
import type { DistrictLayout } from '../src/world/layoutSchema.ts';
import { doorRuns, frontsOf, KERB_PITCH, kerbStops, MODEL_RIGHT, streetLines } from '../../../scripts/span/streetDressing.ts';

type Building = Extract<DistrictLayout['steps'][number], { kind: 'building' }>;

const DRESSING = /-d\d+$/;
const SITES = ['site-kestrel', 'site-orchard', 'site-gallowglass', 'site-tallow', 'site-vesper', 'site-null'];

describe('street dressing', () => {
  test('the floor along a block splits into one front for each side', () => {
    const block = (point: TilePoint): boolean => point.x >= 2 && point.x <= 3 && point.y >= 2 && point.y <= 3;
    const fronts = frontsOf(6, (point) => !block(point) && point.x >= 0 && point.y >= 0 && point.x < 6 && point.y < 6, (point) => (block(point) ? { tower: true } : undefined));
    assert.deepEqual(fronts.map((front) => front.facing).sort(), ['east', 'north', 'south', 'west']);
    assert.deepEqual(fronts.find((front) => front.facing === 'south')?.tiles, [{ x: 2, y: 4 }, { x: 3, y: 4 }]);
  });

  test('kerb lamps stand ten to twelve tiles apart', () => {
    let state = 1;
    const next = (): number => (state = (state * 9301 + 49297) % 233280) / 233280;
    const stops = kerbStops(64, next);
    assert.ok(stops.length >= 4);
    for (let index = 1; index < stops.length; index++) {
      const gap = (stops[index] as number) - (stops[index - 1] as number);
      assert.ok(gap >= KERB_PITCH[0] && gap <= KERB_PITCH[1], 'lamps ' + gap + ' apart');
    }
  });

  test('a door two tiles wide is one run facing out of its side', () => {
    const building: Building = { kind: 'building', id: 'post', rect: { x: 2, y: 2, width: 4, height: 3 }, floor: 'plating', wall: 'wall', doors: [{ side: 'south', width: 2 }] };
    const runs = doorRuns(building, [{ x: 3, y: 5 }, { x: 4, y: 5 }, { x: 6, y: 3 }]);
    assert.deepEqual(runs.map((run) => [run.facing, run.tiles.length]), [['east', 1], ['south', 2]]);
  });

  test('a lane line runs down the middle of the street between two tower aprons', () => {
    const paving = (x: number, y: number): boolean => y >= 0 && y < 22 && ((x >= 0 && x < 22) || (x >= 30 && x < 52));
    const lines = streetLines([{ x: 0, y: 0, width: 22, height: 22 }], (x, y) => !paving(x, y) && y >= 0 && y < 22, paving);
    assert.deepEqual(lines, [{ x: 25, y: 0, width: 2, height: 22 }]);
    assert.deepEqual(streetLines([{ x: 0, y: 0, width: 22, height: 22 }], () => true, () => false), []);
  });

  test('a model faces out of its wall with its right hand along the wall', () => {
    for (const [facing, right] of Object.entries(MODEL_RIGHT)) {
      const out = { north: { x: 0, y: -1 }, south: { x: 0, y: 1 }, east: { x: 1, y: 0 }, west: { x: -1, y: 0 } }[facing as 'north']!;
      assert.equal(Math.abs(out.x * right.x + out.y * right.y), 0, facing);
    }
  });
});

describe('the dressed Span', () => {
  const squares = [...GAME_CONTENT.districts.values()].filter((district) => district.square);
  const dressing = (ids: readonly string[], objects: readonly string[]) => squares.filter((district) => ids.length === 0 || ids.includes(district.id)).flatMap((district) => district.objects.filter((object) => DRESSING.test(object.instanceId) && objects.includes(object.objectId)));

  test('Halcyon’s tower streets carry signs, kerb lamps and lane lines', () => {
    const halcyon = squares.filter((district) => district.region === 'halcyon').map((district) => district.id);
    assert.ok(dressing(halcyon, ['blade-sign', 'neon-sign', 'neon-sign-cyan', 'neon-sign-acid', 'holo-panel', 'roll-shutter']).length >= 300);
    assert.ok(dressing(halcyon, ['street-lamp']).length >= 50);
    assert.ok(dressing(halcyon, ['street-stall', 'parked-bike']).length >= 60);
    const lanes = squares.filter((district) => district.region === 'halcyon').flatMap((district) => (district.decals ?? []).filter((decal) => decal.kind === 'lane-line'));
    assert.ok(lanes.length >= 20);
  });

  test('every Site frames its facility doors, posts its class and watches from a tower', () => {
    for (const site of SITES) {
      for (const object of ['blast-frame-left', 'blast-frame-right', 'class-placard', 'sentry-tower']) assert.ok(dressing([site], [object]).length > 0, site + ' has no ' + object);
    }
  });

  test('every Site yard is topped with razor wire', () => {
    const yards = squares.filter((district) => SITES.includes(district.id) && Object.keys(district.rooms ?? {}).some((room) => room.endsWith('yard') || room.endsWith('parade')));
    assert.ok(yards.length > 0);
    for (const site of yards) assert.ok(dressing([site.id], ['razor-wire']).length >= 8, site.id + ' has no razor wire');
  });

  test('the Wreckfield stacks salvage containers', () => {
    const wreck = squares.filter((district) => district.region === 'wreckfield').map((district) => district.id);
    assert.ok(dressing(wreck, ['cargo-container']).length >= 10);
  });
});
