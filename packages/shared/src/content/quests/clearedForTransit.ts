import type { QuestDefinition } from '../../quests/questDefinition.ts';

export const CLEARED_FOR_TRANSIT: QuestDefinition = {
  id: 'cleared-for-transit',
  name: 'Cleared for Transit',
  category: 'tutorial',
  summary:
    'You can make your own kit and you can use it. All that stands between you and the rest of Site Meridian is a supply clerk, a transit pass and a tram.',
  steps: [
    {
      id: 'see-hale',
      journal: 'Nobody rides out of Intake until Supply Clerk Hale has signed off their kit. Hale works the Supply Office at the east end of the wing.',
      objectives: [{ type: 'talkTo', npcId: 'supply-clerk-hale', label: 'Speak with Supply Clerk Hale' }],
    },
    {
      id: 'buy-pass',
      journal:
        "Hale sells transit passes for scrip. I can trade from Hale's conversation, or right-click Hale and choose Trade. Shops buy back spare materials too.",
      objectives: [{ type: 'obtainItem', itemId: 'transit-pass', count: 1, label: 'Buy a transit pass' }],
      onComplete: [
        { type: 'discoverStation', stationId: 'atrium-transit' },
        { type: 'notify', text: 'The pass chirps. Atrium Transit Bay now shows on every tram board you use.' },
      ],
    },
    {
      id: 'board',
      journal: 'The tram waits at the platform off the Transit Bay, at the west end of the concourse. Boarding it shows every station I have found. The world map (M) shows every line.',
      objectives: [{ type: 'interactWith', objectId: 'tram-car-door', label: 'Board the tram' }],
    },
    {
      id: 'ride',
      journal: 'Choose Atrium Transit Bay from the tram destinations and ride up to the Meridian Atrium.',
      objectives: [{ type: 'enterArea', districtId: 'meridian-atrium', areaId: 'tram-terminal', label: 'Ride the tram to the Atrium' }],
      onComplete: [{ type: 'takeItem', itemId: 'transit-pass' }],
    },
  ],
  rewards: [
    { type: 'grantExperience', skill: 'containment', amount: 60 },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 25 },
  ],
  rewardSummary: ['60 Containment XP', '25 Meridian Scrip'],
  followUpQuestId: 'the-knocking',
};
