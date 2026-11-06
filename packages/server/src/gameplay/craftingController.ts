import {
  craftingBlocker,
  craftOnce,
  SKILL_INFO,
  STATION_INFO,
  type CraftingStation,
  type GameContent,
  type RecipeDefinition,
} from '@containment/shared';
import type { Player } from '../world/player.ts';
import type { EffectRunner } from './effectRunner.ts';
import type { GatheringHost } from './gatheringController.ts';

export class CraftingController {
  private readonly content: GameContent;
  private readonly effects: EffectRunner;
  private readonly host: GatheringHost;

  constructor(content: GameContent, effects: EffectRunner, host: GatheringHost) {
    this.content = content;
    this.effects = effects;
    this.host = host;
  }

  open(player: Player, station: CraftingStation): void {
    player.craftingStation = station;
    player.send({ type: 'crafting.opened', station });
  }

  close(player: Player): void {
    this.stop(player);
    this.closeWindow(player);
  }

  private closeWindow(player: Player): void {
    if (!player.craftingStation) return;
    player.craftingStation = null;
    player.send({ type: 'crafting.closed' });
  }

  make(player: Player, recipeId: string, quantity: number, tick: number): void {
    const recipe = this.content.recipes.get(recipeId);
    if (!recipe || player.craftingStation !== recipe.station) {
      this.host.notify(player, 'warning', 'That pattern is not loaded on this station.');
      return;
    }
    const blocker = craftingBlocker(recipe, player.record.skills, player.record.inventory, this.content.items);
    if (blocker) {
      this.host.notify(player, 'warning', blocker);
      return;
    }
    this.closeWindow(player);
    player.activity = { kind: 'craft', recipeId, remaining: quantity, nextTick: tick + recipe.ticks };
    this.announce(player, recipe, quantity);
  }

  tick(tick: number, players: Iterable<Player>): void {
    for (const player of players) {
      const activity = player.activity;
      if (activity?.kind !== 'craft' || tick < activity.nextTick) continue;
      const recipe = this.content.recipes.get(activity.recipeId);
      if (!recipe) {
        this.stop(player);
        continue;
      }
      if (!this.craft(player, recipe)) {
        this.stop(player);
        continue;
      }
      const remaining = activity.remaining - 1;
      if (remaining <= 0) {
        this.stop(player);
        continue;
      }
      player.activity = { ...activity, remaining, nextTick: tick + recipe.ticks };
      this.announce(player, recipe, remaining);
    }
  }

  stop(player: Player): void {
    if (player.activity?.kind !== 'craft') return;
    player.activity = null;
    this.host.sendActivity(player, null);
  }

  private craft(player: Player, recipe: RecipeDefinition): boolean {
    const blocker = craftingBlocker(recipe, player.record.skills, player.record.inventory, this.content.items);
    if (blocker) {
      this.host.notify(player, 'info', blocker);
      return false;
    }
    const result = craftOnce(player.record.inventory, this.content.items, recipe);
    if (!result.ok) {
      this.host.notify(player, 'info', result.error);
      return false;
    }
    player.update({ inventory: result.value.inventory });
    const output = this.content.items.get(recipe.output.itemId);
    const name = output?.name ?? recipe.output.itemId;
    if (result.value.overflow > 0) {
      this.host.dropToGround(player, recipe.output.itemId, result.value.overflow, player.position);
      this.host.notify(player, 'warning', `Your inventory is full. The ${name} is set down at your feet.`);
    }
    const made = recipe.output.count > 1 ? `${recipe.output.count} × ${name}` : name;
    player.send({
      type: 'chat.message',
      channel: 'system',
      text: `You ${STATION_INFO[recipe.station].verb.toLowerCase()} ${made}. (+${recipe.experience} ${SKILL_INFO[recipe.skill].name} XP)`,
    });
    this.effects.awardExperience(player, recipe.skill, recipe.experience, false);
    this.host.raiseQuestEvent(player, { type: 'crafted', itemId: recipe.output.itemId, count: recipe.output.count });
    this.host.raiseQuestEvent(player, { type: 'loadoutChanged' });
    return true;
  }

  private announce(player: Player, recipe: RecipeDefinition, remaining: number): void {
    const name = this.content.items.get(recipe.output.itemId)?.name ?? recipe.output.itemId;
    this.host.sendActivity(player, `${STATION_INFO[recipe.station].progressVerb} ${name}`, recipe.ticks, remaining);
  }
}
