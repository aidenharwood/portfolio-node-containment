import type { ConnectorId, DistrictId } from '../ids.ts';
import { trackBed } from './blueprint.ts';
import type { DistrictDefinition, ZoneAmbience } from './district.ts';
import { parseTileLayout } from './district.ts';
import { tileKey, type TilePoint } from './geometry.ts';
import type { ConnectorDefinition, DistrictPlacement } from './level.ts';

export interface TrackwayPoint {
  readonly districtId: DistrictId;
  readonly x: number;
  readonly y: number;
}

export type TrackwayWaypoint = TrackwayPoint | { readonly x: TrackwayPoint; readonly y: TrackwayPoint };

export interface TrackwayOptions {
  readonly id: ConnectorId;
  readonly name: string;
  readonly ambience: ZoneAmbience;
  readonly routes: readonly (readonly TrackwayWaypoint[])[];
}

export const trackPoint = (districtId: DistrictId, x: number, y: number): TrackwayPoint => ({ districtId, x, y });

export const trackCorner = (x: TrackwayPoint, y: TrackwayPoint): TrackwayWaypoint => ({ x, y });

const AROUND: readonly TilePoint[] = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => ({ x: dx, y: dy })));

export function drawTrackway(placements: readonly DistrictPlacement[], districts: readonly DistrictDefinition[], options: TrackwayOptions): ConnectorDefinition {
  const byId = new Map(districts.map((district) => [district.id, district]));
  const origins = new Map(placements.map((placement) => [placement.districtId, placement.origin]));
  const resolve = (point: TrackwayPoint): TilePoint => {
    const origin = origins.get(point.districtId);
    if (!origin) throw new Error(`Trackway "${options.id}" refers to unplaced district "${point.districtId}".`);
    return { x: origin.x + point.x, y: origin.y + point.y };
  };
  const levelPoint = (waypoint: TrackwayWaypoint): TilePoint =>
    'districtId' in waypoint ? resolve(waypoint) : { x: resolve(waypoint.x).x, y: resolve(waypoint.y).y };

  const solid = new Set<string>();
  for (const placement of placements) {
    const district = byId.get(placement.districtId);
    if (!district) continue;
    const layout = parseTileLayout(district.map);
    for (let y = 0; y < layout.height; y++) {
      for (let x = 0; x < layout.width; x++) {
        if (layout.tileAt({ x, y }) !== 'void') solid.add(tileKey({ x: placement.origin.x + x, y: placement.origin.y + y }));
      }
    }
  }

  const bed = new Map<string, TilePoint>();
  for (const route of options.routes) {
    for (const rect of trackBed(route.map(levelPoint))) {
      for (let y = rect.y; y < rect.y + rect.height; y++) {
        for (let x = rect.x; x < rect.x + rect.width; x++) {
          const point = { x, y };
          if (solid.has(tileKey(point))) throw new Error(`Trackway "${options.id}" runs into a district at ${x},${y}; draw that stretch in the district's blueprint.`);
          bed.set(tileKey(point), point);
        }
      }
    }
  }
  const walls = new Map<string, TilePoint>();
  for (const point of bed.values()) {
    for (const offset of AROUND) {
      const near = { x: point.x + offset.x, y: point.y + offset.y };
      const key = tileKey(near);
      if (!bed.has(key) && !solid.has(key)) walls.set(key, near);
    }
  }

  const tiles = [...bed.values(), ...walls.values()];
  const minX = Math.min(...tiles.map((tile) => tile.x));
  const minY = Math.min(...tiles.map((tile) => tile.y));
  if (minX < 0 || minY < 0) throw new Error(`Trackway "${options.id}" runs off the level at ${minX},${minY}; give joinDistricts a margin.`);
  const width = Math.max(...tiles.map((tile) => tile.x)) - minX + 1;
  const height = Math.max(...tiles.map((tile) => tile.y)) - minY + 1;
  const rows = Array.from({ length: height }, () => new Array<string>(width).fill(' '));
  for (const wall of walls.values()) (rows[wall.y - minY] as string[])[wall.x - minX] = '#';
  for (const tile of bed.values()) (rows[tile.y - minY] as string[])[tile.x - minX] = 'T';
  return {
    id: options.id,
    name: options.name,
    origin: { x: minX, y: minY },
    map: rows.map((row) => row.join('')),
    ambience: options.ambience,
    lights: [],
  };
}
