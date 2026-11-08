import type { LevelDefinition } from '../../world/level.ts';

export const THE_DEEP: LevelDefinition = {
  id: 'the-deep',
  name: 'The Deep',
  kind: 'floor',
  depth: -2,
  capacity: 200,
  spawn: { districtId: 'deepwatch', position: { x: 3, y: 10 } },
  districts: [
    { districtId: 'deepwatch', origin: { x: 60, y: 0 } },
    { districtId: 'cryovault', origin: { x: 0, y: 30 } },
    { districtId: 'signal-array', origin: { x: 48, y: 30 } },
    { districtId: 'drowned-archive', origin: { x: 96, y: 30 } },
    { districtId: 'furnace', origin: { x: 100, y: 0 } },
  ],
  connectors: [],
};
