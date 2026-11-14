import type { LevelId } from '../../ids.ts';
import type { LevelRecipe } from '../../world/level.ts';
import { OVERWORLD_RECIPE } from './overworld.ts';
import { SHIPPED_CONTEXT } from './shippedContext.ts';

const RECIPES: readonly LevelRecipe[] = [OVERWORLD_RECIPE];

export const LEVEL_RECIPES: ReadonlyMap<LevelId, LevelRecipe> = new Map(RECIPES.map((recipe) => [recipe(SHIPPED_CONTEXT).id, recipe]));
