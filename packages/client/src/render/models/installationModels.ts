import type { WorldObjectModel } from '@containment/shared';
import type { Object3D } from 'three';
import { darken, jitter, lighten, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS, type VoxelKind } from '../voxel/voxelKinds.ts';
import { VoxelModel, type Paint } from '../voxel/voxelModel.ts';
import type { AnimatedPart, ObjectModelParts } from './objectModels.ts';

type InstallationModel = Extract<
  WorldObjectModel,
  | 'stationApron'
  | 'refineryHopper'
  | 'refineryPress'
  | 'fabricatorFeeder'
  | 'fabricatorBench'
  | 'synthReagents'
  | 'synthColdStore'
  | 'liftPylon'
  | 'liftDeck'
  | 'liftDeckLeft'
  | 'liftDeckRight'
  | 'wallLiftFrameLeft'
  | 'wallLiftFrameRight'
  | 'riftShardsLeft'
  | 'riftShardsRight'
  | 'riftApron'
  | 'knockFrameLeft'
  | 'knockFrameRight'
  | 'bulkheadLeafLeft'
  | 'bulkheadLeafRight'
>;

const HOUSING = 0x4a4f53;
const PLINTH = 0x2a3035;
const STEEL = 0x5d6b74;
const DARK = 0x1b2228;
const HAZARD_YELLOW = 0xc99a1c;
const HAZARD_BLACK = 0x17170f;
const AMBER = 0xffb347;
const CYAN = 0x4fd8ff;
const MINT = 0x7cf29a;
const RIFT = 0x9b5cff;
const RIFT_LIGHT = 0xd7a8ff;
const DOOR = 0x3c3434;

interface Canvas {
  fill(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, paint: Paint, kind?: VoxelKind): Canvas;
  set(x: number, y: number, z: number, color: number, kind?: VoxelKind): Canvas;
}

function canvasOf(model: VoxelModel, mirrored = false): Canvas {
  const mx = (x: number) => (mirrored ? -1 - x : x);
  const canvas: Canvas = {
    fill: (x0, y0, z0, x1, y1, z1, paint, kind) => {
      model.fill(mx(x0), y0, z0, mx(x1), y1, z1, typeof paint === 'number' ? paint : (x, y, z) => paint(mx(x), y, z), kind);
      return canvas;
    },
    set: (x, y, z, color, kind) => {
      model.set(mx(x), y, z, color, kind);
      return canvas;
    },
  };
  return canvas;
}

const grained = (color: number, amount = 0.03, salt = 0) => (x: number, y: number, z: number) => jitter(color, amount, noise3(x, y, z, salt));
const hazard = (x: number, z: number) => (Math.floor((x + z + 32) / 2) % 2 === 0 ? HAZARD_YELLOW : HAZARD_BLACK);
const parts = (base: VoxelModel, heightVoxels: number, animated: AnimatedPart[] = []): ObjectModelParts => ({ base, animated, heightVoxels });
const pulse = (rate: number, low: number) => (part: Object3D, time: number, seed: number) => part.scale.setScalar(low + (1 - low) * (0.5 + 0.5 * Math.sin(time * rate + seed)));
const blink = (rate: number) => (part: Object3D, time: number, seed: number) => (part.visible = Math.sin(time * rate + seed) > -0.6);

const plinth = (canvas: Canvas, salt: number) => canvas.fill(-8, 0, -6, 7, 3, 5, grained(PLINTH, 0.03, salt));

const stationApron = (): ObjectModelParts => {
  const model = new VoxelModel().fill(-8, 0, -8, 7, 0, 7, (x, _y, z) => {
    if (z >= 5) return hazard(x, z);
    if (x % 4 === 0 || z % 4 === 0) return 0x3a454d;
    return jitter(0x2b3a44, 0.03, noise3(x, 0, z, 41));
  });
  return parts(model, 1);
};

const refineryHopper = (): ObjectModelParts => {
  const model = new VoxelModel();
  const canvas = plinth(canvasOf(model), 11);
  for (const [x, z] of [[-6, -5], [3, -5], [-6, 2], [3, 2]] as const) canvas.fill(x, 4, z, x + 1, 13, z + 1, STEEL);
  for (let y = 14; y <= 27; y++) {
    const half = 2 + Math.round((y - 14) * 0.45);
    canvas.fill(-1 - half, y, -1 - half, -1 + half, y, -1 + half, (x, yy, z) => {
      const rim = Math.abs(x + 1) === half || Math.abs(z + 1) === half;
      if (!rim) return yy >= 23 && yy <= 24 + Math.round(noise3(x, 0, z, 12) * 2) ? jitter(0x6a5a4a, 0.15, noise3(x, yy, z, 12)) : null;
      return yy === 27 ? HAZARD_YELLOW : jitter(HOUSING, 0.03, noise3(x, yy, z, 13));
    });
  }
  canvas.fill(-2, 10, -2, 0, 13, 0, DARK);
  canvas.fill(-1, 9, -1, 7, 10, 1, (x) => (x % 3 === 0 ? 0x2a2f33 : 0x8d969e));
  canvas.fill(-1, 11, -1, 7, 11, 1, (x) => (x % 2 === 0 ? 0x7a6a5a : 0x5a4a3a));
  const glow = new VoxelModel();
  canvasOf(glow).fill(-7, 6, 6, -6, 7, 6, AMBER, VOXEL_EMISSIVE);
  return parts(model, 28, [{ model: glow, animate: blink(2.3) }]);
};

const refineryPress = (): ObjectModelParts => {
  const model = new VoxelModel();
  const canvas = plinth(canvasOf(model), 14);
  for (const x of [-6, 4]) canvas.fill(x, 4, -4, x + 1, 27, -2, grained(HOUSING, 0.03, 15));
  canvas.fill(-6, 28, -4, 5, 30, -2, grained(darken(HOUSING, 0.2), 0.03, 16));
  canvas.fill(-4, 4, -5, 3, 7, 0, grained(0x3a3f45, 0.03, 17));
  canvas.fill(-3, 8, -4, 2, 8, -1, 0xd8d2c0);
  for (let z = 1; z <= 5; z++) canvas.fill(-6, 9, z, 5, 11, z, (x) => (z === 1 || z === 5 ? 0x5a4a3a : x % 2 === 0 ? 0xa08a62 : 0x8a7350));
  canvas.fill(-7, 10, 3, -7, 10, 3, STEEL).fill(6, 10, 3, 6, 10, 3, STEEL);
  const ram = new VoxelModel();
  canvasOf(ram).fill(-3, 20, -4, 2, 23, -1, 0x8d969e).fill(-1, 24, -3, 0, 27, -2, 0xb8c2ca);
  return parts(model, 31, [{ model: ram, animate: (part, time, seed) => (part.position.y = -(Math.max(0, Math.sin(time * 1.6 + seed)) ** 6) * 0.7) }]);
};

const fabricatorFeeder = (): ObjectModelParts => {
  const model = new VoxelModel();
  const canvas = canvasOf(model).fill(-8, 0, -6, 7, 6, 5, grained(0x3a4852, 0.03, 21)).fill(-8, 7, -6, 7, 7, 5, STEEL);
  canvas.fill(-7, 8, -6, -6, 27, -5, 0x2f3c45).fill(-7, 27, -6, 7, 28, -4, 0x2f3c45);
  for (const y of [11, 16, 21]) {
    canvas.fill(-5, y, -6, 6, y, -1, STEEL);
    for (let bin = 0; bin < 4; bin++) {
      const x0 = -5 + bin * 3;
      canvas.fill(x0, y + 1, -5, x0 + 1, y + 3, -2, [0x2f5a8a, 0xb84a3a, HAZARD_YELLOW, 0x3a6a3a][(bin + y) % 4] as number);
    }
  }
  const labels = new VoxelModel();
  for (const y of [11, 16, 21]) canvasOf(labels).fill(-5, y, 0, 6, y, 0, (x) => (x % 3 === 0 ? CYAN : 0x1f86a8), VOXEL_EMISSIVE);
  return parts(model, 29, [{ model: labels, animate: blink(1.1) }]);
};

const fabricatorBench = (): ObjectModelParts => {
  const model = new VoxelModel();
  const canvas = canvasOf(model).fill(-8, 0, -6, 7, 6, 5, grained(0x3a4852, 0.03, 23)).fill(-8, 7, -6, 7, 7, 5, STEEL);
  canvas.fill(-8, 8, -6, 7, 9, 3, 0x2f3c45);
  canvas.fill(-3, 10, -3, 1, 13, 1, 0x5d6b74).fill(-2, 14, -2, 0, 15, 0, 0x8d969e).set(-1, 13, 2, CYAN, VOXEL_EMISSIVE);
  canvas.fill(4, 10, -5, 5, 24, -4, 0x2f3c45).fill(-1, 24, -5, 5, 25, -4, 0x2f3c45).fill(-1, 22, -4, 0, 23, -2, 0xc99a1c);
  canvas.fill(6, 8, -6, 7, 27, -5, 0x2f3c45).fill(-8, 27, -6, 7, 28, -4, 0x2f3c45);
  const scan = new VoxelModel();
  canvasOf(scan).fill(-4, 16, -4, 2, 16, 2, lighten(CYAN, 0.3), VOXEL_EMISSIVE);
  return parts(model, 29, [{ model: scan, animate: (part, time, seed) => (part.position.y = -((time * 0.8 + seed) % 1) * 0.35) }]);
};

const synthReagents = (): ObjectModelParts => {
  const model = new VoxelModel();
  const canvas = canvasOf(model).fill(-8, 0, -5, 7, 8, 4, grained(0xd8e2e8, 0.02, 25)).fill(-8, 9, -5, 7, 9, 4, 0x7a8a94);
  const fluid = new VoxelModel();
  [-6, -1, 4].forEach((x0, index) => {
    for (let y = 10; y <= 24; y++) for (let dx = 0; dx <= 2; dx++) for (let z = -3; z <= -1; z++) if (dx !== 1 || z !== -2) canvas.set(x0 + dx, y, z, lighten(MINT, 0.4), VOXEL_GLASS);
    canvas.fill(x0, 25, -3, x0 + 2, 26, -1, 0x7a8a94);
    canvasOf(fluid).fill(x0 + 1, 10, -2, x0 + 1, 16 + index * 3, -2, [MINT, 0xb0f0ff, 0xf2c86a][index] as number, VOXEL_EMISSIVE);
  });
  canvas.fill(-5, 27, -2, 7, 27, -2, 0x8d969e);
  canvas.fill(-6, 3, 5, 3, 6, 5, 0x17222a).fill(-5, 4, 6, -2, 5, 6, MINT, VOXEL_EMISSIVE);
  return parts(model, 28, [{ model: fluid, animate: (part, time, seed) => (part.scale.y = 0.9 + 0.1 * Math.sin(time * 1.3 + seed)) }]);
};

const synthColdStore = (): ObjectModelParts => {
  const model = new VoxelModel();
  const canvas = canvasOf(model).fill(-7, 0, -6, 6, 27, 4, grained(0xe6ecef, 0.02, 27)).fill(-7, 28, -6, 6, 28, 4, 0x7a8a94);
  canvas.fill(-6, 3, 5, 5, 25, 5, (x, y) => (x === -6 || x === 5 || y === 3 || y === 25 ? 0x9aa4aa : lighten(0xbfe6ff, 0.2)), VOXEL_GLASS);
  for (const y of [9, 15, 21]) {
    canvas.fill(-5, y, -4, 4, y, 3, 0xb8c2ca);
    for (let vial = 0; vial < 5; vial++) canvas.fill(-4 + vial * 2, y + 1, 0, -4 + vial * 2, y + 3, 0, [MINT, 0xf2b8c6, 0xb0f0ff][(vial + y) % 3] as number);
  }
  canvas.fill(4, 15, 6, 4, 18, 6, 0x8d969e);
  const lamp = new VoxelModel();
  canvasOf(lamp).fill(-5, 26, 5, -4, 26, 5, MINT, VOXEL_EMISSIVE);
  return parts(model, 29, [{ model: lamp, animate: blink(0.9) }]);
};

const liftPylon = (): ObjectModelParts => {
  const model = new VoxelModel();
  const canvas = canvasOf(model).fill(-8, 0, -8, 7, 1, -4, grained(0x232a2f));
  canvas.fill(-3, 2, -8, 2, 41, -5, (x, y, z) => (z === -5 && (y + x + 40) % 6 < 3 ? HAZARD_YELLOW : jitter(0x3a454d, 0.03, noise3(x, y, z))));
  canvas.fill(-8, 42, -8, 7, 44, -6, grained(0x4b5861));
  canvas.fill(-5, 2, -8, -4, 6, -5, STEEL).fill(3, 2, -8, 4, 6, -5, STEEL);
  const lamps = new VoxelModel();
  for (let y = 8; y <= 36; y += 4) canvasOf(lamps).set(-1, y, -4, AMBER, VOXEL_EMISSIVE).set(0, y, -4, AMBER, VOXEL_EMISSIVE);
  return parts(model, 45, [{ model: lamps, animate: blink(1.4) }]);
};

const deck = (mirrored: boolean, edge: boolean): ObjectModelParts => {
  const model = new VoxelModel();
  const canvas = canvasOf(model, mirrored).fill(-8, 0, -8, 7, 1, 7, (x, y, z) => {
    if (z >= 6 || (edge && x <= -7)) return hazard(x, z);
    if (y === 1 && x % 3 === 0 && z % 3 === 0) return STEEL;
    return jitter(0x232a2f, 0.03, noise3(x, y, z));
  });
  if (edge) {
    for (const z of [-7, -1, 5]) canvas.fill(-8, 2, z, -8, 12, z, HAZARD_YELLOW);
    canvas.fill(-8, 12, -7, -8, 12, 5, HAZARD_YELLOW).fill(-8, 7, -7, -8, 7, 5, darken(HAZARD_YELLOW, 0.3));
  }
  const guide = new VoxelModel();
  canvasOf(guide, mirrored).fill(-8, 0, 5, 7, 0, 5, AMBER, VOXEL_EMISSIVE);
  return parts(model, edge ? 13 : 2, [
    { model: guide, animate: (part, time, seed) => (part.position.y = ((Math.sin(time * 1.4 + seed) + 1) / 2) * 0.12 + 0.01) },
  ]);
};

const wallLiftFrame = (mirrored: boolean): ObjectModelParts => {
  const model = new VoxelModel();
  const canvas = canvasOf(model, mirrored).fill(-8, 0, -8, 7, 25, -7, grained(0x1b2228, 0.04, 31));
  canvas.fill(-8, 0, -6, -4, 25, -3, grained(0x46525a, 0.03, 32));
  canvas.fill(-8, 26, -6, 7, 31, 7, (x, y, z) => (z === 7 && y === 28 ? 0xc99a1c : jitter(darken(0x46525a, 0.15), 0.03, noise3(x, y, z, 33))));
  canvas.fill(2, 10, -6, 5, 17, -6, DARK).fill(3, 15, -5, 4, 15, -5, 0x8d969e);
  const panel = new VoxelModel();
  canvasOf(panel, mirrored).set(3, 14, -5, CYAN, VOXEL_EMISSIVE).set(4, 12, -5, AMBER, VOXEL_EMISSIVE).fill(-4, 1, -2, -4, 24, -2, CYAN, VOXEL_EMISSIVE);
  return parts(model, 32, [{ model: panel, animate: (part, time, seed) => (part.visible = Math.sin(time * 0.8 + seed) > -0.97) }]);
};

const riftShards = (mirrored: boolean): ObjectModelParts => {
  const model = new VoxelModel();
  canvasOf(model, mirrored).fill(-8, 0, -3, 7, 0, 2, (x, _y, z) => (noise3(x, 0, z, 51) > 0.65 ? 0x3c2b4f : 0x1b1424));
  const cracks = new VoxelModel();
  for (let x = -6; x <= 7; x++) canvasOf(cracks, mirrored).set(x, 1, Math.round(Math.sin(x * 0.7) * 2), x % 3 === 0 ? MINT : RIFT, VOXEL_EMISSIVE);
  const shards = new VoxelModel();
  [[-4, 6, -1, 5], [1, 12, 1, 6], [4, 20, -2, 4], [-2, 26, 0, 3]].forEach(([x, y, z, length], index) => {
    canvasOf(shards, mirrored).fill(x as number, y as number, z as number, x as number, (y as number) + (length as number), z as number, index % 2 === 0 ? RIFT_LIGHT : MINT, VOXEL_EMISSIVE);
  });
  return parts(model, 31, [
    { model: cracks, animate: pulse(2.2, 0.85) },
    {
      model: shards,
      animate: (part, time, seed) => {
        part.position.y = Math.sin(time * 1.2 + seed) * 0.06;
        part.rotation.y = Math.sin(time * 0.5 + seed) * 0.3;
      },
    },
  ]);
};

const riftApron = (): ObjectModelParts => {
  const model = new VoxelModel().fill(-8, 0, -8, 7, 0, 7, (x, _y, z) => (noise3(x, 0, z, 53) > 0.7 ? 0x3c2b4f : 0x231a30));
  const cracks = new VoxelModel();
  for (let z = -8; z <= 7; z++) {
    const x = Math.round(Math.sin(z * 0.6) * 3);
    if (noise3(x, 1, z, 54) > 0.3) cracks.set(x, 1, z, z % 4 === 0 ? MINT : RIFT, VOXEL_EMISSIVE);
  }
  return parts(model, 1, [{ model: cracks, animate: (part, time, seed) => (part.visible = Math.sin(time * 2.2 + seed) > -0.5) }]);
};

const knockFrame = (mirrored: boolean): ObjectModelParts => {
  const model = new VoxelModel();
  const stone = (salt: number) => (x: number, y: number, z: number) => (y % 6 === 0 ? 0x2a1f36 : jitter(0x3c2b4f, 0.04, noise3(x, y, z, salt)));
  const canvas = canvasOf(model, mirrored).fill(2, 0, -3, 7, 39, 2, stone(61));
  canvas.fill(-3, 0, -3, 1, 26, 2, stone(62)).fill(-3, 27, -3, 1, 27, 2, 0x2a1f36);
  canvas.fill(-7, 0, -3, -4, 13, 2, stone(63)).fill(-7, 14, -3, -4, 14, 2, 0x2a1f36);
  for (const y of [8, 20, 32]) canvas.fill(4, y, 3, 5, y + 1, 3, 0xc9a227);
  const glow = new VoxelModel();
  for (let y = 1; y <= 38; y += 3) canvasOf(glow, mirrored).set(3, y, 3, 0xb57cff, VOXEL_EMISSIVE);
  return parts(model, 40, [
    {
      model: glow,
      animate: (part, time) => {
        const knock = Math.max(0, Math.sin(time * 1.1)) ** 12;
        part.scale.set(1 + knock * 0.04, 1 + knock * 0.02, 1);
        part.visible = Math.sin(time * 9) > -0.9;
      },
    },
  ]);
};

const bulkheadLeaf = (mirrored: boolean): ObjectModelParts => {
  const model = new VoxelModel();
  canvasOf(model, mirrored).fill(-8, 0, -3, 7, 33, 2, (x, y, z) => {
    if (x <= -7 || y >= 31 || y <= 1) return jitter(0x2a2222, 0.03, noise3(x, y, z));
    if (x === 7) return 0x1e1818;
    if ((z === 2 || z === -3) && y > 3 && y < 29 && x > -6) return Math.floor((y - x + 40) / 3) % 2 === 0 ? HAZARD_YELLOW : 0x2a2222;
    return jitter(DOOR, 0.03, noise3(x, y, z));
  });
  const warning = new VoxelModel();
  canvasOf(warning, mirrored).fill(5, 34, -1, 7, 35, 1, 0xff4d4d, VOXEL_EMISSIVE);
  return parts(model, 36, [{ model: warning, animate: (part, time, seed) => (part.visible = Math.sin(time * 5 + seed) > -0.2) }]);
};

export const INSTALLATION_BUILDERS: Readonly<Record<InstallationModel, (seed: number) => ObjectModelParts>> = {
  stationApron,
  refineryHopper,
  refineryPress,
  fabricatorFeeder,
  fabricatorBench,
  synthReagents,
  synthColdStore,
  liftPylon,
  liftDeck: () => deck(false, false),
  liftDeckLeft: () => deck(false, true),
  liftDeckRight: () => deck(true, true),
  wallLiftFrameLeft: () => wallLiftFrame(false),
  wallLiftFrameRight: () => wallLiftFrame(true),
  riftShardsLeft: () => riftShards(false),
  riftShardsRight: () => riftShards(true),
  riftApron,
  knockFrameLeft: () => knockFrame(false),
  knockFrameRight: () => knockFrame(true),
  bulkheadLeafLeft: () => bulkheadLeaf(false),
  bulkheadLeafRight: () => bulkheadLeaf(true),
};
