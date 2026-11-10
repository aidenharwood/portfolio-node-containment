import { CLEARANCE_TIERS, clearanceTierFor } from '../combat/containment.ts';
import type { GameContent } from './gameContent.ts';

export function findContainmentIssues(content: GameContent): string[] {
  const issues: string[] = [];
  const report = (where: string, problem: string) => issues.push(`${where}: ${problem}`);

  for (const creature of content.creatures.values()) {
    const profile = creature.containment;
    if (!profile) continue;
    const where = `creature ${creature.id}`;
    if (clearanceTierFor(creature) > CLEARANCE_TIERS) report(where, `no clearance covers its tier ${clearanceTierFor(creature)}`);
    if (creature.relentless) report(where, 'relentless training creatures cannot be containable');
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

  for (const creature of content.creatures.values()) {
    if (!creature.relentless) continue;
    const where = `creature ${creature.id}`;
    if (creature.loot.length > 0) report(where, 'relentless training creatures drop no loot');
    if (!creature.aggressive) report(where, 'relentless creatures must be aggressive');
    if (creature.attack.maxHit > 2) report(where, 'relentless creatures hit for at most 2');
  }

  return issues;
}
