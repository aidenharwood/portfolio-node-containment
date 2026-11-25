import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT, isBuildingWall, isOutdoorFloor, LAND_GROUND_ROOM, TILE_KINDS, type ResolvedLevel, type TileKindId, type TilePoint, type TileRect } from '@containment/shared';
import { interiorMaskOf, ownedLayoutOf } from '../src/render/world/chunkStructure.ts';
import { buildTileVolume, facesOutdoors, tileBase, type OwnedLayout, type Side } from '../src/render/world/levelVoxels.ts';
import { WALL_PALETTE } from '../src/render/world/wallPalette.ts';
import { FLOOR_LAYERS, TILE_RESOLUTION } from '../src/render/world/worldScale.ts';

const R = TILE_RESOLUTION;
const overworld = GAME_CONTENT.levels.get('overworld') as ResolvedLevel;
const owned = ownedLayoutOf(overworld, overworld.scene);

interface Face {
  readonly wall: TilePoint;
  readonly side: Side;
  readonly beside: TilePoint;
}

const STEP: Readonly<Record<Side, TilePoint>> = { north: { x: 0, y: -1 }, south: { x: 0, y: 1 }, west: { x: -1, y: 0 }, east: { x: 1, y: 0 } };
const SIDES = Object.keys(STEP) as Side[];

const within = (rect: TileRect, { x, y }: TilePoint): boolean => x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height;
const grown = (rect: TileRect): TileRect => ({ x: rect.x - 1, y: rect.y - 1, width: rect.width + 2, height: rect.height + 2 });

function ringOf(rect: TileRect): TilePoint[] {
  const ring: TilePoint[] = [];
  const outer = grown(rect);
  for (let y = outer.y; y < outer.y + outer.height; y++) {
    for (let x = outer.x; x < outer.x + outer.width; x++) if (!within(rect, { x, y })) ring.push({ x, y });
  }
  return ring;
}

function buildingsOf(level: ResolvedLevel): TileRect[] {
  const buildings: TileRect[] = [];
  for (const placed of level.districts) {
    const rooms = GAME_CONTENT.districts.get(placed.districtId)?.rooms ?? {};
    for (const [id, room] of Object.entries(rooms)) {
      if (id === LAND_GROUND_ROOM) continue;
      const rect = { x: placed.rect.x + room.x, y: placed.rect.y + room.y, width: room.width, height: room.height };
      if (ringOf(rect).some((point) => isBuildingWall(level.scene.tileAt(point)))) buildings.push(rect);
    }
  }
  return buildings;
}

function facesOf(rect: TileRect): { readonly outer: Face[]; readonly inner: Face[] } {
  const outer: Face[] = [];
  const inner: Face[] = [];
  for (const wall of ringOf(rect)) {
    if (!isBuildingWall(owned.tileAt(wall))) continue;
    for (const side of SIDES) {
      const beside = { x: wall.x + STEP[side].x, y: wall.y + STEP[side].y };
      if (within(rect, beside)) inner.push({ wall, side, beside });
      else if (!within(grown(rect), beside)) outer.push({ wall, side, beside });
    }
  }
  return { outer, inner };
}

const drawn = ({ wall, beside }: Face): boolean => {
  const kind = owned.tileAt(beside);
  if (kind === 'void' || kind === 'door' || TILE_KINDS[kind].structure === 'wall') return false;
  return owned.ownerAt?.(beside) !== undefined || owned.ownerAt?.(wall) === undefined;
};

const buildings = buildingsOf(overworld);

test('every outer face of every overworld building gets its exterior finish whatever pad it stands on', () => {
  assert.ok(buildings.length >= 190, String(buildings.length));
  let checked = 0;
  let padded = 0;
  for (const rect of buildings) {
    const { outer, inner } = facesOf(rect);
    for (const face of outer.filter(drawn)) {
      checked++;
      if (!isOutdoorFloor(owned.tileAt(face.beside))) padded++;
      assert.ok(facesOutdoors(owned, face.wall.x, face.wall.y, face.side), `${face.wall.x},${face.wall.y} ${face.side} beside ${owned.tileAt(face.beside)}`);
    }
    for (const face of inner.filter(drawn)) assert.ok(!facesOutdoors(owned, face.wall.x, face.wall.y, face.side), `${face.wall.x},${face.wall.y} ${face.side} inside`);
  }
  assert.ok(checked > 8000, String(checked));
  assert.ok(padded > 3000, String(padded));
});

const FACE_COLUMN: Readonly<Record<Side, readonly [number, number]>> = { north: [3, 0], south: [3, R - 1], west: [0, 3], east: [R - 1, 3] };

const jitteredFrom = (color: number, base: number, reach: number): boolean => {
  const shift = (channel: number): number => ((color >> channel) & 255) - ((base >> channel) & 255);
  return shift(16) === shift(8) && shift(8) === shift(0) && Math.abs(shift(0)) <= reach;
};

test('walls facing a concrete, soil or plating pad are painted with the exterior plinth, not the interior skirting', () => {
  let painted = 0;
  for (const rect of buildings) {
    const { outer } = facesOf(rect);
    for (const side of SIDES) {
      const run = outer.filter((face) => face.side === side && drawn(face) && !isOutdoorFloor(owned.tileAt(face.beside)));
      const face = run[Math.floor(run.length / 2)];
      if (!face) continue;
      const material = owned.tileAt(face.wall);
      if (!isBuildingWall(material)) continue;
      const volume = buildTileVolume(owned, { x: face.wall.x, y: face.wall.y, width: 1, height: 1 });
      const [lx, lz] = FACE_COLUMN[face.side];
      const color = volume.colorAt(face.wall.x * R + lx, tileBase(owned, face.wall.x, face.wall.y) + FLOOR_LAYERS, face.wall.y * R + lz);
      assert.ok(jitteredFrom(color, WALL_PALETTE[material].plinth, 8), `${material} ${face.wall.x},${face.wall.y} ${side}: #${color.toString(16)}`);
      painted++;
    }
  }
  assert.ok(painted > 150, String(painted));
});

const sampleOf = (rows: readonly string[]): OwnedLayout => {
  const kinds: Readonly<Record<string, TileKindId>> = { '#': 'wall', D: 'door', ',': 'concrete', ';': 'terrazzo', T: 'track', '|': 'fence', '*': 'gravel' };
  return {
    width: rows[0]?.length ?? 0,
    height: rows.length,
    tileAt: ({ x, y }) => kinds[rows[y]?.[x] ?? ' '] ?? 'void',
    heightAt: () => 0,
  };
};

test('the interior mask covers building rooms and tram halls but not pads, yards or doors', () => {
  const layout = sampleOf([
    ',,,,,,,,,,,,,,,,,,,',
    ',######,,,,,,,,,,,,',
    ',#;;;;#,|||||||,,,,',
    ',#;;;;#,|*****|,,,,',
    ',##DD##,|*****|,,,,',
    ',,,,,,,,|||D|||,,,,',
    ',,,,,,,,,,,,,,,,,,,',
    ',,,,##########,,,,,',
    ',,,,#;;;;;;;;#,,,,,',
    'TTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTT',
    ',,,,##########,,,,,',
    ',,,,,,,,,,,,,,,,,,,',
    ',#######,,,,,,,,,,,',
    'TTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTT',
    ',#######,,,,,,,,,,,',
    ',,,,,,,,,,,,,,,,,,,',
  ]);
  const inside = interiorMaskOf(layout);
  assert.equal(inside({ x: 3, y: 3 }), true);
  assert.equal(inside({ x: 0, y: 0 }), false);
  assert.equal(inside({ x: 7, y: 3 }), false);
  assert.equal(inside({ x: 3, y: 4 }), false);
  assert.equal(inside({ x: 11, y: 3 }), false);
  assert.equal(inside({ x: 8, y: 8 }), true);
  assert.equal(inside({ x: 8, y: 10 }), true);
  assert.equal(inside({ x: 4, y: 9 }), false);
  assert.equal(inside({ x: 16, y: 9 }), false);
  assert.equal(inside({ x: 4, y: 14 }), false);
});
