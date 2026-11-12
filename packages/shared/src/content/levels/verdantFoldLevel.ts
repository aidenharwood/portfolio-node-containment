import { anchorOf, type LevelDefinition, type LevelRecipe } from '../../world/level.ts';
import { SHIPPED_CONTEXT } from './shippedContext.ts';

export const VERDANT_FOLD_LEVEL_RECIPE: LevelRecipe = (context) => ({
  id: 'verdant-fold',
  name: 'The Verdant Fold',
  kind: 'pocket',
  depth: 0,
  capacity: 24,
  spawn: { districtId: 'verdant-fold', position: anchorOf(context, 'verdant-fold', 'arrival') },
  districts: [{ districtId: 'verdant-fold', origin: { x: 0, y: 0 } }],
  connectors: [],
});

export const VERDANT_FOLD_LEVEL: LevelDefinition = VERDANT_FOLD_LEVEL_RECIPE(SHIPPED_CONTEXT);
