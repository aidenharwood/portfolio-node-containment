import { prefab, row, type Prefab } from './types.ts';

export const GARDEN_PREFABS: readonly Prefab[] = [
  prefab('planter-row', ['island'], [[0, 0, 'planter'], [1, 0, 'potted-fern'], [2, 0, 'planter'], [3, 0, 'potted-fern'], [4, 0, 'planter']]),
  prefab('ferns', ['island'], [[0, 0, 'potted-fern'], [1, 0, 'potted-fern'], [0, 1, 'potted-fern']]),
  prefab('planter-beds', ['island'], [...row('planter', 3), ...row('planter', 3, 2)], { rows: true }),
  prefab('potting-bench', ['wall', 'bay'], [[0, 0, 'workbench'], [1, 0, 'sack-pile'], [2, 0, 'potted-fern'], [0, 1, 'stool']], { rows: true }),
  prefab('sacks', ['wall', 'bay'], [[0, 0, 'sack-pile'], [1, 0, 'sack-pile'], [2, 0, 'barrel']]),
  prefab('grove-planters', ['focal'], [[0, 0, 'planter'], [1, 0, 'potted-fern'], [2, 0, 'planter'], [0, 1, 'potted-fern'], [1, 1, 'planter'], [2, 1, 'potted-fern']]),
];
