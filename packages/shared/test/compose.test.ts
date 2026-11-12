import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { COMPOSITIONS, inferComposition, type CompositionName } from '../src/content/compositions.ts';
import { composeRoom, inWalkingLane, type ComposeInput } from '../src/content/districts/compose.ts';
import { mirrorTurn, pieceTiles, turnsOf, type Turn } from '../src/content/districts/composeLayout.ts';
import { prefab } from '../src/content/prefabs/index.ts';
import type { WorldObjectDefinition } from '../src/world/entities.ts';
import { GAME_CONTENT } from '../src/index.ts';
import type { DressingTheme } from '../src/content/prefabs/index.ts';
import type { WorldObjectId } from '../src/ids.ts';
import type { ObjectPlacement } from '../src/world/district.ts';
import { objectFootprintTiles } from '../src/world/footprint.ts';
import { rectContains, tileKey, type Facing, type TilePoint, type TileRect } from '../src/world/geometry.ts';

const ROOM: TileRect = { x: 1, y: 1, width: 30, height: 20 };
const DOOR: TilePoint = { x: 0, y: 8 };
const objectOf = (id: WorldObjectId) => GAME_CONTENT.worldObjects.get(id);

const inputFor = (rect: TileRect, door: TilePoint, theme: DressingTheme, composition: CompositionName, seed = 'test-room'): ComposeInput => {
  const clear = new Set<string>();
  for (let y = rect.y; y < rect.y + rect.height; y++) for (let x = rect.x; x < rect.x + rect.width; x++) clear.add(tileKey({ x, y }));
  return {
    roomId: 'test-room',
    rect,
    theme,
    density: 'normal',
    composition: COMPOSITIONS[composition],
    seed,
    clear,
    openings: [door],
    isWall: (point) => !rectContains(rect, point) && tileKey(point) !== tileKey(door),
    objectOf,
    occupied: new Set<string>(),
  };
};

const blockOf = (object: ObjectPlacement): string => object.instanceId.slice(0, object.instanceId.lastIndexOf('-'));
const blocksOf = (objects: readonly ObjectPlacement[]): Map<string, ObjectPlacement[]> => {
  const blocks = new Map<string, ObjectPlacement[]>();
  for (const object of objects) blocks.set(blockOf(object), [...(blocks.get(blockOf(object)) ?? []), object]);
  return blocks;
};
const tilesOf = (object: ObjectPlacement): TilePoint[] => objectFootprintTiles(objectOf(object.objectId), object);
const MIRRORED: Readonly<Record<Facing, Facing>> = { north: 'north', south: 'south', east: 'west', west: 'east' };

describe('room composer', () => {
  test('the same seed composes the same room and another seed composes a different one', () => {
    const first = composeRoom(inputFor(ROOM, DOOR, 'civic', 'court'));
    const again = composeRoom(inputFor(ROOM, DOOR, 'civic', 'court'));
    const other = composeRoom(inputFor(ROOM, DOOR, 'civic', 'court', 'another-room'));
    assert.ok(first.objects.length > 0);
    assert.deepEqual(again, first);
    assert.notDeepEqual(other, first);
  });

  test('a court uses no prefab more than three times', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const composed = composeRoom(inputFor(ROOM, DOOR, 'civic', 'court', seed));
      const uses = new Map<string, number>();
      for (const pieces of blocksOf(composed.objects).values()) {
        const signature = pieces.map((piece) => piece.objectId).sort().join('+');
        uses.set(signature, (uses.get(signature) ?? 0) + 1);
      }
      for (const [signature, count] of uses) assert.ok(count <= 3, `${signature} used ${count} times with seed ${seed}`);
    }
  });

  test('a nave mirrors every piece across the vertical centre line', () => {
    const composed = composeRoom(inputFor(ROOM, DOOR, 'chapel', 'nave'));
    assert.ok(composed.objects.some((object) => object.objectId === 'pew'));
    const at = new Map<string, ObjectPlacement>();
    for (const object of composed.objects) for (const tile of tilesOf(object)) at.set(tileKey(tile), object);
    for (const object of composed.objects) {
      for (const tile of tilesOf(object)) {
        const mirror = at.get(tileKey({ x: 2 * ROOM.x + ROOM.width - 1 - tile.x, y: tile.y }));
        assert.equal(mirror?.objectId, object.objectId, `${object.instanceId} at ${tileKey(tile)} has no mirror`);
        assert.equal(mirror?.facing, MIRRORED[object.facing ?? 'south'], `${object.instanceId} mirror faces ${mirror?.facing}`);
      }
    }
  });

  test('lanes and the ground by the door stay clear', () => {
    for (const seed of ['a', 'b', 'c']) {
      for (const theme of ['civic', 'office', 'industrial', 'canteen'] as const) {
        const composed = composeRoom(inputFor(ROOM, DOOR, theme, 'court', seed));
        for (const object of composed.objects) {
          for (const tile of tilesOf(object)) {
            assert.ok(!inWalkingLane(ROOM, tile), `${object.instanceId} stands in the lane at ${tileKey(tile)}`);
            assert.ok(Math.max(Math.abs(tile.x - DOOR.x), Math.abs(tile.y - DOOR.y)) > 3, `${object.instanceId} blocks the door at ${tileKey(tile)}`);
          }
        }
      }
    }
  });

  test('a 5x5 room composes without throwing and holds at most one prefab', () => {
    const small: TileRect = { x: 1, y: 1, width: 5, height: 5 };
    for (const name of Object.keys(COMPOSITIONS) as CompositionName[]) {
      for (const theme of ['civic', 'office', 'chapel', 'freight'] as const) {
        const composed = composeRoom(inputFor(small, { x: 3, y: 0 }, theme, name));
        assert.ok(blocksOf(composed.objects).size <= 1, `${name} ${theme} placed ${blocksOf(composed.objects).size} prefabs`);
      }
    }
  });

  test('compositions are inferred from shape, proportion and theme', () => {
    assert.equal(inferComposition({ x: 0, y: 0, width: 30, height: 30 }, 'octagon', 'civic'), 'radial');
    assert.equal(inferComposition({ x: 0, y: 0, width: 100, height: 13 }, 'rect', 'civic'), 'concourse');
    assert.equal(inferComposition({ x: 0, y: 0, width: 16, height: 12 }, 'rect', 'office'), 'workroom');
    for (const rect of [{ x: 0, y: 0, width: 10, height: 10 }, { x: 0, y: 0, width: 40, height: 30 }, { x: 0, y: 0, width: 60, height: 12 }]) {
      assert.equal(inferComposition(rect, 'rect', 'chapel'), 'nave');
    }
  });

  test('rotation and mirroring keep multi-tile pieces inside their prefab', () => {
    const wide = { id: 'wide-thing', footprint: { width: 2, height: 1 } } as unknown as WorldObjectDefinition;
    const lookup = (id: WorldObjectId) => (id === 'wide-thing' ? wide : undefined);
    const sample = prefab('sample', ['civic'], ['island'], [[0, 0, 'wide-thing' as WorldObjectId], [2, 0, 'planter']]);
    const turns = turnsOf(sample, lookup);
    assert.deepEqual(turns.map((turn) => [turn.width, turn.height]), [[3, 1], [1, 3], [3, 1], [1, 3]]);
    assert.deepEqual(turns[1]?.pieces.map((piece) => [piece.dx, piece.dy, piece.width, piece.height, piece.facing]), [[0, 0, 1, 2, 'west'], [0, 2, 1, 1, 'west']]);
    assert.deepEqual(turns[2]?.pieces.map((piece) => [piece.dx, piece.dy, piece.facing]), [[1, 0, 'north'], [0, 0, 'north']]);
    for (const turn of [...turns, ...turns.map((each) => mirrorTurn(each, 'x')), ...turns.map((each) => mirrorTurn(each, 'y'))]) {
      const tiles = pieceTiles({ x: 0, y: 0 }, turn).map(tileKey);
      assert.equal(new Set(tiles).size, 3);
      for (const tile of pieceTiles({ x: 0, y: 0 }, turn)) assert.ok(tile.x >= 0 && tile.y >= 0 && tile.x < turn.width && tile.y < turn.height);
    }
    assert.deepEqual(mirrorTurn(turns[0] as Turn, 'x').pieces.map((piece) => [piece.dx, piece.facing]), [[1, 'south'], [0, 'south']]);
  });
});
