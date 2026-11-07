import { focusedQuest, GAME_CONTENT, objectiveGoal, type QuestDefinition, type QuestId, type SelfState } from '@containment/shared';
import type { QuestTracking } from '../../state/questTracking.ts';
import { h, replaceChildren } from '../../ui/dom.ts';
import type { ContextMenu, MenuAction } from '../contextMenu.ts';
import type { PanelTab } from '../sidePanel.ts';

type QuestState = 'active' | 'completed' | 'available';

const GROUP_LABELS: Record<QuestState, string> = { active: 'In progress', available: 'Rumoured', completed: 'Completed' };

export function createQuestsTab(menu: ContextMenu, tracking: QuestTracking): PanelTab {
  let selected: QuestId | null = null;
  let self: SelfState | null = null;
  const body = h('div', { className: 'quest-body' });
  const element = h('div', { className: 'tab-quests' }, h('header', { className: 'tab-header' }, h('h3', {}, 'Journal')), body);

  const stateOf = (quest: QuestDefinition): QuestState | null => {
    const progress = self?.quests[quest.id];
    if (progress) return progress.status;
    return quest.offeredBy ? 'available' : null;
  };

  const trackedId = (): QuestId | null =>
    self ? focusedQuest(self.quests, GAME_CONTENT.quests, tracking.questId)?.quest.id ?? null : null;

  const open = (questId: QuestId | null) => {
    selected = questId;
    render();
  };

  const actionsFor = (quest: QuestDefinition, state: QuestState): MenuAction[] => {
    const actions: MenuAction[] = [{ verb: 'View', subject: quest.name, run: () => open(quest.id) }];
    if (state === 'active' && trackedId() !== quest.id) {
      actions.unshift({ verb: 'Track', subject: quest.name, run: () => tracking.track(quest.id) });
    }
    return actions;
  };

  const render = () => {
    if (!self) return;
    const quest = selected ? GAME_CONTENT.quests.get(selected) : undefined;
    if (quest) renderDetail(quest, self);
    else renderList();
  };

  const renderList = () => {
    const quests = [...GAME_CONTENT.quests.values()];
    const tracked = trackedId();
    replaceChildren(
      body,
      h('div', { className: 'quest-list' },
        ...(['active', 'available', 'completed'] as const).flatMap((state) => {
          const group = quests.filter((quest) => stateOf(quest) === state);
          if (group.length === 0) return [];
          return [
            h('p', { className: 'quest-group' }, GROUP_LABELS[state]),
            ...group.map((quest) =>
              h('button', {
                className: `quest-entry state-${state}${tracked === quest.id ? ' tracked' : ''}`,
                type: 'button',
                onclick: () => open(quest.id),
                oncontextmenu: (event: MouseEvent) => {
                  event.preventDefault();
                  menu.open(event.clientX, event.clientY, actionsFor(quest, state));
                },
              }, quest.name, tracked === quest.id && h('span', { className: 'quest-tracked-mark' }, ' ◆')),
            ),
          ];
        }),
      ),
      h('p', { className: 'tab-hint' }, 'Tap a quest to read it. Right-click or hold to track.'),
    );
  };

  const renderDetail = (quest: QuestDefinition, current: SelfState) => {
    const progress = current.quests[quest.id];
    const step = progress && progress.status === 'active' ? quest.steps[progress.stepIndex] : undefined;
    const giver = quest.offeredBy ? GAME_CONTENT.npcs.get(quest.offeredBy)?.name : undefined;
    const isTracked = trackedId() === quest.id;
    replaceChildren(
      body,
      h('div', { className: 'quest-detail' },
        h('div', { className: 'quest-detail-bar' },
          h('button', { className: 'quest-back', type: 'button', onclick: () => open(null) }, '‹ All quests'),
          step && h('button', {
            className: `button quest-track${isTracked ? ' active' : ''}`,
            type: 'button',
            disabled: isTracked,
            onclick: () => tracking.track(quest.id),
          }, isTracked ? 'Tracking' : 'Track'),
        ),
        h('h4', {}, quest.name),
        h('p', { className: 'quest-summary' }, quest.summary),
        quest.recommendedLevel !== undefined &&
          h('p', { className: `quest-recommended${current.combatLevel < quest.recommendedLevel ? ' under' : ''}` },
            `Recommended combat level ${quest.recommendedLevel} · yours ${current.combatLevel}`),
        !progress && giver && h('p', { className: 'quest-journal' }, `Speak with ${giver} to begin.`),
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
      ),
    );
  };

  tracking.onChange(render);

  return {
    id: 'quests',
    label: 'Journal',
    glyph: '✎',
    element,
    update(next) {
      self = next;
      render();
    },
  };
}
