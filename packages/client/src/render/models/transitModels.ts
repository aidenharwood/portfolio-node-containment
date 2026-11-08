import type { WorldObjectModel } from '@containment/shared';
import { jitter, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import type { ObjectModelParts } from './objectModels.ts';

type TransitModel = Extract<WorldObjectModel, 'tramStop' | 'anomaly'>;

const parts = (base: VoxelModel, heightVoxels: number, animated: ObjectModelParts['animated'] = []): ObjectModelParts => ({ base, animated, heightVoxels });

const tramStop = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-5, 0, -4, 4, 1, 3, (x, y, z) => (y === 1 && (x + z) % 3 === 0 ? 0xc99a1c : 0x2b3a44));
  model.fill(-1, 2, -1, 0, 20, 0, (_x, y) => jitter(0x5d6b74, 0.03, noise3(0, y, seed, 4)));
  model.fill(-7, 21, -1, 6, 29, 0, (x, y) => (x === -7 || x === 6 || y === 21 || y === 29 ? 0x1b2228 : 0x111a20));
  model.fill(-6, 22, 1, 5, 28, 1, 0x0b1014);
  model.fill(-2, 30, -1, 1, 32, 0, 0x2b3a44);
  model.fill(-6, 11, 1, -3, 14, 1, 0x4fd8ff, VOXEL_GLASS);
  const roundel = new VoxelModel();
  for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
    roundel.set(Math.round(Math.cos(angle) * 2) - 1, 31 + Math.round(Math.sin(angle) * 2), 1, 0x4fd8ff, VOXEL_EMISSIVE);
  }
  const flaps = new VoxelModel();
  for (let x = -5; x <= 4; x++) {
    for (const y of [23, 26]) {
      if ((x + y + seed) % 4 === 0) continue;
      flaps.fill(x, y, 2, x, y + 1, 2, y === 26 ? 0xffcf4d : 0xffb347, VOXEL_EMISSIVE);
    }
  }
  return parts(model, 33, [
    { model: roundel, animate: (part, time, phase) => (part.visible = Math.sin(time * 1.3 + phase) > -0.92) },
    {
      model: flaps,
      animate: (part, time, phase) => {
        const flip = Math.sin(time * 0.7 + phase) > 0.97;
        part.scale.y = flip ? 0.4 : 1;
        part.position.y = flip ? 1.1 : 0;
      },
    },
  ]);
};

const anomaly = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-6, 0, -3, 5, 0, 2, (x, _y, z) => (noise3(x, 0, z, seed) > 0.6 ? 0x3c2b4f : 0x1b1424));
  const ring = new VoxelModel();
  for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
    const radius = 9 + Math.round(noise3(Math.round(angle * 10), 0, 0, seed) * 2);
    const x = Math.round(Math.cos(angle) * radius * 0.75);
    const y = 15 + Math.round(Math.sin(angle) * radius);
    ring.set(x, y, 0, angle % 0.3 < 0.15 ? 0xd7a8ff : 0x9b5cff, VOXEL_EMISSIVE);
  }
  const core = new VoxelModel();
  for (let y = 8; y <= 22; y++) {
    const width = Math.round(Math.sqrt(Math.max(0, 49 - (y - 15) ** 2)) * 0.7);
    for (let x = -width; x <= width; x++) {
      if (noise3(x, y, 0, seed + 3) > 0.45) core.set(x, y, 0, noise3(x, y, 1, seed) > 0.7 ? 0x7cf29a : 0x5a2f8a, VOXEL_GLASS);
    }
  }
  const shards = new VoxelModel();
  for (let index = 0; index < 7; index++) {
    const angle = (index / 7) * Math.PI * 2;
    const x = Math.round(Math.cos(angle) * 7);
    const z = Math.round(Math.sin(angle) * 4);
    shards.fill(x, 4 + index * 3, z, x, 5 + index * 3, z, index % 2 === 0 ? 0xd7a8ff : 0x7cf29a, VOXEL_EMISSIVE);
  }
  return parts(model, 27, [
    {
      model: ring,
      animate: (part, time, phase) => {
        const pulse = 1 + Math.sin(time * 2.2 + phase) * 0.05;
        part.scale.set(pulse, pulse, 1);
      },
    },
    { model: core, animate: (part, time, phase) => (part.visible = Math.sin(time * 11 + phase) > -0.7) },
    { model: shards, animate: (part, time, phase) => (part.rotation.y = time * 0.8 + phase) },
  ]);
};

export const TRANSIT_BUILDERS: Readonly<Record<TransitModel, (seed: number) => ObjectModelParts>> = {
  tramStop,
  anomaly,
};
