import {
  addItem,
  countItem,
  createEmptyInventory,
  createStartingSkills,
  emptyContractLedger,
  isEquipped,
  maxIntegrityFor,
  normalizeCharacterName,
  startQuest,
  type AccountId,
  type CharacterDraft,
  type CharacterId,
  type CharacterRecord,
  type EquipmentSlot,
  type GameContent,
  type InventoryState,
  type ItemId,
  type QuestLog,
} from '@containment/shared';

export function withStartingQuest(quests: QuestLog, inventory: InventoryState, equipment: Partial<Record<EquipmentSlot, ItemId>>, content: GameContent): QuestLog {
  const startingQuestId = content.newCharacter.startingQuestId;
  const startingQuest = startingQuestId === undefined ? undefined : content.quests.get(startingQuestId);
  if (!startingQuest || quests[startingQuest.id]) return quests;
  const probe = {
    countItem: (itemId: ItemId) => countItem(inventory, itemId),
    isEquipped: (itemId: ItemId) => isEquipped(equipment, itemId),
    levelOf: () => 1,
  };
  return { ...quests, [startingQuest.id]: startQuest(startingQuest, probe).progress };
}

export function createCharacterRecord(
  draft: CharacterDraft,
  ownership: { readonly id: CharacterId; readonly accountId: AccountId },
  content: GameContent,
): CharacterRecord {
  const { kit, startingLocation } = content.newCharacter;
  const skills = createStartingSkills();

  let inventory = createEmptyInventory();
  for (const grant of kit.items) inventory = addItem(inventory, content.items, grant.itemId, grant.count).inventory;

  const equipment: Partial<Record<EquipmentSlot, ItemId>> = {};
  for (const itemId of kit.equipment) {
    const slot = content.items.get(itemId)?.equipment?.slot;
    if (slot) equipment[slot] = itemId;
  }

  return {
    id: ownership.id,
    accountId: ownership.accountId,
    name: normalizeCharacterName(draft.name),
    pronouns: draft.pronouns,
    appearance: draft.appearance,
    skills,
    vitals: { integrity: maxIntegrityFor(skills) },
    inventory,
    storage: [],
    equipment,
    quests: withStartingQuest({}, inventory, equipment, content),
    flags: [],
    friends: [],
    contracts: emptyContractLedger(),
    location: startingLocation,
    createdAt: Date.now(),
  };
}
