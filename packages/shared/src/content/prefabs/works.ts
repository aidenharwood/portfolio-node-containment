import { prefab, row, type Prefab } from './types.ts';

export const WORKS_PREFABS: readonly Prefab[] = [
  prefab('cones', ['island', 'edge'], row('traffic-cone', 3)),
  prefab('works-barrier', ['island'], [...row('works-barrier', 4), [0, 1, 'traffic-cone'], [3, 1, 'survey-stake']]),
  prefab('reserved-plot', ['island', 'edge'], [[0, 0, 'reserved-plot'], [1, 0, 'reserved-plot'], [2, 0, 'survey-stake']]),
];
