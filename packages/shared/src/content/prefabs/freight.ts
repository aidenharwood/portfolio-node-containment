import { prefab, row, type Prefab } from './types.ts';

export const FREIGHT_PREFABS: readonly Prefab[] = [
  prefab('shelving-aisle', ['freight', 'archive'], ['island'], [...row('storage-rack', 4), ...row('storage-rack', 4, 2)]),
  prefab('pallets', ['freight'], ['island'], [...row('pallet-stack', 3), [0, 1, 'crate-stack']]),
  prefab('container-block', ['freight'], ['island'], [[0, 0, 'cargo-container'], [1, 0, 'cargo-container'], [0, 1, 'cargo-container'], [1, 1, 'cargo-container'], [2, 1, 'traffic-cone']]),
  prefab('container-pair', ['freight'], ['island', 'edge'], [[0, 0, 'cargo-container'], [1, 0, 'cargo-container'], [2, 0, 'pallet-stack']]),
  prefab('freight-corner', ['freight'], ['corner'], [[0, 0, 'crate-stack']]),
];
