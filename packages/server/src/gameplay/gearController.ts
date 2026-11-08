import {
  equipFromInventory,
  equippedItemIds,
  recordDestroyed,
  swapSlots,
  unequipToInventory,
  type EquipmentSlot,
  type GameContent,
  type Loadout,
} from '@containment/shared';
import type { Player } from '../world/player.ts';
import type { World } from '../world/world.ts';
import type { EffectHost } from './effectRunner.ts';

export const CONSUMABLE_COOLDOWN_TICKS = 3;
export const CONSUMABLE_COOLDOWN_MESSAGE = "You're still recovering from the last one.";

export class GearController {
  private readonly content: GameContent;
  private readonly world: World;
  private readonly host: EffectHost;

  constructor(content: GameContent, world: World, host: EffectHost) {
    this.content = content;
    this.world = world;
    this.host = host;
  }

  equip(player: Player, slotIndex: number): void {
    const result = equipFromInventory(this.loadoutOf(player), slotIndex, this.content.items, player.record);
    if (!result.ok) {
      this.host.notify(player, 'warning', result.error);
      return;
    }
    this.commitLoadout(player, result.value, true);
  }

  unequip(player: Player, slot: EquipmentSlot): void {
    const result = unequipToInventory(this.loadoutOf(player), slot, this.content.items);
    if (!result.ok) {
      this.host.notify(player, 'warning', result.error);
      return;
    }
    this.commitLoadout(player, result.value, true);
  }

  use(player: Player, slotIndex: number, tick: number): void {
    const stack = player.record.inventory[slotIndex];
    const item = stack ? this.content.items.get(stack.itemId) : undefined;
    if (!stack || !item?.consumable) {
      this.host.notify(player, 'warning', 'You cannot use that.');
      return;
    }
    if (tick < player.nextConsumableTick) {
      player.send({ type: 'chat.message', channel: 'system', text: CONSUMABLE_COOLDOWN_MESSAGE });
      return;
    }
    player.nextConsumableTick = tick + CONSUMABLE_COOLDOWN_TICKS;
    const inventory = [...player.record.inventory];
    inventory[slotIndex] = stack.quantity > 1 ? { itemId: stack.itemId, quantity: stack.quantity - 1 } : null;
    player.update({ inventory });
    const before = player.integrity;
    player.setIntegrity(before + item.consumable.heal);
    const restored = player.integrity - before;
    player.send({
      type: 'chat.message',
      channel: 'system',
      text: restored > 0 ? `You ${item.consumable.verb.toLowerCase()} the ${item.name}. +${restored} integrity.` : `You ${item.consumable.verb.toLowerCase()} the ${item.name}. You already feel fine.`,
    });
    this.host.raiseQuestEvent(player, { type: 'usedItem', itemId: item.id });
    this.host.raiseQuestEvent(player, { type: 'loadoutChanged' });
  }

  drop(player: Player, slotIndex: number): void {
    const stack = player.record.inventory[slotIndex];
    const item = stack ? this.content.items.get(stack.itemId) : undefined;
    if (!stack || !item) return;
    if (item.category === 'quest') {
      this.host.notify(player, 'warning', `You shouldn't drop the ${item.name}. Destroy it if you no longer want it.`);
      return;
    }
    const inventory = [...player.record.inventory];
    inventory[slotIndex] = null;
    player.update({ inventory });
    this.host.dropToGround(player, stack.itemId, stack.quantity, player.position);
    this.host.raiseQuestEvent(player, { type: 'loadoutChanged' });
  }

  destroy(player: Player, slotIndex: number): void {
    const stack = player.record.inventory[slotIndex];
    const item = stack ? this.content.items.get(stack.itemId) : undefined;
    if (!stack || !item) return;
    if (item.category !== 'quest') {
      this.host.notify(player, 'warning', `Drop the ${item.name} instead.`);
      return;
    }
    const inventory = [...player.record.inventory];
    inventory[slotIndex] = null;
    player.update({ inventory, flags: recordDestroyed(player.record.flags, item.id, stack.quantity) });
    this.host.notify(player, 'info', `You destroy the ${item.name}. Whoever gave it to you can issue another.`);
    this.host.raiseQuestEvent(player, { type: 'loadoutChanged' });
  }

  swap(player: Player, from: number, to: number): void {
    const result = swapSlots(player.record.inventory, from, to);
    if (result.ok) player.update({ inventory: result.value });
  }

  private loadoutOf(player: Player): Loadout {
    return { inventory: player.record.inventory, equipment: player.record.equipment };
  }

  private commitLoadout(player: Player, loadout: Loadout, equipmentChanged: boolean): void {
    player.update({ inventory: loadout.inventory, equipment: loadout.equipment });
    if (equipmentChanged) {
      this.world.levelOf(player).broadcastNear(player.position, {
        type: 'world.entityGearChanged',
        entityId: player.entityId,
        gear: equippedItemIds(loadout.equipment),
      });
    }
    this.host.raiseQuestEvent(player, { type: 'loadoutChanged' });
  }
}
