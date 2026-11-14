import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  COMBAT_STYLE_INFO,
  COMBAT_STYLES,
  combatExperience,
  combatLevel,
  createStartingSkills,
  defeatExperience,
  experienceForLevel,
  playerAttackProfile,
  styleBeating,
} from '../src/index.ts';
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

const items = FIXTURE_CONTENT.items;

describe('the combat triangle', () => {
  test('melee beats ranged, ranged beats psionic and psionic beats melee', () => {
    assert.equal(COMBAT_STYLE_INFO.melee.beats, 'ranged');
    assert.equal(COMBAT_STYLE_INFO.ranged.beats, 'psionic');
    assert.equal(COMBAT_STYLE_INFO.psionic.beats, 'melee');
    for (const style of COMBAT_STYLES) assert.equal(COMBAT_STYLE_INFO[styleBeating(style)].beats, style);
  });

  test('psionic hits train Psionics and Fortitude', () => {
    assert.deepEqual(combatExperience('psionic', 3).map((award) => award.skill), ['psionics', 'fortitude']);
    assert.equal(defeatExperience('psionic', 30)[0]?.skill, 'psionics');
  });

  test('combat level counts the best style in full and the other two lightly', () => {
    const level = (closeQuarters: number, marksmanship: number, psionics: number) =>
      combatLevel(createStartingSkills({
        fortitude: experienceForLevel(20),
        closeQuarters: experienceForLevel(closeQuarters),
        marksmanship: experienceForLevel(marksmanship),
        psionics: experienceForLevel(psionics),
      }));
    assert.equal(level(40, 1, 1), Math.floor(10 + 20 + 2 / 8));
    assert.equal(level(1, 1, 40), level(40, 1, 1));
    assert.equal(level(40, 40, 40), Math.floor(10 + 20 + 80 / 8));
  });

  test('a focus attacks with the psionic rating from range', () => {
    const skills = createStartingSkills({ psionics: experienceForLevel(12) });
    const attack = playerAttackProfile(skills, { primary: 'test-focus' }, items);
    assert.equal(attack.style, 'psionic');
    assert.equal(attack.weapon, 'focus');
    assert.ok(attack.range > 1);
    assert.equal(attack.accuracy, 12 + (items.get('test-focus')?.equipment?.stats.focus ?? 0));
  });
});

describe('psionic anomalies', () => {
  test('psionic attackers are warded, so ranged fire is the answer to them', () => {
    const psionic = [...FIXTURE_CONTENT.creatures.values()].filter((creature) => creature.attack.style === 'psionic');
    assert.ok(psionic.length >= 1);
    for (const creature of psionic) assert.equal(creature.guard, 'warden', creature.id);
  });
});
