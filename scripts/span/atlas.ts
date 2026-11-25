export const SQUARE = 64;
export const LAND_ID = 'the-span';

export const GRID: readonly string[] = [
  '..................',
  '..CCCCCCCCWWWWWW..',
  '.CCCCCCCCCWWWWWWW.',
  '.CCCCCCCCCWWWWWWW.',
  '.HHHH#######GGGGG.',
  '.HHHH##SSSSS#GGGG.',
  '.HHHH#SSSSSSGGGGG.',
  '.HHHH#SSSSSS#GGGG.',
  '..HHH##SSSS##GGGG.',
  '..HHK#######~GGG..',
  '..KKKKKKK~~~GGG...',
  '..KKKKKKK~~.GG....',
  '...KKKKK..........',
  '..................',
];

export const COLUMNS = GRID[0]!.length;
export const ROWS = GRID.length;
export const WIDTH = SQUARE * COLUMNS;
export const HEIGHT = SQUARE * ROWS;

export interface RegionSpec {
  readonly code: string;
  readonly id: string;
  readonly name: string;
  readonly tiers: readonly [number, number];
  readonly relief: readonly [number, number];
  readonly scale: number;
  readonly ground: 'grass' | 'soil' | 'asphalt' | 'gravel' | 'concrete';
  readonly shore: 'gravel' | 'dirt';
}

export const REGIONS: readonly RegionSpec[] = [
  { code: 'K', id: 'kestrel-reach', name: 'Kestrel Reach', tiers: [1, 2], relief: [1, 12], scale: 46, ground: 'grass', shore: 'gravel' },
  { code: 'H', id: 'harrow-terraces', name: 'Harrow Terraces', tiers: [3, 5], relief: [2, 13], scale: 40, ground: 'grass', shore: 'gravel' },
  { code: 'C', id: 'halcyon', name: 'Halcyon', tiers: [6, 7], relief: [3, 10], scale: 70, ground: 'asphalt', shore: 'gravel' },
  { code: 'W', id: 'wreckfield', name: 'the Wreckfield', tiers: [8, 9], relief: [1, 8], scale: 36, ground: 'gravel', shore: 'dirt' },
  { code: 'G', id: 'glass-steppe', name: 'the Glass Steppe', tiers: [10, 11], relief: [3, 13], scale: 44, ground: 'soil', shore: 'gravel' },
  { code: 'S', id: 'the-spindle', name: 'the Spindle', tiers: [12, 13], relief: [10, 13], scale: 32, ground: 'concrete', shore: 'gravel' },
];

export const MASSIF = '#';
export const SEA = '.';
export const DROP = '~';

export const codeAt = (column: number, row: number): string => GRID[row]?.[column] ?? SEA;
export const regionOfCode = (code: string): RegionSpec | undefined => REGIONS.find((region) => region.code === code);
export const regionAtSquare = (column: number, row: number): RegionSpec | undefined => regionOfCode(codeAt(column, row));
export const regionById = (id: string): RegionSpec => {
  const found = REGIONS.find((region) => region.id === id);
  if (!found) throw new Error('no region ' + id);
  return found;
};

export type PlaceKind = 'site' | 'hub' | 'town';
export type PadTile = 'paving' | 'concrete' | 'asphalt' | 'gravel' | 'rust' | 'plating' | 'terrazzo';

export interface PlaceSpec {
  readonly id: string;
  readonly column: number;
  readonly row: number;
  readonly kind: PlaceKind;
  readonly pad: PadTile;
  readonly station?: { readonly id: string; readonly name: string };
  readonly tier?: number;
}

export const PLACES: readonly PlaceSpec[] = [
  { id: 'site-kestrel', column: 5, row: 10, kind: 'site', pad: 'concrete', tier: 1 },
  { id: 'kestrel-commons', column: 5, row: 11, kind: 'hub', pad: 'paving', station: { id: 'kestrel-commons-station', name: 'Kestrel Commons' } },
  { id: 'recruit-lines', column: 4, row: 10, kind: 'town', pad: 'paving' },
  { id: 'harrowgate', column: 2, row: 6, kind: 'hub', pad: 'paving', station: { id: 'harrowgate-halt', name: 'Harrowgate Halt' } },
  { id: 'harrow-lanes', column: 2, row: 7, kind: 'town', pad: 'gravel' },
  { id: 'site-orchard', column: 4, row: 5, kind: 'site', pad: 'concrete', tier: 5 },
  { id: 'neon-row', column: 5, row: 2, kind: 'hub', pad: 'asphalt', station: { id: 'neon-row-station', name: 'Neon Row' } },
  { id: 'spire-plaza', column: 5, row: 1, kind: 'town', pad: 'asphalt' },
  { id: 'ninth-street', column: 6, row: 1, kind: 'town', pad: 'asphalt' },
  { id: 'glasshouse-alley', column: 5, row: 3, kind: 'town', pad: 'asphalt' },
  { id: 'site-gallowglass', column: 7, row: 3, kind: 'site', pad: 'concrete', tier: 7 },
  { id: 'rustwater', column: 12, row: 2, kind: 'hub', pad: 'rust', station: { id: 'rustwater-station', name: 'Rustwater' } },
  { id: 'site-tallow', column: 15, row: 2, kind: 'site', pad: 'concrete', tier: 9 },
  { id: 'the-choir', column: 14, row: 6, kind: 'hub', pad: 'gravel', station: { id: 'choir-halt', name: 'the Choir' } },
  { id: 'site-vesper', column: 15, row: 8, kind: 'site', pad: 'concrete', tier: 11 },
  { id: 'last-post', column: 10, row: 6, kind: 'hub', pad: 'concrete', station: { id: 'last-post-funicular', name: 'Last Post' } },
  { id: 'site-null', column: 7, row: 6, kind: 'site', pad: 'plating', tier: 13 },
];

export const placeAt = (column: number, row: number): PlaceSpec | undefined => PLACES.find((place) => place.column === column && place.row === row);
export const placeById = (id: string): PlaceSpec => {
  const found = PLACES.find((place) => place.id === id);
  if (!found) throw new Error('no place ' + id);
  return found;
};

export const PAD_INSET = 6;
export const padOf = (place: PlaceSpec): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } => ({
  x: place.column * SQUARE + PAD_INSET,
  y: place.row * SQUARE + PAD_INSET,
  width: SQUARE - 2 * PAD_INSET,
  height: SQUARE - 2 * PAD_INSET,
});

export const HULL = { x: 14 * SQUARE + 6, y: 3 * SQUARE + 12, width: 2 * SQUARE + 30, height: 26 };

export const STATION_TRACK_ROW = 52;
export const TERMINAL = { x: 14, y: 49, width: 36, height: 5, door: 30 };

export interface RailPoint {
  readonly x: number;
  readonly y: number;
}

const stationRow = (row: number): number => row * SQUARE + STATION_TRACK_ROW;

export const RAIL: readonly (readonly RailPoint[])[] = [
  [
    { x: 6 * SQUARE + 40, y: stationRow(11) },
    { x: 3 * SQUARE + 20, y: stationRow(11) },
    { x: 3 * SQUARE + 20, y: stationRow(6) },
    { x: 1 * SQUARE + 20, y: stationRow(6) },
    { x: 1 * SQUARE + 20, y: stationRow(2) },
    { x: 13 * SQUARE + 40, y: stationRow(2) },
    { x: 13 * SQUARE + 40, y: stationRow(6) },
    { x: 15 * SQUARE + 30, y: stationRow(6) },
  ],
  [
    { x: 13 * SQUARE + 40, y: stationRow(6) },
    { x: 9 * SQUARE + 20, y: stationRow(6) },
  ],
];

export const TRAM_LINES: readonly { readonly id: string; readonly name: string; readonly color: string; readonly stations: readonly string[] }[] = [
  { id: 'ring-line', name: 'Ring Line', color: '#4fd8ff', stations: ['kestrel-commons-station', 'harrowgate-halt', 'neon-row-station', 'rustwater-station', 'choir-halt'] },
  { id: 'spindle-funicular', name: 'Spindle Funicular', color: '#ffb347', stations: ['choir-halt', 'last-post-funicular'] },
];

export const SEAM_HALF = 3;

export interface SeamSpec {
  readonly between: readonly [string, string];
  readonly gates: readonly string[];
}

export const SEAMS: readonly SeamSpec[] = [
  { between: ['K', 'H'], gates: ['kestrel-north-gate', 'kestrel-gate', 'kestrel-south-gate'] },
  { between: ['H', 'C'], gates: ['harrow-north-gate', 'harrow-gate', 'harrow-south-gate'] },
  { between: ['C', 'W'], gates: ['halcyon-north-gate', 'halcyon-gate', 'halcyon-south-gate'] },
  { between: ['W', 'G'], gates: ['wreck-north-gate', 'wreck-gate', 'wreck-south-gate'] },
  { between: ['G', 'S'], gates: ['steppe-north-gate', 'steppe-gate', 'steppe-south-gate'] },
];

export const WILD_PINS: Readonly<Record<string, string>> = {
  '3,8': 'Sluice Row',
  '4,2': 'Arcade Mile',
  '13,7': 'Glass Flats',
  '14,8': 'Pylon Walk',
  '13,9': 'Shard Moor',
};

export function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export const landSquares = (): { readonly column: number; readonly row: number; readonly region: RegionSpec }[] => {
  const out: { column: number; row: number; region: RegionSpec }[] = [];
  for (let row = 0; row < ROWS; row++) for (let column = 0; column < COLUMNS; column++) {
    const region = regionAtSquare(column, row);
    if (region) out.push({ column, row, region });
  }
  return out;
};

export function squareTiers(): Map<string, number> {
  const start = placeById('site-kestrel');
  const distance = new Map<string, number>([[start.column + ',' + start.row, 0]]);
  const queue: [number, number][] = [[start.column, start.row]];
  for (let head = 0; head < queue.length; head++) {
    const [column, row] = queue[head]!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const key = column + dx + ',' + (row + dy);
      if (distance.has(key) || !regionAtSquare(column + dx, row + dy)) continue;
      distance.set(key, distance.get(column + ',' + row)! + 1);
      queue.push([column + dx, row + dy]);
    }
  }
  const tiers = new Map<string, number>();
  for (const region of REGIONS) {
    const squares = landSquares().filter((square) => square.region === region);
    const values = squares.map((square) => distance.get(square.column + ',' + square.row) ?? 0);
    const low = Math.min(...values);
    const high = Math.max(...values);
    const [first, last] = region.tiers;
    for (const square of squares) {
      const share = high === low ? 0 : ((distance.get(square.column + ',' + square.row) ?? 0) - low) / (high - low);
      const pinned = placeAt(square.column, square.row)?.tier;
      tiers.set(square.column + ',' + square.row, pinned ?? Math.min(last, first + Math.floor(share * (last - first + 1))));
    }
  }
  const ordered = [...distance].sort((a, b) => a[1] - b[1]);
  for (const [key, steps] of ordered) {
    const [column, row] = key.split(',').map(Number) as [number, number];
    let floor = tiers.get(key) ?? 1;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const near = column + dx + ',' + (row + dy);
      if ((distance.get(near) ?? Infinity) < steps) floor = Math.max(floor, tiers.get(near) ?? 1);
    }
    tiers.set(key, floor);
  }
  return tiers;
}
