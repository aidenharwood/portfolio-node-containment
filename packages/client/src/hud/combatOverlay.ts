import type { EntityId } from '@containment/shared';
import type { GameRenderer } from '../render/gameRenderer.ts';
import type { CombatHitEvent, WorldState } from '../state/worldState.ts';
import { h } from '../ui/dom.ts';

interface Splat {
  readonly element: HTMLElement;
  readonly entityId: EntityId;
  readonly at: number;
  readonly offset: number;
}

interface HealthBar {
  readonly element: HTMLElement;
  readonly fill: HTMLElement;
}

const SPLAT_LIFETIME_MS = 1100;
const SPLAT_RISE_PIXELS = 30;
const HEALTH_BAR_VISIBLE_MS = 6000;

export class CombatOverlay {
  readonly element = h('div', { className: 'combat-layer' });
  private splats: Splat[] = [];
  private readonly bars = new Map<EntityId, HealthBar>();
  private readonly unsubscribe: () => void;
  private readonly world: WorldState;

  constructor(world: WorldState) {
    this.world = world;
    this.unsubscribe = world.onCombatHit((event) => this.addSplat(event));
  }

  update(world: WorldState, renderer: GameRenderer, now: number): void {
    this.splats = this.splats.filter((splat) => {
      const age = now - splat.at;
      const anchor = renderer.anchorFor(splat.entityId, now, -0.55);
      if (age > SPLAT_LIFETIME_MS || !anchor) {
        splat.element.remove();
        return false;
      }
      if (age < 0) {
        splat.element.hidden = true;
        return true;
      }
      const rise = (age / SPLAT_LIFETIME_MS) * SPLAT_RISE_PIXELS;
      splat.element.style.opacity = String(age < 700 ? 1 : 1 - (age - 700) / 400);
      const pop = age < 140 ? 1.35 - (age / 140) * 0.35 : 1;
      splat.element.style.transform = `translate(${Math.round(anchor.x + splat.offset)}px, ${Math.round(anchor.y - rise)}px) translate(-50%, -50%) scale(${pop})`;
      splat.element.hidden = !anchor.visible;
      return true;
    });

    const visible = new Set<EntityId>();
    for (const entity of world.entities.values()) {
      if (!entity.vitals || entity.dyingAt !== null || now - entity.lastCombatAt > HEALTH_BAR_VISIBLE_MS) continue;
      const anchor = renderer.anchorFor(entity.id, now, 0.18);
      if (!anchor?.visible) continue;
      visible.add(entity.id);
      const bar = this.bars.get(entity.id) ?? this.createBar(entity.id);
      const ratio = Math.max(0, entity.vitals.integrity / entity.vitals.maxIntegrity);
      bar.fill.style.width = `${ratio * 100}%`;
      bar.fill.style.background = ratio > 0.5 ? 'var(--color-success)' : ratio > 0.25 ? 'var(--color-warning)' : 'var(--color-danger)';
      bar.element.style.transform = `translate(${Math.round(anchor.x)}px, ${Math.round(anchor.y)}px) translate(-50%, -100%)`;
    }
    for (const [entityId, bar] of this.bars) {
      if (visible.has(entityId)) continue;
      bar.element.remove();
      this.bars.delete(entityId);
    }
  }

  dispose(): void {
    this.unsubscribe();
  }

  private addSplat(event: CombatHitEvent): void {
    const self = this.world.selfEntityId;
    const perspective = event.attackerId === self ? 'dealt' : event.targetId === self ? 'taken' : 'other';
    const element = h('div', { className: `hit-splat ${event.outcome} ${perspective}` },
      event.outcome === 'miss' ? h('span', { className: 'splat-miss' }, 'MISS') : h('span', { className: 'splat-value' }, String(event.damage)),
    );
    element.hidden = true;
    this.element.append(element);
    const stacked = this.splats.filter((splat) => splat.entityId === event.targetId && Math.abs(event.impactAt - splat.at) < 400).length;
    this.splats.push({ element, entityId: event.targetId, at: event.impactAt, offset: (stacked % 3 - 1) * 18 });
  }

  private createBar(entityId: EntityId): HealthBar {
    const fill = h('span', { className: 'overhead-bar-fill' });
    const element = h('div', { className: 'overhead-bar' }, fill);
    this.element.prepend(element);
    const bar = { element, fill };
    this.bars.set(entityId, bar);
    return bar;
  }
}
