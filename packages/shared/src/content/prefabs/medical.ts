import { prefab, row, type Prefab } from './types.ts';

export const MEDICAL_PREFABS: readonly Prefab[] = [
  prefab('gurney-row', ['medical'], ['island'], [[0, 0, 'gurney'], [1, 0, 'screen-partition', 'east'], [2, 0, 'gurney'], [3, 0, 'screen-partition', 'east'], [4, 0, 'gurney']]),
  prefab('gurney-screen', ['medical', 'ward'], ['island', 'edge'], [[0, 0, 'screen-partition', 'east'], [1, 0, 'gurney'], [2, 0, 'wheelchair', 'west']]),
  prefab('wheelchairs', ['medical', 'ward'], ['wall', 'bay'], [[0, 0, 'wheelchair'], [1, 0, 'wheelchair'], [2, 0, 'potted-fern']]),
  prefab('specimen-pair', ['medical', 'lab', 'cold'], ['wall', 'bay'], row('specimen-tank', 2)),
  prefab('ward-beds', ['ward'], ['wall', 'bay'], [[0, 0, 'gurney'], [1, 0, 'screen-partition', 'east'], [2, 0, 'gurney'], [3, 0, 'screen-partition', 'east'], [4, 0, 'gurney']]),
  prefab('medical-corner', ['medical'], ['corner'], [[0, 0, 'potted-fern']]),
  prefab('ward-corner', ['ward'], ['corner'], [[0, 0, 'potted-fern']]),
];
