import { prefab, type Prefab } from './types.ts';

export const CAMP_PREFABS: readonly Prefab[] = [
  prefab('camp-corner', ['camp'], ['corner'], [[0, 0, 'floor-lamp']]),
];
