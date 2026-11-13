import type { WorldObjectId } from '../ids.ts';
import type { TileKindId } from '../world/tiles.ts';
import { DRESSING_THEMES, type DressingTheme } from './prefabs/types.ts';

export type Mount = 'wall' | 'backed' | 'free' | 'seat' | 'flat';

export interface FurnishingProfile {
  readonly mount: Mount;
  readonly homes: readonly DressingTheme[];
  readonly surface?: boolean;
  readonly seatsAt?: 'surface' | 'view';
  readonly backless?: boolean;
  readonly backstop?: boolean;
  readonly inRows?: boolean;
}

type Options = Pick<FurnishingProfile, 'surface' | 'inRows' | 'backless' | 'backstop'>;

const EVERYWHERE: readonly DressingTheme[] = DRESSING_THEMES;
const except = (...themes: readonly DressingTheme[]): readonly DressingTheme[] => DRESSING_THEMES.filter((theme) => !themes.includes(theme));

const wall = (homes: readonly DressingTheme[] = EVERYWHERE): FurnishingProfile => ({ mount: 'wall', homes });
const backed = (homes: readonly DressingTheme[], options: Options = {}): FurnishingProfile => ({ mount: 'backed', homes, ...options });
const free = (homes: readonly DressingTheme[], options: Options = {}): FurnishingProfile => ({ mount: 'free', homes, ...options });
const surface = (homes: readonly DressingTheme[], options: Options = {}): FurnishingProfile => ({ mount: 'free', homes, surface: true, ...options });
const seat = (seatsAt: 'surface' | 'view', homes: readonly DressingTheme[], options: Options = {}): FurnishingProfile => ({ mount: 'seat', homes, seatsAt, ...options });
const flat = (homes: readonly DressingTheme[] = EVERYWHERE): FurnishingProfile => ({ mount: 'flat', homes });
const each = (ids: readonly WorldObjectId[], profile: FurnishingProfile): Record<WorldObjectId, FurnishingProfile> => Object.fromEntries(ids.map((id) => [id, profile]));

const RECORDS: readonly DressingTheme[] = ['office', 'archive', 'post'];
const CLINICAL: readonly DressingTheme[] = ['medical', 'ward'];
const QUIET_ROOMS: readonly DressingTheme[] = ['chapel', 'archive', 'office', 'post', 'ward', 'medical', 'dormitory', 'canteen'];

const DECAY: readonly WorldObjectId[] = ['barricade', 'debris-pile', 'collapsed-slab', 'bench-toppled', 'planter-toppled', 'kiosk-burnt', 'sandbags'];

const LANDMARKS: readonly WorldObjectId[] = [
  'signal-mast', 'lantern-tower', 'ledger-clock', 'gantry-crane', 'settling-tank', 'beam-engine', 'heart-bloom', 'salt-reliquary', 'headframe', 'weigh-scale',
  'great-dish', 'containment-tank', 'pneumatic-tree', 'index-carousel', 'inverted-monument', 'reactor-ring', 'depth-gauge', 'salt-cone', 'container-tower', 'cryo-core',
  'call-board', 'bell-jar-tree', 'beacon-red', 'beacon-green', 'beacon-blue', 'beacon-amber', 'monument-statue', 'fountain-grand',
];

const STORY_PROPS: readonly WorldObjectId[] = ['anm-0447-lantern', 'atrium-core', 'lantern-echo', 'furnace-core', 'mirror-pane', 'front-door'];

const LITTER: readonly WorldObjectId[] = ['litter-papers', 'litter-debris', 'litter-puddle', 'litter-rubble', 'litter-gravel', 'cable-run', 'cable-run-end'];

export const FURNISHING_PROFILES: Readonly<Record<WorldObjectId, FurnishingProfile>> = {
  ...each(LANDMARKS, free(EVERYWHERE)),
  ...each(STORY_PROPS, free(EVERYWHERE)),
  ...each(DECAY, free(EVERYWHERE)),
  ...each(LITTER, flat()),
  ...each(['wall-shelf', 'notice-board', 'warning-sign', 'wall-locker'], wall()),
  'timetable-board': wall(['civic', 'camp', 'freight', 'office']),
  'departure-board': wall(['transit']),

  bookcase: backed(['archive', 'office', 'dormitory', 'camp', 'chapel', 'ward'], { inRows: true }),
  'filing-cabinet': backed([...RECORDS, ...CLINICAL, 'lab', 'camp', 'freight', 'civic', 'garden'], { inRows: true }),
  pigeonhole: backed(RECORDS, { inRows: true }),
  'sorting-case': backed(['post', 'archive'], { inRows: true, surface: true }),
  'server-rack': free(['industrial', 'archive', 'office', 'civic', 'cold', 'medical', 'lab', 'garden', 'works'], { inRows: true, backstop: true }),
  'monitor-bank': free(['lab', 'office', 'medical', 'civic', 'industrial', 'cold', 'works', 'garden', 'freight', 'wet', 'camp'], { inRows: true, surface: true }),
  'vending-machine': backed(['civic', 'canteen', 'camp', 'office', 'dormitory', 'freight', 'medical', 'ward', 'works'], { inRows: true }),
  'water-cooler': backed(except('chapel', 'mine', 'wet', 'industrial', 'cold')),
  'cook-range': backed(['canteen', 'camp'], { inRows: true }),
  washer: backed(['industrial', 'freight', 'ward', 'camp'], { inRows: true }),
  'bunk-bed': backed(['dormitory', 'camp'], { inRows: true }),

  'briefing-bench': seat('view', except('industrial', 'mine', 'wet', 'chapel')),
  'bench-curve': seat('view', ['civic', 'garden', 'ward', 'camp', 'medical', 'office', 'transit']),
  pew: seat('view', ['chapel'], { inRows: true }),
  armchair: seat('view', ['dormitory', 'archive', 'garden', 'canteen', 'office', 'camp', 'civic', 'ward', 'medical']),
  'office-chair': seat('surface', ['office', 'archive', 'lab', 'civic', 'medical', 'ward', 'industrial', 'post', 'camp', 'cold', 'freight', 'works'], { inRows: true }),
  stool: seat('surface', except('chapel', 'ward'), { inRows: true, backless: true }),

  'office-desk': surface([...RECORDS, ...CLINICAL, 'lab', 'camp', 'freight', 'civic', 'industrial'], { inRows: true }),
  'franking-counter': surface(['post']),
  'dispensing-counter': surface(['medical', 'ward', 'lab'], { inRows: true }),
  'canteen-table': surface(['canteen', 'camp', 'garden', 'dormitory', 'civic'], { inRows: true }),
  workbench: surface(['industrial', 'lab', 'garden', 'wet', 'camp', 'works', 'freight', 'mine', 'cold'], { inRows: true }),
  'serving-counter': surface(['canteen', 'camp'], { inRows: true }),
  'reception-desk': surface(['office', 'civic', 'medical', 'ward', 'camp', 'archive', 'freight', 'post', 'garden']),
  'map-table': surface(['office', 'camp', 'civic', 'mine']),
  'triage-station': surface(['medical', 'ward', 'camp']),
  'nurses-station': surface(['ward', 'medical']),
  'slag-ladle': surface(EVERYWHERE),
  'brazier-hearth': surface(['camp', 'mine', 'chapel', 'wet', 'civic']),
  'apothecary-rotunda': surface(['medical']),
  'glass-kiosk': surface(['civic']),
  'guard-booth': surface(['civic', 'camp', 'freight']),

  'storage-rack': free(except('civic', 'chapel'), { inRows: true, backstop: true }),
  'letter-rack': free(RECORDS, { inRows: true, backstop: true }),
  'archive-shelf': free([...RECORDS, 'wet'], { inRows: true, backstop: true }),
  planter: free(['civic', 'garden', 'ward', 'office', 'works', 'medical', 'canteen', 'camp', 'dormitory', 'lab']),
  'potted-fern': free(['civic', 'garden', 'medical', 'office', 'ward', 'camp', 'dormitory', 'post', 'archive', 'canteen', 'lab']),
  gurney: free([...CLINICAL, 'camp', 'lab', 'civic'], { inRows: true }),
  'screen-partition': free([...CLINICAL, 'camp', 'lab', 'civic'], { inRows: true }),
  wheelchair: free([...CLINICAL, 'camp', 'civic']),
  'mortuary-bier': free([...CLINICAL, 'chapel', 'cold'], { inRows: true }),
  'specimen-tank': free(['lab', 'garden', 'medical', 'cold'], { inRows: true }),
  'cold-pod': free(['cold', 'medical', 'lab', 'office'], { inRows: true }),
  'candle-stand': free(['chapel', 'ward', 'archive', 'camp'], { inRows: true }),
  'packing-crate': free(EVERYWHERE),
  'crate-stack': free(EVERYWHERE),
  'floor-lamp': free(EVERYWHERE),
  'light-pillar': free(EVERYWHERE, { inRows: true }),
  'mop-bucket': free(EVERYWHERE),
  'tram-stop': free(EVERYWHERE),
  barrel: free(except('chapel', 'archive', 'office', 'post', 'ward')),
  'sack-pile': free(except('office', 'archive', 'ward', 'medical', 'lab', 'dormitory', 'post')),
  'gas-cylinders': free(except('chapel', 'archive', 'office', 'dormitory', 'canteen', 'post', 'civic')),
  'pipe-cluster': free(except(...QUIET_ROOMS, 'civic')),
  'pallet-stack': free(except('chapel', 'archive', 'medical', 'dormitory', 'canteen', 'post', 'lab')),
  'cargo-container': free(except('chapel', 'archive', 'medical', 'dormitory', 'canteen', 'post', 'lab', 'office', 'ward')),
  'cable-spool': free(except('chapel', 'canteen', 'dormitory', 'ward', 'medical', 'archive', 'post')),
  generator: free(except(...QUIET_ROOMS)),
  'tool-cart': free(except('chapel', 'canteen', 'dormitory')),
  'mine-cart': free(['mine', 'camp', 'wet']),
  'linen-cart': free(['industrial', 'freight', 'ward', 'medical', 'dormitory']),
  'mail-sacks': free(['post', 'archive', 'camp', 'ward', 'office', 'freight']),
  'book-trolley': free(['archive', 'post', 'ward', 'office', 'medical', 'camp', 'freight', 'civic']),
  'traffic-cone': free(except(...QUIET_ROOMS)),
  'trash-bin': free(except('chapel', 'mine', 'wet')),
  'ticket-barrier': free(['civic', 'freight', 'camp', 'works'], { inRows: true }),
  'directory-pylon': free(['civic', 'office', 'ward', 'medical', 'camp']),
  'works-barrier': free(['works', 'camp', 'lab', 'civic', 'freight', 'industrial'], { inRows: true }),
  'survey-stake': free(['works', 'camp', 'civic', 'freight', 'industrial']),
  'reserved-plot': flat(['works', 'civic', 'freight', 'industrial']),
  'relay-dish': free(['industrial', 'civic', 'cold', 'works', 'lab']),
  'pump-housing': free(['civic', 'wet', 'cold', 'industrial']),
  'hydraulic-press': free(['industrial', 'freight', 'works']),
  'decon-arch': free(['civic', 'works', 'lab', 'medical']),
  'transit-shelter': free(['civic', 'office', 'camp', 'freight']),
  'shuttered-kiosk': free(['civic', 'freight']),
  'banner-mast': free(['civic', 'works', 'camp']),
  'fountain-basin': free(['civic', 'garden']),
  'buffer-stop': free(['transit']),
  'platform-gate': free(['transit']),
};

export const ROOM_SIGNATURES: Readonly<Record<DressingTheme, readonly WorldObjectId[]>> = {
  civic: ['briefing-bench', 'bench-curve', 'planter', 'potted-fern', 'directory-pylon', 'fountain-basin', 'fountain-grand', 'monument-statue', 'transit-shelter', 'ticket-barrier', 'glass-kiosk', 'shuttered-kiosk', 'banner-mast', 'vending-machine', 'light-pillar'],
  office: ['office-desk', 'reception-desk', 'map-table', 'monitor-bank'],
  canteen: ['canteen-table', 'serving-counter', 'cook-range'],
  dormitory: ['bunk-bed'],
  industrial: ['workbench', 'generator', 'pipe-cluster', 'hydraulic-press', 'washer', 'server-rack', 'cable-spool', 'gas-cylinders'],
  freight: ['storage-rack', 'pallet-stack', 'cargo-container', 'crate-stack', 'container-tower', 'gantry-crane'],
  medical: ['gurney', 'triage-station', 'screen-partition', 'apothecary-rotunda', 'dispensing-counter', 'specimen-tank', 'cold-pod'],
  lab: ['workbench', 'specimen-tank', 'monitor-bank', 'containment-tank', 'server-rack'],
  garden: ['planter', 'potted-fern', 'heart-bloom', 'bell-jar-tree', 'sack-pile'],
  wet: ['pipe-cluster', 'sandbags', 'settling-tank', 'beam-engine', 'pump-housing', 'generator'],
  mine: ['mine-cart', 'sack-pile', 'headframe', 'salt-cone', 'weigh-scale'],
  chapel: ['pew', 'candle-stand', 'salt-reliquary', 'mortuary-bier'],
  ward: ['gurney', 'mortuary-bier', 'nurses-station', 'call-board', 'screen-partition'],
  archive: ['bookcase', 'archive-shelf', 'filing-cabinet', 'index-carousel', 'storage-rack'],
  post: ['sorting-case', 'mail-sacks', 'pneumatic-tree', 'franking-counter', 'letter-rack', 'pigeonhole'],
  camp: ['brazier-hearth', 'bunk-bed', 'canteen-table', 'map-table', 'sandbags'],
  cold: ['crate-stack', 'gas-cylinders', 'cold-pod', 'cryo-core', 'wall-locker'],
  works: ['works-barrier', 'traffic-cone', 'survey-stake', 'reserved-plot', 'decon-arch'],
  transit: ['briefing-bench', 'bench-curve', 'departure-board', 'buffer-stop', 'platform-gate'],
};

export const ROOM_FLOORS: Readonly<Partial<Record<TileKindId, readonly DressingTheme[]>>> = {
  ceramic: ['medical', 'ward', 'lab', 'cold', 'canteen'],
  boards: ['archive', 'dormitory', 'office', 'camp', 'canteen', 'chapel', 'garden', 'post'],
};

export const SIGNATURE_MIN_TILES = 60;
export const OPENING_APRON = 1;
export const NARROW_OPENING = 6;
export const WIDE_OPENING_GAP = 3;
export const RHYTHM_LIMIT = 4;
export const REPEAT_LIMIT = 4;
export const BACKLESS_REACH = 2;

export const profileOf = (objectId: WorldObjectId): FurnishingProfile | undefined => FURNISHING_PROFILES[objectId];
