import type { LevelId } from '../../ids.ts';
import type { LevelRecipe } from '../../world/level.ts';
import { CALDER_DEEPS_LEVEL_RECIPE } from './calderDeepsLevel.ts';
import { DEAD_LETTER_OFFICE_LEVEL_RECIPE } from './deadLetterOfficeLevel.ts';
import { MAIN_FLOOR_RECIPE } from './mainFloor.ts';
import { MERIDIAN_BELOW_LEVEL_RECIPE } from './meridianBelowLevel.ts';
import { THE_DEEP_RECIPE } from './theDeep.ts';
import { THE_THRESHOLD_RECIPE } from './theThreshold.ts';
import { UNDERCROFT_LEVEL_RECIPE } from './undercroftLevel.ts';
import { VERDANT_FOLD_LEVEL_RECIPE } from './verdantFoldLevel.ts';
import { VESPER_CELLARS_LEVEL_RECIPE } from './vesperCellarsLevel.ts';
import { SHIPPED_CONTEXT } from './shippedContext.ts';

const RECIPES: readonly LevelRecipe[] = [
  MAIN_FLOOR_RECIPE,
  UNDERCROFT_LEVEL_RECIPE,
  THE_DEEP_RECIPE,
  THE_THRESHOLD_RECIPE,
  MERIDIAN_BELOW_LEVEL_RECIPE,
  VERDANT_FOLD_LEVEL_RECIPE,
  DEAD_LETTER_OFFICE_LEVEL_RECIPE,
  CALDER_DEEPS_LEVEL_RECIPE,
  VESPER_CELLARS_LEVEL_RECIPE,
];

export const LEVEL_RECIPES: ReadonlyMap<LevelId, LevelRecipe> = new Map(RECIPES.map((recipe) => [recipe(SHIPPED_CONTEXT).id, recipe]));
