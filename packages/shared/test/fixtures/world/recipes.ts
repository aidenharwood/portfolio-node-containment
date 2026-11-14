import type { CraftingStation, RecipeDefinition } from '../../../src/crafting/recipes.ts';
import type { SkillId } from '../../../src/character/skills.ts';

const SKILL: Readonly<Record<CraftingStation, SkillId>> = { refinery: 'refining', fabricator: 'engineering', synthesiser: 'biochemistry' };

const recipe = (station: CraftingStation, output: string, level: number, inputs: Readonly<Record<string, number>>, experience: number): RecipeDefinition => ({
  id: `${station}:${output}`,
  station,
  skill: SKILL[station],
  level,
  inputs: Object.entries(inputs).map(([itemId, count]) => ({ itemId, count })),
  output: { itemId: output, count: 1 },
  experience,
  ticks: 4,
});

export const FIXTURE_RECIPES: readonly RecipeDefinition[] = [
  recipe('refinery', 'alloy-plate', 1, { 'scrap-alloy': 2 }, 12),
  recipe('fabricator', 'stun-baton', 1, { 'alloy-plate': 2 }, 30),
  recipe('fabricator', 'dart-pistol', 1, { 'alloy-plate': 2 }, 30),
  recipe('fabricator', 'long-rifle', 5, { 'alloy-plate': 3 }, 36),
  recipe('fabricator', 'work-jumpsuit', 1, { 'alloy-plate': 1 }, 12),
  recipe('fabricator', 'hazard-visor', 1, { 'alloy-plate': 1 }, 12),
  recipe('fabricator', 'research-datapad', 1, { 'alloy-plate': 1 }, 12),
  recipe('fabricator', 'field-knife', 1, { 'alloy-plate': 1 }, 12),
  recipe('fabricator', 'test-focus', 1, { 'alloy-plate': 2 }, 30),
  recipe('fabricator', 'test-amplifier', 1, { 'alloy-plate': 2 }, 30),
  recipe('fabricator', 'field-vest', 1, { 'alloy-plate': 3 }, 36),
  recipe('fabricator', 'heavy-maul', 5, { 'alloy-plate': 5 }, 60),
  recipe('synthesiser', 'medgel', 1, { 'gel-sac': 1 }, 10),
];
