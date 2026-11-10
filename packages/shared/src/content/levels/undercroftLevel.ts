import type { LevelDefinition } from '../../world/level.ts';
import { UNDERCROFT_ANCHORS } from '../districts/undercroft.ts';

export const UNDERCROFT_LEVEL: LevelDefinition = {
  id: 'b1-undercroft',
  name: 'Undercroft',
  kind: 'floor',
  depth: -1,
  capacity: 24,
  spawn: { districtId: 'undercroft', position: UNDERCROFT_ANCHORS.liftArrival },
  districts: [{ districtId: 'undercroft', origin: { x: 0, y: 0 } }],
  connectors: [],
};
