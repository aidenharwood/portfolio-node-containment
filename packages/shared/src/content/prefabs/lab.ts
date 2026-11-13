import { prefab, row, type Prefab } from './types.ts';

export const LAB_PREFABS: readonly Prefab[] = [
  prefab('monitor-wall', ['wall', 'bay'], [...row('monitor-bank', 3), [1, 1, 'office-chair', 'north']]),
  prefab('server-row', ['wall', 'bay'], row('server-rack', 3)),
  prefab('specimen-row', ['wall', 'bay'], [...row('specimen-tank', 3), [1, 1, 'monitor-bank']]),
];
