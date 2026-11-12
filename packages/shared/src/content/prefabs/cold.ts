import { prefab, type Prefab } from './types.ts';

export const COLD_PREFABS: readonly Prefab[] = [
  prefab('cold-corner', ['cold'], ['corner'], [[0, 0, 'gas-cylinders']]),
];
