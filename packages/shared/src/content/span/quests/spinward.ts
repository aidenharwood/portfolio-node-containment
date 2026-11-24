import type { RecipeDefinition } from '../../../crafting/recipes.ts';
import type { DialogueDefinition, DialogueNode, DialogueOption } from '../../../dialogue/dialogue.ts';
import type { ItemDefinition } from '../../../gear/items.ts';
import type { QuestDefinition } from '../../../quests/questDefinition.ts';
import type { QuestlineDefinition } from '../../../quests/questline.ts';
import type { WorldObjectDefinition } from '../../../world/entities.ts';
import { active, bye, questItem, questObject, questTalk, say, shop } from '../../catalog/dialogueKit.ts';
import { questPay, styleQuestPay, type QuestPay } from '../../catalog/questPay.ts';
import { CLEARANCE_GALLOWGLASS } from '../clearance.ts';

const scrip = (count: number): QuestPay => ({ effect: { type: 'giveItem', itemId: 'meridian-scrip', count }, line: `${count} Scrip` });

const paid = (pays: readonly QuestPay[], extra: QuestDefinition['rewards'] = []) => ({ rewards: [...pays.map((pay) => pay.effect), ...extra], rewardSummary: pays.map((pay) => pay.line) });

export const SPINWARD_QUESTS: readonly QuestDefinition[] = [
  {
    id: 'harrow-call',
    name: 'A Call from Harrowgate',
    category: 'main',
    summary: 'Harrowgate feeds half the Span, and Site Orchard has started eating it back. Reeve Halvard wants a Directorate badge in his wheat.',
    offeredBy: 'reeve-halvard',
    offerRequires: ['paper-trail'],
    recommendedLevel: 8,
    steps: [
      { id: 'tull', journal: 'Ask Steward Tull at the Co-op Stores what Harrowgate has been losing.', objectives: [{ type: 'talkTo', npcId: 'steward-tull', label: 'Talk to Steward Tull' }] },
      { id: 'fields', journal: 'Seed mites are sprouting in the terraces around Harrowgate. Put down six of them.', objectives: [{ type: 'defeat', creatureId: 'seed-mite', count: 6, label: 'Defeat seed mites' }] },
      {
        id: 'fenn',
        journal: 'Walk north up the terraces to Site Orchard and report to Corporal Fenn in the Orchard Gatehouse.',
        objectives: [
          { type: 'enterArea', districtId: 'site-orchard', areaId: 'orchard-gatehouse', label: 'Reach the Orchard Gatehouse' },
          { type: 'talkTo', npcId: 'corporal-fenn', label: 'Report to Corporal Fenn' },
        ],
      },
    ],
    ...paid([scrip(150), styleQuestPay(12, 2), questPay('containment', 12, 1)]),
    followUpQuestId: 'seed-stock',
  },
  {
    id: 'seed-stock',
    name: 'Seed Stock',
    category: 'main',
    summary: 'Site Orchard is SC-II, Strained. Its seed stock is walking out of the vault on two legs and a coat.',
    recommendedLevel: 11,
    steps: [
      { id: 'kessel', journal: 'Meet Dr Ama Kessel in the Orchard Laboratory.', objectives: [{ type: 'talkTo', npcId: 'dr-kessel', label: 'Talk to Dr Kessel' }] },
      { id: 'ready', journal: 'Scarecoats will not go into a bag for an amateur. Train your Containment to level 10.', objectives: [{ type: 'reach', measure: 'containment', level: 10, label: 'Reach Containment 10', toward: { creatures: ['grounds-mite', 'sim-wisp'] } }] },
      { id: 'coats', journal: 'Wear down two scarecoats in the Orchard grounds and contain them. Do not try them on.', objectives: [{ type: 'contain', creatureId: 'scarecoat', count: 2, label: 'Contain scarecoats' }] },
      {
        id: 'vault',
        journal: 'Find the seed drawer the scarecoats dragged out of the Seed Vault and read its ledger.',
        objectives: [{ type: 'interactWith', objectId: 'orchard-seed-drawer', label: 'Read the seed ledger' }],
        onComplete: [questPay('research', 12, 1).effect],
      },
      { id: 'report', journal: 'Tell Dr Kessel what the ledger says.', objectives: [{ type: 'talkTo', npcId: 'dr-kessel', label: 'Report to Dr Kessel' }] },
    ],
    ...paid([scrip(200), questPay('containment', 13, 2), questPay('research', 13, 1)]),
    followUpQuestId: 'the-keeper',
  },
  {
    id: 'the-keeper',
    name: 'The Orchard Keeper',
    category: 'main',
    summary: 'ORC-001 tends the Mother Rows and has filed you under weeds. Dr Kessel would like it pruned.',
    recommendedLevel: 15,
    steps: [
      { id: 'ready', journal: 'The Keeper is level 15 and brings friends. Kessel will not let you into the Rows below combat level 14.', objectives: [{ type: 'reach', measure: 'combat', level: 14, label: 'Reach combat level 14', toward: { creatures: ['seed-mite', 'scarecoat'] } }] },
      { id: 'rows', journal: 'Go through the fence into the Mother Rows, south of the Orchard compound.', objectives: [{ type: 'enterArea', districtId: 'site-orchard', areaId: 'orchard-rows', label: 'Enter the Mother Rows' }] },
      { id: 'keeper', journal: 'Put down the Orchard Keeper. When it plants its lamp, kill the mites first.', objectives: [{ type: 'defeat', creatureId: 'orchard-keeper', count: 1, label: 'Defeat the Orchard Keeper' }] },
      { id: 'kessel', journal: 'Report to Dr Kessel in the Orchard Laboratory.', objectives: [{ type: 'talkTo', npcId: 'dr-kessel', label: 'Report to Dr Kessel' }] },
    ],
    ...paid([scrip(300), styleQuestPay(15, 3), questPay('containment', 15, 2), questPay('fortitude', 15, 1)], [
      { type: 'notify', text: 'Site Orchard: Strained, downgraded to Secure, pending. Kessel has wired an Agent Mercer at Site Gallowglass. Mercer did not wire back. Halcyon is the next Seam round the Massif.' },
    ]),
    followUpQuestId: 'bright-lights',
  },
  {
    id: 'bright-lights',
    name: 'Bright Lights',
    category: 'main',
    summary: 'Site Gallowglass is Breached, unless you ask the Aurelian Combine, in which case it is fine and you should buy something.',
    recommendedLevel: 20,
    steps: [
      { id: 'juno', journal: 'Cross the Seam into Halcyon. Find Juno Reyes, the fixer on Neon Row, and ask how things stand at Gallowglass.', objectives: [{ type: 'talkTo', npcId: 'fixer-juno', label: 'Talk to Juno Reyes' }] },
      { id: 'vance', journal: 'Present yourself to Liaison Vance in the Aurelian Lobby, Spire Plaza. Try not to sign anything.', objectives: [{ type: 'talkTo', npcId: 'liaison-vance', label: 'Talk to Liaison Vance' }] },
      {
        id: 'mercer',
        journal: 'Find Field Agent Mercer in the Gallowglass Headhouse.',
        objectives: [
          { type: 'enterArea', districtId: 'site-gallowglass', areaId: 'gallowglass-headhouse', label: 'Reach the Gallowglass Headhouse' },
          { type: 'talkTo', npcId: 'agent-mercer', label: 'Talk to Agent Mercer' },
        ],
      },
    ],
    ...paid([scrip(250), styleQuestPay(20, 2), questPay('research', 20, 1)]),
    followUpQuestId: 'dead-air',
  },
  {
    id: 'dead-air',
    name: 'Dead Air',
    category: 'main',
    summary: 'Every dead screen in Halcyon is still showing one advert. Mercer wants to know where it is being broadcast from.',
    recommendedLevel: 22,
    steps: [
      { id: 'ready', journal: 'Mercer will not sign you down the lift below combat level 20.', objectives: [{ type: 'reach', measure: 'combat', level: 20, label: 'Reach combat level 20', toward: { creatures: ['neon-moth', 'alley-crawler'] } }] },
      { id: 'screens', journal: 'Check three dead screens around Halcyon: on Neon Row, Ninth Street and Spire Plaza.', objectives: [{ type: 'interactWith', objectId: 'dead-screen', count: 3, label: 'Check dead screens' }] },
      { id: 'wraiths', journal: 'Ad-wraiths are carrying the signal up from the undercity. Cut four of them off the air.', objectives: [{ type: 'defeat', creatureId: 'ad-wraith', count: 4, label: 'Defeat ad-wraiths' }] },
      { id: 'tam', journal: 'Ask Tam, the runner in Flat 3, Glasshouse Alley, which way the signal comes up.', objectives: [{ type: 'talkTo', npcId: 'runner-tam', label: 'Talk to Tam' }] },
      {
        id: 'mercer',
        journal: 'Take what Tam told you back to Agent Mercer.',
        objectives: [{ type: 'talkTo', npcId: 'agent-mercer', label: 'Report to Agent Mercer' }],
        onComplete: [{ type: 'setFlag', flag: CLEARANCE_GALLOWGLASS }, { type: 'notify', text: 'Mercer signs your name into the lift book. Clearance for the Gallowglass undercity.' }],
      },
    ],
    ...paid([scrip(300), styleQuestPay(22, 2), questPay('research', 22, 1)]),
    followUpQuestId: 'breach',
  },
  {
    id: 'breach',
    name: 'Breach',
    category: 'main',
    summary: 'GLG-001 is loose in the Gallowglass undercity, and it is very pleased to see you.',
    recommendedLevel: 27,
    steps: [
      { id: 'descend', journal: 'Take the headhouse lift down into the Gallowglass undercity.', objectives: [{ type: 'enterArea', districtId: 'gallowglass-undercity', areaId: 'secure-lift', label: 'Reach the Undercity Landing' }] },
      { id: 'cellblock', journal: 'Push through to Cellblock Glass, where the hounds were kept.', objectives: [{ type: 'enterArea', districtId: 'gallowglass-undercity', areaId: 'cellblock', label: 'Reach Cellblock Glass' }] },
      { id: 'reel', journal: 'Find the reel still running in the Control Room and watch it.', objectives: [{ type: 'interactWith', objectId: 'brightly-reel', label: 'Watch the Brightly reel' }], onComplete: [questPay('research', 25, 1).effect] },
      { id: 'studio', journal: 'Mr Brightly is filming in the Studio. Go in. Bring friends; the Studio takes all comers.', objectives: [{ type: 'enterArea', districtId: 'gallowglass-undercity', areaId: 'breach-ward', label: 'Enter the Studio' }] },
      { id: 'brightly', journal: 'End Mr Brightly. Cut the static, then the focus group, then the smile.', objectives: [{ type: 'defeat', creatureId: 'mr-brightly', count: 1, label: 'Defeat Mr Brightly' }] },
      { id: 'mercer', journal: 'Go back up and tell Agent Mercer the screens are dark.', objectives: [{ type: 'talkTo', npcId: 'agent-mercer', label: 'Report to Agent Mercer' }] },
    ],
    ...paid([scrip(600), styleQuestPay(28, 3), questPay('containment', 28, 2), questPay('fortitude', 28, 1)], [
      { type: 'notify', text: 'The last frame of the reel was a recruiting advert. SITE TALLOW: NOW HIRING. The cast list was Intake Cohort 41. Your name was third.' },
    ]),
  },
  {
    id: 'names-in-the-bunks',
    name: 'Names in the Bunks',
    category: 'side',
    summary: 'Recruit Dace found her own name scratched into a bunk in Barracks 41. The scratches are two years old.',
    offeredBy: 'recruit-dace',
    offerRequires: ['report-for-intake'],
    recommendedLevel: 2,
    steps: [
      { id: 'frame', journal: 'Find the old bunk frame Stores dragged out onto the Commons for scrap, and read the names on it.', objectives: [{ type: 'interactWith', objectId: 'barracks-bunk-frame', label: 'Read the bunk frame' }] },
      { id: 'marr', journal: 'Ask Chaplain Marr in the Cohort Hall, Recruit Lines, whether those names are on his list.', objectives: [{ type: 'talkTo', npcId: 'chaplain-marr', label: 'Talk to Chaplain Marr' }] },
      { id: 'dace', journal: 'Tell Dace what the Chaplain said. Gently.', objectives: [{ type: 'talkTo', npcId: 'recruit-dace', label: 'Talk to Dace' }] },
    ],
    ...paid([scrip(40), questPay('research', 3, 2)]),
  },
  {
    id: 'table-for-two',
    name: 'A Table for Two',
    category: 'side',
    summary: 'Mrs Hale’s son came back from Tallow and does not remember the garden. She would like him to.',
    offeredBy: 'widow-hale',
    offerRequires: ['report-for-intake'],
    recommendedLevel: 2,
    steps: [
      { id: 'tobin', journal: 'Old Tobin at Number Twelve knew the Hale boy. Ask him about the garden.', objectives: [{ type: 'talkTo', npcId: 'old-man-tobin', label: 'Talk to Old Tobin' }], onComplete: [{ type: 'giveItem', itemId: 'hale-seed-tin' }] },
      { id: 'hale', journal: 'Bring the seed tin back to Mrs Hale at Number Four.', objectives: [{ type: 'signal', signal: 'hale-tin-returned', npcId: 'widow-hale', label: 'Give Mrs Hale the seed tin' }] },
    ],
    ...paid([scrip(40), questPay('biochemistry', 3, 2)]),
  },
  {
    id: 'heartbeat',
    name: 'A Heartbeat I Have Heard Before',
    category: 'side',
    summary: 'Medic Sauer keeps a drawer of heart traces. Yours matches one of them. She wants a control sample.',
    offeredBy: 'medic-sauer',
    offerRequires: ['report-for-intake'],
    recommendedLevel: 5,
    steps: [
      { id: 'mites', journal: 'Contain three grounds mites around Kestrel. Sauer wants something alive that has never been reprinted.', objectives: [{ type: 'contain', creatureId: 'grounds-mite', count: 3, label: 'Contain grounds mites' }] },
      { id: 'sauer', journal: 'Report back to Medic Sauer in the Commons Clinic.', objectives: [{ type: 'talkTo', npcId: 'medic-sauer', label: 'Talk to Medic Sauer' }] },
    ],
    ...paid([scrip(60), questPay('containment', 6, 2), questPay('fortitude', 6, 1)]),
  },
  {
    id: 'governor',
    name: 'The Governor',
    category: 'side',
    summary: 'The Training Yard drones have started hitting back. Technician Oduya needs a governor built, and her hands are full.',
    offeredBy: 'technician-oduya',
    offerRequires: ['report-for-intake'],
    recommendedLevel: 8,
    steps: [
      { id: 'build', journal: 'Assemble a drone governor at a fabricator, from scrap plating and trace dust.', objectives: [{ type: 'craft', itemId: 'drone-governor', count: 1, label: 'Assemble a drone governor' }] },
      { id: 'fit', journal: 'Bring the governor to Technician Oduya in the Fabrication Shed.', objectives: [{ type: 'signal', signal: 'governor-fitted', npcId: 'technician-oduya', label: 'Give Oduya the governor' }] },
    ],
    ...paid([scrip(80), questPay('engineering', 8, 3)]),
  },
  {
    id: 'coat-check',
    name: 'Coat Check',
    category: 'side',
    summary: 'Farmer Greaves’s top field is walking. Three coats, no wearers.',
    offeredBy: 'farmer-greaves',
    offerRequires: ['harrow-call'],
    recommendedLevel: 13,
    steps: [
      { id: 'coats', journal: 'Contain three scarecoats on the terraces. They walk the fields north of the Lanes.', objectives: [{ type: 'contain', creatureId: 'scarecoat', count: 3, label: 'Contain scarecoats' }] },
      { id: 'greaves', journal: 'Tell Farmer Greaves at Furrow Cottage that his field is standing still.', objectives: [{ type: 'talkTo', npcId: 'farmer-greaves', label: 'Talk to Farmer Greaves' }] },
    ],
    ...paid([scrip(120), questPay('containment', 13, 2)]),
  },
  {
    id: 'dry-season',
    name: 'Dry Season',
    category: 'side',
    summary: 'The sluices on Sluice Row have jammed, and the furrow eels are swimming in what is left.',
    offeredBy: 'farmer-adaeze',
    offerRequires: ['paper-trail'],
    recommendedLevel: 9,
    steps: [
      { id: 'eels', journal: 'Clear five furrow eels off the low terraces.', objectives: [{ type: 'defeat', creatureId: 'furrow-eel', count: 5, label: 'Defeat furrow eels' }] },
      { id: 'sluice', journal: 'Free the jammed sluice gate on Sluice Row.', objectives: [{ type: 'interactWith', objectId: 'jammed-sluice', label: 'Free the sluice gate' }] },
      { id: 'adaeze', journal: 'Tell Adaeze Okoro at Sluice Cottage the water is running.', objectives: [{ type: 'talkTo', npcId: 'farmer-adaeze', label: 'Talk to Adaeze' }] },
    ],
    ...paid([scrip(90), styleQuestPay(9, 2)]),
  },
  {
    id: 'bitter-herbs',
    name: 'Bitter Herbs',
    category: 'side',
    summary: 'Ada Wynn’s reeds grow better since the Orchard started to strain. She wants a fresh cutting to find out why.',
    offeredBy: 'apothecary-wynn',
    offerRequires: ['paper-trail'],
    recommendedLevel: 8,
    steps: [
      { id: 'reeds', journal: 'Cut four reed bundles from the reed beds.', objectives: [{ type: 'gather', itemId: 'reed-bundle', count: 4, label: 'Gather reed bundles' }] },
      { id: 'wynn', journal: 'Bring the reeds to Ada Wynn in the dispensary, Harrowgate.', objectives: [{ type: 'signal', signal: 'wynn-reeds', npcId: 'apothecary-wynn', label: 'Give Ada Wynn the reeds' }] },
    ],
    ...paid([scrip(70), questPay('biochemistry', 8, 2), questPay('salvage', 8, 1)]),
  },
  {
    id: 'mostly-wheat',
    name: 'Mostly Wheat',
    category: 'side',
    summary: 'Pia Ostrowski found a tooth in a loaf. Not a person’s. Something is nesting in the tithe barns.',
    offeredBy: 'baker-ostrowski',
    offerRequires: ['harrow-call'],
    recommendedLevel: 16,
    steps: [
      { id: 'thorns', journal: 'Put down three thornbacks on the upper terraces, where the barns are.', objectives: [{ type: 'defeat', creatureId: 'thornback', count: 3, label: 'Defeat thornbacks' }] },
      { id: 'pia', journal: 'Tell Pia Ostrowski her flour is safe. Mostly.', objectives: [{ type: 'talkTo', npcId: 'baker-ostrowski', label: 'Talk to Pia Ostrowski' }] },
    ],
    ...paid([scrip(140), styleQuestPay(16, 2)]),
  },
  {
    id: 'unsubscribe',
    name: 'Unsubscribe',
    category: 'side',
    summary: 'Ines Roux threw out her fridge because Mr Brightly lives in it. He has not moved out.',
    offeredBy: 'tenant-roux',
    offerRequires: ['the-keeper'],
    recommendedLevel: 22,
    steps: [
      { id: 'fridge', journal: 'Pull the plug on the smiling fridge out on Spire Plaza.', objectives: [{ type: 'interactWith', objectId: 'smiling-fridge', label: 'Unplug the fridge' }] },
      { id: 'wraiths', journal: 'The fridge was a relay. Cut three ad-wraiths off the air.', objectives: [{ type: 'defeat', creatureId: 'ad-wraith', count: 3, label: 'Defeat ad-wraiths' }] },
      { id: 'roux', journal: 'Tell Ines Roux in Flat 9C she can take the tape off.', objectives: [{ type: 'talkTo', npcId: 'tenant-roux', label: 'Talk to Ines Roux' }] },
    ],
    ...paid([scrip(220), styleQuestPay(22, 2)]),
  },
  {
    id: 'last-orders',
    name: 'Last Orders',
    category: 'side',
    summary: 'The neon moths have discovered the Static Bloom’s jukebox. Kit would like them to undiscover it.',
    offeredBy: 'bartender-kit',
    offerRequires: ['the-keeper'],
    recommendedLevel: 21,
    steps: [
      { id: 'moths', journal: 'Lure four neon moths away from the signs and contain them.', objectives: [{ type: 'contain', creatureId: 'neon-moth', count: 4, label: 'Contain neon moths' }] },
      { id: 'kit', journal: 'Tell Kit Moreau at the Static Bloom the jukebox is safe.', objectives: [{ type: 'talkTo', npcId: 'bartender-kit', label: 'Talk to Kit' }] },
    ],
    ...paid([scrip(200), questPay('containment', 21, 2)]),
  },
  {
    id: 'package-deal',
    name: 'Package Deal',
    category: 'side',
    summary: 'Tam does not run packages into the undercity any more. He runs one last package across town.',
    offeredBy: 'runner-tam',
    offerRequires: ['the-keeper'],
    recommendedLevel: 20,
    steps: [
      { id: 'collect', journal: 'Collect the parcel from Tam.', objectives: [{ type: 'talkTo', npcId: 'runner-tam', label: 'Collect the parcel' }], onComplete: [{ type: 'giveItem', itemId: 'tam-parcel' }] },
      { id: 'pike', journal: 'Take the parcel to Jonah Pike at Pawn & Patch, Ninth Street.', objectives: [{ type: 'signal', signal: 'tam-parcel-pawned', npcId: 'pawnbroker-pike', label: 'Hand the parcel to Pike' }], onComplete: [{ type: 'giveItem', itemId: 'pike-envelope' }] },
      { id: 'esperanza', journal: 'Take Pike’s envelope to Doc Esperanza in the Back-alley Clinic.', objectives: [{ type: 'signal', signal: 'envelope-delivered', npcId: 'doc-esperanza', label: 'Give Esperanza the envelope' }] },
      { id: 'tam', journal: 'Go back to Tam in Flat 3.', objectives: [{ type: 'talkTo', npcId: 'runner-tam', label: 'Talk to Tam' }] },
    ],
    ...paid([scrip(260), questPay('research', 20, 1), questPay('fortitude', 20, 1)]),
  },
  {
    id: 'forty-floors',
    name: 'Forty Floors',
    category: 'side',
    summary: 'The top ten floors of the Aurelian Spire stopped answering a month ago. Tunde Okeke works on floor thirty. He would like to keep doing so.',
    offeredBy: 'tenant-okeke',
    offerRequires: ['the-keeper'],
    recommendedLevel: 25,
    steps: [
      { id: 'vance', journal: 'Ask Liaison Vance in the Aurelian Lobby about the top floors.', objectives: [{ type: 'talkTo', npcId: 'liaison-vance', label: 'Ask Liaison Vance' }] },
      { id: 'hounds', journal: 'The lift shafts are full of glass hounds from the breach. Put down three.', objectives: [{ type: 'defeat', creatureId: 'glass-hound', count: 3, label: 'Defeat glass hounds' }] },
      { id: 'okeke', journal: 'Tell Tunde Okeke in Flat 12A what Vance would not.', objectives: [{ type: 'talkTo', npcId: 'tenant-okeke', label: 'Talk to Tunde Okeke' }] },
    ],
    ...paid([scrip(300), styleQuestPay(25, 2)]),
  },
];

export const SPINWARD_QUESTLINES: readonly QuestlineDefinition[] = [
  { id: 'act-two-strain', name: 'Act II · Strain', kind: 'main', summary: 'Site Orchard is losing its seed stock into the Harrow Terraces.', questIds: ['harrow-call', 'seed-stock', 'the-keeper'] },
  { id: 'act-three-breach', name: 'Act III · Breach', kind: 'main', summary: 'Gallowglass is breached, and the Combine wants it kept quiet.', questIds: ['bright-lights', 'dead-air', 'breach'] },
  { id: 'kestrel-errands', name: 'Kestrel Reach', kind: 'side', summary: 'Small jobs around Kestrel Commons and the Recruit Lines.', questIds: ['names-in-the-bunks', 'table-for-two', 'heartbeat', 'governor', 'gull-weather', 'the-coat-that-sulks', 'range-day', 'the-lift-book'] },
  { id: 'harrow-errands', name: 'Harrow Terraces', kind: 'side', summary: 'Farm work, with teeth.', questIds: ['coat-check', 'dry-season', 'bitter-herbs', 'mostly-wheat', 'first-melt', 'seed-in-the-blood', 'last-word-at-the-plough'] },
  { id: 'halcyon-errands', name: 'Halcyon', kind: 'side', summary: 'Favours under the neon.', questIds: ['unsubscribe', 'last-orders', 'package-deal', 'forty-floors', 'takeaway', 'the-smile-clinic', 'brightly-done', 'high-score', 'fell-off-a-truck', 'no-screens'] },
];

type Line = readonly [questId: string, stepId: string, text: string];

const talk = (id: string, lines: readonly Line[], chat: string, options: readonly DialogueOption[] = []): DialogueDefinition => {
  const nodes: Record<string, DialogueNode> = { chat: { speaker: 'npc', text: chat, options: [...options, bye] } };
  const entries = lines.map(([questId, stepId, text], index) => {
    nodes[`line-${index}`] = say(text);
    return { node: `line-${index}`, conditions: [active(questId, stepId)] };
  });
  return { id, entries: [...entries, { node: 'chat' }], nodes };
};

const MAIN_DIALOGUES: readonly DialogueDefinition[] = [
  talk(
    'steward-tull',
    [
      ['harrow-call', 'tull', 'Losing? Here is the ledger. Eleven sacks of seed wheat, one cart, a scarecrow, a second scarecrow, and Hobb’s boy for a night. He came back. He was planted to the knees.'],
      ['harrow-call', 'fields', 'The mites are what the seed turns into when nobody plants it. Put a few down on the terraces before they put roots in the road.'],
    ],
    'Harrowgate feeds Kestrel and Halcyon both. Lately the Orchard has been feeding on Harrowgate.',
    [shop('harrow-stores')],
  ),
  talk(
    'corporal-fenn',
    [
      ['harrow-call', 'fenn', 'Directorate. Finally. I asked for a platoon. You will do. Dr Kessel is in the lab, and she has not slept in a week. Do not mention it, she will tell you how many hours.'],
      ['seed-stock', 'vault', 'The coats dragged a drawer out of the Seed Vault and left it in the yard. They do that. Like a cat with a bird.'],
      ['the-keeper', 'rows', 'The Mother Rows are through the south fence. The Keeper tends them at all hours. If it waters you, run.'],
    ],
    'Strained, they call it. The seed stock is in the rows and the rows are in the seed vault. You figure out which is containing which.',
  ),
  talk(
    'dr-kessel',
    [
      ['seed-stock', 'kessel', 'ORC-001 is a gardener. A precursor gardener, which is to say a glass thing with a lamp that has decided what grows. The seed stock is getting out in coats. I want two coats in bags and I want to know what it is planting.'],
      ['seed-stock', 'ready', 'You cannot bag a scarecoat with recruit hands. Practise on something smaller. Come back at Containment 10.'],
      ['seed-stock', 'coats', 'Two coats. Wear them down, bag them, and if one asks you to put it on, the answer is no.'],
      ['seed-stock', 'vault', 'The drawer the coats stole. Find it, read the ledger, tell me I am wrong.'],
      ['seed-stock', 'report', 'Lot 41, re-sown. Lot 41, re-sown. Lot 41, re-sown. The Keeper is not stealing the seed. It is reprinting what died. That is a Kestrel trick. I did not know the Quiet had taught it to anyone else.'],
      ['the-keeper', 'ready', 'Not yet. The Keeper is fifteen of something and you are not. Come back at combat level 14.'],
      ['the-keeper', 'rows', 'South fence. The Mother Rows. Take it out in the open, away from the beds.'],
      ['the-keeper', 'keeper', 'When it plants the lamp, the mites come up out of the soil. Kill the mites. Then the gardener.'],
      ['the-keeper', 'kessel', 'The rows have stopped moving. For a gardener it was very tidy. I have wired Halcyon: Site Gallowglass has gone quiet, and quiet there means loud. Go spinward, round the Massif to Halcyon, operative. Ask for Mercer.'],
    ],
    'Site Orchard holds a gardener. The gardener has decided we are weeds. I need operatives, not opinions.',
  ),
  talk(
    'fixer-juno',
    [
      ['bright-lights', 'juno', 'Gallowglass? Breached three weeks back. Officially it is a scheduled maintenance event. The hounds are a marketing activation. Talk to Vance in the Spire if you want the official lie. Talk to Mercer if you want the other one.'],
      ['dead-air', 'screens', 'The dead screens? Dead is a strong word. Every one in Halcyon still runs a single advert. Mr Brightly, saying something nobody can hear from the street.'],
    ],
    'Directorate. Cute. In Halcyon the Combine owns the lights, and the lights own everyone else.',
    [shop('halcyon-stores')],
  ),
  talk(
    'liaison-vance',
    [
      ['bright-lights', 'vance', 'The Combine is aware of a minor containment fluctuation at Gallowglass, which is fully under control and also not happening. Agent Mercer is welcome to her opinion. I would ask you not to repeat it near a screen. Screens are, at present, listening.'],
    ],
    'The Combine welcomes the Directorate’s interest in Gallowglass. The Combine would welcome it more if it were quiet.',
  ),
  talk(
    'runner-tam',
    [
      ['dead-air', 'tam', 'The signal comes up the old cable runs under the Gallowglass lift shaft. The arcade gallery, then the cells, then the Studio. That is where he films. I ran tapes down there for him once. I stopped when he started calling me by my name.'],
    ],
    'I know every way into the undercity. I just don’t use any of them anymore.',
  ),
  talk(
    'agent-mercer',
    [
      ['bright-lights', 'mercer', 'Nine days alone on this headhouse, and the Directorate sends one recruit from Harrowgate. Good. One is a number I can count. Mr Brightly is out. GLG-001. The face of every Combine advert for thirty years, and it turns out the face was the anomaly.'],
      ['dead-air', 'ready', 'You are not going down that lift at your level. Neither am I, and I am better than you. Come back at combat level 20.'],
      ['dead-air', 'screens', 'Check the dead screens. Neon Row, Ninth Street, Spire Plaza. Write down what he says. Do not say it back.'],
      ['dead-air', 'wraiths', 'The ad-wraiths are his relays. Cut a few and the signal thins out.'],
      ['dead-air', 'tam', 'There is a runner in Glasshouse Alley who used to deliver for Brightly. Tam. Ask him which way is down.'],
      ['dead-air', 'mercer', 'The Studio. Of course it is the Studio. Sign here. Your name is already printed in the book, which I am choosing not to think about. The lift will take you now.'],
      ['breach', 'descend', 'The lift goes down. What comes up is your problem and mine.'],
      ['breach', 'brightly', 'Cut every screen you pass. He is in all of them.'],
      ['breach', 'mercer', 'The screens went dark at once, all over Halcyon. Vance is on the line calling it a scheduled outage. The reel? Show me. Tallow. Cohort 41. Right. You had better sit down, operative. Then you had better go to Rustwater.'],
    ],
    'Gallowglass is breached. The Combine says it isn’t. One of us is lying, and I am standing in the breach.',
  ),
];

const SIDE_DIALOGUES: readonly DialogueDefinition[] = [
  questTalk({
    npc: 'reeve-halvard',
    questId: 'harrow-call',
    offer: { text: 'Vale sent you? Vale owes me a platoon. The Orchard is a Directorate problem until it is in my wheat. It is in my wheat. See Tull about the losses, clear the mites off my terraces, then go up to the Site and make them notice.', accept: 'I will see to it.', requires: ['paper-trail'] },
    waiting: 'Tull has the ledger, the mites have the terraces, and Corporal Fenn has the Orchard gate. Pick one and go.',
    done: 'The wheat stands still at night now. I lost the vote on thanking you, but I am thanking you anyway.',
    chat: 'The Orchard is a Directorate problem until it is in my wheat. It is in my wheat.',
  }),
  questTalk({
    npc: 'recruit-dace',
    questId: 'names-in-the-bunks',
    offer: { text: 'You want to see something? Stores dragged the old bunk frames out onto the Commons for scrap. Mine has names scratched in the rail. One of them is DACE. It is my handwriting. I have never held a knife that small.', accept: 'Show me the frame.', requires: ['report-for-intake'] },
    waiting: 'Read the frame. Then ask Marr. He reads the names every morning. He would know if mine is one of them.',
    done: 'So I am on the list twice. Once dead, once breathing. I will stop scratching names in things.',
    chat: 'They gave us the old barracks. Forty-one. There’s names scratched in the bunks already, and one of them is mine.',
    notes: [{ stepId: 'dace', text: 'Well? No, say it. I would rather hear it from you than from the bunk.' }],
  }),
  questTalk({
    npc: 'chaplain-marr',
    questId: 'names-in-the-bunks',
    report: { stepId: 'marr', text: 'Dace. Yes. Cohort 41, Site Tallow, two years ago. I read her name every morning. Then she walked in last month and asked me where the canteen was. I still read it. It would be rude to stop.' },
    waiting: 'Go and tell her. Kindly, if you have it in you.',
    done: 'We ring the bell when a cohort passes out. I do not know which bell to ring for one that came back.',
    chat: 'We ring the bell when a cohort passes out. We have not rung it for Forty-one. Not yet.',
  }),
  questTalk({
    npc: 'widow-hale',
    questId: 'table-for-two',
    offer: { text: 'My son went to Tallow with Forty-one. He came back last spring. He does not remember the garden, and he planted it. Old Tobin was here the day he did. Ask him. Perhaps a thing from it will help.', accept: 'I will ask Tobin.', requires: ['report-for-intake'] },
    waiting: 'Tobin is at Number Twelve. He talks a great deal. Some of it is true.',
    hand: { stepId: 'hale', text: 'Is that his? Give it here.', option: 'Hand over the seed tin.', items: ['hale-seed-tin'], signal: 'hale-tin-returned', thanks: 'His handwriting. Runner beans, sown the spring after Tallow. He was dead that spring. Well. I will lay the table for two again, and we will plant them, and he can remember it from now on.' },
    done: 'The beans came up. He said they were the first thing he ever grew. I let him think so.',
    chat: 'My son went to Tallow with Forty-one. He came back last spring. He does not remember the garden.',
  }),
  questTalk({
    npc: 'old-man-tobin',
    questId: 'table-for-two',
    report: { stepId: 'tobin', text: 'The Hale boy? Planted runner beans by the back wall and buried the seed tin under the step for next year. Here. I dug it up when he went to Tallow. I dig up a lot of things when they go to Tallow.' },
    waiting: 'Take it to her. And do not read the date on the label. Or do, and then do not tell her.',
    done: 'Two hundred and six, and I have still never seen anyone come back from Tallow the same. The beans did, though.',
    chat: 'I saw the ship come down. I saw the first Kestrel built. I saw the first Lune, and the second.',
  }),
  questTalk({
    npc: 'medic-sauer',
    questId: 'heartbeat',
    offer: { text: 'Your heart trace matches one in my drawer, dated two years ago, to the beat. I need a control: something alive that nobody ever printed. Grounds mites will do. Contain three.', accept: 'Three mites, coming up.', requires: ['report-for-intake'] },
    waiting: 'Three grounds mites, contained, not squashed. They are around the lawns and the drill field.',
    done: 'The mites have messy, original heartbeats. Yours is very clean. Too clean. I have filed it next to the old one. Do not lose sleep. Or do, and come and see me.',
    chat: 'Sit. Breathe. You came out of Intake with a heartbeat I have heard before.',
    chatOptions: [shop('kestrel-clinic')],
  }),
  questTalk({
    npc: 'technician-oduya',
    questId: 'governor',
    offer: { text: 'The yard drones have learned to hit back. Something in the firmware, or something in the drones. I need a governor on the lead unit, and you are the only recruit in the Shed who can hold a fabricator the right way up.', accept: 'I will build it.', requires: ['report-for-intake'], conditions: [{ type: 'skillLevel', skill: 'engineering', atLeast: 8 }], notReady: 'I need someone with Engineering 8 for this one. Come back when you can hold a press arm without crying.' },
    waiting: 'Two scrap plating, two trace dust, a fabricator. The rack sells both if you are short.',
    hand: { stepId: 'fit', text: 'Is that the governor?', option: 'Hand over the drone governor.', items: ['drone-governor'], signal: 'governor-fitted', thanks: 'Clean welds. The drone has gone back to being hit for a living, and it seems relieved.' },
    done: 'The drones log every blow for your file. That governor of yours is in the logs too. It will outlive both of us.',
    chat: 'Refinery, fabricator, synthesiser. Everything you wear on the Span, somebody made on one of these.',
    chatOptions: [shop('kestrel-parts')],
  }),
  questTalk({
    npc: 'farmer-greaves',
    questId: 'coat-check',
    offer: { text: 'My top field is walking. Not the crops. The field. Three coats on sticks, and every night they are one row closer to the house. Bag them, will you?', accept: 'Three coats. Consider them checked.', requires: ['harrow-call'], conditions: [{ type: 'skillLevel', skill: 'containment', atLeast: 10 }], notReady: 'The last operative who tried to bag one without the training is wearing it now. Come back at Containment 10.' },
    waiting: 'Three. And mind the sleeves.',
    done: 'Field has stood still for a week. I miss it, a bit. It was company.',
    chat: 'My top field’s walking. Not the crops. The field.',
  }),
  questTalk({
    npc: 'farmer-adaeze',
    questId: 'dry-season',
    offer: { text: 'Water runs uphill here if you ask the Span nicely. The Orchard has stopped asking, the main sluice on Sluice Row has jammed, and the eels are fat on what is left. Clear the eels and work the gate.', accept: 'I will free the sluice.', requires: ['paper-trail'] },
    waiting: 'Eels first, gate second. The other way round and the eels hold the gate shut for you.',
    done: 'Hear that? Uphill. The Span is listening again.',
    chat: 'Water runs uphill here if you ask the Span nicely. The Orchard has stopped asking.',
  }),
  questTalk({
    npc: 'apothecary-wynn',
    questId: 'bitter-herbs',
    offer: { text: 'Since the Orchard started to strain, my reeds grow twice as fast and taste of copper. I would like four fresh bundles, cut by someone who is not me, so I can blame them if they bite.', accept: 'Four bundles.', requires: ['paper-trail'], conditions: [{ type: 'skillLevel', skill: 'biochemistry', atLeast: 10 }], notReady: 'You want to cut my reeds with those hands? The beds take Biochemistry 10. Cook a few eels from the traps and come back.' },
    waiting: 'Four reed bundles. From a reed bed, not the market.',
    hand: { stepId: 'wynn', text: 'Fresh? Let me see.', option: 'Hand over the reeds.', items: ['reed-bundle'], signal: 'wynn-reeds', thanks: 'Hm. One bundle was plenty. Seed residue in the cells, the same as the Orchard soil. They are not growing faster. They are growing back. Keep the rest, they are good for poultices.' },
    done: 'I have relabelled the reeds. Third alphabet. You do not want to know what it says.',
    chat: 'Since the Orchard started to strain, some of my herbs grow better. I try not to think about why.',
    chatOptions: [shop('harrow-apothecary')],
  }),
  questTalk({
    npc: 'baker-ostrowski',
    questId: 'mostly-wheat',
    offer: { text: 'I found a tooth in a loaf. Not mine. Not a person’s. Thornbacks are sleeping in the barns on the upper terraces and shedding into the grain. Three of them, and I will stop sifting.', accept: 'I will clear the barns.', requires: ['harrow-call'] },
    waiting: 'Thornbacks. Upper terraces, near the barns. Big, spiky, unpleasant to bake.',
    done: 'Clean flour. Mostly. Have a loaf. Check it first, out of habit.',
    chat: 'Yesterday’s bread at today’s prices, and the flour is from Harrow wheat. Mostly.',
    chatOptions: [shop('ostrowski-bakery')],
  }),
  questTalk({
    npc: 'tenant-roux',
    questId: 'unsubscribe',
    offer: { text: 'I threw the fridge out. It is on the plaza. It is still plugged in, I do not know into what, and it is still asking me if I am satisfied. Make it stop.', accept: 'I will unplug it.', requires: ['the-keeper'] },
    waiting: 'The fridge first. Then whatever it was talking to.',
    done: 'No voices. I took the tape off one screen. Just one. It showed the weather. I cried a little.',
    chat: 'He talks to me through the fridge now. Mr Brightly. He wants to know if I am satisfied.',
  }),
  questTalk({
    npc: 'bartender-kit',
    questId: 'last-orders',
    offer: { text: 'The moths have found the jukebox. They sit on it and drink the lights and it only plays one song now. Four of them in jars and the next round is mine.', accept: 'Four moths, jarred.', requires: ['the-keeper'] },
    waiting: 'Lure them off the signs first. They will not leave a lit sign for anything less interesting than a jar.',
    done: 'It plays a second song now. It is worse than the first. Thank you, honestly.',
    chat: 'The neon moths come in when the door’s open. They like the jukebox. Don’t hit them near the jukebox.',
    chatOptions: [shop('static-bloom')],
  }),
  questTalk({
    npc: 'runner-tam',
    questId: 'package-deal',
    offer: { text: 'One last run, and I cannot be seen making it. Parcel to Pike, envelope from Pike to the Doc. No questions, no screens, no smiling. Interested?', accept: 'I will run it.', requires: ['the-keeper'] },
    notes: [{ stepId: 'collect', text: 'Here. Do not shake it. Do not open it. Do not let it near a camera.' }],
    waiting: 'Pike, then the Doc. Do not stop for noodles.',
    report: { stepId: 'tam', text: 'The Doc took it? Good. It was a Directorate tracking chip, mine, out of my neck. Pike wiped it and the Doc burned it. Tam the runner is dead, officially. I would rather that than be reprinted.' },
    done: 'Still alive. Still not running. Mostly sleeping.',
    chat: 'I know every way into the undercity. I just don’t use any of them anymore.',
  }),
  questTalk({
    npc: 'pawnbroker-pike',
    questId: 'package-deal',
    hand: { stepId: 'pike', text: 'Tam’s parcel? Give it here, and hold this envelope. The Doc is expecting it.', option: 'Hand over the parcel.', items: ['tam-parcel'], signal: 'tam-parcel-pawned', thanks: 'Wiped. The envelope goes to Esperanza. If anyone asks, you pawned a toaster.' },
    waiting: 'The envelope goes to the Doc, not back to me.',
    done: 'Nice clean job. If you ever want your own chip wiped, operative, Pike is open late.',
    chat: 'Bring me anything from the undercity and we will talk real money. Bring me anything that smiles and I will call the Directorate.',
    chatOptions: [shop('pawn-and-patch')],
  }),
  questTalk({
    npc: 'doc-esperanza',
    questId: 'package-deal',
    hand: { stepId: 'esperanza', text: 'You have something for me from Pike.', option: 'Hand over the envelope.', items: ['pike-envelope'], signal: 'envelope-delivered', thanks: 'There it goes. Into the burner, little chip. Tell Tam he is free, and tell him to come and get his neck stitched.' },
    waiting: 'Back to Tam. He worries.',
    done: 'Tam came in for the stitches. First time he has sat still in a year.',
    chat: 'Glass hound bites go septic in an hour. Come straight here, not to Sato.',
  }),
  questTalk({
    npc: 'tenant-okeke',
    questId: 'forty-floors',
    offer: { text: 'The top ten floors of the Spire stopped answering a month ago. The lifts still go up. Nothing comes down. I work on thirty. Can you ask Vance what is going on, and make the lift shafts less full of dogs?', accept: 'I will ask Vance.', requires: ['the-keeper'] },
    waiting: 'Vance, then the hounds. Or the hounds, then Vance. Vance is less likely to bite.',
    done: 'Forty floors, and only the top ten are haunted. Better odds than most jobs in Halcyon.',
    chat: 'The top ten floors of the Spire stopped answering a month ago. The lifts still go up. Nothing comes down.',
  }),
  questTalk({
    npc: 'liaison-vance',
    questId: 'forty-floors',
    report: { stepId: 'vance', text: 'Floors forty-one to fifty are undergoing a voluntary restructure. The staff are all very satisfied. They tell me so, every hour, on the hour, in unison. The hounds in the shafts are a separate matter, and also not happening.' },
    waiting: 'The Combine has nothing further to add, and would like it noted that it added nothing further.',
    done: 'The Combine is grateful for your discretion. The Combine has measured it.',
    chat: 'The Combine welcomes the Directorate’s interest in Gallowglass. The Combine would welcome it more if it were quiet.',
  }),
];

export const SPINWARD_DIALOGUES: readonly DialogueDefinition[] = [...MAIN_DIALOGUES, ...SIDE_DIALOGUES];

export const SPINWARD_ITEMS: readonly ItemDefinition[] = [
  questItem('hale-seed-tin', 'Hale’s Seed Tin', 'A rusted tin of runner bean seed. The label is in a boy’s handwriting and dated the spring after he died.', 'cell', ['#8a5a2a', '#3a2a1a']),
  questItem('drone-governor', 'Drone Governor', 'A palm-sized limiter for a training drone. It tells the drone, very firmly, that it enjoys being hit.', 'servo', ['#e8eef4', '#4a5a6a']),
  questItem('tam-parcel', 'Tam’s Parcel', 'A small, heavy parcel taped shut and wrapped in foil so no camera can see into it.', 'pack', ['#c8c8c8', '#3a3a3a']),
  questItem('pike-envelope', 'Pike’s Envelope', 'A padded envelope. Something inside it is warm, and blinks.', 'sheet', ['#d8c8a0', '#5a4a2a']),
];

const notify = (text: string) => [{ type: 'notify' as const, text }];

export const SPINWARD_OBJECTS: readonly WorldObjectDefinition[] = [
  questObject('barracks-bunk-frame', 'Old Bunk Frame', 'A steel bunk frame from Barracks 41, waiting for the scrap cart. The top rail is scratched with names.', 'bed', 'Read the names', [active('names-in-the-bunks', 'frame')], 'Names, scratched into the rail. Some are scratched over twice.', notify('Thirty-one names. ADEBAYO. HALE. DACE. Under DACE, in the same hand, smaller: still here.')),
  questObject('orchard-seed-drawer', 'Seed Drawer', 'A long steel drawer from the Seed Vault, dragged into the yard. Soil spills from its seams.', 'storageLocker', 'Read the ledger', [active('seed-stock', 'vault')], 'The seed ledger. Every lot is marked re-sown.', notify('Lot 41: re-sown. Lot 41: re-sown. Lot 41: re-sown. The last entry is in a hand like a root system.')),
  questObject('jammed-sluice', 'Jammed Sluice Gate', 'An iron sluice gate choked with root and eel. The water behind it would like to go uphill.', 'lockGate', 'Work the gate', [active('dry-season', 'sluice')], 'The gate turns freely. Water runs uphill, as it should.', notify('You haul the wheel round. Roots tear. The water goes uphill, grumbling.')),
  questObject('smiling-fridge', 'Smiling Fridge', 'A Combine fridge dumped on the plaza, door open, light on. It is not plugged into anything.', 'vendingMachine', 'Pull the plug', [active('unsubscribe', 'fridge')], 'The fridge is dark, and only a fridge.', notify('You yank a cable that goes nowhere. The light goes out. Somewhere, a smile does not.')),
  questObject('dead-screen', 'Dead Screen', 'A blown holo screen still running one advert. Mr Brightly, mouthing a sentence.', 'holoBillboard', 'Watch closely', [active('dead-air', 'screens')], 'Mr Brightly smiles at you. The screen is otherwise dead.', notify('You read his lips: come down to the Studio, where the light is free. He says your name at the end.')),
];

export const SPINWARD_RECIPES: readonly RecipeDefinition[] = [
  { id: 'fabricator:drone-governor', station: 'fabricator', skill: 'engineering', level: 8, inputs: [{ itemId: 'scrap-plating', count: 2 }, { itemId: 'trace-dust', count: 2 }], output: { itemId: 'drone-governor', count: 1 }, experience: 3, ticks: 6 },
];
