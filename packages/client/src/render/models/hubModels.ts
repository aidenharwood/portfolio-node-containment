import type { WorldObjectModel } from '@containment/shared';
import { jitter, lighten, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import type { ObjectModelParts } from './objectModels.ts';

type HubModel = Extract<WorldObjectModel, 'medBed' | 'stranglerVine' | 'seedVault' | 'tram'>;

const parts = (base: VoxelModel, heightVoxels: number, animated: ObjectModelParts['animated'] = []): ObjectModelParts => ({ base, animated, heightVoxels });

const medBed = (): ObjectModelParts => {
  const model = new VoxelModel();
  for (const [x, z] of [[-6, -6], [5, -6], [-6, 6], [5, 6]] as const) model.fill(x, 0, z, x, 4, z, 0x8d969e);
  model.fill(-6, 5, -7, 5, 6, 7, 0xd8e2e8);
  model.fill(-5, 7, -6, 4, 7, 6, (x, _y, z) => jitter(0xeaf2f5, 0.02, noise3(x, 7, z, 3)));
  model.fill(-4, 8, -6, 3, 9, -3, 0xf6fbfc);
  model.fill(-6, 7, -7, 5, 16, -7, 0x5d6b74);
  model.fill(-6, 16, -7, 5, 16, -3, 0x5d6b74);
  const canopy = new VoxelModel().fill(-5, 15, -6, 4, 15, -4, 0x7cf29a, VOXEL_EMISSIVE).fill(-5, 11, -7, -3, 13, -7, 0x46c8a8, VOXEL_EMISSIVE);
  return parts(model, 17, [
    {
      model: canopy,
      animate: (part, time, seed) => {
        part.visible = Math.sin(time * 1.4 + seed) > -0.85;
      },
    },
  ]);
};

const stranglerVine = (seed: number): ObjectModelParts => {
  const model = new VoxelModel().fill(-6, 0, -6, 5, 1, 5, 0x3a4046);
  model.fill(-6, 0, -6, -6, 22, -6, 0x5d6b74).fill(5, 0, -6, 5, 22, -6, 0x5d6b74).fill(-6, 22, -6, 5, 22, -6, 0x5d6b74);
  for (let strand = 0; strand < 3; strand++) {
    const phase = strand * 2.1 + seed;
    for (let y = 1; y <= 22; y++) {
      const x = Math.round(Math.sin(y * 0.45 + phase) * 4);
      const z = Math.round(Math.cos(y * 0.45 + phase) * 4) - 1;
      model.set(x, y, z, jitter(0x3f7a3a, 0.12, noise3(x, y, z, strand)));
      model.set(x + 1, y, z, jitter(0x2f5a2a, 0.1, noise3(x + 1, y, z, strand)));
      if (y % 5 === 0) model.set(x, y, z + 1, 0x8aa05a);
    }
  }
  const buds = new VoxelModel();
  for (let i = 0; i < 5; i++) {
    const y = 4 + i * 4;
    buds.set(Math.round(Math.sin(y * 0.45 + seed) * 4), y, Math.round(Math.cos(y * 0.45 + seed) * 4) + 1, 0xc8ff7a, VOXEL_EMISSIVE);
  }
  return parts(model, 23, [
    {
      model: buds,
      animate: (part, time) => {
        part.rotation.y = Math.sin(time * 0.6 + seed) * 0.05;
        part.scale.setScalar(1 + Math.sin(time * 1.7 + seed) * 0.03);
      },
    },
  ]);
};

const seedVault = (): ObjectModelParts => {
  const model = new VoxelModel().fill(-7, 0, -5, 6, 24, 3, (x, y, z) => jitter(0x9fb3bd, 0.03, noise3(x, y, z, 12)));
  for (let y = 2; y <= 22; y += 5) model.fill(-6, y, 4, 5, y + 3, 4, (x) => (x === -6 || x === 5 ? 0x5d6b74 : lighten(0xd8f0ff, 0.1)), VOXEL_GLASS);
  model.fill(-2, 12, 5, 1, 16, 5, 0x141c22);
  model.fill(-7, 25, -5, 6, 25, 3, 0xe8f4f8);
  const screen = new VoxelModel().fill(-1, 13, 6, 0, 15, 6, 0x9fd8ff, VOXEL_EMISSIVE);
  return parts(model, 26, [
    {
      model: screen,
      animate: (part, time) => {
        part.visible = Math.sin(time * 3) > -0.6;
      },
    },
  ]);
};

const tram = (): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-13, 0, -6, 12, 1, 6, 0x2a2f33);
  for (const z of [-5, 5]) model.fill(-14, 2, z, 13, 2, z, 0x8d969e);
  model.fill(-12, 3, -5, 11, 18, 5, (x, y, z) => {
    if (y === 3) return 0x3a4046;
    if (y >= 9 && y <= 14 && (z === 5 || z === -5) && Math.abs(x) % 6 !== 0) return null;
    if (y === 7 || y === 8) return 0x46c8a8;
    return jitter(0xd8e2e8, 0.03, noise3(x, y, z, 44));
  });
  for (const z of [-5, 5]) model.fill(-11, 9, z, 10, 14, z, (x) => (Math.abs(x) % 6 === 0 ? 0xd8e2e8 : lighten(0x9fd8ff, 0.2)), VOXEL_GLASS);
  model.fill(-12, 19, -4, 11, 20, 4, 0xb8c2ca);
  model.fill(-3, 21, -1, 2, 22, 1, 0x5d6b74);
  for (const x of [-13, 12]) model.fill(x, 5, -4, x, 16, 4, (_x, y, z) => (y >= 9 && y <= 14 && Math.abs(z) <= 3 ? lighten(0x9fd8ff, 0.2) : 0xb8c2ca), VOXEL_GLASS);
  const lamps = new VoxelModel().fill(-14, 5, -3, -14, 6, -2, 0xfff3c4, VOXEL_EMISSIVE).fill(-14, 5, 2, -14, 6, 3, 0xfff3c4, VOXEL_EMISSIVE).fill(-10, 15, 6, 9, 15, 6, 0x7cf29a, VOXEL_EMISSIVE);
  return parts(model, 23, [
    {
      model: lamps,
      animate: (part, time, seed) => {
        part.visible = Math.sin(time * 0.9 + seed) > -0.95;
      },
    },
  ]);
};

export const HUB_BUILDERS: Readonly<Record<HubModel, (seed: number) => ObjectModelParts>> = {
  medBed,
  stranglerVine,
  seedVault,
  tram,
};
