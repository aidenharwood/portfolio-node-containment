import { isBuildingWall, isOutdoorFloor, TILE_KINDS, tileKey, type DecalCell, type RegionId, type TileKindId, type TileLayout, type TilePoint, type TileRect, type WallMaterialId } from '@containment/shared';
import { DenseVolume, RaisedCanvas, type VoxelCanvas } from '../voxel/denseVolume.ts';
import { darken, jitter, lighten, mix, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_EMPTY, VOXEL_GLASS, VOXEL_SOLID, type VoxelKind } from '../voxel/voxelKinds.ts';
import { doorGround, doorSpot, doorwayAt, frameVoxel, gatePostVoxel, revealVoxel, seamPylonVoxel, thresholdVoxel, type Doorway } from './doorways.ts';
import { decalColor } from './floorDecals.ts';
import { SLOPE_REACH, SLOPED, slopeHeadroom, slopeOffsets } from './ground.ts';
import { blendLand, dominantLand, isLandBlend, landSpotOf, paletteAt, type LandPalette, type LandSpot } from './landPalette.ts';
import { FACADE_BAND, HAZARD, WALL_PALETTE } from './wallPalette.ts';
import { blockMark, laneMark, trackPieceAt, trackRise, type TrackMark } from './trackPieces.ts';
import { fillBox, type VoxelPut } from './rooftopProps.ts';
import { FLOOR_LAYERS, STEP_VOXELS, TILE_RESOLUTION, WALL_LAYERS, ZONE_VOLUME_HEIGHT } from './worldScale.ts';

const R = TILE_RESOLUTION;
const SUBFLOOR = 0;
const FLOOR = 1;

const COLORS = {
  subfloor: 0x0d1418,
  plating: 0x1d2b35,
  platingSeam: 0x111b21,
  rivet: 0x3d5464,
  inlay: 0x1b6a80,
  grateFrame: 0x2b3a44,
  grateBar: 0x1c2830,
  grateGlow: 0x0e4252,
  carpet: 0x2a2338,
  rustBright: 0x7a4a2a,
  algae: 0x3c4434,
  carpetTrim: 0x5a4a2a,
  terrazzo: 0x34373a,
  terrazzoChip: 0x45484b,
  terrazzoWarm: 0x4a4038,
  terrazzoStrip: 0x4a4232,
  ceramic: 0x4a565c,
  ceramicGrout: 0x2a3236,
  boards: 0x3a3634,
  boardsSeam: 0x1e1c1c,
  boardsStrip: 0x5d666c,
  threshold: 0x463d2c,
  hazardYellow: HAZARD.yellow,
  hazardBlack: HAZARD.black,
  coolantBed: 0x0a2733,
  wallBody: 0x2a3a45,
  wallCap: 0x3b4b57,
  wallKick: 0x151c21,
  wallCut: 0x34444f,
  wallCutHatch: 0x46596a,
  wallTrim: 0x2f4250,
  wallPanel: 0x34495a,
  wallDark: 0x0b1014,
  lightStrip: 0x4fd8ff,
  lightFrame: 0x111a20,
  statusLed: 0x3fbf7f,
  glass: 0x8feaff,
  glassFrame: 0x33434e,
  ballast: 0x15191b,
  ballastStone: 0x22272a,
  rail: 0x8a9aa6,
  sleeper: 0x2e241c,
  tunnel: 0x040608,
  tunnelLamp: 0xff5e3a,
  gravel: 0x6a665e,
  pavingJoint: 0x4a4b49,
  kerb: 0x66655f,
  kerbTop: 0x7c7a72,
  roofTray: 0x3c4044,
  waterBed: 0x16262a,
  shallows: 0x2e4a48,
  silt: 0x6e6450,
  wetSilt: 0x3c3a30,
  needles: 0x3a3022,
  trunk: 0x4a3420,
  pine: 0x24402a,
  pineLight: 0x355a34,
  pineDark: 0x172a1c,
  fencePost: 0x6a6e70,
  fenceWire: 0x9aa2a6,
  barrier: 0x4c4f52,
  barrierDark: 0x3a3d40,
  barrierCap: 0x5e6266,
  barrierLamp: 0xffb24a,
} as const;

type Axis = 'x' | 'y';
const TUNNEL_DEPTH = R / 2;
const TUNNEL_HEIGHT = 11;

export type Side = 'north' | 'south' | 'east' | 'west';

const isWallKind = (kind: TileKindId): boolean => TILE_KINDS[kind].structure === 'wall';

export interface OwnedLayout extends TileLayout {
  readonly ownerAt?: (point: TilePoint) => string | undefined;
  readonly interiorAt?: (point: TilePoint) => boolean;
  readonly regionAt?: (point: TilePoint) => RegionId | undefined;
}

const besideKind = (layout: OwnedLayout, tx: number, ty: number, x: number, y: number): TileKindId => {
  const kind = layout.tileAt({ x, y });
  const { ownerAt } = layout;
  if (!ownerAt || kind === 'void' || ownerAt({ x, y }) !== undefined || ownerAt({ x: tx, y: ty }) === undefined) return kind;
  return 'void';
};

export const tileBase = (layout: TileLayout, tx: number, ty: number): number => layout.heightAt({ x: tx, y: ty }) * STEP_VOXELS;

const TRACK_SWAY = STEP_VOXELS / 2;
const TRACK_SCAN = 8;

export function groundTopAt(layout: TileLayout, tx: number, ty: number): number {
  return tileBase(layout, tx, ty) + FLOOR_LAYERS + (layout.tileAt({ x: tx, y: ty }) === 'track' ? TRACK_SWAY : 0) + slopeHeadroom(layout, tx, ty);
}

export function groundBottomAt(layout: TileLayout, tx: number, ty: number): number {
  let bottom = SLOPED.has(layout.tileAt({ x: tx, y: ty })) ? Math.max(0, tileBase(layout, tx, ty) - SLOPE_REACH) : tileBase(layout, tx, ty);
  for (const [dx, dy] of AROUND) {
    const beside = layout.tileAt({ x: tx + dx, y: ty + dy });
    bottom = Math.min(bottom, beside === 'void' ? 0 : tileBase(layout, tx + dx, ty + dy));
  }
  return layout.tileAt({ x: tx, y: ty }) === 'track' ? Math.max(0, Math.min(bottom, tileBase(layout, tx, ty) - TRACK_SWAY)) : bottom;
}

export function regionTop(layout: OwnedLayout, region: TileRect): number {
  let top = 0;
  for (let ty = region.y - 1; ty <= region.y + region.height; ty++) {
    for (let tx = region.x - 1; tx <= region.x + region.width; tx++) top = Math.max(top, drawnTopAt(layout, tx, ty));
  }
  return top;
}

export function buildTileVolume(layout: OwnedLayout, region: TileRect): DenseVolume {
  const volume = createTileVolume(region, layout);
  paintTileRows(volume, layout, region, region.y - 1, region.y + region.height + 1);
  return volume;
}

export function createTileVolume(region: TileRect, layout: OwnedLayout): DenseVolume {
  return new DenseVolume((region.width + 2) * R, ZONE_VOLUME_HEIGHT + regionTop(layout, region), (region.height + 2) * R, (region.x - 1) * R, (region.y - 1) * R);
}

type DecalMap = ReadonlyMap<string, readonly DecalCell[]>;

export function paintTileRows(volume: DenseVolume, layout: OwnedLayout, region: TileRect, fromRow: number, toRow: number, decals?: DecalMap): DenseVolume {
  const canvas = new RaisedCanvas(volume);
  for (let ty = Math.max(fromRow, region.y - 1); ty < Math.min(toRow, region.y + region.height + 1); ty++) {
    for (let tx = region.x - 1; tx < region.x + region.width + 1; tx++) {
      const kind = layout.tileAt({ x: tx, y: ty });
      if (kind === 'void') continue;
      const base = tileBase(layout, tx, ty);
      const land = landSpotOf(layout.regionAt, tx, ty);
      const palette = dominantLand(land);
      canvas.lift = base;
      const massing = isBuildingWall(kind) ? massingAt(layout, tx, ty) : null;
      if (massing === 'tower' && isBuildingWall(kind)) paintTower(volume, layout, tx, ty, kind, base);
      else if (massing === 'hull') paintHull(volume, layout, tx, ty, base);
      else if (isBuildingWall(kind)) paintWall(canvas, layout, tx, ty, kind);
      else if (kind === 'rock') paintRock(canvas, layout, tx, ty, palette);
      else if (kind === 'cliff') paintCliff(canvas, layout, tx, ty, palette);
      else if (kind === 'trees') paintTrees(canvas, layout, tx, ty);
      else if (kind === 'fence') paintFence(canvas, layout, tx, ty, land);
      else if (kind === 'barrier') paintBarrier(canvas, layout, tx, ty);
      else if (kind === 'glass') paintGlass(canvas, tx, ty);
      else if (kind === 'track') paintTrack(volume, layout, tx, ty, base, palette);
      else if (kind === 'door') paintDoorway(canvas, layout, tx, ty, land);
      else paintFloor(canvas, kind, tx, ty, 'x', land, decals?.get(tileKey({ x: tx, y: ty })), seamsOf(layout, kind, tx, ty), blendNeighborsOf(layout, kind, tx, ty), wallsBeside(layout, tx, ty), kerbsOf(layout, kind, tx, ty));
      if (LAND.has(kind)) shadeLand(canvas, layout, kind, tx, ty, land);
      if (base > 0 && kind !== 'track' && !massing) paintEarth(volume, layout, kind, tx, ty, base, palette);
      if (SLOPED.has(kind)) slopeLand(volume, layout, tx, ty, base);
    }
  }
  return volume;
}

const AROUND: readonly (readonly [number, number])[] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

const SOD: ReadonlySet<TileKindId> = new Set<TileKindId>(['grass', 'dirt', 'soil', 'gravel', 'trees', 'water', 'coolant', 'track']);

const STRATUM = 3;

function rockColor(vx: number, vy: number, vz: number, land: LandPalette): number {
  const band = Math.floor((vy + smoothNoise(vx, vz, 48, 103) * 6) / STRATUM);
  const pick = noise3(band, 0, 0, 107);
  const tone = pick < 0.3 ? mix(land.rock, land.rockDark, 0.7) : pick > 0.72 ? mix(land.rock, land.rockLight, 0.7) : land.rock;
  return jitter(tone, 0.015, noise3(vx, vy, vz, 109));
}

export const rockFace = (vx: number, vy: number, vz: number, land: LandPalette, ledge: boolean): number => (ledge ? mossy(rockColor(vx, vy, vz, land), vx, vz, land) : rockColor(vx, vy, vz, land));

export const landPaletteAt = (layout: OwnedLayout, tx: number, ty: number): LandPalette => dominantLand(landSpotOf(layout.regionAt, tx, ty));

export const rockCrest = (vx: number, vz: number, outer: boolean): number => WALL_LAYERS - 1 - 2 * Math.floor(smoothNoise(vx, vz, 9, 101) * 4) - (outer ? 1 : 0);

const mossy = (color: number, vx: number, vz: number, land: LandPalette): number => mix(color, land.moss, Math.min(0.85, ramp(0.6, 0.78, smoothNoise(vx, vz, 12, 131)) * land.mossiness * 1.4));

function earthColor(kind: TileKindId, vx: number, vy: number, vz: number, depth: number, land: LandPalette): number {
  if (kind === 'cliff' || kind === 'rock') return rockColor(vx, vy, vz, land);
  if (SOD.has(kind)) {
    if (depth === 0) return jitter(kind === 'grass' ? darken(land.grass, 0.25) : land.earthDark, 0.02, noise3(vx, vy, vz, 151));
    const band = smoothNoise(vx * 0.5 + vy * 2, vz * 0.5 - vy, 3, 157);
    const tone = band > 0.5 ? mix(land.earth, land.dirt, ramp(0.5, 0.75, band)) : mix(land.earth, land.earthDark, ramp(0.5, 0.25, band));
    return jitter(tone, 0.025, noise3(vx, vy, vz, 163));
  }
  const course = Math.floor(vy / 2);
  const joint = vy % 2 === 0 || (vx + vz + (course % 2) * 3) % 6 === 0;
  return jitter(joint ? COLORS.pavingJoint : COLORS.kerb, 0.04, noise3(vx, vy, vz, 167));
}

function paintEarth(volume: DenseVolume, layout: TileLayout, kind: TileKindId, tx: number, ty: number, base: number, land: LandPalette): void {
  let bottom = base;
  for (const [dx, dy] of AROUND) {
    const beside = layout.tileAt({ x: tx + dx, y: ty + dy });
    bottom = Math.min(bottom, beside === 'void' ? 0 : tileBase(layout, tx + dx, ty + dy));
  }
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      if (volume.kindAt(vx, base + SUBFLOOR, vz) === VOXEL_SOLID && volume.colorAt(vx, base + SUBFLOOR, vz) === COLORS.subfloor) {
        volume.set(vx, base + SUBFLOOR, vz, earthColor(kind, vx, base + SUBFLOOR, vz, 0, land));
      }
      for (let vy = bottom; vy < base; vy++) volume.set(vx, vy, vz, earthColor(kind, vx, vy, vz, base - 1 - vy + 1, land));
    }
  }
}

function paintCliff(volume: VoxelCanvas, layout: OwnedLayout, tx: number, ty: number, land: LandPalette): void {
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      volume.set(vx, SUBFLOOR, vz, rockColor(vx, SUBFLOOR, vz, land));
      volume.set(vx, FLOOR, vz, mossy(rockColor(vx, FLOOR, vz, land), vx, vz, land));
      const rise = smoothNoise(vx, vz, 3, 137);
      const lip = rise > 0.6 ? (rise > 0.74 ? 2 : 1) : 0;
      for (let h = 0; h < lip; h++) {
        const color = rockColor(vx, FLOOR_LAYERS + h, vz, land);
        volume.set(vx, FLOOR_LAYERS + h, vz, h === lip - 1 ? mossy(color, vx, vz, land) : color);
      }
    }
  }
  paintSeamPylons(volume, layout, tx, ty);
}

function slopeLand(volume: DenseVolume, layout: TileLayout, tx: number, ty: number, base: number): void {
  const offsets = slopeOffsets(layout, tx, ty);
  if (!offsets) return;
  const top = base + FLOOR;
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const rise = offsets[lz * R + lx] as number;
      if (rise === 0) continue;
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      const kind = volume.kindAt(vx, top, vz);
      if (kind === VOXEL_EMPTY) continue;
      const color = volume.colorAt(vx, top, vz);
      if (rise > 0) {
        for (let h = 0; h < rise; h++) volume.set(vx, top + h, vz, color);
        volume.set(vx, top + rise, vz, color, kind as VoxelKind);
        continue;
      }
      for (let vy = top + rise + 1; vy <= top; vy++) volume.clear(vx, vy, vz);
      volume.set(vx, top + rise, vz, color, kind as VoxelKind);
    }
  }
}

const LAND: ReadonlySet<TileKindId> = new Set<TileKindId>(['grass', 'dirt', 'gravel', 'soil', 'water']);
const LAND_WIDE = 192;
const LAND_MID = 56;
const LAND_HUE = 320;
const WIDE_SHADE = 0.16;
const MID_SHADE = 0.36;
const SHORE_REACH = R * 0.85;

function nearestBeside(layout: TileLayout, tx: number, ty: number, match: (kind: TileKindId) => boolean): readonly TilePoint[] {
  const found: TilePoint[] = [];
  for (const [dx, dy] of AROUND) if (match(layout.tileAt({ x: tx + dx, y: ty + dy }))) found.push({ x: tx + dx, y: ty + dy });
  return found;
}

function distanceToTiles(tiles: readonly TilePoint[], vx: number, vz: number): number {
  let best = Infinity;
  for (const tile of tiles) {
    const dx = Math.max(tile.x * R - (vx + 0.5), 0, vx + 0.5 - (tile.x + 1) * R);
    const dz = Math.max(tile.y * R - (vz + 0.5), 0, vz + 0.5 - (tile.y + 1) * R);
    best = Math.min(best, Math.hypot(dx, dz));
  }
  return best;
}

interface LandField {
  readonly wide: readonly [number, number, number, number];
  readonly mid: readonly [number, number, number, number];
  readonly hue: readonly [number, number, number, number];
}

function landFieldOf(tx: number, ty: number): LandField {
  const corners = (scale: number, salt: number): [number, number, number, number] => [
    smoothNoise(tx * R, ty * R, scale, salt),
    smoothNoise((tx + 1) * R, ty * R, scale, salt),
    smoothNoise(tx * R, (ty + 1) * R, scale, salt),
    smoothNoise((tx + 1) * R, (ty + 1) * R, scale, salt),
  ];
  return { wide: corners(LAND_WIDE, 271), mid: corners(LAND_MID, 277), hue: corners(LAND_HUE, 281) };
}

function sampleField(corners: readonly [number, number, number, number], lx: number, lz: number): number {
  const fx = (lx + 0.5) / R;
  const fz = (lz + 0.5) / R;
  return (corners[0] * (1 - fx) + corners[1] * fx) * (1 - fz) + (corners[2] * (1 - fx) + corners[3] * fx) * fz;
}

function landTint(color: number, kind: TileKindId, field: LandField, lx: number, lz: number, land: LandPalette): number {
  const wide = sampleField(field.wide, lx, lz);
  const mid = sampleField(field.mid, lx, lz);
  let tinted = color;
  if (kind === 'grass') {
    const hue = sampleField(field.hue, lx, lz);
    tinted = hue > 0.5 ? mix(tinted, land.grassDry, (hue - 0.5) * land.drift) : mix(tinted, land.grassLush, (0.5 - hue) * land.drift * 1.4);
  }
  const shade = (wide - 0.5) * WIDE_SHADE + (mid - 0.5) * MID_SHADE;
  return shade < 0 ? darken(tinted, -shade) : lighten(tinted, shade * 0.6);
}

function shadeLand(volume: VoxelCanvas, layout: TileLayout, kind: TileKindId, tx: number, ty: number, land: LandSpot): void {
  const water = kind === 'water';
  const shore = nearestBeside(layout, tx, ty, water ? (other) => other !== 'water' && other !== 'void' && TILE_KINDS[other].structure !== 'liquid' : (other) => other === 'water');
  if (water && shore.length === 0) return;
  const field = water ? null : landFieldOf(tx, ty);
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      const distance = shore.length > 0 ? distanceToTiles(shore, vx, vz) : Infinity;
      if (water) {
        if (distance >= R) continue;
        volume.set(vx, SUBFLOOR, vz, mix(volume.colorAt(vx, SUBFLOOR, vz), COLORS.shallows, (1 - distance / R) ** 1.5 * 0.8));
        continue;
      }
      if (volume.kindAt(vx, FLOOR, vz) !== VOXEL_SOLID) continue;
      const painted = volume.colorAt(vx, FLOOR, vz);
      let color = field ? blendLand(land, (lx + 0.5) / R, (lz + 0.5) / R, (palette) => landTint(painted, kind, field, lx, lz, palette)) : painted;
      if (distance < R) {
        const frontier = distance + (smoothNoise(vx, vz, 4, 263) - 0.5) * 7 + (smoothNoise(vx, vz, 2, 269) - 0.5) * 1.5;
        if (frontier < SHORE_REACH) color = jitter(mix(COLORS.wetSilt, COLORS.silt, Math.max(0, frontier) / SHORE_REACH), 0.02, noise3(vx, vz, 1, 269));
        else color = mix(color, COLORS.silt, (1 - distance / R) * 0.3);
      }
      volume.set(vx, FLOOR, vz, color);
    }
  }
}

const SURFACES: ReadonlySet<TileKindId> = new Set<TileKindId>(['plating', 'concrete', 'rust', 'carpet', 'terrazzo', 'ceramic', 'boards', 'soil', 'grate']);

interface Seams {
  readonly north: boolean;
  readonly south: boolean;
  readonly east: boolean;
  readonly west: boolean;
}

const BUILT: ReadonlySet<TileKindId> = new Set<TileKindId>(['plating', 'concrete', 'rust', 'carpet', 'terrazzo', 'ceramic', 'boards']);
const NATURAL: ReadonlySet<TileKindId> = new Set<TileKindId>(['grass', 'dirt', 'gravel', 'soil', 'rust']);
const HARD: ReadonlySet<TileKindId> = new Set<TileKindId>(['paving', 'asphalt', 'concrete']);
const BLENDED: ReadonlySet<TileKindId> = new Set<TileKindId>([...BUILT, ...NATURAL, ...HARD]);
const VERGE_BIAS = R * 0.1;
const BLEND_REACH = R;

interface BlendNeighbor {
  readonly kind: TileKindId;
  readonly tx: number;
  readonly ty: number;
  readonly sign: number;
}

const naturalPair = (a: TileKindId, b: TileKindId): boolean => NATURAL.has(a) && NATURAL.has(b);
const vergePair = (a: TileKindId, b: TileKindId): boolean => (NATURAL.has(a) && HARD.has(b)) || (HARD.has(a) && NATURAL.has(b));
const blends = (a: TileKindId, b: TileKindId): boolean => a !== b && ((BUILT.has(a) && BUILT.has(b)) || naturalPair(a, b) || vergePair(a, b));

function blendNeighborsOf(layout: OwnedLayout, kind: TileKindId, tx: number, ty: number): readonly BlendNeighbor[] {
  if (!BLENDED.has(kind)) return [];
  const neighbors: BlendNeighbor[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const other = besideKind(layout, tx, ty, tx + dx, ty + dy);
      if (blends(kind, other)) neighbors.push({ kind: other, tx: tx + dx, ty: ty + dy, sign: kind < other ? 1 : -1 });
    }
  }
  return neighbors;
}

function baseColorOf(kind: TileKindId, land: LandPalette): number {
  switch (kind) {
    case 'grass':
      return land.grass;
    case 'dirt':
      return land.dirt;
    case 'gravel':
      return land.gravel;
    case 'soil':
      return land.soil;
    case 'rust':
      return land.rust;
    case 'paving':
      return land.paving;
    case 'asphalt':
      return land.asphalt;
    case 'plating':
      return COLORS.plating;
    case 'carpet':
      return COLORS.carpet;
    case 'terrazzo':
      return COLORS.terrazzo;
    case 'ceramic':
      return COLORS.ceramic;
    case 'boards':
      return COLORS.boards;
    default:
      return land.concrete;
  }
}

const NATURAL_SOFTNESS = 1.5;

interface FloorBlend {
  readonly kind: TileKindId;
  readonly share: number;
  readonly tint: number;
  readonly weight: number;
}

function vergeFrontier(own: TileKindId, other: TileKindId, vx: number, vz: number): number {
  const natural = NATURAL.has(own) ? own : other;
  const hard = natural === own ? other : own;
  const toward = natural < hard ? 1 : -1;
  return (smoothNoise(vx, vz, 3, 53) - 0.5) * 1.3 * BLEND_REACH + (noise3(vx, vz, 0, 59) - 0.5) * 2 - toward * VERGE_BIAS;
}

function floorBlend(own: TileKindId, neighbors: readonly BlendNeighbor[], vx: number, vz: number, land: LandPalette): FloorBlend | null {
  let nearest: BlendNeighbor | null = null;
  let best = Infinity;
  for (const neighbor of neighbors) {
    const dx = Math.max(neighbor.tx * R - (vx + 0.5), 0, vx + 0.5 - (neighbor.tx + 1) * R);
    const dz = Math.max(neighbor.ty * R - (vz + 0.5), 0, vz + 0.5 - (neighbor.ty + 1) * R);
    const distance = Math.hypot(dx, dz);
    if (distance < best) {
      best = distance;
      nearest = neighbor;
    }
  }
  if (!nearest || best >= BLEND_REACH) return null;
  const natural = naturalPair(own, nearest.kind);
  const verge = !natural && vergePair(own, nearest.kind);
  const frontier = verge ? vergeFrontier(own, nearest.kind, vx, vz) : natural
    ? (smoothNoise(vx, vz, 7, 53) - 0.5) * 2.2 * BLEND_REACH + (smoothNoise(vx, vz, 2, 57) - 0.5) * 5
    : (smoothNoise(vx, vz, 5, 53) - 0.5) * 1.8 * BLEND_REACH + (noise3(vx, vz, 0, 59) - 0.5) * 3;
  const reach = nearest.sign * frontier - best;
  return {
    kind: nearest.kind,
    share: natural ? ramp(-NATURAL_SOFTNESS, NATURAL_SOFTNESS, reach) : reach > 0 ? 1 : 0,
    tint: mix(baseColorOf(own, land), baseColorOf(nearest.kind, land), 0.5),
    weight: (verge ? 0.2 : natural ? 0.25 : 0.5) * (1 - best / BLEND_REACH),
  };
}

function landVoxel(kind: TileKindId, lx: number, lz: number, vx: number, vz: number, tile: FloorTile, land: LandSpot): FloorVoxel | null {
  const fx = (lx + 0.5) / R;
  const fz = (lz + 0.5) / R;
  const main = floorVoxel(kind, lx, lz, vx, vz, tile, paletteAt(land, fx, fz));
  if (!main || main.kind !== VOXEL_SOLID || !isLandBlend(land)) return main;
  return { color: blendLand(land, fx, fz, (palette) => floorVoxel(kind, lx, lz, vx, vz, tile, palette)?.color ?? main.color), kind: VOXEL_SOLID };
}

function blendedVoxel(kind: TileKindId, blend: FloorBlend | null, lx: number, lz: number, vx: number, vz: number, tile: FloorTile, land: LandSpot): FloorVoxel | null {
  const own = landVoxel(kind, lx, lz, vx, vz, tile, land);
  if (!blend || blend.share <= 0) return own;
  const other = landVoxel(blend.kind, lx, lz, vx, vz, tile, land);
  if (blend.share >= 1 || !own || !other || own.kind !== VOXEL_SOLID || other.kind !== VOXEL_SOLID) return blend.share >= 0.5 ? other : own;
  return { color: mix(own.color, other.color, blend.share), kind: VOXEL_SOLID };
}

function seamsOf(layout: OwnedLayout, kind: TileKindId, tx: number, ty: number): Seams | null {
  if (!SURFACES.has(kind) || kind === 'grate') return null;
  const differs = (x: number, y: number): boolean => {
    const other = besideKind(layout, tx, ty, x, y);
    return other !== kind && SURFACES.has(other) && !blends(kind, other);
  };
  const seams = { north: differs(tx, ty - 1), south: differs(tx, ty + 1), east: differs(tx + 1, ty), west: differs(tx - 1, ty) };
  return seams.north || seams.south || seams.east || seams.west ? seams : null;
}

function onSeam(seams: Seams, lx: number, lz: number): boolean {
  return (seams.west && lx === 0) || (seams.east && lx === R - 1) || (seams.north && lz === 0) || (seams.south && lz === R - 1);
}

const KERBED: ReadonlySet<TileKindId> = new Set<TileKindId>(['paving', 'asphalt', 'concrete']);

function kerbsOf(layout: OwnedLayout, kind: TileKindId, tx: number, ty: number): Seams | null {
  if (!KERBED.has(kind)) return null;
  const road = (x: number, y: number): boolean => {
    const other = besideKind(layout, tx, ty, x, y);
    return other === 'water' || (kind === 'paving' && other === 'asphalt');
  };
  const kerbs = { north: road(tx, ty - 1), south: road(tx, ty + 1), east: road(tx + 1, ty), west: road(tx - 1, ty) };
  return kerbs.north || kerbs.south || kerbs.east || kerbs.west ? kerbs : null;
}

function wallsBeside(layout: OwnedLayout, tx: number, ty: number): Seams | null {
  const walled = (x: number, y: number): boolean => isWallKind(besideKind(layout, tx, ty, x, y));
  const walls = { north: walled(tx, ty - 1), south: walled(tx, ty + 1), east: walled(tx + 1, ty), west: walled(tx - 1, ty) };
  return walls.north || walls.south || walls.east || walls.west ? walls : null;
}

const GRIME_REACH = 3;
const GRIME_DEPTH = 0.2;
const GRIME_FADE = 0.06;
const MACRO_SCALE = 32;
const MACRO_SWING = 0.1;
const STREET_SCALE = 160;
const STREET_SWING = 0.12;
const STREETS: ReadonlySet<TileKindId> = new Set<TileKindId>(['paving', 'asphalt']);

function wallDistance(walls: Seams, lx: number, lz: number): number {
  let nearest = Infinity;
  if (walls.west) nearest = Math.min(nearest, lx);
  if (walls.east) nearest = Math.min(nearest, R - 1 - lx);
  if (walls.north) nearest = Math.min(nearest, lz);
  if (walls.south) nearest = Math.min(nearest, R - 1 - lz);
  return nearest;
}

const WEATHERED: ReadonlySet<TileKindId> = new Set<TileKindId>([...BUILT, 'paving', 'asphalt']);

function weathered(color: number, kind: TileKindId, vx: number, vz: number, lx: number, lz: number, walls: Seams | null): number {
  let shaded = color;
  if (WEATHERED.has(kind)) {
    const swing = (smoothNoise(vx, vz, MACRO_SCALE, 97) - 0.5) * MACRO_SWING + (STREETS.has(kind) ? (smoothNoise(vx, vz, STREET_SCALE, 99) - 0.5) * STREET_SWING : 0);
    shaded = swing < 0 ? darken(shaded, -swing) : lighten(shaded, swing * 0.5);
  }
  if (walls) {
    const distance = wallDistance(walls, lx, lz);
    if (distance < GRIME_REACH) shaded = darken(shaded, GRIME_DEPTH - distance * GRIME_FADE);
  }
  return shaded;
}

function paintFloor(volume: VoxelCanvas, kind: TileKindId, tx: number, ty: number, axis: Axis, land: LandSpot, cells?: readonly DecalCell[], seams?: Seams | null, blendNeighbors: readonly BlendNeighbor[] = [], walls: Seams | null = null, kerbs: Seams | null = null): void {
  const tile: FloorTile = { tx, ty, tone: noise3(tx, ty, 0, 11), axis };
  const palette = dominantLand(land);
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      volume.set(vx, SUBFLOOR, vz, kind === 'grate' ? COLORS.grateGlow : COLORS.subfloor, kind === 'grate' ? VOXEL_EMISSIVE : VOXEL_SOLID);
      if (kind === 'coolant') {
        volume.set(vx, SUBFLOOR, vz, jitter(COLORS.coolantBed, 0.03, smoothNoise(vx, vz, 6, 41)));
        continue;
      }
      if (kind === 'water') {
        volume.set(vx, SUBFLOOR, vz, jitter(COLORS.waterBed, 0.05, smoothNoise(vx, vz, 5, 43)));
        continue;
      }
      const blend = blendNeighbors.length > 0 ? floorBlend(kind, blendNeighbors, vx, vz, palette) : null;
      const drawn = blendedVoxel(kind, blend, lx, lz, vx, vz, tile, land);
      if (!drawn) continue;
      const surface = blend && drawn.kind === VOXEL_SOLID ? { color: mix(drawn.color, blend.tint, blend.weight), kind: drawn.kind } : drawn;
      if (seams && onSeam(seams, lx, lz)) {
        volume.set(vx, FLOOR, vz, jitter(COLORS.threshold, 0.02, tile.tone));
        continue;
      }
      if (kerbs && onSeam(kerbs, lx, lz)) {
        const grain = noise3(vx, FLOOR, vz, 241);
        volume.set(vx, FLOOR, vz, jitter(COLORS.kerb, 0.03, grain));
        volume.set(vx, FLOOR + 1, vz, jitter(COLORS.kerbTop, 0.03, grain));
        continue;
      }
      const decal = cells ? decalColor(cells, lx, lz, surface.color, noise3(vx, FLOOR, vz, 3)) : null;
      if (decal) volume.set(vx, FLOOR, vz, decal.color, decal.emissive ? VOXEL_EMISSIVE : VOXEL_SOLID);
      else volume.set(vx, FLOOR, vz, surface.kind === VOXEL_SOLID ? weathered(surface.color, kind, vx, vz, lx, lz, walls) : surface.color, surface.kind);
    }
  }
}

interface FloorTile {
  readonly tx: number;
  readonly ty: number;
  readonly tone: number;
  readonly axis: Axis;
}

interface FloorVoxel {
  readonly color: number;
  readonly kind: typeof VOXEL_SOLID | typeof VOXEL_EMISSIVE;
}

const even = (value: number): boolean => ((value % 2) + 2) % 2 === 0;

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

export function smoothNoise(x: number, z: number, scale: number, salt: number): number {
  const gx = Math.floor(x / scale);
  const gz = Math.floor(z / scale);
  const fx = smoothstep((x - gx * scale) / scale);
  const fz = smoothstep((z - gz * scale) / scale);
  const top = noise3(gx, 0, gz, salt) * (1 - fx) + noise3(gx + 1, 0, gz, salt) * fx;
  const bottom = noise3(gx, 0, gz + 1, salt) * (1 - fx) + noise3(gx + 1, 0, gz + 1, salt) * fx;
  return top * (1 - fz) + bottom * fz;
}

const doorwayOf = (layout: OwnedLayout, tx: number, ty: number): Doorway => doorwayAt((x, y) => besideKind(layout, tx, ty, x, y), tx, ty);

function paintDoorway(volume: VoxelCanvas, layout: OwnedLayout, tx: number, ty: number, land: LandSpot): void {
  const door = doorwayOf(layout, tx, ty);
  const ground = doorGround(door);
  const tile: FloorTile = { tx, ty, tone: noise3(tx, ty, 0, 11), axis: door.alongX ? 'y' : 'x' };
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      const spot = doorSpot(door, lx, lz);
      volume.set(vx, SUBFLOOR, vz, COLORS.subfloor);
      const floor = thresholdVoxel(door, spot, noise3(vx, FLOOR, vz, 3)) ?? landVoxel(ground, lx, lz, vx, vz, tile, land);
      volume.set(vx, FLOOR, vz, floor?.color ?? COLORS.gravel, floor?.kind ?? VOXEL_SOLID);
      for (let h = 0; h < WALL_LAYERS; h++) {
        const frame = frameVoxel(door, spot, h, noise3(vx, FLOOR_LAYERS + h, vz, 5));
        if (frame) volume.set(vx, FLOOR_LAYERS + h, vz, frame.color, frame.kind);
      }
    }
  }
}

function doorSides(layout: OwnedLayout, tx: number, ty: number): Set<Side> {
  const sides = new Set<Side>();
  for (const side of SIDES) {
    const [dx, dy] = OUTWARD[side];
    if (besideKind(layout, tx, ty, tx + dx, ty + dy) === 'door') sides.add(side);
  }
  return sides;
}

function faceDepth(side: Side, lx: number, lz: number): number {
  switch (side) {
    case 'north':
      return lz;
    case 'south':
      return R - 1 - lz;
    case 'west':
      return lx;
    case 'east':
      return R - 1 - lx;
  }
}

const faceAlong = (side: Side, lx: number, lz: number): number => (side === 'north' || side === 'south' ? lx : lz);

const ramp = (from: number, to: number, value: number): number => smoothstep(Math.max(0, Math.min(1, (value - from) / (to - from))));

const REPAIR_CELL = 5;

function asphaltRepair(tx: number, ty: number): number {
  const cx = Math.floor(tx / REPAIR_CELL);
  const cy = Math.floor(ty / REPAIR_CELL);
  if (noise3(cx, cy, 0, 331) > 0.3) return 0;
  const width = 2 + Math.floor(noise3(cx, cy, 1, 331) * 3);
  const height = 2 + Math.floor(noise3(cx, cy, 2, 331) * 3);
  const x = cx * REPAIR_CELL + Math.floor(noise3(cx, cy, 3, 331) * (REPAIR_CELL - width + 1));
  const y = cy * REPAIR_CELL + Math.floor(noise3(cx, cy, 4, 331) * (REPAIR_CELL - height + 1));
  if (tx < x || ty < y || tx >= x + width || ty >= y + height) return 0;
  return noise3(cx, cy, 5, 331) > 0.5 ? 1 : -1;
}

const PLATE = 14;
const PLATE_JOINT = 0.9;
const PLATE_RIM = 0.6;

function plateAt(vx: number, vz: number): { readonly gap: number; readonly tone: number } {
  const gx = Math.floor(vx / PLATE);
  const gz = Math.floor(vz / PLATE);
  let nearest = Infinity;
  let second = Infinity;
  let tone = 0.5;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = gx + dx;
      const cz = gz + dz;
      const distance = Math.hypot(vx + 0.5 - (cx + 0.15 + noise3(cx, cz, 0, 401) * 0.7) * PLATE, vz + 0.5 - (cz + 0.15 + noise3(cx, cz, 1, 401) * 0.7) * PLATE);
      if (distance < nearest) {
        second = nearest;
        nearest = distance;
        tone = noise3(cx, cz, 2, 401);
      } else if (distance < second) second = distance;
    }
  }
  return { gap: second - nearest, tone };
}

function basaltVoxel(vx: number, vz: number, land: LandPalette): FloorVoxel {
  const plate = plateAt(vx, vz);
  const sheet = ramp(0.48, 0.72, smoothNoise(vx, vz, 72, 409));
  const ground = mix(land.soil, land.glass, sheet * 0.85);
  const toned = plate.tone > 0.5 ? lighten(ground, (plate.tone - 0.5) * 0.05) : darken(ground, (0.5 - plate.tone) * 0.06);
  if (sheet > 0.5 && plate.gap < PLATE_RIM) {
    if (sheet > 0.6 && noise3(vx, vz, 3, 411) > 0.985) return { color: land.glint, kind: VOXEL_EMISSIVE };
    return { color: mix(toned, land.glassSheen, 0.14), kind: VOXEL_SOLID };
  }
  if (sheet <= 0.5 && plate.gap < PLATE_JOINT) return { color: darken(toned, 0.08), kind: VOXEL_SOLID };
  return { color: jitter(toned, 0.008, noise3(vx, vz, 0, 413)), kind: VOXEL_SOLID };
}

function floorVoxel(kind: TileKindId, lx: number, lz: number, vx: number, vz: number, tile: FloorTile, land: LandPalette): FloorVoxel | null {
  const solid = (color: number): FloorVoxel => ({ color, kind: VOXEL_SOLID });
  const edge = lx === 0 || lz === 0;
  switch (kind) {
    case 'plating': {
      if (edge) return solid(COLORS.platingSeam);
      if (lx === 1 && lz === 1) return solid(COLORS.rivet);
      if (tile.tone > 0.975 && lz >= 3 && lz <= 4 && lx >= 2 && lx <= 5) return solid(darken(COLORS.inlay, 0.4));
      return solid(jitter(COLORS.plating, 0.018, tile.tone));
    }
    case 'concrete': {
      if ((even(tile.tx) && lx === 0) || (even(tile.ty) && lz === 0)) return solid(darken(land.concrete, 0.12));
      return solid(jitter(jitter(land.concrete, 0.02, noise3(Math.floor(tile.tx / 2), Math.floor(tile.ty / 2), 0, 13)), 0.008, noise3(vx, vz, 0, 15)));
    }
    case 'grate': {
      if (edge || lx === R - 1 || lz === R - 1) return solid(COLORS.grateFrame);
      if (lx % 2 === 1 && lz % 2 === 1) return null;
      return solid(COLORS.grateBar);
    }
    case 'rust': {
      if (edge) return solid(darken(land.rust, 0.25));
      const weather = smoothNoise(vx, vz, 7, 31);
      const weathering = mix(mix(land.rust, COLORS.rustBright, ramp(0.55, 0.85, weather) * 0.45), COLORS.algae, ramp(0.35, 0.1, weather) * 0.4);
      return solid(jitter(weathering, 0.015, tile.tone));
    }
    case 'soil': {
      if (land.soilStyle === 'basalt') return basaltVoxel(vx, vz, land);
      const row = tile.axis === 'x' ? lz : lx;
      const furrow = (row === 2 || row === 5) && smoothNoise(vx, vz, 9, 47) > 0.38;
      return solid(jitter(furrow ? land.soilRow : land.soil, 0.012, noise3(vx, vz, 0, 47)));
    }
    case 'carpet': {
      if (even(tile.tx + tile.ty) && Math.abs(lx - 3.5) + Math.abs(lz - 3.5) === 2) return solid(mix(COLORS.carpet, COLORS.carpetTrim, 0.15));
      return solid(COLORS.carpet);
    }
    case 'terrazzo': {
      if ((tile.tx % 4 === 0 && lx === 0) || (tile.ty % 4 === 0 && lz === 0)) return solid(COLORS.terrazzoStrip);
      const chip = noise3(vx, vz, 0, 23);
      const scattered = smoothNoise(vx, vz, 12, 27) > 0.45;
      if (scattered && chip > 0.994) return solid(mix(COLORS.terrazzoWarm, COLORS.terrazzo, 0.5));
      if (scattered && chip > 0.975) return solid(mix(COLORS.terrazzoChip, COLORS.terrazzo, 0.5));
      return solid(jitter(COLORS.terrazzo, 0.018, noise3(Math.floor(tile.tx / 4), Math.floor(tile.ty / 4), 0, 29)));
    }
    case 'ceramic': {
      if (edge) return solid(darken(COLORS.ceramic, 0.18));
      return solid(jitter(COLORS.ceramic, 0.012, noise3(tile.tx, tile.ty, 0, 37)));
    }
    case 'boards': {
      const across = tile.axis === 'x' ? lz : lx;
      const along = tile.axis === 'x' ? vx : vz;
      const plank = Math.floor((tile.axis === 'x' ? vz : vx) / 4);
      if (across % 4 === 0) return solid(darken(COLORS.boards, 0.25));
      const run = along + plank * 7;
      if (run % 24 === 0) return solid(darken(COLORS.boards, 0.18));
      return solid(jitter(COLORS.boards, 0.035, noise3(plank, Math.floor(run / 24), 0, 43)));
    }
    case 'grass': {
      const patch = smoothNoise(vx, vz, 40, 61);
      const dry = ramp(0.5 - 0.12 * land.dryness, 0.95 - 0.12 * land.dryness, patch) * 0.75 * land.dryness;
      return solid(jitter(mix(land.grass, land.grassDry, dry), 0.015, noise3(vx, vz, 0, 67)));
    }
    case 'dirt': {
      const rut = ramp(0.45, 0.75, smoothNoise(vx, vz, 12, 71));
      return solid(jitter(mix(land.dirt, land.dirtDark, rut * 0.8), 0.013, noise3(vx, vz, 0, 73)));
    }
    case 'gravel': {
      const clump = ramp(0.55, 0.1, smoothNoise(vx, vz, 11, 79));
      const stone = noise3(vx, vz, 0, 79);
      const ground = mix(land.gravel, land.gravelDark, clump * 0.6);
      return solid(stone > 0.99 ? lighten(ground, 0.05) : jitter(ground, 0.013, stone));
    }
    case 'asphalt': {
      const repair = asphaltRepair(tile.tx, tile.ty);
      const ground = repair === 0 ? land.asphalt : repair > 0 ? lighten(land.asphalt, 0.045) : darken(land.asphalt, 0.06);
      const wear = ramp(0.6, 0.85, smoothNoise(vx, vz, 24, 83));
      return solid(jitter(mix(ground, lighten(ground, 0.06), wear * 0.5), 0.012, noise3(vx, vz, 0, 89)));
    }
    case 'paving': {
      const course = Math.floor(vz / 6);
      const shifted = vx + (even(course) ? 0 : 4);
      if (shifted % 8 === 0 || vz % 6 === 0) return solid(darken(land.paving, 0.1));
      const slab = noise3(Math.floor(shifted / 8), course, 0, 233);
      const tone = slab > 0.9 ? darken(land.paving, 0.07) : slab < 0.1 ? lighten(land.paving, 0.04) : land.paving;
      return solid(jitter(tone, 0.012, noise3(vx, vz, 0, 239)));
    }
    case 'hazard':
      return solid(even(Math.floor((vx + vz) / 4)) ? COLORS.hazardYellow : COLORS.hazardBlack);
    default:
      return null;
  }
}

function openSides(layout: OwnedLayout, tx: number, ty: number): Set<Side> {
  const open = new Set<Side>();
  const check = (side: Side, x: number, y: number) => {
    const neighbor = besideKind(layout, tx, ty, x, y);
    if (neighbor !== 'void' && !isWallKind(neighbor)) open.add(side);
  };
  check('north', tx, ty - 1);
  check('south', tx, ty + 1);
  check('west', tx - 1, ty);
  check('east', tx + 1, ty);
  return open;
}

function outerSide(lx: number, lz: number, open: Set<Side>): { side: Side; u: number } | null {
  if (lz === R - 1 && open.has('south')) return { side: 'south', u: lx };
  if (lz === 0 && open.has('north')) return { side: 'north', u: R - 1 - lx };
  if (lx === R - 1 && open.has('east')) return { side: 'east', u: R - 1 - lz };
  if (lx === 0 && open.has('west')) return { side: 'west', u: lz };
  return null;
}

const SIDE_SALT: Readonly<Record<Side, number>> = { north: 1, south: 2, east: 3, west: 4 };


const FACADE = {
  band: FACADE_BAND,
  litWindow: 0xffd08a,
  darkWindow: 0x161c22,
  slit: 0x9feaff,
  sill: 0x8a857b,
  plaster: 0x7d766a,
  rail: 0x5d666c,
  skirting: 0x241e1a,
} as const;

export interface FaceVoxel {
  readonly color: number;
  readonly kind?: typeof VOXEL_SOLID | typeof VOXEL_EMISSIVE;
  readonly recessed?: boolean;
}

const OUTWARD: Readonly<Record<Side, readonly [number, number]>> = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] };

const SIDES: readonly Side[] = ['north', 'south', 'west', 'east'];

export function facesOutdoors(layout: OwnedLayout, tx: number, ty: number, side: Side): boolean {
  const [dx, dy] = OUTWARD[side];
  const beside = { x: tx + dx, y: ty + dy };
  const kind = besideKind(layout, tx, ty, beside.x, beside.y);
  if (!layout.interiorAt) return isOutdoorFloor(kind);
  return kind !== 'void' && kind !== 'door' && !isWallKind(kind) && !layout.interiorAt(beside);
}

const WINDOW_GLOWS = [0xffc070, 0xffc070, 0xffc070, 0xffa040, 0xffa040, FACADE.litWindow, FACADE.litWindow, 0xffc070, 0x19d9ff, 0xff2a8a];

const ROOFLINE_NEON = [0xff2a8a, 0x19d9ff, 0xffb21a, 0x9a5cff] as const;
export const NEON_RUN = 6;
const NEON_SHARE = 0.35;
const NEON_ROWS = 2;

export function rooflineNeonGlow(material: WallMaterialId, tx: number, ty: number, side: Side): number | null {
  if (material !== 'cladding' && material !== 'blockwork') return null;
  const runX = Math.floor(tx / NEON_RUN);
  const runY = Math.floor(ty / NEON_RUN);
  if (noise3(runX, runY, SIDE_SALT[side], 311) < 1 - NEON_SHARE) return null;
  return ROOFLINE_NEON[Math.floor(noise3(runX, runY, SIDE_SALT[side], 313) * ROOFLINE_NEON.length)] ?? ROOFLINE_NEON[0];
}

function rooflineNeon(material: WallMaterialId, tx: number, ty: number, side: Side, h: number): number | null {
  if (h < WALL_LAYERS - 1 - NEON_ROWS || h >= WALL_LAYERS - 1) return null;
  return rooflineNeonGlow(material, tx, ty, side);
}

export function litWindowGlow(material: WallMaterialId, tx: number, ty: number, side: Side): number | null {
  if (material === 'wall' || (tx + ty) % 2 !== 0 || noise3(tx, ty, SIDE_SALT[side], 211) <= 0.4) return null;
  return WINDOW_GLOWS[Math.floor(noise3(tx, ty, SIDE_SALT[side], 307) * WINDOW_GLOWS.length)] ?? FACADE.litWindow;
}

function windowAt(material: WallMaterialId, tx: number, ty: number, side: Side, h: number, u: number): FaceVoxel | null {
  const bay = (tx + ty) % 2 === 0;
  if (!bay) return null;
  if (material === 'wall') {
    if (h >= 9 && h <= 10 && u >= 1 && u <= 6) return { color: FACADE.slit, kind: VOXEL_EMISSIVE, recessed: true };
    return null;
  }
  if (h === 5 && u >= 1 && u <= 6) return { color: FACADE.sill };
  if (h < 6 || h > 11 || u < 2 || u > 5) return null;
  if (u === 2 || u === 5 || h === 11) return { color: darken(WALL_PALETTE[material].joint, 0.3), recessed: true };
  const glow = litWindowGlow(material, tx, ty, side);
  if (glow === null) return { color: FACADE.darkWindow, recessed: true };
  return { color: h === 8 ? darken(glow, 0.35) : glow, kind: VOXEL_EMISSIVE, recessed: true };
}

function exteriorVoxel(material: WallMaterialId, tx: number, ty: number, side: Side, h: number, u: number, vx: number, vy: number, vz: number): FaceVoxel {
  const palette = WALL_PALETTE[material];
  const grain = noise3(vx, vy, vz, 5);
  if (h <= 1) return { color: jitter(palette.plinth, 0.03, grain) };
  const pane = windowAt(material, tx, ty, side, h, u);
  if (pane) return pane;
  const neon = rooflineNeon(material, tx, ty, side, h);
  if (neon !== null) return { color: neon, kind: VOXEL_EMISSIVE };
  const stain = h <= 4 ? 0.12 - h * 0.02 : 0;
  switch (material) {
    case 'brick': {
      const offset = (h % 2) * 2;
      if ((u + offset) % 4 === 0) return { color: palette.joint };
      const brick = Math.floor((u + offset) / 4) + h * 7 + tx * 13 + ty * 31;
      return { color: darken(jitter(palette.body, 0.03, noise3(brick, 0, 0, 223)), stain) };
    }
    case 'blockwork': {
      const offset = (Math.floor(h / 3) % 2) * 2;
      if (h % 3 === 0 || (u + offset) % 4 === 0) return { color: palette.joint };
      return { color: darken(jitter(palette.body, 0.02, grain), stain) };
    }
    case 'cladding': {
      if (h === 8) return { color: darken(palette.body, 0.3) };
      const streak = ramp(0.7, 0.86, smoothNoise(vx + vz, vy * 0.2, 2, 227)) * ramp(4, 13, h) * 0.25;
      return { color: mix(u % 2 === 0 ? palette.joint : palette.body, COLORS.rustBright, streak) };
    }
    case 'wall': {
      if (h === 3 || h === 4) return { color: FACADE.band };
      if (u === 0 || h % 6 === 1) return { color: palette.joint };
      return { color: jitter(palette.body, 0.015, grain) };
    }
  }
}

function interiorVoxel(material: WallMaterialId, h: number, u: number, grain: number): FaceVoxel {
  const palette = WALL_PALETTE[material];
  if (h <= 1) return { color: FACADE.skirting };
  if (h <= 6) return { color: jitter(palette.dado, 0.02, grain) };
  if (h === 7) return { color: FACADE.rail };
  return { color: darken(jitter(FACADE.plaster, 0.03, grain), u === 0 ? 0.12 : 0) };
}

function paintWall(volume: VoxelCanvas, layout: OwnedLayout, tx: number, ty: number, material: WallMaterialId): void {
  const open = openSides(layout, tx, ty);
  const palette = WALL_PALETTE[material];
  const outdoors = new Set([...open].filter((side) => facesOutdoors(layout, tx, ty, side)));
  const jambs = doorSides(layout, tx, ty);
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      volume.set(vx, SUBFLOOR, vz, COLORS.subfloor);
      volume.set(vx, FLOOR, vz, (lx + lz) % 4 === 0 ? COLORS.wallCutHatch : jitter(COLORS.wallCut, 0.03, noise3(vx, FLOOR, vz, 5)));
      const outer = outerSide(lx, lz, open);
      for (let h = 0; h < WALL_LAYERS; h++) {
        const vy = FLOOR_LAYERS + h;
        const grain = noise3(vx, vy, vz, 5);
        const top = h === WALL_LAYERS - 1;
        const facility = material === 'wall' && !(outer && outdoors.has(outer.side));
        if (top) {
          const cap = facility ? COLORS.wallCap : palette.cap;
          if (outer) volume.set(vx, vy, vz, outer.u === 0 ? darken(cap, 0.14) : jitter(lighten(cap, 0.06), 0.02, grain));
          else {
            const tray = jitter(mix(darken(cap, 0.15), COLORS.roofTray, 0.25), 0.03, grain);
            volume.set(vx, vy - 1, vz, vx % 8 === 0 ? darken(tray, 0.2) : tray);
          }
          continue;
        }
        if (!outer) {
          volume.set(vx, vy, vz, jitter(facility ? COLORS.wallBody : darken(palette.body, 0.35), 0.02, grain));
          continue;
        }
        if (jambs.has(outer.side)) {
          const reveal = revealVoxel(material, h, faceAlong(outer.side, lx, lz), grain);
          volume.set(vx, vy, vz, reveal.color, reveal.kind);
          continue;
        }
        if (facility) {
          paintWallFace(volume, vx, vy, vz, h, outer, noise3(tx, ty, SIDE_SALT[outer.side], 9), grain);
          continue;
        }
        const face = outdoors.has(outer.side) ? exteriorVoxel(material, tx, ty, outer.side, h, outer.u, vx, vy, vz) : interiorVoxel(material, h, outer.u, grain);
        if (!face.recessed) {
          volume.set(vx, vy, vz, face.color, face.kind ?? VOXEL_SOLID);
          continue;
        }
        const [ix, iz] = inwardStep(outer.side);
        volume.clear(vx, vy, vz);
        volume.set(vx + ix, vy, vz + iz, face.color, face.kind ?? VOXEL_SOLID);
      }
    }
  }
  for (const side of tunnelSides(layout, tx, ty)) paintTunnel(volume, side, tx, ty);
}

const MASSING_RISE = 2 * STEP_VOXELS;
export const MASSING_HEADROOM = 16;
export const STOREY = 8;
export const GROUND_FLOOR = 12;
const DARK_STOREYS = 0.16;
const LIT_FADE = 0.05;

export type Massing = 'tower' | 'hull';

export function massingAt(layout: OwnedLayout, tx: number, ty: number): Massing | null {
  const { interiorAt } = layout;
  if (!interiorAt || !isBuildingWall(layout.tileAt({ x: tx, y: ty }))) return null;
  const base = tileBase(layout, tx, ty);
  let walled = true;
  let lowest = base;
  for (const [dx, dy] of AROUND) {
    const point = { x: tx + dx, y: ty + dy };
    if (interiorAt(point)) return null;
    const beside = layout.tileAt(point);
    if (!isBuildingWall(beside)) walled = false;
    if (beside !== 'void') lowest = Math.min(lowest, tileBase(layout, point.x, point.y));
  }
  if (!walled && base - lowest < MASSING_RISE) return null;
  return layout.regionAt?.({ x: tx, y: ty }) === 'wreckfield' ? 'hull' : 'tower';
}

export function drawnTopAt(layout: OwnedLayout, tx: number, ty: number): number {
  return tileBase(layout, tx, ty) + (massingAt(layout, tx, ty) === 'hull' ? MASSING_HEADROOM : 0);
}

export const TOWER = {
  deck: 0x2c2f31,
  plinth: 0x1f2326,
  shop: 0x10161c,
  fascia: 0x1a1f24,
  sill: 0x767b7e,
  mullion: 0x23292e,
  glass: 0x131a21,
  glassBlue: 0x1b2833,
  headHouse: 0x4a5054,
} as const;

const TOWER_WINDOWS = [0xffc070, 0xffc070, 0xffd08a, 0xffd08a, 0xffa040, 0xfff0d0, 0xffc070, 0x8fe8ff, 0xff7ab8] as const;
export const TOWER_NEON = [0xff2a8a, 0x19d9ff, 0xffb21a, 0x9a5cff, 0x3dffa8] as const;

function openTowerSides(layout: OwnedLayout, tx: number, ty: number, base: number): Map<Side, number> {
  const open = new Map<Side, number>();
  for (const side of SIDES) {
    const [dx, dy] = OUTWARD[side];
    const kind = besideKind(layout, tx, ty, tx + dx, ty + dy);
    if (kind === 'void' || (isBuildingWall(kind) && tileBase(layout, tx + dx, ty + dy) >= base)) continue;
    open.set(side, tileBase(layout, tx + dx, ty + dy));
  }
  return open;
}

export const towerSalt = (tx: number, ty: number): number => (Math.floor(tx / 24) * 31 + Math.floor(ty / 24) * 17) % 997;

export function towerFace(material: WallMaterialId, side: Side, along: number, vy: number, street: number, top: number, block: number): FaceVoxel {
  const salt = SIDE_SALT[side];
  const above = vy - street - FLOOR_LAYERS;
  if (above < 2) return { color: TOWER.plinth };
  if (above < GROUND_FLOOR) {
    const bay = Math.floor(along / R);
    const u = ((along % R) + R) % R;
    if (above >= GROUND_FLOOR - 2) {
      if (noise3(bay, block, salt, 719) < 0.3) return { color: TOWER_NEON[Math.floor(noise3(bay, block, salt, 721) * TOWER_NEON.length)] ?? TOWER_NEON[0], kind: VOXEL_EMISSIVE };
      return { color: TOWER.fascia };
    }
    if (u === 0) return { color: TOWER.mullion };
    if (above === 2) return { color: TOWER.sill };
    if (noise3(bay, block, salt, 727) < 0.5) return { color: TOWER.shop, recessed: true };
    const glow = TOWER_WINDOWS[Math.floor(noise3(bay, block, salt, 729) * TOWER_WINDOWS.length)] ?? FACADE.litWindow;
    return { color: above === GROUND_FLOOR - 3 ? darken(glow, 0.3) : glow, kind: VOXEL_EMISSIVE, recessed: true };
  }
  const level = top - 1 - vy;
  const storey = Math.floor(level / STOREY);
  const row = level - storey * STOREY;
  if (row === 0 || row >= 6) return { color: WALL_PALETTE[material].body };
  if (row === 5) return { color: TOWER.sill };
  if (((along % 4) + 4) % 4 === 0) return { color: TOWER.mullion, recessed: true };
  const pane = Math.floor(along / 4);
  const share = noise3(storey, block, salt, 731) < DARK_STOREYS ? 0 : (0.15 + 0.6 * noise3(storey, block, salt, 733)) / (1 + LIT_FADE * Math.max(0, -storey));
  if (noise3(pane, storey, block + salt, 739) >= share) return { color: TOWER.glass, recessed: true };
  const glow = TOWER_WINDOWS[Math.floor(noise3(pane, storey, block + salt, 743) * TOWER_WINDOWS.length)] ?? FACADE.litWindow;
  return { color: glow, kind: VOXEL_EMISSIVE, recessed: true };
}

const CORNERS: readonly (readonly [Side, Side, number, number])[] = [
  ['south', 'east', R - 1, R - 1],
  ['south', 'west', 0, R - 1],
  ['north', 'east', R - 1, 0],
  ['north', 'west', 0, 0],
];

function paintTower(volume: DenseVolume, layout: OwnedLayout, tx: number, ty: number, material: WallMaterialId, base: number): void {
  const open = openTowerSides(layout, tx, ty, base);
  const sides = new Set(open.keys());
  let bottom = base;
  for (const [dx, dy] of AROUND) {
    const beside = layout.tileAt({ x: tx + dx, y: ty + dy });
    bottom = Math.min(bottom, beside === 'void' ? 0 : tileBase(layout, tx + dx, ty + dy));
  }
  const top = base + FLOOR_LAYERS + WALL_LAYERS - 1;
  const palette = WALL_PALETTE[material];
  const block = towerSalt(tx, ty);
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      for (let vy = bottom; vy < top; vy++) volume.set(vx, vy, vz, vy === top - 1 ? jitter(TOWER.deck, 0.03, noise3(vx, vy, vz, 761)) : palette.body);
    }
  }
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const outer = outerSide(lx, lz, sides);
      if (!outer) continue;
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      const street = open.get(outer.side) ?? base;
      const along = outer.side === 'north' || outer.side === 'south' ? vx : vz;
      for (let vy = bottom; vy < top; vy++) {
        const face = towerFace(material, outer.side, along, vy, street, top, block);
        if (!face.recessed) {
          volume.set(vx, vy, vz, face.color, face.kind ?? VOXEL_SOLID);
          continue;
        }
        const [ix, iz] = inwardStep(outer.side);
        volume.clear(vx, vy, vz);
        volume.set(vx + ix, vy, vz + iz, face.color, face.kind ?? VOXEL_SOLID);
      }
    }
  }
  for (const [first, second, cx, cz] of CORNERS) {
    if (!sides.has(first) || !sides.has(second) || noise3(tx, ty, 0, 763) >= 0.4) continue;
    const street = Math.min(open.get(first) ?? base, open.get(second) ?? base);
    const neon = TOWER_NEON[Math.floor(noise3(tx, ty, 1, 767) * TOWER_NEON.length)] ?? TOWER_NEON[0];
    const from = street + FLOOR_LAYERS + GROUND_FLOOR + 3;
    const to = top - 2;
    const inX = cx === 0 ? 1 : -1;
    const inZ = cz === 0 ? 1 : -1;
    for (const [lx, lz] of [[cx, cz], [cx + inX, cz], [cx, cz + inZ]] as const) {
      for (let vy = from; vy <= to; vy++) {
        const frame = vy === from || vy === to;
        const segment = Math.floor((vy - from) / 3) % 2 === 0;
        volume.set(tx * R + lx, vy, ty * R + lz, frame ? TOWER.plinth : segment ? neon : darken(neon, 0.45), frame ? VOXEL_SOLID : VOXEL_EMISSIVE);
      }
    }
  }
}

const HULL = {
  bottom: 0x58291f,
  bootTop: 0x1a1c1e,
  side: 0x2d3942,
  seam: 0x212930,
  rivet: 0x58646c,
  sheer: 0xa8a497,
  gunwale: 0x3c4850,
  rim: 0x7f796b,
  port: 0x10171e,
  portLit: 0xffc27a,
  rust: 0x7a4a2a,
  deck: 0x39423d,
  deckSeam: 0x2a312e,
  rail: 0xb9b4a6,
  house: 0xb5b1a4,
  houseBand: 0x2d3942,
  houseWindow: 0x182129,
  cowl: 0xb9b4a6,
  cowlMouth: 0x14191d,
} as const;

const PORTHOLE_PITCH = 8;
const WATERLINE = 20;
const STREAK_WIDTH = 3;

function hullStreak(side: Side, along: number, fromTop: number): number {
  const band = Math.floor(along / STREAK_WIDTH);
  if (noise3(band, SIDE_SALT[side], 0, 811) < 0.55) return 0;
  const start = 3 + Math.floor(noise3(band, SIDE_SALT[side], 1, 813) * 6);
  const length = 8 + Math.floor(noise3(band, SIDE_SALT[side], 2, 817) * 14);
  if (fromTop < start || fromTop > start + length) return 0;
  return (1 - (fromTop - start) / length) * (0.35 + 0.3 * noise3(band, SIDE_SALT[side], 3, 819));
}

function hullPlate(side: Side, along: number, vy: number, street: number, top: number): FaceVoxel {
  const fromTop = top - vy;
  if (fromTop === 0) return { color: HULL.gunwale };
  if (fromTop === 2) return { color: HULL.sheer };
  const above = vy - street - FLOOR_LAYERS;
  const port = ((along % PORTHOLE_PITCH) + PORTHOLE_PITCH) % PORTHOLE_PITCH;
  if (fromTop >= 5 && fromTop <= 8 && port >= 2 && port <= 5 && above > 10) {
    const rim = fromTop === 5 || fromTop === 8 ? port === 3 || port === 4 : port === 2 || port === 5;
    if (rim) return { color: HULL.rim };
    if ((fromTop === 5 || fromTop === 8) && (port === 2 || port === 5)) return { color: HULL.side };
    const lit = noise3(Math.floor(along / PORTHOLE_PITCH), SIDE_SALT[side], 0, 823) < 0.3;
    return lit ? { color: fromTop === 6 ? HULL.portLit : darken(HULL.portLit, 0.25), kind: VOXEL_EMISSIVE, recessed: true } : { color: HULL.port, recessed: true };
  }
  const plate = fromTop >= WATERLINE + 2 ? HULL.bottom : fromTop >= WATERLINE ? HULL.bootTop : HULL.side;
  const seam = fromTop % 4 === 3 && fromTop < WATERLINE;
  const base = seam ? (even(along) ? HULL.rivet : HULL.seam) : plate;
  return { color: mix(base, HULL.rust, hullStreak(side, along, fromTop)) };
}

function houseWall(side: Side, along: number, vy: number, top: number): FaceVoxel {
  const fromTop = top - vy;
  if (fromTop === 0) return { color: HULL.gunwale };
  if (fromTop === 1) return { color: HULL.houseBand };
  const bay = ((along % 6) + 6) % 6;
  if (fromTop >= 3 && fromTop <= 4 && bay >= 1 && bay <= 3) {
    const lit = noise3(Math.floor(along / 6), SIDE_SALT[side], 0, 829) < 0.3;
    return lit ? { color: HULL.portLit, kind: VOXEL_EMISSIVE, recessed: true } : { color: HULL.houseWindow, recessed: true };
  }
  return { color: mix(HULL.house, HULL.rust, hullStreak(side, along, fromTop) * 0.7) };
}

function paintHull(volume: DenseVolume, layout: OwnedLayout, tx: number, ty: number, base: number): void {
  const open = openTowerSides(layout, tx, ty, base);
  const sides = new Set(open.keys());
  let bottom = base;
  for (const [dx, dy] of AROUND) {
    const beside = layout.tileAt({ x: tx + dx, y: ty + dy });
    bottom = Math.min(bottom, beside === 'void' ? 0 : tileBase(layout, tx + dx, ty + dy));
  }
  const top = base + FLOOR_LAYERS + WALL_LAYERS - 1;
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      const patch = ramp(0.66, 0.86, smoothNoise(vx, vz * 2, 14, 831)) * 0.35;
      const deck = mix(vx % R === 0 || vz % 4 === 0 ? HULL.deckSeam : HULL.deck, HULL.rust, patch);
      for (let vy = bottom; vy < top; vy++) volume.set(vx, vy, vz, vy === top - 1 ? deck : HULL.side);
    }
  }
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const outer = outerSide(lx, lz, sides);
      if (!outer) continue;
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      const [dx, dy] = OUTWARD[outer.side];
      const house = isBuildingWall(layout.tileAt({ x: tx + dx, y: ty + dy }));
      const street = open.get(outer.side) ?? base;
      const along = outer.side === 'north' || outer.side === 'south' ? vx : vz;
      for (let vy = bottom; vy <= top; vy++) {
        const face = house ? houseWall(outer.side, along, vy, top) : hullPlate(outer.side, along, vy, street, top);
        if (!face.recessed) {
          volume.set(vx, vy, vz, face.color, face.kind ?? VOXEL_SOLID);
          continue;
        }
        const [ix, iz] = inwardStep(outer.side);
        volume.clear(vx, vy, vz);
        volume.set(vx + ix, vy, vz + iz, face.color, face.kind ?? VOXEL_SOLID);
      }
      const post = ((along % 4) + 4) % 4 === 0;
      if (post) volume.set(vx, top + 1, vz, HULL.rail);
      if (post) volume.set(vx, top + 2, vz, HULL.rail);
      volume.set(vx, top + 3, vz, HULL.rail);
    }
  }
  if (sides.size > 0) return;
  const pick = noise3(tx, ty, 0, 837);
  const put: VoxelPut = (vx, vy, vz, color, kind) => volume.set(vx, vy, vz, color, kind);
  if (pick < 0.06) {
    fillBox(put, tx * R + 3, ty * R + 3, 2, 2, top, 4, () => HULL.cowl);
    fillBox(put, tx * R + 2, ty * R + 2, 4, 3, top + 4, 2, (vx, vy, vz) => (vz === ty * R + 4 && vy === top + 4 && vx > tx * R + 2 && vx < tx * R + 5 ? HULL.cowlMouth : HULL.cowl));
  } else if (pick < 0.1) {
    fillBox(put, tx * R + 2, ty * R + 3, 1, 1, top, 2, () => HULL.gunwale);
    fillBox(put, tx * R + 5, ty * R + 3, 1, 1, top, 2, () => HULL.gunwale);
  }
}

const isOutdoorGround = (kind: TileKindId): boolean => kind !== 'water' && isOutdoorFloor(kind);

function paintGround(volume: VoxelCanvas, tx: number, ty: number, color: number, salt: number): void {
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      volume.set(vx, SUBFLOOR, vz, COLORS.subfloor);
      volume.set(vx, FLOOR, vz, jitter(color, 0.02, noise3(vx, vz, 0, salt)));
    }
  }
}

function paintRock(volume: VoxelCanvas, layout: OwnedLayout, tx: number, ty: number, land: LandPalette): void {
  paintGround(volume, tx, ty, land.rockDark, 97);
  const open = openSides(layout, tx, ty);
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      const outer = outerSide(lx, lz, open);
      const crest = rockCrest(vx, vz, outer !== null);
      for (let h = 0; h <= crest; h++) {
        const vy = FLOOR_LAYERS + h;
        const color = rockColor(vx, vy, vz, land);
        volume.set(vx, vy, vz, h === crest ? mossy(color, vx, vz, land) : color);
      }
    }
  }
  paintSeamPylons(volume, layout, tx, ty);
}

function paintSeamPylons(volume: VoxelCanvas, layout: OwnedLayout, tx: number, ty: number): void {
  for (const side of doorSides(layout, tx, ty)) {
    for (let lz = 0; lz < R; lz++) {
      for (let lx = 0; lx < R; lx++) {
        const depth = faceDepth(side, lx, lz);
        if (depth > 1) continue;
        for (let h = 0; h < WALL_LAYERS; h++) {
          const pylon = seamPylonVoxel(h, faceAlong(side, lx, lz), depth);
          volume.set(tx * R + lx, FLOOR_LAYERS + h, ty * R + lz, pylon.color, pylon.kind);
        }
      }
    }
  }
}

function paintGatePosts(volume: VoxelCanvas, layout: OwnedLayout, tx: number, ty: number, style: 'fence' | 'barrier', clearing = false): void {
  const middle = R / 2;
  for (const side of doorSides(layout, tx, ty)) {
    for (let lz = 0; lz < R; lz++) {
      for (let lx = 0; lx < R; lx++) {
        const along = faceAlong(side, lx, lz);
        const reach = style === 'barrier' ? 2 : 1;
        if (clearing && faceDepth(side, lx, lz) <= 1) for (let h = 0; h < WALL_LAYERS; h++) volume.clear(tx * R + lx, FLOOR_LAYERS + h, ty * R + lz);
        if (faceDepth(side, lx, lz) > 1 || along < middle - reach || along >= middle + reach) continue;
        for (let h = 0; h < WALL_LAYERS; h++) {
          const post = gatePostVoxel(style, h);
          if (post) volume.set(tx * R + lx, FLOOR_LAYERS + h, ty * R + lz, post.color, post.kind);
        }
      }
    }
  }
}

const WOODS = {
  fern: 0x2c4a26,
  trunk: 0x4a3420,
  trunkDark: 0x30231a,
  pine: [0x24402a, 0x2a4830, 0x213a28],
  pineLight: 0x3c6040,
  pineDark: 0x172a1c,
  leaf: [0x3c6632, 0x467238, 0x355c2e],
  leafLight: 0x5c8a42,
  leafDark: 0x26422a,
} as const;

const WOOD_SIDES: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

function woodTone(broadleaf: boolean, band: number, tone: number): number {
  if (band > 0.74) return broadleaf ? WOODS.leafLight : WOODS.pineLight;
  if (band < 0.22) return broadleaf ? WOODS.leafDark : WOODS.pineDark;
  return (broadleaf ? WOODS.leaf : WOODS.pine)[tone] as number;
}

function paintTrees(volume: VoxelCanvas, layout: OwnedLayout, tx: number, ty: number): void {
  paintGround(volume, tx, ty, COLORS.needles, 113);
  const open = WOOD_SIDES.filter(([dx, dy]) => layout.tileAt({ x: tx + dx, y: ty + dy }) !== 'trees');
  const edge = open.length > 0;
  const roll = (salt: number): number => noise3(tx, ty, salt, 127);
  const broadleaf = smoothNoise(tx, ty, 5, 211) > 0.56;
  const clearing = !edge && roll(2) < 0.16;
  const trunkX = 2 + Math.floor(roll(0) * 4);
  const trunkZ = 2 + Math.floor(roll(1) * 4);
  const top = clearing ? 7 + Math.floor(roll(3) * 3) : 12 + Math.floor(roll(3) * 5);
  const base = clearing ? 2 : edge ? 5 + Math.floor(roll(4) * 3) : 2 + Math.floor(roll(4) * 3);
  const reach = clearing ? 2.2 : 3 + roll(5) * 1.1;
  const tone = Math.floor(roll(6) * 3);
  const crownX = trunkX + 0.5 - Math.sign(open.reduce((sum, [dx]) => sum + dx, 0));
  const crownZ = trunkZ + 0.5 - Math.sign(open.reduce((sum, [, dy]) => sum + dy, 0));
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      if (lx === trunkX && lz === trunkZ) for (let h = 0; h <= base; h++) volume.set(vx, FLOOR_LAYERS + h, vz, h < 2 ? WOODS.trunkDark : WOODS.trunk);
      const fromCrown = Math.hypot(lx + 0.5 - crownX, lz + 0.5 - crownZ);
      for (let h = base; h < top; h++) {
        const t = (h - base) / Math.max(1, top - base - 1);
        const lump = (noise3(vx >> 1, h >> 1, vz >> 1, 139) - 0.5) * 0.9;
        const radius = broadleaf ? reach * Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2)) * 1.12 + 0.3 : reach * (1 - t) * (1 - ((top - h) % 3) * 0.12) + 0.7;
        if (fromCrown > radius + lump) continue;
        volume.set(vx, FLOOR_LAYERS + h, vz, woodTone(broadleaf, t + lump * 0.2, tone));
      }
      if ((edge || clearing) && fromCrown > 2.2 && noise3(vx, vz, 3, 151) > 0.72) volume.set(vx, FLOOR_LAYERS, vz, WOODS.fern);
    }
  }
  paintGatePosts(volume, layout, tx, ty, 'fence', true);
}

function paintBarrier(volume: VoxelCanvas, layout: OwnedLayout, tx: number, ty: number): void {
  paintGround(volume, tx, ty, COLORS.barrierDark, 151);
  const open = openSides(layout, tx, ty);
  const lamp = noise3(tx, ty, 0, 157) > 0.7;
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      const outer = outerSide(lx, lz, open);
      for (let h = 0; h < WALL_LAYERS; h++) {
        const vy = FLOOR_LAYERS + h;
        if (h === WALL_LAYERS - 1) {
          volume.set(vx, vy, vz, COLORS.barrierCap);
          continue;
        }
        if (!outer) {
          volume.set(vx, vy, vz, COLORS.barrierDark);
          continue;
        }
        if (outer.u === 0) {
          volume.set(vx, vy, vz, darken(COLORS.barrier, 0.25));
          continue;
        }
        if (h === 3 || h === 4) {
          volume.set(vx, vy, vz, (outer.u + h) % 4 < 2 ? COLORS.hazardYellow : COLORS.hazardBlack);
          continue;
        }
        if (lamp && h === WALL_LAYERS - 3 && outer.u >= 3 && outer.u <= 4) {
          volume.set(vx, vy, vz, COLORS.barrierLamp, VOXEL_EMISSIVE);
          continue;
        }
        volume.set(vx, vy, vz, jitter(COLORS.barrier, 0.03, smoothNoise(vx + vz, vy, 3, 163)));
      }
    }
  }
  paintGatePosts(volume, layout, tx, ty, 'barrier');
}

function fenceAxis(layout: OwnedLayout, tx: number, ty: number): Axis {
  const isFence = (x: number, y: number): boolean => besideKind(layout, tx, ty, x, y) === 'fence';
  return isFence(tx - 1, ty) || isFence(tx + 1, ty) ? 'x' : 'y';
}

function paintFence(volume: VoxelCanvas, layout: OwnedLayout, tx: number, ty: number, land: LandSpot): void {
  const beside = [besideKind(layout, tx, ty, tx, ty - 1), besideKind(layout, tx, ty, tx, ty + 1), besideKind(layout, tx, ty, tx - 1, ty), besideKind(layout, tx, ty, tx + 1, ty)];
  const ground = beside.find(isOutdoorGround);
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      volume.set(vx, SUBFLOOR, vz, COLORS.subfloor);
      const drawn = ground ? landVoxel(ground, lx, lz, vx, vz, { tx, ty, tone: noise3(tx, ty, 0, 11), axis: 'x' }, land) : null;
      volume.set(vx, FLOOR, vz, drawn?.color ?? COLORS.gravel);
    }
  }
  const axis = fenceAxis(layout, tx, ty);
  for (let along = 0; along < R; along++) {
    const lx = axis === 'x' ? along : 3;
    const lz = axis === 'x' ? 3 : along;
    for (let h = 0; h < WALL_LAYERS - 4; h++) {
      const vy = FLOOR_LAYERS + h;
      const post = along === 0;
      if (post) {
        volume.set(tx * R + lx, vy, ty * R + lz, COLORS.fencePost);
        continue;
      }
      const top = h === WALL_LAYERS - 5;
      if (top || (along + h) % 3 === 0) volume.set(tx * R + lx, vy, ty * R + lz, top ? COLORS.fencePost : COLORS.fenceWire);
    }
  }
  paintGatePosts(volume, layout, tx, ty, 'fence');
}

function trackAxis(layout: TileLayout, tx: number, ty: number): Axis {
  const run = (dx: number, dy: number) => {
    let length = 0;
    while (length < TRACK_SCAN && layout.tileAt({ x: tx + dx * (length + 1), y: ty + dy * (length + 1) }) === 'track') length++;
    return length;
  };
  return run(1, 0) + run(-1, 0) >= run(0, 1) + run(0, -1) ? 'x' : 'y';
}

function markColor(mark: TrackMark, grain: number): number | null {
  if (mark === 'rail') return jitter(COLORS.rail, 0.04, grain);
  if (mark === 'sleeper') return jitter(COLORS.sleeper, 0.06, grain);
  return null;
}

const ballastColor = (grain: number): number => (grain > 0.7 ? COLORS.ballastStone : jitter(COLORS.ballast, 0.05, grain));

function paintTrackVoxel(volume: VoxelCanvas, vx: number, vz: number, along: number, across: number): void {
  const grain = noise3(vx, FLOOR, vz, 17);
  volume.set(vx, SUBFLOOR, vz, ballastColor(grain));
  const surface = markColor(laneMark(along, across + 0.5, R), grain);
  if (surface === null) volume.clear(vx, FLOOR, vz);
  else volume.set(vx, FLOOR, vz, surface);
}

function paintTrack(volume: DenseVolume, layout: TileLayout, tx: number, ty: number, base: number, land: LandPalette): void {
  const piece = trackPieceAt(layout, tx, ty);
  const rise = piece.kind === 'straight' ? trackRise(layout, tx, ty, piece.axis) : () => 0;
  let bottom = base;
  for (const [dx, dy] of AROUND) {
    const beside = layout.tileAt({ x: tx + dx, y: ty + dy });
    bottom = Math.min(bottom, beside === 'void' ? 0 : tileBase(layout, tx + dx, ty + dy));
  }
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      const grain = noise3(vx, FLOOR, vz, 17);
      const along = piece.kind === 'straight' && piece.axis === 'y' ? lz : lx;
      const across = piece.kind === 'straight' && piece.axis === 'y' ? lx : lz;
      const lift = base + Math.round(rise((along + 0.5) / R - 0.5) * STEP_VOXELS);
      const mark = piece.kind === 'block' ? blockMark(piece.open, vx - piece.x * R + 0.5, vz - piece.y * R + 0.5, R) : laneMark(along, across + 0.5, R);
      for (let vy = Math.min(bottom, lift); vy < lift + SUBFLOOR; vy++) volume.set(vx, vy, vz, earthColor('track', vx, vy, vz, lift - vy, land));
      volume.set(vx, lift + SUBFLOOR, vz, ballastColor(grain));
      const surface = markColor(mark, grain);
      if (surface !== null) volume.set(vx, lift + FLOOR, vz, surface);
    }
  }
}

function tunnelSides(layout: TileLayout, tx: number, ty: number): Side[] {
  const sides: [Side, number, number, Axis][] = [
    ['north', tx, ty - 1, 'y'],
    ['south', tx, ty + 1, 'y'],
    ['west', tx - 1, ty, 'x'],
    ['east', tx + 1, ty, 'x'],
  ];
  return sides.filter(([, x, y, axis]) => layout.tileAt({ x, y }) === 'track' && trackAxis(layout, x, y) === axis).map(([side]) => side);
}

function paintTunnel(volume: VoxelCanvas, side: Side, tx: number, ty: number): void {
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const depth = side === 'north' ? lz : side === 'south' ? R - 1 - lz : side === 'west' ? lx : R - 1 - lx;
      if (depth > TUNNEL_DEPTH) continue;
      const across = side === 'north' || side === 'south' ? lx : lz;
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      for (let h = 0; h < TUNNEL_HEIGHT; h++) {
        if (depth === TUNNEL_DEPTH) volume.set(vx, FLOOR_LAYERS + h, vz, COLORS.tunnel);
        else volume.clear(vx, FLOOR_LAYERS + h, vz);
      }
      if (depth === 0) {
        const lamp = across >= 3 && across <= 4;
        volume.set(vx, FLOOR_LAYERS + TUNNEL_HEIGHT, vz, lamp ? COLORS.tunnelLamp : COLORS.wallTrim, lamp ? VOXEL_EMISSIVE : VOXEL_SOLID);
      }
      if (depth < TUNNEL_DEPTH) paintTrackVoxel(volume, vx, vz, depth, across);
      else volume.set(vx, FLOOR, vz, COLORS.tunnel);
    }
  }
}

function inwardStep(side: Side): [number, number] {
  switch (side) {
    case 'south':
      return [0, -1];
    case 'north':
      return [0, 1];
    case 'east':
      return [-1, 0];
    case 'west':
      return [1, 0];
  }
}

function paintWallFace(
  volume: VoxelCanvas,
  vx: number,
  vy: number,
  vz: number,
  h: number,
  outer: { side: Side; u: number },
  variation: number,
  grain: number,
): void {
  const { u, side } = outer;
  const [ix, iz] = inwardStep(side);
  const carve = (behindColor: number, behindKind: typeof VOXEL_SOLID | typeof VOXEL_EMISSIVE = VOXEL_SOLID) => {
    volume.clear(vx, vy, vz);
    volume.set(vx + ix, vy, vz + iz, behindColor, behindKind);
  };

  if (h <= 1) return volume.set(vx, vy, vz, COLORS.wallKick);
  if (h === 2) return volume.set(vx, vy, vz, COLORS.wallTrim);

  const inner = u >= 1 && u <= R - 2;
  if (variation > 0.74 && inner) {
    if (h === 10) return volume.set(vx, vy, vz, COLORS.lightStrip, VOXEL_EMISSIVE);
    if (h === 9 || h === 11) return volume.set(vx, vy, vz, COLORS.lightFrame);
  }
  if (variation < 0.22 && h >= 4 && h <= 10 && u >= 2 && u <= 5) {
    const led = u === 5 && h === 9;
    return carve(led ? COLORS.statusLed : jitter(COLORS.wallPanel, 0.02, grain), led ? VOXEL_EMISSIVE : VOXEL_SOLID);
  }
  if (variation > 0.45 && variation < 0.55 && (h === 5 || h === 6)) {
    return volume.set(vx, vy, vz, (u + h) % 4 < 2 ? COLORS.hazardYellow : COLORS.hazardBlack);
  }
  if (variation > 0.6 && variation < 0.68 && h >= 11 && h <= 13 && u >= 2 && u <= 5 && h % 2 === 1) {
    return carve(COLORS.wallDark);
  }
  const seam = u === 0 ? 0.18 : 0;
  volume.set(vx, vy, vz, darken(jitter(COLORS.wallBody, 0.015, noise3(Math.floor(vx / 4), Math.floor(vy / 4), Math.floor(vz / 4), 9)), seam));
}

function paintGlass(volume: VoxelCanvas, tx: number, ty: number): void {
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      volume.set(vx, SUBFLOOR, vz, COLORS.subfloor);
      volume.set(vx, FLOOR, vz, COLORS.glassFrame);
      for (let h = 0; h < WALL_LAYERS; h++) {
        const vy = FLOOR_LAYERS + h;
        const frame = h <= 1 || h >= WALL_LAYERS - 2 || (lx === 0 && lz === 0);
        if (frame) volume.set(vx, vy, vz, COLORS.glassFrame);
        else volume.set(vx, vy, vz, COLORS.glass, VOXEL_GLASS);
      }
    }
  }
}

