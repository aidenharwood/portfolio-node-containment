import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createStartingSkills,
  creatureDefence,
  GUARD_STRONG_FACTOR,
  GUARD_WEAK_FACTOR,
  weaknessOf,
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

test('every creature outside the training range has a guard and content stays valid', () => {
  const training = new Set(['training-drone', 'the-understudy']);
  for (const creature of GAME_CONTENT.creatures.values()) assert.equal(creature.guard === undefined, training.has(creature.id), creature.id);
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

test('a guard follows the triangle', () => {
  const byGuard = (id: string) => {
    const creature = GAME_CONTENT.creatures.get(id);
    assert.ok(creature);
    return creature;
  };
  assert.equal(weaknessOf(byGuard('slag-golem')), 'psionic');
  assert.equal(weaknessOf(byGuard('frost-moth')), 'melee');
  assert.equal(weaknessOf(byGuard('the-host')), 'ranged');
  assert.equal(weaknessOf(byGuard('training-drone')), null);
  const golem = byGuard('slag-golem');
  assert.equal(creatureDefence(golem, 'melee', false), Math.round(golem.defence * GUARD_STRONG_FACTOR));
  assert.equal(creatureDefence(golem, 'psionic', false), Math.round(golem.defence * GUARD_WEAK_FACTOR));
  const host = byGuard('the-host');
  assert.equal(creatureDefence(host, 'melee', false), host.defence);
});

test('only a studied weakness is exploited', () => {
  const golem = GAME_CONTENT.creatures.get('slag-golem');
  assert.ok(golem);
  assert.equal(creatureDefence(golem, 'ranged', true), creatureDefence(golem, 'ranged', false));
  assert.ok(creatureDefence(golem, 'psionic', true) < creatureDefence(golem, 'psionic', false));
});

test('psychic anomalies attack the mind', () => {
  for (const id of ['static-wraith', 'the-choir', 'knockling', 'the-host', 'prescription-wraith']) {
    assert.equal(GAME_CONTENT.creatures.get(id)?.attack.style, 'psionic', id);
  }
});

test('studied creatures are read back from flags', () => {
  assert.deepEqual(studiedCreaturesOf(['visited:x', studiedFlag('gloam-mite'), studiedFlag('the-host')]), ['gloam-mite', 'the-host']);
});
