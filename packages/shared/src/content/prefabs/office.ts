import { prefab, row, type Prefab } from './types.ts';

export const OFFICE_PREFABS: readonly Prefab[] = [
  prefab('desk-pair', ['office'], ['island'], [...row('office-desk', 2), ...row('office-chair', 2, 1, 'north')]),
  prefab('desk-island', ['office', 'lab'], ['island'], [...row('office-chair', 3, 0), ...row('office-desk', 3, 1, 'north'), ...row('office-desk', 3, 2), ...row('office-chair', 3, 3, 'north')]),
  prefab('desk-cabinet', ['office'], ['wall', 'bay'], [[0, 0, 'filing-cabinet'], [1, 0, 'office-desk'], [2, 0, 'office-desk'], [1, 1, 'office-chair', 'north'], [2, 1, 'office-chair', 'north']]),
  prefab('monitor-desk', ['office', 'lab'], ['island'], [...row('monitor-bank', 2), ...row('office-chair', 2, 1, 'north')]),
  prefab('cabinet-row', ['office', 'medical', 'archive'], ['wall', 'bay'], [...row('filing-cabinet', 3), [3, 0, 'potted-fern']]),
  prefab('office-corner', ['office'], ['corner'], [[0, 0, 'potted-fern']]),
];
