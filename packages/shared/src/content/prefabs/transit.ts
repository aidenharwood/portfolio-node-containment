import { prefab, row, type Prefab } from './types.ts';

export const TRANSIT_PREFABS: readonly Prefab[] = [
  prefab('crates', ['mine', 'camp', 'cold'], ['island'], [[0, 0, 'crate-stack'], [1, 0, 'crate-stack'], [0, 1, 'packing-crate'], [1, 1, 'packing-crate']]),
  prefab('shelter-stop', [], ['bay'], [[0, 0, 'timetable-board'], [0, 1, 'transit-shelter'], [1, 1, 'briefing-bench'], [1, 2, 'briefing-bench']]),
  prefab('barrier-line', [], ['edge'], row('ticket-barrier', 5), { decals: [{ kind: 'hazard-paint', pattern: 'stripe', rect: { x: 0, y: 1, width: 5, height: 1 } }], symmetric: true }),
  prefab('timetable-wall', [], ['wall'], [[0, 0, 'timetable-board'], [3, 0, 'trash-bin']]),
];
