import type { ItemId } from '../ids.ts';
import { failure, success, type Result } from '../result.ts';
import { addItem, countItem, removeItem, type InventoryState, type ItemStack } from './inventory.ts';
import type { ItemCatalog } from './items.ts';

export const STORAGE_CAPACITY = 200;

export type StorageState = readonly ItemStack[];

export interface StorageTransfer {
  readonly inventory: InventoryState;
  readonly storage: StorageState;
  readonly moved: number;
}

export const storedCount = (storage: StorageState, itemId: ItemId): number => storage.find((stack) => stack.itemId === itemId)?.quantity ?? 0;

function addToStorage(storage: StorageState, itemId: ItemId, quantity: number): Result<StorageState> {
  const index = storage.findIndex((stack) => stack.itemId === itemId);
  if (index >= 0) return success(storage.map((stack, at) => (at === index ? { itemId, quantity: stack.quantity + quantity } : stack)));
  if (storage.length >= STORAGE_CAPACITY) return failure('Your storage is full.');
  return success([...storage, { itemId, quantity }]);
}

export function deposit(
  inventory: InventoryState,
  storage: StorageState,
  catalog: ItemCatalog,
  slotIndex: number,
  quantity: number,
): Result<StorageTransfer> {
  const stack = inventory[slotIndex];
  if (!stack) return failure('There is nothing in that slot.');
  const item = catalog.get(stack.itemId);
  if (!item || item.category === 'quest') return failure('That cannot go into storage.');
  const moved = Math.min(Math.max(1, Math.floor(quantity)), countItem(inventory, stack.itemId));
  const removed = removeItem(inventory, stack.itemId, moved);
  if (!removed.ok) return removed;
  const stored = addToStorage(storage, stack.itemId, moved);
  if (!stored.ok) return stored;
  return success({ inventory: removed.value, storage: stored.value, moved });
}

export function depositAll(inventory: InventoryState, storage: StorageState, catalog: ItemCatalog): StorageTransfer {
  let state: StorageTransfer = { inventory, storage, moved: 0 };
  for (let index = 0; index < inventory.length; index++) {
    if (!state.inventory[index]) continue;
    const next = deposit(state.inventory, state.storage, catalog, index, Number.MAX_SAFE_INTEGER);
    if (next.ok) state = { ...next.value, moved: state.moved + next.value.moved };
  }
  return state;
}

export function withdraw(
  inventory: InventoryState,
  storage: StorageState,
  catalog: ItemCatalog,
  itemId: ItemId,
  quantity: number,
): Result<StorageTransfer> {
  const available = storedCount(storage, itemId);
  if (available === 0) return failure('You have none of that in storage.');
  const wanted = Math.min(Math.max(1, Math.floor(quantity)), available);
  const added = addItem(inventory, catalog, itemId, wanted);
  if (added.added === 0) return failure('Your inventory is full.');
  const remaining = available - added.added;
  const nextStorage = remaining > 0
    ? storage.map((stack) => (stack.itemId === itemId ? { itemId, quantity: remaining } : stack))
    : storage.filter((stack) => stack.itemId !== itemId);
  return success({ inventory: added.inventory, storage: nextStorage, moved: added.added });
}
