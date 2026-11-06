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
    { node: 'after' },
  ],
  nodes: {
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
