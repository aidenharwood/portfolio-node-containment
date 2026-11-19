import { GAME_CONTENT, INVENTORY_CAPACITY, normalizeInventory, type ItemDefinition, type ItemId, type SelfState } from '@containment/shared';
import type { GameConnection } from '../../net/gameConnection.ts';
import { itemIconUrl } from '../../render/items/itemSprites.ts';
import { h, replaceChildren } from '../../ui/dom.ts';
import { attachTouchDrag } from '../../input/touchDrag.ts';
import { attachItemTooltip, hideItemTooltip, itemDetails } from '../../ui/itemTooltip.ts';
import type { ContextMenu, MenuAction } from '../contextMenu.ts';
import type { InventoryModeSlot } from '../inventoryMode.ts';
import type { PanelTab } from '../sidePanel.ts';
import { inventoryColumns } from './inventoryLayout.ts';

export interface ItemExaminer {
  examine(text: string): void;
  sources(itemId: ItemId): void;
}

export function createInventoryTab(connection: GameConnection, menu: ContextMenu, examiner: ItemExaminer, modes: InventoryModeSlot): PanelTab {
  let self: SelfState | null = null;
  const modeHint = h('span', { className: 'inventory-mode', hidden: true });
  const scrip = h('span', { className: 'scrip-amount' }, '0');
  const used = h('span', { className: 'tab-hint inventory-used' }, '');
  const grid = h('div', { className: 'inventory-grid' });
  const element = h('div', { className: 'tab-inventory tab-fit' },
    h('header', { className: 'tab-header' }, h('span', { className: 'scrip' }, 'Scrip ', scrip), modeHint, used),
    h('div', { className: 'fit-area' }, grid),
  );

  const slotItem = (index: number): ItemDefinition | null => {
    const stack = self ? normalizeInventory(self.inventory)[index] : null;
    return stack ? (GAME_CONTENT.items.get(stack.itemId) ?? null) : null;
  };

  const actionsFor = (index: number, item: ItemDefinition): MenuAction[] => {
    const mode = modes.current;
    const lookups: MenuAction[] = [
      { verb: 'Examine', subject: item.name, subjectTone: 'item', run: () => examiner.examine(item.examine) },
      { verb: 'Sources', subject: item.name, subjectTone: 'item', run: () => examiner.sources(item.id) },
    ];
    if (mode) return [...mode.actions(index, item), ...lookups];
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
    return [...actions, ...lookups];
  };

  const openMenuAt = (slot: HTMLElement, index: number, item: ItemDefinition) => {
    const bounds = slot.getBoundingClientRect();
    hideItemTooltip();
    menu.open(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2, actionsFor(index, item), itemDetails(item));
    slot.classList.add('selected');
    menu.onClose(() => slot.classList.remove('selected'));
  };

  const slots = Array.from({ length: INVENTORY_CAPACITY }, (_, index) => {
    const slot = h('div', { className: 'inventory-slot', draggable: true, tabIndex: 0, role: 'button', ariaLabel: `Empty slot ${index + 1}`, dataset: { index: String(index) } });
    let tapped = false;
    slot.addEventListener('pointerdown', (event) => {
      tapped = event.pointerType === 'touch' || event.pointerType === 'pen';
    });
    slot.onclick = (event) => {
      const item = slotItem(index);
      const mode = modes.current;
      if (!item) return;
      if (mode) mode.primary(index, item, event.shiftKey);
      else if (tapped && event.detail > 0) openMenuAt(slot, index, item);
      else actionsFor(index, item).find((action) => action.verb !== 'Drop' && action.verb !== 'Destroy')?.run();
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

  const paint = () => {
    const mode = modes.current;
    modeHint.hidden = !mode;
    modeHint.textContent = mode?.hint ?? '';
    modeHint.title = mode?.hint ?? '';
    element.classList.toggle('trading', mode !== null);
    slots.forEach((slot, index) => {
      const item = slotItem(index);
      slot.classList.toggle('locked', mode !== null && item !== null && !mode.accepts(item));
    });
  };
  modes.onChange(paint);

  return {
    id: 'inventory',
    label: 'Inventory',
    icon: 'inventory',
    element,
    fit(space) {
      const columns = inventoryColumns(space);
      grid.style.setProperty('--cols', String(columns));
      grid.style.setProperty('--rows', String(Math.ceil(INVENTORY_CAPACITY / columns)));
    },
    update(next) {
      self = next;
      let scripTotal = 0;
      let filled = 0;
      const inventory = normalizeInventory(next.inventory);
      inventory.forEach((stack, index) => {
        const slot = slots[index];
        if (!slot) return;
        const item = stack ? GAME_CONTENT.items.get(stack.itemId) : undefined;
        if (stack) filled++;
        if (stack?.itemId === 'meridian-scrip') scripTotal += stack.quantity;
        slot.className = `inventory-slot${item ? ` filled rarity-${item.rarity}` : ''}${item && slot.classList.contains('selected') ? ' selected' : ''}`;
        slot.ariaLabel = item ? (stack && stack.quantity > 1 ? `${item.name} × ${stack.quantity}` : item.name) : `Empty slot ${index + 1}`;
        replaceChildren(
          slot,
          item && h('img', { src: itemIconUrl(item), alt: item.name, draggable: false }),
          stack && stack.quantity > 1 && h('span', { className: 'stack-count' }, formatQuantity(stack.quantity)),
        );
      });
      scrip.textContent = scripTotal.toLocaleString();
      used.textContent = filled >= INVENTORY_CAPACITY ? `Bag full · ${filled} / ${INVENTORY_CAPACITY}` : `${filled} / ${INVENTORY_CAPACITY} slots`;
      used.classList.toggle('full', filled >= INVENTORY_CAPACITY);
      used.classList.toggle('nearly-full', filled < INVENTORY_CAPACITY && filled >= INVENTORY_CAPACITY - 3);
      paint();
    },
  };
}

function formatQuantity(quantity: number): string {
  if (quantity >= 10_000_000) return `${Math.floor(quantity / 1_000_000)}M`;
  if (quantity >= 100_000) return `${Math.floor(quantity / 1000)}K`;
  return String(quantity);
}
