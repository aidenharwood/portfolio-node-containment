import { prefab, row, type Prefab } from './types.ts';

export const RITUAL_PREFABS: readonly Prefab[] = [
  prefab('pews', ['chapel'], ['island', 'edge'], row('pew', 4)),
  prefab('pew-rows', ['chapel'], ['island'], [...row('pew', 4), ...row('pew', 4, 2), ...row('pew', 4, 4)]),
  prefab('candles', ['chapel'], ['wall', 'bay'], [[0, 0, 'candle-stand'], [2, 0, 'candle-stand']]),
  prefab('salt-offerings', ['chapel'], ['island', 'edge'], [[0, 0, 'sack-pile'], [1, 0, 'floor-lamp'], [2, 0, 'sack-pile']], { symmetric: true }),
  prefab('chapel-corner', ['chapel'], ['corner'], [[0, 0, 'candle-stand']]),
  prefab('salt-shrine', [], ['wall'], [[0, 0, 'candle-stand'], [1, 0, 'sack-pile'], [3, 0, 'sack-pile'], [4, 0, 'candle-stand']], { decals: [{ kind: 'runner', rect: { x: 2, y: 0, width: 1, height: 2 } }], symmetric: true }),
];
