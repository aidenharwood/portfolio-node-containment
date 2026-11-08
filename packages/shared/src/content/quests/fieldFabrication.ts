import type { QuestDefinition } from '../../quests/questDefinition.ts';

export const FIELD_FABRICATION: QuestDefinition = {
  id: 'field-fabrication',
  name: 'Field Fabrication',
  category: 'tutorial',
  summary:
    'Everything an operative carries was salvaged, refined and assembled by someone. Technician Pell runs the Intake Workshop and wants you to be that someone.',
  steps: [
    {
      id: 'meet-pell',
      journal: 'Technician Pell runs the Intake Workshop, the big room south of the concourse.',
      objectives: [{ type: 'talkTo', npcId: 'technician-pell', label: 'Speak with Technician Pell' }],
    },
    {
      id: 'gather',
      journal:
        'Pell wants raw stock. Scrap heaps give Scrap Alloy, the textile bins give Synthweave Offcuts and the moss beds give Gloam Moss. The glowing rings show which sources I need. Click one and I will keep working it until it runs dry or my pack is full.',
      objectives: [
        { type: 'gather', itemId: 'scrap-alloy', count: 6, label: 'Salvage Scrap Alloy' },
        { type: 'gather', itemId: 'synthweave-offcut', count: 8, label: 'Sort Synthweave Offcuts' },
        { type: 'gather', itemId: 'gloam-moss', count: 2, label: 'Harvest Gloam Moss' },
      ],
    },
    {
      id: 'refine',
      journal: 'Raw stock is no use to a fabricator. The refinery on the east wall turns two of anything raw into one clean base part.',
      objectives: [
        { type: 'craft', itemId: 'alloy-plate', count: 3, label: 'Refine Alloy Plates' },
        { type: 'craft', itemId: 'synthweave-bolt', count: 4, label: 'Refine Synthweave Bolts' },
        { type: 'craft', itemId: 'gel-base', count: 1, label: 'Refine a Gel Base' },
      ],
    },
    {
      id: 'assemble',
      journal:
        'Base parts become gear at the fabricator and medicine at the bio-synthesiser. I arrived with nothing but an undersuit, so Pell wants me to make my own trousers, boots and stun baton, plus a Medgel ampoule.',
      objectives: [
        { type: 'craft', itemId: 'intake-trousers', count: 1, label: 'Assemble Intake Trousers' },
        { type: 'craft', itemId: 'work-boots', count: 1, label: 'Assemble Work Boots' },
        { type: 'craft', itemId: 'stun-baton', count: 1, label: 'Assemble a Stun Baton' },
        { type: 'craft', itemId: 'medgel', count: 1, label: 'Synthesise a Medgel Ampoule' },
      ],
    },
    {
      id: 'stow',
      journal:
        'Pell says anything I am not using belongs in personal storage, not my pack. Every storage locker on site opens onto the same shelves, so what I leave here I can collect in the Atrium. There is one on the workshop wall.',
      objectives: [{ type: 'interactWith', objectId: 'storage-locker', label: 'Open your personal storage' }],
    },
    {
      id: 'report',
      journal: 'I am wearing trousers and boots I made myself, and carrying my own baton. Pell will want to inspect them.',
      objectives: [{ type: 'talkTo', npcId: 'technician-pell', label: 'Show Pell your work' }],
    },
  ],
  rewards: [
    { type: 'grantExperience', skill: 'salvage', amount: 100 },
    { type: 'grantExperience', skill: 'refining', amount: 100 },
    { type: 'grantExperience', skill: 'engineering', amount: 100 },
    { type: 'grantExperience', skill: 'biochemistry', amount: 80 },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 20 },
  ],
  rewardSummary: ['100 Salvage XP', '100 Refining XP', '100 Engineering XP', '80 Biochemistry XP', '20 Meridian Scrip'],
  followUpQuestId: 'live-fire',
};
