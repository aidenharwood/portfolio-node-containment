import type { LevelDefinition } from '../../world/level.ts';

export const UNDERCROFT_LEVEL: LevelDefinition = {
  id: 'b1-undercroft',
  name: 'Undercroft',
  site: 'meridian',
  kind: 'floor',
  depth: -1,
  capacity: 24,
  spawn: { districtId: 'undercroft', position: { x: 5, y: 4 } },
  districts: [{ districtId: 'undercroft', origin: { x: 0, y: 0 } }],
  connectors: [],
};
