import { GAME_CONTENT, levelForExperience, salvageGuide, type SalvageGuideEntry, type SalvageGuideLocation } from '@containment/shared';
import { itemIconUrl } from '../render/items/itemSprites.ts';
import type { GuidanceTracking } from '../state/guidanceTracking.ts';
import type { WorldState } from '../state/worldState.ts';
import { h, replaceChildren } from '../ui/dom.ts';

const ENTRIES = salvageGuide(GAME_CONTENT);

const placeName = (location: SalvageGuideLocation): string => `${location.districtName || location.levelName} (${location.count})`;

export class SalvageGuideWindow {
  readonly element = h('section', { className: 'salvage-guide-window panel', hidden: true, role: 'dialog', ariaLabel: 'Salvage guide' });
  private readonly world: WorldState;
  private readonly tracking: GuidanceTracking;
  private readonly list = h('div', { className: 'salvage-guide-list' });
  private readonly summary = h('p', { className: 'shop-greeting' });
  private open = false;
  private readonly unsubscribe: () => void;

  constructor(world: WorldState, tracking: GuidanceTracking) {
    this.world = world;
    this.tracking = tracking;
    tracking.onChange(() => this.render());
    this.unsubscribe = world.on('selfChanged', () => this.render());
    replaceChildren(
      this.element,
      h('header', { className: 'shop-header' },
        h('div', {}, h('h3', {}, 'Salvage Guide'), this.summary),
        h('button', { className: 'dialogue-close', type: 'button', ariaLabel: 'Close salvage guide', onclick: () => this.hide() }, '×'),
      ),
      this.list,
    );
  }

  get isOpen(): boolean {
    return this.open;
  }

  show(): void {
    this.open = true;
    this.element.hidden = false;
    this.render();
    this.list.querySelector<HTMLElement>('.salvage-guide-row.current')?.scrollIntoView({ block: 'center' });
  }

  hide(): void {
    this.open = false;
    this.element.hidden = true;
  }

  dispose(): void {
    this.unsubscribe();
  }

  private render(): void {
    const self = this.world.self;
    if (!this.open || !self) return;
    const level = levelForExperience(self.skills.salvage);
    const next = ENTRIES.find((entry) => entry.level > level);
    const current = ENTRIES.filter((entry) => entry.level <= level).at(-1);
    this.summary.textContent = next ? `Salvage ${level} · next unlock at ${next.level}` : `Salvage ${level} · all nodes unlocked`;
    const scroll = this.list.scrollTop;
    replaceChildren(this.list, ...ENTRIES.map((entry) => this.row(entry, level, entry === next, entry === current)));
    this.list.scrollTop = scroll;
  }

  private row(entry: SalvageGuideEntry, level: number, isNext: boolean, isCurrent: boolean): HTMLElement {
    const locked = entry.level > level;
    const tracked = this.tracking.resourceId === entry.objectId;
    const item = GAME_CONTENT.items.get(entry.itemId);
    const classes = ['salvage-guide-row', locked && 'locked', isNext && 'next', isCurrent && 'current'].filter(Boolean).join(' ');
    return h('div', { className: classes },
      item ? h('img', { className: 'salvage-guide-icon', src: itemIconUrl(item), alt: '' }) : h('span', { className: 'salvage-guide-icon' }),
      h('div', { className: 'salvage-guide-text' },
        h('p', { className: 'salvage-guide-name' }, entry.name, h('span', { className: 'salvage-guide-level' }, ` Lv ${entry.level}`)),
        h('p', { className: 'salvage-guide-yield' }, `${item?.name ?? entry.itemId} · +${entry.experience} xp${locked ? ` · Requires Lv ${entry.level}` : ''}`),
        h('p', { className: 'salvage-guide-where' }, entry.locations.length > 0 ? entry.locations.map(placeName).join(', ') : 'Not yet sighted'),
      ),
      h('button', {
        className: `button small salvage-guide-track${tracked ? ' tracking' : ''}`,
        type: 'button',
        ariaPressed: tracked ? 'true' : 'false',
        onclick: () => (tracked ? this.tracking.untrack() : this.tracking.trackResource(entry.objectId)),
      }, tracked ? 'Tracking ◆' : 'Track'),
    );
  }
}
