import { GAME_CONTENT, INVENTORY_CAPACITY, type ItemDefinition, type SelfState } from '@containment/shared';
import type { GameConnection } from '../../net/gameConnection.ts';
import { itemIconUrl } from '../../render/items/itemSprites.ts';
import { h, replaceChildren } from '../../ui/dom.ts';
import { attachTouchDrag } from '../../input/touchDrag.ts';
import { attachItemTooltip, hideItemTooltip, itemDetails } from '../../ui/itemTooltip.ts';
import type { ContextMenu, MenuAction } from '../contextMenu.ts';
import type { PanelTab } from '../sidePanel.ts';

export interface ItemExaminer {
  examine(text: string): void;
}

export function createInventoryTab(connection: GameConnection, menu: ContextMenu, examiner: ItemExaminer): PanelTab {
  let self: SelfState | null = null;
  const scrip = h('span', { className: 'scrip-amount' }, '0');
  const grid = h('div', { className: 'inventory-grid' });
  const element = h('div', { className: 'tab-inventory' },
    h('header', { className: 'tab-header' }, h('span', { className: 'scrip' }, 'Scrip ', scrip)),
    grid,
  );

  const slotItem = (index: number): ItemDefinition | null => {
    const stack = self?.inventory[index];
    return stack ? (GAME_CONTENT.items.get(stack.itemId) ?? null) : null;
  };

  const actionsFor = (index: number, item: ItemDefinition): MenuAction[] => {
    const actions: MenuAction[] = [];
    if (item.consumable) {
      actions.push({ verb: item.consumable.verb, subject: item.name, subjectTone: 'item', run: () => connection.send({ type: 'inventory.use', slotIndex: index }) });
    }
    if (item.equipment) {
      const verb = item.equipment.slot === 'primary' || item.equipment.slot === 'secondary' ? 'Wield' : 'Wear';
      actions.push({ verb, subject: item.name, subjectTone: 'item', run: () => connection.send({ type: 'inventory.equip', slotIndex: index }) });
    }
    if (item.category === 'quest') {
      actions.push({ verb: 'Destroy', subject: item.name, subjectTone: 'item', run: () => connection.send({ type: 'inventory.destroy', slotIndex: index }) });
    } else {
      actions.push({ verb: 'Drop', subject: item.name, subjectTone: 'item', run: () => connection.send({ type: 'inventory.drop', slotIndex: index }) });
    }
    actions.push({ verb: 'Examine', subject: item.name, subjectTone: 'item', run: () => examiner.examine(item.examine) });
    return actions;
  };

  const slots = Array.from({ length: INVENTORY_CAPACITY }, (_, index) => {
    const slot = h('div', { className: 'inventory-slot', draggable: true, tabIndex: 0, role: 'button', ariaLabel: `Empty slot ${index + 1}`, dataset: { index: String(index) } });
    slot.onclick = () => {
      const item = slotItem(index);
      if (item) actionsFor(index, item).find((action) => action.verb !== 'Drop' && action.verb !== 'Destroy')?.run();
    };
    slot.onkeydown = (event) => {
      const item = slotItem(index);
      if (!item) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        slot.click();
      } else if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
        event.preventDefault();
        event.stopPropagation();
        const bounds = slot.getBoundingClientRect();
        hideItemTooltip();
        menu.open(bounds.left + bounds.width / 2, bounds.bottom, actionsFor(index, item));
        menu.focusFirst();
      }
    };
    slot.oncontextmenu = (event) => {
      event.preventDefault();
      const item = slotItem(index);
      if (item) {
        hideItemTooltip();
        menu.open(event.clientX, event.clientY, actionsFor(index, item), itemDetails(item));
      }
    };
    slot.ondragstart = (event) => {
      if (!slotItem(index)) return event.preventDefault();
      event.dataTransfer?.setData('text/plain', String(index));
      hideItemTooltip();
    };
    slot.ondragover = (event) => event.preventDefault();
    slot.ondrop = (event) => {
      event.preventDefault();
      const from = Number(event.dataTransfer?.getData('text/plain'));
      if (Number.isInteger(from) && from !== index) connection.send({ type: 'inventory.swap', from, to: index });
    };
    attachTouchDrag(slot, {
      canDrag: () => slotItem(index) !== null,
      ghost: () => slot.querySelector('img')?.cloneNode() as HTMLElement | undefined ?? null,
      drop: (target) => {
        const to = Number(target?.closest<HTMLElement>('.inventory-grid .inventory-slot')?.dataset.index);
        if (grid.contains(target) && Number.isInteger(to) && to !== index) connection.send({ type: 'inventory.swap', from: index, to });
      },
    });
    attachItemTooltip(slot, () => slotItem(index));
    return slot;
  });
  grid.append(...slots);

  return {
    id: 'inventory',
    label: 'Inventory',
    icon: 'inventory',
    element,
    update(next) {
      self = next;
      let scripTotal = 0;
      next.inventory.forEach((stack, index) => {
        const slot = slots[index];
        if (!slot) return;
        const item = stack ? GAME_CONTENT.items.get(stack.itemId) : undefined;
        if (stack?.itemId === 'meridian-scrip') scripTotal += stack.quantity;
        slot.className = `inventory-slot${item ? ` filled rarity-${item.rarity}` : ''}`;
        slot.ariaLabel = item ? (stack && stack.quantity > 1 ? `${item.name} × ${stack.quantity}` : item.name) : `Empty slot ${index + 1}`;
        replaceChildren(
          slot,
          item && h('img', { src: itemIconUrl(item), alt: item.name, draggable: false }),
          stack && stack.quantity > 1 && h('span', { className: 'stack-count' }, formatQuantity(stack.quantity)),
        );
      });
      scrip.textContent = scripTotal.toLocaleString();
    },
  };
}

function formatQuantity(quantity: number): string {
  if (quantity >= 10_000_000) return `${Math.floor(quantity / 1_000_000)}M`;
  if (quantity >= 100_000) return `${Math.floor(quantity / 1000)}K`;
  return String(quantity);
}
