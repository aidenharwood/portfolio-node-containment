import type { PlayerActivityView } from '@containment/shared';
import type { GameConnection } from '../net/gameConnection.ts';
import type { WorldState } from '../state/worldState.ts';
import { h, replaceChildren } from '../ui/dom.ts';

export class ActivityBar {
  readonly element = h('div', { className: 'activity-bar', hidden: true, role: 'status' });
  private readonly fill = h('div', { className: 'activity-fill' });
  private readonly unsubscribe: () => void;
  private readonly world: WorldState;

  constructor(connection: GameConnection, world: WorldState) {
    this.world = world;
    this.unsubscribe = connection.on('player.activity', ({ activity }) => this.show(activity));
  }

  dispose(): void {
    this.unsubscribe();
  }

  private show(activity: PlayerActivityView | null): void {
    this.element.hidden = !activity;
    if (!activity) return;
    const label = activity.remaining && activity.remaining > 1 ? `${activity.label} · ${activity.remaining} left` : activity.label;
    replaceChildren(this.element, h('span', { className: 'activity-label' }, label), h('div', { className: 'activity-track' }, this.fill));
    this.fill.style.animationDuration = `${Math.max(1, activity.ticksPerAction) * this.world.tickMs}ms`;
    this.fill.classList.remove('running');
    void this.fill.offsetWidth;
    this.fill.classList.add('running');
  }
}
