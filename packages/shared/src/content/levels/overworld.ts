import { anchorOf, type LevelDefinition, type LevelRecipe } from '../../world/level.ts';
import { placeLandSquares } from '../../world/levelPlan.ts';
import { SQUARE_LAYOUT_IDS } from '../districts/layouts/index.ts';
import { SPAN_MEGASTRUCTURES } from '../span/megastructures.ts';
import { SHIPPED_CONTEXT } from './shippedContext.ts';

export const SPAWN_DISTRICT_ID = 'site-kestrel';

export const OVERWORLD_RECIPE: LevelRecipe = (context) => {
  const land = context.landOf('the-span');
  return {
    id: 'overworld',
    name: 'The Span',
    kind: 'floor',
    depth: 0,
    capacity: 300,
    spawn: { districtId: SPAWN_DISTRICT_ID, position: anchorOf(context, SPAWN_DISTRICT_ID, 'start') },
    land,
    districts: placeLandSquares(
      land,
      SQUARE_LAYOUT_IDS.map((id) => context.districtOf(id)),
    ),
    connectors: [],
    megastructures: SPAN_MEGASTRUCTURES,
  };
};

export const OVERWORLD: LevelDefinition = OVERWORLD_RECIPE(SHIPPED_CONTEXT);
