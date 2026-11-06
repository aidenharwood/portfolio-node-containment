import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createStartingSkills, deriveCombatProfile, equipmentStats, experienceForLevel, GAME_CONTENT } from '../src/index.ts';

describe('combat profile', () => {
  test('a fresh operative has the same baseline as every other', () => {
    const profile = deriveCombatProfile(createStartingSkills(), equipmentStats({}, GAME_CONTENT.items));
    assert.equal(profile.integrity, 24);
    assert.equal(profile.meleeRating, 1);
    assert.equal(profile.defence, 0);
  });

  test('training skills and equipping gear both raise derived stats', () => {
    const skills = createStartingSkills({ fortitude: experienceForLevel(10), closeQuarters: experienceForLevel(5) });
    const gear = equipmentStats({ torso: 'field-vest-mk1', primary: 'stun-baton' }, GAME_CONTENT.items);
    const profile = deriveCombatProfile(skills, gear);
    assert.equal(profile.integrity, 60);
    assert.equal(profile.meleeRating, 5 + 5);
    assert.equal(profile.defence, 5 + 6);
  });
});
