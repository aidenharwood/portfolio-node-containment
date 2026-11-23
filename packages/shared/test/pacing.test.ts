import assert from 'node:assert/strict';
import { test } from 'node:test';
import { experienceForLevel, type SkillId } from '../src/character/skills.ts';
import { STYLE_EXPERIENCE_PER_DAMAGE } from '../src/combat/combatMath.ts';
import { CONTAINMENT_CLASS_FACTOR } from '../src/combat/containment.ts';
import { killExperience, standardIntegrity } from '../src/content/catalog/creatureKit.ts';
import { GAME_CONTENT } from '../src/index.ts';
import { bestMethod, combatHours, containMethods, gatherMethods, lastUnlock, levelStep, questOnlyRun, skillHours, studyMethods, STYLES } from './pacingModel.ts';

const COMBAT_CONTENT_LEVEL = Math.max(...[...GAME_CONTENT.creatures.values()].map((creature) => creature.level));

test('an on-level kill is worth between a fortieth and a thirtieth of a level', () => {
  for (let level = 1; level <= COMBAT_CONTENT_LEVEL; level++) {
    const total = killExperience(level) + STYLE_EXPERIENCE_PER_DAMAGE * standardIntegrity(level);
    assert.ok(total >= levelStep(level) / 40 - 0.1 && total <= levelStep(level) / 30, `level ${level}: ${total} XP a kill against a ${levelStep(level)} XP step`);
  }
});

for (const style of STYLES) {
  test(`one ${style} style takes 20 to 30 hours of fighting to reach level ${COMBAT_CONTENT_LEVEL}, and keeps climbing more slowly after`, () => {
    const hours = combatHours(style, 1, COMBAT_CONTENT_LEVEL);
    assert.ok(hours >= 20 && hours <= 30, `${style}: ${hours.toFixed(1)} h to ${COMBAT_CONTENT_LEVEL}`);
    const beyond = combatHours(style, COMBAT_CONTENT_LEVEL, 99);
    assert.ok(Number.isFinite(beyond) && beyond / (99 - COMBAT_CONTENT_LEVEL) > hours / (COMBAT_CONTENT_LEVEL - 1), `${style}: ${beyond.toFixed(1)} h from ${COMBAT_CONTENT_LEVEL} to 99`);
  });
}

const PROFESSIONS: readonly SkillId[] = ['salvage', 'research', 'biochemistry', 'refining', 'engineering', 'containment'];

for (const skill of PROFESSIONS) {
  test(`${skill} reaches its last unlock in 14 to 26 hours of its best training`, () => {
    const last = lastUnlock(skill);
    const hours = skillHours(skill, 1, last);
    assert.ok(hours >= 14 && hours <= 26, `${skill}: ${hours.toFixed(1)} h to ${last}`);
  });
}

test('a containment unlock out-pays every earlier containable of the same or a safer class', () => {
  const rank = (factor: number) => factor;
  const methods = containMethods();
  for (const method of methods) {
    const creature = GAME_CONTENT.creatures.get(method.name)!;
    const level = method.level + 5;
    const rate = method.perTick(level);
    for (const earlier of methods) {
      const other = GAME_CONTENT.creatures.get(earlier.name)!;
      if (earlier.level >= method.level) continue;
      if (rank(CONTAINMENT_CLASS_FACTOR[other.containment!.containmentClass]) > rank(CONTAINMENT_CLASS_FACTOR[creature.containment!.containmentClass])) continue;
      assert.ok(rate > earlier.perTick(level), `at ${level} ${creature.id} pays ${(rate * 12000).toFixed(0)}/h against ${other.id}'s ${(earlier.perTick(level) * 12000).toFixed(0)}/h`);
    }
  }
});

test('repeat study is a real Research method, close to the best trace', () => {
  for (const level of [20, 30, 40, 50]) {
    const study = bestMethod(studyMethods(), level);
    const trace = bestMethod(gatherMethods('research'), level);
    assert.ok(study && trace, `research methods at ${level}`);
    assert.ok(study.perTick >= trace.perTick * 0.6 && study.perTick <= trace.perTick * 1.6, `at ${level} ${study.method.name} pays ${(study.perTick * 12000).toFixed(0)}/h against ${trace.method.name}'s ${(trace.perTick * 12000).toFixed(0)}/h`);
  }
});

test('every quest together pays at most a third of the way to the last content of each skill', () => {
  const { paid, order } = questOnlyRun();
  assert.equal(order.length, GAME_CONTENT.quests.size, 'every quest can be finished on quest XP plus grinding');
  const ceiling = (skill: string): number => experienceForLevel(skill === 'style' || skill === 'fortitude' || STYLES.length === 0 ? COMBAT_CONTENT_LEVEL : lastUnlock(skill as SkillId));
  for (const [skill, amount] of Object.entries(paid)) {
    if (amount === 0 || ['closeQuarters', 'marksmanship', 'psionics'].includes(skill)) continue;
    assert.ok(amount <= ceiling(skill) / 3, `quests pay ${amount} ${skill} XP against ${ceiling(skill)} to its last content`);
  }
  const styleTotal = (paid.style ?? 0) + Math.max(paid.closeQuarters ?? 0, paid.marksmanship ?? 0, paid.psionics ?? 0);
  assert.ok(styleTotal <= ceiling('style') / 3, `quests pay ${styleTotal} combat style XP`);
});

test('no quest or offer level gate is already met by quest experience alone', () => {
  const { gates } = questOnlyRun();
  assert.ok(gates.length > 0);
  for (const gate of gates) assert.ok(gate.held < gate.gate, `${gate.questId}/${gate.where} asks ${gate.measure} ${gate.gate}, and quests alone already give ${gate.held}`);
});
