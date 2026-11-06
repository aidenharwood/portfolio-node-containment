import type { WorldObjectModel } from '@containment/shared';
import type { Object3D } from 'three';
import { darken, jitter, lighten, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import type { AnimatedPart, ObjectModelParts } from './objectModels.ts';

type CraftingModel = Extract<
  WorldObjectModel,
  'scrapHeap' | 'textileBin' | 'mossBed' | 'severedConduit' | 'sporeBloom' | 'slagHeap' | 'resinDrum' | 'refinery' | 'fabricator' | 'synthesiser' | 'storageLocker'
>;

const grained = (color: number, amount = 0.04, salt = 0) => (x: number, y: number, z: number) => jitter(color, amount, noise3(x, y, z, salt));

const parts = (base: VoxelModel, heightVoxels: number, animated: AnimatedPart[] = []): ObjectModelParts => ({ base, animated, heightVoxels });

const pulse = (rate: number, low: number) => (part: Object3D, time: number, seed: number) => {
  const value = low + (1 - low) * (0.5 + 0.5 * Math.sin(time * rate + seed));
  part.scale.setScalar(0.92 + value * 0.08);
};

function mound(model: VoxelModel, radius: number, height: number, color: (x: number, y: number, z: number) => number, seed: number): void {
  for (let x = -radius; x <= radius; x++) {
    for (let z = -radius; z <= radius; z++) {
      const distance = Math.hypot(x, z) / radius;
      if (distance > 1) continue;
      const top = Math.round(height * (1 - distance * distance) + noise3(x, 0, z, seed) * 2.5);
      for (let y = 0; y <= top; y++) model.set(x, y, z, color(x, y, z));
    }
  }
}

const scrapHeap = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  mound(model, 7, 8, (x, y, z) => {
    const n = noise3(x, y, z, seed + 3);
    if (n > 0.82) return 0xb8c2ca;
    if (n < 0.14) return 0x6a3a22;
    return jitter(0x6d777f, 0.12, n);
  }, seed);
  model.fill(-6, 6, -1, 2, 6, 0, 0x8d969e);
  model.fill(1, 2, 3, 2, 11, 4, darken(0x8d969e, 0.2));
  model.fill(-3, 9, -3, 4, 9, -3, 0xc99a1c);
  return parts(model, 12);
};

const textileBin = (): ObjectModelParts => {
  const model = new VoxelModel().fill(-6, 0, -5, 5, 12, 4, grained(0x2f6a8a, 0.03, 4));
  model.fill(-6, 13, -5, 5, 13, 4, 0x1e4a62);
  model.fill(-5, 13, -4, 4, 15, 3, (x, y, z) => {
    const n = noise3(x, y, z, 9);
    return n > 0.66 ? 0x9aa8b4 : n > 0.33 ? 0x6f8aa0 : 0x3a4b5a;
  });
  model.fill(-3, 6, 5, 2, 9, 5, 0xd8e2e8);
  model.fill(-2, 7, 6, 1, 8, 6, 0x2f6a8a);
  return parts(model, 16);
};

const mossBed = (seed: number): ObjectModelParts => {
  const model = new VoxelModel().fill(-7, 0, -5, 6, 5, 4, grained(0x3a4046, 0.03, 2));
  model.fill(-6, 5, -4, 5, 5, 3, 0x1f2a1c);
  const glow = new VoxelModel();
  for (let x = -6; x <= 5; x++) {
    for (let z = -4; z <= 3; z++) {
      const n = noise3(x, 0, z, seed);
      const height = n > 0.5 ? 2 : 1;
      for (let y = 6; y < 6 + height; y++) model.set(x, y, z, jitter(0x3f8a52, 0.1, n));
      if (n > 0.86) glow.set(x, 6 + height, z, 0x7cf29a, VOXEL_EMISSIVE);
    }
  }
  model.fill(-7, 6, -5, 6, 6, -5, 0x5d6b74).fill(-7, 6, 4, 6, 6, 4, 0x5d6b74);
  return parts(model, 9, [{ model: glow, animate: pulse(1.3, 0.3) }]);
};

const resinDrum = (): ObjectModelParts => {
  const model = new VoxelModel();
  for (let y = 0; y <= 16; y++) {
    for (let x = -5; x <= 5; x++) {
      for (let z = -5; z <= 5; z++) {
        if (Math.hypot(x, z) > 5.3) continue;
        const band = y === 2 || y === 14;
        model.set(x, y, z, band ? 0x2a2f33 : jitter(0x8a6a2a, 0.05, noise3(x, y, z, 7)));
      }
    }
  }
  model.fill(-4, 17, -4, 3, 17, 3, (x, _y, z) => (Math.hypot(x + 0.5, z + 0.5) < 3.6 ? 0xe0c27a : 0x5a4a2a));
  model.fill(-5, 13, 4, -4, 16, 5, 0xe0c27a);
  model.fill(-1, 6, 5, 1, 9, 5, 0xc99a1c).set(0, 7, 6, 0x17170f);
  return parts(model, 18);
};

const severedConduit = (seed: number): ObjectModelParts => {
  const model = new VoxelModel().fill(-7, 0, -3, 6, 2, 2, grained(0x2a2f33, 0.03, 5));
  for (const [x0, x1] of [[-7, -2], [2, 6]] as const) {
    for (let x = x0; x <= x1; x++) {
      for (let y = 3; y <= 8; y++) {
        for (let z = -3; z <= 2; z++) if (Math.hypot(y - 5.5, z + 0.5) <= 2.8) model.set(x, y, z, x % 3 === 0 ? 0x5d6b74 : 0x3a4a52);
      }
    }
  }
  model.fill(-1, 5, -1, 1, 6, 0, 0xe08a4a).fill(-1, 4, 1, 0, 4, 1, 0xe08a4a);
  const sparks = new VoxelModel()
    .set(0, 8, 0, 0xfff3c4, VOXEL_EMISSIVE)
    .set(-1, 9, -1, 0x9feeff, VOXEL_EMISSIVE)
    .set(1, 10, 0, 0xffffff, VOXEL_EMISSIVE)
    .set(0, 7, 1, 0x9feeff, VOXEL_EMISSIVE);
  return parts(model, 11, [
    {
      model: sparks,
      animate: (part, time) => {
        const flash = Math.sin(time * 23 + seed * 7) * Math.sin(time * 5.3 + seed);
        part.visible = flash > 0.35;
        part.rotation.y = time * 4;
      },
    },
  ]);
};

const sporeBloom = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  const caps = new VoxelModel();
  const stalks = [[-3, -2, 10], [2, 1, 14], [-1, 3, 7], [4, -3, 9]] as const;
  for (const [x, z, height] of stalks) {
    model.fill(x, 0, z, x, height, z, 0x6a7a8a);
    const radius = 1.5 + height / 6;
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        if (Math.hypot(dx, dz) > radius) continue;
        caps.set(x + dx, height + 1, z + dz, jitter(0x8ad8ff, 0.08, noise3(dx, height, dz, seed)), VOXEL_EMISSIVE);
        if (Math.hypot(dx, dz) < radius - 1) caps.set(x + dx, height + 2, z + dz, 0xc8f6ff, VOXEL_EMISSIVE);
      }
    }
  }
  mound(model, 6, 1, (x, y, z) => jitter(0x2a3a4a, 0.08, noise3(x, y, z, seed + 1)), seed);
  return parts(model, 17, [
    {
      model: caps,
      animate: (part, time) => {
        part.position.y = Math.sin(time * 0.9 + seed) * 0.02;
        part.rotation.y = Math.sin(time * 0.4 + seed) * 0.08;
      },
    },
  ]);
};

const slagHeap = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  mound(model, 7, 9, (x, y, z) => {
    const n = noise3(x, y, z, seed + 11);
    if (n > 0.85) return 0xb5642a;
    return jitter(y > 6 ? 0x5a3a26 : 0x3a2418, 0.1, n);
  }, seed);
  const embers = new VoxelModel();
  for (let i = 0; i < 6; i++) {
    const x = Math.round((noise3(i, 1, seed) - 0.5) * 8);
    const z = Math.round((noise3(i, 2, seed) - 0.5) * 8);
    embers.set(x, 3 + (i % 3), z, i % 2 === 0 ? 0xff7a2a : 0xffb347, VOXEL_EMISSIVE);
  }
  return parts(model, 12, [{ model: embers, animate: pulse(2.1, 0.5) }]);
};

const refinery = (): ObjectModelParts => {
  const model = new VoxelModel().fill(-7, 0, -6, 6, 3, 5, grained(0x2a3035, 0.03, 1));
  model.fill(-6, 4, -5, 0, 22, 4, grained(0x4a4f53, 0.03, 2));
  model.fill(-6, 23, -5, 0, 24, 4, 0x2a2f33);
  model.fill(-5, 8, 5, -1, 13, 5, 0x17170f);
  model.fill(1, 4, -4, 5, 12, 3, grained(0x5d6b74, 0.03, 3));
  model.fill(1, 13, -4, 5, 13, 3, 0xc99a1c);
  model.fill(2, 4, 4, 4, 5, 6, 0x8d969e);
  model.fill(-3, 25, -2, -2, 31, -1, 0x3a3f45);
  const glow = new VoxelModel().fill(-4, 9, 6, -2, 12, 6, (_x, y) => (y % 2 === 0 ? 0xff7a2a : 0xffb347), VOXEL_EMISSIVE);
  glow.fill(3, 10, 4, 4, 11, 4, 0x46c8a8, VOXEL_EMISSIVE);
  return parts(model, 32, [{ model: glow, animate: pulse(3.1, 0.6) }]);
};

const fabricator = (): ObjectModelParts => {
  const model = new VoxelModel().fill(-7, 0, -6, 6, 6, 5, grained(0x3a4852, 0.03, 4));
  model.fill(-7, 7, -6, 6, 7, 5, 0x5d6b74);
  model.fill(-7, 8, -6, -6, 26, -5, 0x2f3c45).fill(5, 8, -6, 6, 26, -5, 0x2f3c45);
  model.fill(-7, 27, -6, 6, 28, -4, 0x2f3c45);
  model.fill(-5, 8, -6, 4, 22, -6, 0x141c22);
  model.fill(-4, 9, -5, 3, 21, -5, (x, y) => (y % 3 === 0 && x % 2 === 0 ? 0x4fd8ff : 0x1f86a8), VOXEL_EMISSIVE);
  model.fill(-3, 8, -2, 2, 9, 2, 0x8d969e);
  const head = new VoxelModel().fill(-1, 24, -3, 0, 26, 1, 0xc99a1c).fill(-1, 20, -1, 0, 23, -1, 0x8d969e).set(0, 19, -1, 0xffffff, VOXEL_EMISSIVE);
  return parts(model, 29, [
    {
      model: head,
      animate: (part, time, seed) => {
        part.position.x = Math.sin(time * 1.3 + seed) * 0.2;
        part.position.z = Math.cos(time * 0.9 + seed) * 0.12;
      },
    },
  ]);
};

const synthesiser = (): ObjectModelParts => {
  const model = new VoxelModel().fill(-6, 0, -5, 5, 8, 4, grained(0xd8e2e8, 0.02, 6));
  model.fill(-6, 9, -5, 5, 9, 4, 0x7a8a94);
  model.fill(-5, 2, 5, 4, 6, 5, 0x17222a);
  model.fill(-4, 3, 6, -1, 5, 6, 0x7cf29a, VOXEL_EMISSIVE);
  for (const x of [-4, 1]) {
    for (let y = 10; y <= 22; y++) {
      for (let dx = 0; dx <= 2; dx++) {
        for (let z = -2; z <= 0; z++) {
          const shell = dx === 0 || dx === 2 || z === -2 || z === 0;
          if (shell) model.set(x + dx, y, z, lighten(0x7cf29a, 0.4), VOXEL_GLASS);
        }
      }
    }
    model.fill(x, 23, -2, x + 2, 24, 0, 0x7a8a94);
  }
  const fluid = new VoxelModel().fill(-3, 10, -1, -3, 18, -1, 0x7cf29a, VOXEL_EMISSIVE).fill(2, 10, -1, 2, 15, -1, 0xb0f0ff, VOXEL_EMISSIVE);
  return parts(model, 25, [
    {
      model: fluid,
      animate: (part, time, seed) => {
        part.scale.y = 0.85 + 0.15 * Math.sin(time * 1.7 + seed);
      },
    },
  ]);
};

const storageLocker = (): ObjectModelParts => {
  const model = new VoxelModel().fill(-7, 0, -5, 6, 30, 4, grained(0x2f3c45, 0.02, 8));
  model.fill(-7, 31, -5, 6, 31, 4, 0x5d6b74);
  for (const x0 of [-6, 0]) {
    model.fill(x0, 1, 5, x0 + 5, 29, 5, grained(0x3a4852, 0.02, 9));
    for (let y = 4; y <= 26; y += 11) model.fill(x0 + 1, y, 6, x0 + 4, y, 6, 0x22272b);
  }
  model.fill(-1, 1, 5, -1, 29, 5, 0x17222a);
  model.fill(-5, 24, 6, -2, 26, 6, 0xd8e2e8);
  const panel = new VoxelModel().fill(2, 14, 6, 4, 18, 6, (_x, y) => (y === 16 ? 0x9feeff : 0x4fd8ff), VOXEL_EMISSIVE);
  return parts(model, 32, [{ model: panel, animate: pulse(1.6, 0.4) }]);
};

export const CRAFTING_BUILDERS: Readonly<Record<CraftingModel, (seed: number) => ObjectModelParts>> = {
  scrapHeap,
  textileBin,
  mossBed,
  severedConduit,
  sporeBloom,
  slagHeap,
  resinDrum,
  refinery,
  fabricator,
  synthesiser,
  storageLocker,
};
