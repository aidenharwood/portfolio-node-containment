import { equippedItemIds, PROFILE_STAT_IDS, PROFILE_STAT_INFO, PRONOUN_SETS, type SelfState } from '@containment/shared';
import type { GameConnection } from '../../net/gameConnection.ts';
import type { WorldState } from '../../state/worldState.ts';
import { AvatarPreview } from '../../ui/avatarPreview.ts';
import { h, replaceChildren } from '../../ui/dom.ts';
import type { PanelTab } from '../sidePanel.ts';

export function createDossierTab(connection: GameConnection, world: WorldState): PanelTab {
  let preview: AvatarPreview | null = null;
  const portrait = h('div', { className: 'dossier-portrait' });
  const details = h('div', { className: 'dossier-details' });
  const profile = h('dl', { className: 'dossier-attributes' });
  const element = h('div', { className: 'tab-dossier' },
    h('header', { className: 'tab-header' }, h('h3', {}, 'Dossier')),
    h('div', { className: 'dossier-top' }, portrait, details),
    h('h4', { className: 'subheading', title: 'Derived from trained skills and equipped gear' }, 'Combat profile'),
    profile,
    h('div', { className: 'dossier-actions' },
      h('button', { className: 'button ghost small', type: 'button', onclick: () => connection.send({ type: 'character.leaveWorld' }) }, 'Personnel files'),
      h('button', { className: 'button ghost small', type: 'button', onclick: () => connection.send({ type: 'auth.logout' }) }, 'Sign out'),
    ),
  );

  return {
    id: 'dossier',
    label: 'Dossier',
    glyph: '☰',
    element,
    update(self: SelfState) {
      const appearance = world.selfEntity?.appearance;
      if (appearance && !preview) {
        preview = new AvatarPreview({ appearance, gear: [], facing: 'south', walking: false }, { width: 96, height: 130, pedestal: true });
        portrait.append(preview.element);
      }
      if (preview) preview.model.gear = equippedItemIds(self.equipment);
      replaceChildren(
        details,
        h('p', { className: 'dossier-name' }, self.name),
        h('p', { className: 'dossier-meta' }, PRONOUN_SETS[self.pronouns].label),
        h('p', { className: 'dossier-meta' }, `Combat level ${self.combatLevel}`),
      );
      replaceChildren(
        profile,
        ...PROFILE_STAT_IDS.flatMap((id) => [h('dt', { title: PROFILE_STAT_INFO[id].derivation }, PROFILE_STAT_INFO[id].name), h('dd', {}, String(self.profile[id]))]),
      );
    },
    dispose() {
      preview?.dispose();
    },
  };
}
