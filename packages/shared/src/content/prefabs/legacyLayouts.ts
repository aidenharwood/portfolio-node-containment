import type { DressingTheme } from './types.ts';

export interface LegacyLayout {
  readonly field: readonly string[];
  readonly wall: readonly string[];
  readonly corner: string;
}

export const LEGACY_LAYOUTS: Readonly<Record<DressingTheme, LegacyLayout>> = {
  civic: { field: ['bench-planters', 'waiting-area', 'fern-bench', 'seating-row'], wall: ['refreshments', 'cooler-corner', 'shuttered-kiosk'], corner: 'civic-corner' },
  office: { field: ['desk-island', 'desk-pair', 'monitor-desk'], wall: ['cabinet-row', 'desk-cabinet', 'cooler-corner'], corner: 'office-corner' },
  canteen: { field: ['long-table', 'table-set'], wall: ['refreshments', 'cooler-corner'], corner: 'canteen-corner' },
  dormitory: { field: ['bunk-block'], wall: ['bunk-row', 'bunk-pair'], corner: 'dormitory-corner' },
  industrial: { field: ['generator-bay', 'barrels', 'lamp-cart'], wall: ['workshop-bay', 'gas-rack', 'shelving', 'tool-bench'], corner: 'industrial-corner' },
  freight: { field: ['container-block', 'container-pair', 'pallets', 'shelving-aisle'], wall: ['shelving', 'gas-rack'], corner: 'freight-corner' },
  medical: { field: ['gurney-row', 'gurney-screen'], wall: ['wheelchairs', 'cabinet-row', 'specimen-pair', 'cooler-corner'], corner: 'medical-corner' },
  lab: { field: ['monitor-desk', 'desk-island'], wall: ['specimen-row', 'specimen-pair', 'monitor-wall', 'server-row'], corner: 'lab-corner' },
  garden: { field: ['planter-beds', 'planter-row'], wall: ['potting-bench', 'sacks'], corner: 'garden-corner' },
  wet: { field: ['pump-kit', 'barrels', 'sandbag-row'], wall: ['gas-rack', 'shelving'], corner: 'wet-corner' },
  mine: { field: ['mine-carts', 'salt-sacks', 'crates'], wall: ['shelving', 'gas-rack'], corner: 'mine-corner' },
  chapel: { field: ['pew-rows', 'pews'], wall: ['candles'], corner: 'chapel-corner' },
  ward: { field: ['gurney-screen'], wall: ['ward-beds', 'wheelchairs'], corner: 'ward-corner' },
  archive: { field: ['shelving-aisle', 'ledger-trolleys'], wall: ['cabinet-row', 'sorting-cases', 'server-row'], corner: 'archive-corner' },
  post: { field: ['mail-carts', 'ledger-trolleys'], wall: ['sorting-cases'], corner: 'post-corner' },
  camp: { field: ['table-set', 'crates', 'sandbag-row'], wall: ['gas-rack', 'tool-bench', 'shelving'], corner: 'camp-corner' },
  cold: { field: ['crates', 'barrels'], wall: ['gas-rack', 'monitor-wall', 'specimen-pair', 'shelving'], corner: 'cold-corner' },
  works: { field: ['works-barrier', 'reserved-plot', 'cones'], wall: ['shuttered-kiosk'], corner: 'works-corner' },
};
