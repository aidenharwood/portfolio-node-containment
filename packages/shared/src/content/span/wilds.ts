import type { CharacterAppearance } from '../../character/appearance.ts';
import type { DialogueDefinition } from '../../dialogue/dialogue.ts';
import type { ItemId } from '../../ids.ts';
import type { Condition } from '../../rules/conditions.ts';
import type { NpcDefinition, WorldObjectDefinition, WorldObjectModel } from '../../world/entities.ts';
import type { FurnishingKit } from '../furnishingKit.ts';
import { DRESSING_THEMES } from '../prefabs/types.ts';
import { landmark, LANDMARK_HOMES, prop } from '../catalog/landmarks.ts';

const tall = { mount: 'free', homes: LANDMARK_HOMES } as const;

type Mark = readonly [id: string, name: string, examine: string, model: WorldObjectModel, size: number, scale?: number, light?: string];

const MARKS: readonly Mark[] = [
  ['gull-point-light', 'Gull Point Light', 'A white Directorate lighthouse on the point. The lamp turns for ships that stopped coming two hundred years ago, and the keeper logs every sweep.', 'lighthouse', 3, 1, '#fff2c8'],
  ['cove-lantern', 'Cove Lantern', 'A storm lantern on a mast over the cove. Somebody keeps it lit, and nobody admits to it.', 'floodMast', 1, 1.4, '#ffc870'],
  ['signal-relay', 'Signal Hill Relay', 'The relay mast that carries Kestrel’s traffic over the Seam. Half its dishes point at Harrow and one points straight down.', 'floodMast', 1, 2.2, '#9fd0ff'],
  ['range-tower', 'Range Tower', 'The range officer’s tower over the firing line. A red flag means live fire. The flag has been red for a year.', 'headframe', 2],
  ['drill-bell', 'Drill Bell', 'A bell on a frame at the edge of the drill field, rung for the start of every exercise and the end of every recruit who did not make it.', 'bellTower', 2],
  ['lake-gauge', 'Lake Gauge', 'A painted gauge on a post at the water’s edge. The lake has risen a hand since the last entry in the log.', 'clockTower', 2],
  ['seam-pylon', 'Wood Pylon', 'A pylon of the Quiet standing among the trees, warm to the touch, humming the same note as the Seam.', 'precursorPylon', 1, 2.4, '#b8f0ff'],
  ['lawn-clock', 'Groundskeepers’ Clock', 'A clock on a post that tells the groundskeepers when to mow. It has been telling them for two years.', 'clockTower', 2],
  ['terrace-windpump', 'Terrace Windpump', 'A windpump lifting water up from the Spill to the next terrace. The co-op paints a number on every one, and this one is missing its number.', 'windpump', 2],
  ['tithe-silo', 'Tithe Silo', 'The silo the co-op fills for the Directorate’s tithe. Every year it is emptied, and every year nobody sees the lorry.', 'coolingTower', 3],
  ['mill-wheel', 'Mill Wheel', 'The great wheel of the terrace mill, turned by the Spill. It grinds whatever the co-op brings and some things it does not.', 'headframe', 2],
  ['drovers-bell', 'Drovers’ Bell', 'A bell on the drove road, rung to warn the next terrace that cattle are coming. There are no cattle any more; it still rings.', 'bellTower', 2],
  ['cliff-beacon', 'Westcliff Beacon', 'A fire beacon on the cliff, given a lamp and a lens. From the sea it is the last light of Harrow.', 'lighthouse', 3, 1, '#ffb35a'],
  ['harvest-gantry', 'Harvest Gantry', 'A loading gantry over the terrace, chains hanging, a sack still caught on the hook.', 'gantryCrane', 3],
  ['combine-screen', 'Combine Screen', 'A tower of holo screens selling AURELIAN to a block that cannot afford it.', 'holoBillboard', 2, 2, '#ff4fa8'],
  ['stacks-spire', 'The Stacks', 'The Combine’s data archive: a spire of cold racks behind glass, every floor blinking. It remembers everything Halcyon has bought.', 'directorateSpire', 3, 1.1, '#7fd8ff'],
  ['canal-crane', 'Canal Crane', 'A dockside crane over the canal, rusted solid with its hook in the water. The kids dare each other to climb it.', 'magnetCrane', 2],
  ['market-mast', 'Night Market Mast', 'A mast of stall signs in every colour Halcyon sells, lit from dusk to dusk.', 'holoBillboard', 2, 1.8, '#ffd84f'],
  ['heights-spire', 'Heights Tower', 'A residential tower with a lobby that still checks passes. The upper floors are dark.', 'directorateSpire', 3, 1, '#c79bff'],
  ['dock-gantry', 'Data Dock Gantry', 'The gantry that loaded data cores onto barges. It still lifts a crate every hour, empty.', 'gantryCrane', 3],
  ['park-clock', 'Park Clock', 'A municipal clock in a park of dead pylons. It runs backwards on the hour, for a minute, then catches up.', 'clockTower', 2, 1, '#4fe3ff'],
  ['strand-screen', 'Strand Screen', 'A sea-facing billboard showing Halcyon to a sea that is not watching.', 'holoBillboard', 2, 1.6, '#4fe3ff'],
  ['lifeboat-hull', 'Lifeboat Hull', 'One of the Meridian’s lifeboats, upside down in the scrap. Somebody has lived under it.', 'beachedHull', 3, 0.7],
  ['reactor-stack', 'Reactor Stack', 'The cooling stack of the Meridian’s second reactor, thrown a kilometre from the hull and still warm.', 'coolingTower', 3, 1, '#9fff6a'],
  ['boiler-chimney', 'Boiler Chimney', 'A chimney of riveted plate over the boiler bay, smoking in no wind.', 'chimney', 2, 2.2, '#ff7a2a'],
  ['wreck-crane', 'Wreck Crane', 'A scavenger crane, welded from three others. Its cab is a lifeboat with the bottom cut out.', 'magnetCrane', 2],
  ['cargo-gantry', 'Cargo Gantry', 'The gantry that pulled containers out of the Meridian’s holds. Half the containers are still on the hook.', 'gantryCrane', 3],
  ['engine-headframe', 'Engine Hoist', 'A headframe over a hole in the ground where one of the Meridian’s engines went in and did not come out.', 'headframe', 2, 1, '#ff6a3a'],
  ['crater-light', 'Crater Light', 'A scavenger lighthouse on the crater’s rim, lit with ship lamps, warning nobody off the water.', 'lighthouse', 3, 1, '#ffb35a'],
  ['vigil-bell', 'Vigil Bell', 'A bell of precursor glass hung for the vigil. It rings when nobody touches it.', 'glassBell', 2],
  ['pilgrim-beacon', 'Pilgrim Beacon', 'A beacon the pilgrims built so the road could be walked at night. It burns violet.', 'lighthouse', 3, 1, '#c79bff'],
  ['glass-spire', 'Grown Spire', 'A spire of glass that was not built. It was here last year at half the height.', 'directorateSpire', 3, 0.9, '#b48cff'],
  ['drop-light', 'Drop Light', 'A Directorate light over the edge of the Drop. Its beam goes down into the inlet and does not seem to reach the water.', 'lighthouse', 3, 1, '#7fd8ff'],
  ['cantor-bell', 'Cantor’s Bell', 'A small bell on a tall frame. The pilgrims say it was rung once, at the landing, and has been ringing since.', 'glassBell', 2],
  ['tuning-pylon', 'Tuning Pylon', 'A tall precursor pylon with a fork at the top. Struck, it gives the note the whole Steppe hums.', 'precursorPylon', 1, 2.8, '#b8f0ff'],
  ['steppe-mast', 'Steppe Searchlight', 'A Directorate searchlight left on the plateau, still sweeping, still logging.', 'floodMast', 1, 1.8, '#d8e8ff'],
  ['terminus-headframe', 'Terminus Winder', 'A precursor winding frame over a shaft that goes down past anything on the maps.', 'headframe', 2, 1.2, '#7fd8ff'],
  ['coolant-tower', 'Coolant Tower', 'A precursor cooling tower venting cold. Frost grows on the plating for twenty tiles round it.', 'coolingTower', 3, 1, '#7fd8ff'],
  ['spindle-rim-light', 'Rim Searchlight', 'A searchlight on the Spindle’s rim, pointed outward. Last Post says it was pointed inward when they found it.', 'floodMast', 1, 2, '#d8e8ff'],
  ['sealed-door', 'The Sealed Door', 'A door in the open air, standing in its own frame, sealed with Directorate tape. There is nothing behind it. You can walk round it.', 'secureCell', 2, 1.6, '#ff4f4f'],
  ['crown-needle', 'Little Needle', 'A smaller needle of dark glass, the Spindle’s twin in miniature, with the same light at the top.', 'precursorNeedle', 3, 0.9, '#7fd8ff'],
  ['antenna-mast', 'Antenna Mast', 'A precursor antenna as tall as a tower block, tuned to a station that answers only on the hour.', 'precursorPylon', 1, 3.2, '#9fd0ff'],
  ['holding-furnace', 'Holding Furnace', 'The furnace that burned Tallow Holding’s waste. Somebody has fed it since the Site was overrun, and the ash is still warm.', 'chimney', 2, 1.4, '#ff7a2a'],
  ['null-chimney', 'Null Chimney', 'A chimney of plating that breathes in.', 'chimney', 2, 2, '#7fd8ff'],
];

const markObject = ([id, name, examine, model, size, modelScale, color]: Mark): WorldObjectDefinition =>
  prop({
    id,
    name,
    examine,
    model,
    ...(modelScale === undefined || modelScale === 1 ? {} : { modelScale }),
    ...(size > 1 ? { footprint: { width: size, height: size } } : {}),
    ...(color ? { light: { radius: 6, color, intensity: 0.8 } } : {}),
    furnishing: tall,
  });

export const WILD_LANDMARKS: readonly WorldObjectDefinition[] = MARKS.map(markObject);

export const WILD_LANDMARK_SIZES: Readonly<Record<string, number>> = Object.fromEntries(MARKS.map(([id, , , , size]) => [id, size]));

type Loot = readonly (readonly [itemId: ItemId, count: number])[];

const stash = (id: string, name: string, examine: string, model: WorldObjectModel, found: string, loot: Loot, conditions: readonly Condition[] = [], failureText?: string): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model,
  blocksMovement: true,
  furnishing: { mount: 'free', homes: DRESSING_THEMES },
  interactions: [
    {
      verb: 'Search',
      oncePerCharacter: true,
      alreadyUsedText: 'You have already emptied it.',
      ...(conditions.length > 0 ? { conditions, failureText } : {}),
      effects: [...loot.map(([itemId, count]) => ({ type: 'giveItem' as const, itemId, count })), { type: 'notify' as const, text: found }],
    },
  ],
});

export const WILD_CACHES: readonly WorldObjectDefinition[] = [
  stash('kestrel-supply-crate', 'Supply Crate', 'A Directorate supply crate that fell off a lorry, or was pushed. The seal is broken.', 'hatch', 'You find spare issue the stores never missed.', [['scrap-metal', 6], ['rag-bundle', 3], ['greens-poultice', 2]]),
  stash('kestrel-survey-locker', 'Survey Locker', 'A sealed survey locker bolted to a post. The lock is a Directorate puzzle-latch.', 'secureCell', 'The latch gives. Inside: a surveyor’s kit, never signed out.', [['trace-dust', 10], ['optics-kit-1', 1], ['copper-wire', 6]], [{ type: 'skillLevel', skill: 'engineering', atLeast: 8 }], 'The puzzle-latch beats you. You need Engineering 8.'),
  stash('harrow-grain-bin', 'Grain Bin', 'A co-op grain bin on legs, kept dry and kept shut.', 'hatch', 'Under the grain somebody has hidden their winter stores.', [['silt-iron', 6], ['reed-bundle', 6], ['smoked-eel', 3]]),
  stash('harrow-tithe-box', 'Tithe Strongbox', 'An iron strongbox stamped with the Directorate tithe mark, rusted shut.', 'secureCell', 'You pry the box open. The tithe never left the terrace.', [['ferro-plating', 4], ['culvert-trace', 8], ['reed-tonic', 2]], [{ type: 'skillLevel', skill: 'salvage', atLeast: 18 }], 'The hinges are rusted solid. You need Salvage 18.'),
  stash('halcyon-courier-drop', 'Courier Drop', 'A courier drop box, the kind runners use when they do not want to meet anybody.', 'hatch', 'Somebody’s delivery never got collected.', [['plasteel-plating', 3], ['lab-culture', 6], ['culture-cutlet', 2]]),
  stash('halcyon-lockbox', 'Combine Lockbox', 'An Aurelian Combine lockbox with a keypad that still glows.', 'secureCell', 'You talk the keypad round. Combine property, now yours.', [['amber-trace', 8], ['synth-weave', 4], ['overdrive-kit-2', 1]], [{ type: 'skillLevel', skill: 'engineering', atLeast: 28 }], 'The keypad laughs at you. You need Engineering 28.'),
  stash('wreck-salvage-cage', 'Salvage Cage', 'A scavenger’s cage of plate and chain, padlocked with a bent nail.', 'hatch', 'You lift out what the scavenger was saving for later.', [['hull-plate', 6], ['tide-weed', 6], ['tide-broth', 2]]),
  stash('wreck-strongroom', 'Meridian Strongroom Locker', 'A locker from the Meridian’s strongroom, thrown clear in the crash and never opened.', 'secureCell', 'The locker opens with a sigh of two-hundred-year-old air.', [['duralloy-plating', 4], ['hull-trace', 8], ['tide-tincture', 2]], [{ type: 'skillLevel', skill: 'salvage', atLeast: 36 }], 'The locker is built to survive a crash, and you. You need Salvage 36.'),
  stash('steppe-pilgrim-cache', 'Pilgrim Cache', 'A cairn of glass with a hollow in it, where pilgrims leave what the next pilgrim might need.', 'hatch', 'You take what the last pilgrim left. Somebody will leave more.', [['directorate-salvage', 5], ['red-moss', 5], ['moss-pasty', 2]]),
  stash('steppe-reliquary', 'Reliquary', 'A precursor reliquary. It opens for those who understand what it is.', 'secureCell', 'The reliquary reads you and opens.', [['sinter-plating', 3], ['red-trace', 8], ['red-salve', 2]], [{ type: 'skillLevel', skill: 'research', atLeast: 45 }], 'The reliquary does not recognise you. You need Research 45.'),
  stash('spindle-dead-drop', 'Dead Drop', 'A Last Post dead drop in a plating seam, marked with a chalk cross.', 'hatch', 'Supplies for a patrol that did not come back for them.', [['vault-residue', 5], ['vault-bloom', 5], ['bloom-chowder', 2]]),
  stash('spindle-vault-drawer', 'Sealed Vault Drawer', 'A drawer in the plating, sealed with a containment lock older than the Directorate.', 'secureCell', 'The containment lock knows your hands and lets go.', [['vault-glass-plating', 3], ['vault-trace', 8], ['bloom-elixir', 2]], [{ type: 'skillLevel', skill: 'containment', atLeast: 52 }], 'The lock holds against you. You need Containment 52.'),
];

type Look = readonly [physique: CharacterAppearance['physique'], skin: string, hair: CharacterAppearance['hairStyle'], hairColor: string];

interface Wanderer {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly examine: string;
  readonly look: Look;
  readonly says: string;
}

const WANDERERS: readonly Wanderer[] = [
  { id: 'keeper-ivo', name: 'Ivo Brannagh', title: 'Keeper of Gull Point Light', examine: 'Salt in his beard and a logbook under his arm.', look: ['male', '#c8a088', 'long', '#d8d8d8'], says: 'Every sweep, logged. Two hundred years of nothing on the water, and then last spring a light answered mine. I logged that too.' },
  { id: 'signaller-penn', name: 'Signaller Penn', title: 'Signal Hill relay', examine: 'Headphones on, one ear always listening to something else.', look: ['male', '#e0c0a0', 'swept', '#6a4a2a'], says: 'The relay carries every word between Kestrel and the Seam. Some nights it carries words nobody sent.' },
  { id: 'boatman-jory', name: 'Jory Clew', title: 'Cove boatman', examine: 'Owns a boat. Will not say where he keeps it.', look: ['male', '#a8775a', 'buzz', '#3a2a1a'], says: 'The cove keeps its lantern lit. Who lights it? Not me. I just row.' },
  { id: 'groundskeeper-elm', name: 'Groundskeeper Elm', title: 'Kestrel Lawns', examine: 'Grass stains to the knees and a pair of shears on her belt.', look: ['female', '#e8c8a8', 'bun', '#8a6a3a'], says: 'I mow, the lawn grows back. I mow, the rats come back. I mow.' },
  { id: 'miller-bryn', name: 'Miller Bryn', title: 'Mill Steps', examine: 'Flour in every crease, and a laugh you can hear over the wheel.', look: ['male', '#c89a78', 'long', '#e8e0d0'], says: 'The wheel grinds what the Spill turns. Bring me reed and I will show you how the co-op feeds a terrace.' },
  { id: 'tithe-clerk-oswin', name: 'Tithe Clerk Oswin', title: 'The tithe barns', examine: 'Counts sacks. Counts them again. Writes down a third number.', look: ['male', '#e0c8b0', 'crop', '#5a5a5a'], says: 'The Directorate takes a tenth. I have the ledgers. The tenth goes in the silo, and the silo is empty every morning.' },
  { id: 'drover-maud', name: 'Maud Fallow', title: 'Keeper of the drovers’ rest', examine: 'Keeps a fire and a pot on it for whoever comes up the road.', look: ['female', '#6a4834', 'braids', '#1a1410'], says: 'Sit by the fire. The road up the terraces is long, and the scarecoats do not sleep.' },
  { id: 'windwright-cole', name: 'Windwright Cole', title: 'Windpump Rise', examine: 'A spanner in each pocket and a third behind one ear.', look: ['male', '#8a5a3a', 'undercut', '#1a1a1a'], says: 'Every pump on the rise lifts water a terrace higher. Break one and the terrace above it dies by harvest.' },
  { id: 'gleaner-sefa', name: 'Sefa Ruddock', title: 'Gleaner', examine: 'Walks the stubble after every harvest, bag over her shoulder.', look: ['female', '#a8775a', 'long', '#3a2a1a'], says: 'What the co-op leaves, I take. What I leave, the magpies take. What the magpies leave is not grain.' },
  { id: 'fence-orla', name: 'Orla Vey', title: 'Night Market stall-keeper', examine: 'Everything on her stall is for sale except the stall and the knife.', look: ['female', '#5a3422', 'undercut', '#ff4fa8'], says: 'The real night market moved here when Neon Row went respectable. Browse. Do not touch.' },
  { id: 'archivist-quell', name: 'Archivist Quell', title: 'The Stacks', examine: 'Pale from never leaving the racks, with a data loupe screwed into one eye.', look: ['male', '#e8d8c8', 'bun', '#3a3a3a'], says: 'The Stacks remember every purchase anyone in Halcyon has ever made. Including the ones you have not made yet.' },
  { id: 'courier-dash', name: 'Dash Adeyemi', title: 'Data Docks courier', examine: 'Running shoes, a satchel, and the twitch of somebody always late.', look: ['male', '#5a3a28', 'crop', '#1a1a1a'], says: 'Everything in Halcyon moves through the docks. I carry what will not go by wire.' },
  { id: 'canal-keeper-ines', name: 'Ines Marlow', title: 'Canal keeper', examine: 'Rubber boots, a hook pole, and a list of what she has pulled out of the canal.', look: ['female', '#c8a088', 'swept', '#8a8a8a'], says: 'Two bodies, one billboard, nine hundred screens. And a moth the size of a door, which I put back.' },
  { id: 'doorman-vik', name: 'Doorman Vik', title: 'Heights Tower lobby', examine: 'A doorman for a tower nobody lives in. He still checks passes.', look: ['male', '#a8775a', 'buzz', '#3a2a1a'], says: 'Residents only, upstairs. The residents have not come down in a year. I am told they are fine.' },
  { id: 'bosun-kell', name: 'Bosun Kell', title: 'The Bow camp', examine: 'Wears a Meridian bosun’s whistle she found in the wreck. She blows it every morning.', look: ['female', '#8a5a3a', 'braids', '#d8d2c4'], says: 'Two hundred years ago this was the front of the finest ship ever built. Now it is the front of my camp.' },
  { id: 'reactor-watch-ilse', name: 'Ilse Varga', title: 'Reactor Scar watch', examine: 'A dosimeter on her lapel ticks faster when she looks at you.', look: ['female', '#e0c0a0', 'crop', '#d8d8d8'], says: 'The scar is warm. The reactor is a kilometre away and two hundred years dead. Do not stand still on it.' },
  { id: 'boiler-scav-gus', name: 'Gus Ironmonger', title: 'Boiler Bay scavenger', examine: 'Built like a boiler, and about as warm.', look: ['male', '#c89a78', 'long', '#5a3a28'], says: 'The boilers still hold pressure. I do not know what they burn. I just bleed them for plate.' },
  { id: 'tally-clerk-pell', name: 'Tally Clerk Pell', title: 'Cargo Spill', examine: 'Holds a Meridian manifest and ticks off every container she finds.', look: ['female', '#6a4834', 'bun', '#1a1410'], says: 'Container four-nine-one: seed stock. Container four-nine-two: seed stock. Four-nine-three: something that knocked back.' },
  { id: 'shore-hermit-abe', name: 'Abe of the Shore', title: 'Crater Shore hermit', examine: 'Has lived by the crater lake so long the rustlings ignore him.', look: ['male', '#8a5a3a', 'long', '#e8e0d0'], says: 'The lake was not here before the Meridian came down. Now it is deeper than the crater. Think on that.' },
  { id: 'pilgrim-warden-oda', name: 'Warden Oda', title: 'Pilgrim Steps waystation', examine: 'A pilgrim who stopped walking to look after those who have not.', look: ['female', '#a8775a', 'long', '#d8d8d8'], says: 'Rest. Eat. The Choir is a day up the road, and the road walks back at night.' },
  { id: 'vigil-keeper-sol', name: 'Vigil-keeper Sol', title: 'Candle Flats', examine: 'Keeps the vigil candles lit with a taper as long as his arm.', look: ['male', '#5a3422', 'buzz', '#1a1a1a'], says: 'One candle for every pilgrim who did not reach the Choir. The flats are full. We light more every week.' },
  { id: 'tuner-anwen', name: 'Tuner Anwen', title: 'Hollow Pylons', examine: 'Carries a fork of precursor glass and strikes it against every pylon she passes.', look: ['female', '#e0c8b0', 'swept', '#c79bff'], says: 'Each pylon sings one note. Together they almost make a word. I have been listening for four years.' },
  { id: 'mere-watcher-tamsin', name: 'Tamsin Hale', title: 'Mirror Mere watcher', examine: 'Watches the mere. The mere watches back.', look: ['female', '#c8a088', 'long', '#3a2a1a'], says: 'Look into the mere and you see yourself, a heartbeat late. Some days, a heartbeat early.' },
  { id: 'lookout-brask', name: 'Lookout Brask', title: 'Drop Edge lookout', examine: 'A Directorate lookout with binoculars he does not lower.', look: ['male', '#8a5a3a', 'crop', '#5a5a5a'], says: 'Nothing crosses the Drop. I watch to make sure nothing keeps not crossing it.' },
  { id: 'host-perrin', name: 'Host Perrin', title: 'Hymn Road waystation', examine: 'Runs the waystation on the Hymn Road, singing the whole time.', look: ['male', '#e0b898', 'swept', '#a84a2a'], says: 'Every pilgrim sings on the Hymn Road. Those who stop singing, we feed until they start again.' },
  { id: 'terminus-tech-roan', name: 'Technician Roan', title: 'The Terminus', examine: 'A Last Post technician who has taken apart a precursor console and cannot put it back.', look: ['male', '#c8a088', 'undercut', '#1a1a1a'], says: 'This was a control room. It still controls something. I would very much like to know what.' },
  { id: 'stair-medic-lin', name: 'Medic Lin', title: 'Coolant Stair aid post', examine: 'Treats frostbite in a place that is never cold to the touch.', look: ['female', '#e8c8a8', 'bun', '#3a2a1a'], says: 'The coolant does not freeze you. It makes you forget you are warm. Keep moving.' },
  { id: 'sentry-ashe', name: 'Sentry Ashe', title: 'Sealed Ground', examine: 'Stands guard over a door that leads nowhere.', look: ['female', '#5a3a28', 'crop', '#1a1a1a'], says: 'Orders are to keep the door sealed. Nobody has said from which side.' },
  { id: 'orderly-nasser', name: 'Orderly Nasser', title: 'Tallow Holding, B1', examine: 'The last orderly in Tallow Holding, still in whites gone grey, still doing rounds.', look: ['male', '#8a5a3a', 'crop', '#1a1a1a'], says: 'The Cohort came up out of these cells and walked onto the parade ground. Most of them. Some are still down here, and they are still printing.' },
  { id: 'rim-scout-kaz', name: 'Scout Kaz', title: 'Spindle Rim', examine: 'A Last Post scout with frost on her eyebrows and a map with too many edges.', look: ['female', '#a8775a', 'braids', '#1a1410'], says: 'The rim goes round the summit. I have walked it nine times and it was a different length every time.' },
];

const appearance = ([physique, skinTone, hairStyle, hairColor]: Look): CharacterAppearance => ({
  physique,
  bodyType: 'average',
  height: 1,
  skinTone,
  hairStyle,
  hairColor,
  eyeColor: '#3a2a1a',
  faceMark: 'none',
  augment: 'none',
});

export const WILD_NPCS: readonly NpcDefinition[] = WANDERERS.map((wanderer) => ({
  id: wanderer.id,
  name: wanderer.name,
  title: wanderer.title,
  examine: wanderer.examine,
  appearance: appearance(wanderer.look),
  gear: [],
  dialogueId: wanderer.id,
  wanderRadius: 0,
}));

export const WILD_DIALOGUES: readonly DialogueDefinition[] = WANDERERS.map((wanderer) => ({
  id: wanderer.id,
  entries: [{ node: 'start' }],
  nodes: { start: { speaker: 'npc', text: wanderer.says, options: [{ text: 'Goodbye.', next: null }] } },
}));

export const WILD_KIT: FurnishingKit = {
  objects: [...WILD_LANDMARKS, ...WILD_CACHES],
  prefabs: WILD_LANDMARKS.map((object) => landmark(object.id)),
  signatures: {},
};
