import { anchorOf, type LevelDefinition, type LevelRecipe } from '../../world/level.ts';
import { SHIPPED_CONTEXT } from './shippedContext.ts';

export const VESPER_CELLARS_LEVEL_RECIPE: LevelRecipe = (context) => ({
  id: 'vesper-cellars',
  name: 'The Cold Ward',
  kind: 'floor',
  depth: -1,
  capacity: 40,
  spawn: { districtId: 'vesper-cellars', position: anchorOf(context, 'vesper-cellars', 'liftArrival') },
  districts: [{ districtId: 'vesper-cellars', origin: { x: 0, y: 0 } }],
  connectors: [],
});

export const VESPER_CELLARS_LEVEL: LevelDefinition = VESPER_CELLARS_LEVEL_RECIPE(SHIPPED_CONTEXT);
