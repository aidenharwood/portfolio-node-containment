import { DRESSING_THEMES } from '../../../src/content/prefabs/types.ts';
import type { WorldObjectDefinition } from '../../../src/world/entities.ts';
import type { AssemblyDefinition } from '../../../src/world/assemblies.ts';

const placeholder = { model: 'placeholder', blocksMovement: true } as const;

const tramPiece = (id: string): WorldObjectDefinition => ({
  id,
  name: 'Tram Car',
  examine: 'A test tram car.',
  ...placeholder,
  ...(id === 'tram-car-door' ? {} : { countsAs: 'tram-car-door' }),
  interactions: [{ verb: 'Board', effects: [{ type: 'openTramMap' }] }],
});

export const FIXTURE_OBJECTS: readonly WorldObjectDefinition[] = [
  { id: 'storage-locker', name: 'Storage Locker', examine: 'A test locker.', ...placeholder, furnishing: { mount: 'wall', homes: DRESSING_THEMES }, interactions: [{ verb: 'Open', effects: [{ type: 'openStorage' }] }] },
  { id: 'market-terminal', name: 'Exchange Terminal', examine: 'A test exchange.', ...placeholder, interactions: [{ verb: 'Trade', effects: [{ type: 'openMarket' }] }] },
  { id: 'market-mailbox', name: 'Exchange Mailbox', examine: 'A test mailbox.', ...placeholder, interactions: [{ verb: 'Collect', effects: [{ type: 'openMarket', access: 'collect' }] }] },
  {
    id: 'contract-board',
    name: 'Contract Board',
    examine: 'A test contract board.',
    ...placeholder,
    interactions: [
      { verb: 'Review contracts', effects: [{ type: 'openContracts' }] },
      { verb: 'Spend commendations', effects: [{ type: 'openShop', shopId: 'contracts-office' }] },
    ],
  },
  { id: 'refinery', name: 'Refinery', examine: 'A test refinery.', ...placeholder, interactions: [{ verb: 'Refine', effects: [{ type: 'openCrafting', station: 'refinery' }] }] },
  { id: 'fabricator', name: 'Fabricator', examine: 'A test fabricator.', ...placeholder, interactions: [{ verb: 'Fabricate', effects: [{ type: 'openCrafting', station: 'fabricator' }] }] },
  { id: 'synthesiser', name: 'Synthesiser', examine: 'A test synthesiser.', ...placeholder, interactions: [{ verb: 'Synthesise', effects: [{ type: 'openCrafting', station: 'synthesiser' }] }] },
  {
    id: 'scrap-heap',
    name: 'Scrap Heap',
    examine: 'A test resource node.',
    ...placeholder,
    interactions: [{ verb: 'Salvage', effects: [], gather: { skill: 'salvage', level: 1, itemId: 'scrap-alloy', experience: 10, attemptTicks: 3, charges: 6, respawnTicks: 30, progressVerb: 'Salvaging' } }],
  },
  {
    id: 'deep-scrap-heap',
    name: 'Deep Scrap Heap',
    examine: 'A test node that needs Salvage 3.',
    ...placeholder,
    interactions: [{ verb: 'Salvage', effects: [], gather: { skill: 'salvage', level: 3, itemId: 'scrap-alloy', experience: 16, attemptTicks: 4, charges: 5, respawnTicks: 40, progressVerb: 'Salvaging' } }],
  },
  {
    id: 'survey-marker',
    name: 'Survey Marker',
    examine: 'A test marker checked once per character.',
    ...placeholder,
    interactions: [{ verb: 'Check', oncePerCharacter: true, effects: [{ type: 'notify', text: 'Marker checked.' }] }],
  },
  {
    id: 'rest-bed',
    name: 'Bed',
    examine: 'A test bed that restores integrity.',
    ...placeholder,
    interactions: [{ verb: 'Rest', effects: [{ type: 'restoreIntegrity' }] }],
  },
  { id: 'crate', name: 'Crate', examine: 'A test prop.', ...placeholder, furnishing: { mount: 'free', homes: DRESSING_THEMES }, interactions: [] },
  { id: 'sign', name: 'Sign', examine: 'Another test prop.', ...placeholder, blocksMovement: false, furnishing: { mount: 'flat', homes: DRESSING_THEMES }, interactions: [] },
  { id: 'plinth', name: 'Plinth', examine: 'A wide test prop.', ...placeholder, footprint: { width: 3, height: 1 }, interactions: [{ verb: 'Inspect', effects: [{ type: 'notify', text: 'A plinth.' }] }] },
  {
    id: 'vault-door',
    name: 'Vault Door',
    examine: 'A test door that needs the vault keycard.',
    ...placeholder,
    door: { conditions: [{ type: 'hasItem', itemId: 'vault-keycard' }] },
    interactions: [{ verb: 'Open', failureText: 'The vault door is locked.', effects: [{ type: 'notify', text: 'The vault door opens.' }] }],
  },
  {
    id: 'vault-terminal',
    name: 'Vault Terminal',
    examine: 'A test terminal holding the field log.',
    ...placeholder,
    interactions: [
      {
        verb: 'Download log',
        conditions: [{ type: 'questActive', questId: 'vault-run', stepId: 'log' }],
        failureText: 'Nothing to download.',
        oncePerCharacter: true,
        effects: [{ type: 'giveItem', itemId: 'field-log' }],
      },
    ],
  },
  { id: 'lift-down', name: 'Lift Down', examine: 'A test lift to the arena level.', ...placeholder, interactions: [{ verb: 'Descend', conditions: [{ type: 'hasFlag', flag: 'clearance.depths' }], failureText: 'The lift needs depths clearance.', effects: [{ type: 'teleport', districtId: 'fx-arena', position: { x: 6, y: 6 } }] }] },
  { id: 'lift-up', name: 'Lift Up', examine: 'A test lift back to the hub.', ...placeholder, interactions: [{ verb: 'Ascend', effects: [{ type: 'teleport', districtId: 'fx-hub', position: { x: 12, y: 12 } }] }] },
  { id: 'catwalk-span', name: 'Catwalk', examine: 'A test deck.', model: 'placeholder', blocksMovement: false, deck: true, interactions: [] },
  { id: 'catwalk-end', name: 'Catwalk', examine: 'A test deck end.', model: 'placeholder', blocksMovement: false, deck: true, interactions: [] },
  { id: 'litter-papers', name: 'Papers', examine: 'Test litter.', model: 'placeholder', blocksMovement: false, furnishing: { mount: 'flat', homes: DRESSING_THEMES }, interactions: [] },
  { id: 'cable-run', name: 'Cable Run', examine: 'Test cable.', model: 'placeholder', blocksMovement: false, furnishing: { mount: 'flat', homes: DRESSING_THEMES }, interactions: [] },
  { id: 'cable-run-end', name: 'Cable Run', examine: 'Test cable end.', model: 'placeholder', blocksMovement: false, furnishing: { mount: 'flat', homes: DRESSING_THEMES }, interactions: [] },
  tramPiece('tram-car-nose-left'),
  tramPiece('tram-car-nose-right'),
  tramPiece('tram-car-door'),
  tramPiece('tram-car-window'),
];

export const FIXTURE_ASSEMBLIES: readonly AssemblyDefinition[] = [
  {
    id: 'tram-car',
    name: 'Tram Car',
    pieces: {
      L: { objectId: 'tram-car-nose-left' },
      R: { objectId: 'tram-car-nose-right' },
      D: { objectId: 'tram-car-door' },
      W: { objectId: 'tram-car-window' },
      l: { objectId: 'tram-car-nose-left', turns: 2 },
      r: { objectId: 'tram-car-nose-right', turns: 2 },
      d: { objectId: 'tram-car-door', turns: 2 },
      w: { objectId: 'tram-car-window', turns: 2 },
    },
    layout: ['rdwwdl', 'LDWWDR'],
  },
  {
    id: 'catwalk',
    name: 'Catwalk',
    pieces: { E: { objectId: 'catwalk-end' }, e: { objectId: 'catwalk-end', turns: 2 }, c: { objectId: 'catwalk-span' } },
    layout: ['E', 'c', 'e'],
    stretchRow: 1,
  },
  {
    id: 'cable-run',
    name: 'Cable Run',
    pieces: { E: { objectId: 'cable-run-end' }, e: { objectId: 'cable-run-end', turns: 2 }, c: { objectId: 'cable-run' } },
    layout: ['E', 'c', 'e'],
    stretchRow: 1,
  },
];
