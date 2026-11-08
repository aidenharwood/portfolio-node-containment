import { VOXEL_EMPTY, VOXEL_SOLID, type VoxelKind, type VoxelSource } from './voxelKinds.ts';

export class DenseVolume implements VoxelSource {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly originX: number;
  readonly originZ: number;
  private readonly kinds: Uint8Array;
  private readonly colors: Uint32Array;

  constructor(width: number, height: number, depth: number, originX = 0, originZ = 0) {
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.originX = originX;
    this.originZ = originZ;
    this.kinds = new Uint8Array(width * height * depth);
    this.colors = new Uint32Array(width * height * depth);
  }

  set(x: number, y: number, z: number, color: number, kind: VoxelKind = VOXEL_SOLID): void {
    const index = this.indexOf(x, y, z);
    if (index < 0) return;
    this.kinds[index] = kind;
    this.colors[index] = color;
  }

  clear(x: number, y: number, z: number): void {
    const index = this.indexOf(x, y, z);
    if (index >= 0) this.kinds[index] = VOXEL_EMPTY;
  }

  kindAt(x: number, y: number, z: number): number {
    const index = this.indexOf(x, y, z);
    return index < 0 ? VOXEL_EMPTY : (this.kinds[index] ?? VOXEL_EMPTY);
  }

  colorAt(x: number, y: number, z: number): number {
    const index = this.indexOf(x, y, z);
    return index < 0 ? 0 : (this.colors[index] ?? 0);
  }

  private indexOf(worldX: number, y: number, worldZ: number): number {
    const x = worldX - this.originX;
    const z = worldZ - this.originZ;
    if (x < 0 || y < 0 || z < 0 || x >= this.width || y >= this.height || z >= this.depth) return -1;
    return (y * this.depth + z) * this.width + x;
  }
}
