import { prefab, row, type Prefab } from './types.ts';

export const RITUAL_PREFABS: readonly Prefab[] = [
  prefab('pews', ['island', 'edge'], row('pew', 4), { rows: true }),
  prefab('pew-rows', ['island'], [...row('pew', 4), ...row('pew', 4, 2), ...row('pew', 4, 4)], { rows: true }),
  prefab('candles', ['wall', 'bay'], [[0, 0, 'candle-stand'], [2, 0, 'candle-stand']], { rows: true }),
  prefab('salt-offerings', ['island', 'edge'], [[0, 0, 'sack-pile'], [1, 0, 'floor-lamp'], [2, 0, 'sack-pile']]),
  prefab('salt-shrine', ['wall'], [[0, 0, 'candle-stand'], [1, 0, 'sack-pile'], [3, 0, 'sack-pile'], [4, 0, 'candle-stand']], { rows: true, decals: [{ kind: 'runner', rect: { x: 2, y: 0, width: 1, height: 2 } }] }),
];
