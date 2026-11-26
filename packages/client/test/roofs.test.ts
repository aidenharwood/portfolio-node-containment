import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT, type ResolvedLevel, type TileKindId, type WallMaterialId } from '@containment/shared';
import { interiorMaskOf, ownedLayoutOf, packStructure, planChunkStructure, unpackStructure } from '../src/render/world/chunkStructure.ts';
import { decalsForLevel } from '../src/render/world/floorDecals.ts';
import type { OwnedLayout } from '../src/render/world/levelVoxels.ts';
import { paintRoof, roofPlanOf, segmentHitsBox, type RoofVolume } from '../src/render/world/roofs.ts';
import { HAZARD } from '../src/render/world/wallPalette.ts';
import { FLOOR_LAYERS, STEP_VOXELS, TILE_RESOLUTION, WALL_LAYERS } from '../src/render/world/worldScale.ts';
import { VOXEL_EMISSIVE, VOXEL_EMPTY } from '../src/render/voxel/voxelKinds.ts';

const R = TILE_RESOLUTION;

const PLAN = [
  '................',
  '.WWWWWWWWWW.fff.',
  '.W________W.f:f.',
  '.W________W.f:f.',
  '.W________W.f:f.',
  '.W________W.fDf.',
  '.WWWWDDWWWW.....',
  '................',
];

const layoutOf = (wall: WallMaterialId, heights: (x: number, y: number) => number = () => 2): OwnedLayout => {
  const kinds: Readonly<Record<string, TileKindId>> = { '.': 'grass', W: wall, _: 'boards', D: 'door', f: 'fence', ':': 'gravel' };
  const base = {
    width: PLAN[0]!.length,
    height: PLAN.length,
    tileAt: ({ x, y }: { x: number; y: number }): TileKindId => kinds[PLAN[y]?.[x] ?? ''] ?? 'void',
    heightAt: ({ x, y }: { x: number; y: number }) => heights(x, y),
  };
  return { ...base, interiorAt: interiorMaskOf(base) };
};

const topOf = (roof: RoofVolume, vx: number, vz: number): number => {
  for (let y = roof.volume.height - 1; y >= 0; y--) if (roof.volume.kindAt(vx, y, vz) !== VOXEL_EMPTY) return roof.floor + y;
  return -1;
};

test('a walled room becomes one roofed building and a fenced yard gets no roof', () => {
  const layout = layoutOf('brick');
  const plan = roofPlanOf(layout);
  const building = plan.buildingAt({ x: 4, y: 3 });
  assert.ok(building);
  assert.deepEqual(building.bounds, { x: 1, y: 1, width: 10, height: 6 });
  assert.equal(building.material, 'brick');
  assert.equal(building.tiles.size, 60);
  assert.equal(building.eaves, 2 * STEP_VOXELS + FLOOR_LAYERS + WALL_LAYERS);
  for (const tile of [{ x: 1, y: 1 }, { x: 10, y: 6 }, { x: 5, y: 6 }]) assert.equal(plan.buildingAt(tile)?.id, building.id);
  for (const tile of [{ x: 13, y: 3 }, { x: 13, y: 5 }, { x: 12, y: 1 }, { x: 0, y: 0 }]) assert.equal(plan.buildingAt(tile), null);
  assert.deepEqual(plan.buildingsIn({ x: 0, y: 0, width: 16, height: 8 }).map((each) => each.id), [building.id]);
});

test('a level without rooms has no roofs', () => {
  const { interiorAt: _, ...open } = layoutOf('wall');
  assert.equal(roofPlanOf(open).buildingAt({ x: 4, y: 3 }), null);
});

for (const material of ['wall', 'brick', 'blockwork', 'cladding'] as const) {
  test(`a ${material} roof closes every column of its building above the wall tops`, () => {
    const layout = layoutOf(material);
    const building = roofPlanOf(layout).buildingAt({ x: 4, y: 3 })!;
    const roof = paintRoof(layout, building);
    for (let vz = building.bounds.y * R; vz < (building.bounds.y + building.bounds.height) * R; vz++) {
      for (let vx = building.bounds.x * R; vx < (building.bounds.x + building.bounds.width) * R; vx++) {
        assert.notEqual(roof.volume.kindAt(vx, building.eaves - roof.floor, vz), VOXEL_EMPTY, `${vx},${vz}`);
      }
    }
  });
}

test('a brick roof is pitched toward a ridge along its long side', () => {
  const layout = layoutOf('brick');
  const building = roofPlanOf(layout).buildingAt({ x: 4, y: 3 })!;
  const roof = paintRoof(layout, building);
  const vx = 3 * R + 3;
  const eave = topOf(roof, vx, R);
  const ridge = topOf(roof, vx, 4 * R);
  assert.equal(eave, building.eaves);
  assert.ok(ridge >= building.eaves + 6, String(ridge));
  assert.equal(topOf(roof, vx, 7 * R - 1), eave);
});

test('a Directorate roof wears a hazard edge and a lit beacon', () => {
  const layout = layoutOf('wall');
  const building = roofPlanOf(layout).buildingAt({ x: 4, y: 3 })!;
  const roof = paintRoof(layout, building);
  const rim = building.eaves + 1 - roof.floor;
  let yellow = 0;
  for (let vx = R; vx < 11 * R; vx++) if (roof.volume.colorAt(vx, rim, R) === HAZARD.yellow) yellow++;
  assert.ok(yellow > 20, String(yellow));
  let lit = 0;
  for (let y = 0; y < roof.volume.height; y++) for (let vz = R; vz < 7 * R; vz++) for (let vx = R; vx < 11 * R; vx++) if (roof.volume.kindAt(vx, y, vz) === VOXEL_EMISSIVE) lit++;
  assert.ok(lit >= 1);
});

test('a roof over walls at two heights skirts the lower walls up to the eaves', () => {
  const layout = layoutOf('blockwork', (x) => (x < 6 ? 2 : 3));
  const building = roofPlanOf(layout).buildingAt({ x: 4, y: 3 })!;
  assert.equal(building.eaves, 3 * STEP_VOXELS + FLOOR_LAYERS + WALL_LAYERS);
  const roof = paintRoof(layout, building);
  const lowTop = 2 * STEP_VOXELS + FLOOR_LAYERS + WALL_LAYERS;
  assert.equal(roof.floor, lowTop);
  for (let y = lowTop; y < building.eaves; y++) assert.notEqual(roof.volume.kindAt(R + 3, y - roof.floor, R), VOXEL_EMPTY);
  assert.equal(roof.volume.kindAt(4 * R, 0, 3 * R), VOXEL_EMPTY);
});

test('a segment meets a box only between its ends', () => {
  const box = [0, 0, 0, 1, 1, 1] as const;
  assert.ok(segmentHitsBox({ x: -1, y: 0.5, z: 0.5 }, { x: 2, y: 0.5, z: 0.5 }, box));
  assert.ok(!segmentHitsBox({ x: -2, y: 0.5, z: 0.5 }, { x: -1, y: 0.5, z: 0.5 }, box));
  assert.ok(!segmentHitsBox({ x: -1, y: 2, z: 0.5 }, { x: 2, y: 2, z: 0.5 }, box));
  assert.ok(segmentHitsBox({ x: 0.5, y: 3, z: 0.5 }, { x: 0.5, y: 0.5, z: 0.5 }, box));
});

test('a chunk of the Kestrel hub carries one roof piece per building it holds, through packing', () => {
  const overworld = GAME_CONTENT.levels.get('overworld') as ResolvedLevel;
  const layout = ownedLayoutOf(overworld, overworld.scene);
  const region = { x: 320, y: 704, width: 32, height: 32 };
  const plan = planChunkStructure(layout, decalsForLevel(overworld), region);
  for (const step of plan.steps) step();
  const structure = plan.result();
  const buildings = roofPlanOf(layout).buildingsIn(region);
  assert.ok(buildings.length >= 3, String(buildings.length));
  assert.ok(structure.roofs);
  assert.equal(structure.roofs.pieces.length, buildings.length);
  assert.ok(structure.roofTops);
  for (const piece of structure.roofs.pieces) {
    const building = buildings.find((each) => each.id === piece.building)!;
    assert.ok(piece.box[4] > (building.eaves - FLOOR_LAYERS) / R, piece.box.join(','));
  }
  const copy = unpackStructure(structuredClone(packStructure(structure).packed));
  assert.deepEqual(copy.roofs?.pieces, structure.roofs.pieces);
  assert.equal(copy.roofs?.parts.count, structure.roofs.parts.count);
});
