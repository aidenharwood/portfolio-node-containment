import { tileKey, type DecalCell, type FloorDecalKind, type TileKindId, type TileLayout, type TilePoint, type TileRect } from '@containment/shared';
import { groundAt } from './ground.ts';
import { MODEL_VOXEL_SIZE } from './worldScale.ts';
import { darken, jitter, lighten, mix, noise3 } from '../voxel/palette.ts';
import { decalBlocksScatter } from './floorDecals.ts';
import { landPaletteOf, type LandPalette } from './landPalette.ts';
import type { OwnedLayout } from './levelVoxels.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';

const VOXELS_PER_TILE = 16;
const HALF = VOXELS_PER_TILE / 2;
const EDGE_MARGIN = 1;

interface ScatterPalette {
  readonly density: number;
  readonly pebbles: readonly number[];
  readonly grit: readonly number[];
  readonly pieces: readonly ScatterPiece[];
  readonly tufts: readonly [number, number];
  readonly leaves: readonly [number, number];
}

type ScatterPiece = 'pebble' | 'stone' | 'grit' | 'flake' | 'bolt' | 'leaf' | 'tuft' | 'shard';

const RUST = [0x6a3f24, 0x7f4c2a, 0x52301c, 0x8a5a36];

function palettesOf(land: LandPalette): Partial<Record<TileKindId, ScatterPalette>> {
  const stone = [land.rock, land.rockLight, land.rockDark, lighten(land.rock, 0.08), land.gravel];
  const soil = [land.earth, land.dirt, land.earthDark, land.soil];
  const tufts: readonly [number, number] = [lighten(land.grass, 0.04), lighten(land.grass, 0.08)];
  const sprouts: readonly [number, number] = [lighten(land.soilRow, 0.06), lighten(land.soilRow, 0.12)];
  const { leaves } = land;
  return {
    concrete: { density: 0.14, pebbles: stone, grit: [darken(land.concrete, 0.2), darken(land.concrete, 0.1)], pieces: ['pebble', 'stone', 'shard'], tufts, leaves },
    rust: { density: 0.16, pebbles: RUST, grit: [0x3a2216, 0x5a3420], pieces: ['flake', 'bolt'], tufts, leaves },
    soil:
      land.soilStyle === 'basalt'
        ? { density: 0.16, pebbles: [land.glassSheen, mix(land.glassSheen, land.glass, 0.5), land.rockLight], grit: [land.glass, land.rockDark], pieces: ['shard', 'shard', 'stone'], tufts, leaves }
        : { density: 0.22, pebbles: soil, grit: [land.earthDark, land.earth], pieces: ['stone', 'leaf', 'tuft'], tufts: sprouts, leaves },
    grass: { density: 0.12, pebbles: [tufts[0], land.grass, darken(land.grass, 0.08), land.grassDry], grit: [darken(land.grass, 0.18), darken(land.grass, 0.1)], pieces: ['tuft', 'tuft', 'leaf', 'stone'], tufts, leaves },
    dirt: { density: 0.2, pebbles: [...soil, ...stone], grit: [land.earthDark, land.earth], pieces: ['pebble', 'stone', 'tuft'], tufts, leaves },
    gravel: { density: 0.12, pebbles: stone, grit: [darken(land.gravel, 0.15), lighten(land.gravel, 0.06)], pieces: ['pebble', 'grit', 'stone'], tufts, leaves },
    asphalt: { density: 0.06, pebbles: stone, grit: [darken(land.asphalt, 0.4), darken(land.asphalt, 0.2)], pieces: ['grit', 'shard'], tufts, leaves },
  };
}

const PALETTES = new Map<LandPalette, Partial<Record<TileKindId, ScatterPalette>>>();

function scatterOf(land: LandPalette, kind: TileKindId): ScatterPalette | undefined {
  let palettes = PALETTES.get(land);
  if (!palettes) {
    palettes = palettesOf(land);
    PALETTES.set(land, palettes);
  }
  return palettes[kind];
}

const DECAL_PIECES: Partial<Record<FloorDecalKind, readonly ScatterPiece[]>> = {
  moss: ['leaf', 'tuft'],
  scorch: ['flake'],
  cracks: ['shard'],
};

function piecesFor(palette: ScatterPalette, cells: readonly DecalCell[] | undefined): readonly ScatterPiece[] {
  if (!cells) return palette.pieces;
  const extra = cells.flatMap(({ decal }) => DECAL_PIECES[decal.kind] ?? []);
  return extra.length === 0 ? palette.pieces : [...palette.pieces, ...extra];
}

const pick = <T>(list: readonly T[], roll: number): T => list[Math.min(list.length - 1, Math.floor(roll * list.length))] as T;

function paintPiece(model: VoxelModel, piece: ScatterPiece, x: number, y: number, z: number, palette: ScatterPalette, seed: number): void {
  const roll = noise3(x, 5, z, seed);
  const color = jitter(pick(palette.pebbles, roll), 0.03, noise3(x, 1, z, seed));
  switch (piece) {
    case 'pebble':
      model.set(x, y, z, color);
      if (roll > 0.5) model.set(x + 1, y, z, darken(color, 0.12));
      return;
    case 'stone':
      model.fill(x, y, z, x + 1, y, z + 1, (vx, _y, vz) => (noise3(vx, 2, vz, seed) > 0.2 ? jitter(color, 0.08, noise3(vx, 3, vz, seed)) : null));
      model.set(x, y + 1, z, lighten(color, 0.12));
      return;
    case 'grit':
      for (let index = 0; index < 3; index++) {
        const dx = Math.round((noise3(x, index, z, seed + 3) - 0.5) * 4);
        const dz = Math.round((noise3(z, index, x, seed + 7) - 0.5) * 4);
        model.set(x + dx, y, z + dz, pick(palette.grit, noise3(dx, index, dz, seed)));
      }
      return;
    case 'flake':
      if (roll > 0.5) model.fill(x, y, z, x + 2, y, z, color);
      else model.fill(x, y, z, x, y, z + 2, color);
      return;
    case 'bolt':
      model.set(x, y, z, 0x9aa4aa).set(x, y + 1, z, 0x6f7a80);
      return;
    case 'shard':
      model.fill(x, y, z, x + 2, y, z + 1, (vx, _y, vz) => ((vx - x + vz - z) % 3 === 0 ? null : lighten(color, 0.08)));
      return;
    case 'leaf':
      model.fill(x, y, z, x + 1, y, z, roll > 0.5 ? palette.leaves[0] : palette.leaves[1]).set(x + 2, y, z + 1, darken(palette.leaves[0], 0.08));
      return;
    case 'tuft': {
      const [blade, tip] = palette.tufts;
      model.set(x, y, z, blade).set(x, y + 1, z, blade).set(x + 1, y, z, blade);
      if (roll > 0.3) model.set(x - 1, y + 1, z + 1, blade).set(x, y + 2, z, tip);
      return;
    }
  }
}

const SPILL = 0.4;
const SIDES: readonly (readonly [number, number])[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function spillFrom(layout: TileLayout, tx: number, ty: number, own: TileKindId, land: LandPalette): { readonly palette: ScatterPalette; readonly dx: number; readonly dy: number } | null {
  const roll = noise3(tx, ty, 2, 96);
  if (roll > SPILL) return null;
  const [dx, dy] = SIDES[Math.floor(noise3(tx, ty, 3, 96) * SIDES.length) % SIDES.length] as readonly [number, number];
  const kind = layout.tileAt({ x: tx + dx, y: ty + dy });
  const palette = kind === own ? undefined : scatterOf(land, kind);
  return palette && scatterOf(land, own) ? { palette, dx, dy } : null;
}

export function buildFloorScatter(layout: OwnedLayout, region: TileRect, isOccupied: (tile: TilePoint) => boolean, decals?: ReadonlyMap<string, readonly DecalCell[]>): VoxelModel {
  const model = new VoxelModel();
  for (let ty = region.y; ty < region.y + region.height; ty++) {
    for (let tx = region.x; tx < region.x + region.width; tx++) {
      const kind = layout.tileAt({ x: tx, y: ty });
      const land = landPaletteOf(layout.regionAt?.({ x: tx, y: ty }));
      const palette = scatterOf(land, kind);
      const cells = decals?.get(tileKey({ x: tx, y: ty }));
      if (!palette || isOccupied({ x: tx, y: ty }) || decalBlocksScatter(cells)) continue;
      const pieces = piecesFor(palette, cells);
      if (noise3(tx, ty, 0, 91) > palette.density) continue;
      const count = 1 + Math.floor(noise3(tx, ty, 1, 92) * 2);
      const spill = spillFrom(layout, tx, ty, kind, land);
      const reach = VOXELS_PER_TILE - EDGE_MARGIN * 2 - 3;
      for (let index = 0; index < count; index++) {
        const seed = tx * 131 + ty * 71 + index * 17;
        const spilled = spill && index === count - 1 ? spill : null;
        const lean = (along: number, toward: number): number => (spilled && toward !== 0 ? Math.floor(along / 2) + (toward > 0 ? Math.floor(reach / 2) : 0) : along);
        const lx = lean(Math.floor(noise3(tx, index, ty, 93) * reach), spilled?.dx ?? 0) + EDGE_MARGIN - HALF;
        const lz = lean(Math.floor(noise3(ty, index, tx, 94) * reach), spilled?.dy ?? 0) + EDGE_MARGIN - HALF;
        const from = spilled ? spilled.palette : palette;
        const piece = pick(spilled ? spilled.palette.pieces : pieces, noise3(tx, ty, index, 95));
        const lift = Math.round(groundAt(layout, tx + (lx + 0.5) / VOXELS_PER_TILE, ty + (lz + 0.5) / VOXELS_PER_TILE) / MODEL_VOXEL_SIZE);
        paintPiece(model, piece, tx * VOXELS_PER_TILE + lx, lift, ty * VOXELS_PER_TILE + lz, from, seed);
      }
    }
  }
  return model;
}
