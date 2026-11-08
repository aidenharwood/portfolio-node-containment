import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { countItem, storedCount, type CharacterRecord } from '@containment/shared';
import { createHarness, at, levelPoint } from './support/testHarness.ts';

const nearLocker = (record: CharacterRecord): CharacterRecord => ({
  ...record,
  location: at('meridian-atrium', { x: 9, y: 2 }),
  inventory: [{ itemId: 'scrap-alloy', quantity: 30 }, { itemId: 'stun-baton', quantity: 1 }, { itemId: 'clearance-card-l1', quantity: 1 }, ...record.inventory.slice(3)],
});

describe('personal storage', () => {
  test('deposits and withdraws through a storage locker, and leaves quest items in the pack when depositing everything', () => {
    const harness = createHarness({ prepare: nearLocker });
    const { player } = harness;
    harness.send({ type: 'storage.deposit', slotIndex: 0, quantity: 5 });
    assert.equal(countItem(player.record.inventory, 'scrap-alloy'), 30, 'storage must be opened at a locker');

    harness.interactWithObject('atrium-storage-a');
    assert.equal(player.storageOpen, true);
    harness.send({ type: 'storage.deposit', slotIndex: 0, quantity: 5 });
    assert.equal(storedCount(player.record.storage, 'scrap-alloy'), 5);
    assert.equal(countItem(player.record.inventory, 'scrap-alloy'), 25);

    harness.send({ type: 'storage.depositAll' });
    assert.equal(storedCount(player.record.storage, 'scrap-alloy'), 30);
    assert.equal(storedCount(player.record.storage, 'stun-baton'), 1);
    assert.equal(countItem(player.record.inventory, 'clearance-card-l1'), 1);

    harness.send({ type: 'storage.withdraw', itemId: 'scrap-alloy', quantity: 1_000 });
    assert.equal(countItem(player.record.inventory, 'scrap-alloy'), 30);
    assert.equal(storedCount(player.record.storage, 'scrap-alloy'), 0);

    harness.send({ type: 'world.walk', target: levelPoint('meridian-atrium', { x: 8, y: 10 }) });
    assert.equal(player.storageOpen, false);
    assert.equal(harness.sink.last('storage.closed')?.type, 'storage.closed');
  });
});
