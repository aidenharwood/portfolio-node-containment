import type { SkillId } from '../../character/skills.ts';
import type { WeaponKind } from '../../combat/weapons.ts';
import type { CraftingStation, RecipeDefinition } from '../../crafting/recipes.ts';
import type { GearMotif, ItemDefinition, ItemIconShape, ItemRarity } from '../../gear/items.ts';
import type { EquipmentSlot } from '../../gear/slots.ts';
import type { StatBlock } from '../../gear/stats.ts';
import { gear } from '../gearItem.ts';

const material = (id: string, name: string, examine: string, icon: ItemIconShape, colors: readonly [string, string], value: number): ItemDefinition => ({
  id,
  name,
  examine,
  category: 'material',
  rarity: 'standard',
  icon,
  iconColors: colors,
  maxStack: 100,
  value,
});

const food = (id: string, name: string, examine: string, icon: ItemIconShape, colors: readonly [string, string], value: number, heal: number, verb = 'Eat'): ItemDefinition => ({
  id,
  name,
  examine,
  category: 'consumable',
  rarity: 'standard',
  icon,
  iconColors: colors,
  maxStack: 20,
  value,
  consumable: { verb, heal },
});

export const WARD_MATERIALS: readonly ItemDefinition[] = [
  material('scrap-metal', 'Scrap Metal', 'Bent sheet, bolts and a hinge. Worth something hammered flat.', 'scrap', ['#8a7a6a', '#4a3a30'], 2),
  material('scrap-bar', 'Scrap Bar', 'Scrap beaten and folded into a bar. Ugly, but it holds an edge.', 'ingot', ['#8a7a6a', '#5a4a3a'], 6),
  material('silt-iron', 'Silt Iron', 'Iron dredged from the basin, still black with silt.', 'scrap', ['#3a3f44', '#1a1e22'], 6),
  material('iron-bar', 'Iron Bar', 'Basin iron, refined and cast. The Ward has built with it for a century.', 'ingot', ['#6a7078', '#3a3f44'], 16),
  material('rag-bundle', 'Rag Bundle', 'Rags, twine and the odd sock. Every nest in the Ward is made of this.', 'fibre', ['#a89a7a', '#5a4a3a'], 2),
  material('reed-bundle', 'Reed Bundle', 'Tough canal reeds, cut green.', 'fibre', ['#8a9a4a', '#4a5a2a'], 5),
  material('waxed-canvas', 'Waxed Canvas', 'Reed fibre woven tight and waxed against the rain.', 'sheet', ['#9a8a5a', '#5a4a2a'], 14),
  material('trace-dust', 'Trace Dust', 'Faintly glowing dust scraped from where an anomaly passed.', 'shard', ['#b6ff4f', '#3a5a1a'], 3),
  material('culvert-trace', 'Culvert Trace', 'Brighter residue from the culverts. It hums if you hold it close.', 'shard', ['#4fe3ff', '#1a4a5a'], 9),
  material('allotment-greens', 'Allotment Greens', 'Cabbage, chard and something leafy Agnes swears is spinach.', 'moss', ['#5a8a3a', '#2a4a1a'], 2),
  material('basin-eel', 'Basin Eel', 'A slick black eel from the basin. It is still annoyed.', 'gel', ['#2a3a3a', '#5a7a6a'], 4),
  material('heavy-scrap', 'Heavy Scrap', 'Engine blocks, girders and boiler plate from the yards. The good stuff.', 'scrap', ['#5a5048', '#2a2420'], 12),
  material('steel-bar', 'Steel Bar', 'Iron and heavy scrap, refined hot and folded. It rings when you drop it.', 'ingot', ['#8a9098', '#4a5058'], 34),
  material('lab-culture', 'Lab Culture', 'A tray of pale fibrous growth from the B1 labs. It grows back overnight.', 'moss', ['#d8d0b8', '#8a9a7a'], 10),
  material('synth-weave', 'Synth-weave', 'Cultured fibre spun into a tough grey cloth.', 'sheet', ['#9aa0a8', '#4a5058'], 28),
  material('amber-trace', 'Amber Trace', 'Residue from the amber holding cells. It is warm, and it remembers being alive.', 'shard', ['#e8a21c', '#5a3a10'], 18),
  material('hull-plate', 'Hull Plate', 'Ship plate cut from the slipway wrecks. Thick, salt-pitted and very good.', 'plate', ['#4a5a6a', '#2a3038'], 20),
  material('alloy-bar', 'Alloy Bar', 'Hull plate refined into a light, hard alloy. Shipwrights would weep.', 'ingot', ['#a8b8c8', '#5a6878'], 60),
  material('tide-weed', 'Tide Weed', 'Dark, rubbery weed from the Fringe shallows. It moves against the current.', 'moss', ['#2a4a3a', '#6a8a4a'], 16),
  material('tarred-canvas', 'Tarred Canvas', 'Tide weed fibre, woven and tarred. It sheds water and, somehow, dread.', 'sheet', ['#3a3a2a', '#1a1a10'], 44),
  material('hull-trace', 'Hull Trace', 'Bright residue scraped from the inside of the beached hull. It knocks, faintly.', 'shard', ['#c79bff', '#3a1a5a'], 30),
  material('day-old-loaf', 'Day-old Loaf', "Too hard to eat on its own. Good for soaking up broth.", 'plate', ['#c8a060', '#7a5a2a'], 2),
];

export const WARD_FOOD: readonly ItemDefinition[] = [
  food('smoked-eel', 'Smoked Eel', 'Brined, smoked and chewy. A Ward staple.', 'gel', ['#6a4a2a', '#2a1a10'], 9, 5),
  food('greens-poultice', 'Greens Poultice', 'Mashed greens bound with trace dust. It stings, then it helps.', 'vial', ['#7cf29a', '#1f5f35'], 10, 6, 'Apply'),
  food('noodle-bowl', 'Bowl of Noodles', "Vance's broth, noodles and whatever came in on the train.", 'vial', ['#e8c070', '#8a5a2a'], 15, 10),
  food('culture-salve', 'Culture Salve', 'A cool grey paste that knits skin while you watch.', 'gel', ['#d8d0b8', '#e8a21c'], 70, 20, 'Apply'),
  food('tide-broth', 'Tide Broth', 'Eel and tide weed. It tastes of the sea and of something underneath the sea.', 'vial', ['#2a4a3a', '#c79bff'], 110, 26, 'Drink'),
  food('reed-tonic', 'Reed Tonic', 'Bitter green tonic with a bright blue sediment. Do not shake.', 'vial', ['#4fe3ff', '#1a4a3a'], 40, 14, 'Drink'),
];

interface Material {
  readonly key: string;
  readonly name: string;
  readonly level: number;
  readonly rarity: ItemRarity;
  readonly bar: string;
  readonly fibre: string;
  readonly trace: string;
  readonly metal: readonly [string, string];
  readonly cloth: readonly [string, string];
  readonly glow: string;
  readonly skirmisher: string;
  readonly warden: string;
  readonly value: number;
  readonly experience: number;
}

export const MATERIAL_LADDER: readonly Material[] = [
  {
    key: 'scrap',
    name: 'Scrap',
    level: 1,
    rarity: 'standard',
    bar: 'scrap-bar',
    fibre: 'rag-bundle',
    trace: 'trace-dust',
    metal: ['#7a6a5a', '#3a3028'],
    cloth: ['#8a7a5a', '#4a3a2a'],
    glow: '#b6ff4f',
    skirmisher: 'Patchwork',
    warden: 'Sackcloth',
    value: 12,
    experience: 10,
  },
  {
    key: 'iron',
    name: 'Iron',
    level: 10,
    rarity: 'issued',
    bar: 'iron-bar',
    fibre: 'waxed-canvas',
    trace: 'culvert-trace',
    metal: ['#5a6068', '#2a2e33'],
    cloth: ['#7a6a3a', '#3a3018'],
    glow: '#4fe3ff',
    skirmisher: 'Oilskin',
    warden: 'Felt',
    value: 60,
    experience: 26,
  },
  {
    key: 'steel',
    name: 'Steel',
    level: 20,
    rarity: 'restricted',
    bar: 'steel-bar',
    fibre: 'synth-weave',
    trace: 'amber-trace',
    metal: ['#8a9098', '#3a4048'],
    cloth: ['#7a8088', '#2a3038'],
    glow: '#e8a21c',
    skirmisher: 'Rigger',
    warden: 'Vigil',
    value: 140,
    experience: 48,
  },
  {
    key: 'alloy',
    name: 'Alloy',
    level: 30,
    rarity: 'classified',
    bar: 'alloy-bar',
    fibre: 'tarred-canvas',
    trace: 'hull-trace',
    metal: ['#a8b8c8', '#4a5868'],
    cloth: ['#3a3a2a', '#14140c'],
    glow: '#c79bff',
    skirmisher: 'Slipway',
    warden: 'Tidewarden',
    value: 260,
    experience: 78,
  },
];

const slugOf = (name: string): string => name.toLowerCase().replace(/[^a-z]+/g, '-');

interface WeaponShape {
  readonly kind: WeaponKind;
  readonly noun: string;
  readonly icon: ItemIconShape;
  readonly skill: SkillId;
  readonly range: number;
  readonly speedTicks: number;
  readonly stats: (level: number) => StatBlock;
  readonly inputs: (tier: Material) => Readonly<Record<string, number>>;
  readonly examine: string;
}

const r = Math.round;

const WEAPONS: readonly WeaponShape[] = [
  { kind: 'baton', noun: 'Baton', icon: 'baton', skill: 'closeQuarters', range: 1, speedTicks: 4, stats: (l) => ({ power: 4 + r(l * 0.7), accuracy: 2 + r(l * 0.4) }), inputs: (t) => ({ [t.bar]: 1 }), examine: 'A short club. Simple and quick.' },
  { kind: 'blade', noun: 'Blade', icon: 'blade', skill: 'closeQuarters', range: 1, speedTicks: 4, stats: (l) => ({ power: 3 + r(l * 0.6), accuracy: 3 + r(l * 0.55) }), inputs: (t) => ({ [t.bar]: 2 }), examine: 'A long knife with a wrapped grip.' },
  { kind: 'maul', noun: 'Maul', icon: 'maul', skill: 'closeQuarters', range: 1, speedTicks: 5, stats: (l) => ({ power: 6 + r(l * 0.95), accuracy: 1 + r(l * 0.3) }), inputs: (t) => ({ [t.bar]: 3 }), examine: 'A heavy two-handed hammer. Slow, and very persuasive.' },
  { kind: 'pistol', noun: 'Pistol', icon: 'pistol', skill: 'marksmanship', range: 5, speedTicks: 5, stats: (l) => ({ accuracy: 4 + r(l * 0.7), power: 2 + r(l * 0.3) }), inputs: (t) => ({ [t.bar]: 2 }), examine: 'A dart pistol, hand-built and hand-tuned.' },
  { kind: 'carbine', noun: 'Carbine', icon: 'carbine', skill: 'marksmanship', range: 7, speedTicks: 5, stats: (l) => ({ accuracy: 6 + r(l * 0.9), power: 3 + r(l * 0.35) }), inputs: (t) => ({ [t.bar]: 2, [t.fibre]: 1 }), examine: 'A two-handed bolt carbine with a strap.' },
  { kind: 'rifle', noun: 'Rifle', icon: 'rifle', skill: 'marksmanship', range: 9, speedTicks: 7, stats: (l) => ({ accuracy: 7 + r(l * 1.0), power: 4 + r(l * 0.4) }), inputs: (t) => ({ [t.bar]: 3, [t.fibre]: 1 }), examine: 'A long rifle. It outreaches anything that wants to bite you.' },
  { kind: 'focus', noun: 'Focus', icon: 'focus', skill: 'psionics', range: 4, speedTicks: 5, stats: (l) => ({ focus: 4 + r(l * 0.7) }), inputs: (t) => ({ [t.trace]: 2, [t.bar]: 1 }), examine: 'A hand focus set with trace. It wants to point at things.' },
  { kind: 'resonator', noun: 'Resonator', icon: 'resonator', skill: 'psionics', range: 4, speedTicks: 6, stats: (l) => ({ focus: 6 + r(l * 0.95) }), inputs: (t) => ({ [t.trace]: 3, [t.bar]: 2 }), examine: 'A two-handed resonator. It hums a note only you can hear.' },
];

type BodySlot = Extract<EquipmentSlot, 'head' | 'torso' | 'hands' | 'legs' | 'feet'>;

const BODY_SLOTS: readonly BodySlot[] = ['head', 'torso', 'hands', 'legs', 'feet'];

const HEAVY: Readonly<Record<BodySlot, (l: number) => number>> = {
  head: (l) => 2 + r(l * 0.4),
  torso: (l) => 4 + r(l * 0.9),
  hands: (l) => 1 + r(l * 0.25),
  legs: (l) => 2 + r(l * 0.5),
  feet: (l) => 1 + r(l * 0.25),
};

const LINES: Readonly<Record<GearMotif, { readonly skill: SkillId; readonly shapes: Readonly<Record<BodySlot, { readonly noun: string; readonly icon: ItemIconShape }>> }>> = {
  bulwark: { skill: 'fortitude', shapes: { head: { noun: 'Helm', icon: 'helmet' }, torso: { noun: 'Plate', icon: 'vest' }, hands: { noun: 'Gauntlets', icon: 'gloves' }, legs: { noun: 'Greaves', icon: 'trousers' }, feet: { noun: 'Boots', icon: 'boots' } } },
  skirmisher: { skill: 'marksmanship', shapes: { head: { noun: 'Hood', icon: 'hood' }, torso: { noun: 'Jacket', icon: 'vest' }, hands: { noun: 'Gloves', icon: 'gloves' }, legs: { noun: 'Trousers', icon: 'trousers' }, feet: { noun: 'Treads', icon: 'boots' } } },
  warden: { skill: 'psionics', shapes: { head: { noun: 'Cowl', icon: 'cowl' }, torso: { noun: 'Robe', icon: 'coat' }, hands: { noun: 'Wraps', icon: 'gloves' }, legs: { noun: 'Breeches', icon: 'trousers' }, feet: { noun: 'Footwraps', icon: 'boots' } } },
};

const prune = (stats: Record<string, number>): StatBlock => Object.fromEntries(Object.entries(stats).filter(([, value]) => value > 0)) as StatBlock;

function armourStats(motif: GearMotif, slot: BodySlot, level: number): StatBlock {
  const base = HEAVY[slot](level);
  const hazard = slot === 'torso' || slot === 'head' ? 1 : 0;
  switch (motif) {
    case 'bulwark':
      return prune({ armor: base, deflection: r(base * 0.4), hazardShielding: hazard, power: slot === 'hands' ? 1 + r(level * 0.1) : 0 });
    case 'skirmisher':
      return prune({ deflection: Math.max(1, base), armor: r(base * 0.45), hazardShielding: hazard, accuracy: slot === 'hands' ? 1 + r(level * 0.12) : 0 });
    case 'warden':
      return prune({ cognitiveWard: Math.max(1, base), armor: r(base * 0.3), insight: slot === 'head' ? 1 + r(level / 10) : 0, focus: slot === 'hands' ? 1 + r(level * 0.12) : 0 });
  }
}

const ARMOUR_COUNTS: Readonly<Record<BodySlot, number>> = { head: 2, torso: 4, hands: 1, legs: 3, feet: 1 };

function armourInputs(tier: Material, motif: GearMotif, slot: BodySlot): Readonly<Record<string, number>> {
  const count = ARMOUR_COUNTS[slot];
  if (motif === 'bulwark') return { [tier.bar]: count };
  if (motif === 'skirmisher') return count > 1 ? { [tier.fibre]: count, [tier.bar]: 1 } : { [tier.fibre]: 1 };
  return count > 1 ? { [tier.fibre]: count, [tier.trace]: 1 } : { [tier.fibre]: 1, [tier.trace]: 1 };
}

const requirement = (skill: SkillId, level: number): Readonly<Partial<Record<SkillId, number>>> => (level > 1 ? { [skill]: level } : {});

const recipe = (station: CraftingStation, skill: SkillId, output: string, level: number, inputs: Readonly<Record<string, number>>, experience: number, count = 1): RecipeDefinition => ({
  id: `${station}:${output}`,
  station,
  skill,
  level,
  inputs: Object.entries(inputs).map(([itemId, amount]) => ({ itemId, count: amount })),
  output: { itemId: output, count },
  experience,
  ticks: level < 10 ? 4 : 6,
});

const inputCount = (inputs: Readonly<Record<string, number>>): number => Object.values(inputs).reduce((sum, amount) => sum + amount, 0);

function ladderGear(tier: Material): { readonly items: ItemDefinition[]; readonly recipes: RecipeDefinition[] } {
  const items: ItemDefinition[] = [];
  const recipes: RecipeDefinition[] = [];
  for (const weapon of WEAPONS) {
    const id = `${tier.key}-${slugOf(weapon.noun)}`;
    const inputs = weapon.inputs(tier);
    items.push(
      gear({
        id,
        name: `${tier.name} ${weapon.noun}`,
        examine: `${weapon.examine} ${tier.name === 'Scrap' ? 'Made from scrap.' : `Made from ${tier.name.toLowerCase()}.`}`,
        rarity: tier.rarity,
        icon: weapon.icon,
        slot: 'primary',
        stats: weapon.stats(tier.level),
        requires: requirement(weapon.skill, tier.level),
        visual: { primary: tier.metal[0], secondary: tier.metal[1], emissive: tier.glow },
        value: tier.value * inputCount(inputs),
        weapon: { kind: weapon.kind, range: weapon.range, speedTicks: weapon.speedTicks },
      }),
    );
    recipes.push(recipe('fabricator', 'engineering', id, tier.level, inputs, tier.experience * inputCount(inputs)));
  }
  for (const motif of ['bulwark', 'skirmisher', 'warden'] as const) {
    const line = LINES[motif];
    const lineName = motif === 'bulwark' ? tier.name : motif === 'skirmisher' ? tier.skirmisher : tier.warden;
    const palette = motif === 'bulwark' ? tier.metal : tier.cloth;
    for (const slot of BODY_SLOTS) {
      const shape = line.shapes[slot];
      const id = `${slugOf(lineName)}-${slugOf(shape.noun)}`;
      const inputs = armourInputs(tier, motif, slot);
      items.push(
        gear({
          id,
          name: `${lineName} ${shape.noun}`,
          examine: `${lineName} ${shape.noun.toLowerCase()}, made in the Low Ward.`,
          rarity: tier.rarity,
          icon: shape.icon,
          slot,
          stats: armourStats(motif, slot, tier.level),
          requires: requirement(line.skill, tier.level),
          visual: { primary: palette[0], secondary: palette[1], ...(motif === 'bulwark' ? {} : { emissive: tier.glow }), motif },
          value: tier.value * inputCount(inputs),
        }),
      );
      recipes.push(recipe('fabricator', 'engineering', id, tier.level, inputs, tier.experience * inputCount(inputs)));
    }
  }
  return { items, recipes };
}

const LADDERS = MATERIAL_LADDER.map(ladderGear);

export const WARD_GEAR: readonly ItemDefinition[] = LADDERS.flatMap((ladder) => ladder.items);

export const WARD_RECIPES: readonly RecipeDefinition[] = [
  recipe('refinery', 'refining', 'scrap-bar', 1, { 'scrap-metal': 2 }, 8),
  recipe('refinery', 'refining', 'iron-bar', 10, { 'silt-iron': 2 }, 20),
  recipe('synthesiser', 'biochemistry', 'waxed-canvas', 10, { 'reed-bundle': 2 }, 18),
  recipe('synthesiser', 'biochemistry', 'smoked-eel', 1, { 'basin-eel': 1 }, 8),
  recipe('synthesiser', 'biochemistry', 'greens-poultice', 1, { 'allotment-greens': 2, 'trace-dust': 1 }, 12),
  recipe('synthesiser', 'biochemistry', 'noodle-bowl', 5, { 'basin-eel': 1, 'allotment-greens': 1, 'day-old-loaf': 1 }, 22),
  recipe('synthesiser', 'biochemistry', 'reed-tonic', 12, { 'reed-bundle': 2, 'culvert-trace': 1 }, 34),
  recipe('refinery', 'refining', 'steel-bar', 20, { 'iron-bar': 1, 'heavy-scrap': 2 }, 40),
  recipe('synthesiser', 'biochemistry', 'synth-weave', 20, { 'lab-culture': 2 }, 38),
  recipe('synthesiser', 'biochemistry', 'culture-salve', 22, { 'lab-culture': 2, 'amber-trace': 1 }, 56),
  recipe('refinery', 'refining', 'alloy-bar', 30, { 'hull-plate': 2 }, 64),
  recipe('synthesiser', 'biochemistry', 'tarred-canvas', 30, { 'tide-weed': 2 }, 60),
  recipe('synthesiser', 'biochemistry', 'tide-broth', 32, { 'tide-weed': 2, 'basin-eel': 1 }, 80),
  ...LADDERS.flatMap((ladder) => ladder.recipes),
];

export const WARD_UNIQUES: readonly ItemDefinition[] = [
  gear({ id: 'ratcatchers-gloves', name: "Ratcatcher's Gloves", examine: 'Thick old gloves with a lot of tooth marks. One rat was wearing them.', rarity: 'restricted', icon: 'gloves', slot: 'hands', stats: { armor: 2, accuracy: 1 }, requires: {}, visual: { primary: '#5a4a3a', secondary: '#2a2018' }, value: 40, unique: true }),
  gear({ id: 'feather-cap', name: 'Feather Cap', examine: 'A cap a pigeon somehow built a nest in. It suits you.', rarity: 'restricted', icon: 'hood', slot: 'head', stats: { deflection: 2 }, requires: {}, visual: { primary: '#7a7f8a', secondary: '#4a8a6a', motif: 'skirmisher' }, value: 40, unique: true }),
  gear({ id: 'strays-collar', name: "Stray's Collar", examine: 'A red leather collar with a brass tag that just says GOOD.', rarity: 'restricted', icon: 'badge', slot: 'utility', stats: { cognitiveWard: 2, armor: 1 }, requires: {}, visual: { primary: '#c84a4a', secondary: '#d8a03a' }, value: 60, unique: true }),
];
