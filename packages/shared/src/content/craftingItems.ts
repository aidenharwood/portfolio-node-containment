import type { ItemDefinition, ItemIconShape } from '../gear/items.ts';

const material = (
  id: string,
  name: string,
  examine: string,
  icon: ItemIconShape,
  iconColors: readonly [string, string],
  value: number,
): ItemDefinition => ({ id, name, examine, category: 'material', rarity: 'standard', icon, iconColors, maxStack: 100, value });

export const RAW_MATERIALS: readonly ItemDefinition[] = [
  material(
    'synthweave-offcut',
    'Synthweave Offcut',
    'Frayed strips of uniform fabric. Somebody was tall, once.',
    'fibre',
    ['#6f8aa0', '#3a4b5a'],
    1,
  ),
  material(
    'gloam-moss',
    'Gloam Moss',
    'A damp, faintly luminous moss that clots blood on contact. Grown under licence. Mostly.',
    'moss',
    ['#7cf29a', '#2f5a3a'],
    2,
  ),
  material(
    'polymer-resin',
    'Polymer Resin',
    'A sticky lump of setting resin scraped from a drum. It is warmer than it should be.',
    'gel',
    ['#e0c27a', '#8a6a2a'],
    3,
  ),
  material(
    'conductive-filament',
    'Conductive Filament',
    'Copper-bright filament pulled from a severed conduit. It hums when you hold it near your teeth.',
    'coil',
    ['#e08a4a', '#7a3a1a'],
    6,
  ),
  material(
    'lumen-spores',
    'Lumen Spores',
    'A pouch of glowing spores. Sterile, the label insists, in three increasingly small fonts.',
    'moss',
    ['#b0f0ff', '#3a6a8a'],
    8,
  ),
  material(
    'ferrous-slag',
    'Ferrous Slag',
    'Heavy, rust-streaked slag from the Undercroft smelters. Still dense enough to be useful.',
    'scrap',
    ['#8a5a3a', '#3a2418'],
    12,
  ),
];

export const HYDROPONICS_MATERIALS: readonly ItemDefinition[] = [
  material('vine-fibre', 'Strangler Fibre', 'A coil of tough, faintly twitching vine fibre. It stops twitching eventually.', 'fibre', ['#5f9a4a', '#2a4a22'], 5),
  material('thorn-cluster', 'Thorn Cluster', 'A knot of hooked thorns shed by a crawler. Hard as chitin, sharper than it looks.', 'shard', ['#8aa05a', '#3a4a22'], 10),
  material('braided-cord', 'Braided Cord', 'Strangler fibre braided and cured into a cord that does not fray, snap or grow.', 'coil', ['#7aa05a', '#2a3a1a'], 14),
];

export const REFINED_PARTS: readonly ItemDefinition[] = [
  material('alloy-plate', 'Alloy Plate', 'A flat, clean plate of refined alloy. The foundation of most issued gear.', 'ingot', ['#b8c2ca', '#5d6b74'], 5),
  material('synthweave-bolt', 'Synthweave Bolt', 'A tight roll of rewoven synthweave, ready to be cut and stitched.', 'fibre', ['#8fb0c8', '#2a3f52'], 4),
  material('gel-base', 'Gel Base', 'A sealed pouch of rendered moss gel. The starting point of most field medicine.', 'vial', ['#a8f5be', '#2f6a45'], 5),
  material('polymer-sheet', 'Polymer Sheet', 'A clear, flexible sheet of cured polymer. Shatterproof, allegedly.', 'sheet', ['#d8e8ef', '#6a8a9a'], 8),
  material('wiring-loom', 'Wiring Loom', 'Bundled, sleeved conductive filament. Every circuit at Meridian starts as one of these.', 'coil', ['#ffb347', '#5a3a1a'], 15),
  material('chitin-laminate', 'Chitin Laminate', 'Gloam chitin pressed into layered sheets. Light, hard and faintly warm.', 'chitin', ['#5a4a6a', '#2a1f36'], 16),
  material('lumen-extract', 'Lumen Extract', 'A concentrated spore tincture that knits tissue at alarming speed.', 'vial', ['#c8f6ff', '#2a6a8a'], 18),
  material('charged-cell', 'Charged Cell', 'An alloy cell packed with stabilised static residue. Handle by the insulated end.', 'cell', ['#b57cff', '#3a2a5a'], 30),
  material('hardened-steel', 'Hardened Steel', 'Slag refined into a dense, dark ingot. The Undercroft builds things to last.', 'ingot', ['#5a6068', '#2a2c30'], 28),
  material('anticoagulant', 'Leech Anticoagulant', 'A refined leech compound. In small doses it keeps wounds clean. In large doses, ask a leech.', 'vial', ['#ff7a8a', '#5a1a22'], 24),
];

export const CRAFTED_MEDICINE: readonly ItemDefinition[] = [
  {
    id: 'sap-poultice',
    name: 'Sap Poultice',
    examine: 'Gel base thickened with strangler sap. It grips the wound and does not let go, which is the point.',
    category: 'consumable',
    rarity: 'standard',
    icon: 'vial',
    iconColors: ['#b8e07a', '#3a5a22'],
    maxStack: 20,
    value: 14,
    consumable: { verb: 'Apply', heal: 11 },
  },
  {
    id: 'trauma-foam',
    name: 'Trauma Foam',
    examine: 'An expanding medical foam laced with lumen extract. Fills the wound, then fills the gap where the wound was.',
    category: 'consumable',
    rarity: 'issued',
    icon: 'vial',
    iconColors: ['#c8f6ff', '#2a5a7a'],
    maxStack: 20,
    value: 20,
    consumable: { verb: 'Apply', heal: 14 },
  },
  {
    id: 'clotting-shot',
    name: 'Clotting Shot',
    examine: 'A single-use injector of refined anticoagulant and lumen extract. Undercroft scavengers swear by it, then at it.',
    category: 'consumable',
    rarity: 'restricted',
    icon: 'vial',
    iconColors: ['#ff9aa8', '#7a1a2a'],
    maxStack: 20,
    value: 40,
    consumable: { verb: 'Inject', heal: 22 },
  },
];

export const HYDROPONICS_GEAR: readonly ItemDefinition[] = [
  {
    id: 'thornweave-gloves',
    name: 'Thornweave Gloves',
    examine: 'Braided strangler cord woven over thorn plates. Thorns, teeth and door handles all bounce off.',
    category: 'equipment',
    rarity: 'issued',
    icon: 'gloves',
    iconColors: ['#6a8a3a', '#2a3a1a'],
    maxStack: 1,
    value: 70,
    equipment: {
      slot: 'hands',
      stats: { armor: 3, deflection: 2, hazardShielding: 2, power: 1 },
      requirements: { skills: { fortitude: 4 } },
      visual: { primary: '#6a8a3a', secondary: '#2a3a1a' },
    },
  },
];

export const CRAFTING_ITEMS: readonly ItemDefinition[] = [...RAW_MATERIALS, ...HYDROPONICS_MATERIALS, ...REFINED_PARTS, ...CRAFTED_MEDICINE, ...HYDROPONICS_GEAR];
