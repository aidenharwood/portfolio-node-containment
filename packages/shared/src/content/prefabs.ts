import type { WorldObjectId } from '../ids.ts';
import type { Facing } from '../world/geometry.ts';

export interface PrefabPiece {
  readonly dx: number;
  readonly dy: number;
  readonly objectId: WorldObjectId;
  readonly facing?: Facing;
}

export interface Prefab {
  readonly id: string;
  readonly pieces: readonly PrefabPiece[];
}

type PieceSpec = readonly [dx: number, dy: number, objectId: WorldObjectId, facing?: Facing];

const prefab = (id: string, pieces: readonly PieceSpec[]): Prefab => ({
  id,
  pieces: pieces.map(([dx, dy, objectId, facing]) => (facing ? { dx, dy, objectId, facing } : { dx, dy, objectId })),
});

const row = (objectId: WorldObjectId, length: number, dy = 0, facing?: Facing): PieceSpec[] =>
  Array.from({ length }, (_, index): PieceSpec => (facing ? [index, dy, objectId, facing] : [index, dy, objectId]));

export const PREFABS = {
  benchPlanters: prefab('bench-planters', [[0, 0, 'planter'], [1, 0, 'briefing-bench'], [2, 0, 'briefing-bench'], [3, 0, 'planter']]),
  seatingRow: prefab('seating-row', row('briefing-bench', 4)),
  waitingArea: prefab('waiting-area', [...row('briefing-bench', 3, 0, 'south'), ...row('briefing-bench', 3, 2, 'north'), [3, 1, 'potted-fern']]),
  fernBench: prefab('fern-bench', [[0, 0, 'potted-fern'], [1, 0, 'briefing-bench'], [2, 0, 'potted-fern']]),
  refreshments: prefab('refreshments', [[0, 0, 'vending-machine'], [1, 0, 'vending-machine'], [2, 0, 'water-cooler'], [3, 0, 'trash-bin']]),
  planterRow: prefab('planter-row', [[0, 0, 'planter'], [1, 0, 'potted-fern'], [2, 0, 'planter'], [3, 0, 'potted-fern'], [4, 0, 'planter']]),
  lampFerns: prefab('lamp-ferns', [[0, 0, 'floor-lamp'], [1, 0, 'potted-fern'], [0, 1, 'potted-fern']]),
  binPair: prefab('bin-pair', [[0, 0, 'trash-bin'], [1, 0, 'trash-bin']]),
  deskPair: prefab('desk-pair', [[0, 0, 'office-desk'], [1, 0, 'office-desk'], [0, 1, 'office-chair'], [1, 1, 'office-chair']]),
  deskIsland: prefab('desk-island', [...row('office-desk', 3, 1, 'south'), ...row('office-chair', 3, 2), ...row('office-chair', 3, 0)]),
  deskFace: prefab('desk-face', [[0, 0, 'office-desk', 'south'], [1, 0, 'office-desk', 'south'], [0, 2, 'office-desk', 'north'], [1, 2, 'office-desk', 'north']]),
  monitorDesk: prefab('monitor-desk', [[0, 0, 'monitor-bank'], [1, 0, 'monitor-bank'], [0, 1, 'office-chair'], [1, 1, 'office-chair']]),
  cabinetRow: prefab('cabinet-row', [...row('filing-cabinet', 3), [3, 0, 'potted-fern']]),
  coolerCorner: prefab('cooler-corner', [[0, 0, 'water-cooler'], [1, 0, 'trash-bin'], [2, 0, 'potted-fern']]),
  ledgerTrolleys: prefab('ledger-trolleys', [[0, 0, 'book-trolley'], [1, 0, 'book-trolley']]),
  serverRow: prefab('server-row', [...row('server-rack', 3), [0, 1, 'office-chair']]),
  tableSet: prefab('table-set', [[1, 1, 'canteen-table'], [0, 1, 'stool'], [2, 1, 'stool'], [1, 0, 'stool'], [1, 2, 'stool']]),
  longTable: prefab('long-table', [...row('canteen-table', 4, 1), ...row('stool', 4, 0), ...row('stool', 4, 2)]),
  bunkRow: prefab('bunk-row', [...row('bunk-bed', 3), ...row('packing-crate', 3, 1)]),
  bunkPair: prefab('bunk-pair', [[0, 0, 'bunk-bed'], [1, 0, 'bunk-bed'], [2, 0, 'storage-rack'], [0, 1, 'stool']]),
  generatorBay: prefab('generator-bay', [[0, 0, 'generator'], [1, 0, 'generator'], [2, 0, 'cable-spool'], [0, 1, 'cable-run', 'east'], [1, 1, 'cable-run-end', 'east']]),
  gasRack: prefab('gas-rack', [[0, 0, 'gas-cylinders'], [1, 0, 'gas-cylinders'], [2, 0, 'barrel']]),
  workshopBay: prefab('workshop-bay', [[0, 0, 'workbench'], [1, 0, 'workbench'], [3, 0, 'tool-cart'], [0, 1, 'stool'], [1, 1, 'stool'], [3, 1, 'gas-cylinders']]),
  toolBench: prefab('tool-bench', [[0, 0, 'workbench'], [1, 0, 'tool-cart'], [0, 1, 'stool']]),
  shelving: prefab('shelving', row('storage-rack', 3)),
  shelvingAisle: prefab('shelving-aisle', [...row('storage-rack', 4), ...row('storage-rack', 4, 2)]),
  barrels: prefab('barrels', [[0, 0, 'barrel'], [1, 0, 'barrel'], [0, 1, 'barrel'], [1, 1, 'barrel']]),
  lampCart: prefab('lamp-cart', [[0, 0, 'floor-lamp'], [1, 0, 'tool-cart'], [2, 0, 'cable-spool']]),
  pallets: prefab('pallets', [...row('pallet-stack', 3), [0, 1, 'crate-stack']]),
  crates: prefab('crates', [[0, 0, 'crate-stack'], [1, 0, 'crate-stack'], [0, 1, 'packing-crate'], [1, 1, 'packing-crate']]),
  containerBlock: prefab('container-block', [[0, 0, 'cargo-container'], [1, 0, 'cargo-container'], [0, 1, 'cargo-container'], [1, 1, 'cargo-container'], [3, 1, 'traffic-cone']]),
  containerPair: prefab('container-pair', [[0, 0, 'cargo-container'], [1, 0, 'cargo-container'], [2, 0, 'pallet-stack']]),
  cones: prefab('cones', row('traffic-cone', 3)),
  gurneyRow: prefab('gurney-row', [[0, 0, 'gurney'], [1, 0, 'screen-partition'], [2, 0, 'gurney'], [3, 0, 'screen-partition'], [4, 0, 'gurney']]),
  gurneyScreen: prefab('gurney-screen', [[0, 0, 'screen-partition'], [1, 0, 'gurney'], [2, 0, 'wheelchair']]),
  wheelchairs: prefab('wheelchairs', [[0, 0, 'wheelchair'], [1, 0, 'wheelchair'], [2, 0, 'potted-fern']]),
  specimenRow: prefab('specimen-row', [...row('specimen-tank', 3), [0, 1, 'monitor-bank']]),
  specimenPair: prefab('specimen-pair', row('specimen-tank', 2)),
  ferns: prefab('ferns', [[0, 0, 'potted-fern'], [1, 0, 'potted-fern'], [0, 1, 'potted-fern']]),
  planterBeds: prefab('planter-beds', [...row('planter', 3), ...row('planter', 3, 2)]),
  sacks: prefab('sacks', [[0, 0, 'sack-pile'], [1, 0, 'sack-pile'], [2, 0, 'barrel']]),
  sandbagRow: prefab('sandbag-row', row('sandbags', 4)),
  pumpKit: prefab('pump-kit', [[0, 0, 'generator'], [1, 0, 'barrel'], [2, 0, 'barrel'], [0, 1, 'mop-bucket']]),
  mineCarts: prefab('mine-carts', [[0, 0, 'mine-cart'], [1, 0, 'mine-cart'], [2, 0, 'sack-pile']]),
  saltSacks: prefab('salt-sacks', [[0, 0, 'sack-pile'], [1, 0, 'sack-pile'], [0, 1, 'sack-pile'], [2, 0, 'floor-lamp']]),
  pews: prefab('pews', row('pew', 4)),
  pewRows: prefab('pew-rows', [...row('pew', 4), ...row('pew', 4, 2), ...row('pew', 4, 4)]),
  candles: prefab('candles', [[0, 0, 'candle-stand'], [2, 0, 'candle-stand']]),
  wardBeds: prefab('ward-beds', [[0, 0, 'bunk-bed'], [1, 0, 'screen-partition'], [2, 0, 'bunk-bed'], [3, 0, 'screen-partition'], [4, 0, 'bunk-bed']]),
  sortingCases: prefab('sorting-cases', [...row('sorting-case', 4), [0, 1, 'mail-sacks'], [2, 1, 'mail-sacks']]),
  mailCarts: prefab('mail-carts', [[0, 0, 'book-trolley'], [1, 0, 'mail-sacks'], [2, 0, 'book-trolley']]),
  worksBarrier: prefab('works-barrier', [...row('works-barrier', 4), [0, 1, 'traffic-cone'], [3, 1, 'survey-stake']]),
  reservedPlot: prefab('reserved-plot', [[0, 0, 'reserved-plot'], [1, 0, 'reserved-plot'], [2, 0, 'survey-stake']]),
  shutteredKiosk: prefab('shuttered-kiosk', [[0, 0, 'shuttered-kiosk'], [1, 0, 'shuttered-kiosk'], [2, 0, 'trash-bin']]),
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

export type WeightedPrefabs = readonly (readonly [prefab: PrefabName, weight: number])[];

const PLACEHOLDERS: WeightedPrefabs = [['worksBarrier', 1], ['reservedPlot', 1]];

export const THEME_PREFABS: Readonly<Record<DressingTheme, WeightedPrefabs>> = {
  civic: [['benchPlanters', 4], ['seatingRow', 3], ['waitingArea', 4], ['fernBench', 2], ['refreshments', 3], ['planterRow', 2], ['lampFerns', 2], ['binPair', 1], ['shutteredKiosk', 1], ...PLACEHOLDERS],
  office: [['deskPair', 4], ['deskIsland', 4], ['deskFace', 3], ['monitorDesk', 3], ['cabinetRow', 3], ['coolerCorner', 2], ['serverRow', 2], ['ledgerTrolleys', 1], ['reservedPlot', 1]],
  canteen: [['tableSet', 5], ['longTable', 6], ['refreshments', 2], ['binPair', 1], ['coolerCorner', 1]],
  dormitory: [['bunkRow', 6], ['bunkPair', 4], ['shelving', 1], ['coolerCorner', 1]],
  industrial: [['generatorBay', 3], ['gasRack', 3], ['workshopBay', 4], ['toolBench', 2], ['shelving', 3], ['barrels', 2], ['lampCart', 2], ...PLACEHOLDERS],
  freight: [['pallets', 4], ['crates', 4], ['containerBlock', 3], ['containerPair', 3], ['shelvingAisle', 2], ['barrels', 2], ['cones', 1], ...PLACEHOLDERS],
  medical: [['gurneyRow', 4], ['gurneyScreen', 3], ['wheelchairs', 2], ['specimenPair', 1], ['coolerCorner', 1], ['cabinetRow', 1]],
  lab: [['specimenRow', 4], ['specimenPair', 3], ['monitorDesk', 3], ['workshopBay', 2], ['gasRack', 2], ['serverRow', 2], ['deskIsland', 1], ['reservedPlot', 1]],
  garden: [['planterBeds', 4], ['planterRow', 3], ['ferns', 3], ['sacks', 3], ['lampCart', 1], ['barrels', 1], ['reservedPlot', 1]],
  wet: [['barrels', 3], ['sandbagRow', 3], ['generatorBay', 2], ['pumpKit', 3], ['gasRack', 1], ['lampCart', 1]],
  mine: [['mineCarts', 4], ['saltSacks', 4], ['lampCart', 2], ['sandbagRow', 2], ['barrels', 2], ['crates', 1], ['worksBarrier', 1]],
  chapel: [['pewRows', 5], ['pews', 4], ['candles', 3]],
  ward: [['wardBeds', 5], ['gurneyRow', 2], ['gurneyScreen', 2], ['wheelchairs', 3], ['candles', 1]],
  archive: [['sortingCases', 2], ['ledgerTrolleys', 3], ['cabinetRow', 4], ['shelvingAisle', 3], ['deskPair', 2], ['serverRow', 1]],
  post: [['sortingCases', 5], ['mailCarts', 4], ['ledgerTrolleys', 2], ['crates', 1]],
  camp: [['sandbagRow', 4], ['barrels', 2], ['crates', 3], ['lampCart', 2], ['sacks', 2], ['generatorBay', 2], ['tableSet', 2]],
  cold: [['crates', 4], ['gasRack', 3], ['monitorDesk', 2], ['specimenPair', 2], ['barrels', 2], ['shelving', 2]],
  works: [['worksBarrier', 4], ['reservedPlot', 3], ['cones', 2], ['shutteredKiosk', 1], ['lampCart', 1]],
};
