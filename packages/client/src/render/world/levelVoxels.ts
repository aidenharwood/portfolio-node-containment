import { TILE_KINDS, type TileKindId, type TileLayout, type TileRect } from '@containment/shared';
import { DenseVolume } from '../voxel/denseVolume.ts';
import { darken, jitter, lighten, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS, VOXEL_SOLID } from '../voxel/voxelKinds.ts';
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

export function paintTileRows(volume: DenseVolume, layout: TileLayout, region: TileRect, fromRow: number, toRow: number): DenseVolume {
  for (let ty = Math.max(fromRow, region.y - 1); ty < Math.min(toRow, region.y + region.height + 1); ty++) {
    for (let tx = region.x - 1; tx < region.x + region.width + 1; tx++) {
      const kind = layout.tileAt({ x: tx, y: ty });
      if (kind === 'void') continue;
      if (kind === 'wall') paintWall(volume, layout, tx, ty);
      else if (kind === 'glass') paintGlass(volume, tx, ty);
      else if (kind === 'track') paintTrack(volume, trackAxis(layout, tx, ty), tx, ty);
      else paintFloor(volume, kind, tx, ty);
      if (kind === 'door') paintLintel(volume, layout, tx, ty);
    }
  }
  return volume;
}

function paintFloor(volume: DenseVolume, kind: TileKindId, tx: number, ty: number): void {
  const tileNoise = noise3(tx, ty, 0, 11);
  for (let lz = 0; lz < R; lz++) {
    for (let lx = 0; lx < R; lx++) {
      const vx = tx * R + lx;
      const vz = ty * R + lz;
      const grain = noise3(vx, FLOOR, vz, 3);
      volume.set(vx, SUBFLOOR, vz, kind === 'grate' ? COLORS.grateGlow : COLORS.subfloor, kind === 'grate' ? VOXEL_EMISSIVE : VOXEL_SOLID);
      if (kind === 'coolant') {
        volume.set(vx, SUBFLOOR, vz, jitter(COLORS.coolantBed, 0.03, grain));
        continue;
      }
      const surface = floorVoxel(kind, lx, lz, vx, vz, tileNoise, grain);
      if (surface) volume.set(vx, FLOOR, vz, surface.color, surface.kind);
    }
  }
}

interface FloorVoxel {
  readonly color: number;
  readonly kind: typeof VOXEL_SOLID | typeof VOXEL_EMISSIVE;
}

function floorVoxel(
  kind: TileKindId,
  lx: number,
  lz: number,
  vx: number,
  vz: number,
  tileNoise: number,
  grain: number,
): FloorVoxel | null {
  const solid = (color: number): FloorVoxel => ({ color, kind: VOXEL_SOLID });
  const edge = lx === 0 || lz === 0;
  switch (kind) {
    case 'plating': {
      if (edge) return solid(COLORS.platingSeam);
      if ((lx === 1 || lx === R - 1) && (lz === 1 || lz === R - 1)) return solid(COLORS.rivet);
      if (tileNoise > 0.86 && lx >= 3 && lx <= 4 && lz >= 3 && lz <= 4) return { color: COLORS.inlay, kind: VOXEL_EMISSIVE };
      if (tileNoise < 0.1 && lx === lz) return solid(darken(COLORS.plating, 0.3));
      return solid(jitter(COLORS.plating, 0.025, grain));
    }
    case 'concrete': {
      if (tileNoise > 0.82 && Math.abs(lx - lz) === 1 && lx > 1) return solid(darken(COLORS.concrete, 0.35));
      return solid(jitter(COLORS.concrete, 0.06, grain));
    }
    case 'grate': {
      if (edge || lx === R - 1 || lz === R - 1) return solid(COLORS.grateFrame);
      if (lx % 2 === 1 && lz % 2 === 1) return null;
      return solid(jitter(COLORS.grateBar, 0.03, grain));
    }
    case 'rust': {
      if (edge) return solid(COLORS.rustSeam);
      if (grain > 0.86) return solid(COLORS.rustBright);
      if (tileNoise > 0.7 && noise3(vx, 0, vz, 31) > 0.72) return solid(jitter(COLORS.algae, 0.05, grain));
      return solid(jitter(COLORS.rust, 0.07, grain));
    }
    case 'soil': {
      if (grain > 0.9 && tileNoise > 0.35) return solid(jitter(COLORS.sproutBright, 0.08, grain));
      if (grain > 0.78) return solid(jitter(COLORS.sprout, 0.1, grain));
      if (edge && tileNoise > 0.6) return solid(COLORS.soilDark);
      return solid(jitter(COLORS.soil, 0.09, grain));
    }
    case 'carpet': {
      if (Math.abs(lx - 3.5) + Math.abs(lz - 3.5) === 3) return solid(COLORS.carpetTrim);
      return solid(jitter(COLORS.carpet, 0.035, grain));
    }
    case 'hazard':
      return solid(Math.floor((vx + vz) / 2) % 2 === 0 ? jitter(COLORS.hazardYellow, 0.03, grain) : COLORS.hazardBlack);
    case 'door': {
      if (edge) return solid(COLORS.grateFrame);
      if ((lx + lz) % 4 === 0) return solid(COLORS.chevron);
      return solid(jitter(COLORS.plating, 0.02, grain));
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

function paintWall(volume: DenseVolume, layout: TileLayout, tx: number, ty: number): void {
  const open = openSides(layout, tx, ty);
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
        if (top) {
          volume.set(vx, vy, vz, outer ? lighten(COLORS.wallCap, 0.12) : jitter(COLORS.wallCap, 0.02, grain));
          continue;
        }
        if (!outer) {
          volume.set(vx, vy, vz, jitter(COLORS.wallBody, 0.02, grain));
          continue;
        }
        paintWallFace(volume, vx, vy, vz, h, outer, noise3(tx, ty, SIDE_SALT[outer.side], 9), grain);
      }
    }
  }
  for (const side of tunnelSides(layout, tx, ty)) paintTunnel(volume, side, tx, ty);
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
  const alongX = isWallKind(layout.tileAt({ x: tx - 1, y: ty })) || isWallKind(layout.tileAt({ x: tx + 1, y: ty }));
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
