import { BufferGeometry, Color, Float32BufferAttribute } from 'three';
import { occludes, VOXEL_EMISSIVE, VOXEL_EMPTY, VOXEL_GLASS, type VoxelBounds, type VoxelSource } from './voxelKinds.ts';

export interface VoxelMeshes {
  readonly solid: BufferGeometry | null;
  readonly emissive: BufferGeometry | null;
  readonly glass: BufferGeometry | null;
}

export interface MeshOptions {
  readonly voxelSize: number;
  readonly origin: readonly [number, number, number];
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
const UNOCCLUDED = [3, 3, 3, 3];

class GeometryBuffer {
  readonly positions: number[] = [];
  readonly normals: number[] = [];
  readonly colors: number[] = [];
  readonly indices: number[] = [];

  toGeometry(): BufferGeometry | null {
    if (this.indices.length === 0) return null;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(this.colors, 3));
    geometry.setIndex(this.indices);
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

export function meshVoxels(source: VoxelSource, bounds: VoxelBounds, options: MeshOptions): VoxelMeshes {
  const buffers = { solid: new GeometryBuffer(), emissive: new GeometryBuffer(), glass: new GeometryBuffer() };
  const { voxelSize, origin } = options;
  const [minX, minY, minZ] = bounds.min;
  const [maxX, maxY, maxZ] = bounds.max;
  const cell = [0, 0, 0];

  for (let y = minY; y < maxY; y++) {
    for (let z = minZ; z < maxZ; z++) {
      for (let x = minX; x < maxX; x++) {
        const kind = source.kindAt(x, y, z);
        if (kind === VOXEL_EMPTY) continue;
        const buffer = kind === VOXEL_EMISSIVE ? buffers.emissive : kind === VOXEL_GLASS ? buffers.glass : buffers.solid;
        const [red, green, blue] = linearColor(source.colorAt(x, y, z));
        cell[0] = x;
        cell[1] = y;
        cell[2] = z;

        for (const face of FACES) {
          const [nx, ny, nz] = face.normal;
          if (!shouldEmitFace(kind, source.kindAt(x + nx, y + ny, z + nz))) continue;

          const occlusion = kind === VOXEL_EMISSIVE ? UNOCCLUDED : cornerOcclusion(source, cell, face);
          const base = buffer.positions.length / 3;
          face.corners.forEach((corner, index) => {
            buffer.positions.push(
              origin[0] + (x + corner[0]) * voxelSize,
              origin[1] + (y + corner[1]) * voxelSize,
              origin[2] + (z + corner[2]) * voxelSize,
            );
            buffer.normals.push(nx, ny, nz);
            const shade = AMBIENT_OCCLUSION[occlusion[index] ?? 3] ?? 1;
            buffer.colors.push(red * shade, green * shade, blue * shade);
          });
          const flip = (occlusion[0] ?? 3) + (occlusion[2] ?? 3) < (occlusion[1] ?? 3) + (occlusion[3] ?? 3);
          if (flip) buffer.indices.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
          else buffer.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
      }
    }
  }

  return { solid: buffers.solid.toGeometry(), emissive: buffers.emissive.toGeometry(), glass: buffers.glass.toGeometry() };
}

function cornerOcclusion(source: VoxelSource, cell: readonly number[], face: FaceDefinition): number[] {
  const uAxis = (face.axis + 1) % 3;
  const vAxis = (face.axis + 2) % 3;
  const outside = [cell[0]! + face.normal[0], cell[1]! + face.normal[1], cell[2]! + face.normal[2]];
  const solidAt = (offsetU: number, offsetV: number): number => {
    const probe = [...outside];
    probe[uAxis]! += offsetU;
    probe[vAxis]! += offsetV;
    return occludes(source.kindAt(probe[0]!, probe[1]!, probe[2]!)) ? 1 : 0;
  };
  return face.corners.map((corner) => {
    const stepU = corner[uAxis] === 1 ? 1 : -1;
    const stepV = corner[vAxis] === 1 ? 1 : -1;
    const sideU = solidAt(stepU, 0);
    const sideV = solidAt(0, stepV);
    if (sideU && sideV) return 0;
    return 3 - (sideU + sideV + solidAt(stepU, stepV));
  });
}
