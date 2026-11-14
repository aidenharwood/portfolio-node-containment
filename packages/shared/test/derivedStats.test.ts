import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createStartingSkills, deriveCombatProfile, equipmentStats, experienceForLevel } from '../src/index.ts';
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

describe('combat profile', () => {
  test('a fresh operative has the same baseline as every other', () => {
    const profile = deriveCombatProfile(createStartingSkills(), equipmentStats({}, FIXTURE_CONTENT.items));
    assert.equal(profile.integrity, 24);
    assert.equal(profile.meleeRating, 1);
    assert.equal(profile.meleeDefence, 0);
    assert.equal(profile.rangedDefence, 0);
    assert.equal(profile.psionicDefence, 0);
    assert.equal(profile.psionicRating, 1);
  
  test('each style is blocked by its own gear stat', () => {
    const skills = createStartingSkills({ psionics: experienceForLevel(12) });
    const gear = equipmentStats({ primary: 'test-focus', implant: 'test-amplifier' }, FIXTURE_CONTENT.items);
    const profile = deriveCombatProfile(skills, gear);
    assert.equal(profile.psionicRating, 12 + gear.focus);
    assert.equal(profile.psionicDefence, gear.cognitiveWard);
    assert.ok(gear.focus > 0 && gear.cognitiveWard > 0);
  });
});

  test('training skills and equipping gear both raise derived stats', () => {
    const skills = createStartingSkills({ fortitude: experienceForLevel(10), closeQuarters: experienceForLevel(5) });
    const gear = equipmentStats({ torso: 'field-vest', primary: 'stun-baton' }, FIXTURE_CONTENT.items);
    const profile = deriveCombatProfile(skills, gear);
    assert.equal(profile.integrity, 60);
    assert.equal(profile.meleeRating, 5 + 5);
    assert.equal(profile.meleeDefence, 5 + 6);
    assert.equal(profile.rangedDefence, 5 + 6);
  });
});
