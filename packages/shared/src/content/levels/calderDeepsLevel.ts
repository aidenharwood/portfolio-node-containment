import type { LevelDefinition } from '../../world/level.ts';

export const CALDER_DEEPS_LEVEL: LevelDefinition = {
  id: 'calder-deeps',
  name: 'Calder Deeps',
  kind: 'floor',
  depth: -1,
  capacity: 40,
  spawn: { districtId: 'calder-deeps', position: { x: 4, y: 4 } },
  districts: [{ districtId: 'calder-deeps', origin: { x: 0, y: 0 } }],
  connectors: [],
};
