import type { QuestDefinition } from '../../quests/questDefinition.ts';

export const OVERGROWTH: QuestDefinition = {
  id: 'overgrowth',
  name: 'Overgrowth',
  category: 'side',
  offeredBy: 'botanist-oyelaran',
  recommendedRating: 4,
  summary:
    'The Verdance hydroponics deck has gone wild. Dr. Oyelaran needs the thorn crawlers cut back and the seed vault checked before the vines take it.',
  steps: [
    {
      id: 'cut-back',
      journal: 'Dr. Oyelaran wants five thorn crawlers cut back in the nursery and grow hall.',
      objectives: [{ type: 'defeat', creatureId: 'thorn-crawler', count: 5, label: 'Cut back thorn crawlers' }],
    },
    {
      id: 'samples',
      journal: 'Now four samples of strangler fibre, harvested fresh from the vines.',
      objectives: [{ type: 'gather', itemId: 'vine-fibre', count: 4, label: 'Harvest strangler fibre' }],
    },
    {
      id: 'vault',
      journal: 'The seed vault console is south of the tram platform. I should read what is still viable.',
      objectives: [{ type: 'interactWith', objectId: 'seed-vault-console', label: 'Read the seed vault console' }],
    },
    {
      id: 'report',
      journal: 'Dr. Oyelaran will want the vault report.',
      objectives: [{ type: 'talkTo', npcId: 'botanist-oyelaran', label: 'Report to Dr. Oyelaran' }],
    },
  ],
  rewards: [
    { type: 'grantExperience', skill: 'salvage', amount: 300 },
    { type: 'grantExperience', skill: 'closeQuarters', amount: 250 },
    { type: 'grantExperience', skill: 'fortitude', amount: 200 },
    { type: 'giveItem', itemId: 'sap-poultice', count: 5 },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 60 },
  ],
  rewardSummary: ['300 Salvage XP', '250 Close Quarters XP', '200 Fortitude XP', '5 Sap Poultices', '60 Meridian Scrip'],
};
