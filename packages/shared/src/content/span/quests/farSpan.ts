import type { RecipeDefinition } from '../../../crafting/recipes.ts';
import type { DialogueDefinition, DialogueOption } from '../../../dialogue/dialogue.ts';
import type { ItemDefinition } from '../../../gear/items.ts';
import type { QuestDefinition } from '../../../quests/questDefinition.ts';
import type { QuestlineDefinition } from '../../../quests/questline.ts';
import type { Condition } from '../../../rules/conditions.ts';
import type { GameEffect } from '../../../rules/effects.ts';
import type { WorldObjectDefinition } from '../../../world/entities.ts';
import { active, bye, questItem, questObject, questTalk, say, shop, type QuestTalk } from '../../catalog/dialogueKit.ts';
import { questPay, styleQuestPay, type QuestPay } from '../../catalog/questPay.ts';
import { CLEARANCE_NULL } from '../clearance.ts';

const ACT_THREE_END = 'breach';
const SCRIP = 'meridian-scrip';
const ENDING_RESEALED = 'ending:resealed';
const ENDING_SIGNED_OUT = 'ending:signed-out';
const FILE_CLOSED = 'end-of-file-closed';

const pays = (scrip: number, list: readonly QuestPay[], extra: readonly GameEffect[] = [], lines: readonly string[] = []) => ({
  rewards: [{ type: 'giveItem', itemId: SCRIP, count: scrip } as GameEffect, ...list.map((pay) => pay.effect), ...extra],
  rewardSummary: [scrip + ' Scrip', ...list.map((pay) => pay.line), ...lines],
});

const signalAt = (signal: string, npcId: string, label: string) => ({ type: 'signal' as const, signal, npcId, label });

export const FAR_SPAN_QUESTS: readonly QuestDefinition[] = [
  {
    id: 'sternward',
    name: 'Sternward',
    category: 'main',
    summary: 'Mags Doherty says Site Tallow is two hours sternward, overrun, and still taking roll call every night.',
    offeredBy: 'scav-boss-mags',
    offerRequires: [ACT_THREE_END],
    recommendedLevel: 30,
    steps: [
      { id: 'rook', journal: 'Ask Rook, in the Rustwater Bunks, what he saw at Tallow.', objectives: [{ type: 'talkTo', npcId: 'scav-rook', label: 'Talk to Rook' }] },
      {
        id: 'ready',
        journal: 'Rook says the Tallow yard eats soft operatives. Harden up on the Wreckfield’s rustlings and hull knockers until you reach combat level 30.',
        objectives: [{ type: 'reach', measure: 'combat', level: 30, label: 'Reach combat level 30', toward: { creatures: ['rustling', 'hull-knocker'] } }],
      },
      { id: 'post', journal: 'Find the Tallow Forward Post at the edge of Site Tallow.', objectives: [{ type: 'enterArea', districtId: 'site-tallow', areaId: 'tallow-forward-post', label: 'Reach the Tallow Forward Post' }] },
      { id: 'osei', journal: 'Report to Lieutenant Osei.', objectives: [{ type: 'talkTo', npcId: 'lt-osei', label: 'Report to Lieutenant Osei' }] },
    ],
    ...pays(150, [questPay('fortitude', 30, 20), questPay('salvage', 30, 10)]),
    followUpQuestId: 'name-tape',
  },
  {
    id: 'name-tape',
    name: 'Name Tape',
    category: 'main',
    summary: 'Lieutenant Osei wants to know who is wearing Directorate uniforms inside Tallow. The uniforms are not saying.',
    recommendedLevel: 32,
    steps: [
      { id: 'misprints', journal: 'Put down five misprints in Site Tallow. Do not read their name tapes.', objectives: [{ type: 'defeat', creatureId: 'misprint', count: 5, label: 'Defeat misprints' }] },
      { id: 'board', journal: 'Read the casualty board on the wall of the Tallow yard.', objectives: [{ type: 'interactWith', objectId: 'casualty-board', label: 'Read the casualty board' }], onComplete: [{ type: 'grantExperience', skill: 'research', amount: 4000 }] },
      { id: 'osei', journal: 'Tell Lieutenant Osei whose name is on the board.', objectives: [{ type: 'talkTo', npcId: 'lt-osei', label: 'Tell Lieutenant Osei' }] },
      {
        id: 'steady',
        journal: 'Osei wants a bilge wraith alive. Practise on hounds and rustlings until your Containment reaches 25.',
        objectives: [{ type: 'reach', measure: 'containment', level: 25, label: 'Reach Containment 25', toward: { creatures: ['glass-hound', 'rustling'] } }],
      },
      { id: 'wraith', journal: 'Contain a bilge wraith in Site Tallow. Drive it out of the water first.', objectives: [{ type: 'contain', creatureId: 'bilge-wraith', count: 1, label: 'Contain a bilge wraith' }] },
      { id: 'report', journal: 'Bring the wraith’s cell back to Lieutenant Osei.', objectives: [{ type: 'talkTo', npcId: 'lt-osei', label: 'Report to Lieutenant Osei' }] },
    ],
    ...pays(220, [questPay('containment', 33, 25), questPay('research', 33, 12)]),
    followUpQuestId: 'roll-call',
  },
  {
    id: 'roll-call',
    name: 'Roll Call',
    category: 'main',
    summary: 'The Cohort still parades on Tallow’s ground every night. Thirty-one operatives in step. Thirty-two, if you fall in.',
    recommendedLevel: 36,
    steps: [
      {
        id: 'drill',
        journal: 'The Cohort hits like a door. Train on bilge wraiths and hull knockers until you reach combat level 35.',
        objectives: [{ type: 'reach', measure: 'combat', level: 35, label: 'Reach combat level 35', toward: { creatures: ['bilge-wraith', 'hull-knocker'] } }],
      },
      { id: 'parade', journal: 'Walk onto the Parade Ground at Site Tallow. Out of step.', objectives: [{ type: 'enterArea', districtId: 'site-tallow', areaId: 'tallow-parade', label: 'Enter the Parade Ground' }] },
      { id: 'cohort', journal: 'Defeat the Cohort. Mind the march, and the roll call.', objectives: [{ type: 'defeat', creatureId: 'the-cohort', count: 1, label: 'Defeat the Cohort' }] },
      { id: 'osei', journal: 'Report to Lieutenant Osei.', objectives: [{ type: 'talkTo', npcId: 'lt-osei', label: 'Report to Lieutenant Osei' }] },
    ],
    ...pays(
      400,
      [styleQuestPay(39, 30), questPay('fortitude', 39, 15)],
      [{ type: 'notify', text: 'Osei signs Tallow back to the Directorate. The Cohort was humming as it fell. Cantor Ysolde, at the Choir, will know the tune.' }],
    ),
    questPoints: 2,
  },
  {
    id: 'gone-quiet',
    name: 'Gone Quiet',
    category: 'main',
    summary: 'Site Vesper stopped singing. Then it stopped answering. Dr Nakamura walked out of it and has not stopped shaking.',
    offeredBy: 'cantor-ysolde',
    offerRequires: ['roll-call'],
    recommendedLevel: 40,
    steps: [
      { id: 'nakamura', journal: 'Hear Dr Nakamura out, in the Choir Infirmary.', objectives: [{ type: 'talkTo', npcId: 'dr-nakamura', label: 'Talk to Dr Nakamura' }] },
      { id: 'vesper', journal: 'Cross the glass to Site Vesper and get into Vesper Records.', objectives: [{ type: 'enterArea', districtId: 'site-vesper', areaId: 'vesper-records', label: 'Enter Vesper Records' }] },
      { id: 'recorder', journal: 'Play back the shift recorder abandoned in the Vesper yard.', objectives: [{ type: 'interactWith', objectId: 'vesper-recorder', label: 'Play the shift recorder' }], onComplete: [{ type: 'grantExperience', skill: 'research', amount: 6000 }] },
      { id: 'back', journal: 'Take what you heard back to Dr Nakamura.', objectives: [{ type: 'talkTo', npcId: 'dr-nakamura', label: 'Report to Dr Nakamura' }] },
    ],
    ...pays(300, [questPay('research', 42, 20), styleQuestPay(42, 10)]),
    followUpQuestId: 'countersong',
  },
  {
    id: 'countersong',
    name: 'Countersong',
    category: 'main',
    summary: 'Pilgrim Ruth knows a song that is not the hymn. It needs a bell to carry it, and something to sing it at.',
    recommendedLevel: 43,
    steps: [
      { id: 'ruth', journal: 'Ask Pilgrim Ruth, in the Choir House, how to break a hymn.', objectives: [{ type: 'talkTo', npcId: 'pilgrim-ruth', label: 'Talk to Pilgrim Ruth' }] },
      {
        id: 'skill',
        journal: 'A silence bell takes a fabricator hand. Assemble Wreckfield gear at Oro’s Glassworks until your Engineering reaches 30.',
        objectives: [{ type: 'reach', measure: 'engineering', level: 30, label: 'Reach Engineering 30', toward: { objects: ['ward-fabricator'] } }],
      },
      {
        id: 'bell',
        journal: 'Assemble a silence bell at a fabricator, from three red traces and two breached fittings. Oro’s Glassworks has one.',
        objectives: [{ type: 'craft', itemId: 'silence-bell', count: 1, label: 'Assemble a silence bell' }],
      },
      {
        id: 'steady',
        journal: 'A red twin takes a steady hand. Contain bilge wraiths and rustlings until your Containment reaches 35.',
        objectives: [{ type: 'reach', measure: 'containment', level: 35, label: 'Reach Containment 35', toward: { creatures: ['bilge-wraith', 'rustling'] } }],
      },
      { id: 'twin', journal: 'Ring the bell over a red twin’s hymn and contain it while it is out of tune.', objectives: [{ type: 'contain', creatureId: 'red-twin', count: 1, label: 'Contain a red twin' }] },
      { id: 'ruth-back', journal: 'Tell Pilgrim Ruth the countersong works.', objectives: [{ type: 'talkTo', npcId: 'pilgrim-ruth', label: 'Report to Pilgrim Ruth' }] },
    ],
    ...pays(340, [questPay('containment', 45, 22), questPay('engineering', 45, 10)]),
    followUpQuestId: 'the-last-hymn',
  },
  {
    id: 'the-last-hymn',
    name: 'The Last Hymn',
    category: 'main',
    summary: 'The Precentor leads the hymn from the Nave of Site Vesper. Bring a bell and no sense of rhythm.',
    recommendedLevel: 46,
    steps: [
      { id: 'ysolde', journal: 'Tell Cantor Ysolde you are going into the Nave.', objectives: [{ type: 'talkTo', npcId: 'cantor-ysolde', label: 'Talk to Cantor Ysolde' }] },
      {
        id: 'drill',
        journal: 'The chorus will come out of the dark. Train on red twins and choir echoes until you reach combat level 45.',
        objectives: [{ type: 'reach', measure: 'combat', level: 45, label: 'Reach combat level 45', toward: { creatures: ['red-twin', 'choir-echo'] } }],
      },
      {
        id: 'nave',
        journal: 'Carry the silence bell into the Nave at Site Vesper.',
        objectives: [
          { type: 'obtainItem', itemId: 'silence-bell', count: 1, label: 'Carry the silence bell' },
          { type: 'enterArea', districtId: 'site-vesper', areaId: 'vesper-nave', label: 'Enter the Nave' },
        ],
      },
      { id: 'precentor', journal: 'Defeat the Precentor. Never strike on the beat.', objectives: [{ type: 'defeat', creatureId: 'the-precentor', count: 1, label: 'Defeat the Precentor' }] },
      { id: 'nakamura', journal: 'Tell Dr Nakamura that Vesper is quiet in the ordinary way now.', objectives: [{ type: 'talkTo', npcId: 'dr-nakamura', label: 'Report to Dr Nakamura' }] },
    ],
    ...pays(
      600,
      [styleQuestPay(49, 30), questPay('psionics', 49, 12)],
      [{ type: 'notify', text: 'Nakamura says the hymn was a lullaby, and the Span was the child. Captain Halloran at Last Post wants to know what it was keeping asleep.' }],
    ),
    questPoints: 2,
  },
  {
    id: 'last-post',
    name: 'Last Post',
    category: 'main',
    summary: 'Captain Halloran holds the last Directorate camp on the Span. Past it is Site Null, where the cells are on the outside.',
    offeredBy: 'captain-halloran',
    offerRequires: ['the-last-hymn'],
    recommendedLevel: 50,
    steps: [
      { id: 'vale', journal: 'A man in the Last Post Bunks says he is Sergeant Vale. Go and look at him.', objectives: [{ type: 'talkTo', npcId: 'sergeant-vale-null', label: 'Talk to Sergeant Vale' }] },
      {
        id: 'drill',
        journal: 'Null does not hold back. Train on null echoes and cell-breakers until you reach combat level 52.',
        objectives: [{ type: 'reach', measure: 'combat', level: 52, label: 'Reach combat level 52', toward: { creatures: ['null-echo', 'cell-breaker'] } }],
      },
      { id: 'headhouse', journal: 'Walk to Site Null and enter the Null Headhouse.', objectives: [{ type: 'enterArea', districtId: 'site-null', areaId: 'null-headhouse', label: 'Enter the Null Headhouse' }] },
      { id: 'lune', journal: 'Speak to the registrar at the Null Headhouse.', objectives: [{ type: 'talkTo', npcId: 'registrar-lune-null', label: 'Speak to the registrar' }], onComplete: [{ type: 'setFlag', flag: CLEARANCE_NULL }] },
    ],
    ...pays(500, [questPay('fortitude', 52, 15), questPay('research', 52, 10)], [], ['Clearance for Null Below']),
    followUpQuestId: 'the-outside',
  },
  {
    id: 'the-outside',
    name: 'The Outside',
    category: 'main',
    summary: 'In Null the cells face inward and the corridors are the cells. You are standing in a corridor.',
    recommendedLevel: 53,
    steps: [
      { id: 'descend', journal: 'Take the headhouse lift down to Null Landing.', objectives: [{ type: 'enterArea', districtId: 'null-below', areaId: 'landing', label: 'Reach Null Landing' }] },
      {
        id: 'wards',
        journal: 'Walk the Waiting Room and both wards. Note who is being kept, and from what.',
        objectives: [
          { type: 'enterArea', districtId: 'null-below', areaId: 'chamber-a', label: 'Walk the Waiting Room' },
          { type: 'enterArea', districtId: 'null-below', areaId: 'chamber-b', label: 'Walk the North Ward' },
          { type: 'enterArea', districtId: 'null-below', areaId: 'chamber-c', label: 'Walk the South Ward' },
        ],
      },
      { id: 'echoes', journal: 'Four null echoes are doing their rounds. End their shift.', objectives: [{ type: 'defeat', creatureId: 'null-echo', count: 4, label: 'Defeat null echoes' }] },
    ],
    ...pays(500, [styleQuestPay(53, 20)]),
    followUpQuestId: 'the-review',
  },
  {
    id: 'the-review',
    name: 'The Review',
    category: 'main',
    summary: 'The Warden of Null is reviewing your case in the room at the bottom. You may attend.',
    recommendedLevel: 56,
    steps: [
      {
        id: 'drill',
        journal: 'The Warden wrote the procedures. Train on null stalkers and cell-breakers until you reach combat level 55.',
        objectives: [{ type: 'reach', measure: 'combat', level: 55, label: 'Reach combat level 55', toward: { creatures: ['null-stalker', 'cell-breaker'] } }],
      },
      { id: 'heart', journal: 'Enter the Review, at the heart of Null.', objectives: [{ type: 'enterArea', districtId: 'null-below', areaId: 'heart', label: 'Enter the Review' }] },
      { id: 'warden', journal: 'Defeat the Warden of Null.', objectives: [{ type: 'defeat', creatureId: 'warden-of-null', count: 1, label: 'Defeat the Warden of Null' }] },
      { id: 'console', journal: 'Read the review console the Warden was guarding.', objectives: [{ type: 'interactWith', objectId: 'null-console', label: 'Read the review console' }] },
    ],
    ...pays(800, [styleQuestPay(58, 30), questPay('fortitude', 58, 15)]),
    followUpQuestId: 'end-of-file',
    questPoints: 2,
  },
  {
    id: 'end-of-file',
    name: 'End of File',
    category: 'main',
    summary: 'Registrar Lune added you to the breach list the day the Meridian came down. She can take you off it, or put you back on the Roster. Your call. Literally.',
    recommendedLevel: 58,
    steps: [
      { id: 'vale', journal: 'Sergeant Vale is waiting in the Last Post Bunks. He has an opinion.', objectives: [{ type: 'talkTo', npcId: 'sergeant-vale-null', label: 'Hear Sergeant Vale out' }] },
      { id: 'lune', journal: 'Tell Registrar Lune, in the Null Headhouse, what goes in your file.', objectives: [signalAt(FILE_CLOSED, 'registrar-lune-null', 'Close your file')] },
    ],
    ...pays(1000, [styleQuestPay(58, 40), questPay('research', 58, 20)], [{ type: 'notify', text: 'Your file is closed. Whatever it says, you wrote it.' }]),
    questPoints: 3,
  },
  {
    id: 'by-weight',
    name: 'By Weight',
    category: 'side',
    summary: 'Dutch Hallam buys hull plate by weight. He will not buy yours until you can cut it clean.',
    offeredBy: 'scrapper-hallam',
    offerRequires: [],
    recommendedLevel: 30,
    steps: [
      {
        id: 'train',
        journal: 'Hallam wants clean cuts. Work crusher housings and scrap until your Salvage reaches 30.',
        objectives: [{ type: 'reach', measure: 'salvage', level: 30, label: 'Reach Salvage 30', toward: { objects: ['crusher-housing', 'wreck-plate'] } }],
      },
      { id: 'plate', journal: 'Cut five hull plates from wreck plate on the Wreckfield.', objectives: [{ type: 'gather', itemId: 'hull-plate', count: 5, label: 'Cut hull plate' }] },
      { id: 'hand', journal: 'Bring five hull plates to Hallam’s Breakers.', objectives: [signalAt('by-weight-handed', 'scrapper-hallam', 'Sell Hallam the plate')] },
    ],
    ...pays(180, [questPay('salvage', 31, 12)]),
  },
  {
    id: 'knock-knock',
    name: 'Knock Knock',
    category: 'side',
    summary: 'Faye can’t sleep. Something in the Meridian knocks from the inside all night, and it isn’t the ship.',
    offeredBy: 'rigger-faye',
    offerRequires: [],
    recommendedLevel: 33,
    steps: [
      { id: 'knockers', journal: 'Kill six hull knockers on the Wreckfield.', objectives: [{ type: 'defeat', creatureId: 'hull-knocker', count: 6, label: 'Defeat hull knockers' }] },
      { id: 'faye', journal: 'Tell Faye at Rustwater Works it is quiet now.', objectives: [{ type: 'talkTo', npcId: 'rigger-faye', label: 'Talk to Faye' }] },
    ],
    ...pays(150, [questPay('fortitude', 33, 10)], [{ type: 'giveItem', itemId: 'duralloy-plating', count: 2 }], ['2 Duralloy Plating']),
  },
  {
    id: 'bilge-broth',
    name: 'Bilge Broth',
    category: 'side',
    summary: 'Bello is out of the one ingredient he refuses to name. It is tide weed. Everyone knows it is tide weed.',
    offeredBy: 'cook-bello',
    offerRequires: [],
    recommendedLevel: 30,
    steps: [
      { id: 'weed', journal: 'Cut four bunches of tide weed from the Wreckfield shallows.', objectives: [{ type: 'gather', itemId: 'tide-weed', count: 4, label: 'Cut tide weed' }] },
      { id: 'hand', journal: 'Bring the tide weed to Bello at the Rust Kitchen.', objectives: [signalAt('bilge-broth-handed', 'cook-bello', 'Give Bello the weed')] },
    ],
    ...pays(100, [questPay('biochemistry', 32, 10)], [{ type: 'giveItem', itemId: 'tide-broth' }, { type: 'giveItem', itemId: 'tide-broth' }], ['2 Tide Broth']),
  },
  {
    id: 'dont-answer',
    name: 'Don’t Answer',
    category: 'side',
    summary: 'Rook’s brother Kit went to Tallow at night and answered roll call. Rook wants his tags back. Just the tags.',
    offeredBy: 'scav-rook',
    offerRequires: ['sternward'],
    recommendedLevel: 34,
    steps: [
      { id: 'bag', journal: 'Find Kit Rook’s kit bag somewhere on the Tallow yard and take his tags.', objectives: [{ type: 'obtainItem', itemId: 'kit-rook-tags', count: 1, label: 'Find Kit’s tags' }] },
      { id: 'hand', journal: 'Give the tags to Rook in the Bunks.', objectives: [signalAt('dont-answer-handed', 'scav-rook', 'Give Rook the tags')] },
    ],
    ...pays(160, [questPay('research', 34, 8), styleQuestPay(34, 6)]),
  },
  {
    id: 'coax-the-glass',
    name: 'Coax the Glass',
    category: 'side',
    summary: 'Oro wants red trace for a bell that rings in a colour. He says this is normal for glass.',
    offeredBy: 'glazier-oro',
    offerRequires: [],
    recommendedLevel: 41,
    steps: [
      { id: 'trace', journal: 'Collect five red traces on the Glass Steppe. Study them, or take them off things that hum.', objectives: [{ type: 'obtainItem', itemId: 'red-trace', count: 5, label: 'Collect red trace' }] },
      { id: 'hand', journal: 'Bring the red trace to Oro at the Glassworks.', objectives: [signalAt('coax-the-glass-handed', 'glazier-oro', 'Give Oro the trace')] },
    ],
    ...pays(220, [questPay('engineering', 42, 10)]),
  },
  {
    id: 'refectory-silence',
    name: 'Grace',
    category: 'side',
    summary: 'Choir echoes stand at the Refectory windows every evening, singing grace. Brother Ansel would like to eat once in silence.',
    offeredBy: 'brother-ansel',
    offerRequires: [],
    recommendedLevel: 46,
    steps: [
      { id: 'echoes', journal: 'Put five choir echoes to rest on the Steppe.', objectives: [{ type: 'defeat', creatureId: 'choir-echo', count: 5, label: 'Defeat choir echoes' }] },
      { id: 'ansel', journal: 'Tell Brother Ansel to enjoy his soup.', objectives: [{ type: 'talkTo', npcId: 'brother-ansel', label: 'Talk to Brother Ansel' }] },
    ],
    ...pays(240, [styleQuestPay(47, 10), questPay('fortitude', 47, 6)]),
  },
  {
    id: 'barefoot',
    name: 'Barefoot',
    category: 'side',
    summary: 'Pilgrim Ruth wants you to listen to the glass in three places. Shoes optional. She insists they are optional.',
    offeredBy: 'pilgrim-ruth',
    offerRequires: [],
    recommendedLevel: 41,
    steps: [
      {
        id: 'listen',
        journal: 'Walk the Glass Flats, the Pylon Walk and the Shard Moor, and listen.',
        objectives: [
          { type: 'enterArea', districtId: 'glass-flats', areaId: 'ground', label: 'Listen on the Glass Flats' },
          { type: 'enterArea', districtId: 'pylon-walk', areaId: 'ground', label: 'Listen on the Pylon Walk' },
          { type: 'enterArea', districtId: 'shard-moor', areaId: 'ground', label: 'Listen on the Shard Moor' },
        ],
      },
      { id: 'ruth', journal: 'Tell Pilgrim Ruth what the glass said.', objectives: [{ type: 'talkTo', npcId: 'pilgrim-ruth', label: 'Talk to Pilgrim Ruth' }] },
    ],
    ...pays(200, [questPay('research', 42, 10)]),
  },
  {
    id: 'cuts-like-nothing',
    name: 'Cuts Like Nothing',
    category: 'side',
    summary: 'Engineer Saoirse needs vault residue to keep the generators running, and someone else’s fingers to collect it.',
    offeredBy: 'engineer-saoirse',
    offerRequires: [],
    recommendedLevel: 50,
    steps: [
      {
        id: 'train',
        journal: 'Vault residue fights back. Work breached fittings and sprung cell doors until your Salvage reaches 50.',
        objectives: [{ type: 'reach', measure: 'salvage', level: 50, label: 'Reach Salvage 50', toward: { objects: ['directorate-salvage', 'sprung-cell-door'] } }],
      },
      { id: 'residue', journal: 'Salvage four vault residues in the Spindle.', objectives: [{ type: 'gather', itemId: 'vault-residue', count: 4, label: 'Salvage vault residue' }] },
      { id: 'hand', journal: 'Bring the residue to Saoirse at the Field Workshop.', objectives: [signalAt('cuts-like-nothing-handed', 'engineer-saoirse', 'Give Saoirse the residue')] },
    ],
    ...pays(300, [questPay('salvage', 52, 10), questPay('engineering', 52, 6)]),
  },
  {
    id: 'checked-on',
    name: 'Checked On',
    category: 'side',
    summary: 'Medic Quill’s patients keep coming back with clipboard bruises and a new surname. The null stalkers are doing rounds.',
    offeredBy: 'medic-quill',
    offerRequires: [],
    recommendedLevel: 55,
    steps: [
      { id: 'stalkers', journal: 'Discharge five null stalkers in the Spindle.', objectives: [{ type: 'defeat', creatureId: 'null-stalker', count: 5, label: 'Defeat null stalkers' }] },
      { id: 'quill', journal: 'Tell Medic Quill his patients can keep their names.', objectives: [{ type: 'talkTo', npcId: 'medic-quill', label: 'Talk to Medic Quill' }] },
    ],
    ...pays(320, [styleQuestPay(56, 10), questPay('fortitude', 56, 6)]),
  },
  {
    id: 'last-meal',
    name: 'Last Meal',
    category: 'side',
    summary: 'Perpetua has fed every operative who reached the Spindle. She wants vault bloom for the ones who go down tomorrow.',
    offeredBy: 'cook-perpetua',
    offerRequires: [],
    recommendedLevel: 50,
    steps: [
      { id: 'bloom', journal: 'Harvest three vault blooms in the Spindle. Try not to look back at them.', objectives: [{ type: 'gather', itemId: 'vault-bloom', count: 3, label: 'Harvest vault bloom' }] },
      { id: 'hand', journal: 'Bring the bloom to Perpetua in the Last Post Mess.', objectives: [signalAt('last-meal-handed', 'cook-perpetua', 'Give Perpetua the bloom')] },
    ],
    ...pays(260, [questPay('biochemistry', 52, 10)], [{ type: 'giveItem', itemId: 'tide-broth' }, { type: 'giveItem', itemId: 'tide-broth' }], ['2 Tide Broth']),
  },
];

export const FAR_SPAN_QUESTLINES: readonly QuestlineDefinition[] = [
  { id: 'act-four-overrun', name: 'Act IV · Overrun', kind: 'main', summary: 'Retake Site Tallow, where Cohort 41 died.', questIds: ['sternward', 'name-tape', 'roll-call'] },
  { id: 'act-five-lost', name: 'Act V · Lost', kind: 'main', summary: 'Find out why Site Vesper went silent.', questIds: ['gone-quiet', 'countersong', 'the-last-hymn'] },
  { id: 'act-six-inverted', name: 'Act VI · Inverted', kind: 'main', summary: 'Cross into Site Null, where the cells are on the outside, and choose.', questIds: ['last-post', 'the-outside', 'the-review', 'end-of-file'] },
  { id: 'rustwater-jobs', name: 'Rustwater Jobs', kind: 'side', summary: 'Odd jobs for the scavengers in the Meridian’s shadow.', questIds: ['by-weight', 'knock-knock', 'bilge-broth', 'dont-answer'] },
  { id: 'choir-alms', name: 'Choir Alms', kind: 'side', summary: 'Small mercies for the pilgrims of the Glass Steppe.', questIds: ['coax-the-glass', 'refectory-silence', 'barefoot'] },
  { id: 'last-post-errands', name: 'Last Post Errands', kind: 'side', summary: 'Keeping the last camp on the Span running.', questIds: ['cuts-like-nothing', 'checked-on', 'last-meal'] },
];

type Counted = readonly (readonly [itemId: string, count: number])[];

const counted = (dialogue: DialogueDefinition, items: Counted, signal: string): DialogueDefinition => {
  const hand = dialogue.nodes.hand;
  if (!hand?.options) return dialogue;
  const [give, ...rest] = hand.options;
  if (!give) return dialogue;
  const option: DialogueOption = {
    ...give,
    conditions: items.map(([itemId, count]): Condition => ({ type: 'hasItem', itemId, count })),
    effects: [...items.map(([itemId, count]): GameEffect => ({ type: 'takeItem', itemId, count })), { type: 'emitSignal', signal }],
  };
  return { ...dialogue, nodes: { ...dialogue.nodes, hand: { ...hand, options: [option, ...rest] } } };
};

const handIn = (talk: QuestTalk, items: Counted): DialogueDefinition => counted(questTalk(talk), items, talk.hand?.signal ?? '');

const SHOPS = {
  mags: shop('rustwater-stores'),
  hallam: shop('hallam-breakers'),
  bello: shop('rust-kitchen'),
  ysolde: shop('choir-stores'),
  ansel: shop('choir-refectory'),
  halloran: shop('last-post-stores'),
  quill: shop('last-post-aid'),
};

const ending = (text: string, flag: string, signal: string, next: string): DialogueOption => ({
  text,
  conditions: [{ type: 'lacksFlag', flag: ENDING_RESEALED }, { type: 'lacksFlag', flag: ENDING_SIGNED_OUT }],
  effects: [{ type: 'setFlag', flag }, { type: 'emitSignal', signal }, { type: 'emitSignal', signal: FILE_CLOSED }],
  next,
});

export const FAR_SPAN_DIALOGUES: readonly DialogueDefinition[] = [
  questTalk({
    npc: 'scav-boss-mags',
    questId: 'sternward',
    offer: {
      text: 'You’re the Directorate kid who walked out of Halcyon. Good. Site Tallow is two hours sternward, overrun, and every night it still calls the roll. Somebody has to go and tell it nobody’s coming.',
      accept: 'I’ll go and tell it.',
      requires: [ACT_THREE_END],
    },
    waiting: 'Tallow’s sternward. Talk to Rook first. He went once and came back with all his fingers, which in Rustwater makes him an expert.',
    done: 'Tallow’s quiet. First time in two years I’ve slept through the night. Felt wrong. I’ll get used to it.',
    chat: 'Rustwater cuts the Meridian for parts. She was our grandmothers’ ship. She can spare a few plates.',
    chatOptions: [SHOPS.mags],
  }),
  questTalk({
    npc: 'scav-rook',
    questId: 'sternward',
    notes: [{ stepId: 'rook', text: 'Tallow? Rustlings on the road, wraiths in the wet, and uniforms in the yard. Empty uniforms, walking. One had my brother’s name. Get hard before you go. They don’t stop for tea.' }],
    waiting: '',
    done: 'You came back. Most don’t. Most do, actually, but they come back wrong.',
    chat: 'Tallow’s two hours sternward. Don’t go. If you go, don’t go at night. If you go at night, don’t answer roll call.',
  }),
  handIn(
    {
      npc: 'scav-rook',
      questId: 'dont-answer',
      offer: {
        text: 'My brother Kit went to Tallow at night. Answered roll call. I saw his uniform walking around the yard after. Not him. Just the uniform. His bag’s still out there somewhere. Bring me his tags. Don’t bring me anything else.',
        accept: 'Just the tags.',
        requires: ['sternward'],
      },
      waiting: 'His bag’s on the yard. Green strap, his name on it, smells like him. Like bilge, I mean.',
      hand: { stepId: 'hand', text: 'You found them?', option: 'Here. Kit’s tags.', items: [], signal: 'dont-answer-handed', thanks: 'That’s his. Cold, though. He always ran warm. Thanks, operative. I’ll keep the night shift for both of us.' },
      done: 'I put Kit’s tags on a nail by my bunk. Some nights they rattle. I let them.',
      chat: 'I sleep with one boot on. The other boot keeps watch.',
    },
    [['kit-rook-tags', 1]],
  ),
  questTalk({
    npc: 'lt-osei',
    questId: 'sternward',
    notes: [{ stepId: 'osei', text: 'An operative. An actual one. I’m Lieutenant Osei, this is the Tallow Forward Post, and you are the entire reinforcement. Welcome to the Directorate’s proudest overrun Site.' }],
    waiting: '',
    done: 'Forward Post of two now. Doubled our strength. Don’t let it go to your head.',
    chat: 'Site Tallow is overrun. The Directorate wants it back. I want to know who is wearing our uniforms in there.',
  }),
  questTalk({
    npc: 'lt-osei',
    questId: 'name-tape',
    notes: [
      { stepId: 'misprints', text: 'The uniforms in the yard are misprints. That’s the Kestrel word for a reprint that came out with nobody inside. Thin them out, then read the casualty board on the yard wall. I can’t. I’ve tried.' },
      { stepId: 'board', text: 'The casualty board. Yard wall. Read it and come back. Take your time. It took me a week.' },
      { stepId: 'osei', text: 'Your name. Yes. Mine is on there too, two lines up. We died here, operative, the both of us, and then we got our jobs back. Containment by employment.' },
      { stepId: 'steady', text: 'I need a bilge wraith alive. They were crew once. They answer roll call too. Get your Containment up before you try it; they drown the careless.' },
      { stepId: 'wraith', text: 'One bilge wraith, sealed dry. Drive it out of the water first, or it will just pour itself back into the floor.' },
      { stepId: 'report', text: 'Sealed? Good. It keeps saying a number. Thirty-one. It’s counting the Cohort.' },
    ],
    waiting: '',
    done: 'The wraith counts to thirty-one and starts again. I’ve started sleeping to it.',
    chat: 'You saw the board. Don’t dwell. Dwelling is how they get you to answer.',
  }),
  questTalk({
    npc: 'lt-osei',
    questId: 'roll-call',
    notes: [
      { stepId: 'drill', text: 'The Cohort parades on the Parade Ground every night. It is thirty-one of us fused into one door-sized salute. It hits like a court martial. Get to combat 35 before you go out there.' },
      { stepId: 'parade', text: 'Parade Ground, south yard. Walk on out of step. If you find yourself marching, stop.' },
      { stepId: 'cohort', text: 'It will call the roll when it’s hurt. Uniforms answer. Don’t you answer.' },
      { stepId: 'osei', text: 'It’s down? Then Tallow is ours. Ours meaning the Directorate’s, meaning nobody’s, meaning I am signing a form. It was humming when it fell. Not a Directorate tune. Steppe glass. The Choir will know.' },
    ],
    waiting: '',
    done: 'Site Tallow, SC-IV, status: Strained. That’s an improvement. Put it on my headstone. Again.',
    chat: 'Two of Cohort 41, alive in the ordinary way. Odds were never on us.',
  }),
  handIn(
    {
      npc: 'scrapper-hallam',
      questId: 'by-weight',
      offer: {
        text: 'You want to sell me hull plate? Show me your hands. No. Soft. Get your Salvage to thirty on the crusher housings, then cut me five plates off the wrecks. Clean edges. I can tell.',
        accept: 'Five plates, clean edges.',
      },
      waiting: 'Five plates. If they’re ragged I’ll pay you in rags.',
      hand: { stepId: 'hand', text: 'Let’s see the plate.', option: 'Five hull plates.', items: [], signal: 'by-weight-handed', thanks: 'Hm. Good edges. Better than mine, and I won’t say that twice. Here.' },
      done: 'By weight, not by sentiment. You’ve got the weight now. Keep the sentiment, it doesn’t sell.',
      chat: 'By weight, not by sentiment. Mind the heaps. Some of them rearrange themselves at night.',
      chatOptions: [SHOPS.hallam],
    },
    [['hull-plate', 5]],
  ),
  questTalk({
    npc: 'rigger-faye',
    questId: 'knock-knock',
    offer: {
      text: 'You hear that? Every night. Knock, knock, knock, from inside the hull. It’s hull knockers. Crabs wearing the ship. I have to climb in there tomorrow and I would like it to be a crab-free climb.',
      accept: 'I’ll answer the door.',
    },
    waiting: 'Six knockers should do it. They come in families, and I don’t want to meet the in-laws.',
    notes: [{ stepId: 'faye', text: 'Quiet. Actually quiet. I can hear the hull settle. Two hundred years old and it still creaks like a new ship. Take some plate, I rolled it myself.' }],
    done: 'I slept through the night. The ship didn’t knock once. Still, I check.',
    chat: 'The hull plate is better than anything Halcyon rolls. Two hundred years old and it still won’t rust through.',
  }),
  handIn(
    {
      npc: 'cook-bello',
      questId: 'bilge-broth',
      offer: {
        text: 'I’m out of the secret ingredient. It’s a secret. It’s green and it grows in the shallows and it’s called tide weed. Bring me four bunches and I’ll make you a broth you’ll remember. Not fondly. But you’ll remember.',
        accept: 'Four bunches of the secret.',
      },
      waiting: 'Tide weed. Shallows. Against the current. If it’s going with the current, it isn’t weed, leave it alone.',
      hand: { stepId: 'hand', text: 'Smells like the secret.', option: 'Four bunches of tide weed.', items: [], signal: 'bilge-broth-handed', thanks: 'Perfect. Two bowls for you. Drink it hot. Drink it fast. Don’t look in the bottom.' },
      done: 'Broth’s back on. Rustwater is complaining about it again, so all is well.',
      chat: 'Bilge broth. Don’t ask. Do eat.',
      chatOptions: [SHOPS.bello],
    },
    [['tide-weed', 4]],
  ),
  questTalk({
    npc: 'cantor-ysolde',
    questId: 'gone-quiet',
    offer: {
      text: 'You carry Tallow’s tune. The Cohort was humming our hymn, the one we sing to keep the reliquaries asleep. Site Vesper used to sing it with us. Then Vesper stopped. Dr Nakamura walked out of it. Ask him why.',
      accept: 'I’ll ask him.',
      requires: ['roll-call'],
      conditions: [{ type: 'combatLevel', atLeast: 40 }],
      notReady: 'Vesper ate a Site full of trained operatives. Come back at combat level 40 and I will tell you how.',
    },
    waiting: 'Dr Nakamura is in the Infirmary. Speak gently. He jumps at rhythm.',
    done: 'Vesper is quieter than ever. Not the bad quiet. The other one.',
    chat: 'Welcome, pilgrim. The Choir sings to the reliquaries so they sleep. Vesper stopped singing. Now nothing sleeps.',
    chatOptions: [SHOPS.ysolde],
  }),
  questTalk({
    npc: 'cantor-ysolde',
    questId: 'the-last-hymn',
    notes: [{ stepId: 'ysolde', text: 'You are going into the Nave. The Precentor was the first of us. It led the hymn for a hundred years and then the hymn led it. Ring Ruth’s bell. Never strike on the beat. And if you start to hum, stop.' }],
    waiting: 'The Nave, at Site Vesper. The bell, and no rhythm. You have none? Good.',
    done: 'We sang tonight and nothing sang back. The Choir has never been so pleased to be ignored.',
    chat: 'Welcome back, pilgrim. Your silence is very good. Practised.',
    chatOptions: [SHOPS.ysolde],
  }),
  questTalk({
    npc: 'dr-nakamura',
    questId: 'gone-quiet',
    notes: [
      { stepId: 'nakamura', text: 'Vesper contained a hymn. A precursor song, cut into the glass. We transcribed it. Then we were humming it. Then singing. I was the only one who could not carry a tune. That is why I walked out. Go and play the shift recorder in the Vesper yard. I left it running.' },
      { stepId: 'back', text: 'You heard it. The whole night shift, one note, held for a year. Ruth says there is a song that is not the hymn. Ask her. Please. Ask her and then come and tell me I was not just tone deaf.' },
    ],
    waiting: 'The recorder is in the yard at Vesper, where I dropped it. Records is open. Everything at Vesper is open.',
    done: 'I can hear the hymn when I close my eyes. I have stopped closing my eyes.',
    chat: 'We were containing the hymn. Then we were singing it. Then I was walking, and everyone else was holding the note.',
  }),
  questTalk({
    npc: 'dr-nakamura',
    questId: 'the-last-hymn',
    notes: [{ stepId: 'nakamura', text: 'Quiet. The ordinary kind. Thank you. I have been reading the transcript again. It is not a hymn, it is a lullaby. The Quiet wrote it for the Span. The Span was the child. Which raises the question of what it was being kept from. Captain Halloran at Last Post asks that question for a living.' }],
    waiting: 'The Precentor is in the Nave. I would come, but I would only clap on the beat.',
    done: 'A lullaby for a ring of glass. I keep wondering what it dreams about. I suspect it dreams about us.',
    chat: 'I hum now, sometimes. Badly. On purpose.',
  }),
  questTalk({
    npc: 'pilgrim-ruth',
    questId: 'countersong',
    notes: [
      { stepId: 'ruth', text: 'You cannot out-sing a hymn. You out-ring it. Oro knows the shape of a silence bell: red trace for the voice, breached fittings for the frame. Assemble it at a fabricator. Then find a red twin, ring the bell between its halves, and contain it while it is out of tune.' },
      { stepId: 'bell', text: 'Three red traces, two breached fittings, one fabricator. Oro’s Glassworks has one. Do not let Oro tune it. He will tune it.' },
      { stepId: 'steady', text: 'A red twin is two things that want to be one thing. Get your Containment to thirty-five before you hold them apart.' },
      { stepId: 'twin', text: 'Ring, then seal. Two cells, one for each half. They will hum to each other through the walls. Let them.' },
      { stepId: 'ruth-back', text: 'It broke the hymn? Of course it did. The glass told me. The glass tells me a great many things, most of them about you.' },
    ],
    waiting: '',
    done: 'Keep the bell. Hymns grow back, like hair.',
    chat: 'The Quiet did not build the Span to live on. They built it to keep something in. Listen to the glass.',
  }),
  questTalk({
    npc: 'pilgrim-ruth',
    questId: 'barefoot',
    offer: {
      text: 'You walk on the glass like it is floor. It is not floor. It is a letter. Walk the Glass Flats, the Pylon Walk and the Shard Moor, and listen. Shoes are optional. I have strong views on which option.',
      accept: 'I’ll listen. Shoes on.',
    },
    waiting: 'Three places: the Flats, the Pylon Walk, the Moor. Listen with your feet.',
    notes: [{ stepId: 'ruth', text: 'What did it say? A list of names, under the hum? Yes. It says that to everyone. The question is whether yours was on it twice.' }],
    done: 'You walk differently now. Lighter. Or more careful. The glass cannot tell those apart either.',
    chat: 'The Quiet did not build the Span to live on. They built it to keep something in. Listen to the glass.',
  }),
  handIn(
    {
      npc: 'glazier-oro',
      questId: 'coax-the-glass',
      offer: {
        text: 'I want to blow a bell that rings in red. Not loud, red. For that I need red trace, five of it. Study it off the Steppe or take it off things that hum. Gently. Coax it. Don’t force it.',
        accept: 'Five red traces, coaxed.',
      },
      waiting: 'Five red traces. If any of them are humming, wrap them in cloth. They do not like to be carried while singing.',
      hand: { stepId: 'hand', text: 'Is that red trace I hear?', option: 'Five red traces.', items: [], signal: 'coax-the-glass-handed', thanks: 'Good colour. This will make a bell that rings at the edge of hearing, in red. You will know it when you see it.' },
      done: 'The red bell is hung. When it rings, the pilgrims blush. Nobody knows why. I think it is a success.',
      chat: 'The glass remembers what shape it was. Coax it, don’t force it.',
    },
    [['red-trace', 5]],
  ),
  questTalk({
    npc: 'brother-ansel',
    questId: 'refectory-silence',
    offer: {
      text: 'Every evening the echoes from Vesper come to the Refectory windows and sing grace. Beautifully. For three hours. I would like, once, to eat soup in silence. Five of them, perhaps. The rest will take the hint.',
      accept: 'Five echoes, for soup.',
    },
    waiting: 'Five choir echoes. They walk the Steppe between here and Vesper, still holding the note.',
    notes: [{ stepId: 'ansel', text: 'Listen. Nothing. Just the soup. Sit. Eat. Say nothing. That is the whole grace.' }],
    done: 'The windows are quiet. I find I miss the harmony a little. Do not tell them.',
    chat: 'Soup, bread, silence. The silence is the best part.',
    chatOptions: [SHOPS.ansel],
  }),
  questTalk({
    npc: 'captain-halloran',
    questId: 'last-post',
    offer: {
      text: 'You put Vesper to bed. Good. I need operatives for Site Null, and I need ones who have read their own files. Before you go: there is a man in the Bunks who says he is your sergeant. Go and look at him.',
      accept: 'I’ll go and look.',
      requires: ['the-last-hymn'],
      conditions: [{ type: 'combatLevel', atLeast: 50 }],
      notReady: 'Null rewrites operatives under combat level 50. Come back when it would have to try.',
    },
    waiting: 'Vale in the Bunks, then Null. The registrar there will clear you for the lift. She will also know your name. Do not let it bother you.',
    done: 'Last Post, the last camp, and the first one to see an operative come back from Null with the same file. Probably the same file.',
    chat: 'Last Post. Past here is Site Null, and past Null is the end of the Span. Nobody has come back from Null with the same file they went in with.',
    chatOptions: [SHOPS.halloran],
  }),
  questTalk({
    npc: 'sergeant-vale-null',
    questId: 'last-post',
    notes: [{ stepId: 'vale', text: 'Don’t look at me like that. Yes, I’m Vale. So is the one in Kestrel. The Roster printed me twice, and I walked here to find out why. Null knows. Get yourself hard enough for it, then go and see the registrar.' }],
    waiting: '',
    done: 'I watched the lift go down with you on it. I have never watched anything go down to Null and been sure it was the same thing coming up.',
    chat: 'Don’t look at me like that, recruit. You were printed too.',
  }),
  {
    id: 'sergeant-vale-null',
    entries: [{ node: 'choice', conditions: [active('end-of-file', 'vale')] }, { node: 'resealed', conditions: [{ type: 'hasFlag', flag: ENDING_RESEALED }] }, { node: 'signed-out', conditions: [{ type: 'hasFlag', flag: ENDING_SIGNED_OUT }] }, { node: 'chat' }],
    nodes: {
      choice: say('So. The Span files people as the breach, and Lune keeps the file. She can re-seal Null and put you back on the Roster: you die, it prints you, you serve forever. Or she can sign you out. One life. No reprint.', 'choice-2'),
      'choice-2': say('I’ve been printed four times. I’d like to tell you which I picked. I don’t remember. Go and see Lune.'),
      resealed: { speaker: 'npc', text: 'Back on the Roster. Same as me. See you next time, recruit. And the time after.', options: [bye] },
      'signed-out': { speaker: 'npc', text: 'Signed out. One life. Don’t waste it standing in my bunkhouse.', options: [bye] },
      chat: { speaker: 'npc', text: 'Don’t look at me like that, recruit. You were printed too.', options: [bye] },
    },
  },
  {
    id: 'registrar-lune-null',
    entries: [
      { node: 'clearance', conditions: [active('last-post', 'lune')] },
      { node: 'below', conditions: [active('the-outside')] },
      { node: 'below', conditions: [active('the-review')] },
      { node: 'choice', conditions: [active('end-of-file', 'lune')] },
      { node: 'wait-vale', conditions: [active('end-of-file', 'vale')] },
      { node: 'resealed', conditions: [{ type: 'hasFlag', flag: ENDING_RESEALED }] },
      { node: 'signed-out', conditions: [{ type: 'hasFlag', flag: ENDING_SIGNED_OUT }] },
      { node: 'chat' },
    ],
    nodes: {
      clearance: say('Your file came here before you did. They always do. I have cleared you for the lift. Below is the Outside, and below that is the Review. Do not keep it waiting. It has been waiting two hundred years.'),
      below: say('The lift is behind me. The Review is at the bottom. Mind the staff; they are very thorough.'),
      'wait-vale': say('Sergeant Vale wants a word first. He always does. I keep his file too.'),
      choice: {
        speaker: 'npc',
        text: 'You read the console. Yes, I put you on the list. I put everyone on it, the day the Meridian came down. The Span was built to keep something in, and from where it stands, that something is us. So. Your file. What goes in it?',
        options: [
          ending('Re-seal Null. Put me back on the Roster.', ENDING_RESEALED, 'end-of-file-resealed', 'resealed-said'),
          ending('Sign me out. One life, no reprint.', ENDING_SIGNED_OUT, 'end-of-file-signed-out', 'signed-out-said'),
          { text: 'Not yet.', next: null },
        ],
      },
      'resealed-said': say('Re-sealed. The cells face outward again, and the Roster has a fresh page with your name on it. You will die, operative, and you will be back. Report to Kestrel. They will be pleased to see you, for the first time.'),
      'signed-out-said': say('Signed out. I have struck your name off the Roster and off the breach list both. The Span no longer knows you are here. Neither will the Directorate, soon. Go carefully. You only get the one.'),
      resealed: { speaker: 'npc', text: 'Back on the Roster. Your file is very long now. I am proud of it, in a clerical way.', options: [bye] },
      'signed-out': { speaker: 'npc', text: 'You are not in my files. You should not be able to talk to me. And yet. Goodbye, whoever you are.', options: [bye] },
      chat: { speaker: 'npc', text: 'Your file came here before you did. They always do.', options: [bye] },
    },
  },
  handIn(
    {
      npc: 'engineer-saoirse',
      questId: 'cuts-like-nothing',
      offer: {
        text: 'The generators run on vault glass and I run on swearing. I am low on both. Four vault residues off the Spindle floor. You’ll need Salvage fifty or it will cut you instead. It still might.',
        accept: 'Four residues. Gloves on.',
      },
      waiting: 'Four vault residues. Black, glassy, your reflection lags. Don’t stare at the lag.',
      hand: { stepId: 'hand', text: 'Is that residue? Hand it over slowly.', option: 'Four vault residues.', items: [], signal: 'cuts-like-nothing-handed', thanks: 'Lovely. That’s another month of lights. Hold out your hand. No, the other one. You still have both? Good work.' },
      done: 'Generators are humming. Not singing. I checked.',
      chat: 'Vault glass from the Spindle rim. It cuts like nothing else, including you.',
    },
    [['vault-residue', 4]],
  ),
  questTalk({
    npc: 'medic-quill',
    questId: 'checked-on',
    offer: {
      text: 'My patients come back from the rim with clipboard bruises, insisting their name is something else. It’s the null stalkers. They do rounds. They check on you. Five of them, discharged, and my ward empties.',
      accept: 'Five stalkers. Discharged.',
    },
    waiting: 'Null stalkers. Directorate white, clipboard for a head. If one asks your name, lie.',
    notes: [{ stepId: 'quill', text: 'Bed four woke up this morning and gave his own name. First time in a month. He wept. I may have wept. Here, for your trouble.' }],
    done: 'Coolant burns, mostly, now. Lovely ordinary coolant burns.',
    chat: 'Coolant burns, mostly. And people who come back thinking they’re someone else.',
    chatOptions: [SHOPS.quill],
  }),
  handIn(
    {
      npc: 'cook-perpetua',
      questId: 'last-meal',
      offer: {
        text: 'Everyone who goes down to Null gets a last meal. Not because it’s their last. Because it might be. I need vault bloom for the stock, three of it. It turns towards you when you pick it. Pick it anyway.',
        accept: 'Three blooms.',
      },
      waiting: 'Vault bloom, three. Pale, in the dark, facing you. It doesn’t mind. Much.',
      hand: { stepId: 'hand', text: 'Smells like bloom. Smells like you, a bit.', option: 'Three vault blooms.', items: [], signal: 'last-meal-handed', thanks: 'That’s the stock sorted. Two bowls for you, now and later. Eat the second one when you come back up.' },
      done: 'You came back up. Eat the second bowl. That’s what it was for.',
      chat: 'Eat. You’ll want something warm in you when you go down.',
    },
    [['vault-bloom', 3]],
  ),
];

export const FAR_SPAN_ITEMS: readonly ItemDefinition[] = [
  questItem('kit-rook-tags', 'Kit Rook’s Tags', 'Scavenger tags on a bit of wire: KIT ROOK, RUSTWATER, BLOOD O. Cold, as if they had been in someone’s pocket for two years without the someone.', 'badge', ['#8a8a8a', '#4f6f9e']),
  questItem('silence-bell', 'Silence Bell', 'A small bell of red precursor glass in a Directorate fitting. It rings a note just off any hymn, which is the point.', 'resonator', ['#c84a4a', '#e8e2d4']),
];

export const FAR_SPAN_OBJECTS: readonly WorldObjectDefinition[] = [
  questObject(
    'casualty-board',
    'Casualty Board',
    'The Tallow casualty board. Intake Cohort 41, thirty-one names, chalked in a careful hand and never rubbed out.',
    'noticeBoard',
    'Read',
    [],
    '',
    [{ type: 'notify', text: 'Line nineteen is your name, spelled right, with the date you died: two years ago, at Tallow, on the parade ground. Two lines above it is Lieutenant Osei.' }],
  ),
  questObject(
    'rook-kit-bag',
    'Kit Bag',
    'A scavenger’s kit bag with a green strap. KIT ROOK is inked on the strap, and someone has stamped DIRECTORATE ISSUE over it.',
    'storageLocker',
    'Search',
    [active('dont-answer', 'bag'), { type: 'lacksItem', itemId: 'kit-rook-tags' }],
    'Somebody else’s bag. Rook would want it left alone, unless you are fetching for him.',
    [{ type: 'giveItem', itemId: 'kit-rook-tags' }, { type: 'notify', text: 'Under a folded Directorate uniform, still creased from the printer, you find Kit Rook’s tags.' }],
  ),
  questObject(
    'vesper-recorder',
    'Shift Recorder',
    'A Directorate shift recorder lying face-up in the Vesper yard, still running. The tape counter reads a little over one year.',
    'keycardReader',
    'Play back',
    [],
    '',
    [{ type: 'notify', text: 'One note, held by forty voices, for a year. Under it, very quietly, somebody is reading out a list of names. Yours is on it.' }],
  ),
];

export const FAR_SPAN_RECIPES: readonly RecipeDefinition[] = [
  {
    id: 'fabricator:silence-bell',
    station: 'fabricator',
    skill: 'engineering',
    level: 30,
    inputs: [
      { itemId: 'red-trace', count: 3 },
      { itemId: 'directorate-salvage', count: 2 },
    ],
    output: { itemId: 'silence-bell', count: 1 },
    experience: 300,
    ticks: 6,
  },
];
