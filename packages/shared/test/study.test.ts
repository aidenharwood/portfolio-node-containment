import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createStartingSkills,
  effectiveDefence,
  experienceForLevel,
  findContentIssues,
  GAME_CONTENT,
  isConditionMet,
  studiedCreaturesOf,
  studiedFlag,
  studyBlocker,
  studyExperience,
  type ConditionContext,
} from '@containment/shared';

const contextWith = (research: number): ConditionContext => ({
  countItem: () => 0,
  questStanding: () => ({ status: 'notStarted' }),
  hasFlag: () => false,
  skills: createStartingSkills({ research: experienceForLevel(research) }),
});

test('a skillLevel condition passes at or above the level', () => {
  const condition = { type: 'skillLevel', skill: 'research', atLeast: 12 } as const;
  assert.equal(isConditionMet(condition, contextWith(11)), false);
  assert.equal(isConditionMet(condition, contextWith(12)), true);
  assert.equal(isConditionMet(condition, contextWith(40)), true);
});

test('every creature has a weakness and content stays valid', () => {
  for (const creature of GAME_CONTENT.creatures.values()) assert.ok(creature.weakness === 'melee' || creature.weakness === 'ranged', creature.id);
  assert.deepEqual(findContentIssues(GAME_CONTENT), []);
});

test('studying needs Analysis at or above the creature level', () => {
  const host = GAME_CONTENT.creatures.get('the-host');
  assert.ok(host);
  assert.match(studyBlocker(host, host.level - 1) ?? '', /Analysis/);
  assert.equal(studyBlocker(host, host.level), null);
});

test('discovery experience grows with level and dwarfs repeat studies', () => {
  const creatures = [...GAME_CONTENT.creatures.values()].sort((a, b) => a.level - b.level);
  const low = creatures[0];
  const high = creatures[creatures.length - 1];
  assert.ok(low && high);
  assert.ok(studyExperience(high, true) > studyExperience(low, true));
  for (const creature of creatures) assert.ok(studyExperience(creature, false) * 5 < studyExperience(creature, true), creature.id);
});

test('only a studied weakness lowers defence', () => {
  const golem = GAME_CONTENT.creatures.get('slag-golem');
  assert.ok(golem);
  const other = golem.weakness === 'melee' ? 'ranged' : 'melee';
  assert.equal(effectiveDefence(golem, golem.weakness, false), golem.defence);
  assert.equal(effectiveDefence(golem, other, true), golem.defence);
  assert.ok(effectiveDefence(golem, golem.weakness, true) < golem.defence);
});

test('studied creatures are read back from flags', () => {
  assert.deepEqual(studiedCreaturesOf(['visited:x', studiedFlag('gloam-mite'), studiedFlag('the-host')]), ['gloam-mite', 'the-host']);
});
