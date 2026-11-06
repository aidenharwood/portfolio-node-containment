import { equippedItemIds, GAME_CONTENT, type CharacterSummary } from '@containment/shared';
import type { AppNavigator } from '../app.ts';
import { AvatarPreview } from '../ui/avatarPreview.ts';
import { createBackdrop } from '../ui/backdrop.ts';
import { h, type Screen } from '../ui/dom.ts';

export function createRosterScreen(app: AppNavigator, roster: readonly CharacterSummary[], maxCharacters: number): Screen {
  const backdrop = createBackdrop();
  const previews: AvatarPreview[] = [];

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
        h('dt', {}, 'Rating'), h('dd', {}, String(character.operativeRating)),
        h('dt', {}, 'Location'), h('dd', {}, zone?.name ?? '—'),
      ),
      h('button', { className: 'button primary wide', type: 'button' }, 'Deploy'),
    );
  });

  const canCreate = roster.length < maxCharacters;
  const element = h(
    'div',
    { className: 'screen roster-screen' },
    backdrop.element,
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
      previews.forEach((preview) => preview.dispose());
    },
  };
}
