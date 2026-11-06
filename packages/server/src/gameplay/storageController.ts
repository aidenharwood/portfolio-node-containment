import { deposit, depositAll, withdraw, type GameContent, type ItemId, type Result, type StorageTransfer } from '@containment/shared';
import type { Player } from '../world/player.ts';
import type { EffectHost } from './effectRunner.ts';

export class StorageController {
  private readonly content: GameContent;
  private readonly host: EffectHost;

  constructor(content: GameContent, host: EffectHost) {
    this.content = content;
    this.host = host;
  }

  open(player: Player): void {
    player.storageOpen = true;
    player.send({ type: 'storage.opened' });
  }

  close(player: Player): void {
    if (!player.storageOpen) return;
    player.storageOpen = false;
    player.send({ type: 'storage.closed' });
  }

  deposit(player: Player, slotIndex: number, quantity: number): void {
    if (!player.storageOpen) return;
    this.apply(player, deposit(player.record.inventory, player.record.storage, this.content.items, slotIndex, quantity));
  }

  depositAll(player: Player): void {
    if (!player.storageOpen) return;
    this.apply(player, { ok: true, value: depositAll(player.record.inventory, player.record.storage, this.content.items) });
  }

  withdraw(player: Player, itemId: ItemId, quantity: number): void {
    if (!player.storageOpen) return;
    this.apply(player, withdraw(player.record.inventory, player.record.storage, this.content.items, itemId, quantity));
  }

  private apply(player: Player, result: Result<StorageTransfer>): void {
    if (!result.ok) {
      this.host.notify(player, 'warning', result.error);
      return;
    }
    player.update({ inventory: result.value.inventory, storage: result.value.storage });
    this.host.raiseQuestEvent(player, { type: 'loadoutChanged' });
  }
}
