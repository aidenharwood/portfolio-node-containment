import { TILE_KINDS, type RegionId, type TileKindId } from '@containment/shared';
import { Color, SRGBColorSpace } from 'three';
import { noise3 } from '../voxel/palette.ts';
import { VOXEL_EMPTY } from '../voxel/voxelKinds.ts';
import { tileTint } from '../world/chunkPlaceholder.ts';
import { landPaletteOf, type LandPalette } from '../world/landPalette.ts';
import { buildTileVolume, type OwnedLayout } from '../world/levelVoxels.ts';
import { WATER_PALETTE } from '../world/liquidSurface.ts';
import { FLOOR_LAYERS, TILE_RESOLUTION, ZONE_VOLUME_HEIGHT, ZONE_VOXEL_SIZE } from '../world/worldScale.ts';

export type Rgb = [number, number, number];

const LAND_WIDE = 24;
const LAND_MID = 7;
const LAND_HUE = 40;
const WIDE_SHADE = 0.16;
const MID_SHADE = 0.36;
const LIGHT_SHARE = 0.6;
const LUSH_PULL = 1.4;
const SAMPLE = { x: 2, y: 2, width: 4, height: 4 } as const;
const WATER_DEPTH = 0.4;
const WALL_SIDE = 0.8;
const RISER_EARTH = 0.5;
const SHADED: ReadonlySet<TileKindId> = new Set<TileKindId>(['grass', 'dirt', 'gravel', 'soil']);

interface LandField {
  readonly wide: number;
  readonly mid: number;
  readonly hue: number;
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

function fieldNoise(x: number, y: number, scale: number, salt: number): number {
  const gx = Math.floor(x / scale);
  const gy = Math.floor(y / scale);
  const fx = smooth(x / scale - gx);
  const fy = smooth(y / scale - gy);
  const top = noise3(gx, 0, gy, salt) * (1 - fx) + noise3(gx + 1, 0, gy, salt) * fx;
  const bottom = noise3(gx, 0, gy + 1, salt) * (1 - fx) + noise3(gx + 1, 0, gy + 1, salt) * fx;
  return top * (1 - fy) + bottom * fy;
}

const fieldAt = (tx: number, ty: number): LandField => ({
  wide: fieldNoise(tx + 0.5, ty + 0.5, LAND_WIDE, 271),
  mid: fieldNoise(tx + 0.5, ty + 0.5, LAND_MID, 277),
  hue: fieldNoise(tx + 0.5, ty + 0.5, LAND_HUE, 281),
});

export const srgbToLinear = (value: number): number => (value < 0.04045 ? value * 0.0773993808 : Math.pow(value * 0.9478672986 + 0.0521327014, 2.4));

const hexChannel = (hex: number, shift: number): number => ((hex >> shift) & 255) / 255;

const shadeOf = (field: LandField): number => (field.wide - 0.5) * WIDE_SHADE + (field.mid - 0.5) * MID_SHADE;

function grassPull(field: LandField, land: LandPalette): { readonly target: number; readonly amount: number } {
  return field.hue > 0.5 ? { target: land.grassDry, amount: (field.hue - 0.5) * land.drift } : { target: land.grassLush, amount: (0.5 - field.hue) * land.drift * LUSH_PULL };
}

interface Neutral {
  readonly srgb: Rgb;
  readonly linear: Rgb;
  readonly land: LandPalette;
}

const NEUTRALS = new Map<string, Neutral>();
const scratch = new Color();
const srgbOut = { r: 0, g: 0, b: 0 };

function neutralOf(kind: TileKindId, region: RegionId | undefined): Neutral {
  const key = `${region ?? ''}:${kind}`;
  const known = NEUTRALS.get(key);
  if (known) return known;
  const land = landPaletteOf(region);
  const inside = (x: number, y: number): boolean => x >= SAMPLE.x - 1 && y >= SAMPLE.y - 1 && x <= SAMPLE.x + SAMPLE.width && y <= SAMPLE.y + SAMPLE.height;
  const layout: OwnedLayout = { width: SAMPLE.x + SAMPLE.width + 2, height: SAMPLE.y + SAMPLE.height + 2, tileAt: ({ x, y }) => (inside(x, y) ? kind : 'void'), heightAt: () => 0, regionAt: () => region };
  const volume = buildTileVolume(layout, SAMPLE);
  const R = TILE_RESOLUTION;
  const srgb: Rgb = [0, 0, 0];
  const linear: Rgb = [0, 0, 0];
  let tiles = 0;
  for (let ty = SAMPLE.y; ty < SAMPLE.y + SAMPLE.height; ty++) {
    for (let tx = SAMPLE.x; tx < SAMPLE.x + SAMPLE.width; tx++) {
      let red = 0;
      let green = 0;
      let blue = 0;
      let count = 0;
      for (let vz = ty * R; vz < (ty + 1) * R; vz++) {
        for (let vx = tx * R; vx < (tx + 1) * R; vx++) {
          for (let vy = ZONE_VOLUME_HEIGHT - 1; vy >= 0; vy--) {
            if (volume.kindAt(vx, vy, vz) === VOXEL_EMPTY) continue;
            scratch.setHex(volume.colorAt(vx, vy, vz));
            red += scratch.r;
            green += scratch.g;
            blue += scratch.b;
            count++;
            break;
          }
        }
      }
      if (count === 0) continue;
      tiles++;
      scratch.setRGB(red / count, green / count, blue / count);
      linear[0] += scratch.r;
      linear[1] += scratch.g;
      linear[2] += scratch.b;
      scratch.getRGB(srgbOut, SRGBColorSpace);
      const values: Rgb = [srgbOut.r, srgbOut.g, srgbOut.b];
      if (SHADED.has(kind)) {
        const field = fieldAt(tx, ty);
        const shade = shadeOf(field);
        const pull = kind === 'grass' ? grassPull(field, land) : null;
        for (let channel = 0; channel < 3; channel++) {
          let value = values[channel] as number;
          value = shade < 0 ? value / (1 + shade) : (value - shade * LIGHT_SHARE) / (1 - shade * LIGHT_SHARE);
          if (pull && pull.amount < 1) value = (value - hexChannel(pull.target, 16 - channel * 8) * pull.amount) / (1 - pull.amount);
          values[channel] = value;
        }
      }
      for (let channel = 0; channel < 3; channel++) srgb[channel] = (srgb[channel] as number) + (values[channel] as number);
    }
  }
  const share = Math.max(1, tiles);
  const neutral: Neutral = { srgb: srgb.map((value) => Math.min(1, Math.max(0, value / share))) as Rgb, linear: linear.map((value) => value / share) as Rgb, land };
  NEUTRALS.set(key, neutral);
  return neutral;
}

const WATER: Rgb = (() => {
  const shallow = new Color(WATER_PALETTE.shallow);
  const deep = new Color(WATER_PALETTE.deep);
  shallow.lerp(deep, WATER_DEPTH);
  return [shallow.r, shallow.g, shallow.b];
})();

export const FAR_WATER: Readonly<Rgb> = WATER;

export function farTileColor(kind: TileKindId, region: RegionId | undefined, tx: number, ty: number, out: Rgb = [0, 0, 0]): Rgb {
  if (TILE_KINDS[kind].structure === 'liquid') {
    out[0] = WATER[0];
    out[1] = WATER[1];
    out[2] = WATER[2];
    return out;
  }
  const neutral = neutralOf(kind, region);
  if (!SHADED.has(kind)) {
    out[0] = neutral.linear[0];
    out[1] = neutral.linear[1];
    out[2] = neutral.linear[2];
    return out;
  }
  const field = fieldAt(tx, ty);
  const shade = shadeOf(field);
  const pull = kind === 'grass' ? grassPull(field, neutral.land) : null;
  for (let channel = 0; channel < 3; channel++) {
    let value = neutral.srgb[channel] as number;
    if (pull) value += (hexChannel(pull.target, 16 - channel * 8) - value) * pull.amount;
    value = shade < 0 ? value * (1 + shade) : value + (1 - value) * shade * LIGHT_SHARE;
    out[channel] = srgbToLinear(Math.min(1, Math.max(0, value)));
  }
  return out;
}

const EARTHS = new Map<RegionId | undefined, Rgb>();

function earthOf(region: RegionId | undefined): Rgb {
  const known = EARTHS.get(region);
  if (known) return known;
  const color = new Color(landPaletteOf(region).earth);
  const earth: Rgb = [color.r, color.g, color.b];
  EARTHS.set(region, earth);
  return earth;
}

export function farSideColor(kind: TileKindId, region: RegionId | undefined, top: Readonly<Rgb>, out: Rgb = [0, 0, 0]): Rgb {
  const wall = TILE_KINDS[kind].structure === 'wall';
  const earth = earthOf(region);
  for (let channel = 0; channel < 3; channel++) {
    const value = top[channel] as number;
    out[channel] = wall ? value * WALL_SIDE : value + ((earth[channel] as number) - value) * RISER_EARTH;
  }
  return out;
}

export function farTopOffset(kind: TileKindId): number {
  if (TILE_KINDS[kind].structure === 'liquid') return WATER_PALETTE.level;
  return (tileTint(kind).rise - FLOOR_LAYERS) * ZONE_VOXEL_SIZE;
}
