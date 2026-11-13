import type { DialogueDefinition } from '../../dialogue/dialogue.ts';

const VENTS = 'static-in-the-vents';
const KNOCKING = 'the-knocking';

export const LUND_DIALOGUE: DialogueDefinition = {
  id: 'lund',
  entries: [
    { node: 'sluiceKey', conditions: [{ type: 'questActive', questId: 'original-contract', stepId: 'key' }] },
    { node: 'wiresCheck', conditions: [{ type: 'questActive', questId: 'crossed-wires', stepId: 'lund' }] },
    { node: 'override', conditions: [{ type: 'questActive', questId: KNOCKING, stepId: 'override' }] },
    { node: 'offer', conditions: [{ type: 'questNotStarted', questId: VENTS }] },
    { node: 'progress', conditions: [{ type: 'questActive', questId: VENTS, stepId: 'inspect-vents' }] },
    { node: 'report', conditions: [{ type: 'questActive', questId: VENTS, stepId: 'report-to-lund' }] },
    { node: 'thanks' },
  ],
  nodes: {
    sluiceKey: {
      speaker: 'npc',
      text: "The Records sluice key? Sel told you about that. Of course she did. I kept it for sentimental reasons. The reason is that I was sentimental about not drowning.",
      next: 'sluiceKeyGive',
    },
    sluiceKeyGive: {
      speaker: 'npc',
      text: 'Here. Three valves in the sluice hall. Open them slowly. And if anything in the water says your name, do not answer it either.',
      effects: [{ type: 'giveItem', itemId: 'sluice-key' }],
      next: null,
    },
    wiresCheck: {
      speaker: 'npc',
      text: "You're from the Array? I heard her. Achterberg, on the intercom, clear as anything, asking for the coffee I owe her. I thought the vents were talking again. Tell her I'm putting the kettle on.",
      next: null,
    },
    override: {
      speaker: 'npc',
      text: "Sel sent you, didn't she. She's the only one who knows I kept it.",
      options: [{ text: 'I need the Sector 2 override key.', next: 'overrideGive' }],
    },
    overrideGive: {
      speaker: 'npc',
      text: 'Here. If anything follows you back through, I never had this. And close the bulkhead behind you. Firmly.',
      effects: [{ type: 'giveItem', itemId: 'quarantine-override-key' }],
      next: null,
    },
    offer: {
      speaker: 'npc',
      text: "You hear that? No? Good. Means it's just me. The vents in this atrium have been... talking. Static, mostly. Mostly.",
      options: [
        { text: 'Want me to take a look?', next: 'accept' },
        { text: 'Talking how?', next: 'talking' },
        { text: 'Sounds like your problem.', next: null },
      ],
    },
    talking: {
      speaker: 'npc',
      text: "Like someone reading a list of names, very quietly, very far away. Probably filter chips frying. Probably. I'd check myself, but I'm not going near those panels alone.",
      next: 'offer',
    },
    accept: {
      speaker: 'npc',
      text: "You're a lifesaver. Three panels are crackling: one by the lift bay, one up by the north wall, one in the south-east corner. Pull the filter chips and bring them here.",
      effects: [{ type: 'startQuest', questId: VENTS }],
      next: null,
    },
    progress: {
      speaker: 'npc',
      text: 'Three panels. Lift bay, north wall, south-east corner. If any of them say your name, do not answer.',
      next: null,
    },
    report: {
      speaker: 'npc',
      text: 'You got them? Let me see.',
      options: [
        {
          text: 'Hand over the three filter chips.',
          conditions: [{ type: 'hasItem', itemId: 'vent-filter-chip', count: 3 }],
          effects: [
            { type: 'takeItem', itemId: 'vent-filter-chip', count: 3 },
            { type: 'emitSignal', signal: 'vents.chips-delivered' },
          ],
          next: 'delivered',
        },
        { text: 'Not yet.', next: null },
      ],
    },
    delivered: {
      speaker: 'npc',
      text: "Huh. These aren't burnt. They're etched. Tiny letters, all the way round. ...You know what, I'm filing this under 'thermal expansion'. Take the scanner — you've earned it.",
      next: null,
    },
    thanks: {
      speaker: 'npc',
      text: 'Vents are quiet now. Too quiet, honestly. I think I preferred the names.',
      next: null,
    },
  },
};

export const OKAFOR_DIALOGUE: DialogueDefinition = {
  id: 'okafor',
  entries: [
    { node: 'orderDeliver', conditions: [{ type: 'questActive', questId: 'requisition-order', stepId: 'deliver' }] },
    { node: 'greeting' },
  ],
  nodes: {
    orderOffer: {
      speaker: 'npc',
      text: "Deepwatch wants heavy kit faster than I can sign it out. Refine six hardened steel, fabricate a Composite Plate and a Shock Maul, and bring both here. I'll pay, and you'll learn something.",
      options: [
        { text: "I'll fill the order.", effects: [{ type: 'startQuest', questId: 'requisition-order' }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    orderProgress: {
      speaker: 'npc',
      text: 'Six hardened steel, refined. One Composite Plate, one Shock Maul. Slag comes from the Undercroft. Patterns are on the fabricator. Excuses are not accepted.',
      next: 'greeting',
    },
    orderDeliver: {
      speaker: 'npc',
      text: 'Is that my order? Put it on the counter.',
      options: [
        {
          text: 'Hand over the plate and the maul.',
          conditions: [
            { type: 'hasItem', itemId: 'composite-plate' },
            { type: 'hasItem', itemId: 'shock-maul' },
          ],
          effects: [
            { type: 'takeItem', itemId: 'composite-plate' },
            { type: 'takeItem', itemId: 'shock-maul' },
            { type: 'emitSignal', signal: 'requisition.delivered' },
          ],
          next: 'orderThanks',
        },
        { text: 'Not yet.', next: null },
      ],
    },
    orderThanks: {
      speaker: 'npc',
      text: 'Clean welds. Straight seams. Signed, stamped, filed. If you ever want a job behind this counter, the answer is no, because I need you out there.',
      next: null,
    },
    greeting: {
      speaker: 'npc',
      text: 'Requisitions. State your need, your clearance and your excuse for what happened to the last thing you signed out.',
      options: [
        { text: "Let's trade.", effects: [{ type: 'openShop', shopId: 'requisitions' }], next: null },
        {
          text: 'Need anything made?',
          conditions: [
            { type: 'questCompleted', questId: KNOCKING },
            { type: 'questNotStarted', questId: 'requisition-order' },
          ],
          next: 'orderOffer',
        },
        { text: 'How is the order going?', conditions: [{ type: 'questActive', questId: 'requisition-order' }], next: 'orderProgress' },
        { text: 'What do you stock?', next: 'stock' },
        { text: 'How do I get better gear?', next: 'progression' },
        { text: 'Nothing for now.', next: null },
      ],
    },
    stock: {
      speaker: 'npc',
      text: "Medgel, field armour, hazard kit, and sidearms for those with the marksmanship not to shoot their own feet. I'll also buy anything you drag back from a breach that isn't actively screaming. Chitin, residue, scrap.",
      next: 'greeting',
    },
    progression: {
      speaker: 'npc',
      text: "Train. Every piece of restricted kit has a skill or attribute requirement. A Response Helmet needs Fortitude 5. A Kestrel needs Marksmanship 5. Ward lattices need Containment 10 — that one's not negotiable. Everyone starts with the same kit; what you earn after that is down to training.",
      next: 'greeting',
    },
  },
};

export const SEL_DIALOGUE: DialogueDefinition = {
  id: 'sel',
  entries: [
    { node: 'farsideStart', conditions: [{ type: 'questActive', questId: 'the-far-side', stepId: 'consult-varga' }] },
    { node: 'farsideReport', conditions: [{ type: 'questActive', questId: 'the-far-side', stepId: 'report' }] },
    { node: 'farsideProgress', conditions: [{ type: 'questActive', questId: 'the-far-side' }] },
    { node: 'knockingIntro', conditions: [{ type: 'questActive', questId: KNOCKING, stepId: 'ask-sel' }] },
    { node: 'knockingDeliver', conditions: [{ type: 'questActive', questId: KNOCKING, stepId: 'return-to-sel' }] },
    { node: 'knockingProgress', conditions: [{ type: 'questActive', questId: KNOCKING }] },
    { node: 'councilProgress', conditions: [{ type: 'questActive', questId: 'a-council-of-one' }] },
    { node: 'deadAirIntro', conditions: [{ type: 'questActive', questId: 'dead-air', stepId: 'ask-sel' }] },
    { node: 'deadAirReport', conditions: [{ type: 'questActive', questId: 'dead-air', stepId: 'report' }] },
    { node: 'deadAirProgress', conditions: [{ type: 'questActive', questId: 'dead-air' }] },
    { node: 'contractProgress', conditions: [{ type: 'questActive', questId: 'original-contract' }] },
    { node: 'answerHome', conditions: [{ type: 'questActive', questId: 'the-answer', stepId: 'home' }] },
    { node: 'answerProgress', conditions: [{ type: 'questActive', questId: 'the-answer' }] },
    { node: 'ninthProgress', conditions: [{ type: 'questActive', questId: 'the-ninth-letter' }] },
    { node: 'officeProgress', conditions: [{ type: 'questActive', questId: 'dead-letter-office' }] },
    { node: 'returnsReport', conditions: [{ type: 'questActive', questId: 'return-to-sender', stepId: 'sel' }] },
    { node: 'returnsProgress', conditions: [{ type: 'questActive', questId: 'return-to-sender' }] },
    { node: 'councilOffer', conditions: [{ type: 'questCompleted', questId: 'the-far-side' }, { type: 'questNotStarted', questId: 'a-council-of-one' }] },
    { node: 'ninthOffer', conditions: [{ type: 'questCompleted', questId: 'the-answer' }, { type: 'questNotStarted', questId: 'the-ninth-letter' }] },
    { node: 'postmarkedProgress', conditions: [{ type: 'questActive', questId: 'postmarked' }] },
    { node: 'actThreeEpilogue', conditions: [{ type: 'questCompleted', questId: 'return-to-sender' }] },
    { node: 'epilogueWelcomed', conditions: [{ type: 'questCompleted', questId: 'the-answer' }, { type: 'hasFlag', flag: 'ending.welcomed' }] },
    { node: 'epilogueClosed', conditions: [{ type: 'questCompleted', questId: 'the-answer' }] },
    { node: 'greeting' },
  ],
  nodes: {
    councilOffer: {
      speaker: 'npc',
      text: "The Council has answered Halvorsen. Not with a letter. With a tram. They've built a forward base beside the Knock, Deepwatch Station, and sent an envoy to run it. She asked for you by name.",
      options: [
        {
          text: "I'm ready.",
          effects: [
            { type: 'startQuest', questId: 'a-council-of-one' },
            { type: 'setFlag', flag: 'clearance.deepwatch' },
          ],
          next: 'councilGo',
        },
        { text: 'Not yet.', next: null },
      ],
    },
    councilGo: {
      speaker: 'npc',
      text: "The Deep Line lift is set into the west wall of the transit bay. Director Thale is... thorough. Tell her the truth, even when it's strange. Especially then.",
      next: null,
    },
    councilProgress: {
      speaker: 'npc',
      text: 'The Deep Line lift is in the transit bay. Thale is waiting at Deepwatch. Try not to keep the Council waiting; it has a long memory and very little patience.',
      next: null,
    },
    deadAirIntro: {
      speaker: 'npc',
      text: "Warn the other Sites? I write to all eight every month. They answer every month. Cordial. Prompt. Their handwriting has not changed in forty years.",
      next: 'deadAirIntro2',
    },
    deadAirIntro2: {
      speaker: 'npc',
      text: "I have never said that out loud. Go to the Array. Find out where my letters actually go, and who has been so kind as to answer them.",
      next: null,
    },
    deadAirProgress: {
      speaker: 'npc',
      text: 'The Array outbox will tell you where the replies come from. Bring me whatever you find, however strange.',
      next: null,
    },
    deadAirReport: {
      speaker: 'npc',
      text: 'You found something. I can tell from your face. Show me.',
      options: [
        {
          text: 'Hand over the letter and the Choir recording.',
          conditions: [
            { type: 'hasItem', itemId: 'signed-letter' },
            { type: 'hasItem', itemId: 'choir-recording' },
          ],
          effects: [
            { type: 'takeItem', itemId: 'signed-letter' },
            { type: 'takeItem', itemId: 'choir-recording' },
            { type: 'emitSignal', signal: 'deadair.reported' },
          ],
          next: 'deadAirReveal',
        },
        { text: 'Not yet.', next: null },
      ],
    },
    deadAirReveal: {
      speaker: 'npc',
      text: "Every Site. Every signature. All posted from below. We have been alone down here for forty years, {name}, and something has been kind enough to keep us company.",
      next: 'deadAirNext',
    },
    deadAirNext: {
      speaker: 'npc',
      text: "The original Knock file. My teacher, Archivist Wen, took it into the lower stacks the night they flooded. I have never been able to go after her. You can. Lund has the sluice key, and Pim has volunteered to meet you. I've cleared you for the flood stair.",
      next: null,
    },
    contractProgress: {
      speaker: 'npc',
      text: "Lund's sluice key, the flood stair lift, and Pim at the bottom. If you find Wen... tell her I kept the archive tidy.",
      next: null,
    },
    answerProgress: {
      speaker: 'npc',
      text: "You're going through. I have written you down in every file I keep, so that whatever comes back, I will know whether it's you.",
      next: null,
    },
    answerHome: {
      speaker: 'npc',
      text: "You're back. You're still you. I checked. What did you tell it?",
      options: [
        {
          text: 'I told it no.',
          conditions: [{ type: 'hasFlag', flag: 'ending.closed' }],
          effects: [{ type: 'emitSignal', signal: 'answer.reported' }],
          next: 'answerClosed',
        },
        {
          text: 'I let it in.',
          conditions: [{ type: 'hasFlag', flag: 'ending.welcomed' }],
          effects: [{ type: 'emitSignal', signal: 'answer.reported' }],
          next: 'answerWelcomed',
        },
      ],
    },
    answerClosed: {
      speaker: 'npc',
      text: "'No.' After forty years of 'not yet'. It's the first honest thing this Site has ever said to it. I'll file it under Resolved. It will be the only file in that drawer.",
      next: null,
    },
    answerWelcomed: {
      speaker: 'npc',
      text: "You let it in. Of course you did. Well. I'd better find it a desk. And a designation. And a mug. The Directorate has never had a guest before, {name}. We're going to be terrible at it.",
      next: null,
    },
    ninthOffer: {
      speaker: 'npc',
      text: 'Eight Sites wrote this morning. I counted the letters twice, {name}. There are nine. The ninth is addressed to you, care of Records, and it is in your handwriting.',
      options: [
        {
          text: 'Let me see it.',
          effects: [
            { type: 'startQuest', questId: 'the-ninth-letter' },
            { type: 'giveItem', itemId: 'ninth-letter' },
          ],
          next: 'ninthGo',
        },
        { text: 'Not yet.', next: null },
      ],
    },
    ninthGo: {
      speaker: 'npc',
      text: "It says: 'Everything is quiet here. No need to come.' You didn't write that. The frank is from the Signal Array, and Achterberg sends every letter that leaves this Site. Ask him who sent this one.",
      next: null,
    },
    ninthProgress: {
      speaker: 'npc',
      text: 'Achterberg, at the Signal Array. If the Array has been posting letters on its own, I want to know for how long.',
      next: null,
    },
    officeProgress: {
      speaker: 'npc',
      text: "A sorting office. Of course there's a sorting office. Forty years of 'all quiet here', every one of them in our handwriting. Shut it, {name}. Then bring me whatever it was keeping.",
      next: null,
    },
    returnsProgress: {
      speaker: 'npc',
      text: "The founder's letter. Halvorsen signs it, Achterberg sends it, and for the first time in forty years Meridian tells the truth on purpose.",
      next: null,
    },
    returnsReport: {
      speaker: 'npc',
      text: 'Achterberg rang. He sounded happy, which I found unsettling. Is it done?',
      options: [
        {
          text: "It's sent. Every Site will have it.",
          conditions: [{ type: 'hasFlag', flag: 'ending.welcomed' }],
          effects: [{ type: 'emitSignal', signal: 'returns.reported' }],
          next: 'returnsWelcomed',
        },
        {
          text: "It's sent. Every Site will have it.",
          conditions: [{ type: 'lacksFlag', flag: 'ending.welcomed' }],
          effects: [{ type: 'emitSignal', signal: 'returns.reported' }],
          next: 'returnsClosed',
        },
      ],
    },
    returnsWelcomed: {
      speaker: 'npc',
      text: "Our guest read it over my shoulder. It said the founder had lovely handwriting, then asked whether it ought to write to the other Sites itself, to apologise. I said yes. I'm going to proofread.",
      next: null,
    },
    returnsClosed: {
      speaker: 'npc',
      text: "Forty years late, and still the most important letter this Site has ever sent. I'm filing the copy under Resolved. That makes two files in that drawer. It's becoming a habit.",
      next: null,
    },
    actThreeEpilogue: {
      speaker: 'npc',
      text: 'Site Halcyon wrote back first. Their archivist wants to compare notes, and their Signals officer wants to know whether Achterberg is real. I am going to need a bigger drawer.',
      options: [
        {
          text: 'Did every Site reply by relay?',
          conditions: [{ type: 'questNotStarted', questId: 'postmarked' }],
          next: 'postmarkedOffer',
        },
        { text: 'What did Calder say?', conditions: [{ type: 'questCompleted', questId: 'postmarked' }], next: 'postmarkedAfter' },
        { text: 'What is the Meridian Directorate?', next: 'directorate' },
        { text: 'How are anomalies classified?', next: 'classes' },
        { text: "That's all.", next: null },
      ],
    },
    postmarkedOffer: {
      speaker: 'npc',
      text: 'Seven did. The eighth came up the Waterworks drains, crusted in salt and postmarked CALDER. One line: WHO ARE YOU? Relays take a month to reach a Site. This one took an afternoon. Calder is not on the far side of anything, {name}. It is next door.',
      options: [
        { text: "I'll go and introduce us.", effects: [{ type: 'startQuest', questId: 'postmarked' }, { type: 'giveItem', itemId: 'calder-letter' }], next: null },
        { text: 'Not yet.', next: null },
      ],
    },
    postmarkedProgress: {
      speaker: 'npc',
      text: 'Start with Pumpwright Ngata. If a wall in the Waterworks is weeping salt, Ngata has already put a bucket under it. Take the letter. Whoever wrote it will want to see it came.',
      next: null,
    },
    postmarkedAfter: {
      speaker: 'npc',
      text: 'Calder sent a second letter by hand. Their warden has kept a log every day for forty years and would like a copy of ours. I have filed it under Neighbours, which is a drawer I did not have this morning.',
      next: null,
    },
    epilogueClosed: {
      speaker: 'npc',
      text: 'The other eight Sites wrote this morning. Real letters, with real postmarks. Two of them asked who we are. I am going to enjoy writing back.',
      options: [
        { text: 'What is the Meridian Directorate?', next: 'directorate' },
        { text: 'How are anomalies classified?', next: 'classes' },
        { text: "That's all.", next: null },
      ],
    },
    epilogueWelcomed: {
      speaker: 'npc',
      text: "Our guest has been reading the archives. It has corrected three of my files, politely. It was right about all three. I am choosing to find this charming.",
      options: [
        { text: 'What is the Meridian Directorate?', next: 'directorate' },
        { text: 'How are anomalies classified?', next: 'classes' },
        { text: "That's all.", next: null },
      ],
    },
    greeting: {
      speaker: 'npc',
      text: 'Records Division. Everything that happens in this Site is written down by someone. Usually me. What do you want to know?',
      options: [
        { text: 'What is the Meridian Directorate?', next: 'directorate' },
        { text: 'How are anomalies classified?', next: 'classes' },
        { text: "What's behind the Sector 2 bulkhead?", next: 'sector2' },
        {
          text: 'What is waiting behind the door in Sector 2?',
          conditions: [{ type: 'hasFlag', flag: 'storyline.sector-three-revealed' }],
          next: 'sectorThree',
        },
        { text: "That's all.", next: null },
      ],
    },
    directorate: {
      speaker: 'npc',
      text: 'An organisation older than its own records. We find anomalies, we house them, we keep the world ignorant of them. Meridian is one of nine deep Sites. The other eight do not answer my letters.',
      next: 'greeting',
    },
    classes: {
      speaker: 'npc',
      text: 'Dormant: it does nothing unless provoked. Restless: it acts, but predictably. Sovereign: it acts, unpredictably, and it is probably aware of us. The Patient Lantern downstairs is Restless. Pray you never meet a Sovereign.',
      next: 'greeting',
    },
    farsideStart: {
      speaker: 'npc',
      text: "I've found it. The Undercroft, the old maintenance level beneath us, has a sealed service tunnel that runs east, under the Atrium, and keeps going where there should be bedrock. That's our Sector 3.",
      next: 'farsideStartVarga',
    },
    farsideStartVarga: {
      speaker: 'npc',
      text: "Before you go anywhere, see Dr. Varga in the Intake Wing. The lantern shows an hour ahead. I'd like someone to look at your hour before you spend it.",
      next: null,
    },
    farsideProgress: {
      speaker: 'npc',
      text: 'Varga, then the service lift in the south-east corner. The Undercroft has been dark since the lockdown. Restore its power and the seal will be the least strange thing you find down there.',
      next: null,
    },
    farsideReport: {
      speaker: 'npc',
      text: "You're back. You're still you. Good. What did you find?",
      options: [
        {
          text: 'Halvorsen is alive. She has a message for you.',
          effects: [{ type: 'emitSignal', signal: 'farside.reported' }],
          next: 'farsideReveal',
        },
      ],
    },
    farsideReveal: {
      speaker: 'npc',
      text: "'Politely is ending.' I'll take this to the Directorate Council. Whatever they decide, {name}, they will need someone who has already stood in front of that door. Rest. Train. It won't be long.",
      next: null,
    },
    sectorThree: {
      speaker: 'npc',
      text: 'Something patient. The knocking stopped the hour you brought the log back. The Directorate calls that good news. I call it a held breath.',
      next: 'greeting',
    },
    knockingIntro: {
      speaker: 'npc',
      text: "Sector 2. Kade sent you, didn't he. Fine. Sector 2 housed ANM-1180, designation 'the Knock'. A door. Freestanding, no frame, no wall. It knocks.",
      next: 'knockingIntroTeam',
    },
    knockingIntroTeam: {
      speaker: 'npc',
      text: 'Dr. Mira Halvorsen led a six-person team in to study it. Fourteen hours later the quarantine sealed itself. From the inside. Nobody came out, and the knocking started that night.',
      next: 'knockingIntroTask',
    },
    knockingIntroTask: {
      speaker: 'npc',
      text: "Her expedition log will tell us what happened. You'll need an override key for the bulkhead. Engineer Lund kept one after the lockdown. You didn't hear that from me.",
      next: null,
    },
    knockingProgress: {
      speaker: 'npc',
      text: "Override from Lund. Bulkhead in the north wall of Hydroponics. Log from Halvorsen's lab terminal. And {name}: if anything in there knocks, do not answer.",
      next: null,
    },
    knockingDeliver: {
      speaker: 'npc',
      text: "You came back. That's statistically encouraging. Do you have the log?",
      options: [
        {
          text: 'Hand over the expedition log.',
          conditions: [{ type: 'hasItem', itemId: 'expedition-log' }],
          effects: [
            { type: 'takeItem', itemId: 'expedition-log' },
            { type: 'emitSignal', signal: 'knocking.log-delivered' },
          ],
          next: 'knockingReveal',
        },
        { text: "I don't have it yet.", conditions: [{ type: 'lacksItem', itemId: 'expedition-log' }], next: null },
      ],
    },
    knockingReveal: {
      speaker: 'npc',
      text: "The last forty pages are the same three words. 'Let it in.' No, look at the earlier entries. The Knock was never in Sector 2. The door was the far side of something.",
      next: 'knockingRevealSectorThree',
    },
    knockingRevealSectorThree: {
      speaker: 'npc',
      text: "Sector 3 was decommissioned before I was born. It is on no map I have ever filed. Halvorsen's last coordinates are inside it. Come back stronger, {name}. I suspect we'll be going through that door.",
      next: null,
    },
    sector2: {
      speaker: 'npc',
      text: "Quarantine since last cycle. The file is sealed above my clearance, which is saying something, because my clearance includes the file on my clearance.",
      next: 'greeting',
    },
  },
};

export const AMES_DIALOGUE: DialogueDefinition = {
  id: 'ames',
  entries: [{ node: 'greeting' }],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: "Can't stop, sorry — form 12-C needs countersigning before form 12-B expires, and form 12-A doesn't exist yet. Welcome to Meridian!",
      next: null,
    },
  },
};

export const KADE_DIALOGUE: DialogueDefinition = {
  id: 'kade',
  entries: [
    { node: 'arrival', conditions: [{ type: 'questActive', questId: KNOCKING, stepId: 'report-to-kade' }] },
    { node: 'knocking', conditions: [{ type: 'questActive', questId: KNOCKING }] },
    { node: 'facesReport', conditions: [{ type: 'questActive', questId: 'familiar-faces', stepId: 'report' }] },
    { node: 'facesProgress', conditions: [{ type: 'questActive', questId: 'familiar-faces' }] },
    { node: 'facesOffer', conditions: [{ type: 'questCompleted', questId: KNOCKING }, { type: 'questNotStarted', questId: 'familiar-faces' }] },
    { node: 'idle' },
  ],
  nodes: {
    facesOffer: {
      speaker: 'npc',
      text: "Sector 2 keeps refilling. I recognise some of what walks in there. Corporal Avis, still on patrol. Halvorsen's team, still in the isolation ward, all static now.",
      options: [
        { text: 'Want them put to rest?', next: 'facesAsk' },
        { text: 'Not my problem.', next: 'idle' },
      ],
    },
    facesAsk: {
      speaker: 'npc',
      text: 'Properly. The Hollow Warden twice more, so it stays down a little longer each time, and four of the wraiths. You will be stronger for it, and so will they, in their way.',
      options: [
        { text: "I'll do it.", effects: [{ type: 'startQuest', questId: 'familiar-faces' }], next: null },
        { text: 'Not yet.', next: 'idle' },
      ],
    },
    facesProgress: {
      speaker: 'npc',
      text: 'The warden twice. Four wraiths in the isolation ward. Bring medgel. Wraiths hit from range; close the gap fast.',
      next: null,
    },
    facesReport: {
      speaker: 'npc',
      text: "Good. They'll stay down a little longer now. Avis would have liked you. He'd never have said so.",
      next: null,
    },
    arrival: {
      speaker: 'npc',
      text: "Off the tram and still upright. Osei says you can stand up straight, which from Osei is a medal. Sergeant Kade, Response Division. Welcome to the Atrium. Everything you need is around this plaza: Requisitions and storage north-west, fabrication west, the medbay south, my office east.",
      next: 'knockingHook',
    },
    knockingHook: {
      speaker: 'npc',
      text: "The north bulkhead. Sector 2. Sealed last cycle with a research team inside, and it's been knocking every night since. Command calls it thermal expansion. Thermal expansion doesn't keep time.",
      options: [
        { text: 'What do you want me to do?', next: 'knockingAsk' },
        { text: 'Thermal expansion it is.', next: 'knockingAsk' },
      ],
    },
    knockingAsk: {
      speaker: 'npc',
      text: 'The file is sealed above my clearance. Archivist Sel keeps every file in this Site, sealed or not. Start there. And take that baton with you.',
      next: null,
    },
    knocking: {
      speaker: 'npc',
      text: "Sel has the files. Lund has the tools. Mites hit like paper cuts; a hundred paper cuts is still a problem. Wardens don't hit like paper.",
      next: null,
    },
    idle: {
      speaker: 'npc',
      text: "Response Office. If it bites, it comes across this desk first. If you need practice, Osei's range in the Intake Wing is one tram ride away.",
      next: null,
    },
  },
};
