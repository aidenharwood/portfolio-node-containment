import type { ItemId } from '../ids.ts';

export interface ItemGrant {
  readonly itemId: ItemId;
  readonly count: number;
}

export interface StartingKit {
  readonly equipment: readonly ItemId[];
  readonly items: readonly ItemGrant[];
}
