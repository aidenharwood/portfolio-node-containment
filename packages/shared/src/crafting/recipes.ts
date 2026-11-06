import { levelForExperience, SKILL_INFO, type SkillExperience, type SkillId } from '../character/skills.ts';
import { addItem, countItem, removeItem, type InventoryState } from '../gear/inventory.ts';
import type { ItemCatalog } from '../gear/items.ts';
import type { ItemId } from '../ids.ts';
import { failure, success, type Result } from '../result.ts';

export const CRAFTING_STATIONS = ['refinery', 'fabricator', 'synthesiser'] as const;

export type CraftingStation = (typeof CRAFTING_STATIONS)[number];

export interface StationInfo {
  readonly name: string;
  readonly verb: string;
  readonly progressVerb: string;
  readonly summary: string;
}

export const STATION_INFO: Readonly<Record<CraftingStation, StationInfo>> = {
  refinery: {
    name: 'Refinery',
    verb: 'Refine',
    progressVerb: 'Refining',
    summary: 'Turns raw salvage and organics into base parts.',
  },
  fabricator: {
    name: 'Fabricator',
    verb: 'Assemble',
    progressVerb: 'Assembling',
    summary: 'Assembles base parts into equipment.',
  },
  synthesiser: {
    name: 'Bio-synthesiser',
    verb: 'Synthesise',
    progressVerb: 'Synthesising',
    summary: 'Synthesises refined compounds into medical supplies.',
  },
};

export interface RecipeIngredient {
  readonly itemId: ItemId;
  readonly count: number;
}

export interface RecipeDefinition {
  readonly id: string;
  readonly station: CraftingStation;
  readonly skill: SkillId;
  readonly level: number;
  readonly inputs: readonly RecipeIngredient[];
  readonly output: RecipeIngredient;
  readonly experience: number;
  readonly ticks: number;
}

export function craftingBlocker(
  recipe: RecipeDefinition,
  skills: SkillExperience,
  inventory: InventoryState,
  catalog: ItemCatalog,
): string | null {
  const level = levelForExperience(skills[recipe.skill]);
  if (level < recipe.level) return `You need ${SKILL_INFO[recipe.skill].name} level ${recipe.level}.`;
  const missing = recipe.inputs.find((input) => countItem(inventory, input.itemId) < input.count);
  if (missing) return `You need ${missing.count} × ${catalog.get(missing.itemId)?.name ?? missing.itemId}.`;
  return null;
}

export const craftableCount = (recipe: RecipeDefinition, inventory: InventoryState): number =>
  Math.min(...recipe.inputs.map((input) => Math.floor(countItem(inventory, input.itemId) / input.count)));

export interface CraftOutcome {
  readonly inventory: InventoryState;
  readonly overflow: number;
}

export function craftOnce(inventory: InventoryState, catalog: ItemCatalog, recipe: RecipeDefinition): Result<CraftOutcome> {
  let next = inventory;
  for (const input of recipe.inputs) {
    const removed = removeItem(next, input.itemId, input.count);
    if (!removed.ok) return failure(`You have run out of ${catalog.get(input.itemId)?.name ?? input.itemId}.`);
    next = removed.value;
  }
  const added = addItem(next, catalog, recipe.output.itemId, recipe.output.count);
  return success({ inventory: added.inventory, overflow: added.overflow });
}
