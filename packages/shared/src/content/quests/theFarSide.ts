import type { QuestDefinition } from '../../quests/questDefinition.ts';

export const THE_FAR_SIDE: QuestDefinition = {
  id: 'the-far-side',
  name: 'The Far Side',
  category: 'main',
  recommendedLevel: 8,
  summary:
    "Halvorsen's log points beneath the Atrium, into the abandoned Undercroft and through a seal that should open onto bedrock. Sector 3 is down there. So, perhaps, is Dr. Halvorsen.",
  steps: [
    {
      id: 'consult-varga',
      journal: "Sel wants Dr. Varga to look at my next hour through the Patient Lantern before I spend it. Varga is on the Intake Wing's observation deck.",
      objectives: [{ type: 'talkTo', npcId: 'dr-varga', label: 'Consult Dr. Varga' }],
    },
    {
      id: 'descend',
      journal: 'Varga authorised me for the service lift in the south-east corner of the Atrium. It goes down to the Undercroft.',
      objectives: [{ type: 'enterArea', zoneId: 'undercroft', areaId: 'landing', label: 'Descend to the Undercroft' }],
    },
    {
      id: 'restore-power',
      journal: 'The Undercroft is dead. Three junction boxes need restoring: one in the junction room to the north-east, one in the pump hall, and one at the end of the east service corridor. The Lantern Lens shows the way the current wants to go.',
      objectives: [{ type: 'interactWith', objectId: 'junction-box', count: 3, label: 'Restore junction boxes' }],
      onComplete: [
        { type: 'setFlag', flag: 'undercroft.power-restored' },
        { type: 'notify', text: 'Somewhere to the south-east, a heavy machine groans awake. Something in the workshop has noticed.' },
      ],
    },
    {
      id: 'the-foreman',
      journal: "Power is flowing, but the Sector 3 seal won't open while the workshop is drawing on the circuit. The Foreman is still at his post. If I'm not ready, Mags sells better kit.",
      objectives: [{ type: 'defeat', creatureId: 'the-foreman', count: 1, label: 'Put down the Foreman' }],
      onComplete: [{ type: 'setFlag', flag: 'undercroft.foreman-down' }],
    },
    {
      id: 'cross-threshold',
      journal: "The workshop is quiet. The seal on the workshop's east wall should open now.",
      objectives: [{ type: 'enterArea', zoneId: 'sector-three', areaId: 'threshold', label: 'Cross into Sector 3' }],
    },
    {
      id: 'meet-halvorsen',
      journal: 'There is someone standing in front of the door.',
      objectives: [{ type: 'talkTo', npcId: 'dr-halvorsen', label: 'Speak with Dr. Halvorsen' }],
    },
    {
      id: 'report',
      journal: "Halvorsen gave me a message for Sel. I don't think I want to be the one carrying it.",
      objectives: [{ type: 'signal', signal: 'farside.reported', npcId: 'archivist-sel', label: 'Report to Archivist Sel' }],
      onComplete: [{ type: 'setFlag', flag: 'storyline.halvorsen-found' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: 250 },
    { type: 'grantExperience', skill: 'containment', amount: 800 },
    { type: 'grantExperience', skill: 'research', amount: 500 },
    { type: 'grantExperience', skill: 'fortitude', amount: 300 },
  ],
  rewardSummary: ['250 Meridian Scrip', '800 Containment XP', '500 Research XP', '300 Fortitude XP'],
};
