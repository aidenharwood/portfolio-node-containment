import { Color, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, type Material } from 'three';
import { receiveAir } from '../sky/air.ts';
import { receiveFieldLights } from './fieldLights.ts';
import type { VoxelMeshes } from './voxelMesher.ts';

const EMISSIVE_GAIN = 1.15;
const EMISSIVE_CHROMA_GAIN = 1.5;
const ACTOR_FILL = 0.22;
const EMISSIVE_FOG = 0.35;

const CHROMA_GAIN_FRAGMENT = `#include <color_fragment>
float emissivePeak = max( max( diffuseColor.r, diffuseColor.g ), diffuseColor.b );
float emissiveChroma = emissivePeak > 0.0 ? 1.0 - min( min( diffuseColor.r, diffuseColor.g ), diffuseColor.b ) / emissivePeak : 0.0;
diffuseColor.rgb *= 1.0 + ${(EMISSIVE_CHROMA_GAIN / EMISSIVE_GAIN).toFixed(4)} * emissiveChroma * emissiveChroma;`;

function thinFog(material: MeshBasicMaterial, chromaGain = false): MeshBasicMaterial {
  material.onBeforeCompile = (shader) => {
    receiveAir(shader, EMISSIVE_FOG);
    if (chromaGain) shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', CHROMA_GAIN_FRAGMENT);
  };
  material.customProgramCacheKey = () => `air-${EMISSIVE_FOG}${chromaGain ? `-chroma-${EMISSIVE_CHROMA_GAIN}` : ''}`;
  return material;
}

export const VOXEL_MATERIALS = {
  solid: receiveFieldLights(new MeshLambertMaterial({ vertexColors: true })),
  actor: receiveFieldLights(new MeshLambertMaterial({ vertexColors: true }), ACTOR_FILL),
  actorFlash: receiveFieldLights(new MeshLambertMaterial({ vertexColors: true, emissive: 0xffe8e0, emissiveIntensity: 0.3 }), ACTOR_FILL),
  glassFlash: receiveFieldLights(new MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.65, depthWrite: false, emissive: 0xffffff, emissiveIntensity: 0.5 })),
  emissive: thinFog(new MeshBasicMaterial({ vertexColors: true, toneMapped: false, color: new Color(EMISSIVE_GAIN, EMISSIVE_GAIN, EMISSIVE_GAIN) }), true),
  glass: receiveFieldLights(new MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.32, depthWrite: false })),
  fadedSolid: receiveFieldLights(new MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.16, depthWrite: false })),
  fadedEmissive: thinFog(new MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: 0.2, depthWrite: false })),
  fadedGlass: receiveFieldLights(new MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.08, depthWrite: false })),
} as const;

export type VoxelLayer = 'solid' | 'emissive' | 'glass';

export const ACTOR_OPTIONS: VoxelObjectOptions = { materials: { solid: VOXEL_MATERIALS.actor } };

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

export function setVoxelObjectFlash(group: Group, flash: boolean): void {
  group.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    if (child.name === 'solid') child.material = flash ? VOXEL_MATERIALS.actorFlash : VOXEL_MATERIALS.actor;
    if (child.name === 'glass') child.material = flash ? VOXEL_MATERIALS.glassFlash : VOXEL_MATERIALS.glass;
  });
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
