import type { WorldObjectId } from '../ids.ts';
import type { WorldObjectDefinition } from './entities.ts';
import type { TilePoint } from './geometry.ts';
import type { ResolvedLevel } from './levelLayout.ts';

export const MAP_SCENERY_KINDS = ['deck', 'fixture', 'obstacle', 'loose'] as const;

export type MapSceneryKind = (typeof MAP_SCENERY_KINDS)[number];

export interface MapScenery {
  readonly kind: MapSceneryKind;
  readonly position: TilePoint;
}

export function objectMapSceneryKind(object: WorldObjectDefinition): MapSceneryKind | undefined {
  if (object.door) return undefined;
  if (object.deck && !object.blocksMovement) return 'deck';
  if (!object.blocksMovement) return object.interactions.length > 0 ? undefined : 'loose';
  return object.interactions.length > 0 ? 'fixture' : 'obstacle';
}

export function mapScenery(level: ResolvedLevel, worldObjects: ReadonlyMap<WorldObjectId, WorldObjectDefinition>): MapScenery[] {
  const found: MapScenery[] = [];
  for (const placement of level.objects) {
    const object = worldObjects.get(placement.objectId);
    const kind = object ? objectMapSceneryKind(object) : undefined;
    if (kind) found.push({ kind, position: placement.position });
  }
  return found.sort((a, b) => MAP_SCENERY_KINDS.indexOf(a.kind) - MAP_SCENERY_KINDS.indexOf(b.kind));
}
