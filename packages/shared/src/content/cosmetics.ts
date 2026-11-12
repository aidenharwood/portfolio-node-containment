import type { RecipeDefinition } from '../crafting/recipes.ts';
import type { GearMotif, GearVisual, ItemDefinition, ItemIconShape, ItemRarity } from '../gear/items.ts';
import type { WardrobeSlot } from '../gear/slots.ts';

interface OutfitPiece {
  readonly slot: WardrobeSlot;
  readonly icon: ItemIconShape;
  readonly noun: string;
  readonly examine: string;
  readonly visual?: Partial<GearVisual>;
}

interface Outfit {
  readonly name: string;
  readonly level: number;
  readonly rarity: ItemRarity;
  readonly motif?: GearMotif;
  readonly palette: Omit<GearVisual, 'motif'>;
  readonly materials: Readonly<Record<string, number>>;
  readonly experience: number;
  readonly pieces: readonly OutfitPiece[];
}

const slugOf = (name: string): string => name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');

const pieceId = (outfit: Outfit, piece: OutfitPiece): string => `${slugOf(outfit.name)}-${slugOf(piece.noun)}`;

function outfitItems(outfit: Outfit): ItemDefinition[] {
  return outfit.pieces.map((piece) => {
    const visual: GearVisual = { ...outfit.palette, ...(outfit.motif ? { motif: outfit.motif } : {}), ...piece.visual };
    return {
      id: pieceId(outfit, piece),
      name: `${outfit.name} ${piece.noun}`,
      examine: piece.examine,
      category: 'cosmetic',
      rarity: outfit.rarity,
      icon: piece.icon,
      iconColors: [visual.primary, visual.emissive ?? visual.secondary],
      maxStack: 1,
      value: Math.round(outfit.experience / 4),
      cosmetic: { slot: piece.slot, visual },
    };
  });
}

function outfitRecipes(outfit: Outfit): RecipeDefinition[] {
  return outfit.pieces.map((piece) => {
    const output = pieceId(outfit, piece);
    return {
      id: `fabricator:${output}`,
      station: 'fabricator',
      skill: 'engineering',
      level: outfit.level,
      inputs: Object.entries(outfit.materials).map(([itemId, count]) => ({ itemId, count })),
      output: { itemId: output, count: 1 },
      experience: outfit.experience,
      ticks: 5,
    };
  });
}

export const OUTFITS: readonly Outfit[] = [
  {
    name: 'Night Shift',
    level: 2,
    rarity: 'standard',
    motif: 'skirmisher',
    palette: { primary: '#22262c', secondary: '#0e1014', emissive: '#d8f07a' },
    materials: { 'synthweave-bolt': 2 },
    experience: 14,
    pieces: [
      { slot: 'head', icon: 'hood', noun: 'Hood', examine: 'A charcoal hood with a reflective strip. Nobody on nights wants to be seen, except by the forklift.' },
      { slot: 'torso', icon: 'jumpsuit', noun: 'Overalls', examine: 'Charcoal overalls with reflective piping. Purely cosmetic: worn over your gear, it changes nothing but the look.' },
      { slot: 'hands', icon: 'gloves', noun: 'Gloves', examine: 'Thin black work gloves. They protect nothing but your dignity.' },
      { slot: 'legs', icon: 'trousers', noun: 'Trousers', examine: 'Charcoal work trousers with reflective cuffs.' },
      { slot: 'feet', icon: 'boots', noun: 'Boots', examine: 'Soft-soled night boots. For walking quietly past sleeping supervisors.' },
      { slot: 'back', icon: 'pack', noun: 'Satchel', examine: "A battered canvas satchel with a thermos clip. Every night shift carries one, and nobody knows what is in the others." },
    ],
  },
  {
    name: 'Parade Dress',
    level: 6,
    rarity: 'issued',
    motif: 'bulwark',
    palette: { primary: '#1e2a4a', secondary: '#e8e4d8', emissive: '#c9a227' },
    materials: { 'synthweave-bolt': 2, 'alloy-plate': 1 },
    experience: 30,
    pieces: [
      { slot: 'head', icon: 'helmet', noun: 'Helm', examine: 'A white dress helm with a gold crest. Worn once a year, polished every day.', visual: { primary: '#e8e4d8', secondary: '#1e2a4a' } },
      { slot: 'torso', icon: 'coat', noun: 'Tunic', examine: 'A navy parade tunic with gold frogging. Meridian has not held a parade in forty years. Be ready anyway.' },
      { slot: 'hands', icon: 'gloves', noun: 'Gloves', examine: 'Spotless white gloves. They will not stay that way.', visual: { primary: '#f4f2ec', secondary: '#c9a227' } },
      { slot: 'legs', icon: 'trousers', noun: 'Trousers', examine: 'Navy dress trousers with a gold stripe down the seam.' },
      { slot: 'feet', icon: 'boots', noun: 'Boots', examine: 'Mirror-polished boots. You can see your reflection, and it is standing to attention.', visual: { primary: '#121418', secondary: '#2a2c30' } },
      { slot: 'back', icon: 'cape', noun: 'Cape', examine: "A short navy parade cape with gold fringe. It snaps in the wind even when there is none.", visual: { primary: '#1e2a4a', secondary: '#c9a227' } },
    ],
  },
  {
    name: 'Hazmat',
    level: 10,
    rarity: 'issued',
    palette: { primary: '#e8c02a', secondary: '#1a1a1a', emissive: '#ff7a2a' },
    materials: { 'polymer-sheet': 2, 'synthweave-bolt': 1 },
    experience: 48,
    pieces: [
      { slot: 'head', icon: 'helmet', noun: 'Hood', examine: 'A bright yellow hazmat hood with a wide window. It rustles every time you turn your head.' },
      { slot: 'eyes', icon: 'respirator', noun: 'Mask', examine: 'A twin-filter hazmat mask. The filters are decorative. Do not test this.' },
      { slot: 'torso', icon: 'jumpsuit', noun: 'Suit', examine: 'A yellow hazmat suit, sealed at every seam. Cosmetic only: wear real shielding underneath.' },
      { slot: 'hands', icon: 'gloves', noun: 'Gauntlets', examine: 'Thick black rubber gauntlets taped at the wrist.', visual: { primary: '#1a1a1a', secondary: '#e8c02a' } },
      { slot: 'legs', icon: 'trousers', noun: 'Leggings', examine: 'Yellow hazmat leggings taped into the boots.' },
      { slot: 'feet', icon: 'boots', noun: 'Boots', examine: 'Black rubber overboots. They squeak with conviction.', visual: { primary: '#1a1a1a', secondary: '#e8c02a' } },
      { slot: 'back', icon: 'pack', noun: 'Air Tank', examine: "A yellow air tank on a harness. Empty. Strictly for show, and for the reassuring hiss when you knock it." },
    ],
  },
  {
    name: 'Verdant',
    level: 14,
    rarity: 'restricted',
    motif: 'skirmisher',
    palette: { primary: '#3a6a3a', secondary: '#1a2a14', emissive: '#a8ff7a' },
    materials: { 'braided-cord': 2, 'vine-fibre': 2 },
    experience: 70,
    pieces: [
      { slot: 'head', icon: 'hood', noun: 'Hood', examine: 'A leaf-green hood woven from strangler fibre. It does not twitch. You checked.' },
      { slot: 'torso', icon: 'vest', noun: 'Jerkin', examine: 'A gardener\'s jerkin hung with seed pouches. A cosmetic favourite in Hydroponics.' },
      { slot: 'hands', icon: 'gloves', noun: 'Gloves', examine: 'Green pruning gloves, thorn-proof in looks alone.' },
      { slot: 'legs', icon: 'trousers', noun: 'Leggings', examine: 'Moss-green leggings with knee pads for weeding.' },
      { slot: 'feet', icon: 'boots', noun: 'Boots', examine: 'Muddy green wellingtons. They have never been clean.' },
      { slot: 'back', icon: 'pack', noun: 'Seed Pack', examine: "A wicker seed pack spilling cuttings. Something in it is still growing." },
    ],
  },
  {
    name: 'Directorate',
    level: 18,
    rarity: 'classified',
    palette: { primary: '#14161a', secondary: '#7a1a1a', emissive: '#ff4d4d' },
    materials: { 'relay-weave': 1, 'polymer-sheet': 2 },
    experience: 96,
    pieces: [
      { slot: 'eyes', icon: 'visor', noun: 'Shades', examine: 'Wraparound shades with a red heads-up glint. The Directorate does not blink in public.' },
      { slot: 'torso', icon: 'coat', noun: 'Overcoat', examine: 'A black overcoat with a red lining. Nobody asks what department you are from.' },
      { slot: 'hands', icon: 'gloves', noun: 'Gloves', examine: 'Black leather gloves. They leave no prints and no impression.' },
      { slot: 'legs', icon: 'trousers', noun: 'Trousers', examine: 'Sharply creased black trousers.' },
      { slot: 'feet', icon: 'boots', noun: 'Shoes', examine: 'Black oxfords that click on every floor in the building.' },
    ],
  },
  {
    name: 'Mourning',
    level: 24,
    rarity: 'classified',
    motif: 'warden',
    palette: { primary: '#1a141e', secondary: '#0a080c', emissive: '#b57cff' },
    materials: { 'vellum-weave': 1, 'black-ink': 2 },
    experience: 150,
    pieces: [
      { slot: 'head', icon: 'cowl', noun: 'Veil', examine: 'A black veil with a faint violet sheen. Worn for the ones the Archive forgot.' },
      { slot: 'torso', icon: 'coat', noun: 'Robes', examine: 'Long black mourning robes, ink-dyed. They trail just enough to be noticed.' },
      { slot: 'hands', icon: 'gloves', noun: 'Gloves', examine: 'Black lace gloves, surprisingly sturdy.' },
      { slot: 'legs', icon: 'trousers', noun: 'Skirts', examine: 'Layered black skirts over leggings.' },
      { slot: 'feet', icon: 'boots', noun: 'Boots', examine: 'Buttoned black boots. Each button is a tiny full stop.' },
      { slot: 'back', icon: 'cape', noun: 'Shroud', examine: "A long black shroud that drags a little behind you, as mourning should." },
    ],
  },
  {
    name: 'Ember Gala',
    level: 32,
    rarity: 'anomalous',
    motif: 'bulwark',
    palette: { primary: '#c9a227', secondary: '#5a1a0a', emissive: '#ff7a2a' },
    materials: { 'furnace-steel': 1, 'cinder-salt': 2 },
    experience: 260,
    pieces: [
      { slot: 'head', icon: 'helmet', noun: 'Crest', examine: 'A gilt helm crested with a captured cinder. It is very warm and very much the point.' },
      { slot: 'torso', icon: 'plate', noun: 'Cuirass', examine: 'A gilded ceremonial cuirass with ember inlay. Cosmetic: the gold is thin, the swagger thick.' },
      { slot: 'hands', icon: 'gloves', noun: 'Gauntlets', examine: 'Gilt gauntlets with glowing knuckles.' },
      { slot: 'legs', icon: 'trousers', noun: 'Greaves', examine: 'Gold-chased greaves over red trousers.' },
      { slot: 'feet', icon: 'boots', noun: 'Sabatons', examine: 'Gilt sabatons that glow at the toe.' },
      { slot: 'back', icon: 'cape', noun: 'Cloak', examine: "A crimson gala cloak with an ember-lit clasp. It flares when you turn.", visual: { primary: '#7a1a0a', secondary: '#c9a227' } },
    ],
  },
  {
    name: 'Founder',
    level: 42,
    rarity: 'anomalous',
    motif: 'warden',
    palette: { primary: '#f4efe4', secondary: '#c9a227', emissive: '#ffe8a8' },
    materials: { 'vestment-weave': 1, 'halite-glass': 1 },
    experience: 420,
    pieces: [
      { slot: 'head', icon: 'cowl', noun: 'Cowl', examine: 'A white and gold cowl in the style of Meridian\'s founding charter. The founder never wore one. Everyone agrees they should have.' },
      { slot: 'torso', icon: 'coat', noun: 'Regalia', examine: 'Founder\'s regalia: white vestments, gold embroidery, and a clause stitched along the hem: NOT YET.' },
      { slot: 'hands', icon: 'gloves', noun: 'Gloves', examine: 'White gloves with gold cuffs, for signing important things.' },
      { slot: 'legs', icon: 'trousers', noun: 'Breeches', examine: 'White breeches with gold piping.' },
      { slot: 'feet', icon: 'boots', noun: 'Slippers', examine: 'Gold-thread slippers. Impractical. Magnificent.' },
      { slot: 'back', icon: 'cape', noun: 'Train', examine: "A long white train embroidered with every Site's crest. Seven of them are crossed out." },
    ],
  },
];

export const COSMETIC_ITEMS: readonly ItemDefinition[] = OUTFITS.flatMap(outfitItems);

export const COSMETIC_RECIPES: readonly RecipeDefinition[] = OUTFITS.flatMap(outfitRecipes);
