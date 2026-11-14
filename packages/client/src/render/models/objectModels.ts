import type { WorldObjectModel } from '@containment/shared';
import type { Object3D } from 'three';
import { jitter, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import { CITY_BUILDERS } from './cityModels.ts';

export interface AnimatedPart {
  readonly model: VoxelModel;
  animate(part: Object3D, time: number, seed: number): void;
}

export interface ObjectModelParts {
  readonly base: VoxelModel;
  readonly animated: readonly AnimatedPart[];
  readonly heightVoxels: number;
}

type ObjectBuilder = (seed: number) => ObjectModelParts;

const PLACEHOLDER_BODY = 0x8a8f94;
const PLACEHOLDER_MARK = 0xff4fa8;
const PLACEHOLDER_HEIGHT = 16;

const placeholder: ObjectBuilder = () => {
  const model = new VoxelModel().fill(-6, 0, -6, 5, PLACEHOLDER_HEIGHT - 1, 5, (x, y, z) => jitter(PLACEHOLDER_BODY, 0.04, noise3(x, y, z, 3)));
  model.fill(-6, PLACEHOLDER_HEIGHT, -6, 5, PLACEHOLDER_HEIGHT, 5, PLACEHOLDER_MARK, VOXEL_EMISSIVE);
  return { base: model, animated: [], heightVoxels: PLACEHOLDER_HEIGHT + 1 };
};

const BUILDERS: Readonly<Record<WorldObjectModel, ObjectBuilder>> = { placeholder, ...CITY_BUILDERS };

export const buildObjectModel = (model: WorldObjectModel, seed: number): ObjectModelParts => BUILDERS[model](seed);
