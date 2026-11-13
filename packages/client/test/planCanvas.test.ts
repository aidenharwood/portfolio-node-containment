import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT, type DistrictDefinition, type Facing, type GameContent } from '@containment/shared';
import { planDrawList } from '../src/editor/planCanvas.ts';

const atrium = GAME_CONTENT.districts.get('meridian-atrium') as DistrictDefinition;

const withMosaic = (): GameContent => {
  const district: DistrictDefinition = { ...atrium, decals: [{ kind: 'mosaic', pattern: 'compass', rect: { x: 60, y: 40, width: 9, height: 9 } }] };
  return { ...GAME_CONTENT, districts: new Map([...GAME_CONTENT.districts, [district.id, district]]) };
};

const withKiosk = (facing: Facing): GameContent => {
  const district: DistrictDefinition = { ...atrium, objects: [{ instanceId: 'kiosk', objectId: 'glass-kiosk', position: { x: 40, y: 30 }, facing }] };
  return { ...GAME_CONTENT, districts: new Map([...GAME_CONTENT.districts, [district.id, district]]) };
};

test('a 3x2 object draws at its rotated footprint in every facing', () => {
  for (const facing of ['north', 'east', 'south', 'west'] as const) {
    const mark = planDrawList(withKiosk(facing), atrium.id, ['objects']).find((shape) => shape.kind === 'mark' && shape.label === 'glass-kiosk');
    assert.ok(mark, facing);
    const sideways = facing === 'east' || facing === 'west';
    assert.deepEqual([mark.x, mark.y, mark.width, mark.height, mark.facing], [40, 30, sideways ? 2 : 3, sideways ? 3 : 2, facing], facing);
  }
});

test('layers that are off draw nothing', () => {
  const shapes = planDrawList(GAME_CONTENT, atrium.id, ['rooms']);
  assert.ok(shapes.length > 0);
  assert.deepEqual([...new Set(shapes.map((shape) => shape.kind))], ['room']);
});

test('tiles draw one shape per map tile and decals draw in their own colours', () => {
  const shapes = planDrawList(withMosaic(), atrium.id, ['tiles', 'decals']);
  assert.equal(shapes.filter((shape) => shape.kind === 'tile').length, (atrium.map[0]?.length ?? 0) * atrium.map.length);
  const mosaic = shapes.find((shape) => shape.kind === 'decal' && shape.label === 'mosaic');
  assert.ok(mosaic);
  assert.equal(mosaic.color, '#3f7f9a');
});

test('issues with a tile draw a marker only while the issues layer is on', () => {
  const issues = [{ message: 'something is wrong at 61,47', tile: { x: 61, y: 47 } }, { message: 'something with no tile' }];
  const on = planDrawList(GAME_CONTENT, atrium.id, ['issues'], issues);
  assert.deepEqual(on.map((shape) => [shape.kind, shape.x, shape.y, shape.width, shape.height]), [['issue', 61, 47, 1, 1]]);
  assert.deepEqual(planDrawList(GAME_CONTENT, atrium.id, ['objects'], issues).filter((shape) => shape.kind === 'issue'), []);
});
