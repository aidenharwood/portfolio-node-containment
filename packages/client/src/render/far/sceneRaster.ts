import { TILE_KIND_IDS, type SceneLayout, type TileKindId, type TilePoint, type TileRect } from '@containment/shared';

export interface SceneRaster {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly kinds: Uint8Array;
  readonly heights: Uint8Array;
}

const KIND_INDEX: ReadonlyMap<TileKindId, number> = new Map(TILE_KIND_IDS.map((kind, index) => [kind, index]));
export const VOID_KIND = KIND_INDEX.get('void') ?? 0;

export const kindIndexOf = (kind: TileKindId): number => KIND_INDEX.get(kind) ?? VOID_KIND;

export const kindOfIndex = (index: number): TileKindId => TILE_KIND_IDS[index] ?? 'void';

export function createSceneRaster(bounds: TileRect): SceneRaster {
  const size = Math.max(0, bounds.width) * Math.max(0, bounds.height);
  return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, kinds: new Uint8Array(size), heights: new Uint8Array(size) };
}

export function rasterizeRows(scene: SceneLayout, raster: SceneRaster, fromRow: number, toRow: number): void {
  const point = { x: 0, y: 0 };
  const last = Math.min(toRow, raster.height);
  for (let row = Math.max(0, fromRow); row < last; row++) {
    point.y = raster.y + row;
    let index = row * raster.width;
    for (let column = 0; column < raster.width; column++, index++) {
      point.x = raster.x + column;
      const kind = scene.tileAt(point);
      raster.kinds[index] = kindIndexOf(kind);
      raster.heights[index] = kind === 'void' ? 0 : scene.heightAt(point);
    }
  }
}

export function rasterizeScene(scene: SceneLayout): SceneRaster {
  const raster = createSceneRaster(scene.bounds);
  rasterizeRows(scene, raster, 0, raster.height);
  return raster;
}

export function rasterIndexAt(raster: SceneRaster, x: number, y: number): number {
  const column = x - raster.x;
  const row = y - raster.y;
  if (column < 0 || row < 0 || column >= raster.width || row >= raster.height) return -1;
  return row * raster.width + column;
}

export function rasterKindAt(raster: SceneRaster, x: number, y: number): TileKindId {
  const index = rasterIndexAt(raster, x, y);
  return index < 0 ? 'void' : kindOfIndex(raster.kinds[index] ?? VOID_KIND);
}

export function rasterHeightAt(raster: SceneRaster, x: number, y: number): number {
  const index = rasterIndexAt(raster, x, y);
  return index < 0 ? 0 : (raster.heights[index] ?? 0);
}

export function rasterLayout(raster: SceneRaster): SceneLayout {
  return {
    width: raster.x + raster.width,
    height: raster.y + raster.height,
    bounds: { x: raster.x, y: raster.y, width: raster.width, height: raster.height },
    tileAt: ({ x, y }: TilePoint) => rasterKindAt(raster, x, y),
    heightAt: ({ x, y }: TilePoint) => rasterHeightAt(raster, x, y),
  };
}

export const rasterTransfer = (raster: SceneRaster): Transferable[] => [raster.kinds.buffer, raster.heights.buffer];

export interface Plan<T> {
  readonly steps: readonly (() => void)[];
  result(): T;
}

export function runPlan<T>(plan: Plan<T>): T {
  for (const step of plan.steps) step();
  return plan.result();
}

const RASTER_ROWS_PER_STEP = 32;

export function planSceneRaster(scene: SceneLayout): Plan<SceneRaster> {
  const raster = createSceneRaster(scene.bounds);
  const steps: (() => void)[] = [];
  for (let row = 0; row < raster.height; row += RASTER_ROWS_PER_STEP) steps.push(() => rasterizeRows(scene, raster, row, row + RASTER_ROWS_PER_STEP));
  return { steps, result: () => raster };
}
