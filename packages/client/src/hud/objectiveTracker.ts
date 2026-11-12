import { trackedQuest, GAME_CONTENT, type QuestLog } from '@containment/shared';
import type { GuidanceTracking } from '../state/guidanceTracking.ts';
import { h, replaceChildren } from '../ui/dom.ts';

export class ObjectiveTracker {
  readonly element = h('aside', { className: 'hud-objectives' });
  private collapsed = false;
  private log: QuestLog = {};
  private via: string | null = null;
  private readonly tracking: GuidanceTracking;

  constructor(tracking: GuidanceTracking) {
    this.tracking = tracking;
    tracking.onChange(() => this.render());
  }

  update(log: QuestLog): void {
    this.log = log;
    this.render();
  }

  setVia(via: string | null): void {
    if (via === this.via) return;
    this.via = via;
    this.render();
  }

  private render(): void {
    const tracked = trackedQuest(this.log, GAME_CONTENT.quests, this.tracking.questId);
    if (!tracked) {
      replaceChildren(this.element);
      return;
    }
    const { quest, objectives } = tracked;
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
            this.via && h('p', { className: 'objective-via' }, `Next: ${this.via}`),
          ),
        ),
    );
  }
}
