import type { CharacterAppearance } from '../../character/appearance.ts';
import type { DialogueDefinition } from '../../dialogue/dialogue.ts';
import type { ShopDefinition } from '../../economy/shop.ts';
import type { NpcDefinition } from '../../world/entities.ts';
import type { RegionDefinition } from '../../world/region.ts';
export { LANDMARK_KIT as HINTERLAND_KIT, LANDMARK_OBJECTS as HINTERLAND_OBJECTS, LANDMARK_PREFABS as HINTERLAND_LANDMARK_PREFABS } from '../catalog/landmarks.ts';

export const HINTERLAND_REGIONS: readonly RegionDefinition[] = [
  { id: 'old-shipyards', name: 'The Old Shipyards', hubDistrictId: 'gatehouse-yard' },
  { id: 'tidemarsh', name: 'The Tidemarsh', hubDistrictId: 'tide-station' },
  { id: 'the-heights', name: 'The Heights', hubDistrictId: 'upper-station' },
  { id: 'old-town', name: 'Old Town', hubDistrictId: 'westgate' },
  { id: 'ironside', name: 'Ironside', hubDistrictId: 'railhead' },
  { id: 'drowned-quarter', name: 'The Drowned Quarter', hubDistrictId: 'the-roost' },
  { id: 'the-lantern', name: 'The Lantern', hubDistrictId: 'keepers-hamlet' },
  { id: 'the-blight', name: 'The Blight', hubDistrictId: 'rim-camp' },
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
    says: 'Keepers’ Row. The Lantern has burned a hundred years, and the keeper is dying. Its beam is turned inland now, onto the crater. When it goes out, the lake wakes up. That is not a figure of speech.',
    shop: 'keepers-stores',
    shopName: 'Keepers’ Stores',
    greeting: 'Oil, wicks and rations. The lamp gets first pick.',
  },
  {
    id: 'warden-okafor',
    name: 'Warden Okafor',
    title: 'Rim Camp warden',
    examine: 'Sleeps with her back to the lake and her face to the beam.',
    appearance: look('female', '#5a3422', 'crop', '#d8d2c4', { augment: 'ocularImplant' }),
    says: 'Rim Camp. The Lantern keeps the crater asleep, and I keep the camp. Below us is the Hollow. Do not go down to the water, and do not answer if it calls you by name.',
    shop: 'rim-camp-stores',
    shopName: 'Rim Camp Stores',
    greeting: 'Whatever made it this far up the road.',
  },
];

export const HINTERLAND_NPCS: readonly NpcDefinition[] = QUARTERMASTERS.map((keeper) => ({
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

export const HINTERLAND_DIALOGUES: readonly DialogueDefinition[] = QUARTERMASTERS.map((keeper) => ({
  id: keeper.id,
  entries: [{ node: 'start' }],
  nodes: { start: { speaker: 'npc', text: keeper.says, options: [{ text: 'Goodbye.', next: null }] } },
}));

export const HINTERLAND_SHOPS: readonly ShopDefinition[] = QUARTERMASTERS.map((keeper) => ({
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
