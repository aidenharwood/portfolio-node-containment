import { anchorOf, type LevelDefinition, type LevelRecipe } from '../../world/level.ts';
import { SHIPPED_CONTEXT } from './shippedContext.ts';

export const UNDERCROFT_LEVEL_RECIPE: LevelRecipe = (context) => ({
  id: 'b1-undercroft',
  name: 'Undercroft',
  kind: 'floor',
  depth: -1,
  capacity: 24,
  spawn: { districtId: 'undercroft', position: anchorOf(context, 'undercroft', 'liftArrival') },
  districts: [{ districtId: 'undercroft', origin: { x: 0, y: 0 } }],
  connectors: [],
});

export const UNDERCROFT_LEVEL: LevelDefinition = UNDERCROFT_LEVEL_RECIPE(SHIPPED_CONTEXT);
