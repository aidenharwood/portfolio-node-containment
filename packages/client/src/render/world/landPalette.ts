import type { RegionId, TilePoint } from '@containment/shared';

export type SoilStyle = 'furrows' | 'basalt';

export interface LandPalette {
  readonly grass: number;
  readonly grassDry: number;
  readonly grassLush: number;
  readonly dryness: number;
  readonly drift: number;
  readonly dirt: number;
  readonly dirtDark: number;
  readonly gravel: number;
  readonly gravelDark: number;
  readonly soil: number;
  readonly soilRow: number;
  readonly soilStyle: SoilStyle;
  readonly glass: number;
  readonly glassSheen: number;
  readonly glint: number;
  readonly asphalt: number;
  readonly paving: number;
  readonly concrete: number;
  readonly rust: number;
  readonly rock: number;
  readonly rockDark: number;
  readonly rockLight: number;
  readonly moss: number;
  readonly mossiness: number;
  readonly earth: number;
  readonly earthDark: number;
  readonly leaves: readonly [number, number];
}

export const DEFAULT_LAND: LandPalette = {
  grass: 0x4b5a38,
  grassDry: 0x676244,
  grassLush: 0x405a44,
  dryness: 0.35,
  drift: 0.4,
  dirt: 0x5a4632,
  dirtDark: 0x4c3b2a,
  gravel: 0x6a665e,
  gravelDark: 0x5c5850,
  soil: 0x4a3a2a,
  soilRow: 0x42412a,
  soilStyle: 'furrows',
  glass: 0x3c3a4c,
  glassSheen: 0x8c8aa8,
  glint: 0xc4c8ff,
  asphalt: 0x4e4f50,
  paving: 0x5d5e5c,
  concrete: 0x5a5d5c,
  rust: 0x553a28,
  rock: 0x66635c,
  rockDark: 0x55524c,
  rockLight: 0x77736a,
  moss: 0x56653a,
  mossiness: 0.35,
  earth: 0x4c3b2a,
  earthDark: 0x3a2e20,
  leaves: [0x5a6a3a, 0x6a5a32],
};

const KESTREL: LandPalette = {
  ...DEFAULT_LAND,
  grass: 0x44593a,
  grassDry: 0x5f6446,
  grassLush: 0x3c5845,
  dryness: 0,
  drift: 0.35,
  dirt: 0x5b4a38,
  dirtDark: 0x4d3e2f,
  gravel: 0x6c6b66,
  gravelDark: 0x5e5d58,
  soil: 0x4a3b2c,
  soilRow: 0x41422b,
  asphalt: 0x505153,
  paving: 0x6a6b68,
  concrete: 0x6e706e,
  rock: 0x6c6a64,
  rockDark: 0x5a5852,
  rockLight: 0x7c7a72,
  mossiness: 0.2,
};

const HARROW: LandPalette = {
  ...DEFAULT_LAND,
  grass: 0x57593a,
  grassDry: 0x6e6845,
  grassLush: 0x4a5a3a,
  dryness: 0.85,
  drift: 0.45,
  dirt: 0x5e4a32,
  dirtDark: 0x4f3d29,
  gravel: 0x6a6457,
  gravelDark: 0x5b564a,
  soil: 0x4c3a28,
  soilRow: 0x43422a,
  paving: 0x605c54,
  concrete: 0x5e5d58,
  rock: 0x6a6356,
  rockDark: 0x585246,
  rockLight: 0x7a7262,
  mossiness: 0.6,
  earth: 0x50402c,
  leaves: [0x66683a, 0x6e5a32],
};

const HALCYON: LandPalette = {
  ...DEFAULT_LAND,
  grass: 0x405244,
  grassDry: 0x55573f,
  grassLush: 0x38504a,
  dryness: 0.3,
  drift: 0.3,
  dirt: 0x4e4136,
  dirtDark: 0x42372d,
  gravel: 0x5c5d60,
  gravelDark: 0x4f5053,
  soil: 0x3e3428,
  soilRow: 0x393a29,
  paving: 0x5c5c5c,
  concrete: 0x5a5c5e,
  rock: 0x5e5e60,
  rockDark: 0x4e4e51,
  rockLight: 0x6e6e70,
  mossiness: 0.15,
};

const WRECKFIELD: LandPalette = {
  ...DEFAULT_LAND,
  grass: 0x56573c,
  grassDry: 0x6a6040,
  grassLush: 0x4a523c,
  dryness: 0.7,
  drift: 0.3,
  dirt: 0x5f4a38,
  dirtDark: 0x4f3d2e,
  gravel: 0x6b6459,
  gravelDark: 0x5c5348,
  asphalt: 0x4f4d4a,
  paving: 0x5e5a54,
  concrete: 0x605c56,
  rust: 0x6b503e,
  rock: 0x685a4e,
  rockDark: 0x56493e,
  rockLight: 0x786a5c,
  mossiness: 0.1,
  earth: 0x54402f,
  leaves: [0x5e5a36, 0x6a5232],
};

const GLASS_STEPPE: LandPalette = {
  ...DEFAULT_LAND,
  grass: 0x4b5248,
  grassDry: 0x5e5c58,
  grassLush: 0x42504c,
  dryness: 0.4,
  drift: 0.25,
  dirt: 0x524c58,
  dirtDark: 0x46414c,
  gravel: 0x5c5868,
  gravelDark: 0x4c4958,
  soil: 0x56525f,
  soilStyle: 'basalt',
  asphalt: 0x4a4a50,
  paving: 0x5a5a62,
  concrete: 0x5c5c64,
  rock: 0x4c4856,
  rockDark: 0x3e3b48,
  rockLight: 0x5e5a6a,
  moss: 0x5a5470,
  mossiness: 0.15,
  earth: 0x423e4a,
  earthDark: 0x34303c,
  leaves: [0x6a6880, 0x5a5670],
};

const SPINDLE: LandPalette = {
  ...DEFAULT_LAND,
  grass: 0x47534a,
  grassDry: 0x5a5e54,
  grassLush: 0x3e5250,
  dryness: 0.2,
  drift: 0.25,
  dirt: 0x52504e,
  dirtDark: 0x464442,
  gravel: 0x60646a,
  gravelDark: 0x53575c,
  soil: 0x45403c,
  asphalt: 0x4c4e52,
  paving: 0x62656a,
  concrete: 0x747775,
  rock: 0x5c6068,
  rockDark: 0x4c5058,
  rockLight: 0x6e727a,
  moss: 0x4e5a52,
  mossiness: 0.1,
  earth: 0x4a4644,
  earthDark: 0x3a3634,
};

export const LAND_PALETTES: Readonly<Record<RegionId, LandPalette>> = {
  'kestrel-reach': KESTREL,
  'harrow-terraces': HARROW,
  halcyon: HALCYON,
  wreckfield: WRECKFIELD,
  'glass-steppe': GLASS_STEPPE,
  'the-spindle': SPINDLE,
};

export const landPaletteOf = (region: RegionId | undefined): LandPalette => (region === undefined ? DEFAULT_LAND : (LAND_PALETTES[region] ?? DEFAULT_LAND));

export type RegionAt = (point: TilePoint) => RegionId | undefined;

export interface LandPart {
  readonly palette: LandPalette;
  readonly corners: readonly [number, number, number, number];
}

export interface LandBlend {
  readonly parts: readonly LandPart[];
  readonly dominant: LandPalette;
}

export type LandSpot = LandPalette | LandBlend;

export const isLandBlend = (spot: LandSpot): spot is LandBlend => 'parts' in spot;

export const dominantLand = (spot: LandSpot): LandPalette => (isLandBlend(spot) ? spot.dominant : spot);

const BLEND_TILES = 3;

function regionPaletteAt(regionAt: RegionAt, x: number, y: number): LandPalette | null {
  const region = regionAt({ x, y });
  return region === undefined ? null : landPaletteOf(region);
}

function uniformAround(regionAt: RegionAt, tx: number, ty: number, own: LandPalette | null): boolean {
  for (let y = ty - BLEND_TILES; y <= ty + BLEND_TILES; y++) {
    for (let x = tx - BLEND_TILES; x <= tx + BLEND_TILES; x++) {
      const palette = regionPaletteAt(regionAt, x, y);
      if (palette !== null && palette !== own) return false;
    }
  }
  return true;
}

export function landSpotOf(regionAt: RegionAt | undefined, tx: number, ty: number): LandSpot {
  if (!regionAt) return DEFAULT_LAND;
  const own = regionPaletteAt(regionAt, tx, ty);
  if (uniformAround(regionAt, tx, ty, own)) return own ?? DEFAULT_LAND;
  const palettes = new Set<LandPalette>();
  const shares = (cx: number, cy: number): Map<LandPalette, number> => {
    const counts = new Map<LandPalette, number>();
    let counted = 0;
    for (let y = cy - BLEND_TILES; y < cy + BLEND_TILES; y++) {
      for (let x = cx - BLEND_TILES; x < cx + BLEND_TILES; x++) {
        const palette = regionPaletteAt(regionAt, x, y);
        if (palette === null) continue;
        counts.set(palette, (counts.get(palette) ?? 0) + 1);
        palettes.add(palette);
        counted++;
      }
    }
    for (const [palette, count] of counts) counts.set(palette, count / counted);
    return counts;
  };
  const [nw, ne, sw, se] = [shares(tx, ty), shares(tx + 1, ty), shares(tx, ty + 1), shares(tx + 1, ty + 1)];
  const parts: LandPart[] = [...palettes].map((palette) => ({ palette, corners: [nw.get(palette) ?? 0, ne.get(palette) ?? 0, sw.get(palette) ?? 0, se.get(palette) ?? 0] }));
  const total = (part: LandPart): number => part.corners[0] + part.corners[1] + part.corners[2] + part.corners[3];
  const dominant = parts.reduce((best, part) => (total(part) > total(best) ? part : best), parts[0] as LandPart).palette;
  return parts.length === 1 ? dominant : { parts, dominant };
}

const weightOf = (part: LandPart, fx: number, fz: number): number =>
  (part.corners[0] * (1 - fx) + part.corners[1] * fx) * (1 - fz) + (part.corners[2] * (1 - fx) + part.corners[3] * fx) * fz;

export function paletteAt(spot: LandSpot, fx: number, fz: number): LandPalette {
  if (!isLandBlend(spot)) return spot;
  let best = spot.dominant;
  let weight = -1;
  for (const part of spot.parts) {
    const share = weightOf(part, fx, fz);
    if (share > weight) {
      weight = share;
      best = part.palette;
    }
  }
  return best;
}

export function blendLand(spot: LandSpot, fx: number, fz: number, paint: (palette: LandPalette) => number): number {
  if (!isLandBlend(spot)) return paint(spot);
  let red = 0;
  let green = 0;
  let blue = 0;
  let total = 0;
  for (const part of spot.parts) {
    const share = weightOf(part, fx, fz);
    if (share <= 0) continue;
    const color = paint(part.palette);
    red += ((color >> 16) & 255) * share;
    green += ((color >> 8) & 255) * share;
    blue += (color & 255) * share;
    total += share;
  }
  if (total <= 0) return paint(spot.dominant);
  return (Math.round(red / total) << 16) | (Math.round(green / total) << 8) | Math.round(blue / total);
}
