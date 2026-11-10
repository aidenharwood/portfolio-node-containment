import type { ItemDefinition, ItemIconShape } from '../gear/items.ts';
import { gear } from './gearItem.ts';

const material = (id: string, name: string, examine: string, icon: ItemIconShape, iconColors: readonly [string, string], value: number): ItemDefinition => ({
  id,
  name,
  examine,
  category: 'material',
  rarity: 'standard',
  icon,
  iconColors,
  maxStack: 100,
  value,
});

const questItem = (id: string, name: string, examine: string, icon: ItemIconShape, iconColors: readonly [string, string]): ItemDefinition => ({
  id,
  name,
  examine,
  category: 'quest',
  rarity: 'anomalous',
  icon,
  iconColors,
  maxStack: 1,
  value: 0,
});

export const CALDER_MATERIALS: readonly ItemDefinition[] = [
  material('rock-salt', 'Calder Rock Salt', 'A fist of pink rock salt cut from a Calder seam. It is faintly warm, and it gets warmer if you talk near it.', 'shard', ['#f2c8b8', '#8a4a3a'], 60),
  material('crawler-carapace', 'Crawler Carapace', 'A plate of brine crawler shell, crusted white where the salt grew into it. It rings like a bell when tapped.', 'chitin', ['#e8e2d4', '#5a4a3a'], 70),
  material('miner-canvas', 'Miner\'s Canvas', 'Salt-stiff canvas from a wight\'s work coat. The shift number stencilled on the back is the same on every one.', 'sheet', ['#b8a888', '#4a3a2a'], 70),
  material('lamp-glass', 'Lamp Glass', 'The lens of a miner\'s lamp, still lit. Nobody has found the battery.', 'shard', ['#ffd27f', '#8a5a1a'], 75),
  material('halite-geode', 'Halite Geode', 'A split geode of clear halite. The cubes inside are perfectly regular, and there are always nine of them.', 'shard', ['#f4efe6', '#9a8a7a'], 85),
  material('salted-vestment', 'Salted Vestment', 'A strip of acolyte vestment, stiff with salt and embroidered in a hand that keeps changing.', 'sheet', ['#f4efe6', '#3a2a4a'], 85),
  material('brine-steel', 'Brine Steel', 'Crawler carapace folded into rock salt and quenched in brine. It never rusts, and it never quite dries.', 'ingot', ['#e8e2d4', '#ff9a6a'], 260),
  material('salt-weave', 'Salt Weave', 'Miner\'s canvas re-spun with a thread of rock salt. It holds its shape under any load, including grief.', 'sheet', ['#d8c8a8', '#5a4a3a'], 250),
  material('halite-glass', 'Halite Glass', 'Geode halite fused around a lamp lens. It glows from the inside, and the glow points towards the cathedral.', 'ingot', ['#f4efe6', '#ffd27f'], 320),
  material('vestment-weave', 'Vestment Weave', 'Salted vestment woven into salt weave. Whoever wears it walks a little like a procession.', 'sheet', ['#f4efe6', '#3a2a4a'], 310),
];

export const CALDER_MEDICINE: readonly ItemDefinition[] = [
  {
    id: 'salt-poultice',
    name: 'Salt Poultice',
    examine: 'Calder rock salt packed into gel base. It stings like the sea and closes wounds like a tide coming in.',
    category: 'consumable',
    rarity: 'anomalous',
    icon: 'vial',
    iconColors: ['#f2c8b8', '#8a4a3a'],
    maxStack: 20,
    value: 230,
    consumable: { verb: 'Apply', heal: 76 },
  },
];

export const CALDER_QUEST_ITEMS: readonly ItemDefinition[] = [
  questItem('foremans-card', "Foreman's Card", "Foreman Ostrava's punch card, forty years without a clock-off stamp. The card is warm, as though someone is still holding it.", 'keycard', ['#d8c8a8', '#8a4a3a']),
  questItem('calder-letter', 'Letter from Calder', 'Salt-crusted paper, postmarked CALDER, delivered through the Waterworks wall. It asks one question: WHO ARE YOU?', 'sheet', ['#f2e6c8', '#8a4a3a']),
];

const SALTWORKS = { primary: '#e8e2d4', secondary: '#5a4a3a', emissive: '#ff9a6a' };
const CATHEDRAL = { primary: '#f4efe6', secondary: '#3a2a4a', emissive: '#ffd27f' };
const BISHOP = { primary: '#fff8ee', secondary: '#6a2a3a', emissive: '#ffb3c8' };

export const SALTWORKS_GEAR: readonly ItemDefinition[] = [
  gear({ id: 'saltworks-helm', name: 'Saltworks Helm', examine: 'A miner\'s helm in brine steel with a lamp socket on the brow. The socket is empty. The lamp is still lit somewhere.', rarity: 'anomalous', icon: 'helmet', slot: 'head', stats: { armor: 19, hazardShielding: 9, cognitiveWard: 8 }, requires: { fortitude: 40 }, visual: SALTWORKS, value: 6700 }),
  gear({ id: 'saltworks-plate', name: 'Saltworks Plate', examine: 'Brine-steel plate laced over salt weave. It creaks like a gallery settling, which is comforting until it isn\'t.', rarity: 'anomalous', icon: 'plate', slot: 'torso', stats: { armor: 38, hazardShielding: 9, cognitiveWard: 8 }, requires: { fortitude: 40 }, visual: SALTWORKS, value: 8900 }),
  gear({ id: 'saltworks-gloves', name: 'Saltworks Gloves', examine: 'Salt-weave gauntlets with crawler-shell knuckles. Your grip never slips, even on wet salt.', rarity: 'anomalous', icon: 'gloves', slot: 'hands', stats: { armor: 11, power: 11, accuracy: 11 }, requires: { fortitude: 40 }, visual: SALTWORKS, value: 6000 }),
  gear({ id: 'saltworks-trousers', name: 'Saltworks Trousers', examine: 'Salt-weave work trousers with brine-steel kneecaps. Built for kneeling at a seam for twelve hours.', rarity: 'anomalous', icon: 'trousers', slot: 'legs', stats: { armor: 17, hazardShielding: 6 }, requires: { fortitude: 40 }, visual: SALTWORKS, value: 5800 }),
  gear({ id: 'saltworks-boots', name: 'Saltworks Boots', examine: 'Steel-shanked boots soled with crawler shell. They crunch on salt and say nothing on stone.', rarity: 'anomalous', icon: 'boots', slot: 'feet', stats: { armor: 16, hazardShielding: 7 }, requires: { fortitude: 40 }, visual: SALTWORKS, value: 5600 }),
  gear({ id: 'saltworks-goggles', name: 'Saltworks Goggles', examine: 'Lamp-glass goggles in a brine-steel frame. In the dark they show the seams glowing like veins.', rarity: 'anomalous', icon: 'visor', slot: 'eyes', stats: { hazardShielding: 15, cognitiveWard: 9, armor: 5, accuracy: 4 }, requires: { fortitude: 40 }, visual: SALTWORKS, value: 6200 }),
  gear({ id: 'seam-maul', name: 'Seam Maul', examine: 'A brine-steel sledge for splitting salt faces. The head is shod in crawler shell, and it rings on every swing.', rarity: 'anomalous', icon: 'maul', slot: 'primary', stats: { power: 50, accuracy: 16 }, requires: { closeQuarters: 40 }, visual: SALTWORKS, value: 9600, weapon: { kind: 'maul', range: 1, speedTicks: 5 } }),
  gear({ id: 'brine-cutter', name: 'Brine Cutter', examine: 'A short brine-steel cutter for trimming seams. It is always slightly wet, and it always cuts clean.', rarity: 'anomalous', icon: 'knife', slot: 'primary', stats: { power: 30, accuracy: 18 }, requires: { closeQuarters: 40 }, visual: SALTWORKS, value: 8600, weapon: { kind: 'knife', range: 1, speedTicks: 3 } }),
  gear({ id: 'seam-carbine', name: 'Seam Carbine', examine: 'A charge carbine rebuilt from a seam-blasting rig. It was made to break rock, and it remembers.', rarity: 'anomalous', icon: 'carbine', slot: 'primary', stats: { power: 32, accuracy: 51 }, requires: { marksmanship: 40 }, visual: SALTWORKS, value: 9600, weapon: { kind: 'carbine', range: 8, speedTicks: 5 } }),
  gear({ id: 'lampline-rifle', name: 'Lampline Rifle', examine: 'A long rifle sighted through a miner\'s lamp lens. Whatever it is pointed at is lit up for everyone else.', rarity: 'anomalous', icon: 'rifle', slot: 'primary', stats: { power: 16, accuracy: 50 }, requires: { marksmanship: 40 }, visual: SALTWORKS, value: 9400, weapon: { kind: 'rifle', range: 9, speedTicks: 7 } }),
  gear({ id: 'geode-implant', name: 'Geode Implant', examine: 'A lamp-glass implant seated in a cube of rock salt. It keeps your thoughts in perfectly regular shapes.', rarity: 'anomalous', icon: 'implant', slot: 'implant', stats: { cognitiveWard: 24, armor: 5, insight: 5 }, requires: { containment: 40 }, visual: SALTWORKS, value: 7900 }),
];

export const CATHEDRAL_GEAR: readonly ItemDefinition[] = [
  gear({ id: 'cathedral-helm', name: 'Cathedral Helm', examine: 'A halite-glass helm shaped like a reliquary. Light inside it moves when you pray, and when you don\'t.', rarity: 'anomalous', icon: 'helmet', slot: 'head', stats: { armor: 21, hazardShielding: 10, cognitiveWard: 9 }, requires: { fortitude: 45 }, visual: CATHEDRAL, value: 8000 }),
  gear({ id: 'cathedral-plate', name: 'Cathedral Plate', examine: 'Halite-glass plate over vestment weave. It hums one low note, the same one the cathedral hums.', rarity: 'anomalous', icon: 'plate', slot: 'torso', stats: { armor: 42, hazardShielding: 10, cognitiveWard: 9 }, requires: { fortitude: 45 }, visual: CATHEDRAL, value: 10600 }),
  gear({ id: 'cathedral-gloves', name: 'Cathedral Gloves', examine: 'Vestment-weave gloves with brine-steel palms. They fold your hands together when you are not using them.', rarity: 'anomalous', icon: 'gloves', slot: 'hands', stats: { armor: 12, power: 12, accuracy: 12 }, requires: { fortitude: 45 }, visual: CATHEDRAL, value: 7200 }),
  gear({ id: 'cathedral-trousers', name: 'Cathedral Trousers', examine: 'Vestment-weave trousers with halite-glass greaves. You will want to walk in step with someone.', rarity: 'anomalous', icon: 'trousers', slot: 'legs', stats: { armor: 19, hazardShielding: 7 }, requires: { fortitude: 45 }, visual: CATHEDRAL, value: 7000 }),
  gear({ id: 'cathedral-boots', name: 'Cathedral Boots', examine: 'Halite-soled boots. Your footsteps echo a moment late, as though the nave is answering.', rarity: 'anomalous', icon: 'boots', slot: 'feet', stats: { armor: 18, hazardShielding: 8 }, requires: { fortitude: 45 }, visual: CATHEDRAL, value: 6700 }),
  gear({ id: 'cathedral-lenses', name: 'Cathedral Lenses', examine: 'Halite-glass lenses ground to the cathedral\'s rose window. Every light source becomes a little holy.', rarity: 'anomalous', icon: 'visor', slot: 'eyes', stats: { hazardShielding: 17, cognitiveWard: 10, armor: 6, accuracy: 5 }, requires: { fortitude: 45 }, visual: CATHEDRAL, value: 7400 }),
  gear({ id: 'censer-maul', name: 'Censer Maul', examine: 'A cathedral censer on a brine-steel haft. It swings salt smoke in a perfect arc, and then something hard.', rarity: 'anomalous', icon: 'maul', slot: 'primary', stats: { power: 56, accuracy: 18 }, requires: { closeQuarters: 45 }, visual: CATHEDRAL, value: 11500, weapon: { kind: 'maul', range: 1, speedTicks: 5 } }),
  gear({ id: 'reliquary-glaive', name: 'Reliquary Glaive', examine: 'A long glaive with a halite reliquary set in the blade. Whatever relic is inside, it disapproves of you.', rarity: 'anomalous', icon: 'polearm', slot: 'primary', stats: { power: 54, accuracy: 15 }, requires: { closeQuarters: 45 }, visual: CATHEDRAL, value: 11000, weapon: { kind: 'polearm', range: 2, speedTicks: 5 } }),
  gear({ id: 'choir-carbine', name: 'Choir Carbine', examine: 'A carbine with a halite resonator in place of a muzzle brake. Each shot is a single sung note.', rarity: 'anomalous', icon: 'carbine', slot: 'primary', stats: { power: 36, accuracy: 58 }, requires: { marksmanship: 45 }, visual: CATHEDRAL, value: 11500, weapon: { kind: 'carbine', range: 8, speedTicks: 5 } }),
  gear({ id: 'vigil-rifle', name: 'Vigil Rifle', examine: 'A long rifle for keeping vigil from the clerestory. It has never once fired before the target was ready.', rarity: 'anomalous', icon: 'rifle', slot: 'primary', stats: { power: 18, accuracy: 57 }, requires: { marksmanship: 45 }, visual: CATHEDRAL, value: 11200, weapon: { kind: 'rifle', range: 9, speedTicks: 7 } }),
  gear({ id: 'relic-implant', name: 'Relic Implant', examine: 'A sliver of halite seated behind the ear. It keeps a small, polite silence in your head at all times.', rarity: 'anomalous', icon: 'implant', slot: 'implant', stats: { cognitiveWard: 28, armor: 6, insight: 6 }, requires: { containment: 45 }, visual: CATHEDRAL, value: 9500 }),
];

export const CALDER_UNIQUE_GEAR: readonly ItemDefinition[] = [
  gear({ id: 'last-shift-pick', name: 'Last Shift', examine: 'A wight\'s salt pick, its handle worn to the shape of one particular hand. The shift it was working has not ended.', rarity: 'anomalous', icon: 'maul', slot: 'primary', stats: { power: 54, accuracy: 15 }, requires: { closeQuarters: 44 }, visual: SALTWORKS, value: 10000, weapon: { kind: 'maul', range: 1, speedTicks: 5 }, unique: true }),
  gear({ id: 'bishops-mitre', name: 'The Bishop\'s Mitre', examine: 'A mitre of grown salt, lined in old vestment. It sits on your head as though it had been waiting there.', rarity: 'anomalous', icon: 'helmet', slot: 'head', stats: { armor: 22, hazardShielding: 11, cognitiveWard: 14 }, requires: { fortitude: 47 }, visual: BISHOP, value: 12000, unique: true }),
  gear({ id: 'salt-crozier', name: 'Salt Crozier', examine: 'The Bishop\'s crook, grown rather than made. Its hook curls tighter around anything you point it at.', rarity: 'anomalous', icon: 'polearm', slot: 'primary', stats: { power: 60, accuracy: 18 }, requires: { closeQuarters: 47 }, visual: BISHOP, value: 14000, weapon: { kind: 'polearm', range: 2, speedTicks: 5 }, unique: true }),
];
