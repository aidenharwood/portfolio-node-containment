import { decalIndex, type DecalCell, type FloorDecal, type FloorDecalKind, type FloorDecalPattern, type ResolvedLevel } from '@containment/shared';
import { darken, hex, lighten, noise3 } from '../voxel/palette.ts';

const R = 16;
const BORDER = 3;

export interface DecalPaint {
  readonly color: number;
  readonly emissive: boolean;
}

export const DECAL_KIND_COLORS: Partial<Record<FloorDecalKind, number>> = {
  inlay: 0xc9b27a,
  mosaic: 0x3f7f9a,
  rug: 0x7a2f3a,
  runner: 0x8a3a2f,
  'lane-paint': 0xa89a52,
  'hazard-paint': 0xc99a1c,
  moss: 0x3f6a2f,
  'salt-crust': 0xe6e2d6,
  'alien-vein': 0x9a3fd8,
};

const MOSAIC_ALT = 0xd9d2bf;
const HAZARD_DARK = 0x17170f;
const INNER_LIGHTEN = 0.35;

const SURFACE_KINDS: ReadonlySet<FloorDecalKind> = new Set(['inlay', 'rug', 'runner']);

export const decalBlocksScatter = (cells: readonly DecalCell[] | undefined): boolean =>
  cells !== undefined && cells.some(({ decal }) => SURFACE_KINDS.has(decal.kind));

export function patternMask(pattern: FloorDecalPattern, U: number, V: number, W: number, H: number): 'on' | 'alt' | 'inner' | null {
  switch (pattern) {
    case 'solid':
      return 'on';
    case 'border':
      return U < BORDER || V < BORDER || U >= W - BORDER || V >= H - BORDER ? 'on' : null;
    case 'checker':
      return (Math.floor(U / 8) + Math.floor(V / 8)) % 2 === 0 ? 'on' : 'alt';
    case 'stripe':
      return Math.floor((U + V) / 6) % 2 === 0 ? 'on' : 'alt';
    case 'compass': {
      const dx = U + 0.5 - W / 2;
      const dz = V + 0.5 - H / 2;
      const r = Math.hypot(dx, dz) / Math.min(W, H);
      if (r <= 0.12) return 'inner';
      if (r >= 0.42 && r <= 0.48) return 'on';
      if (r < 0.42) {
        const ax = Math.abs(dx);
        const az = Math.abs(dz);
        if (ax < 1 || az < 1 || Math.abs(ax - az) < Math.SQRT2) return 'on';
      }
      return null;
    }
  }
}

const luma = (color: number): number => (((color >> 16) & 255) * 0.3 + ((color >> 8) & 255) * 0.59 + (color & 255) * 0.11) / 255;

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

function softNoise(x: number, z: number, scale: number, salt: number): number {
  const gx = Math.floor(x / scale);
  const gz = Math.floor(z / scale);
  const fx = smoothstep((x - gx * scale) / scale);
  const fz = smoothstep((z - gz * scale) / scale);
  const top = noise3(gx, 0, gz, salt) * (1 - fx) + noise3(gx + 1, 0, gz, salt) * fx;
  const bottom = noise3(gx, 0, gz + 1, salt) * (1 - fx) + noise3(gx + 1, 0, gz + 1, salt) * fx;
  return top * (1 - fz) + bottom * fz;
}

function paintOne(decal: FloorDecal, u: number, v: number, lx: number, lz: number, base: number, grain: number): DecalPaint | null {
  const { kind } = decal;
  const U = u * R + lx;
  const V = v * R + lz;
  const mask = patternMask(decal.pattern ?? 'solid', U, V, decal.rect.width * R, decal.rect.height * R);
  if (!mask) return null;
  const solid = (color: number): DecalPaint => ({ color, emissive: false });
  const tinted = decal.tint ? hex(decal.tint) : undefined;
  const fill = (fallback: number): number => tinted ?? DECAL_KIND_COLORS[kind] ?? fallback;
  const W = decal.rect.width * R;
  const H = decal.rect.height * R;
  const wx = decal.rect.x * R + U;
  const wz = decal.rect.y * R + V;
  const reach = Math.hypot(((U + 0.5) / W) * 2 - 1, ((V + 0.5) / H) * 2 - 1) + (softNoise(wx, wz, 6, 17) - 0.5) * 0.5;
  switch (kind) {
    case 'wear':
      return grain > 0.55 ? solid(lighten(base, 0.12)) : null;
    case 'scorch':
      if (reach > 0.9) return null;
      if (reach > 0.75 && grain > 0.8) return { color: 0x7a2a10, emissive: true };
      return solid(darken(base, 0.25 + 0.45 * (1 - reach) + grain * 0.05));
    case 'water-stain':
      return solid(darken(base, 0.25));
    case 'cracks':
      return reach < 0.95 && Math.abs(softNoise(wx, wz, 10, 7) - 0.5) < 0.03 ? solid(luma(base) < 0.2 ? lighten(base, 0.35) : darken(base, 0.6)) : null;
    case 'moss':
    case 'salt-crust':
      return grain > (kind === 'moss' ? 0.4 : 0.5) ? solid(fill(base)) : null;
    case 'alien-vein': {
      if (reach > 1) return null;
      const band = Math.abs(softNoise(wx, wz, 9, 81) - 0.5);
      if (band < 0.022 || (reach < 0.15 && grain > 0.85)) return { color: fill(base), emissive: true };
      return band < 0.05 ? solid(darken(fill(base), 0.6)) : null;
    }
    case 'lane-paint':
      return grain > 0.25 ? solid(fill(base)) : null;
    case 'hazard-paint':
      if (decal.pattern === undefined || decal.pattern === 'stripe') {
        const stripe = Math.floor((U + V) / 6) % 2 === 0;
        return solid(stripe ? fill(base) : HAZARD_DARK);
      }
      return solid(fill(base));
    case 'mosaic':
      return solid(mask === 'alt' ? MOSAIC_ALT : mask === 'inner' ? lighten(fill(base), INNER_LIGHTEN) : fill(base));
    default: {
      if (mask === 'alt') return null;
      const color = fill(base);
      return solid(mask === 'inner' ? lighten(color, INNER_LIGHTEN) : color);
    }
  }
}

export function decalColor(cells: readonly DecalCell[], lx: number, lz: number, base: number, grain: number): DecalPaint | null {
  let result: DecalPaint | null = null;
  for (const { decal, u, v } of cells) {
    const paint = paintOne(decal, u, v, lx, lz, result ? result.color : base, grain);
    if (paint) result = paint;
  }
  return result;
}

const LEVEL_INDEX = new WeakMap<ResolvedLevel, ReadonlyMap<string, readonly DecalCell[]>>();

export function decalsForLevel(level: ResolvedLevel): ReadonlyMap<string, readonly DecalCell[]> {
  let index = LEVEL_INDEX.get(level);
  if (!index) {
    index = decalIndex(level.decals);
    LEVEL_INDEX.set(level, index);
  }
  return index;
}
