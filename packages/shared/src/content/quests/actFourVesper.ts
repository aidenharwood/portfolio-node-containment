import type { QuestDefinition } from '../../quests/questDefinition.ts';
import { VESPER_GATE_FLAG } from '../vesperObjects.ts';

export const REFERRAL: QuestDefinition = {
  id: 'referral',
  name: 'Referral',
  category: 'main',
  offeredBy: 'medic-anand',
  offerRequires: ['cathedral-of-salt'],
  recommendedLevel: 50,
  summary: "A referral slip on Vesper Sanatorium letterhead came up the Medbay's pneumatic tube. The patient is Meridian. The condition is unknown. Please attend.",
  steps: [
    {
      id: 'oyelaran',
      journal: "Anand traced the tube to Hydroponics. Botanist Oyelaran keeps the seed vault there, and the vault's back wall has been warm for weeks.",
      objectives: [{ type: 'signal', signal: 'vesper.oyelaran-asked', npcId: 'botanist-oyelaran', label: 'Ask Oyelaran about the seed vault' }],
    },
    {
      id: 'walk',
      journal: "The seed vault's back wall opens onto a covered walk heading west. It smells of carbolic.",
      objectives: [{ type: 'enterArea', districtId: 'vesper-causeway', areaId: 'walk', label: 'Walk the Sanatorium Walk' }],
    },
    {
      id: 'orderlies',
      journal: 'The walk opens into hospital wards, and the orderlies are still doing their rounds. They are putting everyone back to bed.',
      objectives: [{ type: 'defeat', creatureId: 'ward-orderly', count: 6, label: 'Defeat ward orderlies' }],
    },
    {
      id: 'bell',
      journal: "At the west end of the ward corridor is a door marked PORTER'S LODGE, and a visitors' bell beside it.",
      objectives: [{ type: 'interactWith', objectId: 'vesper-lodge-bell', label: 'Ring for admission' }],
      onComplete: [{ type: 'setFlag', flag: VESPER_GATE_FLAG }],
    },
    {
      id: 'ashby',
      journal: 'The lodge has let me in. The matron wants to see the referral.',
      objectives: [{ type: 'signal', signal: 'vesper.met-ashby', npcId: 'matron-ashby', label: 'Give Matron Ashby the referral' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: 4000 },
    { type: 'grantExperience', skill: 'fortitude', amount: 6000 },
    { type: 'grantExperience', skill: 'biochemistry', amount: 4000 },
  ],
  rewardSummary: ['4,000 Meridian Scrip', '6,000 Fortitude XP', '4,000 Biochemistry XP'],
};

export const NIGHT_ROUNDS: QuestDefinition = {
  id: 'night-rounds',
  name: 'Night Rounds',
  category: 'main',
  offeredBy: 'matron-ashby',
  offerRequires: ['referral'],
  recommendedLevel: 54,
  summary: 'Every night for forty years, the patients of Vesper have asked for Meridian. Matron Ashby wants to know why, and the night nurses will not let her onto the ward.',
  steps: [
    {
      id: 'charts',
      journal: 'Ashby wants the charts from beds 4, 11 and 19 in the South Ward.',
      objectives: [
        { type: 'interactWith', objectId: 'vesper-chart-a', label: 'Read the chart for bed 4' },
        { type: 'interactWith', objectId: 'vesper-chart-b', label: 'Read the chart for bed 11' },
        { type: 'interactWith', objectId: 'vesper-chart-c', label: 'Read the chart for bed 19' },
      ],
    },
    {
      id: 'nurses',
      journal: 'The night nurses are still sedating anyone who asks for Meridian. Ashby wants the night shift relieved.',
      objectives: [{ type: 'defeat', creatureId: 'night-nurse', count: 8, label: 'Relieve the night nurses' }],
    },
    {
      id: 'report',
      journal: 'Three charts, all the same: "Asked for Meridian. Sedated." Ashby is in the lodge.',
      objectives: [{ type: 'signal', signal: 'vesper.charts-reported', npcId: 'matron-ashby', label: 'Bring Ashby the charts' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: 4500 },
    { type: 'giveItem', itemId: 'vesper-tonic', count: 5 },
    { type: 'grantExperience', skill: 'fortitude', amount: 6500 },
    { type: 'grantExperience', skill: 'research', amount: 4500 },
  ],
  rewardSummary: ['4,500 Meridian Scrip', '5 Vesper Tonics', '6,500 Fortitude XP', '4,500 Research XP'],
};

export const SECOND_OPINION: QuestDefinition = {
  id: 'second-opinion',
  name: 'Second Opinion',
  category: 'main',
  offeredBy: 'matron-ashby',
  offerRequires: ['night-rounds'],
  recommendedLevel: 58,
  summary: "Forty years ago the pharmacy started writing its own prescriptions, and the Chief Physician started following them. Every patient's chart is his handwriting. Ashby wants a second opinion.",
  steps: [
    {
      id: 'dispensary',
      journal: 'Ashby has unlocked the surgery. The pharmacy lies west of the lodge, through the dispensary.',
      objectives: [{ type: 'enterArea', districtId: 'vesper-pharmacy', areaId: 'dispensary', label: 'Enter the dispensary' }],
    },
    {
      id: 'physician',
      journal: 'The Chief Physician is in the surgery, operating on nobody, following a prescription that writes itself.',
      objectives: [{ type: 'defeat', creatureId: 'the-chief-physician', count: 1, label: 'Defeat the Chief Physician' }],
    },
    {
      id: 'report',
      journal: 'The prescriptions have stopped writing themselves. Ashby will want to know.',
      objectives: [{ type: 'signal', signal: 'vesper.physician-reported', npcId: 'matron-ashby', label: 'Report to Matron Ashby' }],
      onComplete: [{ type: 'setFlag', flag: 'storyline.act-four-complete' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: 8000 },
    { type: 'grantExperience', skill: 'containment', amount: 8000 },
    { type: 'grantExperience', skill: 'fortitude', amount: 7000 },
    { type: 'grantExperience', skill: 'biochemistry', amount: 5000 },
  ],
  rewardSummary: ['8,000 Meridian Scrip', '8,000 Containment XP', '7,000 Fortitude XP', '5,000 Biochemistry XP'],
};

export const PRESCRIPTION_FOR_ONE: QuestDefinition = {
  id: 'prescription-for-one',
  name: 'Prescription for One',
  category: 'side',
  offeredBy: 'apothecary-lowe',
  offerRequires: ['referral'],
  recommendedLevel: 52,
  summary: 'Apothecary Lowe dispenses everything by hand, from stock he trusts. He has run out of stock he trusts.',
  steps: [
    {
      id: 'gather',
      journal: 'Lowe needs physic herbs from the ward cabinets, and starched linen from the night nurses.',
      objectives: [
        { type: 'obtainItem', itemId: 'physic-herb', count: 6, label: 'Gather physic herbs' },
        { type: 'obtainItem', itemId: 'starched-linen', count: 4, label: 'Collect starched linen' },
      ],
    },
    {
      id: 'deliver',
      journal: 'I have the herbs and the linen. Lowe is behind the dispensary counter in the lodge.',
      objectives: [{ type: 'signal', signal: 'vesper.stock-delivered', npcId: 'apothecary-lowe', label: 'Bring Lowe his stock' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: 2000 },
    { type: 'giveItem', itemId: 'vesper-tonic', count: 4 },
    { type: 'grantExperience', skill: 'salvage', amount: 3500 },
    { type: 'grantExperience', skill: 'biochemistry', amount: 3500 },
  ],
  rewardSummary: ['2,000 Meridian Scrip', '4 Vesper Tonics', '3,500 Salvage XP', '3,500 Biochemistry XP'],
};

export const THE_COLD_WARD: QuestDefinition = {
  id: 'the-cold-ward',
  name: 'The Cold Ward',
  category: 'side',
  offeredBy: 'matron-ashby',
  offerRequires: ['night-rounds'],
  recommendedLevel: 56,
  summary: 'Nobody has come up from the cold ward in forty years, because nobody down there can afford to be discharged.',
  steps: [
    {
      id: 'descend',
      journal: 'Ashby has unlocked the cold ward lift in the lodge.',
      objectives: [{ type: 'enterArea', districtId: 'vesper-cellars', areaId: 'lift-landing', label: 'Take the lift to the cold ward' }],
    },
    {
      id: 'attendants',
      journal: 'The morgue attendants are keeping the mortuary exactly as cold as the day it closed.',
      objectives: [{ type: 'defeat', creatureId: 'morgue-attendant', count: 6, label: 'Defeat morgue attendants' }],
    },
    {
      id: 'almoner',
      journal: "The Almoner keeps her office at the bottom of the cold ward, balancing accounts nobody will ever pay.",
      objectives: [{ type: 'defeat', creatureId: 'the-almoner', count: 1, label: 'Defeat the Almoner' }],
    },
    {
      id: 'report',
      journal: 'The cold ward has gone quiet. Ashby is in the lodge.',
      objectives: [{ type: 'signal', signal: 'vesper.almoner-reported', npcId: 'matron-ashby', label: 'Report to Matron Ashby' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: 4500 },
    { type: 'grantExperience', skill: 'fortitude', amount: 6000 },
    { type: 'grantExperience', skill: 'salvage', amount: 2500 },
  ],
  rewardSummary: ['4,500 Meridian Scrip', '6,000 Fortitude XP', '2,500 Salvage XP'],
};

export const DISCHARGED: QuestDefinition = {
  id: 'discharged',
  name: 'Discharged',
  category: 'side',
  offeredBy: 'matron-ashby',
  offerRequires: ['the-cold-ward'],
  recommendedLevel: 58,
  summary: 'Every patient in the cold ward is still listed as admitted. Matron Ashby has written their discharge papers. Somebody has to file them.',
  steps: [
    {
      id: 'ledger',
      journal: "Ashby gave me the discharge papers. The cold ward ledger is in the Almoner's office.",
      objectives: [{ type: 'interactWith', objectId: 'cellar-ledger', label: 'File the discharge papers' }],
    },
    {
      id: 'report',
      journal: 'Every patient in the cold ward is discharged at last. Ashby will want to close the ward.',
      objectives: [{ type: 'signal', signal: 'vesper.ward-discharged', npcId: 'matron-ashby', label: 'Tell Ashby the ward is discharged' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: 2500 },
    { type: 'grantExperience', skill: 'research', amount: 5000 },
    { type: 'grantExperience', skill: 'containment', amount: 2500 },
  ],
  rewardSummary: ['2,500 Meridian Scrip', '5,000 Research XP', '2,500 Containment XP'],
};

export const ACT_FOUR_VESPER_QUESTS: readonly QuestDefinition[] = [REFERRAL, NIGHT_ROUNDS, SECOND_OPINION];

export const VESPER_SIDE_QUESTS: readonly QuestDefinition[] = [PRESCRIPTION_FOR_ONE, THE_COLD_WARD, DISCHARGED];
