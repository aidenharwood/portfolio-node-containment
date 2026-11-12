import { PARTY_SIZE_LIMIT, type PartyMemberView } from '@containment/shared';
import type { GameConnection } from '../net/gameConnection.ts';
import { INVITE_LIFETIME_MS, type SocialState } from '../state/socialState.ts';
import { h, replaceChildren } from '../ui/dom.ts';
import type { ContextMenu, MenuAction } from './contextMenu.ts';

export class PartyFrame {
  readonly element = h('section', { className: 'party-frame', hidden: true, ariaLabel: 'Party' });

  private selfId: string | null = null;
  private expiryTimer: number | null = null;
  private readonly unsubscribe: () => void;
  private readonly connection: GameConnection;
  private readonly social: SocialState;
  private readonly menu: ContextMenu;
  private readonly whisper: (name: string) => void;

  constructor(connection: GameConnection, social: SocialState, menu: ContextMenu, whisper: (name: string) => void) {
    this.connection = connection;
    this.social = social;
    this.menu = menu;
    this.whisper = whisper;
    this.unsubscribe = social.onChange(() => this.render());
    this.render();
  }

  update(selfId: string): void {
    if (this.selfId === selfId) return;
    this.selfId = selfId;
    this.render();
  }

  dispose(): void {
    this.unsubscribe();
    if (this.expiryTimer !== null) window.clearTimeout(this.expiryTimer);
  }

  private render(): void {
    const party = this.social.party;
    const invites = this.social.pendingInvites;
    this.scheduleExpiry(invites.map((invite) => invite.receivedAt));
    this.element.hidden = !party && invites.length === 0;
    replaceChildren(
      this.element,
      ...invites.map((invite) => h('div', { className: 'party-invite panel' },
        h('p', { className: 'party-invite-text' }, `${invite.inviterName} wants you in their party.`),
        h('div', { className: 'party-invite-actions' },
          h('button', { className: 'button small', type: 'button', onclick: () => this.social.respond(invite.inviterId, true) }, 'Accept'),
          h('button', { className: 'button ghost small', type: 'button', onclick: () => this.social.respond(invite.inviterId, false) }, 'Decline'),
        ),
      )),
      party && h('div', { className: 'party-roster panel' },
        h('div', { className: 'party-header' },
          h('span', { className: 'party-title' }, `Party ${party.members.length}/${PARTY_SIZE_LIMIT}`),
          h('button', { className: 'party-leave', type: 'button', title: 'Leave party', onclick: () => this.connection.send({ type: 'party.leave' }) }, 'Leave'),
        ),
        h('ul', { className: 'party-members' }, ...party.members.map((member) => this.memberRow(member, party.leaderId))),
      ),
    );
  }

  private memberRow(member: PartyMemberView, leaderId: string): HTMLElement {
    const isSelf = member.characterId === this.selfId;
    const share = member.maxIntegrity > 0 ? Math.max(0, Math.min(100, Math.round((member.integrity / member.maxIntegrity) * 100))) : 0;
    const row = h('li', { className: `party-member${isSelf ? ' self' : ''}`, title: `${member.integrity} / ${member.maxIntegrity} integrity · ${member.districtName ?? 'In transit'}` },
      h('div', { className: 'party-member-head' },
        h('span', { className: 'party-name' }, member.characterId === leaderId ? '★ ' : '', member.name),
        h('span', { className: 'party-meta' }, `Cb ${member.combatLevel}`),
      ),
      h('div', { className: 'party-integrity' }, h('span', { style: { width: `${share}%` } })),
      h('p', { className: 'party-meta' }, member.districtName ?? 'In transit'),
    );
    if (!isSelf) {
      const openMenu = (event: MouseEvent) => {
        event.preventDefault();
        this.menu.open(event.clientX, event.clientY, this.memberActions(member, leaderId));
      };
      row.addEventListener('click', openMenu);
      row.addEventListener('contextmenu', openMenu);
    }
    return row;
  }

  private memberActions(member: PartyMemberView, leaderId: string): MenuAction[] {
    const leading = this.selfId === leaderId;
    const actions: MenuAction[] = [{ verb: 'Whisper', subject: member.name, subjectTone: 'player', run: () => this.whisper(member.name) }];
    if (leading) {
      actions.push(
        { verb: 'Make leader', subject: member.name, subjectTone: 'player', run: () => this.connection.send({ type: 'party.promote', characterId: member.characterId }) },
        { verb: 'Remove', subject: member.name, subjectTone: 'player', run: () => this.connection.send({ type: 'party.kick', characterId: member.characterId }) },
      );
    }
    return actions;
  }

  private scheduleExpiry(receivedAt: readonly number[]): void {
    if (this.expiryTimer !== null) window.clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    if (receivedAt.length === 0) return;
    const wait = Math.min(...receivedAt) + INVITE_LIFETIME_MS - Date.now();
    this.expiryTimer = window.setTimeout(() => this.render(), Math.max(0, wait) + 50);
  }
}
