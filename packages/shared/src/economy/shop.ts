import { addItem, countItem, removeItem, type InventoryState } from '../gear/inventory.ts';
import type { ItemCatalog, ItemCategory, ItemDefinition } from '../gear/items.ts';
import type { ItemId } from '../ids.ts';
import { failure, success, type Result } from '../result.ts';

export type ShopId = string;

export const CURRENCY_ITEM_ID: ItemId = 'meridian-scrip';

export interface ShopListing {
  readonly itemId: ItemId;
  readonly price: number;
}

export interface ShopDefinition {
  readonly id: ShopId;
  readonly name: string;
  readonly greeting: string;
  readonly listings: readonly ShopListing[];
  readonly buysCategories: readonly ItemCategory[];
  readonly sellRate: number;
}

export interface TradeOutcome {
  readonly inventory: InventoryState;
  readonly scripDelta: number;
}

export const MAX_TRADE_QUANTITY = 100;

export function sellPrice(item: ItemDefinition, shop: ShopDefinition): number | null {
  if (item.id === CURRENCY_ITEM_ID || !shop.buysCategories.includes(item.category) || item.value <= 0) return null;
  return Math.max(1, Math.floor(item.value * shop.sellRate));
}

export function purchase(
  inventory: InventoryState,
  catalog: ItemCatalog,
  shop: ShopDefinition,
  itemId: ItemId,
  quantity: number,
): Result<TradeOutcome> {
  const listing = shop.listings.find((candidate) => candidate.itemId === itemId);
  if (!listing) return failure('That is not for sale here.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_TRADE_QUANTITY) return failure('Invalid quantity.');
  const cost = listing.price * quantity;
  if (countItem(inventory, CURRENCY_ITEM_ID) < cost) return failure(`You need ${cost} scrip for that.`);

  const paid = removeItem(inventory, CURRENCY_ITEM_ID, cost);
  if (!paid.ok) return paid;
  const received = addItem(paid.value, catalog, itemId, quantity);
  if (received.overflow > 0) return failure('You do not have room for that.');
  return success({ inventory: received.inventory, scripDelta: -cost });
}

export function sale(
  inventory: InventoryState,
  catalog: ItemCatalog,
  shop: ShopDefinition,
  slotIndex: number,
  quantity: number,
): Result<TradeOutcome & { readonly item: ItemDefinition; readonly sold: number }> {
  const stack = inventory[slotIndex];
  const item = stack ? catalog.get(stack.itemId) : undefined;
  if (!stack || !item) return failure('There is nothing in that slot.');
  const price = sellPrice(item, shop);
  if (price === null) return failure(`${shop.name} won't take the ${item.name}.`);
  if (!Number.isInteger(quantity) || quantity < 1) return failure('Invalid quantity.');

  const sold = Math.min(quantity, countItem(inventory, item.id));
  const removed = removeItem(inventory, item.id, sold);
  if (!removed.ok) return removed;
  const earned = price * sold;
  const paid = addItem(removed.value, catalog, CURRENCY_ITEM_ID, earned);
  if (paid.overflow > 0) return failure('You have no room for the scrip.');
  return success({ inventory: paid.inventory, scripDelta: earned, item, sold });
}
