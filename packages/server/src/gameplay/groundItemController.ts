import { addItem, chebyshevDistance, samePoint, type EntityId, type GameContent, type ItemId, type TilePoint } from '@containment/shared';
import { groundItemSnapshot, isGroundItemVisibleTo, type GroundItem } from '../world/groundItem.ts';
import type { Player } from '../world/player.ts';
import type { World } from '../world/world.ts';
import type { ZoneInstance } from '../world/zoneInstance.ts';
import type { EffectHost } from './effectRunner.ts';

export const OWNER_PRIVACY_TICKS = 200;
export const GROUND_LIFETIME_TICKS = 600;

export interface DropRequest {
  readonly itemId: ItemId;
  readonly quantity: number;
  readonly position: TilePoint;
  readonly ownerId: EntityId | null;
}

export class GroundItemController {
  private readonly content: GameContent;
  private readonly world: World;
  private readonly host: EffectHost;
  private currentTick = 0;
  private nextId = 1;

  constructor(content: GameContent, world: World, host: EffectHost) {
    this.content = content;
    this.world = world;
    this.host = host;
  }

  drop(zone: ZoneInstance, request: DropRequest): GroundItem | null {
    const definition = this.content.items.get(request.itemId);
    if (!definition || request.quantity <= 0) return null;
    const existing = definition.maxStack > 1
      ? [...zone.groundItems.values()].find(
          (item) => item.itemId === request.itemId && item.ownerId === request.ownerId && samePoint(item.position, request.position),
        )
      : undefined;
    if (existing) {
      existing.quantity += request.quantity;
      this.announce(zone, existing);
      return existing;
    }
    const item: GroundItem = {
      id: `ground:${this.nextId++}`,
      itemId: request.itemId,
      quantity: request.quantity,
      position: request.position,
      ownerId: request.ownerId,
      publicAtTick: this.currentTick + OWNER_PRIVACY_TICKS,
      expiresAtTick: this.currentTick + GROUND_LIFETIME_TICKS,
    };
    zone.groundItems.set(item.id, item);
    this.announce(zone, item);
    return item;
  }

  pickup(player: Player, groundItemId: string): void {
    const zone = this.world.zoneOf(player);
    const item = zone.groundItems.get(groundItemId);
    if (!item || !isGroundItemVisibleTo(item, player.entityId)) {
      this.host.notify(player, 'warning', 'That is no longer there.');
      return;
    }
    if (chebyshevDistance(player.position, item.position) > 1) return;
    const outcome = addItem(player.record.inventory, this.content.items, item.itemId, item.quantity);
    if (outcome.added === 0) {
      this.host.notify(player, 'warning', 'Your inventory is full.');
      return;
    }
    player.update({ inventory: outcome.inventory });
    const name = this.content.items.get(item.itemId)?.name ?? item.itemId;
    player.send({ type: 'chat.message', channel: 'system', text: `You take ${outcome.added > 1 ? `${outcome.added} × ` : ''}${name}.` });
    if (outcome.overflow > 0) {
      item.quantity = outcome.overflow;
      this.announce(zone, item);
    } else {
      this.remove(zone, item);
    }
    this.host.raiseQuestEvent(player, { type: 'loadoutChanged' });
  }

  positionOf(player: Player, groundItemId: string): TilePoint | null {
    const item = this.world.zoneOf(player).groundItems.get(groundItemId);
    return item && isGroundItemVisibleTo(item, player.entityId) ? item.position : null;
  }

  tick(tick: number): void {
    this.currentTick = tick;
    for (const zone of this.world.instances()) {
      for (const item of [...zone.groundItems.values()]) {
        if (tick >= item.expiresAtTick) {
          this.remove(zone, item);
          continue;
        }
        if (item.ownerId !== null && tick >= item.publicAtTick) {
          item.ownerId = null;
          this.announce(zone, item);
        }
      }
    }
  }

  private announce(zone: ZoneInstance, item: GroundItem): void {
    for (const player of zone.players.values()) {
      if (isGroundItemVisibleTo(item, player.entityId)) {
        player.send({ type: 'world.groundItemAdded', item: groundItemSnapshot(item, player.entityId) });
      }
    }
  }

  private remove(zone: ZoneInstance, item: GroundItem): void {
    zone.groundItems.delete(item.id);
    zone.broadcast({ type: 'world.groundItemRemoved', id: item.id });
  }
}
