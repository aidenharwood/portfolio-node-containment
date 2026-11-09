import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { addItem, countItem, createDefaultDraft, CURRENCY_ITEM_ID, GAME_CONTENT, type CharacterRecord } from '@containment/shared';
import { createCharacterRecord } from '../src/characters/characterFactory.ts';
import { createHarness, at, levelPoint, RecordingSink } from './support/testHarness.ts';

const atExchange = (record: CharacterRecord): CharacterRecord => ({
  ...record,
  location: at('meridian-atrium', { x: 11, y: 6 }),
  inventory: addItem(addItem(record.inventory, GAME_CONTENT.items, 'scrap-alloy', 20).inventory, GAME_CONTENT.items, CURRENCY_ITEM_ID, 500).inventory,
});

describe('market', () => {
  test('is only reachable at the hub exchange, and matches buyers with the cheapest sellers', () => {
    const harness = createHarness({ prepare: atExchange });
    const seller = harness.player;
    harness.send({ type: 'market.place', side: 'sell', itemId: 'scrap-alloy', price: 5, quantity: 10 });
    assert.equal(countItem(seller.record.inventory, 'scrap-alloy'), 20, 'the market must be opened at the exchange');

    harness.interactWithObject('atrium-exchange');
    assert.equal(harness.sink.last('market.opened')?.type, 'market.opened');
    harness.send({ type: 'market.place', side: 'sell', itemId: 'scrap-alloy', price: 5, quantity: 10 });
    harness.send({ type: 'market.place', side: 'sell', itemId: 'scrap-alloy', price: 3, quantity: 4 });
    assert.equal(countItem(seller.record.inventory, 'scrap-alloy'), 6);
    assert.deepEqual(harness.sink.last('market.state')?.quotes, [{ itemId: 'scrap-alloy', lowestSell: 3, sellVolume: 14, highestBuy: null, buyVolume: 0 }]);

    const buyerRecord = atExchange(createCharacterRecord({ ...createDefaultDraft(), name: 'Second Operative' }, { id: 'character-2', accountId: 'account-2' }, GAME_CONTENT));
    const placedBuyer = { ...buyerRecord, quests: {} };
    const buyerSink = new RecordingSink();
    const buyer = harness.gameplay.enterWorld(placedBuyer, buyerSink);
    const send = (message: Parameters<typeof harness.gameplay.handle>[1]) => harness.gameplay.handle(buyer, message);
    send({ type: 'world.interact', targetKind: 'object', instanceId: 'atrium-exchange', interactionIndex: 0 });
    harness.ticksUntil(() => buyer.pendingInteraction === null);
    const scripBefore = countItem(buyer.record.inventory, CURRENCY_ITEM_ID);
    const scrapBefore = countItem(buyer.record.inventory, 'scrap-alloy');

    send({ type: 'market.place', side: 'buy', itemId: 'scrap-alloy', price: 6, quantity: 6 });
    assert.equal(countItem(buyer.record.inventory, CURRENCY_ITEM_ID), scripBefore - 36);
    const buyOrder = buyerSink.last('market.state')!.orders[0]!;
    assert.equal(buyOrder.filled, 6);
    assert.equal(buyOrder.uncollectedItems, 6);
    assert.equal(buyOrder.uncollectedScrip, 4 * 3 + 2 * 1);
    assert.ok(harness.sink.messages.some((message) => message.type === 'notice' && message.text.includes('has traded')));

    send({ type: 'market.collect', orderId: null });
    assert.equal(countItem(buyer.record.inventory, 'scrap-alloy'), scrapBefore + 6);
    assert.equal(countItem(buyer.record.inventory, CURRENCY_ITEM_ID), scripBefore - 4 * 3 - 2 * 5);
    assert.deepEqual(buyerSink.last('market.state')?.orders, []);

    const sellerScrip = countItem(seller.record.inventory, CURRENCY_ITEM_ID);
    harness.send({ type: 'market.collect', orderId: null });
    assert.equal(countItem(seller.record.inventory, CURRENCY_ITEM_ID), sellerScrip + 22);
    const remaining = harness.sink.last('market.state')!.orders;
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0]!.filled, 2);

    harness.send({ type: 'market.cancel', orderId: remaining[0]!.id });
    assert.equal(countItem(seller.record.inventory, 'scrap-alloy'), 14);
    assert.deepEqual(harness.sink.last('market.state')?.orders, []);

    harness.send({ type: 'world.walk', target: levelPoint('meridian-atrium', { x: 8, y: 10 }) });
    assert.equal(harness.sink.last('market.closed')?.type, 'market.closed');
  });

  test('refuses quest items and players cannot cancel orders they do not own', () => {
    const harness = createHarness({ prepare: (record) => ({ ...atExchange(record), inventory: addItem(atExchange(record).inventory, GAME_CONTENT.items, 'clearance-card-l1', 1).inventory }) });
    harness.interactWithObject('atrium-exchange');
    harness.send({ type: 'market.place', side: 'sell', itemId: 'clearance-card-l1', price: 5, quantity: 1 });
    assert.equal(countItem(harness.player.record.inventory, 'clearance-card-l1'), 1);
    harness.send({ type: 'market.cancel', orderId: 'not-mine' });
    assert.deepEqual(harness.sink.last('market.state')?.orders, []);
  });

  test('a Site mailbox collects and withdraws orders but cannot post them', () => {
    const harness = createHarness({ prepare: atExchange });
    harness.interactWithObject('atrium-exchange');
    harness.send({ type: 'market.place', side: 'sell', itemId: 'scrap-alloy', price: 5, quantity: 10 });
    const order = harness.sink.last('market.state')!.orders[0]!;
    harness.send({ type: 'market.close' });

    harness.gameplay.openMarket(harness.player, 'collect');
    assert.deepEqual(harness.sink.last('market.opened'), { type: 'market.opened', access: 'collect' });
    harness.send({ type: 'market.place', side: 'sell', itemId: 'scrap-alloy', price: 5, quantity: 10 });
    assert.equal(countItem(harness.player.record.inventory, 'scrap-alloy'), 10);
    assert.equal(harness.sink.last('market.state')?.orders.length, 1);

    harness.send({ type: 'market.cancel', orderId: order.id });
    assert.equal(countItem(harness.player.record.inventory, 'scrap-alloy'), 20);
    assert.deepEqual(harness.sink.last('market.state')?.orders, []);
  });

  test('a Site mailbox only connects from a Site hub', () => {
    const harness = createHarness({ prepare: (record) => ({ ...atExchange(record), location: at('hydroponics', { x: 4, y: 13 }) }) });
    harness.gameplay.openMarket(harness.player, 'collect');
    assert.equal(harness.sink.last('market.opened'), undefined);
  });
});
