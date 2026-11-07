import { equippedItemIds, GAME_CONTENT, type CharacterSummary } from '@containment/shared';
import type { AppNavigator } from '../app.ts';
import { AvatarPreview } from '../ui/avatarPreview.ts';
import { createBackdrop } from '../ui/backdrop.ts';
import { h, replaceChildren, type Screen } from '../ui/dom.ts';

export function createRosterScreen(app: AppNavigator, roster: readonly CharacterSummary[], maxCharacters: number): Screen {
  const backdrop = createBackdrop();
  const previews: AvatarPreview[] = [];
  const dialog = h('div', { className: 'roster-delete-backdrop', hidden: true });
  const stopRejections = app.connection.on('character.rejected', ({ errors }) => {
    const message = dialog.querySelector('.roster-delete-error');
    if (message) message.textContent = errors.join(' ');
  });

  const confirmDelete = (character: CharacterSummary) => {
    const input = h('input', { className: 'roster-delete-input', type: 'text', placeholder: character.name, autocomplete: 'off' });
    const close = () => {
      dialog.hidden = true;
      replaceChildren(dialog);
    };
    const submit = () => app.connection.send({ type: 'character.delete', characterId: character.id, confirmName: input.value });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') submit();
      if (event.key === 'Escape') close();
    });
    replaceChildren(dialog,
      h('div', { className: 'roster-delete panel', role: 'alertdialog', ariaLabel: 'Delete personnel file' },
        h('h3', {}, 'Delete ' + character.name + '?'),
        h('p', {}, 'This permanently deletes the operative, their gear, storage and quest progress. It cannot be undone.'),
        h('label', { className: 'roster-delete-label' }, 'Type ', h('strong', {}, character.name), ' to confirm', input),
        h('p', { className: 'roster-delete-error', role: 'alert' }),
        h('div', { className: 'roster-delete-actions' },
          h('button', { className: 'button ghost', type: 'button', onclick: close }, 'Cancel'),
          h('button', { className: 'button danger', type: 'button', onclick: submit }, 'Delete permanently'),
        ),
      ),
    );
    dialog.hidden = false;
    input.focus();
  };

  const cards = roster.map((character) => {
    const preview = new AvatarPreview(
      { appearance: character.appearance, gear: equippedItemIds(character.equipment), facing: 'south', walking: false },
      { width: 140, height: 170, pedestal: true },
    );
    previews.push(preview);
    const zone = GAME_CONTENT.zones.get(character.zoneId);
    const deploy = () => app.connection.send({ type: 'character.select', characterId: character.id });
    return h(
      'article',
      { className: 'roster-card panel', tabIndex: 0, onclick: deploy, onkeydown: (event) => event.key === 'Enter' && deploy() },
      h('div', { className: 'roster-avatar' }, preview.element),
      h('h3', { className: 'roster-name' }, character.name),
      h('p', { className: 'roster-meta' }, 'Directorate operative'),
      h('dl', { className: 'roster-stats' },
        h('dt', {}, 'Combat level'), h('dd', {}, String(character.combatLevel)),
        h('dt', {}, 'Location'), h('dd', {}, zone?.name ?? '—'),
      ),
      h('button', { className: 'button primary wide', type: 'button' }, 'Deploy'),
      h('button', {
        className: 'roster-delete-button',
        type: 'button',
        ariaLabel: 'Delete ' + character.name,
        onclick: (event: MouseEvent) => {
          event.stopPropagation();
          confirmDelete(character);
        },
      }, 'Delete'),
    );
  });

  const canCreate = roster.length < maxCharacters;
  const element = h(
    'div',
    { className: 'screen roster-screen' },
    backdrop.element,
    dialog,
    h(
      'div',
      { className: 'roster-layout' },
      h('header', { className: 'screen-header' },
        h('div', {}, h('p', { className: 'eyebrow' }, `Signed in as ${app.username}`), h('h1', {}, 'Personnel Files')),
        h('button', { className: 'button ghost', onclick: () => app.connection.send({ type: 'auth.logout' }) }, 'Sign out'),
      ),
      h('div', { className: 'roster-grid' },
        ...cards,
        canCreate &&
          h('button', { className: 'roster-card roster-new panel', onclick: () => app.showCreator() },
            h('span', { className: 'roster-new-plus' }, '+'),
            h('span', {}, 'Open new personnel file'),
            h('span', { className: 'roster-meta' }, `${roster.length} / ${maxCharacters} files`),
          ),
      ),
    ),
  );

  return {
    element,
    unmount: () => {
      backdrop.dispose();
      stopRejections();
      previews.forEach((preview) => preview.dispose());
    },
  };
}
