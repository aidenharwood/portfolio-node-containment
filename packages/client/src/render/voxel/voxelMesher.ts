import { BufferAttribute, BufferGeometry, Color } from 'three';
import { occludes, VOXEL_EMISSIVE, VOXEL_EMPTY, VOXEL_GLASS, type VoxelBounds, type VoxelSource } from './voxelKinds.ts';

export interface VoxelMeshes {
  readonly solid: BufferGeometry | null;
  readonly emissive: BufferGeometry | null;
  readonly glass: BufferGeometry | null;
}

export interface MeshOptions {
  readonly voxelSize: number;
  readonly origin: readonly [number, number, number];
  readonly clipBounds?: VoxelBounds;
}

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

const AMBIENT_OCCLUSION = [0.5, 0.68, 0.84, 1];

interface FaceProbe {
  readonly normal: Vector;
  readonly corners: readonly Vector[];
  readonly sideU: readonly Vector[];
  readonly sideV: readonly Vector[];
  readonly diagonal: readonly Vector[];
}

const FACE_PROBES: readonly FaceProbe[] = FACES.map((face) => {
  const uAxis = (face.axis + 1) % 3;
  const vAxis = (face.axis + 2) % 3;
  const offset = (stepU: number, stepV: number): Vector => {
    const probe: [number, number, number] = [face.normal[0], face.normal[1], face.normal[2]];
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

const occlusion = [3, 3, 3, 3];
const buffers = { solid: new GeometryBuffer(), emissive: new GeometryBuffer(), glass: new GeometryBuffer() };

export function meshVoxels(source: VoxelSource, bounds: VoxelBounds, options: MeshOptions, cells?: ArrayLike<number>): VoxelMeshes {
  buffers.solid.reset();
  buffers.emissive.reset();
  buffers.glass.reset();
  const { voxelSize, origin } = options;
  const clip = options.clipBounds;
  const [minX, minY, minZ] = bounds.min;
  const [maxX, maxY, maxZ] = bounds.max;
  const neighborKind = (x: number, y: number, z: number): number => {
    if (clip && (x < clip.min[0] || y < clip.min[1] || z < clip.min[2] || x >= clip.max[0] || y >= clip.max[1] || z >= clip.max[2])) return VOXEL_EMPTY;
    return source.kindAt(x, y, z);
  };
  const occludedAt = (x: number, y: number, z: number, offset: Vector): number => (occludes(source.kindAt(x + offset[0], y + offset[1], z + offset[2])) ? 1 : 0);

  const emitVoxel = (x: number, y: number, z: number): void => {
        const kind = source.kindAt(x, y, z);
        if (kind === VOXEL_EMPTY) return;
        const buffer = kind === VOXEL_EMISSIVE ? buffers.emissive : kind === VOXEL_GLASS ? buffers.glass : buffers.solid;
        const [red, green, blue] = linearColor(source.colorAt(x, y, z));

        for (let faceIndex = 0; faceIndex < FACE_PROBES.length; faceIndex++) {
          const face = FACE_PROBES[faceIndex]!;
          const [nx, ny, nz] = face.normal;
          if (!shouldEmitFace(kind, neighborKind(x + nx, y + ny, z + nz))) continue;

          for (let corner = 0; corner < 4; corner++) {
            if (kind === VOXEL_EMISSIVE) {
              occlusion[corner] = 3;
              continue;
            }
            const sideU = occludedAt(x, y, z, face.sideU[corner]!);
            const sideV = occludedAt(x, y, z, face.sideV[corner]!);
            occlusion[corner] = sideU && sideV ? 0 : 3 - (sideU + sideV + occludedAt(x, y, z, face.diagonal[corner]!));
          }
          const base = buffer.vertexCount;
          for (let corner = 0; corner < 4; corner++) {
            const offset = face.corners[corner]!;
            buffer.positions.push3(origin[0] + (x + offset[0]) * voxelSize, origin[1] + (y + offset[1]) * voxelSize, origin[2] + (z + offset[2]) * voxelSize);
            buffer.normals.push3(nx, ny, nz);
            const shade = AMBIENT_OCCLUSION[occlusion[corner]!]!;
            buffer.colors.push3(red * shade, green * shade, blue * shade);
          }
          buffer.vertexCount += 4;
          if (occlusion[0]! + occlusion[2]! < occlusion[1]! + occlusion[3]!) buffer.indices.push6(base + 1, base + 2, base + 3, base + 1, base + 3, base);
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
