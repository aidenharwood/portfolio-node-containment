import type { TilePoint } from './geometry.ts';

export const CHUNK_SIZE = 32;
export const INTEREST_RADIUS = 1;

export interface ChunkCoord {
  readonly cx: number;
  readonly cy: number;
}

export type ChunkKey = string;

export function chunkOf(point: TilePoint): ChunkCoord {
  return { cx: Math.floor(point.x / CHUNK_SIZE), cy: Math.floor(point.y / CHUNK_SIZE) };
}

export function chunkKey(chunk: ChunkCoord): ChunkKey {
  return `${chunk.cx},${chunk.cy}`;
}

export function chunkKeyOf(point: TilePoint): ChunkKey {
  return chunkKey(chunkOf(point));
}

export function interestSet(chunk: ChunkCoord): ReadonlySet<ChunkKey> {
  const keys = new Set<ChunkKey>();
  for (let dy = -INTEREST_RADIUS; dy <= INTEREST_RADIUS; dy++) {
    for (let dx = -INTEREST_RADIUS; dx <= INTEREST_RADIUS; dx++) keys.add(chunkKey({ cx: chunk.cx + dx, cy: chunk.cy + dy }));
  }
  return keys;
}

export function interestDelta(from: ChunkCoord | null, to: ChunkCoord): { readonly entered: readonly ChunkKey[]; readonly left: readonly ChunkKey[] } {
  const next = interestSet(to);
  const previous = from ? interestSet(from) : new Set<ChunkKey>();
  return {
    entered: [...next].filter((key) => !previous.has(key)),
    left: [...previous].filter((key) => !next.has(key)),
  };
}
