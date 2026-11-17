import {
  GAME_CONTENT,
  objectiveGoal,
  QUESTLINE_KIND_LABELS,
  questlineOf,
  questRequirements,
  type QuestDefinition,
  type QuestId,
  type SelfState,
} from '@containment/shared';
import { guidedQuest } from '../state/guidanceGoals.ts';
import type { GuidanceTracking } from '../state/guidanceTracking.ts';
import { h, replaceChildren } from '../ui/dom.ts';

export const canTrackQuest = (quest: QuestDefinition, self: SelfState): boolean => {
  const status = self.quests[quest.id]?.status;
  return status === 'active' || (status === undefined && quest.offeredBy !== undefined);
};

export class QuestInfoWindow {
  readonly element = h('section', { className: 'quest-info-window panel', hidden: true, role: 'dialog', ariaLabel: 'Quest details' });
  private readonly tracking: GuidanceTracking;
  private readonly body = h('div', { className: 'quest-detail' });
  private readonly title = h('h3', {});
  private questId: QuestId | null = null;
  private self: SelfState | null = null;

  constructor(tracking: GuidanceTracking) {
    this.tracking = tracking;
    tracking.onChange(() => this.render());
    replaceChildren(
      this.element,
      h('header', { className: 'shop-header' },
        this.title,
        h('button', { className: 'dialogue-close', type: 'button', ariaLabel: 'Close quest details', onclick: () => this.hide() }, '×'),
      ),
      this.body,
    );
  }

  get isOpen(): boolean {
    return this.questId !== null;
  }

  get shownQuestId(): QuestId | null {
    return this.questId;
  }

  show(questId: QuestId): void {
    this.questId = questId;
    this.element.hidden = false;
    this.render();
  }

  hide(): void {
    this.questId = null;
    this.element.hidden = true;
  }

  update(self: SelfState): void {
    this.self = self;
    this.render();
  }

  private render(): void {
    const quest = this.questId ? GAME_CONTENT.quests.get(this.questId) : undefined;
    const current = this.self;
    if (!quest || !current) return;
    const progress = current.quests[quest.id];
    const step = progress && progress.status === 'active' ? quest.steps[progress.stepIndex] : undefined;
    const giver = quest.offeredBy ? GAME_CONTENT.npcs.get(quest.offeredBy)?.name : undefined;
    const isTracked = guidedQuest(this.tracking.target, current.quests)?.quest.id === quest.id;
    const questline = questlineOf(GAME_CONTENT.questlines.values(), quest.id);
    const requirements = questRequirements(quest, current.quests, current.skills, GAME_CONTENT);
    const ready = requirements.every((requirement) => requirement.met || requirement.recommended);
    this.title.textContent = quest.name;
    replaceChildren(
      this.body,
      questline && h('p', { className: `quest-questline kind-${questline.kind}` }, `${QUESTLINE_KIND_LABELS[questline.kind]} · ${questline.name}`),
      h('p', { className: 'quest-summary' }, quest.summary),
      requirements.length > 0 &&
        h('div', { className: 'quest-requirements' },
          h('p', { className: 'quest-section-label' }, 'Requirements'),
          h('ul', {}, ...requirements.map((requirement) => h('li', { className: `${requirement.met ? 'met' : ''}${requirement.recommended ? ' recommended' : ''}` }, requirement.label))),
        ),
      !progress && giver && h('p', { className: 'quest-journal' }, ready ? `Speak with ${giver} to begin.` : `Offered by ${giver} once the requirements are met.`),
      step && h('p', { className: 'quest-journal' }, step.journal),
      step &&
        h('ul', { className: 'quest-objectives' },
          ...step.objectives.map((objective, index) => {
            const goal = objectiveGoal(objective);
            const count = progress?.objectiveProgress[index] ?? 0;
            return h('li', { className: count >= goal ? 'done' : '' }, objective.label, goal > 1 && ` (${count}/${goal})`);
          }),
        ),
      progress?.status === 'completed' && h('p', { className: 'quest-journal' }, 'Completed.'),
      h('p', { className: 'quest-rewards' }, `Rewards: ${quest.rewardSummary.join(' · ')}`),
      canTrackQuest(quest, current) &&
        h('button', {
          className: `button quest-track${isTracked ? ' active' : ''}`,
          type: 'button',
          disabled: isTracked,
          onclick: () => this.tracking.trackQuest(quest.id),
        }, isTracked ? 'Tracking ◆' : progress ? 'Track' : `Track to ${giver ?? 'quest giver'}`),
    );
  }
}
