import type { LevelDefinition } from '../../world/level.ts';

export const MAIN_FLOOR: LevelDefinition = {
  id: 'main-floor',
  name: 'Site Meridian',
  kind: 'floor',
  depth: 0,
  capacity: 300,
  spawn: { districtId: 'meridian-atrium', position: { x: 5, y: 28 } },
  districts: [
    { districtId: 'hydroponics', origin: { x: 0, y: 30 } },
    { districtId: 'meridian-atrium', origin: { x: 52, y: 26 } },
    { districtId: 'sector-two', origin: { x: 59, y: 0 } },
    { districtId: 'intake-wing', origin: { x: 52, y: 64 } },
  ],
  connectors: [
    {
      id: 'verdance-concourse',
      name: 'Verdance Concourse',
      origin: { x: 38, y: 52 },
      map: ['##############', '..............', '##############'],
      ambience: { darkness: 0.5, tint: '#0a1a12', fog: '#0c1e14' },
      lights: [
        { position: { x: 3, y: 1 }, radius: 5, color: '#7cf29a', intensity: 0.5 },
        { position: { x: 10, y: 1 }, radius: 5, color: '#9fd8ff', intensity: 0.45 },
      ],
    },
  ],
};
