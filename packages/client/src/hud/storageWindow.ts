import { countItem, GAME_CONTENT, STORAGE_CAPACITY, type ItemDefinition } from '@containment/shared';
import type { GameConnection } from '../net/gameConnection.ts';
import { itemIconUrl } from '../render/items/itemSprites.ts';
import type { WorldState } from '../state/worldState.ts';
import { primaryGesture, secondaryGesture } from '../ui/viewport.ts';
import { h, replaceChildren } from '../ui/dom.ts';
import { attachItemTooltip, hideItemTooltip } from '../ui/itemTooltip.ts';
import type { ContextMenu } from './contextMenu.ts';
import { preserveScroll, quantityActions } from './quantityActions.ts';

const SCROLLING = ['.storage-shelves', '.storage-inventory'] as const;

export class StorageWindow {
  readonly element = h('section', { className: 'storage-window panel', hidden: true, role: 'dialog', ariaLabel: 'Personal storage' });
  private readonly connection: GameConnection;
  private readonly world: WorldState;
  private readonly menu: ContextMenu;
  private open = false;
  private readonly unsubscribers: (() => void)[];

  constructor(connection: GameConnection, world: WorldState, menu: ContextMenu) {
    this.connection = connection;
    this.world = world;
    this.menu = menu;
    this.unsubscribers = [
      connection.on('storage.opened', () => this.show()),
      connection.on('storage.closed', () => this.hide()),
      world.on('selfChanged', () => this.render()),
    ];
  }

  get isOpen(): boolean {
    return this.open;
  }

  requestClose(): void {
    if (this.open) this.connection.send({ type: 'storage.close' });
    this.hide();
  }

  dispose(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
  }

  private show(): void {
    this.open = true;
    this.element.hidden = false;
    this.render();
  }

  private hide(): void {
    this.open = false;
    this.element.hidden = true;
  }

  private render(): void {
    const self = this.world.self;
    if (!this.open || !self) return;
    preserveScroll(this.element, SCROLLING, () =>
      replaceChildren(
        this.element,
        h('header', { className: 'shop-header' },
          h('div', {},
            h('h3', {}, 'Personal Storage'),
            h('p', { className: 'shop-greeting' }, `${self.storage.length} / ${STORAGE_CAPACITY} shelves · shared by every storage locker on site`),
          ),
          h('button', { className: 'dialogue-close', type: 'button', ariaLabel: 'Close storage', onclick: () => this.requestClose() }, '×'),
        ),
        h('div', { className: 'shop-columns' },
          h('div', { className: 'shop-column' },
            h('p', { className: 'eyebrow' }, 'Stored'),
            self.storage.length === 0
              ? h('p', { className: 'tab-hint' }, `Nothing stored yet. ${primaryGesture()} items in your pack to store them.`)
              : h('div', { className: 'shop-sell-grid storage-shelves' },
                  ...self.storage.map((stack) => {
                    const item = GAME_CONTENT.items.get(stack.itemId);
                    return item ? this.cell(item, stack.quantity, 'Withdraw', (quantity) => this.connection.send({ type: 'storage.withdraw', itemId: item.id, quantity })) : null;
                  }),
                ),
          ),
          h('div', { className: 'shop-column' },
            h('p', { className: 'eyebrow' }, 'Your pack'),
            h('div', { className: 'shop-sell-grid storage-inventory' },
              ...self.inventory.map((stack, slotIndex) => {
                const item = stack ? GAME_CONTENT.items.get(stack.itemId) : undefined;
                if (!stack || !item) return null;
                const carried = countItem(self.inventory, item.id);
                return this.cell(item, stack.quantity, 'Deposit', (quantity) => this.connection.send({ type: 'storage.deposit', slotIndex, quantity }), carried);
              }),
            ),
          ),
        ),
        h('footer', { className: 'shop-footer' },
          h('span', { className: 'tab-hint' }, `${primaryGesture()} to move one · ${secondaryGesture()} for more`),
          h('button', { className: 'button small', type: 'button', onclick: () => this.connection.send({ type: 'storage.depositAll' }) }, 'Deposit pack'),
        ),
      ),
    );
  }

  private cell(item: ItemDefinition, shown: number, verb: string, move: (quantity: number) => void, available = shown): HTMLElement {
    const locked = verb === 'Deposit' && item.category === 'quest';
    const cell = h('button', {
      className: `inventory-slot filled rarity-${item.rarity}${locked ? ' locked' : ''}`,
      type: 'button',
      disabled: locked,
      onclick: () => move(1),
      oncontextmenu: (event: MouseEvent) => {
        event.preventDefault();
        if (locked) return;
        hideItemTooltip();
        this.menu.open(event.clientX, event.clientY, quantityActions(verb, item, available, move));
      },
    },
      h('img', { src: itemIconUrl(item), alt: item.name }),
      shown > 1 && h('span', { className: 'stack-count' }, shown.toLocaleString()),
    );
    attachItemTooltip(cell, () => item);
    return cell;
  }
}
