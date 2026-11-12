import { anchorOf, type LevelDefinition, type LevelRecipe } from '../../world/level.ts';
import { SHIPPED_CONTEXT } from './shippedContext.ts';

export const CALDER_DEEPS_LEVEL_RECIPE: LevelRecipe = (context) => ({
  id: 'calder-deeps',
  name: 'Calder Deeps',
  kind: 'floor',
  depth: -1,
  capacity: 40,
  spawn: { districtId: 'calder-deeps', position: anchorOf(context, 'calder-deeps', 'liftArrival') },
  districts: [{ districtId: 'calder-deeps', origin: { x: 0, y: 0 } }],
  connectors: [],
});

export const CALDER_DEEPS_LEVEL: LevelDefinition = CALDER_DEEPS_LEVEL_RECIPE(SHIPPED_CONTEXT);
