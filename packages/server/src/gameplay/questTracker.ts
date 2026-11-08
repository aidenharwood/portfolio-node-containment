import {
  advanceQuest,
  startQuest,
  type GameContent,
  type GameEffect,
  type QuestAdvance,
  type QuestDefinition,
  type QuestEvent,
  type QuestId,
  type QuestProgress,
} from '@containment/shared';
import type { Player } from '../world/player.ts';
import { questProbeFor } from './playerContext.ts';

export type EffectApplier = (player: Player, effects: readonly GameEffect[]) => void;

const sameProgress = (a: QuestProgress, b: QuestProgress): boolean =>
  a.status === b.status &&
  a.stepIndex === b.stepIndex &&
  a.objectiveProgress.length === b.objectiveProgress.length &&
  a.objectiveProgress.every((value, index) => value === b.objectiveProgress[index]);

export class QuestTracker {
  private readonly content: GameContent;
  private readonly applyEffects: EffectApplier;

  constructor(content: GameContent, applyEffects: EffectApplier) {
    this.content = content;
    this.applyEffects = applyEffects;
  }

  start(player: Player, questId: QuestId): void {
    const definition = this.content.quests.get(questId);
    if (!definition || player.record.quests[questId]) return;
    player.send({ type: 'chat.message', channel: 'quest', text: `New quest: ${definition.name}` });
    player.send({ type: 'notice', tone: 'info', text: `Quest started — ${definition.name}` });
    this.commit(player, definition, startQuest(definition, questProbeFor(player)), true);
  }

  resumeFollowUps(player: Player): void {
    for (const progress of Object.values(player.record.quests)) {
      const definition = this.content.quests.get(progress.questId);
      if (progress.status === 'active' && definition && progress.stepIndex >= definition.steps.length) this.completeRetiredSteps(player, definition);
    }
    for (const progress of Object.values(player.record.quests)) {
      const followUp = progress.status === 'completed' ? this.content.quests.get(progress.questId)?.followUpQuestId : undefined;
      const supersededBy = followUp ? this.content.quests.get(followUp)?.followUpQuestId : undefined;
      if (supersededBy && player.record.quests[supersededBy]) continue;
      if (followUp && !player.record.quests[followUp]) this.start(player, followUp);
    }
  }

  private completeRetiredSteps(player: Player, definition: QuestDefinition): void {
    const progress = player.record.quests[definition.id];
    if (!progress) return;
    player.update({ quests: { ...player.record.quests, [definition.id]: { ...progress, status: 'completed' } } });
    this.applyEffects(player, definition.rewards);
  }

  handle(player: Player, event: QuestEvent): void {
    for (const progress of Object.values(player.record.quests)) {
      if (progress.status !== 'active') continue;
      const definition = this.content.quests.get(progress.questId);
      if (!definition) continue;
      const current = player.record.quests[progress.questId];
      if (!current) continue;
      const advance = advanceQuest(definition, current, event, questProbeFor(player));
      if (!sameProgress(advance.progress, current)) this.commit(player, definition, advance, false);
    }
  }

  private commit(player: Player, definition: QuestDefinition, advance: QuestAdvance, isNew: boolean): void {
    player.update({ quests: { ...player.record.quests, [definition.id]: advance.progress } });

    for (const step of advance.completedSteps) {
      if (step.onComplete) this.applyEffects(player, step.onComplete);
    }

    if (advance.questCompleted) {
      player.send({ type: 'chat.message', channel: 'quest', text: `Quest complete: ${definition.name}` });
      player.send({ type: 'notice', tone: 'success', text: `Quest complete — ${definition.name}` });
      this.applyEffects(player, definition.rewards);
      if (definition.followUpQuestId) this.start(player, definition.followUpQuestId);
      return;
    }

    const nowOn = definition.steps[advance.progress.stepIndex];
    if (nowOn && (advance.completedSteps.length > 0 || isNew)) {
      player.send({ type: 'chat.message', channel: 'quest', text: nowOn.journal });
    }
  }
}
