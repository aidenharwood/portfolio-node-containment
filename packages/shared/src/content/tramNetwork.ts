import type { DistrictId, TramStationId } from '../ids.ts';
import type { DistrictDefinition } from '../world/district.ts';
import type { TramLineDefinition, TramNetwork, TramStation, TramStationDefinition } from '../world/tram.ts';
import type { LocatableContent } from './levelIndex.ts';
import { locate } from './levelIndex.ts';

export const TRAM_STATIONS: readonly TramStationDefinition[] = [
  { id: 'intake-transit', name: 'Intake Transit Bay', districtId: 'intake-wing', areaId: 'transit-bay', platform: { x: 28, y: 15 } },
  { id: 'atrium-transit', name: 'Atrium Transit Bay', districtId: 'meridian-atrium', areaId: 'lift-bay', platform: { x: 6, y: 30 } },
  { id: 'verdance-platform', name: 'Verdance Platform', districtId: 'hydroponics', areaId: 'platform', platform: { x: 4, y: 13 } },
  { id: 'deepwatch-platform', name: 'Deepwatch Platform Hall', districtId: 'deepwatch', areaId: 'platform-hall', platform: { x: 4, y: 11 } },
  { id: 'cryovault-dock', name: 'Cryovault Receiving Dock', districtId: 'cryovault', areaId: 'dock', platform: { x: 4, y: 5 } },
  { id: 'array-lobby', name: 'Signal Array Uplink Lobby', districtId: 'signal-array', areaId: 'uplink-lobby', platform: { x: 4, y: 5 } },
  { id: 'archive-stair', name: 'Archive Flood Stair', districtId: 'drowned-archive', areaId: 'flood-stair', platform: { x: 4, y: 4 } },
  { id: 'furnace-lock', name: 'Furnace Coolant Lock', districtId: 'furnace', areaId: 'coolant-lock', platform: { x: 4, y: 5 } },
];

export const TRAM_LINES: readonly TramLineDefinition[] = [
  { id: 'meridian-line', name: 'Meridian Line', color: '#7cf29a', stations: ['intake-transit', 'atrium-transit', 'verdance-platform'] },
  { id: 'deep-line', name: 'Deep Line', color: '#4fd8ff', stations: ['atrium-transit', 'deepwatch-platform'] },
  {
    id: 'abyssal-circuit',
    name: 'Abyssal Circuit',
    color: '#ffb347',
    stations: ['deepwatch-platform', 'cryovault-dock', 'array-lobby', 'archive-stair', 'furnace-lock'],
  },
];

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
  return { stations: resolved, lines: new Map(lines.map((line) => [line.id, line])) };
}
