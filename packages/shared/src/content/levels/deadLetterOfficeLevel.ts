import { anchorOf, type LevelDefinition, type LevelRecipe } from '../../world/level.ts';
import { SHIPPED_CONTEXT } from './shippedContext.ts';

export const DEAD_LETTER_OFFICE_LEVEL_RECIPE: LevelRecipe = (context) => ({
  id: 'dead-letter-office',
  name: 'The Dead Letter Office',
  kind: 'pocket',
  depth: -3,
  capacity: 24,
  spawn: { districtId: 'dead-letter-office', position: anchorOf(context, 'dead-letter-office', 'spawn') },
  districts: [{ districtId: 'dead-letter-office', origin: { x: 0, y: 0 } }],
  connectors: [],
});

export const DEAD_LETTER_OFFICE_LEVEL: LevelDefinition = DEAD_LETTER_OFFICE_LEVEL_RECIPE(SHIPPED_CONTEXT);
