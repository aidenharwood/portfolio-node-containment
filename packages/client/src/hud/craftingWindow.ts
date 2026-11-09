import {
  countItem,
  craftableCount,
  craftingBlocker,
  GAME_CONTENT,
  levelForExperience,
  SKILL_INFO,
  STATION_INFO,
  type CraftingStation,
  type RecipeDefinition,
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

export class CraftingWindow {
  readonly element = h('section', { className: 'crafting-window panel', hidden: true, role: 'dialog', ariaLabel: 'Crafting station' });
  private readonly connection: GameConnection;
  private readonly world: WorldState;
  private station: CraftingStation | null = null;
  private selectedRecipeId: string | null = null;
  private readonly unsubscribers: (() => void)[];

  constructor(connection: GameConnection, world: WorldState) {
    this.connection = connection;
    this.world = world;
    this.unsubscribers = [
      connection.on('crafting.opened', ({ station }) => this.open(station)),
      connection.on('crafting.closed', () => this.hide()),
      world.on('selfChanged', () => this.render()),
    ];
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
    const recipes = this.recipes();
    const selected = recipes.find((recipe) => recipe.id === this.selectedRecipeId) ?? recipes.find((recipe) => !craftingBlocker(recipe, self.skills, self.inventory, GAME_CONTENT.items)) ?? recipes[0];
    const skills = [...new Set(recipes.map((recipe) => recipe.skill))];
    preserveScroll(this.element, ['.crafting-list'], () => replaceChildren(
      this.element,
      h('header', { className: 'shop-header' },
        h('div', {},
          h('h3', {}, info.name),
          h('p', { className: 'shop-greeting' }, info.summary, ...skills.map((skill) => ` · ${SKILL_INFO[skill].name} ${levelForExperience(self.skills[skill])}`)),
        ),
        h('button', { className: 'dialogue-close', type: 'button', ariaLabel: 'Close station', onclick: () => this.requestClose() }, '×'),
      ),
      h('div', { className: 'crafting-columns' },
        h('ul', { className: 'crafting-list' }, ...recipes.map((recipe) => this.renderRecipeRow(recipe, self, recipe === selected))),
        selected ? this.renderDetail(selected, self) : h('p', { className: 'tab-hint' }, 'No patterns are loaded.'),
      ),
    ));
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
