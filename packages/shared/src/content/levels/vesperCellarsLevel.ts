import type { LevelDefinition } from '../../world/level.ts';

export const VESPER_CELLARS_LEVEL: LevelDefinition = {
  id: 'vesper-cellars',
  name: 'The Cold Ward',
  kind: 'floor',
  depth: -1,
  capacity: 40,
  spawn: { districtId: 'vesper-cellars', position: { x: 35, y: 4 } },
  districts: [{ districtId: 'vesper-cellars', origin: { x: 0, y: 0 } }],
  connectors: [],
};
