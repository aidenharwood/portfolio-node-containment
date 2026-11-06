import type { EntityId, GroundItemSnapshot, ItemId, TilePoint } from '@containment/shared';

export interface GroundItem {
  readonly id: string;
  readonly itemId: ItemId;
  quantity: number;
  readonly position: TilePoint;
  ownerId: EntityId | null;
  readonly publicAtTick: number;
  readonly expiresAtTick: number;
}

export const isGroundItemVisibleTo = (item: GroundItem, entityId: EntityId): boolean =>
  item.ownerId === null || item.ownerId === entityId;

export const groundItemSnapshot = (item: GroundItem, viewerId: EntityId): GroundItemSnapshot => ({
  id: item.id,
  itemId: item.itemId,
  quantity: item.quantity,
  position: item.position,
  owned: item.ownerId === viewerId,
});
