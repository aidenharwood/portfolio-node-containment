import type { QuestDefinition } from '../../quests/questDefinition.ts';

export const PRESSURE_DROP: QuestDefinition = {
  id: 'pressure-drop',
  name: 'Pressure Drop',
  category: 'side',
  offeredBy: 'pumpwright-ngata',
  offerRequires: ['cleared-for-transit'],
  recommendedLevel: 5,
  summary: 'Water pressure across the Site has been falling for a month. Pumpwright Ngata knows exactly why, and needs someone with a weapon to fix it.',
  steps: [
    {
      id: 'valves',
      journal: 'Ngata wants the three header valves in the Valve Gallery, north of the Pump House, opened again.',
      objectives: [
        { type: 'interactWith', objectId: 'waterworks-valve-a', label: 'Open Header Valve A' },
        { type: 'interactWith', objectId: 'waterworks-valve-b', label: 'Open Header Valve B' },
        { type: 'interactWith', objectId: 'waterworks-valve-c', label: 'Open Header Valve C' },
      ],
    },
    {
      id: 'skimmers',
      journal: 'The valves are open, but silt skimmers are grazing on the intakes. Ngata wants them thinned out.',
      objectives: [{ type: 'defeat', creatureId: 'silt-skimmer', count: 6, label: 'Defeat silt skimmers' }],
    },
    {
      id: 'report',
      journal: 'Pressure should be climbing again. Ngata is in the Pump House.',
      objectives: [{ type: 'signal', signal: 'waterworks.pressure-restored', npcId: 'pumpwright-ngata', label: 'Report to Ngata' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: 80 },
    { type: 'giveItem', itemId: 'medgel', count: 3 },
    { type: 'grantExperience', skill: 'engineering', amount: 350 },
    { type: 'grantExperience', skill: 'fortitude', amount: 200 },
  ],
  rewardSummary: ['80 Meridian Scrip', '3 Medgel', '350 Engineering XP', '200 Fortitude XP'],
};

export const BAD_WATER: QuestDefinition = {
  id: 'bad-water',
  name: 'Bad Water',
  category: 'side',
  offeredBy: 'pumpwright-ngata',
  offerRequires: ['pressure-drop'],
  recommendedLevel: 7,
  summary: 'The pressure is back. So are the complaints. The Atrium says the water tastes of pennies, and Ngata says it should not taste of anything.',
  steps: [
    {
      id: 'samples',
      journal: 'Ngata wants a sample from each of the three filtration beds east of the Pump House.',
      objectives: [
        { type: 'interactWith', objectId: 'waterworks-tap-a', label: 'Sample the north bed' },
        { type: 'interactWith', objectId: 'waterworks-tap-b', label: 'Sample the middle bed' },
        { type: 'interactWith', objectId: 'waterworks-tap-c', label: 'Sample the east bed' },
      ],
    },
    {
      id: 'assay',
      journal: 'I have three warm, unpleasant vials. The assay bench is in the Pump House.',
      objectives: [{ type: 'interactWith', objectId: 'waterworks-assay', label: 'Run the assay' }],
    },
    {
      id: 'report',
      journal: 'Whatever is in the water gets stronger towards the outfall. Ngata should hear this.',
      objectives: [{ type: 'signal', signal: 'waterworks.assay-reported', npcId: 'pumpwright-ngata', label: 'Tell Ngata what the assay found' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: 120 },
    { type: 'giveItem', itemId: 'trauma-foam', count: 2 },
    { type: 'grantExperience', skill: 'biochemistry', amount: 450 },
    { type: 'grantExperience', skill: 'research', amount: 250 },
  ],
  rewardSummary: ['120 Meridian Scrip', '2 Trauma Foam', '450 Biochemistry XP', '250 Research XP'],
};

export const THE_OUTFALL: QuestDefinition = {
  id: 'the-outfall',
  name: 'The Outfall',
  category: 'side',
  offeredBy: 'pumpwright-ngata',
  offerRequires: ['bad-water'],
  recommendedLevel: 9,
  summary: 'Something in the outfall is breeding the bloats and bleeding into the water. Ngata wants it gone and the outfall pump running again.',
  steps: [
    {
      id: 'tanks',
      journal: 'The way to the outfall runs through the Settling Tanks, south of the filtration beds. The sump bloats there will not let me pass quietly.',
      objectives: [{ type: 'defeat', creatureId: 'sump-bloat', count: 4, label: 'Clear sump bloats from the tanks' }],
    },
    {
      id: 'mother',
      journal: 'The Outfall lies east of the tanks. Whatever feeds there is big enough that Ngata suggested I bring friends, and a Containment Seal Mk.II or better.',
      objectives: [{ type: 'contain', creatureId: 'sump-mother', count: 1, label: 'Contain the Sump Mother' }],
    },
    {
      id: 'restart',
      journal: 'She is sealed, but a good deal of her is still in the outfall pump. It needs clearing and restarting.',
      objectives: [{ type: 'interactWith', objectId: 'waterworks-outfall-pump', label: 'Restart the outfall pump' }],
    },
    {
      id: 'report',
      journal: 'The outfall is running. Ngata will want to know, and will want to know what I saw down the pipe.',
      objectives: [{ type: 'signal', signal: 'waterworks.outfall-cleared', npcId: 'pumpwright-ngata', label: 'Report to Ngata' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: 220 },
    { type: 'giveItem', itemId: 'composite-plate' },
    { type: 'grantExperience', skill: 'fortitude', amount: 600 },
    { type: 'grantExperience', skill: 'engineering', amount: 400 },
  ],
  rewardSummary: ['220 Meridian Scrip', 'Composite Plate', '600 Fortitude XP', '400 Engineering XP'],
};

export const WATERWORKS_QUESTS: readonly QuestDefinition[] = [PRESSURE_DROP, BAD_WATER, THE_OUTFALL];
