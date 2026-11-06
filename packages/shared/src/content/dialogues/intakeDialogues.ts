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
      next: 'card',
    },
    card: {
      speaker: 'npc',
      text: 'First: your clearance card. Level One. It opens doors that do not matter and logs every door you try that does.',
      effects: [{ type: 'giveItem', itemId: 'clearance-card-l1' }],
      next: 'questions',
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
        { text: 'What should I be doing right now?', next: 'hint' },
        { text: 'Goodbye.', next: null },
      ],
    },
    hint: {
      speaker: 'npc',
      text: "Lockers first. Diagnostics next door. Then the observation deck — Dr. Varga's expecting you. Storeroom's south-west if she sends you fetching.",
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
    { node: 'cleared', conditions: [{ type: 'questActive', questId: ORIENTATION, stepId: 'transit' }] },
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
      text: "Warm. Good. It remembers what it saw. Steady hands, {name}. I've authorised your transit card — take the lift in the south-east bay up to the Atrium and report for assignment.",
      next: null,
    },
    cleared: {
      speaker: 'npc',
      text: 'The lift is in the south-east bay. Go on. The lantern already showed me you leaving.',
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
    { node: 'inspect', conditions: [{ type: 'questActive', questId: 'field-fabrication', stepId: 'report' }] },
    { node: 'greeting' },
  ],
  nodes: {
    workshopIntro: {
      speaker: 'npc',
      text: "There you are! Varga said you had steady hands. Good. Everything on this site was salvaged, refined and assembled by somebody, and today that somebody is you.",
      next: 'workshopChain',
    },
    workshopChain: {
      speaker: 'npc',
      text: 'Three steps, always. Gather raw stock. Refine it into base parts. Assemble the parts into something useful. You came in with nothing but an undersuit, so that needs fixing. Start with the scrap heaps, the textile bin and the moss bed.',
      next: null,
    },
    gatherHint: {
      speaker: 'npc',
      text: "Click a source and keep at it. Salvage gets faster with practice, and every source runs dry for a while if you're greedy. Six scrap, eight offcuts, two moss.",
      next: null,
    },
    refineHint: {
      speaker: 'npc',
      text: "The refinery's the orange one. Two raw in, one clean part out. Three alloy plates, four synthweave bolts and a gel base.",
      next: null,
    },
    assembleHint: {
      speaker: 'npc',
      text: 'Fabricator for the trousers, boots and baton; bio-synthesiser for the Medgel. Patterns are loaded; you just feed it parts and keep your fingers clear.',
      next: null,
    },
    inspect: {
      speaker: 'npc',
      text: 'Let me see. Balanced grip, clean seal on the ampoule... You made those. Every piece of gear on site can be made like this, if you can find the stock and you have the skill.',
      next: 'tiers',
    },
    tiers: {
      speaker: 'npc',
      text: "The deeper you go, the better the stock. Sector 2 has live conduit and lumen blooms. The Undercroft has smelter slag. Anything you don't need to carry goes in personal storage: the lockers by Requisitions and in the Undercroft camp share the same shelves. Sergeant Kade is waiting for you on the range, so go and hit something with that baton.",
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

export const OSEI_DIALOGUE: DialogueDefinition = {
  id: 'osei',
  entries: [
    { node: 'cleared', conditions: [{ type: 'hasFlag', flag: 'clearance.atrium-transit' }] },
    { node: 'locked' },
  ],
  nodes: {
    locked: {
      speaker: 'npc',
      text: "Lift's locked to cleared personnel. Get Dr. Varga's sign-off. Then we'll talk. Briefly.",
      next: null,
    },
    cleared: {
      speaker: 'npc',
      text: "You're cleared. Lift's yours. Atrium's up top. Mind the gap; it's bigger than it looks.",
      next: null,
    },
  },
};
