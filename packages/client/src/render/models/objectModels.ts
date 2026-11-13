import type { WorldObjectModel } from '@containment/shared';
import type { Object3D } from 'three';
import { darken, jitter, lighten, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import { ASSEMBLY_BUILDERS } from './assemblyModels.ts';
import { CALDER_OBJECT_BUILDERS } from './calderObjectModels.ts';
import { VESPER_OBJECT_BUILDERS } from './vesperObjectModels.ts';
import { CLUTTER_BUILDERS } from './clutterModels.ts';
import { CRAFTING_BUILDERS } from './craftingModels.ts';
import { DEEP_OBJECT_BUILDERS } from './deepObjectModels.ts';
import { FURNITURE_BUILDERS } from './furnitureModels.ts';
import { RUIN_BUILDERS } from './ruinModels.ts';
import { SET_PIECE_BUILDERS } from './setPieceModels.ts';
import { LANDMARK_BUILDERS } from './landmarkModels.ts';
import { HUB_BUILDERS } from './hubModels.ts';
import { INSTALLATION_BUILDERS } from './installationModels.ts';
import { LITTER_BUILDERS } from './litterModels.ts';
import { QUEST_CONSOLE_BUILDERS } from './questConsoleModels.ts';
import { QUEST_FIXTURE_BUILDERS } from './questFixtureModels.ts';
import { TERMINAL_FITTING_BUILDERS } from './terminalFittingModels.ts';
import { TRANSIT_BUILDERS } from './transitModels.ts';

export interface AnimatedPart {
  readonly model: VoxelModel;
  animate(part: Object3D, time: number, seed: number): void;
}

export interface ObjectModelParts {
  readonly base: VoxelModel;
  readonly animated: readonly AnimatedPart[];
  readonly heightVoxels: number;
}

type ObjectBuilder = (seed: number) => ObjectModelParts;

const STEEL = 0x43535e;
const DARK_STEEL = 0x20292f;
const BRASS = 0x8a6b2f;
const HAZARD_YELLOW = 0xc99a1c;
const HAZARD_BLACK = 0x17170f;

const grained = (color: number, amount = 0.03, salt = 0) => (x: number, y: number, z: number) => jitter(color, amount, noise3(x, y, z, salt));

const blink = (rate: number, phase: number) => (part: Object3D, time: number, seed: number) => {
  part.visible = Math.sin(time * rate + phase + seed) > -0.2;
};

const parts = (base: VoxelModel, heightVoxels: number, animated: AnimatedPart[] = []): ObjectModelParts => ({ base, animated, heightVoxels });

const locker: ObjectBuilder = () => {
  const model = new VoxelModel()
    .fill(-5, 0, -4, 4, 27, 3, grained(STEEL))
    .fill(-5, 27, -4, 4, 27, 3, lighten(STEEL, 0.15));
  model.paintExisting(-4, 17, 3, 3, 25, 3, (_x, y) => (y % 2 === 0 ? darken(STEEL, 0.4) : null));
  model.paintExisting(-1, 1, 3, -1, 26, 3, darken(STEEL, 0.3));
  model.fill(1, 11, 4, 2, 13, 4, lighten(STEEL, 0.35));
  model.fill(-4, 22, 4, -2, 23, 4, 0xd8e2e8);
  const led = new VoxelModel().set(3, 20, 4, 0x3fbf7f, VOXEL_EMISSIVE);
  return parts(model, 28, [{ model: led, animate: blink(2, 0) }]);
};

const terminal: ObjectBuilder = () => {
  const model = new VoxelModel()
    .fill(-3, 0, -3, 2, 9, 2, grained(0x2f3c45))
    .fill(-6, 10, -5, 5, 11, 4, grained(0x3a4852))
    .fill(-5, 12, 1, 4, 12, 3, (x, _y, z) => ((x + z) % 2 === 0 ? 0x1a2228 : 0x4a5a64))
    .fill(-6, 13, -4, 5, 23, -3, 0x141c22);
  model.fill(-5, 14, -2, 4, 22, -2, (x, y) => {
    if (y % 3 === 0 && x > -4 && x < 3 - (y % 5)) return 0xc8f6ff;
    return y % 2 === 0 ? 0x2a9fc4 : 0x1f86a8;
  }, VOXEL_EMISSIVE);
  const scan = new VoxelModel().fill(-5, 0, -1, 4, 0, -1, 0x9feeff, VOXEL_EMISSIVE);
  return parts(model, 24, [
    {
      model: scan,
      animate: (part, time) => {
        part.position.y = ((14 + ((time * 6) % 9)) / 16);
      },
    },
  ]);
};

const serverRack: ObjectBuilder = () => {
  const model = new VoxelModel().fill(-5, 0, -5, 4, 31, 4, grained(DARK_STEEL, 0.02));
  model.paintExisting(-5, 0, 4, 4, 31, 4, (_x, y) => (y % 4 === 0 ? darken(DARK_STEEL, 0.5) : null));
  model.fill(-4, 30, -4, 3, 31, 3, lighten(DARK_STEEL, 0.1));
  const green = new VoxelModel();
  const amber = new VoxelModel();
  for (let y = 2; y < 30; y += 4) {
    green.set(-3, y, 5, 0x3fbf7f, VOXEL_EMISSIVE).set(-1, y, 5, 0x3fbf7f, VOXEL_EMISSIVE);
    amber.set(2, y + 1, 5, 0xffb347, VOXEL_EMISSIVE);
  }
  return parts(model, 32, [
    { model: green, animate: blink(5, 0) },
    { model: amber, animate: blink(3.3, 1.7) },
  ]);
};

const lantern: ObjectBuilder = () => {
  const base = new VoxelModel().fill(-2, 0, -2, 1, 1, 1, 0x2c3a44).fill(0, 2, 0, 0, 44, 0, darken(BRASS, 0.3));
  const body = new VoxelModel()
    .fill(-3, 30, -3, 2, 31, 2, BRASS)
    .fill(-1, 32, -1, 0, 33, 0, darken(BRASS, 0.2))
    .fill(-3, 22, -3, 2, 23, 2, BRASS)
    .fill(-4, 21, -4, 3, 21, 3, darken(BRASS, 0.25));
  for (const x of [-3, 2]) for (const z of [-3, 2]) body.fill(x, 24, z, x, 29, z, darken(BRASS, 0.1));
  body.fill(-2, 24, -2, 1, 29, 1, (x, y, z) => (Math.abs(x + 0.5) + Math.abs(z + 0.5) < 1.5 && y > 25 && y < 28 ? 0xfff1c9 : 0xffb347), VOXEL_EMISSIVE);
  return parts(base, 34, [
    {
      model: body,
      animate: (part, time) => {
        part.position.y = Math.sin(time * 1.2) * 0.05;
        part.rotation.y = Math.sin(time * 0.4) * 0.35;
      },
    },
  ]);
};

const crate: ObjectBuilder = (seed) => {
  const body = seed % 2 > 1 ? 0x4a5236 : 0x3d4a52;
  const model = new VoxelModel().fill(-6, 0, -6, 5, 10, 5, (x, y, z) => {
    const corner = (x === -6 || x === 5) && (z === -6 || z === 5);
    if (corner || y === 0 || y === 10) return lighten(body, 0.15);
    return y % 4 === 0 ? darken(body, 0.25) : jitter(body, 0.03, noise3(x, y, z));
  });
  model.paintExisting(-2, 4, 5, 1, 6, 5, (x, y) => ((x + y) % 2 === 0 ? 0xd6a922 : darken(body, 0.1)));
  return parts(model, 11);
};

const lightPillar: ObjectBuilder = () => {
  const model = new VoxelModel()
    .fill(-3, 0, -3, 2, 3, 2, grained(0x2a353d))
    .fill(-3, 36, -3, 2, 37, 2, grained(0x2a353d));
  for (const x of [-2, 1]) for (const z of [-2, 1]) model.fill(x, 4, z, x, 35, z, 0x3a464f);
  model.fill(-1, 4, -1, 0, 35, 0, (_x, y) => (y % 6 === 0 ? 0x8fdcf5 : 0xd8f6ff), VOXEL_EMISSIVE);
  return parts(model, 38);
};

const transitLift: ObjectBuilder = () => {
  const model = new VoxelModel().fill(-8, 0, -8, 7, 1, 7, (x, y, z) => {
    if (z >= 6) return Math.floor((x + z + 32) / 2) % 2 === 0 ? HAZARD_YELLOW : HAZARD_BLACK;
    if (y === 1 && x % 3 === 0 && z % 3 === 0) return 0x5d6b74;
    return jitter(0x232a2f, 0.03, noise3(x, y, z));
  });
  model.fill(-8, 2, -8, 7, 41, -7, grained(0x2a3035));
  model.fill(-8, 42, -8, 7, 44, -6, grained(0x4b5861));
  for (let x = -7; x <= 6; x++) for (let y = 33; y <= 40; y++) if (Math.hypot(y - 36.5, 0) <= 4) model.fill(x, y, -6, x, y, -3, x === -7 || x === 6 ? 0x3a454d : (x + y) % 2 === 0 ? 0x1b2228 : 0x2b3a44);
  for (const x of [-4, 3]) model.fill(x, 2, -4, x, 32, -4, 0x8d969e);
  model.fill(-6, 2, -6, -2, 3, -3, 0x3a454d).fill(-6, 4, -5, -3, 12, -5, 0x2a3036);
  model.fill(-2, 43, -5, 1, 43, -5, 0xffd27f, VOXEL_EMISSIVE);
  const hook = new VoxelModel().fill(-5, 18, -4, 4, 20, -2, HAZARD_YELLOW).fill(-1, 15, -3, 0, 17, -3, 0x8d969e);
  model.set(-5, 9, -4, 0x7cf29a, VOXEL_EMISSIVE).set(-4, 9, -4, 0xffb347, VOXEL_EMISSIVE);
  return parts(model, 45, [
    {
      model: hook,
      animate: (part, time, seed) => {
        part.position.y = ((Math.sin(time * 0.6 + seed) + 1) / 2) * 0.6;
      },
    },
  ]);
};

const bench: ObjectBuilder = () => {
  const model = new VoxelModel()
    .fill(-6, 0, -2, -5, 5, 1, 0x4a555d)
    .fill(4, 0, -2, 5, 5, 1, 0x4a555d)
    .fill(-7, 6, -3, 6, 7, 2, (_x, _y, z) => (z % 2 === 0 ? 0x7d8b94 : 0x5f6c74));
  return parts(model, 8);
};

const ventPanel: ObjectBuilder = () => {
  const model = new VoxelModel().fill(-5, 0, -3, 4, 14, 2, grained(0x34495a));
  model.paintExisting(-4, 3, 2, 3, 12, 2, (_x, y) => (y % 2 === 1 ? 0x10171c : 0x4a5d6a));
  const led = new VoxelModel().set(3, 13, 3, 0x3fbf7f, VOXEL_EMISSIVE).set(-4, 13, 3, 0x7cf29a, VOXEL_EMISSIVE);
  return parts(model, 15, [
    {
      model: led,
      animate: (part, time, seed) => {
        part.visible = Math.sin(time * 23 + seed) > -0.6 || Math.sin(time * 3 + seed) > 0.5;
      },
    },
  ]);
};

const bulkhead: ObjectBuilder = () => {
  const model = new VoxelModel().fill(-8, 0, -3, 7, 33, 2, (x, y, z) => {
    if (z === 2 && y > 3 && y < 30 && x > -7 && x < 6) {
      if (x === -1 || x === 0) return 0x1e1818;
      return Math.floor((x + y + 40) / 3) % 2 === 0 ? HAZARD_YELLOW : 0x2a2222;
    }
    return jitter(0x3c3434, 0.03, noise3(x, y, z));
  });
  const warning = new VoxelModel().fill(-2, 34, -1, 1, 35, 1, 0xff4d4d, VOXEL_EMISSIVE);
  return parts(model, 36, [{ model: warning, animate: blink(5, 0) }]);
};

const kiosk: ObjectBuilder = () => {
  const model = new VoxelModel()
    .fill(-2, 0, -2, 1, 1, 1, 0x2f3c45)
    .fill(-1, 2, -1, 0, 12, 0, 0x3a4852)
    .fill(-4, 13, -2, 3, 22, 1, 0x141c22);
  model.fill(-3, 14, 2, 2, 21, 2, (x, y) => (y % 3 === 0 && x < 1 ? 0xc8fff2 : y % 2 ? 0x2fb89c : 0x259a82), VOXEL_EMISSIVE);
  return parts(model, 23);
};

const planter: ObjectBuilder = (seed) => {
  const model = new VoxelModel()
    .fill(-6, 0, -6, 5, 5, 5, grained(0x4a4f53))
    .fill(-6, 6, -6, 5, 6, 5, (x, _y, z) => (x === -6 || x === 5 || z === -6 || z === 5 ? 0x6a7176 : 0x3b2a1e));
  for (let x = -6; x <= 5; x++) {
    for (let z = -6; z <= 5; z++) {
      for (let y = 7; y <= 17; y++) {
        const distance = Math.hypot(x + 0.5, (y - 10) * 1.2, z + 0.5);
        const density = noise3(x, y, z, seed);
        if (distance < 6.2 && density > 0.4) model.set(x, y, z, density > 0.75 ? 0x4fbf6f : density > 0.55 ? 0x2f8d4c : 0x23663a);
      }
    }
  }
  return parts(model, 18);
};

const warningSign: ObjectBuilder = () => {
  const model = new VoxelModel().fill(0, 0, 0, 0, 14, 0, 0x3a4046);
  for (let row = 0; row < 10; row++) {
    const half = Math.floor((9 - row) / 2);
    model.fill(-half, 15 + row, 1, half, 15 + row, 1, HAZARD_YELLOW);
  }
  model.fill(0, 18, 2, 0, 18, 2, HAZARD_BLACK).fill(0, 20, 2, 0, 22, 2, HAZARD_BLACK);
  return parts(model, 25);
};

const nest: ObjectBuilder = (seed) => {
  const model = new VoxelModel();
  for (let x = -7; x <= 6; x++) {
    for (let z = -7; z <= 6; z++) {
      for (let y = 0; y <= 9; y++) {
        const distance = Math.hypot(x + 0.5, (y + 1) * 1.3, z + 0.5);
        const density = noise3(x, y, z, seed);
        if (distance > 7.5 || density < 0.3) continue;
        const glow = y > 2 && density > 0.82;
        model.set(x, y, z, glow ? (density > 0.9 ? 0x3fe0c0 : 0x7a3cff) : jitter(0x2a1840, 0.06, density), glow ? VOXEL_EMISSIVE : undefined);
      }
    }
  }
  const pulse = new VoxelModel().fill(-1, 4, -1, 0, 6, 0, 0x9f6bff, VOXEL_EMISSIVE);
  return parts(model, 10, [
    {
      model: pulse,
      animate: (part, time, partSeed) => {
        part.scale.setScalar(1 + Math.sin(time * 1.6 + partSeed) * 0.25);
      },
    },
  ]);
};

const junctionBox: ObjectBuilder = () => {
  const model = new VoxelModel().fill(-4, 0, -3, 3, 16, 2, grained(0x3a4046));
  model.fill(-3, 4, 3, 2, 14, 3, 0x22272b);
  model.paintExisting(-4, 15, -3, 3, 16, 2, 0xc99a1c);
  for (let y = 5; y <= 13; y += 2) model.fill(-2, y, 4, 1, y, 4, y % 4 === 1 ? 0x5d6b74 : 0x2f363b);
  model.fill(-1, 17, -1, 0, 22, 0, 0x1b2228);
  const lamp = new VoxelModel().fill(-1, 12, 4, 0, 13, 4, 0xffb347, VOXEL_EMISSIVE);
  return parts(model, 23, [{ model: lamp, animate: blink(1.4, 0) }]);
};

const pipeCluster: ObjectBuilder = () => {
  const model = new VoxelModel();
  const pipe = (x: number, z: number, radius: number, color: number) => {
    for (let y = 0; y <= 40; y++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (Math.hypot(dx, dz) <= radius + 0.3) model.set(x + dx, y, z + dz, y % 10 === 0 ? lighten(color, 0.2) : jitter(color, 0.05, noise3(x + dx, y, z + dz)));
        }
      }
    }
  };
  pipe(-4, -3, 2, 0x5a3a26);
  pipe(3, -2, 3, 0x3a4a52);
  pipe(-2, 4, 1, 0x6b4a2a);
  model.fill(-6, 18, -5, 6, 19, 6, 0x2a2f33);
  return parts(model, 40);
};

const pumpHousing: ObjectBuilder = () => {
  const model = new VoxelModel().fill(-8, 0, -7, 7, 3, 6, grained(0x2a3035));
  for (let x = -7; x <= 6; x++) {
    for (let y = 4; y <= 14; y++) {
      for (let z = -6; z <= 5; z++) {
        if (Math.hypot((y - 9) / 5.5, (z + 0.5) / 6.2) <= 1) model.set(x, y, z, x % 4 === 0 ? 0x5d6b74 : jitter(0x3a5a5a, 0.04, noise3(x, y, z)));
      }
    }
  }
  model.fill(-8, 7, -2, -8, 11, 1, 0x46c8a8, VOXEL_EMISSIVE);
  const rotor = new VoxelModel().fill(7, 6, -1, 8, 12, 0, 0x8d969e).fill(7, 8, -3, 8, 10, 2, 0x8d969e);
  return parts(model, 16, [
    {
      model: rotor,
      animate: (part, time) => {
        part.rotation.x = time * 0.6;
      },
    },
  ]);
};

const heater: ObjectBuilder = () => {
  const model = new VoxelModel().fill(-6, 0, -3, 5, 2, 2, 0x3a3f45);
  for (const x of [-5, -1, 3]) {
    model.fill(x, 3, -2, x + 2, 12, 1, grained(0x4a4f53));
    model.fill(x, 4, 2, x + 2, 11, 2, (_x, y) => (y % 2 === 0 ? 0xff7a2a : 0xffb347), VOXEL_EMISSIVE);
  }
  model.fill(-6, 13, -3, 5, 13, 2, 0x2a2f33);
  return parts(model, 14);
};

const knockDoor: ObjectBuilder = () => {
  const model = new VoxelModel();
  model.fill(-6, 0, -1, 5, 35, 0, (x, y) => {
    const edge = x === -6 || x === 5 || y === 35;
    if (edge) return 0x2a1f36;
    if (y % 9 === 0 || x === -3 || x === 2) return 0x3c2b4f;
    return jitter(0x4a3560, 0.03, noise3(x, y, 0, 5));
  });
  model.fill(3, 16, 1, 4, 18, 1, 0xc9a227);
  model.fill(-8, 37, -3, 7, 39, 2, (x, y, z) => (y === 37 ? 0x2a1f36 : jitter(0x3c2b4f, 0.04, noise3(x, y, z, 6))));
  for (const x of [-8, 7]) model.fill(x, 0, -3, x, 36, 2, (_x, y, z) => (y % 6 === 0 ? 0x2a1f36 : jitter(0x3c2b4f, 0.04, noise3(x, y, z, 7))));
  const outline = new VoxelModel();
  for (let y = 0; y <= 36; y++) outline.set(-7, y, 0, 0xb57cff, VOXEL_EMISSIVE).set(6, y, 0, 0xb57cff, VOXEL_EMISSIVE);
  for (let x = -7; x <= 6; x++) outline.set(x, 36, 0, 0xb57cff, VOXEL_EMISSIVE);
  return parts(model, 37, [
    {
      model: outline,
      animate: (part, time) => {
        const knock = Math.max(0, Math.sin(time * 1.1)) ** 12;
        part.scale.set(1 + knock * 0.04, 1 + knock * 0.02, 1);
        part.visible = Math.sin(time * 9) > -0.9;
      },
    },
  ]);
};

const BUILDERS: Readonly<Record<WorldObjectModel, ObjectBuilder>> = {
  ...CRAFTING_BUILDERS,
  ...CALDER_OBJECT_BUILDERS,
  ...VESPER_OBJECT_BUILDERS,
  ...HUB_BUILDERS,
  ...TRANSIT_BUILDERS,
  ...QUEST_CONSOLE_BUILDERS,
  ...QUEST_FIXTURE_BUILDERS,
  ...TERMINAL_FITTING_BUILDERS,
  ...INSTALLATION_BUILDERS,
  ...DEEP_OBJECT_BUILDERS,
  ...ASSEMBLY_BUILDERS,
  ...LITTER_BUILDERS,
  ...FURNITURE_BUILDERS,
  ...RUIN_BUILDERS,
  ...SET_PIECE_BUILDERS,
  ...LANDMARK_BUILDERS,
  ...CLUTTER_BUILDERS,
  junctionBox,
  pipeCluster,
  pumpHousing,
  heater,
  knockDoor,
  nest,
  locker,
  terminal,
  serverRack,
  lantern,
  crate,
  lightPillar,
  transitLift,
  bench,
  ventPanel,
  bulkhead,
  kiosk,
  planter,
  warningSign,
};

export const buildObjectModel = (model: WorldObjectModel, seed: number): ObjectModelParts => BUILDERS[model](seed);
