import type { DistrictId, TramStationId } from '../ids.ts';
import { CALDER_GATEHOUSE_ANCHORS } from './districts/calderGatehouse.ts';
import { VESPER_LODGE_ANCHORS } from './districts/vesperLodge.ts';
import { HYDROPONICS_ANCHORS } from './districts/hydroponics.ts';
import { INTAKE_WING_ANCHORS } from './districts/intakeWing.ts';
import { ATRIUM_ANCHORS } from './districts/meridianAtrium.ts';
import { SERVICE_YARDS_ANCHORS } from './districts/serviceYards.ts';
import type { DistrictDefinition } from '../world/district.ts';
import type { TramLineDefinition, TramNetwork, TramStation, TramStationDefinition } from '../world/tram.ts';
import type { LocatableContent } from './levelIndex.ts';
import { locate } from './levelIndex.ts';
import { CRYOVAULT_ANCHORS } from './districts/cryovault.ts';
import { DEEPWATCH_ANCHORS } from './districts/deepwatch.ts';
import { DROWNED_ARCHIVE_ANCHORS } from './districts/drownedArchive.ts';
import { FURNACE_ANCHORS } from './districts/furnace.ts';
import { SIGNAL_ARRAY_ANCHORS } from './districts/signalArray.ts';

export const TRAM_STATIONS: readonly TramStationDefinition[] = [
  { id: 'intake-transit', name: 'Intake Transit Bay', districtId: 'intake-wing', areaId: 'tram-terminal', platform: INTAKE_WING_ANCHORS.tramPlatform, alwaysKnown: true },
  { id: 'atrium-transit', name: 'Atrium Transit Bay', districtId: 'meridian-atrium', areaId: 'tram-terminal', platform: ATRIUM_ANCHORS.transit },
  { id: 'yards-depot', name: 'Service Yards Depot', districtId: 'service-yards', areaId: 'tram-terminal', platform: SERVICE_YARDS_ANCHORS.tramPlatform },
  { id: 'verdance-platform', name: 'Verdance Platform', districtId: 'hydroponics', areaId: 'tram-terminal', platform: HYDROPONICS_ANCHORS.tramPlatform },
  { id: 'calder-platform', name: 'Calder Gatehouse Platform', districtId: 'calder-gatehouse', areaId: 'tram-terminal', platform: CALDER_GATEHOUSE_ANCHORS.tramPlatform },
  { id: 'vesper-platform', name: "Vesper Porter's Lodge Platform", districtId: 'vesper-lodge', areaId: 'tram-terminal', platform: VESPER_LODGE_ANCHORS.tramPlatform },
  { id: 'deepwatch-platform', name: 'Deepwatch Platform', districtId: 'deepwatch', areaId: 'tram-terminal', platform: DEEPWATCH_ANCHORS.tramPlatform },
  { id: 'cryovault-dock', name: 'Cryovault Receiving Dock', districtId: 'cryovault', areaId: 'dock', platform: CRYOVAULT_ANCHORS.tramPlatform },
  { id: 'array-lobby', name: 'Signal Array Uplink Lobby', districtId: 'signal-array', areaId: 'uplink-lobby', platform: SIGNAL_ARRAY_ANCHORS.tramPlatform },
  { id: 'archive-stair', name: 'Archive Flood Stair', districtId: 'drowned-archive', areaId: 'flood-stair', platform: DROWNED_ARCHIVE_ANCHORS.tramPlatform },
  { id: 'furnace-lock', name: 'Furnace Coolant Lock', districtId: 'furnace', areaId: 'coolant-lock', platform: FURNACE_ANCHORS.tramPlatform },
];

export const TRAM_LINES: readonly TramLineDefinition[] = [
  { id: 'intake-shuttle', name: 'Intake Shuttle', color: '#d8e7ef', stations: ['intake-transit', 'atrium-transit'] },
  { id: 'meridian-line', name: 'Meridian Line', color: '#7cf29a', stations: ['vesper-platform', 'verdance-platform', 'atrium-transit', 'yards-depot', 'calder-platform'] },
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
