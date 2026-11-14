import { createObjectWalkabilityGrid, isSafeIn } from '../world/district.ts';
import { footprintTiles, sizeOf } from '../world/footprint.ts';
import { rectContains, tileKey } from '../world/geometry.ts';
import type { GameContent } from './gameContent.ts';

export function findFootprintIssues(content: GameContent): string[] {
  const issues: string[] = [];
  for (const level of content.levels.values()) {
    for (const placement of level.definition.districts) {
      const district = content.districts.get(placement.districtId);
      if (!district?.rooms) continue;
      const rooms = Object.values(district.rooms);
      for (const creature of district.creatures ?? []) {
        const definition = content.creatures.get(creature.creatureId);
        if (!definition) continue;
        const tiles = footprintTiles(creature.position, sizeOf(definition));
        if (!rooms.some((room) => tiles.every((tile) => rectContains(room, tile)))) {
          issues.push(`district ${district.id}: "${creature.instanceId}" footprint does not fit inside one room`);
        }
        if (tiles.some((tile) => isSafeIn(district.areas, tile))) {
          issues.push(`district ${district.id}: "${creature.instanceId}" footprint reaches into a safe area`);
        }
      }
    }

    const grid = createObjectWalkabilityGrid(level.layout, level.objects, (objectId) => content.worldObjects.get(objectId));
    const homes = new Map<string, string>();
    for (const creature of level.creatures) {
      const definition = content.creatures.get(creature.creatureId);
      if (!definition) continue;
      for (const tile of footprintTiles(creature.position, sizeOf(definition))) {
        if (!grid.isWalkable(tile)) issues.push(`level ${level.id}: "${creature.instanceId}" footprint does not fit; ${tileKey(tile)} is blocked`);
        const other = homes.get(tileKey(tile));
        if (other) issues.push(`level ${level.id}: "${creature.instanceId}" footprint overlaps "${other}" at ${tileKey(tile)}`);
        homes.set(tileKey(tile), creature.instanceId);
      }
    }
  }
  return issues;
}
