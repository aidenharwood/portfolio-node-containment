import { WEAPON_KIND_INFO, type WeaponProfile } from '../combat/weapons.ts';
import type { RecipeDefinition } from '../crafting/recipes.ts';
import type { ItemDefinition } from '../gear/items.ts';
import { ARMOUR_TIERS } from './armourLines.ts';
import { gear } from './gearItem.ts';
import { matchedRatingBonus, type VariantSpec } from './weaponVariants.ts';

type ArmourTier = (typeof ARMOUR_TIERS)[number];

interface PsionicTierText {
  readonly level: number;
  readonly referenceBonus: number;
  readonly focus: string;
  readonly resonator: string;
  readonly amplifier: string;
}

const PSIONIC_TEXT: readonly PsionicTierText[] = [
  {
    level: 8,
    referenceBonus: 10,
    focus: 'A steel rod capped with a bead of lumen extract. Point it, think hard, and the light goes where you meant it to.',
    resonator: 'A braided-cord lattice strung between two steel hoops. It hums when you are angry, so it hums a lot down here.',
    amplifier: 'A lumen bead seated behind the ear. Your thoughts come out a little brighter than they went in.',
  },
  {
    level: 12,
    referenceBonus: 16,
    focus: 'A rime-alloy wand with a frozen lens. It holds a thought perfectly still until you let it go.',
    resonator: 'A synthweave lattice frosted with cryo-compound. Each pulse leaves the air a degree colder and a little quieter.',
    amplifier: 'A cryo-loop amplifier. It keeps the will cold and the aim steady.',
  },
  {
    level: 16,
    referenceBonus: 21,
    focus: 'A servo-driven tuning rod. It finds the carrier tone in anything and plays it back, louder.',
    resonator: 'A relay-weave lattice tuned to the Array. Forty voices could sing through it. Yours is enough.',
    amplifier: 'A copper-coiled implant that boosts the signal of a single, focused thought.',
  },
  {
    level: 20,
    referenceBonus: 26,
    focus: 'A pen-nib focus in ink laminate. It writes one word in the target\'s mind and underlines it.',
    resonator: 'A vellum lattice inked with recovered Meridian lexicon. Some of the words are louder than others.',
    amplifier: 'An ink-filament implant that drafts your intent before you finish forming it.',
  },
  {
    level: 25,
    referenceBonus: 30,
    focus: 'A furnace-steel focus with a cinder-salt core. Every thought through it arrives already burning.',
    resonator: 'A kiln-fired lattice that glows along every strand. It throws heat the way a furnace throws light.',
    amplifier: 'A cinder-salt implant. It runs hot, and so do you.',
  },
  {
    level: 30,
    referenceBonus: 37,
    focus: 'A mirror-alloy key that opens nothing physical. Point it, and something on the other side lets go.',
    resonator: 'A lattice of mirror alloy around a knock splinter. When it fires, every door nearby rattles once.',
    amplifier: 'A knock splinter sewn behind the ear. It knocks for you, three times, and something always answers.',
  },
  {
    level: 35,
    referenceBonus: 44,
    focus: 'A seal-alloy focus with a wax-sealed tip. Whatever it delivers cannot be refused.',
    resonator: 'A letter-weave lattice threaded with dead letters. Every pulse carries the weight of an unanswered note.',
    amplifier: 'A wax-sealed amplifier. Your intent arrives stamped, postmarked and signed for.',
  },
  {
    level: 40,
    referenceBonus: 51,
    focus: 'A brine-steel focus with a lamp-glass bulb. It lights the gallery, and the inside of whatever you aim it at.',
    resonator: 'A salt-weave lattice strung with lamp glass. It sounds like a shift bell heard from very far below.',
    amplifier: 'A lamp-glass sliver behind the ear. It keeps one lamp lit in your head, however deep you go.',
  },
  {
    level: 45,
    referenceBonus: 58,
    focus: 'A halite-glass reliquary on a short staff. It carries a single held note further than any voice.',
    resonator: 'A vestment-weave lattice set with halite geodes. It sings the cathedral\'s low note, and the walls answer.',
    amplifier: 'A halite geode amplifier. It turns a whisper into a hymn.',
  },
  {
    level: 50,
    referenceBonus: 65,
    focus: 'A ward-steel focus like a thermometer. It takes a reading, then gives one back, much harder.',
    resonator: 'A sterile-weave lattice with physic herbs pressed in the strands. It doses whatever stands in front of it.',
    amplifier: 'A ward-steel amplifier. It decides who can afford to be well, and it decides quickly.',
  },
  {
    level: 55,
    referenceBonus: 72,
    focus: 'A tonic-glass focus, measured to the drop. Whatever you prescribe through it is exactly the right dose.',
    resonator: 'A prescription-weave lattice threaded with tincture vials. It writes a new prescription with every pulse.',
    amplifier: 'A tonic-glass amplifier. Your will comes out compounded, labelled and correct.',
  },
];

const FOCUS: Omit<WeaponProfile, 'kind'> = { range: 5, speedTicks: 4 };
const RESONATOR: Omit<WeaponProfile, 'kind'> = { range: 4, speedTicks: 6 };
const REFERENCE_PACE = { damageScale: 1, speedTicks: 5 };

const slugOf = (name: string): string => name.toLowerCase().replace(/[^a-z]+/g, '-');

const textFor = (tier: ArmourTier): PsionicTierText => {
  const text = PSIONIC_TEXT.find((entry) => entry.level === tier.level);
  if (!text) throw new Error(`No psionic gear text for armour tier ${tier.level}.`);
  return text;
};

const focusId = (tier: ArmourTier): string => `${slugOf(tier.warden.name)}-focus`;
const resonatorId = (tier: ArmourTier): string => `${slugOf(tier.warden.name)}-resonator`;
const amplifierId = (tier: ArmourTier): string => `${slugOf(tier.warden.name)}-amplifier`;

function psionicWeapon(tier: ArmourTier, kind: 'focus' | 'resonator', id: string, examine: string): ItemDefinition {
  const pace = kind === 'focus' ? FOCUS : RESONATOR;
  const text = textFor(tier);
  const focus = matchedRatingBonus(
    tier.level,
    { ...REFERENCE_PACE, bonus: text.referenceBonus },
    { damageScale: WEAPON_KIND_INFO[kind].damageScale, speedTicks: pace.speedTicks },
  );
  return gear({
    id,
    name: `${tier.warden.name} ${WEAPON_KIND_INFO[kind].name}`,
    examine,
    rarity: tier.rarity,
    icon: kind,
    slot: 'primary',
    stats: { focus },
    requires: { psionics: tier.level },
    visual: { ...tier.warden.palette, motif: 'warden' },
    value: Math.round(tier.heavy.torso.value * 1.1),
    weapon: { kind, ...pace },
  });
}

function amplifier(tier: ArmourTier): ItemDefinition {
  return gear({
    id: amplifierId(tier),
    name: `${tier.warden.name} Amplifier`,
    examine: textFor(tier).amplifier,
    rarity: tier.rarity,
    icon: 'implant',
    slot: 'implant',
    stats: { focus: Math.round(tier.level * 0.15) + 1, cognitiveWard: Math.round(tier.level * 0.25) + 1 },
    requires: { psionics: tier.level },
    visual: { ...tier.warden.palette, motif: 'warden' },
    value: Math.round(tier.heavy.head.value * 1.2),
  });
}

export const PSIONIC_GEAR: readonly ItemDefinition[] = ARMOUR_TIERS.flatMap((tier) => [
  psionicWeapon(tier, 'focus', focusId(tier), textFor(tier).focus),
  psionicWeapon(tier, 'resonator', resonatorId(tier), textFor(tier).resonator),
  amplifier(tier),
]);

function recipe(tier: ArmourTier, output: string, inputs: Readonly<Record<string, number>>, experienceScale: number): RecipeDefinition {
  return {
    id: `fabricator:${output}`,
    station: 'fabricator',
    skill: 'engineering',
    level: tier.level + 1,
    inputs: Object.entries(inputs).map(([itemId, count]) => ({ itemId, count })),
    output: { itemId: output, count: 1 },
    experience: Math.round(tier.experience * experienceScale),
    ticks: tier.level < 12 ? 6 : 8,
  };
}

export const PSIONIC_RECIPES: readonly RecipeDefinition[] = ARMOUR_TIERS.flatMap((tier) => [
  recipe(tier, focusId(tier), { [tier.metal]: 1, [tier.reagent]: 2 }, 1.2),
  recipe(tier, resonatorId(tier), { [tier.metal]: 2, [tier.cloth]: 1, [tier.reagent]: 2 }, 1.3),
  recipe(tier, amplifierId(tier), { [tier.metal]: 1, [tier.reagent]: 2 }, 1.1),
]);

export const PSIONIC_VARIANT_SPECS: readonly VariantSpec[] = ARMOUR_TIERS.flatMap((tier) => [
  {
    base: focusId(tier),
    id: `${slugOf(tier.warden.name)}-sceptre`,
    name: `${tier.warden.name} Sceptre`,
    examine: `A weightier ${tier.warden.name.toLowerCase()} focus. It gathers a thought for longer and lets it go harder.`,
  },
  {
    base: resonatorId(tier),
    id: `${slugOf(tier.warden.name)}-chime`,
    name: `${tier.warden.name} Chime`,
    examine: `A lighter ${tier.warden.name.toLowerCase()} lattice, tuned a little sharp. It rings more often and less loudly.`,
  },
]);
