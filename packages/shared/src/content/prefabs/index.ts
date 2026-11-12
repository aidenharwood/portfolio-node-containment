import type { WorldObjectDefinition } from '../../world/entities.ts';
import { objectFootprintSize } from '../../world/footprint.ts';
import type { WorldObjectId } from '../../ids.ts';
import { ARCHIVE_PREFABS } from './archive.ts';
import { CAMP_PREFABS } from './camp.ts';
import { CANTEEN_PREFABS } from './canteen.ts';
import { CIVIC_PREFABS } from './civic.ts';
import { COLD_PREFABS } from './cold.ts';
import { DORMITORY_PREFABS } from './dormitory.ts';
import { FREIGHT_PREFABS } from './freight.ts';
import { GARDEN_PREFABS } from './garden.ts';
import { INDUSTRIAL_PREFABS } from './industrial.ts';
import { LAB_PREFABS } from './lab.ts';
import { MEDICAL_PREFABS } from './medical.ts';
import { MINE_PREFABS } from './mine.ts';
import { OFFICE_PREFABS } from './office.ts';
import { POST_PREFABS } from './post.ts';
import { RITUAL_PREFABS } from './ritual.ts';
import { RUIN_PREFABS } from './ruin.ts';
import { TRANSIT_PREFABS } from './transit.ts';
import { WET_PREFABS } from './wet.ts';
import { WORKS_PREFABS } from './works.ts';
import { type DressingTheme, type Prefab, type PrefabRole } from './types.ts';

export * from './types.ts';

const LIBRARIES: readonly (readonly Prefab[])[] = [ARCHIVE_PREFABS, CAMP_PREFABS, CANTEEN_PREFABS, CIVIC_PREFABS, COLD_PREFABS, DORMITORY_PREFABS, FREIGHT_PREFABS, GARDEN_PREFABS, INDUSTRIAL_PREFABS, LAB_PREFABS, MEDICAL_PREFABS, MINE_PREFABS, OFFICE_PREFABS, POST_PREFABS, RITUAL_PREFABS, RUIN_PREFABS, TRANSIT_PREFABS, WET_PREFABS, WORKS_PREFABS];

export const PREFABS: Readonly<Record<string, Prefab>> = Object.fromEntries(LIBRARIES.flat().map((prefab) => [prefab.id, prefab]));

export type PrefabName = string;

export const prefabsWithRole = (theme: DressingTheme, role: PrefabRole): readonly Prefab[] =>
  Object.values(PREFABS).filter((prefab) => prefab.themes.includes(theme) && prefab.roles.includes(role));

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
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const key = `${piece.dx + dx},${piece.dy + dy}`;
        const other = owner.get(key);
        if (other !== undefined) issues.push(`${prefab.id} pieces ${other + 1} and ${index + 1} overlap at ${key}`);
        else owner.set(key, index);
      }
    }
  });
  return issues;
}
