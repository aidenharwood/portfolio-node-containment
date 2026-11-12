import { prefab, row, type Prefab } from './types.ts';

export const CIVIC_PREFABS: readonly Prefab[] = [
  prefab('bench-planters', ['civic'], ['island', 'edge'], [[0, 0, 'planter'], [1, 0, 'briefing-bench'], [2, 0, 'briefing-bench'], [3, 0, 'planter']]),
  prefab('seating-row', ['civic'], ['island'], [[0, 0, 'potted-fern'], ...row('briefing-bench', 3, 0, undefined, 1), [4, 0, 'trash-bin']]),
  prefab('waiting-area', ['civic'], ['island'], [...row('briefing-bench', 3), ...row('briefing-bench', 3, 2), [3, 1, 'potted-fern']]),
  prefab('fern-bench', ['civic'], ['island', 'edge'], [[0, 0, 'potted-fern'], [1, 0, 'briefing-bench'], [2, 0, 'potted-fern']]),
  prefab('refreshments', ['civic', 'canteen'], ['wall', 'bay'], [[0, 0, 'vending-machine'], [1, 0, 'vending-machine'], [2, 0, 'water-cooler'], [3, 0, 'trash-bin']]),
  prefab('cooler-corner', ['civic', 'office', 'canteen', 'medical'], ['wall', 'bay'], [[0, 0, 'water-cooler'], [1, 0, 'trash-bin'], [2, 0, 'potted-fern']]),
  prefab('shuttered-kiosk', ['civic', 'works'], ['wall', 'bay'], [[0, 0, 'shuttered-kiosk'], [1, 0, 'shuttered-kiosk'], [2, 0, 'trash-bin']]),
  prefab('civic-corner', ['civic'], ['corner'], [[0, 0, 'planter']]),
];
