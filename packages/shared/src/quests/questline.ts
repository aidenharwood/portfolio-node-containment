import type { QuestId } from '../ids.ts';
import type { QuestDefinition } from './questDefinition.ts';

export type QuestlineId = string;

export type QuestlineKind = 'main' | 'side';

export interface QuestlineDefinition {
  readonly id: QuestlineId;
  readonly name: string;
  readonly kind: QuestlineKind;
  readonly summary: string;
  readonly questIds: readonly QuestId[];
}

export const QUESTLINE_KIND_LABELS: Record<QuestlineKind, string> = { main: 'Main storyline', side: 'Side quests' };

export const QUESTLINE_KINDS: readonly QuestlineKind[] = ['main', 'side'];

export const questlineKindFor = (quest: QuestDefinition): QuestlineKind => (quest.category === 'side' ? 'side' : 'main');

export function questlineOf(questlines: Iterable<QuestlineDefinition>, questId: QuestId): QuestlineDefinition | undefined {
  for (const questline of questlines) if (questline.questIds.includes(questId)) return questline;
  return undefined;
}
