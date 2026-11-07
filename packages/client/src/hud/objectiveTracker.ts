import { focusedQuest, GAME_CONTENT, type QuestLog } from '@containment/shared';
import type { QuestTracking } from '../state/questTracking.ts';
import { h, replaceChildren } from '../ui/dom.ts';

export class ObjectiveTracker {
  readonly element = h('aside', { className: 'hud-objectives' });
  private collapsed = false;
  private log: QuestLog = {};
  private readonly tracking: QuestTracking;

  constructor(tracking: QuestTracking) {
    this.tracking = tracking;
    tracking.onChange(() => this.render());
  }

  update(log: QuestLog): void {
    this.log = log;
    this.render();
  }

  private render(): void {
    const focused = focusedQuest(this.log, GAME_CONTENT.quests, this.tracking.questId);
    if (!focused) {
      replaceChildren(this.element);
      return;
    }
    const { quest, objectives } = focused;
    const toggle = h('button', { className: 'objectives-toggle', type: 'button', onclick: () => {
      this.collapsed = !this.collapsed;
      this.render();
    } }, this.collapsed ? 'Objectives ▸' : 'Objectives ▾');

    replaceChildren(
      this.element,
      toggle,
      !this.collapsed &&
        h('div', { className: 'objectives-list' },
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
    );
  }
}
