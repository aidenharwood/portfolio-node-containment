import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { countItem, destroyedQuantity, storedCount, type CharacterRecord, type QuestProgress } from '@containment/shared';
import { inRoom, createHarness, at, type Harness, localInRoom } from './support/testHarness.ts';

const ORIENTATION = 'orientation-protocol';
const VENTS = 'static-in-the-vents';

const onStep = (questId: string, stepIndex: number): QuestProgress => ({ questId, status: 'active', stepIndex, objectiveProgress: [0] });

const carrying = (record: CharacterRecord, itemId: string, quantity = 1): CharacterRecord['inventory'] => [{ itemId, quantity }, ...record.inventory.slice(1)];

const slotOf = (harness: Harness, itemId: string): number => harness.player.record.inventory.findIndex((slot) => slot?.itemId === itemId);

describe('quest items', () => {
  test('a single quest item can be banked, but depositing the pack leaves quest items behind', () => {
    const harness = createHarness({
      prepare: (record) => ({
        ...record,
        location: inRoom('meridian-atrium', 'requisitions'),
        inventory: [{ itemId: 'clearance-card-l1', quantity: 1 }, { itemId: 'expedition-log', quantity: 1 }, { itemId: 'scrap-alloy', quantity: 4 }, ...record.inventory.slice(3)],
      }),
    });
    const { player } = harness;
    harness.interactWithObject('atrium-storage-a');
    harness.send({ type: 'storage.depositAll' });
    assert.equal(countItem(player.record.inventory, 'clearance-card-l1'), 1);
    assert.equal(storedCount(player.record.storage, 'scrap-alloy'), 4);

    harness.send({ type: 'storage.deposit', slotIndex: slotOf(harness, 'expedition-log'), quantity: 1 });
    assert.equal(countItem(player.record.inventory, 'expedition-log'), 0);
    assert.equal(storedCount(player.record.storage, 'expedition-log'), 1);

    harness.send({ type: 'storage.withdraw', itemId: 'expedition-log', quantity: 1 });
    assert.equal(countItem(player.record.inventory, 'expedition-log'), 1);
  });

  test('only quest items can be destroyed', () => {
    const harness = createHarness({ prepare: (record) => ({ ...record, inventory: carrying(record, 'scrap-alloy', 3) }) });
    harness.send({ type: 'inventory.destroy', slotIndex: 0 });
    assert.equal(countItem(harness.player.record.inventory, 'scrap-alloy'), 3);
  });

  test('the NPC who issued a destroyed quest item hands over a replacement once', () => {
    const harness = createHarness({
      prepare: (record) => ({ ...record, quests: { [ORIENTATION]: onStep(ORIENTATION, 1) }, inventory: carrying(record, 'clearance-card-l1') }),
    });
    const { player } = harness;
    harness.send({ type: 'inventory.destroy', slotIndex: slotOf(harness, 'clearance-card-l1') });
    assert.equal(countItem(player.record.inventory, 'clearance-card-l1'), 0);
    assert.equal(destroyedQuantity(player.record.flags, 'clearance-card-l1'), 1);

    harness.talkTo('intake-reyes');
    assert.equal(countItem(player.record.inventory, 'clearance-card-l1'), 1);
    assert.equal(destroyedQuantity(player.record.flags, 'clearance-card-l1'), 0);

    harness.gameplay.handle(player, { type: 'dialogue.close' });
    harness.talkTo('intake-reyes');
    assert.equal(countItem(player.record.inventory, 'clearance-card-l1'), 1);
  });

  test('a used-up object returns the whole destroyed stack', () => {
    const harness = createHarness({
      prepare: (record) => ({
        ...record,
        location: inRoom('meridian-atrium', 'quarantine-gate'),
        quests: { [VENTS]: onStep(VENTS, 1) },
        flags: [...record.flags, 'object-used:meridian-atrium:vent-north:0'],
        inventory: carrying(record, 'vent-filter-chip', 3),
      }),
    });
    const { player } = harness;
    harness.send({ type: 'inventory.destroy', slotIndex: slotOf(harness, 'vent-filter-chip') });
    assert.equal(countItem(player.record.inventory, 'vent-filter-chip'), 0);

    harness.interactWithObject('vent-north');
    assert.equal(countItem(player.record.inventory, 'vent-filter-chip'), 3);
    assert.equal(destroyedQuantity(player.record.flags, 'vent-filter-chip'), 0);

    harness.interactWithObject('vent-north');
    assert.equal(countItem(player.record.inventory, 'vent-filter-chip'), 3);
  });
});
