export const VOXEL_EMPTY = 0;
export const VOXEL_SOLID = 1;
export const VOXEL_EMISSIVE = 2;
export const VOXEL_GLASS = 3;

export type VoxelKind = typeof VOXEL_SOLID | typeof VOXEL_EMISSIVE | typeof VOXEL_GLASS;

export interface VoxelSource {
  kindAt(x: number, y: number, z: number): number;
  colorAt(x: number, y: number, z: number): number;
}

export interface VoxelBounds {
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

export const occludes = (kind: number): boolean => kind === VOXEL_SOLID || kind === VOXEL_EMISSIVE;
