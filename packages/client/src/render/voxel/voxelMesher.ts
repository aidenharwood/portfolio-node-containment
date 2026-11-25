import { BufferAttribute, BufferGeometry, Color } from 'three';
import { occludes, VOXEL_EMISSIVE, VOXEL_EMPTY, VOXEL_GLASS, type VoxelBounds, type VoxelGrid, type VoxelSource } from './voxelKinds.ts';

export interface VoxelMeshes {
  readonly solid: BufferGeometry | null;
  readonly emissive: BufferGeometry | null;
  readonly glass: BufferGeometry | null;
}

export interface MeshOptions {
  readonly voxelSize: number;
  readonly origin: readonly [number, number, number];
  readonly clipBounds?: VoxelBounds;
  readonly groundY?: number;
  readonly skipDown?: boolean;
  readonly topSink?: TopSink;
}

export type TopSink = (x: number, y: number, z: number, color: number, shade: number) => boolean;

type Vector = readonly [number, number, number];

interface FaceDefinition {
  readonly normal: Vector;
  readonly axis: number;
  readonly corners: readonly [Vector, Vector, Vector, Vector];
}

const FACES: readonly FaceDefinition[] = [
  { normal: [1, 0, 0], axis: 0, corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { normal: [-1, 0, 0], axis: 0, corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { normal: [0, 1, 0], axis: 1, corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
  { normal: [0, -1, 0], axis: 1, corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { normal: [0, 0, 1], axis: 2, corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { normal: [0, 0, -1], axis: 2, corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
];

const UP_FACE = 2;
const DOWN_FACE = 3;
const AMBIENT_OCCLUSION = [0.6, 0.75, 0.88, 1];
const EDGE_LIFT = 1.05;

interface FaceProbe {
  readonly normal: Vector;
  readonly corners: readonly Vector[];
  readonly sideU: readonly Vector[];
  readonly sideV: readonly Vector[];
  readonly diagonal: readonly Vector[];
  readonly edgeU: readonly Vector[];
  readonly edgeV: readonly Vector[];
}

const FACE_PROBES: readonly FaceProbe[] = FACES.map((face) => {
  const uAxis = (face.axis + 1) % 3;
  const vAxis = (face.axis + 2) % 3;
  const offset = (stepU: number, stepV: number, lift = 1): Vector => {
    const probe: [number, number, number] = [face.normal[0] * lift, face.normal[1] * lift, face.normal[2] * lift];
    probe[uAxis]! += stepU;
    probe[vAxis]! += stepV;
    return probe;
  };
  const steps = face.corners.map((corner) => [corner[uAxis] === 1 ? 1 : -1, corner[vAxis] === 1 ? 1 : -1] as const);
  return {
    normal: face.normal,
    corners: face.corners,
    sideU: steps.map(([stepU]) => offset(stepU, 0)),
    sideV: steps.map(([, stepV]) => offset(0, stepV)),
    diagonal: steps.map(([stepU, stepV]) => offset(stepU, stepV)),
    edgeU: steps.map(([stepU]) => offset(stepU, 0, 0)),
    edgeV: steps.map(([, stepV]) => offset(0, stepV, 0)),
  };
});

class FloatList {
  array: Float32Array;
  length = 0;

  constructor(capacity: number) {
    this.array = new Float32Array(capacity);
  }

  push3(a: number, b: number, c: number): void {
    if (this.length + 3 > this.array.length) this.grow();
    const array = this.array;
    array[this.length] = a;
    array[this.length + 1] = b;
    array[this.length + 2] = c;
    this.length += 3;
  }

  private grow(): void {
    const next = new Float32Array(this.array.length * 2);
    next.set(this.array);
    this.array = next;
  }
}

class IndexList {
  array: Uint32Array;
  length = 0;

  constructor(capacity: number) {
    this.array = new Uint32Array(capacity);
  }

  push6(a: number, b: number, c: number, d: number, e: number, f: number): void {
    if (this.length + 6 > this.array.length) {
      const next = new Uint32Array(this.array.length * 2);
      next.set(this.array);
      this.array = next;
    }
    const array = this.array;
    array[this.length] = a;
    array[this.length + 1] = b;
    array[this.length + 2] = c;
    array[this.length + 3] = d;
    array[this.length + 4] = e;
    array[this.length + 5] = f;
    this.length += 6;
  }
}

class GeometryBuffer {
  readonly positions = new FloatList(3 * 4096);
  readonly normals = new FloatList(3 * 4096);
  readonly colors = new FloatList(3 * 4096);
  readonly indices = new IndexList(6 * 1024);
  vertexCount = 0;

  reset(): void {
    this.positions.length = 0;
    this.normals.length = 0;
    this.colors.length = 0;
    this.indices.length = 0;
    this.vertexCount = 0;
  }

  toGeometry(): BufferGeometry | null {
    if (this.indices.length === 0) return null;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(this.positions.array.slice(0, this.positions.length), 3));
    geometry.setAttribute('normal', new BufferAttribute(this.normals.array.slice(0, this.normals.length), 3));
    geometry.setAttribute('color', new BufferAttribute(this.colors.array.slice(0, this.colors.length), 3));
    const indices = this.indices.array.subarray(0, this.indices.length);
    geometry.setIndex(new BufferAttribute(this.vertexCount > 65535 ? indices.slice() : Uint16Array.from(indices), 1));
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    return geometry;
  }
}

const linearColorCache = new Map<number, [number, number, number]>();

function linearColor(hex: number): [number, number, number] {
  const cached = linearColorCache.get(hex);
  if (cached) return cached;
  const color = new Color(hex);
  const channels: [number, number, number] = [color.r, color.g, color.b];
  linearColorCache.set(hex, channels);
  return channels;
}

function shouldEmitFace(kind: number, neighbor: number): boolean {
  if (neighbor === VOXEL_EMPTY) return true;
  if (kind === VOXEL_GLASS) return false;
  return neighbor === VOXEL_GLASS;
}

const FACE_COUNT = FACE_PROBES.length;
const PROBE_STRIDE = 15;
const NORMALS = Int8Array.from(FACE_PROBES.flatMap((face) => face.normal));
const CORNERS = Int8Array.from(FACE_PROBES.flatMap((face) => face.corners.flat()));
const PROBES = Int8Array.from(FACE_PROBES.flatMap((face) => [0, 1, 2, 3].flatMap((corner) => [face.edgeU, face.edgeV, face.sideU, face.sideV, face.diagonal].flatMap((probes) => probes[corner] as Vector))));
const occlusion = [3, 3, 3, 3];
const lift = [1, 1, 1, 1];
const buffers = { solid: new GeometryBuffer(), emissive: new GeometryBuffer(), glass: new GeometryBuffer() };

type KindReader = (x: number, y: number, z: number) => number;

function gridReaders(grid: VoxelGrid): { readonly kindAt: KindReader; readonly colorAt: KindReader } {
  const { kinds, colors, width, height, depth, originX, originZ, ceiling } = grid;
  const indexOf = (x: number, y: number, z: number): number => {
    const lx = x - originX;
    const lz = z - originZ;
    if (lx < 0 || y < 0 || lz < 0 || lx >= width || y >= height || lz >= depth) return -1;
    if (ceiling && y >= (ceiling[lz * width + lx] as number)) return -1;
    return (y * depth + lz) * width + lx;
  };
  return {
    kindAt: (x, y, z) => {
      const index = indexOf(x, y, z);
      return index < 0 ? VOXEL_EMPTY : (kinds[index] as number);
    },
    colorAt: (x, y, z) => {
      const index = indexOf(x, y, z);
      return index < 0 ? 0 : (colors[index] as number);
    },
  };
}

export function meshVoxels(source: VoxelSource | VoxelGrid, bounds: VoxelBounds, options: MeshOptions, cells?: ArrayLike<number>): VoxelMeshes {
  const { kindAt, colorAt } = 'kinds' in source ? gridReaders(source) : { kindAt: (x: number, y: number, z: number) => source.kindAt(x, y, z), colorAt: (x: number, y: number, z: number) => source.colorAt(x, y, z) };
  buffers.solid.reset();
  buffers.emissive.reset();
  buffers.glass.reset();
  const { voxelSize, origin } = options;
  const clip = options.clipBounds;
  const [minX, minY, minZ] = bounds.min;
  const [maxX, maxY, maxZ] = bounds.max;
  const neighborKind = (x: number, y: number, z: number): number => {
    if (clip && (x < clip.min[0] || y < clip.min[1] || z < clip.min[2] || x >= clip.max[0] || y >= clip.max[1] || z >= clip.max[2])) return VOXEL_EMPTY;
    return kindAt(x, y, z);
  };
  const groundY = options.groundY ?? -Infinity;
  const skipFace = options.skipDown ? DOWN_FACE : -1;
  const topSink = options.topSink;

  const occludedAt = (x: number, y: number, z: number, at: number): number => {
    const dy = PROBES[at + 1] as number;
    return y + dy < groundY || occludes(kindAt(x + (PROBES[at] as number), y + dy, z + (PROBES[at + 2] as number))) ? 1 : 0;
  };

  const emitVoxel = (x: number, y: number, z: number): void => {
    const kind = kindAt(x, y, z);
    if (kind === VOXEL_EMPTY) return;
    const buffer = kind === VOXEL_EMISSIVE ? buffers.emissive : kind === VOXEL_GLASS ? buffers.glass : buffers.solid;
    const color = linearColor(colorAt(x, y, z));
    const red = color[0];
    const green = color[1];
    const blue = color[2];
    for (let faceIndex = 0; faceIndex < FACE_COUNT; faceIndex++) {
      if (faceIndex === skipFace) continue;
      const nx = NORMALS[faceIndex * 3] as number;
      const ny = NORMALS[faceIndex * 3 + 1] as number;
      const nz = NORMALS[faceIndex * 3 + 2] as number;
      if (!shouldEmitFace(kind, neighborKind(x + nx, y + ny, z + nz))) continue;
      for (let corner = 0; corner < 4; corner++) {
        if (kind === VOXEL_EMISSIVE) {
          occlusion[corner] = 3;
          lift[corner] = 1;
          continue;
        }
        const at = (faceIndex * 4 + corner) * PROBE_STRIDE;
        lift[corner] = occludedAt(x, y, z, at) && occludedAt(x, y, z, at + 3) ? 1 : EDGE_LIFT;
        const sideU = occludedAt(x, y, z, at + 6);
        const sideV = occludedAt(x, y, z, at + 9);
        occlusion[corner] = sideU && sideV ? 0 : 3 - (sideU + sideV + occludedAt(x, y, z, at + 12));
      }
      if (topSink && faceIndex === UP_FACE && kind !== VOXEL_EMISSIVE && kind !== VOXEL_GLASS && occlusion[0] === occlusion[1] && occlusion[0] === occlusion[2] && occlusion[0] === occlusion[3] && lift[0] === lift[1] && lift[0] === lift[2] && lift[0] === lift[3]) {
        if (topSink(x, y, z, colorAt(x, y, z), (AMBIENT_OCCLUSION[occlusion[0] as number] as number) * (lift[0] as number))) continue;
      }
      const base = buffer.vertexCount;
      for (let corner = 0; corner < 4; corner++) {
        const at = (faceIndex * 4 + corner) * 3;
        buffer.positions.push3(origin[0] + (x + (CORNERS[at] as number)) * voxelSize, origin[1] + (y + (CORNERS[at + 1] as number)) * voxelSize, origin[2] + (z + (CORNERS[at + 2] as number)) * voxelSize);
        buffer.normals.push3(nx, ny, nz);
        const shade = (AMBIENT_OCCLUSION[occlusion[corner] as number] as number) * (lift[corner] as number);
        buffer.colors.push3(red * shade, green * shade, blue * shade);
      }
      buffer.vertexCount += 4;
      if ((occlusion[0] as number) + (occlusion[2] as number) < (occlusion[1] as number) + (occlusion[3] as number)) buffer.indices.push6(base + 1, base + 2, base + 3, base + 1, base + 3, base);
      else buffer.indices.push6(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  };

  if (cells) {
    for (let cell = 0; cell < cells.length; cell += 3) emitVoxel(cells[cell]!, cells[cell + 1]!, cells[cell + 2]!);
  } else {
    for (let y = minY; y < maxY; y++) {
      for (let z = minZ; z < maxZ; z++) {
        for (let x = minX; x < maxX; x++) emitVoxel(x, y, z);
      }
    }
  }

  return { solid: buffers.solid.toGeometry(), emissive: buffers.emissive.toGeometry(), glass: buffers.glass.toGeometry() };
}
