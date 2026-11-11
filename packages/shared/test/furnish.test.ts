import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONTENT } from '../src/index.ts';
import { parseTileLayout, type ObjectPlacement } from '../src/world/district.ts';
import type { Facing, TilePoint } from '../src/world/geometry.ts';
import { TILE_KINDS } from '../src/world/tiles.ts';

const STEP: Readonly<Record<Facing, TilePoint>> = { north: { x: 0, y: -1 }, south: { x: 0, y: 1 }, east: { x: 1, y: 0 }, west: { x: -1, y: 0 } };
const AGAINST_WALL = new Set(['vending-machine', 'filing-cabinet', 'sorting-case', 'server-rack','shuttered-kiosk', 'water-cooler', 'specimen-tank']);
const SEATED_AT = new Set(['office-desk', 'monitor-bank']);

const districts = [...GAME_CONTENT.districts.values()];
const dressingOf = (objects: readonly ObjectPlacement[]) => objects.filter((object) => object.instanceId.includes('-dressing-'));
const offset = (point: TilePoint, facing: Facing, sign = 1): TilePoint => ({ x: point.x + STEP[facing].x * sign, y: point.y + STEP[facing].y * sign });

describe('room dressing', () => {
  test('every dressed piece carries an explicit facing', () => {
    for (const district of districts) {
      for (const object of dressingOf(district.objects)) assert.ok(object.facing, `${object.instanceId} has no facing`);
    }
  });

  test('dressed chairs face a desk or console', () => {
    for (const district of districts) {
      const at = new Map(district.objects.map((object) => [`${object.position.x},${object.position.y}`, object.objectId]));
      for (const chair of dressingOf(district.objects).filter((object) => object.objectId === 'office-chair')) {
        const ahead = offset(chair.position, chair.facing ?? 'south');
        assert.ok(SEATED_AT.has(at.get(`${ahead.x},${ahead.y}`) ?? ''), `${chair.instanceId} faces ${at.get(`${ahead.x},${ahead.y}`) ?? 'nothing'}`);
      }
    }
  });

  test('wall furniture stands with its back to a wall', () => {
    for (const district of districts) {
      const layout = parseTileLayout(district.map);
      for (const object of dressingOf(district.objects).filter((piece) => AGAINST_WALL.has(piece.objectId))) {
        const behind = offset(object.position, object.facing ?? 'south', -1);
        assert.equal(TILE_KINDS[layout.tileAt(behind)].walkable, false, `${object.instanceId} (${object.objectId}) stands away from the wall`);
      }
    }
  });

  test('pews in a room all face the same way', () => {
    for (const district of districts) {
      const facings = new Map<string, Set<Facing>>();
      for (const pew of dressingOf(district.objects).filter((object) => object.objectId === 'pew')) {
        const room = pew.instanceId.slice(0, pew.instanceId.indexOf('-dressing-'));
        facings.set(room, (facings.get(room) ?? new Set()).add(pew.facing ?? 'south'));
      }
      for (const [room, seen] of facings) assert.equal(seen.size, 1, `${room} pews face ${[...seen].join(', ')}`);
    }
  });
});
