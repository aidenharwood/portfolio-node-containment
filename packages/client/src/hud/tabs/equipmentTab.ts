import {
  EQUIPMENT_SLOT_LABELS,
  EQUIPMENT_SLOTS,
  equippedItemIds,
  GAME_CONTENT,
  type EquipmentSlot,
  type SelfState,
} from '@containment/shared';
import type { GameConnection } from '../../net/gameConnection.ts';
import { itemIconUrl } from '../../render/items/itemSprites.ts';
import type { WorldState } from '../../state/worldState.ts';
import { AvatarPreview } from '../../ui/avatarPreview.ts';
import { isCoarsePointer } from '../../ui/viewport.ts';
import { h, replaceChildren } from '../../ui/dom.ts';
import { attachItemTooltip, hideItemTooltip, itemDetails } from '../../ui/itemTooltip.ts';
import type { ContextMenu } from '../contextMenu.ts';
import type { PanelTab } from '../sidePanel.ts';
import type { ItemExaminer } from './inventoryTab.ts';

const ARMOUR_COLUMN: readonly EquipmentSlot[] = ['head', 'eyes', 'torso', 'hands', 'legs', 'feet'];
const KIT_COLUMN: readonly EquipmentSlot[] = ['primary', 'secondary', 'back', 'implant', 'utility'];

const SHORT_SLOT_LABELS: Partial<Record<EquipmentSlot, string>> = { primary: 'Main', secondary: 'Off', implant: 'Chip', utility: 'Util' };

export function createEquipmentTab(connection: GameConnection, world: WorldState, menu: ContextMenu, examiner: ItemExaminer): PanelTab {
  let self: SelfState | null = null;
  let preview: AvatarPreview | null = null;
  const figure = h('div', { className: 'loadout-figure' });
  const worn = h('span', { className: 'tab-hint' });
  const tappedSlots = new Set<EquipmentSlot>();

  const slots = new Map<EquipmentSlot, HTMLButtonElement>(
    EQUIPMENT_SLOTS.map((slot) => {
      const button = h('button', {
        className: 'equipment-slot',
        type: 'button',
        title: EQUIPMENT_SLOT_LABELS[slot],
        onclick: (event: MouseEvent) => {
          const itemId = self?.equipment[slot];
          if (!itemId) return;
          const item = GAME_CONTENT.items.get(itemId);
          const unequip = () => connection.send({ type: 'equipment.unequip', slot });
          if (!item || !tappedSlots.has(slot) || event.detail === 0) return unequip();
          const bounds = button.getBoundingClientRect();
          hideItemTooltip();
          menu.open(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2, [
            { verb: 'Remove', subject: item.name, subjectTone: 'item', run: unequip },
            { verb: 'Examine', subject: item.name, subjectTone: 'item', run: () => examiner.examine(item.examine) },
            { verb: 'Sources', subject: item.name, subjectTone: 'item', run: () => examiner.sources(item.id) },
          ], itemDetails(item));
          button.classList.add('selected');
          menu.onClose(() => button.classList.remove('selected'));
        },
      });
      button.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'touch' || event.pointerType === 'pen') tappedSlots.add(slot);
        else tappedSlots.delete(slot);
      });
      attachItemTooltip(button, () => {
        const itemId = self?.equipment[slot];
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

  const element = h('div', { className: 'tab-equipment tab-fit' },
    h('header', { className: 'tab-header' }, worn, h('span', { className: 'tab-hint' }, isCoarsePointer() ? 'Tap a slot for options' : 'Click a slot to remove')),
    h('div', { className: 'fit-area' },
      h('div', { className: 'loadout' }, column(ARMOUR_COLUMN, 'left'), figure, column(KIT_COLUMN, 'right')),
    ),
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
      const equipped = equippedItemIds(next.equipment);
      if (preview) preview.model.gear = equipped;
      worn.textContent = `${equipped.length} / ${EQUIPMENT_SLOTS.length} worn`;
      for (const [slot, button] of slots) {
        const itemId = next.equipment[slot];
        const item = itemId ? GAME_CONTENT.items.get(itemId) : undefined;
        button.className = `equipment-slot${item ? ` filled rarity-${item.rarity}` : ''}${item && button.classList.contains('selected') ? ' selected' : ''}`;
        button.ariaLabel = item ? `${EQUIPMENT_SLOT_LABELS[slot]}: ${item.name}` : `${EQUIPMENT_SLOT_LABELS[slot]}: empty`;
        replaceChildren(button, item ? h('img', { src: itemIconUrl(item), alt: '' }) : h('span', { className: 'slot-label' }, SHORT_SLOT_LABELS[slot] ?? EQUIPMENT_SLOT_LABELS[slot]));
      }
    },
    dispose() {
      preview?.dispose();
    },
  };
}
