import type { LevelDefinition } from '../../world/level.ts';

export const MAIN_FLOOR: LevelDefinition = {
  id: 'main-floor',
  name: 'Site Meridian',
  kind: 'floor',
  depth: 0,
  capacity: 300,
  spawn: { districtId: 'meridian-atrium', position: { x: 6, y: 31 } },
  districts: [
    { districtId: 'hydroponics', origin: { x: 126, y: 33 } },
    { districtId: 'verdance-concourse', origin: { x: 164, y: 51 } },
    { districtId: 'meridian-atrium', origin: { x: 182, y: 30 } },
    { districtId: 'service-concourse', origin: { x: 234, y: 51 } },
    { districtId: 'service-yards', origin: { x: 248, y: 40 } },
    { districtId: 'waterworks', origin: { x: 288, y: 46 } },
    { districtId: 'sector-two', origin: { x: 203, y: 8 } },
    { districtId: 'intake-wing', origin: { x: 182, y: 76 } },
    { districtId: 'calder-causeway', origin: { x: 328, y: 50 } },
    { districtId: 'brine-galleries', origin: { x: 354, y: 34 } },
    { districtId: 'calder-gatehouse', origin: { x: 398, y: 40 } },
    { districtId: 'salt-cathedral', origin: { x: 414, y: 31 } },
  ],
  connectors: [],
};
