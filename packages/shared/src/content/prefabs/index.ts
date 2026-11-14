import type { WorldObjectDefinition } from '../../world/entities.ts';
import { objectFootprintSize } from '../../world/footprint.ts';
import type { WorldObjectId } from '../../ids.ts';
import type { Prefab, PrefabRole } from './types.ts';

export * from './types.ts';

const LIBRARIES: (readonly Prefab[])[] = [];

const REGISTERED: Record<string, Prefab> = {};

export const PREFABS: Readonly<Record<string, Prefab>> = REGISTERED;

export function registerPrefabs(library: readonly Prefab[]): void {
  LIBRARIES.push(library);
  for (const prefab of library) REGISTERED[prefab.id] = prefab;
}

export type PrefabName = string;

export function findPrefabLibraryIssues(libraries: readonly (readonly Prefab[])[] = LIBRARIES, merged: Readonly<Record<string, Prefab>> = PREFABS): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const prefab of libraries.flat()) {
    if (seen.has(prefab.id)) issues.push(`prefab "${prefab.id}" is defined more than once`);
    seen.add(prefab.id);
  }
  for (const [key, prefab] of Object.entries(merged)) if (key !== prefab.id) issues.push(`prefab "${prefab.id}" is filed under "${key}"`);
  return issues;
}

const BACKED_ROLES: readonly PrefabRole[] = ['wall', 'bay'];

export function findPrefabIssues(prefab: Prefab, objectOf: (id: WorldObjectId) => WorldObjectDefinition | undefined): string[] {
  const issues: string[] = [];
  if (prefab.roles.length === 0) issues.push(`${prefab.id} has empty roles`);
  if (prefab.roles.some((role) => BACKED_ROLES.includes(role)) && !prefab.pieces.some((piece) => piece.dy === 0)) issues.push(`${prefab.id} backs onto a wall but has no back row`);
  const owner = new Map<string, number>();
  prefab.pieces.forEach((piece, index) => {
    const definition = objectOf(piece.objectId);
    if (!definition) {
      issues.push(`${prefab.id} piece ${index + 1} uses unknown object ${piece.objectId}`);
      return;
    }
    const { width, height } = objectFootprintSize(definition, piece.facing);
    const canopy = definition.deck === true && !definition.blocksMovement;
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const post = (dx === 0 || dx === width - 1) && (dy === 0 || dy === height - 1);
        if (canopy && !post) continue;
        const key = `${piece.dx + dx},${piece.dy + dy}`;
        const other = owner.get(key);
        if (other !== undefined) issues.push(`${prefab.id} pieces ${other + 1} and ${index + 1} overlap at ${key}`);
        else owner.set(key, index);
      }
    }
  });
  return issues;
}
