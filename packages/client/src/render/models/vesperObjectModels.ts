import type { WorldObjectModel } from '@containment/shared';
import type { Object3D } from 'three';
import { jitter, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import type { ObjectModelParts } from './objectModels.ts';

type VesperObjectModel = Extract<WorldObjectModel, 'herbCabinet' | 'tinctureStill'>;

const glow = (rate: number, low: number) => (part: Object3D, time: number, seed: number) => {
  const value = low + (1 - low) * (0.5 + 0.5 * Math.sin(time * rate + seed));
  part.scale.setScalar(0.95 + value * 0.05);
};

const herbCabinet = (seed: number): ObjectModelParts => {
  const model = new VoxelModel().fill(-6, 0, -3, 6, 22, 3, (x, y, z) => jitter(0x6a4a30, 0.05, noise3(x, y, z, seed)));
  for (let row = 0; row < 5; row++) {
    for (let column = 0; column < 4; column++) {
      const x0 = -5 + column * 3;
      const y0 = 2 + row * 4;
      model.fill(x0, y0, 4, x0 + 1, y0 + 2, 4, 0x8a6a48);
      model.set(x0, y0 + 1, 5, 0xc9a227);
    }
  }
  const herbs = new VoxelModel();
  for (let x = -5; x <= 5; x += 2) {
    for (let y = 23; y <= 25 + ((x + 7) % 3); y++) herbs.set(x, y, 0, (x + y) % 2 === 0 ? 0x9ab87a : 0x6a8a4a);
  }
  return { base: model, animated: [{ model: herbs, animate: glow(0.5, 0.6) }], heightVoxels: 27 };
};

const tinctureStill = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (let y = 0; y <= 12; y++) {
    const radius = y < 2 ? 5 : y < 10 ? 4 : 2;
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        if (Math.hypot(x, z) > radius + 0.3) continue;
        model.set(x, y, z, jitter(0xb8743a, 0.06, noise3(x, y, z, seed)));
      }
    }
  }
  for (let step = 0; step <= 8; step++) model.set(2 + step, 13 - Math.round(step * 0.8), 0, 0xc98a4a);
  model.fill(9, 0, -2, 12, 4, 2, 0x4a3a4a, VOXEL_GLASS);
  const tincture = new VoxelModel().fill(10, 1, -1, 11, 3, 1, 0x7a3a6a, VOXEL_EMISSIVE);
  tincture.set(10, 6, 0, 0xc88ad8, VOXEL_EMISSIVE);
  return { base: model, animated: [{ model: tincture, animate: glow(1.6, 0.4) }], heightVoxels: 16 };
};

export const VESPER_OBJECT_BUILDERS: Readonly<Record<VesperObjectModel, (seed: number) => ObjectModelParts>> = {
  herbCabinet,
  tinctureStill,
};
