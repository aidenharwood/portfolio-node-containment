import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { countItem, experienceForLevel, masteryFlag, masteryMantleId, SKILL_LEVEL_CAP, type CharacterRecord } from '@containment/shared';
import { createHarness, inRoom } from './support/testHarness.ts';

const atTheBoard = (skills: Partial<CharacterRecord['skills']>) => (record: CharacterRecord): CharacterRecord => ({
  ...record,
  location: inRoom('fx-hub', 'plaza'),
  quests: {},
  skills: { ...record.skills, ...skills },
});

const claim = (harness: ReturnType<typeof createHarness>): void => harness.interactWithObject('hub-contracts', 2);

describe('mastery mantles', () => {
  test('are claimed only at the cap, only once and only for qualifying skills', () => {
    const harness = createHarness({
      prepare: atTheBoard({ psionics: experienceForLevel(SKILL_LEVEL_CAP) + 5000, salvage: experienceForLevel(SKILL_LEVEL_CAP - 1) }),
    });
    const { player } = harness;
    claim(harness);
    assert.equal(countItem(player.record.inventory, masteryMantleId('psionics')), 1);
    assert.equal(countItem(player.record.inventory, masteryMantleId('salvage')), 0);
    assert.ok(player.hasFlag(masteryFlag('psionics')));
    assert.ok(!player.hasFlag(masteryFlag('salvage')));

    claim(harness);
    assert.equal(countItem(player.record.inventory, masteryMantleId('psionics')), 1);
    assert.equal(harness.sink.last('notice')?.text, 'No mastery to claim yet.');
  });

  test('give nothing below the cap', () => {
    const harness = createHarness({ prepare: atTheBoard({}) });
    claim(harness);
    assert.equal(harness.sink.last('notice')?.text, 'No mastery to claim yet.');
    assert.ok(!harness.player.record.inventory.some((slot) => slot?.itemId.endsWith('-mastery-mantle')));
  });
});
