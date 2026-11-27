import { isBuildingWall, type RegionId, type TileKindId, type TileRect, type WallMaterialId } from '@containment/shared';
import { BufferAttribute, BufferGeometry, Color, type Group } from 'three';
import { FACADE_GROUND_FLOOR, FACADE_PANE, FACADE_STOREY, TOWER_FACE, TOWER_SIGNS, towerBlock, towerFacade, towerPaneGlow, towerSpotAt, wallFacade, type FacadeVoxel, type TowerSpot } from '../far/facadePattern.ts';
import { createVoxelObject } from '../voxel/voxelMaterials.ts';
import { VOXEL_EMPTY } from '../voxel/voxelKinds.ts';
import { buildTileVolume, facesOutdoors, massingAt, tileBase, TOWER, type OwnedLayout, type Side } from './levelVoxels.ts';
import { WALL_PALETTE } from './wallPalette.ts';
import { FLOOR_LAYERS, TILE_RESOLUTION, WALL_LAYERS, ZONE_VOLUME_HEIGHT, ZONE_VOXEL_SIZE } from './worldScale.ts';

interface Tint {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly rise: number;
}

const R = TILE_RESOLUTION;
const SIDE_SHADE = 0.62;
const FACE_LIFT = 0.004;
const TINTS = new Map<string, Tint>();
const NO_TINT: Tint = { red: 0, green: 0, blue: 0, rise: FLOOR_LAYERS };
const FACE_SIDES: readonly Side[] = ['north', 'south', 'west', 'east'];
const OUTWARD: Readonly<Record<Side, readonly [number, number]>> = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] };
const scratch = new Color();

export function tileTint(kind: TileKindId, region?: RegionId): Tint {
  const key = `${region ?? ''}:${kind}`;
  const cached = TINTS.get(key);
  if (cached) return cached;
  if (kind === 'void') return NO_TINT;
  const sample: OwnedLayout = { width: 3, height: 3, tileAt: ({ x, y }) => (x >= 0 && y >= 0 && x < 3 && y < 3 ? kind : 'void'), heightAt: () => 0, regionAt: () => region };
  const volume = buildTileVolume(sample, { x: 1, y: 1, width: 1, height: 1 });
  const color = new Color();
  let red = 0;
  let green = 0;
  let blue = 0;
  let rise = 0;
  let count = 0;
  for (let vz = R; vz < 2 * R; vz++) {
    for (let vx = R; vx < 2 * R; vx++) {
      for (let vy = ZONE_VOLUME_HEIGHT - 1; vy >= 0; vy--) {
        if (volume.kindAt(vx, vy, vz) === VOXEL_EMPTY) continue;
        color.setHex(volume.colorAt(vx, vy, vz));
        red += color.r;
        green += color.g;
        blue += color.b;
        rise += vy + 1;
        count++;
        break;
      }
    }
  }
  const tint = count === 0 ? NO_TINT : { red: red / count, green: green / count, blue: blue / count, rise: Math.round(rise / count) };
  TINTS.set(key, tint);
  return tint;
}

type Corner = readonly [number, number, number];

class QuadSink {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly colors: number[] = [];
  private readonly indices: number[] = [];

  quad(corners: readonly Corner[], normal: Corner, red: number, green: number, blue: number): void {
    const start = this.positions.length / 3;
    for (const corner of corners) {
      this.positions.push(...corner);
      this.normals.push(...normal);
      this.colors.push(red, green, blue);
    }
    this.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }

  geometry(): BufferGeometry | null {
    if (this.indices.length === 0) return null;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.positions), 3));
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array(this.normals), 3));
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(this.colors), 3));
    geometry.setIndex(this.indices);
    geometry.computeBoundingSphere();
    return geometry;
  }
}

interface FaceRun {
  readonly from: number;
  readonly to: number;
  readonly voxel: FacadeVoxel;
}

const sameRuns = (a: readonly FaceRun[], b: readonly FaceRun[]): boolean => a.length === b.length && a.every((run, at) => run.from === b[at]?.from && run.to === b[at]?.to && run.voxel === b[at]?.voxel);

function rowRuns(along: number, voxelAt: (along: number) => FacadeVoxel | null): FaceRun[] {
  const runs: FaceRun[] = [];
  let open: { from: number; voxel: FacadeVoxel } | null = null;
  for (let step = 0; step <= R; step++) {
    const voxel = step < R ? voxelAt(along + step) : null;
    if (open && voxel !== open.voxel) {
      runs.push({ from: along + open.from, to: along + step, voxel: open.voxel });
      open = null;
    }
    if (voxel && !open) open = { from: step, voxel };
  }
  return runs;
}

function faceQuad(sink: QuadSink, side: Side, tx: number, ty: number, from: number, to: number, low: number, high: number, color: number): void {
  const [ox, oz] = OUTWARD[side];
  const across = side === 'north' || side === 'south';
  const plane = across ? ty + oz * (0.5 + FACE_LIFT) : tx + ox * (0.5 + FACE_LIFT);
  const near = from / R - 0.5;
  const far = to / R - 0.5;
  const bottom = (low - FLOOR_LAYERS) * ZONE_VOXEL_SIZE;
  const top = (high - FLOOR_LAYERS) * ZONE_VOXEL_SIZE;
  const point = (along: number, y: number): Corner => (across ? [along, y, plane] : [plane, y, along]);
  const [first, second] = side === 'north' || side === 'east' ? [near, far] : [far, near];
  scratch.setHex(color);
  sink.quad([point(first, bottom), point(first, top), point(second, top), point(second, bottom)], [ox, 0, oz], scratch.r, scratch.g, scratch.b);
}

function paintFace(sinks: FacadeSinks, side: Side, tx: number, ty: number, low: number, high: number, voxelAt: (along: number, vy: number) => FacadeVoxel | null): void {
  const along = (side === 'north' || side === 'south' ? tx : ty) * R;
  let pending: { readonly from: number; readonly runs: FaceRun[] } | null = null;
  const flush = (to: number): void => {
    if (!pending) return;
    for (const run of pending.runs) faceQuad(run.voxel.emissive ? sinks.glow : sinks.solid, side, tx, ty, run.from, run.to, pending.from, to, run.voxel.color);
    pending = null;
  };
  for (let vy = low; vy < high; vy++) {
    const runs = rowRuns(along, (at) => voxelAt(at, vy));
    if (pending && sameRuns(pending.runs, runs)) continue;
    flush(vy);
    pending = { from: vy, runs };
  }
  flush(high);
}

interface FacadeSinks {
  readonly solid: QuadSink;
  readonly glow: QuadSink;
}

const isFeature = (material: WallMaterialId, voxel: FacadeVoxel): boolean => {
  const palette = WALL_PALETTE[material];
  return voxel.emissive || (voxel.color !== palette.body && voxel.color !== palette.joint && voxel.color !== palette.cap);
};

const isShellFeature = (voxel: FacadeVoxel): boolean => voxel.emissive || (voxel.color !== TOWER_FACE.glass && voxel.color !== TOWER_FACE.mullion && voxel.color !== TOWER_FACE.shop);

function paintShell(sinks: FacadeSinks, side: Side, tx: number, ty: number, material: WallMaterialId, spot: TowerSpot, low: number): void {
  const { top, street, roof } = spot;
  const block = towerBlock(tx, ty);
  const first = (side === 'north' || side === 'south' ? tx : ty) * R;
  const storeys = street + FLOOR_LAYERS + FACADE_GROUND_FLOOR;
  const from = Math.max(low, street + FLOOR_LAYERS);
  if (from < storeys) {
    paintFace(sinks, side, tx, ty, from, Math.min(storeys, roof), (along, vy) => {
      const voxel = towerFacade(material, side, along, vy, street, top, block);
      return isShellFeature(voxel) ? voxel : null;
    });
  }
  const start = Math.max(from, storeys);
  const band = (sink: QuadSink, lowRow: number, highRow: number, color: number, near = first, far = first + R): void => {
    const bottom = Math.max(lowRow, start);
    const ceiling = Math.min(highRow, roof);
    if (bottom < ceiling) faceQuad(sink, side, tx, ty, near, far, bottom, ceiling, color);
  };
  const highest = Math.floor((top - roof) / FACADE_STOREY);
  const lowest = Math.floor((top - 1 - start) / FACADE_STOREY);
  for (let storey = highest; storey <= lowest + 1; storey++) {
    const head = top - 1 - storey * FACADE_STOREY;
    band(sinks.solid, head, head + 3, WALL_PALETTE[material].body);
    if (storey > lowest) continue;
    for (let pane = first / FACADE_PANE; pane < (first + R) / FACADE_PANE; pane++) {
      const glow = towerPaneGlow(pane, storey, block, side);
      if (glow !== null) band(sinks.glow, head - 4, head, glow, pane * FACADE_PANE + 1, (pane + 1) * FACADE_PANE);
    }
  }
  if (spot.crown > 0) band(sinks.glow, roof - 1, roof, TOWER_SIGNS[spot.crown - 1] ?? TOWER_SIGNS[0]);
  if (roof >= low) faceQuad(sinks.solid, side, tx, ty, first, first + R, roof, roof + 1, WALL_PALETTE[material].cap);
}

function paintFacades(sinks: FacadeSinks, layout: OwnedLayout, tx: number, ty: number, material: WallMaterialId, spot: TowerSpot | null, floorOf: (tx: number, ty: number) => number): Set<Side> {
  const painted = new Set<Side>();
  if (spot) {
    const roofFloor = spot.roof + 1;
    for (const side of FACE_SIDES) {
      const [dx, dy] = OUTWARD[side];
      const low = floorOf(tx + dx, ty + dy);
      if (low >= roofFloor) continue;
      painted.add(side);
      paintShell(sinks, side, tx, ty, material, spot, low);
    }
    return painted;
  }
  const massing = massingAt(layout, tx, ty);
  if (massing === 'hull') return painted;
  const base = tileBase(layout, tx, ty);
  const top = base + FLOOR_LAYERS + WALL_LAYERS - 1;
  for (const side of FACE_SIDES) {
    const [dx, dy] = OUTWARD[side];
    const beside = layout.tileAt({ x: tx + dx, y: ty + dy });
    if (beside === 'void') continue;
    const street = tileBase(layout, tx + dx, ty + dy);
    if (massing === 'tower') {
      if (isBuildingWall(beside) && street >= base) continue;
      const block = towerBlock(tx, ty);
      painted.add(side);
      paintFace(sinks, side, tx, ty, street + FLOOR_LAYERS, top, (along, vy) => {
        const voxel = towerFacade(material, side, along, vy, street, top, block);
        return isFeature(material, voxel) ? voxel : null;
      });
      continue;
    }
    if (!facesOutdoors(layout, tx, ty, side)) continue;
    painted.add(side);
    const floor = base + FLOOR_LAYERS;
    const start = (side === 'north' || side === 'south' ? tx : ty) * R;
    paintFace(sinks, side, tx, ty, floor, top, (along, vy) => {
      const lx = along - start;
      const u = side === 'south' || side === 'west' ? lx : R - 1 - lx;
      return wallFacade(material, tx, ty, side, vy - floor, u);
    });
  }
  return painted;
}

export function buildChunkPlaceholder(layout: OwnedLayout, region: TileRect): Group | null {
  const solid = new QuadSink();
  const sinks: FacadeSinks = { solid, glow: new QuadSink() };
  const spots = new Map<number, TowerSpot | null>();
  const spotOf = (tx: number, ty: number): TowerSpot | null => {
    const key = ty * layout.width + tx;
    const known = spots.get(key);
    if (known !== undefined) return known;
    const spot = isBuildingWall(layout.tileAt({ x: tx, y: ty })) ? towerSpotAt(layout, tx, ty) : null;
    spots.set(key, spot);
    return spot;
  };
  const floorOf = (tx: number, ty: number): number => {
    const kind = layout.tileAt({ x: tx, y: ty });
    if (kind === 'void') return 0;
    const spot = spotOf(tx, ty);
    return spot ? spot.roof + 1 : tileBase(layout, tx, ty) + tileTint(kind, layout.regionAt?.({ x: tx, y: ty })).rise;
  };
  const topOf = (tx: number, ty: number): number | null => (layout.tileAt({ x: tx, y: ty }) === 'void' ? null : (floorOf(tx, ty) - FLOOR_LAYERS) * ZONE_VOXEL_SIZE);
  const deck = scratch.setHex(TOWER.deck);
  const deckTint: Tint = { red: deck.r, green: deck.g, blue: deck.b, rise: 0 };
  const glass = scratch.setHex(TOWER_FACE.glass);
  const glassTint: Tint = { red: glass.r, green: glass.g, blue: glass.b, rise: 0 };
  const quad = (corners: readonly Corner[], normal: Corner, tint: Tint, shade: number): void => solid.quad(corners, normal, tint.red * shade, tint.green * shade, tint.blue * shade);
  for (let ty = region.y; ty < region.y + region.height; ty++) {
    for (let tx = region.x; tx < region.x + region.width; tx++) {
      const top = topOf(tx, ty);
      if (top === null) continue;
      const kind = layout.tileAt({ x: tx, y: ty });
      const tint = tileTint(kind, layout.regionAt?.({ x: tx, y: ty }));
      const spot = spotOf(tx, ty);
      const facades = isBuildingWall(kind) ? paintFacades(sinks, layout, tx, ty, kind, spot, floorOf) : null;
      const face = isBuildingWall(kind) && !spot ? scratch.setHex(WALL_PALETTE[kind].body) : null;
      const faceTint: Tint | null = spot ? glassTint : face ? { red: face.r, green: face.g, blue: face.b, rise: tint.rise } : null;
      const west = tx - 0.5;
      const east = tx + 0.5;
      const north = ty - 0.5;
      const south = ty + 0.5;
      quad([[west, top, north], [west, top, south], [east, top, south], [east, top, north]], [0, 1, 0], spot ? deckTint : tint, 1);
      const sides: readonly [Side, number, number, readonly [readonly [number, number], readonly [number, number]], Corner][] = [
        ['east', tx + 1, ty, [[east, north], [east, south]], [1, 0, 0]],
        ['west', tx - 1, ty, [[west, south], [west, north]], [-1, 0, 0]],
        ['south', tx, ty + 1, [[east, south], [west, south]], [0, 0, 1]],
        ['north', tx, ty - 1, [[west, north], [east, north]], [0, 0, -1]],
      ];
      for (const [side, nx, ny, [[ax, az], [bx, bz]], normal] of sides) {
        const below = topOf(nx, ny) ?? 0;
        if (below >= top) continue;
        const lit = faceTint && facades?.has(side);
        quad([[ax, below, az], [ax, top, az], [bx, top, bz], [bx, below, bz]], normal, lit ? faceTint : tint, lit ? 1 : SIDE_SHADE);
      }
    }
  }
  const geometry = solid.geometry();
  if (!geometry) return null;
  const group = createVoxelObject({ solid: geometry, emissive: sinks.glow.geometry(), glass: null }, { castShadow: false });
  group.name = 'chunkPlaceholder';
  return group;
}
