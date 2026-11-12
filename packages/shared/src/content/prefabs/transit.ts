import { prefab, type Prefab } from './types.ts';

export const TRANSIT_PREFABS: readonly Prefab[] = [
  prefab('crates', ['mine', 'camp', 'cold'], ['island'], [[0, 0, 'crate-stack'], [1, 0, 'crate-stack'], [0, 1, 'packing-crate'], [1, 1, 'packing-crate']]),
];
