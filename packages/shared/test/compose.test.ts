import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { COMPOSITIONS, inferComposition, type CompositionName } from '../src/content/compositions.ts';
import { composeRoom, inWalkingLane, type ComposeInput } from '../src/content/districts/compose.ts';
import { centreBounds, distanceOutside, laneTilesOf, mirrorTurn, pieceTiles, turnsOf, type Turn } from '../src/content/districts/composeLayout.ts';
import { prefab, PREFABS, row, type Prefab } from '../src/content/prefabs/index.ts';
import type { WorldObjectDefinition } from '../src/world/entities.ts';
import { drawBlueprint, GAME_CONTENT, pillars, room } from '../src/index.ts';
import { furnish } from '../src/content/districts/furnish.ts';
import { setPiece, type SetPiece } from '../src/content/districts/setPiece.ts';
import type { DressingTheme } from '../src/content/prefabs/index.ts';
import type { WorldObjectId } from '../src/ids.ts';
import type { DistrictDefinition, ObjectPlacement } from '../src/world/district.ts';
import { objectFootprintTiles } from '../src/world/footprint.ts';
import { rectContains, tileKey, type Facing, type TilePoint, type TileRect } from '../src/world/geometry.ts';
import { MAP_LEGEND, TILE_KINDS } from '../src/world/tiles.ts';

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
const ALTAR = prefab('test-altar', ['chapel', 'canteen'], ['focal'], row('candle-stand', 3));

const withPrefabs = (extra: readonly Prefab[], run: () => void): void => {
  const library = PREFABS as Record<string, Prefab>;
  for (const each of extra) library[each.id] = each;
  try {
    run();
  } finally {
    for (const each of extra) delete library[each.id];
  }
};

const candlesOf = (objects: readonly ObjectPlacement[]): TilePoint[] => objects.filter((object) => object.objectId === 'candle-stand').flatMap(tilesOf);

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
        const focalPlaced = PREFABS[composed.prefabs?.[0] ?? '']?.roles.includes('focal') === true;
        for (const object of composed.objects) {
          const isFocal = focalPlaced && blockOf(object) === 'test-room-dressing-1';
          for (const tile of tilesOf(object)) {
            if (!isFocal) assert.ok(!inWalkingLane(ROOM, tile), `${object.instanceId} stands in the lane at ${tileKey(tile)}`);
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

  test('a nave sets its focal piece at the far end from its door, centred across the room and unmirrored', () => {
    withPrefabs([ALTAR], () => {
      const west = candlesOf(composeRoom(inputFor(ROOM, DOOR, 'chapel', 'nave')).objects);
      assert.equal(west.length, 3);
      for (const tile of west) assert.ok(tile.x >= ROOM.x + Math.ceil((2 * ROOM.width) / 3), `focal tile ${tileKey(tile)} is not at the east end`);
      const ys = west.map((tile) => tile.y);
      assert.ok(Math.abs(Math.min(...ys) + Math.max(...ys) - (2 * ROOM.y + ROOM.height - 1)) <= 1, `focal rows ${ys.join(',')} are off the centre line`);
      const east = candlesOf(composeRoom(inputFor(ROOM, { x: ROOM.x + ROOM.width, y: 8 }, 'chapel', 'nave')).objects);
      assert.equal(east.length, 3);
      for (const tile of east) assert.ok(tile.x < ROOM.x + Math.floor(ROOM.width / 3), `focal tile ${tileKey(tile)} is not at the west end`);
    });
  });

  test('a hall sets its focal piece first, at the far end from its door', () => {
    withPrefabs([ALTAR], () => {
      for (const seed of ['a', 'b', 'c']) {
        const candles = candlesOf(composeRoom(inputFor(ROOM, DOOR, 'canteen', 'hall', seed)).objects);
        assert.equal(candles.length, 3, `hall ${seed} placed ${candles.length} focal tiles`);
        for (const tile of candles) assert.ok(tile.x >= ROOM.x + Math.ceil((2 * ROOM.width) / 3), `focal tile ${tileKey(tile)} is not at the east end`);
      }
    });
  });

  test('a far-end focal is skipped when its end third is occupied, and a centre focal when the centre third is', () => {
    withPrefabs([ALTAR], () => {
      const farEnd = inputFor(ROOM, DOOR, 'chapel', 'nave');
      farEnd.occupied.add(tileKey({ x: ROOM.x + ROOM.width - 2, y: ROOM.y + 1 }));
      assert.equal(candlesOf(composeRoom(farEnd).objects).length, 0);
      assert.equal(candlesOf(composeRoom(inputFor(ROOM, DOOR, 'canteen', 'court')).objects).length, 3);
      const blocked = inputFor(ROOM, DOOR, 'canteen', 'court');
      blocked.occupied.add(tileKey({ x: ROOM.x + Math.floor(ROOM.width / 2), y: ROOM.y + Math.floor(ROOM.height / 2) }));
      assert.equal(candlesOf(composeRoom(blocked).objects).length, 0);
    });
  });

  test('a ring lane runs a clear path from an off-centre door to the annulus', () => {
    const plan = drawBlueprint({ width: 32, height: 32 }, [room('hub', 1, 1, 30, 30, 'plating', 'octagon')]);
    const rect = plan.rooms.hub as TileRect;
    const door = { x: 0, y: 8 };
    const walkable = (point: TilePoint): boolean => TILE_KINDS[MAP_LEGEND[plan.map[point.y]?.[point.x] ?? ' '] ?? 'void'].walkable;
    const hub = centreBounds(rect);
    assert.ok(walkable({ x: 1, y: 8 }));
    assert.ok(distanceOutside(hub, { x: hub.left, y: door.y }) > 4);
    const lane = laneTilesOf(rect, 'ring', undefined, [door]);
    const seen = new Set<string>([tileKey({ x: 1, y: 8 })]);
    const queue: TilePoint[] = [{ x: 1, y: 8 }];
    let reached = false;
    while (queue.length > 0 && !reached) {
      const point = queue.shift() as TilePoint;
      const distance = distanceOutside(hub, point);
      if (distance >= 2 && distance <= 4) reached = true;
      for (const step of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
        const next = { x: point.x + step.x, y: point.y + step.y };
        if (seen.has(tileKey(next)) || !lane.has(tileKey(next)) || !walkable(next)) continue;
        seen.add(tileKey(next));
        queue.push(next);
      }
    }
    assert.ok(reached, 'the path from the door never meets the annulus');
    const clear = new Set<string>();
    for (let y = rect.y; y < rect.y + rect.height; y++) for (let x = rect.x; x < rect.x + rect.width; x++) if (walkable({ x, y })) clear.add(tileKey({ x, y }));
    const path = [...lane].filter((key) => {
      const [x, y] = key.split(',').map(Number) as [number, number];
      return distanceOutside(hub, { x, y }) > 4;
    });
    assert.ok(path.length > 0);
    for (const seed of ['a', 'b', 'c']) {
      const composed = composeRoom({ ...inputFor(rect, door, 'civic', 'radial', seed), clear, isWall: (point) => !walkable(point) && tileKey(point) !== tileKey(door) });
      const blocked = new Set(composed.objects.flatMap(tilesOf).map(tileKey));
      for (const key of path) assert.ok(!blocked.has(key), `the door path is blocked at ${key} with seed ${seed}`);
    }
  });
});

const PLAN = drawBlueprint({ width: 34, height: 24 }, [room('hall', 1, 1, 30, 20, 'plating'), pillars('hall', 40, 40, 2)]);
const HALL = PLAN.rooms.hall as TileRect;
const DAIS = prefab('test-dais', ['chapel'], ['island'], [[0, 0, 'planter'], [1, 0, 'briefing-bench'], [2, 0, 'planter']], {
  decals: [{ kind: 'rug', rect: { x: 0, y: 0, width: 3, height: 1 } }],
  clearance: 2,
});
const DISTRICT: DistrictDefinition = {
  id: 'test',
  name: 'Test',
  subtitle: '',
  tier: 1,
  region: 'meridian-core',
  map: PLAN.map,
  rooms: PLAN.rooms,
  ambience: { darkness: 0.5, tint: '#000000', fog: '#000000' },
  areas: [],
  npcs: [],
  objects: [],
  lights: [],
};
const unwalkableIn = (rect: TileRect): TilePoint => {
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) if (!TILE_KINDS[MAP_LEGEND[PLAN.map[y]?.[x] ?? ' '] ?? 'void'].walkable) return { x, y };
  }
  throw new Error('no pillar');
};
const boundsOf = (objects: readonly ObjectPlacement[], clearance: number): TileRect => {
  const tiles = objects.flatMap(tilesOf);
  const left = Math.min(...tiles.map((tile) => tile.x)) - clearance;
  const top = Math.min(...tiles.map((tile) => tile.y)) - clearance;
  return { x: left, y: top, width: Math.max(...tiles.map((tile) => tile.x)) + clearance - left + 1, height: Math.max(...tiles.map((tile) => tile.y)) + clearance - top + 1 };
};

describe('set-pieces', () => {
  const placed = (setPieces: readonly SetPiece[]): DistrictDefinition => furnish(PLAN, DISTRICT, { hall: 'canteen' }, { setPieces, landmarks: ['hall'] });

  test('set-pieces keep fixed or generated ids, turn to their facing and lay their decals', () => {
    withPrefabs([DAIS], () => {
      const dressed = placed([setPiece(PLAN, 'hall', 'test-dais', 4, 4, 'east', 'dais'), setPiece(PLAN, 'hall', 'pew-rows', 12, 7)]);
      const dais = dressed.objects.filter((object) => object.instanceId.startsWith('dais/'));
      assert.deepEqual(dais.map((object) => object.instanceId), ['dais/1', 'dais/2', 'dais/3']);
      assert.deepEqual(dais.map((object) => [object.objectId, object.position.x, object.position.y, object.facing]), [
        ['planter', 5, 7, 'east'],
        ['briefing-bench', 5, 6, 'east'],
        ['planter', 5, 5, 'east'],
      ]);
      const pews = dressed.objects.filter((object) => object.instanceId.startsWith('test-hall-set-2-'));
      assert.equal(pews.length, 12);
      assert.deepEqual(pews.map((object) => object.instanceId), Array.from({ length: 12 }, (_, index) => `test-hall-set-2-${index + 1}`));
      assert.ok(pews.every((object) => object.objectId === 'pew' && object.facing === 'south'));
      assert.deepEqual(pews[0]?.position, { x: 13, y: 8 });
      assert.ok(dressed.decals?.some((decal) => decal.kind === 'rug' && tileKey(decal.rect) === '5,5' && decal.rect.width === 1 && decal.rect.height === 3));
      assert.deepEqual(dressed.landmarks, ['hall']);
    });
  });

  test('nothing is composed on a set-piece or its clearance', () => {
    withPrefabs([DAIS], () => {
      const dressed = placed([setPiece(PLAN, 'hall', 'test-dais', 4, 4, 'east', 'dais'), setPiece(PLAN, 'hall', 'pew-rows', 12, 7)]);
      const composed = dressed.objects.filter((object) => object.instanceId.includes('-dressing-'));
      assert.ok(composed.length > 0);
      const guarded = [
        boundsOf(dressed.objects.filter((object) => object.instanceId.startsWith('dais/')), 2),
        boundsOf(dressed.objects.filter((object) => object.instanceId.startsWith('test-hall-set-')), 1),
      ];
      for (const object of composed) {
        for (const tile of tilesOf(object)) assert.ok(!guarded.some((rect) => rectContains(rect, tile)), `${object.instanceId} stands on a set-piece at ${tileKey(tile)}`);
      }
    });
  });

  test('a set-piece in the centre third suppresses the focal zone', () => {
    withPrefabs([ALTAR], () => {
      assert.equal(candlesOf(placed([]).objects).length, 3);
      assert.equal(candlesOf(placed([setPiece(PLAN, 'hall', 'pew-rows', 12, 7)]).objects).length, 0);
    });
  });

  test('set-pieces refuse unwalkable tiles, unknown prefabs and occupied ground', () => {
    withPrefabs([DAIS], () => {
      const pillar = unwalkableIn(HALL);
      assert.throws(() => setPiece(PLAN, 'hall', 'test-dais', pillar.x - 1 - HALL.x, pillar.y - HALL.y), /test-dais.*hall|hall.*test-dais/);
      assert.throws(() => setPiece(PLAN, 'hall', 'no-such-prefab', 4, 4), /no-such-prefab/);
      const fixture: ObjectPlacement = { instanceId: 'fixture', objectId: 'notice-board', position: { x: 6, y: 5 } };
      assert.throws(() => furnish(PLAN, { ...DISTRICT, objects: [fixture] }, { hall: 'civic' }, { setPieces: [setPiece(PLAN, 'hall', 'test-dais', 4, 4)] }), /overlaps/);
    });
  });
});
