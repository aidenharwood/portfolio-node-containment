import { randomUUID } from 'node:crypto';
import {
  cancelOrder,
  collectOrder,
  isSettled,
  isSiteHub,
  MARKET_DISTRICT_ID,
  marketQuotes,
  matchOrder,
  placeOrder,
  type CharacterId,
  type GameContent,
  type MarketAccess,
  type MarketFill,
  type MarketOrder,
  type MarketOrderId,
  type MarketOrderRequest,
} from '@containment/shared';
import type { Player } from '../world/player.ts';
import type { World } from '../world/world.ts';
import type { EffectHost } from './effectRunner.ts';

export interface MarketStore {
  load(): MarketOrder[];
  save(order: MarketOrder): void;
  remove(orderId: MarketOrderId): void;
}

export const createMemoryMarketStore = (): MarketStore => ({ load: () => [], save: () => {}, remove: () => {} });

export class MarketController {
  private readonly content: GameContent;
  private readonly world: World;
  private readonly host: EffectHost;
  private readonly store: MarketStore;
  private readonly onlinePlayer: (characterId: CharacterId) => Player | undefined;
  private readonly orders = new Map<MarketOrderId, MarketOrder>();
  private readonly browsing = new Map<Player, MarketAccess>();
  private nextSequence: number;

  constructor(
    content: GameContent,
    world: World,
    host: EffectHost,
    store: MarketStore,
    onlinePlayer: (characterId: CharacterId) => Player | undefined,
  ) {
    this.content = content;
    this.world = world;
    this.host = host;
    this.store = store;
    this.onlinePlayer = onlinePlayer;
    for (const order of store.load()) this.orders.set(order.id, order);
    this.nextSequence = Math.max(0, ...[...this.orders.values()].map((order) => order.sequence)) + 1;
  }

  open(player: Player, access: MarketAccess): void {
    const district = this.world.districtOf(player);
    if (access === 'trade' && district !== MARKET_DISTRICT_ID) {
      this.host.notify(player, 'warning', 'The exchange is only reachable from the Meridian Atrium.');
      return;
    }
    if (access === 'collect' && !isSiteHub(this.content.sites, district)) {
      this.host.notify(player, 'warning', 'The exchange mailbox only connects from a Site hub.');
      return;
    }
    this.browsing.set(player, access);
    player.send({ type: 'market.opened', access });
    this.sendState(player);
  }

  close(player: Player): void {
    if (!this.browsing.delete(player)) return;
    player.send({ type: 'market.closed' });
  }

  forget(player: Player): void {
    this.browsing.delete(player);
  }

  isOpen(player: Player): boolean {
    return this.browsing.has(player);
  }

  ordersOf(characterId: CharacterId): MarketOrder[] {
    return [...this.orders.values()].filter((order) => order.ownerId === characterId).sort((left, right) => left.sequence - right.sequence);
  }

  removeOwner(characterId: CharacterId): void {
    for (const order of this.ordersOf(characterId)) this.delete(order.id);
    this.broadcastState();
  }

  place(player: Player, request: MarketOrderRequest): void {
    if (this.browsing.get(player) !== 'trade') return;
    const placed = placeOrder(player.record.inventory, this.content.items, this.ordersOf(player.record.id), request, {
      id: randomUUID(),
      ownerId: player.record.id,
      sequence: this.nextSequence,
    });
    if (!placed.ok) {
      this.host.notify(player, 'warning', placed.error);
      return;
    }
    this.nextSequence++;
    player.update({ inventory: placed.value.inventory });
    this.host.raiseQuestEvent(player, { type: 'loadoutChanged' });

    const match = matchOrder([...this.orders.values()], placed.value.order);
    for (const order of match.changed) this.put(order);
    const item = this.content.items.get(request.itemId)?.name ?? request.itemId;
    const filledNow = match.fills.reduce((total, fill) => total + fill.quantity, 0);
    player.send({
      type: 'chat.message',
      channel: 'system',
      text: `Posted a ${request.side} order for ${request.quantity} × ${item} at ${request.price.toLocaleString()} scrip each${filledNow > 0 ? `. ${filledNow} filled straight away.` : '.'}`,
    });
    this.announceFills(player, match.fills);
    this.broadcastState();
  }

  cancel(player: Player, orderId: MarketOrderId): void {
    const order = this.ownedOrder(player, orderId);
    if (!order) return;
    const cancelled = cancelOrder(order);
    if (!cancelled.ok) {
      this.host.notify(player, 'warning', cancelled.error);
      return;
    }
    this.put(cancelled.value);
    this.collectInto(player, cancelled.value);
    this.broadcastState();
  }

  collect(player: Player, orderId: MarketOrderId | null): void {
    if (!this.browsing.has(player)) return;
    const targets = orderId === null ? this.ordersOf(player.record.id) : [this.ownedOrder(player, orderId)].filter((order) => order !== null);
    const collectable = targets.filter((order) => order.uncollectedItems > 0 || order.uncollectedScrip > 0);
    if (collectable.length === 0) {
      this.host.notify(player, 'info', 'There is nothing waiting to be collected.');
      return;
    }
    for (const order of collectable) this.collectInto(player, order);
    this.sendState(player);
  }

  private collectInto(player: Player, order: MarketOrder): void {
    const collected = collectOrder(player.record.inventory, this.content.items, order);
    if (!collected.ok) {
      if (order.uncollectedItems > 0 || order.uncollectedScrip > 0) this.host.notify(player, 'warning', collected.error);
      this.sendState(player);
      return;
    }
    player.update({ inventory: collected.value.inventory });
    this.put(collected.value.order);
    this.host.raiseQuestEvent(player, { type: 'loadoutChanged' });
    if (collected.value.order.uncollectedItems > 0 || collected.value.order.uncollectedScrip > 0) {
      this.host.notify(player, 'warning', 'Your pack is full. The rest is waiting at the exchange.');
    }
  }

  private ownedOrder(player: Player, orderId: MarketOrderId): MarketOrder | null {
    if (!this.browsing.has(player)) return null;
    const order = this.orders.get(orderId);
    return order && order.ownerId === player.record.id ? order : null;
  }

  private put(order: MarketOrder): void {
    if (isSettled(order)) {
      this.delete(order.id);
      return;
    }
    this.orders.set(order.id, order);
    this.store.save(order);
  }

  private delete(orderId: MarketOrderId): void {
    this.orders.delete(orderId);
    this.store.remove(orderId);
  }

  private announceFills(taker: Player, fills: readonly MarketFill[]): void {
    const notified = new Set<CharacterId>([taker.record.id]);
    for (const fill of fills) {
      for (const orderId of [fill.buyOrderId, fill.sellOrderId]) {
        const order = this.orders.get(orderId);
        if (!order || notified.has(order.ownerId)) continue;
        const owner = this.onlinePlayer(order.ownerId);
        if (!owner) continue;
        notified.add(order.ownerId);
        const item = this.content.items.get(order.itemId)?.name ?? order.itemId;
        this.host.notify(owner, 'info', `Your ${order.side} order for ${item} has traded. Collect at the exchange in the Atrium.`);
      }
    }
  }

  private broadcastState(): void {
    for (const player of this.browsing.keys()) this.sendState(player);
  }

  private sendState(player: Player): void {
    if (!this.browsing.has(player)) return;
    player.send({ type: 'market.state', orders: this.ordersOf(player.record.id), quotes: marketQuotes([...this.orders.values()]) });
  }
}
