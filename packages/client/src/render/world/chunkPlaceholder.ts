import { type RegionId, type TileKindId, type TileRect } from '@containment/shared';
import { BufferAttribute, BufferGeometry, Color, type Group } from 'three';
import { createVoxelObject } from '../voxel/voxelMaterials.ts';
import { VOXEL_EMPTY } from '../voxel/voxelKinds.ts';
import { buildTileVolume, tileBase, type OwnedLayout } from './levelVoxels.ts';
import { FLOOR_LAYERS, TILE_RESOLUTION, ZONE_VOLUME_HEIGHT, ZONE_VOXEL_SIZE } from './worldScale.ts';

interface Tint {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly rise: number;
}

const R = TILE_RESOLUTION;
const SIDE_SHADE = 0.62;
const TINTS = new Map<string, Tint>();
const NO_TINT: Tint = { red: 0, green: 0, blue: 0, rise: FLOOR_LAYERS };

export function tileTint(kind: TileKindId, region?: RegionId): Tint {
  const key = `${region ?? ''}:${kind}`;
  const cached = TINTS.get(key);
  if (cached) return cached;
  if (kind === 'void') return NO_TINT;
  const sample: OwnedLayout = { width: 3, height: 3, tileAt: ({ x, y }) => (x >= 0 && y >= 0 && x < 3 && y < 3 ? kind : 'void'), heightAt: () => 0, regionAt: () => region };
  const volume = buildTileVolume(sample, { x: 1, y: 1, width: 1, height: 1 });
  const color = new Color();
  let red = 0;
  let green = 0;
  let blue = 0;
  let rise = 0;
  let count = 0;
  for (let vz = R; vz < 2 * R; vz++) {
    for (let vx = R; vx < 2 * R; vx++) {
      for (let vy = ZONE_VOLUME_HEIGHT - 1; vy >= 0; vy--) {
        if (volume.kindAt(vx, vy, vz) === VOXEL_EMPTY) continue;
        color.setHex(volume.colorAt(vx, vy, vz));
        red += color.r;
        green += color.g;
        blue += color.b;
        rise += vy + 1;
        count++;
        break;
      }
    }
  }
  const tint = count === 0 ? NO_TINT : { red: red / count, green: green / count, blue: blue / count, rise: Math.round(rise / count) };
  TINTS.set(key, tint);
  return tint;
}

export function buildChunkPlaceholder(layout: OwnedLayout, region: TileRect): Group | null {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const topOf = (tx: number, ty: number): number | null => {
    const kind = layout.tileAt({ x: tx, y: ty });
    if (kind === 'void') return null;
    return (tileBase(layout, tx, ty) + tileTint(kind, layout.regionAt?.({ x: tx, y: ty })).rise - FLOOR_LAYERS) * ZONE_VOXEL_SIZE;
  };
  const quad = (corners: readonly (readonly [number, number, number])[], normal: readonly [number, number, number], tint: Tint, shade: number): void => {
    const start = positions.length / 3;
    for (const corner of corners) {
      positions.push(...corner);
      normals.push(...normal);
      colors.push(tint.red * shade, tint.green * shade, tint.blue * shade);
    }
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  };
  for (let ty = region.y; ty < region.y + region.height; ty++) {
    for (let tx = region.x; tx < region.x + region.width; tx++) {
      const top = topOf(tx, ty);
      if (top === null) continue;
      const tint = tileTint(layout.tileAt({ x: tx, y: ty }), layout.regionAt?.({ x: tx, y: ty }));
      const west = tx - 0.5;
      const east = tx + 0.5;
      const north = ty - 0.5;
      const south = ty + 0.5;
      quad([[west, top, north], [west, top, south], [east, top, south], [east, top, north]], [0, 1, 0], tint, 1);
      const sides: readonly [number, number, readonly [readonly [number, number], readonly [number, number]], readonly [number, number, number]][] = [
        [tx + 1, ty, [[east, north], [east, south]], [1, 0, 0]],
        [tx - 1, ty, [[west, south], [west, north]], [-1, 0, 0]],
        [tx, ty + 1, [[east, south], [west, south]], [0, 0, 1]],
        [tx, ty - 1, [[west, north], [east, north]], [0, 0, -1]],
      ];
      for (const [nx, ny, [[ax, az], [bx, bz]], normal] of sides) {
        const below = topOf(nx, ny) ?? 0;
        if (below >= top) continue;
        quad([[ax, below, az], [ax, top, az], [bx, top, bz], [bx, below, bz]], normal, tint, SIDE_SHADE);
      }
    }
  }
  if (indices.length === 0) return null;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  const group = createVoxelObject({ solid: geometry, emissive: null, glass: null }, { castShadow: false });
  group.name = 'chunkPlaceholder';
  return group;
}
