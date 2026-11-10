import type { LevelDefinition } from '../../world/level.ts';
import { CALDER_DEEPS_ANCHORS } from '../districts/calderDeeps.ts';

export const CALDER_DEEPS_LEVEL: LevelDefinition = {
  id: 'calder-deeps',
  name: 'Calder Deeps',
  kind: 'floor',
  depth: -1,
  capacity: 40,
  spawn: { districtId: 'calder-deeps', position: CALDER_DEEPS_ANCHORS.liftArrival },
  districts: [{ districtId: 'calder-deeps', origin: { x: 0, y: 0 } }],
  connectors: [],
};
