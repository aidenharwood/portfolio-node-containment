import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { DialogueDefinition, DialogueEntry } from '../src/dialogue/dialogue.ts';
import type { QuestDefinition } from '../src/quests/questDefinition.ts';
import { questOfferConditions } from '../src/quests/questRequirements.ts';
import type { Condition } from '../src/rules/conditions.ts';
import { GAME_CONTENT } from '../src/content/gameContent.ts';

type Standing = { readonly status: 'notStarted' } | { readonly status: 'active'; readonly stepId?: string } | { readonly status: 'completed' };
type State = Map<string, Standing>;

const startsQuest = (dialogue: DialogueDefinition, entry: DialogueEntry): string[] =>
  (dialogue.nodes[entry.node]?.options ?? []).flatMap((option) => (option.effects ?? []).flatMap((effect) => (effect.type === 'startQuest' ? [effect.questId] : [])));

const completedIn = (conditions: readonly Condition[] | undefined): string[] =>
  (conditions ?? []).flatMap((condition) => (condition.type === 'questCompleted' ? [condition.questId] : []));

function startingRoutes(): Map<string, string[][]> {
  const routes = new Map<string, string[][]>();
  const add = (questId: string, required: readonly string[]): void => {
    routes.set(questId, [...(routes.get(questId) ?? []), [...required, ...(GAME_CONTENT.quests.get(questId)?.offerRequires ?? [])]]);
  };
  for (const dialogue of GAME_CONTENT.dialogues.values()) {
    for (const entry of dialogue.entries) for (const questId of startsQuest(dialogue, entry)) add(questId, completedIn(entry.conditions));
  }
  for (const quest of GAME_CONTENT.quests.values()) if (quest.followUpQuestId) add(quest.followUpQuestId, [quest.id]);
  return routes;
}

const ROUTES = startingRoutes();

const prerequisites = (quest: QuestDefinition): string[] => {
  const routes = ROUTES.get(quest.id) ?? [[...(quest.offerRequires ?? []), ...completedIn(questOfferConditions(quest, GAME_CONTENT))]];
  const [first = [], ...rest] = routes;
  return [...new Set(first.filter((questId) => rest.every((route) => route.includes(questId))))];
};

function assign(state: State, questId: string, standing: Standing): boolean {
  const existing = state.get(questId);
  if (existing) {
    if (existing.status !== standing.status) return false;
    if (existing.status === 'active' && standing.status === 'active') {
      if (existing.stepId && standing.stepId && existing.stepId !== standing.stepId) return false;
      if (!existing.stepId && standing.stepId) state.set(questId, standing);
    }
    return true;
  }
  state.set(questId, standing);
  if (standing.status === 'notStarted') return true;
  const quest = GAME_CONTENT.quests.get(questId);
  return (quest ? prerequisites(quest) : []).every((required) => assign(state, required, { status: 'completed' }));
}

function satisfiable(state: State, conditions: readonly Condition[], flags: Map<string, boolean>, items: Map<string, boolean>): boolean {
  for (const condition of conditions) {
    switch (condition.type) {
      case 'questNotStarted':
        if (!assign(state, condition.questId, { status: 'notStarted' })) return false;
        break;
      case 'questActive':
        if (!assign(state, condition.questId, { status: 'active', ...(condition.stepId ? { stepId: condition.stepId } : {}) })) return false;
        break;
      case 'questCompleted':
        if (!assign(state, condition.questId, { status: 'completed' })) return false;
        break;
      case 'hasFlag':
      case 'lacksFlag': {
        const wanted = condition.type === 'hasFlag';
        if (flags.get(condition.flag) === !wanted) return false;
        flags.set(condition.flag, wanted);
        break;
      }
      case 'hasItem':
      case 'lacksItem': {
        const wanted = condition.type === 'hasItem';
        if (items.get(condition.itemId) === !wanted) return false;
        items.set(condition.itemId, wanted);
        break;
      }
      default:
        break;
    }
  }
  return true;
}

const coexist = (target: readonly Condition[], earlier: readonly Condition[]): boolean =>
  satisfiable(new Map(), [...target, ...earlier], new Map(), new Map());

function chain(dialogue: DialogueDefinition, start: string): string[] {
  const nodes: string[] = [];
  let at: string | null | undefined = start;
  while (at && !nodes.includes(at)) {
    nodes.push(at);
    at = dialogue.nodes[at]?.next;
  }
  return nodes;
}

const leadsTo = (dialogue: DialogueDefinition, from: DialogueEntry, target: DialogueEntry): boolean =>
  chain(dialogue, from.node).flatMap((name) => dialogue.nodes[name]?.options ?? []).some((option) => option.next === target.node && (option.conditions ?? []).every((condition) => (target.conditions ?? []).some((own) => JSON.stringify(own) === JSON.stringify(condition))));

interface Target {
  readonly label: string;
  readonly dialogue: DialogueDefinition;
  readonly index: number;
}

function targets(): Target[] {
  const found: Target[] = [];
  for (const dialogue of GAME_CONTENT.dialogues.values()) {
    dialogue.entries.forEach((entry, index) => {
      for (const questId of startsQuest(dialogue, entry)) found.push({ label: `${dialogue.id}: offer of ${questId}`, dialogue, index });
    });
  }
  for (const quest of GAME_CONTENT.quests.values()) {
    for (const step of quest.steps) {
      for (const objective of step.objectives) {
        const npcId = objective.type === 'talkTo' || objective.type === 'signal' ? objective.npcId : undefined;
        const dialogueId = npcId ? GAME_CONTENT.npcs.get(npcId)?.dialogueId : undefined;
        const dialogue = dialogueId ? GAME_CONTENT.dialogues.get(dialogueId) : undefined;
        if (!dialogue) continue;
        const index = dialogue.entries.findIndex((entry) => (entry.conditions ?? []).some((condition) => condition.type === 'questActive' && condition.questId === quest.id && condition.stepId === step.id));
        if (index >= 0) found.push({ label: `${dialogue.id}: ${quest.id} step ${step.id}`, dialogue, index });
      }
    }
  }
  return found;
}

export function hiddenDialogue(): string[] {
  const problems: string[] = [];
  for (const { label, dialogue, index } of targets()) {
    const target = dialogue.entries[index]!;
    const own = target.conditions ?? [];
    if (!coexist(own, [])) continue;
    for (const earlier of dialogue.entries.slice(0, index)) {
      if (earlier.node === target.node || leadsTo(dialogue, earlier, target)) continue;
      if (coexist(own, earlier.conditions ?? [])) problems.push(`${label} is hidden behind ${earlier.node}`);
    }
  }
  return [...new Set(problems)];
}

describe('dialogue entry order', () => {
  test('no earlier entry hides a quest step or an offer that should be shown', () => {
    assert.deepEqual(hiddenDialogue(), []);
  });
});
