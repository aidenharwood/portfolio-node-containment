import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { assembleLevel, drawBlueprint, exit, findTerrainSeamIssues, parseTileLayout, ramp, rise, room, type DistrictDefinition } from '../src/index.ts';
import { MAP_LEGEND, TILE_KINDS } from '../src/world/tiles.ts';

const kindAt = (map: readonly string[], x: number, y: number) => MAP_LEGEND[map[y]?.[x] ?? ' '];

describe('terraced ground', () => {
  test('a flat blueprint stores no heights and reads as step 0 everywhere', () => {
    const flat = drawBlueprint({ width: 10, height: 10 }, [room('ground', 1, 1, 8, 8, 'grass')]);
    assert.equal(flat.heights, undefined);
    assert.equal(flat.heightAt({ x: 4, y: 4 }), 0);
  });

  test('a rise lifts the ground under it and a one-step edge stays walkable', () => {
    const plan = drawBlueprint({ width: 12, height: 8 }, [room('ground', 1, 1, 10, 6, 'grass'), rise(6, 1, 5, 6, 1)]);
    assert.equal(plan.heightAt({ x: 3, y: 3 }), 0);
    assert.equal(plan.heightAt({ x: 7, y: 3 }), 1);
    assert.equal(kindAt(plan.map, 6, 3), 'grass');
    assert.equal(plan.heights?.[3]?.[7], '1');
  });

  test('a drop of two steps or more turns the upper edge into cliff', () => {
    const plan = drawBlueprint({ width: 12, height: 8 }, [room('ground', 1, 1, 10, 6, 'grass'), rise(6, 1, 5, 6, 3)]);
    for (let y = 1; y <= 6; y++) assert.equal(kindAt(plan.map, 6, y), 'cliff', `row ${y}`);
    assert.equal(kindAt(plan.map, 5, 3), 'grass');
    assert.equal(kindAt(plan.map, 7, 3), 'grass');
    assert.equal(plan.heightAt({ x: 6, y: 3 }), 3);
    assert.throws(() => plan.at('ground', 5, 2), /cliff, not floor/);
  });

  test('walkable neighbours never differ by more than one step, diagonals included', () => {
    const plan = drawBlueprint({ width: 16, height: 16 }, [room('ground', 1, 1, 14, 14, 'grass'), rise(4, 4, 8, 8, 2, 'round'), rise(6, 6, 4, 4, 5)]);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (!TILE_KINDS[kindAt(plan.map, x, y) ?? 'void'].walkable) continue;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!TILE_KINDS[kindAt(plan.map, x + dx, y + dy) ?? 'void'].walkable) continue;
            assert.ok(Math.abs(plan.heightAt({ x, y }) - plan.heightAt({ x: x + dx, y: y + dy })) <= 1, `${x},${y} to ${x + dx},${y + dy}`);
          }
        }
      }
    }
  });

  test('a ramp climbs one step at a time towards its side', () => {
    const plan = drawBlueprint({ width: 8, height: 12 }, [room('ground', 1, 1, 6, 10, 'paving'), ramp(1, 1, 6, 8, 'north', 0, 3)]);
    assert.deepEqual([8, 7, 6, 5, 4, 3, 2, 1].map((y) => plan.heightAt({ x: 3, y })), [0, 0, 1, 1, 2, 2, 3, 3]);
    assert.ok(![...plan.map.join('')].some((symbol) => MAP_LEGEND[symbol] === 'cliff'));
    assert.throws(() => drawBlueprint({ width: 8, height: 12 }, [room('ground', 1, 1, 6, 10, 'paving'), ramp(1, 1, 6, 2, 'north', 0, 3)]), /too steep/);
  });

  test('painted heights land after the steps', () => {
    const plan = drawBlueprint({ width: 10, height: 10 }, [room('ground', 1, 1, 8, 8, 'grass')], [], [{ x: 4, y: 4, height: 1 }]);
    assert.equal(plan.heightAt({ x: 4, y: 4 }), 1);
    assert.equal(plan.heightAt({ x: 5, y: 4 }), 0);
  });

  test('an exit never becomes cliff', () => {
    assert.throws(
      () => drawBlueprint({ width: 12, height: 8 }, [room('ground', 0, 1, 11, 6, 'grass'), exit('west', 'ground', 'west', 4), rise(0, 1, 1, 6, 3)]),
      /exit "west".*cliff/,
    );
  });

  test('a building has to stand on level ground', () => {
    assert.throws(
      () =>
        drawBlueprint({ width: 14, height: 12 }, [
          room('ground', 1, 1, 12, 10, 'grass'),
          rise(1, 1, 6, 10, 1),
          { kind: 'building', id: 'shop', rect: { x: 4, y: 3, width: 6, height: 4 }, floor: 'boards', wall: 'brick', doors: [{ side: 'south', width: 1 }] },
        ]),
      /building "shop" does not stand on level ground/,
    );
  });

  test('a tile layout reads heights and a level stamps them at each district origin', () => {
    const plan = drawBlueprint({ width: 6, height: 6 }, [room('ground', 0, 0, 6, 6, 'grass'), rise(3, 0, 3, 6, 1)]);
    const layout = parseTileLayout(plan.map, plan.heights);
    assert.equal(layout.heightAt({ x: 4, y: 2 }), 1);
    assert.equal(layout.heightAt({ x: 1, y: 2 }), 0);
    assert.equal(layout.heightAt({ x: 40, y: 2 }), 0);
    const district: DistrictDefinition = {
      id: 'hill',
      name: 'Hill',
      subtitle: '',
      tier: 1,
      region: 'meridian-core',
      map: plan.map,
      ...(plan.heights ? { heights: plan.heights } : {}),
      ambience: { darkness: 0, tint: '#000000', fog: '#000000' },
      areas: [],
      npcs: [],
      objects: [],
      lights: [],
    };
    const level = assembleLevel(
      { id: 'test', name: 'Test', kind: 'floor', depth: 0, districts: [{ districtId: 'hill', origin: { x: 10, y: 5 } }], connectors: [], spawn: { districtId: 'hill', position: { x: 1, y: 1 } } },
      new Map([['hill', district]]),
    );
    assert.equal(level.heightAt({ x: 14, y: 7 }), 1);
    assert.equal(level.heightAt({ x: 11, y: 7 }), 0);
  });

  test('a seam between districts must match within one step', () => {
    const districtOf = (id: string, raised: number): DistrictDefinition => {
      const plan = drawBlueprint({ width: 6, height: 6 }, [room('ground', 0, 0, 6, 6, 'grass'), rise(0, 0, 6, 6, raised)]);
      return {
        id,
        name: id,
        subtitle: '',
        tier: 1,
        region: 'meridian-core',
        map: plan.map,
        ...(plan.heights ? { heights: plan.heights } : {}),
        ambience: { darkness: 0, tint: '#000000', fog: '#000000' },
        areas: [],
        npcs: [],
        objects: [],
        lights: [],
      };
    };
    const levelOf = (raised: number) => ({
      id: 'test',
      layout: assembleLevel(
        {
          id: 'test',
          name: 'Test',
          kind: 'floor',
          depth: 0,
          districts: [
            { districtId: 'low', origin: { x: 0, y: 0 } },
            { districtId: 'high', origin: { x: 6, y: 0 } },
          ],
          connectors: [],
          spawn: { districtId: 'low', position: { x: 1, y: 1 } },
        },
        new Map([
          ['low', districtOf('low', 0)],
          ['high', districtOf('high', raised)],
        ]),
      ),
    });
    assert.deepEqual(findTerrainSeamIssues(levelOf(1)), []);
    const issues = findTerrainSeamIssues(levelOf(3));
    assert.equal(issues.length, 1);
    assert.match(issues[0] ?? '', /high and low drops 3 steps/);
  });
});
