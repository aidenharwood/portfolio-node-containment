import type { WorldObjectModel } from '@containment/shared';
import { darken, jitter, lighten, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import type { ObjectModelParts } from './objectModels.ts';

type RuinModel = Extract<WorldObjectModel, 'benchToppled' | 'planterToppled' | 'barricade' | 'debrisPile' | 'kioskBurnt' | 'collapsedSlab'>;

const parts = (base: VoxelModel, heightVoxels: number): ObjectModelParts => ({ base, animated: [], heightVoxels });

const grained = (color: number, amount = 0.04, salt = 0) => (x: number, y: number, z: number) => jitter(color, amount, noise3(x, y, z, salt));

const STEEL = 0x56636c;
const CONCRETE = 0x7d8388;
const REBAR = 0x5a3a26;
const CHAR = 0x1e1b1a;
const SOIL = 0x3b2a1e;
const TAPE = 0xc9a227;

const benchToppled = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (let y = 0; y <= 9; y++) {
    const lean = Math.floor(y / 5);
    model.fill(-7, y, -4 + lean, 6, y, -3 + lean, (x, vy, z) => (z === -4 + lean ? jitter(0x7d8b94, 0.04, noise3(x, vy, z, seed)) : 0x5f6c74));
  }
  model.fill(-6, 0, -2, -5, 3, 4, grained(0x4a555d, 0.04, seed));
  model.fill(4, 0, -2, 5, 2, 2, grained(0x4a555d, 0.04, seed + 1));
  model.fill(4, 3, 1, 5, 5, 3, grained(0x4a555d, 0.04, seed + 2));
  model.fill(-2, 0, 3, 3, 0, 6, (x, _y, z) => (noise3(x, 0, z, seed) > 0.45 ? 0x9a8f7a : null));
  return parts(model, 10);
};

const planterToppled = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-6, 0, -4, 5, 11, 1, (x, y, z) => {
    const rim = x === -6 || x === 5 || y === 0 || y === 11;
    if (z === 1 && !rim) return null;
    return rim ? jitter(0x6a7176, 0.03, noise3(x, y, z, seed)) : jitter(0x4a4f53, 0.03, noise3(x, y, z, seed));
  });
  model.fill(-5, 1, -3, 4, 10, 0, (x, y, z) => jitter(SOIL, 0.05, noise3(x, y, z, seed)));
  for (let x = -7; x <= 6; x++) {
    for (let z = 2; z <= 7; z++) {
      const reach = 6 - Math.abs(x) * 0.35;
      if (z - 1 < reach && noise3(x, 0, z, seed) > 0.25 + (z - 2) * 0.08) model.set(x, 0, z, jitter(SOIL, 0.06, noise3(x, 1, z, seed)));
    }
  }
  for (let leaf = 0; leaf < 7; leaf++) {
    const x = -4 + Math.floor(noise3(leaf, 4, 0, seed) * 9);
    const z = 2 + Math.floor(noise3(0, 5, leaf, seed) * 5);
    model.fill(x, 1, z, x + 1, 1, z + 1, noise3(leaf, 6, 0, seed) > 0.5 ? 0x4a5a2a : 0x6a4a2a);
  }
  return parts(model, 12);
};

const barricade = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-7, 0, -3, 6, 5, 2, grained(0x6a5a44, 0.05, seed));
  model.fill(-7, 6, -3, 6, 6, 2, grained(STEEL, 0.04, seed + 1));
  for (let y = 7; y <= 15; y++) {
    const lean = Math.floor((y - 7) / 3);
    model.fill(-6, y, -1 - lean, 2, y, 0 - lean, grained(darken(STEEL, 0.1), 0.05, seed + y));
  }
  for (let y = 7; y <= 13; y++) model.fill(3, y, 0 + Math.floor((y - 7) / 4), 6, y, 1 + Math.floor((y - 7) / 4), grained(0x8a7a5a, 0.05, seed + 40 + y));
  model.fill(-7, 3, 3, 6, 4, 3, (x, y) => ((x + y) % 4 < 2 ? TAPE : 0x2a2420));
  model.fill(-1, 7, 3, 0, 14, 3, 0x3a3f44);
  return parts(model, 16);
};

const debrisPile = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (let x = -7; x <= 6; x++) {
    for (let z = -7; z <= 6; z++) {
      const reach = Math.hypot(x + 0.5, z + 0.5);
      const top = Math.round(11 * (1 - reach / 9.5) + noise3(x, 0, z, seed) * 3);
      for (let y = 0; y < top; y++) {
        const roll = noise3(x, y, z, seed + 3);
        model.set(x, y, z, roll > 0.9 ? 0xa8b0b6 : roll > 0.8 ? 0x4a4f53 : jitter(CONCRETE, 0.09, noise3(x, y, z, seed)));
      }
    }
  }
  for (const [x, z, lean] of [[-2, -1, 1], [1, 2, -1], [-4, 3, 1]] as const) {
    for (let y = 8; y <= 16; y++) model.set(x + Math.round(((y - 8) * lean) / 3), y, z, REBAR);
  }
  return parts(model, 17);
};

const kioskBurnt = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-7, 0, -5, 6, 19, 4, (x, y, z) => {
    const shell = x === -7 || x === 6 || z === -5 || z === 4 || y === 0 || y === 19;
    if (!shell) return null;
    if (y === 19 && noise3(x, 0, z, seed) > 0.45) return null;
    if (x === 6 && y > 12 && z < 0) return null;
    return noise3(x, y, z, seed) > 0.8 ? lighten(CHAR, 0.12) : jitter(CHAR, 0.03, noise3(x, y, z, seed + 1));
  });
  model.fill(-6, 3, 4, 5, 14, 4, (x, y, z) => (y % 3 === 0 ? 0x3a3330 : jitter(0x2a2523, 0.04, noise3(x, y, z, seed))));
  model.paintExisting(-6, 3, 4, 5, 14, 4, (x, y) => (noise3(x, y, 9, seed) > 0.85 ? 0x6a4a2a : null));
  for (const [x, z] of [[-3, -2], [2, 1], [0, -4], [-5, 2]] as const) model.set(x, 1, z, 0xff7a2a, VOXEL_EMISSIVE);
  model.fill(-4, 20, -5, -2, 23, -4, (x, y, z) => (noise3(x, y, z, seed + 5) > 0.3 ? CHAR : null));
  return parts(model, 24);
};

const collapsedSlab = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (let x = -22; x <= 21; x++) {
    for (let z = -20; z <= 18; z++) {
      const rise = 2 + Math.floor((x + 22) / 6);
      const edge = x < -20 || x > 19 || z < -18 || z > 16;
      if (noise3(x, 0, z, seed + 8) > 0.97) continue;
      model.fill(x, rise, z, x, rise + (edge ? 1 : 3), z, (vx, vy, vz) => jitter(CONCRETE, 0.07, noise3(vx, vy, vz, seed)));
      if (!edge && z % 8 === 0 && x % 8 === 0) model.set(x, rise + 4, z, darken(CONCRETE, 0.25));
    }
  }
  for (let x = -22; x <= 21; x += 3) {
    for (let y = 0; y <= 1; y++) model.fill(x, y, -21, x, y, -17, grained(darken(CONCRETE, 0.1), 0.06, seed + 20));
  }
  for (const [x, z, lean] of [[-18, 19, 1], [-8, 20, -1], [6, 19, 1], [16, 20, -1]] as const) {
    for (let y = 3; y <= 13; y++) model.set(x + Math.round(((y - 3) * lean) / 3), y, z + Math.floor((y - 3) / 5), REBAR);
  }
  for (let x = -22; x <= 21; x++) {
    for (let z = 19; z <= 23; z++) {
      const top = Math.round(4 * (1 - (z - 19) / 5) + noise3(x, 0, z, seed + 12) * 2);
      for (let y = 0; y < top; y++) model.set(x, y, z, jitter(0x6a7076, 0.1, noise3(x, y, z, seed)));
    }
  }
  return parts(model, 15);
};

export const RUIN_BUILDERS: Readonly<Record<RuinModel, (seed: number) => ObjectModelParts>> = {
  benchToppled,
  planterToppled,
  barricade,
  debrisPile,
  kioskBurnt,
  collapsedSlab,
};
