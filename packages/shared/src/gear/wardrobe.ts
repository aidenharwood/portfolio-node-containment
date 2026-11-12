import type { ItemId } from '../ids.ts';
import { failure, success, type Result } from '../result.ts';
import { equippedItemIds, type EquipmentState } from './equipment.ts';
import { addItem, isSlotIndex, type InventoryState } from './inventory.ts';
import type { ItemCatalog, ItemDefinition } from './items.ts';
import { EQUIPMENT_SLOTS, isWardrobeSlot, type EquipmentSlot, type WardrobeSlot } from './slots.ts';

export type WardrobeState = Readonly<Partial<Record<WardrobeSlot, ItemId>>>;

export interface Dressing {
  readonly inventory: InventoryState;
  readonly wardrobe: WardrobeState;
}

export function wearCosmetic(dressing: Dressing, slotIndex: number, catalog: ItemCatalog): Result<Dressing & { readonly worn: ItemDefinition }> {
  if (!isSlotIndex(slotIndex)) return failure('That inventory slot does not exist.');
  const stack = dressing.inventory[slotIndex];
  if (!stack) return failure('There is nothing in that slot.');
  const item = catalog.get(stack.itemId);
  const slot = item?.cosmetic?.slot;
  if (!item || !slot || !isWardrobeSlot(slot)) return failure('You cannot wear that.');

  const inventory = [...dressing.inventory];
  const previous = dressing.wardrobe[slot];
  inventory[slotIndex] = stack.quantity > 1 ? { itemId: stack.itemId, quantity: stack.quantity - 1 } : null;
  if (previous) {
    if (inventory[slotIndex] === null) inventory[slotIndex] = { itemId: previous, quantity: 1 };
    else {
      const outcome = addItem(inventory, catalog, previous, 1);
      if (outcome.overflow > 0) return failure('Your inventory is too full to change outfits.');
      return success({ inventory: outcome.inventory, wardrobe: { ...dressing.wardrobe, [slot]: item.id }, worn: item });
    }
  }
  return success({ inventory, wardrobe: { ...dressing.wardrobe, [slot]: item.id }, worn: item });
}

export function removeCosmetic(dressing: Dressing, slot: WardrobeSlot, catalog: ItemCatalog): Result<Dressing> {
  const itemId = dressing.wardrobe[slot];
  if (!itemId) return failure('Nothing is worn over that slot.');
  const outcome = addItem(dressing.inventory, catalog, itemId, 1);
  if (outcome.overflow > 0) return failure('Your inventory has no room for that.');
  const wardrobe = { ...dressing.wardrobe };
  delete wardrobe[slot];
  return success({ inventory: outcome.inventory, wardrobe });
}

export function appearanceItemIds(equipment: EquipmentState, wardrobe: WardrobeState): ItemId[] {
  if (Object.keys(wardrobe).length === 0) return equippedItemIds(equipment);
  return EQUIPMENT_SLOTS.flatMap((slot: EquipmentSlot) => {
    const shown = (isWardrobeSlot(slot) ? wardrobe[slot] : undefined) ?? equipment[slot];
    return shown ? [shown] : [];
  });
}
