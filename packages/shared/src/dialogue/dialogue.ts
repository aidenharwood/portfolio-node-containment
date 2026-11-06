import type { DialogueId } from '../ids.ts';
import { areConditionsMet, type Condition, type ConditionContext } from '../rules/conditions.ts';
import type { GameEffect } from '../rules/effects.ts';

export type DialogueNodeId = string;

export interface DialogueOption {
  readonly text: string;
  readonly next: DialogueNodeId | null;
  readonly conditions?: readonly Condition[];
  readonly effects?: readonly GameEffect[];
}

export interface DialogueNode {
  readonly speaker: 'npc' | 'player';
  readonly text: string;
  readonly next?: DialogueNodeId | null;
  readonly options?: readonly DialogueOption[];
  readonly effects?: readonly GameEffect[];
}

export interface DialogueEntry {
  readonly node: DialogueNodeId;
  readonly conditions?: readonly Condition[];
}

export interface DialogueDefinition {
  readonly id: DialogueId;
  readonly entries: readonly DialogueEntry[];
  readonly nodes: Readonly<Record<DialogueNodeId, DialogueNode>>;
}

export const selectEntryNode = (definition: DialogueDefinition, context: ConditionContext): DialogueNodeId | null =>
  definition.entries.find((entry) => areConditionsMet(entry.conditions, context))?.node ?? null;

export interface AvailableOption {
  readonly index: number;
  readonly option: DialogueOption;
}

export const availableOptions = (node: DialogueNode, context: ConditionContext): AvailableOption[] =>
  (node.options ?? [])
    .map((option, index) => ({ index, option }))
    .filter(({ option }) => areConditionsMet(option.conditions, context));

export const fillDialogueTemplate = (text: string, values: Readonly<Record<string, string>>): string =>
  text.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
