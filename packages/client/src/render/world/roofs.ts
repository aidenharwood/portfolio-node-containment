import { isBuildingWall, type TileKindId, type TilePoint, type TileRect, type WallMaterialId } from '@containment/shared';
import { DenseVolume } from '../voxel/denseVolume.ts';
import { darken, jitter, mix, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_SOLID, type VoxelKind } from '../voxel/voxelKinds.ts';
import { smoothNoise, tileBase, type OwnedLayout } from './levelVoxels.ts';
import { airUnit, aerial, vent, waterTank } from './rooftopProps.ts';
import { HAZARD, WALL_PALETTE } from './wallPalette.ts';
import { FLOOR_LAYERS, TILE_RESOLUTION, WALL_LAYERS } from './worldScale.ts';

const R = TILE_RESOLUTION;
const BUILDING_REACH = 6000;
export const ROOF_HEADROOM = 24;
export const PITCH_RUN = 3;

export interface RoofWall {
  readonly x: number;
  readonly y: number;
  readonly top: number;
  readonly kind: TileKindId;
}

export interface RoofBuilding {
  readonly id: number;
  readonly bounds: TileRect;
  readonly material: WallMaterialId;
  readonly eaves: number;
  readonly tiles: ReadonlySet<number>;
  readonly walls: readonly RoofWall[];
}

export interface RoofPlan {
  buildingAt(point: TilePoint): RoofBuilding | null;
  buildingsIn(region: TileRect): RoofBuilding[];
}

const AROUND: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const MATERIALS: readonly WallMaterialId[] = ['wall', 'brick', 'blockwork', 'cladding'];
const NO_PLAN: RoofPlan = { buildingAt: () => null, buildingsIn: () => [] };
const PLANS = new WeakMap<OwnedLayout, RoofPlan>();

const closesRoom = (kind: TileKindId): boolean => isBuildingWall(kind) || kind === 'glass' || kind === 'door' || kind === 'track';

export function roofPlanOf(layout: OwnedLayout): RoofPlan {
  const interiorAt = layout.interiorAt;
  if (!interiorAt) return NO_PLAN;
  const known = PLANS.get(layout);
  if (known) return known;
  const { width, height } = layout;
  const owners = new Map<number, RoofBuilding | null>();
  const inside = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < width && y < height && interiorAt({ x, y });
  const describe = (members: ReadonlySet<number>): RoofBuilding => {
    let id = Infinity;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let eaves = 0;
    const counts = new Map<WallMaterialId, number>();
    const walls: RoofWall[] = [];
    for (const at of members) {
      const x = at % width;
      const y = (at - x) / width;
      id = Math.min(id, at);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      if (inside(x, y)) continue;
      const kind = layout.tileAt({ x, y });
      const top = tileBase(layout, x, y) + FLOOR_LAYERS + WALL_LAYERS;
      walls.push({ x, y, top, kind });
      if (kind !== 'track') eaves = Math.max(eaves, top);
      if (isBuildingWall(kind)) counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
    const material = MATERIALS.reduce<WallMaterialId>((best, each) => ((counts.get(each) ?? 0) > (counts.get(best) ?? 0) ? each : best), 'wall');
    return { id, bounds: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }, material, eaves, tiles: members, walls };
  };
  const flood = (startX: number, startY: number): RoofBuilding | null => {
    const start = startY * width + startX;
    const members = new Set<number>([start]);
    const queue = [start];
    for (let next = 0; next < queue.length; next++) {
      if (queue.length > BUILDING_REACH) {
        for (const at of members) owners.set(at, null);
        return null;
      }
      const at = queue[next] as number;
      const x = at % width;
      const y = (at - x) / width;
      const room = inside(x, y);
      for (let n = 0; n < (room ? AROUND.length : 4); n++) {
        const [dx, dy] = AROUND[n] as readonly [number, number];
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const index = ny * width + nx;
        if (members.has(index)) continue;
        const roomBeside = inside(nx, ny);
        const joins = room ? (roomBeside ? n < 4 : closesRoom(layout.tileAt({ x: nx, y: ny }))) : roomBeside;
        if (!joins) continue;
        members.add(index);
        queue.push(index);
      }
    }
    const building = describe(members);
    for (const at of members) owners.set(at, building);
    return building;
  };
  const buildingAt = ({ x, y }: TilePoint): RoofBuilding | null => {
    if (x < 0 || y < 0 || x >= width || y >= height) return null;
    const at = y * width + x;
    const known = owners.get(at);
    if (known !== undefined) return known;
    if (inside(x, y)) return flood(x, y);
    if (!closesRoom(layout.tileAt({ x, y }))) return null;
    for (const [dx, dy] of AROUND) {
      if (!inside(x + dx, y + dy)) continue;
      if (owners.get((y + dy) * width + x + dx) === undefined) flood(x + dx, y + dy);
      return owners.get(at) ?? null;
    }
    return null;
  };
  const plan: RoofPlan = {
    buildingAt,
    buildingsIn: (region) => {
      const found = new Map<number, RoofBuilding>();
      for (let y = region.y; y < region.y + region.height; y++) {
        for (let x = region.x; x < region.x + region.width; x++) {
          const building = buildingAt({ x, y });
          if (building) found.set(building.id, building);
        }
      }
      return [...found.values()].sort((a, b) => a.id - b.id);
    },
  };
  PLANS.set(layout, plan);
  return plan;
}

export interface RoofVolume {
  readonly volume: DenseVolume;
  readonly floor: number;
}

const ROOF = {
  panel: 0xc6c9c3,
  panelSeam: 0xa9ada8,
  ventSlot: 0x2b3034,
  mast: 0x4d565c,
  beacon: 0xff3b24,
  sheet: 0x6a787f,
  sheetValley: 0x58656b,
  sheetSeam: 0x48535a,
  rust: 0x7a4a2a,
  unit: 0xa0a6a9,
  unitDark: 0x7d8487,
  fan: 0x202528,
  tar: 0x2e3133,
  tarPatch: 0x242628,
  curb: 0x7b7f83,
  pane: 0xd9a35e,
  darkPane: 0x1a2731,
  hatch: 0x565a5d,
  clay: 0x8a4a33,
  clayDark: 0x6e3a28,
  ridge: 0x4a2a20,
  moss: 0x5a5a3a,
  soot: 0x221e1c,
} as const;

const even = (value: number): boolean => ((value % 2) + 2) % 2 === 0;
const ramp = (from: number, to: number, value: number): number => Math.max(0, Math.min(1, (value - from) / (to - from)));

class RoofCanvas {
  readonly building: RoofBuilding;
  readonly volume: DenseVolume;
  readonly floor: number;
  readonly eaves: number;
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
  readonly seed: number;
  private readonly layoutWidth: number;

  constructor(building: RoofBuilding, layoutWidth: number, floor: number) {
    this.building = building;
    this.layoutWidth = layoutWidth;
    this.floor = floor;
    this.eaves = building.eaves;
    this.x0 = building.bounds.x * R;
    this.z0 = building.bounds.y * R;
    this.x1 = this.x0 + building.bounds.width * R;
    this.z1 = this.z0 + building.bounds.height * R;
    this.seed = building.id % 100003;
    this.volume = new DenseVolume(this.x1 - this.x0, building.eaves - floor + ROOF_HEADROOM, this.z1 - this.z0, this.x0, this.z0);
  }

  get width(): number {
    return this.x1 - this.x0;
  }

  get depth(): number {
    return this.z1 - this.z0;
  }

  covered(vx: number, vz: number): boolean {
    if (vx < this.x0 || vz < this.z0 || vx >= this.x1 || vz >= this.z1) return false;
    return this.building.tiles.has(Math.floor(vz / R) * this.layoutWidth + Math.floor(vx / R));
  }

  edge(vx: number, vz: number): number {
    return Math.min(vx - this.x0, this.x1 - 1 - vx, vz - this.z0, this.z1 - 1 - vz);
  }

  hash(salt: number): number {
    return noise3(this.seed, salt, 0, 433);
  }

  count(least: number): number {
    return least + Math.floor((this.building.bounds.width * this.building.bounds.height) / 60 + this.hash(least + 11) * 1.5);
  }

  set(vx: number, y: number, vz: number, color: number, kind: VoxelKind = VOXEL_SOLID): void {
    this.volume.set(vx, y - this.floor, vz, color, kind);
  }

  readonly put = (vx: number, y: number, vz: number, color: number, kind: VoxelKind = VOXEL_SOLID): void => this.set(vx, y, vz, color, kind);

  columns(paint: (vx: number, vz: number) => void): void {
    for (let vz = this.z0; vz < this.z1; vz++) {
      for (let vx = this.x0; vx < this.x1; vx++) if (this.covered(vx, vz)) paint(vx, vz);
    }
  }

  box(x: number, z: number, width: number, depth: number, y: number, height: number, color: (vx: number, vy: number, vz: number) => number, kind: VoxelKind = VOXEL_SOLID): void {
    for (let vy = y; vy < y + height; vy++) {
      for (let vz = z; vz < z + depth; vz++) {
        for (let vx = x; vx < x + width; vx++) this.set(vx, vy, vz, color(vx, vy, vz), kind);
      }
    }
  }

  spots(salt: number): { readonly x: number; readonly z: number }[] {
    const spots: { x: number; z: number; rank: number }[] = [];
    for (let vz = this.z0 + 10; vz <= this.z1 - 16; vz += 12) {
      for (let vx = this.x0 + 10; vx <= this.x1 - 16; vx += 12) {
        if (this.covered(vx, vz) && this.covered(vx + 6, vz + 6)) spots.push({ x: vx, z: vz, rank: noise3(vx, vz, this.seed, salt) });
      }
    }
    return spots.sort((a, b) => a.rank - b.rank);
  }
}

function paintSkirts(roof: RoofCanvas): void {
  for (const wall of roof.building.walls) {
    if (wall.kind === 'track' || wall.top >= roof.eaves) continue;
    const body = WALL_PALETTE[isBuildingWall(wall.kind) ? wall.kind : roof.building.material].body;
    for (let lz = 0; lz < R; lz++) {
      for (let lx = 0; lx < R; lx++) {
        for (let y = wall.top; y < roof.eaves; y++) roof.set(wall.x * R + lx, y, wall.y * R + lz, y === wall.top ? darken(body, 0.12) : body);
      }
    }
  }
}

function slab(roof: RoofCanvas, deck: (vx: number, vz: number) => number, rim: (vx: number, vz: number) => number, rimWidth = 1): void {
  roof.columns((vx, vz) => {
    const edge = roof.edge(vx, vz);
    if (edge >= rimWidth) {
      roof.set(vx, roof.eaves, vz, deck(vx, vz));
      return;
    }
    roof.set(vx, roof.eaves, vz, rim(vx, vz));
    if (edge === 0) roof.set(vx, roof.eaves + 1, vz, rim(vx, vz));
  });
}

function directorateRoof(roof: RoofCanvas): void {
  const hazard = (vx: number, vz: number): number => (even(Math.floor((vx + vz) / 2)) ? HAZARD.yellow : HAZARD.black);
  slab(roof, (vx, vz) => ((vx - roof.x0) % R === 0 || (vz - roof.z0) % R === 0 ? ROOF.panelSeam : ROOF.panel), hazard, 2);
  const base = roof.eaves + 1;
  const spots = roof.spots(461);
  let next = 0;
  if (roof.hash(9) > 0.4 && spots[0]) {
    const plant = spots[next++] as { readonly x: number; readonly z: number };
    roof.box(plant.x - 2, plant.z - 1, 10, 6, base, 4, (vx, vy, vz) => (vy === base + 3 ? ROOF.unitDark : even(vx) && vy > base && (vz === plant.z - 1 || vz === plant.z + 4) ? ROOF.ventSlot : ROOF.unit));
    for (const dx of [0, 5]) roof.box(plant.x + dx, plant.z + 1, 2, 2, base + 4, 1, () => ROOF.fan);
  }
  const vents = roof.count(2);
  for (const spot of spots.slice(next, next + vents)) vent(roof.put, spot.x, spot.z, base);
  const corner = roof.hash(2) < 0.5;
  const mastX = corner ? roof.x1 - 5 : roof.x0 + 4;
  roof.box(mastX - 1, roof.z0 + 3, 3, 3, base, 1, () => ROOF.mast);
  roof.box(mastX, roof.z0 + 4, 1, 1, base + 1, 6, () => ROOF.mast);
  roof.box(mastX, roof.z0 + 4, 1, 1, base + 7, 1, () => ROOF.beacon, VOXEL_EMISSIVE);
}

function claddingRoof(roof: RoofCanvas): void {
  const salt = roof.seed % 97;
  slab(
    roof,
    (vx, vz) => {
      if ((vx - roof.x0) % (R * 3) === 0) return ROOF.sheetSeam;
      const sheet = even(vz) ? ROOF.sheet : ROOF.sheetValley;
      const streak = ramp(0.6, 0.85, smoothNoise(vx * 0.3, vz, 5, 503 + salt));
      return mix(sheet, ROOF.rust, streak * 0.45);
    },
    () => WALL_PALETTE.cladding.cap,
  );
  const base = roof.eaves + 1;
  const spots = roof.spots(467);
  const units = roof.count(1);
  let next = 0;
  for (const spot of spots.slice(next, next + units)) airUnit(roof.put, spot.x, spot.z, base);
  next += units;
  const tank = spots[next];
  if (tank && roof.hash(4) > 0.35) {
    next++;
    waterTank(roof.put, tank.x, tank.z, base);
  }
  const aerials = 1 + Math.floor(roof.hash(5) * 2);
  for (const spot of spots.slice(next, next + aerials)) aerial(roof.put, spot.x + 2, spot.z + 2, base, 9 + Math.floor(noise3(spot.x, spot.z, 0, 471) * 5), noise3(spot.z, spot.x, 0, 473) > 0.4);
}

function blockworkRoof(roof: RoofCanvas): void {
  const salt = roof.seed % 89;
  slab(roof, (vx, vz) => mix(ROOF.tar, ROOF.tarPatch, ramp(0.45, 0.75, smoothNoise(vx, vz, 7, 521 + salt))), () => WALL_PALETTE.blockwork.cap);
  const base = roof.eaves + 1;
  const spots = roof.spots(479);
  const lights = roof.count(1);
  for (const spot of spots.slice(0, lights)) {
    const lit = noise3(spot.x, spot.z, 0, 487) > 0.3;
    roof.box(spot.x - 1, spot.z, 9, 6, base, 1, (vx, vy, vz) => {
      const frame = vx === spot.x - 1 || vx === spot.x + 7 || vz === spot.z || vz === spot.z + 5;
      return frame ? ROOF.curb : ROOF.darkPane;
    });
    roof.box(spot.x, spot.z + 1, 7, 4, base, 1, (vx) => (vx === spot.x + 3 ? ROOF.curb : lit ? ROOF.pane : ROOF.darkPane), lit ? VOXEL_EMISSIVE : VOXEL_SOLID);
  }
  const hatch = spots[lights];
  if (hatch) {
    roof.box(hatch.x, hatch.z, 3, 3, base, 1, () => ROOF.hatch);
    roof.box(hatch.x + 4, hatch.z + 1, 1, 1, base, 3, () => ROOF.ventSlot);
  }
}

function tiledRoof(roof: RoofCanvas): void {
  const alongX = roof.width >= roof.depth;
  const span = alongX ? roof.depth : roof.width;
  const length = alongX ? roof.width : roof.depth;
  const half = Math.floor(span / 2);
  const ridgeRise = Math.floor((half - 1) / PITCH_RUN);
  const salt = roof.seed % 83;
  const brick = WALL_PALETTE.brick;
  roof.columns((vx, vz) => {
    const across = alongX ? vz - roof.z0 : vx - roof.x0;
    const along = alongX ? vx - roof.x0 : vz - roof.z0;
    const reach = Math.min(across, span - 1 - across);
    const rise = Math.floor(reach / PITCH_RUN);
    const top = roof.eaves + rise;
    const gable = along === 0 || along === length - 1;
    for (let y = roof.eaves; y < top; y++) {
      const course = y - roof.eaves;
      const joint = even(course) ? across % 4 === 0 : (across + 2) % 4 === 0;
      roof.set(vx, y, vz, gable ? (joint ? brick.joint : brick.body) : ROOF.clayDark);
    }
    const tile = Math.floor((along + (even(rise) ? 0 : 2)) / 4);
    const tone = jitter(even(rise) ? ROOF.clay : darken(ROOF.clay, 0.06), 0.035, noise3(tile, rise, salt, 491));
    const edged = reach % PITCH_RUN === 0 ? darken(tone, 0.16) : tone;
    const moss = ramp(0.6, 0.85, smoothNoise(vx, vz, 9, 497 + salt)) * 0.4;
    roof.set(vx, top, vz, mix(edged, ROOF.moss, moss));
    if (rise === ridgeRise && reach >= half - 1) roof.set(vx, top + 1, vz, ROOF.ridge);
  });
  if (roof.hash(7) < 0.3) return;
  const along = roof.hash(8) < 0.5 ? 12 : length - 16;
  const across = half + 2;
  const top = roof.eaves + ridgeRise + 5;
  for (let a = along; a < along + 4; a++) {
    for (let c = across; c < across + 4; c++) {
      const vx = alongX ? roof.x0 + a : roof.x0 + c;
      const vz = alongX ? roof.z0 + c : roof.z0 + a;
      for (let y = roof.eaves; y <= top; y++) roof.set(vx, y, vz, y === top ? ROOF.soot : even(y) ? brick.body : brick.joint);
    }
  }
}

const STYLES: Readonly<Record<WallMaterialId, (roof: RoofCanvas) => void>> = {
  wall: directorateRoof,
  cladding: claddingRoof,
  blockwork: blockworkRoof,
  brick: tiledRoof,
};

export function paintRoof(layout: OwnedLayout, building: RoofBuilding): RoofVolume {
  const floor = building.walls.reduce((low, wall) => (wall.kind === 'track' ? low : Math.min(low, wall.top)), building.eaves);
  const roof = new RoofCanvas(building, layout.width, floor);
  paintSkirts(roof);
  STYLES[building.material](roof);
  return { volume: roof.volume, floor };
}

export interface Point3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type RoofBox = readonly [number, number, number, number, number, number];

export function segmentHitsBox(from: Point3, to: Point3, box: RoofBox): boolean {
  let near = 0;
  let far = 1;
  const axes = [
    [from.x, to.x, box[0], box[3]],
    [from.y, to.y, box[1], box[4]],
    [from.z, to.z, box[2], box[5]],
  ] as const;
  for (const [start, end, min, max] of axes) {
    const delta = end - start;
    if (Math.abs(delta) < 1e-9) {
      if (start < min || start > max) return false;
      continue;
    }
    const a = (min - start) / delta;
    const b = (max - start) / delta;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near > far) return false;
  }
  return true;
}
