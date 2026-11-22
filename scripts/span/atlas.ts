export const SQUARE = 64;
export const COLUMNS = 16;
export const ROWS = 6;
export const WIDTH = SQUARE * COLUMNS;
export const HEIGHT = SQUARE * ROWS;
export const LAND_ID = 'the-span';
export const BASE_HEIGHT = 2;

export interface RegionSpec {
  readonly id: string;
  readonly name: string;
  readonly from: number;
  readonly to: number;
}

export const REGIONS: readonly RegionSpec[] = [
  { id: 'kestrel-reach', name: 'Kestrel Reach', from: 0, to: 192 },
  { id: 'harrow-terraces', name: 'Harrow Terraces', from: 192, to: 384 },
  { id: 'halcyon', name: 'Halcyon', from: 384, to: 576 },
  { id: 'wreckfield', name: 'the Wreckfield', from: 576, to: 768 },
  { id: 'glass-steppe', name: 'the Glass Steppe', from: 768, to: 896 },
  { id: 'the-spindle', name: 'the Spindle', from: 896, to: 1024 },
];

export const COLUMN_TIERS: readonly number[] = [1, 1, 2, 3, 4, 5, 6, 7, 7, 8, 9, 9, 10, 11, 12, 13];

export const SEAM_HALF = 3;

export interface GateSpec {
  readonly id: string;
  readonly seam: number;
  readonly y: number;
}

export const GATES: readonly GateSpec[] = [
  { id: 'kestrel-north-gate', seam: 192, y: 70 },
  { id: 'kestrel-gate', seam: 192, y: 262 },
  { id: 'kestrel-south-gate', seam: 192, y: 334 },
  { id: 'harrow-north-gate', seam: 384, y: 92 },
  { id: 'harrow-gate', seam: 384, y: 258 },
  { id: 'harrow-south-gate', seam: 384, y: 330 },
  { id: 'halcyon-north-gate', seam: 576, y: 76 },
  { id: 'halcyon-gate', seam: 576, y: 222 },
  { id: 'halcyon-south-gate', seam: 576, y: 326 },
  { id: 'wreck-north-gate', seam: 768, y: 90 },
  { id: 'wreck-gate', seam: 768, y: 236 },
  { id: 'wreck-south-gate', seam: 768, y: 312 },
  { id: 'steppe-north-gate', seam: 896, y: 102 },
  { id: 'steppe-gate', seam: 896, y: 190 },
  { id: 'steppe-south-gate', seam: 896, y: 296 },
];

export type PlaceKind = 'site' | 'hub' | 'town';

export interface PlaceSpec {
  readonly column: number;
  readonly row: number;
  readonly kind: PlaceKind;
  readonly pad: 'paving' | 'concrete' | 'asphalt' | 'gravel' | 'rust' | 'plating' | 'terrazzo';
  readonly rect?: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly height?: number;
}

export const PLACES: readonly PlaceSpec[] = [
  { column: 1, row: 2, kind: 'site', pad: 'concrete' },
  { column: 1, row: 3, kind: 'hub', pad: 'paving' },
  { column: 0, row: 3, kind: 'town', pad: 'paving' },
  { column: 4, row: 3, kind: 'hub', pad: 'paving' },
  { column: 4, row: 4, kind: 'town', pad: 'gravel' },
  { column: 4, row: 0, kind: 'site', pad: 'concrete', rect: { x: 262, y: 28, width: 52, height: 32 }, height: 7 },
  { column: 6, row: 2, kind: 'town', pad: 'asphalt' },
  { column: 7, row: 2, kind: 'town', pad: 'asphalt' },
  { column: 7, row: 3, kind: 'hub', pad: 'asphalt' },
  { column: 6, row: 3, kind: 'town', pad: 'asphalt' },
  { column: 8, row: 2, kind: 'site', pad: 'concrete' },
  { column: 9, row: 3, kind: 'hub', pad: 'rust' },
  { column: 11, row: 4, kind: 'site', pad: 'concrete' },
  { column: 12, row: 2, kind: 'hub', pad: 'gravel' },
  { column: 13, row: 4, kind: 'site', pad: 'concrete' },
  { column: 14, row: 3, kind: 'hub', pad: 'concrete' },
  { column: 15, row: 2, kind: 'site', pad: 'plating' },
];

export const regionAt = (x: number): RegionSpec => {
  const found = REGIONS.find((region) => x >= region.from && x < region.to);
  if (!found) throw new Error('no region at x ' + x);
  return found;
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

export const spillY = (x: number): number => {
  const ramp = (value: number): number => Math.max(0, Math.min(1, value));
  const detour = 52 * ramp((x - 176) / 24) * ramp((400 - x) / 24);
  return 156 + 14 * Math.sin(x / 70) + 5 * Math.sin(x / 23) + detour;
};

export const padOf = (place: PlaceSpec): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } =>
  place.rect ?? { x: place.column * SQUARE + 6, y: place.row * SQUARE + 6, width: SQUARE - 12, height: SQUARE - 12 };

export const padHeightOf = (place: PlaceSpec): number => place.height ?? (place.column >= 6 && place.column <= 8 ? 3 : BASE_HEIGHT);
