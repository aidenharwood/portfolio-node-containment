import type { QuestDefinition } from '../../quests/questDefinition.ts';

export const THE_NINTH_LETTER: QuestDefinition = {
  id: 'the-ninth-letter',
  name: 'The Ninth Letter',
  category: 'main',
  offeredBy: 'archivist-sel',
  offerRequires: ['the-answer'],
  recommendedLevel: 34,
  summary:
    'Eight Sites wrote back after the answer. Nine letters arrived. The ninth is addressed to you, signed in your hand, and franked by the Signal Array this morning.',
  steps: [
    {
      id: 'achterberg',
      journal: 'The ninth letter carries a Signal Array frank. Officer Achterberg sends every letter that leaves Meridian. He should know where this one came from.',
      objectives: [{ type: 'signal', signal: 'ninth.traced', npcId: 'officer-achterberg', label: 'Show Achterberg the ninth letter' }],
      onComplete: [
        { type: 'setFlag', flag: 'returns.chute-open' },
        { type: 'notify', text: 'Behind the outbox in the Operator Pit, the air has creased like a folded envelope.' },
      ],
    },
    {
      id: 'through',
      journal: 'The Array outbox has a return chute nobody built. It opens in the Operator Pit, on the east wall. Whatever franked the ninth letter is on the other side.',
      objectives: [{ type: 'enterArea', districtId: 'dead-letter-office', areaId: 'franking-hall', label: 'Climb through the return chute' }],
    },
    {
      id: 'oduya',
      journal: 'A franking hall full of letters that were never delivered. Someone at the counter is still on shift.',
      objectives: [{ type: 'talkTo', npcId: 'courier-oduya', label: 'Speak with the courier at the counter' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: 1500 },
    { type: 'grantExperience', skill: 'research', amount: 3000 },
    { type: 'grantExperience', skill: 'containment', amount: 2500 },
  ],
  rewardSummary: ['1,500 Meridian Scrip', '3,000 Research XP', '2,500 Containment XP'],
  followUpQuestId: 'dead-letter-office',
};

export const DEAD_LETTER_OFFICE: QuestDefinition = {
  id: 'dead-letter-office',
  name: 'The Dead Letter Office',
  category: 'main',
  recommendedLevel: 36,
  summary:
    "For forty years every letter between Meridian and the other eight Sites came here instead, and the Office wrote the replies. With the Host gone, nobody is telling it to stop. It has started signing your name.",
  steps: [
    {
      id: 'clerks',
      journal: 'Courier Oduya says the franking clerks on the Sorting Floor are made of signatures. Clear them before they finish learning mine.',
      objectives: [{ type: 'defeat', creatureId: 'franking-clerk', count: 6, label: 'Put down franking clerks' }],
    },
    {
      id: 'sort',
      journal: 'Four pigeonholes hold the post that matters: two on the Sorting Floor, two in the Dead Letter Stacks. Sorted, they will show who really wrote what.',
      objectives: [{ type: 'interactWith', objectId: 'pigeonhole', count: 4, label: 'Sort the dead letters' }],
    },
    {
      id: 'postmaster',
      journal: 'Every pigeonhole is stamped with the same initials: P.M. The Postmaster is in Dispatch, south of the Sorting Floor, signing. A Containment Seal Mk.V or better will hold it.',
      objectives: [{ type: 'contain', creatureId: 'the-postmaster', count: 1, label: 'Contain the Postmaster' }],
    },
    {
      id: 'engine',
      journal: 'The Postmaster is sealed, but the franking engine in Dispatch is still stamping letters in my handwriting.',
      objectives: [{ type: 'interactWith', objectId: 'franking-engine', label: 'Stop the franking engine' }],
    },
    {
      id: 'oduya',
      journal: 'The Office is quiet. Oduya has one letter left that has been waiting forty years for a courier.',
      objectives: [{ type: 'signal', signal: 'office.letter-taken', npcId: 'courier-oduya', label: "Take the founder's letter from Oduya" }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'threshold-elixir', count: 3 },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 3000 },
    { type: 'grantExperience', skill: 'fortitude', amount: 4000 },
    { type: 'grantExperience', skill: 'closeQuarters', amount: 3500 },
    { type: 'grantExperience', skill: 'marksmanship', amount: 3500 },
  ],
  rewardSummary: ['3 Threshold Elixirs', '3,000 Meridian Scrip', '4,000 Fortitude XP', '3,500 Close Quarters XP', '3,500 Marksmanship XP'],
  followUpQuestId: 'return-to-sender',
};

export const RETURN_TO_SENDER: QuestDefinition = {
  id: 'return-to-sender',
  name: 'Return to Sender',
  category: 'main',
  recommendedLevel: 36,
  summary:
    "The founder wrote to the other eight Sites the night the Knock first knocked. The letter never left Meridian. It is forty years late, and it still needs a countersignature.",
  steps: [
    {
      id: 'halvorsen',
      journal: "The founder's letter asks for the signature of whoever is keeping the door. That has been Halvorsen for forty years. She is at the Knock in Sector 3.",
      objectives: [{ type: 'signal', signal: 'returns.countersigned', npcId: 'dr-halvorsen', label: 'Have Halvorsen countersign the letter' }],
    },
    {
      id: 'send',
      journal: 'Countersigned. Achterberg can put it on a real relay this time, one that goes up instead of down.',
      objectives: [{ type: 'signal', signal: 'returns.sent', npcId: 'officer-achterberg', label: 'Have Achterberg send the letter' }],
    },
    {
      id: 'sel',
      journal: 'The letter is out. Eight Sites are about to learn the truth, forty years late. Sel keeps the file.',
      objectives: [{ type: 'signal', signal: 'returns.reported', npcId: 'archivist-sel', label: 'Tell Sel the letter is sent' }],
      onComplete: [{ type: 'setFlag', flag: 'storyline.act-three-complete' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: 6000 },
    { type: 'grantExperience', skill: 'containment', amount: 6000 },
    { type: 'grantExperience', skill: 'research', amount: 4000 },
    { type: 'grantExperience', skill: 'fortitude', amount: 3000 },
  ],
  rewardSummary: ['6,000 Meridian Scrip', '6,000 Containment XP', '4,000 Research XP', '3,000 Fortitude XP'],
};

export const ACT_THREE_MAIN_QUESTS: readonly QuestDefinition[] = [THE_NINTH_LETTER, DEAD_LETTER_OFFICE, RETURN_TO_SENDER];
