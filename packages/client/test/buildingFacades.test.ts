import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT, isBuildingWall, isOutdoorFloor, LAND_GROUND_ROOM, TILE_KINDS, type ResolvedLevel, type TileKindId, type TilePoint, type TileRect } from '@containment/shared';
import { interiorMaskOf, ownedLayoutOf } from '../src/render/world/chunkStructure.ts';
import { buildTileVolume, createTileVolume, facesOutdoors, massingAt, tileBase, type OwnedLayout, type Side } from '../src/render/world/levelVoxels.ts';
import { towerBlockAt, towerShellAt, towerTopAt } from '../src/render/world/towerMassing.ts';
import { WALL_PALETTE } from '../src/render/world/wallPalette.ts';
import { FLOOR_LAYERS, STEP_VOXELS, TILE_RESOLUTION, WALL_LAYERS, ZONE_MESH_ORIGIN, ZONE_VOLUME_HEIGHT, ZONE_VOXEL_SIZE } from '../src/render/world/worldScale.ts';
import { VOXEL_EMISSIVE, VOXEL_EMPTY } from '../src/render/voxel/voxelKinds.ts';

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

test('a Halcyon tower block stands in lit and dark storeys and rises past its chunk volume in setbacks with clutter on its roof', () => {
  const region = { x: 553, y: 72, width: 18, height: 18 };
  const volume = buildTileVolume(owned, region);
  let towerTiles = 0;
  for (let ty = region.y; ty < region.y + region.height; ty++) for (let tx = region.x; tx < region.x + region.width; tx++) if (massingAt(owned, tx, ty) === 'tower') towerTiles++;
  assert.ok(towerTiles >= 200, String(towerTiles));
  for (const rect of buildings.slice(0, 20)) for (const wall of ringOf(rect)) assert.equal(massingAt(owned, wall.x, wall.y), null);
  const tx = 561;
  const ty = 88;
  assert.equal(massingAt(owned, tx, ty), 'tower');
  const base = tileBase(owned, tx, ty);
  const lit = new Set<number>();
  for (let vy = 0; vy < volume.height; vy++) {
    for (let vx = 554 * R; vx < 569 * R; vx++) {
      for (const lz of [R - 1, R - 2]) if (volume.kindAt(vx, vy, ty * R + lz) === VOXEL_EMISSIVE) lit.add(Math.floor(vy / 8));
    }
  }
  assert.ok(lit.size >= 3, [...lit].join(','));
  const block = towerBlockAt(owned, tx, ty);
  assert.ok(block);
  assert.ok(block.tiers.length >= 2);
  for (let index = 1; index < block.tiers.length; index++) {
    const lower = block.tiers[index - 1]!;
    const upper = block.tiers[index]!;
    assert.equal(upper.from, lower.to);
    assert.ok(upper.rect.x > lower.rect.x && upper.rect.x + upper.rect.width < lower.rect.x + lower.rect.width);
  }
  const roof = block.tiers[block.tiers.length - 1]!.to;
  assert.equal(towerTopAt(owned, block.rect.x + Math.floor(block.rect.width / 2), block.rect.y + Math.floor(block.rect.height / 2)), roof);
  assert.ok((roof - block.street) * ZONE_VOXEL_SIZE >= 15, String(roof - block.street));
  assert.ok(volume.height < roof - FLOOR_LAYERS - WALL_LAYERS);
  let glowing = 0;
  let highest = -Infinity;
  for (let y = block.rect.y; y < block.rect.y + block.rect.height; y++) {
    for (let x = block.rect.x; x < block.rect.x + block.rect.width; x++) {
      const shell = towerShellAt(owned, x, y);
      assert.ok(shell, x + ',' + y);
      glowing += shell.emissive?.getAttribute('position').count ?? 0;
      highest = Math.max(highest, shell.solid?.boundingBox?.max.y ?? -Infinity);
    }
  }
  assert.ok(glowing > 100, String(glowing));
  assert.ok(highest > ZONE_MESH_ORIGIN[1] + (roof + 4) * ZONE_VOXEL_SIZE, String(highest));
  assert.ok(base > 0);
});

test('tower shells keep every Halcyon chunk volume within the top step', () => {
  for (let cy = 2; cy < 9; cy++) {
    for (let cx = 2; cx < 21; cx++) {
      const region = { x: cx * 32, y: cy * 32, width: 32, height: 32 };
      assert.ok(createTileVolume(region, owned).height <= ZONE_VOLUME_HEIGHT + 15 * STEP_VOXELS, cx + ',' + cy);
    }
  }
});

test('the Meridian hull is drawn as a beached ship with portholes and a deck rail', () => {
  const region = { x: 940, y: 222, width: 24, height: 10 };
  const volume = buildTileVolume(owned, region);
  const ty = 229;
  assert.equal(massingAt(owned, 950, ty), 'hull');
  assert.equal(massingAt(owned, 950, 233), null);
  const top = tileBase(owned, 950, ty) + FLOOR_LAYERS + WALL_LAYERS - 1;
  let ports = 0;
  let railed = 0;
  for (let vx = 941 * R; vx < 963 * R; vx++) {
    for (let vy = top - 9; vy <= top - 4; vy++) for (const lz of [R - 1, R - 2]) if (volume.kindAt(vx, vy, ty * R + lz) === VOXEL_EMISSIVE || volume.colorAt(vx, vy, ty * R + lz) === 0x10171e) ports++;
    if (volume.kindAt(vx, top + 3, ty * R + R - 1) !== VOXEL_EMPTY) railed++;
  }
  assert.ok(ports > 20, String(ports));
  assert.equal(railed, 22 * R);
});
