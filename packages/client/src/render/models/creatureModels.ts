import type { CreatureModel } from '@containment/shared';
import { Group } from 'three';
import { jitter, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE } from '../voxel/voxelKinds.ts';
import { createVoxelObject } from '../voxel/voxelMaterials.ts';
import type { VoxelMeshes } from '../voxel/voxelMesher.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import { CHARACTER_VOXEL_SIZE } from '../world/worldScale.ts';
import { swingCurve, type EntityPose, type EntityRig } from './entityRig.ts';
import { WARD_CREATURE_FACTORIES } from './wardCreatureModels.ts';

const PLACEHOLDER_HIDE = 0x6a6f74;
const PLACEHOLDER_EYE = 0xff4fa8;

let placeholderMesh: VoxelMeshes | null = null;

function buildPlaceholderBody(): VoxelModel {
  const model = new VoxelModel().fill(-5, 0, -5, 4, 13, 4, (x, y, z) => jitter(PLACEHOLDER_HIDE, 0.05, noise3(x, y, z, 5)));
  return model.fill(-3, 9, 5, -2, 10, 5, PLACEHOLDER_EYE, VOXEL_EMISSIVE).fill(1, 9, 5, 2, 10, 5, PLACEHOLDER_EYE, VOXEL_EMISSIVE);
}

class PlaceholderRig implements EntityRig {
  readonly root = new Group();
  readonly height = 0.8;
  private readonly body: Group;

  constructor() {
    placeholderMesh ??= buildPlaceholderBody().mesh(CHARACTER_VOXEL_SIZE, [0, 0, 0]);
    this.body = createVoxelObject(placeholderMesh);
    this.root.add(this.body);
  }

  animate(pose: EntityPose): void {
    const lunge = swingCurve(pose.attackProgress);
    const hurt = swingCurve(pose.hurtProgress);
    const bob = pose.moving ? Math.abs(Math.sin(pose.walkPhase * Math.PI)) * 0.06 : 0;
    this.body.position.set(Math.sin(pose.time * 40) * hurt * 0.04, bob, lunge * 0.3);
  }
}

const FACTORIES: Readonly<Record<CreatureModel, () => EntityRig>> = { placeholder: () => new PlaceholderRig(), ...WARD_CREATURE_FACTORIES };

export const createCreatureRig = (model: CreatureModel): EntityRig => FACTORIES[model]();
