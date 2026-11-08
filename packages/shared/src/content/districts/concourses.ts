import type { DistrictDefinition } from '../../world/district.ts';

export const VERDANCE_CONCOURSE: DistrictDefinition = {
  id: 'verdance-concourse',
  name: 'Verdance Concourse',
  subtitle: 'Site Meridian — West Transit Corridor',
  tier: 1,
  recovery: { districtId: 'meridian-atrium', position: { x: 20, y: 32 } },
  ambience: { darkness: 0.5, tint: '#0a1a12', fog: '#0c1e14' },
  map: [
    '##################',
    '........~~~.......',
    '........~~~.......',
    '........~~~.......',
    '........~~~.......',
    '........~~~.......',
    '##################',
  ],
  areas: [{ id: 'concourse', name: 'Verdance Concourse', rect: { x: 0, y: 1, width: 18, height: 5 } }],
  npcs: [],
  objects: [
    { instanceId: 'vc-puddle', objectId: 'litter-puddle', position: { x: 5, y: 3 } },
    { instanceId: 'vc-papers', objectId: 'litter-papers', position: { x: 14, y: 2 } },
    { instanceId: 'vc-debris', objectId: 'litter-debris', position: { x: 2, y: 5 } },
  ],
  assemblies: [
    { instanceId: 'vc-bridge-north', assemblyId: 'bridge', position: { x: 7, y: 1 }, facing: 'east', span: 3 },
    { instanceId: 'vc-bridge-south', assemblyId: 'bridge', position: { x: 7, y: 4 }, facing: 'east', span: 3 },
    { instanceId: 'vc-cable-run', assemblyId: 'cable-run', position: { x: 12, y: 5 }, facing: 'east', span: 3 },
  ],
  lights: [
    { position: { x: 3, y: 3 }, radius: 5, color: '#7cf29a', intensity: 0.5 },
    { position: { x: 9, y: 3 }, radius: 4, color: '#4fd8ff', intensity: 0.55 },
    { position: { x: 15, y: 3 }, radius: 5, color: '#9fd8ff', intensity: 0.45 },
  ],
};

export const SERVICE_CONCOURSE: DistrictDefinition = {
  id: 'service-concourse',
  name: 'Service Concourse',
  subtitle: 'Site Meridian — East Transit Corridor',
  tier: 1,
  recovery: { districtId: 'meridian-atrium', position: { x: 20, y: 32 } },
  ambience: { darkness: 0.52, tint: '#16110a', fog: '#1a140c' },
  map: [
    '##############',
    ',,,,,,,,,,,,,,',
    ',,,,,,,,,,,,,,',
    ',,,,,,,,,,,,,,',
    ',,,,,,,,,,,,,,',
    ',,,,,,,,,,,,,,',
    '##############',
  ],
  areas: [{ id: 'concourse', name: 'Service Concourse', rect: { x: 0, y: 1, width: 14, height: 5 } }],
  npcs: [],
  objects: [
    { instanceId: 'sc-pipes-a', objectId: 'pipe-cluster', position: { x: 4, y: 1 } },
    { instanceId: 'sc-pipes-b', objectId: 'pipe-cluster', position: { x: 10, y: 5 } },
    { instanceId: 'sc-debris', objectId: 'litter-debris', position: { x: 7, y: 2 } },
    { instanceId: 'sc-papers', objectId: 'litter-papers', position: { x: 12, y: 4 } },
    { instanceId: 'sc-puddle', objectId: 'litter-puddle', position: { x: 2, y: 4 } },
  ],
  assemblies: [{ instanceId: 'sc-cable-run', assemblyId: 'cable-run', position: { x: 1, y: 3 }, facing: 'east', span: 9 }],
  lights: [
    { position: { x: 3, y: 3 }, radius: 5, color: '#ffb347', intensity: 0.45 },
    { position: { x: 10, y: 3 }, radius: 5, color: '#ffd27f', intensity: 0.45 },
  ],
};
