import { anchorOf, type LevelDefinition, type LevelRecipe } from '../../world/level.ts';
import { joinDistricts, pinPlacements, placeLandSquares } from '../../world/levelPlan.ts';
import { HINTERLAND_DISTRICT_IDS } from '../districts/hinterland.ts';
import { SHIPPED_CONTEXT } from './shippedContext.ts';

const TERMINUS_SQUARE_ORIGIN = { x: 128, y: 320 };

export const OVERWORLD_RECIPE: LevelRecipe = (context) => {
  const land = context.landOf('hinterland');
  const lowWard = joinDistricts(
    ['terminus-square', 'tenements', 'market-row', 'canal-basin', 'laundry-gardens', 'the-cut', 'scrapyards', 'shipyard-fringe', 'cordon-gate'].map((id) => context.districtOf(id)),
    'terminus-square',
    [
      { districtId: 'tenements', exit: 'south', to: 'terminus-square', toExit: 'north' },
      { districtId: 'market-row', exit: 'west', to: 'tenements', toExit: 'east' },
      { districtId: 'canal-basin', exit: 'west', to: 'terminus-square', toExit: 'east' },
      { districtId: 'laundry-gardens', exit: 'north', to: 'terminus-square', toExit: 'south' },
      { districtId: 'the-cut', exit: 'west', to: 'laundry-gardens', toExit: 'east' },
      { districtId: 'scrapyards', exit: 'west', to: 'market-row', toExit: 'east' },
      { districtId: 'shipyard-fringe', exit: 'west', to: 'canal-basin', toExit: 'east' },
      { districtId: 'cordon-gate', exit: 'west', to: 'shipyard-fringe', toExit: 'east' },
    ],
  );
  return {
    id: 'overworld',
    name: 'Hollow Bay',
    kind: 'floor',
    depth: 0,
    capacity: 300,
    spawn: { districtId: 'terminus-square', position: anchorOf(context, 'terminus-square', 'start') },
    land,
    districts: [
      ...pinPlacements(lowWard, 'terminus-square', TERMINUS_SQUARE_ORIGIN),
      ...placeLandSquares(
        land,
        HINTERLAND_DISTRICT_IDS.map((id) => context.districtOf(id)),
      ),
    ],
    connectors: [],
  };
};

export const OVERWORLD: LevelDefinition = OVERWORLD_RECIPE(SHIPPED_CONTEXT);
