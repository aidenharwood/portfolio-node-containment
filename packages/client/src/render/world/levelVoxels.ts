import { isBuildingWall, isOutdoorFloor, TILE_KINDS, tileKey, type DecalCell, type TileKindId, type TileLayout, type TilePoint, type TileRect, type WallMaterialId } from '@containment/shared';
import { DenseVolume, RaisedCanvas, type VoxelCanvas } from '../voxel/denseVolume.ts';
import { darken, jitter, lighten, mix, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS, VOXEL_SOLID } from '../voxel/voxelKinds.ts';
import { doorGround, doorSpot, doorwayAt, frameVoxel, gatePostVoxel, revealVoxel, seamPylonVoxel, thresholdVoxel, type Doorway } from './doorways.ts';
import { decalColor } from './floorDecals.ts';
import { WALL_PALETTE } from './wallPalette.ts';
import { blockMark, laneMark, trackPieceAt, trackRise, type TrackMark } from './trackPieces.ts';
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
  concrete: 0x2a2e31,
  grateFrame: 0x2b3a44,
  grateBar: 0x1c2830,
  grateGlow: 0x0e4252,
  carpet: 0x2a2338,
  rust: 0x4a3122,
  soil: 0x2e2418,
  soilDark: 0x1f1810,
  sprout: 0x4f8a3a,
  sproutBright: 0x8ad05a,
  rustBright: 0x7a4a2a,
  rustSeam: 0x22160f,
  algae: 0x2f4a2a,
  carpetTrim: 0x5a4a2a,
  terrazzo: 0x34373a,
  terrazzoChip: 0x45484b,
  terrazzoWarm: 0x4a4038,
  terrazzoStrip: 0x4a4232,
  ceramic: 0x4a565c,
  ceramicGrout: 0x2a3236,
  boards: 0x3b2b1e,
  boardsSeam: 0x1c140d,
  threshold: 0x463d2c,
  hazardYellow: 0xc99a1c,
  hazardBlack: 0x17170f,
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
  grass: 0x3f5e2a,
  grassLight: 0x5c7a34,
  grassDry: 0x6b6a3a,
  dirt: 0x5a4632,
  dirtDark: 0x463626,
  gravel: 0x3a3e43,
  gravelDark: 0x31353a,
  gravelLight: 0x52585e,
  asphalt: 0x505358,
  asphaltWorn: 0x55575b,
  asphaltLine: 0xd8c27a,
  paving: 0x434548,
  pavingJoint: 0x37393c,
  kerb: 0x66655f,
  kerbTop: 0x7c7a72,
  roofTray: 0x3c4044,
  waterBed: 0x16262a,
  rock: 0x5d5a55,
  rockDark: 0x45423e,
  rockLight: 0x7a766e,
  moss: 0x4d6630,
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
  return tileBase(layout, tx, ty) + FLOOR_LAYERS + (layout.tileAt({ x: tx, y: ty }) === 'track' ? TRACK_SWAY : 0);
}

export function groundBottomAt(layout: TileLayout, tx: number, ty: number): number {
  let bottom = tileBase(layout, tx, ty);
  for (const [dx, dy] of AROUND) {
    const beside = layout.tileAt({ x: tx + dx, y: ty + dy });
    bottom = Math.min(bottom, beside === 'void' ? 0 : tileBase(layout, tx + dx, ty + dy));
  }
  return layout.tileAt({ x: tx, y: ty }) === 'track' ? Math.max(0, Math.min(bottom, tileBase(layout, tx, ty) - TRACK_SWAY)) : bottom;
}

export function regionTop(layout: TileLayout, region: TileRect): number {
  let top = 0;
  for (let ty = region.y - 1; ty <= region.y + region.height; ty++) {
    for (let tx = region.x - 1; tx <= region.x + region.width; tx++) top = Math.max(top, tileBase(layout, tx, ty));
  }
  return top;
}

export function buildTileVolume(layout: OwnedLayout, region: TileRect): DenseVolume {
  const volume = createTileVolume(region, layout);
  paintTileRows(volume, layout, region, region.y - 1, region.y + region.height + 1);
  return volume;
}

export function createTileVolume(region: TileRect, layout: TileLayout): DenseVolume {
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
      canvas.lift = base;
      if (isBuildingWall(kind)) paintWall(canvas, layout, tx, ty, kind);
      else if (kind === 'rock') paintRock(canvas, layout, tx, ty);
      else if (kind === 'cliff') paintCliff(canvas, tx, ty);
      else if (kind === 'trees') paintTrees(canvas, tx, ty);
      else if (kind === 'fence') paintFence(canvas, layout, tx, ty);
      else if (kind === 'barrier') paintBarrier(canvas, layout, tx, ty);
      else if (kind === 'glass') paintGlass(canvas, tx, ty);
      else if (kind === 'track') paintTrack(volume, layout, tx, ty, base);
      else if (kind === 'door') paintDoorway(canvas, layout, tx, ty);
      else paintFloor(canvas, kind, tx, ty, 'x', decals?.get(tileKey({ x: tx, y: ty })), seamsOf(layout, kind, tx, ty), blendNeighborsOf(layout, kind, tx, ty), wallsBeside(layout, tx, ty), kerbsOf(layout, kind, tx, ty));
      if (base > 0 && kind !== 'track') paintEarth(volume, layout, kind, tx, ty, base);
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

function rockColor(vx: number, vy: number, vz: number): number {
  const strata = smoothNoise(vx + vy * 3, vz - vy * 2, 4, 103);
  const color = strata > 0.66 ? COLORS.rockLight : strata < 0.3 ? COLORS.rockDark : COLORS.rock;
  return jitter(color, 0.05, noise3(vx, vy, vz, 109));
}

function earthColor(kind: TileKindId, vx: number, vy: number, vz: number, depth: number): number {
  if (kind === 'cliff' || kind === 'rock') return rockColor(vx, vy, vz);
  if (SOD.has(kind)) {
    if (depth === 0) return jitter(kind === 'grass' ? darken(COLORS.grass, 0.25) : COLORS.dirtDark, 0.06, noise3(vx, vy, vz, 151));
    const band = smoothNoise(vx * 0.5 + vy * 2, vz * 0.5 - vy, 3, 157);
    return jitter(band > 0.6 ? COLORS.dirt : band < 0.28 ? COLORS.soilDark : COLORS.dirtDark, 0.07, noise3(vx, vy, vz, 163));
  }
  const course = Math.floor(vy / 2);
  const joint = vy % 2 === 0 || (vx + vz + (course % 2) * 3) % 6 === 0;
  return jitter(joint ? COLORS.pavingJoint : COLORS.kerb, 0.04, noise3(vx, vy, vz, 167));
}

function paintEarth(volume: DenseVolume, layout: TileLayout, kind: TileKindId, tx: number, ty: number, base: number): void {
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
        volume.set(vx, base + SUBFLOOR, vz, earthColor(kind, vx, base + SUBFLOOR, vz, 0));
      }
      for (let vy = bottom; vy < base; vy++) volume.set(vx, vy, vz, earthColor(kind, vx, vy, vz, base - 1 - vy + 1));
    }
  }
}

function paintCliff(volume: VoxelCanvas, tx: number, ty: number): void {
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      volume.set(vx, SUBFLOOR, vz, rockColor(vx, SUBFLOOR, vz));
      volume.set(vx, FLOOR, vz, noise3(vx, vz, 0, 131) > 0.7 ? COLORS.moss : rockColor(vx, FLOOR, vz));
      const lip = smoothNoise(vx, vz, 3, 137) > 0.6 ? (noise3(vx, vz, 1, 139) > 0.6 ? 2 : 1) : 0;
      for (let h = 0; h < lip; h++) volume.set(vx, FLOOR_LAYERS + h, vz, h === lip - 1 && noise3(vx, vz, h, 141) > 0.6 ? COLORS.moss : rockColor(vx, FLOOR_LAYERS + h, vz));
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

const BLENDED: ReadonlySet<TileKindId> = new Set<TileKindId>(['plating', 'concrete', 'rust', 'carpet', 'terrazzo', 'ceramic', 'boards']);
const BLEND_REACH = R;

interface BlendNeighbor {
  readonly kind: TileKindId;
  readonly tx: number;
  readonly ty: number;
  readonly sign: number;
}

const blends = (a: TileKindId, b: TileKindId): boolean => a !== b && BLENDED.has(a) && BLENDED.has(b);

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

const BLEND_BASE: Partial<Record<TileKindId, number>> = {
  plating: COLORS.plating,
  concrete: COLORS.concrete,
  rust: COLORS.rust,
  carpet: COLORS.carpet,
  terrazzo: COLORS.terrazzo,
  ceramic: COLORS.ceramic,
  boards: COLORS.boards,
};

interface FloorBlend {
  readonly kind: TileKindId | null;
  readonly tint: number;
  readonly weight: number;
}

function floorBlend(own: TileKindId, neighbors: readonly BlendNeighbor[], vx: number, vz: number): FloorBlend | null {
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
  const frontier = (smoothNoise(vx, vz, 5, 53) - 0.5) * 1.8 * BLEND_REACH + (noise3(vx, vz, 0, 59) - 0.5) * 3;
  return {
    kind: nearest.sign * frontier > best ? nearest.kind : null,
    tint: mix(BLEND_BASE[own] ?? COLORS.concrete, BLEND_BASE[nearest.kind] ?? COLORS.concrete, 0.5),
    weight: 0.5 * (1 - best / BLEND_REACH),
  };
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

function wallDistance(walls: Seams, lx: number, lz: number): number {
  let nearest = Infinity;
  if (walls.west) nearest = Math.min(nearest, lx);
  if (walls.east) nearest = Math.min(nearest, R - 1 - lx);
  if (walls.north) nearest = Math.min(nearest, lz);
  if (walls.south) nearest = Math.min(nearest, R - 1 - lz);
  return nearest;
}

function weathered(color: number, kind: TileKindId, vx: number, vz: number, lx: number, lz: number, walls: Seams | null): number {
  let shaded = color;
  if (BLENDED.has(kind)) {
    const swing = (smoothNoise(vx, vz, MACRO_SCALE, 97) - 0.5) * MACRO_SWING;
    shaded = swing < 0 ? darken(shaded, -swing) : lighten(shaded, swing * 0.5);
  }
  if (walls) {
    const distance = wallDistance(walls, lx, lz);
    if (distance < GRIME_REACH) shaded = darken(shaded, GRIME_DEPTH - distance * GRIME_FADE);
  }
  return shaded;
}

function paintFloor(volume: VoxelCanvas, kind: TileKindId, tx: number, ty: number, axis: Axis, cells?: readonly DecalCell[], seams?: Seams | null, blendNeighbors: readonly BlendNeighbor[] = [], walls: Seams | null = null, kerbs: Seams | null = null): void {
  const tile: FloorTile = { tx, ty, tone: noise3(tx, ty, 0, 11), axis };
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
      const blend = blendNeighbors.length > 0 ? floorBlend(kind, blendNeighbors, vx, vz) : null;
      const drawn = floorVoxel(blend?.kind ?? kind, lx, lz, vx, vz, tile);
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

function smoothNoise(x: number, z: number, scale: number, salt: number): number {
  const gx = Math.floor(x / scale);
  const gz = Math.floor(z / scale);
  const fx = smoothstep((x - gx * scale) / scale);
  const fz = smoothstep((z - gz * scale) / scale);
  const top = noise3(gx, 0, gz, salt) * (1 - fx) + noise3(gx + 1, 0, gz, salt) * fx;
  const bottom = noise3(gx, 0, gz + 1, salt) * (1 - fx) + noise3(gx + 1, 0, gz + 1, salt) * fx;
  return top * (1 - fz) + bottom * fz;
}

const doorwayOf = (layout: OwnedLayout, tx: number, ty: number): Doorway => doorwayAt((x, y) => besideKind(layout, tx, ty, x, y), tx, ty);

function paintDoorway(volume: VoxelCanvas, layout: OwnedLayout, tx: number, ty: number): void {
  const door = doorwayOf(layout, tx, ty);
  const ground = doorGround(door);
  const tile: FloorTile = { tx, ty, tone: noise3(tx, ty, 0, 11), axis: door.alongX ? 'y' : 'x' };
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      const spot = doorSpot(door, lx, lz);
      volume.set(vx, SUBFLOOR, vz, COLORS.subfloor);
      const floor = thresholdVoxel(door, spot, noise3(vx, FLOOR, vz, 3)) ?? floorVoxel(ground, lx, lz, vx, vz, tile);
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

function floorVoxel(kind: TileKindId, lx: number, lz: number, vx: number, vz: number, tile: FloorTile): FloorVoxel | null {
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
      if ((even(tile.tx) && lx === 0) || (even(tile.ty) && lz === 0)) return solid(darken(COLORS.concrete, 0.28));
      return solid(jitter(COLORS.concrete, 0.03, noise3(Math.floor(tile.tx / 2), Math.floor(tile.ty / 2), 0, 13)));
    }
    case 'grate': {
      if (edge || lx === R - 1 || lz === R - 1) return solid(COLORS.grateFrame);
      if (lx % 2 === 1 && lz % 2 === 1) return null;
      return solid(COLORS.grateBar);
    }
    case 'rust': {
      if (edge) return solid(COLORS.rustSeam);
      const weather = smoothNoise(vx, vz, 7, 31);
      if (weather > 0.7) return solid(darken(COLORS.rustBright, 0.1));
      if (weather < 0.2) return solid(COLORS.algae);
      return solid(jitter(COLORS.rust, 0.025, tile.tone));
    }
    case 'soil': {
      const bed = smoothNoise(vx, vz, 9, 47);
      const row = tile.axis === 'x' ? lz : lx;
      const along = tile.axis === 'x' ? vx : vz;
      if ((row === 2 || row === 5) && bed > 0.38) return solid(along % 3 === 0 && bed > 0.55 ? COLORS.sproutBright : COLORS.sprout);
      return solid(jitter(COLORS.soil, 0.035, bed));
    }
    case 'carpet': {
      if (even(tile.tx + tile.ty) && Math.abs(lx - 3.5) + Math.abs(lz - 3.5) === 2) return solid(mix(COLORS.carpet, COLORS.carpetTrim, 0.4));
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
      if (lx % 4 === 0 || lz % 4 === 0) return solid(COLORS.ceramicGrout);
      return solid(jitter(COLORS.ceramic, 0.012, noise3(tile.tx * 2 + (lx >> 2), tile.ty * 2 + (lz >> 2), 0, 37)));
    }
    case 'boards': {
      const across = tile.axis === 'x' ? lz : lx;
      const along = tile.axis === 'x' ? vx : vz;
      const plank = Math.floor((tile.axis === 'x' ? vz : vx) / 2);
      if (across % 2 === 0) return solid(COLORS.boardsSeam);
      if ((along + plank * 5) % 24 === 0) return solid(COLORS.boardsSeam);
      return solid(jitter(COLORS.boards, 0.05, noise3(plank, Math.floor((along + plank * 5) / 24), 0, 43)));
    }
    case 'grass': {
      const patch = smoothNoise(vx, vz, 11, 61);
      const blade = noise3(vx, vz, 0, 67);
      if (patch > 0.72) return solid(jitter(COLORS.grassDry, 0.04, blade));
      if (blade > 0.86) return solid(COLORS.grassLight);
      return solid(jitter(mix(COLORS.grass, COLORS.grassLight, patch * 0.5), 0.05, blade));
    }
    case 'dirt': {
      const rut = smoothNoise(vx, vz, 6, 71);
      return solid(jitter(rut > 0.6 ? COLORS.dirtDark : COLORS.dirt, 0.05, noise3(vx, vz, 0, 73)));
    }
    case 'gravel': {
      const clump = smoothNoise(vx, vz, 11, 79);
      const stone = noise3(vx, vz, 0, 79);
      if (stone > 0.975) return solid(COLORS.gravelLight);
      return solid(jitter(clump < 0.3 ? COLORS.gravelDark : COLORS.gravel, 0.02, stone));
    }
    case 'asphalt': {
      const wear = smoothNoise(vx, vz, 9, 83);
      return solid(jitter(wear > 0.72 ? COLORS.asphaltWorn : COLORS.asphalt, 0.015, noise3(vx, vz, 0, 89)));
    }
    case 'paving': {
      const course = Math.floor(vz / 4);
      const shifted = vx + (even(course) ? 0 : 3);
      if (shifted % 6 === 0 || vz % 4 === 0) return solid(COLORS.pavingJoint);
      const slab = noise3(Math.floor(shifted / 6), course, 0, 233);
      const tone = slab > 0.86 ? darken(COLORS.paving, 0.16) : slab < 0.2 ? lighten(COLORS.paving, 0.07) : jitter(COLORS.paving, 0.05, slab);
      return solid(jitter(tone, 0.015, noise3(vx, vz, 0, 239)));
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

const MATERIAL = WALL_PALETTE;

const FACADE = {
  band: 0xe86a1c,
  litWindow: 0xffd08a,
  darkWindow: 0x161c22,
  slit: 0x9feaff,
  sill: 0x8a857b,
  plaster: 0x7d766a,
  rail: 0x4a3c2e,
  skirting: 0x241e1a,
} as const;

interface FaceVoxel {
  readonly color: number;
  readonly kind?: typeof VOXEL_SOLID | typeof VOXEL_EMISSIVE;
  readonly recessed?: boolean;
}

const OUTWARD: Readonly<Record<Side, readonly [number, number]>> = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] };

const SIDES: readonly Side[] = ['north', 'south', 'west', 'east'];

function facesOutdoors(layout: OwnedLayout, tx: number, ty: number, side: Side): boolean {
  const [dx, dy] = OUTWARD[side];
  return isOutdoorFloor(besideKind(layout, tx, ty, tx + dx, ty + dy));
}

const WINDOW_GLOWS = [FACADE.litWindow, FACADE.litWindow, FACADE.litWindow, FACADE.litWindow, 0x6ab8ff, 0xff4fa8];

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
  if (u === 2 || u === 5 || h === 11) return { color: darken(MATERIAL[material].joint, 0.3), recessed: true };
  const glow = litWindowGlow(material, tx, ty, side);
  if (glow === null) return { color: FACADE.darkWindow, recessed: true };
  return { color: h === 8 ? darken(glow, 0.35) : glow, kind: VOXEL_EMISSIVE, recessed: true };
}

function exteriorVoxel(material: WallMaterialId, tx: number, ty: number, side: Side, h: number, u: number, vx: number, vy: number, vz: number): FaceVoxel {
  const palette = MATERIAL[material];
  const grain = noise3(vx, vy, vz, 5);
  if (h <= 1) return { color: jitter(palette.plinth, 0.03, grain) };
  const pane = windowAt(material, tx, ty, side, h, u);
  if (pane) return pane;
  const stain = h <= 4 ? 0.12 - h * 0.02 : 0;
  switch (material) {
    case 'brick': {
      const offset = (h % 2) * 2;
      if ((u + offset) % 4 === 0) return { color: palette.joint };
      const brick = Math.floor((u + offset) / 4) + h * 7 + tx * 13 + ty * 31;
      return { color: darken(jitter(palette.body, 0.05, noise3(brick, 0, 0, 223)), stain) };
    }
    case 'blockwork': {
      const offset = (Math.floor(h / 3) % 2) * 2;
      if (h % 3 === 0 || (u + offset) % 4 === 0) return { color: palette.joint };
      return { color: darken(jitter(palette.body, 0.02, grain), stain) };
    }
    case 'cladding': {
      if (h === 8) return { color: darken(palette.body, 0.3) };
      const rust = smoothNoise(vx + vz, vy, 3, 227) > 0.72 ? 0.4 : 0;
      return { color: mix(u % 2 === 0 ? palette.joint : palette.body, COLORS.rustBright, rust) };
    }
    case 'wall': {
      if (h === 3 || h === 4) return { color: FACADE.band };
      if (u === 0 || h % 6 === 1) return { color: palette.joint };
      return { color: jitter(palette.body, 0.015, grain) };
    }
  }
}

function interiorVoxel(material: WallMaterialId, h: number, u: number, grain: number): FaceVoxel {
  const palette = MATERIAL[material];
  if (h <= 1) return { color: FACADE.skirting };
  if (h <= 6) return { color: jitter(palette.dado, 0.02, grain) };
  if (h === 7) return { color: FACADE.rail };
  return { color: darken(jitter(FACADE.plaster, 0.03, grain), u === 0 ? 0.12 : 0) };
}

function paintWall(volume: VoxelCanvas, layout: OwnedLayout, tx: number, ty: number, material: WallMaterialId): void {
  const open = openSides(layout, tx, ty);
  const palette = MATERIAL[material];
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
          const reveal = revealVoxel(material, h, outer.u, grain);
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

const isOutdoorGround = (kind: TileKindId): boolean => kind !== 'water' && isOutdoorFloor(kind);

function paintGround(volume: VoxelCanvas, tx: number, ty: number, color: number, salt: number): void {
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      volume.set(vx, SUBFLOOR, vz, COLORS.subfloor);
      volume.set(vx, FLOOR, vz, jitter(color, 0.06, noise3(vx, vz, 0, salt)));
    }
  }
}

function paintRock(volume: VoxelCanvas, layout: OwnedLayout, tx: number, ty: number): void {
  paintGround(volume, tx, ty, COLORS.rockDark, 97);
  const open = openSides(layout, tx, ty);
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      const outer = outerSide(lx, lz, open);
      const crest = WALL_LAYERS - 1 - Math.floor(smoothNoise(vx, vz, 5, 101) * 7) - (outer ? 1 : 0);
      for (let h = 0; h <= crest; h++) {
        const vy = FLOOR_LAYERS + h;
        const strata = smoothNoise(vx + h * 3, vz - h * 2, 4, 103);
        const color = strata > 0.66 ? COLORS.rockLight : strata < 0.3 ? COLORS.rockDark : COLORS.rock;
        const top = h === crest;
        volume.set(vx, vy, vz, top && noise3(vx, vz, h, 107) > 0.55 ? COLORS.moss : jitter(color, 0.05, noise3(vx, vy, vz, 109)));
      }
    }
  }
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

function paintGatePosts(volume: VoxelCanvas, layout: OwnedLayout, tx: number, ty: number, style: 'fence' | 'barrier'): void {
  const middle = R / 2;
  for (const side of doorSides(layout, tx, ty)) {
    for (let lz = 0; lz < R; lz++) {
      for (let lx = 0; lx < R; lx++) {
        const along = faceAlong(side, lx, lz);
        const reach = style === 'barrier' ? 2 : 1;
        if (faceDepth(side, lx, lz) > 1 || along < middle - reach || along >= middle + reach) continue;
        for (let h = 0; h < WALL_LAYERS; h++) {
          const post = gatePostVoxel(style, h);
          if (post) volume.set(tx * R + lx, FLOOR_LAYERS + h, ty * R + lz, post.color, post.kind);
        }
      }
    }
  }
}

function paintTrees(volume: VoxelCanvas, tx: number, ty: number): void {
  paintGround(volume, tx, ty, COLORS.needles, 113);
  const trunkX = 2 + Math.floor(noise3(tx, ty, 0, 127) * 4);
  const trunkZ = 2 + Math.floor(noise3(tx, ty, 1, 127) * 4);
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      const trunk = Math.abs(lx - trunkX) <= 0 && Math.abs(lz - trunkZ) <= 0;
      const fromTrunk = Math.hypot(lx - trunkX, lz - trunkZ);
      for (let h = 0; h < WALL_LAYERS; h++) {
        const vy = FLOOR_LAYERS + h;
        if (h < 4) {
          if (trunk) volume.set(vx, vy, vz, COLORS.trunk);
          continue;
        }
        const reach = (WALL_LAYERS - h) * 0.42 + 1.2 + smoothNoise(vx, vz, 3, 131) * 1.4;
        if (fromTrunk > reach && smoothNoise(vx, vy * 2, vz, 137) < 0.62) continue;
        if (noise3(vx, vy, vz, 139) < 0.08) continue;
        const shade = noise3(vx, vy, vz, 149);
        volume.set(vx, vy, vz, shade > 0.78 ? COLORS.pineLight : shade < 0.22 ? COLORS.pineDark : jitter(COLORS.pine, 0.05, shade));
      }
    }
  }
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

function paintFence(volume: VoxelCanvas, layout: OwnedLayout, tx: number, ty: number): void {
  const beside = [besideKind(layout, tx, ty, tx, ty - 1), besideKind(layout, tx, ty, tx, ty + 1), besideKind(layout, tx, ty, tx - 1, ty), besideKind(layout, tx, ty, tx + 1, ty)];
  const ground = beside.find(isOutdoorGround);
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      volume.set(vx, SUBFLOOR, vz, COLORS.subfloor);
      const drawn = ground ? floorVoxel(ground, lx, lz, vx, vz, { tx, ty, tone: noise3(tx, ty, 0, 11), axis: 'x' }) : null;
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

function paintTrack(volume: DenseVolume, layout: TileLayout, tx: number, ty: number, base: number): void {
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
      for (let vy = Math.min(bottom, lift); vy < lift + SUBFLOOR; vy++) volume.set(vx, vy, vz, earthColor('track', vx, vy, vz, lift - vy));
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
  volume.set(vx, vy, vz, darken(jitter(COLORS.wallBody, 0.025, grain), seam));
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

