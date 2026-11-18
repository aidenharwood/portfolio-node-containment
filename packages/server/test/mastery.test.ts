import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { countItem, experienceForLevel, masteryFlag, masteryMantleId, SKILL_INFO, SKILL_LEVEL_CAP, type CharacterRecord } from '@containment/shared';
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
    assert.equal(harness.sink.last('notice')?.text, `No mastery to claim yet. Closest: ${SKILL_INFO.salvage.name} ${SKILL_LEVEL_CAP - 1}/${SKILL_LEVEL_CAP}.`);
  });

  test('give nothing below the cap and name the closest skill', () => {
    const harness = createHarness({ prepare: atTheBoard({ biochemistry: experienceForLevel(52) }) });
    claim(harness);
    assert.equal(harness.sink.last('notice')?.text, `No mastery to claim yet. Closest: ${SKILL_INFO.biochemistry.name} 52/${SKILL_LEVEL_CAP}.`);
    assert.ok(!harness.player.record.inventory.some((slot) => slot?.itemId.endsWith('-mastery-mantle')));
  });
});
