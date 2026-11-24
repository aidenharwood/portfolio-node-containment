import type { DialogueDefinition, DialogueNode } from '../../../dialogue/dialogue.ts';
import type { QuestDefinition } from '../../../quests/questDefinition.ts';
import type { QuestlineDefinition } from '../../../quests/questline.ts';
import type { Condition } from '../../../rules/conditions.ts';
import { studiedFlag } from '../../../combat/study.ts';
import { CLEARANCE_INTAKE } from '../lifts.ts';

export const TUTORIAL_QUEST_ID = 'report-for-intake';
export const COMMONS_QUEST_ID = 'commons-rounds';
export const CRAFT_QUEST_ID = 'make-do';
export const OATH_QUEST_ID = 'the-oath';
export const INTAKE_TRAINING_QUEST_IDS = [TUTORIAL_QUEST_ID, COMMONS_QUEST_ID, CRAFT_QUEST_ID, OATH_QUEST_ID] as const;

const PLATED_NOTES = 'intake:plated-notes';

const at = (questId: string, stepId?: string): Condition[] => [{ type: 'questActive', questId, ...(stepId ? { stepId } : {}) }];
const tut = (stepId: string): Condition[] => at(TUTORIAL_QUEST_ID, stepId);
const rounds = (stepId: string): Condition[] => at(COMMONS_QUEST_ID, stepId);
const craft = (stepId: string): Condition[] => at(CRAFT_QUEST_ID, stepId);
const oath = (stepId: string): Condition[] => at(OATH_QUEST_ID, stepId);
const trail = (stepId: string): Condition[] => at('paper-trail', stepId);
const say = (text: string, next: string | null = null): DialogueNode => ({ speaker: 'npc', text, next });
const bye = { text: 'Goodbye.', next: null };

export const INTAKE_QUESTS: readonly QuestDefinition[] = [
  {
    id: TUTORIAL_QUEST_ID,
    name: 'Report for Intake',
    category: 'tutorial',
    summary: 'Intake Cohort 41, Site Kestrel. Draw your kit and learn all three ways to fight in the Training Yard: baton, pistol and focus.',
    steps: [
      { id: 'vale', journal: 'Report to Sergeant Vale in the Intake Office, Site Kestrel.', objectives: [{ type: 'talkTo', npcId: 'sergeant-vale', label: 'Report to Sergeant Vale' }], onComplete: [{ type: 'giveItem', itemId: 'meridian-scrip', count: 30 }] },
      {
        id: 'kit',
        journal: 'Draw your issue kit from Armourer Kade in the Kestrel Armoury.',
        objectives: [{ type: 'talkTo', npcId: 'armourer-kade', label: 'Draw kit from Armourer Kade' }],
        onComplete: [{ type: 'giveItem', itemId: 'scrap-shock-baton' }, { type: 'giveItem', itemId: 'scrap-coil-pistol' }, { type: 'giveItem', itemId: 'scrap-psi-focus' }, { type: 'giveItem', itemId: 'scrap-carapace' }],
      },
      { id: 'equip', journal: 'Equip your scrap shock baton and wear your scrap carapace.', objectives: [{ type: 'equipItem', itemId: 'scrap-shock-baton', label: 'Equip the shock baton' }, { type: 'equipItem', itemId: 'scrap-carapace', label: 'Wear the carapace' }] },
      {
        id: 'drone',
        journal: 'Melee. Beat a training drone with the baton in the Training Yard, south of the compound.',
        objectives: [{ type: 'defeat', creatureId: 'training-drone', count: 1, style: 'melee', label: 'Defeat a training drone in melee' }],
        onComplete: [{ type: 'grantExperience', skill: 'closeQuarters', amount: 30 }, { type: 'grantExperience', skill: 'fortitude', amount: 20 }],
      },
      { id: 'brandt', journal: 'Report to Range Master Brandt by the Training Yard gate.', objectives: [{ type: 'talkTo', npcId: 'range-master-brandt', label: 'Report to Range Master Brandt' }] },
      {
        id: 'pistol',
        journal: 'Ranged. Equip the coil pistol and drop an echo decoy from range in the Training Yard.',
        objectives: [{ type: 'equipItem', itemId: 'scrap-coil-pistol', label: 'Equip the coil pistol' }, { type: 'defeat', creatureId: 'echo-decoy', count: 1, style: 'ranged', label: 'Defeat an echo decoy with the pistol' }],
        onComplete: [{ type: 'grantExperience', skill: 'marksmanship', amount: 30 }, { type: 'grantExperience', skill: 'fortitude', amount: 10 }],
      },
      {
        id: 'study',
        journal: 'Study a plated drone in the Training Yard before you fight it, then show Range Master Brandt your notes.',
        objectives: [{ type: 'signal', signal: PLATED_NOTES, npcId: 'range-master-brandt', label: 'Study a plated drone and show Brandt' }],
      },
      {
        id: 'focus',
        journal: 'Psionics. Equip the psi focus and put down a plated drone with it.',
        objectives: [{ type: 'equipItem', itemId: 'scrap-psi-focus', label: 'Equip the psi focus' }, { type: 'defeat', creatureId: 'plated-drone', count: 1, style: 'psionic', label: 'Defeat a plated drone with the focus' }],
        onComplete: [{ type: 'grantExperience', skill: 'psionics', amount: 30 }, { type: 'grantExperience', skill: 'fortitude', amount: 10 }],
      },
      {
        id: 'wisp',
        journal: 'Wear down a sim-wisp in the Training Yard and contain it before it fades. Pick up the trace dust it leaves.',
        objectives: [{ type: 'contain', creatureId: 'sim-wisp', count: 1, label: 'Contain a sim-wisp' }, { type: 'obtainItem', itemId: 'trace-dust', count: 2, label: 'Pick up trace dust' }],
        onComplete: [{ type: 'grantExperience', skill: 'containment', amount: 50 }],
      },
      { id: 'debrief', journal: 'Report back to Sergeant Vale in the Intake Office.', objectives: [{ type: 'talkTo', npcId: 'sergeant-vale', label: 'Report to Sergeant Vale' }] },
    ],
    rewards: [{ type: 'giveItem', itemId: 'meridian-scrip', count: 40 }, { type: 'grantExperience', skill: 'fortitude', amount: 30 }],
    rewardSummary: ['40 Scrip', '30 Fortitude XP'],
    followUpQuestId: COMMONS_QUEST_ID,
  },
  {
    id: COMMONS_QUEST_ID,
    name: 'Commons Rounds',
    category: 'main',
    questPoints: 0,
    summary: 'Kestrel Commons keeps the Site fed, stocked and moving. Learn where everything is before anyone sends you anywhere.',
    steps: [
      { id: 'mess', journal: 'Get something hot from Tavi Rahman in the Mess, Kestrel Commons, south of the Site.', objectives: [{ type: 'talkTo', npcId: 'cook-tavi', label: 'Talk to Tavi Rahman' }], onComplete: [{ type: 'giveItem', itemId: 'noodle-bowl' }] },
      { id: 'eat', journal: 'Eat the bowl of noodles. Food puts back integrity the yard took off you.', objectives: [{ type: 'useItem', itemId: 'noodle-bowl', label: 'Eat the noodles' }], onComplete: [{ type: 'grantExperience', skill: 'biochemistry', amount: 20 }] },
      { id: 'okonkwo', journal: 'Report to Quartermaster Okonkwo at the Commons Stores.', objectives: [{ type: 'talkTo', npcId: 'quartermaster-okonkwo', label: 'Talk to Quartermaster Okonkwo' }] },
      {
        id: 'rounds',
        journal: 'Do the rounds of the Commons: open a storage locker, read the contract board, look over the exchange, board the tram at Kestrel Commons Station, and see Medic Sauer in the Clinic.',
        objectives: [
          { type: 'interactWith', objectId: 'storage-locker', label: 'Open a storage locker' },
          { type: 'interactWith', objectId: 'contract-board', label: 'Read the contract board' },
          { type: 'interactWith', objectId: 'exchange-post', label: 'Look over the exchange' },
          { type: 'interactWith', objectId: 'tram-car-door', label: 'Board the tram at the station' },
          { type: 'talkTo', npcId: 'medic-sauer', label: 'See Medic Sauer' },
        ],
      },
      { id: 'eel', journal: 'Buy a basin eel from Tavi at the Mess. You will cook it yourself.', objectives: [{ type: 'obtainItem', itemId: 'basin-eel', count: 1, label: 'Buy a basin eel' }] },
    ],
    rewards: [{ type: 'giveItem', itemId: 'meridian-scrip', count: 30 }],
    rewardSummary: ['30 Scrip'],
    followUpQuestId: CRAFT_QUEST_ID,
  },
  {
    id: CRAFT_QUEST_ID,
    name: 'Make Do',
    category: 'main',
    questPoints: 0,
    summary: 'Scrap issue only until you have earned better. Technician Oduya would like you to start earning it: gather, refine, build, mix and cook.',
    steps: [
      { id: 'oduya', journal: 'See Technician Oduya in the Fabrication Shed, Kestrel Commons.', objectives: [{ type: 'talkTo', npcId: 'technician-oduya', label: 'Talk to Technician Oduya' }] },
      {
        id: 'gather',
        journal: 'Gather round Kestrel Lake, east of the Site: scrap metal off a scrap pile, greens off the allotment bed, and trace dust off a faint trace.',
        objectives: [
          { type: 'gather', itemId: 'scrap-metal', count: 2, label: 'Salvage scrap metal' },
          { type: 'gather', itemId: 'allotment-greens', count: 2, label: 'Pick allotment greens' },
          { type: 'gather', itemId: 'trace-dust', count: 1, label: 'Sample a faint trace' },
        ],
      },
      { id: 'refine', journal: 'Refine your scrap metal into scrap plating at the refinery in the Fabrication Shed.', objectives: [{ type: 'craft', itemId: 'scrap-plating', count: 1, label: 'Refine scrap plating' }] },
      {
        id: 'fabricate',
        journal: 'Assemble a pair of scrap gauntlets from the plating at the fabricator, and put them on.',
        objectives: [{ type: 'craft', itemId: 'scrap-gauntlets', count: 1, label: 'Assemble scrap gauntlets' }, { type: 'equipItem', itemId: 'scrap-gauntlets', label: 'Wear the gauntlets' }],
      },
      { id: 'synthesise', journal: 'Synthesise a greens poultice from two greens and a trace dust at the synthesiser.', objectives: [{ type: 'craft', itemId: 'greens-poultice', count: 1, label: 'Synthesise a greens poultice' }] },
      { id: 'cook', journal: 'Cook your basin eel on the cooker in the Mess.', objectives: [{ type: 'craft', itemId: 'smoked-eel', count: 1, label: 'Cook a smoked eel' }] },
    ],
    rewards: [
      { type: 'giveItem', itemId: 'meridian-scrip', count: 40 },
      { type: 'grantExperience', skill: 'salvage', amount: 20 },
      { type: 'grantExperience', skill: 'refining', amount: 20 },
      { type: 'grantExperience', skill: 'engineering', amount: 20 },
      { type: 'grantExperience', skill: 'biochemistry', amount: 20 },
    ],
    rewardSummary: ['40 Scrip', '20 Salvage XP', '20 Refining XP', '20 Engineering XP', '20 Biochemistry XP'],
    followUpQuestId: OATH_QUEST_ID,
  },
  {
    id: OATH_QUEST_ID,
    name: 'The Oath',
    category: 'main',
    questPoints: 0,
    summary: 'Fed, kitted and shown round. All that is left is your file and the oath.',
    steps: [
      { id: 'file', journal: 'Collect your personnel file from Registrar Lune in Kestrel Records.', objectives: [{ type: 'talkTo', npcId: 'registrar-lune', label: 'See Registrar Lune' }] },
      { id: 'oath', journal: 'Report back to Sergeant Vale and swear the oath.', objectives: [{ type: 'talkTo', npcId: 'sergeant-vale', label: 'Swear the oath' }] },
    ],
    rewards: [
      { type: 'giveItem', itemId: 'meridian-scrip', count: 50 },
      { type: 'setFlag', flag: CLEARANCE_INTAKE },
      { type: 'notify', text: 'Operative, Intake Cohort 41. Your file has a field Registrar Lune would not explain.' },
    ],
    rewardSummary: ['50 Scrip', 'Clearance for Kestrel Intake'],
    followUpQuestId: 'paper-trail',
  },
  {
    id: 'paper-trail',
    name: 'Paper Trail',
    category: 'main',
    summary: 'Your personnel file has a field marked PREVIOUS INTAKE. It is filled in.',
    steps: [
      { id: 'lune', journal: 'Ask Registrar Lune about the PREVIOUS INTAKE field on your file.', objectives: [{ type: 'talkTo', npcId: 'registrar-lune', label: 'Ask Registrar Lune' }] },
      { id: 'descend', journal: 'Take the headhouse lift down to Kestrel Intake and find the Processing Hall.', objectives: [{ type: 'enterArea', districtId: 'kestrel-intake', areaId: 'processing', label: 'Reach the Processing Hall' }] },
      { id: 'hask', journal: 'Talk to Processing Officer Hask.', objectives: [{ type: 'talkTo', npcId: 'officer-hask', label: 'Talk to Officer Hask' }] },
      { id: 'roster', journal: 'Read the open file in the Roster, in the Print Room.', objectives: [{ type: 'interactWith', objectId: 'the-roster', label: 'Read the Roster' }], onComplete: [{ type: 'grantExperience', skill: 'research', amount: 120 }] },
      { id: 'vale', journal: 'Go back up and ask Sergeant Vale what REISSUED means.', objectives: [{ type: 'talkTo', npcId: 'sergeant-vale', label: 'Confront Sergeant Vale' }] },
    ],
    rewards: [
      { type: 'giveItem', itemId: 'meridian-scrip', count: 120 },
      { type: 'grantExperience', skill: 'research', amount: 200 },
      { type: 'grantExperience', skill: 'containment', amount: 150 },
      { type: 'notify', text: 'Vale says the answer lies spinward, round the Massif. Harrowgate, over the Seam, has asked for help with Site Orchard.' },
    ],
    rewardSummary: ['120 Scrip', '200 Research XP', '150 Containment XP'],
  },
];

export const INTAKE_QUESTLINES: readonly QuestlineDefinition[] = [
  { id: 'act-one-intake', name: 'Act I · Intake', kind: 'main', summary: 'A fresh recruit at Site Kestrel.', questIds: [...INTAKE_TRAINING_QUEST_IDS, 'paper-trail'] },
];

export const INTAKE_DIALOGUES: readonly DialogueDefinition[] = [
  {
    id: 'sergeant-vale',
    entries: [
      { node: 'welcome', conditions: tut('vale') },
      { node: 'yard', conditions: tut('kit') },
      { node: 'yard', conditions: tut('equip') },
      { node: 'yard', conditions: tut('drone') },
      { node: 'brandt', conditions: tut('brandt') },
      { node: 'brandt', conditions: tut('pistol') },
      { node: 'brandt', conditions: tut('study') },
      { node: 'brandt', conditions: tut('focus') },
      { node: 'brandt', conditions: tut('wisp') },
      { node: 'debrief', conditions: tut('debrief') },
      { node: 'oath', conditions: oath('oath') },
      { node: 'reissued', conditions: trail('vale') },
      { node: 'commons', conditions: at(COMMONS_QUEST_ID) },
      { node: 'commons', conditions: at(CRAFT_QUEST_ID) },
      { node: 'chat' },
    ],
    nodes: {
      welcome: say('Recruit. Intake Cohort 41. Welcome to Site Kestrel, the cleanest Site on the Span and the only one still marked Secure. Here is a float to keep you fed.', 'welcome-2'),
      'welcome-2': say('Armourer Kade has your kit: a baton, a pistol and a focus. You will win a fight with each before I swear you in. The Span does not let you pick your fights, so you will not pick your weapon.'),
      yard: say('Baton and plate, then the Training Yard, south side of the compound. Beat a drone. Then Brandt has you.'),
      brandt: say('Brandt has you. Do what she says, in the order she says it.'),
      debrief: say('Baton, pistol, focus, and a wisp in a crate. Three ways to hurt a thing and one way not to. Say the circle back to me.', 'debrief-2'),
      'debrief-2': say('Baton beats the shooter. Pistol beats the psion. Focus beats the plate. Study it first if you do not know which it is. Good. Now go south to the Commons and get fed. Okonkwo will show you the rest.'),
      commons: say('You are not finished, recruit. The Commons is south of the gate. Okonkwo and Oduya have you until they say otherwise.'),
      oath: say('Repeat after me. I hold what must be held. I keep what must be kept. I go where the file sends me.', 'oath-2'),
      'oath-2': say('Good. You are an operative now. The lift will take you down to Intake when you are ready. Lune will tell you why you want to go.'),
      reissued: say('REISSUED. Sit down, operative. Cohort 41 went to Site Tallow two years ago. Thirty-one went in. None came out. Then the Roster printed thirty-one new files, and thirty-one recruits walked up the road to Kestrel with no memory of the road.', 'reissued-2'),
      'reissued-2': say('You are one. So am I. The Directorate calls it containment by employment, and it works. If you want to know what happened at Tallow, walk spinward, round the Massif the way the Span turns. Start at Harrowgate, over the Seam. They need operatives.'),
      chat: { speaker: 'npc', text: 'Stand up straight, operative. The Span does not care how you stand, but I do.', options: [bye] },
    },
  },
  {
    id: 'armourer-kade',
    entries: [{ node: 'kit', conditions: tut('kit') }, { node: 'equip', conditions: tut('equip') }, { node: 'chat' }],
    nodes: {
      kit: say('Cohort 41. Here: a baton, a coil pistol, a focus and a plate. Scrap, all of it. Baton in your hand and plate on your back first. Brandt will want the other two at the yard.'),
      equip: say('Baton in your hand, plate on your back. Then the yard. You can only hold one weapon at a time, so keep the others in your pack.'),
      chat: { speaker: 'npc', text: 'Scrap issue only until you have earned better. Then you make better yourself, at the Fabrication Shed.', options: [{ text: 'Show me the rack.', effects: [{ type: 'openShop', shopId: 'kestrel-armoury' }], next: null }, bye] },
    },
  },
  {
    id: 'range-master-brandt',
    entries: [
      { node: 'circle', conditions: tut('brandt') },
      { node: 'pistol', conditions: tut('pistol') },
      { node: 'notes', conditions: tut('study') },
      { node: 'focus', conditions: tut('focus') },
      { node: 'wisp', conditions: tut('wisp') },
    ],
    nodes: {
      circle: say('Vale says you can swing a stick. Every recruit can. Now the circle, so listen. The baton beats anything that shoots: close in and it has nowhere to aim. The pistol beats a psion: it cannot think a dart out of the air. The focus beats plate: armour does not stop a thought.', 'circle-2'),
      'circle-2': say('Everything out there leans one way. Study it first and your notes say which. The echo decoys hum, so they are psions. Pistol out. Drop one from range.'),
      pistol: say('Pistol. Echo decoy. From range. If you walk up and hit it with the grip I will know.'),
      notes: {
        speaker: 'npc',
        text: 'Plated drone next. Do not hit it yet. Study it: stand close, look hard, and your notes will tell you what it fears. Show me when you have them.',
        options: [{ text: 'Here are my notes.', conditions: [{ type: 'hasFlag', flag: studiedFlag('plated-drone') }], effects: [{ type: 'emitSignal', signal: PLATED_NOTES }], next: 'notes-read' }, { text: 'Not yet.', next: null }],
      },
      'notes-read': say('Weak to psionics. Plate turns a baton and skips a dart, but a focus goes straight through it, and studied it goes down faster. Focus out. Put one down.'),
      focus: say('Focus. Point it at the plate and think unkind thoughts.'),
      wisp: say('The wisps are Achebe’s, not mine. Wear one down gently and contain it before it fades. A wisp you kill is a wisp you failed to contain. Pick up the dust it leaves; Oduya will want it.'),
    },
  },
  {
    id: 'cook-tavi',
    entries: [{ node: 'bowl', conditions: rounds('mess') }, { node: 'eat', conditions: rounds('eat') }, { node: 'eel', conditions: rounds('eel') }, { node: 'cook', conditions: craft('cook') }, { node: 'chat' }],
    nodes: {
      bowl: say('Vale sent you? You look it. Here, on the house. First bowl is always on the house.'),
      eat: say('Eat it. It is getting cold while you look at it.'),
      eel: { speaker: 'npc', text: 'Okonkwo sent you for an eel. Six scrip, raw. Second bowl is never on the house. I sell; I do not buy. Okonkwo buys.', options: [{ text: 'Show me what you have.', effects: [{ type: 'openShop', shopId: 'kestrel-mess' }], next: null }, bye] },
      cook: say('The cooker is behind me. Eel on, lid down, do not wander off. Cooking is chemistry you can eat.'),
      chat: { speaker: 'npc', text: 'Eat. The Span is long and you are thin.', options: [{ text: 'What is on?', effects: [{ type: 'openShop', shopId: 'kestrel-mess' }], next: null }, bye] },
    },
  },
  {
    id: 'quartermaster-okonkwo',
    entries: [{ node: 'rounds', conditions: rounds('okonkwo') }, { node: 'rounds-waiting', conditions: rounds('rounds') }],
    nodes: {
      rounds: say('Recruit. Fed? Good. This is how the Commons works. The locker keeps what you cannot carry, and it is the same locker in every outpost on the Span. The board posts contracts: daily and weekly work for scrip and commendations. The exchange is where operatives trade with each other: post an order here, collect it at any outpost mailbox.', 'rounds-2'),
      'rounds-2': say('The tram is south, in the terminal. Board the car and the map opens; walk into a station once and the line will bring you back to it. Medic Sauer is in the Clinic, and she will want to look at you. Then buy an eel off Tavi. Anything you do not need, sell to me. Half what it is worth, which is more than it is worth to you.'),
      'rounds-waiting': say('Locker, board, exchange, tram, Sauer. Then an eel off Tavi. I count everything twice, recruit, including you.'),
    },
  },
  {
    id: 'medic-sauer',
    entries: [{ node: 'rounds', conditions: rounds('rounds') }],
    nodes: {
      rounds: say('Sit. Breathe. Integrity comes back on its own if you stop getting hit. Food puts it back faster, and a poultice faster still. I sell them, or make your own at the synthesiser.', 'rounds-2'),
      'rounds-2': say('If the Span puts you down anyway, medical will carry you somewhere safe and patch you up. You keep your kit. You lose your dignity. Try not to make a habit of it.'),
    },
  },
  {
    id: 'technician-oduya',
    entries: [
      { node: 'start', conditions: craft('oduya') },
      { node: 'gather', conditions: craft('gather') },
      { node: 'refine', conditions: craft('refine') },
      { node: 'fabricate', conditions: craft('fabricate') },
      { node: 'synthesise', conditions: craft('synthesise') },
    ],
    nodes: {
      start: say('Everything you wear on the Span, somebody made. Today that is you. Raw stock first: Kestrel Lake, east of the Site. Scrap off the heaps is Salvage. Greens off the allotment is Biochemistry. That glow on the ground is a faint trace; sampling it is Research.', 'start-2'),
      'start-2': say('Then back here. Refinery turns scrap into plating. Fabricator turns plating into kit. Synthesiser turns greens and trace into medicine. Tavi’s cooker does the eel. Every station shows what you can make and what it needs.'),
      gather: say('Two scrap, two greens, one trace, off the shore of Kestrel Lake. Heaps run dry; they come back. The rats will not bother you if you do not bother them.'),
      refine: say('Refinery. Two scrap in, one plate out. That is Refining, and it never gets more interesting than that.'),
      fabricate: say('Fabricator. One plate makes a pair of gauntlets. Better gear needs better plate, and better plate needs a better operative. Put them on.'),
      synthesise: say('Synthesiser. Two greens and a pinch of trace makes a poultice. Keep it for a bad day.'),
    },
  },
  {
    id: 'registrar-lune',
    entries: [{ node: 'file', conditions: oath('file') }, { node: 'trail', conditions: trail('lune') }, { node: 'chat' }],
    nodes: {
      file: say('Your file. Name, cohort, blood type, next of kin. And this field, PREVIOUS INTAKE. It is filled in. Do not ask me about it until Vale has sworn you in.'),
      trail: say('You want to know about PREVIOUS INTAKE. The answer is in the Roster, in the Print Room below Intake. Take the lift. Officer Hask will show you.'),
      chat: { speaker: 'npc', text: 'Every operative has a file. Every file has an operative. I keep them matched.', options: [bye] },
    },
  },
  {
    id: 'officer-hask',
    entries: [{ node: 'roster', conditions: trail('hask') }, { node: 'chat' }],
    nodes: {
      roster: say('You again. Do not take it personally, everyone says that. The Roster is in the Print Room. Read the open drawer. It is always open on the file of whoever is reading it.'),
      chat: { speaker: 'npc', text: 'Processing, the Print Room, the Recovery Ward and Roster Holding. You have been through all four before.', options: [bye] },
    },
  },
];
