import type { RecipeDefinition, RecipeIngredient } from '../crafting/recipes.ts';
import { TIER_LEVEL_FLOORS } from '../crafting/tiers.ts';
import type { ItemDefinition, ItemRarity } from '../gear/items.ts';

interface SealPattern {
  readonly tier: number;
  readonly mark: string;
  readonly examine: string;
  readonly colors: readonly [string, string];
  readonly inputs: Readonly<Record<string, number>>;
  readonly experience: number;
  readonly rarity: ItemRarity;
}

const SEAL_PATTERNS: readonly SealPattern[] = [
  {
    tier: 1,
    mark: 'I',
    examine: 'A folding mesh cage, a roll of hazard tape and a laminated procedures card. Rated for Safe-class specimens and very optimistic trainees.',
    colors: ['#d8e2e8', '#ffcf4d'],
    inputs: { 'alloy-plate': 1, 'synthweave-bolt': 1 },
    experience: 14,
    rarity: 'standard',
  },
  {
    tier: 2,
    mark: 'II',
    examine: 'A polymer-walled field cell with a wired interlock. It clicks shut the way a door does when it means it.',
    colors: ['#c8e8f0', '#4fd8ff'],
    inputs: { 'polymer-sheet': 1, 'wiring-loom': 1 },
    experience: 32,
    rarity: 'standard',
  },
  {
    tier: 3,
    mark: 'III',
    examine: 'A steel-framed restraint cell driven by a charged cell. Approved for Euclid-class re-housing under supervision.',
    colors: ['#8a929a', '#b57cff'],
    inputs: { 'hardened-steel': 1, 'charged-cell': 1 },
    experience: 58,
    rarity: 'issued',
  },
  {
    tier: 4,
    mark: 'IV',
    examine: 'A cryo-lined seal that slows whatever it holds to a crawl. Frost forms on the label, which reads DO NOT THAW.',
    colors: ['#c8f0ff', '#6ab8e8'],
    inputs: { 'rime-alloy': 1, 'cryo-compound': 1 },
    experience: 88,
    rarity: 'issued',
  },
  {
    tier: 5,
    mark: 'V',
    examine: 'A Faraday seal woven from relay copper, servo-locked from the outside. Nothing inside it can be heard. That is the point.',
    colors: ['#ffb347', '#59e0c5'],
    inputs: { 'relay-weave': 1, 'servo-core': 1 },
    experience: 125,
    rarity: 'restricted',
  },
  {
    tier: 6,
    mark: 'VI',
    examine: 'A redaction seal. Ink-laminate walls, vellum gaskets, and a black bar printed across the viewing slot so nobody reads what it holds.',
    colors: ['#2a2a32', '#e8e0c8'],
    inputs: { 'vellum-weave': 1, 'ink-laminate': 1 },
    experience: 170,
    rarity: 'restricted',
  },
  {
    tier: 7,
    mark: 'VII',
    examine: 'A furnace-steel seal packed with cinder salt. It runs hot for a week after closing, and then it never opens again.',
    colors: ['#5a4a42', '#ff7a2a'],
    inputs: { 'furnace-steel': 1, 'cinder-salt': 1 },
    experience: 228,
    rarity: 'classified',
  },
  {
    tier: 8,
    mark: 'VIII',
    examine: 'A mirror-walled seal lined with hollow weave. Whatever goes in sees only itself, forever, and loses interest in the door.',
    colors: ['#d8e8ff', '#9a8aff'],
    inputs: { 'mirror-alloy': 1, 'hollow-weave': 1 },
    experience: 300,
    rarity: 'classified',
  },
  {
    tier: 9,
    mark: 'IX',
    examine: 'A franked, sealed and addressed containment parcel. Postage paid, no return address. The Office refuses to deliver it.',
    colors: ['#c8a05a', '#ff4d6a'],
    inputs: { 'seal-alloy': 1, 'letter-weave': 1 },
    experience: 385,
    rarity: 'anomalous',
  },
];

export const sealItemId = (tier: number): string => `containment-seal-${tier}`;

export const CONTAINMENT_SEALS: readonly ItemDefinition[] = SEAL_PATTERNS.map((pattern) => ({
  id: sealItemId(pattern.tier),
  name: `Containment Seal Mk.${pattern.mark}`,
  examine: `${pattern.examine} Contains a weakened tier ${pattern.tier} specimen or lower.`,
  category: 'material',
  rarity: pattern.rarity,
  icon: 'seal',
  iconColors: pattern.colors,
  maxStack: 50,
  value: 4 + pattern.tier * pattern.tier * 6,
  containmentSeal: { tier: pattern.tier },
}));

export const CONTAINMENT_SEAL_RECIPES: readonly RecipeDefinition[] = SEAL_PATTERNS.map((pattern) => ({
  id: `fabricator:${sealItemId(pattern.tier)}`,
  station: 'fabricator',
  skill: 'containment',
  level: TIER_LEVEL_FLOORS[pattern.tier - 1] ?? 1,
  inputs: Object.entries(pattern.inputs).map(([itemId, count]): RecipeIngredient => ({ itemId, count })),
  output: { itemId: sealItemId(pattern.tier), count: 1 },
  experience: pattern.experience,
  ticks: 4,
}));
