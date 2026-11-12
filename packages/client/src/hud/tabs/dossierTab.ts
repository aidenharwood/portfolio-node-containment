import { equippedItemIds, PROFILE_STAT_IDS, PROFILE_STAT_INFO, PRONOUN_SETS, STAT_INFO, type ProfileStatId, type SelfState } from '@containment/shared';
import type { GameConnection } from '../../net/gameConnection.ts';
import type { WorldState } from '../../state/worldState.ts';
import { AvatarPreview } from '../../ui/avatarPreview.ts';
import { h, replaceChildren } from '../../ui/dom.ts';
import type { PanelTab } from '../sidePanel.ts';

export function createDossierTab(connection: GameConnection, world: WorldState): PanelTab {
  let preview: AvatarPreview | null = null;
  const portrait = h('div', { className: 'dossier-portrait' });
  const details = h('div', { className: 'dossier-details' });
  const profile = h('tbody');
  const element = h('div', { className: 'tab-dossier' },
    h('header', { className: 'tab-header dossier-header' },
      h('div', { className: 'dossier-actions' },
        h('button', { className: 'button ghost small', type: 'button', onclick: () => connection.send({ type: 'character.leaveWorld' }) }, 'Personnel files'),
        h('button', { className: 'button ghost small', type: 'button', onclick: () => connection.send({ type: 'auth.logout' }) }, 'Sign out'),
      ),
    ),
    h('div', { className: 'dossier-top' }, portrait, details),
    h('h4', { className: 'subheading', title: 'Derived from trained skills and equipped gear' }, 'Combat profile'),
    h('table', { className: 'dossier-stats' },
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Stat'), h('th', { scope: 'col', title: 'Contribution from equipped gear' }, 'Gear'), h('th', { scope: 'col' }, 'Total'))),
      profile,
    ),
  );

  const profileRow = (self: SelfState, id: ProfileStatId) => {
    const info = PROFILE_STAT_INFO[id];
    const gear = info.gearStat ? self.stats[info.gearStat] : null;
    const title = info.gearStat ? `${info.derivation}
${STAT_INFO[info.gearStat].name}: ${STAT_INFO[info.gearStat].summary}` : info.derivation;
    return h('tr', { title },
      h('th', { scope: 'row' }, info.name),
      h('td', { className: `dossier-gear${gear ? ' active' : ''}` }, gear === null ? '—' : `${gear > 0 ? '+' : ''}${gear}`),
      h('td', { className: 'dossier-total' }, String(self.profile[id])),
    );
  };

  return {
    id: 'dossier',
    label: 'Dossier',
    icon: 'dossier',
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
        ...PROFILE_STAT_IDS.map((id) => profileRow(self, id)),
      );
    },
    dispose() {
      preview?.dispose();
    },
  };
}
