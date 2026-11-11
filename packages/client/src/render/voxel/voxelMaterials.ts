import { Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, type Material } from 'three';
import { receiveFieldLights } from './fieldLights.ts';
import type { VoxelMeshes } from './voxelMesher.ts';

export const VOXEL_MATERIALS = {
  solid: receiveFieldLights(new MeshLambertMaterial({ vertexColors: true })),
  emissive: new MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
  glass: receiveFieldLights(new MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.32, depthWrite: false })),
  fadedSolid: receiveFieldLights(new MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.16, depthWrite: false })),
  fadedEmissive: new MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: 0.2, depthWrite: false }),
  fadedGlass: receiveFieldLights(new MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.08, depthWrite: false })),
} as const;

export type VoxelLayer = 'solid' | 'emissive' | 'glass';

export interface VoxelObjectOptions {
  readonly castShadow?: boolean;
  readonly receiveShadow?: boolean;
  readonly materials?: Partial<Record<VoxelLayer, Material>>;
}

export function createVoxelObject(meshes: VoxelMeshes, options: VoxelObjectOptions = {}): Group {
  const group = new Group();
  for (const layer of ['solid', 'emissive', 'glass'] as const) {
    const geometry = meshes[layer];
    if (!geometry) continue;
    const mesh = new Mesh(geometry, options.materials?.[layer] ?? VOXEL_MATERIALS[layer]);
    mesh.name = layer;
    mesh.castShadow = layer === 'solid' && (options.castShadow ?? true);
    mesh.receiveShadow = layer !== 'emissive' && (options.receiveShadow ?? true);
    group.add(mesh);
  }
  return group;
}

export function setVoxelObjectFaded(group: Group, faded: boolean): void {
  group.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const layer = child.name as VoxelLayer;
    if (layer === 'solid') child.material = faded ? VOXEL_MATERIALS.fadedSolid : VOXEL_MATERIALS.solid;
    if (layer === 'emissive') child.material = faded ? VOXEL_MATERIALS.fadedEmissive : VOXEL_MATERIALS.emissive;
    if (layer === 'glass') child.material = faded ? VOXEL_MATERIALS.fadedGlass : VOXEL_MATERIALS.glass;
    child.castShadow = layer === 'solid' && !faded;
  });
}
