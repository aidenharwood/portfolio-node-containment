import { INVENTORY_CAPACITY } from '@containment/shared';
import { gridFit } from '../fitLayout.ts';
import type { FitSpace } from '../sidePanel.ts';

export const INVENTORY_GAP = 4;
export const INVENTORY_MAX_SLOT = 64;
const TALL_PREFERENCE = 1.15;

const slotSize = (space: FitSpace, columns: number): number => {
  const fit = gridFit(space, INVENTORY_CAPACITY, columns, INVENTORY_GAP, INVENTORY_MAX_SLOT);
  return Math.min(fit.cellWidth, fit.cellHeight);
};

export function inventoryColumns(space: FitSpace): number {
  return slotSize(space, 4) > slotSize(space, 7) * TALL_PREFERENCE ? 4 : 7;
}
