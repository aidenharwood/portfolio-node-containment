import { anchorOf, type LevelDefinition, type LevelRecipe } from '../../world/level.ts';
import { SHIPPED_CONTEXT } from './shippedContext.ts';

export const MERIDIAN_BELOW_LEVEL_RECIPE: LevelRecipe = (context) => ({
  id: 'meridian-below',
  name: 'Meridian Below',
  kind: 'pocket',
  depth: -4,
  capacity: 24,
  spawn: { districtId: 'meridian-below', position: anchorOf(context, 'meridian-below', 'arrival') },
  districts: [{ districtId: 'meridian-below', origin: { x: 0, y: 0 } }],
  connectors: [],
});

export const MERIDIAN_BELOW_LEVEL: LevelDefinition = MERIDIAN_BELOW_LEVEL_RECIPE(SHIPPED_CONTEXT);
