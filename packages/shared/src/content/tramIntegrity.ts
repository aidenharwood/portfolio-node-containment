import { createWalkabilityGrid } from '../world/district.ts';
import { rectContains } from '../world/geometry.ts';
import type { TramStationDefinition } from '../world/tram.ts';
import type { GameContent } from './gameContent.ts';
import { TRAM_STATIONS } from './tramNetwork.ts';

const opensTramMap = (content: GameContent, objectId: string): boolean =>
  (content.worldObjects.get(objectId)?.interactions ?? []).some((interaction) => interaction.effects.some((effect) => effect.type === 'openTramMap'));

export function findTramIssues(content: GameContent, definitions: readonly TramStationDefinition[] = TRAM_STATIONS): string[] {
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
    const blocked = level.objects.filter((object) => content.worldObjects.get(object.objectId)?.blocksMovement).map((object) => object.position);
    if (!createWalkabilityGrid(level.layout, blocked).isWalkable(station.platformPoint)) issues.push(`Tram station "${station.id}" has an unwalkable platform.`);
    const hasStop = level.objects.some((object) => rectContains(station.area, object.position) && opensTramMap(content, object.objectId));
    if (!hasStop) issues.push(`Tram station "${station.id}" has no tram stop in its area.`);
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
