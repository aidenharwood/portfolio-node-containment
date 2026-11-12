import { anchorOf, type LevelDefinition, type LevelRecipe } from '../../world/level.ts';
import { SHIPPED_CONTEXT } from './shippedContext.ts';

export const THE_THRESHOLD_RECIPE: LevelRecipe = (context) => ({
  id: 'the-threshold',
  name: 'The Threshold',
  kind: 'pocket',
  depth: -2,
  capacity: 16,
  spawn: { districtId: 'sector-three', position: anchorOf(context, 'sector-three', 'arrival') },
  districts: [{ districtId: 'sector-three', origin: { x: 0, y: 0 } }],
  connectors: [],
});

export const THE_THRESHOLD: LevelDefinition = THE_THRESHOLD_RECIPE(SHIPPED_CONTEXT);
