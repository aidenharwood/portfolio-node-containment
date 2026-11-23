import type { DialogueDefinition } from '../../../dialogue/dialogue.ts';
import type { ItemDefinition } from '../../../gear/items.ts';
import type { QuestDefinition } from '../../../quests/questDefinition.ts';
import type { QuestlineDefinition } from '../../../quests/questline.ts';
import type { WorldObjectDefinition } from '../../../world/entities.ts';
import { active, questItem, questTalk, shop } from '../../catalog/dialogueKit.ts';
import { questPay, styleQuestPay } from '../../catalog/questPay.ts';
import { fieldObject, handIn, handTo, paid, scrip, tell } from './questKit.ts';

export const COHORT_QUESTS: readonly QuestDefinition[] = [
  {
    id: 'the-returns-ledger',
    name: 'The Returns Ledger',
    category: 'side',
    summary: 'Quartermaster Okonkwo counts everything twice, including the people who come back. Her returns board has six names on it marked RETURNED. Thirty-one went to Tallow.',
    offeredBy: 'quartermaster-okonkwo',
    offerRequires: ['paper-trail'],
    recommendedLevel: 6,
    steps: [
      { id: 'board', journal: 'Read Okonkwo’s returns board on Kestrel Commons.', objectives: [{ type: 'interactWith', objectId: 'returns-board', label: 'Read the returns board' }] },
      { id: 'lune', journal: 'Ask Registrar Lune in Kestrel Records whether the returns match her files.', objectives: [{ type: 'talkTo', npcId: 'registrar-lune', label: 'Ask Registrar Lune' }] },
      { id: 'dace', journal: 'Tell Recruit Dace, in Barracks 41, that some of the cohort came back somewhere else.', objectives: [{ type: 'talkTo', npcId: 'recruit-dace', label: 'Talk to Dace' }] },
    ],
    ...paid([scrip(60), questPay('research', 6, 2)]),
  },
  {
    id: 'adebayo',
    name: 'Adebayo',
    category: 'side',
    summary: 'ADEBAYO was the first name on the bunk frame. Dace has heard there is an Adebayo working the sluices in Harrowgate who whistles the Directorate march.',
    offeredBy: 'recruit-dace',
    offerRequires: ['the-returns-ledger', 'harrow-call'],
    recommendedLevel: 10,
    steps: [
      { id: 'find', journal: 'Find Femi Adebayo in Harrowgate.', objectives: [{ type: 'talkTo', npcId: 'reprint-adebayo', label: 'Find Femi Adebayo' }] },
      { id: 'magpies', journal: 'The crop magpies stole Adebayo’s tags off the washing line and throw them at him. Put down six on the low terraces.', objectives: [{ type: 'defeat', creatureId: 'crop-magpie', count: 6, label: 'Defeat crop magpies' }] },
      { id: 'nest', journal: 'Search the big magpie nest on Fallow Rows, south of Harrowgate, for Adebayo’s tags.', objectives: [{ type: 'obtainItem', itemId: 'adebayo-tags', count: 1, label: 'Find Adebayo’s tags' }] },
      { id: 'hand', journal: 'Give Femi Adebayo his tags.', objectives: [handTo('adebayo-tags-returned', 'reprint-adebayo', 'Give Adebayo his tags')] },
    ],
    ...paid([scrip(110), styleQuestPay(10, 2), questPay('research', 10, 1)]),
  },
  {
    id: 'the-girl-on-the-billboard',
    name: 'The Girl on the Billboard',
    category: 'side',
    summary: 'Adebayo remembers a girl from the cohort who laughed at everything. There is a Combine billboard over the Overpass with her face on it, laughing at everything.',
    offeredBy: 'reprint-adebayo',
    offerRequires: ['adebayo', 'bright-lights'],
    recommendedLevel: 22,
    steps: [
      {
        id: 'billboard',
        journal: 'Go to the Overpass, north-west of Neon Row, and look at the billboard.',
        objectives: [
          { type: 'enterArea', districtId: 'the-overpass', areaId: 'ground', label: 'Reach the Overpass' },
          { type: 'interactWith', objectId: 'cohort-billboard', label: 'Look at the billboard' },
        ],
      },
      { id: 'sola', journal: 'Find the woman with the billboard’s face. The Glasshouse, in Glasshouse Alley, is where people go to avoid screens.', objectives: [{ type: 'talkTo', npcId: 'reprint-sola', label: 'Find Sola Brightwater' }] },
      { id: 'crawlers', journal: 'The Combine crew who filmed the advert dumped their camera in Undertow, and the alley crawlers nested in it. Scrap five.', objectives: [{ type: 'defeat', creatureId: 'alley-crawler', count: 5, label: 'Defeat alley crawlers' }] },
      { id: 'reel', journal: 'Pull the reel out of the dumped camera in Undertow.', objectives: [{ type: 'obtainItem', itemId: 'sola-reel', count: 1, label: 'Recover the reel' }] },
      { id: 'hand', journal: 'Give Sola the reel.', objectives: [handTo('sola-reel-returned', 'reprint-sola', 'Give Sola the reel')] },
    ],
    ...paid([scrip(240), styleQuestPay(22, 2), questPay('research', 22, 1)]),
  },
  {
    id: 'the-voice-in-the-scrap',
    name: 'The Voice in the Scrap',
    category: 'side',
    summary: 'Sola’s reel shows Cohort 41 marching out of Kestrel. The fourth man in line is a cutter in Rustwater now, and a rustling has been talking in his voice.',
    offeredBy: 'reprint-sola',
    offerRequires: ['the-girl-on-the-billboard', 'sternward'],
    recommendedLevel: 33,
    steps: [
      { id: 'marek', journal: 'Find Marek Ilic, a cutter in Rustwater.', objectives: [{ type: 'talkTo', npcId: 'reprint-marek', label: 'Find Marek Ilic' }] },
      {
        id: 'steady',
        journal: 'Marek wants the talking rustling alive. Contain glass hounds and rustlings until your Containment reaches 25.',
        objectives: [{ type: 'reach', measure: 'containment', level: 25, label: 'Reach Containment 25', toward: { creatures: ['glass-hound', 'rustling'] } }],
      },
      { id: 'rustling', journal: 'Contain a rustling on the Wreckfield, down to its core.', objectives: [{ type: 'contain', creatureId: 'rustling', count: 1, label: 'Contain a rustling' }] },
      { id: 'report', journal: 'Tell Marek what the rustling said in its cell.', objectives: [{ type: 'talkTo', npcId: 'reprint-marek', label: 'Talk to Marek Ilic' }] },
    ],
    ...paid([scrip(330), questPay('containment', 33, 2), questPay('research', 33, 1)]),
  },
  {
    id: 'two-voices',
    name: 'Two Voices',
    category: 'side',
    summary: 'The rustling in Marek’s voice kept repeating one line: Yusuf is singing for both of us. There is a pilgrim at the Choir who sings in two voices.',
    offeredBy: 'reprint-marek',
    offerRequires: ['the-voice-in-the-scrap', 'gone-quiet'],
    recommendedLevel: 42,
    steps: [
      { id: 'yusuf', journal: 'Find Brother Yusuf at the Choir.', objectives: [{ type: 'talkTo', npcId: 'reprint-yusuf', label: 'Find Brother Yusuf' }] },
      {
        id: 'mere',
        journal: 'Yusuf’s second voice comes from Mirror Mere, south-east of the Choir. Go to the water and look at your reflection.',
        objectives: [
          { type: 'enterArea', districtId: 'mirror-mere', areaId: 'ground', label: 'Reach Mirror Mere' },
          { type: 'interactWith', objectId: 'mere-reflection', label: 'Look into the mere' },
        ],
      },
      { id: 'hounds', journal: 'The prism hounds drink from the mere and carry the second voice in the light through them. Put down five.', objectives: [{ type: 'defeat', creatureId: 'prism-hound', count: 5, label: 'Defeat prism hounds' }] },
      { id: 'report', journal: 'Tell Yusuf what the mere showed you.', objectives: [{ type: 'talkTo', npcId: 'reprint-yusuf', label: 'Talk to Brother Yusuf' }] },
    ],
    ...paid([scrip(420), questPay('psionics', 42, 2), questPay('research', 42, 1)]),
  },
  {
    id: 'the-count',
    name: 'The Count',
    category: 'side',
    summary: 'Yusuf says there is a sentry at Last Post who keeps counting the cohort and never gets thirty-one. Corporal Moreno would like a second opinion, and the roll she lost on White Noise.',
    offeredBy: 'reprint-yusuf',
    offerRequires: ['two-voices', 'last-post'],
    recommendedLevel: 54,
    steps: [
      { id: 'cass', journal: 'Find Corporal Cass Moreno at Last Post.', objectives: [{ type: 'talkTo', npcId: 'reprint-cass', label: 'Find Corporal Moreno' }] },
      { id: 'stalkers', journal: 'The null stalkers took Moreno’s roll on their rounds. Discharge four.', objectives: [{ type: 'defeat', creatureId: 'null-stalker', count: 4, label: 'Defeat null stalkers' }] },
      { id: 'roll', journal: 'Recover the cohort roll from Moreno’s old sentry locker on White Noise, south of Last Post.', objectives: [{ type: 'obtainItem', itemId: 'cohort-roll', count: 1, label: 'Recover the cohort roll' }] },
      { id: 'hand', journal: 'Give Corporal Moreno the roll.', objectives: [handTo('cohort-roll-returned', 'reprint-cass', 'Give Moreno the roll')] },
    ],
    ...paid([scrip(600), styleQuestPay(54, 2), questPay('research', 54, 1)]),
  },
  {
    id: 'ring-for-forty-one',
    name: 'Ring for Forty-one',
    category: 'side',
    summary: 'Moreno’s roll has every name of Cohort 41, and a tick by every one: dead at Tallow, back on the Span. Chaplain Marr has never rung the bell for Forty-one. He has run out of reasons not to.',
    offeredBy: 'reprint-cass',
    offerRequires: ['the-count'],
    recommendedLevel: 54,
    steps: [
      { id: 'marr', journal: 'Take the roll to Chaplain Marr in the Cohort Hall, Recruit Lines.', objectives: [{ type: 'talkTo', npcId: 'chaplain-marr', label: 'Talk to Chaplain Marr' }] },
      { id: 'bell', journal: 'Ring the Cohort Bell at the end of the Recruit Lines, once for every name.', objectives: [{ type: 'interactWith', objectId: 'cohort-bell-rope', label: 'Ring the Cohort Bell' }] },
      { id: 'dace', journal: 'Tell Dace the bell has been rung.', objectives: [{ type: 'talkTo', npcId: 'recruit-dace', label: 'Talk to Dace' }] },
    ],
    ...paid([scrip(800), questPay('research', 54, 2), questPay('fortitude', 54, 1)]),
    questPoints: 2,
  },
];

export const COHORT_QUESTLINES: readonly QuestlineDefinition[] = [
  { id: 'cohort-41', name: 'Cohort 41', kind: 'side', summary: 'Thirty-one went into Tallow. Find the ones who came back, all the way round the Massif.', questIds: ['the-returns-ledger', 'adebayo', 'the-girl-on-the-billboard', 'the-voice-in-the-scrap', 'two-voices', 'the-count', 'ring-for-forty-one'] },
];

export const COHORT_ITEMS: readonly ItemDefinition[] = [
  questItem('adebayo-tags', 'Adebayo’s Tags', 'Directorate tags on a chain: ADEBAYO F., COHORT 41. Pecked, scratched and very slightly shiny where a magpie loved them.', 'badge', ['#c8c8c8', '#3a6a2a']),
  questItem('sola-reel', 'Advert Reel', 'A Combine film reel labelled SITE TALLOW: NOW HIRING. The cast is Cohort 41, marching out of Kestrel, all of them smiling.', 'cell', ['#ff4fa8', '#2a2a2a']),
  questItem('cohort-roll', 'Cohort Roll', 'The roll of Intake Cohort 41, thirty-one names, each with two ticks in two different inks.', 'sheet', ['#e8dcc0', '#3a2a20']),
];

export const COHORT_OBJECTS: readonly WorldObjectDefinition[] = [
  fieldObject({ id: 'returns-board', name: 'Returns Board', examine: 'Quartermaster Okonkwo’s board of who went out and who came back. The Cohort 41 column is chalked over and over.', model: 'noticeBoard', verb: 'Read', when: [active('the-returns-ledger', 'board')], refuse: 'OUT: 31. BACK: the number has been rubbed out so often the board is grey.', effects: tell('COHORT 41. OUT: 31. RETURNED: DACE. VALE. HALE. OSEI. ADEBAYO. And yours, chalked very small at the bottom, in Okonkwo’s hand.') }),
  fieldObject({ id: 'magpie-nest', name: 'Magpie Nest', examine: 'A nest the size of a barrow, built of seed packets, wire and somebody’s washing.', model: 'scrapPile', verb: 'Search', when: [active('adebayo', 'nest'), { type: 'lacksItem', itemId: 'adebayo-tags' }], refuse: 'A magpie nest. Mostly seed packets.', effects: [{ type: 'giveItem', itemId: 'adebayo-tags' }, { type: 'notify', text: 'Under the seed packets and a sock, a chain of Directorate tags: ADEBAYO F., COHORT 41. There is a second set underneath, older, with the same name.' }] }),
  fieldObject({ id: 'cohort-billboard', name: 'Combine Billboard', examine: 'A Combine billboard over the Overpass. A young woman in Directorate grey laughs at something just out of frame.', model: 'holoBillboard', verb: 'Look closer', when: [active('the-girl-on-the-billboard', 'billboard')], refuse: 'A Combine advert. She is laughing at something.', effects: tell('The small print reads: SITE TALLOW: NOW HIRING. COHORT 41, PHOTOGRAPHED ON INTAKE. The woman’s name tape says BRIGHTWATER.') }),
  fieldObject({ id: 'sola-camera', name: 'Dumped Camera', examine: 'A Combine film camera on a tripod, dumped in Undertow and grown through with crawler legs.', model: 'securityCamera', verb: 'Pull the reel', when: [active('the-girl-on-the-billboard', 'reel'), { type: 'lacksItem', itemId: 'sola-reel' }], refuse: 'A dead camera. The crawlers have moved out.', effects: [{ type: 'giveItem', itemId: 'sola-reel' }, { type: 'notify', text: 'The reel comes free, labelled SITE TALLOW: NOW HIRING. It is still warm.' }] }),
  fieldObject({ id: 'mere-reflection', name: 'Still Water', examine: 'A pool of the mere so still it holds the Spindle’s light at noon.', model: 'anomalyTrace', verb: 'Look in', when: [active('two-voices', 'mere')], refuse: 'Your reflection. It blinks a moment after you do.', effects: tell('Your reflection is wearing a uniform two years older than yours. Behind it, thirty other reflections are standing in step, and one of them is singing.'), open: true }),
  fieldObject({ id: 'cass-locker', name: 'Sentry Locker', examine: 'A Last Post sentry locker, dragged off its post and dropped on White Noise. MORENO is stencilled on the door.', model: 'storageLocker', verb: 'Open', when: [active('the-count', 'roll'), { type: 'lacksItem', itemId: 'cohort-roll' }], refuse: 'Moreno’s old locker. Empty but for a clipboard with no head.', effects: [{ type: 'giveItem', itemId: 'cohort-roll' }, { type: 'notify', text: 'The roll is folded in the locker. Thirty-one names, and beside every one a tick in red and a tick in blue. Dead. Back.' }] }),
  fieldObject({ id: 'cohort-bell-rope', name: 'Bell Rope', examine: 'The rope of the Cohort Bell, tied off. It is rung once for every cohort that passes out.', model: 'bellTower', verb: 'Ring', when: [active('ring-for-forty-one', 'bell')], refuse: 'The rope is tied off. Marr rings it, and only for a cohort that has passed out.', effects: tell('You ring thirty-one times. On the Commons, people stop and count. On the last stroke, somebody in the Lines starts to cheer, and somebody else starts to cry, and they are both Dace.') }),
];

export const COHORT_DIALOGUES: readonly DialogueDefinition[] = [
  questTalk({
    npc: 'quartermaster-okonkwo',
    questId: 'the-returns-ledger',
    offer: { text: 'I count everything twice, operative, including the people who come back. My returns board has a column for Forty-one. Thirty-one out. Read what came back, and then ask Lune if her files agree. They never do.', accept: 'I will read the board.', requires: ['paper-trail'] },
    waiting: 'The board, then Lune, then Dace. Dace will want to know. Dace always wants to know.',
    done: 'I chalk the Forty-one column once a week now. It keeps getting longer.',
    chat: 'Locker, board, exchange, rations. If you need it in Kestrel, it comes across this counter. The Span Transit terminal is on the south side of the Commons: walk into a station once and the Ring Line will bring you back to it.',
    chatOptions: [shop('kestrel-stores')],
  }),
  questTalk({
    npc: 'registrar-lune',
    questId: 'the-returns-ledger',
    report: { stepId: 'lune', text: 'Six returns. My files say thirty-one. The others came back too, operative. They came back somewhere else, with other names and the same faces, and they did not report to Kestrel. I keep them matched. I do not keep them close.' },
    waiting: 'Tell Dace. She will make it her business. Let her.',
    done: 'Every operative has a file. Some files are in the wrong Site.',
    chat: 'Every operative has a file. Every file has an operative. I keep them matched.',
  }),
  questTalk({
    npc: 'recruit-dace',
    questId: 'the-returns-ledger',
    report: { stepId: 'dace', text: 'Somewhere else? All of them? Then they are out there, round the Massif, with our faces, not knowing. I am going to find them. Well. You are. I have drill at six.' },
    waiting: 'Lune first. Then come and tell me.',
    done: 'They are out there. I can feel it, the way you feel a bunk that was yours.',
    chat: 'They gave us the old barracks. Forty-one. There’s names scratched in the bunks already, and one of them is mine.',
  }),
  questTalk({
    npc: 'recruit-dace',
    questId: 'adebayo',
    offer: { text: 'ADEBAYO. First name on the bunk frame. There is an Adebayo on the Harrow sluices who whistles the Directorate march and does not know why. Go and find him. Do not tell him everything at once. I would not want to be told everything at once.', accept: 'I will find Adebayo.', requires: ['the-returns-ledger', 'harrow-call'] },
    waiting: 'Harrowgate. He whistles. You will hear him before you see him.',
    done: 'Adebayo sent a letter. It says he remembers my laugh. I do not laugh. Apparently I used to.',
    chat: 'They gave us the old barracks. Forty-one. There’s names scratched in the bunks already, and one of them is mine.',
  }),
  handIn(
    {
      npc: 'reprint-adebayo',
      questId: 'adebayo',
      notes: [{ stepId: 'find', text: 'Dace? I know that name the way you know a song. Tags? I had tags when I came up the road. The magpies took them off the line. They throw them at me, some mornings. Not the tags. Other tags. They have a collection.' }],
      waiting: 'The big nest is on Fallow Rows. Mind the beaks.',
      hand: { stepId: 'hand', text: 'Are those mine?', option: 'Your tags.', items: [], signal: 'adebayo-tags-returned', thanks: 'ADEBAYO F., COHORT 41. Two sets, same name. I will wear the newer ones. The older ones can go on the wall.' },
      done: 'I whistle the march on purpose now. It sounds better.',
      chat: 'I came up the road two springs ago with no boots and a Kestrel haircut. The co-op gave me a spade. I never asked for the rest.',
    },
    [['adebayo-tags', 1]],
  ),
  questTalk({
    npc: 'reprint-adebayo',
    questId: 'the-girl-on-the-billboard',
    offer: { text: 'I remember a girl in the cohort who laughed at everything, even Vale. There is a Combine billboard over the Overpass in Halcyon with her face on it, laughing. Will you go and look? I cannot. Halcyon is very loud.', accept: 'I will look.', requires: ['adebayo', 'bright-lights'] },
    waiting: 'The Overpass, in Halcyon. She will be laughing.',
    done: 'Sola wrote. She says I still whistle flat. She is right.',
    chat: 'I came up the road two springs ago with no boots and a Kestrel haircut. The co-op gave me a spade. I never asked for the rest.',
  }),
  handIn(
    {
      npc: 'reprint-sola',
      questId: 'the-girl-on-the-billboard',
      notes: [{ stepId: 'sola', text: 'You saw the billboard. Everybody sees the billboard. I have never been photographed in my life, operative. Unless that was a different life. The crew that shot it dumped their camera in Undertow. Get me the reel. I want to see what I was laughing at.' }],
      waiting: 'Undertow. The camera is where the crawlers are thickest. Of course it is.',
      hand: { stepId: 'hand', text: 'Is that the reel?', option: 'The advert reel.', items: [], signal: 'sola-reel-returned', thanks: 'Thirty-one of us marching out of Kestrel. I am laughing because the man fourth in line just fell over his own boots. Look at him. He is a cutter in Rustwater now. I would know that face anywhere.' },
      done: 'I took the reel to Reza. She let me play it, once, in a bar with no screens. On a wall.',
      chat: 'Do not tell me I look like the girl on the billboard. I know. She smiles more.',
    },
    [['sola-reel', 1]],
  ),
  questTalk({
    npc: 'reprint-sola',
    questId: 'the-voice-in-the-scrap',
    offer: { text: 'The man fourth in line, the one who fell over. He is in Rustwater, cutting hull plate, and the scavengers say a rustling talks in his voice at night. Go and see him. Tell him I said he still cannot march.', accept: 'I will find him.', requires: ['the-girl-on-the-billboard', 'sternward'] },
    waiting: 'Rustwater. A cutter. Can’t march. You will know him.',
    done: 'Marek sent me a rivet with my name cut into it. It is the nicest thing anyone has given me in either life.',
    chat: 'Do not tell me I look like the girl on the billboard. I know. She smiles more.',
  }),
  questTalk({
    npc: 'reprint-marek',
    questId: 'the-voice-in-the-scrap',
    notes: [
      { stepId: 'marek', text: 'Sola? The girl who laughed when I fell over? She is alive? Good. Listen: a rustling talks in my voice at night, out on the heaps. I want it in a cell, not in scrap. Whatever it says, I want to hear it.' },
      { stepId: 'steady', text: 'Rustlings come apart if you are clumsy with them. Get your Containment up first.' },
      { stepId: 'rustling', text: 'Knock it down to its core and seal the core. The rest of it can stay where it falls.' },
      { stepId: 'report', text: 'Yusuf is singing for both of us. That is what it said? I knew a Yusuf. He sang in the barracks. Badly. Twice as loud as anyone.' },
    ],
    waiting: '',
    done: 'The rustling in the cell has stopped talking. I miss it. It had my voice from before.',
    chat: 'The rustlings talk in the night. One of them talks in my voice. I would like it to stop, or to tell me what I said.',
  }),
  questTalk({
    npc: 'reprint-marek',
    questId: 'two-voices',
    offer: { text: 'Yusuf is singing for both of us. There is a pilgrim at the Choir who sings in two voices; the scavengers who go out for glass hear him. Go and find him. If it is our Yusuf, tell him to sing quieter.', accept: 'I will find Yusuf.', requires: ['the-voice-in-the-scrap', 'gone-quiet'] },
    waiting: 'The Choir. Two voices. You will hear him before you see him. Everyone did.',
    done: 'Yusuf sings one voice now. He says the other one is resting. I do not ask where.',
    chat: 'The rustlings talk in the night. One of them talks in my voice. I would like it to stop, or to tell me what I said.',
  }),
  questTalk({
    npc: 'reprint-yusuf',
    questId: 'two-voices',
    notes: [
      { stepId: 'yusuf', text: 'Marek sent you? Marek who fell over? Then I am who I think I am. The second voice is not mine. It comes up out of Mirror Mere, and I sing along so it does not sing alone. Go and look in the water. Tell me who is singing.' },
      { stepId: 'hounds', text: 'The prism hounds drink at the mere and carry the voice away in the light. Put some down, and the voice comes home.' },
      { stepId: 'report', text: 'Thirty of us in step, under the water, and one singing. Then it was me, the one before. He can rest now. I will sing for one.' },
    ],
    waiting: '',
    done: 'One voice. It is very quiet in my head. The Choir says I am flat now. I am delighted.',
    chat: 'I walked out onto the glass the day I arrived and heard myself already singing. The Choir took me in. They take in anyone who can hold a note.',
  }),
  questTalk({
    npc: 'reprint-yusuf',
    questId: 'the-count',
    offer: { text: 'There is a sentry at Last Post who keeps counting the cohort, so the pilgrims say, and never gets thirty-one. Will you count with her? Two counts are better than one, and one of them should be someone who was there.', accept: 'I will count with her.', requires: ['two-voices', 'last-post'] },
    waiting: 'Last Post. A corporal, counting. You will hear her before you see her.',
    done: 'Moreno came to the Choir and sang a roll call. We all answered. Nobody minded.',
    chat: 'I walked out onto the glass the day I arrived and heard myself already singing. The Choir took me in. They take in anyone who can hold a note.',
  }),
  handIn(
    {
      npc: 'reprint-cass',
      questId: 'the-count',
      notes: [{ stepId: 'cass', text: 'You are counting Forty-one too? I had the roll in my sentry locker, on White Noise, before the stalkers walked off with the whole post. They do rounds. They took my count with them. Get it back.' }],
      waiting: 'White Noise, south of here. My locker says MORENO. The stalkers will be checking on it.',
      hand: { stepId: 'hand', text: 'My roll? Give it here. I will count it in front of you.', option: 'The cohort roll.', items: [], signal: 'cohort-roll-returned', thanks: 'Thirty-one. Red tick, blue tick, every one. Dead and back. I kept getting thirty because I was not counting myself. There. Thirty-one.' },
      done: 'Thirty-one. I count it every night. It comes out right every night.',
      chat: 'Thirty-one went into Tallow. I have been counting the ones who came back out. I keep getting a number I do not like.',
    },
    [['cohort-roll', 1]],
  ),
  questTalk({
    npc: 'reprint-cass',
    questId: 'ring-for-forty-one',
    offer: { text: 'Thirty-one, all back. Chaplain Marr at Kestrel rings the bell when a cohort passes out. He has never rung it for Forty-one. Take him the count. He has run out of reasons.', accept: 'I will take him the count.', requires: ['the-count'] },
    waiting: 'Marr, then the bell, then Dace. She started this. She should hear it end.',
    done: 'They say you could hear the bell from Harrowgate. I heard it from here. I am choosing to believe that.',
    chat: 'Thirty-one went into Tallow. I have been counting the ones who came back out. I keep getting a number I do not like.',
  }),
  questTalk({
    npc: 'chaplain-marr',
    questId: 'ring-for-forty-one',
    report: { stepId: 'marr', text: 'Thirty-one, and every one back. Then Forty-one has passed out, after all, in its own way. I am too old to haul that rope thirty-one times. You do it. I will count.' },
    waiting: 'The bell is at the end of the Lines. Thirty-one strokes. I am counting.',
    done: 'I read the names every morning still. I read them as present now.',
    chat: 'We ring the bell when a cohort passes out. We have not rung it for Forty-one. Not yet.',
  }),
  questTalk({
    npc: 'recruit-dace',
    questId: 'ring-for-forty-one',
    report: { stepId: 'dace', text: 'I heard. The whole Commons heard. I counted thirty-one and then I kept counting, because it felt rude to stop. Thank you, operative. You found all of us. Even you.' },
    waiting: 'Ring it. I will be listening.',
    done: 'I have stopped scratching names in things. I have started writing letters.',
    chat: 'They gave us the old barracks. Forty-one. There’s names scratched in the bunks already, and one of them is mine.',
  }),
];
