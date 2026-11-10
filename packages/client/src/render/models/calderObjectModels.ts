import type { WorldObjectModel } from '@containment/shared';
import type { Object3D } from 'three';
import { jitter, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import type { ObjectModelParts } from './objectModels.ts';

type CalderObjectModel = Extract<WorldObjectModel, 'saltSeam' | 'geodeCluster'>;

const glow = (rate: number, low: number) => (part: Object3D, time: number, seed: number) => {
  const value = low + (1 - low) * (0.5 + 0.5 * Math.sin(time * rate + seed));
  part.scale.setScalar(0.94 + value * 0.06);
};

const saltSeam = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (let x = -6; x <= 6; x++) {
    for (let z = -3; z <= 2; z++) {
      const top = 10 - Math.abs(x) + Math.round(noise3(x, 0, z, seed) * 3) - Math.max(0, z);
      for (let y = 0; y <= top; y++) model.set(x, y, z, jitter(0x5a4a40, 0.08, noise3(x, y, z, seed + 3)));
    }
  }
  const veins = new VoxelModel();
  for (let x = -5; x <= 5; x++) {
    const y = 4 + Math.round(Math.sin(x * 0.7 + seed) * 2);
    veins.set(x, y, 3, 0xf2c8b8).set(x, y + 1, 3, x % 3 === 0 ? 0xff9a6a : 0xf2c8b8, x % 3 === 0 ? VOXEL_EMISSIVE : undefined);
  }
  for (const [x, y] of [[-3, 8], [2, 7], [4, 3]] as const) veins.set(x, y, 3, 0xff9a6a, VOXEL_EMISSIVE);
  return { base: model, animated: [{ model: veins, animate: glow(0.7, 0.4) }], heightVoxels: 14 };
};

const geodeCluster = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  const spikes = new VoxelModel();
  for (let i = 0; i < 5; i++) {
    const cx = Math.round((noise3(i, 1, seed) - 0.5) * 9);
    const cz = Math.round((noise3(i, 2, seed) - 0.5) * 7);
    const radius = 2 + (i % 2);
    for (let x = -radius; x <= radius; x++) {
      for (let y = 0; y <= radius * 2; y++) {
        for (let z = -radius; z <= radius; z++) {
          const distance = Math.hypot(x, (y - radius) * 0.8, z);
          if (distance > radius + 0.4) continue;
          const shell = distance > radius - 0.8;
          model.set(cx + x, y, cz + z, shell ? jitter(0x9a8a7a, 0.08, noise3(x, y, z, seed + i)) : 0xf4efe6, shell ? undefined : VOXEL_GLASS);
        }
      }
    }
    for (let step = 0; step <= 3 + i; step++) spikes.set(cx, radius * 2 + step, cz, step >= 2 + i ? 0xffd27f : 0xfff8ee, step >= 2 + i ? VOXEL_EMISSIVE : VOXEL_GLASS);
  }
  return { base: model, animated: [{ model: spikes, animate: glow(1.1, 0.5) }], heightVoxels: 14 };
};

export const CALDER_OBJECT_BUILDERS: Readonly<Record<CalderObjectModel, (seed: number) => ObjectModelParts>> = {
  saltSeam,
  geodeCluster,
};
