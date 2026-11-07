import { GAME_CONTENT, relativeThreat } from '@containment/shared';
import type { WorldState } from '../state/worldState.ts';
import { h } from '../ui/dom.ts';

export class VitalsPanel {
  readonly element: HTMLElement;
  readonly targetElement: HTMLElement;
  private readonly integrityFill = h('span', { className: 'vitals-fill' });
  private readonly integrityText = h('span', { className: 'vitals-value' });
  private readonly targetName = h('span', { className: 'target-name' });
  private readonly targetLevel = h('span', { className: 'target-level' });
  private readonly targetFill = h('span', { className: 'vitals-fill' });
  private readonly targetText = h('span', { className: 'vitals-value' });

  constructor() {
    this.element = h('section', { className: 'hud-vitals panel' },
      h('div', { className: 'vitals-header' }, h('span', { className: 'vitals-label' }, 'Integrity'), this.integrityText),
      h('div', { className: 'vitals-bar' }, this.integrityFill),
    );
    this.targetElement = h('section', { className: 'hud-target panel', hidden: true },
      h('div', { className: 'vitals-header' }, h('span', {}, this.targetName, ' ', this.targetLevel), this.targetText),
      h('div', { className: 'vitals-bar' }, this.targetFill),
    );
  }

  update(world: WorldState): void {
    const vitals = world.selfVitals;
    if (vitals) {
      const ratio = vitals.integrity / vitals.maxIntegrity;
      this.integrityFill.style.width = `${ratio * 100}%`;
      this.integrityFill.dataset.state = ratio > 0.5 ? 'healthy' : ratio > 0.25 ? 'wounded' : 'critical';
      this.integrityText.textContent = `${vitals.integrity} / ${vitals.maxIntegrity}`;
    }

    const target = world.combatTargetId ? world.entities.get(world.combatTargetId) : undefined;
    if (!target?.vitals || target.dyingAt !== null) {
      this.targetElement.hidden = true;
      return;
    }
    const creature = target.creatureId ? GAME_CONTENT.creatures.get(target.creatureId) : undefined;
    const ratio = target.vitals.integrity / target.vitals.maxIntegrity;
    this.targetElement.hidden = false;
    this.targetName.textContent = target.name;
    this.targetLevel.textContent = creature ? `Lv ${creature.level}` : '';
    this.targetLevel.dataset.threat = creature && world.self ? relativeThreat(world.self.combatLevel, creature.level) : 'even';
    this.targetFill.style.width = `${ratio * 100}%`;
    this.targetFill.dataset.state = ratio > 0.5 ? 'healthy' : ratio > 0.25 ? 'wounded' : 'critical';
    this.targetText.textContent = `${target.vitals.integrity} / ${target.vitals.maxIntegrity}`;
  }
}
