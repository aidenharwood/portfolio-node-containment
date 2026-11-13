import type { WorldObjectModel } from '@containment/shared';
import type { Object3D } from 'three';
import { VOXEL_EMISSIVE, VOXEL_GLASS } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import type { AnimatedPart, ObjectModelParts } from './objectModels.ts';

type QuestFixtureModel = Extract<WorldObjectModel, 'curatorLedger' | 'timeClock' | 'charterLectern' | 'cellarLedger' | 'returnChute'>;

const parts = (base: VoxelModel, heightVoxels: number, animated: AnimatedPart[] = []): ObjectModelParts => ({ base, animated, heightVoxels });

const blink = (rate: number, phase: number) => (part: Object3D, time: number, seed: number) => {
  part.visible = Math.sin(time * rate + phase + seed) > -0.2;
};

const curatorLedger = (): ObjectModelParts => {
  const model = new VoxelModel()
    .fill(-8, 0, -5, 7, 9, 4, 0x8aa6b8)
    .fill(-9, 10, -6, 8, 11, 5, 0xdff2fb)
    .fill(-6, 12, -3, -1, 12, 2, 0xf4f8f2)
    .fill(0, 12, -3, 5, 13, 2, 0xf4f8f2)
    .fill(-1, 12, -3, 0, 13, 2, 0x2c3e4a)
    .fill(-5, 13, -2, -2, 13, -2, 0x7a8a94)
    .fill(1, 14, -2, 4, 14, -2, 0x7a8a94)
    .fill(-5, 13, 0, -2, 13, 0, 0x7a8a94);
  const frost = new VoxelModel().fill(5, 12, 3, 7, 13, 4, 0x9ae8ff, VOXEL_EMISSIVE);
  return parts(model, 15, [{ model: frost, animate: blink(1.4, 0) }]);
};

const timeClock = (): ObjectModelParts => {
  const model = new VoxelModel()
    .fill(-4, 0, -8, 3, 3, -4, 0x4a4a42)
    .fill(-5, 4, -8, 4, 32, -4, 0xc9bd96)
    .fill(-4, 20, -3, 3, 31, -3, 0xf2ecd8)
    .fill(-4, 20, -3, 3, 20, -3, 0x2a2a24)
    .fill(-4, 31, -3, 3, 31, -3, 0x2a2a24)
    .fill(-4, 20, -3, -4, 31, -3, 0x2a2a24)
    .fill(3, 20, -3, 3, 31, -3, 0x2a2a24)
    .fill(0, 22, -2, 0, 27, -2, 0x1a1a18)
    .fill(0, 26, -2, 2, 26, -2, 0x1a1a18)
    .fill(-3, 10, -3, 2, 17, -3, 0x6a6048)
    .fill(-2, 12, -2, 1, 12, -2, 0x0e0e0c)
    .fill(5, 8, -8, 7, 26, -6, 0x5a4a32);
  [10, 14, 18, 22].forEach((y, index) => {
    model.fill(5, y, -5, 7, y + 2, -5, [0xe8e2cc, 0xd8a84a, 0xe8e2cc, 0xb84a3a][index] as number);
  });
  const lamp = new VoxelModel().fill(-1, 18, -3, 0, 18, -3, 0xffb347, VOXEL_EMISSIVE);
  return parts(model, 33, [{ model: lamp, animate: blink(2.5, 0) }]);
};

const charterLectern = (): ObjectModelParts => {
  const model = new VoxelModel()
    .fill(-6, 0, -5, 5, 1, 4, 0x2c2440)
    .fill(-2, 2, -1, 1, 15, 2, 0x3e3258)
    .fill(-7, 16, -6, 6, 17, 5, 0x2c2440)
    .fill(-6, 18, -5, 5, 18, -3, 0x4e4070)
    .fill(-6, 18, 3, 5, 19, 4, 0x4e4070);
  model.fill(-5, 18, -2, 4, 19, 2, 0xe8dcb4);
  model.fill(-4, 20, -1, 3, 20, 1, 0xc9b88a);
  model.fill(-6, 20, -5, 5, 23, 4, 0xb57cff, VOXEL_GLASS);
  const glow = new VoxelModel().fill(-3, 19, 0, 2, 19, 1, 0xd9b8ff, VOXEL_EMISSIVE);
  return parts(model, 24, [{ model: glow, animate: blink(1.1, 0) }]);
};

const cellarLedger = (): ObjectModelParts => {
  const model = new VoxelModel()
    .fill(-8, 0, -5, -6, 25, 4, 0x3e2c1e)
    .fill(5, 0, -5, 7, 25, 4, 0x3e2c1e)
    .fill(-5, 0, -4, 4, 25, 3, 0x5a4230)
    .fill(-9, 26, -6, 8, 28, 5, 0x6a4e36)
    .fill(-4, 17, 4, 3, 22, 4, 0x2a1c12)
    .fill(-2, 18, 5, 1, 19, 5, 0xc8a84a)
    .fill(-6, 29, -4, 5, 31, 2, 0xe8dec0)
    .fill(0, 29, -4, 0, 31, 2, 0x3a2a1e)
    .fill(-6, 29, 3, 5, 29, 4, 0x2e5a4e)
    .fill(6, 29, -5, 7, 40, -4, 0x2a2a28)
    .fill(2, 40, -5, 7, 41, -4, 0x2a2a28);
  const lamp = new VoxelModel().fill(1, 38, -5, 3, 39, -4, 0x6ad8b8, VOXEL_EMISSIVE);
  return parts(model, 42, [{ model: lamp, animate: blink(1.8, 0) }]);
};

const returnChute = (): ObjectModelParts => {
  const model = new VoxelModel()
    .fill(-3, 0, -8, 2, 32, -3, 0x6a6e72)
    .fill(-4, 6, -8, 3, 7, -2, 0x4a4e52)
    .fill(-4, 26, -8, 3, 27, -2, 0x4a4e52)
    .fill(-5, 12, -4, 4, 14, 0, 0x8a6a3a)
    .fill(-6, 15, -4, 5, 17, 2, 0x8a6a3a)
    .fill(-7, 18, -4, 6, 20, 5, 0x8a6a3a)
    .fill(-5, 15, -3, 3, 17, 1, 0x120e08)
    .fill(-6, 18, -3, 4, 20, 4, 0x120e08);
  const letter = new VoxelModel().fill(-3, 20, 1, 2, 21, 4, 0xf4ecd0, VOXEL_EMISSIVE);
  return parts(model, 33, [{ model: letter, animate: blink(1.3, 0) }]);
};

export const QUEST_FIXTURE_BUILDERS: Readonly<Record<QuestFixtureModel, (seed: number) => ObjectModelParts>> = {
  curatorLedger,
  timeClock,
  charterLectern,
  cellarLedger,
  returnChute,
};
