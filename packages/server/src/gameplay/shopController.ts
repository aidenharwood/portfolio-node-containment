import { chebyshevDistance, purchase, sale, shopCurrencyLabel, type GameContent, type InstanceId, type ItemId, type ShopId } from '@containment/shared';
import type { Player } from '../world/player.ts';
import type { World } from '../world/world.ts';
import type { EffectHost } from './effectRunner.ts';

const MAX_TRADE_DISTANCE = 3;

export class ShopController {
  private readonly content: GameContent;
  private readonly world: World;
  private readonly host: EffectHost;

  constructor(content: GameContent, world: World, host: EffectHost) {
    this.content = content;
    this.world = world;
    this.host = host;
  }

  open(player: Player, shopId: ShopId, keeperInstanceId: InstanceId | null): void {
    if (!this.content.shops.has(shopId)) return;
    player.shopSession = { shopId, keeperInstanceId };
    player.send({ type: 'shop.opened', shopId });
  }

  close(player: Player): void {
    if (!player.shopSession) return;
    player.shopSession = null;
    player.send({ type: 'shop.closed' });
  }

  buy(player: Player, itemId: ItemId, quantity: number): void {
    const shop = this.activeShop(player);
    if (!shop) return;
    const result = purchase(player.record.inventory, this.content.items, shop, itemId, quantity);
    if (!result.ok) {
      this.host.notify(player, 'warning', result.error);
      return;
    }
    player.update({ inventory: result.value.inventory });
    const name = this.content.items.get(itemId)?.name ?? itemId;
    player.send({ type: 'chat.message', channel: 'system', text: `Bought ${quantity} × ${name} for ${-result.value.scripDelta} ${shopCurrencyLabel(shop)}.` });
    this.host.raiseQuestEvent(player, { type: 'loadoutChanged' });
  }

  sell(player: Player, slotIndex: number, quantity: number): void {
    const shop = this.activeShop(player);
    if (!shop) return;
    const result = sale(player.record.inventory, this.content.items, shop, slotIndex, quantity);
    if (!result.ok) {
      this.host.notify(player, 'warning', result.error);
      return;
    }
    player.update({ inventory: result.value.inventory });
    player.send({ type: 'chat.message', channel: 'system', text: `Sold ${result.value.sold} × ${result.value.item.name} for ${result.value.scripDelta} scrip.` });
    this.host.raiseQuestEvent(player, { type: 'loadoutChanged' });
  }

  private activeShop(player: Player) {
    const session = player.shopSession;
    if (!session) return null;
    if (session.keeperInstanceId) {
      const keeper = this.world.findLevelOf(player)?.npcs.get(session.keeperInstanceId);
      if (!keeper || chebyshevDistance(keeper.position, player.position) > MAX_TRADE_DISTANCE) {
        this.close(player);
        this.host.notify(player, 'warning', 'You are too far away to trade.');
        return null;
      }
    }
    return this.content.shops.get(session.shopId) ?? null;
  }
}
