import type { LevelDefinition } from '../../world/level.ts';
import { VESPER_CELLARS_ANCHORS } from '../districts/vesperCellars.ts';

export const VESPER_CELLARS_LEVEL: LevelDefinition = {
  id: 'vesper-cellars',
  name: 'The Cold Ward',
  kind: 'floor',
  depth: -1,
  capacity: 40,
  spawn: { districtId: 'vesper-cellars', position: VESPER_CELLARS_ANCHORS.liftArrival },
  districts: [{ districtId: 'vesper-cellars', origin: { x: 0, y: 0 } }],
  connectors: [],
};
