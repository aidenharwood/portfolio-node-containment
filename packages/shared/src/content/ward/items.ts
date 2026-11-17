import type { SkillId } from '../../character/skills.ts';
import type { WeaponKind } from '../../combat/weapons.ts';
import type { CraftingStation, RecipeDefinition } from '../../crafting/recipes.ts';
import type { ConsumableKind, GearMotif, ItemDefinition, ItemIconShape, ItemRarity } from '../../gear/items.ts';
import type { EquipmentSlot } from '../../gear/slots.ts';
import type { StatBlock } from '../../gear/stats.ts';
import { boostTicksForMinutes } from '../../character/boosts.ts';
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

const consumable = (kind: ConsumableKind) => (id: string, name: string, examine: string, icon: ItemIconShape, colors: readonly [string, string], value: number, heal: number, verb = kind === 'food' ? 'Eat' : 'Drink'): ItemDefinition => ({
  id,
  name,
  examine,
  category: 'consumable',
  rarity: 'standard',
  icon,
  iconColors: colors,
  maxStack: 20,
  value,
  consumable: { kind, verb, heal },
});

const food = consumable('food');
const medicine = consumable('medicine');

const boosted = (item: ItemDefinition, stats: StatBlock, minutes: number): ItemDefinition =>
  item.consumable ? { ...item, consumable: { ...item.consumable, boost: { stats, durationTicks: boostTicksForMinutes(minutes) } } } : item;

export const WARD_MATERIALS: readonly ItemDefinition[] = [
  material('hand-leaf-cutting', 'Hand-leaf Cutting', 'A cutting from the bed six plant, potted by Marta. It holds on to the pot.', 'leaf', ['#7aa84a', '#b8683a'], 4),
  material('scrap-metal', 'Scrap Metal', 'Bent sheet, bolts and a hinge. Worth something hammered flat.', 'scrap', ['#8a7a6a', '#4a3a30'], 2),
  material('scrap-bar', 'Scrap Bar', 'Scrap beaten and folded into a bar. Ugly, but it holds an edge.', 'ingot', ['#8a7a6a', '#5a4a3a'], 6),
  material('silt-iron', 'Silt Iron', 'Iron dredged from the basin, still black with silt.', 'scrap', ['#4c555e', '#7a8896'], 6),
  material('iron-bar', 'Iron Bar', 'Basin iron, refined and cast. The Ward has built with it for a century.', 'ingot', ['#5a5650', '#2e2a26'], 16),
  material('rag-bundle', 'Rag Bundle', 'Rags, twine and the odd sock. Every nest in the Ward is made of this.', 'fibre', ['#a89a7a', '#5a4a3a'], 2),
  material('reed-bundle', 'Reed Bundle', 'Tough canal reeds, cut green.', 'fibre', ['#8a9a4a', '#4a5a2a'], 5),
  material('waxed-canvas', 'Waxed Canvas', 'Reed fibre woven tight and waxed against the rain.', 'sheet', ['#b08a2a', '#6a5418'], 14),
  material('trace-dust', 'Trace Dust', 'Faintly glowing dust scraped from where an anomaly passed.', 'shard', ['#b6ff4f', '#3a5a1a'], 3),
  material('culvert-trace', 'Culvert Trace', 'Brighter residue from the culverts. It hums if you hold it close.', 'shard', ['#3fe0b0', '#14503c'], 9),
  material('allotment-greens', 'Allotment Greens', 'Cabbage, chard and something leafy Agnes swears is spinach.', 'moss', ['#5a8a3a', '#2a4a1a'], 2),
  material('basin-eel', 'Basin Eel', 'A slick black eel from the basin. It is still annoyed.', 'eel', ['#4a6464', '#5a7a6a'], 4),
  material('heavy-scrap', 'Heavy Scrap', 'Engine blocks, girders and boiler plate from the yards. The good stuff.', 'scrap', ['#9a5a3a', '#3a2018'], 12),
  material('steel-bar', 'Steel Bar', 'Iron and heavy scrap, refined hot and folded. It rings when you drop it.', 'ingot', ['#757c86', '#3a4048'], 52),
  material('lab-culture', 'Lab Culture', 'A tray of pale fibrous growth from the B1 labs. It grows back overnight.', 'moss', ['#d8d0b8', '#8a9a7a'], 10),
  material('synth-weave', 'Synth-weave', 'Cultured fibre spun into a tough blue-grey cloth.', 'sheet', ['#5f7f86', '#22363a'], 28),
  material('amber-trace', 'Amber Trace', 'Residue from the amber holding cells. It is warm, and it remembers being alive.', 'shard', ['#e8a21c', '#5a3a10'], 18),
  material('hull-plate', 'Hull Plate', 'Ship plate cut from the slipway wrecks. Thick, salt-pitted and very good.', 'panel', ['#4a5a6a', '#2a3038'], 20),
  material('alloy-bar', 'Alloy Bar', 'Hull plate refined into a light, hard alloy. Shipwrights would weep.', 'ingot', ['#a8b8c8', '#5a6878'], 60),
  material('tide-weed', 'Tide Weed', 'Dark, rubbery weed from the Fringe shallows. It moves against the current.', 'moss', ['#2a4a3a', '#6a8a4a'], 16),
  material('tarred-canvas', 'Tarred Canvas', 'Tide weed fibre, woven and tarred. It sheds water and, somehow, dread.', 'sheet', ['#5c5a44', '#26261a'], 44),
  material('hull-trace', 'Hull Trace', 'Bright residue scraped from the inside of the beached hull. It knocks, faintly.', 'shard', ['#c79bff', '#3a1a5a'], 30),
  material('directorate-salvage', 'Directorate Salvage', 'Pale panel and cell fittings stripped from the Secure Wing. Nobody is going to miss them, officially.', 'panel', ['#d8d6cc', '#e86a1c'], 40),
  material('sinter-ingot', 'Sinter Ingot', 'Directorate salvage fused under pressure into a pale ceramic. Lighter than steel and colder than it should be.', 'ingot', ['#e8e6dc', '#9a988e'], 110),
  material('red-moss', 'Red Moss', 'Moss growing in the breached ward. It grows towards the cells.', 'moss', ['#8a2a22', '#3a0e0a'], 30),
  material('red-mesh', 'Red Mesh', 'Red moss fibre, synthesised into a fine, slightly warm mesh.', 'sheet', ['#8a3a32', '#3a1410'], 80),
  material('red-trace', 'Red Trace', 'High-security residue. It is cold, and it is listening.', 'shard', ['#d8322a', '#3a0a08'], 60),
  material('vault-residue', 'Vault Residue', 'Black glassy crust from the Vault floor. It reflects rooms that are not there.', 'shard', ['#1a2a3a', '#4fe3ff'], 70),
  material('vault-glass', 'Vault Glass Ingot', 'Residue refined into dark glass. It is harder than sinter and it hums.', 'ingot', ['#2a3a4a', '#7fd8ff'], 200),
  material('vault-bloom', 'Vault Bloom', 'A pale flower that grows in the dark of the Vault. It turns to follow you.', 'flower', ['#c8d8e8', '#4a6a8a'], 60),
  material('bloom-silk', 'Bloom Silk', 'Silk spun from vault bloom. It shimmers when nobody is looking at it.', 'sheet', ['#c8d8e8', '#7fd8ff'], 150),
  material('vault-trace', 'Vault Trace', 'Residue from the deepest chambers. It feels like being looked at from below.', 'shard', ['#7fd8ff', '#0a1a2a'], 110),
  material('day-old-loaf', 'Day-old Loaf', "Too hard to eat on its own. Good for soaking up broth.", 'loaf', ['#c8a060', '#7a5a2a'], 2),
];

export const WARD_FOOD: readonly ItemDefinition[] = [
  food('smoked-eel', 'Smoked Eel', 'Brined, smoked and chewy. A Ward staple.', 'eel', ['#6a4a2a', '#2a1a10'], 9, 8),
  boosted(medicine('greens-poultice', 'Greens Poultice', 'Mashed greens bound with trace dust. It stings, then it helps.', 'gel', ['#7cf29a', '#1f5f35'], 10, 3, 'Apply'), { armor: 2, hazardShielding: 2 }, 3),
  food('noodle-bowl', 'Bowl of Noodles', "Vance's broth, noodles and whatever came in on the train.", 'bowl', ['#e8c070', '#8a5a2a'], 15, 10),
  food('eel-pie', 'Eel Pie', "Ostrowski's crust, a basin eel inside. A head pokes through the top. Tradition, apparently.", 'pie', ['#c8904a', '#4a3020'], 24, 16),
  boosted(medicine('culture-salve', 'Culture Salve', 'A cool grey paste that knits skin while you watch.', 'tin', ['#d8d0b8', '#e8a21c'], 70, 8, 'Apply'), { armor: 8, deflection: 8 }, 4),
  food('culture-cutlet', 'Culture Cutlet', 'Lab culture, breaded and fried. Officially it is not food. Unofficially it is the Thursday special.', 'dish', ['#c8923c', '#8a9a7a'], 60, 22),
  food('tide-broth', 'Tide Broth', 'Eel and tide weed. It tastes of the sea and of something underneath the sea.', 'bowl', ['#2a4a3a', '#c79bff'], 70, 26, 'Drink'),
  boosted(medicine('tide-tincture', 'Tide Tincture', 'Tide weed steeped over hull trace. It sloshes the wrong way in the bottle, and so do you, harder.', 'vial', ['#6a8a4a', '#c79bff'], 100, 12), { power: 5, accuracy: 5, focus: 5 }, 4),
  food('moss-pasty', 'Red Moss Pasty', "Red moss baked into yesterday's loaf. It is warm in the middle. It is warm in the middle for a long time.", 'pie', ['#c8a060', '#8a2a22'], 90, 32),
  food('bloom-chowder', 'Bloom Chowder', 'Vault bloom and basin eel in a pale broth. The petals all face the spoon.', 'bowl', ['#c8d8e8', '#2a3a3a'], 150, 40, 'Drink'),
  boosted(medicine('red-salve', 'Red Salve', 'A Directorate field salve, made from what grows by the cells. It works. Do not ask how.', 'tin', ['#d8322a', '#3a0a08'], 160, 13, 'Apply'), { power: 8, accuracy: 8, focus: 8 }, 4),
  boosted(medicine('bloom-elixir', 'Bloom Distillate', 'Distilled vault bloom. You feel very well, and very watched.', 'vial', ['#c8d8e8', '#7fd8ff'], 260, 16), { armor: 16, deflection: 16, cognitiveWard: 16, hazardShielding: 6 }, 5),
  boosted(medicine('grip-tincture', 'Grip Tincture', "Marta's tincture of hand-leaf. Your fingers close a moment before you tell them to.", 'vial', ['#b6ff4f', '#3a5a2a'], 26, 5), { power: 2, accuracy: 2, focus: 2 }, 3),
  boosted(medicine('reed-tonic', 'Reed Tonic', 'Bitter green tonic with a bright sediment that never settles. Do not shake.', 'vial', ['#3fe0b0', '#1a4a3a'], 40, 5), { cognitiveWard: 5, insight: 2 }, 3),
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
  readonly origin: string;
  readonly clothOrigin: string;
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
    cloth: ['#857c70', '#463d34'],
    glow: '#b6ff4f',
    skirmisher: 'Patchwork',
    warden: 'Sackcloth',
    origin: 'Hammered out of whatever the heaps gave up.',
    clothOrigin: 'Stitched from rags the heaps gave up.',
    value: 12,
    experience: 14,
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
    cloth: ['#b08a2a', '#3a2c10'],
    glow: '#3fe0b0',
    skirmisher: 'Oilskin',
    warden: 'Felt',
    origin: 'Basin iron. Heavy, honest and slightly damp.',
    clothOrigin: 'Waxed against the basin damp. It mostly works.',
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
    metal: ['#757c86', '#343a42'],
    cloth: ['#5f7f86', '#22363a'],
    glow: '#e8a21c',
    skirmisher: 'Rigger',
    warden: 'Vigil',
    origin: 'Scrapyard steel, folded hot in the crusher shed.',
    clothOrigin: 'Woven from lab culture. It is warmer than it should be.',
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
    cloth: ['#5c5a44', '#26261a'],
    glow: '#c79bff',
    skirmisher: 'Slipway',
    warden: 'Tidewarden',
    origin: 'Cut from ships that never left the Fringe.',
    clothOrigin: 'Tarred canvas from the Fringe sail lofts.',
    value: 260,
    experience: 78,
  },
  {
    key: 'sinter',
    name: 'Sinter',
    level: 40,
    rarity: 'classified',
    bar: 'sinter-ingot',
    fibre: 'red-mesh',
    trace: 'red-trace',
    metal: ['#e8e6dc', '#e86a1c'],
    cloth: ['#8a3a32', '#2a0e0a'],
    glow: '#d8322a',
    skirmisher: 'Cordon',
    warden: 'Redline',
    origin: 'Directorate issue, once. The serial numbers are filed off.',
    clothOrigin: 'Red mesh off the Secure Wing. It hums near the cells.',
    value: 460,
    experience: 120,
  },
  {
    key: 'vault-glass',
    name: 'Vault Glass',
    level: 50,
    rarity: 'anomalous',
    bar: 'vault-glass',
    fibre: 'bloom-silk',
    trace: 'vault-trace',
    metal: ['#3d6ea6', '#16304e'],
    cloth: ['#c8d8e8', '#4a6a8a'],
    glow: '#7fd8ff',
    skirmisher: 'Gloam',
    warden: 'Hollow',
    origin: 'Not made so much as persuaded. It hums when you are alone.',
    clothOrigin: 'Bloom silk. It turns to face you when you take it off.',
    value: 800,
    experience: 170,
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
  { kind: 'baton', noun: 'Baton', icon: 'baton', skill: 'closeQuarters', range: 1, speedTicks: 4, stats: (l) => ({ power: 4 + r(l * 0.7) }), inputs: (t) => ({ [t.bar]: 1 }), examine: 'A short stun club with a side handle. Simple and quick.' },
  { kind: 'blade', noun: 'Blade', icon: 'blade', skill: 'closeQuarters', range: 1, speedTicks: 4, stats: (l) => ({ power: 6 + r(l * 0.8) }), inputs: (t) => ({ [t.bar]: 2 }), examine: 'A long knife with a wrapped grip.' },
  { kind: 'maul', noun: 'Maul', icon: 'maul', skill: 'closeQuarters', range: 1, speedTicks: 5, stats: (l) => ({ power: 8 + r(l * 1.0) }), inputs: (t) => ({ [t.bar]: 3 }), examine: 'A heavy two-handed hammer. Slow, and very persuasive.' },
  { kind: 'pistol', noun: 'Pistol', icon: 'pistol', skill: 'marksmanship', range: 5, speedTicks: 5, stats: (l) => ({ accuracy: 4 + r(l * 0.7) }), inputs: (t) => ({ [t.bar]: 2 }), examine: 'A dart pistol, hand-built and hand-tuned.' },
  { kind: 'carbine', noun: 'Carbine', icon: 'carbine', skill: 'marksmanship', range: 7, speedTicks: 5, stats: (l) => ({ accuracy: 6 + r(l * 0.9) }), inputs: (t) => ({ [t.bar]: 2, [t.fibre]: 1 }), examine: 'A two-handed bolt carbine with a strap.' },
  { kind: 'rifle', noun: 'Rifle', icon: 'rifle', skill: 'marksmanship', range: 9, speedTicks: 7, stats: (l) => ({ accuracy: 7 + r(l * 1.0) }), inputs: (t) => ({ [t.bar]: 3, [t.fibre]: 1 }), examine: 'A long rifle. It outreaches anything that wants to bite you.' },
  { kind: 'focus', noun: 'Focus', icon: 'focus', skill: 'psionics', range: 4, speedTicks: 5, stats: (l) => ({ focus: 4 + r(l * 0.7) }), inputs: (t) => ({ [t.trace]: 2, [t.bar]: 1 }), examine: 'A hand clamp around a splinter of trace that will not sit still. It wants to point at things.' },
  { kind: 'resonator', noun: 'Resonator', icon: 'resonator', skill: 'psionics', range: 4, speedTicks: 6, stats: (l) => ({ focus: 6 + r(l * 0.95) }), inputs: (t) => ({ [t.trace]: 3, [t.bar]: 2 }), examine: 'A two-handed pylon. The rings touch nothing, and it hums a note only you can hear.' },
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
  bulwark: { skill: 'fortitude', shapes: { head: { noun: 'Helm', icon: 'helmet' }, torso: { noun: 'Plate', icon: 'plate' }, hands: { noun: 'Gauntlets', icon: 'gloves' }, legs: { noun: 'Greaves', icon: 'trousers' }, feet: { noun: 'Boots', icon: 'boots' } } },
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
        examine: `${weapon.examine} ${tier.origin}`,
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
          examine: `${lineName} ${shape.noun.toLowerCase()}. ${motif === 'bulwark' ? tier.origin : tier.clothOrigin}`,
          rarity: tier.rarity,
          icon: shape.icon,
          slot,
          stats: armourStats(motif, slot, tier.level),
          requires: requirement(line.skill, tier.level),
          visual: motif === 'skirmisher' ? { primary: tier.cloth[0], secondary: tier.metal[1], motif } : { primary: palette[0], secondary: palette[1], ...(motif === 'bulwark' ? {} : { emissive: tier.glow }), motif },
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

export const RENAMED_WARD_ITEMS: ReadonlyMap<string, string> = new Map([
  ['ceramite-ingot', 'sinter-ingot'],
  ...[...WEAPONS.map((weapon) => weapon.noun), ...BODY_SLOTS.map((slot) => LINES.bulwark.shapes[slot].noun)].map((noun): [string, string] => [`ceramite-${slugOf(noun)}`, `sinter-${slugOf(noun)}`]),
]);

export const WARD_RECIPES: readonly RecipeDefinition[] = [
  recipe('refinery', 'refining', 'scrap-bar', 1, { 'scrap-metal': 2 }, 8),
  recipe('refinery', 'refining', 'iron-bar', 10, { 'silt-iron': 2 }, 20),
  recipe('refinery', 'refining', 'waxed-canvas', 10, { 'reed-bundle': 2 }, 18),
  recipe('cooker', 'biochemistry', 'smoked-eel', 1, { 'basin-eel': 1 }, 8),
  recipe('synthesiser', 'biochemistry', 'greens-poultice', 1, { 'allotment-greens': 2, 'trace-dust': 1 }, 12),
  recipe('cooker', 'biochemistry', 'noodle-bowl', 5, { 'basin-eel': 1, 'allotment-greens': 1, 'day-old-loaf': 1 }, 22),
  recipe('synthesiser', 'biochemistry', 'grip-tincture', 8, { 'hand-leaf-cutting': 1, 'trace-dust': 1 }, 26),
  recipe('synthesiser', 'biochemistry', 'reed-tonic', 12, { 'reed-bundle': 2, 'culvert-trace': 1 }, 34),
  recipe('cooker', 'biochemistry', 'eel-pie', 14, { 'basin-eel': 2, 'day-old-loaf': 1 }, 40),
  recipe('refinery', 'refining', 'steel-bar', 20, { 'iron-bar': 1, 'heavy-scrap': 2 }, 40),
  recipe('refinery', 'refining', 'synth-weave', 20, { 'lab-culture': 2 }, 38),
  recipe('synthesiser', 'biochemistry', 'culture-salve', 22, { 'lab-culture': 2, 'amber-trace': 1 }, 56),
  recipe('cooker', 'biochemistry', 'culture-cutlet', 24, { 'lab-culture': 2, 'day-old-loaf': 1 }, 62),
  recipe('refinery', 'refining', 'alloy-bar', 30, { 'hull-plate': 2 }, 64),
  recipe('refinery', 'refining', 'tarred-canvas', 30, { 'tide-weed': 2 }, 60),
  recipe('cooker', 'biochemistry', 'tide-broth', 32, { 'tide-weed': 2, 'basin-eel': 1 }, 80),
  recipe('refinery', 'refining', 'sinter-ingot', 40, { 'directorate-salvage': 2 }, 96),
  recipe('refinery', 'refining', 'red-mesh', 40, { 'red-moss': 2 }, 90),
  recipe('synthesiser', 'biochemistry', 'tide-tincture', 32, { 'tide-weed': 2, 'hull-trace': 1 }, 86),
  recipe('cooker', 'biochemistry', 'moss-pasty', 44, { 'red-moss': 2, 'day-old-loaf': 1 }, 128),
  recipe('synthesiser', 'biochemistry', 'red-salve', 42, { 'red-moss': 2, 'red-trace': 1 }, 120),
  recipe('refinery', 'refining', 'vault-glass', 50, { 'vault-residue': 2 }, 140),
  recipe('refinery', 'refining', 'bloom-silk', 50, { 'vault-bloom': 2 }, 130),
  recipe('cooker', 'biochemistry', 'bloom-chowder', 54, { 'vault-bloom': 2, 'basin-eel': 1 }, 180),
  recipe('synthesiser', 'biochemistry', 'bloom-elixir', 52, { 'vault-bloom': 2, 'vault-trace': 1 }, 170),
  ...LADDERS.flatMap((ladder) => ladder.recipes),
];

export const WARD_UNIQUES: readonly ItemDefinition[] = [
  gear({ id: 'ratcatchers-gloves', name: "Ratcatcher's Gloves", examine: 'Thick old gloves with a lot of tooth marks. One rat was wearing them.', rarity: 'restricted', icon: 'gloves', slot: 'hands', stats: { armor: 2, accuracy: 1 }, requires: {}, visual: { primary: '#5a4a3a', secondary: '#2a2018' }, value: 40, unique: true }),
  gear({ id: 'feather-cap', name: 'Feather Cap', examine: 'A cap a pigeon somehow built a nest in. It suits you.', rarity: 'restricted', icon: 'hood', slot: 'head', stats: { deflection: 2 }, requires: {}, visual: { primary: '#7a7f8a', secondary: '#4a8a6a', motif: 'skirmisher' }, value: 40, unique: true }),
  gear({ id: 'strays-collar', name: "Stray's Collar", examine: 'A red leather collar with a brass tag that just says GOOD.', rarity: 'restricted', icon: 'collar', slot: 'utility', stats: { cognitiveWard: 2, armor: 1 }, requires: {}, visual: { primary: '#c84a4a', secondary: '#d8a03a' }, value: 60, unique: true }),
];
