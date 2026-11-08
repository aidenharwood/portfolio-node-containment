import type { AreaId, DistrictId, LevelId, TramLineId, TramStationId } from '../ids.ts';
import { rectContains, type TilePoint, type TileRect } from './geometry.ts';

export interface TramStationDefinition {
  readonly id: TramStationId;
  readonly name: string;
  readonly districtId: DistrictId;
  readonly areaId: AreaId;
  readonly platform: TilePoint;
  readonly alwaysKnown?: boolean;
}

export const isStationKnown = (network: TramNetwork, stationId: TramStationId, hasFlag: (flag: string) => boolean): boolean =>
  network.stations.get(stationId)?.alwaysKnown === true || hasFlag(tramStationFlag(stationId));

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

export const linesThrough = (network: TramNetwork, stationId: TramStationId): TramLineDefinition[] =>
  [...network.lines.values()].filter((line) => line.stations.includes(stationId));

export function tramStops(network: TramNetwork, from: TramStationId, to: TramStationId): number | null {
  if (!network.stations.has(from) || !network.stations.has(to)) return null;
  const hops = linesThrough(network, from)
    .filter((line) => line.stations.includes(to))
    .map((line) => Math.abs(line.stations.indexOf(from) - line.stations.indexOf(to)));
  return hops.length > 0 ? Math.min(...hops) : null;
}

export function tramLineBetween(network: TramNetwork, from: TramStationId, to: TramStationId): TramLineDefinition | undefined {
  const stops = tramStops(network, from, to);
  return linesThrough(network, from).find((line) => line.stations.includes(to) && Math.abs(line.stations.indexOf(from) - line.stations.indexOf(to)) === stops);
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
  if (tramStops(network, origin.id, destination.id) === null) return `The tram at ${origin.name} does not run to ${destination.name}.`;
  return null;
}
