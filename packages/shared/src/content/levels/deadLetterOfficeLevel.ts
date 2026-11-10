import type { LevelDefinition } from '../../world/level.ts';

export const DEAD_LETTER_OFFICE_LEVEL: LevelDefinition = {
  id: 'dead-letter-office',
  name: 'The Dead Letter Office',
  kind: 'pocket',
  depth: -3,
  capacity: 24,
  spawn: { districtId: 'dead-letter-office', position: { x: 4, y: 5 } },
  districts: [{ districtId: 'dead-letter-office', origin: { x: 0, y: 0 } }],
  connectors: [],
};
