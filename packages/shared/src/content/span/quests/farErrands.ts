import type { DialogueDefinition } from '../../../dialogue/dialogue.ts';
import type { ItemDefinition } from '../../../gear/items.ts';
import type { RecipeDefinition } from '../../../crafting/recipes.ts';
import type { QuestDefinition } from '../../../quests/questDefinition.ts';
import type { QuestlineDefinition } from '../../../quests/questline.ts';
import type { WorldObjectDefinition } from '../../../world/entities.ts';
import { active, questItem, questTalk, shop } from '../../catalog/dialogueKit.ts';
import { questPay, styleQuestPay } from '../../catalog/questPay.ts';
import { choiceTalk, fieldObject, handIn, handTo, paid, scrip, tell } from './questKit.ts';

const ENDING_RESEALED = 'ending:resealed';
const ENDING_SIGNED_OUT = 'ending:signed-out';
const TAG_FILED = 'meridian:tag-filed';
const TAG_BURIED = 'meridian:tag-buried';
export const COMMENDATION_QUEST_POINTS = 50;
const OKAFOR_CHAT = 'Twelve thousand souls came down on the Meridian. Rustwater has names for nine thousand. I would like the rest.';
const IDRIS_CHAT = 'The pylons of the Quiet still carry a line from the Choir to the Drop. Half of them are out of tune. The other half are out of tune on purpose.';
const HALLORAN_CHAT = 'Last Post. Past here is Site Null, and past Null there is only the Spindle. Nobody has come back from Null with the same file they went in with.';
const MAGS_CHAT = 'Rustwater cuts the Meridian for parts. She was our grandmothers’ ship. She can spare a few plates.';
const MERCER_CHAT = 'Gallowglass is breached. The Combine says it isn’t. One of us is lying, and I am standing in the breach.';

export const FAR_ERRAND_QUESTS: readonly QuestDefinition[] = [
  {
    id: 'ships-manifest',
    name: 'Ship’s Manifest',
    category: 'side',
    summary: 'Twelve thousand people came down on the Meridian. Nell Okafor has names for nine thousand. The rest are somewhere in the hull.',
    offeredBy: 'archivist-okafor',
    offerRequires: ['breach'],
    recommendedLevel: 31,
    steps: [
      {
        id: 'bow',
        journal: 'Walk out to the Bow, north-west of Rustwater, where the Meridian stands out of the scrap, and read her nameplate.',
        objectives: [
          { type: 'enterArea', districtId: 'the-bow', areaId: 'ground', label: 'Reach the Bow' },
          { type: 'interactWith', objectId: 'meridian-nameplate', label: 'Read the nameplate' },
        ],
      },
      { id: 'rustlings', journal: 'The rustlings used to be the ship, and they guard her like it. Put down six.', objectives: [{ type: 'defeat', creatureId: 'rustling', count: 6, label: 'Defeat rustlings' }] },
      { id: 'keel', journal: 'Find the purser’s locker on Keel Road, where the keel broke, and take the manifest.', objectives: [{ type: 'obtainItem', itemId: 'meridian-manifest', count: 1, label: 'Take the manifest' }] },
      { id: 'okafor', journal: 'Bring the manifest to Nell Okafor in Rustwater.', objectives: [handTo('manifest-delivered', 'archivist-okafor', 'Give Nell the manifest')] },
    ],
    ...paid([scrip(300), questPay('research', 31, 2), questPay('salvage', 31, 1)]),
    followUpQuestId: 'engine-room',
  },
  {
    id: 'engine-room',
    name: 'Engine Room',
    category: 'side',
    summary: 'The manifest lists the engine crew as ON WATCH. Two hundred years later, Nell would like them relieved.',
    recommendedLevel: 34,
    steps: [
      {
        id: 'skill',
        journal: 'The Meridian’s valves were built by people who expected to be obeyed. Assemble gear at a fabricator until your Engineering reaches 25.',
        objectives: [{ type: 'reach', measure: 'engineering', level: 25, label: 'Reach Engineering 25', toward: { objects: ['ward-fabricator'] } }],
      },
      { id: 'valves', journal: 'Shut the two engine valves still venting: one on the Engine Field, one in Boiler Bay.', objectives: [{ type: 'interactWith', objectId: 'meridian-valve', count: 2, label: 'Shut the engine valves' }] },
      {
        id: 'scar',
        journal: 'Walk into the Reactor Scar and read the watch log the engine crew left.',
        objectives: [
          { type: 'enterArea', districtId: 'reactor-scar', areaId: 'ground', label: 'Reach the Reactor Scar' },
          { type: 'interactWith', objectId: 'reactor-log', label: 'Read the watch log' },
        ],
      },
      { id: 'okafor', journal: 'Tell Nell Okafor the engine watch is relieved.', objectives: [{ type: 'talkTo', npcId: 'archivist-okafor', label: 'Talk to Nell Okafor' }] },
    ],
    ...paid([scrip(320), questPay('engineering', 34, 2), questPay('research', 34, 1)]),
    followUpQuestId: 'crater-lake',
  },
  {
    id: 'crater-lake',
    name: 'Crater Lake',
    category: 'side',
    summary: 'The cryo bay broke off when the Meridian came down and rolled into the crater. The lake has kept it cold ever since. Something in it still answers roll call.',
    recommendedLevel: 37,
    steps: [
      { id: 'wraiths', journal: 'The bilge wraiths round the crater were the cryo crew. Lay four of them to rest.', objectives: [{ type: 'defeat', creatureId: 'bilge-wraith', count: 4, label: 'Defeat bilge wraiths' }] },
      { id: 'pod', journal: 'Open the cryo pod on the Crater Shore, south-east of Rustwater, and take what is inside.', objectives: [{ type: 'obtainItem', itemId: 'crew-tag', count: 1, label: 'Take the crew tag' }] },
      { id: 'okafor', journal: 'Bring the crew tag to Nell Okafor, and decide where the last of the cryo crew rests.', objectives: [handTo('crew-tag-settled', 'archivist-okafor', 'Settle the crew tag')] },
    ],
    ...paid([scrip(380), styleQuestPay(37, 2), questPay('fortitude', 37, 1)]),
  },
  {
    id: 'salvage-rights',
    name: 'Salvage Rights',
    category: 'side',
    summary: 'A Combine freighter shed its containers on the Cargo Spill. Mags says salvage rights go to whoever gets there first with a cutter. She would like that to be Rustwater.',
    offeredBy: 'scav-boss-mags',
    offerRequires: ['sternward'],
    recommendedLevel: 35,
    steps: [
      { id: 'containers', journal: 'Crack three containers: two on the Cargo Spill and one washed up on Ballast Strand, east of Site Tallow.', objectives: [{ type: 'interactWith', objectId: 'spill-container', count: 3, label: 'Crack the containers' }] },
      {
        id: 'skill',
        journal: 'The good stuff is riveted. Cut rivet seams and wreck plate until your Salvage reaches 35.',
        objectives: [{ type: 'reach', measure: 'salvage', level: 35, label: 'Reach Salvage 35', toward: { objects: ['rivet-seam', 'wreck-plate'] } }],
      },
      { id: 'rivets', journal: 'Cut four hull rivets from the seams on the Wreckfield.', objectives: [{ type: 'gather', itemId: 'hull-rivets', count: 4, label: 'Cut hull rivets' }] },
      { id: 'hand', journal: 'Bring the rivets to Mags Doherty in Rustwater.', objectives: [handTo('salvage-rights-handed', 'scav-boss-mags', 'Give Mags the rivets')] },
    ],
    ...paid([scrip(350), questPay('salvage', 35, 2)], [{ type: 'giveItem', itemId: 'duralloy-plating', count: 2 }], ['2 Duralloy Plating']),
  },
  {
    id: 'pylon-survey',
    name: 'Pylon Survey',
    category: 'side',
    summary: 'The pylons of the Quiet carry a line from the Choir to the Drop. Idris Vell is retuning them. The glass stalkers walk the line and do not like being retuned.',
    offeredBy: 'surveyor-idris',
    offerRequires: ['roll-call'],
    recommendedLevel: 42,
    steps: [
      { id: 'stalkers', journal: 'Clear five glass stalkers off the pylon line.', objectives: [{ type: 'defeat', creatureId: 'glass-stalker', count: 5, label: 'Defeat glass stalkers' }] },
      { id: 'tune', journal: 'Strike the tuners on three pylons: at Hollow Pylons, on the Pylon Walk and on Vigil Fields, south of the Choir.', objectives: [{ type: 'interactWith', objectId: 'pylon-tuner', count: 3, label: 'Strike pylon tuners' }] },
      { id: 'idris', journal: 'Tell Idris Vell the line is singing in tune.', objectives: [{ type: 'talkTo', npcId: 'surveyor-idris', label: 'Talk to Idris Vell' }] },
    ],
    ...paid([scrip(400), questPay('research', 42, 2), styleQuestPay(42, 1)]),
    followUpQuestId: 'the-lens',
  },
  {
    id: 'the-lens',
    name: 'The Lens',
    category: 'side',
    summary: 'At the heart of the pylon line stands the Lens, a frame of the Quiet with nothing in it. Idris thinks something used to be. Light through a prism hound comes out the right colour to find out.',
    recommendedLevel: 44,
    steps: [
      { id: 'hounds', journal: 'Prism hounds bend light the way the Lens wants it bent. Put down six and watch how they break.', objectives: [{ type: 'defeat', creatureId: 'prism-hound', count: 6, label: 'Defeat prism hounds' }] },
      {
        id: 'skill',
        journal: 'Grinding a pylon lens takes a fabricator hand. Assemble gear until your Engineering reaches 35.',
        objectives: [{ type: 'reach', measure: 'engineering', level: 35, label: 'Reach Engineering 35', toward: { objects: ['ward-fabricator'] } }],
      },
      { id: 'grind', journal: 'Assemble a pylon lens at a fabricator, from two red traces and two breached fittings.', objectives: [{ type: 'craft', itemId: 'pylon-lens', count: 1, label: 'Assemble a pylon lens' }] },
      { id: 'mount', journal: 'Seat the lens in the empty ring at the Lens, north of the Choir.', objectives: [{ type: 'interactWith', objectId: 'lens-mount', label: 'Seat the pylon lens' }] },
      { id: 'idris', journal: 'Tell Idris Vell what the Lens showed you.', objectives: [{ type: 'talkTo', npcId: 'surveyor-idris', label: 'Talk to Idris Vell' }] },
    ],
    ...paid([scrip(450), questPay('engineering', 44, 2), questPay('research', 44, 1)]),
    followUpQuestId: 'the-drop',
  },
  {
    id: 'the-drop',
    name: 'The Drop',
    category: 'side',
    summary: 'The Lens points down the pylon line to Drop Edge, where the Steppe stops. Idris wants to know what is at the bottom. Ruth already knows, and would prefer you looked anyway.',
    recommendedLevel: 46,
    steps: [
      {
        id: 'edge',
        journal: 'Follow the line to Drop Edge, south of the Choir, and look over from the lookout.',
        objectives: [
          { type: 'enterArea', districtId: 'drop-edge', areaId: 'ground', label: 'Reach Drop Edge' },
          { type: 'interactWith', objectId: 'drop-lookout', label: 'Look over the Drop' },
        ],
      },
      { id: 'twins', journal: 'The red twins at the Edge hum the line back out of tune. Put down four.', objectives: [{ type: 'defeat', creatureId: 'red-twin', count: 4, label: 'Defeat red twins' }] },
      { id: 'ruth', journal: 'Ask Pilgrim Ruth, in the Choir House, what you saw.', objectives: [{ type: 'talkTo', npcId: 'pilgrim-ruth', label: 'Ask Pilgrim Ruth' }] },
      { id: 'idris', journal: 'Close the survey with Idris Vell.', objectives: [{ type: 'talkTo', npcId: 'surveyor-idris', label: 'Talk to Idris Vell' }] },
    ],
    ...paid([scrip(500), questPay('psionics', 46, 2), questPay('research', 46, 1)]),
  },
  {
    id: 'door-duty',
    name: 'Door Duty',
    category: 'side',
    summary: 'The cell-breakers on the Spindle used to hold things in. Now they hold people out, and they have started carrying off the Last Post checkpoints.',
    offeredBy: 'captain-halloran',
    offerRequires: ['last-post'],
    recommendedLevel: 54,
    steps: [
      { id: 'breakers', journal: 'Break six cell-breakers on the Spindle.', objectives: [{ type: 'defeat', creatureId: 'cell-breaker', count: 6, label: 'Defeat cell-breakers' }] },
      { id: 'seals', journal: 'Reseal the two abandoned checkpoints: on Quiet Peaks and on the Sealed Ground, south of Last Post.', objectives: [{ type: 'interactWith', objectId: 'checkpoint-seal', count: 2, label: 'Reseal the checkpoints' }] },
      { id: 'halloran', journal: 'Report to Captain Halloran at Last Post HQ.', objectives: [{ type: 'talkTo', npcId: 'captain-halloran', label: 'Report to Captain Halloran' }] },
    ],
    ...paid([scrip(600), styleQuestPay(54, 2), questPay('fortitude', 54, 1)]),
  },
  {
    id: 'the-next-cohort',
    name: 'The Next Cohort',
    category: 'side',
    summary: 'You are back on the Roster. So is everyone. The Roster has printed Intake Cohort 42, and Sergeant Vale wants someone who has died at Tallow to walk them past it.',
    offeredBy: 'sergeant-vale',
    offerRequires: ['end-of-file'],
    recommendedLevel: 58,
    steps: [
      { id: 'lune', journal: 'Ask Registrar Lune in Kestrel Records about Cohort 42.', objectives: [{ type: 'talkTo', npcId: 'registrar-lune', label: 'Ask Registrar Lune' }] },
      { id: 'hask', journal: 'Go down to Kestrel Intake and see Officer Hask about the new files.', objectives: [{ type: 'talkTo', npcId: 'officer-hask', label: 'See Officer Hask' }] },
      {
        id: 'parade',
        journal: 'The Cohort has re-formed on the Tallow Parade Ground, waiting for new recruits to fall in. Walk on and end it before Forty-two arrives.',
        objectives: [
          { type: 'enterArea', districtId: 'site-tallow', areaId: 'tallow-parade', label: 'Enter the Parade Ground' },
          { type: 'defeat', creatureId: 'the-cohort', count: 1, label: 'Defeat the Cohort' },
        ],
      },
      { id: 'vale', journal: 'Tell Sergeant Vale the road to Tallow is clear for Forty-two.', objectives: [{ type: 'talkTo', npcId: 'sergeant-vale', label: 'Report to Sergeant Vale' }] },
    ],
    ...paid([scrip(1200), styleQuestPay(58, 2), questPay('containment', 58, 1)]),
  },
  {
    id: 'off-the-books',
    name: 'Off the Books',
    category: 'side',
    summary: 'You are not on the Roster any more. The Directorate does not know you. Mags does, and Juno has work for someone with no file.',
    offeredBy: 'scav-boss-mags',
    offerRequires: ['end-of-file'],
    recommendedLevel: 58,
    steps: [
      { id: 'juno', journal: 'See Juno Reyes on Neon Row about freelance work.', objectives: [{ type: 'talkTo', npcId: 'fixer-juno', label: 'Talk to Juno Reyes' }] },
      { id: 'reruns', journal: 'The Combine is running Mr Brightly again, in reruns. Go down into the Gallowglass undercity and cancel the show.', objectives: [{ type: 'defeat', creatureId: 'mr-brightly', count: 1, label: 'Defeat Mr Brightly' }] },
      { id: 'mercer', journal: 'Agent Mercer has orders to detain anyone with no file. Talk your way past her at the Gallowglass Headhouse.', objectives: [{ type: 'talkTo', npcId: 'agent-mercer', label: 'Talk to Agent Mercer' }] },
      { id: 'mags', journal: 'Go back to Mags in Rustwater for your cut.', objectives: [{ type: 'talkTo', npcId: 'scav-boss-mags', label: 'Talk to Mags Doherty' }] },
    ],
    ...paid([scrip(2000), styleQuestPay(58, 2), questPay('fortitude', 58, 1)]),
  },
  {
    id: 'directorate-commendation',
    name: 'Directorate Commendation',
    category: 'side',
    summary: 'Captain Halloran has a commendation form with every box ticked but one: proof. The Directorate wants its three worst Sites put down again, by one operative, in one tour.',
    offeredBy: 'captain-halloran',
    offerRequires: ['end-of-file'],
    recommendedLevel: 58,
    steps: [
      { id: 'keeper', journal: 'The Orchard Keeper has grown back in the Mother Rows at Site Orchard. Prune it.', objectives: [{ type: 'defeat', creatureId: 'orchard-keeper', count: 1, label: 'Defeat the Orchard Keeper' }] },
      { id: 'precentor', journal: 'The Precentor leads the hymn again in the Nave of Site Vesper. Break it.', objectives: [{ type: 'defeat', creatureId: 'the-precentor', count: 1, label: 'Defeat the Precentor' }] },
      { id: 'warden', journal: 'The Warden of Null has reopened your case in the Review. Close it.', objectives: [{ type: 'defeat', creatureId: 'warden-of-null', count: 1, label: 'Defeat the Warden of Null' }] },
      { id: 'halloran', journal: 'Bring the tour report to Captain Halloran at Last Post.', objectives: [{ type: 'talkTo', npcId: 'captain-halloran', label: 'Report to Captain Halloran' }] },
    ],
    ...paid([scrip(3000), styleQuestPay(58, 3), questPay('containment', 58, 1), questPay('fortitude', 58, 1)]),
    questPoints: 3,
  },
];

export const FAR_ERRAND_QUESTLINES: readonly QuestlineDefinition[] = [
  { id: 'meridian-manifest', name: 'The Meridian Manifest', kind: 'side', summary: 'Twelve thousand came down on the Meridian. Find the names the hull has kept.', questIds: ['ships-manifest', 'engine-room', 'crater-lake'] },
  { id: 'pylon-line', name: 'The Pylon Line', kind: 'side', summary: 'Retune the pylons of the Quiet from the Choir to the Drop, and look down.', questIds: ['pylon-survey', 'the-lens', 'the-drop'] },
  { id: 'after-the-file', name: 'After the File', kind: 'side', summary: 'Whatever went in your file, the Span is not finished with you.', questIds: ['the-next-cohort', 'off-the-books', 'directorate-commendation'] },
];

export const FAR_ERRAND_ITEMS: readonly ItemDefinition[] = [
  questItem('meridian-manifest', 'Meridian Manifest', 'The purser’s copy of the Meridian’s manifest, sealed in a hull-plate case. Three thousand names Rustwater does not have.', 'sheet', ['#c8a060', '#3a2a1a']),
  questItem('crew-tag', 'Cryo Crew Tag', 'A ceramic crew tag from the Meridian’s cryo bay: CRYO WATCH, BERTH 1. The name is worn off. It is still cold.', 'badge', ['#d8e8ff', '#4a5a6a']),
  questItem('pylon-lens', 'Pylon Lens', 'A disc of ground red glass in a Directorate collar. Look through it and the Steppe is the colour it was before.', 'resonator', ['#c84a4a', '#d8e8ff']),
];

export const FAR_ERRAND_RECIPES: readonly RecipeDefinition[] = [
  { id: 'fabricator:pylon-lens', station: 'fabricator', skill: 'engineering', level: 35, inputs: [{ itemId: 'red-trace', count: 2 }, { itemId: 'directorate-salvage', count: 2 }], output: { itemId: 'pylon-lens', count: 1 }, experience: 12, ticks: 6 },
];

export const FAR_ERRAND_OBJECTS: readonly WorldObjectDefinition[] = [
  fieldObject({ id: 'meridian-nameplate', name: 'Meridian Nameplate', examine: 'A brass nameplate the size of a door, bolted to the Meridian’s bow. Under her name, smaller: TWELVE THOUSAND SOULS.', model: 'directorateSign', verb: 'Read', when: [active('ships-manifest', 'bow')], refuse: 'MERIDIAN. TWELVE THOUSAND SOULS. Somebody has scratched a tally under it and given up.', effects: tell('Under the tally, in purser’s pencil: manifest in the locker at the keel, in case of landing. Somebody has underlined landing twice.') }),
  fieldObject({ id: 'purser-locker', name: 'Purser’s Locker', examine: 'A hull-plate locker stencilled PURSER, wedged where the keel broke.', model: 'storageLocker', verb: 'Open', when: [active('ships-manifest', 'keel'), { type: 'lacksItem', itemId: 'meridian-manifest' }], refuse: 'The purser’s locker. Empty, apart from damp.', effects: [{ type: 'giveItem', itemId: 'meridian-manifest' }, { type: 'notify', text: 'The manifest is dry inside its case. The engine crew are listed last: twelve names, marked ON WATCH.' }] }),
  fieldObject({ id: 'meridian-valve', name: 'Engine Valve', examine: 'A Meridian engine valve as tall as you, still venting two hundred years after the engines stopped.', model: 'sluiceValve', verb: 'Shut', when: [active('engine-room', 'valves')], refuse: 'The valve hisses. It is waiting for an order.', effects: tell('You lean on the wheel until it turns. The venting stops, and something in the deck below sighs.'), once: 'This valve is already shut.' }),
  fieldObject({ id: 'reactor-log', name: 'Watch Log', examine: 'A watch log chained to a stanchion at the lip of the Reactor Scar. The last page is two hundred years long.', model: 'noticeBoard', verb: 'Read', when: [active('engine-room', 'scar')], refuse: 'The watch log. The entries are all the same.', effects: tell('ALL WELL. ALL WELL. ALL WELL. Then, in a different hand, two hundred years later: relieved. Somebody has signed it with your name.') }),
  fieldObject({ id: 'cryo-pod', name: 'Cryo Pod', examine: 'A Meridian cryo pod half sunk in the crater shallows, frosted over in the heat.', model: 'containmentCell', verb: 'Open', when: [active('crater-lake', 'pod'), { type: 'lacksItem', itemId: 'crew-tag' }], refuse: 'The pod is frosted shut. The lid is cold even in the sun.', effects: [{ type: 'giveItem', itemId: 'crew-tag' }, { type: 'notify', text: 'The pod is empty except for a crew tag and the shape of someone in the frost. The shape is facing the bow.' }] }),
  fieldObject({ id: 'spill-container', name: 'Combine Container', examine: 'A shipping container in Aurelian Combine livery, split along one seam and full of somebody else’s property.', model: 'dumpster', verb: 'Crack', when: [active('salvage-rights', 'containers')], refuse: 'A Combine container. Somebody has already scratched RUSTWATER on the seals.', effects: tell('You crack the seals and chalk RUSTWATER on the door. Inside: riveted crates, and a manifest made out to Site Tallow.'), once: 'You have already claimed this container.' }),
  fieldObject({ id: 'pylon-tuner', name: 'Pylon Tuner', examine: 'A Directorate tuning fork bolted to the foot of a pylon of the Quiet. It is a little flat.', model: 'utilityPole', verb: 'Strike', when: [active('pylon-survey', 'tune')], refuse: 'The tuner hums. Idris has it marked for retuning.', effects: tell('You strike the fork. The pylon answers a quarter-tone higher, and the next pylon down the line answers it.'), once: 'This pylon is in tune.' }),
  fieldObject({ id: 'lens-mount', name: 'The Lens', examine: 'A ring of precursor glass three metres across on a stand, empty. The pylon line points straight through it.', model: 'gantryCrane', verb: 'Seat the lens', when: [active('the-lens', 'mount'), { type: 'hasItem', itemId: 'pylon-lens' }], refuse: 'An empty ring of glass. Something small and red would sit in it.', effects: [{ type: 'takeItem', itemId: 'pylon-lens' }, { type: 'notify', text: 'Through the lens the Steppe is green, and the pylon line runs on past Drop Edge and down. Something at the bottom is looking back up the line.' }] }),
  fieldObject({ id: 'drop-lookout', name: 'Drop Lookout', examine: 'A Directorate lookout post at the end of the glass, with a telescope pointed straight down.', model: 'floodMast', verb: 'Look over', when: [active('the-drop', 'edge')], refuse: 'The telescope is pointed down. Somebody has written DON’T on the eyepiece.', effects: tell('A long way down there is a light, the same blue as the Spindle’s. It is not a reflection. It blinks when you do.') }),
  fieldObject({ id: 'checkpoint-seal', name: 'Abandoned Checkpoint', examine: 'A Last Post checkpoint, its barrier torn off and carried away by something with a door for a body.', model: 'checkpointBarrier', verb: 'Reseal', when: [active('door-duty', 'seals')], refuse: 'An empty checkpoint. Halloran wants it resealed.', effects: tell('You bolt a fresh seal across the gap and log it. LAST POST: HELD.'), once: 'This checkpoint is already resealed.' }),
];

export const FAR_ERRAND_DIALOGUES: readonly DialogueDefinition[] = [
  handIn(
    {
      npc: 'archivist-okafor',
      questId: 'ships-manifest',
      offer: { text: 'You walked in from Halcyon with the Directorate on your collar. Good. I need someone the rustlings will not mistake for scrap. The Meridian’s manifest is somewhere in the hull: the purser kept a copy at the keel, in case of landing. Bring it to me.', accept: 'I will find the manifest.', requires: ['breach'] },
      waiting: 'The Bow first, for her name. Then the keel, on Keel Road. Then here.',
      hand: { stepId: 'okafor', text: 'Is that the purser’s case? Let me hold it.', option: 'Hand over the manifest.', items: [], signal: 'manifest-delivered', thanks: 'Three thousand names. Three thousand. And the engine crew at the bottom, marked ON WATCH. They were never relieved. Someone ought to.' },
      done: 'Eleven thousand nine hundred and eighty-eight names. Twelve left. I will find them.',
      chat: OKAFOR_CHAT,
    },
    [['meridian-manifest', 1]],
  ),
  questTalk({
    npc: 'archivist-okafor',
    questId: 'engine-room',
    notes: [
      { stepId: 'skill', text: 'The engine crew stood watch until the end, and the valves are still venting for them. Get your Engineering up before you lean on a Meridian valve. They lean back.' },
      { stepId: 'valves', text: 'Two valves: Engine Field and Boiler Bay. Shut them gently. They have been open a long time.' },
      { stepId: 'scar', text: 'The watch log is at the lip of the Reactor Scar. Read the last page. All of it.' },
      { stepId: 'okafor', text: 'Relieved, signed in your name? Of course it was. Tallow printed you; the ship printed the rest of us. The cryo crew is all that is left. The cryo bay rolled into the crater lake.' },
    ],
    waiting: '',
    done: 'Engine crew, relieved with thanks. I wrote it in the manifest myself.',
    chat: OKAFOR_CHAT,
  }),
  choiceTalk(
    {
      npc: 'archivist-okafor',
      questId: 'crater-lake',
      notes: [
        { stepId: 'wraiths', text: 'The wraiths round the crater are the cryo watch. They will not let anyone near the pod until they are relieved. Be kind about it. Be firm.' },
        { stepId: 'pod', text: 'The pod is on the Crater Shore. Bring me whatever is in it.' },
      ],
      waiting: '',
      done: 'The manifest is closed. Twelve thousand. I am going to sleep for a week.',
      chat: OKAFOR_CHAT,
    },
    {
      stepId: 'okafor',
      text: 'Cryo watch, berth one. The last name. I can file it in the manifest, and the Meridian’s count is whole. Or you can leave it under her name at the Bow, where the crew would want it. You choose.',
      signal: 'crew-tag-settled',
      items: [['crew-tag', 1]],
      choices: [
        { text: 'File it. The count should be whole.', effects: [{ type: 'setFlag', flag: TAG_FILED }, { type: 'giveItem', itemId: 'duralloy-plating', count: 2 }], reply: 'Twelve thousand, exactly. Here: plate from the cryo bay. It should go to someone who walks.' },
        { text: 'Leave it under her name, at the Bow.', effects: [{ type: 'setFlag', flag: TAG_BURIED }, { type: 'giveItem', itemId: 'tide-broth', count: 3 }], reply: 'Then I will write the last line as AT HOME, and leave the name blank. Take some broth for the walk out to her.' },
      ],
    },
    [
      [TAG_FILED, 'Twelve thousand names, every one filed. The manifest is the only thing on the Span that adds up.'],
      [TAG_BURIED, 'Berth one is at home under the Bow. The rustlings leave that patch alone now. So do I.'],
    ],
  ),
  handIn(
    {
      npc: 'scav-boss-mags',
      questId: 'salvage-rights',
      offer: { text: 'A Combine freighter lost half its load on the Cargo Spill. Salvage rights go to whoever cracks the seals first. Crack three, chalk RUSTWATER on the doors, and cut me four hull rivets while you are out. The Combine can sue the sea.', accept: 'Three containers, four rivets.', requires: ['sternward'] },
      waiting: 'Two containers on the Spill, one on Ballast Strand. Rivets off the seams. Salvage 35, or you will be cutting your thumbs.',
      hand: { stepId: 'hand', text: 'Rivets? Good ones?', option: 'Four hull rivets.', items: [], signal: 'salvage-rights-handed', thanks: 'Clean cuts. The containers are ours, the Combine is furious, and you get plate. Rustwater pays its cutters.' },
      done: 'The Combine sent a lawyer. We sent him back with a rivet. Very polite.',
      chat: MAGS_CHAT,
      chatOptions: [shop('rustwater-stores')],
    },
    [['hull-rivets', 4]],
  ),
  questTalk({
    npc: 'surveyor-idris',
    questId: 'pylon-survey',
    offer: {
      text: 'You walked the glass from Tallow and the Steppe did not swallow you. I need an escort who can fight and strike a tuning fork without humming along. Clear the stalkers off the line and strike three tuners for me.',
      accept: 'I will survey the line.',
      requires: ['roll-call'],
      conditions: [{ type: 'combatLevel', atLeast: 40 }],
      notReady: 'The stalkers on the line are past forty, and they do not stop for a survey badge. Come back at combat level 40.',
    },
    waiting: 'Five stalkers, three tuners: Hollow Pylons, the Pylon Walk, Vigil Fields. Strike once. Do not hum.',
    report: { stepId: 'idris', text: 'The line is in tune for the first time since Vesper went quiet. Listen. No, with your feet. That is the Lens, calling down the line. It is empty. It should not be.' },
    done: 'The line sings in tune now. Ruth says it is singing to her. Ruth says that about everything.',
    chat: IDRIS_CHAT,
  }),
  questTalk({
    npc: 'surveyor-idris',
    questId: 'the-lens',
    notes: [
      { stepId: 'hounds', text: 'The prism hounds bend light the way the Quiet bent it. Watch how they break. That is the angle I need.' },
      { stepId: 'skill', text: 'A lens wants Engineering 35. Do not grind glass of the Quiet with recruit hands. It remembers.' },
      { stepId: 'grind', text: 'Two red traces, two breached fittings, one fabricator. Oro will lend you his. He will also lecture.' },
      { stepId: 'mount', text: 'The Lens is north of here, on its own ground. Seat it and look through. Tell me what you see. Do not tell Ruth first.' },
      { stepId: 'idris', text: 'Something at the bottom of the Drop, looking up the line. Well. That is a survey result. I hate it. Go to the Edge.' },
    ],
    waiting: '',
    done: 'The Lens is seated. The Steppe is green through it. I have stopped looking.',
    chat: IDRIS_CHAT,
  }),
  questTalk({
    npc: 'surveyor-idris',
    questId: 'the-drop',
    notes: [
      { stepId: 'edge', text: 'Drop Edge, south of the Choir. The lookout is the last thing the Directorate built on the Steppe. They built it facing down.' },
      { stepId: 'twins', text: 'The red twins at the Edge hum the line flat again. Put some down so we can hear ourselves think.' },
      { stepId: 'ruth', text: 'Ask Ruth. She will be insufferable. She will also be right.' },
      { stepId: 'idris', text: 'A second light, at the bottom of the Drop, blinking back. The survey is closed. I am filing it under PENDING, beside the rest of the Span.' },
    ],
    waiting: '',
    done: 'Survey closed. Line in tune. Lens seated. Something down there blinking. Three out of four.',
    chat: IDRIS_CHAT,
  }),
  questTalk({
    npc: 'pilgrim-ruth',
    questId: 'the-drop',
    report: { stepId: 'ruth', text: 'A light at the bottom that blinks when you do? That is the other end of the Span. The Quiet built a ring to keep something in, and a ring has an inside. You were looking at it. It was looking at you. Neither of you was surprised.' },
    waiting: 'The Edge first. Then come and tell me what I already know.',
    done: 'You walk differently since the Drop. More carefully. The glass approves.',
    chat: 'The Quiet did not build the Span to live on. They built it to keep something in. Listen to the glass.',
  }),
  questTalk({
    npc: 'captain-halloran',
    questId: 'door-duty',
    offer: {
      text: 'The cell-breakers are carrying off my checkpoints. Whole barriers, gone, and a door-shaped hole in the line. Break six of them and reseal the two posts on Quiet Peaks and the Sealed Ground.',
      accept: 'Six breakers, two seals.',
      requires: ['last-post'],
      conditions: [{ type: 'combatLevel', atLeast: 52 }],
      notReady: 'A cell-breaker is a door with opinions. Come back at combat level 52.',
    },
    waiting: 'Six breakers. Quiet Peaks and the Sealed Ground. Log the seals.',
    report: { stepId: 'halloran', text: 'Both posts held and logged. The searchlight crew says the line looks like a line again. That is the best thing anyone has said to me in a month.' },
    done: 'The checkpoints hold. The breakers come back, but the posts hold.',
    chat: HALLORAN_CHAT,
    chatOptions: [shop('last-post-stores')],
  }),
  questTalk({
    npc: 'captain-halloran',
    questId: 'directorate-commendation',
    offer: {
      text: 'Commendation form, operative. Every box ticked but the last: proof. The Keeper, the Precentor and the Warden have all grown back. Put them down again, one tour, and I sign.',
      accept: 'One tour. Three Sites.',
      requires: ['end-of-file'],
      conditions: [{ type: 'questPoints', atLeast: COMMENDATION_QUEST_POINTS }],
      notReady: 'The Directorate only commends operatives with a long record. It wants fifty quest points on your file. Go and help some people.',
    },
    waiting: 'The Orchard Keeper, the Precentor, the Warden. In any order. Come back alive, preferably.',
    report: { stepId: 'halloran', text: 'Three Sites put down by one operative in one tour. Signed. The Directorate commends you, whoever you are this week. I mean that kindly.' },
    done: 'Your commendation hangs in Last Post HQ. People salute it. The commendation finds this very confusing.',
    chat: HALLORAN_CHAT,
    chatOptions: [shop('last-post-stores')],
  }),
  questTalk({
    npc: 'sergeant-vale',
    questId: 'the-next-cohort',
    offer: {
      text: 'Back on the Roster, operative. Same as me. The Roster has printed Forty-two: thirty-one of them, walking up the road with no memory of it. The Cohort has re-formed at Tallow, waiting for them to fall in. I want someone who has died there to walk them past it.',
      accept: 'I will walk them past it.',
      requires: ['end-of-file'],
      conditions: [{ type: 'hasFlag', flag: ENDING_RESEALED }],
    },
    report: { stepId: 'vale', text: 'Forty-two walked past Tallow and nobody answered the roll. First cohort in two hundred years. Stand up straight, operative. They are watching you.' },
    waiting: 'Lune, Hask, then Tallow. Same road as last time. Different ending.',
    done: 'Forty-two passed out this morning. I rang the bell myself.',
    chat: 'Stand up straight, operative. The Span does not care how you stand, but I do.',
  }),
  questTalk({
    npc: 'registrar-lune',
    questId: 'the-next-cohort',
    report: { stepId: 'lune', text: 'Forty-two. Thirty-one files, all blank in the PREVIOUS INTAKE field. The first blank fields I have ever issued. Hask has the recruits.' },
    waiting: 'Hask has them in Processing. Be gentle. They will not remember you. Yet.',
    done: 'Every operative has a file. Forty-two’s are short. I intend to keep them that way.',
    chat: 'Every operative has a file. Every file has an operative. I keep them matched.',
  }),
  questTalk({
    npc: 'officer-hask',
    questId: 'the-next-cohort',
    report: { stepId: 'hask', text: 'Forty-two. Processed, printed, issued. None of them have been here before. I keep saying you again out of habit, and they keep looking confused. It is wonderful. Tallow is the only thing between them and a long career.' },
    waiting: 'Tallow, operative. The Cohort is on the Parade Ground, waiting.',
    done: 'Forty-two is in the field. I have started saying welcome instead of you again.',
    chat: 'Processing, the Print Room, the Recovery Ward and Roster Holding. You have been through all four before.',
  }),
  questTalk({
    npc: 'scav-boss-mags',
    questId: 'off-the-books',
    offer: {
      text: 'No file? The Directorate doesn’t know your name? Lovely. Rustwater has always liked people nobody has a file on. Juno has work for someone who doesn’t exist. Go and see her, and remember who sent you.',
      accept: 'Off the books, then.',
      requires: ['end-of-file'],
      conditions: [{ type: 'hasFlag', flag: ENDING_SIGNED_OUT }],
    },
    report: { stepId: 'mags', text: 'Brightly cancelled, Mercer talked round, Juno paid. Here’s your cut. You’re a scavenger now, kid. One life. Spend it somewhere loud.' },
    waiting: 'Juno first. She’ll have something with a smile on it.',
    done: 'You’re on nobody’s books but mine. And I don’t keep books.',
    chat: MAGS_CHAT,
    chatOptions: [shop('rustwater-stores')],
  }),
  questTalk({
    npc: 'fixer-juno',
    questId: 'off-the-books',
    report: { stepId: 'juno', text: 'A ghost. I love a ghost. The Combine is running Mr Brightly in reruns down in the undercity, to see if anybody notices. Notice him for me. Then get past Mercer. She has orders about people like you.' },
    waiting: 'Brightly, then Mercer. Smile at neither.',
    done: 'Nice clean job, for someone who doesn’t exist.',
    chat: 'Directorate. Cute. In Halcyon the Combine owns the lights, and the lights own everyone else.',
    chatOptions: [shop('halcyon-stores')],
  }),
  questTalk({
    npc: 'agent-mercer',
    questId: 'off-the-books',
    report: { stepId: 'mercer', text: 'I have orders to detain anyone with no file. You have no file. You also cancelled Brightly twice. I am going to look at this wall for a while. When I turn round, you were never here.' },
    waiting: 'I did not see you. Keep it that way.',
    done: 'I still have not seen you. I am very good at it now.',
    chat: MERCER_CHAT,
  }),
];
