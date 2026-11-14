import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { countItem, destroyedQuantity, storedCount, type CharacterRecord, type QuestProgress } from '@containment/shared';
import { inRoom, createHarness, type Harness } from './support/testHarness.ts';

const VAULT_RUN = 'vault-run';

const onStep = (questId: string, stepIndex: number): QuestProgress => ({ questId, status: 'active', stepIndex, objectiveProgress: [0] });

const carrying = (record: CharacterRecord, itemId: string, quantity = 1): CharacterRecord['inventory'] => [{ itemId, quantity }, ...record.inventory.slice(1)];

const slotOf = (harness: Harness, itemId: string): number => harness.player.record.inventory.findIndex((slot) => slot?.itemId === itemId);

describe('quest items', () => {
  test('a single quest item can be banked, but depositing the pack leaves quest items behind', () => {
    const harness = createHarness({
      prepare: (record) => ({
        ...record,
        location: inRoom('fx-hub', 'plaza'),
        inventory: [{ itemId: 'vault-keycard', quantity: 1 }, { itemId: 'field-log', quantity: 1 }, { itemId: 'scrap-alloy', quantity: 4 }, ...record.inventory.slice(3)],
      }),
    });
    const { player } = harness;
    harness.interactWithObject('hub-storage');
    harness.send({ type: 'storage.depositAll' });
    assert.equal(countItem(player.record.inventory, 'vault-keycard'), 1);
    assert.equal(storedCount(player.record.storage, 'scrap-alloy'), 4);

    harness.send({ type: 'storage.deposit', slotIndex: slotOf(harness, 'field-log'), quantity: 1 });
    assert.equal(countItem(player.record.inventory, 'field-log'), 0);
    assert.equal(storedCount(player.record.storage, 'field-log'), 1);

    harness.send({ type: 'storage.withdraw', itemId: 'field-log', quantity: 1 });
    assert.equal(countItem(player.record.inventory, 'field-log'), 1);
  });

  test('only quest items can be destroyed', () => {
    const harness = createHarness({ prepare: (record) => ({ ...record, inventory: carrying(record, 'scrap-alloy', 3) }) });
    harness.send({ type: 'inventory.destroy', slotIndex: 0 });
    assert.equal(countItem(harness.player.record.inventory, 'scrap-alloy'), 3);
  });

  test('the NPC who issued a destroyed quest item hands over a replacement once', () => {
    const harness = createHarness({
      prepare: (record) => ({ ...record, location: inRoom('fx-hub', 'plaza'), quests: { [VAULT_RUN]: onStep(VAULT_RUN, 1) }, inventory: carrying(record, 'vault-keycard') }),
    });
    const { player } = harness;
    harness.send({ type: 'inventory.destroy', slotIndex: slotOf(harness, 'vault-keycard') });
    assert.equal(countItem(player.record.inventory, 'vault-keycard'), 0);
    assert.equal(destroyedQuantity(player.record.flags, 'vault-keycard'), 1);

    harness.talkTo('hub-handler');
    assert.equal(countItem(player.record.inventory, 'vault-keycard'), 1);
    assert.equal(destroyedQuantity(player.record.flags, 'vault-keycard'), 0);

    harness.gameplay.handle(player, { type: 'dialogue.close' });
    harness.talkTo('hub-handler');
    assert.equal(countItem(player.record.inventory, 'vault-keycard'), 1);
  });

  test('a used-up object returns the whole destroyed stack', () => {
    const harness = createHarness({
      prepare: (record) => ({
        ...record,
        location: inRoom('fx-field', 'vault'),
        quests: { [VAULT_RUN]: onStep(VAULT_RUN, 2) },
        flags: [...record.flags, 'object-used:fx-field:vault-terminal:0'],
        inventory: carrying(record, 'field-log', 1),
      }),
    });
    const { player } = harness;
    harness.send({ type: 'inventory.destroy', slotIndex: slotOf(harness, 'field-log') });
    assert.equal(countItem(player.record.inventory, 'field-log'), 0);

    harness.interactWithObject('vault-terminal');
    assert.equal(countItem(player.record.inventory, 'field-log'), 1);
    assert.equal(destroyedQuantity(player.record.flags, 'field-log'), 0);

    harness.interactWithObject('vault-terminal');
    assert.equal(countItem(player.record.inventory, 'field-log'), 1);
  });
});
