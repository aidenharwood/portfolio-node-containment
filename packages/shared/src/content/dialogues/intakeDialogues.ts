import type { DialogueDefinition } from '../../dialogue/dialogue.ts';

const ORIENTATION = 'orientation-protocol';

export const REYES_DIALOGUE: DialogueDefinition = {
  id: 'reyes',
  entries: [
    { node: 'welcome', conditions: [{ type: 'questActive', questId: ORIENTATION, stepId: 'report-to-reyes' }] },
    { node: 'reminder', conditions: [{ type: 'questActive', questId: ORIENTATION }] },
    { node: 'after', conditions: [{ type: 'questCompleted', questId: ORIENTATION }] },
    { node: 'idle' },
  ],
  nodes: {
    welcome: {
      speaker: 'npc',
      text: "Name and— no, don't tell me, it's on the screen. {name}. Welcome to Site Meridian, Intake Wing, Sublevel Four. I'm Officer Reyes. You'll be processed, outfitted, and pointed at something dangerous. In that order.",
      effects: [{ type: 'giveItem', itemId: 'clearance-card-l1' }],
      next: 'card',
    },
    card: {
      speaker: 'npc',
      text: 'First: your clearance card. Level One. It opens doors that do not matter and logs every door you try that does.',
      next: 'questions',
    },
    reissue: {
      speaker: 'npc',
      text: 'Lost it already? Here. Level One, again. The system logged that too.',
      effects: [{ type: 'giveItem', itemId: 'clearance-card-l1' }],
      next: null,
    },
    questions: {
      speaker: 'npc',
      text: 'Questions? Make them short.',
      options: [
        { text: 'Where do I get proper gear?', next: 'gear' },
        { text: 'What exactly does the Directorate contain here?', next: 'lore' },
        { text: "Understood. I'll get moving.", next: null },
      ],
    },
    gear: {
      speaker: 'npc',
      text: "Locker room, north side of the corridor. Your issue locker is keyed to your card. Vest and visor. Put them on — I don't care how they look on you.",
      next: 'questions',
    },
    lore: {
      speaker: 'npc',
      text: 'Things that should not be. Objects, places, occasionally people. We keep them, we study them, and we make sure they stay where we put them. Your orientation includes a supervised viewing. Try not to stare.',
      next: 'questions',
    },
    reminder: {
      speaker: 'npc',
      text: "Still here? Your orientation checklist is on your HUD, operative. Follow it. The faster you finish, the sooner you're somebody else's problem.",
      options: [
        { text: "I don't have a clearance card.", next: 'reissue', conditions: [{ type: 'lacksItem', itemId: 'clearance-card-l1' }] },
        { text: 'What should I be doing right now?', next: 'hint' },
        { text: 'Goodbye.', next: null },
      ],
    },
    hint: {
      speaker: 'npc',
      text: "Lockers first. Diagnostics next door. Then the observation deck — Dr. Varga's expecting you. After that it's Pell's workshop, Osei's range and Hale's counter, south and east. Anything glowing on your HUD is where you're meant to be.",
      next: null,
    },
    after: {
      speaker: 'npc',
      text: "Heard you made it through. Varga doesn't sign off on many. Don't make me regret the paperwork.",
      next: null,
    },
    idle: { speaker: 'npc', text: 'Move along, operative.', next: null },
  },
};

export const VARGA_DIALOGUE: DialogueDefinition = {
  id: 'varga',
  entries: [
    { node: 'farsideLook', conditions: [{ type: 'questActive', questId: 'the-far-side', stepId: 'consult-varga' }] },
    { node: 'intro', conditions: [{ type: 'questActive', questId: ORIENTATION, stepId: 'meet-varga' }] },
    { node: 'waiting', conditions: [{ type: 'questActive', questId: ORIENTATION, stepId: 'retrieve-sample' }] },
    { node: 'deliver', conditions: [{ type: 'questActive', questId: ORIENTATION, stepId: 'deliver-sample' }] },
    { node: 'after', conditions: [{ type: 'questCompleted', questId: ORIENTATION }] },
    { node: 'notYet' },
  ],
  nodes: {
    farsideLook: {
      speaker: 'npc',
      text: 'Sel sent you. Stand in the light. No, look at the lantern. Just this once.',
      next: 'farsideVision',
    },
    farsideVision: {
      speaker: 'npc',
      text: 'An hour from now you are at the bottom of a shaft, in rust and dark water. Three dead junction boxes. A man in a foreman\'s coat who should not still be walking.',
      next: 'farsideGift',
    },
    farsideGift: {
      speaker: 'npc',
      text: "Take this lens. I ground it from the lantern's housing. Hold it to any dead machine and you'll see where the current wants to go. I've cleared you for the service lift in the Atrium. And {name}: in the vision you were winning. Barely. Train first.",
      effects: [
        { type: 'giveItem', itemId: 'lantern-lens' },
        { type: 'setFlag', flag: 'clearance.undercroft' },
      ],
      next: null,
    },
    intro: {
      speaker: 'npc',
      text: "Ah. The new intake. Stand there — no, there, out of the lantern's sightline. Good. I'm Dr. Ilse Varga, Anomalous Optics.",
      next: 'lantern',
    },
    lantern: {
      speaker: 'npc',
      text: 'Behind the glass is ANM-0447, the Patient Lantern. Anyone who looks into its light sees this room as it will be one hour from now. Usually that is boring. Usually.',
      options: [
        { text: "What happens when it isn't boring?", next: 'unusual' },
        { text: 'What do you need from me?', next: 'task' },
      ],
    },
    unusual: {
      speaker: 'npc',
      text: 'Then we have one hour to make it boring again. That is, broadly, what this entire facility does.',
      next: 'task',
    },
    task: {
      speaker: 'npc',
      text: "I need a resonance sample from the cabinet in the south-west storeroom. It's keyed to orientation staff — you count, for today. Bring it back sealed.",
      next: null,
    },
    waiting: {
      speaker: 'npc',
      text: "The cabinet is in the storeroom, south-west, past the corridor. Sealed sample, please. Don't shake it.",
      next: null,
    },
    deliver: {
      speaker: 'npc',
      text: 'Is that it? Let me see.',
      options: [
        {
          text: 'Hand over the resonance sample.',
          conditions: [{ type: 'hasItem', itemId: 'resonance-sample' }],
          effects: [
            { type: 'takeItem', itemId: 'resonance-sample' },
            { type: 'grantExperience', skill: 'research', amount: 120 },
            { type: 'emitSignal', signal: 'orientation.sample-delivered' },
          ],
          next: 'delivered',
        },
        { text: "I don't have it with me.", conditions: [{ type: 'lacksItem', itemId: 'resonance-sample' }], next: 'waiting' },
      ],
    },
    delivered: {
      speaker: 'npc',
      text: "Warm. Good. It remembers what it saw. Steady hands, {name}. I've authorised your transit card. Before you ride up to the Atrium, Pell wants you in the workshop across the concourse. The lantern says you'll be glad of it.",
      next: null,
    },
    after: {
      speaker: 'npc',
      text: "The lantern showed me you an hour ago, standing exactly there. It's never wrong. That's what worries me.",
      next: null,
    },
    notYet: {
      speaker: 'npc',
      text: "I'm mid-observation cycle. Finish your intake procedures, then come back.",
      next: null,
    },
  },
};

export const PELL_DIALOGUE: DialogueDefinition = {
  id: 'pell',
  entries: [
    { node: 'workshopIntro', conditions: [{ type: 'questActive', questId: 'field-fabrication', stepId: 'meet-pell' }] },
    { node: 'gatherHint', conditions: [{ type: 'questActive', questId: 'field-fabrication', stepId: 'gather' }] },
    { node: 'refineHint', conditions: [{ type: 'questActive', questId: 'field-fabrication', stepId: 'refine' }] },
    { node: 'assembleHint', conditions: [{ type: 'questActive', questId: 'field-fabrication', stepId: 'assemble' }] },
    { node: 'stowHint', conditions: [{ type: 'questActive', questId: 'field-fabrication', stepId: 'stow' }] },
    { node: 'inspect', conditions: [{ type: 'questActive', questId: 'field-fabrication', stepId: 'report' }] },
    { node: 'greeting' },
  ],
  nodes: {
    workshopIntro: {
      speaker: 'npc',
      text: "There you are! Varga said you had steady hands. Good. Welcome to the Intake Workshop. Everything on this site was salvaged, refined and assembled by somebody, and today that somebody is you.",
      next: 'workshopChain',
    },
    workshopChain: {
      speaker: 'npc',
      text: 'Three steps, always. Gather raw stock. Refine it into base parts. Assemble the parts into something useful. You came in with nothing but an undersuit, so that needs fixing. Start with the scrap heaps and textile bins by the north wall, and the moss beds by the south.',
      next: null,
    },
    gatherHint: {
      speaker: 'npc',
      text: "Click a source and keep at it. Salvage gets faster with practice, and every source runs dry for a while if you're greedy. Six scrap, eight offcuts, two moss.",
      next: null,
    },
    refineHint: {
      speaker: 'npc',
      text: "The refinery's the orange one on the east wall. Two raw in, one clean part out. Three alloy plates, four synthweave bolts and a gel base.",
      next: null,
    },
    assembleHint: {
      speaker: 'npc',
      text: 'Fabricator for the trousers, boots and baton; bio-synthesiser for the Medgel. Patterns are loaded; you just feed it parts and keep your fingers clear.',
      next: null,
    },
    stowHint: {
      speaker: 'npc',
      text: "Lovely work. Now, your pack is not a warehouse. Open the storage locker on the west wall. Every locker on site opens onto the same shelves, so whatever you leave here is waiting for you in the Atrium.",
      next: null,
    },
    inspect: {
      speaker: 'npc',
      text: 'Let me see. Balanced grip, clean seal on the ampoule... You made those. Every piece of gear on site can be made like this, if you can find the stock and you have the skill.',
      next: 'tiers',
    },
    tiers: {
      speaker: 'npc',
      text: "The deeper you go, the better the stock, and the angrier the neighbours. Out past the Atrium, the Service Yards have scrap and cloth like this, only guarded. Sector 2 has live conduit and lumen blooms. The Undercroft has smelter slag. The Atrium has a fabrication hall just like this one. Warden Osei is waiting for you on the range, so go and hit something with that baton.",
      next: null,
    },
    greeting: {
      speaker: 'npc',
      text: "Oh! New face. Don't mind me, just doing my rounds. Rounds are important. You'd be amazed what moves when nobody's looking.",
      options: [
        { text: 'What moves?', next: 'moves' },
        { text: 'Any advice for a new operative?', next: 'advice' },
        { text: 'How does crafting work?', next: 'crafting' },
        { text: 'Carry on.', next: null },
      ],
    },
    moves: {
      speaker: 'npc',
      text: "Doors, mostly. Sometimes walls. Once, the corridor got four metres longer overnight. We wrote it up as 'thermal expansion'. Paperwork's easier that way.",
      next: 'greeting',
    },
    crafting: {
      speaker: 'npc',
      text: 'Gather, refine, assemble. Salvage gets the raw stock, Refining turns it into parts, Engineering builds gear, and Biochemistry makes medicine. Every bit of issued kit has a pattern; better kit needs deeper stock.',
      next: 'greeting',
    },
    advice: {
      speaker: 'npc',
      text: "Right-click things. Seriously. Everything in here has more than one way to interact with it, and examining stuff tells you what it actually is. Saved my life twice.",
      next: 'greeting',
    },
  },
};

const LIVE_FIRE = 'live-fire';
const TRANSIT = 'cleared-for-transit';

export const OSEI_DIALOGUE: DialogueDefinition = {
  id: 'osei',
  entries: [
    { node: 'intro', conditions: [{ type: 'questActive', questId: LIVE_FIRE, stepId: 'report-to-osei' }] },
    { node: 'armUp', conditions: [{ type: 'questActive', questId: LIVE_FIRE, stepId: 'arm-up' }] },
    { node: 'drill', conditions: [{ type: 'questActive', questId: LIVE_FIRE, stepId: 'drill' }] },
    { node: 'patchUp', conditions: [{ type: 'questActive', questId: LIVE_FIRE, stepId: 'patch-up' }] },
    { node: 'rest', conditions: [{ type: 'questActive', questId: LIVE_FIRE, stepId: 'rest' }] },
    { node: 'debrief', conditions: [{ type: 'questActive', questId: LIVE_FIRE, stepId: 'debrief' }] },
    { node: 'transit', conditions: [{ type: 'questActive', questId: TRANSIT }] },
    { node: 'notYet', conditions: [{ type: 'questNotStarted', questId: LIVE_FIRE }] },
    { node: 'idle' },
  ],
  nodes: {
    notYet: {
      speaker: 'npc',
      text: "Range is closed to unprocessed intakes. Finish with Varga and Pell first. Then we'll see what you're made of. Briefly.",
      next: null,
    },
    intro: {
      speaker: 'npc',
      text: "Warden Osei. I keep this range and I keep intakes alive long enough to leave it. Pell says you've got a baton. Let's see if you can hold it.",
      options: [
        { text: 'I fabricated my own baton.', conditions: [{ type: 'hasItem', itemId: 'stun-baton' }], next: 'ownBaton' },
        { text: 'Reporting for training.', conditions: [{ type: 'lacksItem', itemId: 'stun-baton' }], next: 'issue' },
      ],
    },
    ownBaton: {
      speaker: 'npc',
      text: 'Good balance. Pell taught you, but you made it. Wield it.',
      next: 'howTo',
    },
    issue: {
      speaker: 'npc',
      text: 'Lost it already? Range spare. Capacitor head, rubber grip, no sense of humour. Wield it.',
      effects: [{ type: 'giveItem', itemId: 'stun-baton' }],
      next: 'howTo',
    },
    howTo: {
      speaker: 'npc',
      text: 'Then step past the hazard line and hit a drone until it stops being upright. They hit back. Gently. Mostly. This gallery is a safe area: nothing hostile follows you up here, here or anywhere marked safe.',
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
      text: 'Trainee dart pistol. Low power, honest accuracy. Marksmanship trains every time a dart lands, same as the baton trains Close Quarters. Work up to five and Requisitions in the Atrium will trust you with a Kestrel.',
      effects: [
        { type: 'giveItem', itemId: 'dart-pistol' },
        { type: 'setFlag', flag: 'kade.issued-dart-pistol' },
      ],
      next: 'howTo',
    },
    armUp: { speaker: 'npc', text: "Baton's in your inventory. Click it to wield. I'll wait. I'm very good at waiting.", next: null },
    drill: { speaker: 'npc', text: "Three drones. The red markers are yours. Click one to engage. If you're hurting, step back into the gallery and breathe.", next: null },
    patchUp: { speaker: 'npc', text: 'Medgel. Inventory. Click it to apply. Into the wound, not the eyes.', next: null },
    rest: {
      speaker: 'npc',
      text: "Medgel costs scrip. Beds don't. Supply Office, north-east, two of them by the window. Lie down, let the canopy work, then come back.",
      next: null,
    },
    debrief: {
      speaker: 'npc',
      text: "Not bad for a first live drill. That's everything Intake can teach you. The rest of the Site is learned the hard way.",
      next: 'leaving',
    },
    leaving: {
      speaker: 'npc',
      text: 'Last stop is Hale in the Supply Office. Buy a transit pass and take the tram up to the Atrium. Sergeant Kade meets every new arrival there. Tell him Osei says you can stand up straight.',
      next: null,
    },
    transit: {
      speaker: 'npc',
      text: 'Hale sells the pass. The tram stop is in the Transit Bay, east end of the concourse. Go on.',
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

export const HALE_DIALOGUE: DialogueDefinition = {
  id: 'hale',
  entries: [
    { node: 'signOff', conditions: [{ type: 'questActive', questId: TRANSIT, stepId: 'see-hale' }] },
    { node: 'pass', conditions: [{ type: 'questActive', questId: TRANSIT, stepId: 'buy-pass' }] },
    { node: 'board', conditions: [{ type: 'questActive', questId: TRANSIT }] },
    { node: 'greeting' },
  ],
  nodes: {
    signOff: {
      speaker: 'npc',
      text: "Supply Clerk Hale. Let me look at you. Vest, visor, boots you made yourself, a baton you've actually swung. Fine. Signed. You're the first this week who didn't ask where the lift was.",
      next: 'trading',
    },
    trading: {
      speaker: 'npc',
      text: "This is a counter, and that means scrip. I sell what you'll need and I buy back what you won't: spare cloth, scrap, medicine. Every shop on site works the same way. You'll want a transit pass before the tram lets you on.",
      options: [{ text: 'Show me what you have.', effects: [{ type: 'openShop', shopId: 'intake-supply' }], next: null }],
    },
    pass: {
      speaker: 'npc',
      text: 'Transit pass. Ten scrip. It tells every tram board on the line that you exist, which is more than the payroll system will.',
      options: [
        { text: 'Show me what you have.', effects: [{ type: 'openShop', shopId: 'intake-supply' }], next: null },
        { text: 'Later.', next: null },
      ],
    },
    board: {
      speaker: 'npc',
      text: "Tram stop's in the Transit Bay, east end. Click the board, pick the Atrium. Don't lean on the doors.",
      next: null,
    },
    greeting: {
      speaker: 'npc',
      text: 'Supply Office. Scrip up front. No refunds on anything that has been anywhere.',
      options: [
        { text: 'Show me what you have.', effects: [{ type: 'openShop', shopId: 'intake-supply' }], next: null },
        { text: 'Goodbye.', next: null },
      ],
    },
  },
};
