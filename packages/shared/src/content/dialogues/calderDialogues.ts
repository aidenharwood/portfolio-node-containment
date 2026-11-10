import type { DialogueDefinition } from '../../dialogue/dialogue.ts';
import { CALDER_NAVE_FLAG } from '../calderObjects.ts';

const POSTMARKED = 'postmarked';
const SALT = 'salt-of-the-earth';
const CATHEDRAL = 'cathedral-of-salt';
const RATIONS = 'short-rations';
const GALLERY = 'the-lowest-gallery';
const CLOCKING = 'clocking-off';

export const BRANDT_DIALOGUE: DialogueDefinition = {
  id: 'brandt',
  entries: [
    { node: 'letterDeliver', conditions: [{ type: 'questActive', questId: POSTMARKED, stepId: 'brandt' }] },
    { node: 'talliesDeliver', conditions: [{ type: 'questActive', questId: SALT, stepId: 'report' }] },
    { node: 'bishopDeliver', conditions: [{ type: 'questActive', questId: CATHEDRAL, stepId: 'report' }] },
    { node: 'galleryDeliver', conditions: [{ type: 'questActive', questId: GALLERY, stepId: 'report' }] },
    { node: 'clockingDeliver', conditions: [{ type: 'questActive', questId: CLOCKING, stepId: 'report' }] },
    { node: 'greeting' },
  ],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: 'Brandt, Warden of the Calder gatehouse. Forty years I have written "no arrivals" in this log. I have had to start a new column for you.',
      options: [
        { text: 'What is Calder?', next: 'calder' },
        {
          text: 'Is there anything Calder needs?',
          conditions: [{ type: 'questCompleted', questId: POSTMARKED }, { type: 'questNotStarted', questId: SALT }],
          next: 'saltOffer',
        },
        { text: 'About the lost shifts.', conditions: [{ type: 'questActive', questId: SALT }], next: 'saltProgress' },
        {
          text: 'What is that hymn?',
          conditions: [{ type: 'questCompleted', questId: SALT }, { type: 'questNotStarted', questId: CATHEDRAL }],
          next: 'cathedralOffer',
        },
        { text: 'About the cathedral.', conditions: [{ type: 'questActive', questId: CATHEDRAL }], next: 'cathedralProgress' },
        { text: 'How is Calder now?', conditions: [{ type: 'questCompleted', questId: CATHEDRAL }], next: 'after' },
        {
          text: 'Why does the lift bell keep ringing?',
          conditions: [{ type: 'questCompleted', questId: SALT }, { type: 'questNotStarted', questId: GALLERY }],
          next: 'galleryOffer',
        },
        { text: 'About the lowest gallery.', conditions: [{ type: 'questActive', questId: GALLERY }], next: 'galleryProgress' },
        {
          text: 'Is the log closed?',
          conditions: [{ type: 'questCompleted', questId: GALLERY }, { type: 'questNotStarted', questId: CLOCKING }],
          next: 'clockingOffer',
        },
        { text: "About Ostrava's card.", conditions: [{ type: 'questActive', questId: CLOCKING }], next: 'clockingProgress' },
        { text: 'Goodbye.', next: null },
      ],
    },
    calder: {
      speaker: 'npc',
      text: 'A salt mine with a containment Site dug into the bottom of it, or the other way round, depending who you ask. We sealed the galleries forty years ago, the night the salt started singing. Three shifts were still down. We have been writing to Meridian every month since. You never once wrote back about the singing.',
      next: 'greeting',
    },
    letterDeliver: {
      speaker: 'npc',
      text: 'Our letter. You actually brought it back. We assumed the drains ate them. So: who are you? No, do not answer yet, I want to write it down properly. Meridian. Neighbours. Forty years and a culvert away.',
      options: [
        {
          text: 'We are Meridian, and we are sorry it took so long.',
          effects: [{ type: 'takeItem', itemId: 'calder-letter' }, { type: 'emitSignal', signal: 'calder.met-brandt' }],
          next: null,
        },
      ],
    },
    saltOffer: {
      speaker: 'npc',
      text: 'Three shifts went down and never clocked off. Their tally boards are still in the Drifts, south of the gate approach. Copy me the names so the log is right. And the miners... they are still working. Somebody should tell them the shift is over. Eight of them, at least, so the rest hear it.',
      options: [
        { text: "I'll end the shift.", effects: [{ type: 'startQuest', questId: SALT }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    saltProgress: {
      speaker: 'npc',
      text: 'Three tally boards in the Drifts, then the shift itself. The wights still carry their lamps. Look for the lights.',
      next: 'greeting',
    },
    talliesDeliver: {
      speaker: 'npc',
      text: 'One hundred and twenty names. I knew most of them. I am going to write "clocked off" next to every one, in ink this time, and then I am going to sit down for a while.',
      options: [{ text: 'Take your time.', effects: [{ type: 'emitSignal', signal: 'calder.tallies-reported' }], next: null }],
    },
    cathedralOffer: {
      speaker: 'npc',
      text: 'Director Halloran went down to the deepest gallery to listen to the salt, and never stopped listening. The gallery grew into a cathedral around him. The hymn is him. I have kept the far door sealed for forty years. I am unsealing it now, for you. Please make the singing stop.',
      options: [
        { text: 'I will.', effects: [{ type: 'startQuest', questId: CATHEDRAL }, { type: 'setFlag', flag: CALDER_NAVE_FLAG }], next: null },
        { text: 'Not yet.', next: 'greeting' },
      ],
    },
    cathedralProgress: {
      speaker: 'npc',
      text: 'Through the far door, up the nave steps, and in through the nave. Halloran will be at the altar. He was always at the altar, even before there was one.',
      next: 'greeting',
    },
    bishopDeliver: {
      speaker: 'npc',
      text: 'It is quiet. I had forgotten what the gatehouse sounds like when it is quiet. Halloran would have liked you, before. I will write it in the log, and then I will write to Meridian, and this time I will walk it there myself.',
      options: [{ text: 'We will be expecting you.', effects: [{ type: 'emitSignal', signal: 'calder.bishop-reported' }], next: null }],
    },
    galleryOffer: {
      speaker: 'npc',
      text: "Foreman Ostrava. He swore he would not come up until every miner was up, and he is a man of his word. The lift goes to the lowest gallery. I have unlocked it. Thin out his shift, then find him in his office. Tell him from me that he can stop.",
      options: [
        { text: "I'll go down.", effects: [{ type: 'startQuest', questId: GALLERY }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    galleryProgress: {
      speaker: 'npc',
      text: 'The gallery lift is by the east door. His office is at the very bottom of the workings. You will hear him before you see him. He counts.',
      next: 'greeting',
    },
    galleryDeliver: {
      speaker: 'npc',
      text: 'The bell has stopped. Forty years I have listened to that bell. Ostrava kept his word longer than anyone should have to.',
      options: [{ text: 'He can rest now.', effects: [{ type: 'emitSignal', signal: 'calder.foreman-reported' }], next: null }],
    },
    clockingOffer: {
      speaker: 'npc',
      text: "Not yet. This is Ostrava's card. Forty years and never stamped. The shift clock is still in his office. Clock him off, on his own clock, and I can close the log.",
      options: [
        { text: "I'll clock him off.", effects: [{ type: 'startQuest', questId: CLOCKING }, { type: 'giveItem', itemId: 'foremans-card' }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    clockingProgress: {
      speaker: 'npc',
      text: 'The time clock is in the corner of his office, down the gallery lift. Push the card in until it thunks.',
      next: 'greeting',
    },
    clockingDeliver: {
      speaker: 'npc',
      text: '"Clocked off." I have written it under every one of their names. That is the first time in forty years this log has balanced.',
      options: [{ text: 'Close the log.', effects: [{ type: 'emitSignal', signal: 'calder.shift-clocked-off' }], next: null }],
    },
    after: {
      speaker: 'npc',
      text: 'Quiet, and open. Sorrel is selling stores to people who walked in through the front door. I keep writing "arrival" in the log and then just looking at it.',
      next: 'greeting',
    },
  },
};

export const SORREL_DIALOGUE: DialogueDefinition = {
  id: 'sorrel',
  entries: [
    { node: 'rationsDeliver', conditions: [{ type: 'questActive', questId: RATIONS, stepId: 'deliver' }] },
    { node: 'greeting' },
  ],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: 'Commissary. Brine steel, salt weave, poultices, and forty years of patience. What are you short of?',
      options: [
        { text: "Let's trade.", effects: [{ type: 'openShop', shopId: 'calder-commissary' }], next: null },
        {
          text: 'What are you short of?',
          conditions: [{ type: 'questCompleted', questId: POSTMARKED }, { type: 'questNotStarted', questId: RATIONS }],
          next: 'rationsOffer',
        },
        { text: 'About those stores.', conditions: [{ type: 'questActive', questId: RATIONS }], next: 'rationsProgress' },
        { text: 'How has Calder lasted forty years?', next: 'rations' },
        { text: 'Goodbye.', next: null },
      ],
    },
    rationsOffer: {
      speaker: 'npc',
      text: 'Fresh anything. Bring me six fists of rock salt from the gallery seams, and four plates of crawler shell. Salt for keeping, crab for eating. Calder has not had crab since before the galleries closed.',
      options: [
        { text: "I'll stock you up.", effects: [{ type: 'startQuest', questId: RATIONS }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    rationsProgress: {
      speaker: 'npc',
      text: 'Six rock salt and four carapace. The seams glow pink in the galleries, and the crawlers will find you.',
      next: 'greeting',
    },
    rationsDeliver: {
      speaker: 'npc',
      text: 'Look at that. Real crab. I am going to make a soup so salty the Bishop would have approved. Here, for your trouble.',
      options: [
        {
          text: 'Enjoy the soup.',
          conditions: [{ type: 'hasItem', itemId: 'rock-salt', count: 6 }, { type: 'hasItem', itemId: 'crawler-carapace', count: 4 }],
          effects: [{ type: 'takeItem', itemId: 'rock-salt', count: 6 }, { type: 'takeItem', itemId: 'crawler-carapace', count: 4 }, { type: 'emitSignal', signal: 'calder.rations-delivered' }],
          next: null,
        },
        { text: 'I will come back with the rest.', next: null },
      ],
    },
    rations: {
      speaker: 'npc',
      text: 'Salt keeps. That is the whole secret. Salt keeps food, salt keeps wounds clean, and salt, it turns out, keeps people. Mostly the right way.',
      next: 'greeting',
    },
  },
};
