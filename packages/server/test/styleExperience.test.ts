import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createHarness, inRoom } from './support/testHarness.ts';

const drill = (weapon: string | null) => {
  const harness = createHarness({ prepare: (record) => ({ ...record, location: inRoom('fx-hub', 'plaza') }) });
  if (weapon) {
    harness.player.update({ inventory: [{ itemId: weapon, quantity: 1 }, ...harness.player.record.inventory.slice(1)] });
    harness.equipItem(weapon);
  }
  const before = { ...harness.player.record.skills };
  harness.interactWithObject('hub-storage', 1);
  return { before, after: harness.player.record.skills };
};

describe('style experience rewards', () => {
  test('a ranged weapon pays Marksmanship', () => {
    const { before, after } = drill('dart-pistol');
    assert.equal(after.marksmanship - before.marksmanship, 100);
    assert.equal(after.closeQuarters, before.closeQuarters);
  });

  test('a melee weapon pays Close Quarters', () => {
    const { before, after } = drill('stun-baton');
    assert.equal(after.closeQuarters - before.closeQuarters, 100);
    assert.equal(after.marksmanship, before.marksmanship);
  });

  test('unarmed pays Close Quarters', () => {
    const { before, after } = drill(null);
    assert.equal(after.closeQuarters - before.closeQuarters, 100);
  });
});
