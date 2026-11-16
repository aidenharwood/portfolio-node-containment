import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  isWithinContainmentReach,
  containmentBlocker,
  containmentLevelFor,
  containmentReadiness,
  containmentThreshold,
  createStartingSkills,
  experienceForLevel,
  findContentIssues,
  isWeakenedForContainment,
  type CreatureDefinition,
} from '../src/index.ts';
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

const creature = (id: string): CreatureDefinition => {
  const definition = FIXTURE_CONTENT.creatures.get(id);
  assert.ok(definition, `missing creature ${id}`);
  return definition;
};

describe('containment rules', () => {
  test('a specimen is weakened at a tenth of its integrity, never at zero', () => {
    assert.equal(containmentThreshold(102), 10);
    assert.equal(containmentThreshold(6), 1);
    assert.ok(isWeakenedForContainment(10, 102));
    assert.ok(!isWeakenedForContainment(11, 102));
    assert.ok(!isWeakenedForContainment(0, 102));
  });

  test('containment needs only the level and a weakened specimen', () => {
    const warden = creature('hollow-warden');
    const novice = createStartingSkills();
    const qualified = createStartingSkills({ containment: experienceForLevel(containmentLevelFor(warden)) });

assert.match(containmentReadiness(warden, novice) ?? '', /Containment level 3/);    assert.equal(containmentReadiness(warden, qualified), null);    assert.match(containmentBlocker(warden, warden.integrity, qualified) ?? '', /too strong/);    assert.equal(containmentBlocker(warden, 1, qualified), null);    assert.match(containmentReadiness(creature('training-drone'), qualified) ?? '', /cannot be contained/);
  });

  test('no containment seals remain as items or recipes', () => {
    assert.ok(![...FIXTURE_CONTENT.items.keys()].some((id) => id.startsWith('containment-seal')));
    assert.ok(![...FIXTURE_CONTENT.recipes.values()].some((recipe) => recipe.output.itemId.startsWith('containment-seal')));
  });

  test('story bosses can be contained at a story pace, below their combat level', () => {
    const warden = creature('hollow-warden');
    assert.ok(containmentLevelFor(warden) < warden.level);
    const plain = { ...warden, containment: warden.containment ? { ...warden.containment, requiredLevel: undefined } : undefined };
    assert.equal(containmentLevelFor(plain), warden.level);
  });

  test('integrity flags a required containment level above the specimen level', () => {
    const warden = creature('hollow-warden');
    const creatures = new Map(FIXTURE_CONTENT.creatures);
    creatures.set(warden.id, { ...warden, containment: warden.containment ? { ...warden.containment, requiredLevel: warden.level + 1 } : undefined });
    const issues = findContentIssues({ ...FIXTURE_CONTENT, creatures });
    assert.ok(issues.some((issue) => issue.startsWith('creature hollow-warden') && issue.includes('required containment level')));
  });
});

describe('relentless training creatures', () => {
  const relentless = [...FIXTURE_CONTENT.creatures.values()].filter((definition) => definition.relentless);

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
    const creatures = new Map(FIXTURE_CONTENT.creatures);
    creatures.set(mite.id, { ...mite, loot: [{ itemId: 'medgel', count: 1, chance: 0.5 }] });
    const issues = findContentIssues({ ...FIXTURE_CONTENT, creatures });
    assert.ok(issues.some((issue) => issue.startsWith('creature lint-mite') && issue.includes('no loot')));
  });
});

describe('containment reach', () => {
  test('reach is measured to the nearest tile of a large specimen', () => {
    const always = () => true;
    assert.equal(isWithinContainmentReach({ x: 6, y: 4 }, { position: { x: 3, y: 4 }, size: 2 }, always), true);
    assert.equal(isWithinContainmentReach({ x: 6, y: 4 }, { position: { x: 3, y: 4 }, size: 1 }, always), false);
  });
});
