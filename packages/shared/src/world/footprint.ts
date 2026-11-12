import type { WorldObjectDefinition } from './entities.ts';
import type { Facing, TilePoint } from './geometry.ts';
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

export interface ObjectFootprint {
  readonly width: number;
  readonly height: number;
}

export function objectFootprintSize(definition: WorldObjectDefinition | undefined, facing?: Facing): { width: number; height: number } {
  const { width, height } = definition?.footprint ?? { width: 1, height: 1 };
  return facing === 'east' || facing === 'west' ? { width: height, height: width } : { width, height };
}

export function objectFootprintTiles(definition: WorldObjectDefinition | undefined, placement: { position: TilePoint; facing?: Facing }): TilePoint[] {
  const { width, height } = objectFootprintSize(definition, placement.facing);
  const tiles: TilePoint[] = [];
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) tiles.push({ x: placement.position.x + dx, y: placement.position.y + dy });
  }
  return tiles;
}

export const WALL_FIXTURE_MODELS: ReadonlySet<string> = new Set(['bulkhead', 'transitLift', 'wallLift', 'valveWheel', 'ventPanel', 'noticeBoard', 'wallShelf', 'warningSign', 'locker', 'storageLocker', 'herbCabinet', 'timetableBoard']);

export const isWallFixture = (definition: WorldObjectDefinition | undefined): boolean => definition !== undefined && WALL_FIXTURE_MODELS.has(definition.model);
