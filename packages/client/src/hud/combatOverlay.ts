import { containmentBlocker, containmentReadiness, containmentResearchEdge, containmentThreshold, GAME_CONTENT, type EntityId } from '@containment/shared';
import type { GameRenderer } from '../render/gameRenderer.ts';
import type { PickTarget } from '../render/pickTarget.ts';
import type { ClientEntity, CombatHitEvent, WorldState } from '../state/worldState.ts';
import { h, replaceChildren } from '../ui/dom.ts';

interface Splat {
  readonly element: HTMLElement;
  readonly entityId: EntityId;
  readonly at: number;
  readonly offset: number;
}

interface OverheadBar {
  readonly element: HTMLElement;
  readonly fill: HTMLElement;
  readonly threshold: HTMLElement;
  readonly phases: HTMLElement;
  readonly chip: HTMLElement;
  readonly label: HTMLElement;
  signature: string;
}

type ContainState = 'none' | 'locked' | 'strong' | 'ready';

const SPLAT_LIFETIME_MS = 1100;
const SPLAT_RISE_PIXELS = 30;
const NODE_WORK_VISIBLE_MS = 4000;
const ENTITY_BAR_LIFT = 0.18;
const NODE_BAR_LIFT = 0.3;

const OFFSCREEN_MARGIN = 60;

const onScreen = (anchor: { x: number; y: number; visible: boolean } | null): boolean =>
  anchor !== null && anchor.visible && anchor.x > -OFFSCREEN_MARGIN && anchor.y > -OFFSCREEN_MARGIN && anchor.x < window.innerWidth + OFFSCREEN_MARGIN && anchor.y < window.innerHeight + OFFSCREEN_MARGIN;

const healthState = (ratio: number): string => (ratio > 0.5 ? 'healthy' : ratio > 0.25 ? 'wounded' : 'critical');

export class CombatOverlay {
  readonly element = h('div', { className: 'combat-layer' });
  private splats: Splat[] = [];
  private readonly entityBars = new Map<EntityId, OverheadBar>();
  private readonly nodeBars = new Map<string, OverheadBar>();
  private readonly unsubscribe: () => void;
  private readonly world: WorldState;

  constructor(world: WorldState) {
    this.world = world;
    this.unsubscribe = world.onCombatHit((event) => this.addSplat(event));
  }

  update(world: WorldState, renderer: GameRenderer, now: number, hover: PickTarget | null): void {
    this.updateSplats(renderer, now);
    this.updateEntityBars(world, renderer, now);
    this.updateNodeBars(world, renderer, now, hover);
  }

  dispose(): void {
    this.unsubscribe();
  }

  private updateSplats(renderer: GameRenderer, now: number): void {
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
  }

  private updateEntityBars(world: WorldState, renderer: GameRenderer, now: number): void {
    const visible = new Set<EntityId>();
    for (const entity of world.entities.values()) {
      if (!entity.vitals || entity.dyingAt !== null) continue;
      const anchor = renderer.anchorFor(entity.id, now, ENTITY_BAR_LIFT);
      if (!anchor || !onScreen(anchor)) continue;
      visible.add(entity.id);
      const bar = this.entityBars.get(entity.id) ?? this.createBar(this.entityBars, entity.id, entity.id === world.selfEntityId ? 'self' : entity.kind);
      this.paintEntity(bar, entity, world);
      bar.element.style.transform = `translate(${Math.round(anchor.x)}px, ${Math.round(anchor.y)}px) translate(-50%, -100%)`;
    }
    this.prune(this.entityBars, visible);
  }

  private paintEntity(bar: OverheadBar, entity: ClientEntity, world: WorldState): void {
    const vitals = entity.vitals;
    if (!vitals) return;
    const creature = entity.creatureId ? GAME_CONTENT.creatures.get(entity.creatureId) : undefined;
    const skills = world.self?.skills;
    const targeted = entity.id === world.combatTargetId;
    const signature = `${vitals.integrity}/${vitals.maxIntegrity}|${entity.phase}|${targeted}|${creature?.containment && skills ? `${skills.containment}/${skills.research}` : ''}`;
    if (signature === bar.signature) return;
    bar.signature = signature;
    bar.element.dataset.target = String(targeted);
    bar.label.hidden = !targeted;
    if (targeted) {
      replaceChildren(
        bar.label,
        h('span', { className: 'overhead-name' }, entity.name),
        entity.level !== undefined && h('span', { className: 'overhead-level' }, ` Lv ${entity.level}`),
        h('span', { className: 'overhead-numbers' }, ` ${vitals.integrity}/${vitals.maxIntegrity}`),
      );
    }
    const ratio = Math.max(0, Math.min(1, vitals.integrity / vitals.maxIntegrity));
    bar.fill.style.width = `${ratio * 100}%`;
    bar.fill.dataset.state = healthState(ratio);

    const phases = creature?.encounter?.phases ?? [];
    bar.phases.replaceChildren(...phases.map((phase, index) => {
      const pip = h('span', { className: 'overhead-phase' });
      pip.style.left = `${phase.belowIntegrity * 100}%`;
      pip.dataset.reached = String(index < entity.phase);
      return pip;
    }));

    const profile = creature?.containment;
    let state: ContainState = 'none';
    if (creature && profile && skills) {
      const threshold = containmentThreshold(vitals.maxIntegrity, containmentResearchEdge(creature, skills));
      bar.threshold.style.left = `${Math.min(100, (threshold / vitals.maxIntegrity) * 100)}%`;
      state = containmentReadiness(creature, skills) ? 'locked' : containmentBlocker(creature, vitals.integrity, skills) ? 'strong' : 'ready';
    }
    bar.element.dataset.contain = state;
    bar.threshold.hidden = state === 'none';
    bar.chip.hidden = state !== 'ready';
  }

  private updateNodeBars(world: WorldState, renderer: GameRenderer, now: number, hover: PickTarget | null): void {
    const candidates = new Set<string>(world.nodeCharges.keys());
    for (const [instanceId, at] of world.workedObjects) {
      if (now - at < NODE_WORK_VISIBLE_MS) candidates.add(instanceId);
    }
    if (hover?.kind === 'object') candidates.add(hover.instanceId);
    const visible = new Set<string>();
    for (const instanceId of candidates) {
      if (world.depletedObjects.has(instanceId)) continue;
      const capacity = renderer.objectDefinition(instanceId)?.interactions.find((interaction) => interaction.gather)?.gather?.charges;
      if (!capacity) continue;
      const anchor = renderer.objectAnchor(instanceId, NODE_BAR_LIFT);
      if (!anchor || !onScreen(anchor)) continue;
      visible.add(instanceId);
      const bar = this.nodeBars.get(instanceId) ?? this.createBar(this.nodeBars, instanceId, 'node');
      const remaining = world.nodeCharges.get(instanceId) ?? capacity;
      const signature = `${remaining}/${capacity}`;
      if (signature !== bar.signature) {
        bar.signature = signature;
        bar.fill.style.width = `${Math.max(0, Math.min(1, remaining / capacity)) * 100}%`;
      }
      bar.element.style.transform = `translate(${Math.round(anchor.x)}px, ${Math.round(anchor.y)}px) translate(-50%, -100%)`;
    }
    this.prune(this.nodeBars, visible);
  }

  private prune<K>(bars: Map<K, OverheadBar>, visible: ReadonlySet<K>): void {
    for (const [key, bar] of bars) {
      if (visible.has(key)) continue;
      bar.element.remove();
      bars.delete(key);
    }
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

  private createBar<K>(bars: Map<K, OverheadBar>, key: K, kind: string): OverheadBar {
    const fill = h('span', { className: 'overhead-bar-fill' });
    const threshold = h('span', { className: 'overhead-threshold', hidden: true });
    const phases = h('span', { className: 'overhead-phases' });
    const chip = h('span', { className: 'overhead-chip', hidden: true }, 'Contain');
    const label = h('span', { className: 'overhead-label', hidden: true });
    const track = h('div', { className: 'overhead-track' }, fill, phases, threshold);
    const element = h('div', { className: 'overhead-bar' }, label, chip, track);
    element.dataset.kind = kind;
    this.element.prepend(element);
    const bar = { element, fill, threshold, phases, chip, label, signature: '' };
    bars.set(key, bar);
    return bar;
  }
}
