import { createWalkabilityGrid, locate, type GameContent, type TilePoint, type WorldLocation } from '@containment/shared';

interface LegacyLocation {
  readonly zoneId: string;
  readonly position: TilePoint;
}

const isCurrent = (stored: unknown): stored is WorldLocation => typeof (stored as WorldLocation | null)?.levelId === 'string';
const isLegacy = (stored: unknown): stored is LegacyLocation => typeof (stored as LegacyLocation | null)?.zoneId === 'string';

function isWalkable(location: WorldLocation, content: GameContent): boolean {
  const level = content.levels.get(location.levelId);
  if (!level) return false;
  const blocked = level.objects.filter((object) => content.worldObjects.get(object.objectId)?.blocksMovement).map((object) => object.position);
  return createWalkabilityGrid(level.layout, blocked).isWalkable(location.position);
}

function mainFloorSpawn(content: GameContent): WorldLocation {
  const level = content.levels.values().next().value;
  if (!level) throw new Error('The world has no levels.');
  return { levelId: level.id, position: level.spawn };
}

export function upgradeLegacyLocation(stored: unknown, content: GameContent): WorldLocation {
  if (isCurrent(stored)) return stored;
  const located = isLegacy(stored) ? locate(content, stored.zoneId, stored.position) : undefined;
  return located && isWalkable(located, content) ? located : mainFloorSpawn(content);
}
