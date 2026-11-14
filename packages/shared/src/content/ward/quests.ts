import type { DialogueDefinition, DialogueNode } from '../../dialogue/dialogue.ts';
import type { QuestDefinition } from '../../quests/questDefinition.ts';
import type { QuestlineDefinition } from '../../quests/questline.ts';
import type { Condition } from '../../rules/conditions.ts';

export const TUTORIAL_QUEST_ID = 'last-train-in';

export const WARD_QUESTS: readonly QuestDefinition[] = [
  {
    id: TUTORIAL_QUEST_ID,
    name: 'Last Train In',
    category: 'tutorial',
    summary: 'You stepped off the last train into Hollow Bay. Learn the Ward before it learns you.',
    steps: [
      { id: 'wren', journal: 'Talk to Wren Adebayo, the porter on the station concourse.', objectives: [{ type: 'talkTo', npcId: 'wren-adebayo', label: 'Talk to Wren Adebayo' }], onComplete: [{ type: 'giveItem', itemId: 'meridian-scrip', count: 30 }] },
      { id: 'shop', journal: "Buy a smoked eel at Kettering's General Store, east across the square.", objectives: [{ type: 'obtainItem', itemId: 'smoked-eel', count: 1, label: 'Buy a smoked eel' }] },
      { id: 'locker', journal: 'Open your storage locker in the locker office, beside the general store.', objectives: [{ type: 'interactWith', objectId: 'storage-locker', label: 'Open a storage locker' }] },
      {
        id: 'kit',
        journal: 'Report to Officer Halloran at the Directorate response post for your issue kit.',
        objectives: [{ type: 'talkTo', npcId: 'duty-officer-halloran', label: 'Report to Officer Halloran' }],
        onComplete: [
          { type: 'giveItem', itemId: 'scrap-baton' },
          { type: 'giveItem', itemId: 'scrap-pistol' },
          { type: 'giveItem', itemId: 'scrap-focus' },
          { type: 'giveItem', itemId: 'scrap-plate' },
        ],
      },
      { id: 'equip', journal: 'Equip your scrap baton.', objectives: [{ type: 'equipItem', itemId: 'scrap-baton', label: 'Equip the scrap baton' }] },
      { id: 'drone', journal: 'Beat a training drone in the rail yard behind the station.', objectives: [{ type: 'defeat', creatureId: 'training-drone', count: 1, label: 'Defeat a training drone' }] },
      { id: 'wisp', journal: 'Subdue and contain the crate wisp in the rail yard. Wear it down, then contain it before it fades.', objectives: [{ type: 'contain', creatureId: 'crate-wisp', count: 1, label: 'Contain the crate wisp' }] },
      { id: 'vance', journal: "Get something hot at Vance's Noodles, south of the clock.", objectives: [{ type: 'talkTo', npcId: 'li-vance', label: 'Talk to Li Vance' }], onComplete: [{ type: 'giveItem', itemId: 'noodle-bowl' }] },
      { id: 'eat', journal: 'Eat the bowl of noodles Vance gave you.', objectives: [{ type: 'useItem', itemId: 'noodle-bowl', label: 'Eat the noodles' }] },
      { id: 'report', journal: 'Report back to Officer Halloran.', objectives: [{ type: 'talkTo', npcId: 'duty-officer-halloran', label: 'Report to Officer Halloran' }] },
    ],
    rewards: [
      { type: 'giveItem', itemId: 'meridian-scrip', count: 50 },
      { type: 'setFlag', flag: 'containment-clearance-1' },
      { type: 'notify', text: 'The city is yours. Talk to people: most of them want something.' },
    ],
    rewardSummary: ['50 Scrip', 'Containment Clearance I', 'The freedom of the Ward'],
  },
  {
    id: 'noodle-run',
    name: 'Noodle Run',
    category: 'side',
    summary: "Li Vance's special broth needs three things he can't leave the pot to fetch.",
    offeredBy: 'li-vance',
    offerRequires: [TUTORIAL_QUEST_ID],
    steps: [
      {
        id: 'fetch',
        journal: 'Bring Vance a basin eel, allotment greens and a day-old loaf. Eel traps hang off the basin quays, the allotments are south of the station, and Ostrowski sells yesterday\'s bread in the Tenements.',
        objectives: [
          { type: 'obtainItem', itemId: 'basin-eel', count: 1, label: 'Get a basin eel' },
          { type: 'obtainItem', itemId: 'allotment-greens', count: 1, label: 'Get allotment greens' },
          { type: 'obtainItem', itemId: 'day-old-loaf', count: 1, label: 'Get a day-old loaf' },
        ],
      },
      { id: 'deliver', journal: 'Take the eel, greens and loaf to Li Vance.', objectives: [{ type: 'signal', signal: 'noodle.delivered', npcId: 'li-vance', label: 'Give Vance the ingredients' }] },
    ],
    rewards: [
      { type: 'giveItem', itemId: 'noodle-bowl', count: 5 },
      { type: 'giveItem', itemId: 'meridian-scrip', count: 40 },
      { type: 'grantExperience', skill: 'biochemistry', amount: 250 },
      { type: 'grantExperience', skill: 'salvage', amount: 50 },
    ],
    rewardSummary: ['1 Quest Point', '250 Biochemistry XP', '50 Salvage XP', '5 Bowls of Noodles', '40 Scrip'],
  },
];

export const WARD_QUESTLINES: readonly QuestlineDefinition[] = [
  { id: 'first-steps', name: 'First Steps', kind: 'main', summary: 'Arriving in Hollow Bay.', questIds: [TUTORIAL_QUEST_ID] },
  { id: 'ward-favours', name: 'Ward Favours', kind: 'side', summary: 'Small problems from the people of the Low Ward.', questIds: ['noodle-run', 'line-thief', 'bed-six', 'valve-trouble', 'rent-day', 'lost-cat', 'bright-things', 'drowned-lamp'] },
];

const at = (stepId: string): Condition[] => [{ type: 'questActive', questId: TUTORIAL_QUEST_ID, stepId }];

const say = (text: string, next: string | null = null): DialogueNode => ({ speaker: 'npc', text, next });

const bye = { text: 'Goodbye.', next: null };

export const WARD_DIALOGUES: readonly DialogueDefinition[] = [
  {
    id: 'wren-adebayo',
    entries: [{ node: 'welcome', conditions: at('wren') }, { node: 'chat' }],
    nodes: {
      welcome: say("Last train in, was it? Welcome to Hollow Bay. Here, the Directorate leaves a little float for new arrivals. Moss Kettering keeps the general store across the square. Buy yourself something to eat, you'll need it.", 'welcome-2'),
      'welcome-2': say('Then the locker office, then Officer Halloran at the response post. She will want to see you. Everyone does, the first week.'),
      chat: { speaker: 'npc', text: "The Site's over the canal, the tenements are north, and the noodles are the best thing in the Ward.", options: [bye] },
    },
  },
  {
    id: 'moss-kettering',
    entries: [{ node: 'lesson', conditions: at('shop') }, { node: 'chat' }],
    nodes: {
      lesson: say("New, are you? Trade with me and I'll show you what I've got. Buy a smoked eel, it'll keep. And if you've anything worth selling, I'll make you an offer. A bad one, but an offer."),
      chat: { speaker: 'npc', text: "Thirty years behind this counter. The anomalies came and folk still need string, soap and tins.", options: [{ text: 'Show me what you sell.', effects: [{ type: 'openShop', shopId: 'kettering-general' }], next: null }, bye] },
    },
  },
  {
    id: 'duty-officer-halloran',
    entries: [
      { node: 'kit', conditions: at('kit') },
      { node: 'equip', conditions: at('equip') },
      { node: 'yard', conditions: at('drone') },
      { node: 'yard', conditions: at('wisp') },
      { node: 'report', conditions: at('report') },
      { node: 'chat' },
    ],
    nodes: {
      kit: say("So you're the new one. Issue kit: a baton, a pistol, a focus and a plate. Scrap, all of it, but scrap kills things the same as anything. Wear the baton.", 'kit-2'),
      'kit-2': say('Then out to the rail yard behind the station. There is a training drone there. Hit it until it stops. After that, there is something in a crate. Wear it down gently and contain it. Do not kill it, it is the only one we have.'),
      equip: say('Open your gear and put the baton on. It goes in your hand, not your pocket.'),
      yard: say('Rail yard, behind the station. Drone first, then the wisp. And eat something after, you look terrible.'),
      report: say("Drone down, wisp in a crate and Vance has fed you. That is everything I teach. You have Clearance I and the Directorate's thanks, which is worth less.", 'report-2'),
      'report-2': say('The rest of the Ward is yours. Talk to people. Most of them want something. The board here has paid work when you want it, and the map shows you where you have been. Good luck, operative.'),
      chat: { speaker: 'npc', text: 'The board on the wall has the work. Amber tags are routine. Red tags, read twice before you sign.', options: [bye] },
    },
  },
  {
    id: 'li-vance',
    entries: [
      { node: 'bowl', conditions: at('vance') },
      { node: 'eat', conditions: at('eat') },
      { node: 'offer', conditions: [{ type: 'questCompleted', questId: TUTORIAL_QUEST_ID }, { type: 'questNotStarted', questId: 'noodle-run' }] },
      { node: 'deliver', conditions: [{ type: 'questActive', questId: 'noodle-run', stepId: 'deliver' }] },
      { node: 'waiting', conditions: [{ type: 'questActive', questId: 'noodle-run' }] },
      { node: 'done', conditions: [{ type: 'questCompleted', questId: 'noodle-run' }] },
      { node: 'chat' },
    ],
    nodes: {
      bowl: say("Halloran sent you? You look it. Here, on the house, first one's always on the house. Eat it while it's hot."),
      eat: say('Eat. Go on. It is getting cold while you look at it.'),
      offer: {
        speaker: 'npc',
        text: "You again. Listen, I've a special on tonight and I can't leave the pot. I need an eel from the basin, greens from the allotments and a loaf of Ostrowski's day-old. Fetch them and you'll eat for a week.",
        options: [{ text: "I'll fetch them.", effects: [{ type: 'startQuest', questId: 'noodle-run' }], next: null }, { text: 'Not tonight.', next: null }],
      },
      waiting: say("Eel from the basin, greens from the allotments, a day-old loaf from Ostrowski's. The pot's waiting, and so am I."),
      deliver: {
        speaker: 'npc',
        text: 'Is that an eel in your pocket? Give it here, all of it.',
        options: [
          {
            text: 'Hand over the eel, greens and loaf.',
            conditions: [{ type: 'hasItem', itemId: 'basin-eel' }, { type: 'hasItem', itemId: 'allotment-greens' }, { type: 'hasItem', itemId: 'day-old-loaf' }],
            effects: [{ type: 'takeItem', itemId: 'basin-eel' }, { type: 'takeItem', itemId: 'allotment-greens' }, { type: 'takeItem', itemId: 'day-old-loaf' }, { type: 'emitSignal', signal: 'noodle.delivered' }],
            next: 'thanks',
          },
          { text: 'Not yet.', next: null },
        ],
      },
      thanks: say("Look at that eel. Angry to the last. Here, five bowls, and the recipe's yours if you've the hands for it: eel, greens, a soaked loaf, at a synthesiser. Don't tell Hetty I said so."),
      done: { speaker: 'npc', text: "The special's gone, but there's always broth.", options: [{ text: "What's on?", effects: [{ type: 'openShop', shopId: 'vance-noodles' }], next: null }, bye] },
      chat: { speaker: 'npc', text: "Broth's been on since before the trains started running again. Sit, eat, don't ask what's in it.", options: [{ text: "What's on?", effects: [{ type: 'openShop', shopId: 'vance-noodles' }], next: null }, bye] },
    },
  },
];
