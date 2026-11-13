import { prefab, row, type Prefab } from './types.ts';

export const WET_PREFABS: readonly Prefab[] = [
  prefab('sandbag-row', ['island', 'edge'], row('sandbags', 4)),
  prefab('pump-kit', ['island'], [[0, 0, 'generator'], [1, 0, 'barrel'], [2, 0, 'barrel'], [0, 1, 'mop-bucket']]),
];
