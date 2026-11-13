import type { QuestDefinition } from '../../quests/questDefinition.ts';

export const THE_KNOCKING: QuestDefinition = {
  id: 'the-knocking',
  name: 'The Knocking',
  category: 'main',
  recommendedLevel: 4,
  summary:
    'Sector 2 was sealed last cycle with a research team still inside. Something behind the quarantine bulkhead has been knocking ever since. The Directorate would like to know what, and would prefer it if you went to find out.',
  steps: [
    {
      id: 'report-to-kade',
      journal: 'I have arrived in the Meridian Atrium, the hub of Site Meridian. Sergeant Kade of the Response Division meets every new arrival in the Response Office, east of the plaza.',
      objectives: [{ type: 'talkTo', npcId: 'sergeant-kade', label: 'Report to Sergeant Kade' }],
    },
    {
      id: 'ask-sel',
      journal: 'Kade says the Sector 2 file is sealed above his clearance. Archivist Sel keeps every file in the Site, sealed or not, in the Archives north-east of the plaza.',
      objectives: [{ type: 'talkTo', npcId: 'archivist-sel', label: 'Ask Archivist Sel about Sector 2' }],
    },
    {
      id: 'override',
      journal: 'Sel says Engineer Lund still has a quarantine override key from the lockdown.',
      objectives: [{ type: 'obtainItem', itemId: 'quarantine-override-key', count: 1, label: 'Get the override key from Engineer Lund' }],
    },
    {
      id: 'enter-sector-2',
      journal: 'I have the override. The Sector 2 bulkhead is in the north wall of Hydroponics, past the Verdance outpost.',
      objectives: [{ type: 'enterArea', districtId: 'sector-two', areaId: 'airlock', label: 'Enter Sector 2' }],
    },
    {
      id: 'clear-corridor',
      journal: 'The corridor beyond the airlock is crawling with Gloam Mites. They need clearing before anyone else comes through.',
      objectives: [{ type: 'defeat', creatureId: 'gloam-mite', count: 4, label: 'Clear Gloam Mites' }],
      onComplete: [
        { type: 'grantExperience', skill: 'closeQuarters', amount: 220 },
        { type: 'grantExperience', skill: 'fortitude', amount: 160 },
        { type: 'giveItem', itemId: 'medgel', count: 2 },
        { type: 'notify', text: 'Kade, over comms: "Corridor is clear. Breathe, patch up, and train on whatever crawls back before you go near that warden."' },
      ],
    },
    {
      id: 'recover-log',
      journal: "Dr. Halvorsen's research lab is in the north-west of the sector. Her expedition log should still be on the lab terminal.",
      objectives: [{ type: 'obtainItem', itemId: 'expedition-log', count: 1, label: "Recover Halvorsen's expedition log" }],
    },
    {
      id: 'the-warden',
      journal: 'The log mentions the warden on duty, Corporal Avis, who "stayed at post". Something in a warden uniform is still walking the inner chamber, north-east. The Directorate wants it contained, not destroyed: wear it down, then close a Containment Seal Mk.I or better on it, as Osei taught me.',
      objectives: [{ type: 'contain', creatureId: 'hollow-warden', count: 1, label: 'Contain the Hollow Warden' }],
    },
    {
      id: 'return-to-sel',
      journal: 'I should bring the expedition log back to Archivist Sel in the Atrium.',
      objectives: [{ type: 'signal', signal: 'knocking.log-delivered', npcId: 'archivist-sel', label: 'Deliver the log to Archivist Sel' }],
      onComplete: [{ type: 'setFlag', flag: 'storyline.sector-three-revealed' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'response-helmet' },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 150 },
    { type: 'grantExperience', skill: 'containment', amount: 400 },
    { type: 'grantExperience', skill: 'closeQuarters', amount: 250 },
    { type: 'grantExperience', skill: 'research', amount: 200 },
  ],
  followUpQuestId: 'the-far-side',
  rewardSummary: ['Response Helmet', '150 Meridian Scrip', '400 Containment XP', '250 Close Quarters XP', '200 Research XP'],
};
