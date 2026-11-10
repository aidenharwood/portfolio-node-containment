import {
  trackedQuest,
  GAME_CONTENT,
  objectiveGoal,
  QUESTLINE_KIND_LABELS,
  QUESTLINE_KINDS,
  questlineOf,
  type QuestDefinition,
  type QuestId,
  type QuestlineDefinition,
  type QuestlineId,
  type SelfState,
} from '@containment/shared';
import type { QuestTracking } from '../../state/questTracking.ts';
import { h, replaceChildren } from '../../ui/dom.ts';
import type { ContextMenu, MenuAction } from '../contextMenu.ts';
import type { PanelTab } from '../sidePanel.ts';

type QuestState = 'active' | 'completed' | 'available';

const STATE_TAGS: Record<QuestState, string> = { active: 'In progress', available: 'Rumoured', completed: 'Done' };

const questlinePriority = (states: readonly QuestState[]): number => {
  if (states.includes('active')) return 0;
  if (states.includes('available')) return 1;
  return 2;
};

export function createQuestsTab(menu: ContextMenu, tracking: QuestTracking): PanelTab {
  let selected: QuestId | null = null;
  let self: SelfState | null = null;
  const toggled = new Set<QuestlineId>();
  const body = h('div', { className: 'quest-body' });
  const element = h('div', { className: 'tab-quests' }, body);

  const stateOf = (quest: QuestDefinition): QuestState | null => {
    const progress = self?.quests[quest.id];
    if (progress) return progress.status;
    const unlocked = (quest.offerRequires ?? []).every((questId) => self?.quests[questId]?.status === 'completed');
    return quest.offeredBy && unlocked ? 'available' : null;
  };

  const trackedId = (): QuestId | null =>
    self ? trackedQuest(self.quests, GAME_CONTENT.quests, tracking.questId)?.quest.id ?? null : null;

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

  const renderQuestEntry = (quest: QuestDefinition, state: QuestState, tracked: QuestId | null) =>
    h('button', {
      className: `quest-entry state-${state}${tracked === quest.id ? ' tracked' : ''}`,
      type: 'button',
      onclick: () => open(quest.id),
      oncontextmenu: (event: MouseEvent) => {
        event.preventDefault();
        menu.open(event.clientX, event.clientY, actionsFor(quest, state));
      },
    },
    h('span', { className: 'quest-entry-name' }, quest.name, tracked === quest.id && h('span', { className: 'quest-tracked-mark' }, ' ◆')),
    h('span', { className: 'quest-entry-tag' }, STATE_TAGS[state]));

  const renderQuestline = (questline: QuestlineDefinition, entries: readonly [QuestDefinition, QuestState][], tracked: QuestId | null) => {
    const completed = entries.filter(([, state]) => state === 'completed').length;
    const finished = questline.questIds.every((questId) => self?.quests[questId]?.status === 'completed');
    const collapsed = finished !== toggled.has(questline.id);
    return h('section', { className: `questline${finished ? ' finished' : ''}` },
      h('button', {
        className: 'questline-header',
        type: 'button',
        title: questline.summary,
        onclick: () => {
          if (toggled.has(questline.id)) toggled.delete(questline.id);
          else toggled.add(questline.id);
          render();
        },
      },
      h('span', { className: 'questline-caret' }, collapsed ? '▸' : '▾'),
      h('span', { className: 'questline-name' }, questline.name),
      h('span', { className: 'questline-count' }, `${completed}/${questline.questIds.length}`)),
      !collapsed && h('div', { className: 'questline-quests' }, ...entries.map(([quest, state]) => renderQuestEntry(quest, state, tracked))),
    );
  };

  const renderList = () => {
    const tracked = trackedId();
    const questlines = [...GAME_CONTENT.questlines.values()].map((questline) => {
      const entries = questline.questIds.flatMap((questId): [QuestDefinition, QuestState][] => {
        const quest = GAME_CONTENT.quests.get(questId);
        const state = quest ? stateOf(quest) : null;
        return quest && state ? [[quest, state]] : [];
      });
      return { questline, entries, priority: questlinePriority(entries.map(([, state]) => state)) };
    });
    replaceChildren(
      body,
      h('div', { className: 'quest-list' },
        ...QUESTLINE_KINDS.flatMap((kind) => {
          const visible = questlines
            .filter(({ questline, entries }) => questline.kind === kind && entries.length > 0)
            .sort((a, b) => a.priority - b.priority);
          if (visible.length === 0) return [];
          return [
            h('p', { className: `quest-group kind-${kind}` }, QUESTLINE_KIND_LABELS[kind]),
            ...visible.map(({ questline, entries }) => renderQuestline(questline, entries, tracked)),
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
    const questline = questlineOf(GAME_CONTENT.questlines.values(), quest.id);
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
        questline && h('p', { className: `quest-questline kind-${questline.kind}` }, `${QUESTLINE_KIND_LABELS[questline.kind]} · ${questline.name}`),
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
    icon: 'quests',
    element,
    update(next) {
      self = next;
      render();
    },
  };
}
