import { Vector3 } from 'three';

export const TILE_RESOLUTION = 8;
export const ZONE_VOXEL_SIZE = 1 / TILE_RESOLUTION;
export const FLOOR_LAYERS = 2;
export const WALL_LAYERS = 16;
export const ZONE_VOLUME_HEIGHT = FLOOR_LAYERS + WALL_LAYERS;
export const WALL_HEIGHT = WALL_LAYERS * ZONE_VOXEL_SIZE;
export const ZONE_MESH_ORIGIN: readonly [number, number, number] = [-0.5, -FLOOR_LAYERS * ZONE_VOXEL_SIZE, -0.5];

export const MODEL_VOXEL_SIZE = 1 / 16;
export const CHARACTER_VOXEL_SIZE = 1 / 20;

export const tileToWorld = (x: number, y: number, height = 0): Vector3 => new Vector3(x, height, y);
