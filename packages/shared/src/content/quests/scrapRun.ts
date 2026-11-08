import type { QuestDefinition } from '../../quests/questDefinition.ts';

export const SCRAP_RUN: QuestDefinition = {
  id: 'scrap-run',
  name: 'Scrap Run',
  category: 'side',
  offeredBy: 'yardmaster-quill',
  offerRequires: ['cleared-for-transit'],
  recommendedLevel: 3,
  summary:
    "The Service Yards used to feed every fabricator on the main floor. Then the yard drones stopped taking orders. Yardmaster Quill wants the yards working again and doesn't much care how.",
  steps: [
    {
      id: 'drones',
      journal: 'Quill wants the feral maintenance drones in the Scrap Yard and Loading Dock knocked down. The Yard Office is safe; everything past its doors is not.',
      objectives: [{ type: 'defeat', creatureId: 'scrap-drone', count: 4, label: 'Disable feral maintenance drones' }],
    },
    {
      id: 'stock',
      journal: 'With the drones down, Quill wants stock moving again: scrap from the yard, cloth from the Laundry Depot.',
      objectives: [
        { type: 'gather', itemId: 'scrap-alloy', count: 10, label: 'Salvage Scrap Alloy' },
        { type: 'gather', itemId: 'synthweave-offcut', count: 8, label: 'Sort Synthweave Offcuts' },
      ],
    },
    {
      id: 'report',
      journal: 'That should keep the Atrium fabricators fed for a shift. Quill will want to hear it.',
      objectives: [{ type: 'talkTo', npcId: 'yardmaster-quill', label: 'Report to Yardmaster Quill' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: 60 },
    { type: 'grantExperience', skill: 'salvage', amount: 180 },
    { type: 'grantExperience', skill: 'closeQuarters', amount: 120 },
  ],
  rewardSummary: ['60 Meridian Scrip', '180 Salvage XP', '120 Close Quarters XP'],
};
