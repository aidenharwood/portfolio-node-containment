import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  COMMENDATION_ITEM_ID,
  countItem,
  CURRENCY_ITEM_ID,
  type CharacterRecord,
} from '@containment/shared';
import { inRoom, createHarness, CONTENT } from './support/testHarness.ts';


const atTheBoard = (record: CharacterRecord): CharacterRecord => ({
  ...record,
  location: inRoom('fx-hub', 'plaza'),
  quests: {},
});

describe('contract board', () => {
  test('rolls a board on login, tracks progress, pays out at the board and sells for commendations', () => {
    const harness = createHarness({ prepare: atTheBoard });
    const { player } = harness;
    const daily = player.record.contracts.daily;
    assert.equal(daily?.entries.length, 3);
    assert.equal(player.record.contracts.weekly?.entries.length, 2);
    for (const entry of daily!.entries) assert.equal(CONTENT.contracts.get(entry.contractId)?.tier, 1);

    const entry = daily!.entries[0]!;
    const contract = CONTENT.contracts.get(entry.contractId)!;
    harness.send({ type: 'contracts.claim', cadence: 'daily', contractId: contract.id });
    assert.equal(player.record.contracts.daily?.entries[0]?.claimed, false, 'claiming needs the board open');

    harness.interactWithObject('hub-contracts');
    assert.equal(harness.sink.last('contracts.opened')?.type, 'contracts.opened');
    harness.send({ type: 'contracts.claim', cadence: 'daily', contractId: contract.id });
    assert.equal(player.record.contracts.daily?.entries[0]?.claimed, false, 'unfinished contracts do not pay');

    const objective = contract.objective;
    const event = objective.type === 'defeat' ? { type: 'defeated' as const, creatureId: objective.creatureIds[0]! }
      : objective.type === 'contain' ? { type: 'contained' as const, creatureId: objective.creatureIds[0]! }
      : objective.type === 'gather' ? { type: 'gathered' as const, itemId: objective.itemIds[0]!, count: objective.count }
      : { type: 'crafted' as const, itemId: objective.itemIds[0]!, count: objective.count };
    for (let step = 0; step < objective.count; step++) harness.gameplay.raiseQuestEvent(player, event);
    assert.equal(player.record.contracts.daily?.entries[0]?.progress, objective.count);

    const scripBefore = countItem(player.record.inventory, CURRENCY_ITEM_ID);
    harness.send({ type: 'contracts.claim', cadence: 'daily', contractId: contract.id });
    assert.equal(player.record.contracts.daily?.entries[0]?.claimed, true);
    assert.ok(countItem(player.record.inventory, CURRENCY_ITEM_ID) > scripBefore);
    assert.equal(countItem(player.record.inventory, COMMENDATION_ITEM_ID), contract.commendations);
    assert.ok(harness.saved.some((record) => record.contracts.claimedTotal === 1));

    harness.interactWithObject('hub-contracts', 1);
    assert.equal(harness.sink.last('shop.opened')?.shopId, 'contracts-office');
    const medgelBefore = countItem(player.record.inventory, 'medgel');
    harness.send({ type: 'shop.buy', itemId: 'medgel', quantity: 1 });
    assert.equal(countItem(player.record.inventory, 'medgel'), medgelBefore + 1);
    assert.equal(countItem(player.record.inventory, COMMENDATION_ITEM_ID), contract.commendations - 2);
  });
});
