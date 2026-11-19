import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { changedSquares, cutSquare, drawLand, parseLandPlan, type LandStep } from '../src/index.ts';
import { FIXTURE_LAND, FIXTURE_LAND_PLAN } from './fixtures/world/wilds.ts';

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
  test('a line of width w paints w tiles across, and only odd widths are drawn', () => {
    for (const width of [1, 3, 5]) {
      const map = land({ kind: 'line', points: [{ x: 4, y: 4 }, { x: 10, y: 4 }], width, tile: 'asphalt' });
      const across = [0, 1, 2, 3, 4, 5, 6, 7].filter((y) => map.tileAt({ x: 7, y }) === 'asphalt');
      assert.equal(across.length, width);
    }
    for (const width of [2, 4]) {
      assert.throws(() => land({ kind: 'line', points: [{ x: 4, y: 4 }, { x: 10, y: 4 }], width, tile: 'asphalt' }), /steps\[1\]\.width: a line is an odd number of tiles wide/);
    }
  });

  test('line points are tile centres and polygon points are tile corners', () => {
    const line = land({ kind: 'line', points: [{ x: 2, y: 3 }, { x: 6, y: 3 }], width: 1, tile: 'asphalt' });
    assert.deepEqual([1, 2, 6, 7].map((x) => line.tileAt({ x, y: 3 })), ['grass', 'asphalt', 'asphalt', 'grass']);
    const polygon = land({ kind: 'fill', shape: { kind: 'polygon', points: [{ x: 2, y: 3 }, { x: 6, y: 3 }, { x: 6, y: 4 }, { x: 2, y: 4 }] }, tile: 'asphalt' });
    assert.deepEqual([1, 2, 5, 6].map((x) => polygon.tileAt({ x, y: 3 })), ['grass', 'asphalt', 'asphalt', 'grass']);
  });

  test('a diagonal line stays joined edge to edge', () => {
    for (const end of [{ x: 7, y: 7 }, { x: 15, y: 4 }]) {
      const map = land({ kind: 'line', points: [{ x: 0, y: 0 }, end], width: 1, tile: 'asphalt' });
      const painted = new Set<string>();
      for (let y = 0; y < 8; y++) for (let x = 0; x < 16; x++) if (map.tileAt({ x, y }) === 'asphalt') painted.add(`${x},${y}`);
      const reached = new Set(['0,0']);
      const queue = [{ x: 0, y: 0 }];
      for (const here of queue) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const key = `${here.x + dx},${here.y + dy}`;
          if (!painted.has(key) || reached.has(key)) continue;
          reached.add(key);
          queue.push({ x: here.x + dx, y: here.y + dy });
        }
      }
      assert.ok(reached.has(`${end.x},${end.y}`), `${end.x},${end.y}`);
      assert.equal(reached.size, painted.size);
    }
  });

  test('a polygon fills by the even-odd rule at tile centres', () => {
    const points = [{ x: 1, y: 1 }, { x: 14, y: 0 }, { x: 9, y: 4 }, { x: 15, y: 7 }, { x: 4, y: 6 }, { x: 7, y: 3 }, { x: 0, y: 7 }, { x: 3, y: 3 }];
    const map = land({ kind: 'fill', shape: { kind: 'polygon', points }, tile: 'water' });
    const inside = (x: number, y: number): boolean => {
      let crossed = false;
      for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
        const a = points[index] as { x: number; y: number };
        const b = points[previous] as { x: number; y: number };
        if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) crossed = !crossed;
      }
      return crossed;
    };
    for (let y = 0; y < 8; y++) for (let x = 0; x < 16; x++) assert.equal(map.tileAt({ x, y }), inside(x + 0.5, y + 0.5) ? 'water' : 'grass', `${x},${y}`);
  });

  test('gate ids are only names', () => {
    const map = land(
      { kind: 'gate', id: 'constructor', rect: { x: 2, y: 2, width: 1, height: 1 }, tile: 'door' },
      { kind: 'gate', id: '__proto__', rect: { x: 4, y: 2, width: 1, height: 1 }, tile: 'door' },
    );
    assert.deepEqual(Object.keys(map.gates), ['constructor', '__proto__']);
    assert.deepEqual(map.gates.__proto__, [{ x: 4, y: 2 }]);
  });

  test('a plan holds at most 255 wards', () => {
    const wards = (count: number): LandStep[] => Array.from({ length: count }, (_, index) => ({ kind: 'ward', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 1, height: 1 } }, ward: `ward-${index}` }));
    assert.equal(land(...wards(255)).wardAt({ x: 0, y: 0 }), 'ward-254');
    assert.throws(() => land(...wards(256)), /steps\[256\]: ward "ward-255" is one more than the 255 wards/);
  });

  test('drawLand checks its plan', () => {
    assert.throws(() => land({ kind: 'fill', shape: { kind: 'rect', rect: { x: 0.5, y: 0, width: 2, height: 2 } }, tile: 'water' }), /steps\[1\]\.shape/);
  });
});

describe('changed squares', () => {
  const redrawn = (...steps: LandStep[]) => drawLand({ ...FIXTURE_LAND_PLAN, steps: [...FIXTURE_LAND_PLAN.steps, ...steps] });

  test('the same land changes no square', () => {
    assert.deepEqual(changedSquares(FIXTURE_LAND, FIXTURE_LAND), []);
    assert.deepEqual(changedSquares(FIXTURE_LAND, drawLand(FIXTURE_LAND_PLAN)), []);
  });

  test('a rise inside one square changes only that square', () => {
    assert.deepEqual(changedSquares(FIXTURE_LAND, redrawn({ kind: 'rise', shape: { kind: 'rect', rect: { x: 70, y: 6, width: 8, height: 6 } }, height: 2 })), [{ column: 2, row: 0 }]);
  });

  test('a line across two squares changes both, west to east', () => {
    const line = redrawn({ kind: 'line', points: [{ x: 10, y: 5 }, { x: 40, y: 5 }], width: 1, tile: 'water' });
    assert.deepEqual(changedSquares(FIXTURE_LAND, line), [{ column: 0, row: 0 }, { column: 1, row: 0 }]);
  });

  test('a moved ward changes the squares whose wards changed', () => {
    const steps = FIXTURE_LAND_PLAN.steps.map((step): LandStep => {
      if (step.kind !== 'ward') return step;
      return step.ward === 'fx-home'
        ? { ...step, shape: { kind: 'rect', rect: { x: 0, y: 0, width: 40, height: 32 } } }
        : { ...step, shape: { kind: 'rect', rect: { x: 40, y: 0, width: 88, height: 32 } } };
    });
    const moved = drawLand({ ...FIXTURE_LAND_PLAN, steps });
    assert.equal(moved.tileAt({ x: 44, y: 10 }), FIXTURE_LAND.tileAt({ x: 44, y: 10 }));
    assert.deepEqual(changedSquares(FIXTURE_LAND, moved), [{ column: 1, row: 0 }]);
  });

  test('a plan of another shape changes every square of the new plan', () => {
    const wider = drawLand({ ...FIXTURE_LAND_PLAN, columns: 5 });
    assert.deepEqual(changedSquares(FIXTURE_LAND, wider), [0, 1, 2, 3, 4].map((column) => ({ column, row: 0 })));
  });
});
