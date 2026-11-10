import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  CLEARANCE_TIERS,
  clearanceFlag,
  clearanceLevelFor,
  clearancePrice,
  clearanceRefusal,
  clearanceTierFor,
  clearanceTierOf,
  containmentBlocker,
  containmentLevelFor,
  containmentReadiness,
  containmentThreshold,
  createStartingSkills,
  experienceForLevel,
  findContentIssues,
  GAME_CONTENT,
  isWeakenedForContainment,
  nextClearanceTier,
  tierForLevel,
  type CreatureDefinition,
} from '../src/index.ts';

const creature = (id: string): CreatureDefinition => {
  const definition = GAME_CONTENT.creatures.get(id);
  assert.ok(definition, `missing creature ${id}`);
  return definition;
};

const clearedTo = (tier: number): string[] => Array.from({ length: tier }, (_, index) => clearanceFlag(index + 1));

describe('containment rules', () => {
  test('a specimen is weakened at a tenth of its integrity, never at zero', () => {
    assert.equal(containmentThreshold(102), 10);
    assert.equal(containmentThreshold(6), 1);
    assert.ok(isWeakenedForContainment(10, 102));
    assert.ok(!isWeakenedForContainment(11, 102));
    assert.ok(!isWeakenedForContainment(0, 102));
  });

  test('clearance is held in order, one tier at a time', () => {
    assert.equal(clearanceTierOf([]), 0);
    assert.equal(clearanceTierOf(clearedTo(3)), 3);
    assert.equal(clearanceTierOf([clearanceFlag(1), clearanceFlag(3)]), 1);
    assert.equal(nextClearanceTier(clearedTo(2)), 3);
    assert.equal(nextClearanceTier(clearedTo(CLEARANCE_TIERS)), null);
  });

  test('a clearance costs scrip and needs the containment level of its tier', () => {
    assert.equal(clearancePrice(1), 25);
    assert.equal(clearancePrice(9), 2025);
    const flags = clearedTo(1);
    const novice = createStartingSkills();
    const qualified = createStartingSkills({ containment: experienceForLevel(clearanceLevelFor(2)) });
    assert.match(clearanceRefusal(flags, novice, 1000) ?? '', /Containment level 5/);
    assert.match(clearanceRefusal(flags, qualified, clearancePrice(2) - 1) ?? '', /costs 100 scrip/);
    assert.equal(clearanceRefusal(flags, qualified, clearancePrice(2)), null);
    assert.match(clearanceRefusal(clearedTo(CLEARANCE_TIERS), qualified, 99_999) ?? '', /highest/);
  });

  test('containment needs the level, the clearance and a weakened specimen', () => {
    const warden = creature('hollow-warden');
    const tier = clearanceTierFor(warden);
    assert.equal(tier, tierForLevel(containmentLevelFor(warden)));
    const novice = createStartingSkills();
    const qualified = createStartingSkills({ containment: experienceForLevel(containmentLevelFor(warden)) });

    assert.match(containmentReadiness(warden, novice, tier) ?? '', /Containment level 3/);
    assert.match(containmentReadiness(warden, qualified, tier - 1) ?? '', /Clearance I\b/);
    assert.equal(containmentReadiness(warden, qualified, tier), null);
    assert.equal(containmentReadiness(warden, qualified, CLEARANCE_TIERS), null);
    assert.match(containmentBlocker(warden, warden.integrity, qualified, tier) ?? '', /too strong/);
    assert.equal(containmentBlocker(warden, 1, qualified, tier), null);
    assert.match(containmentReadiness(creature('training-drone'), qualified, tier) ?? '', /cannot be contained/);
  });

  test('every boss is a containable specimen covered by a clearance', () => {
    const bosses = ['the-understudy', 'hollow-warden', 'the-foreman', 'sump-mother', 'the-curator', 'the-choir', 'last-archivist', 'the-stoker', 'the-host', 'the-postmaster'];
    for (const id of bosses) {
      const boss = creature(id);
      assert.ok(boss.containment, `${id} should be containable`);
      assert.ok(clearanceTierFor(boss) <= CLEARANCE_TIERS, `${id} needs a clearance for tier ${clearanceTierFor(boss)}`);
    }
  });

  test('no containment seals remain as items or recipes', () => {
    assert.ok(![...GAME_CONTENT.items.keys()].some((id) => id.startsWith('containment-seal')));
    assert.ok(![...GAME_CONTENT.recipes.values()].some((recipe) => recipe.output.itemId.startsWith('containment-seal')));
  });

  test('story bosses can be contained at a story pace, below their combat level', () => {
    const host = creature('the-host');
    assert.ok(containmentLevelFor(host) < host.level);
    assert.equal(clearanceTierFor(host), tierForLevel(containmentLevelFor(host)));
    assert.equal(containmentLevelFor(creature('the-understudy')), creature('the-understudy').level);
  });

  test('integrity flags a required containment level above the specimen level', () => {
    const warden = creature('hollow-warden');
    const creatures = new Map(GAME_CONTENT.creatures);
    creatures.set(warden.id, { ...warden, containment: warden.containment ? { ...warden.containment, requiredLevel: warden.level + 1 } : undefined });
    const issues = findContentIssues({ ...GAME_CONTENT, creatures });
    assert.ok(issues.some((issue) => issue.startsWith('creature hollow-warden') && issue.includes('required containment level')));
  });
});

describe('relentless training creatures', () => {
  const relentless = [...GAME_CONTENT.creatures.values()].filter((definition) => definition.relentless);

  test('three patches exist at low, mid and high level', () => {
    assert.deepEqual(relentless.map((definition) => definition.level).sort((a, b) => a - b), [3, 14, 32]);
    for (const definition of relentless) {
      const placed = [...GAME_CONTENT.districts.values()].flatMap((district) => district.creatures ?? []).filter((placement) => placement.creatureId === definition.id);
      assert.ok(placed.length >= 4, `${definition.id} needs a patch of at least four`);
    }
  });

  test('they hit softly, drop nothing and cannot be contained', () => {
    for (const definition of relentless) {
      assert.ok(definition.aggressive);
      assert.ok(definition.attack.maxHit <= 2);
      assert.equal(definition.loot.length, 0);
      assert.equal(definition.containment, undefined);
    }
  });

  test('integrity flags a relentless creature that drops loot', () => {
    const mite = creature('lint-mite');
    const creatures = new Map(GAME_CONTENT.creatures);
    creatures.set(mite.id, { ...mite, loot: [{ itemId: 'medgel', count: 1, chance: 0.5 }] });
    const issues = findContentIssues({ ...GAME_CONTENT, creatures });
    assert.ok(issues.some((issue) => issue.startsWith('creature lint-mite') && issue.includes('no loot')));
  });
});
