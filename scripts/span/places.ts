import type { TileKindId } from '../../packages/shared/src/world/tiles.ts';

export type RecipeName = 'outpost' | 'shop' | 'canteen' | 'workshop' | 'clinic' | 'dormitory' | 'containment' | 'headhouse' | 'lab' | 'office' | 'home' | 'hall' | 'yard';

export interface BuildingSpec {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly floor: TileKindId;
  readonly wall: 'wall' | 'brick' | 'blockwork' | 'cladding';
  readonly edge?: 'barrier' | 'fence' | 'rock' | 'trees';
  readonly door?: 'south' | 'north';
  readonly theme: 'civic' | 'office' | 'canteen' | 'dormitory' | 'industrial' | 'freight' | 'medical' | 'lab' | 'garden' | 'wet' | 'chapel' | 'ward' | 'camp' | 'works' | 'transit' | 'street' | 'shop' | 'home' | 'containment';
  readonly also?: readonly ('shop' | 'office' | 'canteen' | 'civic')[];
  readonly safe: boolean;
  readonly multiCombat?: boolean;
  readonly recipe: RecipeName;
  readonly npcs?: readonly string[];
  readonly creatures?: readonly string[];
  readonly nodes?: readonly string[];
  readonly lift?: string;
  readonly elite?: string;
  readonly mail?: 'market-mailbox' | 'exchange-post';
  readonly anchor?: string;
  readonly neon?: boolean;
  readonly cell?: 'containment-cell' | 'secure-cell';
}

export interface PlaceSquare {
  readonly id: string;
  readonly name: string;
  readonly subtitle: string;
  readonly groundSafe: boolean;
  readonly condition?: 'pristine' | 'worn' | 'breached' | 'overgrown' | 'flooded' | 'alien' | 'uncanny';
  readonly buildings: readonly BuildingSpec[];
  readonly landmark: { readonly prefab: string; readonly at: { readonly x: number; readonly y: number } };
  readonly start?: { readonly x: number; readonly y: number };
  readonly anchors?: Readonly<Record<string, { readonly x: number; readonly y: number }>>;
  readonly creatures?: readonly string[];
  readonly wildlife?: boolean;
}

type Slot = readonly [column: 0 | 1 | 2, row: 0 | 1];

const at = ([column, row]: Slot, top = 10, second = 31) => ({ x: 9 + 16 * column, y: row === 0 ? top : second });

type Kind = Omit<BuildingSpec, 'x' | 'y' | 'w' | 'h' | 'id' | 'name'> & { readonly w?: number; readonly h?: number };

const b = (id: string, name: string, slot: Slot, kind: Kind, top?: number, second?: number): BuildingSpec => ({ id, name, ...at(slot, top, second), w: kind.w ?? 12, h: kind.h ?? 8, ...kind });

const outpost = (npc: string, mail: 'market-mailbox' | 'exchange-post' = 'market-mailbox', wall: BuildingSpec['wall'] = 'wall'): Kind => ({ floor: 'boards', wall, theme: 'office', also: ['shop'], safe: true, recipe: 'outpost', npcs: [npc], mail });
const shop = (npcs: readonly string[], wall: BuildingSpec['wall'] = 'blockwork', neon = false): Kind => ({ floor: 'boards', wall, theme: 'shop', safe: true, recipe: 'shop', npcs, neon });
const canteen = (npcs: readonly string[], wall: BuildingSpec['wall'] = 'blockwork', neon = false): Kind => ({ floor: 'ceramic', wall, theme: 'canteen', safe: true, recipe: 'canteen', npcs, neon });
const workshop = (npcs: readonly string[], wall: BuildingSpec['wall'] = 'blockwork'): Kind => ({ floor: 'concrete', wall, theme: 'works', safe: true, recipe: 'workshop', npcs });
const clinic = (npcs: readonly string[], wall: BuildingSpec['wall'] = 'wall'): Kind => ({ floor: 'ceramic', wall, theme: 'medical', safe: true, recipe: 'clinic', npcs });
const dorm = (npcs: readonly string[], safe = true, creatures: readonly string[] = []): Kind => ({ floor: 'boards', wall: 'wall', theme: 'dormitory', safe, recipe: 'dormitory', npcs, creatures });
const holding = (npcs: readonly string[], safe = true, creatures: readonly string[] = [], cell: BuildingSpec['cell'] = 'containment-cell'): Kind => ({ floor: 'plating', wall: 'wall', theme: 'containment', safe, recipe: 'containment', npcs, creatures, cell });
const headhouse = (lift: string, npcs: readonly string[] = [], safe = true, creatures: readonly string[] = [], anchor?: string): Kind => ({ floor: 'plating', wall: 'wall', theme: 'transit', safe, recipe: 'headhouse', npcs, lift, creatures, ...(anchor ? { anchor } : {}) });
const office = (npcs: readonly string[], safe = true, creatures: readonly string[] = [], wall: BuildingSpec['wall'] = 'wall'): Kind => ({ floor: 'carpet', wall, theme: 'office', safe, recipe: 'office', npcs, creatures });
const lab = (npcs: readonly string[], safe = true, nodes: readonly string[] = [], creatures: readonly string[] = []): Kind => ({ floor: 'ceramic', wall: 'wall', theme: 'lab', safe, recipe: 'lab', npcs, nodes, creatures });
const home = (npcs: readonly string[] = [], wall: BuildingSpec['wall'] = 'blockwork'): Kind => ({ floor: 'boards', wall, theme: 'home', safe: true, recipe: 'home', npcs, w: 8, h: 6 });
const hall = (npcs: readonly string[], wall: BuildingSpec['wall'] = 'blockwork'): Kind => ({ floor: 'terrazzo', wall, theme: 'civic', safe: true, recipe: 'hall', npcs });
const yard = (id: string, name: string, x: number, y: number, w: number, h: number, creatures: readonly string[], options: Partial<BuildingSpec> = {}): BuildingSpec => ({ id, name, x, y, w, h, floor: 'gravel', wall: 'wall', edge: 'fence', door: 'north', theme: 'street', safe: false, recipe: 'yard', creatures, ...options });

export const PLACE_SPECS: Readonly<Record<string, PlaceSquare>> = {
  'site-kestrel': {
    id: 'site-kestrel',
    name: 'Site Kestrel',
    subtitle: 'Kestrel Reach · SC-V · Secure',
    groundSafe: true,
    start: { x: 31, y: 23 },
    buildings: [
      b('kestrel-headhouse', 'Kestrel Headhouse', [0, 0], headhouse('kestrel-lift-down', ['lift-warden-ama'])),
      b('intake-office', 'Intake Office', [1, 0], office(['sergeant-vale'])),
      b('holding-block-k', 'Holding Block K', [2, 0], holding(['warden-achebe'])),
      b('kestrel-records', 'Kestrel Records', [0, 1], office(['registrar-lune'])),
      b('kestrel-armoury', 'Armoury', [1, 1], shop(['armourer-kade'], 'wall')),
      yard('training-yard', 'Training Yard', 9, 43, 44, 12, ['training-drone', 'training-drone', 'training-drone', 'sim-wisp', 'sim-wisp', 'sim-wisp']),
    ],
    landmark: { prefab: 'landmark-kestrel-headframe', at: { x: 45, y: 33 } },
    wildlife: false,
  },
  'kestrel-commons': {
    id: 'kestrel-commons',
    name: 'Kestrel Commons',
    subtitle: 'Kestrel Reach · the Directorate town',
    groundSafe: true,
    buildings: [
      b('commons-stores', 'Commons Stores', [0, 0], outpost('quartermaster-okonkwo', 'exchange-post')),
      b('the-mess', 'The Mess', [1, 0], canteen(['cook-tavi'], 'wall')),
      b('fabrication-shed', 'Fabrication Shed', [2, 0], workshop(['technician-oduya'])),
      b('commons-clinic', 'Commons Clinic', [0, 1], clinic(['medic-sauer'])),
      b('barracks-41', 'Barracks 41', [1, 1], dorm(['recruit-dace'])),
    ],
    landmark: { prefab: 'landmark-commons-clock', at: { x: 45, y: 33 } },
  },
  'recruit-lines': {
    id: 'recruit-lines',
    name: 'The Recruit Lines',
    subtitle: 'Kestrel Reach · married quarters and the chapel',
    groundSafe: true,
    buildings: [
      b('cohort-hall', 'Cohort Hall', [0, 0], hall(['chaplain-marr'])),
      b('lines-cottage-1', 'Number Four', [1, 0], home(['widow-hale'])),
      b('lines-cottage-2', 'Number Nine', [2, 0], home()),
      b('lines-store', 'Lines Store', [0, 1], shop(['storekeeper-pim'])),
      b('lines-cottage-3', 'Number Twelve', [1, 1], home(['old-man-tobin'])),
    ],
    landmark: { prefab: 'landmark-cohort-bell', at: { x: 45, y: 33 } },
  },
  'harrowgate': {
    id: 'harrowgate',
    name: 'Harrowgate',
    subtitle: 'Harrow Terraces · the co-op town',
    groundSafe: true,
    buildings: [
      b('coop-stores', 'Co-op Stores', [0, 0], outpost('steward-tull', 'market-mailbox', 'brick')),
      b('harrow-apothecary', 'Wynn’s Dispensary', [1, 0], shop(['apothecary-wynn'], 'brick')),
      b('harrow-smithy', 'Co-op Fab Shop', [2, 0], workshop(['smith-keane'], 'brick')),
      b('the-plough', 'The Plough', [0, 1], canteen(['publican-dorrit'], 'brick')),
      b('coop-hall', 'Co-op Hall', [1, 1], hall(['reeve-halvard'], 'brick')),
    ],
    landmark: { prefab: 'landmark-harrow-windpump', at: { x: 45, y: 33 } },
  },
  'harrow-lanes': {
    id: 'harrow-lanes',
    name: 'Harrow Lanes',
    subtitle: 'Harrow Terraces · habs and the bakery',
    groundSafe: true,
    buildings: [
      b('harrow-bakery', 'Ostrowski’s Protein Bakery', [0, 0], shop(['baker-ostrowski'], 'brick')),
      b('lanes-cottage-1', 'Furrow Hab', [1, 0], home(['farmer-greaves'], 'brick')),
      b('lanes-cottage-2', 'Sluice Hab', [2, 0], home(['farmer-adaeze'], 'brick')),
      b('lanes-cottage-3', 'Mill Hab', [0, 1], home([], 'brick')),
      b('lanes-clinic', 'Lanes Surgery', [1, 1], clinic(['doctor-amsel'], 'brick')),
    ],
    landmark: { prefab: 'landmark-grain-silo', at: { x: 44, y: 32 } },
  },
  'site-orchard': {
    id: 'site-orchard',
    name: 'Site Orchard',
    subtitle: 'Harrow Terraces · SC-II · Strained',
    groundSafe: false,
    condition: 'overgrown',
    buildings: [
      b('orchard-gatehouse', 'Orchard Gatehouse', [0, 1], office(['corporal-fenn']), 10, 31),
      b('orchard-lab', 'Orchard Laboratory', [1, 1], lab(['dr-kessel']), 10, 31),
      b('seed-vault', 'Seed Vault', [2, 1], { ...holding([], false, ['scarecoat', 'seed-mite']), multiCombat: true, elite: 'thornback-matriarch' }, 10, 31),
      yard('orchard-rows', 'The Mother Rows', 9, 43, 30, 13, ['orchard-keeper', 'seed-mite'], { floor: 'soil', multiCombat: true }),
    ],
    landmark: { prefab: 'landmark-orchard-gantry', at: { x: 45, y: 46 } },
    creatures: ['scarecoat', 'seed-mite'],
  },
  'neon-row': {
    id: 'neon-row',
    name: 'Neon Row',
    subtitle: 'Halcyon · the strip under the Spire',
    groundSafe: true,
    condition: 'worn',
    buildings: [
      b('neon-row-post', 'Juno’s', [0, 0], outpost('fixer-juno', 'market-mailbox', 'cladding')),
      b('static-bloom', 'The Static Bloom', [1, 0], canteen(['bartender-kit'], 'cladding', true)),
      b('sato-clinic', 'Sato Clinic', [2, 0], clinic(['ripperdoc-sato'], 'cladding')),
      b('neon-works', 'Neon Works', [0, 1], workshop(['tinker-ash'], 'cladding')),
      b('night-market', 'Night Market', [1, 1], shop(['vendor-lin'], 'cladding', true)),
    ],
    landmark: { prefab: 'landmark-brightly-billboard', at: { x: 45, y: 33 } },
  },
  'spire-plaza': {
    id: 'spire-plaza',
    name: 'Spire Plaza',
    subtitle: 'Halcyon · the Aurelian Combine',
    groundSafe: true,
    condition: 'worn',
    buildings: [
      b('aurelian-lobby', 'Aurelian Lobby', [0, 0], office(['liaison-vance'], true, [], 'cladding')),
      b('capsule-flats', 'Capsule Flats', [1, 0], dorm([])),
      b('plaza-arcade', 'Plaza Arcade', [2, 0], shop(['arcade-keeper-mo'], 'cladding', true)),
      b('plaza-flat-1', 'Flat 9C', [0, 1], home(['tenant-roux'], 'cladding')),
    ],
    landmark: { prefab: 'landmark-aurelian-spire', at: { x: 30, y: 33 } },
  },
  'ninth-street': {
    id: 'ninth-street',
    name: 'Ninth Street',
    subtitle: 'Halcyon · stalls, noodles and flats',
    groundSafe: true,
    condition: 'worn',
    buildings: [
      b('ninth-noodles', 'Ninth Street Noodles', [0, 0], canteen(['noodle-cook-han'], 'cladding', true)),
      b('ninth-pawn', 'Pawn & Patch', [1, 0], shop(['pawnbroker-pike'], 'cladding', true)),
      b('ninth-flat-1', 'Flat 12A', [2, 0], home(['tenant-okeke'], 'cladding')),
      b('ninth-flat-2', 'Flat 12B', [0, 1], home([], 'cladding')),
    ],
    landmark: { prefab: 'landmark-neon-mast', at: { x: 30, y: 33 } },
  },
  'glasshouse-alley': {
    id: 'glasshouse-alley',
    name: 'Glasshouse Alley',
    subtitle: 'Halcyon · where the Combine does not look',
    groundSafe: true,
    condition: 'worn',
    buildings: [
      b('glasshouse-bar', 'The Glasshouse', [0, 0], canteen(['bartender-reza'], 'cladding', true)),
      b('alley-clinic', 'Back-alley Clinic', [1, 0], clinic(['doc-esperanza'], 'cladding')),
      b('alley-flat', 'Flat 3', [2, 0], home(['runner-tam'], 'cladding')),
    ],
    landmark: { prefab: 'landmark-neon-mast', at: { x: 30, y: 33 } },
  },
  'site-gallowglass': {
    id: 'site-gallowglass',
    name: 'Site Gallowglass',
    subtitle: 'Halcyon · SC-III · Breached',
    groundSafe: false,
    condition: 'breached',
    buildings: [
      b('gallowglass-headhouse', 'Gallowglass Headhouse', [0, 0], headhouse('gallowglass-lift-down', ['agent-mercer'])),
      b('gallowglass-holding', 'Gallowglass Holding', [1, 0], { ...holding([], false, ['glass-hound', 'ad-wraith'], 'secure-cell'), multiCombat: true, elite: 'chrome-crawler' }),
      b('gallowglass-lab', 'Gallowglass Lab', [2, 0], lab([], false, ['culture-bench', 'amber-trace'], ['neon-moth'])),
    ],
    landmark: { prefab: 'landmark-gallowglass-headframe', at: { x: 30, y: 33 } },
    creatures: ['glass-hound', 'ad-wraith', 'alley-crawler'],
  },
  'rustwater': {
    id: 'rustwater',
    name: 'Rustwater',
    subtitle: 'The Wreckfield · the scavenger town',
    groundSafe: true,
    condition: 'breached',
    buildings: [
      b('rustwater-post', 'Mags’ Post', [0, 0], outpost('scav-boss-mags', 'market-mailbox', 'cladding')),
      b('hallam-breakers', 'Hallam’s Breakers', [1, 0], shop(['scrapper-hallam'], 'cladding')),
      b('rust-kitchen', 'Rust Kitchen', [2, 0], canteen(['cook-bello'], 'cladding')),
      b('rustwater-works', 'Rustwater Works', [0, 1], workshop(['rigger-faye'], 'cladding')),
      b('rustwater-bunks', 'The Bunks', [1, 1], dorm(['scav-rook'])),
    ],
    landmark: { prefab: 'landmark-rustwater-crane', at: { x: 45, y: 33 } },
  },
  'site-tallow': {
    id: 'site-tallow',
    name: 'Site Tallow',
    subtitle: 'The Wreckfield · SC-IV · Overrun',
    groundSafe: false,
    condition: 'breached',
    buildings: [
      b('tallow-forward-post', 'Tallow Forward Post', [0, 0], { ...office(['lt-osei']), lift: 'tallow-lift-down' }),
      b('tallow-holding', 'Tallow Holding', [1, 0], { ...holding([], false, ['bilge-wraith', 'misprint'], 'secure-cell'), multiCombat: true, elite: 'the-bosun' }),
      b('tallow-barracks', 'Tallow Barracks', [2, 0], dorm([], false, ['misprint', 'misprint'])),
      yard('tallow-parade', 'The Parade Ground', 9, 31, 30, 14, ['the-cohort', 'misprint'], { multiCombat: true, door: 'north' }),
    ],
    landmark: { prefab: 'landmark-tallow-stack', at: { x: 45, y: 34 } },
    creatures: ['bilge-wraith', 'rustling', 'misprint'],
  },
  'the-choir': {
    id: 'the-choir',
    name: 'The Choir',
    subtitle: 'The Glass Steppe · the pilgrim enclave',
    groundSafe: true,
    condition: 'alien',
    buildings: [
      b('choir-post', 'Pilgrims’ Rest', [0, 0], outpost('cantor-ysolde', 'market-mailbox', 'blockwork')),
      b('choir-chapel', 'The Choir House', [1, 0], hall(['pilgrim-ruth'], 'blockwork')),
      b('choir-infirmary', 'Choir Infirmary', [2, 0], clinic(['dr-nakamura'], 'blockwork')),
      b('choir-works', 'Glassworks', [0, 1], workshop(['glazier-oro'], 'blockwork')),
      b('choir-refectory', 'Refectory', [1, 1], canteen(['brother-ansel'], 'blockwork')),
    ],
    landmark: { prefab: 'landmark-choir-bell', at: { x: 45, y: 33 } },
  },
  'site-vesper': {
    id: 'site-vesper',
    name: 'Site Vesper',
    subtitle: 'The Glass Steppe · SC-IV · Lost',
    groundSafe: false,
    condition: 'alien',
    buildings: [
      b('vesper-headhouse', 'Vesper Headhouse', [0, 0], headhouse('vesper-lift-down', [], false, ['choir-echo'])),
      b('vesper-records', 'Vesper Records', [1, 0], office([], false, ['choir-echo', 'red-twin'])),
      b('vesper-holding', 'Vesper Holding', [2, 0], { ...holding([], false, ['red-twin', 'choir-echo'], 'secure-cell'), multiCombat: true, elite: 'prism-alpha' }),
      yard('vesper-nave', 'The Nave', 9, 31, 30, 14, ['the-precentor', 'choir-echo'], { multiCombat: true, floor: 'grate' }),
    ],
    landmark: { prefab: 'landmark-vesper-beacon', at: { x: 44, y: 34 } },
    creatures: ['choir-echo', 'red-twin', 'glass-stalker'],
  },
  'last-post': {
    id: 'last-post',
    name: 'Last Post',
    subtitle: 'The Spindle · the last Directorate camp',
    groundSafe: true,
    condition: 'alien',
    buildings: [
      b('last-post-hq', 'Last Post HQ', [0, 0], outpost('captain-halloran')),
      b('last-post-mess', 'Last Post Mess', [1, 0], canteen(['cook-perpetua'], 'wall')),
      b('last-post-aid', 'Aid Station', [2, 0], clinic(['medic-quill'])),
      b('last-post-works', 'Field Workshop', [0, 1], workshop(['engineer-saoirse'], 'wall')),
      b('last-post-bunks', 'Last Post Bunks', [1, 1], dorm(['sergeant-vale-null'])),
    ],
    landmark: { prefab: 'landmark-last-post-mast', at: { x: 45, y: 33 } },
  },
  'site-null': {
    id: 'site-null',
    name: 'Site Null',
    subtitle: 'The Spindle · SC-V · Inverted',
    groundSafe: false,
    condition: 'uncanny',
    buildings: [
      b('null-headhouse', 'Null Headhouse', [0, 0], headhouse('null-lift-down', ['registrar-lune-null'])),
      b('null-holding', 'The Outside', [1, 0], { ...holding([], false, ['null-echo', 'null-stalker'], 'secure-cell'), multiCombat: true, elite: 'null-auditor' }),
      b('null-records', 'Null Records', [2, 0], office([], false, ['null-echo'])),
    ],
    landmark: { prefab: 'landmark-spindle-light', at: { x: 28, y: 34 } },
    creatures: ['null-echo', 'null-stalker', 'cell-breaker'],
  },
};
