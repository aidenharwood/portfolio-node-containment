import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TileKindId, TilePoint } from '@containment/shared';
import { doorSpot, doorwayAt, DOOR_OPENING, frameVoxel, pickDoorwayStyle, thresholdVoxel, type Doorway, type TileReader } from '../src/render/world/doorways.ts';
import { buildTileVolume, type OwnedLayout } from '../src/render/world/levelVoxels.ts';
import { FLOOR_LAYERS, TILE_RESOLUTION, WALL_LAYERS } from '../src/render/world/worldScale.ts';
import { VOXEL_EMISSIVE } from '../src/render/voxel/voxelKinds.ts';

const R = TILE_RESOLUTION;
const FLOOR = 1;

const readerOf =
  (rows: readonly (readonly TileKindId[])[]): TileReader =>
  (x, y) =>
    rows[y]?.[x] ?? 'void';

const layoutOf = (rows: readonly (readonly TileKindId[])[]): OwnedLayout => ({
  width: rows[0]?.length ?? 0,
  height: rows.length,
  tileAt: ({ x, y }) => rows[y]?.[x] ?? 'void',
  heightAt: () => 0,
});

const transpose = (rows: readonly (readonly TileKindId[])[]): TileKindId[][] => rows[0]!.map((_, x) => rows.map((row) => row[x]!));

const doorIn = (wall: TileKindId, outside: TileKindId = 'paving', inside: TileKindId = 'boards'): TileKindId[][] => [
  [outside, outside, outside, outside],
  [wall, 'door', 'door', wall],
  [inside, inside, inside, inside],
];

test('a doorway takes its style from the wall it is cut through', () => {
  const expected: Partial<Record<TileKindId, Doorway['style']>> = { brick: 'brick', blockwork: 'blockwork', cladding: 'cladding', wall: 'bulkhead', glass: 'bulkhead', fence: 'fence', barrier: 'barrier', rock: 'seam' };
  for (const [wall, style] of Object.entries(expected) as [TileKindId, Doorway['style']][]) {
    assert.equal(doorwayAt(readerOf(doorIn(wall)), 1, 1).style, style, wall);
  }
});

test('a doorway between two materials takes the building wall over the edge, and void falls back to a bulkhead', () => {
  assert.equal(pickDoorwayStyle(['fence', 'brick']), 'brick');
  assert.equal(pickDoorwayStyle(['brick', 'wall']), 'bulkhead');
  assert.equal(pickDoorwayStyle(['rock', 'barrier']), 'barrier');
  assert.equal(pickDoorwayStyle(['void', 'void']), 'bulkhead');
});

test('a doorway knows its run, its depth and what lies on either side', () => {
  const rows = doorIn('brick');
  const west = doorwayAt(readerOf(rows), 1, 1);
  const east = doorwayAt(readerOf(rows), 2, 1);
  assert.deepEqual(
    { alongX: west.alongX, along: west.along, width: west.width, across: west.across, depth: west.depth, before: west.before, after: west.after },
    { alongX: true, along: 0, width: 2, across: 0, depth: 1, before: 'paving', after: 'boards' },
  );
  assert.equal(east.along, 1);
  const turned = doorwayAt(readerOf(transpose(rows)), 1, 2);
  assert.equal(turned.alongX, false);
  assert.equal(turned.along, 1);
  assert.equal(turned.before, 'paving');
});

test('a doorway through a thick wall counts its depth across both rows', () => {
  const rows: TileKindId[][] = [
    ['paving', 'paving', 'paving', 'paving'],
    ['rock', 'door', 'door', 'rock'],
    ['rock', 'door', 'door', 'rock'],
    ['paving', 'paving', 'paving', 'paving'],
  ];
  const back = doorwayAt(readerOf(rows), 2, 2);
  assert.equal(back.style, 'seam');
  assert.equal(back.depth, 2);
  assert.equal(back.across, 1);
  assert.equal(back.along, 1);
});

const colorAt = (layout: OwnedLayout, tile: TilePoint, lx: number, vy: number, lz: number): { color: number; kind: number } => {
  const volume = buildTileVolume(layout, { x: tile.x, y: tile.y, width: 1, height: 1 });
  return { color: volume.colorAt(tile.x * R + lx, vy, tile.y * R + lz), kind: volume.kindAt(tile.x * R + lx, vy, tile.y * R + lz) };
};

const close = (a: number, b: number): boolean => [16, 8, 0].every((shift) => Math.abs(((a >> shift) & 255) - ((b >> shift) & 255)) <= 20);

for (const wall of ['brick', 'blockwork', 'cladding', 'wall', 'rock', 'fence'] as const) {
  test(`a ${wall} doorway turned a quarter is drawn turned with it`, () => {
    const rows = wall === 'fence' ? doorIn(wall, 'asphalt', 'asphalt') : doorIn(wall);
    const along = layoutOf(rows);
    const across = layoutOf(transpose(rows));
    for (const vy of [FLOOR, FLOOR_LAYERS + DOOR_OPENING, FLOOR_LAYERS + WALL_LAYERS - 1]) {
      for (let lz = 0; lz < R; lz++) {
        for (let lx = 0; lx < R; lx++) {
          const a = colorAt(along, { x: 1, y: 1 }, lx, vy, lz);
          const b = colorAt(across, { x: 1, y: 1 }, lz, vy, lx);
          assert.equal(a.kind, b.kind, `${wall} kind at ${lx},${vy},${lz}`);
          assert.ok(close(a.color, b.color), `${wall} colour at ${lx},${vy},${lz}`);
        }
      }
    }
  });
}

test('a directorate threshold is hazard-striped at both faces with a door track down the middle', () => {
  const door = doorwayAt(readerOf(doorIn('wall')), 1, 1);
  const colors = (across: number): Set<number> => new Set(Array.from({ length: 2 * R }, (_, along) => thresholdVoxel(door, { along, across }, 0.5)!.color));
  assert.deepEqual(colors(0), new Set([0xc99a1c, 0x17170f]));
  assert.deepEqual(colors(R - 1), colors(0));
  assert.equal(colors(R / 2 - 1).size, 1);
});

test('hazard chevrons mirror about the middle of a doorway, so its two tiles meet without a seam', () => {
  const door = doorwayAt(readerOf(doorIn('wall')), 1, 1);
  const width = door.width * R;
  for (const across of [0, 1, R - 2, R - 1]) {
    for (let along = 0; along < width; along++) {
      assert.equal(thresholdVoxel(door, { along, across }, 0.5)!.color, thresholdVoxel(door, { along: width - 1 - along, across }, 0.5)!.color);
    }
  }
});

test('building doorways carry a header over the opening and open-air gates do not', () => {
  for (const wall of ['brick', 'blockwork', 'cladding', 'wall'] as const) {
    const door = doorwayAt(readerOf(doorIn(wall)), 1, 1);
    const spot = doorSpot(door, R / 2, 0);
    assert.notEqual(frameVoxel(door, spot, WALL_LAYERS - 1, 0.5), null, wall);
    assert.equal(frameVoxel(door, spot, 4, 0.5), null, wall);
  }
  for (const wall of ['fence', 'barrier', 'rock'] as const) {
    const door = doorwayAt(readerOf(doorIn(wall)), 1, 1);
    for (let h = 0; h < WALL_LAYERS; h++) assert.equal(frameVoxel(door, doorSpot(door, R / 2, 0), h, 0.5), null, wall);
  }
});

test('a directorate bulkhead lights the underside of its header on both faces', () => {
  const door = doorwayAt(readerOf(doorIn('wall')), 1, 1);
  for (const across of [0, R - 1]) assert.equal(frameVoxel(door, { along: R, across }, DOOR_OPENING, 0.5)?.kind, VOXEL_EMISSIVE);
});

test('a wall beside a doorway shows a reveal of its own material where the door meets it', () => {
  const rows = doorIn('cladding');
  const open = rows.map((row) => row.map((kind) => (kind === 'door' ? 'concrete' : kind)));
  const jamb = { x: 0, y: 1 };
  const vy = FLOOR_LAYERS + 6;
  const reveal = colorAt(layoutOf(rows), jamb, R - 1, vy, R / 2);
  const plain = colorAt(layoutOf(open), jamb, R - 1, vy, R / 2);
  assert.notEqual(reveal.color, plain.color);
});
