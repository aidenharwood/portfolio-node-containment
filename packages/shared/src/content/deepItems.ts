import type { SkillId } from '../character/skills.ts';
import type { WeaponProfile } from '../combat/weapons.ts';
import type { EquipmentSlot } from '../gear/slots.ts';
import type { GearVisual, ItemDefinition, ItemIconShape, ItemRarity } from '../gear/items.ts';
import type { StatBlock } from '../gear/stats.ts';

const material = (
  id: string,
  name: string,
  examine: string,
  icon: ItemIconShape,
  iconColors: readonly [string, string],
  value: number,
): ItemDefinition => ({ id, name, examine, category: 'material', rarity: 'standard', icon, iconColors, maxStack: 100, value });

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

const medicine = (
  id: string,
  name: string,
  examine: string,
  rarity: ItemRarity,
  iconColors: readonly [string, string],
  value: number,
  verb: string,
  heal: number,
): ItemDefinition => ({ id, name, examine, category: 'consumable', rarity, icon: 'vial', iconColors, maxStack: 20, value, consumable: { verb, heal } });

interface GearSpec {
  readonly id: string;
  readonly name: string;
  readonly examine: string;
  readonly rarity: ItemRarity;
  readonly icon: ItemIconShape;
  readonly slot: EquipmentSlot;
  readonly stats: StatBlock;
  readonly requires: Readonly<Partial<Record<SkillId, number>>>;
  readonly visual: GearVisual;
  readonly value: number;
  readonly weapon?: WeaponProfile;
}

const gear = (spec: GearSpec): ItemDefinition => ({
  id: spec.id,
  name: spec.name,
  examine: spec.examine,
  category: 'equipment',
  rarity: spec.rarity,
  icon: spec.icon,
  iconColors: [spec.visual.primary, spec.visual.emissive ?? spec.visual.secondary],
  maxStack: 1,
  value: spec.value,
  equipment: {
    slot: spec.slot,
    stats: spec.stats,
    requirements: { skills: spec.requires },
    visual: spec.visual,
    ...(spec.weapon ? { weapon: spec.weapon } : {}),
  },
});

export const DEEP_RAW_MATERIALS: readonly ItemDefinition[] = [
  material('frost-crystal', 'Frost Crystal', 'A shard of rime grown on a failing cryo line. It never quite reaches room temperature.', 'shard', ['#c8f0ff', '#4a7a9a'], 20),
  material('moth-dust', 'Moth Dust', 'Iridescent scale-dust from a frost moth. Rubbed on skin, it numbs. Rubbed on a wound, it seals.', 'moss', ['#e8f4ff', '#7a8aba'], 22),
  material('cryo-gel', 'Cryo Gel', 'Preservation gel scraped from a rime husk. It is still trying to preserve something.', 'gel', ['#9ae0ff', '#2a5a7a'], 24),
  material('signal-copper', 'Signal Copper', 'Oxygen-free copper from the Array trunk lines. It carries a faint carrier tone when you hold it to your ear.', 'coil', ['#ffb87a', '#7a3a1a'], 30),
  material('sentinel-servo', 'Sentinel Servo', 'A twitching actuator pulled from a relay sentinel. It is still trying to point at you.', 'scrap', ['#c0c8d0', '#3a4048'], 34),
  material('echo-residue', 'Echo Residue', 'A sticky film of recorded voice. If you are quiet, you can hear it asking for a callback.', 'gel', ['#8afff0', '#1a5a5a'], 36),
  material('archival-vellum', 'Archival Vellum', 'Waterlogged vellum from the drowned stacks. The ink has run, but the paper remembers.', 'sheet', ['#e8dcc0', '#7a6a4a'], 40),
  material('black-ink', 'Black Ink', 'Archive ink, thick as tar. It moves towards words when you are not watching.', 'gel', ['#2a2438', '#0a080f'], 42),
  material('eel-hide', 'Ink Eel Hide', 'Slick, layered hide from an ink eel. Waterproof, inkproof, and faintly printed with someone else\'s handwriting.', 'chitin', ['#3a3450', '#120f1c'], 46),
  material('redaction-strip', 'Redaction Strip', 'A black strip peeled off a redactor. Whatever it covered is gone, and so is whatever was under that.', 'sheet', ['#1a1a1a', '#5a5a5a'], 48),
  material('ember-ore', 'Ember Ore', 'Dense ore from the reactor galleries. It glows on the inside, which is where ore should not glow.', 'scrap', ['#ff7a2a', '#5a1a0a'], 56),
  material('cinder-mote', 'Cinder Mote', 'A captured mote of living heat. Keep it away from your hair and your opinions.', 'cell', ['#ffcf4d', '#a83a0a'], 60),
  material('golem-core', 'Golem Core', 'A fist-sized heart of fused slag from a foundry golem. It beats once every minute or so.', 'ingot', ['#ff5a2a', '#2a1410'], 66),
  material('mirror-glass', 'Mirror Glass', 'A pane from the far side. Your reflection in it is a half-second late and does not blink.', 'shard', ['#e8f0ff', '#8a7aba'], 80),
  material('hollow-thread', 'Hollow Thread', 'Thread unravelled from a hollow operative\'s uniform. It is exactly the colour of your own.', 'fibre', ['#b0b8c8', '#3a3a5a'], 84),
  material('knock-splinter', 'Knock Splinter', 'A splinter of door. Not wood, not stone. When you tap it, something taps back.', 'shard', ['#b57cff', '#2a1b40'], 90),
];

export const DEEP_REFINED_PARTS: readonly ItemDefinition[] = [
  material('rime-alloy', 'Rime Alloy', 'Hardened steel quenched in frost-crystal melt. It stays cold enough to keep its edge forever.', 'ingot', ['#a8d8f0', '#3a5a6a'], 60),
  material('cryo-compound', 'Cryo Compound', 'Moth dust and cryo gel rendered into a numbing, sealing paste.', 'vial', ['#c8f0ff', '#3a6a8a'], 58),
  material('relay-weave', 'Relay Weave', 'Signal copper woven through a wiring loom. Armour made from it hums in the key of the Array.', 'fibre', ['#ffb87a', '#3a2a1a'], 90),
  material('servo-core', 'Servo Core', 'Two sentinel servos rebuilt into one precise actuator. It no longer points at you. Mostly.', 'cell', ['#c0c8d0', '#4fd8ff'], 96),
  material('echo-serum', 'Echo Serum', 'Distilled echo residue. In a syringe it tells your cells what they looked like an hour ago.', 'vial', ['#8afff0', '#1a4a4a'], 92),
  material('vellum-weave', 'Vellum Weave', 'Archival vellum pressed and cross-laid into a cloth that turns blades like a stubborn clerk.', 'sheet', ['#e8dcc0', '#4a3a2a'], 120),
  material('ink-laminate', 'Ink Laminate', 'Eel hide bonded with black ink. Light, dark and very difficult to read.', 'chitin', ['#3a3450', '#b57cff'], 130),
  material('ink-essence', 'Ink Essence', 'Black ink distilled through redaction strips. It erases wounds the way it erases words.', 'vial', ['#4a3a6a', '#0a080f'], 126),
  material('furnace-steel', 'Furnace Steel', 'Ember ore folded into hardened steel at reactor heat. It is warm for days.', 'ingot', ['#ff8a4a', '#3a2018'], 170),
  material('cinder-salt', 'Cinder Salt', 'Crystallised cinder motes. A pinch in a compound and the compound gets ideas.', 'moss', ['#ffcf4d', '#7a3a0a'], 160),
  material('mirror-alloy', 'Mirror Alloy', 'Mirror glass fused into furnace steel. Blows that land on it seem to land somewhere else.', 'ingot', ['#e8f0ff', '#b57cff'], 240),
  material('hollow-weave', 'Hollow Weave', 'Hollow thread rewoven into a cloth that is not quite here.', 'fibre', ['#b0b8c8', '#7a5aff'], 230),
];

export const DEEP_QUEST_ITEMS: readonly ItemDefinition[] = [
  questItem('stasis-core', 'Stasis Core', "The Curator's own stasis core, still cold enough to burn. It holds a second of time perfectly still.", 'cell', ['#c8f0ff', '#4fd8ff']),
  questItem('choir-recording', 'Choir Recording', 'A data chip holding the last transmission of the Signal Array. It plays forty voices at once, all of them saying "received".', 'chip', ['#8afff0', '#1a5a5a']),
  questItem('sluice-key', 'Archive Sluice Key', "A brass key stamped RECORDS — FLOOD CONTROL. Lund kept it for 'sentimental reasons'.", 'keycard', ['#c9a227', '#5a4a1a']),
  questItem('founding-charter', 'Founding Charter', 'The original Meridian charter, signed in a hand that shakes. Clause one is a single line: "We answered: not yet."', 'sheet', ['#e8dcc0', '#b57cff']),
  questItem('reactor-log', 'Reactor Log', "The Stoker's handwritten log. Forty years of output figures, and beside every one: FED THE DOOR.", 'sheet', ['#ff8a4a', '#3a2018']),
  questItem('signed-letter', 'Unsent Letter', 'A Directorate letter addressed to Site Meridian, signed by every other Site. The postmark is from the far side.', 'sheet', ['#e8f0ff', '#8a7aba']),
];

export const DEEP_MEDICINE: readonly ItemDefinition[] = [
  medicine('rime-salve', 'Rime Salve', 'Cryo compound folded into gel base. It freezes the wound shut and thaws it healed.', 'issued', ['#c8f0ff', '#3a6a8a'], 60, 'Apply', 30),
  medicine('echo-stim', 'Echo Stim', 'A stim of echo serum. For a moment your body forgets it was ever hurt.', 'restricted', ['#8afff0', '#1a4a4a'], 90, 'Inject', 38),
  medicine('ink-tonic', 'Ink Tonic', 'A dark tonic of ink essence and lumen extract. It tastes like a library smells.', 'restricted', ['#4a3a6a', '#c8f6ff'], 130, 'Drink', 46),
  medicine('cinder-draught', 'Cinder Draught', 'A searing draught of cinder salt and echo serum. Swallow it fast and do not breathe out near anyone.', 'classified', ['#ffcf4d', '#a83a0a'], 180, 'Drink', 56),
  medicine('threshold-elixir', 'Threshold Elixir', 'Knock splinter steeped in cinder salt. It heals you by convincing you that you were never hurt. You are not sure it is wrong.', 'anomalous', ['#b57cff', '#ffcf4d'], 260, 'Drink', 70),
];

const RIME = { primary: '#a8c8d8', secondary: '#3a5060', emissive: '#7ae0ff' };
const RELAY = { primary: '#5a5048', secondary: '#2a2420', emissive: '#ffb87a' };
const ARCHIVE = { primary: '#2a2438', secondary: '#120f1c', emissive: '#b57cff' };
const FURNACE = { primary: '#4a3028', secondary: '#1a100c', emissive: '#ff7a2a' };
const THRESHOLD = { primary: '#d8d8e8', secondary: '#4a3a6a', emissive: '#b57cff' };

export const RIMEGUARD_GEAR: readonly ItemDefinition[] = [
  gear({ id: 'rimeguard-helm', name: 'Rimeguard Helm', examine: 'A cryo-rated helmet with a frost-proof visor. Your breath fogs it from the inside instead.', rarity: 'restricted', icon: 'helmet', slot: 'head', stats: { armor: 7, hazardShielding: 3 }, requires: { fortitude: 12 }, visual: RIME, value: 380 }),
  gear({ id: 'rimeguard-plate', name: 'Rimeguard Plate', examine: 'Rime alloy plate over an insulated liner. Built to stand between a cold-storage anomaly and everything warm.', rarity: 'restricted', icon: 'plate', slot: 'torso', stats: { armor: 15, hazardShielding: 3 }, requires: { fortitude: 12 }, visual: RIME, value: 520 }),
  gear({ id: 'rimeguard-gauntlets', name: 'Rimeguard Gauntlets', examine: 'Insulated gauntlets with rime-alloy knuckles. They never get cold. They make other things cold.', rarity: 'restricted', icon: 'gloves', slot: 'hands', stats: { armor: 4, hazardShielding: 2, power: 2 }, requires: { fortitude: 12 }, visual: RIME, value: 300 }),
  gear({ id: 'rimeguard-greaves', name: 'Rimeguard Greaves', examine: 'Padded thermal trousers with alloy shin plates. They creak like ice on a pond.', rarity: 'restricted', icon: 'trousers', slot: 'legs', stats: { armor: 5, hazardShielding: 1 }, requires: { fortitude: 12 }, visual: RIME, value: 320 }),
  gear({ id: 'rimeguard-boots', name: 'Rimeguard Boots', examine: 'Spiked cryo boots that grip frosted plating. They leave little stars on the floor.', rarity: 'restricted', icon: 'boots', slot: 'feet', stats: { armor: 4, hazardShielding: 2 }, requires: { fortitude: 12 }, visual: RIME, value: 300 }),
  gear({ id: 'cryo-maul', name: 'Cryo Maul', examine: 'A capacitor maul with a rime-alloy head. Each strike flash-freezes a thin layer of whatever it hits.', rarity: 'restricted', icon: 'maul', slot: 'primary', stats: { power: 15, accuracy: 5 }, requires: { closeQuarters: 12 }, visual: RIME, value: 560, weapon: { kind: 'maul', range: 1, speedTicks: 5 } }),
  gear({ id: 'rime-carbine', name: 'Rime Carbine', examine: 'A flechette carbine that fires splinters of frozen gel. They melt before anyone can find them.', rarity: 'restricted', icon: 'carbine', slot: 'primary', stats: { power: 11, accuracy: 16 }, requires: { marksmanship: 12 }, visual: RIME, value: 560, weapon: { kind: 'carbine', range: 7, speedTicks: 5 } }),
  gear({ id: 'rime-shiv', name: 'Rime Shiv', examine: 'A sliver of rime alloy wrapped in insulating tape. It is quick, quiet, and colder going in than coming out.', rarity: 'restricted', icon: 'knife', slot: 'primary', stats: { power: 8, accuracy: 6 }, requires: { closeQuarters: 12 }, visual: RIME, value: 480, weapon: { kind: 'knife', range: 1, speedTicks: 3 } }),
  gear({ id: 'frost-glaive', name: 'Frost Glaive', examine: 'A long cryo-line spar ground to an edge. Whatever it touches at arm\'s length stays at arm\'s length.', rarity: 'restricted', icon: 'polearm', slot: 'primary', stats: { power: 15, accuracy: 6 }, requires: { closeQuarters: 12 }, visual: RIME, value: 540, weapon: { kind: 'polearm', range: 2, speedTicks: 5 } }),
  gear({ id: 'stasis-implant', name: 'Stasis Implant', examine: 'A subdermal cryo-loop that slows a racing mind to a manageable crawl. Side effects include patience.', rarity: 'classified', icon: 'implant', slot: 'implant', stats: { cognitiveWard: 8, armor: 2 }, requires: { containment: 14 }, visual: RIME, value: 600 }),
];

export const RELAY_GEAR: readonly ItemDefinition[] = [
  gear({ id: 'relay-helm', name: 'Relay Helm', examine: 'A lineman\'s helmet with a carrier-tone dampener. The voices in the Array come through as a polite murmur.', rarity: 'restricted', icon: 'helmet', slot: 'head', stats: { armor: 9, hazardShielding: 3, cognitiveWard: 2 }, requires: { fortitude: 16 }, visual: RELAY, value: 760 }),
  gear({ id: 'relay-vest', name: 'Relay Vest', examine: 'Relay weave over servo-braced plates. It stiffens a fraction of a second before you are hit.', rarity: 'restricted', icon: 'vest', slot: 'torso', stats: { armor: 19, cognitiveWard: 3 }, requires: { fortitude: 16 }, visual: RELAY, value: 980 }),
  gear({ id: 'relay-gloves', name: 'Relay Gloves', examine: 'Lineman\'s gloves with servo-assisted fingers. Your grip lands exactly where you meant it to.', rarity: 'restricted', icon: 'gloves', slot: 'hands', stats: { armor: 5, power: 3, accuracy: 3 }, requires: { fortitude: 16 }, visual: RELAY, value: 640 }),
  gear({ id: 'relay-trousers', name: 'Relay Trousers', examine: 'Weave-lined work trousers with a dozen pockets, each holding a different length of cable.', rarity: 'restricted', icon: 'trousers', slot: 'legs', stats: { armor: 7, hazardShielding: 1 }, requires: { fortitude: 16 }, visual: RELAY, value: 640 }),
  gear({ id: 'relay-boots', name: 'Relay Boots', examine: 'Insulated climbing boots for the dish gantries. Rubber soles, copper toecaps.', rarity: 'restricted', icon: 'boots', slot: 'feet', stats: { armor: 6, hazardShielding: 2 }, requires: { fortitude: 16 }, visual: RELAY, value: 600 }),
  gear({ id: 'arc-baton', name: 'Arc Baton', examine: 'A servo-driven baton that arcs between strikes. Faster than a maul and far more talkative.', rarity: 'restricted', icon: 'baton', slot: 'primary', stats: { power: 17, accuracy: 7 }, requires: { closeQuarters: 16 }, visual: RELAY, value: 1050, weapon: { kind: 'baton', range: 1, speedTicks: 4 } }),
  gear({ id: 'arc-carbine', name: 'Arc Carbine', examine: 'A copper-coiled carbine that rides the Array\'s carrier wave. It always finds the signal.', rarity: 'restricted', icon: 'carbine', slot: 'primary', stats: { power: 14, accuracy: 21 }, requires: { marksmanship: 16 }, visual: RELAY, value: 1050, weapon: { kind: 'carbine', range: 7, speedTicks: 5 } }),
  gear({ id: 'relay-cutlass', name: 'Relay Cutlass', examine: 'A curved lineman\'s blade with a copper spine. It hums the carrier tone through every cut.', rarity: 'restricted', icon: 'blade', slot: 'primary', stats: { power: 17, accuracy: 10 }, requires: { closeQuarters: 16 }, visual: RELAY, value: 1000, weapon: { kind: 'blade', range: 1, speedTicks: 4 } }),
  gear({ id: 'arc-scattergun', name: 'Arc Scattergun', examine: 'A coil-fed scattergun that throws a fan of charged copper. Close enough, and it is never a miss.', rarity: 'restricted', icon: 'scattergun', slot: 'primary', stats: { power: 8, accuracy: 20 }, requires: { marksmanship: 16 }, visual: RELAY, value: 1020, weapon: { kind: 'scattergun', range: 3, speedTicks: 5 } }),
  gear({ id: 'choir-visor', name: 'Choir Visor', examine: 'A tuned visor that filters forty voices down to one. The one it keeps is usually yours.', rarity: 'classified', icon: 'visor', slot: 'eyes', stats: { hazardShielding: 7, cognitiveWard: 5, accuracy: 2, armor: 2 }, requires: { containment: 16 }, visual: RELAY, value: 900 }),
  gear({ id: 'signal-scanner', name: 'Signal Scanner', examine: 'A scanner tuned to the far side\'s carrier wave. It clicks when something is listening.', rarity: 'restricted', icon: 'scanner', slot: 'secondary', stats: { insight: 6, cognitiveWard: 3 }, requires: { research: 16 }, visual: RELAY, value: 700 }),
];

export const ARCHIVE_GEAR: readonly ItemDefinition[] = [
  gear({ id: 'inkproof-helm', name: 'Inkproof Helm', examine: 'A sealed helmet laminated in eel hide. Nothing written can get in, including bad news.', rarity: 'restricted', icon: 'helmet', slot: 'head', stats: { armor: 11, hazardShielding: 4, cognitiveWard: 3 }, requires: { fortitude: 20 }, visual: ARCHIVE, value: 1300 }),
  gear({ id: 'archivist-coat', name: 'Archivist\'s Coat', examine: 'A long coat of vellum weave and ink laminate. The pockets are full of index cards that rearrange themselves.', rarity: 'classified', icon: 'coat', slot: 'torso', stats: { armor: 22, cognitiveWard: 5, insight: 3 }, requires: { fortitude: 20 }, visual: ARCHIVE, value: 1700 }),
  gear({ id: 'vellum-gloves', name: 'Vellum Gloves', examine: 'Fine archival gloves with laminate palms. Built for turning pages, adapted for turning faces.', rarity: 'restricted', icon: 'gloves', slot: 'hands', stats: { armor: 6, power: 4, accuracy: 4 }, requires: { fortitude: 20 }, visual: ARCHIVE, value: 1100 }),
  gear({ id: 'ink-trousers', name: 'Ink-Dark Trousers', examine: 'Vellum-weave trousers dyed with archive ink. The stains move when nobody is looking.', rarity: 'restricted', icon: 'trousers', slot: 'legs', stats: { armor: 9, hazardShielding: 2 }, requires: { fortitude: 20 }, visual: ARCHIVE, value: 1100 }),
  gear({ id: 'ink-boots', name: 'Ink-Wader Boots', examine: 'Tall laminate waders for the flooded stacks. Whatever is swimming down there finds them unappetising.', rarity: 'restricted', icon: 'boots', slot: 'feet', stats: { armor: 8, hazardShielding: 3 }, requires: { fortitude: 20 }, visual: ARCHIVE, value: 1050 }),
  gear({ id: 'censor-maul', name: 'Censor Maul', examine: 'A heavy maul with an ink-laminate head. Whatever it hits is quietly struck from the record.', rarity: 'classified', icon: 'maul', slot: 'primary', stats: { power: 23, accuracy: 8 }, requires: { closeQuarters: 20 }, visual: ARCHIVE, value: 1800, weapon: { kind: 'maul', range: 1, speedTicks: 5 } }),
  gear({ id: 'inkshot-pistol', name: 'Inkshot Pistol', examine: 'A quick pistol that fires pellets of black ink. Targets forget, briefly, that they were standing up.', rarity: 'classified', icon: 'pistol', slot: 'primary', stats: { power: 13, accuracy: 21 }, requires: { marksmanship: 20 }, visual: ARCHIVE, value: 1800, weapon: { kind: 'pistol', range: 6, speedTicks: 4 } }),
  gear({ id: 'quill-knife', name: 'Quill Knife', examine: 'A slim archivist\'s knife ground from a pen nib the size of a finger. It edits.', rarity: 'classified', icon: 'knife', slot: 'primary', stats: { power: 15, accuracy: 10 }, requires: { closeQuarters: 20 }, visual: ARCHIVE, value: 1700, weapon: { kind: 'knife', range: 1, speedTicks: 3 } }),
  gear({ id: 'redaction-rifle', name: 'Redaction Rifle', examine: 'A long-barrelled rifle that fires a single black line. Where it lands, the record has a gap.', rarity: 'classified', icon: 'rifle', slot: 'primary', stats: { power: 10, accuracy: 27 }, requires: { marksmanship: 20 }, visual: ARCHIVE, value: 1850, weapon: { kind: 'rifle', range: 9, speedTicks: 7 } }),
  gear({ id: 'palimpsest-implant', name: 'Palimpsest Implant', examine: 'An ink-filament implant that writes over intrusive thoughts before they finish arriving.', rarity: 'classified', icon: 'implant', slot: 'implant', stats: { cognitiveWard: 11, insight: 3, armor: 2 }, requires: { containment: 20 }, visual: ARCHIVE, value: 1600 }),
  gear({ id: 'lexicon-datapad', name: 'Lexicon Datapad', examine: 'A datapad holding the recovered Meridian lexicon. Some of the words in it have never been said aloud.', rarity: 'classified', icon: 'datapad', slot: 'secondary', stats: { insight: 9, cognitiveWard: 3 }, requires: { research: 20 }, visual: ARCHIVE, value: 1400 }),
];

export const FURNACE_GEAR: readonly ItemDefinition[] = [
  gear({ id: 'furnace-helm', name: 'Furnace Helm', examine: 'A smoked-glass foundry helmet with a furnace-steel crown. It glows faintly at the seams.', rarity: 'classified', icon: 'helmet', slot: 'head', stats: { armor: 13, hazardShielding: 6, cognitiveWard: 2 }, requires: { fortitude: 25 }, visual: FURNACE, value: 2100 }),
  gear({ id: 'furnace-plate', name: 'Furnace Plate', examine: 'Furnace-steel plate forged at reactor heat. It is warm to the touch and warmer to the blow.', rarity: 'classified', icon: 'plate', slot: 'torso', stats: { armor: 26, hazardShielding: 5 }, requires: { fortitude: 25 }, visual: FURNACE, value: 2800 }),
  gear({ id: 'furnace-gauntlets', name: 'Furnace Gauntlets', examine: 'Foundry gauntlets with golem-core knuckles. Your fists hit at the temperature of a bad idea.', rarity: 'classified', icon: 'gloves', slot: 'hands', stats: { armor: 8, power: 6, accuracy: 3 }, requires: { fortitude: 25 }, visual: FURNACE, value: 1900 }),
  gear({ id: 'furnace-greaves', name: 'Furnace Greaves', examine: 'Heavy foundry trousers with furnace-steel plates strapped down the front.', rarity: 'classified', icon: 'trousers', slot: 'legs', stats: { armor: 11, hazardShielding: 3 }, requires: { fortitude: 25 }, visual: FURNACE, value: 1800 }),
  gear({ id: 'furnace-boots', name: 'Furnace Boots', examine: 'Steel-shod foundry boots. They leave scorch marks on the floor and on anyone you kick.', rarity: 'classified', icon: 'boots', slot: 'feet', stats: { armor: 10, hazardShielding: 4 }, requires: { fortitude: 25 }, visual: FURNACE, value: 1750 }),
  gear({ id: 'stoker-maul', name: 'Stoker\'s Maul', examine: 'The Stoker\'s own shovel-maul, reforged around a golem core. It still remembers how to feed a fire.', rarity: 'classified', icon: 'maul', slot: 'primary', stats: { power: 30, accuracy: 10 }, requires: { closeQuarters: 25 }, visual: FURNACE, value: 3000, weapon: { kind: 'maul', range: 1, speedTicks: 5 } }),
  gear({ id: 'cinder-carbine', name: 'Cinder Carbine', examine: 'A furnace-steel carbine that fires cinder motes. Each one remembers it was once a star, briefly.', rarity: 'classified', icon: 'carbine', slot: 'primary', stats: { power: 20, accuracy: 30 }, requires: { marksmanship: 25 }, visual: FURNACE, value: 3000, weapon: { kind: 'carbine', range: 7, speedTicks: 5 } }),
  gear({ id: 'furnace-cleaver', name: 'Furnace Cleaver', examine: 'A slab-sided foundry cleaver with a glowing edge. It cuts like it is still being forged.', rarity: 'classified', icon: 'blade', slot: 'primary', stats: { power: 21, accuracy: 12 }, requires: { closeQuarters: 25 }, visual: FURNACE, value: 2900, weapon: { kind: 'blade', range: 1, speedTicks: 4 } }),
  gear({ id: 'slag-pike', name: 'Slag Pike', examine: 'A furnace rake with a molten tip, re-hafted for reach. The Stoker used it to stir things that stirred back.', rarity: 'classified', icon: 'polearm', slot: 'primary', stats: { power: 31, accuracy: 9 }, requires: { closeQuarters: 25 }, visual: FURNACE, value: 2950, weapon: { kind: 'polearm', range: 2, speedTicks: 5 } }),
  gear({ id: 'furnace-respirator', name: 'Furnace Respirator', examine: 'A foundry respirator with cinder-salt filters. The air tastes of iron and ambition.', rarity: 'classified', icon: 'respirator', slot: 'eyes', stats: { hazardShielding: 11, cognitiveWard: 6, armor: 3, accuracy: 2 }, requires: { fortitude: 25 }, visual: FURNACE, value: 2200 }),
];

export const THRESHOLD_GEAR: readonly ItemDefinition[] = [
  gear({ id: 'threshold-helm', name: 'Threshold Helm', examine: 'A helm of mirror alloy. In its faceplate you can see the room behind you, as it will be in a moment.', rarity: 'anomalous', icon: 'helmet', slot: 'head', stats: { armor: 15, hazardShielding: 7, cognitiveWard: 6 }, requires: { fortitude: 30 }, visual: THRESHOLD, value: 3600 }),
  gear({ id: 'threshold-plate', name: 'Threshold Plate', examine: 'Plate forged on the near side from metal mined on the far side. It is lighter than it should be and harder than it can be.', rarity: 'anomalous', icon: 'plate', slot: 'torso', stats: { armor: 30, hazardShielding: 7, cognitiveWard: 6 }, requires: { fortitude: 30 }, visual: THRESHOLD, value: 4800 }),
  gear({ id: 'threshold-gloves', name: 'Threshold Gloves', examine: 'Hollow-weave gloves. Your hands feel as though they are reaching from slightly further away.', rarity: 'anomalous', icon: 'gloves', slot: 'hands', stats: { armor: 9, power: 8, accuracy: 8 }, requires: { fortitude: 30 }, visual: THRESHOLD, value: 3200 }),
  gear({ id: 'threshold-trousers', name: 'Threshold Trousers', examine: 'Hollow-weave trousers with mirror-alloy guards. They rustle a fraction of a second before you move.', rarity: 'anomalous', icon: 'trousers', slot: 'legs', stats: { armor: 13, hazardShielding: 4 }, requires: { fortitude: 30 }, visual: THRESHOLD, value: 3100 }),
  gear({ id: 'threshold-boots', name: 'Threshold Boots', examine: 'Boots that leave footprints on both sides of the door.', rarity: 'anomalous', icon: 'boots', slot: 'feet', stats: { armor: 12, hazardShielding: 5 }, requires: { fortitude: 30 }, visual: THRESHOLD, value: 3000 }),
  gear({ id: 'the-knocker', name: 'The Knocker', examine: 'A maul with a head carved from a splinter of the Knock. When it lands, something, somewhere, opens.', rarity: 'anomalous', icon: 'maul', slot: 'primary', stats: { power: 37, accuracy: 12 }, requires: { closeQuarters: 30 }, visual: THRESHOLD, value: 5200, weapon: { kind: 'maul', range: 1, speedTicks: 5 } }),
  gear({ id: 'last-word', name: 'Last Word', examine: 'A mirror-alloy carbine. Every shot it fires is the final word on the matter.', rarity: 'anomalous', icon: 'carbine', slot: 'primary', stats: { power: 24, accuracy: 37 }, requires: { marksmanship: 30 }, visual: THRESHOLD, value: 5200, weapon: { kind: 'carbine', range: 8, speedTicks: 5 } }),
  gear({ id: 'hinge-glaive', name: 'Hinge Glaive', examine: 'A glaive whose blade swings on a hinge of mirror alloy. It always opens the right way.', rarity: 'anomalous', icon: 'polearm', slot: 'primary', stats: { power: 38, accuracy: 11 }, requires: { closeQuarters: 30 }, visual: THRESHOLD, value: 5000, weapon: { kind: 'polearm', range: 2, speedTicks: 5 } }),
  gear({ id: 'farsight-rifle', name: 'Farsight Rifle', examine: 'A mirror-scoped rifle. Through it you can see the target, and a little of where the target is about to be.', rarity: 'anomalous', icon: 'rifle', slot: 'primary', stats: { power: 12, accuracy: 36 }, requires: { marksmanship: 30 }, visual: THRESHOLD, value: 5100, weapon: { kind: 'rifle', range: 9, speedTicks: 7 } }),
  gear({ id: 'threshold-implant', name: 'Threshold Implant', examine: 'A sliver of the far side, sewn behind the ear. It hears the knock before it comes and tells you, calmly, not to answer.', rarity: 'anomalous', icon: 'implant', slot: 'implant', stats: { cognitiveWard: 16, armor: 3, insight: 3 }, requires: { containment: 30 }, visual: THRESHOLD, value: 4400 }),
  gear({ id: 'meridian-sigil', name: 'Meridian Sigil', examine: 'The founder\'s sigil, recast from the charter seal. It marks you as the one who stood before the door twice.', rarity: 'anomalous', icon: 'badge', slot: 'utility', stats: { armor: 3, power: 3, accuracy: 3, cognitiveWard: 3, insight: 3 }, requires: { containment: 25 }, visual: THRESHOLD, value: 2500 }),
];

export const DEEP_ITEMS: readonly ItemDefinition[] = [
  ...DEEP_RAW_MATERIALS,
  ...DEEP_REFINED_PARTS,
  ...DEEP_QUEST_ITEMS,
  ...DEEP_MEDICINE,
  ...RIMEGUARD_GEAR,
  ...RELAY_GEAR,
  ...ARCHIVE_GEAR,
  ...FURNACE_GEAR,
  ...THRESHOLD_GEAR,
];
