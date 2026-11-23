import type { RegionId } from '../ids.ts';
import { findCliffs, isInsideShape, rampHeightAt, type BlueprintBase, type ExitSide, type RoomShape } from './blueprint.ts';
import type { TileLayout } from './district.ts';
import { parseLandPlan } from './landSchema.ts';
import { fractalNoise, fractalNoiseGrid } from './noise.ts';
import type { TilePoint, TileRect } from './geometry.ts';
import { TILE_KINDS, type TileKindId } from './tiles.ts';

export const LAND_GROUND_ROOM = 'ground';

export type LandShape =
  | { readonly kind: RoomShape; readonly rect: TileRect }
  | { readonly kind: 'polygon'; readonly points: readonly TilePoint[] };

export type LandStep =
  | { readonly kind: 'fill'; readonly shape: LandShape; readonly tile: TileKindId }
  | { readonly kind: 'line'; readonly points: readonly TilePoint[]; readonly width: number; readonly tile: TileKindId }
  | { readonly kind: 'rise'; readonly shape: LandShape; readonly height: number }
  | { readonly kind: 'ramp'; readonly rect: TileRect; readonly side: ExitSide; readonly from: number; readonly to: number }
  | { readonly kind: 'ward'; readonly shape: LandShape; readonly ward: RegionId }
  | { readonly kind: 'gate'; readonly id: string; readonly rect: TileRect; readonly tile: TileKindId }
  | { readonly kind: 'relief'; readonly shape: LandShape; readonly seed: number; readonly low: number; readonly high: number; readonly scale: number }
  | { readonly kind: 'soften'; readonly shape: LandShape };

export interface LandOrigin {
  readonly column: number;
  readonly row: number;
}

export interface LandPlan {
  readonly id: string;
  readonly squareSize: number;
  readonly columns: number;
  readonly rows: number;
  readonly origin?: LandOrigin;
  readonly steps: readonly LandStep[];
}

export interface LandSquare {
  readonly column: number;
  readonly row: number;
  readonly split?: boolean;
}

export interface LandMap extends TileLayout {
  readonly plan: LandPlan;
  wardAt(point: TilePoint): RegionId | undefined;
  readonly gates: Readonly<Record<string, readonly TilePoint[]>>;
}

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

type Paint = (x: number, y: number) => void;

const LINE_TOLERANCE = 1e-9;
const MAX_WARDS = 255;
const MAX_HEIGHT = 15;

const NO_ORIGIN: LandOrigin = { column: 0, row: 0 };

export const landOriginSquare = (plan: Pick<LandPlan, 'origin'>): LandOrigin => plan.origin ?? NO_ORIGIN;

export function landOrigin(plan: Pick<LandPlan, 'origin' | 'squareSize'>): TilePoint {
  const { column, row } = landOriginSquare(plan);
  return { x: column * plan.squareSize, y: row * plan.squareSize };
}

export const worldTileOf = (plan: Pick<LandPlan, 'origin' | 'squareSize'>, local: TilePoint): TilePoint => {
  const origin = landOrigin(plan);
  return { x: local.x + origin.x, y: local.y + origin.y };
};

export const localTileOf = (plan: Pick<LandPlan, 'origin' | 'squareSize'>, world: TilePoint): TilePoint => {
  const origin = landOrigin(plan);
  return { x: world.x - origin.x, y: world.y - origin.y };
};

export function localSquareOf(plan: LandPlan, square: Pick<LandSquare, 'column' | 'row'>): { readonly column: number; readonly row: number } | undefined {
  const origin = landOriginSquare(plan);
  const column = square.column - origin.column;
  const row = square.row - origin.row;
  return Number.isInteger(column) && Number.isInteger(row) && column >= 0 && row >= 0 && column < plan.columns && row < plan.rows ? { column, row } : undefined;
}

export function describeLandExtent(plan: LandPlan, noun: string = 'plan'): string {
  const origin = landOriginSquare(plan);
  const at = origin.column === 0 && origin.row === 0 ? '' : ` from square ${origin.column},${origin.row}`;
  return `the ${plan.columns}x${plan.rows} ${noun}${at}`;
}

const shiftPoint = (point: TilePoint, by: TilePoint): TilePoint => ({ x: point.x - by.x, y: point.y - by.y });
const shiftRect = (rect: TileRect, by: TilePoint): TileRect => ({ ...rect, x: rect.x - by.x, y: rect.y - by.y });
const shiftShape = (shape: LandShape, by: TilePoint): LandShape =>
  shape.kind === 'polygon' ? { kind: 'polygon', points: shape.points.map((point) => shiftPoint(point, by)) } : { kind: shape.kind, rect: shiftRect(shape.rect, by) };

const rectBounds = (rect: TileRect): Bounds => ({ left: rect.x, top: rect.y, right: rect.x + rect.width, bottom: rect.y + rect.height });

function visitBounds(bounds: Bounds, width: number, height: number, covers: (x: number, y: number) => boolean, paint: Paint): void {
  for (let y = Math.max(0, bounds.top); y < Math.min(height, bounds.bottom); y++) {
    for (let x = Math.max(0, bounds.left); x < Math.min(width, bounds.right); x++) {
      if (covers(x, y)) paint(x, y);
    }
  }
}

function fillPolygon(points: readonly TilePoint[], width: number, height: number, paint: Paint): void {
  const ys = points.map((point) => point.y);
  const crossings: number[] = [];
  for (let y = Math.max(0, Math.min(...ys)); y < Math.min(height, Math.max(...ys)); y++) {
    const centre = y + 0.5;
    crossings.length = 0;
    for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
      const a = points[index] as TilePoint;
      const b = points[previous] as TilePoint;
      if (a.y > centre !== b.y > centre) crossings.push(((b.x - a.x) * (centre - a.y)) / (b.y - a.y) + a.x);
    }
    crossings.sort((first, second) => first - second);
    for (let index = 0; index + 1 < crossings.length; index += 2) {
      const from = Math.max(0, Math.ceil((crossings[index] as number) - 0.5));
      const to = Math.min(width, Math.ceil((crossings[index + 1] as number) - 0.5));
      for (let x = from; x < to; x++) paint(x, y);
    }
  }
}

function paintShape(shape: LandShape, width: number, height: number, paint: Paint): void {
  if (shape.kind === 'polygon') fillPolygon(shape.points, width, height, paint);
  else visitBounds(rectBounds(shape.rect), width, height, (x, y) => isInsideShape(shape.kind, shape.rect, { x, y }), paint);
}

function segmentMeetsBox(a: TilePoint, b: TilePoint, centreX: number, centreY: number, reach: number): boolean {
  let enter = 0;
  let leave = 1;
  for (const [start, delta, centre] of [
    [a.x, b.x - a.x, centreX],
    [a.y, b.y - a.y, centreY],
  ] as const) {
    const low = centre - reach - start;
    const high = centre + reach - start;
    if (delta === 0) {
      if (low > 0 || high < 0) return false;
      continue;
    }
    const first = low / delta;
    const second = high / delta;
    enter = Math.max(enter, Math.min(first, second));
    leave = Math.min(leave, Math.max(first, second));
    if (enter > leave) return false;
  }
  return true;
}

function paintLine(points: readonly TilePoint[], lineWidth: number, width: number, height: number, paint: Paint): void {
  const reach = lineWidth / 2 + LINE_TOLERANCE;
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1] as TilePoint;
    const b = points[index] as TilePoint;
    const bounds = {
      left: Math.floor(Math.min(a.x, b.x) - reach),
      top: Math.floor(Math.min(a.y, b.y) - reach),
      right: Math.ceil(Math.max(a.x, b.x) + reach) + 1,
      bottom: Math.ceil(Math.max(a.y, b.y) + reach) + 1,
    };
    visitBounds(bounds, width, height, (x, y) => segmentMeetsBox(a, b, x, y, reach), paint);
  }
}

function softenHeights(shape: LandShape, width: number, height: number, heights: Uint8Array, tiles: readonly TileKindId[]): void {
  const mask = new Uint8Array(width * height);
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  paintShape(shape, width, height, (x, y) => {
    if (!TILE_KINDS[tiles[y * width + x] as TileKindId].walkable) return;
    mask[y * width + x] = 1;
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  });
  if (right < 0) return;
  const relax = (x: number, y: number): boolean => {
    const index = y * width + x;
    let lowest = heights[index] as number;
    for (let ny = Math.max(0, y - 1); ny <= Math.min(height - 1, y + 1); ny++) {
      for (let nx = Math.max(0, x - 1); nx <= Math.min(width - 1, x + 1); nx++) {
        lowest = Math.min(lowest, (heights[ny * width + nx] as number) + 1);
      }
    }
    if (lowest >= (heights[index] as number)) return false;
    heights[index] = lowest;
    return true;
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) if (mask[y * width + x] === 1 && relax(x, y)) changed = true;
    }
    for (let y = bottom; y >= top; y--) {
      for (let x = right; x >= left; x--) if (mask[y * width + x] === 1 && relax(x, y)) changed = true;
    }
  }
}

export const reliefNoise = (seed: number, x: number, y: number, scale: number): number => fractalNoise(seed, x / scale, y / scale);

type ReliefStep = Pick<Extract<LandStep, { kind: 'relief' }>, 'seed' | 'low' | 'high' | 'scale'>;

const reliefLevel = (step: ReliefStep, noise: number): number => {
  const level = Math.round(step.low + (step.high - step.low) * noise);
  return level < 0 ? 0 : level > MAX_HEIGHT ? MAX_HEIGHT : level;
};

export const reliefHeight = (step: ReliefStep, x: number, y: number): number => reliefLevel(step, reliefNoise(step.seed, x, y, step.scale));

function shapeBounds(shape: LandShape, width: number, height: number): Bounds {
  const points = shape.kind === 'polygon' ? shape.points : [{ x: shape.rect.x, y: shape.rect.y }, { x: shape.rect.x + shape.rect.width, y: shape.rect.y + shape.rect.height }];
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return { left: Math.max(0, Math.min(...xs)), top: Math.max(0, Math.min(...ys)), right: Math.min(width, Math.max(...xs) + 1), bottom: Math.min(height, Math.max(...ys) + 1) };
}

export function drawLand(source: LandPlan): LandMap {
  const plan = parseLandPlan(source);
  const { id, squareSize, columns, rows } = plan;
  const origin = landOrigin(plan);
  const width = columns * squareSize;
  const height = rows * squareSize;
  const tiles: TileKindId[] = new Array<TileKindId>(width * height).fill('void');
  const heights = new Uint8Array(width * height);
  const wards = new Uint8Array(width * height);
  const wardNames: RegionId[] = [];
  const gates: Record<string, readonly TilePoint[]> = Object.create(null);

  const indexOf = (point: TilePoint): number =>
    point.x < 0 || point.y < 0 || point.x >= width || point.y >= height || !Number.isInteger(point.x) || !Number.isInteger(point.y) ? -1 : point.y * width + point.x;

  const wardIndex = (ward: RegionId, fail: (reason: string) => never): number => {
    const known = wardNames.indexOf(ward);
    if (known >= 0) return known + 1;
    if (wardNames.length >= MAX_WARDS) fail(`ward "${ward}" is one more than the ${MAX_WARDS} wards a plan can hold`);
    wardNames.push(ward);
    return wardNames.length;
  };

  plan.steps.forEach((step, stepIndex) => {
    const fail = (reason: string): never => {
      throw new Error(`land ${id}: steps[${stepIndex}]: ${reason}`);
    };
    if (step.kind === 'fill') {
      paintShape(shiftShape(step.shape, origin), width, height, (x, y) => (tiles[y * width + x] = step.tile));
    } else if (step.kind === 'line') {
      paintLine(step.points.map((point) => shiftPoint(point, origin)), step.width, width, height, (x, y) => (tiles[y * width + x] = step.tile));
    } else if (step.kind === 'rise') {
      paintShape(shiftShape(step.shape, origin), width, height, (x, y) => (heights[y * width + x] = step.height));
    } else if (step.kind === 'relief') {
      const shape = shiftShape(step.shape, origin);
      const bounds = shapeBounds(shape, width, height);
      if (bounds.left < bounds.right && bounds.top < bounds.bottom) {
        const noise = fractalNoiseGrid(step.seed, step.scale, bounds.left + origin.x, bounds.top + origin.y, bounds.right + origin.x, bounds.bottom + origin.y);
        paintShape(shape, width, height, (x, y) => (heights[y * width + x] = reliefLevel(step, noise(x + origin.x, y + origin.y))));
      }
    } else if (step.kind === 'soften') {
      softenHeights(shiftShape(step.shape, origin), width, height, heights, tiles);
    } else if (step.kind === 'ramp') {
      const ramp = { ...step, rect: shiftRect(step.rect, origin) };
      try {
        rampHeightAt(ramp, { x: ramp.rect.x, y: ramp.rect.y });
      } catch (error) {
        fail((error as Error).message);
      }
      visitBounds(rectBounds(ramp.rect), width, height, () => true, (x, y) => (heights[y * width + x] = rampHeightAt(ramp, { x, y })));
    } else if (step.kind === 'ward') {
      const ward = wardIndex(step.ward, fail);
      paintShape(shiftShape(step.shape, origin), width, height, (x, y) => (wards[y * width + x] = ward));
    } else {
      const rect = shiftRect(step.rect, origin);
      if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > width || rect.y + rect.height > height) {
        fail(`gate "${step.id}" at ${step.rect.x},${step.rect.y} ${step.rect.width}x${step.rect.height} is outside the ${width}x${height} plan${origin.x === 0 && origin.y === 0 ? '' : ` that starts at ${origin.x},${origin.y}`}`);
      }
      if (Object.hasOwn(gates, step.id)) fail(`gate "${step.id}" is named twice`);
      const covered: TilePoint[] = [];
      for (let y = rect.y; y < rect.y + rect.height; y++) {
        for (let x = rect.x; x < rect.x + rect.width; x++) {
          tiles[y * width + x] = step.tile;
          covered.push({ x, y });
        }
      }
      gates[step.id] = covered;
    }
  });

  const tileAt = (point: TilePoint): TileKindId => {
    const index = indexOf(point);
    return index < 0 ? 'void' : (tiles[index] as TileKindId);
  };
  const heightAt = (point: TilePoint): number => {
    const index = indexOf(point);
    return index < 0 ? 0 : (heights[index] as number);
  };

  const cliffs = findCliffs(width, height, (point) => TILE_KINDS[tileAt(point)].walkable, heightAt);
  for (const cliff of cliffs) tiles[cliff.y * width + cliff.x] = 'cliff';

  return {
    plan,
    width,
    height,
    gates,
    tileAt,
    heightAt,
    wardAt: (point) => {
      const index = indexOf(point);
      const ward = index < 0 ? 0 : (wards[index] as number);
      return ward === 0 ? undefined : wardNames[ward - 1];
    },
  };
}

function squareChanged(before: LandMap, after: LandMap, column: number, row: number): boolean {
  const { squareSize } = after.plan;
  for (let y = row * squareSize; y < (row + 1) * squareSize; y++) {
    for (let x = column * squareSize; x < (column + 1) * squareSize; x++) {
      const point = { x, y };
      if (before.tileAt(point) !== after.tileAt(point) || before.heightAt(point) !== after.heightAt(point) || before.wardAt(point) !== after.wardAt(point)) return true;
    }
  }
  return false;
}

export function changedSquares(before: LandMap, after: LandMap): LandSquare[] {
  const { squareSize, columns, rows } = after.plan;
  const origin = landOriginSquare(after.plan);
  const was = landOriginSquare(before.plan);
  const reshaped = before.plan.squareSize !== squareSize || before.plan.columns !== columns || before.plan.rows !== rows || was.column !== origin.column || was.row !== origin.row;
  const changed: LandSquare[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      if (reshaped || squareChanged(before, after, column, row)) changed.push({ column: column + origin.column, row: row + origin.row });
    }
  }
  return changed;
}

export function cutSquare(land: LandMap, square: LandSquare, ward?: RegionId): BlueprintBase {
  const { id, squareSize } = land.plan;
  const local = localSquareOf(land.plan, square);
  if (!local) throw new Error(`land ${id}: square ${square.column},${square.row} is outside ${describeLandExtent(land.plan)}`);
  const { column, row } = local;
  const tiles: TileKindId[] = [];
  const heights: number[] = [];
  for (let y = 0; y < squareSize; y++) {
    for (let x = 0; x < squareSize; x++) {
      const point = { x: column * squareSize + x, y: row * squareSize + y };
      const kept = ward === undefined || land.wardAt(point) === ward;
      tiles.push(kept ? land.tileAt(point) : 'void');
      heights.push(kept ? land.heightAt(point) : 0);
    }
  }
  return { tiles, heights, rooms: { [LAND_GROUND_ROOM]: { x: 0, y: 0, width: squareSize, height: squareSize } } };
}
