import type { LevelDefinition } from '../../world/level.ts';

export const VERDANT_FOLD_LEVEL: LevelDefinition = {
  id: 'verdant-fold',
  name: 'The Verdant Fold',
  site: 'meridian',
  kind: 'pocket',
  depth: 0,
  capacity: 24,
  spawn: { districtId: 'verdant-fold', position: { x: 9, y: 11 } },
  districts: [{ districtId: 'verdant-fold', origin: { x: 0, y: 0 } }],
  connectors: [],
};
