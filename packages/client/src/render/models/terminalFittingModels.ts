import type { WorldObjectModel } from '@containment/shared';
import type { Object3D } from 'three';
import { VOXEL_EMISSIVE, VOXEL_GLASS } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import type { AnimatedPart, ObjectModelParts } from './objectModels.ts';

type TerminalFittingModel = Extract<
  WorldObjectModel,
  'sealHatch' | 'sealPlate' | 'patientLantern' | 'issueLocker' | 'sampleCabinet' | 'bufferStop' | 'platformGate' | 'departureBoard'
>;

const parts = (base: VoxelModel, heightVoxels: number, animated: AnimatedPart[] = []): ObjectModelParts => ({ base, animated, heightVoxels });

const blink = (rate: number, phase: number) => (part: Object3D, time: number, seed: number) => {
  part.visible = Math.sin(time * rate + phase + seed) > -0.2;
};

const sealHatch = (): ObjectModelParts => {
  const model = new VoxelModel().fill(-8, 0, -8, 7, 21, -6, 0x2e2a38);
  const ring = new VoxelModel();
  for (let x = -8; x <= 7; x++) {
    for (let y = 0; y <= 21; y++) {
      const reach = Math.hypot(x + 0.5, y - 10.5);
      if (reach > 8.2) continue;
      if (reach > 7) model.set(x, y, -5, 0x6a5a8a);
      else if (reach > 6) model.set(x, y, -5, 0x1a1624);
      else model.set(x, y, -5, 0x4a4660);
      if (reach > 6 && reach <= 6.9 && (x + y) % 3 === 0) ring.set(x, y, -4, 0xb57cff, VOXEL_EMISSIVE);
    }
  }
  model.fill(-6, 10, -4, 5, 11, -4, 0x8a86a0).fill(-1, 4, -4, 0, 17, -4, 0x8a86a0).fill(-2, 9, -3, 1, 12, -3, 0xb4b0c8);
  return parts(model, 22, [{ model: ring, animate: blink(1.6, 0.5) }]);
};

const sealPlate = (): ObjectModelParts => {
  const model = new VoxelModel().fill(-8, 0, -8, 7, 21, -6, 0x2e2a38).fill(-8, 20, -5, 7, 21, -5, 0x6a5a8a).fill(-8, 0, -5, 7, 1, -5, 0x6a5a8a);
  return parts(model, 22);
};

const patientLantern = (): ObjectModelParts => {
  const model = new VoxelModel()
    .fill(-7, 0, -7, 6, 3, 6, 0x2a3640)
    .fill(-6, 4, -6, 5, 5, 5, 0x4a5a66)
    .fill(-6, 6, -6, 5, 41, 5, 0x6ac8d8, VOXEL_GLASS)
    .fill(-7, 42, -7, 6, 44, 6, 0x4a5a66)
    .fill(-1, 45, -1, 0, 50, 0, 0x2a3640)
    .fill(-3, 51, -3, 2, 52, 2, 0x4a5a66);
  const flame = new VoxelModel()
    .fill(-3, 20, -3, 2, 21, 2, 0xb8892a)
    .fill(-3, 22, -3, 2, 29, 2, 0xffb347, VOXEL_EMISSIVE)
    .fill(-1, 24, -1, 0, 27, 0, 0xfff1c9, VOXEL_EMISSIVE)
    .fill(-2, 30, -2, 1, 31, 1, 0xb8892a)
    .fill(-1, 32, -1, 0, 33, 0, 0xb8892a);
  return parts(model, 53, [
    {
      model: flame,
      animate: (part, time, seed) => {
        part.position.y = Math.sin(time * 0.9 + seed) * 0.18;
      },
    },
  ]);
};

const issueLocker = (): ObjectModelParts => {
  const model = new VoxelModel()
    .fill(-8, 0, -4, 7, 1, 3, 0x2a3a30)
    .fill(-8, 2, -4, 7, 25, 3, 0x4a6a58)
    .fill(-8, 26, -4, 7, 27, 3, 0x2a3a30)
    .fill(-7, 4, 4, 6, 23, 4, 0x10181a);
  for (let x = -7; x <= 6; x += 3) model.fill(x, 4, 4, x, 23, 4, 0xc4ccd0);
  model.fill(-7, 4, 4, 6, 5, 4, 0xc4ccd0).fill(-7, 22, 4, 6, 23, 4, 0xc4ccd0).fill(-7, 13, 4, 6, 13, 4, 0xc4ccd0);
  model.fill(-4, 7, 2, 3, 10, 2, 0xd6a922).fill(-4, 16, 2, 3, 20, 2, 0x8a3a3a);
  model.fill(-3, 28, -2, 2, 29, 1, 0xe8dcb4);
  const led = new VoxelModel().fill(5, 25, 4, 6, 25, 4, 0x3fbf7f, VOXEL_EMISSIVE);
  return parts(model, 30, [{ model: led, animate: blink(2, 0) }]);
};

const sampleCabinet = (): ObjectModelParts => {
  const model = new VoxelModel()
    .fill(-7, 0, -5, 6, 2, 4, 0xdfe6ea)
    .fill(-7, 3, -5, 6, 26, -4, 0xdfe6ea)
    .fill(-7, 3, -5, -6, 26, 4, 0xdfe6ea)
    .fill(5, 3, -5, 6, 26, 4, 0xdfe6ea)
    .fill(-7, 27, -5, 6, 29, 4, 0xaab8c0)
    .fill(-5, 3, -3, 4, 26, 3, 0x1c2a30)
    .fill(-5, 3, 4, 4, 26, 4, 0x9ad8e8, VOXEL_GLASS);
  for (const y of [9, 15, 21]) model.fill(-5, y, -3, 4, y, 3, 0xaab8c0);
  for (const y of [10, 16, 22]) {
    for (let x = -4; x <= 3; x += 2) model.fill(x, y, 0, x, y + 3, 1, x % 4 === 0 ? 0xffb347 : 0xd8f0f8);
  }
  const cold = new VoxelModel().fill(-4, 28, 4, 3, 28, 4, 0x6ad8ff, VOXEL_EMISSIVE);
  return parts(model, 30, [{ model: cold, animate: blink(0.8, 0) }]);
};

const bufferStop = (): ObjectModelParts => {
  const model = new VoxelModel();
  for (let x = -14; x <= 8; x += 6) model.fill(x, 0, -6, x + 2, 1, 5, 0x4a3a2c);
  model.fill(-16, 2, -3, 8, 3, -2, 0x8a9096).fill(-16, 2, 1, 8, 3, 2, 0x8a9096);
  model.fill(8, 0, -7, 15, 3, 6, 0x3a3a3e);
  model.fill(10, 4, -7, 15, 13, 6, (_x, y, z) => (Math.floor((y + z + 64) / 3) % 2 === 0 ? 0xd6a922 : 0x17170f));
  model.fill(8, 4, -2, 9, 11, 1, 0xb8b8bc);
  model.fill(9, 14, -7, 15, 15, 6, 0x3a3a3e);
  const lamp = new VoxelModel().fill(12, 16, -1, 13, 17, 0, 0xff4a3a, VOXEL_EMISSIVE);
  return parts(model, 18, [{ model: lamp, animate: blink(3, 0) }]);
};

const platformGate = (): ObjectModelParts => {
  const model = new VoxelModel();
  for (const x of [-16, 12]) {
    model.fill(x, 0, -3, x + 3, 1, 2, 0x3a4048);
    model.fill(x, 2, -2, x + 3, 25, 1, 0xdfe6ea);
    model.fill(x, 26, -3, x + 3, 27, 2, 0x3a4048);
  }
  model.fill(-12, 3, 0, 11, 3, 0, 0x3a4048);
  model.fill(-12, 4, 0, 11, 22, 0, 0xcfeaf0, VOXEL_GLASS);
  model.fill(-12, 23, -1, 11, 24, 1, 0xd6a922);
  model.fill(-1, 4, 0, 0, 22, 0, 0x3a4048);
  const light = new VoxelModel().fill(-14, 22, 2, -13, 23, 2, 0x7cf29a, VOXEL_EMISSIVE).fill(13, 22, 2, 14, 23, 2, 0x7cf29a, VOXEL_EMISSIVE);
  return parts(model, 28, [{ model: light, animate: blink(1.2, 0) }]);
};

const departureBoard = (): ObjectModelParts => {
  const model = new VoxelModel()
    .fill(-24, 10, -8, 23, 11, -6, 0x2a3036)
    .fill(-22, 12, -8, 21, 12, -7, 0x2a3036)
    .fill(-24, 13, -8, 23, 30, -5, 0x14181c)
    .fill(-24, 30, -8, 23, 31, -5, 0x2a3036)
    .fill(-24, 13, -8, -23, 30, -5, 0x2a3036)
    .fill(22, 13, -8, 23, 30, -5, 0x2a3036);
  const rows = new VoxelModel();
  [26, 22, 18].forEach((y, row) => {
    rows.fill(-21, y, -4, -14, y + 1, -4, 0xffb347, VOXEL_EMISSIVE);
    rows.fill(-11, y, -4, 8, y + 1, -4, row === 1 ? 0xfff1c9 : 0xffcf4d, VOXEL_EMISSIVE);
  });
  const status = new VoxelModel()
    .fill(12, 25, -4, 20, 27, -4, 0x7cf29a, VOXEL_EMISSIVE)
    .fill(12, 21, -4, 20, 23, -4, 0xff6a4a, VOXEL_EMISSIVE)
    .fill(12, 17, -4, 20, 19, -4, 0x7cf29a, VOXEL_EMISSIVE);
  return parts(model, 32, [{ model: rows, animate: blink(0.7, 0) }, { model: status, animate: blink(2.2, 1) }]);
};

export const TERMINAL_FITTING_BUILDERS: Readonly<Record<TerminalFittingModel, (seed: number) => ObjectModelParts>> = {
  sealHatch,
  sealPlate,
  patientLantern,
  issueLocker,
  sampleCabinet,
  bufferStop,
  platformGate,
  departureBoard,
};
