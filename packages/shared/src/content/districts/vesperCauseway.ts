import type { DistrictDefinition } from '../../world/district.ts';
import { HYDROPONICS_ANCHORS } from './hydroponics.ts';

export const VESPER_CAUSEWAY: DistrictDefinition = {
  id: 'vesper-causeway',
  name: 'Sanatorium Walk',
  subtitle: 'Vesper Wing — Covered Walk',
  tier: 12,
  region: 'vesper',
  recovery: { districtId: 'hydroponics', position: HYDROPONICS_ANCHORS.tramPlatform },
  ambience: { darkness: 0.58, tint: '#0f1614', fog: '#121a18', fixtures: 'failing' },
  map: [
    '##########################',
    ',,,,,,,,,,,,,,,,,,,,,,,,,,',
    ',,,,,,,,,,,,,,,,,,,,,,,,,,',
    ',,,,,,,,,,,,,,,,,,,,,,,,,,',
    ',,,,,,,,,,,,,,,,,,,,,,,,,,',
    ',,,,,,,,,,,,,,,,,,,,,,,,,,',
    '##########################',
  ],
  areas: [
    { id: 'walk', name: 'Sanatorium Walk', rect: { x: 0, y: 1, width: 26, height: 5 } },
  ],
  npcs: [],
  objects: [
    { instanceId: 'vsw-sign', objectId: 'warning-sign', position: { x: 23, y: 1 } },
    { instanceId: 'vsw-bench', objectId: 'briefing-bench', position: { x: 17, y: 1 } },
    { instanceId: 'vsw-pipes', objectId: 'pipe-cluster', position: { x: 7, y: 5 } },
    { instanceId: 'vsw-papers', objectId: 'litter-papers', position: { x: 14, y: 3 } },
    { instanceId: 'vsw-debris', objectId: 'litter-debris', position: { x: 4, y: 2 } },
    { instanceId: 'vsw-puddle', objectId: 'litter-puddle', position: { x: 20, y: 4 } },
  ],
  lights: [
    { position: { x: 21, y: 3 }, radius: 5, color: '#6ad8b8', intensity: 0.4 },
    { position: { x: 12, y: 3 }, radius: 5, color: '#ffe8b8', intensity: 0.35 },
    { position: { x: 3, y: 3 }, radius: 5, color: '#6ad8b8', intensity: 0.45 },
  ],
};
