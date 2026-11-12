import { CHAT_HELP, parseChatInput, type ChatChannel, type ChatCommand, type NoticeTone } from '@containment/shared';
import type { GameConnection } from '../net/gameConnection.ts';
import type { SocialState } from '../state/socialState.ts';
import { h } from '../ui/dom.ts';
import { isCoarsePointer, isCompactLayout } from '../ui/viewport.ts';

export interface ChatLineAction {
  readonly label: string;
  run(): void;
}

export type ChatLine = {
  readonly channel: ChatChannel | 'examine' | 'notice';
  readonly author?: string;
  readonly recipient?: string;
  readonly text: string;
  readonly tone?: NoticeTone;
  readonly actions?: readonly ChatLineAction[];
};

type Filter = 'all' | 'game' | 'chat' | 'party' | 'whisper';

const MAX_LINES = 150;

const CONVERSATION = new Set<ChatLine['channel']>(['local', 'site', 'party', 'whisper']);

const FILTERS: Readonly<Record<Filter, { readonly label: string; readonly shows: (line: ChatLine) => boolean }>> = {
  all: { label: 'All', shows: () => true },
  game: { label: 'Game', shows: (line) => !CONVERSATION.has(line.channel) },
  chat: { label: 'Chat', shows: (line) => line.channel === 'local' || line.channel === 'site' },
  party: { label: 'Party', shows: (line) => line.channel === 'party' },
  whisper: { label: 'DMs', shows: (line) => line.channel === 'whisper' },
};

const FILTER_IDS = Object.keys(FILTERS) as Filter[];

export class ChatLog {
  readonly element: HTMLElement;
  private readonly log: HTMLElement;
  private readonly input: HTMLInputElement;
  private readonly collapseToggle: HTMLButtonElement;
  private readonly lines: ChatLine[] = [];
  private filter: Filter = 'all';
  private readonly unsubscribers: (() => void)[];
  private readonly connection: GameConnection;

  constructor(connection: GameConnection, social: SocialState) {
    this.connection = connection;
    this.log = h('div', { className: 'chat-log', role: 'log', ariaLive: 'polite' });
    this.input = h('input', { className: 'chat-input', maxLength: 200, placeholder: isCoarsePointer() ? 'Tap to speak · /help' : 'Press Enter to speak · /help for commands' });
    const form = h('form', { className: 'chat-form' }, h('span', { className: 'chat-prompt' }, '›'), this.input);
    form.onsubmit = (event) => {
      event.preventDefault();
      const command = parseChatInput(this.input.value);
      if (command) this.run(command);
      this.input.value = '';
      this.input.blur();
    };

    const tabs = FILTER_IDS.map((filter) =>
      h('button', {
        className: `chat-tab${filter === this.filter ? ' active' : ''}`,
        type: 'button',
        onclick: () => {
          this.filter = filter;
          tabs.forEach((tab, index) => tab.classList.toggle('active', FILTER_IDS[index] === filter));
          this.redraw();
        },
      }, FILTERS[filter].label),
    );

    this.collapseToggle = h('button', {
      className: 'chat-collapse',
      type: 'button',
      onclick: () => this.setCollapsed(!this.element.classList.contains('collapsed')),
    });

    this.element = h('section', { className: 'hud-chat' }, h('div', { className: 'chat-panel panel' }, h('div', { className: 'chat-tabs' }, ...tabs, this.collapseToggle), this.log, form));
    this.setCollapsed(isCompactLayout());
    this.unsubscribers = [
      connection.on('chat.message', (message) => this.push(message)),
      connection.on('notice', ({ tone, text }) => this.push({ channel: 'notice', tone, text })),
      connection.on('encounter.phase', ({ announce }) => this.push({ channel: 'notice', tone: 'warning', text: announce })),
      connection.on('error', ({ message }) => this.push({ channel: 'notice', tone: 'warning', text: message })),
      connection.on('party.invited', ({ inviterId, inviterName }) => this.push({
        channel: 'party',
        text: `${inviterName} invited you to their party.`,
        actions: [
          { label: 'Accept', run: () => social.respond(inviterId, true) },
          { label: 'Decline', run: () => social.respond(inviterId, false) },
        ],
      })),
    ];
  }

  push(line: ChatLine): void {
    this.lines.push(line);
    if (this.lines.length > MAX_LINES) this.lines.shift();
    if (FILTERS[this.filter].shows(line)) {
      this.log.append(renderLine(line));
      while (this.log.childElementCount > MAX_LINES) this.log.firstElementChild?.remove();
      this.log.scrollTop = this.log.scrollHeight;
    }
  }

  focusInput(prefill = ''): void {
    this.setCollapsed(false);
    if (prefill) this.input.value = prefill;
    this.input.focus();
    this.input.setSelectionRange(this.input.value.length, this.input.value.length);
  }

  isTyping(): boolean {
    return document.activeElement === this.input;
  }

  dispose(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
  }

  private run(command: ChatCommand): void {
    switch (command.kind) {
      case 'say':
        this.connection.send({ type: 'chat.say', text: command.text.slice(0, 160), channel: command.channel });
        return;
      case 'whisper':
        this.connection.send({ type: 'chat.whisper', to: command.to.slice(0, 64), text: command.text.slice(0, 160) });
        return;
      case 'reply': {
        const last = this.lines.findLast((line) => line.channel === 'whisper' && line.author);
        if (!last?.author) {
          this.push({ channel: 'notice', tone: 'warning', text: 'Nobody has whispered to you yet.' });
          return;
        }
        this.connection.send({ type: 'chat.whisper', to: last.author, text: command.text.slice(0, 160) });
        return;
      }
      case 'invite':
        this.connection.send({ type: 'party.invite', name: command.name.slice(0, 64) });
        return;
      case 'friend':
        this.connection.send({ type: 'friends.add', name: command.name.slice(0, 64) });
        return;
      case 'leaveParty':
        this.connection.send({ type: 'party.leave' });
        return;
      case 'help':
        for (const text of CHAT_HELP) this.push({ channel: 'system', text });
        return;
      case 'unknown':
        this.push({ channel: 'notice', tone: 'warning', text: `Unknown command /${command.command}. Type /help for the list.` });
        return;
    }
  }

  private setCollapsed(collapsed: boolean): void {
    this.element.classList.toggle('collapsed', collapsed);
    this.collapseToggle.ariaLabel = collapsed ? 'Show chat' : 'Hide chat';
    this.collapseToggle.ariaExpanded = String(!collapsed);
    if (!collapsed) this.log.scrollTop = this.log.scrollHeight;
  }

  private redraw(): void {
    this.log.replaceChildren(...this.lines.filter(FILTERS[this.filter].shows).map(renderLine));
    this.log.scrollTop = this.log.scrollHeight;
  }
}

function authorLabel(line: ChatLine): string | null {
  if (line.channel === 'whisper') return line.recipient ? `To ${line.recipient}: ` : `From ${line.author}: `;
  if (!line.author) return null;
  if (line.channel === 'party') return `[Party] ${line.author}: `;
  if (line.channel === 'site') return `[Site] ${line.author}: `;
  return `${line.author}: `;
}

function renderLine(line: ChatLine): HTMLElement {
  const author = authorLabel(line);
  const actions = line.actions?.map((action) => {
    const button = h('button', { className: 'chat-action', type: 'button' }, action.label);
    button.onclick = () => {
      action.run();
      button.parentElement?.querySelectorAll('button').forEach((sibling) => (sibling.disabled = true));
    };
    return button;
  });
  return h('p', { className: `chat-line channel-${line.channel}${line.tone ? ` tone-${line.tone}` : ''}` },
    author && h('span', { className: 'chat-author' }, author),
    line.text,
    actions && actions.length > 0 && h('span', { className: 'chat-actions' }, ...actions));
}
