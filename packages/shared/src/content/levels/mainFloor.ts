import type { LevelDefinition } from '../../world/level.ts';

export const MAIN_FLOOR: LevelDefinition = {
  id: 'main-floor',
  name: 'Site Meridian',
  kind: 'floor',
  depth: 0,
  capacity: 300,
  spawn: { districtId: 'meridian-atrium', position: { x: 6, y: 31 } },
  districts: [
    { districtId: 'hydroponics', origin: { x: 0, y: 33 } },
    { districtId: 'verdance-concourse', origin: { x: 38, y: 51 } },
    { districtId: 'meridian-atrium', origin: { x: 56, y: 30 } },
    { districtId: 'service-concourse', origin: { x: 108, y: 51 } },
    { districtId: 'service-yards', origin: { x: 122, y: 40 } },
    { districtId: 'waterworks', origin: { x: 162, y: 46 } },
    { districtId: 'sector-two', origin: { x: 77, y: 8 } },
    { districtId: 'intake-wing', origin: { x: 56, y: 76 } },
  ],
  connectors: [],
};
