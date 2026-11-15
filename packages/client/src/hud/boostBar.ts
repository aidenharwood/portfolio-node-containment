import { boostGroups, formatBoostDuration, GAME_CONTENT, STAT_SHORT_NAMES, supersededStats, type BoostView } from '@containment/shared';
import { itemIconUrl } from '../render/items/itemSprites.ts';
import type { WorldState } from '../state/worldState.ts';
import { h } from '../ui/dom.ts';
import { attachItemTooltip } from '../ui/itemTooltip.ts';

const WARNING_MS = 20_000;

interface Chip {
  readonly element: HTMLElement;
  readonly timer: HTMLElement;
  readonly sweep: HTMLElement;
  readonly stats: HTMLElement;
}

export class BoostBar {
  readonly element = h('section', { className: 'hud-boosts', hidden: true, ariaLabel: 'Active boosts' });
  private readonly chips = new Map<string, Chip>();
  private boosts: readonly BoostView[] = [];
  private receivedAt = 0;
  private source: readonly BoostView[] | null = null;

  update(world: WorldState, now: number): void {
    const boosts = world.self?.boosts ?? [];
    if (boosts !== this.source) {
      this.source = boosts;
      this.boosts = boosts;
      this.receivedAt = now;
      this.rebuild();
    }
    const elapsed = now - this.receivedAt;
    for (const boost of this.boosts) {
      const chip = this.chips.get(boost.itemId);
      if (!chip) continue;
      const remaining = Math.max(0, boost.remainingMs - elapsed);
      const text = formatBoostDuration(remaining);
      if (chip.timer.textContent !== text) chip.timer.textContent = text;
      chip.sweep.style.transform = `scaleX(${boost.durationMs > 0 ? remaining / boost.durationMs : 0})`;
      if (chip.element.dataset.state !== 'superseded') chip.element.dataset.state = remaining <= WARNING_MS ? 'ending' : 'active';
    }
  }

  private rebuild(): void {
    const live = new Set(this.boosts.map((boost) => boost.itemId));
    for (const [itemId, chip] of this.chips) {
      if (!live.has(itemId)) {
        chip.element.remove();
        this.chips.delete(itemId);
      }
    }
    for (const boost of this.boosts) {
      const chip = this.chips.get(boost.itemId) ?? this.createChip(boost);
      this.element.append(chip.element);
      const superseded = supersededStats(this.boosts, boost.itemId);
      const groups = boostGroups(boost.stats);
      chip.stats.replaceChildren(
        ...groups.map((group) => {
          const outranked = group.stats.every((id) => superseded.has(id));
          return h('span', { className: `boost-stat${outranked ? ' superseded' : ''}` }, `+${group.value} ${group.stats.map((id) => STAT_SHORT_NAMES[id]).join('/')}`);
        }),
      );
      const allSuperseded = groups.length > 0 && groups.every((group) => group.stats.every((id) => superseded.has(id)));
      chip.element.dataset.state = allSuperseded ? 'superseded' : 'active';
    }
    this.element.hidden = this.boosts.length === 0;
  }

  private createChip(boost: BoostView): Chip {
    const item = GAME_CONTENT.items.get(boost.itemId);
    const timer = h('span', { className: 'boost-timer' });
    const sweep = h('span', { className: 'boost-sweep' });
    const stats = h('span', { className: 'boost-stats' });
    const element = h(
      'div',
      { className: 'boost-chip' },
      item ? h('img', { className: 'boost-icon', src: itemIconUrl(item), alt: item.name }) : null,
      h('span', { className: 'boost-body' }, stats, timer, h('span', { className: 'boost-track' }, sweep)),
    );
    if (item) attachItemTooltip(element, () => item);
    const chip = { element, timer, sweep, stats };
    this.chips.set(boost.itemId, chip);
    return chip;
  }
}
