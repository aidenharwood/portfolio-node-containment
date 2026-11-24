import type { TilePoint } from './geometry.ts';
import { TILE_KINDS, type TileKindId } from './tiles.ts';

export const WAY_TILES: ReadonlySet<TileKindId> = new Set<TileKindId>(['asphalt', 'paving', 'concrete', 'gravel', 'plating', 'grate', 'rust', 'terrazzo', 'hazard']);

export function isKerb(kindAt: (point: TilePoint) => TileKindId, point: TilePoint): boolean {
  if (!TILE_KINDS[kindAt(point)].walkable) return false;
  const kinds = new Set<TileKindId>();
  let way = false;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const kind = kindAt({ x: point.x + dx, y: point.y + dy });
      kinds.add(kind);
      if (WAY_TILES.has(kind)) way = true;
    }
  }
  return way && kinds.size > 1;
}

export function evenlyAlong(length: number, pitch: number): number[] {
  if (length <= 0) return [];
  const count = Math.max(1, Math.floor((length - 1) / pitch) + 1);
  if (count === 1) return [Math.floor((length - 1) / 2)];
  const step = (length - 1) / (count - 1);
  return Array.from({ length: count }, (_, index) => Math.round(index * step));
}
