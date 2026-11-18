import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { addItem } from '@containment/shared';
import { CONTENT, createHarness } from './support/testHarness.ts';

const TEN_MINUTES_MS = 10 * 60_000;

describe('field kits', () => {
  test('applying a kit adds a ten-minute boost and heals nothing', () => {
    const harness = createHarness({ prepare: (record) => ({ ...record, inventory: addItem(record.inventory, CONTENT.items, 'edge-kit', 1).inventory }) });
    const { player } = harness;
    harness.gameplay.tick();
    player.setIntegrity(player.integrity - 5);
    const wounded = player.integrity;
    const basePower = harness.sink.last('player.state')?.self.profile.meleeRating ?? 0;
    const slotIndex = player.record.inventory.findIndex((slot) => slot?.itemId === 'edge-kit');
    harness.send({ type: 'inventory.use', slotIndex });
    harness.gameplay.tick();

    assert.equal(player.integrity, wounded);
    const state = harness.sink.last('player.state')?.self;
    assert.deepEqual(state?.boosts.map((boost) => boost.itemId), ['edge-kit']);
    assert.equal(state?.boosts[0]?.durationMs, TEN_MINUTES_MS);
    assert.ok((state?.profile.meleeRating ?? 0) > basePower);
    assert.match(harness.sink.last('chat.message')?.text ?? '', /^You apply the Edge Kit\. \+2 Power for 10:00\.$/);
  });
});
