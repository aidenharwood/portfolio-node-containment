import { prefab, row, type Prefab } from './types.ts';

export const MEDICAL_PREFABS: readonly Prefab[] = [
  prefab('gurney-row', ['island'], [[0, 0, 'gurney'], [1, 0, 'screen-partition', 'east'], [2, 0, 'gurney'], [3, 0, 'screen-partition', 'east'], [4, 0, 'gurney']], { rows: true }),
  prefab('gurney-screen', ['island', 'edge'], [[0, 0, 'screen-partition', 'east'], [1, 0, 'gurney'], [2, 0, 'wheelchair', 'west']], { rows: true }),
  prefab('wheelchairs', ['wall', 'bay'], [[0, 0, 'wheelchair'], [1, 0, 'wheelchair'], [2, 0, 'potted-fern']]),
  prefab('specimen-pair', ['wall', 'bay'], row('specimen-tank', 2), { rows: true }),
  prefab('ward-beds', ['wall', 'bay'], [[0, 0, 'gurney'], [1, 0, 'screen-partition', 'east'], [2, 0, 'gurney'], [3, 0, 'screen-partition', 'east'], [4, 0, 'gurney']], { rows: true }),
  prefab('triage-hub', ['focal'], [[3, 0, 'gurney'], [0, 2, 'gurney'], [2, 2, 'triage-station'], [6, 2, 'gurney'], [3, 5, 'gurney']], { decals: [{ kind: 'inlay', pattern: 'border', rect: { x: 0, y: 0, width: 7, height: 6 } }] }),
];
