import type { WorldState } from '../state/worldState.ts';
import { h } from '../ui/dom.ts';

export class VitalsPanel {
  readonly element: HTMLElement;
  private readonly integrityFill = h('span', { className: 'vitals-fill' });
  private readonly integrityText = h('span', { className: 'vitals-value' });
  private selfSignature = '';

  constructor() {
    this.element = h('section', { className: 'hud-vitals' },
      h('div', { className: 'vitals-header' }, h('span', { className: 'vitals-label' }, 'Integrity'), this.integrityText),
      h('div', { className: 'vitals-bar' }, this.integrityFill),
    );
  }

  update(world: WorldState): void {
    const vitals = world.selfVitals;
    const alert = world.combatTargetId !== null || (vitals !== null && vitals.integrity < vitals.maxIntegrity);
    this.element.classList.toggle('alert', alert);
    const selfSignature = vitals ? `${vitals.integrity}/${vitals.maxIntegrity}` : '';
    if (!vitals || selfSignature === this.selfSignature) return;
    this.selfSignature = selfSignature;
    const ratio = vitals.integrity / vitals.maxIntegrity;
    this.integrityFill.style.width = `${ratio * 100}%`;
    this.integrityFill.dataset.state = ratio > 0.5 ? 'healthy' : ratio > 0.25 ? 'wounded' : 'critical';
    this.integrityText.textContent = `${vitals.integrity} / ${vitals.maxIntegrity}`;
  }
}
