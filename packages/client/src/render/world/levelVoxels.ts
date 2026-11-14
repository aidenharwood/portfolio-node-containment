import { isBuildingWall, isOutdoorFloor, TILE_KINDS, tileKey, type DecalCell, type TileKindId, type TileLayout, type TileRect, type WallMaterialId } from '@containment/shared';
import { DenseVolume } from '../voxel/denseVolume.ts';
import { darken, jitter, lighten, mix, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS, VOXEL_SOLID } from '../voxel/voxelKinds.ts';
import { decalColor } from './floorDecals.ts';
import { FLOOR_LAYERS, TILE_RESOLUTION, WALL_LAYERS, ZONE_VOLUME_HEIGHT } from './worldScale.ts';

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
  chevron: 0xd6a922,
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
  lintel: 0x26343e,
  lintelLight: 0x7cf29a,
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
  gravel: 0x5e5b55,
  gravelDark: 0x625f58,
  gravelLight: 0x7a766d,
  asphalt: 0x505358,
  asphaltWorn: 0x55575b,
  asphaltLine: 0xd8c27a,
  paving: 0x434548,
  pavingJoint: 0x2c2e31,
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

type Side = 'north' | 'south' | 'east' | 'west';

const isWallKind = (kind: TileKindId): boolean => TILE_KINDS[kind].structure === 'wall';

export function buildTileVolume(layout: TileLayout, region: TileRect): DenseVolume {
  const volume = createTileVolume(region);
  paintTileRows(volume, layout, region, region.y - 1, region.y + region.height + 1);
  return volume;
}

export function createTileVolume(region: TileRect): DenseVolume {
  return new DenseVolume((region.width + 2) * R, ZONE_VOLUME_HEIGHT, (region.height + 2) * R, (region.x - 1) * R, (region.y - 1) * R);
}

type DecalMap = ReadonlyMap<string, readonly DecalCell[]>;

export function paintTileRows(volume: DenseVolume, layout: TileLayout, region: TileRect, fromRow: number, toRow: number, decals?: DecalMap): DenseVolume {
  for (let ty = Math.max(fromRow, region.y - 1); ty < Math.min(toRow, region.y + region.height + 1); ty++) {
    for (let tx = region.x - 1; tx < region.x + region.width + 1; tx++) {
      const kind = layout.tileAt({ x: tx, y: ty });
      if (kind === 'void') continue;
      if (isBuildingWall(kind)) paintWall(volume, layout, tx, ty, kind);
      else if (kind === 'rock') paintRock(volume, layout, tx, ty);
      else if (kind === 'trees') paintTrees(volume, tx, ty);
      else if (kind === 'fence') paintFence(volume, layout, tx, ty);
      else if (kind === 'barrier') paintBarrier(volume, layout, tx, ty);
      else if (kind === 'glass') paintGlass(volume, tx, ty);
      else if (kind === 'track') paintTrack(volume, trackAxis(layout, tx, ty), tx, ty);
      else paintFloor(volume, kind, tx, ty, kind === 'door' ? doorAxis(layout, tx, ty) : 'x', decals?.get(tileKey({ x: tx, y: ty })), seamsOf(layout, kind, tx, ty), blendNeighborsOf(layout, kind, tx, ty));
      if (kind === 'door') paintLintel(volume, layout, tx, ty);
    }
  }
  return volume;
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

function blendNeighborsOf(layout: TileLayout, kind: TileKindId, tx: number, ty: number): readonly BlendNeighbor[] {
  if (!BLENDED.has(kind)) return [];
  const neighbors: BlendNeighbor[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const other = layout.tileAt({ x: tx + dx, y: ty + dy });
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

function seamsOf(layout: TileLayout, kind: TileKindId, tx: number, ty: number): Seams | null {
  if (!SURFACES.has(kind) || kind === 'grate') return null;
  const differs = (x: number, y: number): boolean => {
    const other = layout.tileAt({ x, y });
    return other !== kind && SURFACES.has(other) && !blends(kind, other);
  };
  const seams = { north: differs(tx, ty - 1), south: differs(tx, ty + 1), east: differs(tx + 1, ty), west: differs(tx - 1, ty) };
  return seams.north || seams.south || seams.east || seams.west ? seams : null;
}

function onSeam(seams: Seams, lx: number, lz: number): boolean {
  return (seams.west && lx === 0) || (seams.east && lx === R - 1) || (seams.north && lz === 0) || (seams.south && lz === R - 1);
}

function paintFloor(volume: DenseVolume, kind: TileKindId, tx: number, ty: number, axis: Axis, cells?: readonly DecalCell[], seams?: Seams | null, blendNeighbors: readonly BlendNeighbor[] = []): void {
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
      const decal = cells && kind !== 'door' ? decalColor(cells, lx, lz, surface.color, noise3(vx, FLOOR, vz, 3)) : null;
      if (decal) volume.set(vx, FLOOR, vz, decal.color, decal.emissive ? VOXEL_EMISSIVE : VOXEL_SOLID);
      else volume.set(vx, FLOOR, vz, surface.color, surface.kind);
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

function doorwayRunsAlongX(layout: TileLayout, tx: number, ty: number): boolean {
  const walledBeyond = (dx: number): boolean => {
    let x = tx + dx;
    while (layout.tileAt({ x, y: ty }) === 'door') x += dx;
    const neighbor = layout.tileAt({ x, y: ty });
    return neighbor === 'void' || isWallKind(neighbor);
  };
  return walledBeyond(-1) || walledBeyond(1);
}

function doorAxis(layout: TileLayout, tx: number, ty: number): Axis {
  return doorwayRunsAlongX(layout, tx, ty) ? 'y' : 'x';
}

function floorVoxel(kind: TileKindId, lx: number, lz: number, vx: number, vz: number, tile: FloorTile): FloorVoxel | null {
  const solid = (color: number): FloorVoxel => ({ color, kind: VOXEL_SOLID });
  const edge = lx === 0 || lz === 0;
  switch (kind) {
    case 'plating': {
      if (edge) return solid(COLORS.platingSeam);
      if (lx === 1 && lz === 1) return solid(COLORS.rivet);
      if (tile.tone > 0.975 && lz >= 3 && lz <= 4 && lx >= 2 && lx <= 5) return { color: COLORS.inlay, kind: VOXEL_EMISSIVE };
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
      if (chip > 0.992) return solid(COLORS.terrazzoWarm);
      if (chip > 0.975) return solid(COLORS.terrazzoChip);
      return solid(jitter(COLORS.terrazzo, 0.012, noise3(Math.floor(tile.tx / 2), Math.floor(tile.ty / 2), 0, 29)));
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
      if (lx % 4 === 0 || lz === 0) return solid(COLORS.pavingJoint);
      const slab = noise3(tile.tx * 2 + Math.floor(lx / 4), tile.ty, 0, 233);
      return solid(jitter(slab > 0.86 ? darken(COLORS.paving, 0.18) : COLORS.paving, 0.02, noise3(vx, vz, 0, 239)));
    }
    case 'hazard':
      return solid(even(Math.floor((vx + vz) / 4)) ? COLORS.hazardYellow : COLORS.hazardBlack);
    case 'door': {
      const along = tile.axis === 'x' ? lx : lz;
      const across = tile.axis === 'x' ? lz : lx;
      if (across === 0 || across === R - 1) return solid(COLORS.grateFrame);
      const tip = Math.floor(Math.abs(across - 3.5));
      if (along - 2 === tip || along - 3 === tip) return solid(COLORS.chevron);
      return solid(COLORS.plating);
    }
    default:
      return null;
  }
}

function openSides(layout: TileLayout, tx: number, ty: number): Set<Side> {
  const open = new Set<Side>();
  const check = (side: Side, x: number, y: number) => {
    const neighbor = layout.tileAt({ x, y });
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

const MATERIAL = {
  brick: { body: 0x6e3b2e, joint: 0x4f2a20, cap: 0x7a756d, plinth: 0x3a3734, dado: 0x4a2a28 },
  blockwork: { body: 0x5a5f63, joint: 0x45494c, cap: 0x6e7174, plinth: 0x34383b, dado: 0x34403f },
  cladding: { body: 0x3e5560, joint: 0x4d6772, cap: 0x55656c, plinth: 0x2a3034, dado: 0x2f3c34 },
  wall: { body: 0xd8d6cc, joint: 0xb4b2a8, cap: 0xe4e2d8, plinth: 0x2a2a2a, dado: 0x2a3a45 },
} as const satisfies Record<WallMaterialId, { body: number; joint: number; cap: number; plinth: number; dado: number }>;

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

function facesOutdoors(layout: TileLayout, tx: number, ty: number, side: Side): boolean {
  const [dx, dy] = OUTWARD[side];
  return isOutdoorFloor(layout.tileAt({ x: tx + dx, y: ty + dy }));
}

function windowAt(material: WallMaterialId, tx: number, ty: number, side: Side, h: number, u: number): FaceVoxel | null {
  const bay = (tx + ty) % 2 === 0;
  if (!bay) return null;
  const lit = noise3(tx, ty, SIDE_SALT[side], 211) > 0.4;
  if (material === 'wall') {
    if (h >= 9 && h <= 10 && u >= 1 && u <= 6) return { color: FACADE.slit, kind: VOXEL_EMISSIVE, recessed: true };
    return null;
  }
  if (h === 5 && u >= 1 && u <= 6) return { color: FACADE.sill };
  if (h < 6 || h > 11 || u < 2 || u > 5) return null;
  if (u === 2 || u === 5 || h === 11) return { color: darken(MATERIAL[material].joint, 0.3), recessed: true };
  if (!lit) return { color: FACADE.darkWindow, recessed: true };
  return { color: h === 8 ? darken(FACADE.litWindow, 0.35) : FACADE.litWindow, kind: VOXEL_EMISSIVE, recessed: true };
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

function paintWall(volume: DenseVolume, layout: TileLayout, tx: number, ty: number, material: WallMaterialId): void {
  const open = openSides(layout, tx, ty);
  const palette = MATERIAL[material];
  const outdoors = new Set([...open].filter((side) => facesOutdoors(layout, tx, ty, side)));
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
          volume.set(vx, vy, vz, outer ? lighten(cap, 0.12) : jitter(cap, 0.02, grain));
          continue;
        }
        if (!outer) {
          volume.set(vx, vy, vz, jitter(facility ? COLORS.wallBody : darken(palette.body, 0.35), 0.02, grain));
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

function paintGround(volume: DenseVolume, tx: number, ty: number, color: number, salt: number): void {
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      volume.set(vx, SUBFLOOR, vz, COLORS.subfloor);
      volume.set(vx, FLOOR, vz, jitter(color, 0.06, noise3(vx, vz, 0, salt)));
    }
  }
}

function paintRock(volume: DenseVolume, layout: TileLayout, tx: number, ty: number): void {
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
}

function paintTrees(volume: DenseVolume, tx: number, ty: number): void {
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

function paintBarrier(volume: DenseVolume, layout: TileLayout, tx: number, ty: number): void {
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
}

function fenceAxis(layout: TileLayout, tx: number, ty: number): Axis {
  const isFence = (x: number, y: number): boolean => layout.tileAt({ x, y }) === 'fence';
  return isFence(tx - 1, ty) || isFence(tx + 1, ty) ? 'x' : 'y';
}

function paintFence(volume: DenseVolume, layout: TileLayout, tx: number, ty: number): void {
  const beside = [layout.tileAt({ x: tx, y: ty - 1 }), layout.tileAt({ x: tx, y: ty + 1 }), layout.tileAt({ x: tx - 1, y: ty }), layout.tileAt({ x: tx + 1, y: ty })];
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
}

function trackAxis(layout: TileLayout, tx: number, ty: number): Axis {
  const run = (dx: number, dy: number) => {
    let length = 0;
    while (layout.tileAt({ x: tx + dx * (length + 1), y: ty + dy * (length + 1) }) === 'track') length++;
    return length;
  };
  return run(1, 0) + run(-1, 0) >= run(0, 1) + run(0, -1) ? 'x' : 'y';
}

function trackVoxel(along: number, across: number, grain: number): number | null {
  if (across === 2 || across === R - 3) return jitter(COLORS.rail, 0.04, grain);
  if (along % 4 === 1 && across >= 1 && across <= R - 2) return jitter(COLORS.sleeper, 0.06, grain);
  return null;
}

function paintTrackVoxel(volume: DenseVolume, vx: number, vz: number, along: number, across: number): void {
  const grain = noise3(vx, FLOOR, vz, 17);
  volume.set(vx, SUBFLOOR, vz, grain > 0.7 ? COLORS.ballastStone : jitter(COLORS.ballast, 0.05, grain));
  const surface = trackVoxel(along, across, grain);
  if (surface === null) volume.clear(vx, FLOOR, vz);
  else volume.set(vx, FLOOR, vz, surface);
}

function paintTrack(volume: DenseVolume, axis: Axis, tx: number, ty: number): void {
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      paintTrackVoxel(volume, tx * R + lx, ty * R + lz, axis === 'x' ? lx : lz, axis === 'x' ? lz : lx);
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

function paintTunnel(volume: DenseVolume, side: Side, tx: number, ty: number): void {
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
  volume: DenseVolume,
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

function paintGlass(volume: DenseVolume, tx: number, ty: number): void {
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

function paintLintel(volume: DenseVolume, layout: TileLayout, tx: number, ty: number): void {
  const alongX = doorwayRunsAlongX(layout, tx, ty);
  for (let along = 0; along < R; along++) {
    for (let across = 3; across <= 4; across++) {
      const lx = alongX ? along : across;
      const lz = alongX ? across : along;
      for (let h = WALL_LAYERS - 3; h < WALL_LAYERS; h++) {
        const light = h === WALL_LAYERS - 3 && along >= 2 && along <= 5;
        volume.set(tx * R + lx, FLOOR_LAYERS + h, ty * R + lz, light ? COLORS.lintelLight : COLORS.lintel, light ? VOXEL_EMISSIVE : VOXEL_SOLID);
      }
    }
  }
}
