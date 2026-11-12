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

export const WEAPON_VARIANT_SPECS: readonly VariantSpec[] = [
  { base: 'kestrel-sidearm', id: 'kestrel-snubnose', name: 'Kestrel Snubnose', examine: 'A cut-down Kestrel with a hair trigger. It speaks quickly and says less each time.' },
  { base: 'shock-maul', id: 'shock-mallet', name: 'Shock Mallet', examine: 'A shortened shock maul with a lighter head. It arcs less and swings more often.' },
  { base: 'marksman-carbine', id: 'marksman-snapgun', name: 'Marksman Snapgun', examine: 'A stripped-down carbine with a short barrel, for marksmen who prefer to keep moving.' },
  { base: 'breaching-machete', id: 'breaching-cleaver', name: 'Breaching Cleaver', examine: 'A broad, heavy cleaver for doors that do not want to be breached. Slower, but it finishes the job.' },
  { base: 'riot-pike', id: 'riot-spear', name: 'Riot Spear', examine: 'A light riot spear that jabs where the pike would shove. Quicker hands, smaller holes.' },
  { base: 'riot-scattergun', id: 'riot-sawnoff', name: 'Riot Sawn-off', examine: 'Both barrels shortened to the receiver. It fires faster than anyone would recommend.' },
  { base: 'cryo-maul', id: 'cryo-hammer', name: 'Cryo Hammer', examine: 'A one-hand rime hammer on a two-hand haft. It flash-freezes a little less, a little more often.' },
  { base: 'rime-carbine', id: 'rime-flechette', name: 'Rime Flechette', examine: 'A short-barrelled flechette gun that sprays frozen needles in quick, thin bursts.' },
  { base: 'rime-shiv', id: 'rime-dirk', name: 'Rime Dirk', examine: 'A long rime dirk, heavier than a shiv. It goes in slower and comes out colder.' },
  { base: 'frost-glaive', id: 'frost-partisan', name: 'Frost Partisan', examine: 'A slender frost spear with a short crossbar. It keeps things at arm\'s length, briskly.' },
  { base: 'arc-baton', id: 'arc-mace', name: 'Arc Mace', examine: 'A flanged arc mace. It talks less than the baton and says something each time.' },
  { base: 'arc-carbine', id: 'arc-stutter', name: 'Arc Stutter', examine: 'A short arc carbine that fires in nervous little bursts. The relay techs named it.' },
  { base: 'relay-cutlass', id: 'relay-broadsword', name: 'Relay Broadsword', examine: 'A broad, servo-weighted blade that pulls through a cut on its own. It takes its time.' },
  { base: 'arc-scattergun', id: 'arc-blunderbuss', name: 'Arc Blunderbuss', examine: 'A flared scattergun on a quick pump. Every shot crackles.' },
  { base: 'censor-maul', id: 'censor-gavel', name: 'Censor Gavel', examine: 'A light gavel of ink laminate. Objection noted, objection struck, objection noted.' },
  { base: 'inkshot-pistol', id: 'inkshot-revolver', name: 'Inkshot Revolver', examine: 'A heavy inkshot revolver. Each round lands like a full stop.' },
  { base: 'quill-knife', id: 'quill-stiletto', name: 'Quill Stiletto', examine: 'A long, deliberate stiletto. It writes one word per stroke and underlines it.' },
  { base: 'redaction-rifle', id: 'redaction-repeater', name: 'Redaction Repeater', examine: 'A lever-action redaction rifle. It blacks out lines faster than you can read them.' },
  { base: 'stoker-maul', id: 'stoker-shovel', name: 'Stoker\'s Shovel', examine: 'A furnace shovel with a sharpened edge. It feeds the fire one quick scoop at a time.' },
  { base: 'cinder-carbine', id: 'cinder-sprayer', name: 'Cinder Sprayer', examine: 'A short-barrelled cinder gun that spits embers in rapid little coughs.' },
  { base: 'furnace-cleaver', id: 'furnace-axe', name: 'Furnace Axe', examine: 'A heavy furnace axe. It glows along the bit and bites deep, eventually.' },
  { base: 'slag-pike', id: 'slag-lance', name: 'Slag Lance', examine: 'A slim slag-tipped lance, quick to the thrust and quicker back.' },
  { base: 'the-knocker', id: 'the-rapper', name: 'The Rapper', examine: 'A smaller knocker for smaller doors. It taps out a quick rhythm, and something always answers.' },
  { base: 'last-word', id: 'last-breath', name: 'Last Breath', examine: 'A short carbine that finishes every sentence early.' },
  { base: 'hinge-glaive', id: 'hinge-spear', name: 'Hinge Spear', examine: 'A slender spear with a hinge at the haft. It swings open and shut faster than any door.' },
  { base: 'farsight-rifle', id: 'nearsight-rifle', name: 'Nearsight Rifle', examine: 'A shorter-barrelled farsight. It sees less, sooner.' },
  { base: 'franking-hammer', id: 'franking-stamp-hammer', name: 'Franking Mallet', examine: 'A compact franking mallet. Stamp, stamp, stamp, and every one counts.' },
  { base: 'return-to-sender', id: 'express-delivery', name: 'Express Delivery', examine: 'A cut-down courier carbine. Next-tick delivery, guaranteed.' },
  { base: 'letter-opener', id: 'paper-knife', name: 'Paper Knife', examine: 'A long, heavy paper knife for envelopes that do not want to be opened.' },
  { base: 'long-haul-rifle', id: 'short-haul-rifle', name: 'Short Haul Rifle', examine: 'A local-delivery rifle. It never travels far, and it never travels slowly.' },
  { base: 'seam-maul', id: 'seam-pick', name: 'Seam Pick', examine: 'A miner\'s pick, light enough to work a seam all shift.' },
  { base: 'brine-cutter', id: 'brine-machete', name: 'Brine Machete', examine: 'A long brine-steel machete. It hacks through salt and whatever is grown into it.' },
  { base: 'seam-carbine', id: 'seam-burst', name: 'Seam Burst', examine: 'A compact seam carbine that rattles out short bursts down the gallery.' },
  { base: 'lampline-rifle', id: 'lampline-repeater', name: 'Lampline Repeater', examine: 'A lever-action lampline rifle. Each shot leaves a quick line of light.' },
  { base: 'censer-maul', id: 'censer-flail', name: 'Censer Flail', examine: 'A censer on a short chain. It swings quickly and leaves a sweet smoke behind.' },
  { base: 'reliquary-glaive', id: 'reliquary-spear', name: 'Reliquary Spear', examine: 'A slim reliquary spear with a single relic in the socket. Quick to bless, quicker to strike.' },
  { base: 'choir-carbine', id: 'choir-chanter', name: 'Choir Chanter', examine: 'A short choir carbine that fires in a fast plainsong rhythm.' },
  { base: 'vigil-rifle', id: 'vigil-repeater', name: 'Vigil Repeater', examine: 'A vigil rifle with a quick action, for a shorter, busier night.' },
  { base: 'bonesetter-maul', id: 'bonesetter-mallet', name: 'Bonesetter\'s Mallet', examine: 'A surgeon\'s mallet in ward steel. Tap, tap, set.' },
  { base: 'ward-scalpel', id: 'ward-amputator', name: 'Ward Amputator', examine: 'A long surgical blade for the procedures nobody wants. Slow, sure, final.' },
  { base: 'ward-carbine', id: 'ward-syringe-gun', name: 'Ward Syringe Gun', examine: 'A rapid syringe gun. Every dart is a dose, and the doses add up.' },
  { base: 'quarantine-rifle', id: 'quarantine-repeater', name: 'Quarantine Repeater', examine: 'A fast-cycling quarantine rifle for when the ward is filling up.' },
  { base: 'amputation-maul', id: 'third-opinion', name: 'Third Opinion', examine: 'A lighter consulting mallet. It agrees with the second opinion, more often.' },
  { base: 'tourniquet-glaive', id: 'tourniquet-spear', name: 'Tourniquet Spear', examine: 'A slim spear wound with tourniquet cord. Quick to the wound, quicker to close it.' },
  { base: 'physician-carbine', id: 'ward-round', name: 'Ward Round', examine: 'A short physician\'s carbine. It sees every patient, briskly.' },
  { base: 'triage-rifle', id: 'triage-repeater', name: 'Triage Repeater', examine: 'A fast triage rifle. Assess, decide, assess, decide.' },
];

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
