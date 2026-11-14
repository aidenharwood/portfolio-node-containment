import { hitChance } from '../combat/combatMath.ts';
import { COMBAT_STYLE_INFO, WEAPON_KIND_INFO, type WeaponProfile } from '../combat/weapons.ts';
import type { RecipeDefinition } from '../crafting/recipes.ts';
import type { GearMotif, ItemDefinition } from '../gear/items.ts';
import type { StatBlock } from '../gear/stats.ts';

export interface VariantSpec {
  readonly base: string;
  readonly id: string;
  readonly name: string;
  readonly examine: string;
}

export const WEAPON_VARIANT_SPECS: readonly VariantSpec[] = [];

const RATING_PER_MAX_HIT = 4;

function expectedDamagePerTick(rating: number, damageScale: number, defence: number, speedTicks: number): number {
  const maxHit = 1 + Math.floor((rating * damageScale) / RATING_PER_MAX_HIT);
  return (hitChance(rating, defence) * (maxHit + 1)) / 2 / speedTicks;
}

export interface PacedWeapon {
  readonly damageScale: number;
  readonly speedTicks: number;
}

export function matchedRatingBonus(skillLevel: number, reference: PacedWeapon & { readonly bonus: number }, target: PacedWeapon): number {
  const defence = Math.round(skillLevel * 1.2);
  const goal = expectedDamagePerTick(skillLevel + reference.bonus, reference.damageScale, defence, reference.speedTicks);
  let best = reference.bonus;
  let bestGap = Infinity;
  for (let bonus = 0; bonus <= reference.bonus * 3 + 20; bonus++) {
    const gap = Math.abs(expectedDamagePerTick(skillLevel + bonus, target.damageScale, defence, target.speedTicks) - goal);
    if (gap < bestGap) {
      best = bonus;
      bestGap = gap;
    }
  }
  return best;
}

function balancedRatingBonus(weapon: WeaponProfile, speedTicks: number, skillLevel: number, baseBonus: number): number {
  const damageScale = WEAPON_KIND_INFO[weapon.kind].damageScale;
  return matchedRatingBonus(skillLevel, { damageScale, speedTicks: weapon.speedTicks, bonus: baseBonus }, { damageScale, speedTicks });
}

function variantOf(base: ItemDefinition, spec: VariantSpec): ItemDefinition {
  const equipment = base.equipment;
  const weapon = equipment?.weapon;
  if (!equipment || !weapon) throw new Error(`Weapon variant base ${spec.base} is not a weapon.`);
  const style = WEAPON_KIND_INFO[weapon.kind].style;
  const { skill, offenceStat: statId } = COMBAT_STYLE_INFO[style];
  const quicker = weapon.speedTicks >= 5;
  const speedTicks = weapon.speedTicks + (quicker ? -1 : 1);
  const motif: GearMotif = style === 'psionic' ? 'warden' : quicker ? 'skirmisher' : 'bulwark';
  const skillLevel = Math.max(1, equipment.requirements?.skills?.[skill] ?? 1);
  const stats: StatBlock = { ...equipment.stats, [statId]: balancedRatingBonus(weapon, speedTicks, skillLevel, equipment.stats[statId] ?? 0) };
  return {
    ...base,
    id: spec.id,
    name: spec.name,
    examine: spec.examine,
    equipment: { ...equipment, stats, visual: { ...equipment.visual, motif }, weapon: { ...weapon, speedTicks } },
  };
}

export function weaponVariants(catalog: ReadonlyMap<string, ItemDefinition>, specs: readonly VariantSpec[] = WEAPON_VARIANT_SPECS): ItemDefinition[] {
  return specs.map((spec) => {
    const base = catalog.get(spec.base);
    if (!base) throw new Error(`Weapon variant base ${spec.base} does not exist.`);
    return variantOf(base, spec);
  });
}

export function weaponVariantRecipes(recipes: readonly RecipeDefinition[], specs: readonly VariantSpec[] = WEAPON_VARIANT_SPECS): RecipeDefinition[] {
  return specs.flatMap((spec) => {
    const base = recipes.find((recipe) => recipe.output.itemId === spec.base);
    return base ? [{ ...base, id: `${base.station}:${spec.id}`, output: { itemId: spec.id, count: 1 } }] : [];
  });
}
