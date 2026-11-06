import { levelForExperience, SKILL_IDS, SKILL_INFO, type SkillExperience } from '../character/skills.ts';
import type { ItemId } from '../ids.ts';
import { failure, success, type Result } from '../result.ts';
import { addItem, isSlotIndex, type InventoryState } from './inventory.ts';
import type { EquipRequirements, ItemCatalog, ItemDefinition } from './items.ts';
import { EQUIPMENT_SLOTS, type EquipmentSlot } from './slots.ts';
import { sumStats, type StatBlock, type StatId } from './stats.ts';

export type EquipmentState = Readonly<Partial<Record<EquipmentSlot, ItemId>>>;

export interface Loadout {
  readonly inventory: InventoryState;
  readonly equipment: EquipmentState;
}

export interface Wearer {
  readonly skills: SkillExperience;
}

export function unmetRequirements(requirements: EquipRequirements | undefined, wearer: Wearer): string[] {
  if (!requirements) return [];
  const unmet: string[] = [];
  for (const skill of SKILL_IDS) {
    const needed = requirements.skills?.[skill];
    if (needed !== undefined && levelForExperience(wearer.skills[skill]) < needed) {
      unmet.push(`${SKILL_INFO[skill].name} ${needed}`);
    }
  }
  return unmet;
}

export function equipFromInventory(
  loadout: Loadout,
  slotIndex: number,
  catalog: ItemCatalog,
  wearer: Wearer,
): Result<Loadout & { readonly equipped: ItemDefinition }> {
  if (!isSlotIndex(slotIndex)) return failure('That inventory slot does not exist.');
  const stack = loadout.inventory[slotIndex];
  if (!stack) return failure('There is nothing in that slot.');
  const item = catalog.get(stack.itemId);
  if (!item?.equipment) return failure('You cannot equip that.');

  const unmet = unmetRequirements(item.equipment.requirements, wearer);
  if (unmet.length > 0) return failure(`You need ${unmet.join(', ')} to equip the ${item.name}.`);

  const slot = item.equipment.slot;
  const previouslyEquipped = loadout.equipment[slot];
  const inventory = [...loadout.inventory];
  inventory[slotIndex] = stack.quantity > 1 ? { itemId: stack.itemId, quantity: stack.quantity - 1 } : null;

  if (previouslyEquipped) {
    if (inventory[slotIndex] === null) {
      inventory[slotIndex] = { itemId: previouslyEquipped, quantity: 1 };
    } else {
      const outcome = addItem(inventory, catalog, previouslyEquipped, 1);
      if (outcome.overflow > 0) return failure('Your inventory is too full to swap that equipment.');
      return success({ inventory: outcome.inventory, equipment: { ...loadout.equipment, [slot]: item.id }, equipped: item });
    }
  }

  return success({ inventory, equipment: { ...loadout.equipment, [slot]: item.id }, equipped: item });
}

export function unequipToInventory(loadout: Loadout, slot: EquipmentSlot, catalog: ItemCatalog): Result<Loadout> {
  const itemId = loadout.equipment[slot];
  if (!itemId) return failure('Nothing is equipped there.');
  const outcome = addItem(loadout.inventory, catalog, itemId, 1);
  if (outcome.overflow > 0) return failure('Your inventory has no room for that.');
  const equipment = { ...loadout.equipment };
  delete equipment[slot];
  return success({ inventory: outcome.inventory, equipment });
}

export function equipmentStats(equipment: EquipmentState, catalog: ItemCatalog): Readonly<Record<StatId, number>> {
  const blocks: StatBlock[] = [];
  for (const slot of EQUIPMENT_SLOTS) {
    const itemId = equipment[slot];
    const stats = itemId ? catalog.get(itemId)?.equipment?.stats : undefined;
    if (stats) blocks.push(stats);
  }
  return sumStats(blocks);
}

export const isEquipped = (equipment: EquipmentState, itemId: ItemId): boolean =>
  EQUIPMENT_SLOTS.some((slot) => equipment[slot] === itemId);

export const equippedItemIds = (equipment: EquipmentState): ItemId[] =>
  EQUIPMENT_SLOTS.flatMap((slot) => (equipment[slot] ? [equipment[slot]] : []));
