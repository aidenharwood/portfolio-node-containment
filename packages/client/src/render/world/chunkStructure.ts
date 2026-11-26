import { isBuildingWall, TILE_KINDS, TRACK_GAUGE, type DecalCell, type ResolvedLevel, type SceneLayout, type TileLayout, type TilePoint, type TileRect } from '@containment/shared';
import { Box3, BufferAttribute, BufferGeometry, Color, Sphere, SRGBColorSpace, Vector3 } from 'three';
import { VOXEL_EMPTY, type VoxelGrid } from '../voxel/voxelKinds.ts';
import { meshVoxels, type TopSink, type VoxelMeshes } from '../voxel/voxelMesher.ts';
import { mergeBatch, type BatchLayer, type BatchLayerName, type BatchParts } from './fadeBatch.ts';
import { createTileVolume, drawnTopAt, groundBottomAt, groundTopAt, paintTileRows, regionTop, tileBase, type OwnedLayout } from './levelVoxels.ts';
import { paintRoof, roofPlanOf, type RoofBox } from './roofs.ts';
import { FLOOR_LAYERS, TILE_RESOLUTION, ZONE_MESH_ORIGIN, ZONE_VOLUME_HEIGHT, ZONE_VOXEL_SIZE } from './worldScale.ts';

export const STRIP_ROWS = 2;
export const BAND_ROWS = 8;

type DecalMap = ReadonlyMap<string, readonly DecalCell[]>;

export interface FloorStrip {
  readonly meshes: VoxelMeshes;
  readonly tops: BufferGeometry | null;
}

export interface WallBand {
  readonly tiles: readonly TilePoint[];
  readonly parts: BatchParts;
}

export interface TopTexels {
  readonly data: Uint8Array<ArrayBuffer>;
  readonly width: number;
  readonly height: number;
}

export interface RoofPiece {
  readonly building: number;
  readonly box: RoofBox;
}

export interface RoofBatch {
  readonly pieces: readonly RoofPiece[];
  readonly parts: BatchParts;
}

export interface ChunkStructure {
  readonly floors: readonly FloorStrip[];
  readonly walls: readonly WallBand[];
  readonly roofs: RoofBatch | null;
  readonly tops: TopTexels | null;
  readonly wallTops: TopTexels | null;
  readonly roofTops: TopTexels | null;
}

export interface StructurePlan {
  readonly steps: readonly (() => void)[];
  readonly result: () => ChunkStructure;
}

const ROOM_REACH = 4096;
const OUTSIDE = 1;
const INSIDE = 2;
const SEALED = 3;
const ACROSS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function interiorMaskOf(layout: TileLayout): (point: TilePoint) => boolean {
  const { width, height } = layout;
  const state = new Uint8Array(width * height);
  const wallAt = (x: number, y: number): boolean => isBuildingWall(layout.tileAt({ x, y }));
  const trackAt = (x: number, y: number): boolean => layout.tileAt({ x, y }) === 'track';
  const wallBeyond = (x: number, y: number, dx: number, dy: number): { readonly wall: boolean; readonly runs: boolean } => {
    let cx = x + dx;
    let cy = y + dy;
    for (let step = 0; step < TRACK_GAUGE && trackAt(cx, cy); step++) {
      cx += dx;
      cy += dy;
    }
    return { wall: wallAt(cx, cy), runs: wallAt(cx + dx, cy + dy) };
  };
  const crossesWall = (x: number, y: number, dx: number, dy: number): boolean => {
    if (!trackAt(x - dx, y - dy) || !trackAt(x + dx, y + dy)) return false;
    const before = wallBeyond(x, y, -dy, -dx);
    const after = wallBeyond(x, y, dy, dx);
    return before.wall && after.wall && (before.runs || after.runs);
  };
  const seals = (x: number, y: number): boolean => {
    const kind = layout.tileAt({ x, y });
    if (isBuildingWall(kind) || kind === 'glass' || kind === 'door') return true;
    return kind === 'track' && (crossesWall(x, y, 1, 0) || crossesWall(x, y, 0, 1));
  };
  const flood = (start: number): void => {
    const room = [start];
    state[start] = INSIDE;
    let open = false;
    for (let next = 0; next < room.length && !open; next++) {
      const at = room[next] as number;
      const x = at % width;
      const y = (at - x) / width;
      for (const [dx, dy] of ACROSS) {
        const nx = x + dx;
        const ny = y + dy;
        const index = ny * width + nx;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height || state[index] === OUTSIDE || room.length > ROOM_REACH) {
          open = true;
          break;
        }
        if (state[index] !== 0) continue;
        if (seals(nx, ny)) {
          state[index] = SEALED;
          continue;
        }
        state[index] = INSIDE;
        room.push(index);
      }
    }
    if (open) for (const at of room) state[at] = OUTSIDE;
  };
  return ({ x, y }) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    const at = y * width + x;
    if (state[at] === 0) {
      if (seals(x, y)) state[at] = SEALED;
      else flood(at);
    }
    return state[at] === INSIDE;
  };
}

const OWNED = new WeakMap<TileLayout, { readonly definition: ResolvedLevel; readonly owned: OwnedLayout }>();

export function ownedLayoutOf(definition: ResolvedLevel, layout: SceneLayout): OwnedLayout {
  const { land } = definition.definition;
  if (!land) return layout;
  const known = OWNED.get(layout);
  if (known?.definition === definition) return known.owned;
  const owners = definition.layout;
  const owned: OwnedLayout = {
    width: layout.width,
    height: layout.height,
    tileAt: (point) => layout.tileAt(point),
    heightAt: (point) => layout.heightAt(point),
    ownerAt: (point) => owners.districtAt(point) ?? owners.connectorAt(point),
    interiorAt: interiorMaskOf(layout),
    regionAt: (point) => land.wardAt(point),
  };
  OWNED.set(layout, { definition, owned });
  return owned;
}

export function hasStructure(layout: SceneLayout, region: TileRect): boolean {
  for (let y = region.y; y < region.y + region.height; y++) {
    for (let x = region.x; x < region.x + region.width; x++) {
      if (layout.tileAt({ x, y }) !== 'void') return true;
    }
  }
  return false;
}

export const bandsOf = (region: TileRect): number[] => {
  const bands: number[] = [];
  for (let band = Math.floor(region.y / BAND_ROWS); band <= Math.floor((region.y + region.height - 1) / BAND_ROWS); band++) bands.push(band);
  return bands;
};

const TEXEL_INSET = 0.02;
const SEAM_OVERLAP = 0.0005;
const shadeColor = new Color();
const shadeChannels = { r: 0, g: 0, b: 0 };

function writeTexel(data: Uint8Array, at: number, color: number, shade: number): void {
  if (shade === 1) {
    data[at] = (color >> 16) & 255;
    data[at + 1] = (color >> 8) & 255;
    data[at + 2] = color & 255;
  } else {
    shadeColor.setHex(color).multiplyScalar(shade).getRGB(shadeChannels, SRGBColorSpace);
    data[at] = Math.round(Math.min(1, shadeChannels.r) * 255);
    data[at + 1] = Math.round(Math.min(1, shadeChannels.g) * 255);
    data[at + 2] = Math.round(Math.min(1, shadeChannels.b) * 255);
  }
  data[at + 3] = 255;
}

class TopSheet {
  readonly levels: Int16Array;
  readonly data: Uint8Array<ArrayBuffer>;
  readonly width: number;
  readonly depth: number;
  readonly originX: number;
  readonly originZ: number;
  used = false;
  owner = -1;
  private owners: Int16Array | null = null;

  constructor(width: number, depth: number, originX: number, originZ: number) {
    this.width = width;
    this.depth = depth;
    this.originX = originX;
    this.originZ = originZ;
    this.levels = new Int16Array(width * depth).fill(-1);
    this.data = new Uint8Array(width * depth * 4);
  }

  readonly sink: TopSink = (x, y, z, color, shade) => {
    const lx = x - this.originX;
    const lz = z - this.originZ;
    if (lx < 0 || lz < 0 || lx >= this.width || lz >= this.depth) return false;
    const at = lz * this.width + lx;
    if (shade > 1 || (this.levels[at] as number) >= 0) return false;
    this.levels[at] = y + 1;
    if (this.owner >= 0) (this.owners ??= new Int16Array(this.width * this.depth).fill(-1))[at] = this.owner;
    writeTexel(this.data, at * 4, color, shade);
    return true;
  };

  geometry(fromColumn: number, toColumn: number, fromRow: number, toRow: number, owner = -1): BufferGeometry | null {
    const owners = owner >= 0 ? this.owners : null;
    const levels = owners ? this.levels.map((level, at) => (owners[at] === owner ? level : -1)) : this.levels;
    const geometry = topGeometry(levels, this.width, fromColumn, toColumn, fromRow, toRow, this.originX, this.originZ);
    this.used ||= geometry !== null;
    return geometry;
  }

  texels(): TopTexels | null {
    if (!this.used) return null;
    const { data, levels, width, depth } = this;
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        const at = z * width + x;
        if ((levels[at] as number) >= 0) continue;
        const from = x > 0 && (levels[at - 1] as number) >= 0 ? at - 1 : x + 1 < width && (levels[at + 1] as number) >= 0 ? at + 1 : z > 0 && (levels[at - width] as number) >= 0 ? at - width : z + 1 < depth && (levels[at + width] as number) >= 0 ? at + width : -1;
        if (from < 0) continue;
        data.copyWithin(at * 4, from * 4, from * 4 + 3);
        data[at * 4 + 3] = 0;
      }
    }
    return { data, width, height: depth };
  }
}

function topGeometry(levels: Int16Array, width: number, fromColumn: number, toColumn: number, fromRow: number, toRow: number, originX: number, originZ: number): BufferGeometry | null {
  const used = new Uint8Array(width * (toRow - fromRow));
  const positions: number[] = [];
  const uvs: number[] = [];
  const depth = levels.length / width;
  const size = ZONE_VOXEL_SIZE;
  const [ox, oy, oz] = ZONE_MESH_ORIGIN;
  for (let z = fromRow; z < toRow; z++) {
    for (let x = fromColumn; x < toColumn; x++) {
      const level = levels[z * width + x] as number;
      if (level < 0 || used[(z - fromRow) * width + x]) continue;
      let x1 = x + 1;
      while (x1 < toColumn && levels[z * width + x1] === level && !used[(z - fromRow) * width + x1]) x1++;
      let z1 = z + 1;
      grow: while (z1 < toRow) {
        for (let run = x; run < x1; run++) if (levels[z1 * width + run] !== level || used[(z1 - fromRow) * width + run]) break grow;
        z1++;
      }
      for (let row = z; row < z1; row++) used.fill(1, (row - fromRow) * width + x, (row - fromRow) * width + x1);
      const left = ox + (originX + x) * size - SEAM_OVERLAP;
      const right = ox + (originX + x1) * size + SEAM_OVERLAP;
      const near = oz + (originZ + z) * size - SEAM_OVERLAP;
      const far = oz + (originZ + z1) * size + SEAM_OVERLAP;
      const height = oy + level * size;
      const u0 = (x + TEXEL_INSET) / width;
      const u1 = (x1 - TEXEL_INSET) / width;
      const v0 = (z + TEXEL_INSET) / depth;
      const v1 = (z1 - TEXEL_INSET) / depth;
      positions.push(left, height, near, left, height, far, right, height, far, right, height, near);
      uvs.push(u0, v0, u0, v1, u1, v1, u1, v0);
    }
  }
  const quads = positions.length / 12;
  if (quads === 0) return null;
  const vertices = quads * 4;
  const index = vertices > 65535 ? new Uint32Array(quads * 6) : new Uint16Array(quads * 6);
  for (let quad = 0; quad < quads; quad++) {
    const base = quad * 4;
    index.set([base, base + 1, base + 2, base, base + 2, base + 3], quad * 6);
  }
  const normals = new Float32Array(vertices * 3);
  for (let vertex = 0; vertex < vertices; vertex++) normals[vertex * 3 + 1] = 1;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(new BufferAttribute(index, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function planChunkStructure(layout: OwnedLayout, decals: DecalMap, region: TileRect): StructurePlan {
  const volume = createTileVolume(region, layout);
  const meshOptions = { voxelSize: ZONE_VOXEL_SIZE, origin: ZONE_MESH_ORIGIN };
  const R = TILE_RESOLUTION;
  const lastRow = region.y + region.height;
  const groundTop = regionTop(layout, region) + FLOOR_LAYERS;
  const span = region.width + 2;
  const tops = new Int16Array(span * (region.height + 2));
  const bottoms = new Int16Array(span * (region.height + 2));
  for (let ty = region.y - 1; ty <= lastRow; ty++) {
    for (let tx = region.x - 1; tx <= region.x + region.width; tx++) {
      tops[(ty - region.y + 1) * span + tx - region.x + 1] = groundTopAt(layout, tx, ty);
      bottoms[(ty - region.y + 1) * span + tx - region.x + 1] = groundBottomAt(layout, tx, ty);
    }
  }
  const ceiling = new Int16Array(volume.width * volume.depth);
  for (let lz = 0; lz < volume.depth; lz++) {
    for (let lx = 0; lx < volume.width; lx++) ceiling[lz * volume.width + lx] = tops[Math.floor(lz / R) * span + Math.floor(lx / R)] ?? FLOOR_LAYERS;
  }
  const ground: VoxelGrid = { kinds: volume.kinds, colors: volume.colors, width: volume.width, height: volume.height, depth: volume.depth, originX: volume.originX, originZ: volume.originZ, ceiling };
  const groundCells = (strip: TileRect): number[] => {
    const cells: number[] = [];
    for (let ty = strip.y; ty < strip.y + strip.height; ty++) {
      for (let tx = strip.x; tx < strip.x + strip.width; tx++) {
        const at = (ty - region.y + 1) * span + tx - region.x + 1;
        const bottom = bottoms[at] as number;
        const top = tops[at] as number;
        for (let vz = ty * R; vz < (ty + 1) * R; vz++) {
          for (let vx = tx * R; vx < (tx + 1) * R; vx++) {
            for (let vy = bottom; vy < top; vy++) if (volume.kindAt(vx, vy, vz) !== VOXEL_EMPTY) cells.push(vx, vy, vz);
          }
        }
      }
    }
    return cells;
  };
  const texelWidth = region.width * R;
  const floorTops = new TopSheet(texelWidth, region.height * R, region.x * R, region.y * R);
  const wallTops = new TopSheet(texelWidth, region.height * R, region.x * R, region.y * R);
  const floorClip = {
    min: [region.x * R, 0, region.y * R] as const,
    max: [(region.x + region.width) * R, groundTop, lastRow * R] as const,
  };
  const steps: (() => void)[] = [];
  const floors: FloorStrip[] = [];
  for (let row = region.y - 1; row <= lastRow; row += STRIP_ROWS) {
    steps.push(() => {
      paintTileRows(volume, layout, region, row, row + STRIP_ROWS, decals);
    });
  }
  for (let row = region.y; row < lastRow; row += STRIP_ROWS) {
    const strip = { x: region.x, y: row, width: region.width, height: Math.min(STRIP_ROWS, lastRow - row) };
    steps.push(() => {
      const bounds = { min: [floorClip.min[0], 0, strip.y * R] as const, max: [floorClip.max[0], groundTop, (strip.y + strip.height) * R] as const };
      const meshes = meshVoxels(ground, bounds, { ...meshOptions, clipBounds: floorClip, skipDown: true, topSink: floorTops.sink }, groundCells(strip));
      floors.push({ meshes, tops: floorTops.geometry(0, texelWidth, (strip.y - region.y) * R, (strip.y + strip.height - region.y) * R) });
    });
  }
  const collected = bandsOf(region).map(() => ({ tiles: [] as TilePoint[], pieces: [] as VoxelMeshes[], tops: [] as (BufferGeometry | null)[] }));
  const walls: WallBand[] = [];
  const firstBand = Math.floor(region.y / BAND_ROWS);
  for (let ty = region.y; ty < lastRow; ty++) {
    const band = collected[Math.floor(ty / BAND_ROWS) - firstBand] as (typeof collected)[number];
    steps.push(() => {
      for (let tx = region.x; tx < region.x + region.width; tx++) {
        const kind = layout.tileAt({ x: tx, y: ty });
        if (TILE_KINDS[kind].structure !== 'wall' && kind !== 'door') continue;
        const base = tileBase(layout, tx, ty);
        const bounds = {
          min: [tx * R, base + FLOOR_LAYERS, ty * R] as const,
          max: [(tx + 1) * R, drawnTopAt(layout, tx, ty) + ZONE_VOLUME_HEIGHT, (ty + 1) * R] as const,
        };
        const meshes = meshVoxels(volume, bounds, { ...meshOptions, topSink: wallTops.sink });
        const column = (tx - region.x) * R;
        const row = (ty - region.y) * R;
        const top = wallTops.geometry(column, column + R, row, row + R);
        if (!meshes.solid && !meshes.emissive && !meshes.glass && !top) continue;
        band.tiles.push({ x: tx, y: ty });
        band.pieces.push(meshes);
        band.tops.push(top);
      }
    });
  }
  for (const band of collected) {
    steps.push(() => {
      walls.push({ tiles: band.tiles, parts: mergeBatch(band.pieces, band.tops) });
    });
  }
  const roofTops = new TopSheet(texelWidth, region.height * R, region.x * R, region.y * R);
  const roofPieces: RoofPiece[] = [];
  const roofMeshes: VoxelMeshes[] = [];
  const roofTopPieces: (BufferGeometry | null)[] = [];
  let roofs: RoofBatch | null = null;
  const buildings = roofPlanOf(layout).buildingsIn(region);
  buildings.forEach((building, index) => {
    steps.push(() => {
      const { volume, floor } = paintRoof(layout, building);
      const left = Math.max(building.bounds.x, region.x);
      const right = Math.min(building.bounds.x + building.bounds.width, region.x + region.width);
      const near = Math.max(building.bounds.y, region.y);
      const far = Math.min(building.bounds.y + building.bounds.height, lastRow);
      roofTops.owner = index;
      const meshes = meshVoxels(
        volume,
        { min: [left * R, 0, near * R], max: [right * R, volume.height, far * R] },
        { ...meshOptions, origin: [ZONE_MESH_ORIGIN[0], ZONE_MESH_ORIGIN[1] + floor * ZONE_VOXEL_SIZE, ZONE_MESH_ORIGIN[2]], skipDown: true, topSink: (x, y, z, color, shade) => roofTops.sink(x, y + floor, z, color, shade) },
      );
      roofTops.owner = -1;
      const top = roofTops.geometry((left - region.x) * R, (right - region.x) * R, (near - region.y) * R, (far - region.y) * R, index);
      const box = boxOf([meshes.solid, meshes.emissive, meshes.glass, top]);
      if (!box) return;
      roofPieces.push({ building: building.id, box });
      roofMeshes.push(meshes);
      roofTopPieces.push(top);
    });
  });
  if (buildings.length > 0) {
    steps.push(() => {
      if (roofMeshes.length > 0) roofs = { pieces: roofPieces, parts: mergeBatch(roofMeshes, roofTopPieces) };
    });
  }
  return { steps, result: () => ({ floors, walls, roofs, tops: floorTops.texels(), wallTops: wallTops.texels(), roofTops: roofTops.texels() }) };
}

function boxOf(geometries: readonly (BufferGeometry | null)[]): RoofBox | null {
  const box = new Box3();
  for (const geometry of geometries) {
    if (!geometry) continue;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (geometry.boundingBox) box.union(geometry.boundingBox);
  }
  return box.isEmpty() ? null : [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z];
}

export interface PackedGeometry {
  readonly attributes: Readonly<Record<string, { readonly array: Float32Array; readonly size: number }>>;
  readonly index: Uint16Array | Uint32Array;
  readonly box: readonly number[];
  readonly sphere: readonly number[];
}

export interface PackedMeshes {
  readonly solid: PackedGeometry | null;
  readonly emissive: PackedGeometry | null;
  readonly glass: PackedGeometry | null;
}

export interface PackedBatch {
  readonly count: number;
  readonly layers: Readonly<Record<BatchLayerName, { readonly geometry: PackedGeometry; readonly ranges: BatchLayer['ranges'] } | null>>;
}

const BATCH_LAYERS: readonly BatchLayerName[] = ['solid', 'emissive', 'glass', 'tops'];

function packBatch(parts: BatchParts, transfer: Set<ArrayBuffer>): PackedBatch {
  const layers = Object.fromEntries(BATCH_LAYERS.map((name) => {
    const layer = parts.layers[name];
    const geometry = layer ? packGeometry(layer.geometry, transfer) : null;
    return [name, layer && geometry ? { geometry, ranges: layer.ranges } : null];
  })) as PackedBatch['layers'];
  return { count: parts.count, layers };
}

function unpackBatch(packed: PackedBatch): BatchParts {
  const layers = Object.fromEntries(BATCH_LAYERS.map((name) => {
    const layer = packed.layers[name];
    const geometry = layer ? unpackGeometry(layer.geometry) : null;
    return [name, layer && geometry ? { geometry, ranges: layer.ranges } : null];
  })) as BatchParts['layers'];
  return { count: packed.count, layers };
}

export interface PackedStructure {
  readonly floors: readonly { readonly meshes: PackedMeshes; readonly tops: PackedGeometry | null }[];
  readonly walls: readonly { readonly tiles: readonly TilePoint[]; readonly parts: PackedBatch }[];
  readonly tops: TopTexels | null;
  readonly wallTops: TopTexels | null;
  readonly roofs: { readonly pieces: readonly RoofPiece[]; readonly parts: PackedBatch } | null;
  readonly roofTops: TopTexels | null;
}

function packGeometry(geometry: BufferGeometry | null, transfer: Set<ArrayBuffer>): PackedGeometry | null {
  if (!geometry || !geometry.index) return null;
  const attributes: Record<string, { array: Float32Array; size: number }> = {};
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    const array = attribute.array as Float32Array;
    attributes[name] = { array, size: attribute.itemSize };
    transfer.add(array.buffer as ArrayBuffer);
  }
  const index = geometry.index.array as Uint16Array | Uint32Array;
  transfer.add(index.buffer as ArrayBuffer);
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  if (!geometry.boundingSphere) geometry.computeBoundingSphere();
  const box = geometry.boundingBox as Box3;
  const sphere = geometry.boundingSphere as Sphere;
  return { attributes, index, box: [...box.min.toArray(), ...box.max.toArray()], sphere: [...sphere.center.toArray(), sphere.radius] };
}

function unpackGeometry(packed: PackedGeometry | null): BufferGeometry | null {
  if (!packed) return null;
  const geometry = new BufferGeometry();
  for (const [name, { array, size }] of Object.entries(packed.attributes)) geometry.setAttribute(name, new BufferAttribute(array, size));
  geometry.setIndex(new BufferAttribute(packed.index, 1));
  const [minX, minY, minZ, maxX, maxY, maxZ] = packed.box as [number, number, number, number, number, number];
  geometry.boundingBox = new Box3(new Vector3(minX, minY, minZ), new Vector3(maxX, maxY, maxZ));
  const [cx, cy, cz, radius] = packed.sphere as [number, number, number, number];
  geometry.boundingSphere = new Sphere(new Vector3(cx, cy, cz), radius);
  return geometry;
}

const packMeshes = (meshes: VoxelMeshes, transfer: Set<ArrayBuffer>): PackedMeshes => ({
  solid: packGeometry(meshes.solid, transfer),
  emissive: packGeometry(meshes.emissive, transfer),
  glass: packGeometry(meshes.glass, transfer),
});

const unpackMeshes = (meshes: PackedMeshes): VoxelMeshes => ({
  solid: unpackGeometry(meshes.solid),
  emissive: unpackGeometry(meshes.emissive),
  glass: unpackGeometry(meshes.glass),
});

export function packStructure(structure: ChunkStructure): { readonly packed: PackedStructure; readonly transfer: ArrayBuffer[] } {
  const transfer = new Set<ArrayBuffer>();
  const packed: PackedStructure = {
    floors: structure.floors.map(({ meshes, tops }) => ({ meshes: packMeshes(meshes, transfer), tops: packGeometry(tops, transfer) })),
    walls: structure.walls.map(({ tiles, parts }) => ({ tiles, parts: packBatch(parts, transfer) })),
    tops: structure.tops,
    wallTops: structure.wallTops,
    roofs: structure.roofs ? { pieces: structure.roofs.pieces, parts: packBatch(structure.roofs.parts, transfer) } : null,
    roofTops: structure.roofTops,
  };
  if (structure.tops) transfer.add(structure.tops.data.buffer);
  if (structure.wallTops) transfer.add(structure.wallTops.data.buffer);
  if (structure.roofTops) transfer.add(structure.roofTops.data.buffer);
  return { packed, transfer: [...transfer] };
}

export function unpackStructure(packed: PackedStructure): ChunkStructure {
  return {
    floors: packed.floors.map(({ meshes, tops }) => ({ meshes: unpackMeshes(meshes), tops: unpackGeometry(tops) })),
    walls: packed.walls.map(({ tiles, parts }) => ({ tiles, parts: unpackBatch(parts) })),
    roofs: packed.roofs ? { pieces: packed.roofs.pieces, parts: unpackBatch(packed.roofs.parts) } : null,
    tops: packed.tops,
    wallTops: packed.wallTops,
    roofTops: packed.roofTops,
  };
}
