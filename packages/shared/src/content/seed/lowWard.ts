import { DRESSING_THEMES } from '../prefabs/types.ts';
import { CITY_KIT_OBJECTS } from './cityKit.ts';
import type { CharacterAppearance } from '../../character/appearance.ts';
import type { DialogueDefinition } from '../../dialogue/dialogue.ts';
import type { ShopDefinition } from '../../economy/shop.ts';
import type { NpcDefinition, WorldObjectDefinition } from '../../world/entities.ts';
import type { RegionDefinition } from '../../world/region.ts';

export const SEED_OBJECTS: readonly WorldObjectDefinition[] = [
  {
    id: 'storage-locker',
    name: 'Storage Locker',
    examine: 'A battered steel locker. Every locker in the city opens onto the same shelves.',
    model: 'storageLocker',
    blocksMovement: true,
    furnishing: { mount: 'wall', homes: DRESSING_THEMES },
    interactions: [{ verb: 'Open', effects: [{ type: 'openStorage' }] }],
  },
  ...CITY_KIT_OBJECTS,
];

export const SEED_SHOPS: readonly ShopDefinition[] = [
  {
    id: 'kettering-general',
    name: "Kettering's General Store",
    greeting: 'Buying or selling? Mind the step.',
    listings: [],
    buysCategories: ['material', 'consumable', 'equipment'],
    sellRate: 0.5,
  },
  {
    id: 'graves-fish',
    name: "Graves' Fish",
    greeting: 'Caught this morning. Mostly.',
    listings: [],
    buysCategories: ['material', 'consumable', 'equipment'],
    sellRate: 0.5,
  },
  {
    id: 'pike-pawn',
    name: "Pike's Pawn",
    greeting: 'Everything has a price. Most things have two.',
    listings: [],
    buysCategories: ['material', 'consumable', 'equipment'],
    sellRate: 0.5,
  },
  {
    id: 'fenwick-tools',
    name: 'Fenwick Tools',
    greeting: 'If it bolts, cuts or prises, I have it.',
    listings: [],
    buysCategories: ['material', 'consumable', 'equipment'],
    sellRate: 0.5,
  },
  {
    id: 'greenhalgh-remedies',
    name: 'Greenhalgh Remedies',
    greeting: 'Tinctures, salves and honest advice.',
    listings: [],
    buysCategories: ['material', 'consumable', 'equipment'],
    sellRate: 0.5,
  },
  {
    id: 'lind-signal',
    name: 'The Signal',
    greeting: 'Receivers, scanners and spare valves.',
    listings: [],
    buysCategories: ['material', 'consumable', 'equipment'],
    sellRate: 0.5,
  },
  {
    id: 'abara-chandlery',
    name: "Abara's Chandlery",
    greeting: 'Rope, hooks, nets and lamp oil.',
    listings: [],
    buysCategories: ['material', 'consumable', 'equipment'],
    sellRate: 0.5,
  },
  {
    id: 'hallam-scrap',
    name: "Hallam's Breakers",
    greeting: 'By weight, not by sentiment.',
    listings: [],
    buysCategories: ['material', 'consumable', 'equipment'],
    sellRate: 0.5,
  },
];

const look = (physique: CharacterAppearance['physique'], skinTone: string, hairStyle: CharacterAppearance['hairStyle'], hairColor: string, extra: Partial<CharacterAppearance> = {}): CharacterAppearance => ({
  physique,
  bodyType: 'average',
  height: 1,
  skinTone,
  hairStyle,
  hairColor,
  eyeColor: '#3a2a1a',
  faceMark: 'none',
  augment: 'none',
  ...extra,
});

interface Resident {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly examine: string;
  readonly appearance: CharacterAppearance;
  readonly says: string;
  readonly shopId?: string;
}

const RESIDENTS: readonly Resident[] = [
  {
    id: 'moss-kettering',
    name: 'Moss Kettering',
    title: 'Shopkeeper',
    examine: 'Runs the general store and remembers what everyone owes.',
    appearance: look('male', '#a8775a', 'swept', '#6a6a6a', { bodyType: 'broad' }),
    says: "Thirty years behind this counter. The anomalies came and folk still need string, soap and tins. That's the city for you.",
    shopId: 'kettering-general',
  },
  {
    id: 'duty-officer-halloran',
    name: 'Officer Halloran',
    title: 'Directorate duty officer',
    examine: 'Pressed uniform, tired eyes. Hands out the work nobody else will take.',
    appearance: look('female', '#d8b090', 'bun', '#3a2a20', { augment: 'ocularImplant' }),
    says: 'New operative? The board on the wall has the work. Amber tags are routine. Red tags, read twice before you sign.',
  },
  {
    id: 'li-vance',
    name: 'Li Vance',
    title: 'Noodle cook',
    examine: 'Steam-burned forearms and a ladle that never stops moving.',
    appearance: look('male', '#c69a70', 'buzz', '#1a1a1a'),
    says: "Broth's been on since before the trains started running again. Sit, eat, don't ask what's in it.",
  },
  {
    id: 'wren-adebayo',
    name: 'Wren Adebayo',
    title: 'Station porter',
    examine: 'Knows every train, every platform and every face that gets off them.',
    appearance: look('female', '#6a4a35', 'braids', '#1a1410'),
    says: "Last train in, was it? Welcome to Hollow Bay. The Site's over the canal, the tenements are north, and the noodles are the best thing in the Ward.",
  },
  {
    id: 'bettina-crane',
    name: 'Bettina Crane',
    title: 'Landlady',
    examine: 'Lets rooms by the week and watches her tenants like a hawk.',
    appearance: look('female', '#e0bfa0', 'long', '#8a8a8a', { bodyType: 'slight' }),
    says: "Rent's due Thursdays. Quiet after ten. And whatever you hear knocking at night, it isn't the pipes, so don't call me about it.",
  },
  {
    id: 'ada-okafor',
    name: 'Ada Okafor',
    title: 'Tenant',
    examine: 'Pegging out washing with the air of someone counting every shirt.',
    appearance: look('female', '#5a3a28', 'crop', '#2a1a10', { bodyType: 'broad' }),
    says: "Someone's been at my line again. Three shirts this month and my husband's good coat. If you see a coat walking about on its own, you tell me.",
  },
  {
    id: 'pia-ostrowski',
    name: 'Pia Ostrowski',
    title: 'Baker',
    examine: 'Flour to the elbows. The ovens behind her never quite go cold.',
    appearance: look('female', '#e8c8a8', 'bun', '#c8a060'),
    says: "Bread's a day old, but so is everything round here. The flour comes in on the trains. When they stop, so do I.",
  },
  {
    id: 'sol-marsh',
    name: 'Sol Marsh',
    title: 'Landlord of the Drowned Lamp',
    examine: 'Polishes the same glass whenever someone is talking.',
    appearance: look('male', '#b88a68', 'shaved', '#2a2a2a', { faceMark: 'scarBrow' }),
    says: 'The Drowned Lamp. Named for the one they pulled out of the canal, still lit. Make of that what you like.',
  },
  {
    id: 'pell',
    name: 'Pell',
    title: 'Alley regular',
    examine: 'Leans on the wall like it might fall over without them.',
    appearance: look('male', '#9a7055', 'mohawk', '#4fa86a', { augment: 'circuitTrace' }),
    says: "Lost a cat. Grey, one ear. She went down the vent by the bins and I've heard her since, but she doesn't come up. Vents don't go that deep. Do they?",
  },
  {
    id: 'tam-reilly',
    name: 'Tam Reilly',
    title: 'Retired dockhand',
    examine: 'Worked the cranes on the basin for forty years before the Directorate fenced it.',
    appearance: look('male', '#c89a78', 'crop', '#d0d0d0', { faceMark: 'scarCheek' }),
    says: "I watched them build that Site. Unloaded the steel myself. Funny thing: we delivered far more steel than you can see above ground.",
  },
  {
    id: 'hetty-graves',
    name: 'Hetty Graves',
    title: 'Fishmonger',
    examine: 'Sleeves rolled, knife quick. Smells of the basin.',
    appearance: look('female', '#d8a888', 'swept', '#8a3a20', { bodyType: 'broad' }),
    says: "Eels from the basin, crabs from the Cut. Don't buy anything that glows. I don't sell it, but the man two stalls down might.",
    shopId: 'graves-fish',
  },
  {
    id: 'bram-oduya',
    name: 'Bram Oduya',
    title: 'Greengrocer',
    examine: 'Arranges his cabbages like they owe him money.',
    appearance: look('male', '#5a3a28', 'buzz', '#1a1a1a'),
    says: "Grown on the allotments past the laundry. Half the Ward eats because of those plots. The other half steals from them.",
  },
  {
    id: 'jonah-pike',
    name: 'Jonah Pike',
    title: 'Pawnbroker',
    examine: 'Weighs every object twice and every customer three times.',
    appearance: look('male', '#c8a080', 'crop', '#3a3a3a', { augment: 'ocularImplant' }),
    says: "Bring me something from beyond the Cordon and we'll talk real money. Bring me something that moves on its own and I'll call the Directorate.",
    shopId: 'pike-pawn',
  },
  {
    id: 'ivo-fenwick',
    name: 'Ivo Fenwick',
    title: 'Toolmaker',
    examine: 'Grease to the wrists and a pencil behind each ear.',
    appearance: look('male', '#a87858', 'undercut', '#5a3a20', { faceMark: 'burnMark' }),
    says: "Salvage crews come through here before they hit the scrapyards. Take a proper pry bar. The things in the scrap don't like being disturbed.",
    shopId: 'fenwick-tools',
  },
  {
    id: 'marta-greenhalgh',
    name: 'Marta Greenhalgh',
    title: 'Apothecary',
    examine: 'Her shelves are labelled in three alphabets.',
    appearance: look('female', '#e8c8a8', 'long', '#2a3a2a', { bodyType: 'slight' }),
    says: "Everything here was grown or brewed in the Ward. Since the anomalies, some of the plants grow better. I'm trying not to think about why.",
    shopId: 'greenhalgh-remedies',
  },
  {
    id: 'sefa-lind',
    name: 'Sefa Lind',
    title: 'Radio technician',
    examine: 'Wears headphones round their neck that hiss even when unplugged.',
    appearance: look('female', '#8a6048', 'mohawk', '#4fe3ff', { augment: 'neuralPort' }),
    says: "Tune a set to the dead band at night and you'll hear the Site breathing. Directorate says it's interference. Interference doesn't keep time.",
    shopId: 'lind-signal',
  },
  {
    id: 'nell-carraway',
    name: 'Nell Carraway',
    title: 'Hawker',
    examine: 'Sells from a barrow and talks faster than she counts.',
    appearance: look('female', '#c69a70', 'braids', '#6a3a1a'),
    says: "Lamps, laces, lucky charms! The charms work about as well as the lamps. Which is, sometimes.",
  },
  {
    id: 'harbourmaster-quill',
    name: 'Harbourmaster Quill',
    title: 'Harbourmaster',
    examine: 'Keeps a ledger of every boat that never left the basin.',
    appearance: look('male', '#d8b090', 'shaved', '#3a3a3a', { bodyType: 'broad', faceMark: 'scarCheek' }),
    says: "Nothing sails out of this basin any more. The Directorate shut the sea locks the week they built the island fence. I still log the tides. Someone should.",
  },
  {
    id: 'sergeant-doyle',
    name: 'Sergeant Doyle',
    title: 'Gate sergeant',
    examine: 'Directorate grey, a clipboard and no sense of humour at all.',
    appearance: look('male', '#b88a68', 'buzz', '#2a2a2a', { augment: 'jawPlate' }),
    says: 'Site Meridian. Operatives and authorised visitors only. You have a pass? Then the intake hall is straight on. No pass, no further than this desk.',
  },
  {
    id: 'clerk-ferris',
    name: 'Clerk Ferris',
    title: 'Intake clerk',
    examine: 'Stamps forms with the rhythm of someone who has stopped reading them.',
    appearance: look('female', '#e0c0a0', 'bun', '#5a4a3a', { augment: 'circuitTrace' }),
    says: "Intake. Name, number, any anomalous exposure in the last thirty days? Don't answer that last one out loud. Write it down.",
  },
  {
    id: 'imogen-hale',
    name: 'Dr Imogen Hale',
    title: 'Containment specialist',
    examine: 'Watches the cells the way other people watch weather.',
    appearance: look('female', '#c69a70', 'crop', '#1a1a1a', { augment: 'ocularImplant' }),
    says: "Block A is low security. Amber means routine. The things that turn the lights red are kept below, and the lift has been switched off since the last time one of them was moved.",
  },
  {
    id: 'ruth-abara',
    name: 'Ruth Abara',
    title: 'Chandler',
    examine: 'Can tie a knot faster than you can name it.',
    appearance: look('female', '#5a3a28', 'swept', '#2a2a2a'),
    says: "Dredging hooks, rope, waders. The basin gives up all sorts if you drag it. Old coins, engine parts. Last week, a typewriter, still typing.",
    shopId: 'abara-chandlery',
  },
  {
    id: 'mags-doherty',
    name: 'Mags Doherty',
    title: 'Laundress',
    examine: 'Red hands, a steam-curled fringe and a voice that carries over the machines.',
    appearance: look('female', '#e8c0a0', 'bun', '#a84a2a', { bodyType: 'broad' }),
    says: "Half the Ward's shirts go through these machines. The chimney's been smoking since my gran's day. Some nights it smokes when the boilers are cold. I don't ask.",
  },
  {
    id: 'agnes-pole',
    name: 'Agnes Pole',
    title: 'Allotment keeper',
    examine: 'Mud to the knees and a trowel in each pocket.',
    appearance: look('female', '#c8a080', 'long', '#d0d0d0', { bodyType: 'slight', faceMark: 'freckles' }),
    says: "Plant a bean, get a bean. Mostly. Bed six grew something with leaves like hands last spring. Greenhalgh paid well for it. I burned the rest.",
  },
  {
    id: 'ilse-varga',
    name: 'Ilse Varga',
    title: 'Lockkeeper',
    examine: 'Leans on things the way only a lockkeeper can.',
    appearance: look('female', '#d8b090', 'crop', '#5a4a3a', { faceMark: 'scarBrow' }),
    says: "Nothing's come through the lock in years, not going out. Coming in, now. Things come up the Cut from the culverts at night. Small ones, so far.",
  },
  {
    id: 'kofi-mensah',
    name: 'Kofi Mensah',
    title: 'Pump engineer',
    examine: 'Knows every valve in the Cut by its sound.',
    appearance: look('male', '#5a3a28', 'buzz', '#1a1a1a', { augment: 'jawPlate' }),
    says: "If these pumps stop, the basin rises and the Site floods from the bottom up. The Directorate pays me well not to let that happen. They never say why the bottom matters.",
  },
  {
    id: 'dutch-hallam',
    name: 'Dutch Hallam',
    title: 'Scrap dealer',
    examine: 'Weighs scrap with his eyes and gets it right.',
    appearance: look('male', '#b88a68', 'shaved', '#2a2a2a', { bodyType: 'broad', augment: 'respirator' }),
    says: "Bring me anything off the heaps and I'll buy it. Mind the heaps themselves. Some of them have been rearranging themselves at night.",
    shopId: 'hallam-scrap',
  },
  {
    id: 'corporal-sato',
    name: 'Corporal Sato',
    title: 'Fringe watch',
    examine: 'Too young for the post and knows it.',
    appearance: look('male', '#d8b090', 'undercut', '#1a1a1a'),
    says: "You're past the last safe street. Things leak through from the Cordon here. If the hull starts knocking, don't knock back.",
  },
  {
    id: 'lieutenant-mercer',
    name: 'Lieutenant Mercer',
    title: 'Cordon post commander',
    examine: 'Has watched one gate for six years and has not once seen it open.',
    appearance: look('female', '#8a6048', 'braids', '#1a1410', { augment: 'ocularImplant' }),
    says: "The Cordon gate stays shut. Beyond it is the Old Shipyards, and beyond that, nobody's sure. When the Directorate wants it opened, I'll hear first. You'll hear second.",
  },
];

export const SEED_NPCS: readonly NpcDefinition[] = RESIDENTS.map((resident) => ({
  id: resident.id,
  name: resident.name,
  title: resident.title,
  examine: resident.examine,
  appearance: resident.appearance,
  gear: [],
  dialogueId: resident.id,
  ...(resident.shopId ? { shopId: resident.shopId } : {}),
  wanderRadius: 0,
}));

export const SEED_DIALOGUES: readonly DialogueDefinition[] = RESIDENTS.map((resident) => ({
  id: resident.id,
  entries: [{ node: 'start' }],
  nodes: { start: { speaker: 'npc', text: resident.says, options: [{ text: 'Goodbye.', next: null }] } },
}));

export const SEED_REGIONS: readonly RegionDefinition[] = [{ id: 'low-ward', name: 'The Low Ward', hubDistrictId: 'terminus-square' }];
