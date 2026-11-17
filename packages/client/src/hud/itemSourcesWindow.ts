import {
  GAME_CONTENT,
  itemSources,
  ITEM_SOURCE_KINDS,
  SKILL_INFO,
  STATION_INFO,
  type ItemId,
  type ItemSource,
  type ItemSourceKind,
  type SourceLocation,
} from '@containment/shared';
import { itemIconUrl } from '../render/items/itemSprites.ts';
import { h, replaceChildren } from '../ui/dom.ts';
import { attachItemTooltip } from '../ui/itemTooltip.ts';

let cachedSources: ReadonlyMap<ItemId, readonly ItemSource[]> | null = null;
const sourcesOf = (itemId: ItemId): readonly ItemSource[] => {
  cachedSources ??= itemSources(GAME_CONTENT);
  return cachedSources.get(itemId) ?? [];
};

const GROUP_LABELS: Readonly<Record<ItemSourceKind, string>> = {
  gather: 'Gathered',
  drop: 'Dropped by',
  containment: 'Recovered by containing',
  recipe: 'Crafted',
  shop: 'Sold by',
  sell: 'Selling items to',
  object: 'Found',
  npc: 'Given by',
  quest: 'Quest reward',
  contract: 'Contract reward',
  starter: 'Starting kit',
};

const itemName = (itemId: ItemId): string => GAME_CONTENT.items.get(itemId)?.name ?? itemId;

const percent = (chance: number): string => (chance >= 1 ? 'Always' : `${Math.max(1, Math.round(chance * 100))}% chance`);

const times = (count: number): string => (count > 1 ? ` × ${count}` : '');

const questOnly = (questId: string | null): string => (questId ? ` · Only during ${GAME_CONTENT.quests.get(questId)?.name ?? questId}` : '');

const placeText = (locations: readonly SourceLocation[], none: string): string =>
  locations.length > 0 ? locations.map((location) => `${location.districtName || location.levelName}${location.count > 1 ? ` (${location.count})` : ''}`).join(', ') : none;

export class ItemSourcesWindow {
  readonly element = h('section', { className: 'item-sources-window panel', hidden: true, role: 'dialog', ariaLabel: 'Where to get it' });
  private readonly heading = h('h3', {});
  private readonly icon = h('img', { className: 'item-sources-icon', alt: '' });
  private readonly backButton = h('button', { className: 'button ghost small', type: 'button', onclick: () => this.back() }, '← Back');
  private readonly list = h('div', { className: 'item-sources-list' });
  private history: ItemId[] = [];

  constructor() {
    replaceChildren(
      this.element,
      h('header', { className: 'shop-header' },
        h('div', { className: 'item-sources-title' }, this.icon, h('div', {}, h('p', { className: 'eyebrow' }, 'Where to get it'), this.heading)),
        h('div', { className: 'item-sources-controls' },
          this.backButton,
          h('button', { className: 'dialogue-close', type: 'button', ariaLabel: 'Close', onclick: () => this.hide() }, '×'),
        ),
      ),
      this.list,
    );
  }

  get isOpen(): boolean {
    return !this.element.hidden;
  }

  show(itemId: ItemId): void {
    this.history = [itemId];
    this.render();
  }

  hide(): void {
    this.history = [];
    this.element.hidden = true;
  }

  private open(itemId: ItemId): void {
    if (this.history.at(-1) === itemId) return;
    this.history.push(itemId);
    this.render();
  }

  private back(): void {
    if (this.history.length > 1) this.history.pop();
    this.render();
  }

  private render(): void {
    const itemId = this.history.at(-1);
    if (!itemId) return;
    const item = GAME_CONTENT.items.get(itemId);
    this.element.hidden = false;
    this.heading.textContent = itemName(itemId);
    this.icon.hidden = !item;
    if (item) this.icon.src = itemIconUrl(item);
    this.backButton.hidden = this.history.length < 2;
    const sources = sourcesOf(itemId);
    const groups = ITEM_SOURCE_KINDS.map((kind) => [kind, sources.filter((source) => source.kind === kind)] as const).filter(([, group]) => group.length > 0);
    replaceChildren(
      this.list,
      ...(groups.length > 0
        ? groups.map(([kind, group]) => h('section', { className: 'item-sources-group' },
          h('p', { className: 'eyebrow' }, GROUP_LABELS[kind]),
          ...group.map((source) => this.row(source)),
        ))
        : [h('p', { className: 'tab-hint' }, 'There is no known way to get this item.')]),
    );
    this.list.scrollTop = 0;
  }

  private row(source: ItemSource): HTMLElement {
    const line = (title: string, ...details: (string | HTMLElement | false)[]) =>
      h('div', { className: 'item-sources-row' },
        h('p', { className: 'item-sources-name' }, title),
        ...details.filter((detail): detail is string | HTMLElement => detail !== false && detail !== '').map((detail) =>
          typeof detail === 'string' ? h('p', { className: 'item-sources-detail' }, detail) : detail),
      );
    switch (source.kind) {
      case 'gather':
        return line(source.name, `${source.verb} · Requires ${SKILL_INFO[source.skill].name} ${source.level}${questOnly(source.onlyDuring)}`, placeText(source.locations, 'Not placed in the world yet'));
      case 'drop':
        return line(`${source.name} · Lv ${source.level}`, `${percent(source.chance)}${times(source.count)}`, placeText(source.locations, 'Not found roaming the world'));
      case 'containment':
        return line(source.name, `Requires ${SKILL_INFO.containment.name} ${source.level} · ${percent(source.chance)}${times(source.count)}`, placeText(source.locations, 'Not found roaming the world'));
      case 'recipe':
        return line(
          `${STATION_INFO[source.station].name}${times(source.count)}`,
          `Requires ${SKILL_INFO[source.skill].name} ${source.level}`,
          this.ingredients(source.recipeId),
        );
      case 'shop':
        return line(
          source.name,
          `${source.price} ${itemName(source.currencyItemId)}${source.unlockedBy ? ` · after ${GAME_CONTENT.quests.get(source.unlockedBy)?.name ?? source.unlockedBy}` : ''}`,
          placeText(source.locations, 'Vendor location unknown'),
        );
      case 'object':
        return line(`${source.name}${times(source.count)}`, `${source.verb}${questOnly(source.onlyDuring)}${source.once ? ' · Once per character' : ''}`, placeText(source.locations, 'Not placed in the world yet'));
      case 'npc':
        return line(`${source.name}${times(source.count)}`, 'Ask them about it in conversation', placeText(source.locations, 'Location unknown'));
      case 'sell':
        return line(source.name, 'Sell them the items they trade in', placeText(source.locations, 'Vendor location unknown'));
      case 'quest':
        return line(`${source.name}${times(source.count)}`, source.giver ? `Offered by ${source.giver}` : false, source.giver ? placeText(source.locations, 'Location unknown') : false);
      case 'contract':
        return line(
          `${source.contracts} Directorate contract${source.contracts > 1 ? 's' : ''}`,
          `${source.minCount === source.maxCount ? source.minCount : `${source.minCount}–${source.maxCount}`} each · from the contract board`,
        );
      case 'starter':
        return line(`Every new recruit${times(source.count)}`);
    }
  }

  private ingredients(recipeId: string): HTMLElement | false {
    const recipe = GAME_CONTENT.recipes.get(recipeId);
    if (!recipe) return false;
    return h('div', { className: 'item-sources-ingredients' },
      ...recipe.inputs.map((input) => {
        const material = GAME_CONTENT.items.get(input.itemId);
        const chip = h('button', {
          className: 'item-sources-chip',
          type: 'button',
          title: `Where to get ${itemName(input.itemId)}`,
          onclick: () => this.open(input.itemId),
        },
        material && h('img', { src: itemIconUrl(material), alt: '' }),
        `${input.count} × ${itemName(input.itemId)}`);
        if (material) attachItemTooltip(chip, () => material);
        return chip;
      }),
    );
  }
}
