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

export const BELOW_LEVEL_RECIPES: readonly LevelRecipe[] = [
  below('kestrel-b1', 'Site Kestrel B1', -1, 'kestrel-intake'),
  below('gallowglass-b1', 'Site Gallowglass B1', -1, 'gallowglass-undercity'),
  below('null-b1', 'Site Null B1', -1, 'null-below'),
];

export const BELOW_LEVELS: readonly LevelDefinition[] = BELOW_LEVEL_RECIPES.map((recipe) => recipe(SHIPPED_CONTEXT));
