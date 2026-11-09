import { FRIEND_LIMIT, PARTY_SIZE_LIMIT, type FriendView, type PartyMemberView, type SelfState } from '@containment/shared';
import type { GameConnection } from '../../net/gameConnection.ts';
import type { SocialState } from '../../state/socialState.ts';
import { h, replaceChildren } from '../../ui/dom.ts';
import type { PanelTab } from '../sidePanel.ts';

export interface SocialActions {
  whisper(name: string): void;
}

function nameForm(placeholder: string, label: string, submit: (name: string) => void): HTMLFormElement {
  const input = h('input', { className: 'social-input', maxLength: 64, placeholder, ariaLabel: placeholder });
  const form = h('form', { className: 'social-form' }, input, h('button', { className: 'button small', type: 'submit' }, label));
  form.onsubmit = (event) => {
    event.preventDefault();
    const name = input.value.trim();
    if (!name) return;
    submit(name);
    input.value = '';
  };
  return form;
}

export function createSocialTab(connection: GameConnection, social: SocialState, actions: SocialActions): PanelTab {
  const invitesView = h('div', {});
  const partyView = h('div', {});
  const partyFooter = h('div', {});
  const contactsView = h('div', {});
  let selfId: string | null = null;
  let signalAttention: (() => void) | null = null;
  let knownInvites = 0;

  const inviteForm = nameForm('Operative name', 'Invite', (name) => connection.send({ type: 'party.invite', name }));
  const contactForm = nameForm('Operative name', 'Add', (name) => connection.send({ type: 'friends.add', name }));
  const element = h('div', { className: 'tab-social' },
    h('div', { className: 'social-body' },
      invitesView,
      h('section', { className: 'social-section' }, partyView, inviteForm, partyFooter),
      h('section', { className: 'social-section' }, contactsView, contactForm),
    ),
  );

  const memberRow = (member: PartyMemberView, leaderId: string) => {
    const isSelf = member.characterId === selfId;
    const leading = selfId === leaderId;
    const share = member.maxIntegrity > 0 ? Math.round((member.integrity / member.maxIntegrity) * 100) : 0;
    return h('li', { className: `social-member${isSelf ? ' self' : ''}` },
      h('div', { className: 'social-member-head' },
        h('span', { className: 'social-name' }, member.characterId === leaderId ? '★ ' : '', member.name),
        h('span', { className: 'social-meta' }, `Cb ${member.combatLevel}`),
      ),
      h('div', { className: 'social-integrity', title: `${member.integrity} / ${member.maxIntegrity} integrity` }, h('span', { style: { width: `${share}%` } })),
      h('p', { className: 'social-meta' }, member.districtName ?? 'In transit'),
      !isSelf && h('div', { className: 'social-actions' },
        h('button', { className: 'button ghost small', type: 'button', onclick: () => actions.whisper(member.name) }, 'Whisper'),
        leading && h('button', { className: 'button ghost small', type: 'button', onclick: () => connection.send({ type: 'party.promote', characterId: member.characterId }) }, 'Make leader'),
        leading && h('button', { className: 'button ghost small', type: 'button', onclick: () => connection.send({ type: 'party.kick', characterId: member.characterId }) }, 'Remove'),
      ),
    );
  };

  const friendRow = (friend: FriendView) =>
    h('li', { className: `social-friend${friend.online ? ' online' : ''}` },
      h('div', { className: 'social-member-head' },
        h('span', { className: 'social-name' }, h('span', { className: 'presence-dot', ariaHidden: 'true' }), friend.name),
        h('span', { className: 'social-meta' }, friend.online ? (friend.districtName ?? 'On site') : 'Off site'),
      ),
      h('div', { className: 'social-actions' },
        friend.online && h('button', { className: 'button ghost small', type: 'button', onclick: () => actions.whisper(friend.name) }, 'Whisper'),
        friend.online && h('button', { className: 'button ghost small', type: 'button', onclick: () => connection.send({ type: 'party.invite', name: friend.name }) }, 'Invite'),
        h('button', { className: 'button ghost small', type: 'button', onclick: () => connection.send({ type: 'friends.remove', characterId: friend.characterId }) }, 'Remove'),
      ),
    );

  const render = () => {
    const party = social.party;
    const invites = social.pendingInvites;
    if (invites.length > knownInvites) signalAttention?.();
    knownInvites = invites.length;
    const online = social.friends.filter((friend) => friend.online).length;
    replaceChildren(
      invitesView,
      invites.length > 0 && h('section', { className: 'social-section social-invites' },
        h('h4', { className: 'subheading' }, 'Party invites'),
        ...invites.map((invite) => h('div', { className: 'social-invite' },
          h('span', {}, `${invite.inviterName} wants you in their party.`),
          h('div', { className: 'social-actions' },
            h('button', { className: 'button small', type: 'button', onclick: () => social.respond(invite.inviterId, true) }, 'Accept'),
            h('button', { className: 'button ghost small', type: 'button', onclick: () => social.respond(invite.inviterId, false) }, 'Decline'),
          ),
        )),
      ),
    );
    replaceChildren(
      partyView,
      h('h4', { className: 'subheading' }, party ? `Party (${party.members.length}/${PARTY_SIZE_LIMIT})` : 'Party'),
      party
        ? h('ul', { className: 'social-list' }, ...party.members.map((member) => memberRow(member, party.leaderId)))
        : h('p', { className: 'tab-hint' }, 'Party members share kill credit for quests and contracts nearby, enter the same layer, and get a private channel (/p).'),
    );
    inviteForm.hidden = Boolean(party && party.leaderId !== selfId);
    replaceChildren(partyFooter, party && h('button', { className: 'button ghost small social-leave', type: 'button', onclick: () => connection.send({ type: 'party.leave' }) }, 'Leave party'));
    replaceChildren(
      contactsView,
      h('h4', { className: 'subheading' }, `Contacts (${online} on site · ${social.friends.length}/${FRIEND_LIMIT})`),
      social.friends.length > 0
        ? h('ul', { className: 'social-list' }, ...social.friends.map(friendRow))
        : h('p', { className: 'tab-hint' }, 'Add operatives to see when they are on site and where.'),
    );
  };

  const unsubscribe = social.onChange(render);
  render();

  return {
    id: 'social',
    label: 'Social',
    glyph: '☍',
    element,
    update(self: SelfState) {
      if (selfId === self.characterId) return;
      selfId = self.characterId;
      render();
    },
    bindAttention(signal) {
      signalAttention = signal;
    },
    dispose: unsubscribe,
  };
}
