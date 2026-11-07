import { GAME_CONTENT, objectiveGoal, type QuestDefinition, type QuestId, type SelfState } from '@containment/shared';
import { h, replaceChildren } from '../../ui/dom.ts';
import type { PanelTab } from '../sidePanel.ts';

type QuestState = 'active' | 'completed' | 'available';

export function createQuestsTab(): PanelTab {
  let selected: QuestId | null = null;
  let self: SelfState | null = null;
  const list = h('div', { className: 'quest-list' });
  const detail = h('div', { className: 'quest-detail' });
  const element = h('div', { className: 'tab-quests' }, h('header', { className: 'tab-header' }, h('h3', {}, 'Journal')), list, detail);

  const stateOf = (quest: QuestDefinition): QuestState | null => {
    const progress = self?.quests[quest.id];
    if (progress) return progress.status;
    return quest.offeredBy ? 'available' : null;
  };

  const render = () => {
    if (!self) return;
    const quests = [...GAME_CONTENT.quests.values()];
    replaceChildren(
      list,
      ...(['active', 'available', 'completed'] as const).flatMap((state) => {
        const group = quests.filter((quest) => stateOf(quest) === state);
        if (group.length === 0) return [];
        return [
          h('p', { className: 'quest-group' }, state === 'active' ? 'In progress' : state === 'available' ? 'Rumoured' : 'Completed'),
          ...group.map((quest) =>
            h('button', {
              className: `quest-entry state-${state}${selected === quest.id ? ' selected' : ''}`,
              type: 'button',
              onclick: () => {
                selected = selected === quest.id ? null : quest.id;
                render();
              },
            }, quest.name),
          ),
        ];
      }),
    );
    renderDetail();
  };

  const renderDetail = () => {
    const quest = selected ? GAME_CONTENT.quests.get(selected) : undefined;
    if (!quest || !self) {
      replaceChildren(detail, h('p', { className: 'tab-hint' }, 'Select a quest to read its journal.'));
      return;
    }
    const progress = self.quests[quest.id];
    const step = progress && progress.status === 'active' ? quest.steps[progress.stepIndex] : undefined;
    const giver = quest.offeredBy ? GAME_CONTENT.npcs.get(quest.offeredBy)?.name : undefined;
    replaceChildren(
      detail,
      h('h4', {}, quest.name),
      h('p', { className: 'quest-summary' }, quest.summary),
      quest.recommendedLevel !== undefined &&
        h('p', { className: `quest-recommended${self.combatLevel < quest.recommendedLevel ? ' under' : ''}` },
          `Recommended combat level ${quest.recommendedLevel} · yours ${self.combatLevel}`),
      !progress && giver && h('p', { className: 'quest-journal' }, `Speak with ${giver} to begin.`),
      step && h('p', { className: 'quest-journal' }, step.journal),
      step &&
        h('ul', { className: 'quest-objectives' },
          ...step.objectives.map((objective, index) => {
            const goal = objectiveGoal(objective);
            const current = progress?.objectiveProgress[index] ?? 0;
            return h('li', { className: current >= goal ? 'done' : '' }, objective.label, goal > 1 && ` (${current}/${goal})`);
          }),
        ),
      progress?.status === 'completed' && h('p', { className: 'quest-journal' }, 'Completed.'),
      h('p', { className: 'quest-rewards' }, `Rewards: ${quest.rewardSummary.join(' · ')}`),
    );
  };

  return {
    id: 'quests',
    label: 'Journal',
    glyph: '✎',
    element,
    update(next) {
      self = next;
      if (!selected) selected = Object.values(next.quests).find((progress) => progress.status === 'active')?.questId ?? null;
      render();
    },
  };
}
