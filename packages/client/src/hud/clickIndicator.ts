import { h } from '../ui/dom.ts';

export type ClickTone = 'walk' | 'interact';

export class ClickIndicator {
  readonly element = h('div', { className: 'click-indicator', hidden: true });

  show(clientX: number, clientY: number, tone: ClickTone): void {
    const element = this.element;
    element.hidden = false;
    element.style.left = `${clientX}px`;
    element.style.top = `${clientY}px`;
    element.dataset.tone = tone;
    element.classList.remove('playing');
    void element.offsetWidth;
    element.classList.add('playing');
  }
}
