import {
  GAME_CONTENT,
  questRequirements,
  QUESTLINE_KIND_LABELS,
  QUESTLINE_KINDS,
  type QuestDefinition,
  type QuestId,
  type QuestlineDefinition,
  type QuestlineId,
  type SelfState,
} from '@containment/shared';
import { guidedQuest } from '../../state/guidanceGoals.ts';
import type { GuidanceTracking } from '../../state/guidanceTracking.ts';
import { h, replaceChildren } from '../../ui/dom.ts';
import type { ContextMenu, MenuAction } from '../contextMenu.ts';
import { canTrackQuest, type QuestInfoWindow } from '../questInfoWindow.ts';
import type { PanelTab } from '../sidePanel.ts';

type QuestState = 'active' | 'completed' | 'available' | 'locked';

const STATE_TAGS: Record<QuestState, string> = { active: 'In progress', available: 'Available', completed: 'Done', locked: 'Locked' };

const questlinePriority = (states: readonly QuestState[]): number => {
  if (states.includes('active')) return 0;
  if (states.includes('available')) return 1;
  return 2;
};

export function createQuestsTab(menu: ContextMenu, tracking: GuidanceTracking, info: QuestInfoWindow): PanelTab {
  let self: SelfState | null = null;
  const toggled = new Set<QuestlineId>();
  const body = h('div', { className: 'quest-body' });
  const element = h('div', { className: 'tab-quests' }, body);

  const stateOf = (quest: QuestDefinition): QuestState => {
    const progress = self?.quests[quest.id];
    if (progress) return progress.status;
    const ready = self && questRequirements(quest, self.quests, self.skills, GAME_CONTENT).every((requirement) => requirement.met || requirement.recommended);
    return quest.offeredBy && ready ? 'available' : 'locked';
  };

  const trackedId = (): QuestId | null =>
    self ? guidedQuest(tracking.target, self.quests)?.quest.id ?? null : null;

  const open = (questId: QuestId) => {
    info.show(questId);
    render();
  };

  const actionsFor = (quest: QuestDefinition): MenuAction[] => {
    const actions: MenuAction[] = [{ verb: 'View', subject: quest.name, run: () => open(quest.id) }];
    if (self && canTrackQuest(quest, self) && trackedId() !== quest.id) {
      actions.unshift({ verb: 'Track', subject: quest.name, run: () => tracking.trackQuest(quest.id) });
    }
    return actions;
  };

  const render = () => {
    if (self) renderList();
  };

  const renderQuestEntry = (quest: QuestDefinition, state: QuestState, tracked: QuestId | null) =>
    h('button', {
      className: `quest-entry state-${state}${tracked === quest.id ? ' tracked' : ''}`,
      type: 'button',
      onclick: () => open(quest.id),
      oncontextmenu: (event: MouseEvent) => {
        event.preventDefault();
        menu.open(event.clientX, event.clientY, actionsFor(quest));
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
        return quest ? [[quest, stateOf(quest)]] : [];
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
      h('p', { className: 'tab-hint' }, 'Tap a quest for details. Right-click or hold to track.'),
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
      info.update(next);
      render();
    },
  };
}
