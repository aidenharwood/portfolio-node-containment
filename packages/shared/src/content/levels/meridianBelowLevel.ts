import type { LevelDefinition } from '../../world/level.ts';
import { MERIDIAN_BELOW_ANCHORS } from '../districts/meridianBelow.ts';

export const MERIDIAN_BELOW_LEVEL: LevelDefinition = {
  id: 'meridian-below',
  name: 'Meridian Below',
  kind: 'pocket',
  depth: -4,
  capacity: 24,
  spawn: { districtId: 'meridian-below', position: MERIDIAN_BELOW_ANCHORS.arrival },
  districts: [{ districtId: 'meridian-below', origin: { x: 0, y: 0 } }],
  connectors: [],
};
