import type { DialogueDefinition } from '../../dialogue/dialogue.ts';

const NINTH = 'the-ninth-letter';
const OFFICE = 'dead-letter-office';

export const ODUYA_DIALOGUE: DialogueDefinition = {
  id: 'oduya',
  entries: [
    { node: 'meet', conditions: [{ type: 'questActive', questId: NINTH, stepId: 'oduya' }] },
    { node: 'letter', conditions: [{ type: 'questActive', questId: OFFICE, stepId: 'oduya' }] },
    { node: 'officeProgress', conditions: [{ type: 'questActive', questId: OFFICE }] },
    { node: 'afterWelcomed', conditions: [{ type: 'questCompleted', questId: OFFICE }, { type: 'hasFlag', flag: 'ending.welcomed' }] },
    { node: 'after', conditions: [{ type: 'questCompleted', questId: OFFICE }] },
    { node: 'greeting' },
  ],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: 'Directorate Post, Meridian round. Counter is closed. Counter has been closed for some time.',
      next: null,
    },
    meet: {
      speaker: 'npc',
      text: "A customer. Through the chute, standing up. Courier Oduya, Directorate Post. I carried the founder's letter down to the Array forty years ago, and the outbox carried me here instead. My watch says I arrived a minute ago.",
      next: 'meet2',
    },
    meet2: {
      speaker: 'npc',
      text: "This is where Meridian's post goes. Every letter out, every letter in. The Host kept a clerk to answer them all, so nobody would come looking. 'All quiet here.' 'No need to come.' The Host is gone, {name}, but the clerk never got the memo.",
      next: 'meet3',
    },
    meet3: {
      speaker: 'npc',
      text: "The franking clerks on the Sorting Floor are made of signatures. They've started on yours. Clear them, sort the four pigeonholes that matter, and then go and have a word with the Postmaster in Dispatch.",
      next: null,
    },
    officeProgress: {
      speaker: 'npc',
      text: "Sorting Floor east, Stacks south, Dispatch beyond both. Mind the clerks. If one of them stamps you, check your name is still on you.",
      next: null,
    },
    letter: {
      speaker: 'npc',
      text: "Listen to that. Nothing. No stamping. Forty years I've been waiting for a quiet enough minute to finish my round. Here: the founder's letter, to all eight Sites. It was never delivered. It still needs a countersignature from whoever keeps the door.",
      options: [
        {
          text: "I'll carry it.",
          effects: [
            { type: 'giveItem', itemId: 'founders-letter' },
            { type: 'emitSignal', signal: 'office.letter-taken' },
          ],
          next: 'letterGiven',
        },
        { text: 'Not yet.', next: null },
      ],
    },
    letterGiven: {
      speaker: 'npc',
      text: 'Signed for. You are the courier now. Forty years late is still delivered.',
      next: null,
    },
    afterWelcomed: {
      speaker: 'npc',
      text: "Your guest wrote to me this morning. It apologised for the post. Lovely handwriting. I've decided to stay on until the backlog is cleared. It's a very large backlog.",
      next: null,
    },
    after: {
      speaker: 'npc',
      text: "Quiet here now. I'm returning the backlog to sender, one letter at a time. I estimate forty years. I've done it before.",
      next: null,
    },
  },
};
