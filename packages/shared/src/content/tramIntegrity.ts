import { assemblyInstanceOf } from '../world/assemblies.ts';
import { createObjectWalkabilityGrid } from '../world/district.ts';
import { rectContains, type TilePoint } from '../world/geometry.ts';
import type { ResolvedLevel } from '../world/levelLayout.ts';
import { TILE_KINDS } from '../world/tiles.ts';
import type { TramStation, TramStationDefinition } from '../world/tram.ts';
import type { GameContent } from './gameContent.ts';

const opensTramMap = (content: GameContent, objectId: string): boolean =>
  (content.worldObjects.get(objectId)?.interactions ?? []).some((interaction) => interaction.effects.some((effect) => effect.type === 'openTramMap'));

export function findTramIssues(content: GameContent, definitions: readonly TramStationDefinition[] = content.tram.definitions): string[] {
  const issues: string[] = [];
  const network = content.tram;
  const seen = new Set<string>();
  for (const definition of definitions) {
    if (seen.has(definition.id)) issues.push(`Tram station "${definition.id}" is defined twice.`);
    seen.add(definition.id);
    const station = network.stations.get(definition.id);
    if (!station) {
      issues.push(`Tram station "${definition.id}" does not resolve to an area "${definition.areaId}" in a placed district "${definition.districtId}".`);
      continue;
    }
    const level = content.levels.get(station.levelId);
    if (!level) continue;
    if (!rectContains(station.area, station.platformPoint)) issues.push(`Tram station "${station.id}" has its platform outside its area.`);
    if (!createObjectWalkabilityGrid(level.layout, level.objects, (objectId) => content.worldObjects.get(objectId)).isWalkable(station.platformPoint)) issues.push(`Tram station "${station.id}" has an unwalkable platform.`);
    const hasStop = level.objects.some((object) => rectContains(station.area, object.position) && opensTramMap(content, object.objectId));
    if (!hasStop) issues.push(`Tram station "${station.id}" has no tram stop in its area.`);
    else issues.push(...findCarIssues(content, level, station));
    if (station.lineIds.length === 0) issues.push(`Tram station "${station.id}" is not on any line.`);
  }
  for (const line of network.lines.values()) {
    if (line.stations.length < 2) issues.push(`Tram line "${line.id}" needs at least two stations.`);
    for (const stationId of line.stations) {
      if (!network.stations.has(stationId)) issues.push(`Tram line "${line.id}" lists unknown station "${stationId}".`);
    }
  }
  for (const level of content.levels.values()) {
    for (const object of level.objects) {
      if (!opensTramMap(content, object.objectId)) continue;
      const served = [...network.stations.values()].some((station) => station.levelId === level.id && rectContains(station.area, object.position));
      if (!served) issues.push(`Tram stop "${object.instanceId}" on level "${level.id}" is not inside any station area.`);
    }
  }
  return issues;
}

function carsIn(content: GameContent, level: ResolvedLevel, station: TramStation): Map<string, TilePoint[]> {
  const cars = new Map<string, TilePoint[]>();
  for (const object of level.objects) {
    if (!rectContains(station.area, object.position) || !opensTramMap(content, object.objectId)) continue;
    const car = assemblyInstanceOf(object.instanceId) ?? object.instanceId;
    cars.set(car, [...(cars.get(car) ?? []), object.position]);
  }
  return cars;
}

function findCarIssues(content: GameContent, level: ResolvedLevel, station: TramStation): string[] {
  const cars = carsIn(content, level, station);
  if (cars.size !== 1) return [`Tram station "${station.id}" has ${cars.size} tram cars; it needs exactly one.`];
  const [[car, tiles]] = [...cars] as [[string, TilePoint[]]];
  const tileAt = (point: TilePoint) => level.layout.tileAt(point);
  if (tiles.some((tile) => tileAt(tile) !== 'track')) return [`Tram car "${car}" at "${station.id}" does not sit on track.`];

  const xs = tiles.map((tile) => tile.x);
  const ys = tiles.map((tile) => tile.y);
  const alongX = Math.max(...xs) - Math.min(...xs) >= Math.max(...ys) - Math.min(...ys);
  const point = (along: number, across: number): TilePoint => (alongX ? { x: along, y: across } : { x: across, y: along });
  const acrossValues = [...new Set(alongX ? ys : xs)];
  const carAlong = alongX ? xs : ys;
  const platformStart = alongX ? station.area.x : station.area.y;
  const platformEnd = platformStart + (alongX ? station.area.width : station.area.height) - 1;
  const issues: string[] = [];
  for (const across of acrossValues) {
    let start = Math.min(...carAlong);
    let end = Math.max(...carAlong);
    while (start >= platformStart && tileAt(point(start - 1, across)) === 'track') start--;
    while (end <= platformEnd && tileAt(point(end + 1, across)) === 'track') end++;
    if (start >= platformStart || end <= platformEnd) issues.push(`The track under tram car "${car}" at "${station.id}" must run on through the platform and out of it at both ends.`);
  }
  const besideTrack = [Math.min(...acrossValues) - 1, Math.max(...acrossValues) + 1];
  const hasPlatform = besideTrack.some((across) => carAlong.some((along) => TILE_KINDS[tileAt(point(along, across))].walkable));
  if (!hasPlatform) issues.push(`Tram car "${car}" at "${station.id}" must be reached from a platform beside it.`);
  return [...new Set(issues)];
}
