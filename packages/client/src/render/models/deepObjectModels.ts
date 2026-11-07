import type { WorldObjectModel } from '@containment/shared';
import type { Object3D } from 'three';
import { darken, jitter, lighten, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import type { AnimatedPart, ObjectModelParts } from './objectModels.ts';

type DeepObjectModel = Extract<
  WorldObjectModel,
  'cryoPod' | 'relayDish' | 'archiveShelf' | 'furnaceCore' | 'mirrorPane' | 'rimeCrystal' | 'inkPool' | 'emberSeam' | 'mirrorShard' | 'valveWheel'
>;

const grained = (color: number, amount = 0.04, salt = 0) => (x: number, y: number, z: number) => jitter(color, amount, noise3(x, y, z, salt));

const parts = (base: VoxelModel, heightVoxels: number, animated: AnimatedPart[] = []): ObjectModelParts => ({ base, animated, heightVoxels });

const pulse = (rate: number, low: number) => (part: Object3D, time: number, seed: number) => {
  const value = low + (1 - low) * (0.5 + 0.5 * Math.sin(time * rate + seed));
  part.scale.setScalar(0.92 + value * 0.08);
};

const flicker = (rate: number) => (part: Object3D, time: number, seed: number) => {
  part.visible = Math.sin(time * rate + seed * 3.1) > -0.7;
};

function crystal(model: VoxelModel, base: readonly [number, number], height: number, lean: readonly [number, number], color: number, kind?: typeof VOXEL_GLASS | typeof VOXEL_EMISSIVE): void {
  for (let y = 0; y <= height; y++) {
    const radius = 1.8 * (1 - y / (height + 1)) + 0.4;
    const cx = base[0] + lean[0] * y;
    const cz = base[1] + lean[1] * y;
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      for (let z = Math.floor(cz - radius); z <= Math.ceil(cz + radius); z++) {
        if (Math.hypot(x - cx, z - cz) > radius) continue;
        model.set(x, y, z, jitter(color, 0.05, noise3(x, y, z, height)), kind);
      }
    }
  }
}

const cryoPod = (seed: number): ObjectModelParts => {
  const model = new VoxelModel().fill(-5, 0, -4, 4, 2, 3, grained(0x3a4a56, 0.03, 1));
  model.fill(-5, 3, -4, 4, 26, -3, grained(0x5d6b74, 0.03, 2));
  model.fill(-5, 27, -4, 4, 28, 3, 0x3a4a56);
  model.fill(-5, 3, -2, -5, 26, 3, 0x4a5a66).fill(4, 3, -2, 4, 26, 3, 0x4a5a66);
  model.fill(-4, 3, 3, 3, 26, 3, (x, y) => lighten(0xa8d8f0, noise3(x, y, seed, 5) * 0.2), VOXEL_GLASS);
  model.fill(-2, 6, -1, 1, 22, 1, (x, y, z) => (noise3(x, y, z, seed + 7) > 0.4 ? darken(0x7a8a9a, 0.3) : null));
  model.fill(-3, 1, 4, 2, 1, 4, 0x7ae0ff, VOXEL_EMISSIVE);
  const frost = new VoxelModel();
  for (let i = 0; i < 18; i++) {
    const x = Math.round((noise3(i, 1, seed, 3) - 0.5) * 7);
    const y = 4 + Math.round(noise3(i, 2, seed, 3) * 20);
    frost.set(x, y, 4, 0xe8f4ff, VOXEL_EMISSIVE);
  }
  return parts(model, 29, [{ model: frost, animate: flicker(1.7) }]);
};

const relayDish = (): ObjectModelParts => {
  const model = new VoxelModel().fill(-3, 0, -3, 2, 2, 2, grained(0x3a3430, 0.03, 3));
  model.fill(-1, 3, -1, 0, 14, 0, 0x5a5048);
  for (let x = -7; x <= 6; x++) {
    for (let y = -7; y <= 6; y++) {
      const r = Math.hypot(x + 0.5, y + 0.5);
      if (r > 7) continue;
      model.set(x, 20 + y, Math.round(r * r * 0.05) - 3, r < 1.3 ? 0x3a3430 : jitter(0xc0c8d0, 0.05, noise3(x, y, 0, 9)));
    }
  }
  model.fill(-1, 19, -1, 0, 20, 3, 0x3a3430);
  const emitter = new VoxelModel().fill(-1, 19, 4, 0, 20, 5, 0xffb87a, VOXEL_EMISSIVE);
  return parts(model, 28, [{ model: emitter, animate: pulse(4.2, 0.4) }]);
};

const archiveShelf = (seed: number): ObjectModelParts => {
  const model = new VoxelModel().fill(-7, 0, -4, 6, 0, 3, 0x2a1f18);
  model.fill(-7, 1, -4, -7, 24, 3, 0x3a2a20).fill(6, 1, -4, 6, 24, 3, 0x3a2a20).fill(-7, 1, -4, 6, 24, -4, 0x2a1f18);
  for (const shelf of [1, 8, 15, 22, 24]) model.fill(-6, shelf, -3, 5, shelf, 3, 0x4a3a2a);
  for (const shelf of [2, 9, 16]) {
    for (let x = -6; x <= 5; x++) {
      const tall = 3 + Math.floor(noise3(x, shelf, seed, 13) * 4);
      if (noise3(x, shelf, seed, 17) < 0.15) continue;
      const soaked = noise3(x, shelf, seed, 19) > 0.6;
      model.fill(x, shelf, -2, x, shelf + tall, 2, soaked ? darken(0xe8dcc0, 0.45) : jitter(0xb8a888, 0.12, noise3(x, shelf, seed, 23)));
    }
  }
  for (let x = -6; x <= 5; x++) if (noise3(x, 0, seed, 29) > 0.45) model.set(x, 1 + Math.floor(noise3(x, 1, seed, 31) * 4), 4, 0x1a1428);
  return parts(model, 25);
};

const furnaceCore = (): ObjectModelParts => {
  const model = new VoxelModel();
  for (let y = 0; y <= 30; y++) {
    const radius = y < 4 ? 7 : y > 26 ? 6 : 5;
    for (let x = -7; x <= 7; x++) {
      for (let z = -7; z <= 7; z++) {
        const r = Math.hypot(x, z);
        if (r > radius || r < radius - 1.5) continue;
        const band = y % 6 === 0;
        model.set(x, y, z, band ? 0x2a1a14 : jitter(0x4a3028, 0.06, noise3(x, y, z, 37)));
      }
    }
  }
  const heart = new VoxelModel();
  for (let y = 3; y <= 27; y++) {
    for (let x = -4; x <= 4; x++) {
      for (let z = -4; z <= 4; z++) {
        if (Math.hypot(x, z) > 3.6) continue;
        heart.set(x, y, z, y % 4 === 0 ? 0xffcf4d : 0xff7a2a, VOXEL_EMISSIVE);
      }
    }
  }
  for (let x = -6; x <= 6; x += 3) model.fill(x, 8, 5, x, 22, 6, 0x1a100c);
  return parts(model, 31, [{ model: heart, animate: pulse(1.6, 0.3) }]);
};

const mirrorPane = (seed: number): ObjectModelParts => {
  const model = new VoxelModel().fill(-5, 0, -2, 4, 1, 1, 0x2a1f36);
  model.fill(-5, 2, -1, -5, 26, -1, 0x3c2b4f).fill(4, 2, -1, 4, 26, -1, 0x3c2b4f).fill(-5, 27, -1, 4, 27, -1, 0x3c2b4f);
  model.fill(-4, 2, -1, 3, 26, -1, (x, y) => lighten(0x8a7aba, 0.3 + noise3(x, y, seed, 41) * 0.3), VOXEL_GLASS);
  const shimmer = new VoxelModel();
  for (let y = 4; y <= 24; y += 4) shimmer.set(Math.round((noise3(y, seed, 0, 43) - 0.5) * 6), y, 0, 0xe8f0ff, VOXEL_EMISSIVE);
  return parts(model, 28, [{ model: shimmer, animate: flicker(2.3) }]);
};

const rimeCrystal = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) if (Math.hypot(x, z) <= 5.5) model.set(x, 0, z, jitter(0x5a7a8a, 0.08, noise3(x, 0, z, seed)));
  const glow = new VoxelModel();
  crystal(model, [0, 0], 16, [0, 0], 0xc8f0ff, VOXEL_GLASS);
  crystal(model, [-3, 2], 10, [-0.15, 0.1], 0xa8d8f0, VOXEL_GLASS);
  crystal(model, [3, -2], 12, [0.15, -0.08], 0xa8d8f0, VOXEL_GLASS);
  crystal(glow, [0, 0], 4, [0, 0], 0x7ae0ff, VOXEL_EMISSIVE);
  return parts(model, 17, [{ model: glow, animate: pulse(1.9, 0.5) }]);
};

const inkPool = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (let x = -7; x <= 6; x++) {
    for (let z = -7; z <= 6; z++) {
      const r = Math.hypot(x + 0.5, z + 0.5);
      if (r > 6.8) continue;
      model.set(x, 0, z, r > 5.6 ? 0x3a3450 : 0x0a080f);
      if (r > 5.6 && noise3(x, 1, z, seed) > 0.55) model.set(x, 1, z, 0x2a2438);
    }
  }
  const ripples = new VoxelModel();
  for (let i = 0; i < 6; i++) {
    const x = Math.round((noise3(i, 3, seed, 47) - 0.5) * 8);
    const z = Math.round((noise3(i, 4, seed, 47) - 0.5) * 8);
    ripples.set(x, 1, z, 0x7a5aff, VOXEL_EMISSIVE);
  }
  return parts(model, 3, [{ model: ripples, animate: flicker(1.2) }]);
};

const emberSeam = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (let x = -7; x <= 6; x++) {
    for (let y = 0; y <= 20; y++) {
      const depth = 2 + Math.round(noise3(x, y, seed, 53) * 2) - Math.max(0, Math.round((y - 14) / 3));
      for (let z = -4; z <= -4 + depth; z++) model.set(x, y, z, jitter(0x3a2418, 0.1, noise3(x, y, z, seed + 1)));
    }
  }
  const veins = new VoxelModel();
  for (let i = 0; i < 26; i++) {
    const x = Math.round((noise3(i, 5, seed, 59) - 0.5) * 12);
    const y = 1 + Math.round(noise3(i, 6, seed, 59) * 16);
    veins.set(x, y, -1 + Math.round(noise3(i, 7, seed, 59)), i % 3 === 0 ? 0xffcf4d : 0xff7a2a, VOXEL_EMISSIVE);
  }
  return parts(model, 21, [{ model: veins, animate: pulse(2.4, 0.4) }]);
};

const mirrorShard = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) if (Math.hypot(x, z) <= 5.5) model.set(x, 0, z, jitter(0x2a1f36, 0.06, noise3(x, 0, z, seed)));
  crystal(model, [0, 0], 18, [0.05, 0], 0xd8d8f0, VOXEL_GLASS);
  crystal(model, [-3, -2], 11, [-0.2, -0.05], 0xb8b0e0, VOXEL_GLASS);
  crystal(model, [3, 2], 9, [0.18, 0.12], 0xb8b0e0, VOXEL_GLASS);
  const glint = new VoxelModel().set(0, 12, 2, 0xb57cff, VOXEL_EMISSIVE).set(-4, 7, -1, 0xe8f0ff, VOXEL_EMISSIVE).set(4, 6, 3, 0xb57cff, VOXEL_EMISSIVE);
  return parts(model, 19, [{ model: glint, animate: flicker(3.1) }]);
};

const valveWheel = (): ObjectModelParts => {
  const model = new VoxelModel().fill(-2, 0, -2, 1, 3, 1, 0x3a3f45);
  model.fill(-1, 4, -1, 0, 12, 0, 0x5d6b74);
  model.fill(-6, 12, -2, 5, 13, 1, 0x4a4f53);
  model.fill(-1, 10, 1, 0, 11, 2, 0xc9a227);
  const wheel = new VoxelModel();
  for (let x = -5; x <= 4; x++) {
    for (let y = 13; y <= 22; y++) {
      const r = Math.hypot(x + 0.5, y - 17.5);
      if ((r > 4.2 && r < 5.2) || (r < 4.2 && (Math.abs(x + 0.5) < 0.6 || Math.abs(y - 17.5) < 0.6))) wheel.set(x, y, 2, r > 4.2 ? 0xa83a2a : 0x8a2a1a);
    }
  }
  wheel.fill(-1, 17, 3, 0, 18, 3, 0xc9a227);
  return parts(model, 23, [
    {
      model: wheel,
      animate: (part, time, seed) => {
        part.rotation.z = Math.sin(time * 0.3 + seed) * 0.08;
      },
    },
  ]);
};

export const DEEP_OBJECT_BUILDERS: Readonly<Record<DeepObjectModel, (seed: number) => ObjectModelParts>> = {
  cryoPod,
  relayDish,
  archiveShelf,
  furnaceCore,
  mirrorPane,
  rimeCrystal,
  inkPool,
  emberSeam,
  mirrorShard,
  valveWheel,
};
