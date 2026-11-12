import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { CONDITION_RULES } from '../src/content/conditions.ts';
import type { Composed } from '../src/content/districts/compose.ts';
import { applyCondition } from '../src/content/districts/condition.ts';
import { findPrefabIssues, PREFABS } from '../src/content/prefabs/index.ts';
import { GAME_CONTENT } from '../src/index.ts';
import type { WorldObjectId } from '../src/ids.ts';
import type { ObjectPlacement } from '../src/world/district.ts';
import { objectFootprintSize, objectFootprintTiles } from '../src/world/footprint.ts';
import { tileKey, type TilePoint, type TileRect } from '../src/world/geometry.ts';

const RECT: TileRect = { x: 2, y: 2, width: 30, height: 20 };
const objectOf = (id: WorldObjectId) => GAME_CONTENT.worldObjects.get(id);

const benchRows = (count: number): ObjectPlacement[] =>
  Array.from({ length: count }, (_, index) => ({
    instanceId: `hall-dressing-${index + 1}-1`,
    objectId: 'briefing-bench',
    position: { x: RECT.x + 3 + (index % 10) * 2, y: RECT.y + 3 + Math.floor(index / 10) * 6 },
    facing: 'south',
  }));

const setup = (objects: readonly ObjectPlacement[], skip: (point: TilePoint) => boolean = () => false) => {
  const clear = new Set<string>();
  for (let y = RECT.y; y < RECT.y + RECT.height; y++) {
    for (let x = RECT.x; x < RECT.x + RECT.width; x++) if (!skip({ x, y })) clear.add(tileKey({ x, y }));
  }
  const occupied = new Set(objects.flatMap((object) => objectFootprintTiles(objectOf(object.objectId), object)).map(tileKey));
  const composed: Composed = { objects, decals: [] };
  return { clear, occupied, composed };
};

const run = (condition: 'pristine' | 'worn' | 'breached' | 'overgrown' | 'flooded' | 'alien' | 'uncanny', objects: readonly ObjectPlacement[], seed = 'd:hall:condition', skip?: (point: TilePoint) => boolean) => {
  const { clear, occupied, composed } = setup(objects, skip);
  const before = new Set(occupied);
  const result = applyCondition({ condition, rect: RECT, seed, composed, clear, occupied, objectOf, roomId: 'hall' });
  return { result, clear, before, composed };
};

describe('applyCondition', () => {
  test('pristine returns its input unchanged', () => {
    const { result, composed } = run('pristine', benchRows(20));
    assert.equal(result, composed);
  });

  test('breached swaps roughly its share of eligible pieces, deterministically', () => {
    const first = run('breached', benchRows(20)).result;
    const second = run('breached', benchRows(20)).result;
    assert.deepEqual(first, second);
    const swapped = first.objects.filter((object) => object.objectId === 'bench-toppled');
    assert.ok(Math.abs(swapped.length - 6) <= 2, `swapped ${swapped.length}`);
    const original = benchRows(20);
    for (const object of swapped) {
      const source = original.find((each) => each.instanceId === object.instanceId);
      assert.deepEqual(source?.position, object.position);
      assert.equal(source?.facing, object.facing);
    }
  });

  test('swaps never touch pieces without a dressing id', () => {
    const fixed: ObjectPlacement = { instanceId: 'atrium/1', objectId: 'briefing-bench', position: { x: RECT.x + 20, y: RECT.y + 15 }, facing: 'south' };
    const { result } = run('breached', [...benchRows(20), fixed]);
    assert.equal(result.objects.find((object) => object.instanceId === 'atrium/1')?.objectId, 'briefing-bench');
  });

  test('every swap target exists and keeps the footprint of its source', () => {
    for (const rule of Object.values(CONDITION_RULES)) {
      for (const [source, target] of Object.entries(rule.swaps)) {
        const from = objectOf(source as WorldObjectId);
        const to = objectOf(target as WorldObjectId);
        assert.ok(from, `${source} exists`);
        assert.ok(to, `${target} exists`);
        assert.deepEqual(objectFootprintSize(to), objectFootprintSize(from));
      }
    }
  });

  test('every add names a prefab that exists', () => {
    for (const rule of Object.values(CONDITION_RULES)) for (const id of rule.adds) assert.ok(PREFABS[id], id);
  });

  test('ruin prefabs are well formed', () => {
    for (const id of ['barricade-line', 'rubble', 'debris']) {
      const found = PREFABS[id];
      assert.ok(found, id);
      assert.deepEqual(findPrefabIssues(found, objectOf), []);
    }
  });

  test('adds stay on clear, unoccupied floor away from excluded tiles', () => {
    const excluded = (point: TilePoint) => point.x < RECT.x + 12;
    const { result, clear, before } = run('breached', benchRows(20), 'd:hall:condition', excluded);
    const added = result.objects.filter((object) => !object.instanceId.includes('-dressing-'));
    assert.ok(added.length > 0);
    for (const object of added) {
      for (const tile of objectFootprintTiles(objectOf(object.objectId), object)) {
        assert.ok(clear.has(tileKey(tile)), `${tileKey(tile)} is clear`);
        assert.ok(!before.has(tileKey(tile)), `${tileKey(tile)} was free`);
      }
    }
    assert.equal(new Set(result.objects.map((object) => object.instanceId)).size, result.objects.length);
  });

  test('decal stamps are 2 to 4 tiles a side on clear floor', () => {
    const { result, clear } = run('overgrown', []);
    assert.ok(result.decals.length > 0);
    for (const decal of result.decals) {
      assert.equal(decal.kind, 'moss');
      assert.ok(decal.rect.width >= 2 && decal.rect.width <= 4 && decal.rect.height >= 2 && decal.rect.height <= 4);
      for (let y = decal.rect.y; y < decal.rect.y + decal.rect.height; y++) {
        for (let x = decal.rect.x; x < decal.rect.x + decal.rect.width; x++) assert.ok(clear.has(tileKey({ x, y })));
      }
    }
  });

  test('uncanny adds exactly one point-mirrored duplicate', () => {
    const { result } = run('uncanny', benchRows(20));
    assert.equal(result.objects.length, 21);
    const extra = result.objects.filter((object) => !object.instanceId.includes('-dressing-'));
    assert.equal(extra.length, 1);
    const source = benchRows(20).find((object) => object.objectId === extra[0]?.objectId && 2 * RECT.x + RECT.width - 1 - object.position.x === extra[0]?.position.x && 2 * RECT.y + RECT.height - 1 - object.position.y === extra[0]?.position.y);
    assert.ok(source);
  });

  test('the condition table matches the design', () => {
    assert.equal(CONDITION_RULES.pristine.swapShare, 0);
    assert.deepEqual(CONDITION_RULES.flooded.adds, ['sandbag-row']);
    assert.equal(CONDITION_RULES.breached.swaps['shuttered-kiosk'], 'kiosk-burnt');
  });
});
