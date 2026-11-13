import { prefab, row, type Prefab } from './types.ts';

export const DORMITORY_PREFABS: readonly Prefab[] = [
  prefab('bunk-row', ['wall', 'bay'], [...row('bunk-bed', 3), ...row('packing-crate', 3, 1)]),
  prefab('bunk-block', ['island'], [...row('packing-crate', 3, 0), ...row('bunk-bed', 3, 1, 'north'), ...row('bunk-bed', 3, 2), ...row('packing-crate', 3, 3)]),
  prefab('bunk-pair', ['wall', 'bay'], [[0, 0, 'bunk-bed'], [1, 0, 'storage-rack'], [2, 0, 'bunk-bed'], [0, 1, 'packing-crate'], [2, 1, 'packing-crate']]),
];
