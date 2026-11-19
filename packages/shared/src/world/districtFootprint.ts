import type { DistrictId } from '../ids.ts';
import type { TilePoint, TileRect } from './geometry.ts';
import type { ResolvedArea, ResolvedLevel } from './levelLayout.ts';
import { TILE_KINDS } from './tiles.ts';

export interface DistrictFootprint {
  readonly districtId: DistrictId;
  readonly bounds: TileRect;
  readonly label: TilePoint;
  readonly tiles: number;
}

type FootprintLevel = Pick<ResolvedLevel, 'layout' | 'districts'>;

const FOOTPRINTS = new WeakMap<object, ReadonlyMap<DistrictId, DistrictFootprint>>();

const centreOf = (rect: TileRect): TilePoint => ({ x: rect.x + Math.floor(rect.width / 2), y: rect.y + Math.floor(rect.height / 2) });

const distance = (a: TilePoint, b: TilePoint): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

interface Nearest {
  point: TilePoint | undefined;
  distance: number;
}

const nearest = (): Nearest => ({ point: undefined, distance: Infinity });

function consider(best: Nearest, point: TilePoint, centre: TilePoint): void {
  const away = distance(point, centre);
  if (away < best.distance) {
    best.point = point;
    best.distance = away;
  }
}

function tilesOf(rect: TileRect, visit: (point: TilePoint) => void): void {
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) visit({ x, y });
  }
}

function footprintOf(level: FootprintLevel, districtId: DistrictId, rect: TileRect): DistrictFootprint | undefined {
  const { layout } = level;
  const owned: TilePoint[] = [];
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  tilesOf(rect, (point) => {
    if (layout.districtAt(point) !== districtId) return;
    owned.push(point);
    left = Math.min(left, point.x);
    top = Math.min(top, point.y);
    right = Math.max(right, point.x);
    bottom = Math.max(bottom, point.y);
  });
  if (owned.length === 0) return undefined;
  const bounds = { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
  const centre = centreOf(bounds);
  const walkable = nearest();
  const any = nearest();
  for (const point of owned) {
    consider(any, point, centre);
    if (TILE_KINDS[layout.tileAt(point)].walkable) consider(walkable, point, centre);
  }
  return { districtId, bounds, label: (walkable.point ?? any.point) as TilePoint, tiles: owned.length };
}

export function footprintsOf(level: FootprintLevel): ReadonlyMap<DistrictId, DistrictFootprint> {
  const known = FOOTPRINTS.get(level.layout);
  if (known) return known;
  const footprints = new Map<DistrictId, DistrictFootprint>();
  for (const placement of level.districts) {
    const footprint = footprintOf(level, placement.districtId, placement.rect);
    if (footprint) footprints.set(placement.districtId, footprint);
  }
  FOOTPRINTS.set(level.layout, footprints);
  return footprints;
}

export function areaGoal(level: Pick<ResolvedLevel, 'layout'>, area: ResolvedArea): TilePoint {
  const { layout } = level;
  const centre = centreOf(area.rect);
  const best = nearest();
  tilesOf(area.rect, (point) => {
    if (layout.districtAt(point) === area.districtId && TILE_KINDS[layout.tileAt(point)].walkable) consider(best, point, centre);
  });
  return best.point ?? centre;
}
