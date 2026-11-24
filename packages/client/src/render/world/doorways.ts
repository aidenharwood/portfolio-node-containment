import { isOutdoorFloor, TILE_KINDS, type TileKindId } from '@containment/shared';
import { darken, jitter, lighten, mix } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_SOLID } from '../voxel/voxelKinds.ts';
import { FACADE_BAND, FACILITY_WALL, HAZARD, INTERIOR_PLASTER, ROOF_TRAY, WALL_PALETTE } from './wallPalette.ts';
import { TILE_RESOLUTION, WALL_LAYERS } from './worldScale.ts';

const R = TILE_RESOLUTION;

export const DOORWAY_STYLES = ['bulkhead', 'cladding', 'blockwork', 'brick', 'barrier', 'fence', 'seam'] as const;

export type DoorwayStyle = (typeof DOORWAY_STYLES)[number];

const STYLE_OF: Partial<Record<TileKindId, DoorwayStyle>> = {
  wall: 'bulkhead',
  glass: 'bulkhead',
  cladding: 'cladding',
  blockwork: 'blockwork',
  brick: 'brick',
  barrier: 'barrier',
  fence: 'fence',
  trees: 'fence',
  rock: 'seam',
  cliff: 'seam',
};

export const doorwayStyleOf = (kind: TileKindId): DoorwayStyle | null => STYLE_OF[kind] ?? null;

export type TileReader = (x: number, y: number) => TileKindId;

export interface Doorway {
  readonly style: DoorwayStyle;
  readonly alongX: boolean;
  readonly along: number;
  readonly width: number;
  readonly across: number;
  readonly depth: number;
  readonly before: TileKindId;
  readonly after: TileKindId;
}

interface Run {
  readonly count: number;
  readonly beyond: TileKindId;
}

function runFrom(tileAt: TileReader, tx: number, ty: number, dx: number, dy: number): Run {
  let count = 0;
  while (tileAt(tx + dx * (count + 1), ty + dy * (count + 1)) === 'door') count++;
  return { count, beyond: tileAt(tx + dx * (count + 1), ty + dy * (count + 1)) };
}

const walled = (kind: TileKindId): boolean => kind === 'void' || TILE_KINDS[kind].structure === 'wall';

export function pickDoorwayStyle(jambs: readonly TileKindId[]): DoorwayStyle {
  let best: DoorwayStyle = 'bulkhead';
  let rank = Infinity;
  for (const kind of jambs) {
    const style = doorwayStyleOf(kind);
    if (style === null) continue;
    const index = DOORWAY_STYLES.indexOf(style);
    if (index < rank) {
      rank = index;
      best = style;
    }
  }
  return best;
}

export function doorwayAt(tileAt: TileReader, tx: number, ty: number): Doorway {
  const west = runFrom(tileAt, tx, ty, -1, 0);
  const east = runFrom(tileAt, tx, ty, 1, 0);
  const alongX = walled(west.beyond) || walled(east.beyond);
  const north = runFrom(tileAt, tx, ty, 0, -1);
  const south = runFrom(tileAt, tx, ty, 0, 1);
  const [back, front, before, after] = alongX ? [west, east, north, south] : [north, south, west, east];
  return {
    style: pickDoorwayStyle([back.beyond, front.beyond]),
    alongX,
    along: back.count,
    width: back.count + front.count + 1,
    across: before.count,
    depth: before.count + after.count + 1,
    before: before.beyond,
    after: after.beyond,
  };
}

export interface DoorVoxel {
  readonly color: number;
  readonly kind: typeof VOXEL_SOLID | typeof VOXEL_EMISSIVE;
}

export interface DoorSpot {
  readonly along: number;
  readonly across: number;
}

export const doorSpot = (door: Doorway, lx: number, lz: number): DoorSpot => ({
  along: door.along * R + (door.alongX ? lx : lz),
  across: door.across * R + (door.alongX ? lz : lx),
});

export const DOOR_OPENING = 13;

const TOP = WALL_LAYERS - 1;

const DOOR = {
  lit: 0x4fd8ff,
  amber: 0xffb24a,
  status: 0x3fbf7f,
  deck: 0x1d2b35,
  deckSeam: 0x111b21,
  groove: 0x0b1014,
  rail: 0x6f7c86,
  stone: 0x857e72,
  stoneDark: 0x6f695f,
  concrete: 0x6a6e70,
  precast: 0x8c8f91,
  steel: 0x2b3a44,
  steelLight: 0x55656c,
  stud: 0x5e6c74,
  plate: 0x46525a,
  rivet: 0x3d5464,
  pylon: 0x2a3038,
  apron: 0x4c4f52,
  post: 0x6a6e70,
} as const;

const solid = (color: number): DoorVoxel => ({ color, kind: VOXEL_SOLID });
const glow = (color: number): DoorVoxel => ({ color, kind: VOXEL_EMISSIVE });

const hazard = (index: number): DoorVoxel => solid(index % 2 === 0 ? HAZARD.yellow : HAZARD.black);

const span = (door: Doorway): number => door.width * R;
const reach = (door: Doorway): number => door.depth * R;
const fromJamb = (door: Doorway, along: number): number => Math.min(along, span(door) - 1 - along);
const fromCentre = (door: Doorway, along: number): number => Math.abs(along - (span(door) - 1) / 2);

export function doorGround(door: Doorway): TileKindId {
  for (const kind of [door.before, door.after]) if (isOutdoorFloor(kind) && kind !== 'water') return kind;
  return 'paving';
}

export function thresholdVoxel(door: Doorway, spot: DoorSpot, grain: number): DoorVoxel | null {
  const { along, across } = spot;
  const depth = reach(door);
  const edge = across === 0 || across === depth - 1;
  const jamb = fromJamb(door, along);
  const middle = Math.floor(depth / 2);
  switch (door.style) {
    case 'bulkhead': {
      const band = Math.min(across, depth - 1 - across);
      if (band <= 1) return hazard(Math.floor((Math.floor(fromCentre(door, along)) + band) / 2));
      if (across === middle - 1) return solid(DOOR.groove);
      if (across === middle) return solid(DOOR.rail);
      if (band === 2 && jamb >= 2 && along % 4 === 1) return glow(DOOR.lit);
      if (jamb === 0) return solid(DOOR.deckSeam);
      return solid(jitter(DOOR.deck, 0.015, grain));
    }
    case 'brick': {
      if (edge) return solid(jitter(DOOR.stoneDark, 0.02, grain));
      const wear = Math.min(jamb / span(door), Math.min(across, depth - 1 - across) / depth) * 2;
      return solid(jitter(lighten(DOOR.stone, wear * 0.1), 0.03, grain));
    }
    case 'blockwork': {
      if (edge) return solid(DOOR.rail);
      const outdoorRow = (across === 1 && isOutdoorFloor(door.before)) || (across === depth - 2 && isOutdoorFloor(door.after));
      if (outdoorRow) return solid(along % 2 === 0 ? DOOR.groove : DOOR.steel);
      return solid(jitter(DOOR.concrete, 0.025, grain));
    }
    case 'cladding': {
      if (edge) return solid(DOOR.steel);
      if (across === middle - 1) return solid(DOOR.groove);
      if (across === middle) return solid(DOOR.rail);
      const stud = (along % 4 === 1 && across % 4 === 1) || (along % 4 === 3 && across % 4 === 3);
      return solid(stud ? DOOR.stud : jitter(DOOR.plate, 0.02, grain));
    }
    case 'seam': {
      if (edge) return hazard(Math.floor(along / 2));
      if (along % 4 === 0) return solid(DOOR.deckSeam);
      if (across === middle - 1 && jamb >= 2 && along % 4 === 2) return glow(DOOR.amber);
      return solid(jitter(DOOR.steel, 0.02, grain));
    }
    case 'barrier': {
      if (across === middle - 1 || across === middle) return hazard(Math.floor((along + across) / 2));
      if (edge) return solid(darken(DOOR.apron, 0.25));
      return solid(jitter(DOOR.apron, 0.03, grain));
    }
    case 'fence': {
      if (across === middle) return solid(DOOR.rail);
      if (across === middle - 1) return solid(DOOR.groove);
      return null;
    }
  }
}

interface HeaderPalette {
  readonly outdoor: (along: number, h: number, grain: number) => number;
  readonly indoor: (along: number, h: number, grain: number) => number;
  readonly core: number;
  readonly cap: number;
}

const brickCourse = (along: number, h: number, grain: number): number => {
  const offset = (h % 2) * 2;
  return (along + offset) % 4 === 0 ? WALL_PALETTE.brick.joint : jitter(WALL_PALETTE.brick.body, 0.05, grain);
};

const blockCourse = (along: number, h: number, grain: number): number => {
  const offset = (Math.floor(h / 3) % 2) * 2;
  return h % 3 === 0 || (along + offset) % 4 === 0 ? WALL_PALETTE.blockwork.joint : jitter(WALL_PALETTE.blockwork.body, 0.02, grain);
};

const plaster = (_along: number, _h: number, grain: number): number => jitter(INTERIOR_PLASTER, 0.03, grain);

const claddingRib = (along: number): number => (along % 2 === 0 ? WALL_PALETTE.cladding.joint : WALL_PALETTE.cladding.body);

const HEADERS: Readonly<Record<'brick' | 'blockwork' | 'cladding' | 'bulkhead', HeaderPalette>> = {
  brick: { outdoor: brickCourse, indoor: plaster, core: darken(WALL_PALETTE.brick.body, 0.35), cap: WALL_PALETTE.brick.cap },
  blockwork: { outdoor: blockCourse, indoor: plaster, core: darken(WALL_PALETTE.blockwork.body, 0.35), cap: WALL_PALETTE.blockwork.cap },
  cladding: { outdoor: claddingRib, indoor: claddingRib, core: DOOR.steel, cap: WALL_PALETTE.cladding.cap },
  bulkhead: {
    outdoor: (_along, _h, grain) => jitter(WALL_PALETTE.wall.body, 0.015, grain),
    indoor: (_along, _h, grain) => jitter(FACILITY_WALL.body, 0.025, grain),
    core: FACILITY_WALL.body,
    cap: FACILITY_WALL.cap,
  },
};

const tray = (cap: number): number => mix(darken(cap, 0.15), ROOF_TRAY, 0.25);

const HEADER_BOTTOM: Readonly<Record<'brick' | 'blockwork' | 'cladding' | 'bulkhead', number>> = {
  brick: DOOR_OPENING,
  blockwork: DOOR_OPENING,
  cladding: DOOR_OPENING - 1,
  bulkhead: DOOR_OPENING,
};

const CHAMFER = 3;

export function frameVoxel(door: Doorway, spot: DoorSpot, h: number, grain: number): DoorVoxel | null {
  const style = door.style;
  if (style === 'seam' || style === 'fence' || style === 'barrier') return null;
  const { along, across } = spot;
  const depth = reach(door);
  const jamb = fromJamb(door, along);
  const faceBefore = across === 0;
  const faceAfter = across === depth - 1;
  const face = faceBefore || faceAfter;
  const outdoor = (faceBefore && isOutdoorFloor(door.before)) || (faceAfter && isOutdoorFloor(door.after));
  const palette = HEADERS[style];
  const bottom = style === 'bulkhead' ? HEADER_BOTTOM.bulkhead - Math.max(0, CHAMFER - jamb) : HEADER_BOTTOM[style];
  if (h < bottom) {
    return null;
  }
  if (h === TOP) return face ? solid(jitter(lighten(palette.cap, 0.06), 0.02, grain)) : null;
  if (h === TOP - 1 && !face) return solid(jitter(tray(palette.cap), 0.03, grain));
  switch (style) {
    case 'bulkhead': {
      if (h === bottom) return face ? glow(DOOR.lit) : solid(FACILITY_WALL.trim);
      if (face && h === DOOR_OPENING + 1 && fromCentre(door, along) < 1) return glow(outdoor ? DOOR.amber : DOOR.status);
      break;
    }
    case 'brick': {
      if (h === bottom) return solid(jitter(face ? DOOR.stone : DOOR.stoneDark, 0.03, grain));
      break;
    }
    case 'blockwork': {
      if (h <= bottom + 1) return solid(jitter(h === bottom && face ? darken(DOOR.precast, 0.12) : DOOR.precast, 0.02, grain));
      break;
    }
    case 'cladding': {
      if (h === bottom && face) return hazard(Math.floor(along / 2));
      if (outdoor && h === bottom + 2 && fromCentre(door, along) < 1) return glow(DOOR.amber);
      break;
    }
  }
  if (!face) return solid(palette.core);
  return solid((outdoor ? palette.outdoor : palette.indoor)(along, h, grain));
}

export type JambKind = 'brick' | 'blockwork' | 'cladding' | 'wall';

export function revealVoxel(kind: JambKind, h: number, u: number, grain: number): DoorVoxel {
  const arris = u === 0 || u === R - 1;
  switch (kind) {
    case 'brick': {
      if (h <= 1) return solid(jitter(DOOR.stoneDark, 0.03, grain));
      return solid(brickCourse(u, h, grain));
    }
    case 'blockwork': {
      if (h <= 1) return solid(jitter(DOOR.precast, 0.02, grain));
      return solid(blockCourse(u, h, grain));
    }
    case 'cladding': {
      if (arris) return solid(DOOR.steelLight);
      if (u === R / 2 && h % 4 === 2) return solid(DOOR.rivet);
      return solid(jitter(DOOR.steel, 0.02, grain));
    }
    case 'wall': {
      if (h <= 1) return solid(FACILITY_WALL.kick);
      if (arris) return solid(FACILITY_WALL.trim);
      if (u >= R / 2 - 1 && u <= R / 2 && h >= 3 && h <= DOOR_OPENING - 4) return glow(DOOR.lit);
      return solid(jitter(FACILITY_WALL.body, 0.025, grain));
    }
  }
}

export function seamPylonVoxel(h: number, u: number, depth: number): DoorVoxel {
  if (h === TOP) return u >= R / 2 - 1 && u <= R / 2 ? glow(DOOR.amber) : solid(DOOR.pylon);
  if (h >= 2 && h <= 3) return hazard(Math.floor((u + h) / 2));
  if (h === DOOR_OPENING - 1) return solid(FACADE_BAND);
  if (depth === 0 && (u === 0 || u === R - 1)) return solid(lighten(DOOR.pylon, 0.12));
  return solid(DOOR.pylon);
}

export const GATE_POST_HEIGHT = DOOR_OPENING;

export function gatePostVoxel(style: 'fence' | 'barrier', h: number): DoorVoxel | null {
  if (h > GATE_POST_HEIGHT) return null;
  if (h === GATE_POST_HEIGHT) return glow(DOOR.amber);
  if (style === 'barrier') return h < GATE_POST_HEIGHT - 3 ? hazard(Math.floor(h / 2)) : solid(DOOR.apron);
  return solid(h === GATE_POST_HEIGHT - 1 ? DOOR.steelLight : DOOR.post);
}
