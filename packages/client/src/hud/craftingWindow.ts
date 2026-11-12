import {
  countItem,
  craftableCount,
  craftingBlocker,
  GAME_CONTENT,
  GEAR_MOTIF_INFO,
  GEAR_MOTIFS,
  gearLineOf,
  levelForExperience,
  RECIPE_GROUP_LABELS,
  RECIPE_GROUPS,
  recipeGroupOf,
  SKILL_INFO,
  STATION_INFO,
  type CraftingStation,
  type GearMotif,
  type RecipeDefinition,
  type RecipeGroup,
  type SelfState,
} from '@containment/shared';
import type { GameConnection } from '../net/gameConnection.ts';
import { itemIconUrl } from '../render/items/itemSprites.ts';
import type { WorldState } from '../state/worldState.ts';
import { h, replaceChildren } from '../ui/dom.ts';
import { attachItemTooltip } from '../ui/itemTooltip.ts';
import { preserveScroll } from './quantityActions.ts';
import { promptQuantity } from './quantityPrompt.ts';

const BATCH_SIZES = [1, 5] as const;

interface CraftingFilter {
  group: RecipeGroup | 'all';
  line: GearMotif | 'all';
  makeableOnly: boolean;
  query: string;
}

const lineOf = (recipe: RecipeDefinition): GearMotif | null => {
  const item = GAME_CONTENT.items.get(recipe.output.itemId);
  return item ? gearLineOf(item) : null;
};

export class CraftingWindow {
  readonly element = h('section', { className: 'crafting-window panel', hidden: true, role: 'dialog', ariaLabel: 'Crafting station' });
  private readonly connection: GameConnection;
  private readonly world: WorldState;
  private station: CraftingStation | null = null;
  private selectedRecipeId: string | null = null;
  private readonly filters = new Map<CraftingStation, CraftingFilter>();
  private readonly search = h('input', { className: 'crafting-search', type: 'search', placeholder: 'Search patterns', ariaLabel: 'Search patterns' });
  private readonly unsubscribers: (() => void)[];

  constructor(connection: GameConnection, world: WorldState) {
    this.connection = connection;
    this.world = world;
    this.unsubscribers = [
      connection.on('crafting.opened', ({ station }) => this.open(station)),
      connection.on('crafting.closed', () => this.hide()),
      world.on('selfChanged', () => this.render()),
    ];
    this.search.oninput = () => {
      this.filter().query = this.search.value;
      this.render();
    };
  }

  private filter(): CraftingFilter {
    const station = this.station ?? 'fabricator';
    let filter = this.filters.get(station);
    if (!filter) {
      filter = { group: 'all', line: 'all', makeableOnly: false, query: '' };
      this.filters.set(station, filter);
    }
    return filter;
  }

  private matches(recipe: RecipeDefinition, self: SelfState, filter: CraftingFilter, ignoreGroup = false): boolean {
    const group = recipeGroupOf(recipe, GAME_CONTENT.items);
    if (!ignoreGroup && filter.group !== 'all' && group !== filter.group) return false;
    if (!ignoreGroup && filter.group === 'armour' && filter.line !== 'all' && lineOf(recipe) !== filter.line) return false;
    if (filter.makeableOnly && craftingBlocker(recipe, self.skills, self.inventory, GAME_CONTENT.items)) return false;
    const query = filter.query.trim().toLowerCase();
    if (query) {
      const item = GAME_CONTENT.items.get(recipe.output.itemId);
      if (!(item?.name ?? recipe.output.itemId).toLowerCase().includes(query)) return false;
    }
    return true;
  }

  get isOpen(): boolean {
    return this.station !== null;
  }

  requestClose(): void {
    if (this.station) this.connection.send({ type: 'crafting.close' });
    this.hide();
  }

  dispose(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
  }

  private open(station: CraftingStation): void {
    this.station = station;
    this.selectedRecipeId = null;
    this.element.hidden = false;
    this.render();
  }

  private hide(): void {
    this.station = null;
    this.element.hidden = true;
  }

  private recipes(): RecipeDefinition[] {
    return [...GAME_CONTENT.recipes.values()].filter((recipe) => recipe.station === this.station).sort((a, b) => a.level - b.level);
  }

  private render(): void {
    const station = this.station;
    const self = this.world.self;
    if (!station || !self) return;
    const info = STATION_INFO[station];
    const all = this.recipes();
    const filter = this.filter();
    const recipes = all.filter((recipe) => this.matches(recipe, self, filter));
    const searchFocused = document.activeElement === this.search;
    const caret = this.search.selectionStart;
    this.search.value = filter.query;
    const selected = recipes.find((recipe) => recipe.id === this.selectedRecipeId) ?? recipes.find((recipe) => !craftingBlocker(recipe, self.skills, self.inventory, GAME_CONTENT.items)) ?? recipes[0];
    const skills = [...new Set(all.map((recipe) => recipe.skill))];
    preserveScroll(this.element, ['.crafting-list'], () => replaceChildren(
      this.element,
      h('header', { className: 'shop-header' },
        h('div', {},
          h('h3', {}, info.name),
          h('p', { className: 'shop-greeting' }, info.summary, ...skills.map((skill) => ` · ${SKILL_INFO[skill].name} ${levelForExperience(self.skills[skill])}`)),
        ),
        h('button', { className: 'dialogue-close', type: 'button', ariaLabel: 'Close station', onclick: () => this.requestClose() }, '×'),
      ),
      this.renderFilters(all, self, filter),
      h('div', { className: 'crafting-columns' },
        recipes.length > 0
          ? h('ul', { className: 'crafting-list' }, ...recipes.map((recipe) => this.renderRecipeRow(recipe, self, recipe === selected)))
          : h('p', { className: 'tab-hint crafting-empty' }, 'No patterns match these filters.'),
        selected ? this.renderDetail(selected, self) : h('p', { className: 'tab-hint' }, 'No patterns are loaded.'),
      ),
    ));
    if (searchFocused) {
      this.search.focus();
      if (caret !== null) this.search.setSelectionRange(caret, caret);
    }
  }

  private renderFilters(all: readonly RecipeDefinition[], self: SelfState, filter: CraftingFilter): HTMLElement {
    const set = (change: Partial<CraftingFilter>) => {
      Object.assign(filter, change);
      this.selectedRecipeId = null;
      this.render();
    };
    const counted = all.filter((recipe) => this.matches(recipe, self, filter, true));
    const countOf = (group: RecipeGroup | 'all') => (group === 'all' ? counted.length : counted.filter((recipe) => recipeGroupOf(recipe, GAME_CONTENT.items) === group).length);
    const groups = RECIPE_GROUPS.filter((group) => all.some((recipe) => recipeGroupOf(recipe, GAME_CONTENT.items) === group));
    const tab = (group: RecipeGroup | 'all', label: string) =>
      h('button', {
        className: `crafting-tab${filter.group === group ? ' active' : ''}`,
        type: 'button',
        role: 'tab',
        ariaSelected: String(filter.group === group),
        onclick: () => set({ group, line: 'all' }),
      }, label, h('span', { className: 'crafting-tab-count' }, String(countOf(group))));
    const armour = all.filter((recipe) => recipeGroupOf(recipe, GAME_CONTENT.items) === 'armour');
    const lines = GEAR_MOTIFS.filter((motif) => armour.some((recipe) => lineOf(recipe) === motif));
    const chip = (line: GearMotif | 'all', label: string, title?: string) =>
      h('button', { className: `crafting-chip${filter.line === line ? ' active' : ''}`, type: 'button', title: title ?? label, onclick: () => set({ line }) }, label);
    return h('div', { className: 'crafting-filters' },
      h('div', { className: 'crafting-tabs', role: 'tablist', ariaLabel: 'Pattern groups' },
        ...(groups.length > 1 ? [tab('all', 'All'), ...groups.map((group) => tab(group, RECIPE_GROUP_LABELS[group]))] : []),
      ),
      h('div', { className: 'crafting-tools' },
        this.search,
        h('button', {
          className: `crafting-chip${filter.makeableOnly ? ' active' : ''}`,
          type: 'button',
          ariaPressed: String(filter.makeableOnly),
          onclick: () => set({ makeableOnly: !filter.makeableOnly }),
        }, 'Can make'),
      ),
      filter.group === 'armour' && lines.length > 1 && h('div', { className: 'crafting-lines' },
        chip('all', 'All lines'),
        ...lines.map((line) => chip(line, GEAR_MOTIF_INFO[line].name, GEAR_MOTIF_INFO[line].summary)),
      ),
    );
  }

  private renderRecipeRow(recipe: RecipeDefinition, self: SelfState, isSelected: boolean): HTMLElement {
    const item = GAME_CONTENT.items.get(recipe.output.itemId);
    const levelLocked = levelForExperience(self.skills[recipe.skill]) < recipe.level;
    const ready = !craftingBlocker(recipe, self.skills, self.inventory, GAME_CONTENT.items);
    const row = h('li', {},
      h('button', {
        className: `crafting-row${isSelected ? ' selected' : ''}${levelLocked ? ' locked' : ''}${ready ? ' ready' : ' missing'}`,
        type: 'button',
        onclick: () => {
          this.selectedRecipeId = recipe.id;
          this.render();
        },
      },
        item && h('img', { className: 'shop-icon', src: itemIconUrl(item), alt: '' }),
        h('span', { className: 'shop-name' }, item?.name ?? recipe.output.itemId),
        h('span', { className: 'crafting-level' }, levelLocked ? `Lv ${recipe.level}` : ready ? '●' : ''),
      ),
    );
    if (item) attachItemTooltip(row, () => item);
    return row;
  }

  private renderDetail(recipe: RecipeDefinition, self: SelfState): HTMLElement {
    const item = GAME_CONTENT.items.get(recipe.output.itemId);
    const blocker = craftingBlocker(recipe, self.skills, self.inventory, GAME_CONTENT.items);
    const possible = blocker ? 0 : craftableCount(recipe, self.inventory);
    const make = (quantity: number) => this.connection.send({ type: 'crafting.make', recipeId: recipe.id, quantity: Math.max(1, Math.min(quantity, possible, 1000)) });
    const verb = STATION_INFO[recipe.station].verb;
    return h('div', { className: 'crafting-detail' },
      h('div', { className: 'crafting-output' },
        item && h('img', { className: 'crafting-output-icon', src: itemIconUrl(item), alt: '' }),
        h('div', {},
          h('h4', {}, recipe.output.count > 1 ? `${recipe.output.count} × ${item?.name}` : item?.name ?? recipe.output.itemId),
          h('p', { className: 'tab-hint' }, item?.examine ?? ''),
          h('p', { className: `crafting-requirement${levelForExperience(self.skills[recipe.skill]) < recipe.level ? ' unmet' : ''}` },
            `Requires ${SKILL_INFO[recipe.skill].name} ${recipe.level} · +${recipe.experience} XP each`),
        ),
      ),
      h('p', { className: 'eyebrow' }, 'Materials'),
      h('ul', { className: 'crafting-inputs' },
        ...recipe.inputs.map((input) => {
          const material = GAME_CONTENT.items.get(input.itemId);
          const have = countItem(self.inventory, input.itemId);
          const row = h('li', { className: have >= input.count ? 'met' : 'unmet' },
            material && h('img', { src: itemIconUrl(material), alt: '' }),
            h('span', {}, material?.name ?? input.itemId),
            h('strong', {}, `${have} / ${input.count}`),
          );
          if (material) attachItemTooltip(row, () => material);
          return row;
        }),
      ),
      h('footer', { className: 'crafting-actions' },
        blocker ? h('span', { className: 'crafting-blocker' }, blocker) : h('span', { className: 'tab-hint' }, `Enough for ${possible}`),
        h('span', { className: 'crafting-verb' }, `${verb}:`),
        ...BATCH_SIZES.map((size) =>
          h('button', { className: size === 1 ? 'button small' : 'button ghost small', type: 'button', disabled: possible < size, onclick: () => make(size) }, String(size)),
        ),
        h('button', {
          className: 'button ghost small',
          type: 'button',
          disabled: possible < 1,
          onclick: () => promptQuantity(`${verb} how many ${item?.name ?? ''}?`, possible, make),
        }, 'X'),
        h('button', { className: 'button ghost small', type: 'button', disabled: possible < 1, onclick: () => make(possible) }, 'All'),
      ),
    );
  }
}
