import { prefab, row, type Prefab } from './types.ts';

export const CIVIC_PREFABS: readonly Prefab[] = [
  prefab('bench-planters', ['island', 'edge'], [[0, 0, 'planter'], [1, 0, 'briefing-bench'], [2, 0, 'briefing-bench'], [3, 0, 'planter']]),
  prefab('seating-row', ['island'], [[0, 0, 'potted-fern'], ...row('briefing-bench', 3, 0, undefined, 1), [4, 0, 'trash-bin']]),
  prefab('waiting-area', ['island'], [...row('briefing-bench', 3), ...row('briefing-bench', 3, 2), [3, 1, 'potted-fern']]),
  prefab('fern-bench', ['island', 'edge'], [[0, 0, 'potted-fern'], [1, 0, 'briefing-bench'], [2, 0, 'potted-fern']]),
  prefab('refreshments', ['wall', 'bay'], [[0, 0, 'vending-machine'], [1, 0, 'vending-machine'], [2, 0, 'water-cooler'], [3, 0, 'trash-bin']]),
  prefab('shuttered-kiosk', ['wall', 'bay'], [[0, 0, 'shuttered-kiosk'], [1, 0, 'shuttered-kiosk'], [2, 0, 'trash-bin']]),
  prefab('statue-court', ['focal'], [[0, 0, 'planter'], [5, 0, 'planter'], [2, 2, 'monument-statue'], [0, 5, 'planter'], [5, 5, 'planter']], { decals: [{ kind: 'inlay', pattern: 'border', rect: { x: 0, y: 0, width: 6, height: 6 } }] }),
  prefab('checkpoint', ['focal'], [[0, 0, 'guard-booth'], ...row('ticket-barrier', 4, 1, undefined, 2), [6, 0, 'guard-booth']], { decals: [{ kind: 'hazard-paint', pattern: 'stripe', rect: { x: 0, y: 2, width: 8, height: 1 } }] }),
  prefab('kiosk-island', ['island'], [[0, 0, 'glass-kiosk'], [0, 3, 'briefing-bench', 'north'], [1, 3, 'trash-bin'], [2, 3, 'briefing-bench', 'north']]),
  prefab('core-ring', ['focal'], [[4, 0, 'bench-curve'], [4, 10, 'bench-curve', 'north'], [0, 4, 'bench-curve', 'east'], [10, 4, 'bench-curve', 'west']]),
  prefab('info-stand', ['island'], [[0, 0, 'potted-fern'], [1, 0, 'directory-pylon'], [2, 0, 'potted-fern']]),
  prefab('banner-pair', ['edge'], [[0, 0, 'banner-mast'], [4, 0, 'banner-mast']]),
  prefab('pylon-bench', ['edge'], [[0, 0, 'directory-pylon'], [1, 0, 'briefing-bench'], [2, 0, 'planter']]),
];
