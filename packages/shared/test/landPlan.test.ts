import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { cutSquare, drawLand, parseLandPlan, type LandStep } from '../src/index.ts';

const land = (...steps: LandStep[]) =>
  drawLand({ id: 'test', squareSize: 8, columns: 2, rows: 1, steps: [{ kind: 'fill', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 16, height: 8 } }, tile: 'grass' }, ...steps] });

const cliffLand = () => land({ kind: 'rise', shape: { kind: 'rect', rect: { x: 8, y: 0, width: 8, height: 8 } }, height: 2 });

describe('land plan', () => {
  test('a polygon covers the tiles inside its corners', () => {
    const map = land({ kind: 'fill', shape: { kind: 'polygon', points: [{ x: 1, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 4 }, { x: 1, y: 4 }] }, tile: 'water' });
    assert.equal(map.width, 16);
    assert.equal(map.height, 8);
    assert.equal(map.tileAt({ x: 1, y: 1 }), 'water');
    assert.equal(map.tileAt({ x: 4, y: 3 }), 'water');
    assert.equal(map.tileAt({ x: 5, y: 1 }), 'grass');
    assert.equal(map.tileAt({ x: 0, y: 1 }), 'grass');
    assert.equal(map.tileAt({ x: 1, y: 4 }), 'grass');
  });

  test('a line paints the tiles its centre line passes within half its width', () => {
    const thin = land({ kind: 'line', points: [{ x: 2, y: 1 }, { x: 2, y: 6 }], width: 1, tile: 'asphalt' });
    for (let y = 1; y <= 6; y++) assert.equal(thin.tileAt({ x: 2, y }), 'asphalt');
    for (const point of [{ x: 1, y: 3 }, { x: 3, y: 3 }, { x: 2, y: 0 }]) assert.equal(thin.tileAt(point), 'grass');
    const wide = land({ kind: 'line', points: [{ x: 2, y: 1 }, { x: 2, y: 6 }], width: 3, tile: 'asphalt' });
    assert.equal(wide.tileAt({ x: 1, y: 3 }), 'asphalt');
    assert.equal(wide.tileAt({ x: 3, y: 3 }), 'asphalt');
  });

  test('later steps win', () => {
    const map = land(
      { kind: 'fill', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 16, height: 8 } }, tile: 'water' },
      { kind: 'fill', shape: { kind: 'rect', rect: { x: 2, y: 2, width: 3, height: 3 } }, tile: 'asphalt' },
    );
    assert.equal(map.tileAt({ x: 3, y: 3 }), 'asphalt');
    assert.equal(map.tileAt({ x: 6, y: 3 }), 'water');
  });

  test('shapes past the edge of the plan are clipped', () => {
    const map = land({ kind: 'fill', shape: { kind: 'rect', rect: { x: -4, y: -4, width: 40, height: 40 } }, tile: 'water' });
    for (let y = 0; y < 8; y++) for (let x = 0; x < 16; x++) assert.equal(map.tileAt({ x, y }), 'water');
    assert.equal(map.tileAt({ x: 16, y: 0 }), 'void');
    assert.equal(map.heightAt({ x: -1, y: 0 }), 0);
  });

  test('rises and ramps set heights', () => {
    const map = land(
      { kind: 'rise', shape: { kind: 'round', rect: { x: 2, y: 1, width: 4, height: 4 } }, height: 1 },
      { kind: 'ramp', rect: { x: 8, y: 0, width: 8, height: 8 }, side: 'east', from: 0, to: 3 },
    );
    assert.equal(map.heightAt({ x: 3, y: 2 }), 1);
    assert.equal(map.heightAt({ x: 0, y: 0 }), 0);
    assert.deepEqual([8, 10, 12, 14].map((x) => map.heightAt({ x, y: 4 })), [0, 1, 2, 3]);
  });

  test('ward shapes paint wards', () => {
    const map = land(
      { kind: 'ward', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 8, height: 8 } }, ward: 'a' },
      { kind: 'ward', shape: { kind: 'rect', rect: { x: 8, y: 0, width: 8, height: 8 } }, ward: 'b' },
    );
    assert.equal(map.wardAt({ x: 3, y: 3 }), 'a');
    assert.equal(map.wardAt({ x: 12, y: 3 }), 'b');
    assert.equal(map.wardAt({ x: -1, y: 0 }), undefined);
  });

  test('gates are painted and named', () => {
    const gate = (id: string, x: number): LandStep => ({ kind: 'gate', id, rect: { x, y: 3, width: 2, height: 1 }, tile: 'door' });
    const map = land(gate('g', 7));
    assert.deepEqual(map.gates.g, [{ x: 7, y: 3 }, { x: 8, y: 3 }]);
    assert.equal(map.tileAt({ x: 8, y: 3 }), 'door');
    assert.throws(() => land(gate('g', 1), gate('g', 4)), /gate "g" is named twice/);
    assert.throws(() => land(gate('h', 15)), /outside/);
  });

  test('cliffs are worked out across the whole plan', () => {
    const map = cliffLand();
    for (let y = 0; y < 8; y++) assert.equal(map.tileAt({ x: 8, y }), 'cliff');
    assert.equal(map.tileAt({ x: 7, y: 3 }), 'grass');
  });

  test('a cut square is its window of the land', () => {
    const cut = cutSquare(cliffLand(), { column: 1, row: 0 });
    assert.equal(cut.tiles[0], 'cliff');
    assert.equal(cut.tiles[1], 'grass');
    assert.equal(cut.heights[1], 2);
    assert.deepEqual(cut.rooms, { ground: { x: 0, y: 0, width: 8, height: 8 } });
  });

  test('a split cut keeps only its own ward', () => {
    const map = land(
      { kind: 'ward', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 12, height: 8 } }, ward: 'a' },
      { kind: 'ward', shape: { kind: 'rect', rect: { x: 12, y: 0, width: 4, height: 8 } }, ward: 'b' },
    );
    const cut = cutSquare(map, { column: 1, row: 0, split: true }, 'b');
    for (let x = 0; x < 4; x++) assert.equal(cut.tiles[x], 'void');
    for (let x = 4; x < 8; x++) assert.equal(cut.tiles[x], 'grass');
    assert.throws(() => cutSquare(map, { column: 2, row: 0 }), /square 2,0 is outside the 2x1 plan/);
  });

  test('parseLandPlan names the bad path', () => {
    const base = { id: 'test', squareSize: 8, columns: 2, rows: 1 };
    assert.throws(() => parseLandPlan({ ...base, steps: [{ kind: 'line', points: [{ x: 1, y: 1 }], width: 1, tile: 'grass' }] }), /steps\[0\]\.points/);
    assert.throws(() => parseLandPlan({ ...base, steps: [{ kind: 'fill', shape: { kind: 'polygon', points: [{ x: 1, y: 1 }, { x: 2, y: 2 }] }, tile: 'grass' }] }), /steps\[0\]\.shape/);
  });
});
