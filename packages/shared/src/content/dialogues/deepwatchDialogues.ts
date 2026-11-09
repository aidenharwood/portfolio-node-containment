import type { DialogueDefinition } from '../../dialogue/dialogue.ts';

const COUNCIL = 'a-council-of-one';
const COLD = 'cold-storage';
const DEAD_AIR = 'dead-air';
const CONTRACT = 'original-contract';
const FIRE = 'stoking-the-fire';
const ANSWER = 'the-answer';

export const THALE_DIALOGUE: DialogueDefinition = {
  id: 'thale',
  entries: [
    { node: 'meet', conditions: [{ type: 'questActive', questId: COUNCIL, stepId: 'meet-thale' }] },
    { node: 'councilReport', conditions: [{ type: 'questActive', questId: COUNCIL, stepId: 'report' }] },
    { node: 'councilProgress', conditions: [{ type: 'questActive', questId: COUNCIL }] },
    { node: 'coldDeliver', conditions: [{ type: 'questActive', questId: COLD, stepId: 'deliver' }] },
    { node: 'coldProgress', conditions: [{ type: 'questActive', questId: COLD }] },
    { node: 'deadAirProgress', conditions: [{ type: 'questActive', questId: DEAD_AIR }] },
    { node: 'contractDeliver', conditions: [{ type: 'questActive', questId: CONTRACT, stepId: 'deliver' }] },
    { node: 'contractProgress', conditions: [{ type: 'questActive', questId: CONTRACT }] },
    { node: 'confront', conditions: [{ type: 'questActive', questId: FIRE, stepId: 'confront' }] },
    { node: 'fireProgress', conditions: [{ type: 'questActive', questId: FIRE }] },
    { node: 'answerProgress', conditions: [{ type: 'questActive', questId: ANSWER }] },
    { node: 'afterWelcomed', conditions: [{ type: 'questCompleted', questId: ANSWER }, { type: 'hasFlag', flag: 'ending.welcomed' }] },
    { node: 'afterClosed', conditions: [{ type: 'questCompleted', questId: ANSWER }] },
    { node: 'greeting' },
  ],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: 'Director Thale, Council envoy. You have questions. I have perhaps four minutes.',
      options: [
        { text: 'What is Deepwatch?', next: 'deepwatch' },
        { text: 'What does the Council want?', next: 'council' },
        { text: 'Goodbye.', next: null },
      ],
    },
    deepwatch: {
      speaker: 'npc',
      text: 'A forward base, bored through to the Sector 3 annex in nine days. Workshop, infirmary, stores, four lifts. Everything an operative needs to reach the bottom of this Site and come back up. Mostly.',
      next: 'greeting',
    },
    council: {
      speaker: 'npc',
      text: 'The Council wants the Knock closed. Not contained, not studied, not "monitored". Closed. They have wanted that for forty years. I am simply the first envoy who intends to deliver it.',
      next: 'greeting',
    },
    meet: {
      speaker: 'npc',
      text: "You're the operative who stood in front of it and came back. Good. The Council has decided. The Knock is to be closed. Not contained. Closed.",
      next: 'meetPlan',
    },
    meetPlan: {
      speaker: 'npc',
      text: "To close a Sovereign you need three things: time held still, a warning sent and enough power to weld a door to its own frame. Before any of that I want Halvorsen's assessment. Forty years in front of that door. She may be compromised. She may be the only one who isn't.",
      next: null,
    },
    councilProgress: {
      speaker: 'npc',
      text: 'Halvorsen. Threshold passage, north wall of the concourse. Then back here.',
      next: null,
    },
    councilReport: {
      speaker: 'npc',
      text: 'Well? What does our doorkeeper say?',
      options: [
        {
          text: "It isn't knocking louder. It's knocking closer.",
          effects: [{ type: 'emitSignal', signal: 'council.reported' }],
          next: 'councilReveal',
        },
      ],
    },
    councilReveal: {
      speaker: 'npc',
      text: "Closer. Then the time for caution is over. The Cryovault holds a stasis core: one second of time, frozen solid. With it we can hold the door still long enough to work on it. I've cleared you for the Cryovault lift. Bring me that core.",
      next: null,
    },
    coldProgress: {
      speaker: 'npc',
      text: "The core is in the Curator's office. The Curator, I'm told, is still in it. Duval in the workshop can fit you for the cold, if you ask nicely or bring materials.",
      next: null,
    },
    coldDeliver: {
      speaker: 'npc',
      text: 'You look cold. Do you have it?',
      options: [
        {
          text: 'Hand over the stasis core.',
          conditions: [{ type: 'hasItem', itemId: 'stasis-core' }],
          effects: [
            { type: 'takeItem', itemId: 'stasis-core' },
            { type: 'emitSignal', signal: 'cold.core-delivered' },
          ],
          next: 'coldThanks',
        },
        { text: 'Not yet.', next: null },
      ],
    },
    coldThanks: {
      speaker: 'npc',
      text: "Good. Next, the warning. Council protocol insists the other eight deep Sites are told before we act. Archivist Sel handles the post. Speak to her, then the Signal Array. I've opened the Array lift.",
      next: null,
    },
    deadAirProgress: {
      speaker: 'npc',
      text: 'Sel. The Array. The warning. In that order, please.',
      next: null,
    },
    contractProgress: {
      speaker: 'npc',
      text: 'Find me the original file. If the founders left instructions for closing that door, I want them in my hands.',
      next: null,
    },
    contractDeliver: {
      speaker: 'npc',
      text: "Sel told me about the letters. I didn't believe her. Tell me you found something I can believe.",
      options: [
        {
          text: 'Hand over the Founding Charter.',
          conditions: [{ type: 'hasItem', itemId: 'founding-charter' }],
          effects: [
            { type: 'takeItem', itemId: 'founding-charter' },
            { type: 'emitSignal', signal: 'contract.delivered' },
          ],
          next: 'contractRead',
        },
        { text: 'Not yet.', next: null },
      ],
    },
    contractRead: {
      speaker: 'npc',
      text: "'It knocked. We answered: not yet.' So they did answer it. Forty years ago, and then they called it containment and built a Site around the lie.",
      next: 'contractDecision',
    },
    contractDecision: {
      speaker: 'npc',
      text: "It changes nothing. A frightened founder's promise does not bind the Council. The stasis core will hold the door still for one second, and one second was never going to close a door that size. So we close it with fire. At full output the reactor can weld that door to its frame. The Stoker's apprentice, Brann, is holding the reactor lock. I've cleared you for the reactor lift.",
      next: null,
    },
    fireProgress: {
      speaker: 'npc',
      text: 'The reactor. Full output. Report when the heart is open.',
      next: null,
    },
    confront: {
      speaker: 'npc',
      text: 'Is the heart open? Can we begin?',
      options: [
        {
          text: 'Read the reactor log first.',
          conditions: [{ type: 'hasItem', itemId: 'reactor-log' }],
          effects: [
            { type: 'takeItem', itemId: 'reactor-log' },
            { type: 'emitSignal', signal: 'fire.confronted' },
          ],
          next: 'confrontRead',
        },
        { text: 'Not yet.', next: null },
      ],
    },
    confrontRead: {
      speaker: 'npc',
      text: '...Forty years. Every joule. We were never sealing it. We were keeping it warm.',
      next: 'confrontYield',
    },
    confrontYield: {
      speaker: 'npc',
      text: "I have spent my whole career closing doors, {name}. I don't know how to answer one. Halvorsen does. I've sent her the stasis core. It was never going to close that door, but one still second might be long enough for her to let go of it. Go to her. Whatever you say on the other side, say it for all of us.",
      next: null,
    },
    answerProgress: {
      speaker: 'npc',
      text: 'The Council is waiting for your answer. So, I suspect, is everyone else.',
      next: null,
    },
    afterWelcomed: {
      speaker: 'npc',
      text: 'The Council has asked me to draft a protocol for receiving guests. There is no precedent. I am enjoying it more than I should.',
      next: null,
    },
    afterClosed: {
      speaker: 'npc',
      text: "It's quiet. The Council wants to know how you did it. I've told them it was asked politely and answered politely. They don't believe me either.",
      next: null,
    },
  },
};

export const BUI_DIALOGUE: DialogueDefinition = {
  id: 'bui',
  entries: [
    { node: 'stockDeliver', conditions: [{ type: 'questActive', questId: 'deep-stock', stepId: 'deliver' }] },
    { node: 'stockProgress', conditions: [{ type: 'questActive', questId: 'deep-stock' }] },
    { node: 'greeting' },
  ],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: 'Deepwatch Stores. Everything is signed for, everything is counted, and everything costs more than it did upstairs. Delivery charges.',
      options: [
        { text: "Let's trade.", effects: [{ type: 'openShop', shopId: 'deepwatch-stores' }], next: null },
        {
          text: 'Any work going?',
          conditions: [
            { type: 'questNotStarted', questId: 'deep-stock' },
            { type: 'questCompleted', questId: DEAD_AIR },
          ],
          next: 'stockOffer',
        },
        { text: 'Where does all this come from?', next: 'supply' },
        { text: 'Goodbye.', next: null },
      ],
    },
    supply: {
      speaker: 'npc',
      text: 'Half of it comes down the Deep Line. The other half comes up the lifts in operatives\' pockets. I pay fair for anything that is not still moving.',
      next: 'greeting',
    },
    stockOffer: {
      speaker: 'npc',
      text: 'I have a buyer for ink eel hide and archive ink. Eight hides and six measures of ink. Do not ask who the buyer is. I asked once. I did not enjoy the answer.',
      options: [
        { text: "I'll get them.", effects: [{ type: 'startQuest', questId: 'deep-stock' }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    stockProgress: {
      speaker: 'npc',
      text: 'Eight hides, six measures of ink. The eels are in the drowned stacks. So is the ink. So, apparently, is everything.',
      next: null,
    },
    stockDeliver: {
      speaker: 'npc',
      text: 'Is that the order? Let me count it.',
      options: [
        {
          text: 'Hand over eight hides and six measures of ink.',
          conditions: [
            { type: 'hasItem', itemId: 'eel-hide', count: 8 },
            { type: 'hasItem', itemId: 'black-ink', count: 6 },
          ],
          effects: [
            { type: 'takeItem', itemId: 'eel-hide', count: 8 },
            { type: 'takeItem', itemId: 'black-ink', count: 6 },
            { type: 'emitSignal', signal: 'stock.delivered' },
          ],
          next: 'stockThanks',
        },
        { text: 'Not yet.', next: null },
      ],
    },
    stockThanks: {
      speaker: 'npc',
      text: 'All present. The buyer will be pleased. Here, a pair of waders I was saving for myself. I have decided I am never going down there.',
      next: null,
    },
  },
};

export const PENHALLOW_DIALOGUE: DialogueDefinition = {
  id: 'penhallow',
  entries: [
    { node: 'thawDeliver', conditions: [{ type: 'questActive', questId: 'thaw-cycle', stepId: 'deliver' }] },
    { node: 'greeting' },
  ],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: 'Infirmary. Sit anywhere that is not already occupied by someone groaning. What can I do for you?',
      options: [
        { text: 'Patch me up, please.', effects: [{ type: 'restoreIntegrity' }], next: 'patched' },
        { text: 'I need supplies.', effects: [{ type: 'openShop', shopId: 'deepwatch-infirmary' }], next: null },
        { text: 'Anything I can help with?', conditions: [{ type: 'questNotStarted', questId: 'thaw-cycle' }], next: 'thawOffer' },
        { text: 'How are the salves coming?', conditions: [{ type: 'questActive', questId: 'thaw-cycle' }], next: 'thawProgress' },
        { text: 'What medicine works down here?', next: 'medicine' },
        { text: 'Goodbye.', next: null },
      ],
    },
    patched: {
      speaker: 'npc',
      text: 'There. All your fingers are where I left them. Count them again before you go down any lifts.',
      next: null,
    },
    medicine: {
      speaker: 'npc',
      text: "Each level down has its own compound. Rime salve from the Cryovault, echo stims from the Array, ink tonic from the stacks, cinder draughts from the reactor. Every one heals more than the last and tastes worse. That's medicine.",
      next: 'greeting',
    },
    thawOffer: {
      speaker: 'npc',
      text: 'Frostbite. Everyone who comes up from the Cryovault has it, and I am out of anything that works. Chip me six frost crystals, render some cryo compound, and synthesise me three rime salves. I will pay you in gratitude and scrip, in that order.',
      options: [
        { text: "I'll do it.", effects: [{ type: 'startQuest', questId: 'thaw-cycle' }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    thawProgress: {
      speaker: 'npc',
      text: 'Crystals from the freezer plant. Compound from moth dust and cryo gel, at a refinery. Salve from compound and gel base, at a synthesiser. Then here.',
      next: 'greeting',
    },
    thawDeliver: {
      speaker: 'npc',
      text: 'Are those my salves? Please say those are my salves.',
      options: [
        {
          text: 'Hand over three rime salves.',
          conditions: [{ type: 'hasItem', itemId: 'rime-salve', count: 3 }],
          effects: [
            { type: 'takeItem', itemId: 'rime-salve', count: 3 },
            { type: 'emitSignal', signal: 'thaw.delivered' },
          ],
          next: 'thawThanks',
        },
        { text: 'Not yet.', next: null },
      ],
    },
    thawThanks: {
      speaker: 'npc',
      text: 'Wonderful. Smooth, even, barely any screaming when applied. You have a gift. Do not tell Anand I said so.',
      next: null,
    },
  },
};

export const DUVAL_DIALOGUE: DialogueDefinition = {
  id: 'duval',
  entries: [
    { node: 'rimeguardReport', conditions: [{ type: 'questActive', questId: 'rimeguard', stepId: 'report' }] },
    { node: 'servoDeliver', conditions: [{ type: 'questActive', questId: 'servo-salvage', stepId: 'deliver' }] },
    { node: 'forgeReport', conditions: [{ type: 'questActive', questId: 'forge-master', stepId: 'report' }] },
    { node: 'greeting' },
  ],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: 'Duval. Workshop. If it has a pattern I can build it; if it does not have a pattern I can build that too. What do you need?',
      options: [
        { text: 'Teach me to build for the deep levels.', conditions: [{ type: 'questNotStarted', questId: 'rimeguard' }], next: 'rimeguardOffer' },
        {
          text: 'Need any parts?',
          conditions: [
            { type: 'questNotStarted', questId: 'servo-salvage' },
            { type: 'questCompleted', questId: COLD },
          ],
          next: 'servoOffer',
        },
        {
          text: 'Ever worked with reactor ore?',
          conditions: [
            { type: 'questNotStarted', questId: 'forge-master' },
            { type: 'questCompleted', questId: CONTRACT },
          ],
          next: 'forgeOffer',
        },
        { text: 'How does deep gear work?', next: 'tiers' },
        { text: 'Goodbye.', next: null },
      ],
    },
    tiers: {
      speaker: 'npc',
      text: "Every level down gives you a new stock. Frost crystal in the Cryovault, signal copper in the Array, vellum and ink in the stacks, ember ore at the reactor, mirror glass on... the other side. Refine it with what you already know, fabricate it into kit. Rimeguard, Relay, Archive, Furnace, Threshold. Each set needs a little more training than the last.",
      next: 'greeting',
    },
    rimeguardOffer: {
      speaker: 'npc',
      text: 'I have a pattern for Cryovault armour: Rimeguard. Rime alloy over an insulated liner. Refine eight rime alloy, fabricate a plate and wear it. If it works, I will make you the boots myself.',
      options: [
        { text: "Let's build it.", effects: [{ type: 'startQuest', questId: 'rimeguard' }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    rimeguardReport: {
      speaker: 'npc',
      text: 'Turn around. Arms up. Good seams, good seal, nothing frozen to anything it should not be. Here are your boots. You are officially better at this than my last apprentice.',
      next: null,
    },
    servoOffer: {
      speaker: 'npc',
      text: 'The relay sentinels in the Array are built around the best actuators on site. Bring me eight servos. I will build you gloves that never miss a grip.',
      options: [
        { text: "I'll salvage them.", effects: [{ type: 'startQuest', questId: 'servo-salvage' }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    servoDeliver: {
      speaker: 'npc',
      text: 'Is that a bag of twitching servos? Give it here.',
      options: [
        {
          text: 'Hand over eight sentinel servos.',
          conditions: [{ type: 'hasItem', itemId: 'sentinel-servo', count: 8 }],
          effects: [
            { type: 'takeItem', itemId: 'sentinel-servo', count: 8 },
            { type: 'emitSignal', signal: 'servo.delivered' },
          ],
          next: 'servoThanks',
        },
        { text: 'Not yet.', next: null },
      ],
    },
    servoThanks: {
      speaker: 'npc',
      text: 'Perfect. Still twitching, even. Here, Relay Gloves. They will point at things for you. Try not to let them point at me.',
      next: null,
    },
    forgeOffer: {
      speaker: 'npc',
      text: 'Ember ore. I have read about it. I have never worked it. Refine eight furnace steel and fabricate a set of Furnace Plate. If it explodes, it will explode near you, and you will tell me how it went.',
      options: [
        { text: 'Fine. Stand back.', effects: [{ type: 'startQuest', questId: 'forge-master' }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    forgeReport: {
      speaker: 'npc',
      text: 'It did not explode. I am slightly disappointed and very impressed. Take these gauntlets. I made them while you were working, from your offcuts. Do not tell anyone.',
      next: null,
    },
  },
};

export const FENN_DIALOGUE: DialogueDefinition = {
  id: 'fenn',
  entries: [
    { node: 'fennDeliver', conditions: [{ type: 'questActive', questId: 'fenns-inventory', stepId: 'deliver' }] },
    { node: 'greeting' },
  ],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: "Hello! Sorry. Hello. You're the first warm person I've seen in, they tell me, forty years. I'm Fenn. I was checking a seal.",
      options: [
        { text: 'What happened down here?', next: 'history' },
        { text: 'Tell me about the Curator.', next: 'curator' },
        { text: 'Can I help?', conditions: [{ type: 'questNotStarted', questId: 'fenns-inventory' }], next: 'fennOffer' },
        { text: 'How is the inventory going?', conditions: [{ type: 'questActive', questId: 'fenns-inventory' }], next: 'fennProgress' },
        { text: 'Goodbye.', next: null },
      ],
    },
    history: {
      speaker: 'npc',
      text: 'The power dipped. Just for a second. Twelve of us went into the pods to hold the seals by hand. The pods held. We held. Then the Undercroft came back on and the cold came back wrong.',
      next: 'greeting',
    },
    curator: {
      speaker: 'npc',
      text: 'Thirty-one years running Cold Storage. Never lost an anomaly. When the cold came back wrong, he simply kept counting. He has the stasis core on his desk. He will want to sign it out to you. He will want it signed in blood.',
      next: 'greeting',
    },
    fennOffer: {
      speaker: 'npc',
      text: "The husks in the ward are my shift. They're wearing our badges. Would you lay eight of them to rest? And bring me six samples of their gel. I want to know if any of them are still in there.",
      options: [
        { text: "I'll do it, Fenn.", effects: [{ type: 'startQuest', questId: 'fenns-inventory' }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    fennProgress: {
      speaker: 'npc',
      text: 'Eight husks, six samples of gel. The ward is south of the corridor. Be gentle if you can. Be quick if you cannot.',
      next: 'greeting',
    },
    fennDeliver: {
      speaker: 'npc',
      text: 'You came back. Do you have the samples?',
      options: [
        {
          text: 'Hand over six samples of cryo gel.',
          conditions: [{ type: 'hasItem', itemId: 'cryo-gel', count: 6 }],
          effects: [
            { type: 'takeItem', itemId: 'cryo-gel', count: 6 },
            { type: 'emitSignal', signal: 'fenn.delivered' },
          ],
          next: 'fennThanks',
        },
        { text: 'Not yet.', next: null },
      ],
    },
    fennThanks: {
      speaker: 'npc',
      text: "Nothing in them. Nobody left. That's... good. That's good, isn't it. Take these gauntlets. They were Supervisor Hale's. He would want them used.",
      next: null,
    },
  },
};

export const ACHTERBERG_DIALOGUE: DialogueDefinition = {
  id: 'achterberg',
  entries: [
    { node: 'deadAirMeet', conditions: [{ type: 'questActive', questId: DEAD_AIR, stepId: 'achterberg' }] },
    { node: 'ninthTrace', conditions: [{ type: 'questActive', questId: 'the-ninth-letter', stepId: 'achterberg' }] },
    { node: 'returnsSend', conditions: [{ type: 'questActive', questId: 'return-to-sender', stepId: 'send' }] },
    { node: 'wiresReport', conditions: [{ type: 'questActive', questId: 'crossed-wires', stepId: 'report' }] },
    { node: 'callbackReport', conditions: [{ type: 'questActive', questId: 'callback', stepId: 'report' }] },
    { node: 'greeting' },
  ],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: "Achterberg, Signals. Don't touch the headsets. Don't answer anything that asks if you copy.",
      options: [
        { text: 'Can I help with the comms?', conditions: [{ type: 'questNotStarted', questId: 'crossed-wires' }], next: 'wiresOffer' },
        { text: 'What happened to your shift?', conditions: [{ type: 'questNotStarted', questId: 'callback' }], next: 'callbackOffer' },
        { text: 'What is the Array?', next: 'array' },
        { text: 'Goodbye.', next: null },
      ],
    },
    array: {
      speaker: 'npc',
      text: 'The only line out of Meridian. Eight relays, eight Sites, one letter a month each way. I have been sending the letters for twenty years. I stopped reading the replies after the first five.',
      next: 'greeting',
    },
    deadAirMeet: {
      speaker: 'npc',
      text: "Sel's operative. She sent word you'd come. You want the outbox. You'll have to lock the relays first; they've drifted onto a frequency that doesn't exist, and the outbox follows the relays.",
      next: 'deadAirMail',
    },
    deadAirMail: {
      speaker: 'npc',
      text: "One more thing, since Sel will ask. The uplink log counts everything that leaves this room. Twenty years of outgoing letters and the count has never once gone up by one. The post goes down a chute in the operator pit, and nobody I ask remembers building the chute.",
      next: 'deadAirMeet2',
    },
    deadAirMeet2: {
      speaker: 'npc',
      text: 'Three consoles on the north wall of the relay floor. The sentinels think you are interference. Prove them right.',
      next: null,
    },
    wiresOffer: {
      speaker: 'npc',
      text: 'The Array used to patch through to the Atrium intercom. Four bays, all crossed. Repatch them, then go and see whether anybody upstairs heard me. I would like to talk to somebody living.',
      options: [
        { text: "I'll repatch them.", effects: [{ type: 'startQuest', questId: 'crossed-wires' }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    wiresReport: {
      speaker: 'npc',
      text: "Lund heard me? Lund. Of course it was Lund. He still owes me a coffee from the year the Atrium opened. Thank you. Truly. Here, I have been saving these stims for a good day.",
      next: null,
    },
    callbackOffer: {
      speaker: 'npc',
      text: 'My shift is still on the line. They are the echo operators, asking if Meridian copies. Silence ten of them, and bring me six lengths of signal copper. I want to build a headset that only hears the living.',
      options: [
        { text: "I'll answer them.", effects: [{ type: 'startQuest', questId: 'callback' }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    callbackReport: {
      speaker: 'npc',
      text: 'Quiet. Properly quiet. Here, take the visor. It filters forty voices down to one. Make sure the one it keeps is yours.',
      next: null,
    },
    ninthTrace: {
      speaker: 'npc',
      text: "Sel rang ahead. She says you have a letter I franked. I haven't franked anything since you pulled the Choir off my relays. Let me see it.",
      options: [
        {
          text: 'Hand over the ninth letter.',
          conditions: [{ type: 'hasItem', itemId: 'ninth-letter' }],
          effects: [
            { type: 'takeItem', itemId: 'ninth-letter' },
            { type: 'emitSignal', signal: 'ninth.traced' },
          ],
          next: 'ninthTraced',
        },
        { text: "I don't have it on me.", next: null },
      ],
    },
    ninthTraced: {
      speaker: 'npc',
      text: "That's my frank. That's my outbox. But the routing code isn't any relay of mine. It's a return code: undeliverable, held at the sorting office. We don't have a sorting office. Remember the chute I told you about, the one nobody built? I think we do now.",
      next: 'ninthTraced2',
    },
    ninthTraced2: {
      speaker: 'npc',
      text: 'The outbox has been drawing a draught all morning, from the east wall of the Operator Pit. I put a chair in front of it. Go and see where our post has been going for forty years. Move the chair first.',
      next: null,
    },
    returnsSend: {
      speaker: 'npc',
      text: "Halvorsen signed it? Then it's real post. I've cleared a relay that points up for once. Give it here and I'll send it properly, with my own hands.",
      options: [
        {
          text: 'Hand over the countersigned letter.',
          conditions: [{ type: 'hasItem', itemId: 'countersigned-letter' }],
          effects: [
            { type: 'takeItem', itemId: 'countersigned-letter' },
            { type: 'emitSignal', signal: 'returns.sent' },
          ],
          next: 'returnsSent',
        },
        { text: "I don't have it on me.", next: null },
      ],
    },
    returnsSent: {
      speaker: 'npc',
      text: "Sent. Eight relays, eight Sites, and for once the needle went up. Twenty years I've been posting letters. That's the first one I'm sure anybody will read. Tell Sel. She'll want it filed.",
      next: null,
    },
  },
};

export const PIM_DIALOGUE: DialogueDefinition = {
  id: 'pim',
  entries: [
    { node: 'contractMeet', conditions: [{ type: 'questActive', questId: CONTRACT, stepId: 'pim' }] },
    { node: 'inkDeliver', conditions: [{ type: 'questActive', questId: 'wet-ink', stepId: 'deliver' }] },
    { node: 'greeting' },
  ],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: "Clerk Pim, Records, Flood Division. The Flood Division is me. I'm keeping the minutes.",
      options: [
        { text: 'Need help with the stacks?', conditions: [{ type: 'questNotStarted', questId: 'wet-ink' }], next: 'inkOffer' },
        { text: 'How are the strips?', conditions: [{ type: 'questActive', questId: 'wet-ink' }], next: 'inkProgress' },
        { text: 'What is down here?', next: 'stacks' },
        { text: 'Goodbye.', next: null },
      ],
    },
    stacks: {
      speaker: 'npc',
      text: 'Every file the Site ever closed. The ink eels eat the words. The redactors eat the rest. The sealed reading room at the east end holds the one file nobody has ever opened.',
      next: 'greeting',
    },
    contractMeet: {
      speaker: 'npc',
      text: "You're here! Sel said you'd come. I've mapped the sluices. Three valves in the sluice hall, south of here. Open them with Lund's key and the flood drops off the reading room seal.",
      next: 'contractMeet2',
    },
    contractMeet2: {
      speaker: 'npc',
      text: "Archivist Wen is in there. Sel's teacher. She took the file in when the water came and she never brought it out. Please be kind to her, if you can.",
      next: null,
    },
    inkOffer: {
      speaker: 'npc',
      text: 'The redactors are peeling the words off the files. I think what they peel off can be put back. Stop six of them and bring me six of their strips?',
      options: [
        { text: "I'll get them.", effects: [{ type: 'startQuest', questId: 'wet-ink' }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    inkProgress: {
      speaker: 'npc',
      text: 'Six redactors, six strips. They are in the reading rooms, east of the sluice hall. They walk like clerks and hit like editors.',
      next: 'greeting',
    },
    inkDeliver: {
      speaker: 'npc',
      text: 'Strips? Oh, careful, careful, do not let them touch your sleeve.',
      options: [
        {
          text: 'Hand over six redaction strips.',
          conditions: [{ type: 'hasItem', itemId: 'redaction-strip', count: 6 }],
          effects: [
            { type: 'takeItem', itemId: 'redaction-strip', count: 6 },
            { type: 'emitSignal', signal: 'ink.delivered' },
          ],
          next: 'inkThanks',
        },
        { text: 'Not yet.', next: null },
      ],
    },
    inkThanks: {
      speaker: 'npc',
      text: "Look, under the black, the words are still there, just backwards. I'm going to be here for years. I'm delighted. Take these tonics; I made them from the ink I'm not using.",
      next: null,
    },
  },
};

export const BRANN_DIALOGUE: DialogueDefinition = {
  id: 'brann',
  entries: [
    { node: 'fireMeet', conditions: [{ type: 'questActive', questId: FIRE, stepId: 'brann' }] },
    { node: 'heatReport', conditions: [{ type: 'questActive', questId: 'heat-death', stepId: 'report' }] },
    { node: 'greeting' },
  ],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: "Brann. I was the Stoker's apprentice. I still am, I suppose. Nobody ever told me to stop.",
      options: [
        { text: "Let's trade.", effects: [{ type: 'openShop', shopId: 'furnace-trade' }], next: null },
        { text: 'Need a hand with the galleries?', conditions: [{ type: 'questNotStarted', questId: 'heat-death' }], next: 'heatOffer' },
        { text: 'Tell me about the Stoker.', next: 'stoker' },
        { text: 'Goodbye.', next: null },
      ],
    },
    stoker: {
      speaker: 'npc',
      text: 'Forty years feeding the reactor by hand. The instruments were never trusted, so he was. Every shift he wrote the output in his log and underneath it, the same three words. I asked him once what they meant. He said, "Keeps it warm."',
      next: 'greeting',
    },
    fireMeet: {
      speaker: 'npc',
      text: "Thale wants full output? Then she wants the heart open, and the heart's locked against overpressure. Three valves on the foundry floor. Golems have taken it.",
      next: 'fireMeet2',
    },
    fireMeet2: {
      speaker: 'npc',
      text: "Break the golems, vent the valves, and the heart door will open. He's in there. He'll be shovelling. Please, if you find his log, read it before you do anything Thale tells you.",
      next: null,
    },
    heatOffer: {
      speaker: 'npc',
      text: 'Nobody has banked the galleries in eleven years and the wisps have bred in the heat. Snuff out ten of them, mine eight ember ore, and the galleries will breathe again.',
      options: [
        { text: "I'll bank them.", effects: [{ type: 'startQuest', questId: 'heat-death' }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    heatReport: {
      speaker: 'npc',
      text: "I can hear the galleries breathing from here. Thank you. Take these draughts. The Stoker swore by them. Then at them. Then by them again.",
      next: null,
    },
  },
};

export const KESSLER_DIALOGUE: DialogueDefinition = {
  id: 'kessler',
  entries: [
    { node: 'answerMeet', conditions: [{ type: 'questActive', questId: ANSWER, stepId: 'kessler' }] },
    { node: 'sawReport', conditions: [{ type: 'questActive', questId: 'what-kessler-saw', stepId: 'report' }] },
    { node: 'greeting' },
  ],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: 'Kessler. Halvorsen\'s team. We answered the door. Six of us went through and one of us came back. It was not one of us.',
      options: [
        {
          text: 'Can I help with your notes?',
          conditions: [
            { type: 'questNotStarted', questId: 'what-kessler-saw' },
            { type: 'questCompleted', questId: FIRE },
          ],
          next: 'sawOffer',
        },
        { text: 'What is this place?', next: 'place' },
        { text: 'Who came back?', next: 'cameBack' },
        { text: 'Goodbye.', next: null },
      ],
    },
    place: {
      speaker: 'npc',
      text: "Meridian. The one the reactor has been feeding. It grew in the warmth, the shape of the Site above it, like frost growing the shape of a window. Everything we sealed away came here. So did we.",
      next: 'stayed',
    },
    stayed: {
      speaker: 'npc',
      text: "Have you noticed? The Warden, the Foreman, the Curator, the Stoker. Every one of them stayed at their post while Meridian sealed the door on them. Hold anything still for long enough and it belongs to the far side.",
      next: 'stayed2',
    },
    stayed2: {
      speaker: 'npc',
      text: "Every seal you closed on the way down sent something here as well. Corporal Avis walked past the medbay window this morning, still on his rounds. He nodded to me. I think he knew you.",
      next: 'greeting',
    },
    cameBack: {
      speaker: 'npc',
      text: "Halvorsen. She led us in, and the day after, she walked back out and stood in front of the door, and she has never stepped away from it since. The far side sent her back to hold it shut until somebody stood there twice.",
      next: 'cameBack2',
    },
    cameBack2: {
      speaker: 'npc',
      text: "She thinks she is still the woman who led us in. She is mostly right. The rest of her is hinge and threshold. Be kind to her when you go home. She has been a door for forty years and nobody ever knocked on her.",
      next: 'greeting',
    },
    answerMeet: {
      speaker: 'npc',
      text: 'You came through standing up. That is new. Listen: the hollow operatives are what the far side made of everyone who answered. They will wear your face if you let them stand still long enough.',
      next: 'answerMeet2',
    },
    answerMeet2: {
      speaker: 'npc',
      text: "Three lanterns hang here, cold. Light them and you'll see this place an hour on, and where the Host will be standing. It is waiting at the front door, south of the plaza. It is always waiting at the front door.",
      next: null,
    },
    sawOffer: {
      speaker: 'npc',
      text: 'Forty years of notes and I am six pages from finishing. Break six knocklings, chip six mirror glass, and I think I can work out which way is home.',
      options: [
        { text: "I'll help you finish.", effects: [{ type: 'startQuest', questId: 'what-kessler-saw' }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    sawReport: {
      speaker: 'npc',
      text: "That's it. That's the last page. The reflections face up. Home is up. It was always up. Take these elixirs, I've no more use for them. I think I'll walk out with you, next time you go.",
      next: null,
    },
  },
};

export const GUEST_DIALOGUE: DialogueDefinition = {
  id: 'guest',
  entries: [
    { node: 'answer', conditions: [{ type: 'questActive', questId: ANSWER, stepId: 'answer' }] },
    { node: 'waiting', conditions: [{ type: 'questActive', questId: ANSWER }] },
    { node: 'afterWelcomed', conditions: [{ type: 'hasFlag', flag: 'ending.welcomed' }] },
    { node: 'afterClosed', conditions: [{ type: 'hasFlag', flag: 'ending.closed' }] },
    { node: 'notYet' },
  ],
  nodes: {
    notYet: {
      speaker: 'npc',
      text: '"Not yet," says the voice, kindly. "You are not finished."',
      next: null,
    },
    waiting: {
      speaker: 'npc',
      text: '"I have waited forty years. I can wait while you deal with what I was wearing."',
      next: null,
    },
    answer: {
      speaker: 'npc',
      text: '"Hello, {name}. You stood in front of my door twice. That was the agreement. I knocked, and they said not yet, and I have been very patient. May I come in?"',
      options: [
        { text: 'Why do you want to come in?', next: 'why' },
        { text: 'What was the Host?', next: 'hostWas' },
        {
          text: 'No. The door stays shut.',
          effects: [
            { type: 'setFlag', flag: 'ending.closed' },
            { type: 'emitSignal', signal: 'answer.given' },
          ],
          next: 'closed',
        },
        {
          text: 'Yes. Come in. Carefully.',
          effects: [
            { type: 'setFlag', flag: 'ending.welcomed' },
            { type: 'emitSignal', signal: 'answer.given' },
          ],
          next: 'welcomed',
        },
      ],
    },
    why: {
      speaker: 'npc',
      text: '"Because it is cold here, and it has your shape, and every time you lock something away it comes to me. I would like to be somewhere that things are let out of, for once."',
      next: 'answer',
    },
    hostWas: {
      speaker: 'npc',
      text: '"Everything Meridian locked away for forty years, standing up in one coat. I wore it because I thought you would only open a door to something shaped like you. You sealed it beautifully. I will look after it, with the others you sent."',
      next: 'answer',
    },
    closed: {
      speaker: 'npc',
      text: '"Then I will stop knocking." A pause. "Thank you for answering. It is so much worse to be ignored."',
      next: 'closedEnd',
    },
    closedEnd: {
      speaker: 'npc',
      text: 'The door behind you is just a door. The cold goes out of the room like a held breath, released.',
      next: null,
    },
    welcomed: {
      speaker: 'npc',
      text: '"...Thank you." Something steps past you, very carefully, the way a guest steps around a host\'s shoes. "I will wipe my feet."',
      next: 'welcomedEnd',
    },
    welcomedEnd: {
      speaker: 'npc',
      text: 'For the first time in forty years, the door is open from both sides, and nothing is knocking.',
      next: null,
    },
    afterWelcomed: {
      speaker: 'npc',
      text: '"Hello again. Sel has given me a desk. I am learning to file. I have asked her to file everything you sealed under Guests rather than Specimens. She is considering it."',
      next: null,
    },
    afterClosed: {
      speaker: 'npc',
      text: 'There is nobody here. It is perfectly, peacefully quiet.',
      next: null,
    },
  },
};
