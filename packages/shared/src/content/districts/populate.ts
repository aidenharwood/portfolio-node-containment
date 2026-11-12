import type { WorldObjectId } from '../../ids.ts';
import { expandAssembly, type AssemblyPlacement } from '../../world/assemblies.ts';
import { ASSEMBLIES } from '../assemblies.ts';
import { installationLayoutOf } from '../installations.ts';
import type { ObjectPlacement } from '../../world/district.ts';
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
