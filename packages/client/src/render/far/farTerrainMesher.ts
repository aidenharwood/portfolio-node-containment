import { CHUNK_SIZE, TILE_KIND_IDS, TILE_KINDS } from '@containment/shared';
import { FLOOR_LAYERS, STEP_HEIGHT, TILE_RESOLUTION, WALL_LAYERS, ZONE_VOXEL_SIZE } from '../world/worldScale.ts';
import { facadeStyleOf, type TowerSpot } from './facadePattern.ts';
import type { Rgb } from './farPalette.ts';
import { VOID_KIND, type SceneRaster } from './sceneRaster.ts';

export const FAR_SINK = 0.25;
export const FAR_SEA_FLOOR = -1;
export const FAR_CELL_SIZES = [1, 2, 4, 8, 16, 32] as const;
export type FarCellSize = (typeof FAR_CELL_SIZES)[number];

const WALL_SHARE = 3 / 8;
const SIDE_FOOT = 0.7;
const EDGE_EPSILON = 1e-4;
const COLOR_LEVELS = 1023;
const MAX_HEIGHT_STEPS = 32;
const STRUCTURE = TILE_KIND_IDS.map((kind) => TILE_KINDS[kind].structure);
const FACADE_STYLES = TILE_KIND_IDS.map(facadeStyleOf);
const NO_FACADE = [0, 0, 0, 0] as const;

export interface FarCells {
  readonly cell: FarCellSize;
  readonly x: number;
  readonly y: number;
  readonly columns: number;
  readonly rows: number;
  readonly tops: Float32Array;
  readonly lows: Float32Array;
  readonly colors: Float32Array;
  readonly sides: Float32Array;
  readonly moods: Uint8Array;
  readonly styles: Uint8Array;
  readonly towers: Uint8Array;
}

export interface FarCellSource {
  readonly raster: SceneRaster;
  readonly topOffsets: Float32Array;
  readonly slack: Float32Array;
  colorOf(kind: number, tx: number, ty: number, out: Rgb): void;
  sideOf(kind: number, tx: number, ty: number, top: Readonly<Rgb>, out: Rgb): void;
  moodAt(tx: number, ty: number): number;
  towerAt?(tx: number, ty: number): TowerSpot | null;
}

export interface FarRect {
  readonly column: number;
  readonly row: number;
  readonly columns: number;
  readonly rows: number;
}

export interface FarTileArrays {
  readonly positions: Float32Array;
  readonly normals: Int8Array;
  readonly colors: Uint16Array;
  readonly moods: Uint8Array;
  readonly chunks: Int16Array;
  readonly facades: Uint8Array;
  readonly indices: Uint32Array;
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

export function createFarCells(raster: SceneRaster, cell: FarCellSize): FarCells {
  const x = Math.floor(raster.x / cell) * cell;
  const y = Math.floor(raster.y / cell) * cell;
  const columns = Math.max(0, Math.ceil((raster.x + raster.width - x) / cell));
  const rows = Math.max(0, Math.ceil((raster.y + raster.height - y) / cell));
  const count = columns * rows;
  return {
    cell,
    x,
    y,
    columns,
    rows,
    tops: new Float32Array(count).fill(Number.NaN),
    lows: new Float32Array(count).fill(FAR_SEA_FLOOR),
    colors: new Float32Array(count * 3),
    sides: new Float32Array(count * 3),
    moods: new Uint8Array(count),
    styles: new Uint8Array(count),
    towers: new Uint8Array(count * 4),
  };
}

const quantize = (value: number): number => Math.round(Math.min(1, Math.max(0, value)) * COLOR_LEVELS) / COLOR_LEVELS;

export function coarsenRows(source: FarCellSource, cells: FarCells, fromRow: number, toRow: number): void {
  const { raster } = source;
  const kindCount = TILE_KIND_IDS.length;
  const wallCounts = new Uint16Array(kindCount);
  const walkCounts = new Uint16Array(kindCount);
  const walkHeights = new Uint16Array(MAX_HEIGHT_STEPS);
  const tile: Rgb = [0, 0, 0];
  const top: Rgb = [0, 0, 0];
  const side: Rgb = [0, 0, 0];
  const wallColor: Rgb = [0, 0, 0];
  const walkColor: Rgb = [0, 0, 0];
  const size = cells.cell;
  for (let row = Math.max(0, fromRow); row < Math.min(toRow, cells.rows); row++) {
    for (let column = 0; column < cells.columns; column++) {
      wallCounts.fill(0);
      walkCounts.fill(0);
      walkHeights.fill(0);
      wallColor.fill(0);
      walkColor.fill(0);
      let tiles = 0;
      let walls = 0;
      let sea = 0;
      let walkable = 0;
      let wallTop = 0;
      let tower: TowerSpot | null = null;
      let low = Infinity;
      const x0 = cells.x + column * size;
      const y0 = cells.y + row * size;
      for (let dy = 0; dy < size; dy++) {
        const ry = y0 + dy - raster.y;
        if (ry < 0 || ry >= raster.height) continue;
        for (let dx = 0; dx < size; dx++) {
          const rx = x0 + dx - raster.x;
          if (rx < 0 || rx >= raster.width) continue;
          const index = ry * raster.width + rx;
          const kind = raster.kinds[index] as number;
          if (kind === VOID_KIND) continue;
          tiles++;
          const height = Math.min(MAX_HEIGHT_STEPS - 1, raster.heights[index] as number);
          low = Math.min(low, height * STEP_HEIGHT + (source.topOffsets[kind] as number) - (source.slack[kind] as number));
          const structure = STRUCTURE[kind];
          if (structure === 'liquid' && height === 0) {
            sea++;
            continue;
          }
          source.colorOf(kind, x0 + dx, y0 + dy, tile);
          if (structure === 'wall') {
            walls++;
            wallCounts[kind]!++;
            const spot = FACADE_STYLES[kind] && source.towerAt ? source.towerAt(x0 + dx, y0 + dy) : null;
            const tileTop = spot ? (spot.roof - FLOOR_LAYERS - WALL_LAYERS + 1) * ZONE_VOXEL_SIZE : height * STEP_HEIGHT + (raster.rises[index] as number) * ZONE_VOXEL_SIZE;
            if (tileTop > wallTop) {
              wallTop = tileTop;
              tower = spot;
            }
            for (let channel = 0; channel < 3; channel++) wallColor[channel]! += tile[channel] as number;
          } else {
            walkable++;
            walkCounts[kind]!++;
            walkHeights[height]!++;
            for (let channel = 0; channel < 3; channel++) walkColor[channel]! += tile[channel] as number;
          }
        }
      }
      const at = row * cells.columns + column;
      cells.tops[at] = Number.NaN;
      cells.styles[at] = 0;
      cells.towers.fill(0, at * 4, at * 4 + 4);
      cells.lows[at] = tiles === 0 ? FAR_SEA_FLOOR : low;
      if (tiles === 0) continue;
      const wallCell = walls > 0 && walls >= tiles * WALL_SHARE;
      if (!wallCell && (sea * 2 > tiles || walkable === 0)) continue;
      const counts = wallCell ? wallCounts : walkCounts;
      let kind = 0;
      for (let candidate = 1; candidate < kindCount; candidate++) if ((counts[candidate] as number) > (counts[kind] as number)) kind = candidate;
      const base = wallCell ? wallTop : medianOf(walkHeights, walkable) * STEP_HEIGHT;
      const sum = wallCell ? wallColor : walkColor;
      const share = wallCell ? walls : walkable;
      for (let channel = 0; channel < 3; channel++) top[channel] = quantize((sum[channel] as number) / share);
      const centreX = x0 + Math.floor(size / 2);
      const centreY = y0 + Math.floor(size / 2);
      source.sideOf(kind, centreX, centreY, top, side);
      cells.tops[at] = base + (source.topOffsets[kind] as number) - FAR_SINK;
      for (let channel = 0; channel < 3; channel++) {
        cells.colors[at * 3 + channel] = top[channel] as number;
        cells.sides[at * 3 + channel] = quantize(side[channel] as number);
      }
      cells.moods[at] = source.moodAt(centreX, centreY);
      cells.styles[at] = wallCell ? (FACADE_STYLES[kind] as number) : 0;
      if (wallCell && tower) cells.towers.set([tower.top, tower.street + FLOOR_LAYERS, (tower.roof - tower.top) / TILE_RESOLUTION, tower.crown], at * 4);
    }
  }
}

function medianOf(histogram: Uint16Array, count: number): number {
  const middle = Math.floor((count - 1) / 2);
  let seen = 0;
  for (let height = 0; height < histogram.length; height++) {
    seen += histogram[height] as number;
    if (seen > middle) return height;
  }
  return 0;
}

const inside = (cells: FarCells, column: number, row: number): boolean => column >= 0 && row >= 0 && column < cells.columns && row < cells.rows;

export function farTopAt(cells: FarCells, column: number, row: number): number {
  if (!inside(cells, column, row)) return FAR_SEA_FLOOR;
  const top = cells.tops[row * cells.columns + column] as number;
  return Number.isNaN(top) ? FAR_SEA_FLOOR : top;
}

export function farLowAt(cells: FarCells, column: number, row: number): number {
  if (!inside(cells, column, row)) return FAR_SEA_FLOOR;
  return cells.lows[row * cells.columns + column] as number;
}

export function farSectors(cells: FarCells, sectorTiles: number): FarRect[] {
  const span = Math.max(1, Math.round(sectorTiles / cells.cell));
  const sectors: FarRect[] = [];
  for (let row = 0; row < cells.rows; row += span) {
    for (let column = 0; column < cells.columns; column += span) sectors.push({ column, row, columns: Math.min(span, cells.columns - column), rows: Math.min(span, cells.rows - row) });
  }
  return sectors;
}

type Corner = readonly [number, number, number];

class QuadWriter {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly colors: number[] = [];
  private readonly moods: number[] = [];
  private readonly chunks: number[] = [];
  private readonly facades: number[] = [];
  private readonly indices: number[] = [];
  private readonly min: [number, number, number] = [Infinity, Infinity, Infinity];
  private readonly max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  quad(corners: readonly [Corner, Corner, Corner, Corner], normal: readonly [number, number, number], color: ArrayLike<number>, offset: number, footShade: number, mood: number, chunkX: number, chunkY: number, feet: readonly boolean[], facade: readonly number[] = NO_FACADE): void {
    const start = this.positions.length / 3;
    corners.forEach((corner, index) => {
      this.positions.push(corner[0], corner[1], corner[2]);
      for (let axis = 0; axis < 3; axis++) {
        this.min[axis] = Math.min(this.min[axis] as number, corner[axis] as number);
        this.max[axis] = Math.max(this.max[axis] as number, corner[axis] as number);
      }
      this.normals.push(normal[0] * 127, normal[1] * 127, normal[2] * 127);
      const shade = feet[index] ? footShade : 1;
      for (let channel = 0; channel < 3; channel++) this.colors.push(Math.round(Math.min(1, (color[offset + channel] as number) * shade) * 65535));
      this.moods.push(mood);
      this.chunks.push(chunkX, chunkY);
      this.facades.push(facade[0] as number, facade[1] as number, facade[2] as number, facade[3] as number);
    });
    this.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }

  arrays(): FarTileArrays {
    const empty = this.positions.length === 0;
    return {
      positions: new Float32Array(this.positions),
      normals: new Int8Array(this.normals),
      colors: new Uint16Array(this.colors),
      moods: new Uint8Array(this.moods),
      chunks: new Int16Array(this.chunks),
      facades: new Uint8Array(this.facades),
      indices: new Uint32Array(this.indices),
      min: empty ? [0, 0, 0] : [...this.min],
      max: empty ? [0, 0, 0] : [...this.max],
    };
  }
}

const FLAT = [false, false, false, false] as const;
const FEET = [true, false, false, true] as const;
const UP = [0, 1, 0] as const;
const SIDES = [
  { dx: 1, dy: 0, normal: [1, 0, 0], a: [1, 0], b: [1, 1] },
  { dx: -1, dy: 0, normal: [-1, 0, 0], a: [0, 1], b: [0, 0] },
  { dx: 0, dy: 1, normal: [0, 0, 1], a: [1, 1], b: [0, 1] },
  { dx: 0, dy: -1, normal: [0, 0, -1], a: [0, 0], b: [1, 0] },
] as const;

const sameTop = (cells: FarCells, a: number, b: number): boolean =>
  cells.tops[a] === cells.tops[b] && cells.moods[a] === cells.moods[b] && cells.colors[a * 3] === cells.colors[b * 3] && cells.colors[a * 3 + 1] === cells.colors[b * 3 + 1] && cells.colors[a * 3 + 2] === cells.colors[b * 3 + 2];

export const chunkOfTile = (tile: number): number => Math.floor(tile / CHUNK_SIZE);

export const facadeVoxel = (top: number): number => Math.max(0, Math.min(250, Math.round((top + FAR_SINK) * TILE_RESOLUTION)));

export function meshFarSector(cells: FarCells, rect: FarRect): FarTileArrays {
  const writer = new QuadWriter();
  const size = cells.cell;
  const chunkOfColumn = (column: number): number => chunkOfTile(cells.x + column * size);
  const chunkOfRow = (row: number): number => chunkOfTile(cells.y + row * size);
  for (let row = rect.row; row < rect.row + rect.rows; row++) {
    const north = cells.y + row * size - 0.5;
    const south = north + size;
    let column = rect.column;
    while (column < rect.column + rect.columns) {
      const at = row * cells.columns + column;
      const top = cells.tops[at] as number;
      if (Number.isNaN(top)) {
        column++;
        continue;
      }
      let end = column + 1;
      while (end < rect.column + rect.columns && chunkOfColumn(end) === chunkOfColumn(column) && sameTop(cells, at, row * cells.columns + end)) end++;
      const west = cells.x + column * size - 0.5;
      const east = cells.x + end * size - 0.5;
      writer.quad([[west, top, north], [west, top, south], [east, top, south], [east, top, north]], UP, cells.colors, at * 3, 1, cells.moods[at] as number, chunkOfColumn(column), chunkOfRow(row), FLAT);
      column = end;
    }
    for (let column = rect.column; column < rect.column + rect.columns; column++) {
      const at = row * cells.columns + column;
      const top = cells.tops[at] as number;
      if (Number.isNaN(top)) continue;
      const west = cells.x + column * size - 0.5;
      for (const side of SIDES) {
        const nextColumn = column + side.dx;
        const nextRow = row + side.dy;
        const seam = chunkOfColumn(nextColumn) !== chunkOfColumn(column) || chunkOfRow(nextRow) !== chunkOfRow(row);
        const neighbour = farTopAt(cells, nextColumn, nextRow);
        const below = seam ? Math.min(neighbour, farLowAt(cells, nextColumn, nextRow)) : neighbour;
        if (below >= top - EDGE_EPSILON) continue;
        const ax = west + side.a[0] * size;
        const az = north + side.a[1] * size;
        const bx = west + side.b[0] * size;
        const bz = north + side.b[1] * size;
        const style = cells.styles[at] as number;
        const storeys = cells.towers[at * 4 + 2] as number;
        const facade = style === 0 ? NO_FACADE : storeys > 0 ? [style + 8 * (cells.towers[at * 4 + 3] as number), cells.towers[at * 4] as number, cells.towers[at * 4 + 1] as number, storeys] : [style, facadeVoxel(top) + 1, facadeVoxel(neighbour) + FLOOR_LAYERS, 0];
        writer.quad([[ax, below, az], [ax, top, az], [bx, top, bz], [bx, below, bz]], side.normal, cells.sides, at * 3, SIDE_FOOT, cells.moods[at] as number, chunkOfColumn(column), chunkOfRow(row), FEET, facade);
      }
    }
  }
  return writer.arrays();
}

export const farTileTransfer = (tile: FarTileArrays): ArrayBuffer[] => [tile.positions.buffer, tile.normals.buffer, tile.colors.buffer, tile.moods.buffer, tile.chunks.buffer, tile.facades.buffer, tile.indices.buffer] as ArrayBuffer[];
