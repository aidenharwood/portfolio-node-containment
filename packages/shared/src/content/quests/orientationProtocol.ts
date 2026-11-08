import type { QuestDefinition } from '../../quests/questDefinition.ts';

export const ORIENTATION_PROTOCOL: QuestDefinition = {
  id: 'orientation-protocol',
  name: 'Orientation Protocol',
  category: 'tutorial',
  summary:
    'Every new operative is processed through the Intake Wing before they are trusted with anything that bites. Complete your orientation and earn transit to the Meridian Atrium.',
  steps: [
    {
      id: 'report-to-reyes',
      journal: 'I have arrived in the Intake Wing. I should report to Officer Reyes in the arrival bay.',
      objectives: [{ type: 'talkTo', npcId: 'officer-reyes', label: 'Speak with Officer Reyes' }],
    },
    {
      id: 'collect-gear',
      journal: 'Reyes issued my clearance card. My issue locker is in the locker room north of the corridor.',
      objectives: [{ type: 'interactWith', objectId: 'issue-locker', label: 'Open your issue locker' }],
    },
    {
      id: 'suit-up',
      journal: 'I should put on my issued vest and visor. Open the equipment tab or click the items in my inventory.',
      objectives: [
        { type: 'equipItem', itemId: 'field-vest-mk1', label: 'Wear the Field Vest Mk.I' },
        { type: 'equipItem', itemId: 'hazard-visor', label: 'Wear the Hazard Visor' },
      ],
    },
    {
      id: 'calibrate',
      journal: 'Before any viewing, every operative is calibrated. The diagnostic terminal is in the room east of the lockers.',
      objectives: [{ type: 'interactWith', objectId: 'diagnostic-terminal', label: 'Calibrate at the diagnostic terminal' }],
    },
    {
      id: 'observation',
      journal: 'Calibrated. Next is the observation deck in the north-east of the wing.',
      objectives: [{ type: 'enterArea', districtId: 'intake-wing', areaId: 'observation', label: 'Enter the observation deck' }],
    },
    {
      id: 'meet-varga',
      journal: 'Dr. Varga is waiting on the observation deck beside the containment window.',
      objectives: [{ type: 'talkTo', npcId: 'dr-varga', label: 'Speak with Dr. Varga' }],
    },
    {
      id: 'retrieve-sample',
      journal: 'Dr. Varga needs a resonance sample from the cabinet in the south-west storeroom.',
      objectives: [
        { type: 'obtainItem', itemId: 'resonance-sample', count: 1, label: 'Retrieve a resonance sample' },
      ],
    },
    {
      id: 'deliver-sample',
      journal: 'I have the sample. I should bring it back to Dr. Varga, sealed and unshaken.',
      objectives: [
        { type: 'signal', signal: 'orientation.sample-delivered', npcId: 'dr-varga', label: 'Deliver the sample to Dr. Varga' },
      ],
      onComplete: [{ type: 'setFlag', flag: 'clearance.atrium-transit' }],
    },
    {
      id: 'transit',
      journal: 'Varga authorised my transit card. The lift in the south-east bay goes up to the Meridian Atrium.',
      objectives: [
        { type: 'enterArea', districtId: 'meridian-atrium', areaId: 'lift-bay', label: 'Ride the transit lift to the Atrium' },
      ],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'operative-badge' },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 50 },
    { type: 'grantExperience', skill: 'containment', amount: 150 },
    { type: 'grantExperience', skill: 'research', amount: 100 },
  ],
  rewardSummary: ['Operative Badge', '50 Meridian Scrip', '150 Containment XP', '100 Research XP'],
  followUpQuestId: 'field-fabrication',
};
