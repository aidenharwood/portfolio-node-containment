import type { CharacterAppearance, CreatureModel } from '@containment/shared';
import { Group } from 'three';
import { jitter, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE } from '../voxel/voxelKinds.ts';
import { createVoxelObject } from '../voxel/voxelMaterials.ts';
import type { VoxelMeshes } from '../voxel/voxelMesher.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import { CHARACTER_VOXEL_SIZE } from '../world/worldScale.ts';
import { HumanoidRig } from './calderCreatureModels.ts';
import { swingCurve, type EntityPose, type EntityRig } from './entityRig.ts';

type VesperCreatureModel = Extract<CreatureModel, 'wardOrderly' | 'nightNurse' | 'prescriptionWraith' | 'chiefPhysician' | 'morgueAttendant' | 'almoner'>;

const VOXEL = CHARACTER_VOXEL_SIZE;
const PAPER = 0xf2ecd8;
const INK = 0x5a2a4a;
const VIOLET = 0xc88ad8;
const meshCache = new Map<string, VoxelMeshes>();

function cachedMesh(key: string, build: () => VoxelModel): VoxelMeshes {
  const cached = meshCache.get(key);
  if (cached) return cached;
  const meshes = build().mesh(VOXEL, [0, 0, 0]);
  meshCache.set(key, meshes);
  return meshes;
}

const appearance = (overrides: Partial<CharacterAppearance>): CharacterAppearance => ({
  physique: 'male',
  bodyType: 'average',
  height: 1,
  skinTone: '#d8d0c4',
  hairStyle: 'crop',
  hairColor: '#3a3430',
  eyeColor: '#2a3a2a',
  faceMark: 'none',
  augment: 'none',
  ...overrides,
});

class PrescriptionWraithRig implements EntityRig {
  readonly root = new Group();
  readonly height = 1.7;
  private readonly body: Group;
  private readonly sheets: Group[] = [];

  constructor() {
    this.body = createVoxelObject(cachedMesh('wraith-body', buildWraithBody));
    this.root.add(this.body);
    for (let index = 0; index < 6; index++) {
      const sheet = createVoxelObject(cachedMesh('wraith-sheet', buildWraithSheet));
      this.body.add(sheet);
      this.sheets.push(sheet);
    }
  }

  animate(pose: EntityPose): void {
    const cast = swingCurve(pose.attackProgress);
    const hurt = swingCurve(pose.hurtProgress);
    this.body.position.set(Math.sin(pose.time * 26) * hurt * 0.05, 0.12 + Math.sin(pose.time * 1.4) * 0.05, 0);
    this.body.rotation.y = Math.sin(pose.time * 0.6) * 0.2;
    for (const [index, sheet] of this.sheets.entries()) {
      const angle = pose.time * (1.2 + cast * 3) + (index * Math.PI * 2) / this.sheets.length;
      const radius = (9 + cast * 5) * VOXEL;
      sheet.position.set(Math.cos(angle) * radius, (10 + (index % 3) * 6) * VOXEL + Math.sin(pose.time * 2 + index) * 0.03, Math.sin(angle) * radius);
      sheet.rotation.y = -angle;
      sheet.rotation.z = Math.sin(pose.time * 3 + index) * 0.3;
    }
  }
}

function buildWraithBody(): VoxelModel {
  const model = new VoxelModel();
  for (let y = 0; y <= 26; y++) {
    const radius = y < 18 ? 1 + Math.floor(y / 5) : y < 22 ? 4 : 3;
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        if (Math.hypot(x, z) > radius + 0.3 || (y < 16 && noise3(x, y, z, 41) > 0.72)) continue;
        model.set(x, y, z, (x + y + z) % 5 === 0 ? INK : jitter(PAPER, 0.05, noise3(x, y, z, 43)));
      }
    }
  }
  model.set(-1, 23, 3, VIOLET, VOXEL_EMISSIVE).set(1, 23, 3, VIOLET, VOXEL_EMISSIVE);
  return model;
}

function buildWraithSheet(): VoxelModel {
  const model = new VoxelModel();
  model.fill(-2, 0, 0, 2, 5, 0, (x, y) => (y % 2 === 0 && x !== -2 ? INK : PAPER));
  return model;
}

export const VESPER_CREATURE_FACTORIES: Readonly<Record<VesperCreatureModel, () => EntityRig>> = {
  wardOrderly: () => new HumanoidRig(appearance({ bodyType: 'broad', skinTone: '#c48a64', hairStyle: 'buzz', augment: 'jawPlate' }), ['ward-helm', 'ward-plate', 'ward-trousers', 'ward-boots', 'bonesetter-maul'], 1.06, 0.7),
  nightNurse: () => new HumanoidRig(appearance({ physique: 'female', bodyType: 'slight', skinTone: '#e2b896', hairStyle: 'bun', hairColor: '#1a1410', eyeColor: '#6ad8b8' }), ['ward-visor', 'ward-plate', 'ward-trousers', 'ward-boots', 'night-shift-syringe'], 1, 0.8),
  morgueAttendant: () => new HumanoidRig(appearance({ bodyType: 'broad', skinTone: '#b8c8d0', hairStyle: 'shaved', hairColor: '#e8f0f4', eyeColor: '#9ae0ff', faceMark: 'scarCheek' }), ['ward-helm', 'physician-plate', 'ward-trousers', 'ward-boots', 'ward-scalpel'], 1.08, 0.6),
  chiefPhysician: () => new HumanoidRig(appearance({ bodyType: 'slight', height: 1.08, skinTone: '#e8e0d4', hairStyle: 'swept', hairColor: '#e8e2d4', eyeColor: '#ff6a7a', augment: 'ocularImplant' }), ['physician-loupe', 'physicians-coat', 'physician-trousers', 'physician-boots', 'physician-gloves', 'bone-saw'], 1.22, 0.6),
  almoner: () => new HumanoidRig(appearance({ physique: 'female', bodyType: 'average', skinTone: '#c8d0d8', hairStyle: 'long', hairColor: '#8a8a8a', eyeColor: '#c88ad8', faceMark: 'barcodeTattoo', augment: 'neuralPort' }), ['physician-helm', 'physician-plate', 'physician-trousers', 'physician-boots', 'triage-rifle'], 1.2, 0.6),
  prescriptionWraith: () => new PrescriptionWraithRig(),
};
