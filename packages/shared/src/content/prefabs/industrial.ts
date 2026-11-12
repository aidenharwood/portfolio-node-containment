import { prefab, row, type Prefab } from './types.ts';

export const INDUSTRIAL_PREFABS: readonly Prefab[] = [
  prefab('generator-bay', ['industrial'], ['island'], [[0, 0, 'generator'], [1, 0, 'generator'], [2, 0, 'cable-spool'], [0, 1, 'cable-run', 'east'], [1, 1, 'cable-run-end', 'east']]),
  prefab('gas-rack', ['industrial', 'freight', 'wet', 'mine', 'camp', 'cold'], ['wall', 'bay'], [[0, 0, 'gas-cylinders'], [1, 0, 'gas-cylinders'], [2, 0, 'barrel']]),
  prefab('workshop-bay', ['industrial'], ['wall', 'bay'], [[0, 0, 'workbench'], [1, 0, 'workbench'], [2, 0, 'tool-cart'], [3, 0, 'gas-cylinders'], [0, 1, 'stool'], [1, 1, 'stool']]),
  prefab('tool-bench', ['industrial', 'camp'], ['wall', 'bay'], [[0, 0, 'workbench'], [1, 0, 'tool-cart'], [0, 1, 'stool']]),
  prefab('shelving', ['industrial', 'freight', 'wet', 'mine', 'camp', 'cold'], ['wall', 'bay'], row('storage-rack', 3)),
  prefab('barrels', ['industrial', 'wet', 'cold'], ['island'], [[0, 0, 'barrel'], [1, 0, 'barrel'], [0, 1, 'barrel'], [1, 1, 'barrel']]),
  prefab('lamp-cart', ['industrial'], ['island', 'edge'], [[0, 0, 'floor-lamp'], [1, 0, 'tool-cart'], [2, 0, 'cable-spool']]),
  prefab('industrial-corner', ['industrial'], ['corner'], [[0, 0, 'barrel']]),
];
