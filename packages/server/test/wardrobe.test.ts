import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { addItem, equipmentStats, GAME_CONTENT, type CharacterRecord } from '@containment/shared';
import { createHarness } from './support/testHarness.ts';

const carrying = (...itemIds: string[]) => (record: CharacterRecord): CharacterRecord => ({
  ...record,
  inventory: itemIds.reduce((inventory, itemId) => addItem(inventory, GAME_CONTENT.items, itemId, 1).inventory, record.inventory),
});

describe('wardrobe', () => {
  test('wearing a cosmetic changes how the operative looks and nothing else', () => {
    const harness = createHarness({ prepare: carrying('hazmat-suit') });
    const { player } = harness;
    const statsBefore = equipmentStats(player.record.equipment, GAME_CONTENT.items);

    harness.equipItem('hazmat-suit');
    assert.equal(player.record.wardrobe.torso, 'hazmat-suit');
    assert.deepEqual(equipmentStats(player.record.equipment, GAME_CONTENT.items), statsBefore);
    const changed = harness.sink.last('world.entityGearChanged');
    assert.ok(changed?.gear.includes('hazmat-suit'));
    assert.ok(player.snapshot().gear.includes('hazmat-suit'));

    harness.send({ type: 'wardrobe.remove', slot: 'torso' });
    assert.equal(player.record.wardrobe.torso, undefined);
    assert.ok(player.record.inventory.some((stack) => stack?.itemId === 'hazmat-suit'));
    assert.ok(!harness.sink.last('world.entityGearChanged')?.gear.includes('hazmat-suit'));
  });
});
