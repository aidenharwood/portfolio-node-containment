import { createObjectWalkabilityGrid, locate, type DistrictId, type GameContent, type LevelId, type TilePoint, type WorldLocation } from '@containment/shared';

const LEVEL_SHIFTS_SINCE_LEVEL_COORDINATE_SAVES: Readonly<Partial<Record<LevelId, TilePoint>>> = { 'main-floor': { x: 126, y: 0 } };

export interface DistrictLocation {
  readonly districtId: DistrictId;
  readonly position: TilePoint;
}

interface LegacyZoneLocation {
  readonly zoneId: string;
  readonly position: TilePoint;
}

const isLevelLocation = (stored: unknown): stored is WorldLocation => typeof (stored as WorldLocation | null)?.levelId === 'string';
const isDistrictLocation = (stored: unknown): stored is DistrictLocation => typeof (stored as DistrictLocation | null)?.districtId === 'string';
const isLegacyZoneLocation = (stored: unknown): stored is LegacyZoneLocation => typeof (stored as LegacyZoneLocation | null)?.zoneId === 'string';

function isWalkable(location: WorldLocation, content: GameContent): boolean {
  const level = content.levels.get(location.levelId);
  if (!level) return false;
  return createObjectWalkabilityGrid(level.layout, level.objects, (objectId) => content.worldObjects.get(objectId)).isWalkable(location.position);
}

function mainFloorSpawn(content: GameContent): WorldLocation {
  const level = content.levels.values().next().value;
  if (!level) throw new Error('The world has no levels.');
  return { levelId: level.id, position: level.spawn };
}

export function storeLocation(location: WorldLocation, content: GameContent): DistrictLocation | WorldLocation {
  return content.levels.get(location.levelId)?.layout.toLocalPoint(location.position) ?? location;
}

export function restoreLocation(stored: unknown, content: GameContent): WorldLocation {
  if (isLevelLocation(stored)) {
    const shift = LEVEL_SHIFTS_SINCE_LEVEL_COORDINATE_SAVES[stored.levelId];
    return shift ? { levelId: stored.levelId, position: { x: stored.position.x + shift.x, y: stored.position.y + shift.y } } : stored;
  }
  const local = isDistrictLocation(stored) ? stored : isLegacyZoneLocation(stored) ? { districtId: stored.zoneId, position: stored.position } : undefined;
  const located = local && locate(content, local.districtId, local.position);
  return located && isWalkable(located, content) ? located : mainFloorSpawn(content);
}
