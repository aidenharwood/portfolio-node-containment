import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { DistrictDefinition } from '../src/world/district.ts';
import { changedSquares, cutSquare, drawLand, landOrigin, reliefHeight, reliefNoise, type LandMap, type LandPlan, type LandStep } from '../src/world/landPlan.ts';
import { parseLandPlan } from '../src/world/landSchema.ts';
import { printLandPlan } from '../src/world/printLandPlan.ts';
import { placeLandSquares } from '../src/world/levelPlan.ts';
import { fractalNoiseGrid } from '../src/world/noise.ts';

const ground: LandStep = { kind: 'fill', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 16, height: 8 } }, tile: 'grass' };
const hills: LandStep = { kind: 'relief', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 16, height: 8 } }, seed: 7, low: 1, high: 9, scale: 3 };

const plan = (...steps: LandStep[]): LandPlan => ({ id: 'relief', squareSize: 8, columns: 2, rows: 1, steps: [ground, ...steps] });

const heightsOf = (map: LandMap): number[] => {
  const heights: number[] = [];
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) heights.push(map.heightAt({ x, y }));
  return heights;
};

const district = (id: string, column: number, row: number): DistrictDefinition => ({ id, square: { column, row } }) as unknown as DistrictDefinition;

describe('relief', () => {
  test('the same seed draws the same heights and another seed draws others', () => {
    assert.deepEqual(heightsOf(drawLand(plan(hills))), heightsOf(drawLand(plan(hills))));
    assert.notDeepEqual(heightsOf(drawLand(plan(hills))), heightsOf(drawLand(plan({ ...hills, seed: 8 }))));
  });

  test('every height lies between low and high and the land is not flat', () => {
    const heights = heightsOf(drawLand(plan(hills)));
    assert.ok(heights.every((height) => height >= 1 && height <= 9));
    assert.ok(new Set(heights).size > 2);
    const flipped = heightsOf(drawLand(plan({ ...hills, low: 15, high: 0, scale: 1 })));
    assert.ok(flipped.every((height) => height >= 0 && height <= 15));
  });

  test('the noise stays in 0..1 and reliefHeight matches the drawn land', () => {
    for (let x = -50; x < 50; x += 3) for (let y = -50; y < 50; y += 7) {
      const value = reliefNoise(-3, x, y, 5);
      assert.ok(value >= 0 && value <= 1);
    }
    const map = drawLand(plan(hills));
    for (let y = 0; y < 8; y++) for (let x = 0; x < 16; x++) assert.equal(map.heightAt({ x, y }), reliefHeight(hills, x, y));
  });

  test('relief samples world tiles, so moving the origin keeps every height in place', () => {
    const shifted = drawLand({ ...plan(hills), origin: { column: -1, row: 2 } });
    for (let y = 0; y < 8; y++) for (let x = 0; x < 16; x++) {
      const world = { x: x - 8, y: y + 16 };
      if (world.x >= 0 && world.y < 8) assert.equal(shifted.heightAt({ x, y }), reliefHeight(hills, world.x, world.y));
    }
  });

  test('the noise grid matches the noise and samples a 1200x1000 plan quickly', () => {
    const grid = fractalNoiseGrid(5, 40, -600, -10, 600, 990);
    for (let y = -10; y < 990; y += 97) for (let x = -600; x < 600; x += 89) assert.equal(grid(x, y), reliefNoise(5, x, y, 40));
    const started = performance.now();
    const sample = fractalNoiseGrid(1, 40, 0, 0, 1200, 1000);
    let total = 0;
    for (let y = 0; y < 1000; y++) for (let x = 0; x < 1200; x++) total += sample(x, y);
    assert.ok(total > 0);
    assert.ok(performance.now() - started < 1000);
  });
});

describe('soften', () => {
  const rough = (): LandStep => ({ ...hills, low: 0, high: 15, scale: 1 });
  const everything: LandStep = { kind: 'soften', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 16, height: 8 } } };

  test('no walkable tile ends more than one step above any neighbour, and nothing rises', () => {
    const before = drawLand(plan(rough()));
    const after = drawLand(plan(rough(), everything));
    for (let y = 0; y < 8; y++) for (let x = 0; x < 16; x++) {
      const here = after.heightAt({ x, y });
      assert.ok(here <= before.heightAt({ x, y }));
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const near = { x: x + dx, y: y + dy };
        if (near.x < 0 || near.y < 0 || near.x >= 16 || near.y >= 8) continue;
        assert.ok(here <= after.heightAt(near) + 1, `${x},${y} is ${here} beside ${after.heightAt(near)}`);
      }
    }
    assert.ok(heightsOf(after).every((height, index) => height <= (heightsOf(before)[index] as number)));
  });

  test('water pulls the land beside it down into a beach and stays as it was', () => {
    const map = drawLand(
      plan(
        { kind: 'rise', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 16, height: 8 } }, height: 6 },
        { kind: 'fill', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 2, height: 8 } }, tile: 'water' },
        { kind: 'rise', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 2, height: 8 } }, height: 0 },
        everything,
      ),
    );
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((x) => map.heightAt({ x, y: 4 })), [0, 0, 1, 2, 3, 4, 5, 6, 6, 6]);
    assert.equal(map.tileAt({ x: 0, y: 4 }), 'water');
  });

  test('a rock wall keeps its height and the shape limits what is lowered', () => {
    const map = drawLand(
      plan(
        { kind: 'fill', shape: { kind: 'rect', rect: { x: 6, y: 0, width: 1, height: 8 } }, tile: 'rock' },
        { kind: 'rise', shape: { kind: 'rect', rect: { x: 6, y: 0, width: 1, height: 8 } }, height: 15 },
        { kind: 'rise', shape: { kind: 'rect', rect: { x: 10, y: 0, width: 6, height: 8 } }, height: 8 },
        { kind: 'soften', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 13, height: 8 } } },
      ),
    );
    assert.equal(map.heightAt({ x: 6, y: 3 }), 15);
    assert.equal(map.heightAt({ x: 5, y: 3 }), 0);
    assert.deepEqual([9, 10, 11, 12, 13].map((x) => map.heightAt({ x, y: 3 })), [0, 1, 2, 3, 8]);
  });
});

describe('land origin', () => {
  const steps: LandStep[] = [
    ground,
    hills,
    { kind: 'line', points: [{ x: 2, y: 1 }, { x: 13, y: 6 }], width: 3, tile: 'asphalt' },
    { kind: 'ward', shape: { kind: 'polygon', points: [{ x: 1, y: 1 }, { x: 12, y: 1 }, { x: 9, y: 7 }] }, ward: 'east' },
    { kind: 'ramp', rect: { x: 10, y: 2, width: 3, height: 4 }, side: 'east', from: 1, to: 3 },
    { kind: 'gate', id: 'door', rect: { x: 7, y: 3, width: 2, height: 1 }, tile: 'door' },
  ];
  const original: LandPlan = { id: 'grow', squareSize: 8, columns: 2, rows: 1, steps };
  const grown: LandPlan = { ...original, origin: { column: -2, row: 0 }, columns: 4 };

  test('growing west by two squares keeps every tile at its world position', () => {
    const before = drawLand(original);
    const after = drawLand(grown);
    assert.deepEqual(landOrigin(grown), { x: -16, y: 0 });
    assert.equal(after.width, 32);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 16; x++) {
      const local = { x: x + 16, y };
      assert.equal(after.tileAt(local), before.tileAt({ x, y }));
      assert.equal(after.heightAt(local), before.heightAt({ x, y }));
      assert.equal(after.wardAt(local), before.wardAt({ x, y }));
    }
    for (let x = 0; x < 16; x++) assert.equal(after.tileAt({ x, y: 3 }), 'void');
    assert.deepEqual(after.gates.door, before.gates.door?.map((tile) => ({ x: tile.x + 16, y: tile.y })));
  });

  test('districts keep their squares and their places relative to each other', () => {
    const districts = [district('west', 0, 0), district('east', 1, 0)];
    const before = placeLandSquares(drawLand(original), districts);
    const after = placeLandSquares(drawLand(grown), districts);
    assert.deepEqual(before.map((placement) => placement.origin), [{ x: 0, y: 0 }, { x: 8, y: 0 }]);
    assert.deepEqual(after.map((placement) => placement.origin), [{ x: 16, y: 0 }, { x: 24, y: 0 }]);
    assert.deepEqual(placeLandSquares(drawLand(grown), [district('far', -2, 0)])[0]?.origin, { x: 0, y: 0 });
    assert.throws(() => placeLandSquares(drawLand(grown), [district('off', -3, 0)]), /names square -3,0, outside the 4x1 land plan from square -2,0\./);
    assert.throws(() => placeLandSquares(drawLand(grown), [district('off', 2, 0)]), /names square 2,0, outside/);
  });

  test('cutSquare and changedSquares speak world squares', () => {
    const before = drawLand(original);
    const after = drawLand(grown);
    assert.deepEqual(cutSquare(after, { column: 1, row: 0 }), cutSquare(before, { column: 1, row: 0 }));
    assert.throws(() => cutSquare(after, { column: -3, row: 0 }), /square -3,0 is outside the 4x1 plan from square -2,0/);
    assert.deepEqual(changedSquares(after, after), []);
    assert.deepEqual(changedSquares(before, after), [-2, -1, 0, 1].map((column) => ({ column, row: 0 })));
    const moved = drawLand({ ...grown, steps: [...steps, { kind: 'rise', shape: { kind: 'rect', rect: { x: -12, y: 2, width: 3, height: 3 } }, height: 4 }] });
    assert.deepEqual(changedSquares(after, moved), [{ column: -2, row: 0 }]);
  });

  test('a plan without an origin parses and prints as before, and an origin prints', () => {
    assert.equal(parseLandPlan(original).origin, undefined);
    assert.ok(!printLandPlan(original).includes('"origin"'));
    const printed = printLandPlan(grown);
    assert.ok(printed.includes('"origin": { "column": -2, "row": 0 }'));
    assert.deepEqual(parseLandPlan(JSON.parse(printed)), parseLandPlan(grown));
    assert.throws(() => parseLandPlan({ ...grown, origin: { column: 0.5, row: 0 } }));
  });
});
