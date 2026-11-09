import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  addItem,
  containmentBlocker,
  containmentReadiness,
  containmentThreshold,
  createEmptyInventory,
  createStartingSkills,
  experienceForLevel,
  findContentIssues,
  GAME_CONTENT,
  isWeakenedForContainment,
  sealFor,
  sealTierFor,
  tierForLevel,
  type CreatureDefinition,
} from '../src/index.ts';

const creature = (id: string): CreatureDefinition => {
  const definition = GAME_CONTENT.creatures.get(id);
  assert.ok(definition, `missing creature ${id}`);
  return definition;
};

const carrying = (...itemIds: string[]) => itemIds.reduce((inventory, itemId) => addItem(inventory, GAME_CONTENT.items, itemId, 1).inventory, createEmptyInventory());

describe('containment rules', () => {
  test('a specimen is weakened at a tenth of its integrity, never at zero', () => {
    assert.equal(containmentThreshold(102), 10);
    assert.equal(containmentThreshold(6), 1);
    assert.ok(isWeakenedForContainment(10, 102));
    assert.ok(!isWeakenedForContainment(11, 102));
    assert.ok(!isWeakenedForContainment(0, 102));
  });

  test('a seal is rated by tier, and a higher mark holds a lower specimen', () => {
    const inventory = carrying('containment-seal-5', 'containment-seal-3');
    assert.equal(sealFor(inventory, GAME_CONTENT.items, 2), 'containment-seal-3');
    assert.equal(sealFor(inventory, GAME_CONTENT.items, 4), 'containment-seal-5');
    assert.equal(sealFor(inventory, GAME_CONTENT.items, 6), null);
  });

  test('containment needs the level, the right seal and a weakened specimen', () => {
    const warden = creature('hollow-warden');
    const tier = sealTierFor(warden);
    assert.equal(tier, tierForLevel(warden.level));
    const seal = carrying(`containment-seal-${tier}`);
    const novice = createStartingSkills();
    const qualified = createStartingSkills({ containment: experienceForLevel(warden.level) });

    assert.match(containmentReadiness(warden, novice, seal, GAME_CONTENT.items) ?? '', /Containment level 6/);
    assert.match(containmentReadiness(warden, qualified, createEmptyInventory(), GAME_CONTENT.items) ?? '', /Mk\.II/);
    assert.equal(containmentReadiness(warden, qualified, seal, GAME_CONTENT.items), null);
    assert.match(containmentBlocker(warden, warden.integrity, qualified, seal, GAME_CONTENT.items) ?? '', /too strong/);
    assert.equal(containmentBlocker(warden, 1, qualified, seal, GAME_CONTENT.items), null);
    assert.match(containmentReadiness(creature('training-drone'), qualified, seal, GAME_CONTENT.items) ?? '', /cannot be contained/);
  });

  test('every boss is a containable specimen with a seal for its tier', () => {
    const bosses = ['the-understudy', 'hollow-warden', 'the-foreman', 'sump-mother', 'the-curator', 'the-choir', 'last-archivist', 'the-stoker', 'the-host', 'the-postmaster'];
    for (const id of bosses) {
      const boss = creature(id);
      assert.ok(boss.containment, `${id} should be containable`);
      assert.ok(GAME_CONTENT.items.get(`containment-seal-${sealTierFor(boss)}`)?.containmentSeal, `${id} needs a tier ${sealTierFor(boss)} seal`);
    }
  });

  test('integrity flags a containable specimen with no seal for its tier', () => {
    const items = new Map([...GAME_CONTENT.items].filter(([id]) => id !== 'containment-seal-9'));
    const issues = findContentIssues({ ...GAME_CONTENT, items });
    assert.ok(issues.some((issue) => issue.startsWith('creature the-host') && issue.includes('tier 9')));
  });
});
