import type { QuestDefinition } from '../../quests/questDefinition.ts';

export const FAMILIAR_FACES: QuestDefinition = {
  id: 'familiar-faces',
  name: 'Familiar Faces',
  category: 'side',
  offeredBy: 'sergeant-kade',
  offerRequires: ['the-knocking'],
  recommendedLevel: 9,
  summary:
    "Sector 2 keeps refilling. Kade recognises some of the wardens walking the inner chamber, and some of the static in the isolation ward still answers to a name. He would like them put to rest properly, by someone who can handle it.",
  steps: [
    {
      id: 'wardens',
      journal: 'Kade wants the Hollow Warden put down twice more, so that it stays down a little longer each time.',
      objectives: [{ type: 'defeat', creatureId: 'hollow-warden', count: 2, label: 'Contain or put down the Hollow Warden again' }],
    },
    {
      id: 'wraiths',
      journal: "The static wraiths in Sector 2's isolation ward were Halvorsen's team. Kade wants four of them released.",
      objectives: [{ type: 'defeat', creatureId: 'static-wraith', count: 4, label: 'Release static wraiths' }],
    },
    {
      id: 'report',
      journal: 'Kade is at the Atrium training range.',
      objectives: [{ type: 'talkTo', npcId: 'sergeant-kade', label: 'Report to Sergeant Kade' }],
    },
  ],
  rewards: [
    { type: 'grantExperience', skill: 'closeQuarters', amount: 1200 },
    { type: 'grantExperience', skill: 'fortitude', amount: 700 },
    { type: 'grantExperience', skill: 'containment', amount: 500 },
    { type: 'giveItem', itemId: 'clotting-shot', count: 3 },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 150 },
  ],
  rewardSummary: ['1,200 Close Quarters XP', '700 Fortitude XP', '500 Containment XP', '3 Clotting Shots', '150 Meridian Scrip'],
};

export const REQUISITION_ORDER: QuestDefinition = {
  id: 'requisition-order',
  name: 'Requisition Order',
  category: 'side',
  offeredBy: 'quartermaster-okafor',
  offerRequires: ['the-knocking'],
  recommendedLevel: 10,
  summary:
    "Deepwatch is asking Requisitions for heavy kit faster than Okafor can sign it out. Okafor would like an operative who can fabricate their own, and then fabricate some more for everybody else.",
  steps: [
    {
      id: 'steel',
      journal: 'Okafor wants six ingots of hardened steel, refined from Undercroft slag.',
      objectives: [{ type: 'craft', itemId: 'hardened-steel', count: 6, label: 'Refine hardened steel' }],
    },
    {
      id: 'assemble',
      journal: 'Now a set of composite plate and a shock maul from the fabricator.',
      objectives: [
        { type: 'craft', itemId: 'composite-plate', count: 1, label: 'Assemble Composite Plate' },
        { type: 'craft', itemId: 'shock-maul', count: 1, label: 'Assemble a Shock Maul' },
      ],
    },
    {
      id: 'deliver',
      journal: 'Okafor is at the Requisitions counter in the Atrium commissary.',
      objectives: [{ type: 'signal', signal: 'requisition.delivered', npcId: 'quartermaster-okafor', label: 'Deliver the order to Okafor' }],
    },
  ],
  rewards: [
    { type: 'grantExperience', skill: 'engineering', amount: 1500 },
    { type: 'grantExperience', skill: 'refining', amount: 1200 },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 450 },
  ],
  rewardSummary: ['1,500 Engineering XP', '1,200 Refining XP', '450 Meridian Scrip'],
};

export const THAW_CYCLE: QuestDefinition = {
  id: 'thaw-cycle',
  name: 'Thaw Cycle',
  category: 'side',
  offeredBy: 'dr-penhallow',
  recommendedLevel: 12,
  summary: 'The Deepwatch infirmary is running out of anything that works on frostbite. Dr. Penhallow has a recipe. You have hands.',
  steps: [
    {
      id: 'crystals',
      journal: 'Penhallow wants six frost crystals chipped from the rime clusters in the Cryovault freezer plant.',
      objectives: [{ type: 'gather', itemId: 'frost-crystal', count: 6, label: 'Chip frost crystals' }],
    },
    {
      id: 'compound',
      journal: 'Cryo compound is moth dust and cryo gel rendered at a refinery. Penhallow wants three.',
      objectives: [{ type: 'craft', itemId: 'cryo-compound', count: 3, label: 'Refine cryo compound' }],
    },
    {
      id: 'salve',
      journal: 'Folded into gel base at a bio-synthesiser, cryo compound becomes rime salve.',
      objectives: [{ type: 'craft', itemId: 'rime-salve', count: 3, label: 'Synthesise rime salves' }],
    },
    {
      id: 'deliver',
      journal: 'Penhallow is in the Deepwatch infirmary.',
      objectives: [{ type: 'signal', signal: 'thaw.delivered', npcId: 'dr-penhallow', label: 'Bring the salves to Penhallow' }],
    },
  ],
  rewards: [
    { type: 'grantExperience', skill: 'biochemistry', amount: 1500 },
    { type: 'grantExperience', skill: 'refining', amount: 1000 },
    { type: 'grantExperience', skill: 'salvage', amount: 900 },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 250 },
  ],
  rewardSummary: ['1,500 Biochemistry XP', '1,000 Refining XP', '900 Salvage XP', '250 Meridian Scrip'],
};

export const RIMEGUARD: QuestDefinition = {
  id: 'rimeguard',
  name: 'Rimeguard',
  category: 'side',
  offeredBy: 'artificer-duval',
  recommendedLevel: 12,
  summary: 'Artificer Duval has drawn up a pattern for armour that can stand in the Cryovault without freezing to the wearer. Duval needs someone to test it, preferably someone who built it.',
  steps: [
    {
      id: 'alloy',
      journal: 'Rime alloy is two frost crystals and a hardened steel ingot, refined. Duval wants eight.',
      objectives: [{ type: 'craft', itemId: 'rime-alloy', count: 8, label: 'Refine rime alloy' }],
    },
    {
      id: 'plate',
      journal: 'Four rime alloy and two polymer sheets make a Rimeguard Plate at the fabricator. It needs Engineering 13.',
      objectives: [{ type: 'craft', itemId: 'rimeguard-plate', count: 1, label: 'Fabricate Rimeguard Plate' }],
    },
    {
      id: 'wear',
      journal: 'Duval wants to see it worn. It needs Fortitude 12.',
      objectives: [{ type: 'equipItem', itemId: 'rimeguard-plate', label: 'Wear the Rimeguard Plate' }],
    },
    {
      id: 'report',
      journal: 'Duval is in the Deepwatch workshop.',
      objectives: [{ type: 'talkTo', npcId: 'artificer-duval', label: 'Show Duval the plate' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'rimeguard-boots' },
    { type: 'grantExperience', skill: 'engineering', amount: 1800 },
    { type: 'grantExperience', skill: 'refining', amount: 1200 },
  ],
  rewardSummary: ['Rimeguard Boots', '1,800 Engineering XP', '1,200 Refining XP'],
};

export const FENNS_INVENTORY: QuestDefinition = {
  id: 'fenns-inventory',
  name: "Fenn's Inventory",
  category: 'side',
  offeredBy: 'orderly-fenn',
  recommendedLevel: 13,
  summary: "Orderly Fenn went into cold sleep with twelve colleagues. He woke up alone. The rime husks in the ward are wearing their name badges.",
  steps: [
    {
      id: 'husks',
      journal: 'Fenn has asked me to put eight rime husks to rest in the husk ward, south of the cold corridor.',
      objectives: [{ type: 'defeat', creatureId: 'rime-husk', count: 8, label: 'Lay rime husks to rest' }],
    },
    {
      id: 'gel',
      journal: 'Fenn also wants six samples of cryo gel from the husks, to try to work out what went wrong.',
      objectives: [{ type: 'obtainItem', itemId: 'cryo-gel', count: 6, label: 'Collect cryo gel' }],
    },
    {
      id: 'deliver',
      journal: "Fenn is in his nook, north of the cold corridor.",
      objectives: [{ type: 'signal', signal: 'fenn.delivered', npcId: 'orderly-fenn', label: 'Bring the gel to Fenn' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'rimeguard-gauntlets' },
    { type: 'grantExperience', skill: 'closeQuarters', amount: 1500 },
    { type: 'grantExperience', skill: 'fortitude', amount: 800 },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 300 },
  ],
  rewardSummary: ['Rimeguard Gauntlets', '1,500 Close Quarters XP', '800 Fortitude XP', '300 Meridian Scrip'],
};

export const CROSSED_WIRES: QuestDefinition = {
  id: 'crossed-wires',
  name: 'Crossed Wires',
  category: 'side',
  offeredBy: 'officer-achterberg',
  recommendedLevel: 16,
  summary: 'The Array used to patch straight through to the Atrium intercom. Achterberg would like to talk to someone on this side of the door again.',
  steps: [
    {
      id: 'repatch',
      journal: 'Four patch points need repatching: one on the relay floor, one in the operator pit, one in the cable run and one on the dish gantry.',
      objectives: [{ type: 'interactWith', objectId: 'patch-point', count: 4, label: 'Repatch the comms bays' }],
    },
    {
      id: 'lund',
      journal: 'The intercom picked up the Atrium Engineering Bay. Achterberg wants me to confirm in person that Lund heard her.',
      objectives: [{ type: 'talkTo', npcId: 'engineer-lund', label: 'Check in with Engineer Lund' }],
    },
    {
      id: 'report',
      journal: 'Achterberg will want to know what Lund said.',
      objectives: [{ type: 'talkTo', npcId: 'officer-achterberg', label: 'Report back to Achterberg' }],
    },
  ],
  rewards: [
    { type: 'grantExperience', skill: 'engineering', amount: 2200 },
    { type: 'giveItem', itemId: 'echo-stim', count: 3 },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 400 },
  ],
  rewardSummary: ['2,200 Engineering XP', '3 Echo Stims', '400 Meridian Scrip'],
};

export const SERVO_SALVAGE: QuestDefinition = {
  id: 'servo-salvage',
  name: 'Servo Salvage',
  category: 'side',
  offeredBy: 'artificer-duval',
  offerRequires: ['cold-storage'],
  recommendedLevel: 17,
  summary: 'Relay sentinels are built around the most precise actuators on site. Duval wants them, and has stopped pretending to be subtle about it.',
  steps: [
    {
      id: 'servos',
      journal: 'Duval wants eight sentinel servos from the relay sentinels in the Signal Array.',
      objectives: [{ type: 'obtainItem', itemId: 'sentinel-servo', count: 8, label: 'Salvage sentinel servos' }],
    },
    {
      id: 'deliver',
      journal: 'Duval is in the Deepwatch workshop.',
      objectives: [{ type: 'signal', signal: 'servo.delivered', npcId: 'artificer-duval', label: 'Bring the servos to Duval' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'relay-gloves' },
    { type: 'grantExperience', skill: 'engineering', amount: 1500 },
    { type: 'grantExperience', skill: 'salvage', amount: 1500 },
  ],
  rewardSummary: ['Relay Gloves', '1,500 Engineering XP', '1,500 Salvage XP'],
};

export const CALLBACK: QuestDefinition = {
  id: 'callback',
  name: 'Callback',
  category: 'side',
  offeredBy: 'officer-achterberg',
  recommendedLevel: 18,
  summary: "The echo operators were Achterberg's shift. They are still asking whether Meridian copies. She would like someone to answer them, firmly.",
  steps: [
    {
      id: 'operators',
      journal: 'Achterberg wants ten echo operators silenced.',
      objectives: [{ type: 'defeat', creatureId: 'echo-operator', count: 10, label: 'Silence echo operators' }],
    },
    {
      id: 'copper',
      journal: 'She also wants six lengths of signal copper from the trunk cables in the cable run, to rebuild a headset that only hears the living.',
      objectives: [{ type: 'gather', itemId: 'signal-copper', count: 6, label: 'Strip signal copper' }],
    },
    {
      id: 'report',
      journal: 'Achterberg is in the uplink lobby.',
      objectives: [{ type: 'talkTo', npcId: 'officer-achterberg', label: 'Report to Achterberg' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'choir-visor' },
    { type: 'grantExperience', skill: 'fortitude', amount: 2000 },
    { type: 'grantExperience', skill: 'containment', amount: 1500 },
    { type: 'grantExperience', skill: 'salvage', amount: 1000 },
  ],
  rewardSummary: ['Choir Visor', '2,000 Fortitude XP', '1,500 Containment XP', '1,000 Salvage XP'],
};

export const WET_INK: QuestDefinition = {
  id: 'wet-ink',
  name: 'Wet Ink',
  category: 'side',
  offeredBy: 'clerk-pim',
  recommendedLevel: 21,
  summary: 'The redactors are erasing the stacks one shelf at a time. Clerk Pim believes that whatever they peel off can be peeled back.',
  steps: [
    {
      id: 'redactors',
      journal: 'Pim wants six redactors stopped in the reading rooms.',
      objectives: [{ type: 'defeat', creatureId: 'redactor', count: 6, label: 'Stop redactors' }],
    },
    {
      id: 'strips',
      journal: 'Pim also needs six redaction strips to study.',
      objectives: [{ type: 'obtainItem', itemId: 'redaction-strip', count: 6, label: 'Collect redaction strips' }],
    },
    {
      id: 'deliver',
      journal: 'Pim is at the foot of the flood stair.',
      objectives: [{ type: 'signal', signal: 'ink.delivered', npcId: 'clerk-pim', label: 'Bring the strips to Pim' }],
    },
  ],
  rewards: [
    { type: 'grantExperience', skill: 'research', amount: 2500 },
    { type: 'grantExperience', skill: 'closeQuarters', amount: 1800 },
    { type: 'giveItem', itemId: 'ink-tonic', count: 4 },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 600 },
  ],
  rewardSummary: ['2,500 Research XP', '1,800 Close Quarters XP', '4 Ink Tonics', '600 Meridian Scrip'],
};

export const DEEP_STOCK: QuestDefinition = {
  id: 'deep-stock',
  name: 'Deep Stock',
  category: 'side',
  offeredBy: 'quartermaster-bui',
  offerRequires: ['dead-air'],
  recommendedLevel: 20,
  summary: "Quartermaster Bui has a buyer for eel hide and archive ink. He will not say who. He will say the buyer pays very well.",
  steps: [
    {
      id: 'hides',
      journal: 'Bui wants eight ink eel hides from the Drowned Archive.',
      objectives: [{ type: 'obtainItem', itemId: 'eel-hide', count: 8, label: 'Collect ink eel hides' }],
    },
    {
      id: 'ink',
      journal: 'And six measures of black ink, drawn from the pools in the stacks.',
      objectives: [{ type: 'gather', itemId: 'black-ink', count: 6, label: 'Draw black ink' }],
    },
    {
      id: 'deliver',
      journal: 'Bui is in the Deepwatch stores.',
      objectives: [{ type: 'signal', signal: 'stock.delivered', npcId: 'quartermaster-bui', label: 'Deliver the stock to Bui' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'ink-boots' },
    { type: 'grantExperience', skill: 'salvage', amount: 2000 },
    { type: 'grantExperience', skill: 'refining', amount: 1500 },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 800 },
  ],
  rewardSummary: ['Ink-Wader Boots', '2,000 Salvage XP', '1,500 Refining XP', '800 Meridian Scrip'],
};

export const HEAT_DEATH: QuestDefinition = {
  id: 'heat-death',
  name: 'Heat Death',
  category: 'side',
  offeredBy: 'stoker-brann',
  recommendedLevel: 25,
  summary: "Brann used to bank the ember galleries every shift. Nobody has done it in eleven years, and the wisps have been breeding in the heat.",
  steps: [
    {
      id: 'wisps',
      journal: 'Brann wants ten cinder wisps snuffed out in the ember galleries.',
      objectives: [{ type: 'defeat', creatureId: 'cinder-wisp', count: 10, label: 'Snuff out cinder wisps' }],
    },
    {
      id: 'ore',
      journal: 'With the wisps thinned, the seams can be worked. Brann wants eight ember ore.',
      objectives: [{ type: 'gather', itemId: 'ember-ore', count: 8, label: 'Mine ember ore' }],
    },
    {
      id: 'report',
      journal: 'Brann is in the coolant lock.',
      objectives: [{ type: 'talkTo', npcId: 'stoker-brann', label: 'Report to Brann' }],
    },
  ],
  rewards: [
    { type: 'grantExperience', skill: 'salvage', amount: 3000 },
    { type: 'grantExperience', skill: 'fortitude', amount: 2000 },
    { type: 'giveItem', itemId: 'cinder-draught', count: 4 },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 800 },
  ],
  rewardSummary: ['3,000 Salvage XP', '2,000 Fortitude XP', '4 Cinder Draughts', '800 Meridian Scrip'],
};

export const FORGE_MASTER: QuestDefinition = {
  id: 'forge-master',
  name: 'Forge Master',
  category: 'side',
  offeredBy: 'artificer-duval',
  offerRequires: ['original-contract'],
  recommendedLevel: 26,
  summary: 'Duval has never worked furnace steel. Duval would like to, very much, and would like you to go first in case it explodes.',
  steps: [
    {
      id: 'steel',
      journal: 'Furnace steel is two ember ore and a hardened steel ingot, refined at reactor heat. Duval wants eight.',
      objectives: [{ type: 'craft', itemId: 'furnace-steel', count: 8, label: 'Refine furnace steel' }],
    },
    {
      id: 'plate',
      journal: 'Four furnace steel and two vellum weave make Furnace Plate. It needs Engineering 27.',
      objectives: [{ type: 'craft', itemId: 'furnace-plate', count: 1, label: 'Fabricate Furnace Plate' }],
    },
    {
      id: 'report',
      journal: 'Duval is in the Deepwatch workshop.',
      objectives: [{ type: 'talkTo', npcId: 'artificer-duval', label: 'Show Duval the plate' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'furnace-gauntlets' },
    { type: 'grantExperience', skill: 'engineering', amount: 4000 },
    { type: 'grantExperience', skill: 'refining', amount: 3000 },
  ],
  rewardSummary: ['Furnace Gauntlets', '4,000 Engineering XP', '3,000 Refining XP'],
};

export const WHAT_KESSLER_SAW: QuestDefinition = {
  id: 'what-kessler-saw',
  name: 'What Kessler Saw',
  category: 'side',
  offeredBy: 'dr-kessler',
  offerRequires: ['stoking-the-fire'],
  recommendedLevel: 31,
  summary: "Dr. Kessler has spent forty years on the far side making notes. He would like to finish them, and to go home. He thinks the knocklings are the key to both.",
  steps: [
    {
      id: 'knocklings',
      journal: 'Kessler wants six knocklings broken open in the quiet range and the reflected records.',
      objectives: [{ type: 'defeat', creatureId: 'knockling', count: 6, label: 'Break knocklings' }],
    },
    {
      id: 'glass',
      journal: 'He also needs six mirror glass chipped from the outcrops, to see which way the reflections are facing.',
      objectives: [{ type: 'gather', itemId: 'mirror-glass', count: 6, label: 'Chip mirror glass' }],
    },
    {
      id: 'report',
      journal: 'Kessler is in the empty medbay.',
      objectives: [{ type: 'talkTo', npcId: 'dr-kessler', label: 'Report to Dr. Kessler' }],
    },
  ],
  rewards: [
    { type: 'grantExperience', skill: 'research', amount: 4000 },
    { type: 'grantExperience', skill: 'salvage', amount: 3000 },
    { type: 'giveItem', itemId: 'threshold-elixir', count: 3 },
    { type: 'giveItem', itemId: 'meridian-scrip', count: 1500 },
  ],
  rewardSummary: ['4,000 Research XP', '3,000 Salvage XP', '3 Threshold Elixirs', '1,500 Meridian Scrip'],
};

export const ACT_TWO_SIDE_QUESTS: readonly QuestDefinition[] = [
  FAMILIAR_FACES,
  REQUISITION_ORDER,
  THAW_CYCLE,
  RIMEGUARD,
  FENNS_INVENTORY,
  CROSSED_WIRES,
  SERVO_SALVAGE,
  CALLBACK,
  WET_INK,
  DEEP_STOCK,
  HEAT_DEATH,
  FORGE_MASTER,
  WHAT_KESSLER_SAW,
];
