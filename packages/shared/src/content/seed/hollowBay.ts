import type { CharacterAppearance } from '../../character/appearance.ts';
import type { DialogueDefinition } from '../../dialogue/dialogue.ts';
import type { ShopDefinition } from '../../economy/shop.ts';
import type { RegionId } from '../../ids.ts';
import type { Condition } from '../../rules/conditions.ts';
import type { NpcDefinition, WorldObjectDefinition } from '../../world/entities.ts';
import type { RegionDefinition } from '../../world/region.ts';
import type { FurnishingKit } from '../furnishingKit.ts';
import type { FurnishingProfile } from '../furnishingCatalogue.ts';

type Prop = Pick<WorldObjectDefinition, 'id' | 'name' | 'examine' | 'model'> & Partial<Pick<WorldObjectDefinition, 'footprint' | 'light'>> & { readonly furnishing: FurnishingProfile };

const prop = (definition: Prop): WorldObjectDefinition => ({ blocksMovement: true, interactions: [], ...definition });

const LANDMARK_HOMES = ['street', 'containment', 'industrial', 'freight', 'works'] as const;

export const WARD_OPEN_FLAG = (region: RegionId): string => `ward-open:${region}`;

const gate = (id: string, name: string, examine: string, conditions: readonly Condition[], lockedText: string, openedText: string): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model: 'gateLeaf',
  blocksMovement: true,
  door: { conditions },
  interactions: [{ verb: 'Open', failureText: lockedText, effects: [{ type: 'notify', text: openedText }] }],
});

const wardGate = (id: string, name: string, examine: string, region: RegionId, openedText: string): WorldObjectDefinition =>
  gate(id, name, examine, [{ type: 'hasFlag', flag: WARD_OPEN_FLAG(region) }], 'Sealed from both sides. The Directorate has not ordered this gate opened.', openedText);

const siteLift = (id: string, site: string): WorldObjectDefinition =>
  prop({
    id,
    name: 'Lift',
    examine: `The ${site} lift. The cage is somewhere far below, and nobody has called it up since the ward was sealed.`,
    model: 'liftDoor',
    furnishing: { mount: 'wall', homes: ['containment', 'transit', 'office'] },
  });

export const HOLLOW_BAY_OBJECTS: readonly WorldObjectDefinition[] = [
  {
    id: 'market-mailbox',
    name: 'Exchange Mailbox',
    examine: 'A ward exchange box. It holds what you sold on the exchange, but orders are only posted at Terminus Square.',
    model: 'exchangePost',
    blocksMovement: true,
    furnishing: { mount: 'free', homes: ['street', 'civic', 'transit', 'shop', 'canteen', 'office', 'containment'] },
    interactions: [{ verb: 'Collect', effects: [{ type: 'openMarket', access: 'collect' }] }],
  },
  prop({ id: 'gantry-crane', name: 'Goliath Crane', examine: 'The gantry crane over Dry Dock Four. It can lift a ship out of the water, and once, they say, did.', model: 'gantryCrane', footprint: { width: 3, height: 3 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'windpump', name: 'Windpump', examine: 'A lattice tower and a wheel of tin sails. It pumps brine whether or not the wind blows.', model: 'windpump', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'directorate-spire', name: 'The Spire', examine: 'Directorate headquarters. Forty floors of panel and glass, and every window lit.', model: 'directorateSpire', footprint: { width: 3, height: 3 }, light: { radius: 6, color: '#ffb35a', intensity: 0.7 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'bell-tower', name: 'Bell Tower', examine: 'The cathedral tower. The bell rings the hours, and a thirteenth some nights.', model: 'bellTower', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: [...LANDMARK_HOMES, 'civic', 'chapel'] } }),
  prop({ id: 'cooling-tower', name: 'Cooling Tower', examine: 'One of the Bellows towers. Cold for years, and still breathing out steam.', model: 'coolingTower', footprint: { width: 3, height: 3 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'diving-bell', name: 'Diving Bell', examine: 'Site Fathom’s diving bell, hanging from its derrick over the water. The porthole is lit from inside.', model: 'divingBell', footprint: { width: 2, height: 2 }, light: { radius: 4, color: '#4fe3ff', intensity: 0.9 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'lighthouse', name: 'The Lantern', examine: 'The lighthouse at the mouth of the bay. The lamp has not gone out in a hundred years, and the keepers say it must not.', model: 'lighthouse', footprint: { width: 3, height: 3 }, light: { radius: 8, color: '#fff2c8', intensity: 1.1, beam: 2.4 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  gate(
    'cordon-gate-leaf',
    'Cordon Gate',
    'The Directorate gate in the Cordon wall. The red lamp has not gone out since the day it shut.',
    [{ type: 'questCompleted', questId: 'the-heart' }],
    'Sealed. Lieutenant Mercer has the only orders that would open it, and nobody has given them yet.',
    'The gate grinds open on six years of rust. Beyond it, the Old Shipyards.',
  ),
  wardGate('sluice-gate-leaf', 'Sluice Gate', 'A Directorate gate in the old sluice at the foot of the Cut. Marsh water seeps under it.', 'tidemarsh', 'The sluice gate lifts. The Tidemarsh smells of salt and something sweet.'),
  wardGate('incline-gate-leaf', 'Incline Gate', 'The gate at the foot of the Incline, the funicular up the bluff to the Heights.', 'the-heights', 'The Incline gate opens. Up the bluff, every window in the Heights is lit.'),
  wardGate('causeway-gate-leaf', 'Causeway Gate', 'The Directorate gate across the causeway into Old Town. The old town walls stand behind it.', 'old-town', 'The causeway gate opens. The cathedral bell starts ringing, and does not stop.'),
  wardGate('viaduct-gate-leaf', 'Viaduct Gate', 'A gate where the railway viaduct crosses from the Heights into Ironside. The rails are warm.', 'ironside', 'The viaduct gate opens. Ironside is quiet, which it never was.'),
  wardGate('floodgate-leaf', 'Floodgate', 'A floodgate the Directorate turned into a wall. The water on the far side is higher than the water on this side.', 'drowned-quarter', 'The floodgate opens. The water does not come through. It waits.'),
  wardGate('headland-gate-leaf', 'Headland Gate', 'The gate on the coal road out to the headland. Past it, the Lantern.', 'the-lantern', 'The headland gate opens. The Lantern turns, and its beam passes over you.'),
  wardGate('seawall-gate-leaf', 'Seawall Gate', 'A gate in the seawall steps, rusted to the colour of the bay.', 'the-lantern', 'The seawall gate opens. Gulls, and the smell of lamp oil.'),
  siteLift('caisson-lift', 'Site Caisson'),
  siteLift('brinehouse-lift', 'Brinehouse'),
  siteLift('spire-lift', 'Spire'),
  siteLift('ossuary-lift', 'Ossuary'),
  siteLift('bellows-lift', 'Bellows'),
  siteLift('fathom-lift', 'Site Fathom'),
  siteLift('lantern-lift', 'Lantern'),
];

export const HOLLOW_BAY_KIT: FurnishingKit = {
  objects: HOLLOW_BAY_OBJECTS,
  prefabs: [],
  signatures: {},
};

export const HOLLOW_BAY_REGIONS: readonly RegionDefinition[] = [
  { id: 'old-shipyards', name: 'The Old Shipyards', hubDistrictId: 'gatehouse-yard' },
  { id: 'tidemarsh', name: 'The Tidemarsh', hubDistrictId: 'sluice-end' },
  { id: 'the-heights', name: 'The Heights', hubDistrictId: 'incline-top' },
  { id: 'old-town', name: 'Old Town', hubDistrictId: 'causeway-gate' },
  { id: 'ironside', name: 'Ironside', hubDistrictId: 'viaduct-end' },
  { id: 'drowned-quarter', name: 'The Drowned Quarter', hubDistrictId: 'floodgate' },
  { id: 'the-lantern', name: 'The Lantern', hubDistrictId: 'keepers-row' },
];

const look = (physique: CharacterAppearance['physique'], skinTone: string, hairStyle: CharacterAppearance['hairStyle'], hairColor: string, extra: Partial<CharacterAppearance> = {}): CharacterAppearance => ({
  physique,
  bodyType: 'average',
  height: 1,
  skinTone,
  hairStyle,
  hairColor,
  eyeColor: '#3b2a1a',
  faceMark: 'none',
  augment: 'none',
  ...extra,
});

interface Quartermaster {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly examine: string;
  readonly appearance: CharacterAppearance;
  readonly says: string;
  readonly shop: string;
  readonly shopName: string;
  readonly greeting: string;
}

const QUARTERMASTERS: readonly Quartermaster[] = [
  {
    id: 'quartermaster-voss',
    name: 'Quartermaster Voss',
    title: 'Forward Post Four',
    examine: 'Counts everything twice, including the people who come back.',
    appearance: look('male', '#a86f4c', 'crop', '#3b2618', { augment: 'ocularImplant' }),
    says: 'Forward Post Four. Locker, board, rations. Mercer holds the gate; I hold the shelves. Past the yard is the Shipyards, and nobody has walked it in six years.',
    shop: 'forward-post-stores',
    shopName: 'Forward Post Stores',
    greeting: 'Rations and dressings. Sign for them.',
  },
  {
    id: 'nell-marrow',
    name: 'Nell Marrow',
    title: 'Tide Station keeper',
    examine: 'Marsh-born. Never left, and never saw a reason to.',
    appearance: look('female', '#6b3f28', 'braids', '#6b4423'),
    says: 'The Directorate walled us in and called it a cordon. We called it a Tuesday. Mind the salt pans. Anything that stands still out there too long gets a crust on it.',
    shop: 'tide-station-stores',
    shopName: 'Tide Station Stores',
    greeting: 'Eels, broth, and whatever the tide brings.',
  },
  {
    id: 'clem-achebe',
    name: 'Clem Achebe',
    title: 'Upper Station porter',
    examine: 'Still in the funicular company’s uniform, buttons polished.',
    appearance: look('male', '#4a2b1c', 'swept', '#151214'),
    says: 'Upper Station, the Heights. Every window up here is lit and every room is empty. The Spire most of all. Keep to the paths.',
    shop: 'upper-station-stores',
    shopName: 'Upper Station Kiosk',
    greeting: 'The kiosk is open. It never closed.',
  },
  {
    id: 'sister-agathe',
    name: 'Sister Agathe',
    title: 'Hostel warden',
    examine: 'Keeps the hostel the way the cathedral keeps the hours.',
    appearance: look('female', '#eac0a0', 'bun', '#e8e2d4'),
    says: 'The hostel takes pilgrims, and you will do. The cathedral rang thirteen last night. It has been doing that since before the Directorate came.',
    shop: 'hostel-stores',
    shopName: 'Hostel Pantry',
    greeting: 'Bread, broth and bandages. Pay what the board says.',
  },
  {
    id: 'foreman-dray',
    name: 'Foreman Dray',
    title: 'Shift House foreman',
    examine: 'Clocked in the day Bellows went dark and has not clocked out.',
    appearance: look('male', '#c48a62', 'buzz', '#151214', { augment: 'neuralPort' }),
    says: 'Shift House. Ironside ran the city, and Bellows ran Ironside. When it went dark the seals went soft in every Site from here to the Lantern.',
    shop: 'shift-house-stores',
    shopName: 'Shift House Stores',
    greeting: 'Snap tins and gauze. No credit.',
  },
  {
    id: 'rook-danso',
    name: 'Rook Danso',
    title: 'Fixer at the Roost',
    examine: 'Lives on the rooftops and knows which of them still hold.',
    appearance: look('male', '#6b3f28', 'mohawk', '#4f6f9e'),
    says: 'Welcome to the Roost. Stay on the roofs. The water came up one night and stayed, and Site Fathom went under with everything in it. They are still working down there. You can hear the shifts change.',
    shop: 'roost-stores',
    shopName: 'The Roost',
    greeting: 'Dry goods, and dry is the selling point.',
  },
  {
    id: 'hester-lund',
    name: 'Hester Lund',
    title: 'Under-keeper',
    examine: 'Smells of lamp oil and has not slept in a long while.',
    appearance: look('female', '#d9a37f', 'long', '#e8e2d4'),
    says: 'Keepers’ Row. The Lantern has burned a hundred years, and the keeper is dying. When it goes out, the bay wakes up. That is not a figure of speech.',
    shop: 'keepers-stores',
    shopName: 'Keepers’ Stores',
    greeting: 'Oil, wicks and rations. The lamp gets first pick.',
  },
];

export const HOLLOW_BAY_NPCS: readonly NpcDefinition[] = QUARTERMASTERS.map((keeper) => ({
  id: keeper.id,
  name: keeper.name,
  title: keeper.title,
  examine: keeper.examine,
  appearance: keeper.appearance,
  gear: [],
  dialogueId: keeper.id,
  shopId: keeper.shop,
  wanderRadius: 0,
}));

export const HOLLOW_BAY_DIALOGUES: readonly DialogueDefinition[] = QUARTERMASTERS.map((keeper) => ({
  id: keeper.id,
  entries: [{ node: 'start' }],
  nodes: { start: { speaker: 'npc', text: keeper.says, options: [{ text: 'Goodbye.', next: null }] } },
}));

export const HOLLOW_BAY_SHOPS: readonly ShopDefinition[] = QUARTERMASTERS.map((keeper) => ({
  id: keeper.shop,
  name: keeper.shopName,
  greeting: keeper.greeting,
  listings: [
    { itemId: 'rag-bundle', price: 4 },
    { itemId: 'smoked-eel', price: 8 },
    { itemId: 'greens-poultice', price: 14 },
    { itemId: 'tide-broth', price: 110 },
  ],
  buysCategories: ['material', 'consumable', 'equipment'],
  sellRate: 0.5,
}));
