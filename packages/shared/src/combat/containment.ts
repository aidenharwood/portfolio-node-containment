import { levelForExperience, type SkillExperience } from '../character/skills.ts';
import { tierForLevel } from '../crafting/tiers.ts';
import { countItem, type InventoryState } from '../gear/inventory.ts';
import type { ItemCatalog, ItemDefinition } from '../gear/items.ts';
import type { ItemId } from '../ids.ts';
import { chebyshevDistance, type TilePoint } from '../world/geometry.ts';
import type { ContainmentClass, CreatureDefinition } from './creatures.ts';

export const CONTAINMENT_THRESHOLD = 0.1;

export const CONTAINMENT_REACH = 2;

export interface ContainmentClassInfo {
  readonly name: string;
  readonly summary: string;
}

export const CONTAINMENT_CLASS_INFO: Readonly<Record<ContainmentClass, ContainmentClassInfo>> = {
  safe: { name: 'Safe', summary: 'Reliably contained when procedures are followed.' },
  euclid: { name: 'Euclid', summary: 'Contained, but not well understood. Expect deviations.' },
  keter: { name: 'Keter', summary: 'Resists containment. Every successful re-housing is provisional.' },
};

export const isContainable = (creature: CreatureDefinition): boolean => creature.containment !== undefined;

export const containmentThreshold = (maxIntegrity: number): number => Math.max(1, Math.floor(maxIntegrity * CONTAINMENT_THRESHOLD));

export const isWeakenedForContainment = (integrity: number, maxIntegrity: number): boolean =>
  integrity > 0 && integrity <= containmentThreshold(maxIntegrity);

export const containmentLevelFor = (creature: CreatureDefinition): number => creature.containment?.requiredLevel ?? creature.level;

export const sealTierFor = (creature: CreatureDefinition): number => tierForLevel(containmentLevelFor(creature));

export const isWithinContainmentReach = (from: TilePoint, to: TilePoint, hasSightline: (from: TilePoint, to: TilePoint) => boolean): boolean =>
  chebyshevDistance(from, to) <= CONTAINMENT_REACH && hasSightline(from, to);

const sealsByCatalog = new WeakMap<ItemCatalog, readonly ItemDefinition[]>();

export function containmentSeals(catalog: ItemCatalog): readonly ItemDefinition[] {
  const cached = sealsByCatalog.get(catalog);
  if (cached) return cached;
  const seals = [...catalog.values()].filter((item) => item.containmentSeal !== undefined).sort((a, b) => (a.containmentSeal?.tier ?? 0) - (b.containmentSeal?.tier ?? 0));
  sealsByCatalog.set(catalog, seals);
  return seals;
}

export function sealFor(inventory: InventoryState, catalog: ItemCatalog, tier: number): ItemId | null {
  const seal = containmentSeals(catalog).find((item) => (item.containmentSeal?.tier ?? 0) >= tier && countItem(inventory, item.id) > 0);
  return seal?.id ?? null;
}

const sealNameFor = (catalog: ItemCatalog, tier: number): string =>
  containmentSeals(catalog).find((item) => item.containmentSeal?.tier === tier)?.name ?? `a tier ${tier} containment seal`;

export function containmentReadiness(creature: CreatureDefinition, skills: SkillExperience, inventory: InventoryState, catalog: ItemCatalog): string | null {
  if (!isContainable(creature)) return `${creature.name} cannot be contained.`;
  const required = containmentLevelFor(creature);
  if (levelForExperience(skills.containment) < required) return `You need Containment level ${required} to contain ${creature.name}.`;
  const tier = sealTierFor(creature);
  if (!sealFor(inventory, catalog, tier)) return `You need ${sealNameFor(catalog, tier)} or better to contain ${creature.name}.`;
  return null;
}

export function containmentBlocker(
  creature: CreatureDefinition,
  integrity: number,
  skills: SkillExperience,
  inventory: InventoryState,
  catalog: ItemCatalog,
): string | null {
  const readiness = containmentReadiness(creature, skills, inventory, catalog);
  if (readiness) return readiness;
  if (!isWeakenedForContainment(integrity, creature.integrity)) {
    return `${creature.name} is too strong to contain. Wear it down to ${containmentThreshold(creature.integrity)} integrity first.`;
  }
  return null;
}

export const CONTAIN_INTERACTION = 1;
