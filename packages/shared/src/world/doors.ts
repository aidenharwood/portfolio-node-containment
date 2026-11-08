import type { WorldObjectId } from '../ids.ts';
import { areConditionsMet, type Condition, type ConditionContext } from '../rules/conditions.ts';
import type { ObjectPlacement, TileLayout } from './district.ts';
import type { WorldObjectDefinition } from './entities.ts';
import { tileKey, type TilePoint } from './geometry.ts';
import type { WalkabilityGrid } from './pathfinding.ts';
import { TILE_KINDS } from './tiles.ts';

export interface DoorDefinition {
  readonly conditions: readonly Condition[];
}

export type DoorTiles = ReadonlyMap<string, WorldObjectId>;

const MAX_DOOR_DEPTH = 4;

export const doorOpenedFlag = (objectId: WorldObjectId): string => `door-opened:${objectId}`;

export const isDoorOpenFor = (objectId: WorldObjectId, door: DoorDefinition, context: ConditionContext): boolean =>
  context.hasFlag(doorOpenedFlag(objectId)) || areConditionsMet(door.conditions, context);

export function doorTilesOf(
  placements: readonly ObjectPlacement[],
  definitionOf: (objectId: WorldObjectId) => WorldObjectDefinition | undefined,
): DoorTiles {
  const doors = new Map<string, WorldObjectId>();
  for (const placement of placements) {
    if (definitionOf(placement.objectId)?.door) doors.set(tileKey(placement.position), placement.objectId);
  }
  return doors;
}

export function doorObjectIds(doors: DoorTiles): Set<WorldObjectId> {
  return new Set(doors.values());
}

export function withOpenDoors(grid: WalkabilityGrid, layout: TileLayout, doors: DoorTiles, isOpen: (objectId: WorldObjectId) => boolean): WalkabilityGrid {
  return {
    isWalkable: (point) => {
      if (grid.isWalkable(point)) return true;
      const objectId = doors.get(tileKey(point));
      return objectId !== undefined && TILE_KINDS[layout.tileAt(point)].walkable && isOpen(objectId);
    },
  };
}

export function pathThroughDoor(grid: WalkabilityGrid, layout: TileLayout, doors: DoorTiles, from: TilePoint, door: TilePoint): TilePoint[] {
  const step = { x: door.x - from.x, y: door.y - from.y };
  const path: TilePoint[] = [];
  let point = door;
  for (let depth = 0; depth < MAX_DOOR_DEPTH; depth++) {
    if (!grid.isWalkable(point)) return path;
    path.push(point);
    if (layout.tileAt(point) !== 'door' && !doors.has(tileKey(point))) return path;
    point = { x: point.x + step.x, y: point.y + step.y };
  }
  return path;
}
