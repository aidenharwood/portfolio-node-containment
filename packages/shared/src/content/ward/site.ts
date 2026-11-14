import type { SkillId } from '../../character/skills.ts';
import type { CreatureDefinition } from '../../combat/creatures.ts';
import type { RecipeDefinition } from '../../crafting/recipes.ts';
import type { DialogueDefinition } from '../../dialogue/dialogue.ts';
import type { ItemDefinition } from '../../gear/items.ts';
import type { QuestDefinition } from '../../quests/questDefinition.ts';
import type { Condition } from '../../rules/conditions.ts';
import type { GameEffect } from '../../rules/effects.ts';
import type { WorldObjectDefinition } from '../../world/entities.ts';
import { gear } from '../gearItem.ts';
import { beast, questObject, questTalk } from './novice.ts';

export const SITE_ITEMS: readonly ItemDefinition[] = [
  { id: 'steel-ledger', name: "Quill's Ledger", examine: 'Delivery ledgers from the year the Site was built. Ten times more steel came in than the Site has above ground.', category: 'quest', rarity: 'issued', icon: 'datapad', iconColors: ['#8a6a42', '#d8d0b8'], maxStack: 1, value: 0 },
  { id: 'dead-band-receiver', name: 'Dead-band Receiver', examine: "Sefa's design, your hands. It hisses until you point it at the Site, then it breathes.", category: 'quest', rarity: 'issued', icon: 'scanner', iconColors: ['#3a3f44', '#4fe3ff'], maxStack: 1, value: 0 },
  gear({ id: 'moth-wing-cloak', name: 'Moth-wing Cloak', examine: 'A short cloak of moth-lantern wing. It glows when you are frightened.', rarity: 'classified', icon: 'cape', slot: 'back', stats: { cognitiveWard: 8, focus: 3, insight: 2 }, requires: { psionics: 10 }, visual: { primary: '#8a7a5a', secondary: '#4a3a2a', emissive: '#ffd08a', motif: 'warden' }, value: 500, unique: true }),
  gear({ id: 'glass-eye', name: 'Glass Eye', examine: "A glass hound's eye on a strap. You see a little further through it, and a little wrong.", rarity: 'classified', icon: 'visor', slot: 'eyes', stats: { accuracy: 6, insight: 3 }, requires: { marksmanship: 20 }, visual: { primary: '#9fd6e6', secondary: '#3a4a52', emissive: '#e8a21c' }, value: 700, unique: true }),
  gear({ id: 'knocker-fist', name: "Knocker's Fist", examine: 'One claw of a hull knocker, hollowed and worn as a gauntlet. It wants to knock.', rarity: 'classified', icon: 'gloves', slot: 'hands', stats: { armor: 10, power: 6 }, requires: { fortitude: 25 }, visual: { primary: '#3a4a52', secondary: '#8a4a2a', motif: 'bulwark' }, value: 900, unique: true }),
  gear({ id: 'wraith-shroud', name: 'Wraith Shroud', examine: 'Wet weed that never dries, cut from a tide wraith. Things look past you in it.', rarity: 'anomalous', icon: 'cape', slot: 'back', stats: { deflection: 12, cognitiveWard: 8, accuracy: 4 }, requires: { marksmanship: 30 }, visual: { primary: '#2a4a3a', secondary: '#14241c', emissive: '#c79bff', motif: 'skirmisher' }, value: 1200, unique: true }),
];

export const SITE_RECIPES: readonly RecipeDefinition[] = [
  { id: 'fabricator:dead-band-receiver', station: 'fabricator', skill: 'engineering', level: 15, inputs: [{ itemId: 'iron-bar', count: 2 }, { itemId: 'culvert-trace', count: 2 }], output: { itemId: 'dead-band-receiver', count: 1 }, experience: 160, ticks: 6 },
];

export const SITE_CREATURES: readonly CreatureDefinition[] = [
  beast({
    id: 'moth-lantern',
    name: 'Moth-lantern',
    designation: 'SM-104',
    examine: 'A moth the size of a dinner plate with a lantern for a body. Amber class: it only bites if you stand in its light.',
    model: 'mothLantern',
    level: 12,
    wander: 2,
    style: 'psionic',
    range: 3,
    loot: [{ itemId: 'amber-trace', count: 1, chance: 0.4 }, { itemId: 'lab-culture', count: 1, chance: 0.3 }, { itemId: 'moth-wing-cloak', count: 1, chance: 0.01 }],
    containment: { containmentClass: 'safe', procedures: 'Dim the lights. Subdue. Contain in an opaque cell. It sulks.', experience: 140, loot: [{ itemId: 'amber-trace', count: 2, chance: 1 }] },
  }),
  beast({
    id: 'glass-hound',
    name: 'Glass Hound',
    designation: 'SM-117',
    examine: 'A dog made of glass with an amber light where its heart should be. It is loyal to whoever fed it last, which was not you.',
    model: 'glassHound',
    level: 22,
    aggressive: true,
    wander: 2,
    loot: [{ itemId: 'amber-trace', count: 1, chance: 0.5 }, { itemId: 'steel-bar', count: 1, chance: 0.15 }, { itemId: 'glass-eye', count: 1, chance: 0.01 }],
    containment: { containmentClass: 'euclid', procedures: 'Wear it down without breaking it. A cracked hound cannot be contained. Contain in a padded cell.', experience: 320, loot: [{ itemId: 'amber-trace', count: 3, chance: 1 }], requiredLevel: 15 },
  }),
  beast({
    id: 'hull-knocker',
    name: 'Hull Knocker',
    examine: 'A thing like a crab the size of a car, plated in ship iron. It knocks on the hull at night, and the hull knocks back.',
    model: 'hullKnocker',
    level: 28,
    aggressive: true,
    loot: [{ itemId: 'hull-plate', count: 1, chance: 0.5 }, { itemId: 'heavy-scrap', count: 2, chance: 0.4 }, { itemId: 'alloy-bar', count: 1, chance: 0.08 }, { itemId: 'knocker-fist', count: 1, chance: 0.01 }],
  }),
  beast({
    id: 'tide-wraith',
    name: 'Tide Wraith',
    designation: 'LW-048',
    examine: 'Weed and water standing up in the shape of someone. It drifts in from the shallows and smells of the Cordon.',
    model: 'tideWraith',
    level: 34,
    aggressive: true,
    wander: 2,
    style: 'psionic',
    range: 4,
    loot: [{ itemId: 'tide-weed', count: 2, chance: 0.6 }, { itemId: 'hull-trace', count: 1, chance: 0.4 }, { itemId: 'wraith-shroud', count: 1, chance: 0.01 }],
    containment: { containmentClass: 'euclid', procedures: 'Draw it away from water. Subdue while it is dry. Contain in a sealed, drained cell.', experience: 480, loot: [{ itemId: 'hull-trace', count: 3, chance: 1 }], requiredLevel: 25 },
  }),
];

const active = (questId: string, stepId?: string): Condition => ({ type: 'questActive', questId, ...(stepId ? { stepId } : {}) });

const reading = (id: string, where: string): WorldObjectDefinition =>
  questObject(
    id,
    'Survey Stake',
    `A Directorate survey stake in ${where}, painted orange, with a clamp just the size of a receiver.`,
    'bollard',
    'Take a reading',
    [{ type: 'hasItem', itemId: 'dead-band-receiver' }, active('dead-band', 'readings')],
    'You need a dead-band receiver clamped to it, and a reason to.',
    [{ type: 'grantExperience', skill: 'research', amount: 120 }, { type: 'notify', text: `The receiver breathes. The needle points down, towards the Site.` }],
  );

export const SITE_OBJECTS: readonly WorldObjectDefinition[] = [reading('reading-cut', 'the Cut'), reading('reading-yard', 'the Scrapyards'), reading('reading-fringe', 'the Shipyard Fringe')];

const xp = (skill: SkillId, amount: number): GameEffect => ({ type: 'grantExperience', skill, amount });
const scrip = (count: number): GameEffect => ({ type: 'giveItem', itemId: 'meridian-scrip', count });

export const SITE_QUESTS: readonly QuestDefinition[] = [
  {
    id: 'steel-below',
    name: 'The Steel Below',
    category: 'main',
    summary: "Tam Reilly unloaded far more steel for Site Meridian than you can see above ground. Fennick's notes point down. Where did it go?",
    offeredBy: 'tam-reilly',
    offerRequires: ['rent-day'],
    recommendedLevel: 8,
    steps: [
      { id: 'quill', journal: "Ask Harbourmaster Quill at the Canal Basin harbour office for the delivery ledgers from the year the Site was built.", objectives: [{ type: 'talkTo', npcId: 'harbourmaster-quill', label: 'Ask Quill for the ledgers' }], onComplete: [{ type: 'giveItem', itemId: 'steel-ledger' }] },
      { id: 'ferris', journal: "Show the ledger to Clerk Ferris in the intake hall on the Site's island.", objectives: [{ type: 'signal', signal: 'steel.ferris', npcId: 'clerk-ferris', label: 'Show Ferris the ledger' }], onComplete: [{ type: 'setFlag', flag: 'clearance-b1' }] },
      { id: 'brandt', journal: 'Take the headhouse lift down to B1 and report to Officer Brandt.', objectives: [{ type: 'talkTo', npcId: 'officer-brandt', label: 'Report to Officer Brandt on B1' }] },
    ],
    rewards: [xp('research', 800), scrip(200)],
    rewardSummary: ['1 Quest Point', '800 Research XP', '200 Scrip', 'B1 clearance: the headhouse lift runs for you'],
  },
  {
    id: 'dead-band',
    name: 'Dead Band',
    category: 'main',
    summary: 'Sefa Lind hears the Site breathing on the dead band. Build a receiver and find out where the breathing comes from.',
    offeredBy: 'sefa-lind',
    offerRequires: ['steel-below'],
    recommendedLevel: 18,
    steps: [
      { id: 'receiver', journal: 'Make a dead-band receiver at a fabricator: two iron bars and two culvert traces, Engineering 15.', objectives: [{ type: 'craft', itemId: 'dead-band-receiver', count: 1, label: 'Make a dead-band receiver' }] },
      {
        id: 'readings',
        journal: 'Take readings at the Directorate survey stakes on the Cut, in the Scrapyards and on the Shipyard Fringe.',
        objectives: [
          { type: 'interactWith', objectId: 'reading-cut', label: 'Take a reading on the Cut' },
          { type: 'interactWith', objectId: 'reading-yard', label: 'Take a reading in the Scrapyards' },
          { type: 'interactWith', objectId: 'reading-fringe', label: 'Take a reading on the Fringe' },
        ],
      },
      { id: 'report', journal: 'Take the readings back to Sefa Lind at The Signal.', objectives: [{ type: 'signal', signal: 'band.reported', npcId: 'sefa-lind', label: 'Report to Sefa' }] },
    ],
    rewards: [xp('research', 1200), xp('engineering', 600), scrip(300)],
    rewardSummary: ['1 Quest Point', '1200 Research XP', '600 Engineering XP', '300 Scrip'],
  },
];

export const SITE_DIALOGUES: readonly DialogueDefinition[] = [
  questTalk({
    npc: 'tam-reilly',
    questId: 'steel-below',
    offer: {
      text: "Fennick's notes, is it? I knew him. He used to sit on this bench and count. Here's something for your notes, then: I unloaded the steel for that Site myself, forty years back. Ten ships of it. Look over the canal and tell me where ten ships of steel went. Quill keeps the old ledgers. Ask him.",
      accept: "I'll ask Quill.",
      requires: ['rent-day'],
    },
    waiting: 'Quill, at the harbour office. He never threw a ledger away in his life.',
    done: "Under it. That's where it went. I always knew, I think. Some things you don't say out loud near the water.",
    chat: 'I watched them build that Site. Unloaded the steel myself.',
  }),
  questTalk({
    npc: 'harbourmaster-quill',
    questId: 'steel-below',
    report: { stepId: 'quill', text: "The construction year? Tam sent you. Here. Ten ships of structural steel, signed for by the Directorate. And look at the Site. Five ships would be generous. Take it to Clerk Ferris. Watch her face." },
    waiting: '',
    done: 'I still log the tides. Someone should.',
    chat: 'Nothing sails out of this basin any more. I still log the tides.',
  }),
  questTalk({
    npc: 'clerk-ferris',
    questId: 'steel-below',
    hand: {
      stepId: 'ferris',
      text: 'You again. Is that a harbour ledger?',
      option: "Show Ferris Quill's ledger.",
      items: ['steel-ledger'],
      signal: 'steel.ferris',
      thanks: "Where did you get this? No, don't tell me. I'll take it. This conversation did not happen, and you now have B1 clearance, because Officer Brandt can explain better than I can, and I would like you to stop asking me. The headhouse lift will take you down.",
    },
    waiting: '',
    done: 'Intake. Name, number. You I already have.',
    chat: "Intake. Name, number, any anomalous exposure in the last thirty days? Don't answer that last one out loud. Write it down.",
  }),
  questTalk({
    npc: 'officer-brandt',
    questId: 'steel-below',
    report: { stepId: 'brandt', text: "Ferris sent you down with a ledger and a face. Sit. Yes, the steel. The Site above ground is the lid. B1 is the rim. B2 holds what came up before we closed it, and below that is the Vault, which was dug before any of us were born. That is all I can say on B1. The rest you will have to earn, operative." },
    waiting: '',
    done: 'Welcome to B1. Processing, labs, observation ward, amber holding. Keep to the timetable.',
    chat: 'Welcome to B1. Your locker is by the west wall. The lower lift goes to the Secure Wing, for those cleared for it.',
  }),
  questTalk({
    npc: 'sefa-lind',
    questId: 'dead-band',
    offer: {
      text: "You've been down. I can tell, you've got that B1 look. Listen. On the dead band the Site breathes, in and out, like it's asleep. I've a receiver design but my hands shake. Build it, take readings from three stakes round the Ward, and we'll know where the breathing comes from.",
      accept: "I'll build the receiver.",
      requires: ['steel-below'],
      conditions: [{ type: 'skillLevel', skill: 'engineering', atLeast: 15 }],
      notReady: "You've the look of someone who'd help, but the receiver needs steady hands. Come back when you've Engineering 15.",
    },
    waiting: "Two iron bars, two culvert traces, a fabricator. Then the stakes: the Cut, the Scrapyards, the Fringe.",
    hand: {
      stepId: 'report',
      text: 'Well? Show me the needle.',
      option: 'Show Sefa the readings.',
      items: [],
      signal: 'band.reported',
      thanks: "Three bearings and they cross under the island. Not under the Site. Under what the Site is sitting on. It isn't breathing in its sleep. It's breathing through something. Here, you've earned this, and you'll need it if you go any deeper.",
    },
    done: "I've stopped listening to the dead band at night. I still hear it.",
    chat: "Tune a set to the dead band at night and you'll hear the Site breathing.",
    chatOptions: [{ text: 'Show me what you have.', effects: [{ type: 'openShop', shopId: 'lind-signal' }], next: null }],
  }),
];
