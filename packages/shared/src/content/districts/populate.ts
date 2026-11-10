import type { CreatureId } from '../../combat/creatures.ts';
import type { WorldObjectId } from '../../ids.ts';
import type { Blueprint } from '../../world/blueprint.ts';
import type { CreaturePlacement, ObjectPlacement } from '../../world/district.ts';
import type { TilePoint } from '../../world/geometry.ts';

export interface Placed {
  readonly position: TilePoint;
}

export const positionsOf = (...groups: readonly (readonly Placed[])[]): TilePoint[] => groups.flatMap((group) => group.map((placed) => placed.position));

export function scatterObjects(
  plan: Blueprint,
  room: string,
  prefix: string,
  objectIds: readonly WorldObjectId[],
  count: number,
  taken: readonly TilePoint[],
): ObjectPlacement[] {
  return plan.scatter(room, count, prefix, taken).map((position, index) => ({
    instanceId: `${prefix}-${index + 1}`,
    objectId: objectIds[index % objectIds.length] as WorldObjectId,
    position,
  }));
}

export function scatterCreatures(plan: Blueprint, room: string, prefix: string, creatureId: CreatureId, count: number, taken: readonly TilePoint[]): CreaturePlacement[] {
  return plan.scatter(room, count, prefix, taken).map((position, index) => ({ instanceId: `${prefix}-${index + 1}`, creatureId, position }));
}

export const LITTER: readonly WorldObjectId[] = ['litter-papers', 'litter-debris', 'litter-puddle', 'litter-gravel', 'litter-rubble'];

export const OFFICE_PROPS: readonly WorldObjectId[] = ['office-desk', 'filing-cabinet', 'planter', 'briefing-bench', 'water-cooler'];

export const CIVIC_PROPS: readonly WorldObjectId[] = ['planter', 'briefing-bench', 'light-pillar', 'planter'];

export const INDUSTRIAL_PROPS: readonly WorldObjectId[] = ['pipe-cluster', 'storage-rack', 'wall-locker', 'server-rack'];

export type ScatterGroup = readonly [room: string, prefix: string, objectIds: readonly WorldObjectId[], count: number];

export function scatterGroups(plan: Blueprint, placedAlready: readonly Placed[], groups: readonly ScatterGroup[]): ObjectPlacement[] {
  return groups.reduce<ObjectPlacement[]>(
    (placed, [room, prefix, objectIds, count]) => [...placed, ...scatterObjects(plan, room, prefix, objectIds, count, positionsOf(placedAlready, placed))],
    [],
  );
}

export type CreatureGroup = readonly [room: string, prefix: string, creatureId: CreatureId, count: number];

export function scatterPacks(plan: Blueprint, placedAlready: readonly Placed[], groups: readonly CreatureGroup[]): CreaturePlacement[] {
  return groups.reduce<CreaturePlacement[]>(
    (placed, [room, prefix, creatureId, count]) => [...placed, ...scatterCreatures(plan, room, prefix, creatureId, count, positionsOf(placedAlready, placed))],
    [],
  );
}
