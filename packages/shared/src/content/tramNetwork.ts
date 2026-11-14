import type { DistrictId, TramStationId } from '../ids.ts';
import type { DistrictDefinition } from '../world/district.ts';
import type { TramLineDefinition, TramNetwork, TramStation, TramStationDefinition } from '../world/tram.ts';
import type { LocatableContent } from './levelIndex.ts';
import { locate } from './levelIndex.ts';

export const TRAM_STATIONS: readonly TramStationDefinition[] = [];

export const TRAM_LINES: readonly TramLineDefinition[] = [];

function resolveStation(
  definition: TramStationDefinition,
  districts: ReadonlyMap<DistrictId, DistrictDefinition>,
  levels: LocatableContent,
  lines: readonly TramLineDefinition[],
): TramStation | undefined {
  const area = districts.get(definition.districtId)?.areas.find((candidate) => candidate.id === definition.areaId);
  const platform = locate(levels, definition.districtId, definition.platform);
  const corner = area && locate(levels, definition.districtId, area.rect);
  if (!area || !platform || !corner) return undefined;
  return {
    ...definition,
    levelId: platform.levelId,
    platformPoint: platform.position,
    area: { ...area.rect, x: corner.position.x, y: corner.position.y },
    lineIds: lines.filter((line) => line.stations.includes(definition.id)).map((line) => line.id),
  };
}

export function buildTramNetwork(
  stations: readonly TramStationDefinition[],
  lines: readonly TramLineDefinition[],
  districts: ReadonlyMap<DistrictId, DistrictDefinition>,
  levels: LocatableContent,
): TramNetwork {
  const resolved = new Map<TramStationId, TramStation>();
  for (const definition of stations) {
    const station = resolveStation(definition, districts, levels, lines);
    if (station) resolved.set(station.id, station);
  }
  return { definitions: stations, stations: resolved, lines: new Map(lines.map((line) => [line.id, line])) };
}
