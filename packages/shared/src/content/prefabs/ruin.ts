import { prefab, row, type Prefab } from './types.ts';

export const RUIN_PREFABS: readonly Prefab[] = [
  prefab('barricade-line', ['island', 'edge'], row('barricade', 4)),
  prefab('rubble', ['island', 'edge'], [[0, 0, 'collapsed-slab'], [3, 0, 'debris-pile'], [3, 1, 'debris-pile']]),
  prefab('debris', ['island', 'edge'], row('debris-pile', 2)),
];
