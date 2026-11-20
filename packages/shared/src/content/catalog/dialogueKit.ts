import type { DialogueDefinition, DialogueNode, DialogueOption } from '../../dialogue/dialogue.ts';
import type { ItemDefinition, ItemIconShape } from '../../gear/items.ts';
import type { Condition } from '../../rules/conditions.ts';
import type { GameEffect } from '../../rules/effects.ts';
import type { WorldObjectDefinition } from '../../world/entities.ts';
import { DRESSING_THEMES } from '../prefabs/types.ts';

export const active = (questId: string, stepId?: string): Condition => ({ type: 'questActive', questId, ...(stepId ? { stepId } : {}) });
export const completed = (questId: string): Condition => ({ type: 'questCompleted', questId });

export const questItem = (id: string, name: string, examine: string, icon: ItemIconShape, colors: readonly [string, string]): ItemDefinition => ({
  id,
  name,
  examine,
  category: 'quest',
  rarity: 'issued',
  icon,
  iconColors: colors,
  maxStack: 1,
  value: 0,
});

export const questObject = (
  id: string,
  name: string,
  examine: string,
  model: WorldObjectDefinition['model'],
  verb: string,
  conditions: readonly Condition[],
  failureText: string,
  effects: readonly GameEffect[],
  blocksMovement = true,
): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model,
  blocksMovement,
  furnishing: { mount: 'free', homes: DRESSING_THEMES },
  interactions: [{ verb, conditions, failureText, effects }],
});

export const say = (text: string, next: string | null = null): DialogueNode => ({ speaker: 'npc', text, next });
export const bye: DialogueOption = { text: 'Goodbye.', next: null };
export const shop = (shopId: string): DialogueOption => ({ text: 'Show me what you have.', effects: [{ type: 'openShop', shopId }], next: null });

interface Hand {
  readonly stepId: string;
  readonly text: string;
  readonly option: string;
  readonly items: readonly string[];
  readonly signal: string;
  readonly thanks: string;
}

export interface QuestTalk {
  readonly npc: string;
  readonly questId: string;
  readonly offer?: { readonly text: string; readonly accept: string; readonly requires?: readonly string[]; readonly conditions?: readonly Condition[]; readonly notReady?: string };
  readonly waiting: string;
  readonly hand?: Hand;
  readonly report?: { readonly stepId: string; readonly text: string };
  readonly notes?: readonly { readonly stepId: string; readonly text: string }[];
  readonly done: string;
  readonly chat: string;
  readonly chatOptions?: readonly DialogueOption[];
}

export function questTalk(talk: QuestTalk, defaultRequires: readonly string[] = []): DialogueDefinition {
  const extra = talk.chatOptions ?? [];
  const nodes: Record<string, DialogueNode> = {
    waiting: say(talk.waiting),
    done: { speaker: 'npc', text: talk.done, options: [...extra, bye] },
    chat: { speaker: 'npc', text: talk.chat, options: [...extra, bye] },
  };
  const entries: { node: string; conditions?: readonly Condition[] }[] = [];
  if (talk.report) {
    nodes.report = say(talk.report.text);
    entries.push({ node: 'report', conditions: [active(talk.questId, talk.report.stepId)] });
  }
  if (talk.hand) {
    const hand = talk.hand;
    nodes.hand = {
      speaker: 'npc',
      text: hand.text,
      options: [
        {
          text: hand.option,
          conditions: hand.items.map((itemId): Condition => ({ type: 'hasItem', itemId })),
          effects: [...hand.items.map((itemId): GameEffect => ({ type: 'takeItem', itemId })), { type: 'emitSignal', signal: hand.signal }],
          next: 'thanks',
        },
        { text: 'Not yet.', next: null },
      ],
    };
    nodes.thanks = say(hand.thanks);
    entries.push({ node: 'hand', conditions: [active(talk.questId, hand.stepId)] });
  }
  if (talk.offer) {
    nodes.offer = { speaker: 'npc', text: talk.offer.text, options: [{ text: talk.offer.accept, effects: [{ type: 'startQuest', questId: talk.questId }], next: null }, { text: 'Not now.', next: null }] };
    const ready: Condition[] = [...(talk.offer.requires ?? defaultRequires).map(completed), { type: 'questNotStarted', questId: talk.questId }];
    entries.push({ node: 'offer', conditions: [...ready, ...(talk.offer.conditions ?? [])] });
    if (talk.offer.notReady && talk.offer.conditions) {
      nodes['not-ready'] = say(talk.offer.notReady);
      entries.push({ node: 'not-ready', conditions: ready });
    }
  }
  for (const note of talk.notes ?? []) {
    nodes[`note-${note.stepId}`] = say(note.text);
    entries.push({ node: `note-${note.stepId}`, conditions: [active(talk.questId, note.stepId)] });
  }
  if (talk.waiting) entries.push({ node: 'waiting', conditions: [active(talk.questId)] });
  entries.push({ node: 'done', conditions: [completed(talk.questId)] }, { node: 'chat' });
  return { id: talk.npc, entries, nodes };
}

type Entry = DialogueDefinition['entries'][number];

const rank = (entry: Entry): number => {
  const types = (entry.conditions ?? []).map((condition) => condition.type);
  if (types.includes('questActive')) return 0;
  if (types.includes('questNotStarted')) return 1;
  if (types.length > 0) return 2;
  return 3;
};

export function combineDialogues(dialogues: readonly DialogueDefinition[]): DialogueDefinition[] {
  const byId = new Map<string, DialogueDefinition[]>();
  for (const dialogue of dialogues) byId.set(dialogue.id, [...(byId.get(dialogue.id) ?? []), dialogue]);
  return [...byId.entries()].map(([id, group]) => {
    if (group.length === 1) return group[0] as DialogueDefinition;
    const nodes: Record<string, DialogueNode> = {};
    const ranked: { readonly entry: Entry; readonly rank: number; readonly order: number }[] = [];
    group.forEach((dialogue, index) => {
      const rename = (node: string | null | undefined): string | null | undefined => (node === null || node === undefined ? node : `q${index}-${node}`);
      for (const [name, node] of Object.entries(dialogue.nodes)) {
        nodes[`q${index}-${name}`] = {
          ...node,
          ...(node.next !== undefined ? { next: rename(node.next) ?? null } : {}),
          ...(node.options ? { options: node.options.map((option) => ({ ...option, next: rename(option.next) ?? null })) } : {}),
        };
      }
      for (const entry of dialogue.entries) {
        const entryRank = rank(entry);
        if (entryRank === 3 && index < group.length - 1) continue;
        ranked.push({ entry: { ...entry, node: `q${index}-${entry.node}` }, rank: entryRank, order: entryRank === 2 ? -index : index });
      }
    });
    ranked.sort((a, b) => a.rank - b.rank || a.order - b.order);
    return { id, entries: ranked.map((item) => item.entry), nodes };
  });
}
