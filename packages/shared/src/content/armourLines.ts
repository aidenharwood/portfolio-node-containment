import type { SkillId } from '../character/skills.ts';
import type { RecipeDefinition } from '../crafting/recipes.ts';
import type { GearMotif, GearVisual, ItemDefinition, ItemIconShape, ItemRarity } from '../gear/items.ts';
import type { EquipmentSlot } from '../gear/slots.ts';
import type { StatBlock } from '../gear/stats.ts';
import { gear } from './gearItem.ts';

type ArmourSlot = Extract<EquipmentSlot, 'head' | 'torso' | 'hands' | 'legs' | 'feet' | 'back'>;

type BodySlot = Exclude<ArmourSlot, 'back'>;

const ARMOUR_SLOTS: readonly ArmourSlot[] = ['head', 'torso', 'hands', 'legs', 'feet', 'back'];

type LineMotif = Exclude<GearMotif, 'bulwark'>;

interface BulwarkBack {
  readonly name: string;
  readonly palette: Omit<GearVisual, 'motif'>;
  readonly examine: string;
}

interface LinePieces {
  readonly name: string;
  readonly palette: Omit<GearVisual, 'motif'>;
  readonly examines: Readonly<Record<ArmourSlot, string>>;
}

interface ArmourTier {
  readonly level: number;
  readonly rarity: ItemRarity;
  readonly experience: number;
  readonly heavy: Readonly<Record<BodySlot, StatBlock & { readonly value: number }>>;
  readonly bulwark: BulwarkBack;
  readonly metal: string;
  readonly cloth: string;
  readonly reagent: string;
  readonly skirmisher: LinePieces;
  readonly warden: LinePieces;
}

const LINE_SKILL: Readonly<Record<GearMotif, SkillId>> = { bulwark: 'fortitude', skirmisher: 'marksmanship', warden: 'containment' };

const LINE_SHAPES: Readonly<Record<LineMotif, Readonly<Record<ArmourSlot, { readonly icon: ItemIconShape; readonly noun: string }>>>> = {
  skirmisher: {
    head: { icon: 'hood', noun: 'Hood' },
    torso: { icon: 'vest', noun: 'Harness' },
    hands: { icon: 'gloves', noun: 'Grips' },
    legs: { icon: 'trousers', noun: 'Leggings' },
    feet: { icon: 'boots', noun: 'Treads' },
    back: { icon: 'pack', noun: 'Bandolier' },
  },
  warden: {
    head: { icon: 'cowl', noun: 'Cowl' },
    torso: { icon: 'coat', noun: 'Vestments' },
    hands: { icon: 'gloves', noun: 'Wraps' },
    legs: { icon: 'trousers', noun: 'Breeches' },
    feet: { icon: 'boots', noun: 'Footwraps' },
    back: { icon: 'cape', noun: 'Mantle' },
  },
};

const prune = (stats: Record<string, number>): StatBlock =>
  Object.fromEntries(Object.entries(stats).filter(([, value]) => value > 0)) as StatBlock;

function backStats(motif: GearMotif, level: number): StatBlock {
  switch (motif) {
    case 'bulwark':
      return prune({ armor: Math.round(level * 0.25) + 1, hazardShielding: Math.round(level * 0.12) + 1, power: Math.round(level * 0.08) });
    case 'skirmisher':
      return prune({ armor: Math.round(level * 0.15) + 1, accuracy: Math.round(level * 0.15) + 1, hazardShielding: Math.round(level * 0.06) });
    case 'warden':
      return prune({ cognitiveWard: Math.round(level * 0.25) + 1, insight: Math.round(level / 15) + 1, armor: Math.round(level * 0.08) });
  }
}

function lineStats(motif: LineMotif, slot: BodySlot, heavy: StatBlock, level: number): StatBlock {
  const armor = heavy.armor ?? 0;
  const hazard = heavy.hazardShielding ?? 0;
  const ward = heavy.cognitiveWard ?? 0;
  const offence = (heavy.power ?? 0) + (heavy.accuracy ?? 0);
  if (motif === 'skirmisher') {
    return prune({
      armor: Math.round(armor * 0.7),
      hazardShielding: hazard,
      cognitiveWard: Math.round(ward * 0.5),
      accuracy: slot === 'hands' ? offence : Math.max(1, Math.round(armor * 0.25)),
    });
  }
  const insight = slot === 'head' || slot === 'torso' ? Math.max(1, Math.round(level / 10)) : 0;
  return prune({
    armor: Math.round(armor * 0.65),
    hazardShielding: Math.round(hazard * 0.6),
    cognitiveWard: ward + Math.max(1, Math.round(armor * 0.35)),
    insight,
    power: slot === 'hands' ? Math.round((heavy.power ?? 0) / 2) : 0,
    accuracy: slot === 'hands' ? Math.round((heavy.accuracy ?? 0) / 2) : 0,
  });
}

const slugOf = (name: string): string => name.toLowerCase().replace(/[^a-z]+/g, '-');

const lineItemId = (tier: ArmourTier, motif: LineMotif, slot: ArmourSlot): string =>
  `${slugOf(tier[motif].name)}-${slugOf(LINE_SHAPES[motif][slot].noun)}`;

function recipeInputs(tier: ArmourTier, motif: GearMotif, slot: ArmourSlot): Readonly<Record<string, number>> {
  const { metal, cloth, reagent } = tier;
  if (slot === 'back') return motif === 'bulwark' ? { [metal]: 2, [cloth]: 1 } : { [cloth]: 2, [reagent]: 1 };
  if (motif === 'skirmisher') {
    switch (slot) {
      case 'head': return { [cloth]: 2, [metal]: 1 };
      case 'torso': return { [cloth]: 3, [metal]: 2 };
      case 'hands': return { [cloth]: 1, [reagent]: 1 };
      case 'legs': return { [cloth]: 3 };
      case 'feet': return { [cloth]: 1, [metal]: 1 };
      default: return { [cloth]: 2 };
    }
  }
  switch (slot) {
    case 'head': return { [cloth]: 2, [reagent]: 1 };
    case 'torso': return { [cloth]: 4, [reagent]: 1 };
    case 'hands': return { [cloth]: 1, [reagent]: 1 };
    case 'legs': return { [cloth]: 2, [metal]: 1 };
    case 'feet': return { [metal]: 1, [cloth]: 1 };
    default: return { [cloth]: 2 };
  }
}

function lineItems(tier: ArmourTier, motif: LineMotif): ItemDefinition[] {
  const line = tier[motif];
  return ARMOUR_SLOTS.map((slot) => {
    if (slot === 'back') {
      return gear({
        id: lineItemId(tier, motif, slot),
        name: `${line.name} ${LINE_SHAPES[motif][slot].noun}`,
        examine: line.examines[slot],
        rarity: tier.rarity,
        icon: LINE_SHAPES[motif][slot].icon,
        slot,
        stats: backStats(motif, tier.level),
        requires: { [LINE_SKILL[motif]]: tier.level },
        visual: { ...line.palette, motif },
        value: Math.round(tier.heavy.head.value * 0.8),
      });
    }
    const { value, ...heavy } = tier.heavy[slot];
    return gear({
      id: lineItemId(tier, motif, slot),
      name: `${line.name} ${LINE_SHAPES[motif][slot].noun}`,
      examine: line.examines[slot],
      rarity: tier.rarity,
      icon: LINE_SHAPES[motif][slot].icon,
      slot,
      stats: lineStats(motif, slot, heavy, tier.level),
      requires: { [LINE_SKILL[motif]]: tier.level },
      visual: { ...line.palette, motif },
      value: Math.round(value * 0.95),
    });
  });
}

const bulwarkPackId = (tier: ArmourTier): string => `${slugOf(tier.bulwark.name)}-pack`;

function bulwarkPack(tier: ArmourTier): ItemDefinition {
  return gear({
    id: bulwarkPackId(tier),
    name: `${tier.bulwark.name} Pack`,
    examine: tier.bulwark.examine,
    rarity: tier.rarity,
    icon: 'pack',
    slot: 'back',
    stats: backStats('bulwark', tier.level),
    requires: { fortitude: tier.level },
    visual: { ...tier.bulwark.palette, motif: 'bulwark' },
    value: Math.round(tier.heavy.head.value * 0.8),
  });
}

function recipeFor(tier: ArmourTier, motif: GearMotif, slot: ArmourSlot, output: string): RecipeDefinition {
  const level = slot === 'torso' ? tier.level + 1 : tier.level;
  return {
    id: `fabricator:${output}`,
    station: 'fabricator',
    skill: 'engineering',
    level,
    inputs: Object.entries(recipeInputs(tier, motif, slot)).map(([itemId, count]) => ({ itemId, count })),
    output: { itemId: output, count: 1 },
    experience: Math.round(tier.experience * (slot === 'torso' ? 1.3 : 1)),
    ticks: tier.level < 12 ? 6 : 8,
  };
}

function lineRecipes(tier: ArmourTier, motif: LineMotif): RecipeDefinition[] {
  return ARMOUR_SLOTS.map((slot) => recipeFor(tier, motif, slot, lineItemId(tier, motif, slot)));
}

export const ARMOUR_TIERS: readonly ArmourTier[] = [
  {
    level: 8,
    rarity: 'restricted',
    experience: 110,
    bulwark: {
      name: 'Undercroft',
      palette: { primary: '#3a3f45', secondary: '#1e2226', emissive: '#ff5e5e' },
      examine: "A steel-framed salvage pack with a red work lamp on the strap. Everything in the Undercroft is worth carrying out.",
    },
    heavy: {
      head: { armor: 5, hazardShielding: 2, value: 120 },
      torso: { armor: 11, hazardShielding: 2, value: 300 },
      hands: { armor: 3, hazardShielding: 2, power: 1, value: 110 },
      legs: { armor: 4, hazardShielding: 1, value: 140 },
      feet: { armor: 3, hazardShielding: 2, value: 130 },
    },
    metal: 'hardened-steel',
    cloth: 'braided-cord',
    reagent: 'lumen-extract',
    skirmisher: {
      name: 'Tunnelrunner',
      palette: { primary: '#4a5a3a', secondary: '#22281c', emissive: '#d8f07a' },
      examines: {
        head: 'A cord-knit hood with a steel brow band. It keeps the drips off and the dark in.',
        torso: 'A braided harness with steel buckles and too many pouches. Runners in the Undercroft count everything twice.',
        hands: 'Cord grips with fingertips cut away for the trigger. They smell faintly of lumen extract.',
        legs: 'Braided leggings that do not snag on grating, pipework or the things that live in it.',
        feet: 'Soft treads with a steel shank. Quiet on catwalks, firm on ladders.',
        back: "A braided bandolier of cartridge loops and a rolled ground-sheet. Runners sleep where they stop.",
      },
    },
    warden: {
      name: 'Lanternkeeper',
      palette: { primary: '#c8b88a', secondary: '#3a3424', emissive: '#c8f6ff' },
      examines: {
        head: 'A cowl stitched with lumen thread. In the dark it glows just enough to be found by the right people.',
        torso: 'Long cord vestments dyed with lumen extract. The old lantern-keepers wore these to walk the mites back to bed.',
        hands: 'Cord wraps soaked in extract. Anything you hold feels calmer for it.',
        legs: 'Heavy breeches with a steel kneeband. Built for long vigils on cold floors.',
        feet: 'Wrapped boots with a steel heel. You walk softly in them without trying to.',
        back: "A short lumen-dyed mantle that glows faintly at the hem, enough to lead the way back.",
      },
    },
  },
  {
    level: 12,
    rarity: 'restricted',
    experience: 175,
    bulwark: {
      name: 'Rimeguard',
      palette: { primary: '#a8c8d8', secondary: '#3a5060', emissive: '#7ae0ff' },
      examine: "An insulated rime-alloy pack with a heater coil. It keeps your cells warm and your back cold.",
    },
    heavy: {
      head: { armor: 7, hazardShielding: 3, value: 380 },
      torso: { armor: 15, hazardShielding: 3, value: 520 },
      hands: { armor: 4, hazardShielding: 2, power: 2, value: 300 },
      legs: { armor: 5, hazardShielding: 1, value: 320 },
      feet: { armor: 4, hazardShielding: 2, value: 300 },
    },
    metal: 'rime-alloy',
    cloth: 'synthweave-bolt',
    reagent: 'cryo-compound',
    skirmisher: {
      name: 'Frostline',
      palette: { primary: '#e0eef4', secondary: '#5a7484', emissive: '#7ae0ff' },
      examines: {
        head: 'A white snow hood with a rime-alloy peak. Against frosted plating you are just another drift.',
        torso: 'A pale harness with rime clasps. It carries spare cells close to the body, where they stay warm.',
        hands: 'Insulated grips treated with cryo compound. Your trigger finger never goes numb, only everyone else\'s.',
        legs: 'Quilted leggings in white synthweave. They whisper like snowfall when you move.',
        feet: 'Spiked treads with rime toecaps. They hold on ice and leave almost nothing behind.',
        back: "A white bandolier with insulated cell sleeves and a snow-roll. Nothing in it freezes.",
      },
    },
    warden: {
      name: 'Coldvigil',
      palette: { primary: '#5a6a8a', secondary: '#1e2434', emissive: '#c8f0ff' },
      examines: {
        head: 'A deep cowl lined with cryo compound. It keeps the head cool, and the thoughts in it slow and orderly.',
        torso: 'Layered vestments of cold-store blue. The Curator\'s night staff wore them to sit with things that did not sleep.',
        hands: 'Wraps that numb the fingers just enough. You stop shaking before you start.',
        legs: 'Long blue breeches with a rime-alloy kneeband. They never quite warm up.',
        feet: 'Felted footwraps over rime-alloy soles. They make no sound on frost.',
        back: "A blue mantle quilted with cryo compound. It falls still around you, like snow settling.",
      },
    },
  },
  {
    level: 16,
    rarity: 'restricted',
    experience: 310,
    bulwark: {
      name: 'Relay',
      palette: { primary: '#5a5048', secondary: '#2a2420', emissive: '#ffb87a' },
      examine: "A lineman's tool pack with a whip antenna. It picks up the Array whether you want it to or not.",
    },
    heavy: {
      head: { armor: 9, hazardShielding: 3, cognitiveWard: 2, value: 760 },
      torso: { armor: 19, cognitiveWard: 3, value: 980 },
      hands: { armor: 5, power: 3, accuracy: 3, value: 640 },
      legs: { armor: 7, hazardShielding: 1, value: 640 },
      feet: { armor: 6, hazardShielding: 2, value: 600 },
    },
    metal: 'servo-core',
    cloth: 'relay-weave',
    reagent: 'echo-serum',
    skirmisher: {
      name: 'Lineman',
      palette: { primary: '#d88a3a', secondary: '#2a2420', emissive: '#ffe07a' },
      examines: {
        head: 'A high-visibility lineman\'s hood with a servo-steadied earpiece. It tells you which way the wind is blowing on the dish.',
        torso: 'A climbing harness of relay weave with servo-locked carabiners. It catches you before you know you have slipped.',
        hands: 'Servo-tipped grips that settle your aim between heartbeats.',
        legs: 'Orange relay-weave leggings, reinforced where the gantry rails rub.',
        feet: 'Gantry treads with servo-sprung soles. They land softer than they should from a height.',
        back: "A climbing bandolier hung with servo carabiners and coiled relay line.",
      },
    },
    warden: {
      name: 'Cantor',
      palette: { primary: '#3a5a5a', secondary: '#142424', emissive: '#8afff0' },
      examines: {
        head: 'A cowl lined with echo serum. The Choir sounds further away in it, like a hymn from the next building.',
        torso: 'Choir vestments in relay weave. They hum a counter-note that keeps your own voice yours.',
        hands: 'Wraps dipped in echo serum. They remember what your hands were doing a moment ago.',
        legs: 'Dark breeches with a servo kneeband, made for kneeling at a console for a long shift.',
        feet: 'Soft footwraps over servo soles. They keep time with something you cannot hear.',
        back: "A dark mantle lined with echo serum. Voices behind you come out sounding like your own.",
      },
    },
  },
  {
    level: 20,
    rarity: 'classified',
    experience: 520,
    bulwark: {
      name: 'Inkproof',
      palette: { primary: '#2a2438', secondary: '#120f1c', emissive: '#b57cff' },
      examine: "A sealed ink-laminate document case worn high on the back. Anything inside stays legible, and nobody else's.",
    },
    heavy: {
      head: { armor: 11, hazardShielding: 4, cognitiveWard: 3, value: 1300 },
      torso: { armor: 22, cognitiveWard: 5, insight: 3, value: 1700 },
      hands: { armor: 6, power: 4, accuracy: 4, value: 1100 },
      legs: { armor: 9, hazardShielding: 2, value: 1100 },
      feet: { armor: 8, hazardShielding: 3, value: 1050 },
    },
    metal: 'ink-laminate',
    cloth: 'vellum-weave',
    reagent: 'ink-essence',
    skirmisher: {
      name: 'Stackrunner',
      palette: { primary: '#6a5a44', secondary: '#241e16', emissive: '#e8dcc0' },
      examines: {
        head: 'A vellum hood with an ink-laminate peak. It sheds water, ink and unwanted attention.',
        torso: 'A runner\'s harness with satchel loops, cut for carrying files at a sprint through flooded stacks.',
        hands: 'Ink-stained grips that never smudge a sightline.',
        legs: 'Vellum leggings with laminate knee patches for sliding under shelving.',
        feet: 'Laminate-soled treads that grip wet marble and leave no prints worth reading.',
        back: "A runner's bandolier of satchel tubes, each holding one rolled file at a sprint.",
      },
    },
    warden: {
      name: 'Scrivener',
      palette: { primary: '#e8dcc0', secondary: '#2a2438', emissive: '#b57cff' },
      examines: {
        head: 'A pale vellum cowl with an ink-essence lining. Whatever reaches for your mind finds only margins.',
        torso: 'Scrivener\'s vestments in cross-laid vellum, every seam annotated. Redactors pause before they touch them.',
        hands: 'Writing wraps steeped in ink essence. Your grip is steady enough for copperplate.',
        legs: 'Long pale breeches with an ink-laminate kneeband. They crease properly, always.',
        feet: 'Footwraps over laminate soles. The archive floors stop creaking under you.',
        back: "A pale vellum mantle written over in a fine hand. Redactors stop to read it.",
      },
    },
  },
  {
    level: 25,
    rarity: 'classified',
    experience: 820,
    bulwark: {
      name: 'Furnace',
      palette: { primary: '#4a3028', secondary: '#1a100c', emissive: '#ff7a2a' },
      examine: "A furnace-steel coal hod repurposed as a pack. The ember in the bottom has never gone out.",
    },
    heavy: {
      head: { armor: 13, hazardShielding: 6, cognitiveWard: 2, value: 2100 },
      torso: { armor: 26, hazardShielding: 5, value: 2800 },
      hands: { armor: 8, power: 6, accuracy: 3, value: 1900 },
      legs: { armor: 11, hazardShielding: 3, value: 1800 },
      feet: { armor: 10, hazardShielding: 4, value: 1750 },
    },
    metal: 'furnace-steel',
    cloth: 'vellum-weave',
    reagent: 'cinder-salt',
    skirmisher: {
      name: 'Ashwalker',
      palette: { primary: '#5a5450', secondary: '#1a1614', emissive: '#ffcf4d' },
      examines: {
        head: 'An ash-grey hood with a furnace-steel brim. Sparks slide off it like rain.',
        torso: 'A fire-proofed harness with steel clasps that stay warm for days. Ammunition rides in salted pouches.',
        hands: 'Heat-cured grips rubbed with cinder salt. Hot barrels feel like a handshake.',
        legs: 'Ash-coloured leggings woven to shrug off embers.',
        feet: 'Thick-soled treads for walking on slag that has not finished cooling.',
        back: "A fire-proofed bandolier with salted ammunition pouches that do not cook off.",
      },
    },
    warden: {
      name: 'Kilnkeeper',
      palette: { primary: '#7a2a1a', secondary: '#2a100a', emissive: '#ff7a2a' },
      examines: {
        head: 'A brick-red cowl lined with cinder salt. It keeps the furnace out of your head and only your head.',
        torso: 'Kilnkeeper\'s vestments, heavy and scorched at the hem. The Stoker\'s acolytes wore them to tend the fires.',
        hands: 'Salted wraps that keep your hands cool around the kiln and calm around the things inside it.',
        legs: 'Scorch-proof breeches with a furnace-steel kneeband.',
        feet: 'Wrapped boots on steel soles. Hot floors stay a rumour.',
        back: "A scorched kilnkeeper's mantle, heavy at the hem. The heat stays on the far side of it.",
      },
    },
  },
  {
    level: 30,
    rarity: 'anomalous',
    experience: 1260,
    bulwark: {
      name: 'Threshold',
      palette: { primary: '#d8d8e8', secondary: '#4a3a6a', emissive: '#b57cff' },
      examine: "A mirror-alloy pack shaped like a door frame. Things put in it are sometimes still there.",
    },
    heavy: {
      head: { armor: 15, hazardShielding: 7, cognitiveWard: 6, value: 3600 },
      torso: { armor: 30, hazardShielding: 7, cognitiveWard: 6, value: 4800 },
      hands: { armor: 9, power: 8, accuracy: 8, value: 3200 },
      legs: { armor: 13, hazardShielding: 4, value: 3100 },
      feet: { armor: 12, hazardShielding: 5, value: 3000 },
    },
    metal: 'mirror-alloy',
    cloth: 'hollow-weave',
    reagent: 'knock-splinter',
    skirmisher: {
      name: 'Latchrunner',
      palette: { primary: '#3a3a4a', secondary: '#141420', emissive: '#e8f0ff' },
      examines: {
        head: 'A hollow-weave hood with a mirror-alloy rim. In it you are always a half-step from where they aimed.',
        torso: 'A slate harness with mirror-alloy buckles. It sits closer than it should, as if it remembers you.',
        hands: 'Grips with a knock splinter in each palm. Your shots land before you hear them.',
        legs: 'Leggings of hollow weave, not quite here, which is where you want to be.',
        feet: 'Mirror-shod treads. On the far side your footsteps come back a moment late.',
        back: "A slate bandolier of hollow-weave loops. You never quite run out, and you never quite count.",
      },
    },
    warden: {
      name: 'Keyholder',
      palette: { primary: '#d8d0f0', secondary: '#3a2a5a', emissive: '#b57cff' },
      examines: {
        head: 'A pale cowl set with a sliver of door. Knocks you hear in it are only ever polite.',
        torso: 'Keyholder\'s vestments hung with mirror-alloy keys that fit no lock on this side.',
        hands: 'Wraps with a knock splinter sewn into each palm. Doors open for you a little sooner.',
        legs: 'Lilac breeches with a mirror-alloy kneeband. They reflect a floor that is not there.',
        feet: 'Footwraps over mirror soles. You never quite cross a threshold. You are always already through.',
        back: "A lilac mantle with a keyhole stitched between the shoulders. Nothing knocks from behind.",
      },
    },
  },
  {
    level: 35,
    rarity: 'anomalous',
    experience: 1900,
    bulwark: {
      name: 'Dispatch',
      palette: { primary: '#c9b48a', secondary: '#3a2a14', emissive: '#c9a227' },
      examine: "A seal-alloy mail sack, franked PRIORITY. It is always heavier than what is in it.",
    },
    heavy: {
      head: { armor: 17, hazardShielding: 8, cognitiveWard: 7, value: 5600 },
      torso: { armor: 34, hazardShielding: 8, cognitiveWard: 7, value: 7400 },
      hands: { armor: 10, power: 10, accuracy: 10, value: 5000 },
      legs: { armor: 15, hazardShielding: 5, value: 4800 },
      feet: { armor: 14, hazardShielding: 6, value: 4700 },
    },
    metal: 'seal-alloy',
    cloth: 'letter-weave',
    reagent: 'dead-letter',
    skirmisher: {
      name: 'Courier',
      palette: { primary: '#2a3a5a', secondary: '#121a2a', emissive: '#c9a227' },
      examines: {
        head: 'A navy courier\'s hood with a seal-alloy badge. Nobody stops a courier. Nobody can.',
        torso: 'A dispatch harness with a sealed satchel that is always exactly as full as it needs to be.',
        hands: 'Courier grips lined with a dead letter. Your aim always finds its addressee.',
        legs: 'Navy leggings in letter weave, every seam stamped PRIORITY.',
        feet: 'Long-haul treads with seal-alloy heels. They have walked further than you have.',
        back: "A courier's bandolier of sealed envelopes and spare rounds. Both get delivered.",
      },
    },
    warden: {
      name: 'Sealbearer',
      palette: { primary: '#a8321e', secondary: '#3a0e08', emissive: '#f2e6c8' },
      examines: {
        head: 'A wax-red cowl closed with a franking seal. What is inside stays sealed until it is meant to open.',
        torso: 'Sealbearer\'s vestments, heavy with wax and addresses. The Postmaster\'s own clerks never wore anything so official.',
        hands: 'Wraps folded from dead letters. Everything you touch is returned to sender.',
        legs: 'Red breeches with a seal-alloy kneeband, pressed flat as an envelope.',
        feet: 'Footwraps sealed at the ankle. You arrive exactly on time.',
        back: "A wax-red mantle closed with a seal at the collar. It opens only when it is meant to.",
      },
    },
  },
  {
    level: 40,
    rarity: 'anomalous',
    experience: 2100,
    bulwark: {
      name: 'Saltworks',
      palette: { primary: '#e8e2d4', secondary: '#5a4a3a', emissive: '#ff9a6a' },
      examine: "A brine-steel miner's pack with a lamp on a hook. It has been down every gallery at least twice.",
    },
    heavy: {
      head: { armor: 19, hazardShielding: 9, cognitiveWard: 8, value: 6700 },
      torso: { armor: 38, hazardShielding: 9, cognitiveWard: 8, value: 8900 },
      hands: { armor: 11, power: 11, accuracy: 11, value: 6000 },
      legs: { armor: 17, hazardShielding: 6, value: 5800 },
      feet: { armor: 16, hazardShielding: 7, value: 5600 },
    },
    metal: 'brine-steel',
    cloth: 'salt-weave',
    reagent: 'lamp-glass',
    skirmisher: {
      name: 'Seamrunner',
      palette: { primary: '#8a7a5a', secondary: '#2a2418', emissive: '#ffe8a8' },
      examines: {
        head: 'A salt-crusted hood with a lamp-glass loupe on a hinge. The seams glow in it, and so do the things in them.',
        torso: 'A miner\'s harness of salt weave, brine-steel rings at every strap. It never rusts, it only whitens.',
        hands: 'Lamp-glass knuckled grips that hold steady on a wet seam.',
        legs: 'Canvas leggings stiff with salt. They crackle, then they don\'t.',
        feet: 'Brine-steel treads with salt-cleats for the galleries.',
        back: "A salt-stiff bandolier with a coil of line and a lamp-glass flare.",
      },
    },
    warden: {
      name: 'Lampwarden',
      palette: { primary: '#f0e8d8', secondary: '#4a4030', emissive: '#ffcf4d' },
      examines: {
        head: 'A white cowl with a lamp-glass circlet. The miners followed the lampwardens down and the lampwardens followed the light.',
        torso: 'Salt-white vestments, a lamp-glass bead at every knot. They are bright enough to keep a mind from wandering.',
        hands: 'Wraps with lamp-glass thimbles. Your hands are never quite in the dark.',
        legs: 'Pale breeches with a brine-steel kneeband, salt-dusted at the hem.',
        feet: 'Salt-soled footwraps. You leave a faint white trail to find your way back.',
        back: "A salt-white mantle beaded with lamp glass. It keeps a steady light behind you.",
      },
    },
  },
  {
    level: 45,
    rarity: 'anomalous',
    experience: 2400,
    bulwark: {
      name: 'Cathedral',
      palette: { primary: '#f4efe6', secondary: '#3a2a4a', emissive: '#ffd27f' },
      examine: "A halite-glass reliquary carried like a pack. It hums one low note through your spine.",
    },
    heavy: {
      head: { armor: 21, hazardShielding: 10, cognitiveWard: 9, value: 8000 },
      torso: { armor: 42, hazardShielding: 10, cognitiveWard: 9, value: 10600 },
      hands: { armor: 12, power: 12, accuracy: 12, value: 7200 },
      legs: { armor: 19, hazardShielding: 7, value: 7000 },
      feet: { armor: 18, hazardShielding: 8, value: 6700 },
    },
    metal: 'halite-glass',
    cloth: 'vestment-weave',
    reagent: 'halite-geode',
    skirmisher: {
      name: 'Pilgrim',
      palette: { primary: '#6a4a5a', secondary: '#24161e', emissive: '#f0c8e0' },
      examines: {
        head: 'A dusty pilgrim\'s hood with a halite-glass clasp. It has come a long way to find you.',
        torso: 'A pilgrim\'s harness of vestment weave, halite beads for counting shots instead of prayers.',
        hands: 'Grips with a chip of geode in each palm. Your aim feels blessed, and possibly is.',
        legs: 'Travel-worn leggings, mended many times with vestment thread.',
        feet: 'Pilgrim treads soled in halite glass. They have walked the cathedral nave both ways.',
        back: "A pilgrim's bandolier of halite beads and rounds, counted twice and blessed once.",
      },
    },
    warden: {
      name: 'Chorister',
      palette: { primary: '#f8f0f8', secondary: '#5a3a5a', emissive: '#c8a8ff' },
      examines: {
        head: 'A white chorister\'s cowl with a halite halo stitched into the hem. It keeps one note in your head and every other out.',
        torso: 'Choir vestments in halite-threaded weave. They hum in tune with the nave and drown out what is under it.',
        hands: 'Wraps set with geode chips. They fold your hands, gently, when a hymn is needed.',
        legs: 'Long white breeches with a glass kneeband for kneeling at the rail.',
        feet: 'Soft footwraps on halite soles. Your steps echo a beat late, in harmony.',
        back: "A white chorister's mantle with a halite halo stitched at the collar.",
      },
    },
  },
  {
    level: 50,
    rarity: 'anomalous',
    experience: 3300,
    bulwark: {
      name: 'Ward',
      palette: { primary: '#e8e0c8', secondary: '#3a5a52', emissive: '#6ad8b8' },
      examine: "A ward-steel field kit with a red-cross latch. Everything in it is sterile, including the bad news.",
    },
    heavy: {
      head: { armor: 23, hazardShielding: 11, cognitiveWard: 10, value: 9600 },
      torso: { armor: 46, hazardShielding: 11, cognitiveWard: 10, value: 12700 },
      hands: { armor: 13, power: 13, accuracy: 13, value: 8600 },
      legs: { armor: 21, hazardShielding: 8, value: 8400 },
      feet: { armor: 20, hazardShielding: 9, value: 8000 },
    },
    metal: 'ward-steel',
    cloth: 'sterile-weave',
    reagent: 'physic-herb',
    skirmisher: {
      name: 'Orderly',
      palette: { primary: '#5a8a8a', secondary: '#1a2a2a', emissive: '#d8fff8' },
      examines: {
        head: 'A scrub-green orderly\'s hood with a ward-steel clip. Night shift, every shift.',
        torso: 'A sterile harness with ward-steel buckles and pockets for everything, sharp things in the top row.',
        hands: 'Close-fitting grips dusted with physic herb. They do not slip on anything, however wet.',
        legs: 'Scrub leggings with reinforced knees for crawling under gurneys.',
        feet: 'Squeak-free treads. The patients never hear you coming, which is kinder.',
        back: "An orderly's bandolier of syringes and spare magazines, sharp things on the outside.",
      },
    },
    warden: {
      name: 'Almoner',
      palette: { primary: '#e8f0f0', secondary: '#2a4a5a', emissive: '#7af0d8' },
      examines: {
        head: 'A starched almoner\'s cowl with a herb sachet in the lining. It smells like a clean ward and keeps the bad dreams out.',
        torso: 'Almoner\'s vestments, starched to stand on their own. They have sat with every patient on the ward.',
        hands: 'Sterile wraps scented with physic herb. Your touch steadies others, and you.',
        legs: 'Pressed breeches with a ward-steel kneeband.',
        feet: 'Quiet footwraps on ward-steel soles. The linoleum forgives you.',
        back: "A starched almoner's mantle. It smells of a clean ward and sits on your shoulders like a kind hand.",
      },
    },
  },
  {
    level: 55,
    rarity: 'anomalous',
    experience: 3700,
    bulwark: {
      name: 'Physician',
      palette: { primary: '#f4f4ee', secondary: '#2a1f2a', emissive: '#c88ad8' },
      examine: "A tonic-glass medical case worn as a pack. It has a diagnosis for anything that comes up behind you.",
    },
    heavy: {
      head: { armor: 25, hazardShielding: 12, cognitiveWard: 11, value: 11500 },
      torso: { armor: 50, hazardShielding: 12, cognitiveWard: 11, value: 15200 },
      hands: { armor: 14, power: 14, accuracy: 14, value: 10300 },
      legs: { armor: 23, hazardShielding: 9, value: 10000 },
      feet: { armor: 22, hazardShielding: 10, value: 9600 },
    },
    metal: 'tonic-glass',
    cloth: 'prescription-weave',
    reagent: 'vesper-tincture',
    skirmisher: {
      name: 'Locum',
      palette: { primary: '#4a3a6a', secondary: '#181424', emissive: '#ff9ad8' },
      examines: {
        head: 'A violet locum\'s hood with a tonic-glass lens. Covering every shift, for whoever did not come back.',
        torso: 'A prescription harness, vials racked in tonic-glass sleeves. Every pocket is a second opinion.',
        hands: 'Grips steeped in tincture. Your hands stop shaking exactly when they need to.',
        legs: 'Violet leggings, close-cut for running the long corridors.',
        feet: 'Tonic-glass treads. They arrive at the bedside before the alarm stops.',
        back: "A locum's bandolier of tincture vials and cartridges, each labelled in someone else's writing.",
      },
    },
    warden: {
      name: 'Apothecary',
      palette: { primary: '#2a4a3a', secondary: '#0e1a14', emissive: '#c8ff9a' },
      examines: {
        head: 'A bottle-green apothecary\'s cowl, its lining tinctured against every kind of fever, including the other kind.',
        torso: 'Apothecary\'s vestments with a hundred labelled pockets. Every label is in your handwriting, and correct.',
        hands: 'Tincture-soaked wraps. Whatever you measure out is exactly the right dose.',
        legs: 'Dark green breeches with a tonic-glass kneeband.',
        feet: 'Felted footwraps on glass soles. They keep the dispensary floor clean and quiet.',
        back: "A bottle-green apothecary's mantle with a hundred little pockets, every one labelled and correct.",
      },
    },
  },
];

const LINES: readonly LineMotif[] = ['skirmisher', 'warden'];

export const ARMOUR_LINE_ITEMS: readonly ItemDefinition[] = ARMOUR_TIERS.flatMap((tier) => [bulwarkPack(tier), ...LINES.flatMap((motif) => lineItems(tier, motif))]);

export const ARMOUR_LINE_RECIPES: readonly RecipeDefinition[] = ARMOUR_TIERS.flatMap((tier) => [
  recipeFor(tier, 'bulwark', 'back', bulwarkPackId(tier)),
  ...LINES.flatMap((motif) => lineRecipes(tier, motif)),
]);
