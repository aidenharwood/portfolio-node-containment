import type { WorldObjectModel } from '@containment/shared';
import { jitter, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import type { AnimatedPart, ObjectModelParts } from './objectModels.ts';

type LitterModel = Extract<WorldObjectModel, 'litterPapers' | 'litterDebris' | 'litterPuddle' | 'cableRun' | 'cableRunEnd'>;

const TILE_MIN = -8;
const TILE_MAX = 7;
const SCATTER_REACH = 6;

const parts = (base: VoxelModel, heightVoxels: number, animated: AnimatedPart[] = []): ObjectModelParts => ({ base, animated, heightVoxels });

const scatterSpot = (seed: number, index: number) => ({
  x: Math.round((noise3(index, 0, 0, seed) * 2 - 1) * SCATTER_REACH),
  z: Math.round((noise3(0, 0, index, seed + 11) * 2 - 1) * SCATTER_REACH),
});

const PAPER_TONES = [0xd8d2c0, 0xc4ccd2, 0xe6dfc8, 0xb8c8a8];

const litterPapers = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (let sheet = 0; sheet < 5; sheet++) {
    const { x, z } = scatterSpot(seed, sheet);
    const tone = PAPER_TONES[(seed + sheet) % PAPER_TONES.length] as number;
    const wide = noise3(sheet, 1, 0, seed) > 0.5;
    const [dx, dz] = wide ? [2, 1] : [1, 2];
    model.fill(x - dx, sheet % 2, z - dz, x + dx, sheet % 2, z + dz, (vx, _y, vz) => ((vx + vz) % 3 === 0 && noise3(vx, 0, vz, seed) > 0.6 ? 0x5d6b74 : tone));
  }
  return parts(model, 2);
};

const litterDebris = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (let chunk = 0; chunk < 4; chunk++) {
    const { x, z } = scatterSpot(seed, chunk + 7);
    const size = 1 + Math.floor(noise3(chunk, 2, 0, seed) * 2);
    model.fill(x - size, 0, z - size, x + size, size - 1, z, (vx, vy, vz) => (noise3(vx, vy, vz, seed + chunk) > 0.35 ? jitter(0x8a9298, 0.08, noise3(vx, vy, vz, seed)) : null));
  }
  const bracket = scatterSpot(seed, 21);
  model.fill(bracket.x - 3, 0, bracket.z, bracket.x + 3, 0, bracket.z, 0x5a3a26).fill(bracket.x + 3, 1, bracket.z, bracket.x + 3, 2, bracket.z, 0x5a3a26);
  for (let bolt = 0; bolt < 6; bolt++) {
    const { x, z } = scatterSpot(seed, bolt + 30);
    model.set(x, 0, z, 0xa8b0b6);
  }
  return parts(model, 4);
};

const litterPuddle = (seed: number): ObjectModelParts => {
  const surface = new VoxelModel();
  for (let x = TILE_MIN + 1; x <= TILE_MAX - 1; x++) {
    for (let z = TILE_MIN + 1; z <= TILE_MAX - 1; z++) {
      const edge = Math.hypot(x + 0.5, (z + 0.5) * 1.3) + (noise3(x, 0, z, seed) - 0.5) * 3;
      if (edge < 5.5) surface.set(x, 0, z, edge > 4.5 ? 0x1f5f7a : 0x46c8d8, edge > 4.5 ? VOXEL_GLASS : VOXEL_EMISSIVE);
    }
  }
  const prints = new VoxelModel();
  for (const [x, z] of [[-2, -5], [1, -2], [-2, 1], [1, 4]] as const) prints.fill(x, 0, z, x + 1, 0, z + 1, 0x2fa8b8, VOXEL_EMISSIVE);
  return parts(new VoxelModel(), 1, [
    { model: surface, animate: (part, time, partSeed) => (part.position.y = Math.sin(time * 0.9 + partSeed) * 0.004) },
    { model: prints, animate: (part, time, partSeed) => (part.visible = Math.sin(time * 0.5 + partSeed) > -0.2) },
  ]);
};

const CABLE_COLORS = [0x1b2228, 0xc99a1c, 0x2f6f8a, 0x8a3a2a];
const CABLE_LANES = [-3, -1, 1, 3];

function paintCables(model: VoxelModel, z0: number, z1: number): void {
  CABLE_LANES.forEach((lane, index) => {
    model.fill(lane, 0, z0, lane, 0, z1, (_x, _y, z) => (z % 8 === 0 ? 0x111417 : (CABLE_COLORS[index] as number)));
  });
  model.fill(-4, 1, -1, 3, 1, 0, 0x7d8b94);
}

const cableRun = (): ObjectModelParts => {
  const model = new VoxelModel();
  paintCables(model, TILE_MIN, TILE_MAX);
  return parts(model, 2);
};

const cableRunEnd = (): ObjectModelParts => {
  const model = new VoxelModel();
  paintCables(model, -3, TILE_MAX);
  model.fill(-5, 0, -6, 4, 2, -4, (x, y, z) => jitter(0x2a2f33, 0.05, noise3(x, y, z, 5)));
  model.fill(-4, 3, -6, 3, 3, -4, (x) => (x % 3 === 0 ? 0x3a2a22 : 0x2a2f33));
  CABLE_LANES.forEach((lane, index) => model.fill(lane, 0, -4, lane, 1, -3, CABLE_COLORS[index] as number));
  const spark = new VoxelModel().set(-1, 4, -5, 0xfff1c9, VOXEL_EMISSIVE).set(1, 3, -6, 0xffb347, VOXEL_EMISSIVE);
  return parts(model, 4, [{ model: spark, animate: (part, time, seed) => (part.visible = Math.sin(time * 17 + seed) > 0.7 && Math.sin(time * 0.7 + seed) > 0.2) }]);
};

export const LITTER_BUILDERS: Readonly<Record<LitterModel, (seed: number) => ObjectModelParts>> = {
  litterPapers,
  litterDebris,
  litterPuddle,
  cableRun,
  cableRunEnd,
};
