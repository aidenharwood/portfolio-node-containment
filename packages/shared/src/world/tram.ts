import type { AreaId, DistrictId, LevelId, TramLineId, TramStationId } from '../ids.ts';
import { rectContains, type TilePoint, type TileRect } from './geometry.ts';

export interface TramStationDefinition {
  readonly id: TramStationId;
  readonly name: string;
  readonly districtId: DistrictId;
  readonly areaId: AreaId;
  readonly platform: TilePoint;
}

export interface TramLineDefinition {
  readonly id: TramLineId;
  readonly name: string;
  readonly color: string;
  readonly stations: readonly TramStationId[];
}

export interface TramStation extends TramStationDefinition {
  readonly levelId: LevelId;
  readonly platformPoint: TilePoint;
  readonly area: TileRect;
  readonly lineIds: readonly TramLineId[];
}

export interface TramNetwork {
  readonly stations: ReadonlyMap<TramStationId, TramStation>;
  readonly lines: ReadonlyMap<TramLineId, TramLineDefinition>;
}

export const TRAM_BOARDING_TICKS = 4;
export const TRAM_MIN_RIDE_TICKS = 10;
export const TRAM_TICKS_PER_STOP = 2;

export const tramStationFlag = (stationId: TramStationId): string => `tram:${stationId}`;

export const tramRideTicks = (stops: number): number => Math.max(TRAM_MIN_RIDE_TICKS, stops * TRAM_TICKS_PER_STOP);

export function stationAt(network: TramNetwork, levelId: LevelId, point: TilePoint): TramStation | undefined {
  for (const station of network.stations.values()) {
    if (station.levelId === levelId && rectContains(station.area, point)) return station;
  }
  return undefined;
}

function neighboursOf(network: TramNetwork, stationId: TramStationId): TramStationId[] {
  const neighbours: TramStationId[] = [];
  for (const line of network.lines.values()) {
    const index = line.stations.indexOf(stationId);
    if (index < 0) continue;
    const before = line.stations[index - 1];
    const after = line.stations[index + 1];
    if (before) neighbours.push(before);
    if (after) neighbours.push(after);
  }
  return neighbours;
}

export function tramStops(network: TramNetwork, from: TramStationId, to: TramStationId): number | null {
  if (!network.stations.has(from) || !network.stations.has(to)) return null;
  const distance = new Map<TramStationId, number>([[from, 0]]);
  const queue: TramStationId[] = [from];
  while (queue.length > 0) {
    const current = queue.shift() as TramStationId;
    const travelled = distance.get(current) as number;
    if (current === to) return travelled;
    for (const next of neighboursOf(network, current)) {
      if (distance.has(next)) continue;
      distance.set(next, travelled + 1);
      queue.push(next);
    }
  }
  return null;
}

export interface TramBoardingCheck {
  readonly origin: TramStation | undefined;
  readonly destinationId: TramStationId;
  readonly knowsStation: (stationId: TramStationId) => boolean;
}

export function tramBoardingRefusal(network: TramNetwork, { origin, destinationId, knowsStation }: TramBoardingCheck): string | null {
  if (!origin) return 'You need to be standing on a tram platform.';
  const destination = network.stations.get(destinationId);
  if (!destination || !knowsStation(destinationId)) return 'You have not found that station yet.';
  if (destination.id === origin.id) return `You are already at ${origin.name}.`;
  if (tramStops(network, origin.id, destination.id) === null) return `No line runs from ${origin.name} to ${destination.name}.`;
  return null;
}
