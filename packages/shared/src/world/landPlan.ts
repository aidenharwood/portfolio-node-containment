import type { RegionId } from '../ids.ts';
import { findCliffs, isInsideShape, rampHeightAt, type BlueprintBase, type ExitSide, type RoomShape } from './blueprint.ts';
import type { TileLayout } from './district.ts';
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
  | { readonly kind: 'gate'; readonly id: string; readonly rect: TileRect; readonly tile: TileKindId };

export interface LandPlan {
  readonly id: string;
  readonly squareSize: number;
  readonly columns: number;
  readonly rows: number;
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

interface Coverage {
  readonly bounds: Bounds;
  covers(x: number, y: number): boolean;
}

const LINE_TOLERANCE = 1e-9;

const rectBounds = (rect: TileRect): Bounds => ({ left: rect.x, top: rect.y, right: rect.x + rect.width, bottom: rect.y + rect.height });

const insidePolygon = (points: readonly TilePoint[], x: number, y: number): boolean => {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const a = points[index] as TilePoint;
    const b = points[previous] as TilePoint;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
};

const distanceToSegment = (a: TilePoint, b: TilePoint, x: number, y: number): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const along = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared));
  return Math.hypot(x - (a.x + along * dx), y - (a.y + along * dy));
};

function shapeCoverage(shape: LandShape): Coverage {
  if (shape.kind === 'polygon') {
    const xs = shape.points.map((point) => point.x);
    const ys = shape.points.map((point) => point.y);
    return {
      bounds: { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) },
      covers: (x, y) => insidePolygon(shape.points, x + 0.5, y + 0.5),
    };
  }
  return { bounds: rectBounds(shape.rect), covers: (x, y) => isInsideShape(shape.kind, shape.rect, { x, y }) };
}

function lineCoverage(points: readonly TilePoint[], width: number): Coverage {
  const reach = width / 2 + LINE_TOLERANCE;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    bounds: { left: Math.floor(Math.min(...xs) - reach), top: Math.floor(Math.min(...ys) - reach), right: Math.ceil(Math.max(...xs) + reach) + 1, bottom: Math.ceil(Math.max(...ys) + reach) + 1 },
    covers: (x, y) => {
      for (let index = 1; index < points.length; index++) {
        if (distanceToSegment(points[index - 1] as TilePoint, points[index] as TilePoint, x, y) <= reach) return true;
      }
      return false;
    },
  };
}

export function drawLand(plan: LandPlan): LandMap {
  const { id, squareSize, columns, rows } = plan;
  const width = columns * squareSize;
  const height = rows * squareSize;
  const tiles: TileKindId[] = new Array<TileKindId>(width * height).fill('void');
  const heights = new Uint8Array(width * height);
  const wards = new Uint8Array(width * height);
  const wardNames: RegionId[] = [];
  const gates: Record<string, readonly TilePoint[]> = {};

  const indexOf = (point: TilePoint): number =>
    point.x < 0 || point.y < 0 || point.x >= width || point.y >= height || !Number.isInteger(point.x) || !Number.isInteger(point.y) ? -1 : point.y * width + point.x;

  const visit = (bounds: Bounds, covers: (x: number, y: number) => boolean, paint: (index: number) => void): void => {
    for (let y = Math.max(0, bounds.top); y < Math.min(height, bounds.bottom); y++) {
      for (let x = Math.max(0, bounds.left); x < Math.min(width, bounds.right); x++) {
        if (covers(x, y)) paint(y * width + x);
      }
    }
  };

  const wardIndex = (ward: RegionId): number => {
    const known = wardNames.indexOf(ward);
    if (known >= 0) return known + 1;
    wardNames.push(ward);
    return wardNames.length;
  };

  plan.steps.forEach((step, stepIndex) => {
    const fail = (reason: string): never => {
      throw new Error(`land ${id}: steps[${stepIndex}]: ${reason}`);
    };
    if (step.kind === 'fill') {
      const { bounds, covers } = shapeCoverage(step.shape);
      visit(bounds, covers, (index) => (tiles[index] = step.tile));
    } else if (step.kind === 'line') {
      const { bounds, covers } = lineCoverage(step.points, step.width);
      visit(bounds, covers, (index) => (tiles[index] = step.tile));
    } else if (step.kind === 'rise') {
      const { bounds, covers } = shapeCoverage(step.shape);
      visit(bounds, covers, (index) => (heights[index] = step.height));
    } else if (step.kind === 'ramp') {
      try {
        rampHeightAt(step, { x: step.rect.x, y: step.rect.y });
      } catch (error) {
        fail((error as Error).message);
      }
      visit(rectBounds(step.rect), () => true, (index) => (heights[index] = rampHeightAt(step, { x: index % width, y: Math.floor(index / width) })));
    } else if (step.kind === 'ward') {
      const { bounds, covers } = shapeCoverage(step.shape);
      const ward = wardIndex(step.ward);
      visit(bounds, covers, (index) => (wards[index] = ward));
    } else {
      const { rect } = step;
      if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > width || rect.y + rect.height > height) {
        fail(`gate "${step.id}" at ${rect.x},${rect.y} ${rect.width}x${rect.height} is outside the ${width}x${height} plan`);
      }
      if (gates[step.id]) fail(`gate "${step.id}" is named twice`);
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

export function cutSquare(land: LandMap, square: LandSquare, ward?: RegionId): BlueprintBase {
  const { id, squareSize, columns, rows } = land.plan;
  const { column, row } = square;
  if (!Number.isInteger(column) || !Number.isInteger(row) || column < 0 || row < 0 || column >= columns || row >= rows) {
    throw new Error(`land ${id}: square ${column},${row} is outside the ${columns}x${rows} plan`);
  }
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
