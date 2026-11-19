import assert from 'node:assert/strict';
import './fixtures/world/index.ts';
import { describe, test } from 'node:test';
import { decodeHeight } from '../src/world/blueprint.ts';
import { buildDistrict, parseLayout } from '../src/world/layout.ts';
import { drawLand, type LandMap } from '../src/world/landPlan.ts';
import { pinPlacements, placeLandSquares } from '../src/world/levelPlan.ts';
import { printLayout } from '../src/world/printLayout.ts';
import { MAP_LEGEND } from '../src/world/tiles.ts';

const SYMBOL_OF = Object.fromEntries(Object.entries(MAP_LEGEND).map(([symbol, kind]) => [kind, symbol]));

const map = (): LandMap =>
  drawLand({
    id: 'test-land',
    squareSize: 16,
    columns: 2,
    rows: 1,
    steps: [
      { kind: 'fill', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 32, height: 16 } }, tile: 'grass' },
      { kind: 'ward', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 16, height: 16 } }, ward: 'west-ward' },
      { kind: 'ward', shape: { kind: 'rect', rect: { x: 16, y: 0, width: 16, height: 16 } }, ward: 'east-ward' },
      { kind: 'rise', shape: { kind: 'rect', rect: { x: 18, y: 2, width: 6, height: 6 } }, height: 1 },
    ],
  });

const landLayout = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'land-square',
  name: 'Land Square',
  subtitle: 'A square of the land',
  tier: 1,
  region: 'east-ward',
  ambience: { darkness: 0.3, tint: '#101010', fog: '#202020' },
  size: { width: 16, height: 16 },
  square: { column: 1, row: 0 },
  steps: [],
  tiles: [],
  areas: [{ room: 'ground', name: 'Test Ground' }],
  anchors: {},
  objects: [],
  assemblies: [],
  npcs: [],
  creatures: [],
  lights: [],
  decals: [],
  setPieces: [],
  dressing: { ground: { theme: 'camp', people: 0 } },
  furnish: {},
  ...overrides,
});

describe('land squares', () => {
  test('a land square starts from its window of the land', () => {
    const land = map();
    const district = buildDistrict(landLayout(), land);
    for (let y = 0; y < 16; y++) {
      const expected = Array.from({ length: 16 }, (_, x) => SYMBOL_OF[land.tileAt({ x: 16 + x, y })]).join('');
      assert.equal(district.map[y], expected);
    }
    assert.deepEqual(district.square, { column: 1, row: 0 });
    assert.deepEqual(district.rooms?.ground, { x: 0, y: 0, width: 16, height: 16 });
    assert.equal(decodeHeight((district.heights?.[4] as string)[4] as string), 1);
  });

  test('layout steps draw on top of the land', () => {
    const district = buildDistrict(landLayout({ steps: [{ kind: 'patch', rect: { x: 2, y: 2, width: 3, height: 3 }, tile: 'asphalt' }] }), map());
    assert.equal((district.map[3] as string)[3], '^');
  });

  test('a split square owns only its own ward', () => {
    const land = map();
    const district = buildDistrict(landLayout({ square: { column: 0, row: 0, split: true }, region: 'west-ward' }), land);
    const east = buildDistrict(landLayout({ square: { column: 0, row: 0, split: true }, region: 'east-ward' }), land);
    for (const row of east.map) assert.equal(row, ' '.repeat(16));
    for (const row of district.map) assert.ok(!row.includes(' '));
    const half = drawLand({
      id: 'half',
      squareSize: 16,
      columns: 1,
      rows: 1,
      steps: [
        { kind: 'fill', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 16, height: 16 } }, tile: 'grass' },
        { kind: 'ward', shape: { kind: 'rect', rect: { x: 8, y: 0, width: 8, height: 16 } }, ward: 'east-ward' },
      ],
    });
    const split = buildDistrict(landLayout({ square: { column: 0, row: 0, split: true } }), half);
    for (const row of split.map) {
      assert.equal(row.slice(0, 8), ' '.repeat(8));
      assert.ok(!row.slice(8).includes(' '));
      assert.ok(!/[#B]/.test(row.slice(0, 9)));
    }
  });

  test('a placement on the sibling side fails with its path', () => {
    const half = drawLand({
      id: 'half',
      squareSize: 16,
      columns: 1,
      rows: 1,
      steps: [
        { kind: 'fill', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 16, height: 16 } }, tile: 'grass' },
        { kind: 'ward', shape: { kind: 'rect', rect: { x: 8, y: 0, width: 8, height: 16 } }, ward: 'east-ward' },
      ],
    });
    const source = landLayout({
      square: { column: 0, row: 0, split: true },
      objects: [{ id: 'crate', object: 'planter', at: { room: 'ground', dx: 1, dy: 1 } }],
    });
    assert.throws(
      () => buildDistrict(source, half),
      (error: Error) => /objects\[0\]\.at/.test(error.message) && /not this square's land/.test(error.message),
    );
  });

  test('a land square needs the land', () => {
    assert.throws(() => buildDistrict(landLayout()), /land-square: square: a land square needs the land plan/);
  });

  test('a land square is one square in size', () => {
    assert.throws(() => buildDistrict(landLayout({ size: { width: 16, height: 12 } }), map()), /land-square: size: a land square is 16x16/);
  });

  test('a land square has no exits', () => {
    const exit = { kind: 'exit', id: 'west', room: 'ground', side: 'west', width: 3, gate: false };
    assert.throws(() => buildDistrict(landLayout({ steps: [exit] }), map()), /land-square: steps\[0\]: a land square takes its edges from the land; it has no exits/);
  });

  test("ground is the square's own room", () => {
    const room = { kind: 'room', id: 'ground', rect: { x: 2, y: 2, width: 4, height: 4 }, floor: 'plating', shape: 'rect' };
    assert.throws(() => buildDistrict(landLayout({ steps: [room] }), map()), /land-square: steps\[0\]\.id: room "ground" is the land square's own ground/);
  });

  test('printLayout writes the square after the size', () => {
    assert.match(printLayout(parseLayout(landLayout())), /"size": .*\n  "square": \{ "column": 1, "row": 0 \}/);
  });

  test('land squares are placed by their square', () => {
    const land = map();
    const a = buildDistrict(landLayout({ id: 'a', square: { column: 0, row: 0 }, region: 'west-ward' }), land);
    const b = buildDistrict(landLayout({ id: 'b', square: { column: 1, row: 0, split: true } }), land);
    const c = buildDistrict(landLayout({ id: 'c', square: { column: 1, row: 0, split: true } }), land);
    assert.deepEqual(placeLandSquares(land, [a, b, c]), [
      { districtId: 'a', origin: { x: 0, y: 0 } },
      { districtId: 'b', origin: { x: 16, y: 0 } },
      { districtId: 'c', origin: { x: 16, y: 0 } },
    ]);
  });

  test('placing refuses a district with no square, a square off the plan, and an unsplit pair', () => {
    const land = map();
    const a = buildDistrict(landLayout({ id: 'a', square: { column: 0, row: 0 }, region: 'west-ward' }), land);
    const b = buildDistrict(landLayout({ id: 'b', square: { column: 1, row: 0 } }), land);
    const c = buildDistrict(landLayout({ id: 'c', square: { column: 1, row: 0, split: true } }), land);
    const off = { ...b, id: 'off', square: { column: 2, row: 0 } };
    const bare = { ...a, id: 'bare', square: undefined };
    assert.throws(() => placeLandSquares(land, [bare]), /District "bare" names no square\./);
    assert.throws(() => placeLandSquares(land, [off]), /District "off" names square 2,0, outside the 2x1 land plan\./);
    assert.throws(() => placeLandSquares(land, [b, c]), /Square 1,0 holds "b" and "c"; districts that share a square are split\./);
  });

  test('pinning moves a joined set onto land coordinates', () => {
    const placements = [
      { districtId: 'a', origin: { x: 0, y: 0 } },
      { districtId: 'b', origin: { x: 64, y: 0 } },
    ];
    assert.deepEqual(pinPlacements(placements, 'a', { x: 128, y: 320 }), [
      { districtId: 'a', origin: { x: 128, y: 320 } },
      { districtId: 'b', origin: { x: 192, y: 320 } },
    ]);
    assert.throws(() => pinPlacements(placements, 'z', { x: 0, y: 0 }), /pinPlacements was not given district "z"\./);
  });
});
