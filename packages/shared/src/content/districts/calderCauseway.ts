import type { DistrictDefinition } from '../../world/district.ts';

export const CALDER_CAUSEWAY: DistrictDefinition = {
  id: 'calder-causeway',
  name: 'Calder Causeway',
  subtitle: 'Calder Wing — Sealed Salt Road',
  tier: 10,
  region: 'calder',
  recovery: { districtId: 'waterworks', position: { x: 4, y: 18 } },
  ambience: { darkness: 0.62, tint: '#1a1210', fog: '#20160f', fixtures: 'failing' },
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
    { id: 'causeway', name: 'Calder Causeway', rect: { x: 0, y: 1, width: 26, height: 5 } },
  ],
  npcs: [],
  objects: [
    { instanceId: 'cc-sign', objectId: 'warning-sign', position: { x: 2, y: 1 } },
    { instanceId: 'cc-pipes-a', objectId: 'pipe-cluster', position: { x: 8, y: 1 } },
    { instanceId: 'cc-pipes-b', objectId: 'pipe-cluster', position: { x: 18, y: 5 } },
    { instanceId: 'cc-puddle', objectId: 'litter-puddle', position: { x: 11, y: 3 } },
    { instanceId: 'cc-rubble', objectId: 'litter-rubble', position: { x: 21, y: 2 } },
    { instanceId: 'cc-gravel', objectId: 'litter-gravel', position: { x: 5, y: 4 } },
  ],
  lights: [
    { position: { x: 4, y: 3 }, radius: 5, color: '#ff9a6a', intensity: 0.4 },
    { position: { x: 13, y: 3 }, radius: 5, color: '#ffd27f', intensity: 0.35 },
    { position: { x: 22, y: 3 }, radius: 5, color: '#ff9a6a', intensity: 0.45 },
  ],
};
