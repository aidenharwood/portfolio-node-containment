import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findContentIssues, GAME_CONTENT } from '../src/index.ts';

test('the shipped world passes every content check', () => {
  assert.deepEqual(findContentIssues(GAME_CONTENT), []);
});

test('new characters start in a district of the shipped world', () => {
  const start = GAME_CONTENT.newCharacter.startingLocation;
  assert.ok(GAME_CONTENT.levels.get(start.levelId)?.layout.districtAt(start.position));
});
