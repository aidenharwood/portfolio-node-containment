import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RegionId, TileKindId, TilePoint } from '@containment/shared';
import { LAND_PALETTES } from '../src/render/world/landPalette.ts';
import { buildTileVolume, type OwnedLayout } from '../src/render/world/levelVoxels.ts';
import { TILE_RESOLUTION } from '../src/render/world/worldScale.ts';
import { VOXEL_EMISSIVE, VOXEL_EMPTY } from '../src/render/voxel/voxelKinds.ts';

const R = TILE_RESOLUTION;
const SIZE = 32;
const SPOTS: readonly TilePoint[] = [
  { x: 200, y: 300 },
  { x: 600, y: 120 },
  { x: 880, y: 700 },
];
const REGIONS: readonly (RegionId | undefined)[] = [undefined, ...Object.keys(LAND_PALETTES)];

interface Patch {
  readonly width: number;
  readonly depth: number;
  readonly colors: Int32Array;
  readonly lit: Uint8Array;
}

function paintPatch(tileAt: (point: TilePoint) => TileKindId, regionAt: (point: TilePoint) => RegionId | undefined, at: TilePoint, width: number, depth: number): Patch {
  const layout: OwnedLayout = { width: 4096, height: 4096, tileAt, heightAt: () => 0, regionAt };
  const volume = buildTileVolume(layout, { x: at.x, y: at.y, width, height: depth });
  const colors = new Int32Array(width * depth * R * R);
  const lit = new Uint8Array(colors.length);
  for (let z = 0; z < depth * R; z++) {
    for (let x = 0; x < width * R; x++) {
      for (let vy = volume.height - 1; vy >= 0; vy--) {
        const kind = volume.kindAt(at.x * R + x, vy, at.y * R + z);
        if (kind === VOXEL_EMPTY) continue;
        colors[z * width * R + x] = volume.colorAt(at.x * R + x, vy, at.y * R + z);
        lit[z * width * R + x] = kind === VOXEL_EMISSIVE ? 1 : 0;
        break;
      }
    }
  }
  return { width: width * R, depth: depth * R, colors, lit };
}

const ground = (kind: TileKindId, region: RegionId | undefined, at: TilePoint): Patch =>
  paintPatch(({ x, y }) => (x >= at.x - 2 && y >= at.y - 2 && x < at.x + SIZE + 2 && y < at.y + SIZE + 2 ? kind : 'void'), () => region, at, SIZE, SIZE);

const luma = (color: number): number => 0.2126 * ((color >> 16) & 255) + 0.7152 * ((color >> 8) & 255) + 0.0722 * (color & 255);

const deviation = (values: readonly number[]): number => {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
};

function withinTile(patch: Patch): number {
  let total = 0;
  let tiles = 0;
  for (let tz = 0; tz < patch.depth; tz += R) {
    for (let tx = 0; tx < patch.width; tx += R) {
      const values: number[] = [];
      for (let z = tz; z < tz + R; z++) for (let x = tx; x < tx + R; x++) if (!patch.lit[z * patch.width + x]) values.push(luma(patch.colors[z * patch.width + x] as number));
      total += deviation(values);
      tiles++;
    }
  }
  return total / tiles;
}

function blockSpread(patch: Patch, tiles: number): number {
  const span = tiles * R;
  const means: number[] = [];
  for (let bz = 0; bz + span <= patch.depth; bz += span) {
    for (let bx = 0; bx + span <= patch.width; bx += span) {
      let sum = 0;
      for (let z = bz; z < bz + span; z++) for (let x = bx; x < bx + span; x++) sum += luma(patch.colors[z * patch.width + x] as number);
      means.push(sum / (span * span));
    }
  }
  return deviation(means);
}

const meanColor = (patch: Patch, fromX = 0, toX = patch.width): [number, number, number] => {
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  for (let z = 0; z < patch.depth; z++) {
    for (let x = fromX; x < toX; x++) {
      const color = patch.colors[z * patch.width + x] as number;
      red += (color >> 16) & 255;
      green += (color >> 8) & 255;
      blue += color & 255;
      count++;
    }
  }
  return [red / count, green / count, blue / count];
};

test('grass is calm inside a tile and varies from block to block in every region', () => {
  for (const region of REGIONS) {
    for (const spot of SPOTS) {
      const patch = ground('grass', region, spot);
      const within = withinTile(patch);
      const blocks = blockSpread(patch, 4);
      assert.ok(within <= 3, `${region ?? 'default'} at ${spot.x},${spot.y}: within-tile luminance SD ${within.toFixed(2)}`);
      assert.ok(blocks >= 5, `${region ?? 'default'} at ${spot.x},${spot.y}: 4-tile block SD ${blocks.toFixed(2)}`);
    }
  }
});

test('dirt, gravel and soil keep voxel noise inside a tile low in every region', () => {
  for (const kind of ['dirt', 'gravel', 'soil'] as const) {
    for (const region of REGIONS) {
      const within = SPOTS.reduce((sum, spot) => sum + withinTile(ground(kind, region, spot)), 0) / SPOTS.length;
      assert.ok(within <= 3, `${kind} in ${region ?? 'default'}: within-tile luminance SD ${within.toFixed(2)}`);
    }
  }
});

test('Kestrel lawns and Harrow meadows are painted in their own greens', () => {
  const spot = SPOTS[0] as TilePoint;
  const [kr, kg, kb] = meanColor(ground('grass', 'kestrel-reach', spot));
  const [hr, hg, hb] = meanColor(ground('grass', 'harrow-terraces', spot));
  assert.ok(Math.hypot(hr - kr, hg - kg, hb - kb) >= 15, `#${[kr, kg, kb].map((v) => Math.round(v).toString(16)).join('')} vs #${[hr, hg, hb].map((v) => Math.round(v).toString(16)).join('')}`);
  assert.ok(hr - hg > kr - kg + 10);
});

test('the Glass Steppe draws its soil as cool basalt and glass, not crop rows', () => {
  const spot = SPOTS[1] as TilePoint;
  const steppe = ground('soil', 'glass-steppe', spot);
  const farm = ground('soil', 'harrow-terraces', spot);
  const [red, , blue] = meanColor(steppe);
  assert.ok(blue > red, 'steppe ground leans violet');
  const rowSpread = (patch: Patch): number => {
    const rows = Array.from({ length: R }, (_, row) => {
      let sum = 0;
      let count = 0;
      for (let z = row; z < patch.depth; z += R) for (let x = 0; x < patch.width; x++) {
        sum += luma(patch.colors[z * patch.width + x] as number);
        count++;
      }
      return sum / count;
    });
    return deviation(rows);
  };
  assert.ok(rowSpread(farm) > 0.8, `farm furrows ${rowSpread(farm).toFixed(2)}`);
  assert.ok(rowSpread(steppe) < 0.5, `steppe rows ${rowSpread(steppe).toFixed(2)}`);
  const glints = steppe.lit.reduce((sum, value) => sum + value, 0) / steppe.lit.length;
  assert.ok(glints > 0 && glints < 0.002, String(glints));
});

test('region palettes blend across a border instead of meeting at a seam', () => {
  const at = { x: 300, y: 300 };
  const width = 24;
  const strip = paintPatch(() => 'grass', ({ x }) => (x < at.x + width / 2 ? 'kestrel-reach' : 'harrow-terraces'), at, width, 4);
  const columns = Array.from({ length: width }, (_, tile) => meanColor(strip, tile * R, (tile + 1) * R));
  const warmth = columns.map(([red, green]) => red - green);
  for (let tile = 1; tile < width; tile++) assert.ok(Math.abs((warmth[tile] as number) - (warmth[tile - 1] as number)) < 6, warmth.map((value) => value.toFixed(1)).join(' '));
  assert.ok((warmth[width - 1] as number) - (warmth[0] as number) > 10, warmth.map((value) => value.toFixed(1)).join(' '));
});
