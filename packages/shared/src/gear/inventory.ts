import type { ItemId } from '../ids.ts';
import { failure, success, type Result } from '../result.ts';
import type { ItemCatalog } from './items.ts';

export const INVENTORY_CAPACITY = 28;

export interface ItemStack {
  readonly itemId: ItemId;
  readonly quantity: number;
}

export type InventorySlot = ItemStack | null;

export type InventoryState = readonly InventorySlot[];

export interface AddItemOutcome {
  readonly inventory: InventoryState;
  readonly added: number;
  readonly overflow: number;
}

export const createEmptyInventory = (): InventoryState => Array.from({ length: INVENTORY_CAPACITY }, () => null);

export const countItem = (inventory: InventoryState, itemId: ItemId): number =>
  inventory.reduce((total, slot) => total + (slot?.itemId === itemId ? slot.quantity : 0), 0);

export const freeSlotCount = (inventory: InventoryState): number => inventory.filter((slot) => slot === null).length;

export function addItem(
  inventory: InventoryState,
  catalog: ItemCatalog,
  itemId: ItemId,
  quantity: number,
): AddItemOutcome {
  const item = catalog.get(itemId);
  if (!item || quantity <= 0) return { inventory, added: 0, overflow: Math.max(0, quantity) };

  const slots = [...inventory];
  let remaining = quantity;

  for (let index = 0; index < slots.length && remaining > 0; index++) {
    const slot = slots[index];
    if (slot?.itemId !== itemId || slot.quantity >= item.maxStack) continue;
    const moved = Math.min(remaining, item.maxStack - slot.quantity);
    slots[index] = { itemId, quantity: slot.quantity + moved };
    remaining -= moved;
  }

  for (let index = 0; index < slots.length && remaining > 0; index++) {
    if (slots[index] !== null) continue;
    const moved = Math.min(remaining, item.maxStack);
    slots[index] = { itemId, quantity: moved };
    remaining -= moved;
  }

  return { inventory: slots, added: quantity - remaining, overflow: remaining };
}

export function removeItem(inventory: InventoryState, itemId: ItemId, quantity: number): Result<InventoryState> {
  if (countItem(inventory, itemId) < quantity) return failure('You do not have enough of that item.');
  const slots = [...inventory];
  let remaining = quantity;
  for (let index = slots.length - 1; index >= 0 && remaining > 0; index--) {
    const slot = slots[index];
    if (slot?.itemId !== itemId) continue;
    const taken = Math.min(remaining, slot.quantity);
    slots[index] = slot.quantity === taken ? null : { itemId, quantity: slot.quantity - taken };
    remaining -= taken;
  }
  return success(slots);
}

export function swapSlots(inventory: InventoryState, from: number, to: number): Result<InventoryState> {
  if (!isSlotIndex(from) || !isSlotIndex(to)) return failure('That inventory slot does not exist.');
  const slots = [...inventory];
  [slots[from], slots[to]] = [slots[to] ?? null, slots[from] ?? null];
  return success(slots);
}

export const isSlotIndex = (index: number): boolean =>
  Number.isInteger(index) && index >= 0 && index < INVENTORY_CAPACITY;
