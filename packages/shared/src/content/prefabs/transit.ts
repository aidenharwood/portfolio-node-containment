import { prefab, row, type Prefab } from './types.ts';

export const TRANSIT_PREFABS: readonly Prefab[] = [
  prefab('crates', ['mine', 'camp', 'cold'], ['island'], [[0, 0, 'crate-stack'], [1, 0, 'crate-stack'], [0, 1, 'packing-crate'], [1, 1, 'packing-crate']]),
  prefab('cones', ['works'], ['island', 'edge'], row('traffic-cone', 3)),
  prefab('mine-carts', ['mine'], ['island', 'edge'], [[0, 0, 'mine-cart'], [1, 0, 'mine-cart'], [2, 0, 'sack-pile']]),
  prefab('salt-sacks', ['mine'], ['island'], [[0, 0, 'sack-pile'], [1, 0, 'sack-pile'], [0, 1, 'sack-pile'], [2, 0, 'floor-lamp']]),
  prefab('works-barrier', ['works'], ['island'], [...row('works-barrier', 4), [0, 1, 'traffic-cone'], [3, 1, 'survey-stake']]),
  prefab('reserved-plot', ['works'], ['island', 'edge'], [[0, 0, 'reserved-plot'], [1, 0, 'reserved-plot'], [2, 0, 'survey-stake']]),
  prefab('mine-corner', ['mine'], ['corner'], [[0, 0, 'floor-lamp']]),
  prefab('works-corner', ['works'], ['corner'], [[0, 0, 'traffic-cone']]),
];
