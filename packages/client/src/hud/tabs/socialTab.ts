import { FRIEND_LIMIT, type FriendView } from '@containment/shared';
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
  const contactsView = h('div', {});
  const contactForm = nameForm('Operative name', 'Add', (name) => connection.send({ type: 'friends.add', name }));
  const element = h('div', { className: 'tab-social' },
    h('div', { className: 'social-body' },
      h('section', { className: 'social-section' }, contactsView, contactForm),
      h('p', { className: 'tab-hint' }, 'Invite contacts or nearby operatives to a party. Your party shows on screen, shares kill credit nearby, enters the same layer and talks on /p.'),
    ),
  );

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
    const online = social.friends.filter((friend) => friend.online).length;
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
    icon: 'social',
    element,
    update() {},
    dispose: unsubscribe,
  };
}
