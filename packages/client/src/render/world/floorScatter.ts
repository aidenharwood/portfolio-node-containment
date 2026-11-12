import { tileKey, type DecalCell, type FloorDecalKind, type TileKindId, type TileLayout, type TilePoint, type TileRect } from '@containment/shared';
import { darken, jitter, lighten, noise3 } from '../voxel/palette.ts';
import { decalBlocksScatter } from './floorDecals.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';

const VOXELS_PER_TILE = 16;
const HALF = VOXELS_PER_TILE / 2;
const EDGE_MARGIN = 1;

interface ScatterPalette {
  readonly density: number;
  readonly pebbles: readonly number[];
  readonly grit: readonly number[];
  readonly pieces: readonly ScatterPiece[];
}

type ScatterPiece = 'pebble' | 'stone' | 'grit' | 'flake' | 'bolt' | 'leaf' | 'tuft' | 'shard';

const STONE = [0x5d6266, 0x4a4f53, 0x6f7377, 0x3d4246, 0x7a7468];
const RUST = [0x6a3f24, 0x7f4c2a, 0x52301c, 0x8a5a36];
const SOIL = [0x4a3a28, 0x5b4a34, 0x3a2e20, 0x6b5a42];

const PALETTES: Partial<Record<TileKindId, ScatterPalette>> = {
  plating: { density: 0.55, pebbles: STONE, grit: [0x3a4a55, 0x2c3a44, 0x56656f], pieces: ['grit', 'grit', 'pebble', 'bolt', 'flake'] },
  concrete: { density: 0.8, pebbles: STONE, grit: [0x3a3e41, 0x4c5054, 0x232629], pieces: ['pebble', 'pebble', 'stone', 'grit', 'grit', 'shard'] },
  rust: { density: 0.75, pebbles: RUST, grit: [0x3a2216, 0x5a3420], pieces: ['flake', 'flake', 'pebble', 'grit', 'bolt'] },
  soil: { density: 0.9, pebbles: SOIL, grit: [0x2a2014, 0x3a2c1c], pieces: ['pebble', 'stone', 'leaf', 'tuft', 'tuft', 'grit'] },
  carpet: { density: 0.25, pebbles: [0x3a3248, 0x4a4058], grit: [0x1e1a28, 0x5a4a2a], pieces: ['grit', 'flake'] },
  hazard: { density: 0.35, pebbles: STONE, grit: [0x2a2a20, 0x4a4a3a], pieces: ['grit', 'pebble', 'bolt'] },
  grate: { density: 0.18, pebbles: STONE, grit: [0x2b3a44], pieces: ['bolt', 'grit'] },
};

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

function paintPiece(model: VoxelModel, piece: ScatterPiece, x: number, z: number, palette: ScatterPalette, seed: number): void {
  const roll = noise3(x, 5, z, seed);
  const color = jitter(pick(palette.pebbles, roll), 0.06, noise3(x, 1, z, seed));
  switch (piece) {
    case 'pebble':
      model.set(x, 0, z, color);
      if (roll > 0.5) model.set(x + 1, 0, z, darken(color, 0.12));
      return;
    case 'stone':
      model.fill(x, 0, z, x + 1, 0, z + 1, (vx, _y, vz) => (noise3(vx, 2, vz, seed) > 0.2 ? jitter(color, 0.08, noise3(vx, 3, vz, seed)) : null));
      model.set(x, 1, z, lighten(color, 0.12));
      return;
    case 'grit':
      for (let index = 0; index < 3; index++) {
        const dx = Math.round((noise3(x, index, z, seed + 3) - 0.5) * 4);
        const dz = Math.round((noise3(z, index, x, seed + 7) - 0.5) * 4);
        model.set(x + dx, 0, z + dz, pick(palette.grit, noise3(dx, index, dz, seed)));
      }
      return;
    case 'flake':
      if (roll > 0.5) model.fill(x, 0, z, x + 2, 0, z, color);
      else model.fill(x, 0, z, x, 0, z + 2, color);
      return;
    case 'bolt':
      model.set(x, 0, z, 0x9aa4aa).set(x, 1, z, 0x6f7a80);
      return;
    case 'shard':
      model.fill(x, 0, z, x + 2, 0, z + 1, (vx, _y, vz) => ((vx - x + vz - z) % 3 === 0 ? null : lighten(color, 0.08)));
      return;
    case 'leaf':
      model.fill(x, 0, z, x + 1, 0, z, roll > 0.5 ? 0x5a8a3a : 0x7a6a2a).set(x + 2, 0, z + 1, 0x4f7a32);
      return;
    case 'tuft': {
      const green = roll > 0.6 ? 0x6fae48 : 0x4f8a3a;
      model.set(x, 0, z, green).set(x, 1, z, lighten(green, 0.1)).set(x + 1, 0, z, green);
      if (roll > 0.3) model.set(x - 1, 1, z + 1, green).set(x, 2, z, lighten(green, 0.2));
      return;
    }
  }
}

export function buildFloorScatter(layout: TileLayout, region: TileRect, isOccupied: (tile: TilePoint) => boolean, decals?: ReadonlyMap<string, readonly DecalCell[]>): VoxelModel {
  const model = new VoxelModel();
  for (let ty = region.y; ty < region.y + region.height; ty++) {
    for (let tx = region.x; tx < region.x + region.width; tx++) {
      const palette = PALETTES[layout.tileAt({ x: tx, y: ty })];
      const cells = decals?.get(tileKey({ x: tx, y: ty }));
      if (!palette || isOccupied({ x: tx, y: ty }) || decalBlocksScatter(cells)) continue;
      const pieces = piecesFor(palette, cells);
      if (noise3(tx, ty, 0, 91) > palette.density) continue;
      const count = 1 + Math.floor(noise3(tx, ty, 1, 92) * 3);
      for (let index = 0; index < count; index++) {
        const seed = tx * 131 + ty * 71 + index * 17;
        const lx = Math.floor(noise3(tx, index, ty, 93) * (VOXELS_PER_TILE - EDGE_MARGIN * 2 - 3)) + EDGE_MARGIN - HALF;
        const lz = Math.floor(noise3(ty, index, tx, 94) * (VOXELS_PER_TILE - EDGE_MARGIN * 2 - 3)) + EDGE_MARGIN - HALF;
        const piece = pick(pieces, noise3(tx, ty, index, 95));
        paintPiece(model, piece, tx * VOXELS_PER_TILE + lx, ty * VOXELS_PER_TILE + lz, palette, seed);
      }
    }
  }
  return model;
}
