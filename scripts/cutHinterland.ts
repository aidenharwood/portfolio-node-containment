import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RegionId } from '../packages/shared/src/ids.ts';
import { SHIPPED_LANDS } from '../packages/shared/src/content/land/index.ts';
import type { TilePoint } from '../packages/shared/src/world/geometry.ts';
import type { LandMap } from '../packages/shared/src/world/landPlan.ts';
import { DISTRICT_LAYOUT_SCHEMA, type DistrictLayout } from '../packages/shared/src/world/layoutSchema.ts';
import { printLayout } from '../packages/shared/src/world/printLayout.ts';
import { isWalkableTile } from '../packages/shared/src/world/tiles.ts';

type Condition = NonNullable<DistrictLayout['condition']>;
type Ambience = DistrictLayout['ambience'];

interface Ward {
  readonly name: string;
  readonly tiers: readonly [number, number];
  readonly entries: readonly string[];
  readonly ambience: Ambience;
  readonly condition: (column: number, row: number) => Condition;
}

const OUT = join(import.meta.dirname, '../packages/shared/src/content/districts/layouts');
const LOW_WARD = 'low-ward';
const LOW_WARD_SQUARES = new Set(['2,4', '3,4', '4,4', '2,5', '3,5', '4,5', '5,5', '2,6', '3,6']);
const MIN_TILES = 40;
const PROP_REACH = 3;
const GATE_CLEARANCE = 8;
const EDGE_CLEARANCE = 4;
const PROP_SPACING = 5;
const PROPS = ['street-lamp', 'burn-barrel', 'barricade'] as const;

const WARDS: Readonly<Record<string, Ward>> = {
  'old-shipyards': {
    name: 'the Old Shipyards',
    tiers: [14, 15],
    entries: ['6,5'],
    ambience: { darkness: 0.62, tint: '#2e2622', fog: '#1e2428', sky: '#2e3444', weather: ['rain', 'mist'], haze: 1.35 },
    condition: (column) => (column >= 4 ? 'overgrown' : 'breached'),
  },
  tidemarsh: {
    name: 'the Tidemarsh',
    tiers: [16, 17],
    entries: ['3,7'],
    ambience: { darkness: 0.5, tint: '#24342e', fog: '#34443e', sky: '#5a6a66', weather: ['mist', 'drizzle'], haze: 1.6 },
    condition: (column, row) => (column >= 4 && row <= 8 ? 'overgrown' : 'flooded'),
  },
  'the-heights': {
    name: 'the Heights',
    tiers: [18, 19],
    entries: ['5,2'],
    ambience: { darkness: 0.5, tint: '#2a3040', fog: '#2a3044', sky: '#4a5a80', weather: ['drizzle', 'mist'], haze: 1.1 },
    condition: () => 'breached',
  },
  'old-town': {
    name: 'Old Town',
    tiers: [20, 21],
    entries: ['7,5', '7,6'],
    ambience: { darkness: 0.56, tint: '#3a2c22', fog: '#2e2620', sky: '#4a3a3a', weather: ['drizzle', 'dust'], haze: 1.2 },
    condition: () => 'breached',
  },
  ironside: {
    name: 'Ironside',
    tiers: [22, 23],
    entries: ['8,1'],
    ambience: { darkness: 0.64, tint: '#3a2418', fog: '#2a1c16', sky: '#5a3a30', weather: ['embers', 'ash'], haze: 1.4 },
    condition: () => 'breached',
  },
  'drowned-quarter': {
    name: 'the Drowned Quarter',
    tiers: [24, 25],
    entries: ['8,6'],
    ambience: { darkness: 0.66, tint: '#16302e', fog: '#10262a', sky: '#24404a', weather: ['rain', 'mist'], haze: 1.5 },
    condition: () => 'flooded',
  },
  'the-lantern': {
    name: 'the Lantern',
    tiers: [26, 27],
    entries: ['9,8', '9,2'],
    ambience: { darkness: 0.58, tint: '#26303a', fog: '#2a3440', sky: '#3e4a5e', weather: ['mist', 'drizzle'], haze: 1.7 },
    condition: () => 'breached',
  },
  'the-blight': {
    name: 'the Blight',
    tiers: [28, 28],
    entries: [],
    ambience: { darkness: 0.68, tint: '#2c1e2e', fog: '#2a1c2c', sky: '#4a3450', weather: ['ash', 'dust'], haze: 1.5 },
    condition: () => 'alien',
  },
};

const PLACES: Readonly<Record<string, string | readonly [string, string]>> = {
  '0,0 old-shipyards': 'Gull Scar',
  '1,0 old-shipyards': 'Heather Top',
  '2,0 old-shipyards': 'Cairn Moor',
  '3,0 old-shipyards': 'Ridge Foot',
  '0,1 old-shipyards': 'Saltcote',
  '1,1 old-shipyards': 'Peat Hags',
  '2,1 old-shipyards': 'Long Moor',
  '3,1 old-shipyards': 'Moor Road',
  '0,2 old-shipyards': 'Slipway Row',
  '1,2 old-shipyards': ['shipwrights-hard', 'Shipwrights’ Hard'],
  '2,2 old-shipyards': 'Moor Gate',
  '3,2 old-shipyards': ['drovers-rise', 'Drovers’ Rise'],
  '4,2 old-shipyards': 'Ridge Shadow',
  '5,2 old-shipyards': 'Incline Foot',
  '6,2 old-shipyards': 'Weed Lane',
  '0,3 old-shipyards': ['dry-dock-four', 'Dry Dock Four'],
  '1,3 old-shipyards': 'Graving Docks',
  '2,3 old-shipyards': 'The Ropery',
  '3,3 old-shipyards': 'Moor Edge',
  '4,3 old-shipyards': 'Bramble Estate',
  '5,3 old-shipyards': 'Ivy Crescent',
  '6,3 old-shipyards': 'Fallen Terraces',
  '7,3 old-shipyards': 'Bindweed Row',
  '8,3 old-shipyards': 'Gorge Head',
  '0,4 old-shipyards': 'Bay Shingle',
  '1,4 old-shipyards': 'Harbour Steps',
  '5,4 old-shipyards': 'Wire Fields',
  '6,4 old-shipyards': 'Knotweed Park',
  '7,4 old-shipyards': 'Valley Road',
  '8,4 old-shipyards': 'Wall Ditch',
  '6,5 old-shipyards': ['gatehouse-yard', 'The Crossroads'],
  '7,5 old-shipyards': 'West Gate Road',
  '4,6 old-shipyards': 'Riverside Allotments',
  '5,6 old-shipyards': 'The Towpath',
  '6,6 old-shipyards': 'Ferry Steps',
  '7,6 old-shipyards': 'Mill Race',
  '3,0 the-heights': 'Ridge West End',
  '4,0 the-heights': 'North Parade',
  '5,0 the-heights': ['the-spire', 'The Spire'],
  '6,0 the-heights': 'Belvedere',
  '7,0 the-heights': 'Viaduct Approach',
  '4,1 the-heights': 'Crescent Walk',
  '5,1 the-heights': 'Uptown',
  '6,1 the-heights': 'Observatory Green',
  '7,1 the-heights': 'Railway Cutting',
  '4,2 the-heights': 'Cliff Gardens',
  '5,2 the-heights': 'Upper Station',
  '6,2 the-heights': 'Belgrave Terrace',
  '7,2 the-heights': 'Spur Road',
  '7,3 the-heights': 'Spur End',
  '8,0 ironside': 'Mountain Foot',
  '9,0 ironside': 'The Falls',
  '8,1 ironside': 'Railhead',
  '9,1 ironside': ['bellows', 'Bellows'],
  '10,1 ironside': 'Spoil Heaps',
  '8,2 ironside': 'Gorge Top',
  '9,2 ironside': 'Furnace Row',
  '10,2 ironside': 'Slag Gate',
  '9,3 old-town': 'Gallows Top',
  '8,4 old-town': 'Wallside',
  '9,4 old-town': 'Gallows Green',
  '7,5 old-town': 'Westgate',
  '8,5 old-town': ['cathedral-close', 'Cathedral Close'],
  '9,5 old-town': 'East Wall',
  '7,6 old-town': 'Water Gate',
  '8,6 old-town': 'Floodgate Street',
  '9,6 old-town': 'Moat Bank',
  '4,6 tidemarsh': 'Lower Reach',
  '5,6 tidemarsh': 'Wood Bank',
  '6,6 tidemarsh': 'Elder Bank',
  '7,6 tidemarsh': 'Causeway End',
  '8,6 tidemarsh': 'Creek Head',
  '0,7 tidemarsh': 'Mudflats',
  '1,7 tidemarsh': 'Eel Weirs',
  '2,7 tidemarsh': ['brinehouse', 'The Brinehouse'],
  '3,7 tidemarsh': 'Tide Station',
  '4,7 tidemarsh': 'Withy Beds',
  '5,7 tidemarsh': 'Oakhanger',
  '6,7 tidemarsh': 'Deep Wood',
  '7,7 tidemarsh': 'Creekside',
  '0,8 tidemarsh': 'Sandbar',
  '1,8 tidemarsh': 'Delta Mouth',
  '2,8 tidemarsh': 'Stiltholm',
  '3,8 tidemarsh': 'Reed Channels',
  '4,8 tidemarsh': 'Alder Carr',
  '5,8 tidemarsh': 'Hollin Wood',
  '6,8 tidemarsh': 'Charcoal Clearing',
  '7,8 tidemarsh': ['woods-end', 'Wood’s End'],
  '2,9 tidemarsh': 'Shell Beach',
  '3,9 tidemarsh': 'Delta Shoals',
  '4,9 tidemarsh': 'Long Strand',
  '5,9 tidemarsh': 'Pine Dunes',
  '6,9 tidemarsh': 'Driftwood Cove',
  '9,5 drowned-quarter': 'Moat Mire',
  '8,6 drowned-quarter': 'Floodgate Moor',
  '9,6 drowned-quarter': 'Saltmoor',
  '7,7 drowned-quarter': 'Creek Moor',
  '8,7 drowned-quarter': 'Gibbet Moor',
  '9,7 drowned-quarter': 'Sunk Lane',
  '7,8 drowned-quarter': 'Creek Mud',
  '8,8 drowned-quarter': ['site-fathom', 'Site Fathom'],
  '9,8 drowned-quarter': 'The Roost',
  '9,2 the-lantern': 'Ledge Gate',
  '9,3 the-lantern': 'The Ledge',
  '10,3 the-lantern': 'Ledge Top',
  '9,4 the-lantern': 'Gallows Drop',
  '10,4 the-lantern': 'Rim Road',
  '9,5 the-lantern': 'Long Ledge',
  '10,5 the-lantern': 'Beacon Bend',
  '9,6 the-lantern': 'Ledge Foot',
  '10,6 the-lantern': 'Watch Road',
  '9,7 the-lantern': 'Sea Road',
  '10,7 the-lantern': 'Hamlet Lane',
  '9,8 the-lantern': 'Seawall Path',
  '10,8 the-lantern': ['keepers-hamlet', 'Keepers’ Hamlet'],
  '10,9 the-lantern': 'The Spit',
  '11,9 the-lantern': ['the-lantern', 'The Lantern'],
  '9,2 the-blight': 'Ash Margin',
  '10,2 the-blight': 'Ash Fells Edge',
  '11,2 the-blight': 'Cinder Waste',
  '10,3 the-blight': 'Rust Flats',
  '11,3 the-blight': 'Scar Fields',
  '10,4 the-blight': 'Rim Camp',
  '11,4 the-blight': 'The Crater',
  '10,5 the-blight': 'Glass Moor',
  '11,5 the-blight': 'Crater South',
  '10,6 the-blight': 'The Sores',
  '11,6 the-blight': 'Ash Fells',
  '10,7 the-blight': 'Dead Orchard',
  '11,7 the-blight': 'Burnt Shore',
  '10,8 the-blight': 'Blight Shore',
  '11,8 the-blight': 'Ashen Cove',
};

const kebab = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function placeOf(key: string): { readonly id: string; readonly name: string } {
  const place = PLACES[key];
  if (place === undefined) throw new Error(`No place name for square ${key}; add one to PLACES.`);
  return typeof place === 'string' ? { id: kebab(place), name: place } : { id: place[0], name: place[1] };
}

interface Cut {
  readonly column: number;
  readonly row: number;
  readonly ward: RegionId;
  readonly tiles: readonly TilePoint[];
  readonly split: boolean;
}

function cutsOf(land: LandMap): Cut[] {
  const { squareSize, columns, rows } = land.plan;
  const cuts: Cut[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      if (LOW_WARD_SQUARES.has(`${column},${row}`)) continue;
      const byWard = new Map<RegionId, TilePoint[]>();
      for (let y = 0; y < squareSize; y++) {
        for (let x = 0; x < squareSize; x++) {
          const point = { x: column * squareSize + x, y: row * squareSize + y };
          if (!isWalkableTile(land, point)) continue;
          const ward = land.wardAt(point);
          if (ward === undefined || ward === LOW_WARD) throw new Error(`Walkable land at ${point.x},${point.y} has ward ${ward ?? 'none'} outside the Low Ward.`);
          const tiles = byWard.get(ward) ?? [];
          tiles.push({ x, y });
          byWard.set(ward, tiles);
        }
      }
      for (const [ward, tiles] of [...byWard].sort((a, b) => a[0].localeCompare(b[0]))) {
        if (tiles.length < MIN_TILES) throw new Error(`Square ${column},${row} holds a sliver of ${ward} (${tiles.length} tiles); fold it into a neighbour in the land plan.`);
        cuts.push({ column, row, ward, tiles, split: byWard.size > 1 });
      }
    }
  }
  return cuts;
}

function layoutOf(land: LandMap, cut: Cut): DistrictLayout {
  const { squareSize } = land.plan;
  const key = `${cut.column},${cut.row}`;
  const ward = WARDS[cut.ward];
  if (!ward) throw new Error(`Ward ${cut.ward} has no settings.`);
  const { id, name } = placeOf(`${key} ${cut.ward}`);
  const own = new Set(cut.tiles.map((tile) => tile.y * squareSize + tile.x));
  const isOwn = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < squareSize && y < squareSize && own.has(y * squareSize + x);
  const gateTiles = Object.values(land.gates)
    .flat()
    .map((tile) => ({ x: tile.x - cut.column * squareSize, y: tile.y - cut.row * squareSize }));
  const nearGate = (x: number, y: number): boolean => gateTiles.some((gate) => Math.max(Math.abs(gate.x - x), Math.abs(gate.y - y)) < GATE_CLEARANCE);
  const isGate = (x: number, y: number): boolean => gateTiles.some((gate) => gate.x === x && gate.y === y);
  const clearAround = (x: number, y: number, reach: number): boolean => {
    for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) if (!isOwn(x + dx, y + dy)) return false;
    return true;
  };
  const centre = cut.tiles.reduce((sum, tile) => ({ x: sum.x + tile.x / cut.tiles.length, y: sum.y + tile.y / cut.tiles.length }), { x: 0, y: 0 });
  const byDistance = (from: { readonly x: number; readonly y: number }) => (a: TilePoint, b: TilePoint) =>
    Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y) || a.y - b.y || a.x - b.x;
  const ordered = [...cut.tiles].sort(byDistance(centre));
  const label =
    ordered.find((tile) => !isGate(tile.x, tile.y) && clearAround(tile.x, tile.y, 1)) ?? ordered.find((tile) => !isGate(tile.x, tile.y)) ?? (ordered[0] as TilePoint);
  const props: { readonly kind: string; readonly at: TilePoint }[] = [];
  const passes = [
    { reach: PROP_REACH, edge: EDGE_CLEARANCE, spacing: PROP_SPACING },
    { reach: 2, edge: EDGE_CLEARANCE, spacing: PROP_SPACING },
    { reach: 1, edge: EDGE_CLEARANCE, spacing: PROP_SPACING },
    { reach: 1, edge: 2, spacing: 3 },
  ];
  for (const { reach, edge, spacing } of passes) {
    for (const tile of [...cut.tiles].sort(byDistance(label))) {
      if (props.length === PROPS.length) break;
      const { x, y } = tile;
      if (x < edge || y < edge || x >= squareSize - edge || y >= squareSize - edge) continue;
      if (nearGate(x, y) || !clearAround(x, y, reach) || Math.hypot(x - label.x, y - label.y) < 2) continue;
      if (props.some((prop) => Math.hypot(prop.at.x - x, prop.at.y - y) < spacing)) continue;
      props.push({ kind: PROPS[props.length] as string, at: tile });
    }
  }
  const tier = cut.ward === 'the-blight' || ward.entries.includes(key) ? ward.tiers[0] : ward.tiers[1];
  return DISTRICT_LAYOUT_SCHEMA.parse({
    id,
    name,
    subtitle: `Hinterland, ${ward.name}`,
    tier,
    region: cut.ward,
    condition: ward.condition(cut.column, cut.row),
    ambience: ward.ambience,
    size: { width: squareSize, height: squareSize },
    square: cut.split ? { column: cut.column, row: cut.row, split: true } : { column: cut.column, row: cut.row },
    steps: [],
    tiles: [],
    areas: [{ room: 'ground', name }],
    anchors: { start: { room: 'ground', dx: label.x, dy: label.y } },
    objects: props.map((prop) => ({ id: `${id}-${prop.kind}`, object: prop.kind, at: { room: 'ground', dx: prop.at.x, dy: prop.at.y } })),
    assemblies: [],
    npcs: [],
    creatures: [],
    lights: [],
    decals: [],
    setPieces: [],
    dressing: { ground: { theme: 'street', people: 0 } },
    furnish: {},
  });
}

const force = process.argv.includes('--force');
const land = SHIPPED_LANDS.get('hinterland');
if (!land) throw new Error('There is no land plan "hinterland".');
const layouts = cutsOf(land).map((cut) => layoutOf(land, cut));
const ids = new Set<string>();
for (const layout of layouts) {
  if (ids.has(layout.id)) throw new Error(`Two squares are named "${layout.id}".`);
  ids.add(layout.id);
}
let written = 0;
for (const layout of layouts) {
  const path = join(OUT, `${layout.id}.json`);
  if (existsSync(path) && !force) continue;
  writeFileSync(path, printLayout(layout));
  written += 1;
}
console.log(`${layouts.length} land squares, ${written} written.`);
console.log(layouts.map((layout) => layout.id).join(' '));
