import { prefab, type Prefab } from './types.ts';

export const MINE_PREFABS: readonly Prefab[] = [
  prefab('mine-carts', ['island', 'edge'], [[0, 0, 'mine-cart'], [1, 0, 'mine-cart'], [2, 0, 'sack-pile']]),
  prefab('salt-sacks', ['island'], [[0, 0, 'sack-pile'], [1, 0, 'sack-pile'], [0, 1, 'sack-pile'], [2, 0, 'floor-lamp']]),
  prefab('ore-heap', ['focal'], [[0, 0, 'sack-pile'], [1, 0, 'sack-pile'], [2, 0, 'sack-pile'], [0, 1, 'mine-cart'], [1, 1, 'floor-lamp'], [2, 1, 'mine-cart']]),
];
