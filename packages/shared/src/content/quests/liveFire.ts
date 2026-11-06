import type { QuestDefinition } from '../../quests/questDefinition.ts';

export const LIVE_FIRE: QuestDefinition = {
  id: 'live-fire',
  name: 'Live Fire',
  category: 'tutorial',
  summary:
    'Orientation taught you where the doors are. Sergeant Kade of the Response Division will teach you what to do when something comes through one.',
  steps: [
    {
      id: 'report-to-kade',
      journal: 'A Sergeant Kade has requested me at the Atrium training range, east of the core column.',
      objectives: [{ type: 'talkTo', npcId: 'sergeant-kade', label: 'Report to Sergeant Kade' }],
    },
    {
      id: 'arm-up',
      journal: 'Kade issued me a stun baton. I should wield it from my inventory.',
      objectives: [{ type: 'equipItem', itemId: 'stun-baton', label: 'Wield the Stun Baton' }],
    },
    {
      id: 'drill',
      journal: 'Kade wants three training drones on the floor. Click a drone to attack it; I will keep swinging until it drops.',
      objectives: [{ type: 'defeat', creatureId: 'training-drone', count: 3, label: 'Defeat training drones' }],
      onComplete: [
        { type: 'giveItem', itemId: 'medgel', count: 2 },
        { type: 'notify', text: 'Kade tosses you two Medgel ampoules. "Patch up."' },
      ],
    },
    {
      id: 'patch-up',
      journal: 'The drones landed a few hits. Kade says to apply a Medgel from my inventory.',
      objectives: [{ type: 'useItem', itemId: 'medgel', label: 'Apply a Medgel' }],
    },
    {
      id: 'debrief',
      journal: 'Drill complete. Kade will want a word.',
      objectives: [{ type: 'talkTo', npcId: 'sergeant-kade', label: 'Debrief with Sergeant Kade' }],
    },
  ],
  rewards: [
    { type: 'grantExperience', skill: 'closeQuarters', amount: 150 },
    { type: 'grantExperience', skill: 'fortitude', amount: 100 },
    { type: 'giveItem', itemId: 'medgel', count: 3 },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 30 },
  ],
  rewardSummary: ['150 Close Quarters XP', '100 Fortitude XP', '3 Medgel', '30 Meridian Scrip'],
  followUpQuestId: 'the-knocking',
};
