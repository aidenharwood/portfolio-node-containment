import { anchorOf, type LevelDefinition, type LevelRecipe } from '../../world/level.ts';
import { SHIPPED_CONTEXT } from './shippedContext.ts';

const below = (id: string, name: string, depth: number, districtId: string): LevelRecipe => (context) => ({
  id,
  name,
  kind: 'floor',
  depth,
  capacity: 120,
  spawn: { districtId, position: anchorOf(context, districtId, 'arrival') },
  districts: [{ districtId, origin: { x: 0, y: 0 } }],
  connectors: [],
});

export const MERIDIAN_LEVEL_RECIPES: readonly LevelRecipe[] = [
  below('meridian-b1', 'Site Meridian B1', -1, 'meridian-intake'),
  below('meridian-b2', 'Site Meridian B2', -2, 'meridian-secure'),
  below('meridian-b3', 'Site Meridian B3', -3, 'meridian-vault'),
];

export const MERIDIAN_LEVELS: readonly LevelDefinition[] = MERIDIAN_LEVEL_RECIPES.map((recipe) => recipe(SHIPPED_CONTEXT));
