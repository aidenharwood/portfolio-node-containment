import type { CharacterAppearance } from '../../character/appearance.ts';
import type { DialogueDefinition } from '../../dialogue/dialogue.ts';
import type { ShopDefinition } from '../../economy/shop.ts';
import type { Condition } from '../../rules/conditions.ts';
import type { NpcDefinition, WorldObjectDefinition } from '../../world/entities.ts';
import type { RegionDefinition } from '../../world/region.ts';
import type { FurnishingKit } from '../furnishingKit.ts';
import type { FurnishingProfile } from '../furnishingCatalogue.ts';
import { prefab, type Prefab } from '../prefabs/types.ts';

type Prop = Pick<WorldObjectDefinition, 'id' | 'name' | 'examine' | 'model'> & Partial<Pick<WorldObjectDefinition, 'footprint' | 'light' | 'modelScale'>> & { readonly furnishing: FurnishingProfile };

const prop = (definition: Prop): WorldObjectDefinition => ({ blocksMovement: true, interactions: [], ...definition });

const LANDMARK_HOMES = ['street', 'containment', 'industrial', 'freight', 'works'] as const;

const gate = (id: string, name: string, examine: string, conditions: readonly Condition[], lockedText: string, openedText: string): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model: 'gateLeaf',
  blocksMovement: true,
  door: { conditions },
  interactions: [{ verb: 'Open', failureText: lockedText, effects: [{ type: 'notify', text: openedText }] }],
});

const wardGate = (id: string, name: string, examine: string, openedText: string): WorldObjectDefinition =>
  gate(id, name, examine, [], 'It will not budge.', openedText);

const siteLift = (id: string, site: string): WorldObjectDefinition =>
  prop({
    id,
    name: 'Lift',
    examine: `The ${site} lift. The cage is somewhere far below, and nobody has called it up in years.`,
    model: 'liftDoor',
    furnishing: { mount: 'wall', homes: ['containment', 'transit', 'office'] },
  });

export const HINTERLAND_OBJECTS: readonly WorldObjectDefinition[] = [
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
  prop({ id: 'yard-crane', name: 'Slipway Crane', examine: 'A jib crane on rails at the head of the slip. The hook still hangs where the last plate was lifted.', model: 'magnetCrane', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'boiler-stack', name: 'Boiler Shop Stack', examine: 'One of the three boiler shop stacks. You can see them from the moor, which was the point.', model: 'chimney', furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'dock-pump', name: 'Dock Pump', examine: 'The windmill that emptied the graving dock. It still turns, and the dock still floods.', model: 'windpump', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'incline-winder', name: 'Incline Winding Gear', examine: 'The wheel that hauls the Incline’s cars up the bluff. The cable runs up into the dark.', model: 'headframe', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'tide-bell', name: 'Tide Bell', examine: 'The village bell on its stilt frame over the staithe. They ring it when the water comes up faster than the tide.', model: 'bellTower', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'tide-gauge', name: 'Tide Gauge', examine: 'A painted tide board on a post, with a float clock above it. The station logs it every hour, and it has never once agreed with the tables.', model: 'clockTower', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'exchange-clock', name: 'Exchange Clock', examine: 'The clock over Exchange Square, gilt going green. It still strikes the opening bell for a market nobody comes to.', model: 'clockTower', footprint: { width: 2, height: 2 }, light: { radius: 6, color: '#ffe2a8', intensity: 1 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'ridge-beacon', name: 'Ridge Beacon', examine: 'The old fire beacon at the head of the parade, given a lamp and a Directorate lens. From down in the valley it is the first light you see.', model: 'lighthouse', footprint: { width: 3, height: 3 }, light: { radius: 7, color: '#ffb35a', intensity: 0.9 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'crescent-screen', name: 'Crescent Screen', examine: 'A Directorate screen on a mast over the crescent. It cycles the curfew hours to an empty street.', model: 'holoBillboard', modelScale: 2, footprint: { width: 2, height: 2 }, light: { radius: 5, color: '#8ad8ff', intensity: 0.8 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'incline-sheave', name: 'Incline Sheave', examine: 'The great wheel at the top of the Incline. The cable runs over it and straight down the cliff to the valley.', model: 'headframe', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'windpump', name: 'Windpump', examine: 'A lattice tower and a wheel of tin sails. It pumps brine whether or not the wind blows.', model: 'windpump', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'directorate-spire', name: 'The Spire', examine: 'Directorate headquarters. Forty floors of panel and glass, and every window lit.', model: 'directorateSpire', footprint: { width: 3, height: 3 }, light: { radius: 6, color: '#ffb35a', intensity: 0.7 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'bell-tower', name: 'Bell Tower', examine: 'The cathedral tower. The bell rings the hours, and a thirteenth some nights.', model: 'bellTower', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: [...LANDMARK_HOMES, 'civic', 'chapel'] } }),
  prop({ id: 'gate-clock', name: 'West Gate Clock', examine: 'The clock on its post inside the west gate. Pilgrims set their watches by it, and it has been eleven minutes slow for three hundred years.', model: 'clockTower', footprint: { width: 2, height: 2 }, light: { radius: 5, color: '#ffe2a8', intensity: 0.8 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'wall-tower', name: 'River Tower', examine: 'The watch tower where the river comes in under the north wall. The Directorate put a lamp in it, and it sweeps the gorge all night.', model: 'lighthouse', footprint: { width: 3, height: 3 }, light: { radius: 7, color: '#ffcf8a', intensity: 0.9 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'town-pump', name: 'Town Pump', examine: 'The market pump under its wind-wheel. The water is sweet, which nobody in Old Town trusts.', model: 'windpump', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'floodgate-winch', name: 'Floodgate Winding Gear', examine: 'The wheel that lifts the floodgate. It takes four men, or one with a Directorate motor bolted to it.', model: 'headframe', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'tannery-stack', name: 'Tannery Chimney', examine: 'The tannery chimney by the moat. The yard has been cold for years, and the smell has not left.', model: 'chimney', furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'wharf-crane', name: 'Wharf Crane', examine: 'The hand crane on the quay by the water gate. It unloaded barges when barges came up the river.', model: 'magnetCrane', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'gibbet', name: 'The Gibbet', examine: 'An iron cage on a post on its own mound. It hangs empty, and it still swings when there is no wind.', model: 'divingBell', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'gallows', name: 'The Gallows', examine: 'The town gallows on the crown of the hill, where the whole of Old Town could watch. The rope has been cut down. The beam has not.', model: 'gantryCrane', footprint: { width: 3, height: 3 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'ironside-stack', name: 'Ironside Stack', examine: 'One of the furnace stacks over Furnace Row, taller than anything this side of the mountains. You can see them from the crossroads, and the glow at the top has not gone out.', model: 'chimney', modelScale: 2.5, footprint: { width: 2, height: 2 }, light: { radius: 6, color: '#ff7a2a', intensity: 0.8 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'coaling-gantry', name: 'Coaling Gantry', examine: 'The gantry that coaled the engines off the viaduct. The grab still hangs over an empty bunker.', model: 'gantryCrane', footprint: { width: 3, height: 3 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'penstock-gate', name: 'Penstock Gate', examine: 'The gate that lets the falls into the pipe down to Bellows. Somebody has kept the wheel greased.', model: 'lockGate', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'bell-derrick', name: 'Bell Derrick', examine: 'The derrick over the bell pool at Site Fathom. The cable runs down past the pool floor, further than the pool is deep.', model: 'gantryCrane', footprint: { width: 3, height: 3 }, light: { radius: 5, color: '#4fe3ff', intensity: 0.6 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'drowned-belfry', name: 'Drowned Belfry', examine: 'All that stands of St Brenda’s above the water. The bell still hangs in it, and the tide rings it twice a day.', model: 'bellTower', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'fog-bell', name: 'Fog Bell', examine: 'The keepers’ fog bell on the hamlet green. It was rung when the Lantern could not be seen. Nobody has rung it since the beam was turned inland.', model: 'bellTower', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'blight-pylon', name: 'Broken Pylon', examine: 'A pylon from the old line out to the crater. The cables hang slack, and the steel has gone soft and bent the wrong way, as if something leaned on it while it was warm.', model: 'utilityPole', modelScale: 2.2, furnishing: { mount: 'free', homes: ['street'] } }),
  prop({ id: 'rim-searchlight', name: 'Rim Searchlight', examine: 'The camp’s searchlight, trained on the crater lake all night. The wardens log anything that moves on the water. Nothing has, which they do not find reassuring.', model: 'floodMast', modelScale: 1.6, light: { radius: 7, color: '#d8e8ff', intensity: 0.9 }, furnishing: { mount: 'free', homes: ['street'] } }),
  prop({ id: 'ledge-milestone', name: 'Milestone', examine: 'A stone at the roadside, cut with the miles to the Lantern. Somebody has scratched the crater’s name under it.', model: 'bollard', furnishing: { mount: 'free', homes: ['street'] } }),
  prop({ id: 'cooling-tower', name: 'Cooling Tower', examine: 'One of the Bellows towers. Cold for years, and still breathing out steam.', model: 'coolingTower', footprint: { width: 3, height: 3 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'diving-bell', name: 'Diving Bell', examine: 'Site Fathom’s diving bell, hanging from its derrick over the water. The porthole is lit from inside.', model: 'divingBell', footprint: { width: 2, height: 2 }, light: { radius: 4, color: '#4fe3ff', intensity: 0.9 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  prop({ id: 'lighthouse', name: 'The Lantern', examine: 'The lighthouse at the mouth of the bay. The lamp has not gone out in a hundred years, and the keepers say it must not.', model: 'lighthouse', footprint: { width: 3, height: 3 }, light: { radius: 8, color: '#fff2c8', intensity: 1.1, beam: 2.4 }, furnishing: { mount: 'free', homes: LANDMARK_HOMES } }),
  gate(
    'cordon-gate-leaf',
    'Cordon Gate',
    'The Directorate gate in the Cordon wall, chained open. The red lamp over it still burns.',
    [],
    'It will not budge.',
    'The gate grinds open on six years of rust. Beyond it, the Old Shipyards.',
  ),
  wardGate('sluice-gate-leaf', 'Sluice Gate', 'A Directorate gate in the old sluice at the foot of the Cut. Marsh water seeps under it.', 'The sluice gate lifts. The Tidemarsh smells of salt and something sweet.'),
  wardGate('incline-gate-leaf', 'Incline Gate', 'The gate at the foot of the Incline, the funicular up the bluff to the Heights.', 'The Incline gate opens. Up the bluff, every window in the Heights is lit.'),
  wardGate('west-gate-leaf', 'West Gate', 'Old Town’s land gate, with a Directorate gate hung inside the old one. The cathedral tower stands over the wall.', 'The west gate opens. The cathedral bell starts ringing, and does not stop.'),
  wardGate('causeway-gate-leaf', 'Causeway Gate', 'The Directorate gate across the causeway into Old Town. The old town walls stand behind it.', 'The causeway gate opens. The cathedral bell starts ringing, and does not stop.'),
  wardGate('viaduct-gate-leaf', 'Viaduct Gate', 'A gate where the railway viaduct crosses from the Heights into Ironside. The rails are warm.', 'The viaduct gate opens. Ironside is quiet, which it never was.'),
  wardGate('floodgate-leaf', 'Floodgate', 'A floodgate the Directorate turned into a wall. The water on the far side is higher than the water on this side.', 'The floodgate opens. The water does not come through. It waits.'),
  wardGate('headland-gate-leaf', 'Blight Road Gate', 'Ironside’s south gate, onto the road along the Blight’s edge. Past it, the Lantern.', 'The Blight road gate opens. The Lantern turns, and its beam passes over you.'),
  wardGate('seawall-gate-leaf', 'Seawall Gate', 'A gate in the seawall steps, rusted to the colour of the bay.', 'The seawall gate opens. Gulls, and the smell of lamp oil.'),
  wardGate('crater-rim-gate-leaf', 'Crater Rim Gate', 'A Directorate gate across the gap in the crater’s rim. The lake below it is very still.', 'The rim gate opens. Below, the crater lake does not ripple.'),
  siteLift('caisson-lift', 'Site Caisson'),
  siteLift('brinehouse-lift', 'Brinehouse'),
  siteLift('spire-lift', 'Spire'),
  siteLift('ossuary-lift', 'Ossuary'),
  siteLift('bellows-lift', 'Bellows'),
  siteLift('fathom-lift', 'Site Fathom'),
  siteLift('lantern-lift', 'Lantern'),
];

const landmark = (objectId: string): Prefab => prefab(`landmark-${objectId}`, ['focal'], [[0, 0, objectId]]);

export const HINTERLAND_LANDMARK_PREFABS: readonly Prefab[] = [
  landmark('yard-crane'),
  landmark('dock-pump'),
  landmark('incline-winder'),
  landmark('tide-bell'),
  landmark('tide-gauge'),
  landmark('exchange-clock'),
  landmark('ridge-beacon'),
  landmark('crescent-screen'),
  landmark('incline-sheave'),
  landmark('gate-clock'),
  landmark('wall-tower'),
  landmark('town-pump'),
  landmark('floodgate-winch'),
  landmark('tannery-stack'),
  landmark('wharf-crane'),
  landmark('gibbet'),
  landmark('gallows'),
  landmark('coaling-gantry'),
  landmark('penstock-gate'),
  landmark('bell-derrick'),
  landmark('drowned-belfry'),
  landmark('fog-bell'),
  prefab('landmark-boiler-stacks', ['focal'], [[0, 0, 'boiler-stack'], [3, 2, 'boiler-stack'], [6, 0, 'boiler-stack']]),
  prefab('landmark-ironside-stacks', ['focal'], [[0, 0, 'ironside-stack'], [0, 11, 'ironside-stack'], [10, 11, 'ironside-stack']]),
  prefab('landmark-rim-searchlights', ['focal'], [[4, 0, 'rim-searchlight'], [0, 9, 'rim-searchlight']]),
];

export const HINTERLAND_KIT: FurnishingKit = {
  objects: HINTERLAND_OBJECTS,
  prefabs: HINTERLAND_LANDMARK_PREFABS,
  signatures: {},
};

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
