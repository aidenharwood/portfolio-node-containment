import { prefab, type Prefab } from './types.ts';

export const MINE_PREFABS: readonly Prefab[] = [
  prefab('mine-carts', ['mine'], ['island', 'edge'], [[0, 0, 'mine-cart'], [1, 0, 'mine-cart'], [2, 0, 'sack-pile']]),
  prefab('salt-sacks', ['mine'], ['island'], [[0, 0, 'sack-pile'], [1, 0, 'sack-pile'], [0, 1, 'sack-pile'], [2, 0, 'floor-lamp']]),
  prefab('mine-corner', ['mine'], ['corner'], [[0, 0, 'floor-lamp']]),
];
