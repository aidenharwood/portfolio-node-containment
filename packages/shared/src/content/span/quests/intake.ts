import type { DialogueDefinition, DialogueNode } from '../../../dialogue/dialogue.ts';
import type { QuestDefinition } from '../../../quests/questDefinition.ts';
import type { QuestlineDefinition } from '../../../quests/questline.ts';
import type { Condition } from '../../../rules/conditions.ts';
import { CLEARANCE_INTAKE } from '../lifts.ts';

export const TUTORIAL_QUEST_ID = 'report-for-intake';

const at = (questId: string, stepId: string): Condition[] => [{ type: 'questActive', questId, stepId }];
const tut = (stepId: string): Condition[] => at(TUTORIAL_QUEST_ID, stepId);
const trail = (stepId: string): Condition[] => at('paper-trail', stepId);
const say = (text: string, next: string | null = null): DialogueNode => ({ speaker: 'npc', text, next });
const bye = { text: 'Goodbye.', next: null };

export const INTAKE_QUESTS: readonly QuestDefinition[] = [
  {
    id: TUTORIAL_QUEST_ID,
    name: 'Report for Intake',
    category: 'tutorial',
    summary: 'Intake Cohort 41, Site Kestrel. Get your kit, learn the yard, and swear the oath.',
    steps: [
      { id: 'vale', journal: 'Report to Sergeant Vale in the Intake Office, Site Kestrel.', objectives: [{ type: 'talkTo', npcId: 'sergeant-vale', label: 'Report to Sergeant Vale' }], onComplete: [{ type: 'giveItem', itemId: 'meridian-scrip', count: 30 }] },
      {
        id: 'kit',
        journal: 'Draw your issue kit from Armourer Kade in the Kestrel Armoury.',
        objectives: [{ type: 'talkTo', npcId: 'armourer-kade', label: 'Draw kit from Armourer Kade' }],
        onComplete: [{ type: 'giveItem', itemId: 'scrap-shock-baton' }, { type: 'giveItem', itemId: 'scrap-coil-pistol' }, { type: 'giveItem', itemId: 'scrap-psi-focus' }, { type: 'giveItem', itemId: 'scrap-carapace' }],
      },
      { id: 'equip', journal: 'Equip your scrap shock baton and wear your scrap carapace.', objectives: [{ type: 'equipItem', itemId: 'scrap-shock-baton', label: 'Equip the shock baton' }, { type: 'equipItem', itemId: 'scrap-carapace', label: 'Wear the carapace' }] },
      { id: 'drone', journal: 'Beat a training drone in the Training Yard, south of the compound.', objectives: [{ type: 'defeat', creatureId: 'training-drone', count: 1, label: 'Defeat a training drone' }], onComplete: [{ type: 'grantExperience', skill: 'closeQuarters', amount: 40 }, { type: 'grantExperience', skill: 'fortitude', amount: 30 }] },
      { id: 'wisp', journal: 'Wear down a sim-wisp in the Training Yard, then contain it before it fades.', objectives: [{ type: 'contain', creatureId: 'sim-wisp', count: 1, label: 'Contain a sim-wisp' }], onComplete: [{ type: 'grantExperience', skill: 'containment', amount: 60 }] },
      { id: 'mess', journal: 'Get something hot from Tavi Rahman in the Mess, Kestrel Commons, south of the Site.', objectives: [{ type: 'talkTo', npcId: 'cook-tavi', label: 'Talk to Tavi Rahman' }], onComplete: [{ type: 'giveItem', itemId: 'noodle-bowl' }] },
      { id: 'eat', journal: 'Eat the bowl of noodles.', objectives: [{ type: 'useItem', itemId: 'noodle-bowl', label: 'Eat the noodles' }], onComplete: [{ type: 'grantExperience', skill: 'biochemistry', amount: 60 }] },
      { id: 'file', journal: 'Collect your personnel file from Registrar Lune in Kestrel Records.', objectives: [{ type: 'talkTo', npcId: 'registrar-lune', label: 'See Registrar Lune' }] },
      { id: 'oath', journal: 'Report back to Sergeant Vale and swear the oath.', objectives: [{ type: 'talkTo', npcId: 'sergeant-vale', label: 'Swear the oath' }] },
    ],
    rewards: [
      { type: 'giveItem', itemId: 'meridian-scrip', count: 50 },
      { type: 'grantExperience', skill: 'closeQuarters', amount: 60 },
      { type: 'grantExperience', skill: 'fortitude', amount: 40 },
      { type: 'setFlag', flag: CLEARANCE_INTAKE },
      { type: 'notify', text: 'Operative, Intake Cohort 41. Your file has a field Registrar Lune would not explain.' },
    ],
    rewardSummary: ['50 Scrip', '60 Close Quarters XP', '40 Fortitude XP', 'Clearance for Kestrel Intake'],
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
  { id: 'act-one-intake', name: 'Act I · Intake', kind: 'main', summary: 'A fresh recruit at Site Kestrel.', questIds: [TUTORIAL_QUEST_ID, 'paper-trail'] },
];

export const INTAKE_DIALOGUES: readonly DialogueDefinition[] = [
  {
    id: 'sergeant-vale',
    entries: [
      { node: 'welcome', conditions: tut('vale') },
      { node: 'yard', conditions: tut('drone') },
      { node: 'yard', conditions: tut('wisp') },
      { node: 'oath', conditions: tut('oath') },
      { node: 'reissued', conditions: trail('vale') },
      { node: 'chat' },
    ],
    nodes: {
      welcome: say('Recruit. Intake Cohort 41. Welcome to Site Kestrel, the cleanest Site on the Span and the only one still marked Secure. Here is a float to keep you fed.', 'welcome-2'),
      'welcome-2': say('Armourer Kade has your kit. Wear the baton and the plate, then out to the Training Yard. Drone first. Then you contain a wisp. Gently.'),
      yard: say('Training Yard, south side of the compound. Drone, then a wisp. A wisp you kill is a wisp you failed to contain.'),
      oath: say('Repeat after me. I hold what must be held. I keep what must be kept. I go where the file sends me.', 'oath-2'),
      'oath-2': say('Good. You are an operative now. The lift will take you down to Intake when you are ready. Lune will tell you why you want to go.'),
      reissued: say('REISSUED. Sit down, operative. Cohort 41 went to Site Tallow two years ago. Thirty-one went in. None came out. Then the Roster printed thirty-one new files, and thirty-one recruits walked up the road to Kestrel with no memory of the road.', 'reissued-2'),
      'reissued-2': say('You are one. So am I. The Directorate calls it containment by employment, and it works. If you want to know what happened at Tallow, walk spinward, round the Massif the way the Span turns. Start at Harrowgate, over the Seam. They need operatives.'),
      chat: { speaker: 'npc', text: 'Stand up straight, operative. The Span does not care how you stand, but I do.', options: [bye] },
    },
  },
  {
    id: 'armourer-kade',
    entries: [{ node: 'kit', conditions: tut('kit') }, { node: 'chat' }],
    nodes: {
      kit: say('Cohort 41. Here: a baton, a coil pistol, a focus and a plate. Scrap, all of it. Equip the baton and wear the plate before you go near the yard.'),
      chat: { speaker: 'npc', text: 'Scrap issue only until you have earned better. Then you make better yourself, at the Fabrication Shed.', options: [{ text: 'Show me the rack.', effects: [{ type: 'openShop', shopId: 'kestrel-armoury' }], next: null }, bye] },
    },
  },
  {
    id: 'cook-tavi',
    entries: [{ node: 'bowl', conditions: tut('mess') }, { node: 'eat', conditions: tut('eat') }, { node: 'chat' }],
    nodes: {
      bowl: say('Vale sent you? You look it. Here, on the house. First bowl is always on the house.'),
      eat: say('Eat it. It is getting cold while you look at it.'),
      chat: { speaker: 'npc', text: 'Eat. The Span is long and you are thin.', options: [{ text: 'What is on?', effects: [{ type: 'openShop', shopId: 'kestrel-mess' }], next: null }, bye] },
    },
  },
  {
    id: 'registrar-lune',
    entries: [{ node: 'file', conditions: tut('file') }, { node: 'trail', conditions: trail('lune') }, { node: 'chat' }],
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
