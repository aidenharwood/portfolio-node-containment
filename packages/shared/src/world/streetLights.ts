import { CARDINAL_OFFSETS, type TilePoint } from './geometry.ts';
import { TILE_KINDS, type TileKindId } from './tiles.ts';

export const WAY_TILES: ReadonlySet<TileKindId> = new Set<TileKindId>(['asphalt', 'paving', 'concrete', 'gravel', 'plating', 'grate']);

export const isWay = (kind: TileKindId, ground?: TileKindId): boolean => WAY_TILES.has(kind) && kind !== ground;

export function isKerb(kindAt: (point: TilePoint) => TileKindId, point: TilePoint, ground?: TileKindId): boolean {
  const kind = kindAt(point);
  if (!TILE_KINDS[kind].walkable) return false;
  return CARDINAL_OFFSETS.some((offset) => {
    const beside = kindAt({ x: point.x + offset.x, y: point.y + offset.y });
    return beside !== kind && isWay(beside, ground);
  });
}
