import {
  EQUIPMENT_SLOT_LABELS,
  EQUIPMENT_SLOTS,
  GAME_CONTENT,
  STAT_IDS,
  STAT_INFO,
  type EquipmentSlot,
  type SelfState,
} from '@containment/shared';
import type { GameConnection } from '../../net/gameConnection.ts';
import { itemIconUrl } from '../../render/items/itemSprites.ts';
import { primaryGesture } from '../../ui/viewport.ts';
import { h, replaceChildren } from '../../ui/dom.ts';
import { attachItemTooltip } from '../../ui/itemTooltip.ts';
import type { PanelTab } from '../sidePanel.ts';

export function createEquipmentTab(connection: GameConnection): PanelTab {
  let self: SelfState | null = null;
  const stats = h('dl', { className: 'equipment-stats' });

  const slots = new Map<EquipmentSlot, HTMLButtonElement>(
    EQUIPMENT_SLOTS.map((slot) => {
      const button = h('button', {
        className: 'equipment-slot',
        type: 'button',
        style: { gridArea: slot },
        title: EQUIPMENT_SLOT_LABELS[slot],
        onclick: () => {
          if (self?.equipment[slot]) connection.send({ type: 'equipment.unequip', slot });
        },
      });
      attachItemTooltip(button, () => {
        const itemId = self?.equipment[slot];
        return itemId ? (GAME_CONTENT.items.get(itemId) ?? null) : null;
      });
      return [slot, button];
    }),
  );

  const element = h('div', { className: 'tab-equipment' },
    h('header', { className: 'tab-header' }, h('h3', {}, 'Loadout'), h('span', { className: 'tab-hint' }, `${primaryGesture()} to remove`)),
    h('div', { className: 'paper-doll' }, ...slots.values()),
    h('h4', { className: 'subheading' }, 'Protection & Output'),
    stats,
  );

  return {
    id: 'equipment',
    label: 'Loadout',
    glyph: '⛨',
    element,
    update(next) {
      self = next;
      for (const [slot, button] of slots) {
        const itemId = next.equipment[slot];
        const item = itemId ? GAME_CONTENT.items.get(itemId) : undefined;
        button.className = `equipment-slot${item ? ` filled rarity-${item.rarity}` : ''}`;
        replaceChildren(button, item ? h('img', { src: itemIconUrl(item), alt: item.name }) : h('span', { className: 'slot-label' }, EQUIPMENT_SLOT_LABELS[slot]));
      }
      replaceChildren(stats, ...STAT_IDS.flatMap((id) => [h('dt', { title: STAT_INFO[id].summary }, STAT_INFO[id].name), h('dd', {}, String(next.stats[id]))]));
    },
  };
}
