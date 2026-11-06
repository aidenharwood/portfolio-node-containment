export interface TilePoint {
  readonly x: number;
  readonly y: number;
}

export interface TileRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const tilePoint = (x: number, y: number): TilePoint => ({ x, y });

export const tileKey = ({ x, y }: TilePoint): string => `${x},${y}`;

export const samePoint = (a: TilePoint, b: TilePoint): boolean => a.x === b.x && a.y === b.y;

export const chebyshevDistance = (a: TilePoint, b: TilePoint): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

export const manhattanDistance = (a: TilePoint, b: TilePoint): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const isCardinallyAdjacent = (a: TilePoint, b: TilePoint): boolean => manhattanDistance(a, b) === 1;

export const rectContains = (rect: TileRect, point: TilePoint): boolean =>
  point.x >= rect.x && point.x < rect.x + rect.width && point.y >= rect.y && point.y < rect.y + rect.height;

export const CARDINAL_OFFSETS: readonly TilePoint[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export const DIAGONAL_OFFSETS: readonly TilePoint[] = [
  { x: 1, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

export type Facing = 'north' | 'east' | 'south' | 'west';

export function facingBetween(from: TilePoint, to: TilePoint, fallback: Facing): Facing {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return fallback;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'east' : 'west';
  return dy > 0 ? 'south' : 'north';
}
