import type { GroundItemSnapshot, InstanceId, ObjectPlacement, TilePoint, WorldObjectDefinition } from '@containment/shared';
import type { ClientEntity } from '../state/worldState.ts';

export type PickTarget =
  | { readonly kind: 'entity'; readonly entity: ClientEntity }
  | { readonly kind: 'object'; readonly instanceId: InstanceId; readonly placement: ObjectPlacement; readonly definition: WorldObjectDefinition }
  | { readonly kind: 'groundItem'; readonly item: GroundItemSnapshot }
  | { readonly kind: 'tile'; readonly tile: TilePoint };

export interface ClickMarker {
  readonly tile: TilePoint;
  readonly startedAt: number;
  readonly tone: 'walk' | 'interact';
}

export const samePickTarget = (a: PickTarget | null, b: PickTarget | null): boolean => {
  if (!a || !b) return a === b;
  if (a.kind === 'entity' && b.kind === 'entity') return a.entity.id === b.entity.id;
  if (a.kind === 'object' && b.kind === 'object') return a.instanceId === b.instanceId;
  if (a.kind === 'groundItem' && b.kind === 'groundItem') return a.item.id === b.item.id;
  if (a.kind === 'tile' && b.kind === 'tile') return a.tile.x === b.tile.x && a.tile.y === b.tile.y;
  return false;
};
