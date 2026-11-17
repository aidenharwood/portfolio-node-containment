import { meshVoxels, type VoxelMeshes } from './voxelMesher.ts';
import { VOXEL_EMPTY, VOXEL_SOLID, type VoxelBounds, type VoxelKind, type VoxelSource } from './voxelKinds.ts';

const OFFSET = 512;
const SPAN = 1024;

const pack = (x: number, y: number, z: number): number => x + OFFSET + (y + OFFSET) * SPAN + (z + OFFSET) * SPAN * SPAN;

export type Paint = number | ((x: number, y: number, z: number) => number | null);

export class VoxelModel implements VoxelSource {
  private readonly voxels = new Map<number, { color: number; kind: VoxelKind; readonly x: number; readonly y: number; readonly z: number }>();
  private readonly min: [number, number, number] = [Infinity, Infinity, Infinity];
  private readonly max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  set(x: number, y: number, z: number, color: number, kind: VoxelKind = VOXEL_SOLID): this {
    this.voxels.set(pack(x, y, z), { color, kind, x, y, z });
    if (x < this.min[0]) this.min[0] = x;
    if (y < this.min[1]) this.min[1] = y;
    if (z < this.min[2]) this.min[2] = z;
    if (x > this.max[0]) this.max[0] = x;
    if (y > this.max[1]) this.max[1] = y;
    if (z > this.max[2]) this.max[2] = z;
    return this;
  }

  remove(x: number, y: number, z: number): this {
    this.voxels.delete(pack(x, y, z));
    return this;
  }

  fill(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, paint: Paint, kind: VoxelKind = VOXEL_SOLID): this {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
        for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
          const color = typeof paint === 'number' ? paint : paint(x, y, z);
          if (color !== null) this.set(x, y, z, color, kind);
        }
      }
    }
    return this;
  }

  paintExisting(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, paint: Paint, kind?: VoxelKind): this {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
        for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
          const cell = this.voxels.get(pack(x, y, z));
          if (!cell) continue;
          const color = typeof paint === 'number' ? paint : paint(x, y, z);
          if (color === null) continue;
          cell.color = color;
          cell.kind = kind ?? cell.kind;
        }
      }
    }
    return this;
  }

  cells(): { readonly x: number; readonly y: number; readonly z: number; readonly color: number; readonly kind: VoxelKind }[] {
    return [...this.voxels.values()];
  }

  merge(other: VoxelModel): this {
    for (const cell of other.cells()) this.set(cell.x, cell.y, cell.z, cell.color, cell.kind);
    return this;
  }

  occupied(): string[] {
    return [...this.voxels.values()].map((cell) => `${cell.x},${cell.y},${cell.z}`);
  }

  has(x: number, y: number, z: number): boolean {
    return this.voxels.has(pack(x, y, z));
  }

  kindAt(x: number, y: number, z: number): number {
    return this.voxels.get(pack(x, y, z))?.kind ?? VOXEL_EMPTY;
  }

  colorAt(x: number, y: number, z: number): number {
    return this.voxels.get(pack(x, y, z))?.color ?? 0;
  }

  baseBounds(layers: number): VoxelBounds | null {
    const cells = [...this.voxels.values()].filter((cell) => cell.y < layers);
    if (cells.length === 0) return null;
    const xs = cells.map((cell) => cell.x);
    const zs = cells.map((cell) => cell.z);
    return { min: [Math.min(...xs), 0, Math.min(...zs)], max: [Math.max(...xs) + 1, layers, Math.max(...zs) + 1] };
  }

  get isEmpty(): boolean {
    return this.voxels.size === 0;
  }

  get bounds(): VoxelBounds | null {
    if (this.isEmpty) return null;
    return { min: [this.min[0], this.min[1], this.min[2]], max: [this.max[0] + 1, this.max[1] + 1, this.max[2] + 1] };
  }

  mesh(voxelSize: number, pivot: readonly [number, number, number] = [0, 0, 0], grounded = false): VoxelMeshes {
    if (this.isEmpty) return { solid: null, emissive: null, glass: null };
    return meshVoxels(
      this,
      { min: [this.min[0], this.min[1], this.min[2]], max: [this.max[0] + 1, this.max[1] + 1, this.max[2] + 1] },
      { voxelSize, origin: [-pivot[0] * voxelSize, -pivot[1] * voxelSize, -pivot[2] * voxelSize], groundY: grounded ? 0 : undefined },
      this.occupiedCells(),
    );
  }

  private occupiedCells(): Int32Array {
    const [minX, minY, minZ] = this.min;
    const width = this.max[0] - minX + 1;
    const depth = this.max[2] - minZ + 1;
    const order = [...this.voxels.values()].map(({ x, y, z }) => ((y - minY) * depth + (z - minZ)) * width + (x - minX)).sort((a, b) => a - b);
    const cells = new Int32Array(order.length * 3);
    order.forEach((key, index) => {
      cells[index * 3] = (key % width) + minX;
      cells[index * 3 + 1] = Math.floor(key / (width * depth)) + minY;
      cells[index * 3 + 2] = (Math.floor(key / width) % depth) + minZ;
    });
    return cells;
  }
}
