import type { QuestDefinition } from '../../quests/questDefinition.ts';

export const STATIC_IN_THE_VENTS: QuestDefinition = {
  id: 'static-in-the-vents',
  name: 'Static in the Vents',
  category: 'side',
  offeredBy: 'engineer-lund',
  summary:
    'Engineer Lund has been hearing voices in the Atrium ventilation. Probably faulty filter chips. Probably.',
  steps: [
    {
      id: 'inspect-vents',
      journal: 'Lund asked me to inspect three crackling ventilation panels around the Atrium and pull their filter chips.',
      objectives: [{ type: 'interactWith', objectId: 'vent-panel', count: 3, label: 'Inspect ventilation panels' }],
    },
    {
      id: 'report-to-lund',
      journal: 'I have all three scorched chips. Lund will want to see them.',
      objectives: [{ type: 'signal', signal: 'vents.chips-delivered', npcId: 'engineer-lund', label: 'Bring the chips to Engineer Lund' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'field-scanner' },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 75 },
    { type: 'grantExperience', skill: 'engineering', amount: 250 },
  ],
  rewardSummary: ['Field Scanner', '75 Meridian Scrip', '250 Engineering XP'],
};
