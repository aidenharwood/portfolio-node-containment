import { tileKey, type TileRect } from './geometry.ts';

export type FloorDecalKind =
  | 'inlay'
  | 'mosaic'
  | 'rug'
  | 'runner'
  | 'lane-paint'
  | 'hazard-paint'
  | 'wear'
  | 'scorch'
  | 'moss'
  | 'water-stain'
  | 'salt-crust'
  | 'alien-vein'
  | 'cracks';

export type FloorDecalPattern = 'solid' | 'border' | 'checker' | 'compass' | 'stripe';

export interface FloorDecal {
  readonly kind: FloorDecalKind;
  readonly rect: TileRect;
  readonly pattern?: FloorDecalPattern;
  readonly tint?: string;
}

export interface DecalCell {
  readonly decal: FloorDecal;
  readonly u: number;
  readonly v: number;
}

export function decalIndex(decals: readonly FloorDecal[]): ReadonlyMap<string, readonly DecalCell[]> {
  const index = new Map<string, DecalCell[]>();
  for (const decal of decals) {
    for (let v = 0; v < decal.rect.height; v++) {
      for (let u = 0; u < decal.rect.width; u++) {
        const key = tileKey({ x: decal.rect.x + u, y: decal.rect.y + v });
        const cells = index.get(key);
        if (cells) cells.push({ decal, u, v });
        else index.set(key, [{ decal, u, v }]);
      }
    }
  }
  return index;
}
