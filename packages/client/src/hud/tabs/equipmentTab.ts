import {
  appearanceItemIds,
  EQUIPMENT_SLOT_LABELS,
  EQUIPMENT_SLOTS,
  GAME_CONTENT,
  WARDROBE_SLOTS,
  type EquipmentSlot,
  type SelfState,
  type WardrobeSlot,
} from '@containment/shared';
import type { GameConnection } from '../../net/gameConnection.ts';
import { itemIconUrl } from '../../render/items/itemSprites.ts';
import type { WorldState } from '../../state/worldState.ts';
import { AvatarPreview } from '../../ui/avatarPreview.ts';
import { primaryGesture } from '../../ui/viewport.ts';
import { h, replaceChildren } from '../../ui/dom.ts';
import { attachItemTooltip } from '../../ui/itemTooltip.ts';
import type { PanelTab } from '../sidePanel.ts';

const LEFT_COLUMN: readonly EquipmentSlot[] = ['head', 'eyes', 'torso', 'legs', 'feet'];
const RIGHT_COLUMN: readonly EquipmentSlot[] = ['primary', 'secondary', 'hands', 'back', 'implant', 'utility'];

export function createEquipmentTab(connection: GameConnection, world: WorldState): PanelTab {
  let self: SelfState | null = null;
  let preview: AvatarPreview | null = null;
  const figure = h('div', { className: 'loadout-figure' });

  const slots = new Map<EquipmentSlot, HTMLButtonElement>(
    EQUIPMENT_SLOTS.map((slot) => {
      const button = h('button', {
        className: 'equipment-slot',
        type: 'button',
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

  const wardrobe = new Map<WardrobeSlot, HTMLButtonElement>(
    WARDROBE_SLOTS.map((slot) => {
      const button = h('button', {
        className: 'wardrobe-slot',
        type: 'button',
        title: `${EQUIPMENT_SLOT_LABELS[slot]} cosmetic`,
        onclick: () => {
          if (self?.wardrobe[slot]) connection.send({ type: 'wardrobe.remove', slot });
        },
      });
      attachItemTooltip(button, () => {
        const itemId = self?.wardrobe[slot];
        return itemId ? (GAME_CONTENT.items.get(itemId) ?? null) : null;
      });
      return [slot, button];
    }),
  );

  const column = (ids: readonly EquipmentSlot[], side: string) =>
    h('div', { className: `loadout-column ${side}` }, ...ids.flatMap((slot) => {
      const button = slots.get(slot);
      return button ? [button] : [];
    }));

  const element = h('div', { className: 'tab-equipment' },
    h('header', { className: 'tab-header' }, h('span', { className: 'tab-hint' }, `${primaryGesture()} a slot to remove`)),
    h('div', { className: 'loadout' }, column(LEFT_COLUMN, 'left'), figure, column(RIGHT_COLUMN, 'right')),
    h('section', { className: 'wardrobe' },
      h('p', { className: 'eyebrow' }, 'Wardrobe'),
      h('div', { className: 'wardrobe-slots' }, ...wardrobe.values()),
      h('p', { className: 'tab-hint' }, 'Cosmetics show over your gear and change no stats'),
    ),
    h('p', { className: 'loadout-summary' }, 'Combat profile on the Dossier'),
  );

  return {
    id: 'equipment',
    label: 'Loadout',
    icon: 'equipment',
    element,
    update(next) {
      self = next;
      const appearance = world.selfEntity?.appearance;
      if (appearance && !preview) {
        preview = new AvatarPreview({ appearance, gear: [], facing: 'south', walking: false }, { width: 104, height: 236, pedestal: true, zoom: 1.1 });
        figure.append(preview.element);
      }
      if (preview) preview.model.gear = appearanceItemIds(next.equipment, next.wardrobe);
      for (const [slot, button] of wardrobe) {
        const itemId = next.wardrobe[slot];
        const item = itemId ? GAME_CONTENT.items.get(itemId) : undefined;
        button.className = `wardrobe-slot${item ? ` filled rarity-${item.rarity}` : ''}`;
        button.ariaLabel = item ? `${EQUIPMENT_SLOT_LABELS[slot]} cosmetic: ${item.name}` : `${EQUIPMENT_SLOT_LABELS[slot]} cosmetic: empty`;
        replaceChildren(button, item ? h('img', { src: itemIconUrl(item), alt: '' }) : h('span', { className: 'slot-label' }, EQUIPMENT_SLOT_LABELS[slot]));
      }
      for (const [slot, button] of slots) {
        const itemId = next.equipment[slot];
        const item = itemId ? GAME_CONTENT.items.get(itemId) : undefined;
        button.className = `equipment-slot${item ? ` filled rarity-${item.rarity}` : ''}`;
        button.ariaLabel = item ? `${EQUIPMENT_SLOT_LABELS[slot]}: ${item.name}` : `${EQUIPMENT_SLOT_LABELS[slot]}: empty`;
        replaceChildren(button, item ? h('img', { src: itemIconUrl(item), alt: '' }) : h('span', { className: 'slot-label' }, EQUIPMENT_SLOT_LABELS[slot]));
      }
    },
    dispose() {
      preview?.dispose();
    },
  };
}
