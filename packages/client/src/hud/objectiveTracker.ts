import { GAME_CONTENT, trackedQuests, type QuestLog } from '@containment/shared';
import { h, replaceChildren } from '../ui/dom.ts';

export class ObjectiveTracker {
  readonly element = h('aside', { className: 'hud-objectives' });
  private collapsed = false;

  update(log: QuestLog): void {
    const quests = trackedQuests(log, GAME_CONTENT.quests);
    if (quests.length === 0) {
      replaceChildren(this.element);
      return;
    }
    const toggle = h('button', { className: 'objectives-toggle', type: 'button', onclick: () => {
      this.collapsed = !this.collapsed;
      this.update(log);
    } }, this.collapsed ? 'Objectives ▸' : 'Objectives ▾');

    replaceChildren(
      this.element,
      toggle,
      !this.collapsed &&
        h('div', { className: 'objectives-list' },
          ...quests.map(({ quest, objectives }) =>
            h('div', { className: `objective-quest category-${quest.category}` },
              h('p', { className: 'objective-quest-name' }, quest.name),
              h('ul', {},
                ...objectives.map(({ objective, progress, goal, done }) =>
                  h('li', { className: done ? 'done' : '' },
                    h('span', { className: 'objective-check' }, done ? '✓' : '◇'),
                    objective.label,
                    goal > 1 && h('span', { className: 'objective-count' }, ` ${progress}/${goal}`),
                  ),
                ),
              ),
            ),
          ),
        ),
    );
  }
}
