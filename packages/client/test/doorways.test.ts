import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TileKindId, TilePoint } from '@containment/shared';
import { doorSpot, doorwayAt, DOOR_OPENING, frameVoxel, pickDoorwayStyle, thresholdVoxel, type Doorway, type TileReader } from '../src/render/world/doorways.ts';
import { buildTileVolume, type OwnedLayout } from '../src/render/world/levelVoxels.ts';
import { WALL_PALETTE } from '../src/render/world/wallPalette.ts';
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

const close = (a: number, b: number): boolean => [16, 8, 0].every((shift) => Math.abs(((a >> shift) & 255) - ((b >> shift) & 255)) <= 28);

const sameTurned = (wall: TileKindId, along: OwnedLayout, across: OwnedLayout, tile: TilePoint, keep: (lx: number, vy: number, lz: number) => boolean): void => {
  const a = buildTileVolume(along, { x: tile.x, y: tile.y, width: 1, height: 1 });
  const b = buildTileVolume(across, { x: tile.y, y: tile.x, width: 1, height: 1 });
  for (let vy = 0; vy < FLOOR_LAYERS + WALL_LAYERS; vy++) {
    for (let lz = 0; lz < R; lz++) {
      for (let lx = 0; lx < R; lx++) {
        if (!keep(lx, vy, lz)) continue;
        const ax = tile.x * R + lx;
        const az = tile.y * R + lz;
        const bx = tile.y * R + lz;
        const bz = tile.x * R + lx;
        const where = `${wall} tile ${tile.x},${tile.y} at ${lx},${vy},${lz}`;
        assert.equal(a.kindAt(ax, vy, az), b.kindAt(bx, vy, bz), `kind of ${where}`);
        assert.ok(close(a.colorAt(ax, vy, az), b.colorAt(bx, vy, bz)), `colour of ${where}`);
      }
    }
  }
};

for (const wall of ['brick', 'blockwork', 'cladding', 'wall', 'rock', 'fence', 'barrier'] as const) {
  test(`a ${wall} doorway turned a quarter is drawn turned with it, threshold, header and jambs`, () => {
    const open = wall === 'fence' || wall === 'barrier';
    const rows = open ? doorIn(wall, 'asphalt', 'asphalt') : doorIn(wall);
    const along = layoutOf(rows);
    const across = layoutOf(transpose(rows));
    for (const x of [1, 2]) sameTurned(wall, along, across, { x, y: 1 }, () => true);
    if (wall === 'fence') return;
    for (const [x, face] of [[0, R - 1], [3, 0]] as const) {
      const [from, to] = wall === 'barrier' ? [R / 2 - 2, R / 2 + 1] : [1, R - 2];
      sameTurned(wall, along, across, { x, y: 1 }, (lx, vy, lz) => lx === face && lz >= from && lz <= to && vy >= FLOOR_LAYERS && vy < FLOOR_LAYERS + DOOR_OPENING);
    }
  });
}

test('a doorway of any width is one run, with no limit on how far it reaches', () => {
  const width = 40;
  const rows: TileKindId[][] = [
    Array.from({ length: width + 2 }, () => 'paving' as TileKindId),
    ['wall', ...Array.from({ length: width }, () => 'door' as TileKindId), 'wall'],
    Array.from({ length: width + 2 }, () => 'plating' as TileKindId),
  ];
  const last = doorwayAt(readerOf(rows), width, 1);
  assert.equal(last.width, width);
  assert.equal(last.along, width - 1);
  assert.equal(last.style, 'bulkhead');
});

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

const revealFace = (layout: OwnedLayout, jamb: TilePoint, face: number): { colors: Set<number>; lit: boolean } => {
  const volume = buildTileVolume(layout, { x: jamb.x, y: jamb.y, width: 1, height: 1 });
  const colors = new Set<number>();
  let lit = false;
  for (let h = 2; h < DOOR_OPENING; h++) {
    for (let lz = 1; lz < R - 1; lz++) {
      const at = [jamb.x * R + face, FLOOR_LAYERS + h, jamb.y * R + lz] as const;
      colors.add(volume.colorAt(...at));
      if (volume.kindAt(...at) === VOXEL_EMISSIVE) lit = true;
    }
  }
  return { colors, lit };
};

test('both walls beside a doorway show a reveal of their own material where the door meets them', () => {
  const marks: Readonly<Record<'brick' | 'blockwork' | 'cladding' | 'wall', (face: { colors: Set<number>; lit: boolean }) => boolean>> = {
    brick: (face) => face.colors.has(WALL_PALETTE.brick.joint),
    blockwork: (face) => face.colors.has(WALL_PALETTE.blockwork.joint),
    cladding: (face) => face.colors.has(0x3d5464),
    wall: (face) => face.lit,
  };
  for (const [wall, marked] of Object.entries(marks) as ['brick' | 'blockwork' | 'cladding' | 'wall', (face: { colors: Set<number>; lit: boolean }) => boolean][]) {
    const rows = doorIn(wall);
    const open = rows.map((row) => row.map((kind) => (kind === 'door' ? 'concrete' : kind)));
    for (const [x, face] of [[0, R - 1], [3, 0]] as const) {
      const reveal = revealFace(layoutOf(rows), { x, y: 1 }, face);
      const plain = revealFace(layoutOf(open), { x, y: 1 }, face);
      assert.ok(marked(reveal), `${wall} jamb at ${x}`);
      assert.notDeepEqual([...reveal.colors].sort(), [...plain.colors].sort(), `${wall} jamb at ${x} differs from a plain wall end`);
    }
  }
});

for (const edge of ['rock', 'cliff', 'trees', 'fence', 'barrier'] as const) {
  test(`a doorway through ${edge} is framed on the ${edge} beside it`, () => {
    const rows = doorIn(edge, 'asphalt', 'asphalt');
    const open = rows.map((row) => row.map((kind) => (kind === 'door' ? 'asphalt' : kind)));
    for (const [x, face] of [[0, R - 1], [3, 0]] as const) {
      const framed = buildTileVolume(layoutOf(rows), { x, y: 1, width: 1, height: 1 });
      const plain = buildTileVolume(layoutOf(open), { x, y: 1, width: 1, height: 1 });
      let lit = false;
      let differs = false;
      for (let h = 0; h < WALL_LAYERS; h++) {
        for (let lz = 0; lz < R; lz++) {
          const at = [x * R + face, FLOOR_LAYERS + h, R + lz] as const;
          if (framed.kindAt(...at) === VOXEL_EMISSIVE) lit = true;
          if (framed.colorAt(...at) !== plain.colorAt(...at) || framed.kindAt(...at) !== plain.kindAt(...at)) differs = true;
        }
      }
      assert.ok(lit && differs, `${edge} beside the doorway at ${x}`);
    }
  });
}

test('nothing of the frame stands inside a doorway below its header', () => {
  for (const wall of ['brick', 'blockwork', 'cladding', 'wall', 'rock', 'fence', 'barrier'] as const) {
    const door = doorwayAt(readerOf(doorIn(wall)), 1, 1);
    for (let along = 0; along < door.width * R; along++) {
      for (let across = 0; across < R; across++) {
        for (let h = 0; h < DOOR_OPENING - 3; h++) assert.equal(frameVoxel(door, { along, across }, h, 0.5), null, `${wall} at ${along},${across},${h}`);
      }
    }
  }
});
