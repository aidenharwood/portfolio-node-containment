import type { CreatureDefinition } from '../combat/creatures.ts';
import type { GatheringSource } from '../crafting/gathering.ts';
import type { RecipeDefinition } from '../crafting/recipes.ts';
import { tierForLevel } from '../crafting/tiers.ts';
import type { ItemDefinition } from '../gear/items.ts';
import type { ItemId } from '../ids.ts';
import type { GameContent } from './gameContent.ts';

export const gatheringSourcesOf = (content: GameContent, objectId: string): GatheringSource[] =>
  (content.worldObjects.get(objectId)?.interactions ?? []).flatMap((interaction) => (interaction.gather ? [interaction.gather] : []));

export function rawSourceTiers(content: GameContent): Map<ItemId, number> {
  const tiers = new Map<ItemId, number>();
  const offer = (itemId: ItemId, tier: number) => tiers.set(itemId, Math.min(tier, tiers.get(itemId) ?? Infinity));
  for (const zone of content.districts.values()) {
    for (const placement of zone.objects) {
      for (const source of gatheringSourcesOf(content, placement.objectId)) offer(source.itemId, zone.tier);
    }
    for (const placement of zone.creatures ?? []) {
      for (const entry of content.creatures.get(placement.creatureId)?.loot ?? []) offer(entry.itemId, zone.tier);
    }
  }
  return tiers;
}

export function availabilityTiers(content: GameContent): Map<ItemId, number> {
  const raw = rawSourceTiers(content);
  const recipesByOutput = new Map<ItemId, RecipeDefinition[]>();
  for (const recipe of content.recipes.values()) {
    recipesByOutput.set(recipe.output.itemId, [...(recipesByOutput.get(recipe.output.itemId) ?? []), recipe]);
  }
  const resolved = new Map<ItemId, number>();
  const visiting = new Set<ItemId>();
  const tierOf = (itemId: ItemId): number => {
    const known = resolved.get(itemId);
    if (known !== undefined) return known;
    if (visiting.has(itemId)) return Infinity;
    visiting.add(itemId);
    const crafted = (recipesByOutput.get(itemId) ?? []).map((recipe) => Math.max(1, ...recipe.inputs.map((input) => tierOf(input.itemId))));
    const tier = Math.min(raw.get(itemId) ?? Infinity, ...crafted);
    visiting.delete(itemId);
    resolved.set(itemId, tier);
    return tier;
  };
  for (const itemId of content.items.keys()) tierOf(itemId);
  return resolved;
}

function placedDroppers(content: GameContent): Map<ItemId, CreatureDefinition[]> {
  const droppers = new Map<ItemId, CreatureDefinition[]>();
  const placed = new Set([...content.districts.values()].flatMap((zone) => (zone.creatures ?? []).map((placement) => placement.creatureId)));
  for (const creatureId of placed) {
    const creature = content.creatures.get(creatureId);
    for (const entry of creature?.loot ?? []) {
      if (creature) droppers.set(entry.itemId, [...(droppers.get(entry.itemId) ?? []), creature]);
    }
  }
  return droppers;
}

const highestRequirement =(item: ItemDefinition | undefined): number =>
  Math.max(1, ...Object.values(item?.equipment?.requirements?.skills ?? {}).map((level) => level ?? 1));

export function findCraftingIssues(content: GameContent): string[] {
  const issues: string[] = [];
  const report = (where: string, problem: string) => issues.push(`${where}: ${problem}`);
  const outputs = new Set([...content.recipes.values()].map((recipe) => recipe.output.itemId));

  for (const recipe of content.recipes.values()) {
    const where = `recipe ${recipe.id}`;
    if (recipe.level < 1) report(where, 'level must be at least 1');
    if (recipe.ticks < 1) report(where, 'ticks must be at least 1');
    if (recipe.inputs.length === 0) report(where, 'needs at least one input');
    for (const ingredient of [...recipe.inputs, recipe.output]) {
      if (!content.items.has(ingredient.itemId)) report(where, `unknown item "${ingredient.itemId}"`);
      if (ingredient.count < 1) report(where, `count for "${ingredient.itemId}" must be positive`);
    }
    const output = content.items.get(recipe.output.itemId);
    if (output?.equipment && recipe.station !== 'fabricator') report(where, 'equipment is assembled at a fabricator');
    if (output?.consumable && recipe.station !== 'synthesiser') report(where, 'medicine is synthesised at a bio-synthesiser');
    if (output?.equipment && recipe.level < highestRequirement(output)) {
      report(where, `crafting level ${recipe.level} is below the item's equip requirement ${highestRequirement(output)}`);
    }
  }

  const droppers = placedDroppers(content);
  for (const item of content.items.values()) {
    if (item.unique) {
      const where = `item ${item.id}`;
      if (!item.equipment) report(where, 'only gear can be a unique drop');
      if (outputs.has(item.id)) report(where, 'a unique drop has no crafting recipe');
      const sources = droppers.get(item.id) ?? [];
      if (sources.length === 0) report(where, 'a unique drop must be in the loot of a placed creature');
      const strongest = Math.max(0, ...sources.map((source) => source.level));
      if (sources.length > 0 && highestRequirement(item) > strongest) {
        report(where, `equip requirement ${highestRequirement(item)} is above the level ${strongest} of any creature that drops it`);
      }
      for (const source of sources) {
        const chance = source.loot.find((entry) => entry.itemId === item.id)?.chance ?? 0;
        if (chance >= 1) report(where, `${source.id} always drops it, so it is not a rare drop`);
      }
    } else if ((item.equipment || item.consumable) && !outputs.has(item.id)) {
      report(`item ${item.id}`, 'every piece of gear and every consumable needs a crafting recipe');
    }
  }

  for (const object of content.worldObjects.values()) {
    for (const source of gatheringSourcesOf(content, object.id)) {
      if (!content.items.has(source.itemId)) report(`object ${object.id}`, `gathers unknown item "${source.itemId}"`);
      if (source.level < 1 || source.attemptTicks < 1 || source.charges < 1) report(`object ${object.id}`, 'gathering level, ticks and charges must be positive');
    }
  }

  for (const zone of content.districts.values()) {
    for (const placement of zone.objects) {
      for (const source of gatheringSourcesOf(content, placement.objectId)) {
        if (tierForLevel(source.level) > zone.tier) {
          report(`zone ${zone.id}`, `"${placement.instanceId}" needs Salvage ${source.level}, too deep for a tier ${zone.tier} zone`);
        }
      }
    }
  }

  const available = availabilityTiers(content);
  for (const recipe of content.recipes.values()) {
    const output = content.items.get(recipe.output.itemId);
    if (!output?.equipment && !output?.consumable) continue;
    const gearTier = tierForLevel(Math.max(recipe.level, highestRequirement(output)));
    for (const input of recipe.inputs) {
      const tier = available.get(input.itemId) ?? Infinity;
      if (tier === Infinity) report(`recipe ${recipe.id}`, `"${input.itemId}" has no source in any zone`);
      else if (tier > gearTier) {
        report(`recipe ${recipe.id}`, `"${input.itemId}" is first found in tier ${tier}, deeper than this tier ${gearTier} recipe`);
      }
    }
  }

  return issues;
}
