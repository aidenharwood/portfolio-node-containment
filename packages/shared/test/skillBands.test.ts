import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONTENT, skillGuide, type ItemDefinition, type SkillId, type StatId } from '../src/index.ts';

const BANDS: readonly (readonly [number, number])[] = [
  [1, 4],
  [5, 9],
  [10, 14],
  [15, 19],
  [20, 24],
  [25, 29],
  [30, 34],
  [35, 39],
  [40, 44],
  [45, 50],
];

const NEW_MATERIALS = ['copper-wire', 'brass-fittings', 'bearing-steel', 'hull-rivets', 'cell-mesh'];

const FITTINGS = ['copper-wire', 'copper-coil', 'brass-strip', 'bearing-ring', 'cell-mesh'];

const OFFENCE_STATS: readonly StatId[] = ['power', 'accuracy', 'focus'];

const recipeLevelOf = (itemId: string): number | undefined => [...GAME_CONTENT.recipes.values()].find((recipe) => recipe.output.itemId === itemId)?.level;

const kits = [...GAME_CONTENT.items.values()].filter((item) => item.consumable?.kind === 'kit');

const offenceTinctures = [...GAME_CONTENT.items.values()].filter(
  (item): item is ItemDefinition => item.consumable?.kind === 'medicine' && OFFENCE_STATS.some((stat) => (item.consumable?.boost?.stats[stat] ?? 0) > 0),
);

describe('skill bands', () => {
  for (const skill of ['salvage', 'refining'] as const satisfies readonly SkillId[]) {
    test(`${skill} unlocks a gather or recipe in every five-level band`, () => {
      const levels = skillGuide(GAME_CONTENT, skill)
        .filter((entry) => entry.kind === 'gather' || entry.kind === 'recipe')
        .map((entry) => entry.level);
      for (const [from, to] of BANDS) {
        assert.ok(levels.some((level) => level >= from && level <= to), `${skill} has nothing to unlock between ${from} and ${to}`);
      }
    });
  }

  test('every new salvage material feeds a recipe', () => {
    const inputs = new Set([...GAME_CONTENT.recipes.values()].flatMap((recipe) => recipe.inputs.map((input) => input.itemId)));
    for (const itemId of NEW_MATERIALS) {
      assert.ok(GAME_CONTENT.items.has(itemId), `${itemId} is not an item`);
      assert.ok(inputs.has(itemId), `${itemId} is not an input to any recipe`);
    }
  });

  test('there are fifteen field kits, each refined at a refinery', () => {
    assert.equal(kits.length, 15);
    for (const kit of kits) {
      const recipe = [...GAME_CONTENT.recipes.values()].find((candidate) => candidate.output.itemId === kit.id);
      assert.equal(recipe?.station, 'refinery', kit.id);
      assert.equal(recipe?.output.count, 1, kit.id);
      assert.equal(kit.consumable?.heal, 0, kit.id);
    }
  });

  test('no kit boosts past the best offence tincture within five levels of it', () => {
    assert.ok(offenceTinctures.length > 0);
    for (const kit of kits) {
      const kitLevel = recipeLevelOf(kit.id) ?? 0;
      const ceiling = (stat: StatId): number =>
        Math.max(0, ...offenceTinctures.filter((tincture) => (recipeLevelOf(tincture.id) ?? Infinity) <= kitLevel + 5).map((tincture) => tincture.consumable?.boost?.stats[stat] ?? 0));
      for (const stat of OFFENCE_STATS) {
        const boost = kit.consumable?.boost?.stats[stat] ?? 0;
        assert.ok(boost <= ceiling(stat), `${kit.id} gives +${boost} ${stat}, above the +${ceiling(stat)} of tinctures up to level ${kitLevel + 5}`);
      }
    }
  });

  test('kit boosts strictly increase by tier and each tier has its own fitting', () => {
    const boostOf = (item: ItemDefinition): number => Math.max(0, ...Object.values(item.consumable?.boost?.stats ?? {}).map((value) => value ?? 0));
    const fittingOf = (item: ItemDefinition): string => {
      const recipe = [...GAME_CONTENT.recipes.values()].find((candidate) => candidate.output.itemId === item.id);
      return recipe?.inputs.map((input) => input.itemId).find((itemId) => FITTINGS.includes(itemId)) ?? '';
    };
    for (const line of ['edge', 'sight', 'tuning']) {
      const tiers = [1, 2, 3, 4, 5].map((tier) => GAME_CONTENT.items.get(`${line}-kit-${tier}`)).filter((item): item is ItemDefinition => item !== undefined);
      assert.equal(tiers.length, 5, line);
      tiers.slice(1).forEach((item, index) => {
        const previous = tiers[index];
        assert.ok(previous && boostOf(item) > boostOf(previous), `${item.id} is no stronger than the kit before it`);
      });
      const fittings = tiers.map(fittingOf);
      assert.ok(fittings.every((fitting) => fitting !== ''), `${line} kit missing a fitting`);
      assert.equal(new Set(fittings).size, 5, `${line} kits share a fitting`);
    }
  });

  test('every kit says it does not stack with tinctures', () => {
    for (const kit of kits) assert.match(kit.examine, /does not stack with tinctures/, kit.id);
  });
});
