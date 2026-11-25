import { readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import landSource from '../../packages/shared/src/content/land/the-span.json' with { type: 'json' };
import { drawLand, type LandMap } from '../../packages/shared/src/world/landPlan.ts';
import { parseLandPlan } from '../../packages/shared/src/world/landSchema.ts';
import { DISTRICT_LAYOUT_SCHEMA, type DistrictLayout } from '../../packages/shared/src/world/layoutSchema.ts';
import { printLayout } from '../../packages/shared/src/world/printLayout.ts';
import { buildDistrict } from '../../packages/shared/src/world/layout.ts';
import { parseTileLayout } from '../../packages/shared/src/world/district.ts';
import { TILE_KINDS, type TileKindId } from '../../packages/shared/src/world/tiles.ts';
import { registerFurnishingKit } from '../../packages/shared/src/content/furnishingKit.ts';
import { CITY_KIT } from '../../packages/shared/src/content/catalog/cityKit.ts';
import { LANDMARK_KIT } from '../../packages/shared/src/content/catalog/landmarks.ts';
import { SPAN_KIT } from '../../packages/shared/src/content/span/objects.ts';
import { placeAt, PLACES, random, REGIONS, SQUARE, squareTiers, STATION_TRACK_ROW, TERMINAL, WILD_PINS } from './atlas.ts';
import { BRIDGE_PLANS_FOR_LAND } from './bridges.ts';
import { PLACE_SPECS, type BuildingSpec, type PlaceSquare } from './places.ts';

const TIERS = squareTiers();
import { recipeOf } from './recipes.ts';
import { BELOW } from './below.ts';
import { dressWild, WILD_OVERRIDES, WILD_PACKS } from './wilds.ts';
import { withQuestPlacements } from './extras/quests.ts';
import { WILD_KIT } from '../../packages/shared/src/content/span/wilds.ts';
import { EXTRAS as SPINWARD_EXTRAS } from './extras/spinward.ts';
import { EXTRAS as FAR_SPAN_EXTRAS } from './extras/farSpan.ts';
import { SPINWARD_OBJECTS } from '../../packages/shared/src/content/span/quests/spinward.ts';
import { FAR_SPAN_OBJECTS } from '../../packages/shared/src/content/span/quests/farSpan.ts';
import { DRESSING_THEMES } from '../../packages/shared/src/content/prefabs/types.ts';

registerFurnishingKit({ objects: [...SPINWARD_OBJECTS, ...FAR_SPAN_OBJECTS].map((object) => ({ ...object, furnishing: object.furnishing ?? { mount: 'free', homes: DRESSING_THEMES } })), prefabs: [], signatures: {} });
const EXTRAS: Readonly<Record<string, readonly string[]>> = Object.fromEntries([...new Set([...Object.keys(SPINWARD_EXTRAS), ...Object.keys(FAR_SPAN_EXTRAS)])].map((key) => [key, [...(SPINWARD_EXTRAS[key] ?? []), ...(FAR_SPAN_EXTRAS[key] ?? [])]]));
import { safeNodes } from './safeNodes.ts';
import { lightStreets } from './streetLights.ts';
import { knowSquares, megastructureGround, reservedBy } from './megastructures.ts';

registerFurnishingKit(CITY_KIT);
registerFurnishingKit(LANDMARK_KIT);
registerFurnishingKit(SPAN_KIT);
registerFurnishingKit(WILD_KIT);

const OUT = process.env.SPAN_LAYOUT_OUT ?? join(import.meta.dirname, '../../packages/shared/src/content/districts/layouts');
const land: LandMap = drawLand(parseLandPlan(process.env.SPAN_LAND_IN ? JSON.parse(readFileSync(process.env.SPAN_LAND_IN, 'utf8')) : landSource));

type Placement = { id: string; object: string; at: { room: string; dx: number; dy: number }; facing?: 'north' | 'east' | 'south' | 'west' };

const AMBIENCE: Readonly<Record<string, DistrictLayout['ambience']>> = {
  'kestrel-reach': { darkness: 0.18, tint: '#dfe8f0', fog: '#b8c6d4', sky: '#9ab8d4', weather: ['mist'], haze: 1 },
  'harrow-terraces': { darkness: 0.22, tint: '#e8e0cc', fog: '#c9bfa6', sky: '#c8bc9c', weather: ['dust'], haze: 1 },
  halcyon: { darkness: 0.5, tint: '#4a3a6e', fog: '#3a2c5c', sky: '#4a2e66', weather: ['rain'], haze: 1.2 },
  wreckfield: { darkness: 0.32, tint: '#8a7058', fog: '#7a6450', sky: '#a08466', weather: ['dust', 'embers'], haze: 1.25 },
  'glass-steppe': { darkness: 0.28, tint: '#8c86c0', fog: '#8a82c0', sky: '#a49ad8', weather: ['spores'], haze: 1.05 },
  'the-spindle': { darkness: 0.45, tint: '#5a6c88', fog: '#3c4c66', sky: '#56688a', weather: ['sparks'], haze: 1.25 },
};

const CONDITION: Readonly<Record<string, NonNullable<DistrictLayout['condition']>>> = {
  'kestrel-reach': 'pristine',
  'harrow-terraces': 'overgrown',
  halcyon: 'worn',
  wreckfield: 'breached',
  'glass-steppe': 'alien',
  'the-spindle': 'alien',
};

const WILD_NAMES: Readonly<Record<string, readonly string[]>> = {
  'kestrel-reach': [
    'Kestrel Lawns',
    'Drill Field',
    'Signal Hill',
    'Kestrel Lake',
    'Range Road',
    'Seam Wood',
    'Rim Meadow',
    'White Gate',
    'Parade Ground',
    'Lower Lawns',
    'Firing Line',
    'Quiet Field',
    'Lakeside',
    'Brim Shore',
    'Gull Point',
    'Salt Dunes',
    'Lantern Cove',
    'Muster Field',
    'Kestrel Downs',
    'Saltmarsh',
    'Weir Meadow',
    'Pebble Strand',
    'Long Barrow',
    'Cadet Wood'
  ],
  'harrow-terraces': [
    'Top Terrace',
    'Wheat Steps',
    'Windpump Rise',
    'Barley Steps',
    'Low Furrows',
    'Seed Fields',
    'Tithe Barns',
    'Drovers Way',
    'Mill Steps',
    'Harrow Downs',
    'Bramble Steps',
    'Haycut',
    'Spill Meadows',
    'Fallow Rows',
    'Orchard Edge',
    'Westcliff',
    'Gleaners Bank',
    'High Furrows',
    'Stile Hill',
    'Cider Steps',
    'Hopfield',
    'Harrow Strand',
    'Flank Terraces',
    'Coppice Rise'
  ],
  'halcyon': [
    'Combine Blocks',
    'The Overpass',
    'Undertow',
    'Canal Ward',
    'The Stacks',
    'Holo Gardens',
    'Sprawl North',
    'Sprawl South',
    'Brightside',
    'Gallowglass Fence',
    'Signal Street',
    'Night Market',
    'Chrome Quay',
    'Spire Heights',
    'Low Arcology',
    'Data Docks',
    'Lantern Ward',
    'Pylon Park',
    'The Underpass',
    'Halcyon Strand',
    'Cable Row',
    'Ninth Ward',
    'Mirror Blocks',
    'Glow Terraces',
    'Vat Row',
    'Overlook'
  ],
  'wreckfield': [
    'Hull Shadow',
    'The Bow',
    'Scrap Sea',
    'Bilge Flats',
    'Keel Road',
    'Engine Field',
    'Rivet Dunes',
    'Slag Plain',
    'Tallow Approach',
    'Reactor Scar',
    'Cargo Spill',
    'Hatch Fields',
    'Wreck Rim',
    'Gantry Flats',
    'Sternward',
    'Crater Shore',
    'Boiler Bay',
    'Ballast Strand',
    'Fuel Marsh',
    'Lifeboat Row',
    'Mast Field'
  ],
  'glass-steppe': [
    'Hymn Road',
    'Vesper Approach',
    'Prism Fields',
    'Silent Rise',
    'Glass Rim',
    'The Lens',
    'Choir Road',
    'Refraction Moor',
    'Bell Heath',
    'Pilgrim Steps',
    'Shining Downs',
    'Candle Flats',
    'Echo Plain',
    'Hollow Pylons',
    'Vigil Fields',
    'Mirror Mere',
    'Antiphon Ridge',
    'Cantor Heath',
    'Drop Edge',
    'Glass Strand',
    'Litany Fields',
    'Pale Steppe',
    'Shard Gate',
    'Steppe Foot',
    'Tuning Fields'
  ],
  'the-spindle': [
    'Null Approach',
    'Coolant Flats',
    'Needle Foot',
    'Grate Fields',
    'Final Seam',
    'Spindle Rim',
    'Plating Road',
    'The Terminus',
    'Last Light',
    'Summit Road',
    'Crown Plating',
    'Coolant Stair',
    'Inverse Field',
    'Quiet Peaks',
    'Axle Flats',
    'Hush Plateau',
    'Spindle Crown',
    'White Noise',
    'Sealed Ground',
    'Antenna Field'
  ]
};

const PROPS: Readonly<Record<string, readonly string[]>> = {
  'kestrel-reach': ['street-tree', 'bollard', 'flood-mast', 'litter-bin', 'street-tree', 'checkpoint-barrier'],
  'harrow-terraces': ['windpump', 'washing-line', 'utility-pole', 'burn-barrel', 'street-tree', 'barricade'],
  halcyon: ['holo-billboard', 'food-stall', 'parked-car', 'steam-vent', 'bollard', 'litter-bin', 'utility-pole'],
  wreckfield: ['burn-barrel', 'barricade', 'utility-pole', 'magnet-crane', 'burn-barrel', 'parked-car'],
  'glass-steppe': ['precursor-pylon', 'ledge-milestone', 'barricade', 'flood-mast', 'burn-barrel'],
  'the-spindle': ['flood-mast', 'checkpoint-barrier', 'barricade', 'precursor-pylon', 'steam-vent'],
};

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

const LARGE = new Set(['hull-knocker']);

const NODES_BY_TIER: Readonly<Record<number, readonly string[]>> = {
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

const FOOTPRINTS: Readonly<Record<string, readonly [number, number]>> = {
  'food-stall': [2, 1], 'parked-car': [2, 1], 'magnet-crane': [2, 2], 'scrap-heap': [2, 2], windpump: [2, 2], dumpster: [2, 1], 'market-stall': [2, 1],
};

const kebab = (name: string): string => name.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

interface Cut {
  readonly column: number;
  readonly row: number;
  readonly region: string;
  readonly walkable: number;
}

function cuts(): Cut[] {
  const out: Cut[] = [];
  for (let row = 0; row < land.plan.rows; row++) {
    for (let column = 0; column < land.plan.columns; column++) {
      let count = 0;
      const wards = new Set<string>();
      for (let y = 0; y < SQUARE; y++) for (let x = 0; x < SQUARE; x++) {
        const point = { x: column * SQUARE + x, y: row * SQUARE + y };
        if (!TILE_KINDS[land.tileAt(point)].walkable) continue;
        count++;
        wards.add(land.wardAt(point) ?? 'none');
      }
      if (count === 0) continue;
      if (wards.size !== 1) throw new Error('square ' + column + ',' + row + ' crosses wards ' + [...wards].join(' '));
      if (count < 40) throw new Error('square ' + column + ',' + row + ' is a sliver of ' + count + ' tiles');
      out.push({ column, row, region: [...wards][0]!, walkable: count });
    }
  }
  return out;
}

const all = cuts();
const nameIndex = new Map<string, number>();
const usedIds = new Set<string>();

function nameFor(cut: Cut, place: PlaceSquare | undefined): { id: string; name: string } {
  if (place) return { id: place.id, name: place.name };
  const pinned = WILD_PINS[cut.column + ',' + cut.row];
  if (pinned) return { id: kebab(pinned), name: pinned };
  const pinnedNames = new Set(Object.values(WILD_PINS));
  const pool = (WILD_NAMES[cut.region] ?? ['Wilds']).filter((entry) => !pinnedNames.has(entry));
  for (;;) {
    const index = nameIndex.get(cut.region) ?? 0;
    nameIndex.set(cut.region, index + 1);
    const base = pool[index % pool.length]!;
    const name = index < pool.length ? base : base + ' ' + ['II', 'III', 'IV', 'V'][Math.floor(index / pool.length) - 1];
    const id = kebab(name);
    if (!usedIds.has(id)) return { id, name };
  }
}

const NAMES = new Map(all.map((cut) => {
  const named = nameFor(cut, PLACE_SPECS[placeAt(cut.column, cut.row)?.id ?? '']);
  usedIds.add(named.id);
  return [cut, named] as const;
}));
knowSquares([...NAMES].map(([cut, named]) => [named.id, { column: cut.column, row: cut.row }] as const));

function layoutFor(cut: Cut): DistrictLayout {
  const key = cut.column + ',' + cut.row;
  const place = PLACE_SPECS[placeAt(cut.column, cut.row)?.id ?? ''];
  const station = placeAt(cut.column, cut.row)?.station;
  const { id, name } = NAMES.get(cut)!;
  const giants = megastructureGround(cut);
  const tier = TIERS.get(key)!;
  const region = REGIONS.find((entry) => entry.id === cut.region)!;
  const next = random(cut.column * 977 + cut.row * 131 + 7);
  const steps: DistrictLayout['steps'] = [];
  const dressing: DistrictLayout['dressing'] = { ground: { theme: 'street', people: 0 } };
  const areas: DistrictLayout['areas'] = [];
  const objects: Placement[] = [];
  const npcs: DistrictLayout['npcs'] = [];
  const creatures: DistrictLayout['creatures'] = [];
  const setPieces: DistrictLayout['setPieces'] = [];
  const anchors: DistrictLayout['anchors'] = {};
  const buildings: readonly BuildingSpec[] = place?.buildings ?? [];
  const assemblies: NonNullable<DistrictLayout['assemblies']>[number][] = [];
  const elites: DistrictLayout['creatures'] = [];
  const fittings: { after: string; placement: Placement }[] = [];
  if (station) {
    steps.push({ kind: 'building', id: 'tram-terminal', rect: { x: TERMINAL.x, y: TERMINAL.y, width: TERMINAL.width, height: TERMINAL.height }, floor: 'terrazzo', wall: 'wall', doors: [{ side: 'north', width: 2, offset: TERMINAL.door - TERMINAL.x }] });
    steps.push({ kind: 'track', points: [{ x: 0, y: STATION_TRACK_ROW }, { x: SQUARE - 2, y: STATION_TRACK_ROW }] });
    areas.push({ room: 'tram-terminal', name: station.name + ' Station', safe: true });
    dressing['tram-terminal'] = { theme: 'transit', people: 0 };
    assemblies.push({ id: id + '-tram-car', assembly: 'tram-car', at: { room: 'tram-terminal', dx: TERMINAL.door - TERMINAL.x - 2, dy: STATION_TRACK_ROW - TERMINAL.y } });
    objects.push({ id: id + '-departure-board', object: 'departure-board', at: { room: 'tram-terminal', dx: 4, dy: 0 }, facing: 'south' });
    objects.push({ id: id + '-terminal-bench', object: 'street-bench', at: { room: 'tram-terminal', dx: 26, dy: 0 }, facing: 'south' });
    anchors.tramPlatform = { room: 'tram-terminal', dx: TERMINAL.door - TERMINAL.x, dy: 1 };
  }
  for (const building of buildings) {
    steps.push({ kind: 'building', id: building.id, rect: { x: building.x, y: building.y, width: building.w, height: building.h }, floor: building.floor, wall: building.wall, ...(building.edge ? { edge: building.edge } : {}), doors: [{ side: building.door ?? 'south', width: 2 }] });
    areas.push({ room: building.id, name: building.name, ...(building.safe ? { safe: true } : { safe: false }), ...(building.multiCombat ? { multiCombat: true } : {}) });
    dressing[building.id] = { theme: building.theme, ...(building.also ? { also: [...building.also] } : {}), people: 0 };
    const recipe = recipeOf(building);
    recipe.objects.forEach((object, index) => objects.push({ id: building.id + '-' + object.object + '-' + index, object: object.object, at: { room: building.id, dx: object.dx, dy: object.dy }, ...(object.facing ? { facing: object.facing } : {}) }));
    recipe.npcs.forEach((npc) => npcs.push({ id: building.id + '-' + npc.npc, npc: npc.npc, at: { room: building.id, dx: npc.dx, dy: npc.dy } }));
    recipe.creatures.forEach((creature, index) => creatures.push({ id: building.id + '-' + creature.creature + '-' + index, creature: creature.creature, at: { room: building.id, dx: creature.dx, dy: creature.dy } }));
    recipe.elites.forEach((creature, index) => elites.push({ id: building.id + '-' + creature.creature + '-' + index, creature: creature.creature, at: { room: building.id, dx: creature.dx, dy: creature.dy } }));
    recipe.late.forEach((object, index) => fittings.push({ after: building.id + '-' + recipe.objects[object.after]!.object + '-' + object.after, placement: { id: building.id + '-' + object.object + '-' + (recipe.objects.length + index), object: object.object, at: { room: building.id, dx: object.dx, dy: object.dy }, ...(object.facing ? { facing: object.facing } : {}) } }));
    for (const [anchor, at] of Object.entries(recipe.anchors)) anchors[anchor] = { room: building.id, dx: at.dx, dy: at.dy };
  }
  const groundSafe = place?.groundSafe ?? false;
  areas.unshift({ room: 'ground', name, ...(groundSafe ? { safe: true } : {}) });

  const base: DistrictLayout = DISTRICT_LAYOUT_SCHEMA.parse({
    id,
    name,
    subtitle: place?.subtitle ?? 'The Span, ' + region.name,
    tier,
    region: cut.region,
    condition: place?.condition ?? CONDITION[cut.region],
    ambience: AMBIENCE[cut.region],
    size: { width: SQUARE, height: SQUARE },
    square: { column: cut.column, row: cut.row },
    steps,
    tiles: [],
    areas,
    anchors: { start: { room: 'ground', dx: 32, dy: 32 } },
    objects: [],
    assemblies: [],
    npcs: [],
    creatures: [],
    lights: [],
    decals: [],
    setPieces: [],
    dressing,
    furnish: {},
  });
  const map = parseTileLayout(buildDistrictMap(base));
  const inBuilding = (x: number, y: number): boolean => buildings.some((b) => x >= b.x - 1 && y >= b.y - 1 && x <= b.x + b.w && y <= b.y + b.h);
  const doorTiles = buildings.map((b) => ({ x: b.x + Math.floor((b.w - 2) / 2) + 0.5, y: (b.door ?? 'south') === 'south' ? b.y + b.h : b.y - 1 }));
  const walkableAt = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < SQUARE && y < SQUARE && TILE_KINDS[map.tileAt({ x, y })].walkable && map.tileAt({ x, y }) !== 'door';
  const taken: { x: number; y: number; r: number }[] = [];
  const clear = (x: number, y: number, w: number, h: number, ring: number): boolean => {
    for (let dy = -ring; dy < h + ring; dy++) for (let dx = -ring; dx < w + ring; dx++) {
      if (!walkableAt(x + dx, y + dy) || inBuilding(x + dx, y + dy) || reservedBy(giants, x + dx, y + dy)) return false;
    }
    if (doorTiles.some((door) => Math.abs(door.x - x) < 5 && Math.abs(door.y - y) < 5)) return false;
    if (x < 3 || y < 3 || x + w > SQUARE - 3 || y + h > SQUARE - 3) return false;
    return true;
  };
  const free = (x: number, y: number, spacing: number): boolean => taken.every((other) => Math.hypot(other.x - x, other.y - y) >= Math.max(spacing, other.r));
  const pick = (w: number, h: number, ring: number, spacing: number, near?: { x: number; y: number; r: number }): { x: number; y: number } | undefined => {
    for (let attempt = 0; attempt < 600; attempt++) {
      const x = near ? Math.round(near.x + (next() * 2 - 1) * near.r) : 3 + Math.floor(next() * (SQUARE - 6));
      const y = near ? Math.round(near.y + (next() * 2 - 1) * near.r) : 3 + Math.floor(next() * (SQUARE - 6));
      if (!clear(x, y, w, h, ring) || !free(x, y, spacing)) continue;
      return { x, y };
    }
    return undefined;
  };
  const putObject = (object: string, spacing: number, facing?: Placement['facing'], near?: { x: number; y: number; r: number }): boolean => {
    const [w, h] = FOOTPRINTS[object] ?? [1, 1];
    const spot = pick(w, h, 2, spacing, near);
    if (!spot) return false;
    taken.push({ ...spot, r: spacing });
    objects.push({ id: id + '-' + object + '-' + objects.length, object, at: { room: 'ground', dx: spot.x, dy: spot.y }, ...(facing ? { facing } : {}) });
    return true;
  };

  for (const building of buildings) taken.push({ x: building.x + building.w / 2, y: building.y + building.h / 2, r: Math.max(building.w, building.h) / 2 + 2 });

  if (place?.landmark) {
    const spot = place.landmark.at;
    setPieces.push({ id: id + '-landmark', prefab: place.landmark.prefab, at: { room: 'ground', dx: spot.x, dy: spot.y }, facing: 'south' });
    taken.push({ x: spot.x + 1, y: spot.y + 1, r: 5 });
  }

  const props = PROPS[cut.region] ?? [];
  const propCount = place ? 6 : 4;
  for (let index = 0; index < propCount; index++) putObject(props[Math.floor(next() * props.length)]!, 6);
  putObject('barricade', 6);
  if (place?.groundSafe || cut.region === 'kestrel-reach') for (let index = 0; index < (place ? 3 : 1); index++) putObject('street-bench', 6, 'south');

  for (const bridge of BRIDGE_PLANS_FOR_LAND) {
    const bx = bridge.x - cut.column * SQUARE;
    const by = bridge.y - cut.row * SQUARE;
    if (bx < 0 || by < 0 || bx >= SQUARE || by >= SQUARE) continue;
    assemblies.push(bridge.horizontal
      ? { id: id + '-bridge-' + assemblies.length, assembly: 'bridge', at: { room: 'ground', dx: bx, dy: by - 1 }, span: 2 }
      : { id: id + '-bridge-' + assemblies.length, assembly: 'bridge', at: { room: 'ground', dx: bx - 1, dy: by }, facing: 'east', span: 2 });
    taken.push({ x: bx + 1, y: by + 1, r: 4 });
  }

  for (const extra of EXTRAS[id] ?? []) if (!putObject(extra, 5)) throw new Error(id + ': nowhere to stand ' + extra);

  const hostileGround = !groundSafe;
  if (hostileGround && (place?.wildlife ?? true)) {
    const nodeKinds = NODES_BY_TIER[tier] ?? [];
    const nodeCount = place ? 2 : 3;
    for (let index = 0; index < nodeCount; index++) putObject(nodeKinds[(index + cut.row + cut.column) % nodeKinds.length]!, 6);
    let hostileTiles = 0;
    for (let y = 0; y < SQUARE; y++) for (let x = 0; x < SQUARE; x++) if (walkableAt(x, y) && !inBuilding(x, y)) hostileTiles++;
    const pool = place?.creatures ?? CREATURES_BY_TIER[tier] ?? [];
    const target = Math.max(0, Math.round((hostileTiles * (place ? 4 : 4.5)) / 1000));
    let placed = 0;
    for (let index = 0; index < target * 3 && placed < target; index++) {
      const creature = pool[placed % pool.length]!;
      const size = LARGE.has(creature) ? 2 : 1;
      const spot = pick(size, size, 1, 5);
      if (!spot) continue;
      taken.push({ ...spot, r: 5 });
      creatures.push({ id: id + '-' + creature + '-' + placed, creature, at: { room: 'ground', dx: spot.x, dy: spot.y } });
      placed++;
    }
  }

  const startSpot = place?.start ?? pick(1, 1, 1, 2);
  if (!startSpot) throw new Error(id + ': no start tile');
  anchors.start = { room: 'ground', dx: startSpot.x, dy: startSpot.y };
  for (const [anchor, at] of Object.entries(place?.anchors ?? {})) anchors[anchor] = { room: 'ground', dx: at.x, dy: at.y };

  for (const fitting of fittings) objects.splice(objects.findIndex((object) => object.id === fitting.after) + 1, 0, fitting.placement);

  return DISTRICT_LAYOUT_SCHEMA.parse({
    ...base,
    anchors,
    objects,
    npcs,
    creatures: [...elites, ...creatures],
    setPieces,
    assemblies,
    furnish: place?.landmark ? { landmarks: ['ground'] } : {},
  });
}

function swapPacks(layout: DistrictLayout): DistrictLayout {
  const swaps = WILD_PACKS[layout.id];
  if (!swaps) return layout;
  const generated = new RegExp('^' + layout.id + '-(.+)-([0-9]+)$');
  return {
    ...layout,
    creatures: layout.creatures.map((creature) => {
      const match = generated.exec(creature.id);
      const kind = swaps[creature.creature];
      if (!match || match[1] !== creature.creature || kind === undefined) return creature;
      return { ...creature, id: layout.id + '-' + kind + '-' + match[2], creature: kind };
    }),
  };
}

function overridden(layout: DistrictLayout): DistrictLayout {
  const override = WILD_OVERRIDES[layout.id];
  if (!override?.omit && !override?.place) return layout;
  const omit = new Set(override.omit ?? []);
  const place = <T extends { id: string; at: DistrictLayout['objects'][number]['at'] }>(entry: T): T => {
    const spot = override.place?.[entry.id];
    return spot ? { ...entry, at: { room: 'ground', dx: spot.x, dy: spot.y } } : entry;
  };
  return { ...layout, objects: layout.objects.filter((object) => !omit.has(object.id)).map(place), creatures: layout.creatures.filter((creature) => !omit.has(creature.id)).map(place) };
}

function dressSquare(cut: Cut): DistrictLayout {
  const layout = layoutFor(cut);
  if (WILD_OVERRIDES[layout.id]?.packFirst) return safeNodes(overridden(dressWild(overridden(swapPacks(safeNodes(layout, land))), land)), land);
  return safeNodes(overridden(swapPacks(safeNodes(dressWild(layout, land), land))), land);
}

function buildDistrictMap(layout: DistrictLayout): readonly string[] {
  return buildDistrict(layout, land, {}).map;
}

for (const file of readdirSync(OUT)) if (file.endsWith('.json')) unlinkSync(join(OUT, file));
const written: { id: string; kind: 'square' | 'below' }[] = [];
for (const cut of all) {
  const layout = lightStreets(withQuestPlacements(dressSquare(cut)), land);
  writeFileSync(join(OUT, layout.id + '.json'), printLayout(layout));
  written.push({ id: layout.id, kind: 'square' });
}
for (const source of BELOW) {
  const layout = withQuestPlacements(safeNodes(DISTRICT_LAYOUT_SCHEMA.parse(source)));
  writeFileSync(join(OUT, layout.id + '.json'), printLayout(layout));
  written.push({ id: layout.id, kind: 'below' });
}

const camel = (id: string): string => id.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase()).replace(/^([0-9])/, '_$1');
const imports = written.map((entry) => "import " + camel(entry.id) + " from './" + entry.id + ".json' with { type: 'json' };").join('\n');
writeFileSync(join(OUT, 'index.ts'), "import type { DistrictId } from '../../../ids.ts';\n" + imports + '\n\nexport const LAYOUT_SOURCES: Readonly<Record<DistrictId, unknown>> = {\n' + written.map((entry) => "  '" + entry.id + "': " + camel(entry.id) + ',').join('\n') + '\n};\n\nexport const SQUARE_LAYOUT_IDS: readonly DistrictId[] = [\n' + written.filter((entry) => entry.kind === 'square').map((entry) => "  '" + entry.id + "',").join('\n') + '\n];\n\nexport const BELOW_LAYOUT_IDS: readonly DistrictId[] = [\n' + written.filter((entry) => entry.kind === 'below').map((entry) => "  '" + entry.id + "',").join('\n') + '\n];\n');
console.log(written.length + ' layouts: ' + written.map((entry) => entry.id).join(' '));
void readFileSync;
void ({} as TileKindId);
