import type { QuestDefinition } from '../../quests/questDefinition.ts';

export const A_COUNCIL_OF_ONE: QuestDefinition = {
  id: 'a-council-of-one',
  name: 'A Council of One',
  category: 'main',
  offeredBy: 'archivist-sel',
  offerRequires: ['the-far-side'],
  recommendedLevel: 10,
  summary:
    "Sel took Halvorsen's warning to the Directorate Council. The Council did not argue, which worried her more than any argument would have. It sent one envoy down to a new forward base beside the Knock, and asked for you by name.",
  steps: [
    {
      id: 'ride',
      journal: 'Sel has had me cleared for the Deep Line, a sealed tram that leaves from the Atrium transit bay. It runs to Deepwatch Station, the new forward base beside Sector 3.',
      objectives: [{ type: 'enterArea', zoneId: 'deepwatch', areaId: 'platform-hall', label: 'Ride the Deep Line to Deepwatch' }],
    },
    {
      id: 'meet-thale',
      journal: "The Council's envoy, Director Thale, has set up in the command post in the north-west corner of the station.",
      objectives: [{ type: 'talkTo', npcId: 'director-thale', label: 'Report to Director Thale' }],
    },
    {
      id: 'halvorsen',
      journal: "Thale wants a first-hand assessment from Halvorsen. The threshold passage in the north wall of the concourse leads straight to the Knock.",
      objectives: [{ type: 'talkTo', npcId: 'dr-halvorsen', label: 'Ask Halvorsen for her assessment' }],
    },
    {
      id: 'report',
      journal: "Halvorsen says the Knock is not getting louder. It is getting closer. Thale should hear it from me.",
      objectives: [{ type: 'signal', signal: 'council.reported', npcId: 'director-thale', label: "Bring Halvorsen's assessment to Thale" }],
      onComplete: [{ type: 'setFlag', flag: 'clearance.cryovault' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: 200 },
    { type: 'giveItem', itemId: 'rime-salve', count: 3 },
    { type: 'grantExperience', skill: 'containment', amount: 600 },
    { type: 'grantExperience', skill: 'research', amount: 400 },
  ],
  rewardSummary: ['200 Meridian Scrip', '3 Rime Salves', '600 Containment XP', '400 Research XP'],
  followUpQuestId: 'cold-storage',
};

export const COLD_STORAGE: QuestDefinition = {
  id: 'cold-storage',
  name: 'Cold Storage',
  category: 'main',
  recommendedLevel: 12,
  summary:
    "To close the Knock, Thale needs to stop time around it, if only for a second. The Cryovault holds four hundred Dormant anomalies in cold sleep, and a stasis core that can do exactly that. The Cryovault has been warming up ever since you rerouted the Undercroft's power.",
  steps: [
    {
      id: 'descend',
      journal: 'The Cryovault lift is in the lift gallery, in the south-east of Deepwatch.',
      objectives: [{ type: 'enterArea', zoneId: 'cryovault', areaId: 'dock', label: 'Descend to the Cryovault' }],
    },
    {
      id: 'stabilise',
      journal: 'Four pods in the pod hall, east of the dock, are close to waking whatever is inside them. They need their coolant lines reseating before anything else.',
      objectives: [{ type: 'interactWith', objectId: 'cryo-pod', count: 4, label: 'Stabilise failing cryo pods' }],
    },
    {
      id: 'moths',
      journal: 'The frost moths are drawn to the warmth of failing pods. With the pods stable, I should thin out the swarm before it finds the next one.',
      objectives: [{ type: 'defeat', creatureId: 'frost-moth', count: 6, label: 'Drive back frost moths' }],
    },
    {
      id: 'curator',
      journal: "The stasis core is in the Curator's office, south-east of the cold corridor. The Curator is still at his desk. Orderly Fenn in the nook can tell me more, and the Rimeguard kit Duval can fabricate would help.",
      objectives: [{ type: 'defeat', creatureId: 'the-curator', count: 1, label: 'Put the Curator to rest' }],
    },
    {
      id: 'recover-core',
      journal: "The Curator's ledger sits behind the glass partition in his office. The stasis core is beside it.",
      objectives: [{ type: 'obtainItem', itemId: 'stasis-core', count: 1, label: 'Take the stasis core' }],
    },
    {
      id: 'deliver',
      journal: 'Director Thale is waiting at Deepwatch for the core.',
      objectives: [{ type: 'signal', signal: 'cold.core-delivered', npcId: 'director-thale', label: 'Deliver the stasis core to Thale' }],
      onComplete: [{ type: 'setFlag', flag: 'clearance.signal-array' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'rimeguard-helm' },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 400 },
    { type: 'grantExperience', skill: 'containment', amount: 1200 },
    { type: 'grantExperience', skill: 'closeQuarters', amount: 800 },
    { type: 'grantExperience', skill: 'fortitude', amount: 600 },
  ],
  rewardSummary: ['Rimeguard Helm', '400 Meridian Scrip', '1,200 Containment XP', '800 Close Quarters XP', '600 Fortitude XP'],
  followUpQuestId: 'dead-air',
};

export const DEAD_AIR: QuestDefinition = {
  id: 'dead-air',
  name: 'Dead Air',
  category: 'main',
  recommendedLevel: 16,
  summary:
    'The Council wants the other eight deep Sites warned before Meridian closes the Knock. Sel has been writing to them for years. She is beginning to suspect that the replies she gets are not coming from them.',
  steps: [
    {
      id: 'ask-sel',
      journal: 'Thale wants the warning sent through the Signal Array. Sel keeps the Site correspondence, so I should start with her in the Atrium archives.',
      objectives: [{ type: 'talkTo', npcId: 'archivist-sel', label: 'Ask Sel about the other Sites' }],
    },
    {
      id: 'descend',
      journal: 'The Array lift is in the Deepwatch lift gallery. Sel has cleared me for it.',
      objectives: [{ type: 'enterArea', zoneId: 'signal-array', areaId: 'uplink-lobby', label: 'Descend to the Signal Array' }],
    },
    {
      id: 'achterberg',
      journal: 'A Signals Officer called Achterberg has held the uplink lobby alone since the Array went quiet.',
      objectives: [{ type: 'talkTo', npcId: 'officer-achterberg', label: 'Speak with Officer Achterberg' }],
    },
    {
      id: 'recalibrate',
      journal: 'Three relay consoles along the north wall of the relay floor have drifted onto a frequency that should not exist. Sentinels patrol the floor.',
      objectives: [{ type: 'interactWith', objectId: 'relay-console', count: 3, label: 'Recalibrate the relay consoles' }],
    },
    {
      id: 'outbox',
      journal: 'With the relays locked, the outbox terminal in the operator pit, east of the relay floor, should show where the replies have been coming from.',
      objectives: [{ type: 'obtainItem', itemId: 'signed-letter', count: 1, label: 'Read the Array outbox' }],
    },
    {
      id: 'choir',
      journal: 'The replies came from below. Whatever answered them is still on the dish gantry, south of the relay floor, singing "received".',
      objectives: [{ type: 'defeat', creatureId: 'the-choir', count: 1, label: 'Silence the Choir' }],
    },
    {
      id: 'recording',
      journal: 'The Array core at the south end of the gantry should hold a recording of everything the Choir ever said.',
      objectives: [{ type: 'obtainItem', itemId: 'choir-recording', count: 1, label: 'Pull the Choir recording' }],
    },
    {
      id: 'report',
      journal: 'Sel needs to see the letter and hear the recording. She is in the Atrium archives.',
      objectives: [{ type: 'signal', signal: 'deadair.reported', npcId: 'archivist-sel', label: 'Bring the letter and recording to Sel' }],
      onComplete: [{ type: 'setFlag', flag: 'clearance.drowned-archive' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'relay-helm' },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 700 },
    { type: 'grantExperience', skill: 'research', amount: 2000 },
    { type: 'grantExperience', skill: 'containment', amount: 1500 },
    { type: 'grantExperience', skill: 'fortitude', amount: 900 },
  ],
  rewardSummary: ['Relay Helm', '700 Meridian Scrip', '2,000 Research XP', '1,500 Containment XP', '900 Fortitude XP'],
  followUpQuestId: 'original-contract',
};

export const ORIGINAL_CONTRACT: QuestDefinition = {
  id: 'original-contract',
  name: 'The Original Contract',
  category: 'main',
  recommendedLevel: 20,
  summary:
    "If the other Sites were never answering, then Meridian has been talking to the far side for forty years. Sel's predecessor took the original Knock file down to the lower stacks the night they flooded. Nobody has read it since.",
  steps: [
    {
      id: 'key',
      journal: 'The lower stacks are flooded. Sel says Engineer Lund kept a key to the Records sluices, "for sentimental reasons".',
      objectives: [{ type: 'obtainItem', itemId: 'sluice-key', count: 1, label: 'Get the sluice key from Lund' }],
    },
    {
      id: 'descend',
      journal: 'The flood stair lift is in the Deepwatch lift gallery.',
      objectives: [{ type: 'enterArea', zoneId: 'drowned-archive', areaId: 'flood-stair', label: 'Descend to the Drowned Archive' }],
    },
    {
      id: 'pim',
      journal: "Sel sent Clerk Pim down ahead of me. Pim should be waiting at the foot of the flood stair.",
      objectives: [{ type: 'talkTo', npcId: 'clerk-pim', label: 'Find Clerk Pim' }],
    },
    {
      id: 'drain',
      journal: 'Three sluice valves in the sluice hall, south of the stair, hold the flood against the sealed reading room. Open all three.',
      objectives: [{ type: 'interactWith', objectId: 'sluice-valve', count: 3, label: 'Open the sluice valves' }],
      onComplete: [
        { type: 'setFlag', flag: 'archive.drained' },
        { type: 'notify', text: 'Somewhere to the east, a pressure seal groans as the black water falls away from it.' },
      ],
    },
    {
      id: 'archivist',
      journal: 'The sealed reading room is off the east end of the stacks. Archivist Wen is still inside, still holding the file.',
      objectives: [{ type: 'defeat', creatureId: 'last-archivist', count: 1, label: 'Lay the Last Archivist to rest' }],
    },
    {
      id: 'charter',
      journal: 'The file is on a lectern at the south end of the reading room.',
      objectives: [{ type: 'obtainItem', itemId: 'founding-charter', count: 1, label: 'Take the Founding Charter' }],
    },
    {
      id: 'deliver',
      journal: 'Thale needs to read this before she does anything to that door.',
      objectives: [{ type: 'signal', signal: 'contract.delivered', npcId: 'director-thale', label: 'Bring the charter to Thale' }],
      onComplete: [{ type: 'setFlag', flag: 'clearance.furnace' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'lexicon-datapad' },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 1000 },
    { type: 'grantExperience', skill: 'research', amount: 2500 },
    { type: 'grantExperience', skill: 'containment', amount: 2500 },
    { type: 'grantExperience', skill: 'closeQuarters', amount: 1500 },
  ],
  rewardSummary: ['Lexicon Datapad', '1,000 Meridian Scrip', '2,500 Research XP', '2,500 Containment XP', '1,500 Close Quarters XP'],
  followUpQuestId: 'stoking-the-fire',
};

export const STOKING_THE_FIRE: QuestDefinition = {
  id: 'stoking-the-fire',
  name: 'Stoking the Fire',
  category: 'main',
  recommendedLevel: 25,
  summary:
    'The charter changes nothing for Thale. She means to drive the Meridian reactor to full output and weld the Knock shut with heat. Halvorsen thinks that is exactly what the far side wants.',
  steps: [
    {
      id: 'halvorsen',
      journal: 'Before I go anywhere near the reactor, Halvorsen wants a word. She is at the Knock, as always.',
      objectives: [{ type: 'talkTo', npcId: 'dr-halvorsen', label: 'Hear Halvorsen out' }],
    },
    {
      id: 'descend',
      journal: 'The reactor lift is on the east wall of the Deepwatch lift gallery.',
      objectives: [{ type: 'enterArea', zoneId: 'furnace', areaId: 'coolant-lock', label: 'Descend to the Furnace' }],
    },
    {
      id: 'brann',
      journal: "The Stoker's old apprentice, Brann, is holding the coolant lock.",
      objectives: [{ type: 'talkTo', npcId: 'stoker-brann', label: 'Speak with Brann' }],
    },
    {
      id: 'golems',
      journal: 'Slag golems have taken over the foundry floor, south of the galleries. They need clearing before anyone can reach the valves.',
      objectives: [{ type: 'defeat', creatureId: 'slag-golem', count: 5, label: 'Break slag golems' }],
    },
    {
      id: 'vent',
      journal: 'Three pressure valves in the foundry are holding the reactor heart door shut against overpressure. Vent all three.',
      objectives: [{ type: 'interactWith', objectId: 'pressure-valve', count: 3, label: 'Vent the pressure valves' }],
      onComplete: [
        { type: 'setFlag', flag: 'furnace.vented' },
        { type: 'notify', text: 'The gauge on the reactor heart door drops out of the red. Behind it, a shovel keeps on scraping.' },
      ],
    },
    {
      id: 'stoker',
      journal: 'The reactor heart door, at the east end of the galleries, will open now. The Stoker is inside.',
      objectives: [{ type: 'defeat', creatureId: 'the-stoker', count: 1, label: 'Stop the Stoker' }],
    },
    {
      id: 'console',
      journal: 'The reactor console in the south-west corner of the heart has a logbook chained to it.',
      objectives: [{ type: 'obtainItem', itemId: 'reactor-log', count: 1, label: 'Read the reactor log' }],
    },
    {
      id: 'confront',
      journal: 'Forty years of reactor output, all of it fed through the Knock. Thale has to see this before she turns the dial.',
      objectives: [{ type: 'signal', signal: 'fire.confronted', npcId: 'director-thale', label: 'Confront Thale with the log' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'furnace-helm' },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 1500 },
    { type: 'grantExperience', skill: 'fortitude', amount: 3000 },
    { type: 'grantExperience', skill: 'closeQuarters', amount: 2500 },
    { type: 'grantExperience', skill: 'engineering', amount: 2000 },
  ],
  rewardSummary: ['Furnace Helm', '1,500 Meridian Scrip', '3,000 Fortitude XP', '2,500 Close Quarters XP', '2,000 Engineering XP'],
  followUpQuestId: 'the-answer',
};

export const THE_ANSWER: QuestDefinition = {
  id: 'the-answer',
  name: 'The Answer',
  category: 'main',
  recommendedLevel: 30,
  summary:
    'Forty years ago the founder told the far side "not yet", and it agreed to wait for whoever stood before the door twice. You have stood there twice. It is knocking for you.',
  steps: [
    {
      id: 'halvorsen',
      journal: 'Halvorsen has kept the door shut for forty years. Now she is the only one who can open it.',
      objectives: [{ type: 'talkTo', npcId: 'dr-halvorsen', label: 'Ask Halvorsen to open the door' }],
      onComplete: [
        { type: 'setFlag', flag: 'farside.door-open' },
        { type: 'notify', text: 'Halvorsen steps aside for the first time in forty years. Behind her, the Knock is very slightly open.' },
      ],
    },
    {
      id: 'through',
      journal: 'The Knock is open. Step through.',
      objectives: [{ type: 'enterArea', zoneId: 'meridian-below', areaId: 'arrival', label: 'Step through the Knock' }],
    },
    {
      id: 'kessler',
      journal: "It is the Atrium, upside down. Someone in a lab coat is waiting in the medbay, where Anand's beds should be.",
      objectives: [{ type: 'talkTo', npcId: 'dr-kessler', label: 'Speak with the figure in the medbay' }],
    },
    {
      id: 'hollows',
      journal: "Kessler says the hollow operatives are what the far side made of everyone who answered the door. They are wearing our kit. They are wearing our faces.",
      objectives: [{ type: 'defeat', creatureId: 'hollow-operative', count: 6, label: 'Put down hollow operatives' }],
    },
    {
      id: 'lanterns',
      journal: 'Three lanterns hang in this place, cold: one in the medbay, one in the wrong workshop and one at the south edge of the plaza. Lit, they will show me this place an hour from now.',
      objectives: [{ type: 'interactWith', objectId: 'far-lantern', count: 3, label: 'Light the far lanterns' }],
    },
    {
      id: 'host',
      journal: 'The lanterns all show the same hour: the front door, south of the plaza, and the Host standing on its welcome mat.',
      objectives: [{ type: 'defeat', creatureId: 'the-host', count: 1, label: 'Face the Host' }],
    },
    {
      id: 'answer',
      journal: 'The Host is gone. Something polite is still standing by the front door, waiting for an answer.',
      objectives: [{ type: 'signal', signal: 'answer.given', npcId: 'the-guest', label: 'Give your answer' }],
    },
    {
      id: 'home',
      journal: 'It is done. Sel will want to write it down.',
      objectives: [{ type: 'signal', signal: 'answer.reported', npcId: 'archivist-sel', label: 'Tell Sel what you answered' }],
      onComplete: [{ type: 'setFlag', flag: 'storyline.act-two-complete' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-sigil' },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 5000 },
    { type: 'grantExperience', skill: 'containment', amount: 5000 },
    { type: 'grantExperience', skill: 'research', amount: 3000 },
    { type: 'grantExperience', skill: 'fortitude', amount: 3000 },
  ],
  rewardSummary: ['Meridian Sigil', '5,000 Meridian Scrip', '5,000 Containment XP', '3,000 Research XP', '3,000 Fortitude XP'],
};
