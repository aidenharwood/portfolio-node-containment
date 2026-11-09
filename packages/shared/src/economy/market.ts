import { addItem, countItem, removeItem, type InventoryState } from '../gear/inventory.ts';
import type { ItemCatalog, ItemDefinition } from '../gear/items.ts';
import type { CharacterId, DistrictId, ItemId } from '../ids.ts';
import { failure, success, type Result } from '../result.ts';
import { CURRENCY_ITEM_ID } from './shop.ts';

export type MarketSide = 'buy' | 'sell';

export type MarketOrderId = string;

export const MARKET_DISTRICT_ID: DistrictId = 'meridian-atrium';
export const MARKET_ORDER_LIMIT = 8;
export const MAX_MARKET_PRICE = 1_000_000_000;
export const MAX_MARKET_QUANTITY = 1_000_000;

export interface MarketOrder {
  readonly id: MarketOrderId;
  readonly ownerId: CharacterId;
  readonly side: MarketSide;
  readonly itemId: ItemId;
  readonly price: number;
  readonly quantity: number;
  readonly filled: number;
  readonly sequence: number;
  readonly open: boolean;
  readonly uncollectedItems: number;
  readonly uncollectedScrip: number;
}

export interface MarketOrderRequest {
  readonly side: MarketSide;
  readonly itemId: ItemId;
  readonly price: number;
  readonly quantity: number;
}

export interface MarketFill {
  readonly buyOrderId: MarketOrderId;
  readonly sellOrderId: MarketOrderId;
  readonly itemId: ItemId;
  readonly quantity: number;
  readonly price: number;
}

export interface MarketQuote {
  readonly itemId: ItemId;
  readonly lowestSell: number | null;
  readonly sellVolume: number;
  readonly highestBuy: number | null;
  readonly buyVolume: number;
}

export interface MarketMatch {
  readonly changed: readonly MarketOrder[];
  readonly fills: readonly MarketFill[];
}

export interface MarketCollection {
  readonly inventory: InventoryState;
  readonly order: MarketOrder;
  readonly items: number;
  readonly scrip: number;
}

export const isTradable = (item: ItemDefinition): boolean => item.category !== 'quest' && item.category !== 'currency';

export const defaultMarketPrice = (item: ItemDefinition): number => Math.max(1, item.value);

export const tradableItems = (catalog: ItemCatalog): ItemDefinition[] => [...catalog.values()].filter(isTradable);

export const remainingQuantity = (order: MarketOrder): number => order.quantity - order.filled;

export const isSettled = (order: MarketOrder): boolean => !order.open && order.uncollectedItems === 0 && order.uncollectedScrip === 0;

export const escrowFor = (request: MarketOrderRequest): number => (request.side === 'buy' ? request.price * request.quantity : request.quantity);

export function placeOrder(
  inventory: InventoryState,
  catalog: ItemCatalog,
  ownOrders: readonly MarketOrder[],
  request: MarketOrderRequest,
  identity: { readonly id: MarketOrderId; readonly ownerId: CharacterId; readonly sequence: number },
): Result<{ readonly inventory: InventoryState; readonly order: MarketOrder }> {
  const item = catalog.get(request.itemId);
  if (!item || !isTradable(item)) return failure('That cannot be traded on the market.');
  if (!Number.isInteger(request.price) || request.price < 1 || request.price > MAX_MARKET_PRICE) return failure('Set a price of at least 1 scrip.');
  if (!Number.isInteger(request.quantity) || request.quantity < 1 || request.quantity > MAX_MARKET_QUANTITY) return failure('Invalid quantity.');
  if (ownOrders.length >= MARKET_ORDER_LIMIT) return failure(`You can hold at most ${MARKET_ORDER_LIMIT} orders. Collect or cancel one first.`);

  const escrowItemId = request.side === 'buy' ? CURRENCY_ITEM_ID : request.itemId;
  const escrow = escrowFor(request);
  if (countItem(inventory, escrowItemId) < escrow) {
    return failure(request.side === 'buy' ? `You need ${escrow.toLocaleString()} scrip for that order.` : `You are not carrying ${request.quantity} × ${item.name}.`);
  }
  const removed = removeItem(inventory, escrowItemId, escrow);
  if (!removed.ok) return removed;

  return success({
    inventory: removed.value,
    order: {
      id: identity.id,
      ownerId: identity.ownerId,
      side: request.side,
      itemId: request.itemId,
      price: request.price,
      quantity: request.quantity,
      filled: 0,
      sequence: identity.sequence,
      open: true,
      uncollectedItems: 0,
      uncollectedScrip: 0,
    },
  });
}

const crosses = (incoming: MarketOrder, resting: MarketOrder): boolean =>
  incoming.side === 'buy' ? resting.price <= incoming.price : resting.price >= incoming.price;

const priority = (incoming: MarketOrder) => (left: MarketOrder, right: MarketOrder): number =>
  (incoming.side === 'buy' ? left.price - right.price : right.price - left.price) || left.sequence - right.sequence;

function settle(order: MarketOrder, quantity: number, price: number): MarketOrder {
  const filled = order.filled + quantity;
  const open = filled < order.quantity;
  if (order.side === 'buy') {
    return { ...order, filled, open, uncollectedItems: order.uncollectedItems + quantity, uncollectedScrip: order.uncollectedScrip + (order.price - price) * quantity };
  }
  return { ...order, filled, open, uncollectedScrip: order.uncollectedScrip + price * quantity };
}

export function matchOrder(book: readonly MarketOrder[], incoming: MarketOrder): MarketMatch {
  const counterparts = book
    .filter((resting) =>
      resting.open &&
      resting.itemId === incoming.itemId &&
      resting.side !== incoming.side &&
      resting.ownerId !== incoming.ownerId &&
      remainingQuantity(resting) > 0 &&
      crosses(incoming, resting))
    .sort(priority(incoming));

  let taker = incoming;
  const changed: MarketOrder[] = [];
  const fills: MarketFill[] = [];
  for (const resting of counterparts) {
    const quantity = Math.min(remainingQuantity(taker), remainingQuantity(resting));
    if (quantity <= 0) break;
    const price = resting.price;
    taker = settle(taker, quantity, price);
    changed.push(settle(resting, quantity, price));
    fills.push({
      buyOrderId: taker.side === 'buy' ? taker.id : resting.id,
      sellOrderId: taker.side === 'sell' ? taker.id : resting.id,
      itemId: incoming.itemId,
      quantity,
      price,
    });
  }
  return { changed: [taker, ...changed], fills };
}

export function cancelOrder(order: MarketOrder): Result<MarketOrder> {
  if (!order.open) return failure('That order is already closed.');
  const remaining = remainingQuantity(order);
  return success(order.side === 'buy'
    ? { ...order, open: false, uncollectedScrip: order.uncollectedScrip + remaining * order.price }
    : { ...order, open: false, uncollectedItems: order.uncollectedItems + remaining });
}

export function collectOrder(inventory: InventoryState, catalog: ItemCatalog, order: MarketOrder): Result<MarketCollection> {
  if (order.uncollectedItems === 0 && order.uncollectedScrip === 0) return failure('There is nothing to collect from that order.');
  const withItems = addItem(inventory, catalog, order.itemId, order.uncollectedItems);
  const withScrip = addItem(withItems.inventory, catalog, CURRENCY_ITEM_ID, order.uncollectedScrip);
  if (withItems.added === 0 && withScrip.added === 0) return failure('You have no room to collect that.');
  return success({
    inventory: withScrip.inventory,
    order: { ...order, uncollectedItems: withItems.overflow, uncollectedScrip: withScrip.overflow },
    items: withItems.added,
    scrip: withScrip.added,
  });
}

export function marketQuotes(book: readonly MarketOrder[]): MarketQuote[] {
  const quotes = new Map<ItemId, { lowestSell: number | null; sellVolume: number; highestBuy: number | null; buyVolume: number }>();
  for (const order of book) {
    const remaining = remainingQuantity(order);
    if (!order.open || remaining <= 0) continue;
    const quote = quotes.get(order.itemId) ?? { lowestSell: null, sellVolume: 0, highestBuy: null, buyVolume: 0 };
    if (order.side === 'sell') {
      quote.lowestSell = quote.lowestSell === null ? order.price : Math.min(quote.lowestSell, order.price);
      quote.sellVolume += remaining;
    } else {
      quote.highestBuy = quote.highestBuy === null ? order.price : Math.max(quote.highestBuy, order.price);
      quote.buyVolume += remaining;
    }
    quotes.set(order.itemId, quote);
  }
  return [...quotes].map(([itemId, quote]) => ({ itemId, ...quote }));
}
