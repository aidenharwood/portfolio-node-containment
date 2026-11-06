import type { ChatChannel } from '@containment/shared';
import type { GameConnection } from '../net/gameConnection.ts';
import { h } from '../ui/dom.ts';

export type ChatLine = { readonly channel: ChatChannel | 'examine'; readonly author?: string; readonly text: string };

type Filter = 'all' | 'game' | 'local';

const MAX_LINES = 150;

const FILTERS: Readonly<Record<Filter, (line: ChatLine) => boolean>> = {
  all: () => true,
  game: (line) => line.channel !== 'local',
  local: (line) => line.channel === 'local',
};

export class ChatLog {
  readonly element: HTMLElement;
  private readonly log: HTMLElement;
  private readonly input: HTMLInputElement;
  private readonly lines: ChatLine[] = [];
  private filter: Filter = 'all';
  private readonly unsubscribe: () => void;

  constructor(connection: GameConnection) {
    this.log = h('div', { className: 'chat-log', role: 'log', ariaLive: 'polite' });
    this.input = h('input', { className: 'chat-input', maxLength: 160, placeholder: 'Press Enter to speak' });
    const form = h('form', { className: 'chat-form' }, h('span', { className: 'chat-prompt' }, '›'), this.input);
    form.onsubmit = (event) => {
      event.preventDefault();
      const text = this.input.value.trim();
      if (text) connection.send({ type: 'chat.say', text });
      this.input.value = '';
      this.input.blur();
    };

    const tabs = (['all', 'game', 'local'] as const).map((filter) =>
      h('button', {
        className: `chat-tab${filter === this.filter ? ' active' : ''}`,
        type: 'button',
        onclick: () => {
          this.filter = filter;
          tabs.forEach((tab, index) => tab.classList.toggle('active', (['all', 'game', 'local'] as const)[index] === filter));
          this.redraw();
        },
      }, filter[0]?.toUpperCase() + filter.slice(1)),
    );

    this.element = h('section', { className: 'hud-chat panel' }, h('div', { className: 'chat-tabs' }, ...tabs), this.log, form);
    this.unsubscribe = connection.on('chat.message', (message) => this.push(message));
  }

  push(line: ChatLine): void {
    this.lines.push(line);
    if (this.lines.length > MAX_LINES) this.lines.shift();
    if (FILTERS[this.filter](line)) {
      this.log.append(renderLine(line));
      while (this.log.childElementCount > MAX_LINES) this.log.firstElementChild?.remove();
      this.log.scrollTop = this.log.scrollHeight;
    }
  }

  focusInput(): void {
    this.input.focus();
  }

  isTyping(): boolean {
    return document.activeElement === this.input;
  }

  dispose(): void {
    this.unsubscribe();
  }

  private redraw(): void {
    this.log.replaceChildren(...this.lines.filter(FILTERS[this.filter]).map(renderLine));
    this.log.scrollTop = this.log.scrollHeight;
  }
}

function renderLine(line: ChatLine): HTMLElement {
  return h('p', { className: `chat-line channel-${line.channel}` }, line.author && h('span', { className: 'chat-author' }, `${line.author}: `), line.text);
}
