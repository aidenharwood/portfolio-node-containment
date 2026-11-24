import type { DistrictLayout } from '../../packages/shared/src/world/layoutSchema.ts';
import type { LandMap } from '../../packages/shared/src/world/landPlan.ts';
import { cutSquare } from '../../packages/shared/src/world/landPlan.ts';
import { TILE_KINDS, type TileKindId } from '../../packages/shared/src/world/tiles.ts';
import type { WorldObjectDefinition } from '../../packages/shared/src/world/entities.ts';
import { CITY_KIT_OBJECTS } from '../../packages/shared/src/content/catalog/cityKit.ts';
import { LANDMARK_OBJECTS } from '../../packages/shared/src/content/catalog/landmarks.ts';
import { TRANSIT_OBJECTS } from '../../packages/shared/src/content/catalog/transit.ts';
import { WARD_SPOTS, WARD_STATIONS } from '../../packages/shared/src/content/catalog/nodes.ts';
import { SPAN_KIT } from '../../packages/shared/src/content/span/objects.ts';
import { SPAN_CREATURES } from '../../packages/shared/src/content/span/creatures.ts';
import { WILD_KIT, WILD_LANDMARK_SIZES } from '../../packages/shared/src/content/span/wilds.ts';
import { random } from './atlas.ts';
import type { BuildingSpec } from './places.ts';
import { recipeOf } from './recipes.ts';

type Wall = BuildingSpec['wall'];
type Kind = 'home' | 'office' | 'workshop' | 'canteen' | 'hall' | 'lab' | 'dorm' | 'holding' | 'shop' | 'clinic';

export interface WildPoi {
  readonly landmark: string;
  readonly building: { readonly id: string; readonly name: string; readonly kind: Kind; readonly npc?: string; readonly creatures?: readonly string[]; readonly nodes?: readonly string[] };
  readonly loot: 'cache' | 'secret';
  readonly nodes?: number;
}

interface RegionKit {
  readonly wall: Wall;
  readonly cache: string;
  readonly secret: string;
}

const REGION_KITS: Readonly<Record<string, RegionKit>> = {
  'kestrel-reach': { wall: 'wall', cache: 'kestrel-supply-crate', secret: 'kestrel-survey-locker' },
  'harrow-terraces': { wall: 'brick', cache: 'harrow-grain-bin', secret: 'harrow-tithe-box' },
  halcyon: { wall: 'cladding', cache: 'halcyon-courier-drop', secret: 'halcyon-lockbox' },
  wreckfield: { wall: 'cladding', cache: 'wreck-salvage-cage', secret: 'wreck-strongroom' },
  'glass-steppe': { wall: 'blockwork', cache: 'steppe-pilgrim-cache', secret: 'steppe-reliquary' },
  'the-spindle': { wall: 'wall', cache: 'spindle-dead-drop', secret: 'spindle-vault-drawer' },
};

export const NODES_BY_TIER: Readonly<Record<number, readonly string[]>> = {
  1: ['scrap-pile', 'faint-trace', 'allotment-bed', 'eel-trap'],
  2: ['cable-drum', 'scrap-pile', 'faint-trace', 'eel-trap'],
  3: ['dredge-spot', 'reed-bed', 'culvert-trace', 'cable-drum'],
  4: ['lock-gear', 'reed-bed', 'culvert-trace', 'dredge-spot'],
  5: ['lock-gear', 'dredge-spot', 'reed-bed', 'culvert-trace'],
  6: ['scrap-heap', 'culture-bench', 'amber-trace'],
  7: ['crusher-housing', 'scrap-heap', 'culture-bench', 'amber-trace'],
  8: ['wreck-plate', 'tide-weed', 'hull-trace', 'crusher-housing'],
  9: ['rivet-seam', 'wreck-plate', 'tide-weed', 'hull-trace'],
  10: ['directorate-salvage', 'red-moss', 'red-trace', 'sprung-cell-door'],
  11: ['sprung-cell-door', 'directorate-salvage', 'red-moss', 'red-trace'],
  12: ['vault-residue', 'vault-bloom', 'vault-trace', 'sprung-cell-door'],
  13: ['vault-residue', 'vault-bloom', 'vault-trace'],
};

const B = (id: string, name: string, kind: Kind, extra: { npc?: string; creatures?: readonly string[]; nodes?: readonly string[] } = {}): WildPoi['building'] => ({ id, name, kind, ...extra });
const P = (landmark: string, building: WildPoi['building'], loot: WildPoi['loot'] = 'cache', nodes?: number): WildPoi => ({ landmark, building, loot, ...(nodes ? { nodes } : {}) });

export const WILD_POIS: Readonly<Record<string, WildPoi>> = {
  'kestrel-lawns': P('lawn-clock', B('groundskeepers-lodge', 'Groundskeeper’s Lodge', 'home', { npc: 'groundskeeper-elm' })),
  'drill-field': P('drill-bell', B('drill-hall-bunks', 'Drill Hall Bunks', 'dorm')),
  'signal-hill': P('signal-relay', B('relay-hut', 'Relay Hut', 'workshop', { npc: 'signaller-penn' }), 'secret'),
  'kestrel-lake': P('lake-gauge', B('lake-boathouse', 'Boathouse', 'home')),
  'range-road': P('range-tower', B('range-office', 'Range Office', 'office')),
  'seam-wood': P('seam-pylon', B('seam-wood-station', 'Seam Wood Field Station', 'lab', { creatures: ['feral-hound'], nodes: ['faint-trace'] }), 'secret'),
  'rim-meadow': P('lake-gauge', B('shepherds-hut', 'Shepherd’s Hut', 'home')),
  'white-gate': P('range-tower', B('white-gate-post', 'Gate Post', 'office')),
  'parade-ground': P('drill-bell', B('parade-pavilion', 'Parade Pavilion', 'hall')),
  'lower-lawns': P('lawn-clock', B('gardeners-shed', 'Gardener’s Shed', 'home')),
  'firing-line': P('range-tower', B('range-hut', 'Range Hut', 'office'), 'secret'),
  'quiet-field': P('seam-pylon', B('quiet-field-kennels', 'Quiet Field Kennels', 'holding', { creatures: ['feral-hound', 'feral-hound'] })),
  lakeside: P('lake-gauge', B('lakeside-cottage', 'Lakeside Cottage', 'home')),
  'brim-shore': P('cove-lantern', B('net-loft', 'Net Loft', 'workshop')),
  'gull-point': P('gull-point-light', B('keepers-cottage', 'Keeper’s Cottage', 'home', { npc: 'keeper-ivo' }), 'secret'),
  'salt-dunes': P('cove-lantern', B('dune-watch-post', 'Dune Watch Post', 'office')),
  'lantern-cove': P('cove-lantern', B('boatmans-hut', 'Boatman’s Hut', 'home', { npc: 'boatman-jory' }), 'secret'),

  'top-terrace': P('harvest-gantry', B('old-seed-store', 'Old Seed Store', 'holding', { creatures: ['thornback', 'seed-mite'] }), 'secret'),
  'wheat-steps': P('terrace-windpump', B('wheat-steps-croft', 'Wheat Steps Croft', 'home')),
  'windpump-rise': P('terrace-windpump', B('rise-pump-house', 'Pump House', 'workshop', { npc: 'windwright-cole' })),
  'barley-steps': P('tithe-silo', B('harvest-bunkhouse', 'Harvest Bunkhouse', 'dorm')),
  'low-furrows': P('terrace-windpump', B('furrow-croft', 'Furrow Croft', 'home')),
  'seed-fields': P('harvest-gantry', B('seed-trial-station', 'Seed Trial Station', 'lab', { creatures: ['seed-mite'], nodes: ['reed-bed'] }), 'secret'),
  'tithe-barns': P('tithe-silo', B('tithe-office', 'Tithe Office', 'office', { npc: 'tithe-clerk-oswin' }), 'secret'),
  'drovers-way': P('drovers-bell', B('drovers-rest', 'Drovers’ Rest', 'canteen', { npc: 'drover-maud' })),
  'mill-steps': P('mill-wheel', B('terrace-mill', 'Terrace Mill', 'workshop', { npc: 'miller-bryn' })),
  'harrow-downs': P('drovers-bell', B('downs-cottage', 'Downs Cottage', 'home')),
  'bramble-steps': P('terrace-windpump', B('pickers-barracks', 'Pickers’ Barracks', 'dorm', { creatures: ['scarecoat', 'seed-mite'] })),
  haycut: P('tithe-silo', B('hayloft', 'Hayloft', 'home')),
  'spill-meadows': P('mill-wheel', B('spill-sluice-house', 'Sluice House', 'workshop')),
  'fallow-rows': P('harvest-gantry', B('fallow-byre', 'Fallow Byre', 'holding', { creatures: ['crop-magpie', 'crop-magpie'] })),
  'sluice-row': P('terrace-windpump', B('sluice-keepers-cottage', 'Sluice-keeper’s Cottage', 'home')),
  'orchard-edge': P('harvest-gantry', B('orchard-edge-checkpoint', 'Orchard Edge Checkpoint', 'office'), 'secret'),
  westcliff: P('cliff-beacon', B('cliff-hut', 'Cliff Hut', 'home'), 'secret'),
  'gleaners-bank': P('tithe-silo', B('gleaners-cottage', 'Gleaner’s Cottage', 'home', { npc: 'gleaner-sefa' })),

  'combine-blocks': P('combine-screen', B('combine-block-lobby', 'Combine Block Lobby', 'office', { creatures: ['ad-wraith', 'ad-wraith'] }), 'secret'),
  'the-overpass': P('strand-screen', B('overpass-kiosk', 'Overpass Kiosk', 'shop')),
  undertow: P('canal-crane', B('undertow-pump-lab', 'Undertow Pump Lab', 'lab', { creatures: ['alley-crawler'], nodes: ['culture-bench'] })),
  'canal-ward': P('canal-crane', B('lock-keepers-flat', 'Lock-keeper’s Flat', 'home', { npc: 'canal-keeper-ines' })),
  'the-stacks': P('stacks-spire', B('stacks-reading-room', 'Stacks Reading Room', 'lab', { npc: 'archivist-quell' }), 'secret', 2),
  'holo-gardens': P('park-clock', B('gardens-flat', 'Gardener’s Flat', 'home')),
  'sprawl-north': P('combine-screen', B('capsule-block', 'Capsule Block', 'dorm', { creatures: ['alley-crawler', 'glass-hound'] })),
  'sprawl-south': P('strand-screen', B('sprawl-noodle-bar', 'Sprawl Noodle Bar', 'canteen')),
  brightside: P('combine-screen', B('brightside-arcade', 'Brightside Arcade', 'shop')),
  'arcade-mile': P('market-mast', B('arcade-mile-kiosk', 'Arcade Mile Kiosk', 'shop')),
  'gallowglass-fence': P('combine-screen', B('fence-checkpoint', 'Fence Checkpoint', 'holding', { creatures: ['neon-moth', 'alley-crawler'] }), 'secret'),
  'signal-street': P('strand-screen', B('signal-street-repair', 'Signal Street Repair', 'workshop'), 'cache', 2),
  'night-market': P('market-mast', B('night-stalls', 'The Night Stalls', 'shop', { npc: 'fence-orla' }), 'secret'),
  'chrome-quay': P('canal-crane', B('chrome-quay-works', 'Chrome Quay Works', 'workshop')),
  'spire-heights': P('heights-spire', B('heights-lobby', 'Heights Lobby', 'office', { npc: 'doorman-vik' })),
  'low-arcology': P('park-clock', B('arcology-canteen', 'Arcology Canteen', 'canteen')),
  'data-docks': P('dock-gantry', B('courier-office', 'Courier Office', 'office', { npc: 'courier-dash' })),
  'lantern-ward': P('market-mast', B('lantern-ward-flat', 'Lantern Ward Flat', 'home')),
  'pylon-park': P('park-clock', B('pylon-park-lab', 'Park Kiosk Lab', 'lab', { creatures: ['neon-moth'], nodes: ['amber-trace'] }), 'secret'),
  'the-underpass': P('strand-screen', B('underpass-squat', 'Underpass Squat', 'home')),
  'halcyon-strand': P('dock-gantry', B('strand-flat', 'Strand Flat', 'home')),

  'hull-shadow': P('lifeboat-hull', B('hull-shadow-shack', 'Hull Shadow Shack', 'home')),
  'the-bow': P('meridian-bow', B('forecastle-camp', 'Forecastle Camp', 'dorm', { npc: 'bosun-kell' }), 'secret'),
  'scrap-sea': P('wreck-crane', B('scrap-sea-forge', 'Scrap Sea Forge', 'workshop')),
  'bilge-flats': P('lifeboat-hull', B('bilge-pumphouse', 'Bilge Pumphouse', 'holding', { creatures: ['bilge-wraith', 'rustling'] })),
  'keel-road': P('engine-headframe', B('keel-road-toll', 'Keel Road Toll', 'office')),
  'engine-field': P('engine-headframe', B('engine-test-bay', 'Engine Test Bay', 'lab', { creatures: ['rustling'], nodes: ['rivet-seam'] }), 'secret'),
  'rivet-dunes': P('wreck-crane', B('dune-shack', 'Dune Shack', 'home')),
  'slag-plain': P('boiler-chimney', B('slag-smelter', 'Slag Smelter', 'workshop')),
  'tallow-approach': P('cargo-gantry', B('tallow-outpost', 'Abandoned Outpost', 'office', { creatures: ['misprint', 'misprint'] }), 'secret'),
  'reactor-scar': P('reactor-stack', B('scar-watch-station', 'Scar Watch Station', 'lab', { npc: 'reactor-watch-ilse' }), 'secret'),
  'cargo-spill': P('cargo-gantry', B('tally-shed', 'Tally Shed', 'office', { npc: 'tally-clerk-pell' })),
  'hatch-fields': P('lifeboat-hull', B('hatch-bunker', 'Hatch Bunker', 'holding', { creatures: ['rustling', 'rustling'] })),
  'wreck-rim': P('wreck-crane', B('rim-shack', 'Rim Shack', 'home')),
  'gantry-flats': P('cargo-gantry', B('gantry-workshop', 'Gantry Workshop', 'workshop')),
  sternward: P('lifeboat-hull', B('stern-berths', 'Stern Berths', 'dorm', { creatures: ['rustling', 'rustling'] })),
  'crater-shore': P('crater-light', B('hermits-hut', 'Hermit’s Hut', 'home', { npc: 'shore-hermit-abe' }), 'secret', 2),
  'boiler-bay': P('boiler-chimney', B('boiler-house', 'Boiler House', 'workshop', { npc: 'boiler-scav-gus' })),
  'ballast-strand': P('crater-light', B('ballast-hold', 'Ballast Hold', 'holding', { creatures: ['misprint', 'bilge-wraith'] })),

  'hymn-road': P('pilgrim-beacon', B('hymn-road-waystation', 'Hymn Road Waystation', 'canteen', { npc: 'host-perrin' })),
  'vesper-approach': P('steppe-mast', B('vesper-checkpoint', 'Vesper Checkpoint', 'office', { creatures: ['prism-hound', 'prism-hound'] }), 'secret'),
  'prism-fields': P('glass-spire', B('prism-survey-lab', 'Prism Survey Lab', 'lab', { creatures: ['glass-stalker'], nodes: ['red-moss'] })),
  'silent-rise': P('vigil-bell', B('silent-chapel', 'Silent Chapel', 'hall')),
  'glass-rim': P('steppe-mast', B('rim-post', 'Rim Post', 'office')),
  'the-lens': P('glass-spire', B('lens-observatory', 'Lens Observatory', 'lab'), 'secret'),
  'choir-road': P('pilgrim-beacon', B('road-shrine-hut', 'Road Shrine Hut', 'home')),
  'refraction-moor': P('glass-spire', B('moor-cells', 'Moor Cells', 'holding', { creatures: ['glass-stalker', 'prism-hound'] })),
  'bell-heath': P('cantor-bell', B('heath-chapel', 'Heath Chapel', 'hall')),
  'pilgrim-steps': P('pilgrim-beacon', B('pilgrim-steps-rest', 'Pilgrim Steps Rest', 'canteen', { npc: 'pilgrim-warden-oda' })),
  'shining-downs': P('steppe-mast', B('downs-barracks', 'Downs Barracks', 'dorm', { creatures: ['prism-hound', 'glass-stalker'] })),
  'candle-flats': P('vigil-bell', B('vigil-house', 'Vigil House', 'hall', { npc: 'vigil-keeper-sol' }), 'secret', 2),
  'echo-plain': P('cantor-bell', B('echo-cells', 'Echo Cells', 'holding', { creatures: ['choir-echo', 'red-twin'] })),
  'glass-flats': P('glass-spire', B('glass-hut', 'Glass Hut', 'home')),
  'hollow-pylons': P('pylon-line', B('tuning-station', 'Tuning Station', 'lab', { npc: 'tuner-anwen' }), 'secret', 2),
  'vigil-fields': P('vigil-bell', B('vigil-dormitory', 'Vigil Dormitory', 'dorm')),
  'mirror-mere': P('glass-spire', B('mere-hut', 'Mere Hut', 'home', { npc: 'mere-watcher-tamsin' }), 'secret'),
  'antiphon-ridge': P('cantor-bell', B('ridge-post', 'Ridge Post', 'office')),
  'pylon-walk': P('tuning-pylon', B('pylon-cells', 'Pylon Cells', 'holding', { creatures: ['red-twin', 'glass-stalker'] })),
  'cantor-heath': P('cantor-bell', B('cantors-hall', 'Cantor’s Hall', 'hall')),
  'shard-moor': P('tuning-pylon', B('shard-lab', 'Shard Lab', 'lab', { creatures: ['red-twin'], nodes: ['red-trace'] }), 'secret'),
  'drop-edge': P('drop-light', B('drop-lookout', 'Drop Lookout', 'office', { npc: 'lookout-brask' })),
  'glass-strand': P('drop-light', B('strand-hut', 'Strand Hut', 'home')),
  'litany-fields': P('pilgrim-beacon', B('litany-kitchen', 'Litany Kitchen', 'canteen')),
  'pale-steppe': P('steppe-mast', B('pale-barracks', 'Pale Barracks', 'dorm', { creatures: ['choir-echo', 'choir-echo'] })),
  'shard-gate': P('tuning-pylon', B('shard-gate-post', 'Shard Gate Post', 'office', { creatures: ['glass-stalker', 'red-twin'] }), 'secret'),
  'steppe-foot': P('steppe-mast', B('steppe-foot-glassworks', 'Steppe Foot Glassworks', 'workshop')),
  'tuning-fields': P('tuning-pylon', B('tuning-field-lab', 'Tuning Field Lab', 'lab', { creatures: ['choir-echo'], nodes: ['red-moss'] })),

  'null-approach': P('spindle-rim-light', B('approach-post', 'Approach Post', 'office', { creatures: ['null-echo', 'null-echo'] })),
  'coolant-flats': P('coolant-tower', B('coolant-plant', 'Coolant Plant', 'lab', { creatures: ['cell-breaker'], nodes: ['vault-bloom'] })),
  'needle-foot': P('crown-needle', B('needle-cells', 'Needle Cells', 'holding', { creatures: ['null-stalker', 'null-echo'] }), 'secret'),
  'grate-fields': P('antenna-mast', B('grate-workshop', 'Grate Workshop', 'workshop')),
  'final-seam': P('spindle-rim-light', B('seam-watch', 'Seam Watch', 'office')),
  'spindle-rim': P('spindle-rim-light', B('rim-bunks', 'Rim Bunks', 'dorm', { npc: 'rim-scout-kaz' })),
  'plating-road': P('null-chimney', B('plating-cells', 'Plating Cells', 'holding', { creatures: ['cell-breaker', 'null-echo'] })),
  'the-terminus': P('terminus-headframe', B('terminus-control', 'Terminus Control', 'lab', { npc: 'terminus-tech-roan' }), 'secret'),
  'last-light': P('spindle-rim-light', B('last-light-hut', 'Last Light Hut', 'home')),
  'summit-road': P('antenna-mast', B('summit-toll', 'Summit Toll', 'office', { creatures: ['null-echo', 'null-echo'] })),
  'crown-plating': P('crown-needle', B('crown-lab', 'Crown Lab', 'lab', { creatures: ['null-echo'], nodes: ['vault-trace'] }), 'secret'),
  'coolant-stair': P('coolant-tower', B('stair-aid-post', 'Stair Aid Post', 'clinic', { npc: 'stair-medic-lin' })),
  'inverse-field': P('null-chimney', B('inverse-house', 'Inverse House', 'home'), 'secret'),
  'quiet-peaks': P('antenna-mast', B('peak-relay-shop', 'Peak Relay Shop', 'workshop')),
  'axle-flats': P('terminus-headframe', B('axle-bunks', 'Axle Bunks', 'dorm', { creatures: ['cell-breaker', 'cell-breaker'] })),
  'hush-plateau': P('crown-needle', B('hush-hall', 'Hush Hall', 'hall')),
  'spindle-crown': P('antenna-mast', B('crown-cells', 'Crown Cells', 'holding', { creatures: ['null-stalker', 'cell-breaker'] }), 'secret'),
  'white-noise': P('antenna-mast', B('noise-lab', 'Noise Lab', 'lab', { creatures: ['null-echo'], nodes: ['vault-residue'] })),
  'sealed-ground': P('sealed-door', B('sentry-post', 'Sentry Post', 'office', { npc: 'sentry-ashe' }), 'secret'),
};

export const WILD_PACKS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'antiphon-ridge': { 'glass-stalker': 'prism-hound' },
  'axle-flats': { 'null-echo': 'coolant-wraith' },
  'ballast-strand': { rustling: 'misprint', 'hull-knocker': 'ballast-crab' },
  'barley-steps': { 'seed-mite': 'windpump-wight', thornback: 'barn-crawler' },
  'bilge-flats': { 'hull-knocker': 'ballast-crab' },
  'boiler-bay': { 'hull-knocker': 'ballast-crab' },
  'bramble-steps': { 'crop-magpie': 'ditch-leech' },
  brightside: { 'neon-moth': 'holo-shill' },
  'brim-shore': { 'feral-hound': 'seam-boar', 'lawn-rat': 'courtyard-gull' },
  'candle-flats': { 'glass-stalker': 'shard-wisp' },
  'choir-road': { 'glass-stalker': 'shard-wisp' },
  'chrome-quay': { 'alley-crawler': 'vent-moth' },
  'combine-blocks': { 'alley-crawler': 'vent-moth' },
  'coolant-flats': { 'null-echo': 'clerk-of-null' },
  'coolant-stair': { 'cell-breaker': 'coolant-wraith' },
  'crater-shore': { rustling: 'misprint' },
  'crown-plating': { 'null-stalker': 'clerk-of-null' },
  'data-docks': { 'alley-crawler': 'holo-shill' },
  'drill-field': { 'lawn-rat': 'drill-sentry' },
  'drop-edge': { 'glass-stalker': 'prism-hound' },
  'echo-plain': { 'glass-stalker': 'prism-hound' },
  'final-seam': { 'cell-breaker': 'coolant-wraith' },
  'firing-line': { 'feral-hound': 'seam-boar', 'lawn-rat': 'drill-sentry' },
  'gallowglass-fence': { 'alley-crawler': 'holo-shill' },
  'gantry-flats': { 'hull-knocker': 'ballast-crab' },
  'glass-flats': { 'prism-hound': 'shard-wisp' },
  'glass-rim': { 'glass-stalker': 'shard-wisp' },
  'glass-strand': { 'choir-echo': 'shard-wisp' },
  'gull-point': { 'lawn-rat': 'courtyard-gull' },
  'halcyon-strand': { 'ad-wraith': 'vent-moth' },
  'hatch-fields': { 'hull-knocker': 'ballast-crab' },
  haycut: { 'furrow-eel': 'ditch-leech' },
  'hollow-pylons': { 'choir-echo': 'shard-wisp' },
  'holo-gardens': { 'ad-wraith': 'vent-moth' },
  'hush-plateau': { 'null-echo': 'clerk-of-null' },
  'keel-road': { rustling: 'misprint' },
  lakeside: { 'lawn-rat': 'courtyard-gull' },
  'lantern-cove': { 'lawn-rat': 'courtyard-gull' },
  'lantern-ward': { 'neon-moth': 'holo-shill' },
  'low-arcology': { 'neon-moth': 'holo-shill' },
  'low-furrows': { thornback: 'windpump-wight' },
  'mirror-mere': { 'glass-stalker': 'shard-wisp' },
  'needle-foot': { 'null-stalker': 'clerk-of-null' },
  'orchard-edge': { 'furrow-eel': 'ditch-leech' },
  'pale-steppe': { 'glass-stalker': 'prism-hound' },
  'parade-ground': { 'feral-hound': 'seam-boar' },
  'pilgrim-steps': { 'glass-stalker': 'shard-wisp' },
  'pylon-park': { 'neon-moth': 'holo-shill' },
  'quiet-peaks': { 'cell-breaker': 'coolant-wraith' },
  'range-road': { 'lawn-rat': 'drill-sentry' },
  'reactor-scar': { 'hull-knocker': 'ballast-crab' },
  'rim-meadow': { 'feral-hound': 'seam-boar' },
  'rivet-dunes': { rustling: 'ballast-crab' },
  'salt-dunes': { 'feral-hound': 'seam-boar' },
  'seam-wood': { 'feral-hound': 'seam-boar' },
  'shard-gate': { 'choir-echo': 'shard-wisp' },
  'shard-moor': { 'glass-stalker': 'shard-wisp' },
  'signal-street': { 'glass-hound': 'vent-moth' },
  'silent-rise': { 'prism-hound': 'shard-wisp' },
  'sluice-row': { 'crop-magpie': 'ditch-leech' },
  'spindle-crown': { 'null-stalker': 'clerk-of-null' },
  'spindle-rim': { 'cell-breaker': 'coolant-wraith' },
  'spire-heights': { 'alley-crawler': 'holo-shill' },
  'sprawl-north': { 'ad-wraith': 'vent-moth' },
  'steppe-foot': { 'choir-echo': 'shard-wisp' },
  'summit-road': { 'null-echo': 'clerk-of-null' },
  'tallow-approach': { rustling: 'misprint' },
  'the-bow': { 'hull-knocker': 'ballast-crab' },
  'the-lens': { 'prism-hound': 'shard-wisp' },
  'the-stacks': { 'alley-crawler': 'vent-moth' },
  'the-terminus': { 'null-echo': 'coolant-wraith' },
  'the-underpass': { 'glass-hound': 'vent-moth' },
  'tithe-barns': { thornback: 'barn-crawler' },
  'top-terrace': { 'seed-mite': 'windpump-wight' },
  undertow: { 'alley-crawler': 'holo-shill' },
  'vesper-approach': { 'glass-stalker': 'shard-wisp' },
  westcliff: { 'furrow-eel': 'ditch-leech' },
  'wheat-steps': { thornback: 'barn-crawler' },
  'white-gate': { 'lawn-rat': 'drill-sentry' },
  'white-noise': { 'cell-breaker': 'coolant-wraith' },
  'windpump-rise': { 'seed-mite': 'windpump-wight' },
  'wreck-rim': { rustling: 'ballast-crab' },
};

export interface WildOverride {
  readonly packFirst?: boolean;
  readonly topUp?: boolean;
  readonly at?: { readonly x: number; readonly y: number };
  readonly landmarkAt?: { readonly x: number; readonly y: number };
  readonly omit?: readonly string[];
  readonly start?: { readonly x: number; readonly y: number };
  readonly place?: Readonly<Record<string, { readonly x: number; readonly y: number }>>;
}

export const WILD_OVERRIDES: Readonly<Record<string, WildOverride>> = {
  'ballast-strand': { packFirst: true },
  'bramble-steps': { omit: ['bramble-steps-poi-reed-bed-1'] },
  'crater-shore': {
    packFirst: true,
    topUp: true,
    at: { x: 9, y: 48 },
    landmarkAt: { x: 23, y: 54 },
    omit: ['crater-shore-barricade-6', 'crater-shore-hull-knocker-2', 'crater-shore-bilge-wraith-0', 'crater-shore-misprint-1', 'crater-shore-bilge-wraith-9'],
    place: {
      'crater-shore-poi-bilge-wraith-0': { x: 22, y: 39 },
      'crater-shore-poi-rustling-1': { x: 23, y: 46 },
      'crater-shore-poi-hull-knocker-2': { x: 16, y: 40 },
    },
  },
  'halcyon-strand': { packFirst: true },
  'hull-shadow': { topUp: true },
  'hollow-pylons': {
    packFirst: true,
    topUp: true,
    at: { x: 21, y: 31 },
    landmarkAt: { x: 29, y: 48 },
    start: { x: 38, y: 40 },
    omit: ['hollow-pylons-ledge-milestone-2', 'hollow-pylons-shard-wisp-12'],
  },
  'signal-street': { packFirst: true },
  'sprawl-north': { packFirst: true },
  'the-stacks': { packFirst: true, topUp: true, omit: ['the-stacks-glass-hound-7'] },
};

export function buildingSpecOf(poi: WildPoi, region: string, x: number, y: number): BuildingSpec {
  const { id, name, kind, npc, creatures = [], nodes = [] } = poi.building;
  const wall = REGION_KITS[region]!.wall;
  const npcs = npc ? [npc] : [];
  const safe = creatures.length === 0 && nodes.length === 0;
  const base = { id, name, x, y, w: 12, h: 8, npcs, creatures, safe };
  switch (kind) {
    case 'home':
      return { ...base, w: 8, h: 6, floor: 'boards', wall: wall === 'wall' ? 'blockwork' : wall, theme: 'home', recipe: 'home' };
    case 'office':
      return { ...base, floor: 'carpet', wall, theme: 'office', recipe: 'office' };
    case 'workshop':
      return { ...base, floor: 'concrete', wall: wall === 'wall' ? 'blockwork' : wall, theme: 'works', recipe: 'workshop' };
    case 'canteen':
      return { ...base, floor: 'ceramic', wall, theme: 'canteen', recipe: 'canteen' };
    case 'hall':
      return { ...base, floor: 'terrazzo', wall: wall === 'wall' ? 'blockwork' : wall, theme: 'civic', recipe: 'hall' };
    case 'lab':
      return { ...base, floor: 'ceramic', wall: 'wall', theme: 'lab', recipe: 'lab', nodes };
    case 'dorm':
      return { ...base, floor: 'boards', wall: 'wall', theme: 'dormitory', recipe: 'dormitory' };
    case 'holding':
      return { ...base, floor: 'plating', wall: 'wall', theme: 'containment', recipe: 'containment', cell: 'secure-cell' };
    case 'shop':
      return { ...base, floor: 'boards', wall, theme: 'shop', recipe: 'shop', neon: region === 'halcyon' };
    case 'clinic':
      return { ...base, floor: 'ceramic', wall, theme: 'medical', recipe: 'clinic' };
  }
}

const OBJECTS = new Map<string, WorldObjectDefinition>([...CITY_KIT_OBJECTS, ...LANDMARK_OBJECTS, ...TRANSIT_OBJECTS, ...WARD_SPOTS, ...WARD_STATIONS, ...SPAN_KIT.objects, ...WILD_KIT.objects].map((object) => [object.id, object]));
const footprintOf = (objectId: string): { width: number; height: number } => OBJECTS.get(objectId)?.footprint ?? { width: 1, height: 1 };

const DECOR = new Set(['street-lamp', 'barricade', 'street-bench', 'street-tree', 'bollard', 'flood-mast', 'litter-bin', 'checkpoint-barrier', 'windpump', 'washing-line', 'utility-pole', 'burn-barrel', 'holo-billboard', 'food-stall', 'parked-car', 'steam-vent', 'magnet-crane', 'precursor-pylon', 'ledge-milestone', ...Object.values(NODES_BY_TIER).flat()]);
const NODE_LEVEL = new Map<string, number>([...WARD_SPOTS, ...CITY_KIT_OBJECTS].flatMap((object) => object.interactions.flatMap((interaction) => (interaction.gather ? [[object.id, interaction.gather.level] as const] : []))));
const CREATURE = new Map(SPAN_CREATURES.map((creature) => [creature.id, creature]));
const LARGE = new Set(['hull-knocker']);

const CREATURES_BY_TIER: Readonly<Record<number, readonly string[]>> = {
  1: ['lawn-rat', 'courtyard-gull'],
  2: ['feral-hound', 'grounds-mite', 'lawn-rat'],
  3: ['furrow-eel', 'crop-magpie'],
  4: ['seed-mite', 'scarecoat', 'crop-magpie'],
  5: ['thornback', 'seed-mite'],
  6: ['neon-moth', 'alley-crawler'],
  7: ['ad-wraith', 'glass-hound', 'alley-crawler'],
  8: ['rustling', 'hull-knocker'],
  9: ['bilge-wraith', 'rustling', 'hull-knocker'],
  10: ['prism-hound', 'glass-stalker'],
  11: ['choir-echo', 'red-twin', 'glass-stalker'],
  12: ['null-echo', 'cell-breaker'],
  13: ['null-stalker', 'null-echo', 'cell-breaker'],
};

const OPEN_GROUND: ReadonlySet<TileKindId> = new Set(['grass', 'dirt', 'soil', 'gravel', 'rust', 'paving', 'asphalt', 'concrete', 'plating', 'grate', 'terrazzo', 'hazard']);

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const grow = (rect: Rect, by: number): Rect => ({ x: rect.x - by, y: rect.y - by, width: rect.width + 2 * by, height: rect.height + 2 * by });
const inside = (rect: Rect, x: number, y: number): boolean => x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height;
const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

type Placement = DistrictLayout['objects'][number];

export function isDressed(layout: DistrictLayout): boolean {
  const poi = WILD_POIS[layout.id];
  return poi !== undefined && layout.steps.some((step) => step.kind === 'building' && step.id === poi.building.id);
}

export function dressWild(layout: DistrictLayout, land: LandMap): DistrictLayout {
  const poi = WILD_POIS[layout.id];
  if (!poi || !layout.square || isDressed(layout)) return layout;
  const id = layout.id;
  const size = layout.size.width;
  const base = cutSquare(land, layout.square, layout.square.split ? layout.region : undefined);
  const tileAt = (x: number, y: number): TileKindId => (x < 0 || y < 0 || x >= size || y >= size ? 'void' : base.tiles[y * size + x]!);
  const heightAt = (x: number, y: number): number => base.heights[y * size + x]!;
  const generated = (instance: string, kind: string): boolean => new RegExp('^' + id + '-' + kind + '-[0-9]+$').test(instance);
  const roomPoint = (at: Placement['at']): { x: number; y: number } | undefined => ('room' in at && at.room === 'ground' ? { x: at.dx, y: at.dy } : undefined);

  const fixed: Rect[] = [];
  for (const object of layout.objects) {
    const point = roomPoint(object.at);
    if (!point) continue;
    if (DECOR.has(object.object) && generated(object.id, object.object)) continue;
    const ring = object.object.endsWith('-leaf') ? 9 : 4;
    const foot = footprintOf(object.object);
    fixed.push(grow({ x: point.x, y: point.y, width: foot.width, height: foot.height }, ring));
  }
  for (const assembly of layout.assemblies) {
    const point = roomPoint(assembly.at);
    if (point) fixed.push(grow({ x: point.x, y: point.y, width: 4, height: 4 }, 4));
  }
  for (const creature of layout.creatures) {
    const point = roomPoint(creature.at);
    if (point && !generated(creature.id, creature.creature)) fixed.push(grow({ x: point.x, y: point.y, width: 2, height: 2 }, 3));
  }
  for (const [name, anchor] of Object.entries(layout.anchors)) {
    const point = roomPoint(anchor);
    if (point && name !== 'start') fixed.push(grow({ x: point.x, y: point.y, width: 1, height: 1 }, 3));
  }
  const zones: Rect[] = [];
  const open = (x: number, y: number): boolean => OPEN_GROUND.has(tileAt(x, y));
  const freeRect = (rect: Rect, margin = 2): boolean => {
    if (rect.x < margin || rect.y < margin || rect.x + rect.width > size - margin || rect.y + rect.height > size - margin) return false;
    for (let y = rect.y; y < rect.y + rect.height; y++) for (let x = rect.x; x < rect.x + rect.width; x++) if (!open(x, y)) return false;
    return !fixed.some((other) => overlaps(other, rect)) && !zones.some((other) => overlaps(other, rect));
  };
  const next = random(size * 7919 + layout.square.column * 613 + layout.square.row * 97 + 11);
  const order = (centre: { x: number; y: number }, reach: number): { x: number; y: number }[] => {
    const spots: { x: number; y: number; score: number }[] = [];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const distance = Math.hypot(x - centre.x, y - centre.y);
      if (distance <= reach) spots.push({ x, y, score: distance + next() * 6 });
    }
    return spots.sort((a, b) => a.score - b.score);
  };

  const override = WILD_OVERRIDES[id] ?? {};
  const kit = REGION_KITS[layout.region]!;
  let building: BuildingSpec | undefined;
  let level = 0;
  const probe = buildingSpecOf(poi, layout.region, 0, 0);
  const buildingSpots = order({ x: 30, y: 30 }, 40);
  for (const spot of override.at ? [override.at] : buildingSpots) {
    const rect = { x: spot.x, y: spot.y, width: probe.w, height: probe.h };
    const zone = { ...grow(rect, 3), height: rect.height + 9 };
    if (!freeRect(zone, 1)) continue;
    const ring = grow(rect, 2);
    let low = Infinity;
    let high = -Infinity;
    for (let y = ring.y; y < ring.y + ring.height; y++) for (let x = ring.x; x < ring.x + ring.width; x++) {
      low = Math.min(low, heightAt(x, y));
      high = Math.max(high, heightAt(x, y));
    }
    if (high - low > 2) continue;
    level = high - low === 2 ? low + 1 : low;
    building = buildingSpecOf(poi, layout.region, spot.x, spot.y);
    zones.push(zone);
    break;
  }
  if (!building) throw new Error(id + ': nowhere level enough to stand ' + poi.building.id);

  const landmarkPrefab = 'landmark-' + poi.landmark;
  const landmarkSize = poi.landmark === 'meridian-bow' ? { width: 6, height: 3 } : poi.landmark === 'pylon-line' ? { width: 9, height: 3 } : { width: WILD_LANDMARK_SIZES[poi.landmark] ?? 2, height: WILD_LANDMARK_SIZES[poi.landmark] ?? 2 };
  const centre = { x: building.x + building.w / 2, y: building.y + building.h / 2 };
  let landmarkAt: { x: number; y: number } | undefined;
  const landmarkSpots = order(centre, 40);
  for (const spot of override.landmarkAt ? [override.landmarkAt] : landmarkSpots) {
    if (Math.hypot(spot.x - centre.x, spot.y - centre.y) < 10) continue;
    const zone = grow({ x: spot.x, y: spot.y, ...landmarkSize }, 3);
    if (!freeRect(zone)) continue;
    landmarkAt = spot;
    zones.push(zone);
    break;
  }
  if (!landmarkAt) throw new Error(id + ': nowhere to stand ' + landmarkPrefab);

  const nodeSafe = (object: string, spot: { x: number; y: number }): boolean => {
    const nodeLevel = NODE_LEVEL.get(object);
    if (nodeLevel === undefined) return true;
    return layout.creatures.every((placement) => {
      const creature = CREATURE.get(placement.creature);
      const where = roomPoint(placement.at);
      if (!where || !creature?.aggressive || creature.level <= nodeLevel + 5) return true;
      const reach = creature.aggroRadius + creature.attack.range + creature.wanderRadius + 3;
      return Math.max(Math.abs(spot.x - where.x), Math.abs(spot.y - where.y)) > reach;
    });
  };
  const cleared = (point: { x: number; y: number } | undefined, width = 1, height = 1): boolean => point !== undefined && zones.some((zone) => overlaps(zone, { x: point.x, y: point.y, width, height }));
  const smalls: Placement[] = [];
  const putSmall = (object: string, near: { x: number; y: number }, reach: number, minimum: number): boolean => {
    const foot = footprintOf(object);
    for (const spot of order(near, reach)) {
      if (Math.hypot(spot.x - near.x, spot.y - near.y) < minimum) continue;
      const zone = grow({ x: spot.x, y: spot.y, ...foot }, 2);
      if (!freeRect(zone) || !nodeSafe(object, spot)) continue;
      zones.push(zone);
      smalls.push({ id: id + '-poi-' + object + '-' + smalls.length, object, at: { room: 'ground', dx: spot.x, dy: spot.y } });
      return true;
    }
    return false;
  };
  const loot = poi.loot === 'secret' ? kit.secret : kit.cache;
  if (!putSmall(loot, { x: landmarkAt.x + 1, y: landmarkAt.y + 1 }, 14, 4)) throw new Error(id + ': nowhere to hide ' + loot);
  const nodeKinds = NODES_BY_TIER[layout.tier] ?? [];
  const standing = layout.objects.filter((object) => NODE_LEVEL.has(object.object) && !cleared(roomPoint(object.at))).length;
  const wanted = Math.max(poi.nodes ?? 0, 2 - standing);
  for (let index = 0; index < wanted; index++) putSmall(nodeKinds[(index + layout.square.column) % nodeKinds.length]!, { x: size - centre.x, y: size - centre.y }, 46, 0);

  const objects = layout.objects.filter((object) => !(DECOR.has(object.object) && generated(object.id, object.object) && cleared(roomPoint(object.at), footprintOf(object.object).width, footprintOf(object.object).height)));
  const creatures = layout.creatures.filter((creature) => !(generated(creature.id, creature.creature) && cleared(roomPoint(creature.at), LARGE.has(creature.creature) ? 2 : 1, LARGE.has(creature.creature) ? 2 : 1)));
  const decals = layout.decals.filter((decal) => !cleared(roomPoint(decal.at), decal.width, decal.height));

  let walkable = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (TILE_KINDS[tileAt(x, y)].walkable) walkable++;
  const pool = CREATURES_BY_TIER[layout.tier] ?? [];
  const homes = creatures.flatMap((creature) => roomPoint(creature.at) ?? []);
  for (let added = 0; override.topUp === true && homes.length < Math.ceil((walkable * 3.6) / 1000) && added < 12 && pool.length > 0; added++) {
    const kind = pool[added % pool.length]!;
    const spot = order({ x: size / 2, y: size / 2 }, 46).find((candidate) => freeRect(grow({ x: candidate.x, y: candidate.y, width: 2, height: 2 }, 1)) && homes.every((home) => Math.hypot(home.x - candidate.x, home.y - candidate.y) >= 6));
    if (!spot) break;
    homes.push(spot);
    creatures.push({ id: id + '-poi-' + kind + '-' + added, creature: kind, at: { room: 'ground', dx: spot.x, dy: spot.y } });
  }
  const recipe = recipeOf(building);
  const room = building.id;
  const anchors = { ...layout.anchors };
  const start = roomPoint(anchors.start!);
  if (override.start) anchors.start = { room: 'ground', dx: override.start.x, dy: override.start.y };
  else if (!start || cleared(start)) anchors.start = { room: 'ground', dx: Math.floor(centre.x), dy: building.y + building.h + 3 };

  const steps: DistrictLayout['steps'] = [
    ...layout.steps,
    { kind: 'rise', rect: grow({ x: building.x, y: building.y, width: building.w, height: building.h }, 1), height: level },
    { kind: 'building', id: room, rect: { x: building.x, y: building.y, width: building.w, height: building.h }, floor: building.floor, wall: building.wall, doors: [{ side: 'south', width: 2 }] },
  ];
  const placedObjects: Placement[] = [
    ...objects,
    ...recipe.objects.map((object, index) => ({ id: room + '-' + object.object + '-' + index, object: object.object, at: { room, dx: object.dx, dy: object.dy }, ...(object.facing ? { facing: object.facing } : {}) })),
    ...smalls,
  ];
  const placedCreatures = [...creatures, ...recipe.creatures.map((creature, index) => ({ id: room + '-' + creature.creature + '-' + index, creature: creature.creature, at: { room, dx: creature.dx, dy: creature.dy } }))];
  const unsafeNode = (object: Placement): boolean => {
    const nodeLevel = NODE_LEVEL.get(object.object);
    if (nodeLevel === undefined || !object.id.includes('-poi-') && !object.id.startsWith(room + '-')) return false;
    const point = 'room' in object.at && object.at.room === 'ground' ? roomPoint(object.at)! : { x: building!.x + (object.at as { dx: number }).dx, y: building!.y + (object.at as { dy: number }).dy };
    return placedCreatures.some((placement) => {
      const creature = CREATURE.get(placement.creature);
      if (!creature?.aggressive || creature.level <= nodeLevel + 5) return false;
      const at = placement.at as { room: string; dx: number; dy: number };
      const where = at.room === 'ground' ? { x: at.dx, y: at.dy } : { x: building!.x + at.dx, y: building!.y + at.dy };
      const reach = creature.aggroRadius + creature.attack.range + creature.wanderRadius + 2;
      return Math.max(Math.abs(point.x - where.x), Math.abs(point.y - where.y)) <= reach;
    });
  };
  return {
    ...layout,
    steps,
    areas: [...layout.areas, { room, name: building.name, safe: building.safe }],
    anchors,
    objects: placedObjects.filter((object) => !unsafeNode(object)),
    npcs: [...layout.npcs, ...recipe.npcs.map((npc) => ({ id: room + '-' + npc.npc, npc: npc.npc, at: { room, dx: npc.dx, dy: npc.dy } }))],
    creatures: placedCreatures,
    decals,
    setPieces: [...layout.setPieces, { id: id + '-landmark', prefab: landmarkPrefab, at: { room: 'ground', dx: landmarkAt.x, dy: landmarkAt.y }, facing: 'south' }],
    dressing: { ...layout.dressing, [room]: { theme: building.theme, people: 0 } },
    furnish: { ...layout.furnish, landmarks: [...new Set([...(layout.furnish.landmarks ?? []), 'ground'])] },
  };
}

