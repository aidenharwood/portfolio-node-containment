import {
  countItem,
  CURRENCY_ITEM_ID,
  defaultMarketPrice,
  GAME_CONTENT,
  isTradable,
  MARKET_ORDER_LIMIT,
  MAX_MARKET_PRICE,
  MAX_MARKET_QUANTITY,
  remainingQuantity,
  tradableItems,
  type ItemDefinition,
  type MarketOrder,
  type MarketQuote,
  type MarketSide,
  type SelfState,
} from '@containment/shared';
import type { GameConnection } from '../net/gameConnection.ts';
import { itemIconUrl } from '../render/items/itemSprites.ts';
import type { WorldState } from '../state/worldState.ts';
import { h, replaceChildren } from '../ui/dom.ts';
import { attachItemTooltip } from '../ui/itemTooltip.ts';
import { preserveScroll } from './quantityActions.ts';

type MarketTab = 'orders' | MarketSide;

const TAB_LABELS: Record<MarketTab, string> = { orders: 'My orders', buy: 'Buy', sell: 'Sell' };
const SCROLLING = ['.market-list'] as const;
const TRADABLE = tradableItems(GAME_CONTENT.items).sort((left, right) => left.name.localeCompare(right.name));

const parseWhole = (text: string): number => Math.floor(Number(text));

function guardTyping(input: HTMLInputElement): HTMLInputElement {
  input.addEventListener('keydown', (event) => event.stopPropagation());
  return input;
}

export class MarketWindow {
  readonly element = h('section', { className: 'market-window panel', hidden: true, role: 'dialog', ariaLabel: 'Site exchange' });
  private readonly connection: GameConnection;
  private readonly world: WorldState;
  private open = false;
  private tab: MarketTab = 'orders';
  private orders: readonly MarketOrder[] = [];
  private quotes = new Map<string, MarketQuote>();
  private search = '';
  private selected: ItemDefinition | null = null;
  private price = '';
  private quantity = '1';
  private readonly unsubscribers: (() => void)[];

  constructor(connection: GameConnection, world: WorldState) {
    this.connection = connection;
    this.world = world;
    this.unsubscribers = [
      connection.on('market.opened', () => this.show()),
      connection.on('market.closed', () => this.hide()),
      connection.on('market.state', ({ orders, quotes }) => {
        this.orders = orders;
        this.quotes = new Map(quotes.map((quote) => [quote.itemId, quote]));
        this.render();
      }),
      world.on('selfChanged', () => this.render()),
    ];
  }

  get isOpen(): boolean {
    return this.open;
  }

  requestClose(): void {
    if (this.open) this.connection.send({ type: 'market.close' });
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

  private switchTab(tab: MarketTab): void {
    this.tab = tab;
    this.selected = null;
    this.render();
  }

  private select(item: ItemDefinition): void {
    this.selected = item;
    this.price = String(defaultMarketPrice(item));
    this.quantity = '1';
    this.render();
  }

  private render(): void {
    const self = this.world.self;
    if (!this.open || !self) return;
    const focused = document.activeElement instanceof HTMLInputElement && this.element.contains(document.activeElement)
      ? { key: document.activeElement.dataset.focusKey, start: document.activeElement.selectionStart, end: document.activeElement.selectionEnd }
      : null;
    const scrip = countItem(self.inventory, CURRENCY_ITEM_ID);
    preserveScroll(this.element, SCROLLING, () =>
      replaceChildren(
        this.element,
        h('header', { className: 'shop-header' },
          h('div', {},
            h('h3', {}, 'Site Exchange'),
            h('p', { className: 'shop-greeting' }, 'Buy orders fill from the cheapest seller, sell orders from the highest bidder. Your price is the limit.'),
          ),
          h('button', { className: 'dialogue-close', type: 'button', ariaLabel: 'Close exchange', onclick: () => this.requestClose() }, '×'),
        ),
        h('nav', { className: 'tabs market-tabs', role: 'tablist' },
          ...(Object.keys(TAB_LABELS) as MarketTab[]).map((tab) =>
            h('button', {
              className: `tab${this.tab === tab ? ' active' : ''}`,
              type: 'button',
              role: 'tab',
              ariaSelected: String(this.tab === tab),
              onclick: () => this.switchTab(tab),
            }, tab === 'orders' ? `${TAB_LABELS[tab]} (${this.orders.length}/${MARKET_ORDER_LIMIT})` : TAB_LABELS[tab]),
          ),
        ),
        this.tab === 'orders' ? this.renderOrders() : this.renderTrade(this.tab, self, scrip),
        h('footer', { className: 'shop-footer' },
          h('span', {}, 'Scrip ', h('strong', { className: 'scrip-amount' }, scrip.toLocaleString())),
          this.tab === 'orders' && this.orders.some((order) => order.uncollectedItems > 0 || order.uncollectedScrip > 0)
            ? h('button', { className: 'button small', type: 'button', onclick: () => this.connection.send({ type: 'market.collect', orderId: null }) }, 'Collect all')
            : h('span', { className: 'tab-hint' }, `${this.orders.length} of ${MARKET_ORDER_LIMIT} order slots used`),
        ),
      ),
    );
    if (focused?.key) {
      const input = this.element.querySelector<HTMLInputElement>(`[data-focus-key="${focused.key}"]`);
      input?.focus();
      if (input && input.type === 'text') input.setSelectionRange(focused.start, focused.end);
    }
  }

  private renderOrders(): HTMLElement {
    if (this.orders.length === 0) {
      return h('div', { className: 'market-body' }, h('p', { className: 'tab-hint' }, 'You have no orders. Post one from the Buy or Sell tab.'));
    }
    return h('div', { className: 'market-body' },
      h('ul', { className: 'shop-stock market-list' }, ...this.orders.map((order) => this.renderOrder(order))),
    );
  }

  private renderOrder(order: MarketOrder): HTMLElement | null {
    const item = GAME_CONTENT.items.get(order.itemId);
    if (!item) return null;
    const waiting = [
      order.uncollectedItems > 0 && `${order.uncollectedItems.toLocaleString()} × ${item.name}`,
      order.uncollectedScrip > 0 && `${order.uncollectedScrip.toLocaleString()} scrip`,
    ].filter(Boolean).join(' · ');
    const status = order.open ? `${order.filled.toLocaleString()} / ${order.quantity.toLocaleString()} filled` : remainingQuantity(order) === 0 ? 'Complete' : 'Cancelled';
    const row = h('li', { className: `market-order rarity-${item.rarity}${order.open ? '' : ' closed'}` },
      h('img', { className: 'shop-icon', src: itemIconUrl(item), alt: '' }),
      h('div', { className: 'market-order-text' },
        h('span', { className: 'shop-name' }, h('span', { className: `market-side ${order.side}` }, order.side), ' ', item.name),
        h('span', { className: 'market-order-detail' }, h('span', { className: 'shop-price' }, order.price.toLocaleString()), ' each · ', status),
        h('progress', { className: 'market-progress', max: order.quantity, value: order.filled }),
        waiting && h('span', { className: 'market-waiting' }, `Ready to collect: ${waiting}`),
      ),
      h('div', { className: 'market-order-actions' },
        waiting && h('button', { className: 'button small', type: 'button', onclick: () => this.connection.send({ type: 'market.collect', orderId: order.id }) }, 'Collect'),
        order.open && h('button', { className: 'button ghost small', type: 'button', onclick: () => this.connection.send({ type: 'market.cancel', orderId: order.id }) }, 'Cancel'),
      ),
    );
    attachItemTooltip(row.querySelector('img')!, () => item);
    return row;
  }

  private renderTrade(side: MarketSide, self: SelfState, scrip: number): HTMLElement {
    return h('div', { className: 'market-body market-columns' },
      h('div', { className: 'shop-column' }, side === 'buy' ? this.renderCatalogue() : this.renderPack(self)),
      h('div', { className: 'shop-column market-form-column' }, this.renderForm(side, self, scrip)),
    );
  }

  private renderCatalogue(): HTMLElement {
    const term = this.search.trim().toLowerCase();
    const matches = TRADABLE.filter((item) => item.name.toLowerCase().includes(term));
    const search = guardTyping(h('input', {
      className: 'field-input market-search',
      type: 'text',
      placeholder: 'Search every tradable item',
      value: this.search,
      dataset: { focusKey: 'search' },
      oninput: (event: Event) => {
        this.search = (event.target as HTMLInputElement).value;
        this.render();
      },
    }));
    return h('div', { className: 'market-catalogue' },
      search,
      matches.length === 0
        ? h('p', { className: 'tab-hint' }, 'No tradable item matches that.')
        : h('ul', { className: 'shop-stock market-list' },
            ...matches.map((item) => {
              const quote = this.quotes.get(item.id);
              const row = h('li', {
                className: `shop-row market-item rarity-${item.rarity}${this.selected?.id === item.id ? ' selected' : ''}`,
                role: 'button',
                tabIndex: 0,
                ariaLabel: `${item.name}${quote?.lowestSell != null ? `, lowest sell ${quote.lowestSell}` : ''}`,
                onclick: () => this.select(item),
                onkeydown: (event: KeyboardEvent) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.select(item);
                  }
                },
              },
                h('img', { className: 'shop-icon', src: itemIconUrl(item), alt: '' }),
                h('span', { className: 'shop-name' }, item.name),
                quote?.lowestSell != null
                  ? h('span', { className: 'shop-price', title: `${quote.sellVolume.toLocaleString()} for sale` }, quote.lowestSell.toLocaleString())
                  : h('span', { className: 'tab-hint' }, 'none listed'),
              );
              attachItemTooltip(row, () => item);
              return row;
            }),
          ),
    );
  }

  private renderPack(self: SelfState): HTMLElement {
    const carried = new Map<string, ItemDefinition>();
    for (const stack of self.inventory) {
      const item = stack ? GAME_CONTENT.items.get(stack.itemId) : undefined;
      if (item && isTradable(item)) carried.set(item.id, item);
    }
    if (carried.size === 0) return h('p', { className: 'tab-hint' }, 'Nothing in your pack can be traded. Quest items and scrip stay with you.');
    return h('div', { className: 'shop-sell-grid market-list' },
      ...[...carried.values()].map((item) => {
        const owned = countItem(self.inventory, item.id);
        const cell = h('button', {
          className: `inventory-slot filled rarity-${item.rarity}${this.selected?.id === item.id ? ' selected' : ''}`,
          type: 'button',
          onclick: () => this.select(item),
        },
          h('img', { src: itemIconUrl(item), alt: item.name }),
          owned > 1 && h('span', { className: 'stack-count' }, owned.toLocaleString()),
        );
        attachItemTooltip(cell, () => item);
        return cell;
      }),
    );
  }

  private renderForm(side: MarketSide, self: SelfState, scrip: number): HTMLElement {
    const item = this.selected;
    if (!item) return h('p', { className: 'tab-hint' }, side === 'buy' ? 'Pick an item to place a buy order.' : 'Pick something from your pack to sell.');
    const quote = this.quotes.get(item.id);
    const price = parseWhole(this.price);
    const quantity = parseWhole(this.quantity);
    const carried = countItem(self.inventory, item.id);
    const limit = side === 'sell' ? Math.min(carried, MAX_MARKET_QUANTITY) : MAX_MARKET_QUANTITY;
    const total = price * quantity;
    const problem =
      !(price >= 1 && price <= MAX_MARKET_PRICE) ? 'Enter a price of at least 1.'
      : !(quantity >= 1 && quantity <= limit) ? (side === 'sell' ? `You carry ${carried.toLocaleString()}.` : 'Enter a quantity.')
      : side === 'buy' && total > scrip ? `You need ${total.toLocaleString()} scrip.`
      : this.orders.length >= MARKET_ORDER_LIMIT ? 'All your order slots are in use.'
      : null;
    const usePrice = (value: number) => {
      this.price = String(value);
      this.render();
    };
    const field = (label: string, key: 'price' | 'quantity', max: number) => h('label', { className: 'field market-field' },
      h('span', { className: 'field-label' }, label),
      guardTyping(h('input', {
        className: 'field-input',
        type: 'number',
        min: '1',
        max: String(max),
        step: '1',
        value: this[key],
        dataset: { focusKey: key },
        oninput: (event: Event) => {
          this[key] = (event.target as HTMLInputElement).value;
          this.render();
        },
      })),
    );
    const hint = (label: string, value: number | null | undefined, volume: number | undefined) =>
      value != null
        ? h('button', { className: 'market-quote', type: 'button', onclick: () => usePrice(value) }, label, ' ', h('span', { className: 'shop-price' }, value.toLocaleString()), ` (${(volume ?? 0).toLocaleString()})`)
        : h('span', { className: 'market-quote empty' }, `${label} —`);

    return h('form', {
      className: 'market-form',
      onsubmit: (event: Event) => {
        event.preventDefault();
        if (problem) return;
        this.connection.send({ type: 'market.place', side, itemId: item.id, price, quantity });
        this.quantity = '1';
      },
    },
      h('div', { className: 'market-form-item' },
        h('img', { className: 'shop-icon', src: itemIconUrl(item), alt: '' }),
        h('div', {}, h('strong', {}, item.name), h('p', { className: 'tab-hint' }, side === 'sell' ? `You carry ${carried.toLocaleString()}` : `Default price ${defaultMarketPrice(item).toLocaleString()}`)),
      ),
      h('div', { className: 'market-quotes' },
        h('button', { className: 'market-quote', type: 'button', onclick: () => usePrice(defaultMarketPrice(item)) }, 'Default ', h('span', { className: 'shop-price' }, defaultMarketPrice(item).toLocaleString())),
        hint('Lowest sell', quote?.lowestSell, quote?.sellVolume),
        hint('Highest buy', quote?.highestBuy, quote?.buyVolume),
      ),
      field(side === 'buy' ? 'Most you will pay each' : 'Least you will take each', 'price', MAX_MARKET_PRICE),
      field('Quantity', 'quantity', limit),
      h('p', { className: 'market-total' }, side === 'buy' ? 'Scrip held in escrow ' : 'Earns at least ', h('span', { className: 'shop-price' }, Number.isFinite(total) && total > 0 ? total.toLocaleString() : '0')),
      problem && h('p', { className: 'market-problem' }, problem),
      h('button', { className: 'button primary wide', type: 'submit', disabled: problem !== null }, side === 'buy' ? 'Place buy order' : 'Place sell order'),
    );
  }
}
