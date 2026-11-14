import type { CharacterAppearance } from '../../../src/character/appearance.ts';
import type { ContractDefinition } from '../../../src/contracts/contract.ts';
import type { DialogueDefinition } from '../../../src/dialogue/dialogue.ts';
import type { ShopDefinition } from '../../../src/economy/shop.ts';
import type { QuestDefinition } from '../../../src/quests/questDefinition.ts';
import type { QuestlineDefinition } from '../../../src/quests/questline.ts';
import type { NpcDefinition } from '../../../src/world/entities.ts';
import type { RegionDefinition } from '../../../src/world/region.ts';

const LOOK: CharacterAppearance = {
  physique: 'female',
  bodyType: 'average',
  height: 1,
  skinTone: '#c68e6a',
  hairStyle: 'crop',
  hairColor: '#2a2420',
  eyeColor: '#3a2a1a',
  faceMark: 'none',
  augment: 'none',
};

const npc = (id: string, name: string, extra: Partial<NpcDefinition> = {}): NpcDefinition => ({
  id,
  name,
  title: 'Test',
  examine: `${name}, a test NPC.`,
  appearance: LOOK,
  gear: [],
  wanderRadius: 0,
  ...extra,
});

export const FIXTURE_NPCS: readonly NpcDefinition[] = [
  npc('trader', 'Trader', { shopId: 'supplies', dialogueId: 'trader' }),
  npc('medic', 'Medic', { dialogueId: 'medic' }),
  npc('registrar', 'Registrar', { dialogueId: 'registrar' }),
  npc('handler', 'Handler', { dialogueId: 'handler' }),
  npc('outpost-trader', 'Outpost Trader', { shopId: 'supplies' }),
  npc('wanderer', 'Wanderer', { wanderRadius: 3 }),
];

export const FIXTURE_SHOPS: readonly ShopDefinition[] = [
  {
    id: 'supplies',
    name: 'Supplies',
    greeting: 'Test supplies.',
    listings: [
      { itemId: 'medgel', price: 6 },
      { itemId: 'stun-baton', price: 45 },
      { itemId: 'dart-pistol', price: 35 },
    ],
    buysCategories: ['material', 'consumable', 'equipment'],
    sellRate: 0.5,
  },
  {
    id: 'contracts-office',
    name: 'Contracts Office',
    greeting: 'Commendations only.',
    listings: [{ itemId: 'medgel', price: 2 }],
    buysCategories: [],
    sellRate: 0,
    currency: { itemId: 'directorate-commendation', label: 'commendations' },
  },
];

export const FIXTURE_DIALOGUES: readonly DialogueDefinition[] = [
  {
    id: 'trader',
    entries: [{ node: 'greeting' }],
    nodes: { greeting: { speaker: 'npc', text: 'Buying or selling?', options: [{ text: 'Show me.', effects: [{ type: 'openShop', shopId: 'supplies' }], next: null }, { text: 'Bye.', next: null }] } },
  },
  {
    id: 'medic',
    entries: [{ node: 'greeting' }],
    nodes: { greeting: { speaker: 'npc', text: 'Hurt?', options: [{ text: 'Patch me up.', effects: [{ type: 'restoreIntegrity' }], next: null }, { text: 'Bye.', next: null }] } },
  },
  {
    id: 'registrar',
    entries: [{ node: 'greeting' }],
    nodes: {
      greeting: {
        speaker: 'npc',
        text: 'Clearance?',
        options: [
          { text: 'Apply for {nextClearance}. ({nextClearancePrice} scrip, Containment {nextClearanceLevel})', conditions: [{ type: 'lacksFlag', flag: 'containment-clearance-9' }], effects: [{ type: 'purchaseClearance' }], next: 'greeting' },
          { text: 'Take the survey.', conditions: [{ type: 'questNotStarted', questId: 'survey' }], effects: [{ type: 'startQuest', questId: 'survey' }], next: null },
          { text: 'Bye.', next: null },
        ],
      },
    },
  },
  {
    id: 'handler',
    entries: [
      { node: 'offer', conditions: [{ type: 'questNotStarted', questId: 'vault-run' }] },
      { node: 'brief', conditions: [{ type: 'questActive', questId: 'vault-run', stepId: 'brief' }] },
      { node: 'deliver', conditions: [{ type: 'questActive', questId: 'vault-run', stepId: 'deliver' }] },
      { node: 'busy', conditions: [{ type: 'questActive', questId: 'vault-run' }] },
      { node: 'done' },
    ],
    nodes: {
      offer: { speaker: 'npc', text: 'Got a job.', options: [{ text: 'Take it.', effects: [{ type: 'startQuest', questId: 'vault-run' }], next: null }, { text: 'Later.', next: null }] },
      brief: { speaker: 'npc', text: 'Here is the keycard.', effects: [{ type: 'giveItem', itemId: 'vault-keycard' }], next: null },
      busy: { speaker: 'npc', text: 'Keep going.', next: null },
      deliver: {
        speaker: 'npc',
        text: 'Got the log?',
        options: [
          { text: 'Hand over the log.', conditions: [{ type: 'hasItem', itemId: 'field-log' }], effects: [{ type: 'takeItem', itemId: 'field-log' }, { type: 'emitSignal', signal: 'vault.log-delivered' }], next: null },
          { text: 'Not yet.', next: null },
        ],
      },
      done: { speaker: 'npc', text: 'Thanks again.', next: null },
    },
  },
];

export const FIXTURE_QUESTS: readonly QuestDefinition[] = [
  {
    id: 'vault-run',
    name: 'Vault Run',
    category: 'main',
    summary: 'A test quest through every objective type.',
    offeredBy: 'handler',
    steps: [
      { id: 'brief', journal: 'Get the keycard from the handler.', objectives: [{ type: 'obtainItem', itemId: 'vault-keycard', count: 1, label: 'Get the vault keycard' }] },
      { id: 'enter', journal: 'Enter the vault.', objectives: [{ type: 'enterArea', districtId: 'fx-field', areaId: 'vault', label: 'Enter the vault' }] },
      { id: 'log', journal: 'Get the log.', objectives: [{ type: 'obtainItem', itemId: 'field-log', count: 1, label: 'Download the field log' }] },
      { id: 'cull', journal: 'Clear mites.', objectives: [{ type: 'defeat', creatureId: 'gloam-mite', count: 2, label: 'Defeat gloam mites' }] },
      { id: 'warden', journal: 'Contain the warden.', objectives: [{ type: 'contain', creatureId: 'hollow-warden', count: 1, label: 'Contain the warden' }] },
      { id: 'deliver', journal: 'Bring the log back.', objectives: [{ type: 'signal', signal: 'vault.log-delivered', npcId: 'handler', label: 'Deliver the log' }] },
    ],
    rewards: [{ type: 'giveItem', itemId: 'meridian-scrip', count: 50 }],
    rewardSummary: ['50 Scrip'],
  },
  {
    id: 'survey',
    name: 'Survey',
    category: 'side',
    summary: 'A test side quest with a multi-object step.',
    offeredBy: 'registrar',
    steps: [
      { id: 'ask', journal: 'Ask the registrar.', objectives: [{ type: 'talkTo', npcId: 'registrar', label: 'Ask the registrar' }] },
      { id: 'mark', journal: 'Check the survey markers.', objectives: [{ type: 'interactWith', objectId: 'survey-marker', count: 3, label: 'Check survey markers' }] },
      { id: 'report', journal: 'Report in the hall.', objectives: [{ type: 'enterArea', districtId: 'fx-hub', areaId: 'hall', label: 'Return to the hall' }] },
    ],
    rewards: [{ type: 'giveItem', itemId: 'meridian-scrip', count: 10 }],
    rewardSummary: ['10 Scrip'],
  },
];

export const FIXTURE_QUESTLINES: readonly QuestlineDefinition[] = [
  { id: 'test-line', name: 'Test Line', kind: 'main', summary: 'Test quests.', questIds: ['vault-run'] },
  { id: 'test-side', name: 'Test Side', kind: 'side', summary: 'Test side quests.', questIds: ['survey'] },
];

const contract = (cadence: 'daily' | 'weekly', id: string, objective: ContractDefinition['objective']): ContractDefinition => ({
  id: `${cadence}:${id}`,
  name: id,
  brief: `Test contract ${id}.`,
  cadence,
  tier: 1,
  requires: [],
  objective,
  commendations: cadence === 'daily' ? 3 : 12,
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: cadence === 'daily' ? 45 : 220 },
    { type: 'giveItem', itemId: 'directorate-commendation', count: cadence === 'daily' ? 3 : 12 },
  ],
  rewardSummary: cadence === 'daily' ? '45 scrip' : '220 scrip',
});

export const FIXTURE_CONTRACTS: readonly ContractDefinition[] = [
  contract('daily', 'mites', { type: 'defeat', count: 3, creatureIds: ['gloam-mite'] }),
  contract('daily', 'scrap', { type: 'gather', count: 5, itemIds: ['scrap-alloy'] }),
  contract('daily', 'plates', { type: 'craft', count: 2, itemIds: ['alloy-plate'] }),
  contract('daily', 'drones', { type: 'defeat', count: 2, creatureIds: ['training-drone'] }),
  contract('weekly', 'warden', { type: 'contain', count: 1, creatureIds: ['hollow-warden'] }),
  contract('weekly', 'gel', { type: 'craft', count: 5, itemIds: ['medgel'] }),
  contract('weekly', 'cull', { type: 'defeat', count: 20, creatureIds: ['gloam-mite'] }),
];

export const FIXTURE_REGIONS: readonly RegionDefinition[] = [
  { id: 'fx-home', name: 'Test Home', hubDistrictId: 'fx-hub' },
  { id: 'fx-far', name: 'Test Outpost', hubDistrictId: 'fx-outpost' },
];
