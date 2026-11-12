import { prefab, row, type Prefab } from './types.ts';

export const RITUAL_PREFABS: readonly Prefab[] = [
  prefab('pews', ['chapel'], ['island', 'edge'], row('pew', 4)),
  prefab('pew-rows', ['chapel'], ['island'], [...row('pew', 4), ...row('pew', 4, 2), ...row('pew', 4, 4)]),
  prefab('candles', ['chapel'], ['wall', 'bay'], [[0, 0, 'candle-stand'], [2, 0, 'candle-stand']]),
  prefab('chapel-corner', ['chapel'], ['corner'], [[0, 0, 'candle-stand']]),
];
