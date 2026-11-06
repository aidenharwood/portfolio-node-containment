import type { EntityId } from '@containment/shared';
import type { GameRenderer } from '../render/gameRenderer.ts';
import type { WorldState } from '../state/worldState.ts';
import { h } from '../ui/dom.ts';

export class SpeechLayer {
  readonly element = h('div', { className: 'speech-layer' });
  private readonly bubbles = new Map<EntityId, { element: HTMLElement; text: string }>();

  update(world: WorldState, renderer: GameRenderer, now: number): void {
    const active = new Set<EntityId>();
    for (const entity of world.entities.values()) {
      if (!entity.speech || entity.speech.until <= now) continue;
      const anchor = renderer.anchorFor(entity.id, now, 0.45);
      if (!anchor) continue;
      active.add(entity.id);
      let bubble = this.bubbles.get(entity.id);
      if (!bubble || bubble.text !== entity.speech.text) {
        bubble?.element.remove();
        bubble = { element: h('div', { className: 'speech-bubble' }, entity.speech.text), text: entity.speech.text };
        this.element.append(bubble.element);
        this.bubbles.set(entity.id, bubble);
      }
      bubble.element.hidden = !anchor.visible;
      bubble.element.style.transform = `translate(${Math.round(anchor.x)}px, ${Math.round(anchor.y)}px) translate(-50%, -100%)`;
    }
    for (const [entityId, bubble] of this.bubbles) {
      if (active.has(entityId)) continue;
      bubble.element.remove();
      this.bubbles.delete(entityId);
    }
  }
}
