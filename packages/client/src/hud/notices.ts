import type { NoticeTone } from '@containment/shared';
import type { GameConnection } from '../net/gameConnection.ts';
import { h } from '../ui/dom.ts';

const VISIBLE_MS = 4200;
const MAX_VISIBLE = 4;

export class Notices {
  readonly element = h('div', { className: 'hud-notices', ariaLive: 'polite' });
  private readonly unsubscribers: (() => void)[];

  constructor(connection: GameConnection) {
    this.unsubscribers = [
      connection.on('notice', ({ tone, text }) => this.show(tone, text)),
      connection.on('error', ({ message }) => this.show('warning', message)),
    ];
  }

  show(tone: NoticeTone, text: string): void {
    const notice = h('div', { className: `notice tone-${tone}` }, text);
    this.element.append(notice);
    while (this.element.childElementCount > MAX_VISIBLE) this.element.firstElementChild?.remove();
    setTimeout(() => notice.classList.add('leaving'), VISIBLE_MS);
    setTimeout(() => notice.remove(), VISIBLE_MS + 400);
  }

  dispose(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
  }
}
