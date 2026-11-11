import type { WorldObjectModel } from '@containment/shared';
import { darken, jitter, lighten, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS, type VoxelKind } from '../voxel/voxelKinds.ts';
import { VoxelModel, type Paint } from '../voxel/voxelModel.ts';
import type { AnimatedPart, ObjectModelParts } from './objectModels.ts';

type ClutterModel = Extract<
  WorldObjectModel,
  | 'barrel'
  | 'palletStack'
  | 'gasCylinders'
  | 'toolCart'
  | 'workbench'
  | 'canteenTable'
  | 'stool'
  | 'bunkBed'
  | 'vendingMachine'
  | 'trashBin'
  | 'cargoContainer'
  | 'generator'
  | 'trafficCone'
  | 'sandbags'
  | 'pottedFern'
  | 'specimenTank'
  | 'gurney'
  | 'sackPile'
  | 'mopBucket'
  | 'officeChair'
  | 'monitorBank'
  | 'cableSpool'
  | 'floorLamp'
  | 'crateStack'
  | 'bookTrolley'
  | 'mineCart'
  | 'pew'
  | 'candleStand'
  | 'wheelchair'
  | 'screenPartition'
  | 'mailSacks'
  | 'sortingCase'
  | 'worksBarrier'
  | 'surveyStake'
  | 'shutteredKiosk'
  | 'reservedPlot'
>;

const parts = (base: VoxelModel, heightVoxels: number, animated: AnimatedPart[] = []): ObjectModelParts => ({ base, animated, heightVoxels });

const grain = (color: number, amount = 0.04, salt = 0) => (x: number, y: number, z: number): number => jitter(color, amount, noise3(x, y, z, salt));

const pick = <T>(options: readonly T[], seed: number, index = 0): T => options[Math.floor(noise3(index, 7, 3, seed) * options.length) % options.length] as T;

const cylinder = (model: VoxelModel, cx: number, cz: number, radius: number, y0: number, y1: number, paint: Paint, kind?: VoxelKind): VoxelModel => {
  const reach = Math.ceil(radius);
  for (let x = cx - reach; x <= cx + reach; x++) {
    for (let z = cz - reach; z <= cz + reach; z++) {
      if (Math.hypot(x - cx, z - cz) > radius) continue;
      model.fill(x, y0, z, x, y1, z, paint, kind);
    }
  }
  return model;
};

const STEEL = 0x5d6b74;
const DARK = 0x2a3036;
const HAZARD = 0xc99a1c;
const WOOD = 0x7a5a3a;
const CANVAS = 0xa08a62;
const WHITE = 0xd8dde0;
const DRUM_TONES = [0x2f5a8a, 0x8a2f2f, 0x3a6a3a, 0xc99a1c, 0x5d6b74];
const BOX_TONES = [0x8a7350, 0x6f5c3e, 0xa08a62, 0x5a6a3a];
const FABRIC = [0x3a5a8a, 0x8a3a3a, 0x4a6a4a, 0x6a5a8a];

const barrel = (seed: number): ObjectModelParts => {
  const tone = pick(DRUM_TONES, seed);
  const model = cylinder(new VoxelModel(), 0, 0, 5.2, 0, 15, (x, y, z) => (y === 3 || y === 12 ? darken(tone, 0.35) : y === 15 ? lighten(tone, 0.15) : jitter(tone, 0.05, noise3(x, y, z, seed))));
  model.fill(1, 16, 1, 2, 16, 2, DARK);
  if (noise3(1, 1, 1, seed) > 0.5) model.fill(-2, 6, 5, 1, 9, 5, (x, y) => ((x + y) % 2 === 0 ? HAZARD : 0x17170f));
  return parts(model, 17);
};

const palletStack = (seed: number): ObjectModelParts => {
  const model = new VoxelModel().fill(-7, 0, -7, 6, 2, 6, (x, y, z) => (y === 1 && (x + 8) % 5 !== 0 ? null : grain(WOOD, 0.08, seed)(x, y, z)));
  model.fill(-6, 3, -6, -1, 9, -1, grain(pick(BOX_TONES, seed, 1), 0.05, seed)).fill(0, 3, -6, 5, 8, -1, grain(pick(BOX_TONES, seed, 2), 0.05, seed));
  model.fill(-6, 3, 0, -1, 7, 5, grain(pick(BOX_TONES, seed, 3), 0.05, seed)).fill(0, 3, 0, 5, 10, 5, grain(pick(BOX_TONES, seed, 4), 0.05, seed));
  model.fill(-4, 10, -4, 1, 14, 1, grain(pick(BOX_TONES, seed, 5), 0.05, seed));
  for (let y = 4; y <= 13; y += 3) model.paintExisting(-7, y, -7, 6, y, 6, (x, _y, z) => (Math.abs(x) + Math.abs(z) > 4 ? 0xc4d2da : null), VOXEL_GLASS);
  return parts(model, 15);
};

const gasCylinders = (seed: number): ObjectModelParts => {
  const model = new VoxelModel().fill(-7, 0, -4, 6, 1, 3, DARK).fill(-7, 2, -4, -7, 16, -4, STEEL).fill(6, 2, -4, 6, 16, -4, STEEL).fill(-7, 14, -4, 6, 14, -4, 0x8a9298);
  [-4, 0, 4].forEach((cx, index) => {
    const tone = pick([0x3a8a5a, 0x8a3a3a, 0x3a5a8a, 0xb8c2ca], seed, index);
    cylinder(model, cx, 0, 1.9, 2, 20 - index, tone).fill(cx, 21 - index, 0, cx, 22 - index, 0, 0xb8c2ca);
  });
  return parts(model, 23);
};

const toolCart = (seed: number): ObjectModelParts => {
  const tone = pick([0xb84a3a, 0x2f5a8a, 0x3a3f44], seed);
  const model = new VoxelModel().fill(-6, 2, -4, 5, 12, 3, (x, y, z) => (y === 12 ? lighten(tone, 0.2) : y % 3 === 0 ? darken(tone, 0.35) : jitter(tone, 0.03, noise3(x, y, z, seed))));
  for (const x of [-5, 4]) for (const z of [-3, 2]) model.fill(x, 0, z, x, 1, z, DARK);
  model.fill(-6, 13, -4, -6, 18, -4, STEEL).fill(-6, 18, -4, -6, 18, 3, STEEL);
  for (let tool = 0; tool < 4; tool++) model.fill(-4 + tool * 2, 13, -2, -4 + tool * 2, 13, 1 + (tool % 2), pick([0x8a9298, HAZARD, 0xb84a3a], seed, tool + 3));
  return parts(model, 19);
};

const workbench = (seed: number): ObjectModelParts => {
  const model = new VoxelModel().fill(-7, 11, -7, 6, 12, 2, (x, y, z) => (y === 12 ? jitter(0x8a6a44, 0.08, noise3(x, y, z, seed)) : darken(WOOD, 0.2)));
  for (const x of [-7, 6]) for (const z of [-7, 2]) model.fill(x, 0, z, x, 10, z, STEEL);
  model.fill(-7, 3, -7, 6, 3, 2, darken(STEEL, 0.2));
  model.fill(3, 13, -5, 5, 16, -3, DARK).fill(2, 15, -4, 2, 15, -4, 0x8a9298);
  model.fill(-5, 13, -6, -1, 13, -2, 0x2f8d4c).set(-3, 14, -4, 0xd84a3a, VOXEL_EMISSIVE);
  model.fill(-6, 4, -6, 5, 6, 1, grain(pick(BOX_TONES, seed), 0.05, seed));
  return parts(model, 17);
};

const canteenTable = (seed: number): ObjectModelParts => {
  const top = pick([0x9aa4aa, 0xc4b8a0, 0x7a8a94], seed);
  const model = new VoxelModel().fill(-8, 10, -6, 7, 11, 5, (x, y, z) => (y === 11 ? jitter(top, 0.03, noise3(x, y, z, seed)) : darken(top, 0.3)));
  model.fill(-1, 0, -1, 0, 9, 0, STEEL).fill(-4, 0, -4, 3, 0, 3, DARK);
  model.fill(-5, 12, -3, -3, 12, -1, WHITE).fill(-4, 13, -2, -4, 13, -2, 0x8a6a2a);
  if (noise3(2, 2, 2, seed) > 0.4) model.fill(3, 12, 1, 4, 14, 2, pick([0xd84a3a, 0x3a8ad8, WHITE], seed, 2));
  return parts(model, 15);
};

const stool = (seed: number): ObjectModelParts => {
  const tone = pick([0x3a8ad8, 0xd84a3a, 0x5d6b74, 0xc99a1c], seed);
  const model = cylinder(new VoxelModel(), 0, 0, 3, 7, 8, tone).fill(-2, 0, -2, -2, 6, -2, STEEL).fill(1, 0, 1, 1, 6, 1, STEEL).fill(-2, 0, 1, -2, 6, 1, STEEL).fill(1, 0, -2, 1, 6, -2, STEEL);
  return parts(model, 9);
};

const bunkBed = (seed: number): ObjectModelParts => {
  const sheet = pick(FABRIC, seed);
  const model = new VoxelModel();
  for (const x of [-7, 6]) for (const z of [-7, 6]) model.fill(x, 0, z, x, 28, z, STEEL);
  for (const y of [5, 18]) {
    model.fill(-7, y, -7, 6, y, 6, DARK).fill(-6, y + 1, -6, 5, y + 2, 5, grain(0xd8d2c0, 0.04, seed + y));
    model.fill(-6, y + 3, -2, 5, y + 3, 5, grain(sheet, 0.05, seed + y)).fill(-5, y + 3, -6, -1, y + 4, -4, WHITE);
  }
  model.fill(6, 8, 0, 6, 17, 0, 0x8a9298).fill(6, 10, -3, 6, 10, 3, 0x8a9298).fill(6, 14, -3, 6, 14, 3, 0x8a9298);
  return parts(model, 29);
};

const vendingMachine = (seed: number): ObjectModelParts => {
  const tone = pick([0xb84a3a, 0x2f5a8a, 0x2f7a4a], seed);
  const model = new VoxelModel().fill(-6, 0, -6, 5, 30, 1, (x, y, z) => (y === 30 ? lighten(tone, 0.2) : jitter(tone, 0.03, noise3(x, y, z, seed))));
  model.fill(-5, 8, 2, 1, 27, 2, (x, y) => (y % 5 === 0 ? 0x8a9298 : pick([0xd84a3a, HAZARD, 0x3fbf7f, 0x3a8ad8, WHITE], seed, x * 7 + y)), VOXEL_GLASS);
  model.fill(3, 16, 2, 4, 24, 2, DARK).fill(-5, 3, 2, 1, 5, 2, DARK);
  const glow = new VoxelModel().fill(-5, 28, 2, 4, 29, 2, lighten(tone, 0.5), VOXEL_EMISSIVE).set(3, 20, 3, 0x7cf29a, VOXEL_EMISSIVE);
  return parts(model, 31, [{ model: glow, animate: (part, time, salt) => (part.visible = Math.sin(time * 0.7 + salt) > -0.85) }]);
};

const trashBin = (seed: number): ObjectModelParts => {
  const tone = pick([0x3a5a3a, 0x3a3f44, 0x2f5a8a], seed);
  const model = cylinder(new VoxelModel(), 0, 0, 3.6, 0, 11, (x, y, z) => (y === 11 ? lighten(tone, 0.2) : jitter(tone, 0.04, noise3(x, y, z, seed))));
  for (let item = 0; item < 5; item++) model.set(Math.round(noise3(item, 1, 0, seed) * 4 - 2), 12 + (item % 2), Math.round(noise3(item, 2, 0, seed) * 4 - 2), pick([0xd8d2c0, 0xb84a3a, 0x8a9298], seed, item));
  return parts(model, 14);
};

const cargoContainer = (seed: number): ObjectModelParts => {
  const tone = pick([0xb85a2a, 0x2f5a8a, 0x3a6a3a, 0x8a2f2f], seed);
  const model = new VoxelModel().fill(-8, 0, -7, 7, 22, 6, (x, y, z) => {
    const edge = (x === -8 || x === 7) && (z === -7 || z === 6);
    if (edge || y === 0 || y === 22) return darken(tone, 0.35);
    return (x + 8) % 3 === 0 || (z + 7) % 3 === 0 ? darken(tone, 0.15) : jitter(tone, 0.04, noise3(x, y, z, seed));
  });
  model.fill(-3, 8, 6, 2, 12, 6, (x, y) => ((x + y) % 3 === 0 ? 0xe6dfc8 : darken(tone, 0.1)));
  return parts(model, 23);
};

const generator = (seed: number): ObjectModelParts => {
  const model = new VoxelModel().fill(-7, 0, -5, 6, 1, 4, DARK).fill(-6, 2, -4, 5, 12, 3, grain(HAZARD, 0.05, seed));
  model.fill(-6, 2, 4, 5, 12, 4, (x, y) => (y % 2 === 0 && x > -4 && x < 3 ? DARK : darken(HAZARD, 0.2)));
  model.fill(3, 13, -2, 4, 17, -1, DARK).fill(-5, 13, -3, -1, 14, 1, STEEL);
  const lamp = new VoxelModel().set(-3, 9, 5, 0x7cf29a, VOXEL_EMISSIVE).set(-1, 9, 5, 0xd84a3a, VOXEL_EMISSIVE);
  return parts(model, 18, [{ model: lamp, animate: (part, time, salt) => part.position.setY(Math.sin(time * 40 + salt) * 0.002) }]);
};

const trafficCone = (): ObjectModelParts => {
  const model = new VoxelModel().fill(-3, 0, -3, 2, 0, 2, DARK);
  for (let y = 1; y <= 10; y++) cylinder(model, -0.5, -0.5, 2.6 - y * 0.2, y, y, y === 4 || y === 7 ? 0xf2efe6 : 0xe86a2a);
  return parts(model, 11);
};

const sandbags = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (let row = 0; row < 3; row++) {
    for (let bag = 0; bag < 3 - (row === 2 ? 1 : 0); bag++) {
      const x0 = -8 + bag * 5 + (row % 2) * 2;
      model.fill(x0, row * 3, -3, x0 + 4, row * 3 + 2, 2, (x, y, z) => ((x === x0 || x === x0 + 4) && (y === row * 3 + 2 || z === -3 || z === 2) ? null : jitter(0x8a7a5a, 0.08, noise3(x, y, z, seed))));
    }
  }
  return parts(model, 9);
};

const pottedFern = (seed: number): ObjectModelParts => {
  const pot = pick([0x8a4a2a, 0x4a4f53, 0xd8d2c0], seed);
  const model = cylinder(new VoxelModel(), 0, 0, 3.5, 0, 6, grain(pot, 0.05, seed)).fill(-2, 7, -2, 2, 7, 2, 0x3b2a1e);
  for (let frond = 0; frond < 9; frond++) {
    const angle = (frond / 9) * Math.PI * 2 + noise3(frond, 0, 0, seed);
    for (let step = 0; step < 7; step++) {
      const x = Math.round(Math.cos(angle) * step * 0.9);
      const z = Math.round(Math.sin(angle) * step * 0.9);
      const y = 8 + Math.round(step * 1.4 - step * step * 0.12) + (frond % 3);
      model.set(x, y, z, step % 2 === 0 ? 0x2f8d4c : 0x4fbf6f);
    }
  }
  return parts(model, 18);
};

const specimenTank = (seed: number): ObjectModelParts => {
  const model = cylinder(new VoxelModel(), 0, 0, 5, 0, 3, STEEL);
  cylinder(model, 0, 0, 5, 28, 30, STEEL);
  const liquid = pick([0x6fc8ff, 0x7cf29a, 0xc79bff], seed);
  cylinder(model, 0, 0, 4.4, 4, 27, (_x, y) => (y > 24 ? 0xd8f2ff : liquid), VOXEL_GLASS);
  const specimen = new VoxelModel();
  cylinder(specimen, 0, 0, 1.8, 10, 18, darken(liquid, 0.5));
  specimen.fill(-3, 14, 0, 3, 14, 0, darken(liquid, 0.5));
  return parts(model, 31, [{ model: specimen, animate: (part, time, salt) => part.position.setY(Math.sin(time * 0.6 + salt) * 0.03) }]);
};

const gurney = (seed: number): ObjectModelParts => {
  const model = new VoxelModel().fill(-3, 9, -8, 2, 10, 7, STEEL).fill(-3, 11, -7, 2, 12, 6, grain(WHITE, 0.03, seed)).fill(-2, 13, -7, 1, 14, -5, 0xf2efe6);
  for (const x of [-3, 2]) for (const z of [-7, 6]) model.fill(x, 1, z, x, 8, z, 0x8a9298).set(x, 0, z, DARK);
  if (noise3(3, 1, 1, seed) > 0.5) model.fill(-3, 13, -2, 2, 13, 5, grain(pick(FABRIC, seed), 0.05, seed));
  return parts(model, 15);
};

const sackPile = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  const spots = [[-4, -3, 0], [3, -3, 0], [-1, 3, 0], [0, -1, 4]] as const;
  spots.forEach(([cx, cz, y0], index) => {
    const tone = jitter(CANVAS, 0.12, noise3(index, 0, 0, seed));
    for (let x = cx - 3; x <= cx + 3; x++) for (let z = cz - 3; z <= cz + 3; z++) for (let y = y0; y <= y0 + 4; y++) if (Math.hypot((x - cx) / 3.4, (y - y0 - 2) / 2.6, (z - cz) / 3.2) <= 1) model.set(x, y, z, jitter(tone, 0.04, noise3(x, y, z, seed)));
    model.set(cx, y0 + 5, cz, darken(tone, 0.4));
  });
  return parts(model, 10);
};

const mopBucket = (seed: number): ObjectModelParts => {
  const model = cylinder(new VoxelModel(), 0, 0, 3, 0, 5, 0xc99a1c).fill(-2, 5, -2, 2, 5, 2, 0x6a7a6a);
  model.fill(0, 4, 0, 0, 20, 0, pick([WOOD, 0x8a9298], seed)).fill(-1, 3, -1, 1, 4, 1, 0xd8d2c0);
  return parts(model, 21);
};

const officeChair = (seed: number): ObjectModelParts => {
  const tone = pick([DARK, 0x3a5a8a, 0x5a3a3a], seed);
  const model = new VoxelModel().fill(-3, 0, 0, 2, 0, 0, DARK).fill(-1, 0, -2, 0, 0, 2, DARK).fill(-1, 1, -1, 0, 6, 0, 0x8a9298);
  model.fill(-3, 7, -3, 2, 8, 2, tone).fill(-3, 9, -4, 2, 17, -4, tone);
  return parts(model, 18);
};

const monitorBank = (seed: number): ObjectModelParts => {
  const model = new VoxelModel().fill(-7, 0, -6, 6, 11, -1, grain(STEEL, 0.03, seed)).fill(-7, 12, -6, 6, 12, 1, DARK);
  const screens = new VoxelModel();
  for (const [x0, y0] of [[-7, 13], [0, 13], [-7, 20], [0, 20]] as const) {
    model.fill(x0, y0, -5, x0 + 6, y0 + 6, -5, DARK);
    screens.fill(x0 + 1, y0 + 1, -4, x0 + 5, y0 + 5, -4, (x, y) => (noise3(x, y, x0, seed) > 0.7 ? 0xc8fff2 : pick([0x1f6f8a, 0x2f7a4a, 0x6a3a8a], seed, x0 + y0)), VOXEL_EMISSIVE);
  }
  return parts(model, 27, [{ model: screens, animate: (part, time, salt) => (part.visible = Math.sin(time * 3.1 + salt * 2) > -0.95) }]);
};

const cableSpool = (seed: number): ObjectModelParts => {
  const cable = pick([DARK, 0xb84a3a, 0x2f5a8a], seed);
  const model = new VoxelModel();
  for (let z = -6; z <= 5; z++) {
    const flange = z === -6 || z === 5;
    for (let x = -7; x <= 6; x++) for (let y = 0; y <= 13; y++) {
      const radius = Math.hypot(x + 0.5, y - 6.5);
      if (flange ? radius <= 7 : radius <= 5 && radius > 1.5) model.set(x, y, z, flange ? jitter(WOOD, 0.06, noise3(x, y, z, seed)) : (x + y + z) % 3 === 0 ? darken(cable, 0.3) : cable);
    }
  }
  return parts(model, 14);
};

const floorLamp = (seed: number): ObjectModelParts => {
  const model = new VoxelModel().fill(-4, 0, 0, 3, 0, 0, DARK).fill(-1, 0, -4, 0, 0, 3, DARK).fill(-1, 1, -1, 0, 22, 0, STEEL);
  model.fill(-3, 23, -2, 2, 27, 1, darken(HAZARD, 0.2));
  const bulb = new VoxelModel().fill(-2, 24, 2, 1, 26, 2, 0xfff2c8, VOXEL_EMISSIVE);
  return parts(model, 28, [{ model: bulb, animate: (part, time) => (part.visible = Math.sin(time * 23 + seed) > -0.98) }]);
};

const crateStack = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  const box = (x0: number, y0: number, z0: number, size: number, index: number) => {
    const tone = pick(BOX_TONES, seed, index);
    model.fill(x0, y0, z0, x0 + size, y0 + size, z0 + size, (x, y, z) => ((x === x0 || x === x0 + size) && (y === y0 || y === y0 + size) ? darken(tone, 0.3) : (x === x0 || x === x0 + size) && (z === z0 || z === z0 + size) ? darken(tone, 0.3) : jitter(tone, 0.05, noise3(x, y, z, seed))));
  };
  box(-7, 0, -7, 7, 0);
  box(0, 0, -6, 6, 1);
  box(-6, 0, 0, 6, 2);
  box(-5, 8, -5, 7, 3);
  box(-3, 16, -3, 5, 4);
  return parts(model, 22);
};

const bookTrolley = (seed: number): ObjectModelParts => {
  const model = new VoxelModel().fill(-6, 2, -3, 5, 2, 2, STEEL).fill(-6, 10, -3, 5, 10, 2, STEEL).fill(-6, 3, -3, -6, 18, -3, STEEL).fill(5, 3, -3, 5, 18, -3, STEEL).fill(-6, 18, -3, 5, 18, -3, STEEL);
  for (const x of [-5, 4]) for (const z of [-2, 1]) model.fill(x, 0, z, x, 1, z, DARK);
  for (const shelf of [3, 11]) {
    let x = -5;
    let index = shelf;
    while (x <= 3) {
      const width = 1 + Math.floor(noise3(index, shelf, 0, seed) * 2);
      model.fill(x, shelf, -2, Math.min(4, x + width - 1), shelf + 4 + Math.floor(noise3(index, 1, shelf, seed) * 2), 1, pick([0x2f5a8a, 0x8a2f2f, 0x2f7a4a, 0x6a4a2a, 0x3a3f44], seed, index));
      x += width;
      index += 1;
    }
  }
  return parts(model, 19);
};

const mineCart = (seed: number): ObjectModelParts => {
  const rust = 0x7a4a2a;
  const model = new VoxelModel().fill(-6, 3, -5, 5, 11, 4, (x, y, z) => (x > -6 && x < 5 && z > -5 && z < 4 && y > 3 ? null : jitter(rust, 0.08, noise3(x, y, z, seed))));
  model.fill(-5, 4, -4, 4, 9, 3, (x, y, z) => (noise3(x, y, z, seed) > 0.25 ? jitter(0xe6e2d8, 0.05, noise3(z, y, x, seed)) : 0xc4beb0));
  for (const x of [-4, 3]) for (const z of [-6, 5]) model.fill(x - 1, 0, z, x + 1, 2, z, DARK);
  return parts(model, 12);
};

const pew = (seed: number): ObjectModelParts => {
  const timber = jitter(0x6a4a2a, 0.05, seed);
  const model = new VoxelModel().fill(-8, 6, -3, 7, 7, 2, grain(timber, 0.05, seed)).fill(-8, 8, 2, 7, 16, 3, grain(darken(timber, 0.15), 0.05, seed));
  for (const x of [-8, 7]) model.fill(x, 0, -3, x, 12, 3, darken(timber, 0.3));
  model.paintExisting(-8, 6, -3, 7, 7, 2, (x, _y, z) => (noise3(x, 0, z, seed) > 0.85 ? 0xe6e2d8 : null));
  return parts(model, 17);
};

const candleStand = (seed: number): ObjectModelParts => {
  const iron = 0x2a2420;
  const model = new VoxelModel().fill(-3, 0, -3, 2, 0, 2, iron).fill(-1, 1, -1, 0, 14, 0, iron).fill(-5, 15, -1, 4, 15, 0, iron).fill(-1, 15, -5, 0, 15, 4, iron);
  const flames = new VoxelModel();
  for (const [x, z] of [[-5, 0], [4, 0], [0, -5], [0, 4], [0, 0]] as const) {
    const height = 2 + Math.floor(noise3(x, z, 0, seed) * 4);
    model.fill(x, 16, z, x, 15 + height, z, 0xe6dfc8);
    flames.set(x, 16 + height, z, 0xffc86a, VOXEL_EMISSIVE);
  }
  return parts(model, 22, [{ model: flames, animate: (part, time, salt) => part.scale.setY(1 + Math.sin(time * 9 + salt) * 0.015) }]);
};

const wheelchair = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (const x of [-5, 4]) {
    for (let y = 0; y <= 10; y++) for (let z = -6; z <= 4; z++) if (Math.abs(Math.hypot(y - 5, z + 1) - 5) < 0.6) model.set(x, y, z, DARK);
  }
  model.fill(-4, 7, -3, 3, 7, 3, STEEL).fill(-4, 8, -3, 3, 8, 3, 0x3a3f44).fill(-4, 9, -4, 3, 17, -4, 0x3a3f44).fill(-4, 3, 4, 3, 3, 5, STEEL);
  if (noise3(1, 2, 3, seed) > 0.3) model.fill(-3, 9, -2, 2, 10, 2, grain(pick(FABRIC, seed), 0.05, seed));
  return parts(model, 18);
};

const screenPartition = (seed: number): ObjectModelParts => {
  const cloth = pick([0xd8e8e0, 0xe6dfc8, 0xc8d8e8], seed);
  const model = new VoxelModel();
  [[-8, -3], [-3, 2], [2, 7]].forEach(([x0, x1], panel) => {
    const z = panel === 1 ? 0 : -2;
    model.fill(x0 as number, 2, z, x1 as number, 24, z, (x, y) => (y === 2 || y === 24 || x === x0 || x === x1 ? 0x8a9298 : jitter(cloth, 0.03, noise3(x, y, panel, seed))));
  });
  for (const x of [-8, 7]) model.fill(x, 0, -2, x, 1, -2, DARK);
  return parts(model, 25);
};

const mailSacks = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  [[-4, -3], [3, -2], [-1, 4]].forEach(([cx, cz], index) => {
    const tone = jitter(0x9a8a6a, 0.08, noise3(index, 0, 0, seed));
    for (let x = (cx as number) - 3; x <= (cx as number) + 3; x++) for (let z = (cz as number) - 3; z <= (cz as number) + 3; z++) for (let y = 0; y <= 6; y++) if (Math.hypot((x - (cx as number)) / 3.2, (y - 3) / 3.6, (z - (cz as number)) / 3.2) <= 1) model.set(x, y, z, jitter(tone, 0.04, noise3(x, y, z, seed)));
    model.fill(cx as number, 7, cz as number, cx as number, 8, cz as number, darken(tone, 0.4)).set((cx as number) + 1, 6, (cz as number) + 3, 0xd84a3a);
  });
  return parts(model, 9);
};

const sortingCase = (seed: number): ObjectModelParts => {
  const timber = 0x6a4a2a;
  const model = new VoxelModel().fill(-7, 0, -6, 6, 26, -1, (x, y, z) => {
    if (z > -2 && x > -7 && x < 6 && y > 0 && y < 26 && (x + 7) % 3 !== 0 && y % 4 !== 0) return null;
    return jitter(timber, 0.05, noise3(x, y, z, seed));
  });
  for (let slot = 0; slot < 14; slot++) {
    const x = -6 + Math.floor(noise3(slot, 0, 1, seed) * 12);
    const y = 1 + Math.floor(noise3(slot, 1, 1, seed) * 6) * 4;
    if ((x + 7) % 3 !== 0 && model.has(x, y, -2)) model.fill(x, y, -1, x, y + 1, -1, pick([0xe6dfc8, 0xd8d2c0, 0xf2b8c6], seed, slot));
  }
  return parts(model, 27);
};

const worksBarrier = (): ObjectModelParts => {
  const model = new VoxelModel();
  for (const x of [-7, 6]) model.fill(x - 1, 0, -2, x + 1, 0, 2, DARK).fill(x, 1, 0, x, 14, 0, 0x8a9298);
  for (const y of [8, 13]) model.fill(-8, y, 0, 7, y + 2, 0, (x) => (Math.floor((x + 8) / 3) % 2 === 0 ? 0xe8402a : 0xf2efe6));
  const lamp = new VoxelModel().set(-7, 15, 0, 0xffb347, VOXEL_EMISSIVE).set(6, 15, 0, 0xffb347, VOXEL_EMISSIVE);
  return parts(model, 16, [{ model: lamp, animate: (part, time, salt) => (part.visible = Math.sin(time * 4 + salt) > 0) }]);
};

const surveyStake = (seed: number): ObjectModelParts => {
  const model = new VoxelModel().fill(0, 0, 0, 0, 14, 0, WOOD).fill(1, 10, 0, 4, 13, 0, pick([0xe86a2a, 0x3fbf7f, 0x3a8ad8], seed));
  model.fill(-1, 0, -1, 1, 0, 1, 0xe86a2a);
  return parts(model, 15);
};

const shutteredKiosk = (seed: number): ObjectModelParts => {
  const tone = pick([0x3a5a6a, 0x5a4a6a, 0x4a5a3a], seed);
  const model = new VoxelModel().fill(-7, 0, -6, 6, 24, 5, (x, y, z) => (y === 24 ? lighten(tone, 0.2) : jitter(tone, 0.04, noise3(x, y, z, seed))));
  model.fill(-6, 4, 6, 5, 18, 6, (_x, y) => (y % 2 === 0 ? 0x8a9298 : 0x6a747a));
  model.fill(-2, 10, 7, 2, 13, 7, (x, y) => ((x + y) % 2 === 0 ? 0xf2efe6 : 0xe8402a));
  model.fill(-8, 19, -7, 7, 21, 7, (x) => ((x + 8) % 4 < 2 ? lighten(tone, 0.4) : 0xf2efe6));
  return parts(model, 25);
};

const reservedPlot = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (let x = -7; x <= 6; x++) {
    for (let z = -7; z <= 6; z++) {
      const edge = x === -7 || x === 6 || z === -7 || z === 6;
      if (edge) model.set(x, 0, z, Math.floor((x + z + 14) / 2) % 2 === 0 ? HAZARD : 0x17170f);
      else if (Math.abs(x + 0.5) === Math.abs(z + 0.5) && noise3(x, 0, z, seed) > 0.2) model.set(x, 0, z, 0xe8e2d4);
    }
  }
  return parts(model, 1);
};

export const CLUTTER_BUILDERS: Readonly<Record<ClutterModel, (seed: number) => ObjectModelParts>> = {
  barrel,
  palletStack,
  gasCylinders,
  toolCart,
  workbench,
  canteenTable,
  stool,
  bunkBed,
  vendingMachine,
  trashBin,
  cargoContainer,
  generator,
  trafficCone,
  sandbags,
  pottedFern,
  specimenTank,
  gurney,
  sackPile,
  mopBucket,
  officeChair,
  monitorBank,
  cableSpool,
  floorLamp,
  crateStack,
  bookTrolley,
  mineCart,
  pew,
  candleStand,
  wheelchair,
  screenPartition,
  mailSacks,
  sortingCase,
  worksBarrier,
  surveyStake,
  shutteredKiosk,
  reservedPlot,
};
