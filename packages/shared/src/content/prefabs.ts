import type { WorldObjectId } from '../ids.ts';
import type { Facing } from '../world/geometry.ts';

export interface PrefabPiece {
  readonly dx: number;
  readonly dy: number;
  readonly objectId: WorldObjectId;
  readonly facing?: Facing;
}

export type PrefabPlacement = 'floor' | 'wall';

export interface Prefab {
  readonly id: string;
  readonly placement: PrefabPlacement;
  readonly pieces: readonly PrefabPiece[];
}

type PieceSpec = readonly [dx: number, dy: number, objectId: WorldObjectId, facing?: Facing];

const prefab = (id: string, pieces: readonly PieceSpec[], placement: PrefabPlacement = 'floor'): Prefab => ({
  id,
  placement,
  pieces: pieces.map(([dx, dy, objectId, facing]) => (facing ? { dx, dy, objectId, facing } : { dx, dy, objectId })),
});

const row = (objectId: WorldObjectId, length: number, dy = 0, facing?: Facing, dx = 0): PieceSpec[] =>
  Array.from({ length }, (_, index): PieceSpec => (facing ? [dx + index, dy, objectId, facing] : [dx + index, dy, objectId]));

export const PREFABS = {
  benchPlanters: prefab('bench-planters', [[0, 0, 'planter'], [1, 0, 'briefing-bench'], [2, 0, 'briefing-bench'], [3, 0, 'planter']]),
  seatingRow: prefab('seating-row', [[0, 0, 'potted-fern'], ...row('briefing-bench', 3, 0, undefined, 1), [4, 0, 'trash-bin']]),
  waitingArea: prefab('waiting-area', [...row('briefing-bench', 3), ...row('briefing-bench', 3, 2), [3, 1, 'potted-fern']]),
  fernBench: prefab('fern-bench', [[0, 0, 'potted-fern'], [1, 0, 'briefing-bench'], [2, 0, 'potted-fern']]),
  refreshments: prefab('refreshments', [[0, 0, 'vending-machine'], [1, 0, 'vending-machine'], [2, 0, 'water-cooler'], [3, 0, 'trash-bin']], 'wall'),
  planterRow: prefab('planter-row', [[0, 0, 'planter'], [1, 0, 'potted-fern'], [2, 0, 'planter'], [3, 0, 'potted-fern'], [4, 0, 'planter']]),
  deskPair: prefab('desk-pair', [...row('office-desk', 2), ...row('office-chair', 2, 1, 'north')]),
  deskIsland: prefab('desk-island', [...row('office-chair', 3, 0), ...row('office-desk', 3, 1, 'north'), ...row('office-desk', 3, 2), ...row('office-chair', 3, 3, 'north')]),
  deskCabinet: prefab('desk-cabinet', [[0, 0, 'filing-cabinet'], [1, 0, 'office-desk'], [2, 0, 'office-desk'], [1, 1, 'office-chair', 'north'], [2, 1, 'office-chair', 'north']], 'wall'),
  monitorDesk: prefab('monitor-desk', [...row('monitor-bank', 2), ...row('office-chair', 2, 1, 'north')]),
  monitorWall: prefab('monitor-wall', [...row('monitor-bank', 3), [1, 1, 'office-chair', 'north']], 'wall'),
  cabinetRow: prefab('cabinet-row', [...row('filing-cabinet', 3), [3, 0, 'potted-fern']], 'wall'),
  coolerCorner: prefab('cooler-corner', [[0, 0, 'water-cooler'], [1, 0, 'trash-bin'], [2, 0, 'potted-fern']], 'wall'),
  ledgerTrolleys: prefab('ledger-trolleys', [[0, 0, 'book-trolley'], [1, 0, 'book-trolley']]),
  serverRow: prefab('server-row', row('server-rack', 3), 'wall'),
  tableSet: prefab('table-set', [[1, 1, 'canteen-table'], [0, 1, 'stool'], [2, 1, 'stool'], [1, 0, 'stool'], [1, 2, 'stool']]),
  longTable: prefab('long-table', [...row('stool', 4, 0), ...row('canteen-table', 4, 1), ...row('stool', 4, 2)]),
  bunkRow: prefab('bunk-row', [...row('bunk-bed', 3), ...row('packing-crate', 3, 1)], 'wall'),
  bunkBlock: prefab('bunk-block', [...row('packing-crate', 3, 0), ...row('bunk-bed', 3, 1, 'north'), ...row('bunk-bed', 3, 2), ...row('packing-crate', 3, 3)]),
  bunkPair: prefab('bunk-pair', [[0, 0, 'bunk-bed'], [1, 0, 'storage-rack'], [2, 0, 'bunk-bed'], [0, 1, 'packing-crate'], [2, 1, 'packing-crate']], 'wall'),
  generatorBay: prefab('generator-bay', [[0, 0, 'generator'], [1, 0, 'generator'], [2, 0, 'cable-spool'], [0, 1, 'cable-run', 'east'], [1, 1, 'cable-run-end', 'east']]),
  gasRack: prefab('gas-rack', [[0, 0, 'gas-cylinders'], [1, 0, 'gas-cylinders'], [2, 0, 'barrel']], 'wall'),
  workshopBay: prefab('workshop-bay', [[0, 0, 'workbench'], [1, 0, 'workbench'], [2, 0, 'tool-cart'], [3, 0, 'gas-cylinders'], [0, 1, 'stool'], [1, 1, 'stool']], 'wall'),
  toolBench: prefab('tool-bench', [[0, 0, 'workbench'], [1, 0, 'tool-cart'], [0, 1, 'stool']], 'wall'),
  shelving: prefab('shelving', row('storage-rack', 3), 'wall'),
  shelvingAisle: prefab('shelving-aisle', [...row('storage-rack', 4), ...row('storage-rack', 4, 2)]),
  barrels: prefab('barrels', [[0, 0, 'barrel'], [1, 0, 'barrel'], [0, 1, 'barrel'], [1, 1, 'barrel']]),
  lampCart: prefab('lamp-cart', [[0, 0, 'floor-lamp'], [1, 0, 'tool-cart'], [2, 0, 'cable-spool']]),
  pallets: prefab('pallets', [...row('pallet-stack', 3), [0, 1, 'crate-stack']]),
  crates: prefab('crates', [[0, 0, 'crate-stack'], [1, 0, 'crate-stack'], [0, 1, 'packing-crate'], [1, 1, 'packing-crate']]),
  containerBlock: prefab('container-block', [[0, 0, 'cargo-container'], [1, 0, 'cargo-container'], [0, 1, 'cargo-container'], [1, 1, 'cargo-container'], [2, 1, 'traffic-cone']]),
  containerPair: prefab('container-pair', [[0, 0, 'cargo-container'], [1, 0, 'cargo-container'], [2, 0, 'pallet-stack']]),
  cones: prefab('cones', row('traffic-cone', 3)),
  gurneyRow: prefab('gurney-row', [[0, 0, 'gurney'], [1, 0, 'screen-partition', 'east'], [2, 0, 'gurney'], [3, 0, 'screen-partition', 'east'], [4, 0, 'gurney']]),
  gurneyScreen: prefab('gurney-screen', [[0, 0, 'screen-partition', 'east'], [1, 0, 'gurney'], [2, 0, 'wheelchair', 'west']]),
  wheelchairs: prefab('wheelchairs', [[0, 0, 'wheelchair'], [1, 0, 'wheelchair'], [2, 0, 'potted-fern']], 'wall'),
  specimenRow: prefab('specimen-row', [...row('specimen-tank', 3), [1, 1, 'monitor-bank']], 'wall'),
  specimenPair: prefab('specimen-pair', row('specimen-tank', 2), 'wall'),
  ferns: prefab('ferns', [[0, 0, 'potted-fern'], [1, 0, 'potted-fern'], [0, 1, 'potted-fern']]),
  planterBeds: prefab('planter-beds', [...row('planter', 3), ...row('planter', 3, 2)]),
  pottingBench: prefab('potting-bench', [[0, 0, 'workbench'], [1, 0, 'sack-pile'], [2, 0, 'potted-fern'], [0, 1, 'stool']], 'wall'),
  sacks: prefab('sacks', [[0, 0, 'sack-pile'], [1, 0, 'sack-pile'], [2, 0, 'barrel']], 'wall'),
  sandbagRow: prefab('sandbag-row', row('sandbags', 4)),
  pumpKit: prefab('pump-kit', [[0, 0, 'generator'], [1, 0, 'barrel'], [2, 0, 'barrel'], [0, 1, 'mop-bucket']]),
  mineCarts: prefab('mine-carts', [[0, 0, 'mine-cart'], [1, 0, 'mine-cart'], [2, 0, 'sack-pile']]),
  saltSacks: prefab('salt-sacks', [[0, 0, 'sack-pile'], [1, 0, 'sack-pile'], [0, 1, 'sack-pile'], [2, 0, 'floor-lamp']]),
  pews: prefab('pews', row('pew', 4)),
  pewRows: prefab('pew-rows', [...row('pew', 4), ...row('pew', 4, 2), ...row('pew', 4, 4)]),
  candles: prefab('candles', [[0, 0, 'candle-stand'], [2, 0, 'candle-stand']], 'wall'),
  wardBeds: prefab('ward-beds', [[0, 0, 'gurney'], [1, 0, 'screen-partition', 'east'], [2, 0, 'gurney'], [3, 0, 'screen-partition', 'east'], [4, 0, 'gurney']], 'wall'),
  sortingCases: prefab('sorting-cases', [...row('sorting-case', 4), [0, 1, 'mail-sacks'], [2, 1, 'mail-sacks']], 'wall'),
  mailCarts: prefab('mail-carts', [[0, 0, 'book-trolley'], [1, 0, 'mail-sacks'], [2, 0, 'book-trolley']]),
  worksBarrier: prefab('works-barrier', [...row('works-barrier', 4), [0, 1, 'traffic-cone'], [3, 1, 'survey-stake']]),
  reservedPlot: prefab('reserved-plot', [[0, 0, 'reserved-plot'], [1, 0, 'reserved-plot'], [2, 0, 'survey-stake']]),
  shutteredKiosk: prefab('shuttered-kiosk', [[0, 0, 'shuttered-kiosk'], [1, 0, 'shuttered-kiosk'], [2, 0, 'trash-bin']], 'wall'),
} as const satisfies Record<string, Prefab>;

export type PrefabName = keyof typeof PREFABS;

export const DRESSING_THEMES = [
  'civic',
  'office',
  'canteen',
  'dormitory',
  'industrial',
  'freight',
  'medical',
  'lab',
  'garden',
  'wet',
  'mine',
  'chapel',
  'ward',
  'archive',
  'post',
  'camp',
  'cold',
  'works',
] as const;

export type DressingTheme = (typeof DRESSING_THEMES)[number];

export interface ThemeLayout {
  readonly field: readonly PrefabName[];
  readonly wall: readonly PrefabName[];
  readonly corner?: WorldObjectId;
}

export const THEME_LAYOUTS: Readonly<Record<DressingTheme, ThemeLayout>> = {
  civic: { field: ['benchPlanters', 'waitingArea', 'fernBench', 'seatingRow'], wall: ['refreshments', 'coolerCorner', 'shutteredKiosk'], corner: 'planter' },
  office: { field: ['deskIsland', 'deskPair', 'monitorDesk'], wall: ['cabinetRow', 'deskCabinet', 'coolerCorner'], corner: 'potted-fern' },
  canteen: { field: ['longTable', 'tableSet'], wall: ['refreshments', 'coolerCorner'], corner: 'potted-fern' },
  dormitory: { field: ['bunkBlock'], wall: ['bunkRow', 'bunkPair'], corner: 'storage-rack' },
  industrial: { field: ['generatorBay', 'barrels', 'lampCart'], wall: ['workshopBay', 'gasRack', 'shelving', 'toolBench'], corner: 'barrel' },
  freight: { field: ['containerBlock', 'containerPair', 'pallets', 'shelvingAisle'], wall: ['shelving', 'gasRack'], corner: 'crate-stack' },
  medical: { field: ['gurneyRow', 'gurneyScreen'], wall: ['wheelchairs', 'cabinetRow', 'specimenPair', 'coolerCorner'], corner: 'potted-fern' },
  lab: { field: ['monitorDesk', 'deskIsland'], wall: ['specimenRow', 'specimenPair', 'monitorWall', 'serverRow'], corner: 'gas-cylinders' },
  garden: { field: ['planterBeds', 'planterRow'], wall: ['pottingBench', 'sacks'], corner: 'potted-fern' },
  wet: { field: ['pumpKit', 'barrels', 'sandbagRow'], wall: ['gasRack', 'shelving'], corner: 'barrel' },
  mine: { field: ['mineCarts', 'saltSacks', 'crates'], wall: ['shelving', 'gasRack'], corner: 'floor-lamp' },
  chapel: { field: ['pewRows', 'pews'], wall: ['candles'], corner: 'candle-stand' },
  ward: { field: ['gurneyScreen'], wall: ['wardBeds', 'wheelchairs'], corner: 'potted-fern' },
  archive: { field: ['shelvingAisle', 'ledgerTrolleys'], wall: ['cabinetRow', 'sortingCases', 'serverRow'], corner: 'potted-fern' },
  post: { field: ['mailCarts', 'ledgerTrolleys'], wall: ['sortingCases'], corner: 'mail-sacks' },
  camp: { field: ['tableSet', 'crates', 'sandbagRow'], wall: ['gasRack', 'toolBench', 'shelving'], corner: 'floor-lamp' },
  cold: { field: ['crates', 'barrels'], wall: ['gasRack', 'monitorWall', 'specimenPair', 'shelving'], corner: 'gas-cylinders' },
  works: { field: ['worksBarrier', 'reservedPlot', 'cones'], wall: ['shutteredKiosk'], corner: 'traffic-cone' },
};
