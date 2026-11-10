import { CONTAINMENT_CLASS_INFO, containmentBlocker, containmentThreshold, GAME_CONTENT, relativeThreat } from '@containment/shared';
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
  private readonly targetClass = h('span', { className: 'target-class' });
  private readonly targetThreshold = h('span', { className: 'vitals-threshold' });
  private readonly containButton: HTMLButtonElement;
  private readonly containRow: HTMLElement;
  private readonly containHint = h('span', { className: 'contain-hint' });
  private containTargetId: string | null = null;
  private selfSignature = '';
  private targetSignature = '';

  constructor(onContain: (entityId: string) => void) {
    this.containButton = h('button', {
      className: 'contain-button',
      type: 'button',
      onclick: () => {
        if (this.containTargetId) onContain(this.containTargetId);
      },
    }, 'Contain');
    this.containRow = h('div', { className: 'contain-row', hidden: true }, this.containButton, this.containHint);
    this.element = h('section', { className: 'hud-vitals' },
      h('div', { className: 'vitals-header' }, h('span', { className: 'vitals-label' }, 'Integrity'), this.integrityText),
      h('div', { className: 'vitals-bar' }, this.integrityFill),
    );
    this.targetElement = h('section', { className: 'hud-target panel', hidden: true },
      h('div', { className: 'vitals-header' }, h('span', {}, this.targetName, ' ', this.targetLevel, ' ', this.targetClass), this.targetText),
      h('div', { className: 'vitals-bar' }, this.targetFill, this.targetThreshold),
      this.containRow,
    );
  }

  update(world: WorldState): void {
    const vitals = world.selfVitals;
    const selfSignature = vitals ? `${vitals.integrity}/${vitals.maxIntegrity}` : '';
    if (vitals && selfSignature !== this.selfSignature) {
      this.selfSignature = selfSignature;
      const ratio = vitals.integrity / vitals.maxIntegrity;
      this.integrityFill.style.width = `${ratio * 100}%`;
      this.integrityFill.dataset.state = ratio > 0.5 ? 'healthy' : ratio > 0.25 ? 'wounded' : 'critical';
      this.integrityText.textContent = `${vitals.integrity} / ${vitals.maxIntegrity}`;
    }

    const target = world.combatTargetId ? world.entities.get(world.combatTargetId) : undefined;
    if (!target?.vitals || target.dyingAt !== null) {
      this.targetElement.hidden = true;
      this.targetSignature = '';
      return;
    }
    const combatLevel = world.self?.combatLevel ?? 0;
    const self = world.self;
    const targetSignature = `${target.id}|${target.name}|${target.vitals.integrity}/${target.vitals.maxIntegrity}|${combatLevel}|${self?.skills.containment}|${JSON.stringify(self?.inventory)}`;
    if (targetSignature === this.targetSignature) return;
    this.targetSignature = targetSignature;
    const creature = target.creatureId ? GAME_CONTENT.creatures.get(target.creatureId) : undefined;
    const ratio = target.vitals.integrity / target.vitals.maxIntegrity;
    this.targetElement.hidden = false;
    this.targetName.textContent = target.name;
    this.targetLevel.textContent = creature ? `Lv ${creature.level}` : '';
    this.targetLevel.dataset.threat = creature && world.self ? relativeThreat(world.self.combatLevel, creature.level) : 'even';
    this.targetFill.style.width = `${ratio * 100}%`;
    this.targetFill.dataset.state = ratio > 0.5 ? 'healthy' : ratio > 0.25 ? 'wounded' : 'critical';
    this.targetText.textContent = `${target.vitals.integrity} / ${target.vitals.maxIntegrity}`;

    const profile = creature?.containment;
    this.containTargetId = profile ? target.id : null;
    this.containRow.hidden = !profile;
    this.targetThreshold.hidden = !profile;
    this.targetClass.textContent = profile ? CONTAINMENT_CLASS_INFO[profile.containmentClass].name : '';
    this.targetClass.dataset.class = profile?.containmentClass ?? '';
    if (!creature || !profile || !self) return;
    this.targetThreshold.style.left = `${(containmentThreshold(target.vitals.maxIntegrity) / target.vitals.maxIntegrity) * 100}%`;
    const blocker = containmentBlocker(creature, target.vitals.integrity, self.skills, self.containmentClearance);
    this.containButton.disabled = blocker !== null;
    this.containButton.title = blocker ?? `Seal ${target.name} now.`;
    this.containHint.textContent = blocker ?? 'Weakened. Seal it now.';
    this.containRow.dataset.ready = String(blocker === null);
  }
}
