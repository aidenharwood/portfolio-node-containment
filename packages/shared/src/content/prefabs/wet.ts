import { prefab, row, type Prefab } from './types.ts';

export const WET_PREFABS: readonly Prefab[] = [
  prefab('sandbag-row', ['wet', 'camp'], ['island', 'edge'], row('sandbags', 4)),
  prefab('pump-kit', ['wet'], ['island'], [[0, 0, 'generator'], [1, 0, 'barrel'], [2, 0, 'barrel'], [0, 1, 'mop-bucket']]),
  prefab('wet-corner', ['wet'], ['corner'], [[0, 0, 'barrel']]),
];
