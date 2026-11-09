import type { LevelDefinition } from '../../world/level.ts';

export const THE_THRESHOLD: LevelDefinition = {
  id: 'the-threshold',
  name: 'The Threshold',
  site: 'meridian',
  kind: 'pocket',
  depth: -2,
  capacity: 16,
  spawn: { districtId: 'sector-three', position: { x: 3, y: 6 } },
  districts: [{ districtId: 'sector-three', origin: { x: 0, y: 0 } }],
  connectors: [],
};
