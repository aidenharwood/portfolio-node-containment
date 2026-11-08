import type { QuestDefinition } from '../../quests/questDefinition.ts';

export const LIVE_FIRE: QuestDefinition = {
  id: 'live-fire',
  name: 'Live Fire',
  category: 'tutorial',
  summary:
    'Orientation taught you where the doors are. Warden Osei runs the Intake training range and will teach you what to do when something comes through one.',
  steps: [
    {
      id: 'report-to-osei',
      journal: 'Warden Osei is waiting in the gallery of the training range, south of the concourse.',
      objectives: [{ type: 'talkTo', npcId: 'warden-osei', label: 'Report to Warden Osei' }],
    },
    {
      id: 'arm-up',
      journal: 'Osei wants me armed. I should wield my stun baton from my inventory.',
      objectives: [{ type: 'equipItem', itemId: 'stun-baton', label: 'Wield the Stun Baton' }],
    },
    {
      id: 'drill',
      journal:
        'Osei wants three training drones on the floor. The red markers show my targets. Click a drone to attack it; I will keep swinging until it drops. The gallery is a safe area, so nothing follows me back up there.',
      objectives: [{ type: 'defeat', creatureId: 'training-drone', count: 3, label: 'Defeat training drones' }],
      onComplete: [
        { type: 'giveItem', itemId: 'medgel', count: 2 },
        { type: 'notify', text: 'Osei tosses you two Medgel ampoules. "Patch up."' },
      ],
    },
    {
      id: 'patch-up',
      journal: 'The drones landed a few hits. Osei says to apply a Medgel from my inventory.',
      objectives: [{ type: 'useItem', itemId: 'medgel', label: 'Apply a Medgel' }],
    },
    {
      id: 'rest',
      journal: 'Medgel is for the field. Back at base, a medbay bed patches you up for free. There are two in the Supply Office.',
      objectives: [{ type: 'interactWith', objectId: 'med-bed', label: 'Rest on a medbay bed' }],
    },
    {
      id: 'debrief',
      journal: 'Drill complete. Osei will want a word.',
      objectives: [{ type: 'talkTo', npcId: 'warden-osei', label: 'Debrief with Warden Osei' }],
    },
  ],
  rewards: [
    { type: 'grantExperience', skill: 'closeQuarters', amount: 150 },
    { type: 'grantExperience', skill: 'fortitude', amount: 100 },
    { type: 'giveItem', itemId: 'medgel', count: 3 },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 30 },
  ],
  rewardSummary: ['150 Close Quarters XP', '100 Fortitude XP', '3 Medgel', '30 Meridian Scrip'],
  followUpQuestId: 'cleared-for-transit',
};
