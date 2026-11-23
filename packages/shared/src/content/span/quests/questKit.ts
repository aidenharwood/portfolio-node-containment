import type { DialogueDefinition, DialogueNode, DialogueOption } from '../../../dialogue/dialogue.ts';
import type { QuestDefinition, QuestObjective } from '../../../quests/questDefinition.ts';
import type { Condition } from '../../../rules/conditions.ts';
import type { GameEffect } from '../../../rules/effects.ts';
import type { WorldObjectDefinition } from '../../../world/entities.ts';
import { active, questObject, questTalk, say, type QuestTalk } from '../../catalog/dialogueKit.ts';
import type { QuestPay } from '../../catalog/questPay.ts';

export type Counted = readonly (readonly [itemId: string, count: number])[];

export const scrip = (count: number): QuestPay => ({ effect: { type: 'giveItem', itemId: 'meridian-scrip', count }, line: `${count} Scrip` });

export const paid = (pays: readonly QuestPay[], extra: readonly GameEffect[] = [], lines: readonly string[] = []): Pick<QuestDefinition, 'rewards' | 'rewardSummary'> => ({
  rewards: [...pays.map((pay) => pay.effect), ...extra],
  rewardSummary: [...pays.map((pay) => pay.line), ...lines],
});

export const handTo = (signal: string, npcId: string, label: string): QuestObjective => ({ type: 'signal', signal, npcId, label });

const has = (items: Counted): Condition[] => items.map(([itemId, count]): Condition => ({ type: 'hasItem', itemId, count }));
const take = (items: Counted): GameEffect[] => items.map(([itemId, count]): GameEffect => ({ type: 'takeItem', itemId, count }));

export function handIn(talk: QuestTalk, items: Counted): DialogueDefinition {
  const dialogue = questTalk(talk);
  const hand = dialogue.nodes.hand;
  const signal = talk.hand?.signal;
  if (!hand?.options || !signal) return dialogue;
  const [give, ...rest] = hand.options;
  if (!give) return dialogue;
  const option: DialogueOption = { ...give, conditions: has(items), effects: [...take(items), { type: 'emitSignal', signal }] };
  return { ...dialogue, nodes: { ...dialogue.nodes, hand: { ...hand, options: [option, ...rest] } } };
}

export interface Choice {
  readonly text: string;
  readonly effects: readonly GameEffect[];
  readonly reply: string;
}

export interface ChoiceHand {
  readonly stepId: string;
  readonly text: string;
  readonly signal: string;
  readonly items: Counted;
  readonly choices: readonly Choice[];
}

export function choiceTalk(talk: QuestTalk, hand: ChoiceHand, flagLines: readonly (readonly [flag: string, text: string])[] = []): DialogueDefinition {
  const dialogue = questTalk(talk);
  const nodes: Record<string, DialogueNode> = { ...dialogue.nodes };
  const options: DialogueOption[] = hand.choices.map((choice, index) => {
    nodes[`choice-${index}`] = say(choice.reply);
    return { text: choice.text, conditions: has(hand.items), effects: [...take(hand.items), ...choice.effects, { type: 'emitSignal', signal: hand.signal }], next: `choice-${index}` };
  });
  nodes.decide = { speaker: 'npc', text: hand.text, options: [...options, { text: 'Not yet.', next: null }] };
  const entries = [{ node: 'decide', conditions: [active(talk.questId, hand.stepId)] }, ...dialogue.entries];
  return withFlagLines({ ...dialogue, entries, nodes }, flagLines, talk.chatOptions ?? []);
}

export function withFlagLines(dialogue: DialogueDefinition, lines: readonly (readonly [flag: string, text: string])[], options: readonly DialogueOption[] = []): DialogueDefinition {
  if (lines.length === 0) return dialogue;
  const nodes: Record<string, DialogueNode> = { ...dialogue.nodes };
  const flagged = lines.map(([flag, text], index) => {
    nodes[`flag-${index}`] = { speaker: 'npc', text, options: [...options, { text: 'Goodbye.', next: null }] };
    return { node: `flag-${index}`, conditions: [{ type: 'hasFlag' as const, flag }] };
  });
  const doneAt = dialogue.entries.findIndex((entry) => entry.node === 'done');
  const entries = doneAt < 0 ? [...dialogue.entries, ...flagged] : [...dialogue.entries.slice(0, doneAt), ...flagged, ...dialogue.entries.slice(doneAt)];
  return { ...dialogue, entries, nodes };
}

export interface FieldObject {
  readonly id: string;
  readonly name: string;
  readonly examine: string;
  readonly model: WorldObjectDefinition['model'];
  readonly verb: string;
  readonly when: readonly Condition[];
  readonly refuse: string;
  readonly effects: readonly GameEffect[];
  readonly once?: string;
  readonly open?: boolean;
}

export function fieldObject(spec: FieldObject): WorldObjectDefinition {
  const base = questObject(spec.id, spec.name, spec.examine, spec.model, spec.verb, spec.when, spec.refuse, spec.effects, !spec.open);
  if (!spec.once) return base;
  return { ...base, interactions: base.interactions.map((interaction) => ({ ...interaction, oncePerCharacter: true, alreadyUsedText: spec.once })) };
}

export const tell = (text: string): GameEffect[] => [{ type: 'notify', text }];
