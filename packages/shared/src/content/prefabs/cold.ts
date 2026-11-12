import { prefab, type Prefab } from './types.ts';

export const COLD_PREFABS: readonly Prefab[] = [
  prefab('cold-stores', ['cold'], ['focal'], [[0, 0, 'crate-stack'], [1, 0, 'gas-cylinders'], [2, 0, 'crate-stack'], [0, 1, 'barrel'], [1, 1, 'floor-lamp'], [2, 1, 'barrel']]),
  prefab('cold-corner', ['cold'], ['corner'], [[0, 0, 'gas-cylinders']]),
];
