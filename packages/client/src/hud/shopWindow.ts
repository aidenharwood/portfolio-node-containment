import { countItem, GAME_CONTENT, sellPrice, shopCurrencyLabel, shopCurrencyOf, type InventoryState, type ItemDefinition, type SelfState, type ShopDefinition } from '@containment/shared';
import type { GameConnection } from '../net/gameConnection.ts';
import { itemIconUrl } from '../render/items/itemSprites.ts';
import type { WorldState } from '../state/worldState.ts';
import { secondaryGesture } from '../ui/viewport.ts';
import { h, replaceChildren } from '../ui/dom.ts';
import { attachItemTooltip, hideItemTooltip, itemDetails } from '../ui/itemTooltip.ts';
import type { ContextMenu, MenuAction } from './contextMenu.ts';
import type { InventoryMode, InventoryModeSlot } from './inventoryMode.ts';
import { preserveScroll, quantityActions } from './quantityActions.ts';

const MAX_PURCHASE = 1000;

function roomFor(inventory: InventoryState, item: ItemDefinition): number {
  return inventory.reduce((room, slot) => {
    if (slot === null) return room + item.maxStack;
    return slot.itemId === item.id ? room + Math.max(0, item.maxStack - slot.quantity) : room;
  }, 0);
}

const BULK_QUANTITY = 5;

export class ShopWindow implements InventoryMode {
  readonly element = h('section', { className: 'shop-window panel', hidden: true, role: 'dialog', ariaLabel: 'Shop' });
  private readonly connection: GameConnection;
  private readonly world: WorldState;
  private readonly menu: ContextMenu;
  private readonly modes: InventoryModeSlot;
  private shop: ShopDefinition | null = null;
  private readonly unsubscribers: (() => void)[];

  constructor(connection: GameConnection, world: WorldState, menu: ContextMenu, modes: InventoryModeSlot) {
    this.connection = connection;
    this.world = world;
    this.menu = menu;
    this.modes = modes;
    this.unsubscribers = [
      connection.on('shop.opened', ({ shopId }) => this.open(shopId)),
      connection.on('shop.closed', () => this.hide()),
      world.on('selfChanged', () => this.render()),
    ];
  }

  get isOpen(): boolean {
    return this.shop !== null;
  }

  requestClose(): void {
    if (this.shop) this.connection.send({ type: 'shop.close' });
    this.hide();
  }

  dispose(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
  }

  private open(shopId: string): void {
    this.shop = GAME_CONTENT.shops.get(shopId) ?? null;
    this.element.hidden = !this.shop;
    if (this.shop) this.modes.enter(this);
    this.render();
  }

  private hide(): void {
    this.shop = null;
    this.element.hidden = true;
    this.modes.leave(this);
  }

  get hint(): string {
    return `Selling to ${this.shop?.name ?? 'the shop'}`;
  }

  accepts(item: ItemDefinition): boolean {
    return this.shop !== null && sellPrice(item, this.shop) !== null;
  }

  primary(slotIndex: number, item: ItemDefinition, all: boolean): void {
    const self = this.world.self;
    if (!this.accepts(item) || !self) return;
    this.connection.send({ type: 'shop.sell', slotIndex, quantity: all ? countItem(self.inventory, item.id) : 1 });
  }

  actions(slotIndex: number, item: ItemDefinition): MenuAction[] {
    const self = this.world.self;
    if (!this.shop || !self) return [];
    const price = sellPrice(item, this.shop);
    if (price === null) return [];
    const owned = countItem(self.inventory, item.id);
    return quantityActions('Sell', item, owned, (quantity) => this.connection.send({ type: 'shop.sell', slotIndex, quantity }))
      .map((action) => ({ ...action, subject: `${item.name} (${price} each)` }));
  }

  private render(): void {
    const shop = this.shop;
    const self = this.world.self;
    if (!shop || !self) return;
    const scrip = countItem(self.inventory, shopCurrencyOf(shop));
    preserveScroll(this.element, ['.shop-column'], () => replaceChildren(
      this.element,
      h('header', { className: 'shop-header' },
        h('div', {}, h('h3', {}, shop.name), h('p', { className: 'shop-greeting' }, shop.greeting)),
        h('button', { className: 'dialogue-close', type: 'button', ariaLabel: 'Close shop', onclick: () => this.requestClose() }, '×'),
      ),
      h('div', { className: 'shop-column' }, h('p', { className: 'eyebrow' }, 'Requisition'), this.renderStock(shop, scrip, self)),
      h('footer', { className: 'shop-footer' },
        h('span', {}, `${shopCurrencyLabel(shop).replace(/^./, (letter) => letter.toUpperCase())} `, h('strong', { className: 'scrip-amount' }, scrip.toLocaleString())),
        h('span', { className: 'tab-hint' }, `${secondaryGesture()} to buy more · sell from your inventory`),
      ),
    ));
  }

  private renderStock(shop: ShopDefinition, scrip: number, self: SelfState): HTMLElement {
    return h('ul', { className: 'shop-stock' },
      ...shop.listings.map((listing) => {
        const item = GAME_CONTENT.items.get(listing.itemId);
        if (!item) return null;
        const buy = (quantity: number) => this.connection.send({ type: 'shop.buy', itemId: item.id, quantity });
        const row = h('li', { className: `shop-row rarity-${item.rarity}` },
          h('img', { className: 'shop-icon', src: itemIconUrl(item), alt: '' }),
          h('span', { className: 'shop-name' }, item.name),
          h('span', { className: `shop-price${scrip < listing.price ? ' unaffordable' : ''}` }, `${listing.price}`),
          h('button', { className: 'button small', type: 'button', disabled: scrip < listing.price, onclick: () => buy(1) }, 'Buy'),
          item.maxStack > 1 &&
            h('button', { className: 'button ghost small', type: 'button', disabled: scrip < listing.price * BULK_QUANTITY, onclick: () => buy(BULK_QUANTITY) }, `×${BULK_QUANTITY}`),
        );
        row.oncontextmenu = (event: MouseEvent) => {
          event.preventDefault();
          const affordable = Math.min(MAX_PURCHASE, Math.floor(scrip / listing.price), roomFor(self.inventory, item));
          hideItemTooltip();
          this.menu.open(event.clientX, event.clientY, quantityActions('Buy', item, affordable, buy), itemDetails(item));
        };
        attachItemTooltip(row, () => item);
        return row;
      }),
    );
  }
}
