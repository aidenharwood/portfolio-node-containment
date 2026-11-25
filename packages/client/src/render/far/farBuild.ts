import { TILE_KIND_IDS, type RegionId, type ResolvedLevel, type TileKindId, type TilePoint, type ZoneAmbience } from '@containment/shared';
import { SLOPED } from '../world/ground.ts';
import { STEP_HEIGHT } from '../world/worldScale.ts';
import { farSideColor, farTileColor, farTopOffset } from './farPalette.ts';
import { coarsenRows, createFarCells, farSectors, farTileTransfer, meshFarSector, type FarCellSize, type FarTileArrays } from './farTerrainMesher.ts';
import { kindOfIndex, VOID_KIND, type Plan, type SceneRaster } from './sceneRaster.ts';

export const FAR_SECTOR_TILES = 256;
export const FAR_MOOD_LIMIT = 32;
const CELL_ROWS_PER_STEP = 8;
const SLOPE_SLACK = STEP_HEIGHT / 2;
const SLACKED: ReadonlySet<TileKindId> = new Set<TileKindId>([...SLOPED, 'track']);

export interface FarBuild {
  readonly cell: FarCellSize;
  readonly tiles: readonly FarTileArrays[];
  readonly moods: readonly ZoneAmbience[];
}

export interface FarLevel {
  ambienceAt(point: TilePoint): ZoneAmbience;
  regionAt(point: TilePoint): RegionId | undefined;
}

export function farLevelOf(level: ResolvedLevel): FarLevel {
  const land = level.definition.land;
  return { ambienceAt: (point) => level.ambienceAt(point), regionAt: (point) => land?.wardAt(point) };
}

export const moodKeyOf = (ambience: ZoneAmbience): string => `${ambience.darkness}|${ambience.tint}|${ambience.fog}|${ambience.sky ?? ''}|${ambience.haze ?? 1}`;

export function planFarBuild(level: FarLevel, raster: SceneRaster, cell: FarCellSize): Plan<FarBuild> {
  const topOffsets = new Float32Array(TILE_KIND_IDS.length);
  const slack = new Float32Array(TILE_KIND_IDS.length);
  TILE_KIND_IDS.forEach((kind, index) => {
    if (index === VOID_KIND) return;
    topOffsets[index] = farTopOffset(kind);
    slack[index] = SLACKED.has(kind) ? SLOPE_SLACK : 0;
  });
  const moods: ZoneAmbience[] = [];
  const byAmbience = new Map<ZoneAmbience, number>();
  const byLook = new Map<string, number>();
  const point = { x: 0, y: 0 };
  const regionAt = (tx: number, ty: number): RegionId | undefined => {
    point.x = tx;
    point.y = ty;
    return level.regionAt(point);
  };
  const source = {
    raster,
    topOffsets,
    slack,
    colorOf: (kind: number, tx: number, ty: number, out: [number, number, number]) => void farTileColor(kindOfIndex(kind), regionAt(tx, ty), tx, ty, out),
    sideOf: (kind: number, tx: number, ty: number, top: Readonly<[number, number, number]>, out: [number, number, number]) => void farSideColor(kindOfIndex(kind), regionAt(tx, ty), top, out),
    moodAt: (tx: number, ty: number): number => {
      point.x = tx;
      point.y = ty;
      const ambience = level.ambienceAt(point);
      const known = byAmbience.get(ambience);
      if (known !== undefined) return known;
      const look = moodKeyOf(ambience);
      const index = byLook.get(look) ?? (moods.length < FAR_MOOD_LIMIT ? moods.push(ambience) - 1 : 0);
      byLook.set(look, index);
      byAmbience.set(ambience, index);
      return index;
    },
  };
  const cells = createFarCells(raster, cell);
  const tiles: FarTileArrays[] = [];
  const steps: (() => void)[] = [];
  for (let row = 0; row < cells.rows; row += CELL_ROWS_PER_STEP) steps.push(() => coarsenRows(source, cells, row, row + CELL_ROWS_PER_STEP));
  for (const sector of farSectors(cells, FAR_SECTOR_TILES)) {
    steps.push(() => {
      const tile = meshFarSector(cells, sector);
      if (tile.indices.length > 0) tiles.push(tile);
    });
  }
  return { steps, result: () => ({ cell, tiles, moods }) };
}

export const farBuildTransfer = (build: FarBuild): ArrayBuffer[] => build.tiles.flatMap(farTileTransfer);
