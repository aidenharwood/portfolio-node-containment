import type { LevelDefinition } from '../../world/level.ts';
import { SECTOR_THREE_ANCHORS } from '../districts/sectorThree.ts';

export const THE_THRESHOLD: LevelDefinition = {
  id: 'the-threshold',
  name: 'The Threshold',
  kind: 'pocket',
  depth: -2,
  capacity: 16,
  spawn: { districtId: 'sector-three', position: SECTOR_THREE_ANCHORS.arrival },
  districts: [{ districtId: 'sector-three', origin: { x: 0, y: 0 } }],
  connectors: [],
};
