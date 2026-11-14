import type { SkillId } from '../../character/skills.ts';
import type { CreatureDefinition } from '../../combat/creatures.ts';
import type { RecipeDefinition } from '../../crafting/recipes.ts';
import type { DialogueDefinition } from '../../dialogue/dialogue.ts';
import type { ItemDefinition, ItemIconShape } from '../../gear/items.ts';
import type { QuestDefinition } from '../../quests/questDefinition.ts';
import type { Condition } from '../../rules/conditions.ts';
import type { GameEffect } from '../../rules/effects.ts';
import type { WorldObjectDefinition } from '../../world/entities.ts';
import { gear } from '../gearItem.ts';
import { beast, questObject, questTalk } from './novice.ts';

const questItem = (id: string, name: string, examine: string, icon: ItemIconShape, colors: readonly [string, string]): ItemDefinition => ({
  id,
  name,
  examine,
  category: 'quest',
  rarity: 'classified',
  icon,
  iconColors: colors,
  maxStack: 1,
  value: 0,
});

export const DEPTHS_ITEMS: readonly ItemDefinition[] = [
  questItem('vault-survey', 'Vault Survey', 'A survey of the Vault dated eleven years before the Site was built. Someone has written CAP IT across the top.', 'datapad', ['#d8d6cc', '#d8322a']),
  questItem('glowing-eel', 'Glowing Eel', 'A basin eel that glows a soft violet from the inside. It is very calm about it.', 'gel', ['#2a3a3a', '#c79bff']),
  questItem('pump-impeller', 'Pump Impeller', "A steel impeller to Kofi's drawing. Heavier than it looks.", 'coil', ['#8a9098', '#4a5058']),
  gear({ id: 'twin-mask', name: 'Twin Mask', examine: "Half of a red twin's face, worn as a visor. The other half is still looking for it.", rarity: 'anomalous', icon: 'visor', slot: 'eyes', stats: { cognitiveWard: 10, focus: 6, insight: 4 }, requires: { psionics: 35 }, visual: { primary: '#d8d6cc', secondary: '#3a0a08', emissive: '#d8322a' }, value: 2000, unique: true }),
  gear({ id: 'breaker-plate', name: 'Breaker Plate', examine: 'The shoulder plate of a cell-breaker, cut to fit a person. It has broken out of three cells.', rarity: 'anomalous', icon: 'plate', slot: 'torso', stats: { armor: 40, deflection: 16, hazardShielding: 4, power: 3 }, requires: { fortitude: 40 }, visual: { primary: '#3a2a2a', secondary: '#e86a1c', motif: 'bulwark' }, value: 2600, unique: true }),
  gear({ id: 'stalker-treads', name: 'Stalker Treads', examine: "Boots resoled with Cordon stalker hide. You don't make a sound in them, and neither does anything behind you.", rarity: 'anomalous', icon: 'boots', slot: 'feet', stats: { deflection: 14, armor: 6, accuracy: 5 }, requires: { marksmanship: 40 }, visual: { primary: '#2a2a30', secondary: '#d8322a', motif: 'skirmisher' }, value: 2400, unique: true }),
  gear({ id: 'echo-band', name: 'Echo Band', examine: 'A band of vault glass that repeats whatever you think, slightly later.', rarity: 'anomalous', icon: 'implant', slot: 'implant', stats: { focus: 12, cognitiveWard: 8, insight: 4 }, requires: { psionics: 45 }, visual: { primary: '#1a2a3a', secondary: '#7fd8ff' }, value: 3200, unique: true }),
  gear({ id: 'wardens-key', name: "Warden's Key", examine: 'The key the Warden held the shaft shut with. It is warm, and it is turning on its own, very slowly.', rarity: 'anomalous', icon: 'badge', slot: 'utility', stats: { cognitiveWard: 12, insight: 8, armor: 6 }, requires: { containment: 50 }, visual: { primary: '#1a2a3a', secondary: '#d8322a', emissive: '#7fd8ff' }, value: 6000, unique: true }),
];

export const DEPTHS_RECIPES: readonly RecipeDefinition[] = [
  { id: 'fabricator:pump-impeller', station: 'fabricator', skill: 'engineering', level: 25, inputs: [{ itemId: 'steel-bar', count: 2 }], output: { itemId: 'pump-impeller', count: 1 }, experience: 220, ticks: 6 },
];

export const DEPTHS_CREATURES: readonly CreatureDefinition[] = [
  beast({
    id: 'red-twin',
    name: 'Red Twin',
    designation: 'SM-209',
    examine: 'Two pale figures who move as one and finish each other\'s attacks. Red class. The cells were built for one of them.',
    model: 'redTwin',
    level: 38,
    aggressive: true,
    wander: 2,
    style: 'psionic',
    range: 4,
    loot: [{ itemId: 'red-trace', count: 1, chance: 0.5 }, { itemId: 'directorate-salvage', count: 1, chance: 0.3 }, { itemId: 'twin-mask', count: 1, chance: 0.01 }],
    containment: { containmentClass: 'keter', procedures: 'Separate them. Subdue the quiet one first. Contain both in adjoining cells and never open either alone.', experience: 900, loot: [{ itemId: 'red-trace', count: 3, chance: 1 }], requiredLevel: 35 },
  }),
  beast({
    id: 'cell-breaker',
    name: 'Cell-breaker',
    examine: 'Built like a door with shoulders. It got out of its cell the way it gets through everything.',
    model: 'cellBreaker',
    level: 44,
    aggressive: true,
    wander: 2,
    loot: [{ itemId: 'directorate-salvage', count: 2, chance: 0.6 }, { itemId: 'ceramite-ingot', count: 1, chance: 0.1 }, { itemId: 'breaker-plate', count: 1, chance: 0.01 }],
  }),
  beast({
    id: 'cordon-stalker',
    name: 'Cordon Stalker',
    examine: 'Tall and patient, on legs like scaffold poles. It came through the Cordon wall. Nobody knows how.',
    model: 'cordonStalker',
    level: 44,
    aggressive: true,
    loot: [{ itemId: 'red-trace', count: 1, chance: 0.4 }, { itemId: 'directorate-salvage', count: 1, chance: 0.3 }, { itemId: 'stalker-treads', count: 1, chance: 0.01 }],
  }),
  beast({
    id: 'vault-echo',
    name: 'Vault Echo',
    examine: 'Something that was a person once, and is now the memory of one, standing where they stood.',
    model: 'vaultEcho',
    level: 52,
    aggressive: true,
    wander: 2,
    style: 'psionic',
    range: 4,
    loot: [{ itemId: 'vault-residue', count: 1, chance: 0.5 }, { itemId: 'vault-trace', count: 1, chance: 0.3 }, { itemId: 'echo-band', count: 1, chance: 0.01 }],
  }),
  beast({
    id: 'the-warden',
    name: 'The Warden',
    designation: 'SM-001',
    examine: 'Huge, patient and plated in dark glass, with a key held in one fist. It has been holding the shaft shut from the inside since before the Site was built.',
    model: 'warden',
    level: 54,
    integrity: 420,
    aggressive: true,
    wander: 2,
    style: 'psionic',
    range: 5,
    loot: [{ itemId: 'vault-residue', count: 4, chance: 1 }, { itemId: 'vault-trace', count: 3, chance: 1 }, { itemId: 'wardens-key', count: 1, chance: 0.05 }],
    containment: { containmentClass: 'keter', procedures: 'Do not. If you must: wear it down to the last plate, then contain it in the Heart itself. Nothing else will hold it.', experience: 4000, loot: [{ itemId: 'vault-trace', count: 6, chance: 1 }], requiredLevel: 50 },
  }),
];

const active = (questId: string, stepId?: string): Condition => ({ type: 'questActive', questId, ...(stepId ? { stepId } : {}) });

export const DEPTHS_OBJECTS: readonly WorldObjectDefinition[] = [
  questObject('b2-records', 'Records Cabinet', 'A Directorate records cabinet, half buried in the barricade. The bottom drawer is labelled VAULT, PRE-CONSTRUCTION.', 'shelving', 'Search', [active('bill-of-lading', 'records')], 'Locked, and you have no reason to break it.', [{ type: 'giveItem', itemId: 'vault-survey' }, { type: 'grantExperience', skill: 'research', amount: 400 }]),
  questObject('sealed-hatch', 'Sealed Hatch', 'A round hatch in the floor of the Heart, sealed from this side. Something on the other side has been pushing.', 'hatch', 'Examine the seals', [active('the-heart', 'hatch')], 'Not while the Warden still stands over it.', [{ type: 'grantExperience', skill: 'research', amount: 1000 }, { type: 'notify', text: 'The seals are Directorate work, newer than the hatch. Below it, a long way down, something knocks.' }], false),
  questObject('glow-spot', 'Glowing Water', 'A patch of the basin glowing soft violet. Something long is curled at the bottom.', 'dredgeWinch', 'Dredge', [active('what-glows', 'eel')], 'Just water, glowing. You have no reason to fish in it.', [{ type: 'giveItem', itemId: 'glowing-eel' }, { type: 'grantExperience', skill: 'biochemistry', amount: 200 }]),
  questObject('specimen-tank', 'Specimen Tank', 'A lab tank of clear fluid, waiting for something interesting.', 'synthesiser', 'Place specimen', [{ type: 'hasItem', itemId: 'glowing-eel' }, active('what-glows', 'lab')], 'You have nothing worth putting in it.', [{ type: 'takeItem', itemId: 'glowing-eel' }, { type: 'grantExperience', skill: 'research', amount: 300 }]),
  questObject('pump-engine', 'Main Pump', "The Cut's main pump. Its impeller is in pieces, and the water is rising.", 'fabricator', 'Fit impeller', [{ type: 'hasItem', itemId: 'pump-impeller' }, active('bottom-up', 'fit')], 'It needs a new impeller, and Kofi to say how.', [{ type: 'takeItem', itemId: 'pump-impeller' }, { type: 'grantExperience', skill: 'engineering', amount: 300 }]),
  questObject('hull-breach', 'Hull Breach', 'A hole in the beached hull, made from the inside. It is dark in there, and something is knocking.', 'hatch', 'Knock', [active('knock-back', 'knock')], 'You have no reason to knock. Probably best.', [{ type: 'notify', text: 'You knock. Everything in the Fringe knocks back.' }], false),
];

const xp = (skill: SkillId, amount: number): GameEffect => ({ type: 'grantExperience', skill, amount });
const scrip = (count: number): GameEffect => ({ type: 'giveItem', itemId: 'meridian-scrip', count });

export const DEPTHS_QUESTS: readonly QuestDefinition[] = [
  {
    id: 'bill-of-lading',
    name: 'Bill of Lading',
    category: 'main',
    summary: 'Brandt can get you into the Secure Wing, unofficially. The records of what the Site was built to hold are down there.',
    offeredBy: 'officer-brandt',
    offerRequires: ['dead-band'],
    recommendedLevel: 35,
    steps: [
      { id: 'brief', journal: 'Talk to Officer Brandt on B1 about the Secure Wing.', objectives: [{ type: 'talkTo', npcId: 'officer-brandt', label: 'Talk to Officer Brandt' }], onComplete: [{ type: 'setFlag', flag: 'clearance-b2' }] },
      { id: 'records', journal: 'Take the lower lift to B2 and search the records cabinet in the observation lab.', objectives: [{ type: 'obtainItem', itemId: 'vault-survey', count: 1, label: 'Find the Vault survey' }] },
      { id: 'return', journal: 'Take the survey back to Officer Brandt.', objectives: [{ type: 'signal', signal: 'lading.returned', npcId: 'officer-brandt', label: 'Give Brandt the survey' }] },
    ],
    rewards: [xp('research', 3000), xp('containment', 1500), scrip(800)],
    rewardSummary: ['1 Quest Point', '3000 Research XP', '1500 Containment XP', '800 Scrip', 'B2 clearance'],
  },
  {
    id: 'the-heart',
    name: 'The Heart',
    category: 'main',
    summary: 'Dr Hale knows what the Site was built to cap, and she thinks it is time someone looked.',
    offeredBy: 'imogen-hale',
    offerRequires: ['bill-of-lading'],
    recommendedLevel: 50,
    questPoints: 3,
    steps: [
      { id: 'hale', journal: 'Talk to Dr Hale in Holding Block A.', objectives: [{ type: 'talkTo', npcId: 'imogen-hale', label: 'Talk to Dr Hale' }], onComplete: [{ type: 'setFlag', flag: 'clearance-b3' }] },
      { id: 'descend', journal: 'Take the Vault lift down from B2.', objectives: [{ type: 'enterArea', districtId: 'meridian-vault', areaId: 'landing', label: 'Reach the Vault' }] },
      { id: 'warden', journal: 'Find the Warden in the Heart of the Vault and bring it down.', objectives: [{ type: 'defeat', creatureId: 'the-warden', count: 1, label: 'Defeat the Warden' }] },
      { id: 'hatch', journal: 'Examine what the Warden was guarding.', objectives: [{ type: 'interactWith', objectId: 'sealed-hatch', label: 'Examine the sealed hatch' }] },
      { id: 'mercer', journal: 'Lieutenant Mercer at the Cordon post has orders for you.', objectives: [{ type: 'talkTo', npcId: 'lieutenant-mercer', label: 'Report to Lieutenant Mercer' }] },
    ],
    rewards: [xp('containment', 6000), xp('research', 4000), scrip(3000), { type: 'setFlag', flag: 'cordon-orders' }],
    rewardSummary: ['3 Quest Points', '6000 Containment XP', '4000 Research XP', '3000 Scrip', 'Orders to open the Cordon gate'],
  },
  {
    id: 'what-glows',
    name: 'What Glows',
    category: 'side',
    summary: "Hetty Graves has seen something glowing at the bottom of the basin, and she won't sell it.",
    offeredBy: 'hetty-graves',
    offerRequires: ['steel-below'],
    recommendedLevel: 20,
    steps: [
      { id: 'eel', journal: 'Dredge the glowing water on the east quay of the Canal Basin.', objectives: [{ type: 'obtainItem', itemId: 'glowing-eel', count: 1, label: 'Dredge the glowing eel' }] },
      { id: 'lab', journal: 'Put the eel in the specimen tank in Laboratory A on B1.', objectives: [{ type: 'interactWith', objectId: 'specimen-tank', label: 'Put the eel in the specimen tank' }] },
      { id: 'hetty', journal: 'Tell Hetty Graves what the lab made of it.', objectives: [{ type: 'talkTo', npcId: 'hetty-graves', label: 'Tell Hetty' }] },
    ],
    rewards: [xp('biochemistry', 1500), xp('research', 600), scrip(300)],
    rewardSummary: ['1 Quest Point', '1500 Biochemistry XP', '600 Research XP', '300 Scrip'],
  },
  {
    id: 'bottom-up',
    name: 'Bottom Up',
    category: 'side',
    summary: "The Cut's main pump has failed. If the Cut rises, the Site floods from the bottom up.",
    offeredBy: 'kofi-mensah',
    offerRequires: ['valve-trouble'],
    recommendedLevel: 25,
    steps: [
      { id: 'impeller', journal: 'Make a pump impeller at a fabricator: two steel bars, Engineering 25.', objectives: [{ type: 'craft', itemId: 'pump-impeller', count: 1, label: 'Make a pump impeller' }] },
      { id: 'fit', journal: 'Fit the impeller to the main pump in the pump house.', objectives: [{ type: 'interactWith', objectId: 'pump-engine', label: 'Fit the impeller' }] },
      { id: 'kofi', journal: 'Tell Kofi Mensah the pump is running.', objectives: [{ type: 'talkTo', npcId: 'kofi-mensah', label: 'Tell Kofi' }] },
    ],
    rewards: [xp('engineering', 2500), xp('refining', 800), scrip(400)],
    rewardSummary: ['1 Quest Point', '2500 Engineering XP', '800 Refining XP', '400 Scrip'],
  },
  {
    id: 'knock-back',
    name: 'Knock Back',
    category: 'side',
    summary: 'The beached hull on the Fringe knocks at night. Corporal Sato wants it to stop.',
    offeredBy: 'corporal-sato',
    offerRequires: ['drowned-lamp'],
    recommendedLevel: 32,
    steps: [
      { id: 'knock', journal: 'Knock on the breach in the beached hull.', objectives: [{ type: 'interactWith', objectId: 'hull-breach', label: 'Knock on the hull' }] },
      { id: 'answer', journal: 'Deal with what answers.', objectives: [{ type: 'defeat', creatureId: 'hull-knocker', count: 4, label: 'Defeat hull knockers' }] },
      { id: 'sato', journal: 'Report to Corporal Sato at the Fringe watch hut.', objectives: [{ type: 'talkTo', npcId: 'corporal-sato', label: 'Report to Sato' }] },
    ],
    rewards: [xp('fortitude', 3000), xp('closeQuarters', 1500), scrip(500)],
    rewardSummary: ['1 Quest Point', '3000 Fortitude XP', '1500 Close Quarters XP', '500 Scrip'],
  },
];

export const DEPTHS_DIALOGUES: readonly DialogueDefinition[] = [
  questTalk({
      npc: 'officer-brandt',
      questId: 'bill-of-lading',
      offer: {
        text: "Sefa's bearings cross under the island. I know. I have known for a while. The Secure Wing records go back further than the Site does, and Ferris will never open them. I can get you down to B2, unofficially. Bring me what the records say about the Vault.",
        accept: 'Get me down there.',
        requires: ['dead-band'],
        conditions: [{ type: 'skillLevel', skill: 'research', atLeast: 25 }],
        notReady: 'There is more I could ask of you, operative, but not until your Research is 25. The records down there take reading.',
      },
      waiting: 'The observation lab on B2. The cabinet half buried in the barricade. Do not stop to look at the cells.',
      report: { stepId: 'brief', text: 'Your pass now opens the lower lift. B2 is red class, and the wing is breached. Get in, find the Vault records, get out.' },
      hand: { stepId: 'return', text: 'You found it?', option: 'Give Brandt the Vault survey.', items: ['vault-survey'], signal: 'lading.returned', thanks: '"Cap it." Eleven years before the first wall went up. They found it, they could not move it, so they built the Site on top. Keep your clearance. Dr Hale will want to talk to you, and I would rather she did than I did.' },
      done: 'Welcome to B1. Keep to the timetable. And keep away from the lower lift unless you mean it.',
      chat: 'Welcome to B1. Your locker is by the west wall.',
    }),
  questTalk({
    npc: 'imogen-hale',
    questId: 'the-heart',
    offer: {
      text: 'Brandt says you read the survey. Then you know the Site is a lid. What you do not know is that the lid is held down from below, by something we call the Warden. It has been holding a shaft shut since before we came. It is weakening. Somebody has to go down and see what it is holding back, and I would rather it was you.',
      accept: "I'll go down.",
      requires: ['bill-of-lading'],
      conditions: [{ type: 'questPoints', atLeast: 12 }, { type: 'combatLevel', atLeast: 40 }],
      notReady: 'Not yet. The Vault eats the unprepared. Come back with combat level 40 and twelve quest points of the Ward behind you.',
    },
    waiting: 'The Vault lift is at the far end of B2. The Warden is in the Heart. Be careful what you take from it.',
    done: 'The hatch is holding. For now. Mercer will tell you the rest.',
    chat: 'Block A is low security. Amber means routine.',
  }),
  questTalk({
    npc: 'lieutenant-mercer',
    questId: 'the-heart',
    report: { stepId: 'mercer', text: 'You. Orders came down an hour ago, with your name on them. The Cordon gate is to be opened. Whatever is under the Site has a way out, and the Directorate wants to find the other end of it before it does. When the gate opens, you go first.' },
    waiting: '',
    done: 'The gate stays shut until the order comes through. When it does, you go first.',
    chat: "The Cordon gate stays shut. Beyond it is the Old Shipyards, and beyond that, nobody's sure.",
  }),
  questTalk({
    npc: 'hetty-graves',
    questId: 'what-glows',
    offer: {
      text: "There's something glowing at the bottom of the basin, off the east quay. Violet. I've netted it twice and let it go twice, because I'm not selling it and I'm not eating it. Will you take it to the Directorate's lab? Somebody should know what it is.",
      accept: "I'll dredge it up.",
      requires: ['steel-below'],
    },
    waiting: 'East quay, the glowing patch. Then into a tank in the B1 lab. Gently.',
    report: { stepId: 'hetty', text: "Calm, you say? Glowing, and calm, and growing. And there's more where it came from? Well. I'm not eating eel again. Here, for your trouble." },
    done: "I'm doing crab now. Crabs don't glow. Yet.",
    chat: "Eels from the basin, crabs from the Cut. Don't buy anything that glows.",
    chatOptions: [{ text: 'Show me what you have.', effects: [{ type: 'openShop', shopId: 'graves-fish' }], next: null }],
  }),
  questTalk({
      npc: 'kofi-mensah',
      questId: 'bottom-up',
      offer: {
        text: "The main pump's gone. Impeller shattered. If the Cut rises, the basin rises, and the Site floods from the bottom up. I need a steel impeller to my drawing, and I need it today.",
        accept: "I'll make the impeller.",
        requires: ['valve-trouble'],
        conditions: [{ type: 'skillLevel', skill: 'engineering', atLeast: 25 }],
        notReady: 'I need an impeller made by someone with Engineering 25. Come back when your hands are ready.',
      },
      waiting: 'Two steel bars at a fabricator, then fit it to the main pump in here.',
      report: { stepId: 'kofi', text: "Listen. That's the main pump. Do you know what's under the Site? Neither do I. But it doesn't like water, and it's going to stay dry. Thank you." },
      done: 'The pumps are singing. The Site stays dry another week.',
      chat: 'If these pumps stop, the basin rises and the Site floods from the bottom up.',
    }),
  questTalk({
    npc: 'corporal-sato',
    questId: 'knock-back',
    offer: {
      text: "The hull knocks every night. Three knocks, then a wait, then three. Somebody told me you sorted out the Drowned Lamp. Would you knock back? And then deal with whatever answers? I'm not asking officially.",
      accept: "I'll knock back.",
      requires: ['drowned-lamp'],
    },
    waiting: 'The breach in the side of the hull. Knock. Then be ready.',
    report: { stepId: 'sato', text: "It's quiet. First quiet night in months. I'm going to sleep for a week. Here, take my ration of scrip, I don't need it." },
    done: 'Still quiet. I keep waiting for it to knock.',
    chat: "You're past the last safe street. If the hull starts knocking, don't knock back.",
  }),
];
