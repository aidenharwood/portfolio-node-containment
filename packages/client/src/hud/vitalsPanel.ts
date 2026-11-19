import type { WorldState } from '../state/worldState.ts';
import { h, replaceChildren } from '../ui/dom.ts';

export class VitalsPanel {
  readonly element: HTMLElement;
  private readonly integrityFill = h('span', { className: 'vitals-fill' });
  private readonly integrityText = h('span', { className: 'vitals-value' });
  private selfSignature = '';
  private targetSignature = '';
  private readonly target = h('div', { className: 'vitals-target', hidden: true });

  constructor() {
    this.element = h('section', { className: 'hud-vitals' },
      h('div', { className: 'vitals-header' }, h('span', { className: 'vitals-label' }, 'Integrity'), this.integrityText),
      h('div', { className: 'vitals-bar' }, this.integrityFill),
      this.target,
    );
  }

  private paintTarget(world: WorldState): void {
    const entity = world.combatTargetId ? world.entities.get(world.combatTargetId) : undefined;
    const vitals = entity?.vitals;
    const signature = entity && vitals ? `${entity.id}|${vitals.integrity}/${vitals.maxIntegrity}` : '';
    if (signature === this.targetSignature) return;
    this.targetSignature = signature;
    this.target.hidden = !entity || !vitals;
    if (!entity || !vitals) return;
    const ratio = Math.max(0, Math.min(1, vitals.integrity / vitals.maxIntegrity));
    replaceChildren(
      this.target,
      h('span', { className: 'vitals-target-name' }, entity.name, entity.level !== undefined && h('span', { className: 'vitals-target-level' }, ` Lv ${entity.level}`)),
      h('span', { className: 'vitals-target-bar' }, h('span', { style: { width: `${ratio * 100}%` } })),
      h('span', { className: 'vitals-target-value' }, `${vitals.integrity}/${vitals.maxIntegrity}`),
    );
  }

  update(world: WorldState): void {
    const vitals = world.selfVitals;
    const alert = world.combatTargetId !== null || (vitals !== null && vitals.integrity < vitals.maxIntegrity);
    this.element.classList.toggle('alert', alert);
    this.paintTarget(world);
    const selfSignature = vitals ? `${vitals.integrity}/${vitals.maxIntegrity}` : '';
    if (!vitals || selfSignature === this.selfSignature) return;
    this.selfSignature = selfSignature;
    const ratio = vitals.integrity / vitals.maxIntegrity;
    this.integrityFill.style.width = `${ratio * 100}%`;
    this.integrityFill.dataset.state = ratio > 0.5 ? 'healthy' : ratio > 0.25 ? 'wounded' : 'critical';
    this.integrityText.textContent = `${vitals.integrity} / ${vitals.maxIntegrity}`;
  }
}
