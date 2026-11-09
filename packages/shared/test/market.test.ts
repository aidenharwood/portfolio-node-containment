import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  addItem,
  cancelOrder,
  collectOrder,
  countItem,
  createEmptyInventory,
  CURRENCY_ITEM_ID,
  defaultMarketPrice,
  GAME_CONTENT,
  isTradable,
  MARKET_ORDER_LIMIT,
  marketQuotes,
  matchOrder,
  placeOrder,
  type MarketOrder,
  type MarketOrderRequest,
} from '../src/index.ts';

const items = GAME_CONTENT.items;
let sequence = 0;

function order(ownerId: string, request: MarketOrderRequest): MarketOrder {
  sequence++;
  return { id: `order-${sequence}`, ownerId, sequence, filled: 0, open: true, uncollectedItems: 0, uncollectedScrip: 0, ...request };
}

describe('market orders', () => {
  test('only non-quest, non-currency items trade, and every item has a default price of at least 1', () => {
    assert.equal(isTradable(items.get('scrap-alloy')!), true);
    assert.equal(isTradable(items.get(CURRENCY_ITEM_ID)!), false);
    assert.equal(isTradable(items.get('clearance-card-l1')!), false);
    for (const item of items.values()) assert.ok(defaultMarketPrice(item) >= 1);
  });

  test('placing escrows scrip for buys and items for sells', () => {
    const wallet = addItem(createEmptyInventory(), items, CURRENCY_ITEM_ID, 100).inventory;
    const buy = placeOrder(wallet, items, [], { side: 'buy', itemId: 'scrap-alloy', price: 7, quantity: 10 }, { id: 'a', ownerId: 'p', sequence: 1 });
    assert.ok(buy.ok);
    assert.equal(countItem(buy.value.inventory, CURRENCY_ITEM_ID), 30);
    assert.equal(placeOrder(wallet, items, [], { side: 'buy', itemId: 'scrap-alloy', price: 11, quantity: 10 }, { id: 'b', ownerId: 'p', sequence: 2 }).ok, false);

    const pack = addItem(createEmptyInventory(), items, 'scrap-alloy', 5).inventory;
    const sell = placeOrder(pack, items, [], { side: 'sell', itemId: 'scrap-alloy', price: 3, quantity: 5 }, { id: 'c', ownerId: 'p', sequence: 3 });
    assert.ok(sell.ok);
    assert.equal(countItem(sell.value.inventory, 'scrap-alloy'), 0);
    assert.equal(placeOrder(pack, items, [], { side: 'sell', itemId: 'scrap-alloy', price: 3, quantity: 6 }, { id: 'd', ownerId: 'p', sequence: 4 }).ok, false);

    const full = Array.from({ length: MARKET_ORDER_LIMIT }, () => order('p', { side: 'buy', itemId: 'scrap-alloy', price: 1, quantity: 1 }));
    assert.equal(placeOrder(wallet, items, full, { side: 'buy', itemId: 'scrap-alloy', price: 1, quantity: 1 }, { id: 'e', ownerId: 'p', sequence: 5 }).ok, false);
  });

  test('a buy fills from the cheapest sellers at or below its price, oldest first, and refunds the difference', () => {
    const cheapLate = order('s1', { side: 'sell', itemId: 'scrap-alloy', price: 4, quantity: 3 });
    const pricey = order('s2', { side: 'sell', itemId: 'scrap-alloy', price: 9, quantity: 10 });
    const cheapEarly = { ...order('s3', { side: 'sell', itemId: 'scrap-alloy', price: 4, quantity: 2 }), sequence: -1 };
    const tooDear = order('s4', { side: 'sell', itemId: 'scrap-alloy', price: 12, quantity: 10 });
    const buy = order('b', { side: 'buy', itemId: 'scrap-alloy', price: 10, quantity: 8 });

    const match = matchOrder([cheapLate, pricey, cheapEarly, tooDear], buy);
    assert.deepEqual(match.fills.map((fill) => [fill.sellOrderId, fill.quantity, fill.price]), [
      [cheapEarly.id, 2, 4],
      [cheapLate.id, 3, 4],
      [pricey.id, 3, 9],
    ]);
    const taker = match.changed[0]!;
    assert.equal(taker.open, false);
    assert.equal(taker.uncollectedItems, 8);
    assert.equal(taker.uncollectedScrip, 5 * 6 + 3 * 1);
    const priceyAfter = match.changed.find((changed) => changed.id === pricey.id)!;
    assert.equal(priceyAfter.filled, 3);
    assert.equal(priceyAfter.open, true);
    assert.equal(priceyAfter.uncollectedScrip, 27);
  });

  test('a sell fills against the highest buyers at or above its price, at their price', () => {
    const low = order('b1', { side: 'buy', itemId: 'scrap-alloy', price: 5, quantity: 10 });
    const high = order('b2', { side: 'buy', itemId: 'scrap-alloy', price: 8, quantity: 2 });
    const own = order('s', { side: 'buy', itemId: 'scrap-alloy', price: 20, quantity: 2 });
    const sell = order('s', { side: 'sell', itemId: 'scrap-alloy', price: 6, quantity: 5 });

    const match = matchOrder([low, high, own], sell);
    assert.deepEqual(match.fills.map((fill) => [fill.buyOrderId, fill.quantity, fill.price]), [[high.id, 2, 8]]);
    const taker = match.changed[0]!;
    assert.equal(taker.open, true);
    assert.equal(taker.filled, 2);
    assert.equal(taker.uncollectedScrip, 16);
  });

  test('cancelling returns the unfilled escrow for collection', () => {
    const buy = { ...order('b', { side: 'buy', itemId: 'scrap-alloy', price: 5, quantity: 10 }), filled: 4, uncollectedItems: 4 };
    const cancelled = cancelOrder(buy);
    assert.ok(cancelled.ok);
    assert.equal(cancelled.value.uncollectedScrip, 30);
    assert.equal(cancelOrder(cancelled.value).ok, false);

    const collected = collectOrder(createEmptyInventory(), items, cancelled.value);
    assert.ok(collected.ok);
    assert.equal(countItem(collected.value.inventory, 'scrap-alloy'), 4);
    assert.equal(countItem(collected.value.inventory, CURRENCY_ITEM_ID), 30);
    assert.equal(collected.value.order.uncollectedItems + collected.value.order.uncollectedScrip, 0);
  });

  test('quotes show the best open prices and volumes per item', () => {
    const quotes = marketQuotes([
      order('a', { side: 'sell', itemId: 'scrap-alloy', price: 6, quantity: 3 }),
      order('b', { side: 'sell', itemId: 'scrap-alloy', price: 4, quantity: 2 }),
      order('c', { side: 'buy', itemId: 'scrap-alloy', price: 3, quantity: 7 }),
    ]);
    assert.deepEqual(quotes, [{ itemId: 'scrap-alloy', lowestSell: 4, sellVolume: 5, highestBuy: 3, buyVolume: 7 }]);
  });
});
