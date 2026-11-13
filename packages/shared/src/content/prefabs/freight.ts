import { prefab, row, type Prefab } from './types.ts';

export const FREIGHT_PREFABS: readonly Prefab[] = [
  prefab('shelving-aisle', ['island'], [...row('storage-rack', 4), ...row('storage-rack', 4, 2)], { rows: true }),
  prefab('pallets', ['island'], [...row('pallet-stack', 3), [0, 1, 'crate-stack']], { rows: true }),
  prefab('container-block', ['island'], [[0, 0, 'cargo-container'], [1, 0, 'cargo-container'], [0, 1, 'cargo-container'], [1, 1, 'cargo-container'], [2, 1, 'traffic-cone']], { rows: true }),
  prefab('container-pair', ['island', 'edge'], [[0, 0, 'cargo-container'], [1, 0, 'cargo-container'], [2, 0, 'pallet-stack']], { rows: true }),
];
