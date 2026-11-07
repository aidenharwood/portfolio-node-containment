import type { DialogueView } from '@containment/shared';
import type { GameConnection } from '../net/gameConnection.ts';
import { h, replaceChildren } from '../ui/dom.ts';
import { isCoarsePointer } from '../ui/viewport.ts';

const CHARACTERS_PER_SECOND = 70;

export class DialogueBox {
  readonly element = h('section', { className: 'hud-dialogue panel', hidden: true, ariaLive: 'polite' });
  private readonly connection: GameConnection;
  private readonly unsubscribers: (() => void)[];
  private view: DialogueView | null = null;
  private typing: { timer: number; full: string; target: HTMLElement } | null = null;

  constructor(connection: GameConnection) {
    this.connection = connection;
    this.unsubscribers = [
      connection.on('dialogue.opened', ({ view }) => this.open(view)),
      connection.on('dialogue.closed', () => this.close()),
    ];
    this.element.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('button')) return;
      this.advance();
    });
  }

  get isOpen(): boolean {
    return this.view !== null;
  }

  handleKey(key: string): boolean {
    if (!this.view) return false;
    if (key === 'Escape') {
      this.connection.send({ type: 'dialogue.close' });
      return true;
    }
    if (key === ' ' || key === 'Enter') {
      this.advance();
      return true;
    }
    const number = Number(key);
    const option = this.view.options?.[number - 1];
    if (option) {
      this.connection.send({ type: 'dialogue.choose', optionIndex: option.index });
      return true;
    }
    return false;
  }

  dispose(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.stopTyping();
  }

  private open(view: DialogueView): void {
    this.view = view;
    this.element.hidden = false;
    this.stopTyping();
    const text = h('p', { className: 'dialogue-text' });
    const footer = view.options
      ? h('ol', { className: 'dialogue-options' },
          ...view.options.map((option, position) =>
            h('li', {}, h('button', { type: 'button', onclick: () => this.connection.send({ type: 'dialogue.choose', optionIndex: option.index }) },
              h('span', { className: 'option-key' }, String(position + 1)), option.text)),
          ),
        )
      : h('p', { className: 'dialogue-continue' }, isCoarsePointer() ? 'Tap to continue' : 'Click or press Space to continue');

    this.element.classList.toggle('continuable', !view.options);
    replaceChildren(
      this.element,
      h('header', { className: `dialogue-speaker speaker-${view.speaker}` }, h('span', { className: 'speaker-name' }, view.speakerName), view.speakerTitle && h('span', { className: 'speaker-title' }, view.speakerTitle)),
      text,
      footer,
      h('button', { className: 'dialogue-close', type: 'button', ariaLabel: 'Close dialogue', onclick: () => this.connection.send({ type: 'dialogue.close' }) }, '×'),
    );
    this.typeOut(text, view.text);
  }

  private advance(): void {
    if (this.typing) {
      this.typing.target.textContent = this.typing.full;
      this.stopTyping();
      return;
    }
    if (this.view && !this.view.options) this.connection.send({ type: 'dialogue.continue' });
  }

  private close(): void {
    this.view = null;
    this.stopTyping();
    this.element.hidden = true;
  }

  private typeOut(target: HTMLElement, full: string): void {
    const startedAt = performance.now();
    const step = () => {
      const visible = Math.floor(((performance.now() - startedAt) / 1000) * CHARACTERS_PER_SECOND);
      target.textContent = full.slice(0, visible);
      if (visible >= full.length) this.stopTyping();
    };
    this.typing = { timer: window.setInterval(step, 16), full, target };
  }

  private stopTyping(): void {
    if (this.typing) window.clearInterval(this.typing.timer);
    this.typing = null;
  }
}
