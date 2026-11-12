import type { CreatureId } from '../../combat/creatures.ts';
import type { WorldObjectId } from '../../ids.ts';
import { expandAssembly, type AssemblyPlacement } from '../../world/assemblies.ts';
import type { Blueprint } from '../../world/blueprint.ts';
import { ASSEMBLIES } from '../assemblies.ts';
import { installationLayoutOf } from '../installations.ts';
import type { CreaturePlacement, ObjectPlacement } from '../../world/district.ts';
import type { WorldObjectDefinition } from '../../world/entities.ts';
import { objectFootprintTiles } from '../../world/footprint.ts';
import type { TilePoint } from '../../world/geometry.ts';

export interface Placed {
  readonly position: TilePoint;
}

export type ObjectDefinitionLookup = (objectId: WorldObjectId) => WorldObjectDefinition | undefined;

const footprintOf = (placed: Placed, definitionOf: ObjectDefinitionLookup): TilePoint[] => {
  const assemblyId = 'assemblyId' in placed ? (placed as AssemblyPlacement).assemblyId : undefined;
  const definition = assemblyId === undefined ? undefined : (ASSEMBLIES.find((assembly) => assembly.id === assemblyId) ?? installationLayoutOf(assemblyId));
  if (definition) return expandAssembly(definition, placed as AssemblyPlacement).map((piece) => piece.position);
  if ('objectId' in placed) return objectFootprintTiles(definitionOf((placed as ObjectPlacement).objectId), placed as ObjectPlacement);
  return [placed.position];
};

export const positionsOfWith = (definitionOf: ObjectDefinitionLookup, ...groups: readonly (readonly Placed[])[]): TilePoint[] =>
  groups.flatMap((group) => group.flatMap((placed) => footprintOf(placed, definitionOf)));

export const positionsOf = (...groups: readonly (readonly Placed[])[]): TilePoint[] => positionsOfWith(() => undefined, ...groups);

const WALL_FURNITURE: ReadonlySet<WorldObjectId> = new Set<WorldObjectId>(['pipe-cluster', 'storage-rack', 'wall-locker', 'server-rack', 'filing-cabinet', 'water-cooler', 'briefing-bench', 'junction-box', 'herb-cabinet', 'vellum-stack']);

export function scatterObjects(
  plan: Blueprint,
  room: string,
  prefix: string,
  objectIds: readonly WorldObjectId[],
  count: number,
  taken: readonly TilePoint[],
): ObjectPlacement[] {
  const wanted = Array.from({ length: count }, (_, index) => objectIds[index % objectIds.length] as WorldObjectId);
  const wallSpots = plan.scatterAlongWalls(room, wanted.filter((objectId) => WALL_FURNITURE.has(objectId)).length, prefix, taken);
  const openSpots = plan.scatter(room, count - wallSpots.length, prefix, [...taken, ...wallSpots.map((spot) => spot.position)]);
  let wallIndex = 0;
  let openIndex = 0;
  return wanted.map((objectId, index) => {
    const wallSpot = WALL_FURNITURE.has(objectId) ? wallSpots[wallIndex++] : undefined;
    const instanceId = `${prefix}-${index + 1}`;
    return wallSpot ? { instanceId, objectId, position: wallSpot.position, facing: wallSpot.facing } : { instanceId, objectId, position: openSpots[openIndex++] as TilePoint };
  });
}

export function scatterCreatures(plan: Blueprint, room: string, prefix: string, creatureId: CreatureId, count: number, taken: readonly TilePoint[]): CreaturePlacement[] {
  return plan.scatter(room, count, prefix, taken).map((position, index) => ({ instanceId: `${prefix}-${index + 1}`, creatureId, position }));
}

export const LITTER: readonly WorldObjectId[] = ['litter-papers', 'litter-debris', 'litter-puddle', 'litter-gravel', 'litter-rubble'];

export const OFFICE_PROPS: readonly WorldObjectId[] = ['filing-cabinet', 'planter', 'briefing-bench', 'water-cooler'];

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
