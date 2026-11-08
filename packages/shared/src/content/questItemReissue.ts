import type { DialogueDefinition } from '../dialogue/dialogue.ts';
import type { ItemId, NpcId } from '../ids.ts';
import type { GameEffect } from '../rules/effects.ts';
import type { ObjectInteraction } from '../world/entities.ts';
import type { GameContent } from './gameContent.ts';

const destroyedPrefix = (itemId: ItemId): string => `item-destroyed:${itemId}:`;

export const destroyedItemFlag = (itemId: ItemId, quantity: number): string => `${destroyedPrefix(itemId)}${quantity}`;

export function destroyedQuantity(flags: readonly string[], itemId: ItemId): number {
  const prefix = destroyedPrefix(itemId);
  return flags.reduce((total, flag) => (flag.startsWith(prefix) ? total + (Number(flag.slice(prefix.length)) || 0) : total), 0);
}

export function recordDestroyed(flags: readonly string[], itemId: ItemId, quantity: number): string[] {
  const total = destroyedQuantity(flags, itemId) + quantity;
  return [...forgetDestroyed(flags, [itemId]), destroyedItemFlag(itemId, total)];
}

export function forgetDestroyed(flags: readonly string[], itemIds: readonly ItemId[]): string[] {
  const prefixes = itemIds.map(destroyedPrefix);
  return flags.filter((flag) => !prefixes.some((prefix) => flag.startsWith(prefix)));
}

const grantedItems = (effects: readonly GameEffect[] | undefined): ItemId[] =>
  (effects ?? []).flatMap((effect) => (effect.type === 'giveItem' ? [effect.itemId] : []));

const dialogueGrants = (dialogue: DialogueDefinition): ItemId[] =>
  Object.values(dialogue.nodes).flatMap((node) => [
    ...grantedItems(node.effects),
    ...(node.options ?? []).flatMap((option) => grantedItems(option.effects)),
  ]);

const isQuestItem = (content: GameContent, itemId: ItemId): boolean => content.items.get(itemId)?.category === 'quest';

export function questItemsIssuedBy(content: GameContent, npcId: NpcId): ItemId[] {
  const dialogueId = content.npcs.get(npcId)?.dialogueId;
  const dialogue = dialogueId ? content.dialogues.get(dialogueId) : undefined;
  if (!dialogue) return [];
  return [...new Set(dialogueGrants(dialogue))].filter((itemId) => isQuestItem(content, itemId));
}

export const interactionGrantsQuestItem = (content: GameContent, interaction: ObjectInteraction): ItemId[] =>
  grantedItems(interaction.effects).filter((itemId) => isQuestItem(content, itemId));
