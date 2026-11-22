import type { CharacterAppearance } from '../../character/appearance.ts';
import type { DialogueDefinition } from '../../dialogue/dialogue.ts';
import type { ShopDefinition } from '../../economy/shop.ts';
import type { NpcDefinition } from '../../world/entities.ts';
import type { RegionDefinition } from '../../world/region.ts';
import { CONTRACTS_OFFICE } from '../catalog/services.ts';

type Look = [physique: CharacterAppearance['physique'], skin: string, hair: CharacterAppearance['hairStyle'], hairColor: string, extra?: Partial<CharacterAppearance>];

const look = ([physique, skinTone, hairStyle, hairColor, extra = {}]: Look): CharacterAppearance => ({
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
  readonly look: Look;
  readonly says: string;
  readonly shop?: string;
  readonly dialogueId?: string;
}

const RESIDENTS: readonly Resident[] = [
  { id: 'sergeant-vale', name: 'Sergeant Imre Vale', title: 'Intake drill sergeant', examine: 'Twenty years in the Service and every one of them pressed into the uniform.', look: ['male', '#b88a68', 'buzz', '#5a5a5a', { bodyType: 'broad', faceMark: 'scarBrow' }], says: 'Recruit. Stand up straight. The Span does not care how you stand, but I do.' },
  { id: 'sergeant-vale-null', name: 'Sergeant Imre Vale', title: 'Intake drill sergeant, again', examine: 'Sergeant Vale. The same scar, the same voice, a uniform two years newer than the one you saw in Kestrel.', look: ['male', '#b88a68', 'buzz', '#5a5a5a', { bodyType: 'broad', faceMark: 'scarBrow' }], says: 'Don’t look at me like that, recruit. You were printed too.' },
  { id: 'registrar-lune', name: 'Registrar Lune', title: 'Keeper of the Kestrel files', examine: 'Ink on every finger. Lune has never been seen outside Records, and never been seen arriving.', look: ['female', '#e0c8b0', 'bun', '#d8d8d8', { bodyType: 'slight', augment: 'ocularImplant' }], says: 'Every operative has a file. Every file has an operative. I keep them matched.' },
  { id: 'registrar-lune-null', name: 'Registrar Lune', title: 'Keeper of the Null files', examine: 'Registrar Lune, here, at the end of the Span, with the same ink on the same fingers.', look: ['female', '#e0c8b0', 'bun', '#d8d8d8', { bodyType: 'slight', augment: 'ocularImplant' }], says: 'Your file came here before you did. They always do.' },
  { id: 'warden-achebe', name: 'Duty Warden Achebe', title: 'Holding Block K', examine: 'Keeps the keys to every cell in Block K on a ring that never jingles.', look: ['male', '#5a3a28', 'crop', '#1a1a1a', { augment: 'neuralPort' }], says: 'Block K holds the gentle ones. Wisps, mites, a coat that sulks. The ones that are not gentle are below.' },
  { id: 'lift-warden-ama', name: 'Lift Warden Ama', title: 'Kestrel headhouse', examine: 'Runs the lift and signs the book. Nobody goes down without her pen.', look: ['female', '#6a4a35', 'braids', '#1a1410'], says: 'The lift goes down to Intake. Recruits go down once, at the end of training. Some of them come back up.' },
  { id: 'armourer-kade', name: 'Armourer Kade', title: 'Kestrel armoury', examine: 'Oil to the elbows. Knows every weapon on the rack by its serial number.', look: ['male', '#c89a78', 'undercut', '#3a2a1a', { faceMark: 'burnMark' }], says: 'Scrap issue only until you’ve earned better. Then you make better yourself.', shop: 'kestrel-armoury' },
  { id: 'quartermaster-okonkwo', name: 'Quartermaster Okonkwo', title: 'Commons Stores', examine: 'Counts everything twice, including the people who come back.', look: ['female', '#5a3422', 'crop', '#d8d2c4', { augment: 'ocularImplant' }], says: 'Locker, board, exchange, rations. If you need it in Kestrel, it comes across this counter.', shop: 'kestrel-stores' },
  { id: 'cook-tavi', name: 'Tavi Rahman', title: 'The Mess', examine: 'Steam-burned forearms and a ladle that never stops.', look: ['male', '#a8775a', 'buzz', '#1a1a1a'], says: 'Eat. The Span is long and you are thin.', shop: 'kestrel-mess' },
  { id: 'technician-oduya', name: 'Technician Oduya', title: 'Fabrication Shed', examine: 'Grease to the wrists and a pencil behind each ear.', look: ['female', '#6a4834', 'swept', '#1a1a1a', { augment: 'circuitTrace' }], says: 'Refinery, fabricator, synthesiser. Everything you wear on the Span, somebody made on one of these.', shop: 'kestrel-parts' },
  { id: 'medic-sauer', name: 'Medic Hanne Sauer', title: 'Commons Clinic', examine: 'Calm hands, tired eyes, a stethoscope older than the clinic.', look: ['female', '#e8c8a8', 'long', '#8a6a3a'], says: 'Sit. Breathe. You came out of Intake with a heartbeat I have heard before.', shop: 'kestrel-clinic' },
  { id: 'recruit-dace', name: 'Recruit Dace', title: 'Intake Cohort 41', examine: 'Your bunkmate. Talks in their sleep, always the same sentence.', look: ['female', '#c69a70', 'mohawk', '#4fa86a', { bodyType: 'slight' }], says: 'They gave us the old barracks. Forty-one. There’s names scratched in the bunks already, and one of them is mine.' },
  { id: 'chaplain-marr', name: 'Chaplain Ivo Marr', title: 'Cohort Hall', examine: 'Says the names of the dead every morning. The list gets longer, and some of the names repeat.', look: ['male', '#d8b090', 'swept', '#e8e2d4'], says: 'We ring the bell when a cohort passes out. We have not rung it for Forty-one. Not yet.' },
  { id: 'widow-hale', name: 'Mrs Hale', title: 'Number Four', examine: 'Lays the table for two every evening.', look: ['female', '#e0bfa0', 'bun', '#8a8a8a', { bodyType: 'slight' }], says: 'My son went to Tallow with Forty-one. He came back last spring. He does not remember the garden.' },
  { id: 'storekeeper-pim', name: 'Pim', title: 'Lines Store', examine: 'Sells bread, string and opinions.', look: ['male', '#c8a080', 'crop', '#3a3a3a'], says: 'Bread’s from the Mess, fish from the lake, and the gossip’s free.', shop: 'lines-store' },
  { id: 'old-man-tobin', name: 'Old Tobin', title: 'Number Twelve', examine: 'Was here when the Meridian came down, he says. He would be two hundred and six.', look: ['male', '#c89a78', 'shaved', '#d0d0d0', { faceMark: 'scarCheek' }], says: 'I saw the ship come down. I saw the first Kestrel built. I saw the first Lune, and the second.' },
  { id: 'officer-hask', name: 'Processing Officer Hask', title: 'Kestrel Intake, B1', examine: 'Runs Intake like a railway timetable.', look: ['male', '#c8a080', 'swept', '#4a3a2a', { augment: 'neuralPort' }], says: 'Processing, the Print Room, the Recovery Ward and Roster Holding. You have been through all four before. You will not remember.' },
  { id: 'steward-tull', name: 'Steward Bram Tull', title: 'Co-op Stores, Harrowgate', examine: 'A farmer who keeps the co-op books with the same patience he keeps his rows.', look: ['male', '#a86f4c', 'crop', '#3b2618', { bodyType: 'broad' }], says: 'Harrowgate feeds Kestrel and Halcyon both. Lately the Orchard has been feeding on Harrowgate.', shop: 'harrow-stores' },
  { id: 'apothecary-wynn', name: 'Ada Wynn', title: 'Apothecary', examine: 'Her shelves are labelled in three alphabets.', look: ['female', '#e8c8a8', 'long', '#2a3a2a', { bodyType: 'slight' }], says: 'Since the Orchard started to strain, some of my herbs grow better. I try not to think about why.', shop: 'harrow-apothecary' },
  { id: 'smith-keane', name: 'Joss Keane', title: 'The Smithy', examine: 'Rolls ferro plate by hand, for the love of it.', look: ['male', '#a87858', 'undercut', '#5a3a20', { faceMark: 'burnMark' }], says: 'Ferro plate from Spill silt. Better than scrap, and it does not argue back.', shop: 'harrow-smithy' },
  { id: 'publican-dorrit', name: 'Dorrit Venn', title: 'The Plough', examine: 'Pulls a pint like a sermon.', look: ['female', '#d8a888', 'swept', '#8a3a20', { bodyType: 'broad' }], says: 'Sit. Eat. Listen. Half of what you need to know on the Terraces gets said in here after dark.', shop: 'the-plough' },
  { id: 'reeve-halvard', name: 'Reeve Halvard', title: 'Co-op Hall', examine: 'Elected reeve of Harrowgate four times. Lost every election, won every vote.', look: ['male', '#c89a78', 'swept', '#8a8a8a'], says: 'The Orchard is a Directorate problem until it is in my wheat. It is in my wheat.' },
  { id: 'baker-ostrowski', name: 'Pia Ostrowski', title: 'Baker', examine: 'Flour to the elbows. The ovens never quite go cold.', look: ['female', '#e8c8a8', 'bun', '#c8a060'], says: 'Yesterday’s bread at today’s prices, and the flour is from Harrow wheat. Mostly.', shop: 'ostrowski-bakery' },
  { id: 'farmer-greaves', name: 'Farmer Greaves', title: 'Furrow Cottage', examine: 'Mud to the knees and a trowel in each pocket.', look: ['male', '#c8a080', 'long', '#d0d0d0', { faceMark: 'freckles' }], says: 'My top field’s walking. Not the crops. The field.' },
  { id: 'farmer-adaeze', name: 'Adaeze Okoro', title: 'Sluice Cottage', examine: 'Keeps the sluices on the terraces running, by hand when she must.', look: ['female', '#5a3a28', 'braids', '#2a1a10'], says: 'Water runs uphill here if you ask the Span nicely. The Orchard has stopped asking.' },
  { id: 'doctor-amsel', name: 'Dr Amsel', title: 'Lanes Surgery', examine: 'Treats sprains, seed-bites and stubbornness.', look: ['male', '#d8b090', 'crop', '#4a3a2a'], says: 'Seed-bite. Wash it, burn the dressing, and don’t plant anything for a week.' },
  { id: 'corporal-fenn', name: 'Corporal Fenn', title: 'Orchard Gatehouse', examine: 'The last guard at Site Orchard who still trusts the fence.', look: ['male', '#d8b090', 'undercut', '#1a1a1a'], says: 'Strained, they call it. The seed stock is in the rows and the rows are in the seed vault. You figure out which is containing which.' },
  { id: 'dr-kessel', name: 'Dr Ama Kessel', title: 'Director, Site Orchard', examine: 'Has not slept since the Keeper started tending the rows.', look: ['female', '#6b3f28', 'crop', '#2a1a10', { augment: 'ocularImplant' }], says: 'Site Orchard holds a gardener. The gardener has decided we are weeds. I need operatives, not opinions.' },
  { id: 'fixer-juno', name: 'Juno Reyes', title: 'Fixer, Neon Row', examine: 'Knows a door into every building in Halcyon and a price for each.', look: ['female', '#8a6048', 'undercut', '#4fe3ff', { augment: 'circuitTrace' }], says: 'Directorate. Cute. In Halcyon the Combine owns the lights, and the lights own everyone else.', shop: 'halcyon-stores' },
  { id: 'bartender-kit', name: 'Kit Moreau', title: 'The Static Bloom', examine: 'Pours drinks with one hand and works a deck with the other.', look: ['male', '#c69a70', 'mohawk', '#ff4fa8', { augment: 'jawPlate' }], says: 'The neon moths come in when the door’s open. They like the jukebox. Don’t hit them near the jukebox.', shop: 'static-bloom' },
  { id: 'ripperdoc-sato', name: 'Dr Sato', title: 'Sato Clinic', examine: 'Fits implants, sets bones, asks no questions.', look: ['female', '#d8b090', 'bun', '#1a1a1a', { augment: 'ocularImplant' }], says: 'Half my patients came back from the undercity with Mr Brightly’s smile. It does not wash off.', shop: 'halcyon-clinic' },
  { id: 'tinker-ash', name: 'Ash', title: 'Neon Works', examine: 'Rebuilds anything with a plug.', look: ['male', '#6a4834', 'shaved', '#2a2a2a', { augment: 'circuitTrace' }], says: 'Bring plasteel, leave armour. Simple as that.' },
  { id: 'vendor-lin', name: 'Lin', title: 'Night Market', examine: 'Sells what fell off the back of a Combine truck. Several Combine trucks.', look: ['female', '#e0bfa0', 'long', '#5a2a1a'], says: 'Plasteel plate, synth-weave, a carbine that only fired once. Make an offer.', shop: 'night-market' },
  { id: 'liaison-vance', name: 'Liaison Arden Vance', title: 'Aurelian Combine', examine: 'A good suit and a smile like a press release.', look: ['male', '#e0c8b0', 'swept', '#c8a060', { augment: 'neuralPort' }], says: 'The Combine welcomes the Directorate’s interest in Gallowglass. The Combine would welcome it more if it were quiet.' },
  { id: 'arcade-keeper-mo', name: 'Mo', title: 'Plaza Arcade', examine: 'Runs the arcade and every game in it, rigged or not.', look: ['male', '#a8775a', 'mohawk', '#b6ff4f'], says: 'One credit a go. The high score table has a name on it that nobody entered.', shop: 'plaza-arcade' },
  { id: 'tenant-roux', name: 'Ines Roux', title: 'Flat 9C', examine: 'Has taped over every screen in her flat.', look: ['female', '#d8a888', 'crop', '#3a2a1a'], says: 'He talks to me through the fridge now. Mr Brightly. He wants to know if I am satisfied.' },
  { id: 'noodle-cook-han', name: 'Han', title: 'Ninth Street Noodles', examine: 'Twenty years at the same wok on the same corner.', look: ['male', '#c69a70', 'buzz', '#1a1a1a'], says: 'Noodles, broth, and the best view of the billboard in Halcyon. Shame about the billboard.', shop: 'ninth-noodles' },
  { id: 'pawnbroker-pike', name: 'Jonah Pike', title: 'Pawn & Patch', examine: 'Weighs every object twice and every customer three times.', look: ['male', '#c8a080', 'crop', '#3a3a3a', { augment: 'ocularImplant' }], says: 'Bring me anything from the undercity and we will talk real money. Bring me anything that smiles and I will call the Directorate.', shop: 'pawn-and-patch' },
  { id: 'tenant-okeke', name: 'Tunde Okeke', title: 'Flat 12A', examine: 'Night-shift Combine clerk. Day-shift insomniac.', look: ['male', '#5a3a28', 'crop', '#1a1a1a'], says: 'The top ten floors of the Spire stopped answering a month ago. The lifts still go up. Nothing comes down.' },
  { id: 'bartender-reza', name: 'Reza', title: 'The Glasshouse', examine: 'Serves anyone who does not work for the Combine.', look: ['female', '#a86f4c', 'braids', '#1a1410'], says: 'Glasshouse rules: no Combine, no screens, no smiling at strangers.', shop: 'glasshouse-bar' },
  { id: 'doc-esperanza', name: 'Doc Esperanza', title: 'Back-alley Clinic', examine: 'No licence, no fees, no waiting list.', look: ['female', '#c89a78', 'swept', '#5a4a3a'], says: 'Glass hound bites go septic in an hour. Come straight here, not to Sato.' },
  { id: 'runner-tam', name: 'Tam', title: 'Flat 3', examine: 'Runs packages under the Combine’s nose for a living.', look: ['male', '#d8b090', 'undercut', '#1a1a1a'], says: 'I know every way into the undercity. I just don’t use any of them anymore.' },
  { id: 'agent-mercer', name: 'Field Agent Mercer', title: 'Site Gallowglass', examine: 'Has been holding the headhouse alone for nine days on coffee and spite.', look: ['female', '#8a6048', 'braids', '#1a1410', { augment: 'ocularImplant' }], says: 'Gallowglass is breached. The Combine says it isn’t. One of us is lying, and I am standing in the breach.' },
  { id: 'scav-boss-mags', name: 'Mags Doherty', title: 'Boss of Rustwater', examine: 'Red hands, a steam-curled fringe and a voice that carries over a cutting torch.', look: ['female', '#e8c0a0', 'bun', '#a84a2a', { bodyType: 'broad' }], says: 'Rustwater cuts the Meridian for parts. She was our grandmothers’ ship. She can spare a few plates.', shop: 'rustwater-stores' },
  { id: 'scrapper-hallam', name: 'Dutch Hallam', title: 'Hallam’s Breakers', examine: 'Weighs scrap with his eyes and gets it right.', look: ['male', '#b88a68', 'shaved', '#2a2a2a', { bodyType: 'broad', augment: 'respirator' }], says: 'By weight, not by sentiment. Mind the heaps. Some of them rearrange themselves at night.', shop: 'hallam-breakers' },
  { id: 'cook-bello', name: 'Bello', title: 'Rust Kitchen', examine: 'Cooks anything that can be caught in the bilge.', look: ['male', '#5a3a28', 'buzz', '#1a1a1a'], says: 'Bilge broth. Don’t ask. Do eat.', shop: 'rust-kitchen' },
  { id: 'rigger-faye', name: 'Faye', title: 'Rustwater Works', examine: 'Climbs the Meridian’s ribs without a rope.', look: ['female', '#e0b898', 'braids', '#8a5a2a', { faceMark: 'freckles' }], says: 'The hull plate is better than anything Halcyon rolls. Two hundred years old and it still won’t rust through.' },
  { id: 'scav-rook', name: 'Rook', title: 'The Bunks', examine: 'Sleeps with one boot on.', look: ['male', '#6b3f28', 'mohawk', '#4f6f9e'], says: 'Tallow’s two hours sternward. Don’t go. If you go, don’t go at night. If you go at night, don’t answer roll call.' },
  { id: 'lt-osei', name: 'Lieutenant Osei', title: 'Tallow Forward Post', examine: 'Commands a forward post of one: herself.', look: ['female', '#5a3422', 'crop', '#1a1a1a', { augment: 'respirator' }], says: 'Site Tallow is overrun. The Directorate wants it back. I want to know who is wearing our uniforms in there.' },
  { id: 'cantor-ysolde', name: 'Cantor Ysolde', title: 'Pilgrims’ Rest', examine: 'Hums a note under every sentence, and the note never changes.', look: ['female', '#eac0a0', 'long', '#e8e2d4'], says: 'Welcome, pilgrim. The Choir sings to the reliquaries so they sleep. Vesper stopped singing. Now nothing sleeps.', shop: 'choir-stores' },
  { id: 'pilgrim-ruth', name: 'Pilgrim Ruth', title: 'The Choir House', examine: 'Walked the length of the Span barefoot. Twice.', look: ['female', '#c8a080', 'long', '#d0d0d0', { bodyType: 'slight', faceMark: 'freckles' }], says: 'The Quiet did not build the Span to live on. They built it to keep something in. Listen to the glass.' },
  { id: 'dr-nakamura', name: 'Dr Hiro Nakamura', title: 'Last of Site Vesper', examine: 'Walked out of Vesper on the night it went silent, and has not stopped shaking.', look: ['male', '#e0c8b0', 'swept', '#5a5a5a', { augment: 'neuralPort' }], says: 'We were containing the hymn. Then we were singing it. Then I was walking, and everyone else was holding the note.' },
  { id: 'glazier-oro', name: 'Oro', title: 'Glassworks', examine: 'Blows precursor glass into lamps and bells.', look: ['male', '#a86f4c', 'shaved', '#2a2a2a', { faceMark: 'burnMark' }], says: 'The glass remembers what shape it was. Coax it, don’t force it.' },
  { id: 'brother-ansel', name: 'Brother Ansel', title: 'Refectory', examine: 'Feeds pilgrims and asks nothing back.', look: ['male', '#d8b090', 'crop', '#8a8a8a'], says: 'Soup, bread, silence. The silence is the best part.', shop: 'choir-refectory' },
  { id: 'captain-halloran', name: 'Captain Halloran', title: 'Last Post', examine: 'Commands the last Directorate camp on the Span, and knows it.', look: ['female', '#d8b090', 'bun', '#3a2a20', { augment: 'ocularImplant' }], says: 'Last Post. Past here is Site Null, and past Null is the end of the Span. Nobody has come back from Null with the same file they went in with.', shop: 'last-post-stores' },
  { id: 'cook-perpetua', name: 'Perpetua', title: 'Last Post Mess', examine: 'Has fed every operative who ever reached the Spindle.', look: ['female', '#6a4a35', 'braids', '#1a1410'], says: 'Eat. You’ll want something warm in you when you go down.' },
  { id: 'medic-quill', name: 'Medic Quill', title: 'Aid Station', examine: 'Patches up what the Spindle sends back.', look: ['male', '#c8a080', 'crop', '#3a3a3a'], says: 'Coolant burns, mostly. And people who come back thinking they’re someone else.', shop: 'last-post-aid' },
  { id: 'engineer-saoirse', name: 'Engineer Saoirse', title: 'Field Workshop', examine: 'Keeps the camp’s generators alive with vault glass and swearing.', look: ['female', '#e0b898', 'undercut', '#a84a2a'], says: 'Vault glass from the Spindle rim. It cuts like nothing else, including you.' },
];

const say = (resident: Resident): DialogueDefinition => ({
  id: resident.dialogueId ?? resident.id,
  entries: [{ node: 'start' }],
  nodes: {
    start: {
      speaker: 'npc',
      text: resident.says,
      options: [...(resident.shop ? [{ text: 'Show me what you have.', effects: [{ type: 'openShop' as const, shopId: resident.shop }], next: null }] : []), { text: 'Goodbye.', next: null }],
    },
  },
});

export const SPAN_NPCS: readonly NpcDefinition[] = RESIDENTS.map((resident) => ({
  id: resident.id,
  name: resident.name,
  title: resident.title,
  examine: resident.examine,
  appearance: look(resident.look),
  gear: [],
  dialogueId: resident.dialogueId ?? resident.id,
  ...(resident.shop ? { shopId: resident.shop } : {}),
  wanderRadius: 0,
}));

export const SPAN_BASE_DIALOGUES: readonly DialogueDefinition[] = RESIDENTS.map(say);

type Listing = readonly [itemId: string, price: number];

const store = (id: string, name: string, greeting: string, listings: readonly Listing[], buys = true): ShopDefinition => ({
  id,
  name,
  greeting,
  listings: listings.map(([itemId, price]) => ({ itemId, price })),
  buysCategories: buys ? ['material', 'consumable', 'equipment'] : [],
  sellRate: buys ? 0.5 : 0,
});

const RATIONS: readonly Listing[] = [['rag-bundle', 4], ['smoked-eel', 8], ['greens-poultice', 14]];

export const SPAN_SHOPS: readonly ShopDefinition[] = [
  CONTRACTS_OFFICE,
  store('kestrel-stores', 'Commons Stores', 'Sign for it.', [...RATIONS, ['scrap-metal', 4], ['scrap-shock-baton', 30], ['scrap-coil-pistol', 40], ['scrap-psi-focus', 40]]),
  store('kestrel-armoury', 'Kestrel Armoury', 'Scrap issue. Earn the rest.', [['scrap-shock-baton', 30], ['scrap-monoblade', 45], ['scrap-power-hammer', 60], ['scrap-coil-pistol', 40], ['scrap-pulse-carbine', 60], ['scrap-psi-focus', 40], ['scrap-helmet', 40], ['scrap-carapace', 70], ['scav-hood', 30], ['static-crown', 40]]),
  { ...store('kestrel-mess', 'The Mess', 'Sit, eat.', [['noodle-bowl', 15], ['day-old-loaf', 2], ['basin-eel', 6]], false), listings: [{ itemId: 'noodle-bowl', price: 15 }, { itemId: 'day-old-loaf', price: 2 }, { itemId: 'basin-eel', price: 6 }, { itemId: 'smoked-eel', price: 8, afterQuest: 'names-in-the-bunks' }, { itemId: 'tide-broth', price: 110, afterQuest: 'names-in-the-bunks' }] },
  store('kestrel-parts', 'Fabrication Shed', 'Parts and plate.', [['scrap-plating', 10], ['scrap-metal', 4], ['trace-dust', 6]]),
  store('kestrel-clinic', 'Commons Clinic', 'Dressings and tinctures.', [['greens-poultice', 12], ['hand-leaf-cutting', 9], ['grip-tincture', 30]]),
  store('lines-store', 'Lines Store', 'Bread, string and gossip.', [['day-old-loaf', 2], ['rag-bundle', 3], ['basin-eel', 6]]),
  store('harrow-stores', 'Co-op Stores', 'Co-op prices, co-op rules.', [...RATIONS, ['tide-broth', 110]]),
  store('harrow-apothecary', 'Wynn’s Apothecary', 'Tinctures, salves and honest advice.', [['greens-poultice', 12], ['hand-leaf-cutting', 9], ['grip-tincture', 30], ['reed-tonic', 48], ['null-crown', 150]]),
  store('harrow-smithy', 'The Smithy', 'Ferro, rolled by hand.', [['ferro-plating', 30], ['ferro-shock-baton', 120], ['ferro-monoblade', 180], ['ferro-helmet', 150], ['runner-hood', 120], ['ferro-coil-pistol', 170]]),
  store('the-plough', 'The Plough', 'Sit. Eat. Listen.', [['noodle-bowl', 15], ['smoked-eel', 8], ['eel-pie', 40]], false),
  store('ostrowski-bakery', 'Ostrowski’s Bakery', 'Yesterday’s bread, today’s prices.', [['day-old-loaf', 2]], false),
  store('halcyon-stores', 'Juno’s', 'Everything has a price.', [...RATIONS, ['tide-broth', 110]]),
  store('static-bloom', 'The Static Bloom', 'What are you having?', [['noodle-bowl', 15], ['tide-broth', 110], ['culture-cutlet', 80]], false),
  store('halcyon-clinic', 'Sato Clinic', 'Fixes and fittings.', [['greens-poultice', 12], ['amber-tincture', 90], ['culture-salve', 110]]),
  store('night-market', 'Night Market', 'Make an offer.', [['plasteel-plating', 60], ['plasteel-shock-baton', 195], ['plasteel-helmet', 390], ['rigger-hood', 590], ['vigil-crown', 590], ['plasteel-coil-pistol', 390]]),
  store('plaza-arcade', 'Plaza Arcade', 'One credit a go.', [['noodle-bowl', 15]], false),
  store('ninth-noodles', 'Ninth Street Noodles', 'Slurp loudly.', [['noodle-bowl', 15], ['tide-broth', 110]], false),
  store('pawn-and-patch', 'Pawn & Patch', 'Everything has a price. Most things have two.', [['ferro-gauntlets', 85], ['runner-gloves', 85], ['null-conduits', 170], ['plasteel-carapace', 785], ['vigil-longcoat', 980], ['rigger-jacket', 980]]),
  store('glasshouse-bar', 'The Glasshouse', 'No screens.', [['noodle-bowl', 15], ['culture-cutlet', 80]], false),
  store('rustwater-stores', 'Mags’ Post', 'Rations and dressings, no credit.', [...RATIONS, ['tide-broth', 110]]),
  store('hallam-breakers', 'Hallam’s Breakers', 'By weight, not by sentiment.', [['scrap-metal', 3], ['heavy-scrap', 20], ['duralloy-plating', 120], ['duralloy-shock-baton', 365], ['duralloy-helmet', 730], ['slipway-hood', 1090], ['tidewarden-crown', 1090]]),
  store('rust-kitchen', 'Rust Kitchen', 'Bilge broth.', [['tide-broth', 110], ['smoked-eel', 8]], false),
  store('choir-stores', 'Pilgrims’ Rest', 'Take what you need, leave what you can.', [...RATIONS, ['tide-broth', 110]]),
  store('choir-refectory', 'Refectory', 'Soup, bread, silence.', [['tide-broth', 110], ['day-old-loaf', 2]], false),
  store('last-post-stores', 'Last Post HQ', 'Last stores on the Span.', [...RATIONS, ['tide-broth', 110]]),
  store('last-post-aid', 'Aid Station', 'Coolant gel and dressings.', [['greens-poultice', 12], ['red-salve', 220]]),
];

export const SPAN_REGIONS: readonly RegionDefinition[] = [
  { id: 'kestrel-reach', name: 'Kestrel Reach', hubDistrictId: 'kestrel-commons' },
  { id: 'harrow-terraces', name: 'Harrow Terraces', hubDistrictId: 'harrowgate' },
  { id: 'halcyon', name: 'Halcyon', hubDistrictId: 'neon-row' },
  { id: 'wreckfield', name: 'The Wreckfield', hubDistrictId: 'rustwater' },
  { id: 'glass-steppe', name: 'The Glass Steppe', hubDistrictId: 'the-choir' },
  { id: 'the-spindle', name: 'The Spindle', hubDistrictId: 'last-post' },
];
