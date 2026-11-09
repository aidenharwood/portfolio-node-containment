import type { QuestDefinition } from '../../quests/questDefinition.ts';

export const LIVE_FIRE: QuestDefinition = {
  id: 'live-fire',
  name: 'Live Fire',
  category: 'tutorial',
  summary:
    'Orientation taught you where the doors are. Warden Osei runs the Intake training range and will teach you what to do when something comes through one: put it down, or better, put it back.',
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
      id: 'containment-brief',
      journal: 'Osei says knocking an anomaly down is only half the job. The Directorate contains what it can. I should hear her out in the range gallery.',
      objectives: [{ type: 'talkTo', npcId: 'warden-osei', label: 'Ask Osei about containment' }],
      onComplete: [
        { type: 'giveItem', itemId: 'alloy-plate', count: 1 },
        { type: 'giveItem', itemId: 'synthweave-bolt', count: 1 },
        { type: 'notify', text: 'Osei hands you an Alloy Plate and a Synthweave Bolt. "Seal stock. Do not lose it."' },
      ],
    },
    {
      id: 'make-seal',
      journal:
        'Every containment needs a seal rated for the specimen. The fabricator in the Intake Workshop assembles an Alloy Plate and a Synthweave Bolt into a Containment Seal Mk.I. Seals train Containment, not Engineering.',
      objectives: [{ type: 'craft', itemId: 'containment-seal-1', count: 1, label: 'Assemble a Containment Seal Mk.I' }],
    },
    {
      id: 'contain',
      journal:
        'The Understudy (ANM-0031) stands in the training range. I wear it down until its integrity is at a tenth or less. While I carry a seal I pull my blows so I never break a containable specimen. Then I right-click it and choose Contain, or press Contain on the target panel. My Containment level must be at least the specimen level.',
      objectives: [{ type: 'contain', creatureId: 'the-understudy', count: 1, label: 'Contain the Understudy' }],
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
    { type: 'grantExperience', skill: 'containment', amount: 100 },
    { type: 'giveItem', itemId: 'containment-seal-1', count: 2 },
    { type: 'giveItem', itemId: 'medgel', count: 3 },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 30 },
  ],
  rewardSummary: ['150 Close Quarters XP', '100 Fortitude XP', '100 Containment XP', '2 Containment Seal Mk.I', '3 Medgel', '30 Meridian Scrip'],
  followUpQuestId: 'cleared-for-transit',
};
