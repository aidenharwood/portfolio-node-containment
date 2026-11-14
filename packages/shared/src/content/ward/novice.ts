import type { SkillId } from '../../character/skills.ts';
import type { CreatureDefinition } from '../../combat/creatures.ts';
import type { RecipeDefinition } from '../../crafting/recipes.ts';
import type { DialogueDefinition, DialogueNode, DialogueOption } from '../../dialogue/dialogue.ts';
import type { ItemDefinition, ItemIconShape } from '../../gear/items.ts';
import type { QuestDefinition } from '../../quests/questDefinition.ts';
import type { Condition } from '../../rules/conditions.ts';
import type { GameEffect } from '../../rules/effects.ts';
import type { WorldObjectDefinition } from '../../world/entities.ts';
import type { TilePoint } from '../../world/geometry.ts';
import { CANAL_BASIN, THE_CUT } from '../districts/lowWard.ts';
import { gear } from '../gearItem.ts';
import { DRESSING_THEMES } from '../prefabs/types.ts';
import { TUTORIAL_QUEST_ID } from './quests.ts';

const anchor = (district: { readonly id: string; readonly anchors?: Readonly<Record<string, TilePoint>> }, name: string): TilePoint => {
  const point = district.anchors?.[name];
  if (!point) throw new Error(`District "${district.id}" has no anchor "${name}".`);
  return point;
};

const questItem = (id: string, name: string, examine: string, icon: ItemIconShape, colors: readonly [string, string]): ItemDefinition => ({
  id,
  name,
  examine,
  category: 'quest',
  rarity: 'issued',
  icon,
  iconColors: colors,
  maxStack: 1,
  value: 0,
});

export const NOVICE_ITEMS: readonly ItemDefinition[] = [
  questItem('okafor-coat', "Mr Okafor's Coat", 'A good wool coat, slightly stretched by whatever was wearing it.', 'coat', ['#3a3a4a', '#8a8a8a']),
  questItem('hand-leaf', 'Hand-leaf', 'A leaf with five fingers. It closes slowly around your thumb.', 'moss', ['#5a8a3a', '#b6ff4f']),
  questItem('knocking-notes', "Fennick's Notes", 'Pages of dates and times, each one marked KNOCK, and a sketch of the Site with an arrow pointing down.', 'datapad', ['#d8d0b8', '#5a4a3a']),
  questItem('grey-cat', 'Grey Cat', "Pell's cat. One ear, very warm, and its eyes glow faintly green now.", 'fibre', ['#6a6a72', '#b6ff4f']),
  questItem('drowned-lamp', 'The Drowned Lamp', 'A brass ship lamp, still lit, still wet. It has been both for forty years.', 'cell', ['#d8a03a', '#ffb35a']),
  {
    id: 'valve-part',
    name: 'Valve Part',
    examine: "A sluice valve seat, hammered from a scrap bar to Kofi's pattern.",
    category: 'material',
    rarity: 'standard',
    icon: 'coil',
    iconColors: ['#8a7a6a', '#c84a4a'],
    maxStack: 10,
    value: 5,
  },
  gear({ id: 'eelskin-hood', name: 'Eelskin Hood', examine: 'A hood cut from one enormous eel. It is still slightly slippery.', rarity: 'restricted', icon: 'hood', slot: 'head', stats: { deflection: 5, armor: 2, accuracy: 1 }, requires: { marksmanship: 5 }, visual: { primary: '#1f2a2a', secondary: '#3a5a4a', motif: 'skirmisher' }, value: 120, unique: true }),
  gear({ id: 'crawler-shell', name: 'Crawler Shell', examine: 'The back plate of a scrap crawler, strapped on. It used to be a car door.', rarity: 'restricted', icon: 'vest', slot: 'torso', stats: { armor: 14, deflection: 5, hazardShielding: 2 }, requires: { fortitude: 10 }, visual: { primary: '#6a4a3a', secondary: '#3a3f44', motif: 'bulwark' }, value: 300, unique: true }),
  gear({ id: 'rustling-core', name: 'Rustling Core', examine: 'The amber light from inside a rustling. It whispers about metal.', rarity: 'classified', icon: 'implant', slot: 'implant', stats: { focus: 6, cognitiveWard: 4 }, requires: { psionics: 12 }, visual: { primary: '#e8a21c', secondary: '#3a2a10' }, value: 400, unique: true }),
  gear({ id: 'lamplighter-lantern', name: "Lamplighter's Lantern", examine: 'A small lantern that lights itself when something is watching.', rarity: 'classified', icon: 'badge', slot: 'utility', stats: { insight: 3, cognitiveWard: 3, focus: 2 }, requires: { psionics: 8 }, visual: { primary: '#2a2e31', secondary: '#1a1a1a', emissive: '#ffb35a' }, value: 350, unique: true }),
];

export const NOVICE_RECIPES: readonly RecipeDefinition[] = [
  { id: 'fabricator:valve-part', station: 'fabricator', skill: 'engineering', level: 1, inputs: [{ itemId: 'scrap-bar', count: 1 }], output: { itemId: 'valve-part', count: 1 }, experience: 20, ticks: 4 },
];

interface Beast {
  readonly id: string;
  readonly name: string;
  readonly examine: string;
  readonly model: CreatureDefinition['model'];
  readonly level: number;
  readonly style?: CreatureDefinition['attack']['style'];
  readonly aggressive?: boolean;
  readonly wander?: number;
  readonly loot: CreatureDefinition['loot'];
  readonly containment?: CreatureDefinition['containment'];
  readonly designation?: string;
  readonly integrity?: number;
  readonly range?: number;
}

const beast = (spec: Beast): CreatureDefinition => ({
  id: spec.id,
  name: spec.name,
  ...(spec.designation ? { designation: spec.designation } : {}),
  examine: spec.examine,
  model: spec.model,
  level: spec.level,
  integrity: spec.integrity ?? spec.level * 3 + 4,
  defence: Math.round(spec.level * 0.6),
  attack: { style: spec.style ?? 'melee', accuracy: Math.round(spec.level * 0.6) + 1, maxHit: 1 + Math.floor(spec.level / 4), range: spec.range ?? 1, speedTicks: 4 },
  ...(spec.aggressive ? { aggressive: true } : {}),
  aggroRadius: spec.aggressive ? 3 : 0,
  leashRadius: 7,
  wanderRadius: spec.wander ?? 3,
  respawnTicks: 30 + spec.level * 3,
  experience: spec.level * 10,
  loot: spec.loot,
  ...(spec.containment ? { containment: spec.containment } : {}),
});

export const NOVICE_CREATURES: readonly CreatureDefinition[] = [
  beast({
    id: 'gutter-mite',
    name: 'Gutter Mite',
    designation: 'LW-014',
    examine: 'A mite the size of a fist that came up through the culverts. It glows where it has been eating.',
    model: 'gutterMite',
    level: 6,
    aggressive: true,
    loot: [{ itemId: 'culvert-trace', count: 1, chance: 0.3 }, { itemId: 'rag-bundle', count: 1, chance: 0.2 }],
    containment: { containmentClass: 'safe', procedures: 'Subdue. Jar it. Do not let it near anything it can chew.', experience: 60, loot: [{ itemId: 'culvert-trace', count: 2, chance: 1 }] },
  }),
  beast({
    id: 'silt-eel',
    name: 'Silt Eel',
    examine: 'An eel that has decided it lives on land now. It is very wrong about this and very angry.',
    model: 'siltEel',
    level: 9,
    aggressive: true,
    wander: 2,
    loot: [{ itemId: 'basin-eel', count: 1, chance: 0.6 }, { itemId: 'silt-iron', count: 1, chance: 0.2 }, { itemId: 'eelskin-hood', count: 1, chance: 0.01 }],
  }),
  beast({
    id: 'scrap-crawler',
    name: 'Scrap Crawler',
    examine: 'Car doors and bed springs, walking on six legs of exhaust pipe.',
    model: 'scrapCrawler',
    level: 14,
    aggressive: true,
    loot: [{ itemId: 'scrap-metal', count: 2, chance: 0.8 }, { itemId: 'silt-iron', count: 1, chance: 0.3 }, { itemId: 'iron-bar', count: 1, chance: 0.1 }, { itemId: 'crawler-shell', count: 1, chance: 0.01 }],
  }),
  beast({
    id: 'rustling',
    name: 'Rustling',
    designation: 'LW-031',
    examine: 'A scrap heap that has got up. Hallam says it is the same one that was here yesterday.',
    model: 'rustling',
    level: 18,
    aggressive: true,
    wander: 2,
    loot: [{ itemId: 'scrap-bar', count: 2, chance: 0.6 }, { itemId: 'iron-bar', count: 1, chance: 0.25 }, { itemId: 'rustling-core', count: 1, chance: 0.01 }],
    containment: { containmentClass: 'euclid', procedures: 'Wear it down until the amber light dims. Contain before it reassembles. Use non-ferrous restraints.', experience: 220, loot: [{ itemId: 'iron-bar', count: 2, chance: 1 }], requiredLevel: 10 },
  }),
  beast({
    id: 'line-mimic',
    name: 'Line Mimic',
    designation: 'LW-022',
    examine: "It is wearing Mr Okafor's coat. It is wearing it better than he does.",
    model: 'lineMimic',
    level: 5,
    wander: 2,
    loot: [{ itemId: 'rag-bundle', count: 2, chance: 0.8 }, { itemId: 'okafor-coat', count: 1, chance: 1 }],
    containment: { containmentClass: 'safe', procedures: 'Distract with clean laundry. Subdue. Contain. Return the clothes.', experience: 80, loot: [{ itemId: 'okafor-coat', count: 1, chance: 1 }] },
  }),
  beast({
    id: 'scrap-magpie',
    name: 'Scrap Magpie',
    examine: "A magpie with a nest made entirely of other people's things.",
    model: 'scrapMagpie',
    level: 3,
    wander: 3,
    loot: [{ itemId: 'trace-dust', count: 1, chance: 0.4 }, { itemId: 'scrap-metal', count: 1, chance: 0.3 }],
  }),
  beast({
    id: 'the-lamplighter',
    name: 'The Lamplighter',
    designation: 'LW-007',
    examine: 'Tall, thin and dripping, with a lamp where a hand should be. It came up out of the canal with the Drowned Lamp, and it wants it back.',
    model: 'lamplighter',
    level: 11,
    integrity: 70,
    wander: 2,
    style: 'psionic',
    range: 3,
    loot: [{ itemId: 'drowned-lamp', count: 1, chance: 1 }, { itemId: 'culvert-trace', count: 3, chance: 1 }, { itemId: 'lamplighter-lantern', count: 1, chance: 0.1 }],
  }),
];

const active = (questId: string, stepId?: string): Condition => ({ type: 'questActive', questId, ...(stepId ? { stepId } : {}) });
const completed = (questId: string): Condition => ({ type: 'questCompleted', questId });

const questObject = (
  id: string,
  name: string,
  examine: string,
  model: WorldObjectDefinition['model'],
  verb: string,
  conditions: readonly Condition[],
  failureText: string,
  effects: readonly GameEffect[],
  blocksMovement = true,
): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model,
  blocksMovement,
  furnishing: { mount: 'free', homes: DRESSING_THEMES },
  interactions: [{ verb, conditions, failureText, effects }],
});

export const NOVICE_OBJECTS: readonly WorldObjectDefinition[] = [
  questObject('bed-six', 'Bed Six', 'The leaves have five fingers. They are waving. There is no wind.', 'allotmentBed', 'Uproot', [active('bed-six', 'uproot')], 'Agnes has told everyone not to touch bed six.', [{ type: 'giveItem', itemId: 'hand-leaf' }, { type: 'grantExperience', skill: 'biochemistry', amount: 40 }]),
  questObject('seized-sluice', 'Seized Sluice', 'A sluice valve, rusted solid. The Cut is higher than it should be.', 'sluiceValve', 'Repair', [{ type: 'hasItem', itemId: 'valve-part' }, active('valve-trouble', 'fit')], 'It needs a new valve part, and Kofi to say which one.', [{ type: 'takeItem', itemId: 'valve-part' }, { type: 'grantExperience', skill: 'engineering', amount: 30 }]),
  questObject('fennick-desk', "Fennick's Desk", 'A desk buried in paper. Every sheet is a list of times.', 'table', 'Search', [active('rent-day', 'notes')], "Mrs Crane wouldn't like you going through his things.", [{ type: 'giveItem', itemId: 'knocking-notes' }, { type: 'grantExperience', skill: 'research', amount: 60 }]),
  questObject('grey-cat', 'Grey Cat', 'A grey cat with one ear, sitting very still on a trail of glowing dust. It looks at you like it knows your name.', 'cat', 'Pick up', [active('lost-cat', 'cat')], 'The cat looks at you, then away. It is waiting for someone.', [{ type: 'giveItem', itemId: 'grey-cat' }], false),
  questObject('tenements-vent', 'Alley Vent', 'A big ventilation grate. Warm air, and somewhere far below, a mewing.', 'hatch', 'Climb down', [completed(TUTORIAL_QUEST_ID)], 'You are not going down there before you can look after yourself.', [{ type: 'teleport', districtId: THE_CUT.id, position: anchor(THE_CUT, 'vent-arrival') }], false),
  questObject('cut-hatch', 'Culvert Hatch', "Kofi's service hatch. The culvert runs from here under the basin.", 'hatch', 'Climb in', [completed('valve-trouble')], 'It is locked. Kofi Mensah keeps the key.', [{ type: 'teleport', districtId: CANAL_BASIN.id, position: anchor(CANAL_BASIN, 'hatch-arrival') }], false),
  questObject('basin-hatch', 'Culvert Hatch', 'A service hatch on the quay. The culvert runs from here to the Cut.', 'hatch', 'Climb in', [completed('valve-trouble')], 'It is locked. Kofi Mensah keeps the key.', [{ type: 'teleport', districtId: THE_CUT.id, position: anchor(THE_CUT, 'hatch-arrival') }], false),
];

const xp = (skill: SkillId, amount: number): GameEffect => ({ type: 'grantExperience', skill, amount });
const scrip = (count: number): GameEffect => ({ type: 'giveItem', itemId: 'meridian-scrip', count });

const novice = (quest: Omit<QuestDefinition, 'category'>): QuestDefinition => ({ category: 'side', offerRequires: [TUTORIAL_QUEST_ID], ...quest });

export const NOVICE_QUESTS: readonly QuestDefinition[] = [
  novice({
    id: 'line-thief',
    name: 'Line Thief',
    summary: "Something has been taking Ada Okafor's washing, and now it has her husband's good coat.",
    offeredBy: 'ada-okafor',
    steps: [
      { id: 'catch', journal: "Find whatever is wearing Mr Okafor's coat in the Tenements courtyard. Contain it or put it down, and get the coat back.", objectives: [{ type: 'obtainItem', itemId: 'okafor-coat', count: 1, label: "Recover Mr Okafor's coat" }] },
      { id: 'return', journal: 'Take the coat back to Ada Okafor.', objectives: [{ type: 'signal', signal: 'line.returned', npcId: 'ada-okafor', label: 'Return the coat to Ada' }] },
    ],
    rewards: [xp('containment', 300), scrip(60)],
    rewardSummary: ['1 Quest Point', '300 Containment XP', '60 Scrip'],
  }),
  novice({
    id: 'bed-six',
    name: 'Bed Six',
    summary: "The plant with leaves like hands has grown back in Agnes Pole's allotments, and it waves.",
    offeredBy: 'agnes-pole',
    steps: [
      { id: 'uproot', journal: 'Uproot the hand-leaf in bed six, at the south end of the allotments.', objectives: [{ type: 'interactWith', objectId: 'bed-six', label: 'Uproot bed six' }] },
      { id: 'deliver', journal: 'Take the hand-leaf to Marta Greenhalgh at Greenhalgh Remedies on Market Row.', objectives: [{ type: 'signal', signal: 'bed.delivered', npcId: 'marta-greenhalgh', label: 'Give Marta the hand-leaf' }] },
    ],
    rewards: [xp('biochemistry', 300), xp('research', 100), scrip(40)],
    rewardSummary: ['1 Quest Point', '300 Biochemistry XP', '100 Research XP', '40 Scrip'],
  }),
  novice({
    id: 'valve-trouble',
    name: 'Valve Trouble',
    summary: "Three of Kofi Mensah's sluice valves on the Cut have seized, and the water is rising.",
    offeredBy: 'kofi-mensah',
    steps: [
      { id: 'parts', journal: "Make three valve parts at a fabricator. Each takes a scrap bar: refine scrap metal at Fenwick Tools' refinery first.", objectives: [{ type: 'craft', itemId: 'valve-part', count: 3, label: 'Make valve parts' }] },
      { id: 'fit', journal: 'Fit the parts to the three seized sluices along the Cut.', objectives: [{ type: 'interactWith', objectId: 'seized-sluice', count: 3, label: 'Repair seized sluices' }] },
      { id: 'report', journal: 'Tell Kofi Mensah at the pump house.', objectives: [{ type: 'talkTo', npcId: 'kofi-mensah', label: 'Report to Kofi' }] },
    ],
    rewards: [xp('engineering', 300), xp('refining', 150), scrip(50)],
    rewardSummary: ['1 Quest Point', '300 Engineering XP', '150 Refining XP', '50 Scrip', 'The culvert hatches between the Cut and the basin'],
  }),
  novice({
    id: 'rent-day',
    name: 'Rent Day',
    summary: "Bettina Crane's tenant at Number 20 hasn't paid in months, and nobody has seen him.",
    offeredBy: 'bettina-crane',
    steps: [
      { id: 'search', journal: 'Go to Number 20, in the north-east of the Tenements.', objectives: [{ type: 'enterArea', districtId: 'tenements', areaId: 'home-gale', label: 'Go to Number 20' }] },
      { id: 'notes', journal: "Search Fennick's desk.", objectives: [{ type: 'obtainItem', itemId: 'knocking-notes', count: 1, label: "Find Fennick's notes" }] },
      { id: 'report', journal: 'Show Bettina Crane what you found.', objectives: [{ type: 'signal', signal: 'rent.reported', npcId: 'bettina-crane', label: 'Report to Bettina' }] },
    ],
    rewards: [xp('research', 300), scrip(30)],
    rewardSummary: ['1 Quest Point', '300 Research XP', '30 Scrip', "Fennick's notes"],
  }),
  novice({
    id: 'lost-cat',
    name: 'Lost Cat',
    summary: "Pell's grey cat went down the vent in the Tenements alley. Pell can still hear her.",
    offeredBy: 'pell',
    steps: [
      { id: 'vent', journal: 'Climb down the vent in the Tenements back alley.', objectives: [{ type: 'interactWith', objectId: 'tenements-vent', label: 'Climb down the alley vent' }] },
      { id: 'mites', journal: 'The vent comes out on the Cut. Clear the gutter mites between you and the mewing.', objectives: [{ type: 'defeat', creatureId: 'gutter-mite', count: 3, label: 'Defeat gutter mites' }] },
      { id: 'cat', journal: 'Find the cat near the culvert.', objectives: [{ type: 'obtainItem', itemId: 'grey-cat', count: 1, label: 'Pick up the grey cat' }] },
      { id: 'return', journal: 'Take the cat back to Pell in the Tenements alley.', objectives: [{ type: 'signal', signal: 'cat.returned', npcId: 'pell', label: 'Return the cat to Pell' }] },
    ],
    rewards: [xp('fortitude', 200), xp('closeQuarters', 200), scrip(40)],
    rewardSummary: ['1 Quest Point', '200 Fortitude XP', '200 Close Quarters XP', '40 Scrip'],
  }),
  novice({
    id: 'bright-things',
    name: 'Bright Things',
    summary: "Nell Carraway's lucky charms keep disappearing, and so do the magpies' manners.",
    offeredBy: 'nell-carraway',
    steps: [
      { id: 'magpies', journal: 'Thin out the scrap magpies nesting in the allotments. They keep their distance, so a pistol helps.', objectives: [{ type: 'defeat', creatureId: 'scrap-magpie', count: 3, label: 'Defeat scrap magpies' }] },
      { id: 'report', journal: 'Tell Nell Carraway in the Market Row stall yard.', objectives: [{ type: 'talkTo', npcId: 'nell-carraway', label: 'Report to Nell' }] },
    ],
    rewards: [xp('marksmanship', 300), scrip(40)],
    rewardSummary: ['1 Quest Point', '300 Marksmanship XP', '40 Scrip'],
  }),
  novice({
    id: 'drowned-lamp',
    name: 'The Drowned Lamp',
    summary: 'The lamp the pub is named after has gone missing, and Sol Marsh knows exactly what took it.',
    offeredBy: 'sol-marsh',
    offerRequires: ['lost-cat'],
    recommendedLevel: 10,
    questPoints: 2,
    steps: [
      { id: 'culvert', journal: 'Go into the culvert on the south side of the Cut.', objectives: [{ type: 'enterArea', districtId: 'the-cut', areaId: 'culvert', label: 'Enter the culvert' }] },
      { id: 'lamp', journal: 'Defeat the Lamplighter and take back the Drowned Lamp.', objectives: [{ type: 'defeat', creatureId: 'the-lamplighter', count: 1, label: 'Defeat the Lamplighter' }, { type: 'obtainItem', itemId: 'drowned-lamp', count: 1, label: 'Take the Drowned Lamp' }] },
      { id: 'return', journal: 'Bring the lamp back to Sol Marsh at the Drowned Lamp.', objectives: [{ type: 'signal', signal: 'lamp.returned', npcId: 'sol-marsh', label: 'Return the lamp to Sol' }] },
    ],
    rewards: [xp('closeQuarters', 500), xp('fortitude', 300), scrip(150)],
    rewardSummary: ['2 Quest Points', '500 Close Quarters XP', '300 Fortitude XP', '150 Scrip'],
  }),
];

const say = (text: string, next: string | null = null): DialogueNode => ({ speaker: 'npc', text, next });
const bye: DialogueOption = { text: 'Goodbye.', next: null };
const shop = (shopId: string): DialogueOption => ({ text: 'Show me what you have.', effects: [{ type: 'openShop', shopId }], next: null });

interface Hand {
  readonly stepId: string;
  readonly text: string;
  readonly option: string;
  readonly items: readonly string[];
  readonly signal: string;
  readonly thanks: string;
}

interface QuestTalk {
  readonly npc: string;
  readonly questId: string;
  readonly offer?: { readonly text: string; readonly accept: string; readonly requires?: readonly string[] };
  readonly waiting: string;
  readonly hand?: Hand;
  readonly report?: { readonly stepId: string; readonly text: string };
  readonly done: string;
  readonly chat: string;
  readonly chatOptions?: readonly DialogueOption[];
}

function questTalk(talk: QuestTalk): DialogueDefinition {
  const extra = talk.chatOptions ?? [];
  const nodes: Record<string, DialogueNode> = {
    waiting: say(talk.waiting),
    done: { speaker: 'npc', text: talk.done, options: [...extra, bye] },
    chat: { speaker: 'npc', text: talk.chat, options: [...extra, bye] },
  };
  const entries: { node: string; conditions?: readonly Condition[] }[] = [];
  if (talk.report) {
    nodes.report = say(talk.report.text);
    entries.push({ node: 'report', conditions: [active(talk.questId, talk.report.stepId)] });
  }
  if (talk.hand) {
    const hand = talk.hand;
    nodes.hand = {
      speaker: 'npc',
      text: hand.text,
      options: [
        {
          text: hand.option,
          conditions: hand.items.map((itemId): Condition => ({ type: 'hasItem', itemId })),
          effects: [...hand.items.map((itemId): GameEffect => ({ type: 'takeItem', itemId })), { type: 'emitSignal', signal: hand.signal }],
          next: 'thanks',
        },
        { text: 'Not yet.', next: null },
      ],
    };
    nodes.thanks = say(hand.thanks);
    entries.push({ node: 'hand', conditions: [active(talk.questId, hand.stepId)] });
  }
  if (talk.offer) {
    nodes.offer = { speaker: 'npc', text: talk.offer.text, options: [{ text: talk.offer.accept, effects: [{ type: 'startQuest', questId: talk.questId }], next: null }, { text: 'Not now.', next: null }] };
    entries.push({ node: 'offer', conditions: [...(talk.offer.requires ?? [TUTORIAL_QUEST_ID]).map(completed), { type: 'questNotStarted', questId: talk.questId }] });
    entries.push({ node: 'waiting', conditions: [active(talk.questId)] });
  }
  entries.push({ node: 'done', conditions: [completed(talk.questId)] }, { node: 'chat' });
  return { id: talk.npc, entries, nodes };
}

export const NOVICE_DIALOGUES: readonly DialogueDefinition[] = [
  questTalk({
    npc: 'ada-okafor',
    questId: 'line-thief',
    offer: { text: "Someone's been at my line again. Three shirts this month and now my husband's good coat. I saw it, you know, walking about the courtyard in it, bold as brass. Get it back for me?", accept: "I'll get the coat back." },
    waiting: "It's in the courtyard, wearing his coat. Whatever it is. Mind it doesn't take a fancy to yours.",
    hand: { stepId: 'return', text: 'Is that his coat?', option: 'Give Ada the coat.', items: ['okafor-coat'], signal: 'line.returned', thanks: "Stretched at the shoulders, but it's his. Here, for your trouble. And if you see anything wearing my good tablecloth, you know what to do." },
    done: 'Not a sock missing since. You have my thanks, and my husband has his coat.',
    chat: "Someone's been at my line again.",
  }),
  questTalk({
    npc: 'agnes-pole',
    questId: 'bed-six',
    offer: { text: "It's back. Bed six. The thing with leaves like hands. I burned it last spring and it's back, and it waves at me. Pull it up for me and take it to Marta Greenhalgh. She'll know what to do with it. Or she'll pay for it, which is the same thing.", accept: "I'll pull it up." },
    waiting: 'Bed six, south end. Gloves. Do not let it hold your hand.',
    done: "Nothing's waved at me since. The beans are coming on lovely.",
    chat: 'Plant a bean, get a bean. Mostly.',
  }),
  questTalk({
    npc: 'marta-greenhalgh',
    questId: 'bed-six',
    waiting: '',
    hand: { stepId: 'deliver', text: "Agnes sent you? Then you've brought me something from bed six. Let me see it.", option: 'Give Marta the hand-leaf.', items: ['hand-leaf'], signal: 'bed.delivered', thanks: "Oh, it's holding my finger. That's wonderful. That's terrible. Here, take this, and don't tell Agnes what I'm going to make from it." },
    done: 'The hand-leaf is doing very well in a jar. Better than I am.',
    chat: "Everything here was grown or brewed in the Ward. Since the anomalies, some of the plants grow better. I'm trying not to think about why.",
    chatOptions: [shop('greenhalgh-remedies')],
  }),
  questTalk({
    npc: 'kofi-mensah',
    questId: 'valve-trouble',
    offer: { text: "Three of my sluices have seized along the Cut, and the water's coming up. I need three new valve parts, hammered from scrap bar at a fabricator. Make them, fit them, and I'll give you a key to my culvert hatches.", accept: "I'll make the parts." },
    waiting: 'Three valve parts, one per sluice. The refinery and fabricator at Fenwick Tools will do it. Quickly, if you can.',
    report: { stepId: 'report', text: "Hear that? That's the Cut going back down. Here's the hatch key. The culvert runs from the hatch by the pump house to the basin quay. Mind the mites." },
    done: 'The pumps are singing. The Site stays dry another week.',
    chat: 'If these pumps stop, the basin rises and the Site floods from the bottom up.',
  }),
  questTalk({
    npc: 'bettina-crane',
    questId: 'rent-day',
    offer: { text: "Mr Fennick at Number 20 owes me four months. Nobody's seen him since spring. I've a key, but I'm not going in there. He used to write things on the walls about the knocking. Go and see, and if he's dead, tell me gently.", accept: "I'll look." },
    waiting: 'Number 20, north-east corner. Go on.',
    hand: { stepId: 'report', text: 'Well? Is he there?', option: "Show Bettina Fennick's notes.", items: [], signal: 'rent.reported', thanks: "Times. Hundreds of times, all marked KNOCK, and a drawing of the Site with an arrow pointing down. He's not dead, then. He's gone down after it. Keep those. Someone should, and it isn't going to be me." },
    done: "I've let Number 20 to a nice quiet couple. They say the knocking's very regular.",
    chat: "Rent's due Thursdays. Quiet after ten.",
  }),
  questTalk({
    npc: 'pell',
    questId: 'lost-cat',
    offer: { text: "Lost a cat. Grey, one ear. She went down the vent by the bins and I've heard her since, but she doesn't come up. You'll go down? I'd go, but I'm, well. I'd go.", accept: "I'll find her." },
    waiting: "The vent by the bins. She'll be near the bottom, wherever the bottom is.",
    hand: { stepId: 'return', text: 'Is that, is that her?', option: 'Give Pell the grey cat.', items: ['grey-cat'], signal: 'cat.returned', thanks: "Her eyes are green. They weren't green. Doesn't matter. Doesn't matter at all. Thank you. The vent's yours, if you ever want the quick way down to the Cut." },
    done: 'She sleeps on the vent now. Says she likes the warm. Doesn\'t say. You know.',
    chat: 'Leaning here. Watching the vent. Habit.',
  }),
  questTalk({
    npc: 'nell-carraway',
    questId: 'bright-things',
    offer: { text: "My lucky charms keep going missing! It's the magpies off the allotments, I'd swear on my barrow. Thin them out for me? You'll want a pistol. They don't come close enough to hit.", accept: "I'll deal with the magpies." },
    waiting: 'The allotments, south of the station. Three of them should teach the rest some manners.',
    report: { stepId: 'report', text: "You did? Bless you. Here, scrip, and a charm. No, keep the charm, I've plenty. The magpies had most of them." },
    done: 'Not a charm gone missing since. Well. Fewer.',
    chat: 'Lamps, laces, lucky charms! The charms work about as well as the lamps.',
  }),
  questTalk({
    npc: 'sol-marsh',
    questId: 'drowned-lamp',
    offer: { text: "The lamp's gone. The Drowned Lamp, off the hook above the bar. And I know what took it. I saw it come up out of the canal the night they first pulled that lamp out, forty years ago. Tall, wet, with a light where its hand should be. It lives in the culvert on the Cut now. You've been down there. Get my lamp back.", accept: "I'll get the lamp back.", requires: ['lost-cat'] },
    waiting: "The culvert on the south side of the Cut. It'll be the one holding a lamp. Don't let it get behind you.",
    hand: { stepId: 'return', text: "Is that, give it here. Still lit. Still wet. Forty years and it's never been anything else.", option: 'Give Sol the Drowned Lamp.', items: ['drowned-lamp'], signal: 'lamp.returned', thanks: "Back on its hook. Drinks are on the house, once. And here, for the bother. If anything else comes up that canal, I'll know who to ask." },
    done: 'The lamp burns brighter since you brought it back. I try not to think about that.',
    chat: 'The Drowned Lamp. Named for the one they pulled out of the canal, still lit.',
  }),
];
