import type { QuestDefinition } from '../../quests/questDefinition.ts';

export const LEECH_SEASON: QuestDefinition = {
  id: 'leech-season',
  name: 'Leech Season',
  category: 'side',
  offeredBy: 'mags',
  recommendedRating: 5,
  summary: 'Mags needs sealant for her camp, and the pipe leeches in the warrens are full of it.',
  steps: [
    {
      id: 'collect',
      journal: 'Mags wants five leech sacs. The pipe leeches in the warrens, south of her camp, carry them.',
      objectives: [{ type: 'obtainItem', itemId: 'leech-sac', count: 5, label: 'Collect leech sacs' }],
    },
    {
      id: 'deliver',
      journal: 'I have the sacs. Mags is back at the camp, by the heater.',
      objectives: [{ type: 'signal', signal: 'leech.delivered', npcId: 'mags', label: 'Bring the sacs to Mags' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'filter-respirator' },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 60 },
    { type: 'grantExperience', skill: 'salvage', amount: 400 },
  ],
  rewardSummary: ['Filter Respirator', '60 Meridian Scrip', '400 Salvage XP'],
};
