import { prefab, row, type Prefab } from './types.ts';

export const INDUSTRIAL_PREFABS: readonly Prefab[] = [
  prefab('generator-bay', ['island'], [[0, 0, 'generator'], [1, 0, 'generator'], [2, 0, 'cable-spool'], [0, 1, 'cable-run', 'east'], [1, 1, 'cable-run-end', 'east']]),
  prefab('gas-rack', ['wall', 'bay'], [[0, 0, 'gas-cylinders'], [1, 0, 'gas-cylinders'], [2, 0, 'barrel']]),
  prefab('workshop-bay', ['wall', 'bay'], [[0, 0, 'workbench'], [1, 0, 'workbench'], [2, 0, 'tool-cart'], [3, 0, 'gas-cylinders'], [0, 1, 'stool'], [1, 1, 'stool']]),
  prefab('tool-bench', ['wall', 'bay'], [[0, 0, 'workbench'], [1, 0, 'tool-cart'], [0, 1, 'stool']]),
  prefab('shelving', ['wall', 'bay'], row('storage-rack', 3)),
  prefab('barrels', ['island'], [[0, 0, 'barrel'], [1, 0, 'barrel'], [0, 1, 'barrel'], [1, 1, 'barrel']]),
  prefab('lamp-cart', ['island', 'edge'], [[0, 0, 'floor-lamp'], [1, 0, 'tool-cart'], [2, 0, 'cable-spool']]),
  prefab('press-cell', ['focal'], [[4, 0, 'workbench'], [1, 1, 'hydraulic-press'], [0, 4, 'tool-cart']], { decals: [{ kind: 'hazard-paint', pattern: 'border', rect: { x: 0, y: 0, width: 5, height: 5 } }] }),
];
