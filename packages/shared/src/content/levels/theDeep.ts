import type { LevelDefinition } from '../../world/level.ts';

export const THE_DEEP: LevelDefinition = {
  id: 'the-deep',
  name: 'The Deep',
  site: 'meridian',
  kind: 'floor',
  depth: -2,
  capacity: 200,
  spawn: { districtId: 'deepwatch', position: { x: 3, y: 10 } },
  districts: [
    { districtId: 'deepwatch', origin: { x: 60, y: 0 } },
    { districtId: 'deep-concourse', origin: { x: 0, y: 24 } },
    { districtId: 'furnace-causeway', origin: { x: 96, y: 15 } },
    { districtId: 'cryovault', origin: { x: 0, y: 31 } },
    { districtId: 'signal-array', origin: { x: 48, y: 31 } },
    { districtId: 'drowned-archive', origin: { x: 96, y: 31 } },
    { districtId: 'furnace', origin: { x: 144, y: 13 } },
  ],
  connectors: [],
};
