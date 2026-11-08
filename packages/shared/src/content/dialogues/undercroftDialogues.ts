import type { DialogueDefinition } from '../../dialogue/dialogue.ts';

const LEECHES = 'leech-season';
const FAR_SIDE = 'the-far-side';

export const MAGS_DIALOGUE: DialogueDefinition = {
  id: 'mags',
  entries: [
    { node: 'deliver', conditions: [{ type: 'questActive', questId: LEECHES, stepId: 'deliver' }] },
    { node: 'greeting' },
  ],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: "Another surface dweller. Mind the heater, mind the leeches, and mind your pockets. I'm Mags. This is my Undercroft.",
      options: [
        { text: "Let's trade.", effects: [{ type: 'openShop', shopId: 'undercroft-swap' }], next: null },
        { text: 'Need any work done?', conditions: [{ type: 'questNotStarted', questId: LEECHES }], next: 'offer' },
        { text: 'How are the leeches?', conditions: [{ type: 'questActive', questId: LEECHES, stepId: 'collect' }], next: 'progress' },
        { text: 'Who are you, really?', next: 'who' },
        { text: 'What do you know about the Foreman?', conditions: [{ type: 'questActive', questId: FAR_SIDE }], next: 'foreman' },
        { text: 'Goodbye.', next: null },
      ],
    },
    who: {
      speaker: 'npc',
      text: "I was Logistics, back when there was a Logistics down here. When they sealed the Undercroft, I didn't get the memo. Or I got it and used it to start a fire. Hard to remember. It was a good fire.",
      next: 'greeting',
    },
    offer: {
      speaker: 'npc',
      text: 'The pipe leeches are breeding in the warrens, south of here. Their sacs make a decent sealant, and my roof leaks in ways roofs should not. Bring me five and I will fit you with a proper respirator.',
      options: [
        { text: "I'll get your sacs.", effects: [{ type: 'startQuest', questId: LEECHES }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    progress: {
      speaker: 'npc',
      text: "Five sacs. They're in the leeches. The leeches are in the warrens. You're very good at this, I can tell.",
      next: 'greeting',
    },
    deliver: {
      speaker: 'npc',
      text: 'Is that... squelching? It is. Hand them over.',
      options: [
        {
          text: 'Hand over five leech sacs.',
          conditions: [{ type: 'hasItem', itemId: 'leech-sac', count: 5 }],
          effects: [
            { type: 'takeItem', itemId: 'leech-sac', count: 5 },
            { type: 'emitSignal', signal: 'leech.delivered' },
          ],
          next: 'thanks',
        },
        { text: 'Not yet.', next: null },
      ],
    },
    thanks: {
      speaker: 'npc',
      text: "Lovely and disgusting. Here, a respirator, gasketed with last month's leeches. It'll keep the worst of the air out. Come back any time; I'm always buying.",
      next: null,
    },
    foreman: {
      speaker: 'npc',
      text: "He ran this level. Clipboard, hard hat, never shouted. When the lockdown hit he stayed to finish the shift. He's still finishing it. Hits like a falling crate, and he doesn't get tired. Bring medgel. Bring friends. Bring something heavier than a baton.",
      next: 'greeting',
    },
  },
};

export const HALVORSEN_DIALOGUE: DialogueDefinition = {
  id: 'halvorsen',
  entries: [
    { node: 'meet', conditions: [{ type: 'questActive', questId: FAR_SIDE, stepId: 'meet-halvorsen' }] },
    { node: 'waiting', conditions: [{ type: 'questActive', questId: FAR_SIDE }] },
    { node: 'councilAssess', conditions: [{ type: 'questActive', questId: 'a-council-of-one', stepId: 'halvorsen' }] },
    { node: 'councilWaiting', conditions: [{ type: 'questActive', questId: 'a-council-of-one' }] },
    { node: 'fireWarning', conditions: [{ type: 'questActive', questId: 'stoking-the-fire', stepId: 'halvorsen' }] },
    { node: 'fireWaiting', conditions: [{ type: 'questActive', questId: 'stoking-the-fire' }] },
    { node: 'answerOpen', conditions: [{ type: 'questActive', questId: 'the-answer', stepId: 'halvorsen' }] },
    { node: 'answerWaiting', conditions: [{ type: 'questActive', questId: 'the-answer' }] },
    { node: 'returnsCountersign', conditions: [{ type: 'questActive', questId: 'return-to-sender', stepId: 'halvorsen' }] },
    { node: 'epilogueWelcomed', conditions: [{ type: 'hasFlag', flag: 'ending.welcomed' }] },
    { node: 'epilogueClosed', conditions: [{ type: 'hasFlag', flag: 'ending.closed' }] },
    { node: 'deepWatching', conditions: [{ type: 'questCompleted', questId: 'a-council-of-one' }] },
    { node: 'after' },
  ],
  nodes: {
    councilAssess: {
      speaker: 'npc',
      text: "Thale sent you. Of course she did. Tell her this: it isn't knocking louder. It's knocking closer. Every year the door is a little thinner, and every year I am a little more of the door.",
      next: 'councilAssess2',
    },
    councilAssess2: {
      speaker: 'npc',
      text: "She wants it closed. You cannot close a door that is a doorbell, {name}. But she won't hear that from me. Perhaps she'll hear it from you, eventually.",
      next: null,
    },
    councilWaiting: {
      speaker: 'npc',
      text: 'Go and tell Thale. She is the sort of person who needs to be told things twice, by two different people, before she believes either.',
      next: null,
    },
    deepWatching: {
      speaker: 'npc',
      text: "Deepwatch has made it noisy here. Drills, footsteps, coffee. The door has been listening to all of it. It likes the coffee.",
      next: null,
    },
    fireWarning: {
      speaker: 'npc',
      text: "She's going to burn it shut. With the reactor. {name}, where do you think the warmth in this room comes from? This door has been warm for forty years.",
      next: 'fireWarning2',
    },
    fireWarning2: {
      speaker: 'npc',
      text: "Go to the reactor if you must. But read whatever the Stoker left behind before you turn anything up.",
      next: null,
    },
    fireWaiting: {
      speaker: 'npc',
      text: 'The door is warmer today. Somebody down there is shovelling faster.',
      next: null,
    },
    answerOpen: {
      speaker: 'npc',
      text: "You've stood here twice now. Once for Sel, once for Thale. The charter was very clear. It isn't knocking for me any more. It's knocking for you.",
      options: [
        { text: "What's on the other side?", next: 'answerOther' },
        { text: 'Open it.', next: 'answerStep' },
      ],
    },
    answerOther: {
      speaker: 'npc',
      text: 'Meridian. The other one. The one we have been feeding. My team is there, or what it made of them. And the Host, who has been very, very patient.',
      next: 'answerOpen',
    },
    answerStep: {
      speaker: 'npc',
      text: "I've held it shut so long I forgot it has a handle. There. It's open. Go through, {name}. And remember what I told you: when it knocks for you, do not answer alone. Take the lanterns' light with you.",
      next: null,
    },
    answerWaiting: {
      speaker: 'npc',
      text: 'The door is open. I can feel the draught on my back. Go on. I will be right here. I am always right here.',
      next: null,
    },
    epilogueClosed: {
      speaker: 'npc',
      text: "It's just a door now. I keep putting my hand on it. It's cold. It's wonderful. I think I might go upstairs. I think I might have a coffee.",
      next: null,
    },
    returnsCountersign: {
      speaker: 'npc',
      text: "That's the founder's hand. I'd know it anywhere; it's on every page of the charter. What does it want from me?",
      options: [
        {
          text: 'It needs the signature of whoever keeps the door.',
          conditions: [{ type: 'hasItem', itemId: 'founders-letter' }],
          effects: [
            { type: 'takeItem', itemId: 'founders-letter' },
            { type: 'giveItem', itemId: 'countersigned-letter' },
            { type: 'emitSignal', signal: 'returns.countersigned' },
          ],
          next: 'returnsSigned',
        },
        { text: "I don't have it on me.", next: null },
      ],
    },
    returnsSigned: {
      speaker: 'npc',
      text: "'Do not wait for us. We have told it not yet. Somebody will have to tell it something else.' Forty years, and the other Sites never even knew it was knocking. There. Keeper of the Door. I suppose I was. Send it before I change my mind about anything.",
      next: null,
    },
    epilogueWelcomed: {
      speaker: 'npc',
      text: "It came through so carefully. It apologised to me for the forty years. Nobody has ever apologised to me for anything. I don't know what to do with my hands.",
      next: null,
    },
    meet: {
      speaker: 'npc',
      text: 'You came through the Undercroft. Of course you did. The lantern showed me you an hour ago. Or a year ago. Time is soft here.',
      options: [
        { text: "Dr. Halvorsen? You're alive.", next: 'alive' },
        { text: 'What is this place?', next: 'place' },
      ],
    },
    alive: {
      speaker: 'npc',
      text: "Alive is a strong word. Present, certainly. My team answered the door. I'm the one who stayed to keep it shut.",
      next: 'door',
    },
    place: {
      speaker: 'npc',
      text: "Sector 3 isn't a sector. It's the room behind every door the Directorate ever sealed. The Knock is not a door. It's a doorbell.",
      next: 'door',
    },
    door: {
      speaker: 'npc',
      text: 'Tell Sel this: something on the far side has been knocking politely for forty years. Politely is ending. It wants an answer, and the Directorate is going to have to decide what that answer is.',
      options: [
        { text: "I'll tell her.", next: null },
        { text: 'Come back with me.', next: 'stay' },
      ],
    },
    stay: {
      speaker: 'npc',
      text: 'If I step away, it opens. Go. Tell her. And {name}, when it knocks for you, and it will, do not answer alone.',
      next: null,
    },
    waiting: {
      speaker: 'npc',
      text: "Sel is waiting for my message. So, in its way, is the door. Don't keep either of them too long.",
      next: null,
    },
    after: {
      speaker: 'npc',
      text: 'Still here. Still keeping it shut. Bring something warm next time. It never gets warm here.',
      next: null,
    },
  },
};
