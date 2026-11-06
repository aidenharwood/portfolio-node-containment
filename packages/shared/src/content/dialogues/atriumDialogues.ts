import type { DialogueDefinition } from '../../dialogue/dialogue.ts';

const VENTS = 'static-in-the-vents';
const LIVE_FIRE = 'live-fire';
const KNOCKING = 'the-knocking';

export const LUND_DIALOGUE: DialogueDefinition = {
  id: 'lund',
  entries: [
    { node: 'override', conditions: [{ type: 'questActive', questId: KNOCKING, stepId: 'override' }] },
    { node: 'offer', conditions: [{ type: 'questNotStarted', questId: VENTS }] },
    { node: 'progress', conditions: [{ type: 'questActive', questId: VENTS, stepId: 'inspect-vents' }] },
    { node: 'report', conditions: [{ type: 'questActive', questId: VENTS, stepId: 'report-to-lund' }] },
    { node: 'thanks' },
  ],
  nodes: {
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
  entries: [{ node: 'greeting' }],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: 'Requisitions. State your need, your clearance and your excuse for what happened to the last thing you signed out.',
      options: [
        { text: "Let's trade.", effects: [{ type: 'openShop', shopId: 'requisitions' }], next: null },
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
    { node: 'greeting' },
  ],
  nodes: {
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
      text: "Override from Lund. Bulkhead on the north wall. Log from Halvorsen's lab terminal. And {name}: if anything in there knocks, do not answer.",
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
    { node: 'intro', conditions: [{ type: 'questActive', questId: LIVE_FIRE, stepId: 'report-to-kade' }] },
    { node: 'armUp', conditions: [{ type: 'questActive', questId: LIVE_FIRE, stepId: 'arm-up' }] },
    { node: 'drill', conditions: [{ type: 'questActive', questId: LIVE_FIRE, stepId: 'drill' }] },
    { node: 'patchUp', conditions: [{ type: 'questActive', questId: LIVE_FIRE, stepId: 'patch-up' }] },
    { node: 'debrief', conditions: [{ type: 'questActive', questId: LIVE_FIRE, stepId: 'debrief' }] },
    { node: 'knocking', conditions: [{ type: 'questActive', questId: KNOCKING }] },
    { node: 'idle' },
  ],
  nodes: {
    intro: {
      speaker: 'npc',
      text: "You're Varga's intake. She says you've got steady hands. Let's find out if the rest of you is steady too. Sergeant Kade, Response Division.",
      options: [
        { text: 'I fabricated my own baton.', conditions: [{ type: 'hasItem', itemId: 'stun-baton' }], next: 'ownBaton' },
        { text: 'Reporting for training.', conditions: [{ type: 'lacksItem', itemId: 'stun-baton' }], next: 'issue' },
      ],
    },
    ownBaton: {
      speaker: 'npc',
      text: "Pell's work? No, yours. Good balance. Then you don't need mine. Wield it.",
      next: 'howTo',
    },
    issue: {
      speaker: 'npc',
      text: 'Standard issue stun baton. Capacitor head, rubber grip, no sense of humour. Wield it.',
      effects: [{ type: 'giveItem', itemId: 'stun-baton' }],
      next: 'howTo',
    },
    howTo: {
      speaker: 'npc',
      text: 'Then pick a drone on the range and hit it until it stops being upright. They hit back. Gently. Mostly.',
      options: [
        { text: 'How does combat work here?', next: 'combatBasics' },
        {
          text: 'Can I qualify on a sidearm instead?',
          conditions: [{ type: 'lacksFlag', flag: 'kade.issued-dart-pistol' }],
          next: 'rangedIssue',
        },
        { text: 'Understood.', next: null },
      ],
    },
    combatBasics: {
      speaker: 'npc',
      text: 'Click a target, close the distance, swing on rhythm. Close Quarters decides how often you land and how hard. Fortitude keeps you standing. Gear helps; training helps more. Nobody here was born good at this.',
      next: 'howTo',
    },
    rangedIssue: {
      speaker: 'npc',
      text: "Trainee dart pistol. Low power, honest accuracy. Marksmanship trains every time a dart lands, same as the baton trains Close Quarters. Work up to five and Requisitions will trust you with a Kestrel.",
      effects: [
        { type: 'giveItem', itemId: 'dart-pistol' },
        { type: 'setFlag', flag: 'kade.issued-dart-pistol' },
      ],
      next: 'howTo',
    },
    armUp: { speaker: 'npc', text: "Baton's in your inventory. Click it to wield. I'll wait. I'm very good at waiting.", next: null },
    drill: { speaker: 'npc', text: "Three drones. Click one to engage. If you're hurting, step back and breathe.", next: null },
    patchUp: { speaker: 'npc', text: 'Medgel. Inventory. Click it to apply. Into the wound, not the eyes.', next: null },
    debrief: {
      speaker: 'npc',
      text: 'Not bad for a first live drill. Now. Off the record.',
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
      text: "Range is open. The drones reset themselves. That's more than I can say for people.",
      options: [
        {
          text: 'Can I qualify on a sidearm?',
          conditions: [{ type: 'lacksFlag', flag: 'kade.issued-dart-pistol' }],
          next: 'rangedIssue',
        },
        { text: 'Goodbye.', next: null },
      ],
    },
  },
};
