import { clearanceFlag, CURRENCY_ITEM_ID, type CharacterRecord, type GameContent, type ItemStack, type MarketOrder } from '@containment/shared';

const RETIRED_SEAL = /^containment-seal-(\d+)$/;

const LIVE_FIRE = 'live-fire';

const CLEARANCE_STEP = 'clearance';

export function retiredSealRefund(itemId: string): number | null {
  const match = RETIRED_SEAL.exec(itemId);
  if (!match) return null;
  const tier = Number(match[1]);
  return Math.max(1, Math.floor((4 + tier * tier * 6) * 0.5));
}

function refundStacks<T extends ItemStack | null>(stacks: readonly T[]): { stacks: T[]; scrip: number } {
  let scrip = 0;
  const kept = stacks.map((stack) => {
    const refund = stack ? retiredSealRefund(stack.itemId) : null;
    if (!stack || refund === null) return stack;
    scrip += refund * stack.quantity;
    return null as T;
  });
  return { stacks: kept, scrip };
}

function depositScrip<T extends ItemStack | null>(stacks: T[], scrip: number, empty: T): T[] {
  if (scrip <= 0) return stacks;
  const index = stacks.findIndex((stack) => stack?.itemId === CURRENCY_ITEM_ID);
  if (index >= 0) {
    const current = stacks[index] as ItemStack;
    stacks[index] = { itemId: CURRENCY_ITEM_ID, quantity: current.quantity + scrip } as T;
    return stacks;
  }
  const free = stacks.indexOf(empty);
  if (free >= 0) stacks[free] = { itemId: CURRENCY_ITEM_ID, quantity: scrip } as T;
  else stacks.push({ itemId: CURRENCY_ITEM_ID, quantity: scrip } as T);
  return stacks;
}

function depositStoredScrip(stacks: readonly ItemStack[], scrip: number): ItemStack[] {
  const held = stacks.find((stack) => stack.itemId === CURRENCY_ITEM_ID)?.quantity ?? 0;
  return [...stacks.filter((stack) => stack.itemId !== CURRENCY_ITEM_ID), { itemId: CURRENCY_ITEM_ID, quantity: held + scrip }];
}

function earnedFirstClearance(record: CharacterRecord, content: GameContent): boolean {
  const progress = record.quests[LIVE_FIRE];
  if (!progress) return false;
  if (progress.status === 'completed') return true;
  const stepIndex = content.quests.get(LIVE_FIRE)?.steps.findIndex((step) => step.id === CLEARANCE_STEP) ?? -1;
  return stepIndex >= 0 && progress.stepIndex > stepIndex;
}

export function retireContainmentSeals(record: CharacterRecord, content: GameContent): CharacterRecord {
  const inventory = refundStacks(record.inventory);
  const storage = refundStacks(record.storage);
  const storedStacks = storage.stacks.filter((stack): stack is ItemStack => stack !== null);
  const flags = earnedFirstClearance(record, content) && !record.flags.includes(clearanceFlag(1)) ? [...record.flags, clearanceFlag(1)] : record.flags;
  if (inventory.scrip === 0 && storage.scrip === 0 && flags === record.flags) return record;
  return {
    ...record,
    flags,
    inventory: depositScrip(inventory.stacks, inventory.scrip, null),
    storage: storage.scrip > 0 ? depositStoredScrip(storedStacks, storage.scrip) : record.storage,
  };
}

export function retireSealOrder(order: MarketOrder): MarketOrder {
  const refund = retiredSealRefund(order.itemId);
  if (refund === null || (!order.open && order.uncollectedItems === 0)) return order;
  const outstanding = order.open ? order.quantity - order.filled : 0;
  const owed = order.side === 'sell' ? outstanding * refund : outstanding * order.price;
  return {
    ...order,
    open: false,
    uncollectedItems: 0,
    uncollectedScrip: order.uncollectedScrip + owed + order.uncollectedItems * refund,
  };
}
