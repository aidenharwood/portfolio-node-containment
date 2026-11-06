import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  characterDraftErrors,
  characterNameError,
  createDefaultDraft,
  experienceForLevel,
  levelForExperience,
  SKILL_LEVEL_CAP,
} from '../src/index.ts';

describe('character names', () => {
  test('accepts ordinary names', () => {
    for (const name of ['Mara Voss', "D'Arcy", 'Ilse-Marie']) assert.equal(characterNameError(name), null);
  });

  test('rejects malformed and reserved names', () => {
    for (const name of ['Al', '-Hyphen', 'Mara--Voss','Name42', 'The Directorate', "Two''Marks"]) {
      assert.notEqual(characterNameError(name), null, name);
    }
  });
});

describe('character drafts', () => {
  const valid = { ...createDefaultDraft(), name: 'Mara Voss' };

  test('a default draft with a name is valid', () => {
    assert.deepEqual(characterDraftErrors(valid), []);
  });

  test('rejects palette values outside the allowed set', () => {
    const tampered = { ...valid, appearance: { ...valid.appearance, skinTone: '#00ff00' } };
    const errors = characterDraftErrors(tampered);
    assert.ok(errors.includes('Unknown skin tone.'));
  });
});

describe('skill curve', () => {
  test('level and experience round-trip across the whole range', () => {
    for (let level = 1; level <= SKILL_LEVEL_CAP; level++) {
      assert.equal(levelForExperience(experienceForLevel(level)), level);
    }
  });

  test('is strictly increasing', () => {
    for (let level = 2; level <= SKILL_LEVEL_CAP; level++) {
      assert.ok(experienceForLevel(level) > experienceForLevel(level - 1));
    }
  });
});
