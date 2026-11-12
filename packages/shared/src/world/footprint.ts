import type { TilePoint } from './geometry.ts';
import type { WalkabilityGrid } from './pathfinding.ts';

export type FootprintSize = 1 | 2;

export const sizeOf = (definition: { readonly size?: FootprintSize }): FootprintSize => definition.size ?? 1;

export function footprintTiles(anchor: TilePoint, size: number): TilePoint[] {
  const tiles: TilePoint[] = [];
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) tiles.push({ x: anchor.x + dx, y: anchor.y + dy });
  }
  return tiles;
}

export const isInFootprint = (point: TilePoint, anchor: TilePoint, size: number): boolean =>
  point.x >= anchor.x && point.x < anchor.x + size && point.y >= anchor.y && point.y < anchor.y + size;

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

export const nearestFootprintTile = (anchor: TilePoint, size: number, from: TilePoint): TilePoint => ({
  x: clamp(from.x, anchor.x, anchor.x + size - 1),
  y: clamp(from.y, anchor.y, anchor.y + size - 1),
});

export const footprintCentre = (anchor: TilePoint, size: number): { x: number; y: number } => ({
  x: anchor.x + (size - 1) / 2,
  y: anchor.y + (size - 1) / 2,
});

export const fitsFootprint = (grid: WalkabilityGrid, anchor: TilePoint, size: number): boolean =>
  footprintTiles(anchor, size).every((tile) => grid.isWalkable(tile));
