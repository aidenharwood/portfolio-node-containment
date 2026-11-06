import type { SkillId } from '../character/skills.ts';
import type { CraftingStation, RecipeDefinition, RecipeIngredient } from '../crafting/recipes.ts';

const STATION_SKILLS: Readonly<Record<CraftingStation, SkillId>> = {
  refinery: 'refining',
  fabricator: 'engineering',
  synthesiser: 'biochemistry',
};

const recipe = (
  station: CraftingStation,
  output: string,
  level: number,
  inputs: Readonly<Record<string, number>>,
  options: { readonly experience: number; readonly ticks?: number; readonly count?: number },
): RecipeDefinition => ({
  id: `${station}:${output}`,
  station,
  skill: STATION_SKILLS[station],
  level,
  inputs: Object.entries(inputs).map(([itemId, count]): RecipeIngredient => ({ itemId, count })),
  output: { itemId: output, count: options.count ?? 1 },
  experience: options.experience,
  ticks: options.ticks ?? 4,
});

export const REFINING_RECIPES: readonly RecipeDefinition[] = [
  recipe('refinery', 'alloy-plate', 1, { 'scrap-alloy': 2 }, { experience: 12 }),
  recipe('refinery', 'synthweave-bolt', 1, { 'synthweave-offcut': 2 }, { experience: 12 }),
  recipe('refinery', 'gel-base', 1, { 'gloam-moss': 2 }, { experience: 12 }),
  recipe('refinery', 'polymer-sheet', 3, { 'polymer-resin': 2 }, { experience: 20 }),
  recipe('refinery', 'braided-cord', 4, { 'vine-fibre': 2 }, { experience: 26 }),
  recipe('refinery', 'wiring-loom', 5, { 'conductive-filament': 2 }, { experience: 30 }),
  recipe('refinery', 'chitin-laminate', 6, { 'gloam-chitin': 2 }, { experience: 34 }),
  recipe('refinery', 'lumen-extract', 6, { 'lumen-spores': 2 }, { experience: 34 }),
  recipe('refinery', 'charged-cell', 9, { 'static-residue': 2, 'alloy-plate': 1 }, { experience: 52 }),
  recipe('refinery', 'hardened-steel', 10, { 'ferrous-slag': 2 }, { experience: 58 }),
  recipe('refinery', 'anticoagulant', 10, { 'leech-sac': 2 }, { experience: 58 }),
];

export const MEDICAL_RECIPES: readonly RecipeDefinition[] = [
  recipe('synthesiser', 'medgel', 1, { 'gel-base': 1 }, { experience: 15 }),
  recipe('synthesiser', 'sap-poultice', 5, { 'gel-base': 1, 'vine-fibre': 1 }, { experience: 28 }),
  recipe('synthesiser', 'trauma-foam', 6, { 'gel-base': 1, 'lumen-extract': 1 }, { experience: 40 }),
  recipe('synthesiser', 'clotting-shot', 10, { anticoagulant: 1, 'lumen-extract': 1 }, { experience: 70 }),
];

export const FABRICATION_RECIPES: readonly RecipeDefinition[] = [
  recipe('fabricator', 'intake-jumpsuit', 1, { 'synthweave-bolt': 2 }, { experience: 20, ticks: 5 }),
  recipe('fabricator', 'intake-trousers', 1, { 'synthweave-bolt': 2 }, { experience: 20, ticks: 5 }),
  recipe('fabricator', 'work-boots', 1, { 'synthweave-bolt': 1, 'alloy-plate': 1 }, { experience: 20, ticks: 5 }),
  recipe('fabricator', 'operative-badge', 1, { 'alloy-plate': 1 }, { experience: 12 }),
  recipe('fabricator', 'stun-baton', 1, { 'alloy-plate': 2, 'synthweave-bolt': 1 }, { experience: 30, ticks: 5 }),
  recipe('fabricator', 'lab-coat', 2, { 'synthweave-bolt': 3 }, { experience: 32, ticks: 5 }),
  recipe('fabricator', 'dart-pistol', 2, { 'alloy-plate': 2, 'polymer-sheet': 1 }, { experience: 36, ticks: 5 }),
  recipe('fabricator', 'containment-gloves', 3, { 'synthweave-bolt': 1, 'polymer-sheet': 1 }, { experience: 40, ticks: 5 }),
  recipe('fabricator', 'hazard-visor', 3, { 'polymer-sheet': 2 }, { experience: 40, ticks: 5 }),
  recipe('fabricator', 'field-vest-mk1', 4, { 'alloy-plate': 2, 'synthweave-bolt': 2 }, { experience: 50, ticks: 6 }),
  recipe('fabricator', 'thornweave-gloves', 5, { 'braided-cord': 2, 'thorn-cluster': 2 }, { experience: 60, ticks: 6 }),
  recipe('fabricator', 'research-datapad', 5, { 'polymer-sheet': 1, 'wiring-loom': 1 }, { experience: 60, ticks: 6 }),
  recipe('fabricator', 'kestrel-sidearm', 5, { 'alloy-plate': 3, 'wiring-loom': 1 }, { experience: 70, ticks: 6 }),
  recipe('fabricator', 'field-scanner', 6, { 'polymer-sheet': 1, 'wiring-loom': 2 }, { experience: 80, ticks: 6 }),
  recipe('fabricator', 'response-helmet', 6, { 'chitin-laminate': 2, 'alloy-plate': 1 }, { experience: 85, ticks: 6 }),
  recipe('fabricator', 'filter-respirator', 8, { 'polymer-sheet': 2, 'hardened-steel': 1 }, { experience: 110, ticks: 7 }),
  recipe('fabricator', 'shock-maul', 8, { 'hardened-steel': 2, 'charged-cell': 1, 'hound-fang': 2 }, { experience: 140, ticks: 7 }),
  recipe('fabricator', 'composite-plate', 9, { 'hardened-steel': 3, 'chitin-laminate': 2 }, { experience: 160, ticks: 7 }),
  recipe('fabricator', 'marksman-carbine', 10, { 'hardened-steel': 2, 'wiring-loom': 2, 'charged-cell': 1 }, { experience: 180, ticks: 7 }),
  recipe('fabricator', 'ward-lattice', 12, { 'charged-cell': 3, 'wiring-loom': 2 }, { experience: 240, ticks: 8 }),
];

export const RECIPES: readonly RecipeDefinition[] = [...REFINING_RECIPES, ...MEDICAL_RECIPES, ...FABRICATION_RECIPES];
