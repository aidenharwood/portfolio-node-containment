import { prefab, row, type Prefab } from './types.ts';

export const CIVIC_PREFABS: readonly Prefab[] = [
  prefab('bench-planters', ['civic'], ['island', 'edge'], [[0, 0, 'planter'], [1, 0, 'briefing-bench'], [2, 0, 'briefing-bench'], [3, 0, 'planter']]),
  prefab('seating-row', ['civic'], ['island'], [[0, 0, 'potted-fern'], ...row('briefing-bench', 3, 0, undefined, 1), [4, 0, 'trash-bin']]),
  prefab('waiting-area', ['civic'], ['island'], [...row('briefing-bench', 3), ...row('briefing-bench', 3, 2), [3, 1, 'potted-fern']]),
  prefab('fern-bench', ['civic'], ['island', 'edge'], [[0, 0, 'potted-fern'], [1, 0, 'briefing-bench'], [2, 0, 'potted-fern']]),
  prefab('refreshments', ['civic', 'canteen'], ['wall', 'bay'], [[0, 0, 'vending-machine'], [1, 0, 'vending-machine'], [2, 0, 'water-cooler'], [3, 0, 'trash-bin']]),
  prefab('cooler-corner', ['civic', 'office', 'canteen', 'medical'], ['wall', 'bay'], [[0, 0, 'water-cooler'], [1, 0, 'trash-bin'], [2, 0, 'potted-fern']]),
  prefab('shuttered-kiosk', ['civic', 'works'], ['wall', 'bay'], [[0, 0, 'shuttered-kiosk'], [1, 0, 'shuttered-kiosk'], [2, 0, 'trash-bin']]),
  prefab('civic-corner', ['civic'], ['corner'], [[0, 0, 'planter']]),
  prefab('fountain-court', ['civic'], ['focal'], [[3, 3, 'fountain-grand'], [4, 0, 'bench-curve'], [4, 10, 'bench-curve', 'north'], [0, 4, 'bench-curve', 'east'], [10, 4, 'bench-curve', 'west']], { decals: [{ kind: 'mosaic', pattern: 'compass', rect: { x: 0, y: 0, width: 11, height: 11 } }], symmetric: true }),
  prefab('statue-court', ['civic'], ['focal'], [[0, 0, 'planter'], [5, 0, 'planter'], [2, 2, 'monument-statue'], [0, 5, 'planter'], [5, 5, 'planter']], { decals: [{ kind: 'inlay', pattern: 'border', rect: { x: 0, y: 0, width: 6, height: 6 } }], symmetric: true }),
  prefab('checkpoint', ['civic', 'works'], ['focal'], [[0, 0, 'guard-booth'], ...row('ticket-barrier', 4, 1, undefined, 2), [6, 0, 'guard-booth']], { decals: [{ kind: 'hazard-paint', pattern: 'stripe', rect: { x: 0, y: 2, width: 8, height: 1 } }], symmetric: true }),
  prefab('fountain-corner', ['civic'], ['island'], [[0, 0, 'fountain-basin'], [4, 0, 'bench-curve', 'west'], [0, 4, 'bench-curve', 'north']], { decals: [{ kind: 'rug', rect: { x: 0, y: 3, width: 5, height: 2 } }] }),
  prefab('kiosk-island', ['civic'], ['island'], [[0, 0, 'glass-kiosk'], [0, 3, 'briefing-bench', 'north'], [1, 3, 'trash-bin'], [2, 3, 'briefing-bench', 'north']]),
  prefab('bench-ring', ['civic'], ['island'], [[1, 0, 'bench-curve'], [0, 1, 'bench-curve', 'east'], [2, 2, 'planter'], [4, 1, 'bench-curve', 'west'], [1, 4, 'bench-curve', 'north']], { symmetric: true }),
  prefab('info-stand', ['civic'], ['island'], [[0, 0, 'potted-fern'], [1, 0, 'directory-pylon'], [2, 0, 'potted-fern']]),
  prefab('banner-pair', ['civic'], ['edge'], [[0, 0, 'banner-mast'], [4, 0, 'banner-mast']], { symmetric: true }),
  prefab('pylon-bench', ['civic'], ['edge'], [[0, 0, 'directory-pylon'], [1, 0, 'briefing-bench'], [2, 0, 'planter']]),
];
