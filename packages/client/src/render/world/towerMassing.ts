import { isBuildingWall, type TilePoint, type TileRect, type WallMaterialId } from '@containment/shared';
import { BufferAttribute, BufferGeometry, Color } from 'three';
import { mergeVoxelGeometries } from '../voxel/mergeVoxelGeometry.ts';
import { jitter, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE } from '../voxel/voxelKinds.ts';
import { meshVoxels, type VoxelMeshes } from '../voxel/voxelMesher.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import { GROUND_FLOOR, massingAt, STOREY, tileBase, TOWER, TOWER_NEON, towerFace, towerSalt, type OwnedLayout, type Side } from './levelVoxels.ts';
import { aerial, airUnit, fillBox, waterTank, type VoxelPut } from './rooftopProps.ts';
import { WALL_PALETTE } from './wallPalette.ts';
import { FLOOR_LAYERS, TILE_RESOLUTION, WALL_LAYERS, ZONE_MESH_ORIGIN, ZONE_VOXEL_SIZE } from './worldScale.ts';

const R = TILE_RESOLUTION;
export const TOWER_STOREYS = [14, 32] as const;
const SETBACK = [1, 2] as const;
const CROWN_FROM = 20;
const CROWN_WIDTH = 8;
const MAST_FROM = 24;
const MAST_HEIGHT = 22;
const BLOCK_REACH = 40;
const RECESS_SHADE = 0.86;
const JAMB_SHADE = 0.74;
const NEON_SHARE = 0.55;

export interface TowerTier {
  readonly rect: TileRect;
  readonly from: number;
  readonly to: number;
}

export interface TowerBlock {
  readonly rect: TileRect;
  readonly material: WallMaterialId;
  readonly street: number;
  readonly top: number;
  readonly storeys: number;
  readonly tiers: readonly TowerTier[];
  readonly neon: number | null;
}

interface Cell {
  readonly color: number;
  readonly emissive: boolean;
  readonly recessed: boolean;
}

interface Frame {
  readonly alongX: boolean;
  readonly outward: 1 | -1;
}

const FRAMES: Readonly<Record<Side, Frame>> = {
  south: { alongX: true, outward: 1 },
  north: { alongX: true, outward: -1 },
  east: { alongX: false, outward: 1 },
  west: { alongX: false, outward: -1 },
};
const SIDE_ORDER: readonly Side[] = ['north', 'south', 'west', 'east'];
const AROUND = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

const inside = (rect: TileRect, x: number, y: number): boolean => x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height;
const shrink = (rect: TileRect, by: number): TileRect => ({ x: rect.x + by, y: rect.y + by, width: rect.width - 2 * by, height: rect.height - 2 * by });
const onEdge = (rect: TileRect, x: number, y: number, side: Side): boolean =>
  side === 'north' ? y === rect.y : side === 'south' ? y === rect.y + rect.height - 1 : side === 'west' ? x === rect.x : x === rect.x + rect.width - 1;

export function towerTiers(rect: TileRect, top: number, street: number): { readonly storeys: number; readonly tiers: TowerTier[] } {
  const pick = (salt: number): number => noise3(rect.x, rect.y, salt, 977);
  const storeys = TOWER_STOREYS[0] + Math.floor((TOWER_STOREYS[1] - TOWER_STOREYS[0] + 1) * pick(1) ** 1.3);
  const roof = street + FLOOR_LAYERS + GROUND_FLOOR + storeys * STOREY;
  const shell = Math.max(3, Math.round((roof - top) / STOREY));
  const setback = SETBACK[0] + Math.floor(pick(2) * (SETBACK[1] - SETBACK[0] + 1));
  const narrow = Math.min(rect.width, rect.height) - 2 * setback;
  const crowned = storeys >= CROWN_FROM && narrow >= CROWN_WIDTH;
  const first = Math.max(2, Math.round(shell * (0.48 + 0.16 * pick(3))));
  const second = crowned ? Math.min(shell - 2, Math.max(first + 2, Math.round(shell * (0.8 + 0.08 * pick(4))))) : shell;
  const tiers: TowerTier[] = [{ rect, from: top, to: top + first * STOREY }];
  if (narrow >= 2) tiers.push({ rect: shrink(rect, setback), from: top + first * STOREY, to: top + second * STOREY });
  else tiers[0] = { rect, from: top, to: top + shell * STOREY };
  if (crowned && second < shell) tiers.push({ rect: shrink(rect, setback + 2), from: top + second * STOREY, to: top + shell * STOREY });
  return { storeys, tiers };
}

const BLOCKS = new WeakMap<OwnedLayout, Map<number, TowerBlock | null>>();

function findBlock(layout: OwnedLayout, tx: number, ty: number): TowerBlock | null {
  const tiles: TilePoint[] = [{ x: tx, y: ty }];
  const seen = new Set<number>([ty * layout.width + tx]);
  for (let head = 0; head < tiles.length; head++) {
    const tile = tiles[head] as TilePoint;
    for (const [dx, dy] of AROUND) {
      const x = tile.x + dx;
      const y = tile.y + dy;
      const key = y * layout.width + x;
      if (seen.has(key) || Math.abs(x - tx) > BLOCK_REACH || Math.abs(y - ty) > BLOCK_REACH || massingAt(layout, x, y) !== 'tower') continue;
      seen.add(key);
      tiles.push({ x, y });
    }
  }
  const xs = tiles.map((tile) => tile.x);
  const ys = tiles.map((tile) => tile.y);
  const rect = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs) + 1, height: Math.max(...ys) - Math.min(...ys) + 1 };
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) if (!isBuildingWall(layout.tileAt({ x, y }))) return null;
  }
  let base = 0;
  for (const tile of tiles) base = Math.max(base, tileBase(layout, tile.x, tile.y));
  let street = base;
  for (let x = rect.x - 1; x <= rect.x + rect.width; x++) {
    for (const y of [rect.y - 1, rect.y + rect.height]) street = Math.min(street, tileBase(layout, x, y));
  }
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (const x of [rect.x - 1, rect.x + rect.width]) street = Math.min(street, tileBase(layout, x, y));
  }
  const top = base + FLOOR_LAYERS + WALL_LAYERS - 1;
  const { storeys, tiers } = towerTiers(rect, top, street);
  const neon = noise3(rect.x, rect.y, 6, 977) < NEON_SHARE ? (TOWER_NEON[Math.floor(noise3(rect.x, rect.y, 7, 977) * TOWER_NEON.length)] ?? TOWER_NEON[0]) : null;
  return { rect, material: layout.tileAt({ x: tx, y: ty }) as WallMaterialId, street, top, storeys, tiers, neon };
}

function blockFrom(layout: OwnedLayout, known: Map<number, TowerBlock | null>, tx: number, ty: number): TowerBlock | null {
  const key = ty * layout.width + tx;
  const cached = known.get(key);
  if (cached !== undefined) return cached;
  const block = findBlock(layout, tx, ty);
  if (!block) {
    known.set(key, null);
    return null;
  }
  for (let y = block.rect.y; y < block.rect.y + block.rect.height; y++) {
    for (let x = block.rect.x; x < block.rect.x + block.rect.width; x++) known.set(y * layout.width + x, block);
  }
  return block;
}

export function towerBlockAt(layout: OwnedLayout, tx: number, ty: number): TowerBlock | null {
  let known = BLOCKS.get(layout);
  if (!known) {
    known = new Map();
    BLOCKS.set(layout, known);
  }
  const key = ty * layout.width + tx;
  const cached = known.get(key);
  if (cached !== undefined) return cached;
  if (!isBuildingWall(layout.tileAt({ x: tx, y: ty }))) return null;
  if (massingAt(layout, tx, ty) === 'tower') return blockFrom(layout, known, tx, ty);
  for (const [dx, dy] of AROUND) {
    if (massingAt(layout, tx + dx, ty + dy) !== 'tower') continue;
    const block = blockFrom(layout, known, tx + dx, ty + dy);
    if (block && inside(block.rect, tx, ty)) return block;
  }
  known.set(key, null);
  return null;
}

export function towerTopAt(layout: OwnedLayout, tx: number, ty: number): number | null {
  const block = towerBlockAt(layout, tx, ty);
  if (!block) return null;
  let top = block.top;
  for (const tier of block.tiers) if (inside(tier.rect, tx, ty)) top = tier.to;
  return top;
}

const LINEAR = new Map<number, readonly [number, number, number]>();
const linear = (hex: number): readonly [number, number, number] => {
  const known = LINEAR.get(hex);
  if (known) return known;
  const color = new Color(hex);
  const channels = [color.r, color.g, color.b] as const;
  LINEAR.set(hex, channels);
  return channels;
};

type Point = readonly [number, number, number];

class QuadBuffer {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly colors: number[] = [];
  private readonly indices: number[] = [];

  quad(corners: readonly [Point, Point, Point, Point], normal: Point, color: number, shade = 1): void {
    const [a, b, c] = corners;
    const cross = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
    const ordered = cross[0]! * normal[0] + cross[1]! * normal[1] + cross[2]! * normal[2] >= 0 ? corners : ([corners[3], corners[2], corners[1], corners[0]] as const);
    const base = this.positions.length / 3;
    const [red, green, blue] = linear(color);
    for (const corner of ordered) {
      this.positions.push(ZONE_MESH_ORIGIN[0] + corner[0] * ZONE_VOXEL_SIZE, ZONE_MESH_ORIGIN[1] + corner[1] * ZONE_VOXEL_SIZE, ZONE_MESH_ORIGIN[2] + corner[2] * ZONE_VOXEL_SIZE);
      this.normals.push(normal[0], normal[1], normal[2]);
      this.colors.push(red * shade, green * shade, blue * shade);
    }
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  geometry(): BufferGeometry | null {
    if (this.indices.length === 0) return null;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.positions), 3));
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array(this.normals), 3));
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(this.colors), 3));
    const count = this.positions.length / 3;
    geometry.setIndex(new BufferAttribute(count > 65535 ? Uint32Array.from(this.indices) : Uint16Array.from(this.indices), 1));
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    return geometry;
  }
}

interface Shell {
  readonly solid: QuadBuffer;
  readonly emissive: QuadBuffer;
}

function faceCells(block: TowerBlock, tier: TowerTier, side: Side, tx: number, ty: number): (along: number, vy: number) => Cell {
  const { alongX } = FRAMES[side];
  const start = (alongX ? tier.rect.x : tier.rect.y) * R;
  const end = start + (alongX ? tier.rect.width : tier.rect.height) * R;
  const crown = block.neon !== null && tier === block.tiers[block.tiers.length - 1];
  const cap = WALL_PALETTE[block.material].cap;
  return (along, vy) => {
    if (along < start || along >= end || vy >= tier.to) return { color: cap, emissive: false, recessed: false };
    if (vy < tier.from) return { color: tier.from === block.top ? towerFace(block.material, side, along, vy, block.street, block.top, towerSalt(tx, ty)).color : TOWER.deck, emissive: false, recessed: false };
    if (crown && vy === tier.to - 1) return { color: block.neon as number, emissive: true, recessed: false };
    const face = towerFace(block.material, side, along, vy, block.street, block.top, alongX ? towerSalt(Math.floor(along / R), ty) : towerSalt(tx, Math.floor(along / R)));
    return { color: face.color, emissive: face.kind === VOXEL_EMISSIVE, recessed: face.recessed === true };
  };
}

interface Span {
  readonly from: number;
  readonly to: number;
  readonly bottom: number;
  top: number;
  readonly key: number;
}

function spansOf(first: number, from: number, to: number, keyAt: (along: number, vy: number) => number): Span[] {
  const done: Span[] = [];
  let open = new Map<string, Span>();
  for (let vy = from; vy < to; vy++) {
    const next = new Map<string, Span>();
    let start = first;
    for (let along = first + 1; along <= first + R; along++) {
      const key = keyAt(along - 1, vy);
      if (along < first + R && keyAt(along, vy) === key) continue;
      const id = start + ':' + along + ':' + key;
      const known = open.get(id);
      if (known) {
        known.top = vy + 1;
        next.set(id, known);
        open.delete(id);
      } else next.set(id, { from: start, to: along, bottom: vy, top: vy + 1, key });
      start = along;
    }
    done.push(...open.values());
    open = next;
  }
  done.push(...open.values());
  return done;
}

function emitFace(shell: Shell, block: TowerBlock, tier: TowerTier, side: Side, tx: number, ty: number): void {
  const { alongX, outward } = FRAMES[side];
  const plane = alongX ? (outward > 0 ? ty + 1 : ty) * R : (outward > 0 ? tx + 1 : tx) * R;
  const point = (along: number, vy: number, depth: number): Point => (alongX ? [along, vy, plane - outward * depth] : [plane - outward * depth, vy, along]);
  const normal: Point = alongX ? [0, 0, outward] : [outward, 0, 0];
  const across = (sign: number): Point => (alongX ? [sign, 0, 0] : [0, 0, sign]);
  const cell = faceCells(block, tier, side, tx, ty);
  const first = (alongX ? tx : ty) * R;
  for (const span of spansOf(first, tier.from, tier.to, (along, vy) => {
    const value = cell(along, vy);
    return value.color * 4 + (value.emissive ? 2 : 0) + (value.recessed ? 1 : 0);
  })) {
    const value = cell(span.from, span.bottom);
    const depth = value.recessed ? 1 : 0;
    const shade = value.emissive ? 1 : value.recessed ? RECESS_SHADE : 1;
    (value.emissive ? shell.emissive : shell.solid).quad([point(span.from, span.bottom, depth), point(span.to, span.bottom, depth), point(span.to, span.top, depth), point(span.from, span.top, depth)], normal, value.color, shade);
  }
  const jamb = (from: number, to: number, at: (step: number) => Cell, place: (start: number, end: number) => readonly [Point, Point, Point, Point], facing: Point): void => {
    let start = -1;
    let color = 0;
    for (let step = from; step <= to; step++) {
      const next = step < to ? at(step) : null;
      const open = next !== null && !next.recessed;
      if (start >= 0 && (!open || next.color !== color)) {
        shell.solid.quad(place(start, step), facing, color, JAMB_SHADE);
        start = -1;
      }
      if (open && start < 0) {
        start = step;
        color = next.color;
      }
    }
  };
  for (const span of spansOf(first, tier.from, tier.to, (along, vy) => (cell(along, vy).recessed ? 1 : 0))) {
    if (span.key !== 1) continue;
    jamb(span.from, span.to, (along) => cell(along, span.bottom - 1), (start, end) => [point(start, span.bottom, 0), point(end, span.bottom, 0), point(end, span.bottom, 1), point(start, span.bottom, 1)], [0, 1, 0]);
    jamb(span.from, span.to, (along) => cell(along, span.top), (start, end) => [point(start, span.top, 0), point(end, span.top, 0), point(end, span.top, 1), point(start, span.top, 1)], [0, -1, 0]);
    jamb(span.bottom, span.top, (vy) => cell(span.from - 1, vy), (start, end) => [point(span.from, start, 0), point(span.from, end, 0), point(span.from, end, 1), point(span.from, start, 1)], across(1));
    jamb(span.bottom, span.top, (vy) => cell(span.to, vy), (start, end) => [point(span.to, start, 0), point(span.to, end, 0), point(span.to, end, 1), point(span.to, start, 1)], across(-1));
  }
  const cap = WALL_PALETTE[block.material].cap;
  shell.solid.quad([point(first, tier.to, 0), point(first + R, tier.to, 0), point(first + R, tier.to + 1, 0), point(first, tier.to + 1, 0)], normal, cap);
  shell.solid.quad([point(first, tier.to + 1, 0), point(first + R, tier.to + 1, 0), point(first + R, tier.to + 1, 1), point(first, tier.to + 1, 1)], [0, 1, 0], cap);
  shell.solid.quad([point(first, tier.to, 1), point(first + R, tier.to, 1), point(first + R, tier.to + 1, 1), point(first, tier.to + 1, 1)], [-normal[0], 0, -normal[2]], cap, JAMB_SHADE);
}

function emitDeck(shell: Shell, tier: TowerTier, tx: number, ty: number, index: number): void {
  const x = tx * R;
  const z = ty * R;
  const y = tier.to;
  shell.solid.quad([[x, y, z], [x + R, y, z], [x + R, y, z + R], [x, y, z + R]], [0, 1, 0], jitter(TOWER.deck, 0.03, noise3(tx, ty, index, 761)));
}

function clutterOf(block: TowerBlock, tier: TowerTier, tx: number, ty: number): VoxelMeshes | null {
  const model = new VoxelModel();
  const x0 = tx * R;
  const z0 = ty * R;
  const put: VoxelPut = (vx, vy, vz, color, kind) => void model.set(vx - x0, vy, vz - z0, color, kind);
  const y = tier.to;
  const centre = { x: tier.rect.x + Math.floor(tier.rect.width / 2), y: tier.rect.y + Math.floor(tier.rect.height / 2) };
  if (block.storeys >= MAST_FROM && tx === centre.x && ty === centre.y) aerial(put, x0 + 4, z0 + 4, y, MAST_HEIGHT, true);
  else {
    const pick = noise3(tx, ty, 0, 751);
    if (pick < 0.07) airUnit(put, x0 + 1, z0 + 2, y);
    else if (pick < 0.11) waterTank(put, x0 + 1, z0 + 1, y);
    else if (pick < 0.14) aerial(put, x0 + 4, z0 + 4, y, 9 + Math.floor(noise3(tx, ty, 1, 753) * 5), noise3(tx, ty, 2, 757) > 0.35);
    else if (pick < 0.165) fillBox(put, x0 + 1, z0 + 1, 6, 6, y, 5, (vx, vy, vz) => (vz === z0 + 6 && vx >= x0 + 3 && vx <= x0 + 4 && vy < y + 4 ? TOWER.shop : vy === y + 4 ? TOWER.plinth : TOWER.headHouse));
  }
  const bounds = model.bounds;
  if (!bounds) return null;
  return meshVoxels(model, bounds, { voxelSize: ZONE_VOXEL_SIZE, origin: [ZONE_MESH_ORIGIN[0] + x0 * ZONE_VOXEL_SIZE, ZONE_MESH_ORIGIN[1], ZONE_MESH_ORIGIN[2] + z0 * ZONE_VOXEL_SIZE] });
}

const joined = (parts: readonly (BufferGeometry | null)[]): BufferGeometry | null => {
  const present = parts.filter((part): part is BufferGeometry => part !== null);
  if (present.length === 0) return null;
  if (present.length === 1) return present[0] as BufferGeometry;
  const merged = mergeVoxelGeometries(present.map((geometry) => ({ geometry })));
  merged.computeBoundingSphere();
  merged.computeBoundingBox();
  return merged;
};

export const joinMeshes = (...meshes: readonly VoxelMeshes[]): VoxelMeshes => ({
  solid: joined(meshes.map((mesh) => mesh.solid)),
  emissive: joined(meshes.map((mesh) => mesh.emissive)),
  glass: joined(meshes.map((mesh) => mesh.glass)),
});

export function towerShellAt(layout: OwnedLayout, tx: number, ty: number): VoxelMeshes | null {
  const block = towerBlockAt(layout, tx, ty);
  if (!block) return null;
  const shell: Shell = { solid: new QuadBuffer(), emissive: new QuadBuffer() };
  let clutter: VoxelMeshes | null = null;
  block.tiers.forEach((tier, index) => {
    if (!inside(tier.rect, tx, ty)) return;
    for (const side of SIDE_ORDER) if (onEdge(tier.rect, tx, ty, side)) emitFace(shell, block, tier, side, tx, ty);
    const next = block.tiers[index + 1];
    if (next && inside(next.rect, tx, ty)) return;
    emitDeck(shell, tier, tx, ty, index);
    if (!next && !SIDE_ORDER.some((side) => onEdge(tier.rect, tx, ty, side))) clutter = clutterOf(block, tier, tx, ty);
  });
  const quads: VoxelMeshes = { solid: shell.solid.geometry(), emissive: shell.emissive.geometry(), glass: null };
  return clutter ? joinMeshes(quads, clutter) : quads;
}
