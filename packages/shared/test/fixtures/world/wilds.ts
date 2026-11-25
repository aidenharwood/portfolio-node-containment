import { drawLand, type LandMap, type LandPlan } from '../../../src/world/landPlan.ts';
import { anchorsOf, buildDistrict, parseLayout } from '../../../src/world/layout.ts';
import type { DistrictLayout } from '../../../src/world/layoutSchema.ts';
import './districts.ts';

export const FIXTURE_LAND_PLAN: LandPlan = {
  id: 'fx-land',
  squareSize: 32,
  columns: 4,
  rows: 1,
  steps: [
    { kind: 'fill', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 128, height: 32 } }, tile: 'water' },
    {
      kind: 'fill',
      shape: {
        kind: 'polygon',
        points: [
          { x: 2, y: 3 },
          { x: 40, y: 2 },
          { x: 96, y: 2 },
          { x: 96, y: 30 },
          { x: 50, y: 29 },
          { x: 2, y: 30 },
        ],
      },
      tile: 'grass',
    },
    { kind: 'rise', shape: { kind: 'round', rect: { x: 24, y: 10, width: 16, height: 12 } }, height: 1 },
    {
      kind: 'line',
      points: [
        { x: 48, y: 13 },
        { x: 48, y: 18 },
      ],
      width: 1,
      tile: 'brick',
    },
    { kind: 'gate', id: 'fx-wall-gate', rect: { x: 48, y: 15, width: 1, height: 2 }, tile: 'door' },
    { kind: 'ward', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 48, height: 32 } }, ward: 'fx-home' },
    { kind: 'ward', shape: { kind: 'rect', rect: { x: 48, y: 0, width: 80, height: 32 } }, ward: 'fx-far' },
  ],
};

export const FIXTURE_LAND: LandMap = drawLand(FIXTURE_LAND_PLAN);

export const FIXTURE_WILDS_LAYOUTS = new Map<string, DistrictLayout>();

const build = (source: unknown) => {
  const layout = parseLayout(source);
  FIXTURE_WILDS_LAYOUTS.set(layout.id, layout);
  return buildDistrict(layout, FIXTURE_LAND);
};

const AMBIENCE = { darkness: 0.3, tint: '#2a2632', fog: '#3a3444', sky: '#5e5470' };

const at = (dx: number, dy: number) => ({ room: 'ground', dx, dy });
const object = (id: string, objectId: string, dx: number, dy: number) => ({ id, object: objectId, at: at(dx, dy) });

const empty = { tiles: [], lights: [], decals: [], setPieces: [], furnish: {}, assemblies: [], npcs: [], creatures: [] };

const square = (id: string, name: string, region: string, column: number, split: boolean) => ({
  id,
  name,
  subtitle: 'Fixture',
  tier: 1,
  region,
  condition: 'worn',
  ambience: AMBIENCE,
  size: { width: 32, height: 32 },
  square: split ? { column, row: 0, split: true } : { column, row: 0 },
  steps: [],
  ...empty,
  dressing: { ground: { theme: 'camp', people: 0 } },
});

export const FIXTURE_WILD_WEST = build({
  ...square('fx-wild-west', 'Test Wild West', 'fx-home', 0, false),
  areas: [{ room: 'ground', name: 'Test West Wilds' }],
  anchors: { start: at(8, 16) },
  recovery: { districtId: 'fx-wild-west', anchor: 'start' },
  objects: [object('wild-west-crate', 'crate', 12, 8), object('wild-west-packing-crate', 'packing-crate', 14, 20), object('wild-west-trash-bin', 'trash-bin', 20, 12)],
});

export const FIXTURE_WILD_GATE_WEST = build({
  ...square('fx-wild-gate-west', 'Test Gate West', 'fx-home', 1, true),
  areas: [{ room: 'ground', name: 'Test West Gate', safe: true }],
  anchors: {},
  objects: [object('wild-gate-west-crate', 'crate', 4, 8), object('wild-gate-west-packing-crate', 'packing-crate', 6, 24), object('wild-gate-west-trash-bin', 'trash-bin', 10, 12)],
});

export const FIXTURE_WILD_GATE_EAST = build({
  ...square('fx-wild-gate-east', 'Test Gate East', 'fx-far', 1, true),
  areas: [{ room: 'ground', name: 'Test East Gate' }],
  anchors: {},
  objects: [
    object('wall-gate-a', 'vault-door', 16, 15),
    object('wall-gate-b', 'vault-door', 16, 16),
    object('wild-gate-east-crate', 'crate', 22, 8),
    object('wild-gate-east-packing-crate', 'packing-crate', 24, 24),
    object('wild-gate-east-trash-bin', 'trash-bin', 28, 12),
  ],
});

export const FIXTURE_WILD_EAST = build({
  ...square('fx-wild-east', 'Test Wild East', 'fx-far', 2, false),
  areas: [{ room: 'ground', name: 'Test East Wilds' }],
  anchors: {},
  objects: [object('wild-east-crate', 'crate', 8, 8), object('wild-east-packing-crate', 'packing-crate', 12, 24), object('wild-east-trash-bin', 'trash-bin', 20, 12)],
});

export const FIXTURE_WILDS_IDS: readonly string[] = [FIXTURE_WILD_WEST.id, FIXTURE_WILD_GATE_WEST.id, FIXTURE_WILD_GATE_EAST.id, FIXTURE_WILD_EAST.id];

export const FIXTURE_WILD_WEST_ANCHORS = anchorsOf(FIXTURE_WILD_WEST, ['start']);
