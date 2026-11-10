import type { QuestDefinition } from '../../quests/questDefinition.ts';
import { CALDER_GATE_FLAG } from '../calderObjects.ts';

export const POSTMARKED: QuestDefinition = {
  id: 'postmarked',
  name: 'Postmarked',
  category: 'main',
  offeredBy: 'archivist-sel',
  offerRequires: ['return-to-sender'],
  recommendedLevel: 40,
  summary: 'One of the eight replies is crusted in salt and postmarked CALDER. It did not come by relay. It came through the Waterworks wall, and it asks who we are.',
  steps: [
    {
      id: 'ngata',
      journal: "Sel says the Calder letter came up through the Waterworks. Pumpwright Ngata knows every wall down there, and which ones weep.",
      objectives: [{ type: 'signal', signal: 'calder.ngata-asked', npcId: 'pumpwright-ngata', label: 'Ask Ngata about the salt wall' }],
    },
    {
      id: 'causeway',
      journal: "Ngata says the culvert at the east end of the filter beds was never bricked up, only left off every plan. Past it, a salt road runs east into the dark.",
      objectives: [{ type: 'enterArea', districtId: 'calder-causeway', areaId: 'causeway', label: 'Walk the Calder Causeway' }],
    },
    {
      id: 'crawlers',
      journal: 'The causeway opens onto brine galleries, and the brine pans are crawling with salt-crusted crabs. Clear a way through.',
      objectives: [{ type: 'defeat', creatureId: 'brine-crawler', count: 6, label: 'Defeat brine crawlers' }],
    },
    {
      id: 'intercom',
      journal: 'At the far end of the galleries a blast door is stencilled CALDER — GATEHOUSE. There is an intercom beside it.',
      objectives: [{ type: 'interactWith', objectId: 'calder-gate-intercom', label: 'Call the Calder gatehouse' }],
      onComplete: [{ type: 'setFlag', flag: CALDER_GATE_FLAG }],
    },
    {
      id: 'brandt',
      journal: 'Someone is alive in there, and they opened the door. Their warden wants to see the letter.',
      objectives: [{ type: 'signal', signal: 'calder.met-brandt', npcId: 'warden-brandt', label: 'Give Warden Brandt the Calder letter' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: 2500 },
    { type: 'grantExperience', skill: 'fortitude', amount: 4000 },
    { type: 'grantExperience', skill: 'research', amount: 3000 },
  ],
  rewardSummary: ['2,500 Meridian Scrip', '4,000 Fortitude XP', '3,000 Research XP'],
};

export const SALT_OF_THE_EARTH: QuestDefinition = {
  id: 'salt-of-the-earth',
  name: 'Salt of the Earth',
  category: 'main',
  offeredBy: 'warden-brandt',
  offerRequires: ['postmarked'],
  recommendedLevel: 44,
  summary: 'Calder sealed its galleries forty years ago with three shifts still underground. Warden Brandt has kept their names on the gatehouse log ever since, and the shifts never clocked off.',
  steps: [
    {
      id: 'tallies',
      journal: 'Each of the three lost shifts left a tally board in the Drifts, south of the gate approach. Brandt wants the names copied down.',
      objectives: [
        { type: 'interactWith', objectId: 'calder-tally-a', label: 'Copy the Shift A tally' },
        { type: 'interactWith', objectId: 'calder-tally-b', label: 'Copy the Shift B tally' },
        { type: 'interactWith', objectId: 'calder-tally-c', label: 'Copy the Shift C tally' },
      ],
    },
    {
      id: 'wights',
      journal: 'The miners are still down there, after a fashion. Brandt asks that the shift be ended properly.',
      objectives: [{ type: 'defeat', creatureId: 'salt-wight', count: 8, label: 'End the shift for salt wights' }],
    },
    {
      id: 'report',
      journal: 'Three tallies, and a shift laid to rest. Brandt is in the gatehouse.',
      objectives: [{ type: 'signal', signal: 'calder.tallies-reported', npcId: 'warden-brandt', label: 'Bring Brandt the tallies' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: 3000 },
    { type: 'giveItem', itemId: 'salt-poultice', count: 5 },
    { type: 'grantExperience', skill: 'fortitude', amount: 4500 },
    { type: 'grantExperience', skill: 'research', amount: 3500 },
  ],
  rewardSummary: ['3,000 Meridian Scrip', '5 Salt Poultices', '4,500 Fortitude XP', '3,500 Research XP'],
};

export const CATHEDRAL_OF_SALT: QuestDefinition = {
  id: 'cathedral-of-salt',
  name: 'Cathedral of Salt',
  category: 'main',
  offeredBy: 'warden-brandt',
  offerRequires: ['salt-of-the-earth'],
  recommendedLevel: 48,
  summary: "Calder's last director went down to the deepest gallery to listen to the salt, and did not stop. The gallery became a cathedral. Brandt wants it to be a gallery again.",
  steps: [
    {
      id: 'nave',
      journal: 'Brandt has unsealed the far door of the gatehouse. The salt cathedral lies beyond it, and the nave steps are just inside.',
      objectives: [{ type: 'enterArea', districtId: 'salt-cathedral', areaId: 'nave-steps', label: 'Climb the nave steps' }],
    },
    {
      id: 'bishop',
      journal: 'The nave door has been cracked open. The thing at the altar was Calder\'s director once. It is the Salt Bishop now.',
      objectives: [{ type: 'defeat', creatureId: 'the-salt-bishop', count: 1, label: 'Defeat the Salt Bishop' }],
    },
    {
      id: 'report',
      journal: 'The hymn has stopped. Brandt will want to write it in the log.',
      objectives: [{ type: 'signal', signal: 'calder.bishop-reported', npcId: 'warden-brandt', label: 'Report to Warden Brandt' }],
      onComplete: [{ type: 'setFlag', flag: 'storyline.act-four-calder-complete' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: 6000 },
    { type: 'grantExperience', skill: 'containment', amount: 6000 },
    { type: 'grantExperience', skill: 'fortitude', amount: 5000 },
    { type: 'grantExperience', skill: 'research', amount: 4000 },
  ],
  rewardSummary: ['6,000 Meridian Scrip', '6,000 Containment XP', '5,000 Fortitude XP', '4,000 Research XP'],
};

export const ACT_FOUR_CALDER_QUESTS: readonly QuestDefinition[] = [POSTMARKED, SALT_OF_THE_EARTH, CATHEDRAL_OF_SALT];
