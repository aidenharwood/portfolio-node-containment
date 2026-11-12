import { prefab, row, type Prefab } from './types.ts';

export const CANTEEN_PREFABS: readonly Prefab[] = [
  prefab('table-set', ['canteen', 'camp'], ['island'], [[1, 1, 'canteen-table'], [0, 1, 'stool'], [2, 1, 'stool'], [1, 0, 'stool'], [1, 2, 'stool']]),
  prefab('long-table', ['canteen'], ['island'], [...row('stool', 4, 0), ...row('canteen-table', 4, 1), ...row('stool', 4, 2)]),
  prefab('canteen-corner', ['canteen'], ['corner'], [[0, 0, 'potted-fern']]),
];
