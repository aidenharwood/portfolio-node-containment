import { countItem, GAME_CONTENT, levelForExperience, salvageSourceOf, trackedQuest, type SelfState, type WorldObjectId } from '@containment/shared';
import type { GuidanceTracking } from '../state/guidanceTracking.ts';
import { h, replaceChildren } from '../ui/dom.ts';

interface RouteStatus {
  readonly via: string | null;
  readonly exhausted: boolean;
  readonly unreachable: boolean;
}

export class ObjectiveTracker {
  readonly element = h('aside', { className: 'hud-objectives' });
  private collapsed = false;
  private self: SelfState | null = null;
  private route: RouteStatus = { via: null, exhausted: false, unreachable: false };
  private readonly tracking: GuidanceTracking;

  constructor(tracking: GuidanceTracking) {
    this.tracking = tracking;
    tracking.onChange(() => this.render());
  }

  update(self: SelfState): void {
    this.self = self;
    this.render();
  }

  setRoute(via: string | null, exhausted: boolean, unreachable: boolean): void {
    const route = this.route;
    if (route.via === via && route.exhausted === exhausted && route.unreachable === unreachable) return;
    this.route = { via, exhausted, unreachable };
    this.render();
  }

  private render(): void {
    const self = this.self;
    const resourceId = this.tracking.resourceId;
    const block = !self ? null : resourceId ? this.resourceBlock(self, resourceId) : this.questBlock(self);
    if (!block) {
      replaceChildren(this.element);
      return;
    }
    const toggle = h('button', { className: 'objectives-toggle', type: 'button', onclick: () => {
      this.collapsed = !this.collapsed;
      this.render();
    } }, this.collapsed ? 'Objectives ▸' : 'Objectives ▾');
    replaceChildren(this.element, toggle, !this.collapsed && h('div', { className: 'objectives-list' }, block));
  }

  private questBlock(self: SelfState): HTMLElement | null {
    const tracked = trackedQuest(self.quests, GAME_CONTENT.quests, this.tracking.questId);
    if (!tracked) return null;
    const { quest, objectives } = tracked;
    return h('div', { className: `objective-quest category-${quest.category}` },
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
      this.route.via && h('p', { className: 'objective-via' }, `Next: ${this.route.via}`),
    );
  }

  private resourceBlock(self: SelfState, resourceId: WorldObjectId): HTMLElement | null {
    const definition = GAME_CONTENT.worldObjects.get(resourceId);
    const source = definition && salvageSourceOf(definition);
    if (!definition || !source) return null;
    const locked = levelForExperience(self.skills.salvage) < source.level;
    const item = GAME_CONTENT.items.get(source.itemId);
    const { via, exhausted, unreachable } = this.route;
    const status = unreachable ? 'No known route' : exhausted ? 'All nearby nodes respawning' : via ? `Next: ${via}` : null;
    return h('div', { className: 'objective-quest objective-resource' },
      h('p', { className: 'objective-quest-name' },
        definition.name,
        h('span', { className: `objective-resource-level${locked ? ' objective-locked' : ''}` }, ` Lv ${source.level}`),
        h('button', { className: 'objectives-untrack', type: 'button', ariaLabel: 'Stop tracking', onclick: () => this.tracking.untrack() }, '×'),
      ),
      h('ul', {},
        h('li', {},
          h('span', { className: 'objective-check' }, '◇'),
          item?.name ?? source.itemId,
          h('span', { className: 'objective-count' }, ` ×${countItem(self.inventory, source.itemId)}`),
        ),
      ),
      status && h('p', { className: 'objective-via' }, status),
    );
  }
}
