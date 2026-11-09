import { containmentSeals, sealTierFor } from '../combat/containment.ts';
import { TIER_LEVEL_FLOORS } from '../crafting/tiers.ts';
import { availabilityTiers } from './craftingIntegrity.ts';
import type { GameContent } from './gameContent.ts';

export function findContainmentIssues(content: GameContent): string[] {
  const issues: string[] = [];
  const report = (where: string, problem: string) => issues.push(`${where}: ${problem}`);
  const seals = containmentSeals(content.items);
  const sealTiers = new Set(seals.map((seal) => seal.containmentSeal?.tier));

  TIER_LEVEL_FLOORS.forEach((_floor, index) => {
    if (!sealTiers.has(index + 1)) report('containment', `no containment seal for tier ${index + 1}`);
  });

  const available = availabilityTiers(content);
  for (const seal of seals) {
    const where = `item ${seal.id}`;
    const tier = seal.containmentSeal?.tier ?? 0;
    const recipes = [...content.recipes.values()].filter((recipe) => recipe.output.itemId === seal.id);
    if (recipes.length === 0) report(where, 'a containment seal needs a crafting recipe');
    for (const recipe of recipes) {
      if (recipe.skill !== 'containment') report(`recipe ${recipe.id}`, 'containment seals train Containment');
      if (recipe.level > (TIER_LEVEL_FLOORS[tier - 1] ?? 1)) report(`recipe ${recipe.id}`, `level ${recipe.level} is above the tier ${tier} floor`);
      for (const input of recipe.inputs) {
        const inputTier = available.get(input.itemId) ?? Infinity;
        if (inputTier > tier) report(`recipe ${recipe.id}`, `"${input.itemId}" is first found in tier ${inputTier}, deeper than this tier ${tier} seal`);
      }
    }
  }

  for (const creature of content.creatures.values()) {
    const profile = creature.containment;
    if (!profile) continue;
    const where = `creature ${creature.id}`;
    if (!sealTiers.has(sealTierFor(creature))) report(where, `no seal is rated for its tier ${sealTierFor(creature)}`);
    if (profile.requiredLevel !== undefined && (!Number.isInteger(profile.requiredLevel) || profile.requiredLevel < 1 || profile.requiredLevel > creature.level)) {
      report(where, `required containment level ${profile.requiredLevel} must be a whole number from 1 to the specimen level ${creature.level}`);
    }
    if (profile.experience <= 0) report(where, 'containment experience must be positive');
    if (profile.procedures.trim().length === 0) report(where, 'containment procedures must be written');
    for (const entry of profile.loot) {
      const item = content.items.get(entry.itemId);
      if (!item) report(where, `unknown containment loot "${entry.itemId}"`);
      if (entry.chance <= 0 || entry.chance > 1) report(where, `containment loot chance for "${entry.itemId}" must be in (0, 1]`);
      if (item?.unique && !creature.loot.some((drop) => drop.itemId === entry.itemId)) {
        report(where, `unique "${entry.itemId}" must also be in its regular loot`);
      }
      if (item?.unique && entry.chance >= 1) report(where, `unique "${entry.itemId}" must stay a rare containment drop`);
    }
  }

  return issues;
}
