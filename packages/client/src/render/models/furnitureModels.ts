import type { WorldObjectModel } from '@containment/shared';
import { darken, jitter, lighten, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import type { ObjectModelParts } from './objectModels.ts';

type FurnitureModel = Extract<WorldObjectModel, 'officeDesk' | 'wallShelf' | 'filingCabinet' | 'storageRack' | 'noticeBoard' | 'waterCooler'>;

const parts = (base: VoxelModel, heightVoxels: number, animated: ObjectModelParts['animated'] = []): ObjectModelParts => ({ base, animated, heightVoxels });

const grained = (color: number, amount = 0.03, salt = 0) => (x: number, y: number, z: number) => jitter(color, amount, noise3(x, y, z, salt));

const pick = <T>(options: readonly T[], seed: number, index: number, salt = 0): T =>
  options[Math.floor(noise3(index, salt, 0, seed) * options.length) % options.length] as T;

const DESK_STEEL = 0x56636c;
const DESK_TOP = 0x7a8a94;
const BINDER_TONES = [0x2f5a8a, 0x8a2f2f, 0x2f7a4a, 0xc99a1c, 0x3a3f44, 0x6a4a8a];
const BOX_TONES = [0x8a7350, 0x6f5c3e, 0xa08a62];
const NOTE_TONES = [0xf2efe6, 0xf5e27a, 0xf2b8c6, 0xb8daf2, 0xd8f2b8];
const MUG_TONES = [0xd84a3a, 0xf2efe6, 0x3a8ad8, 0x2f2f33];

const officeDesk = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-7, 11, -7, 6, 12, -1, (x, y, z) => (y === 12 ? jitter(DESK_TOP, 0.03, noise3(x, y, z, seed)) : DESK_STEEL));
  model.fill(-7, 0, -7, -3, 10, -1, grained(DESK_STEEL));
  model.paintExisting(-6, 0, -1, -4, 10, -1, (_x, y) => (y === 3 || y === 7 ? darken(DESK_STEEL, 0.4) : null));
  for (const y of [1, 5, 9]) model.set(-5, y, 0, 0xb8c2ca);
  for (const z of [-7, -1]) model.fill(5, 0, z, 6, 10, z, DESK_STEEL);
  model.fill(-2, 3, -7, 4, 10, -7, darken(DESK_STEEL, 0.2));
  model.fill(-1, 13, -6, 0, 14, -5, 0x2a3036);
  model.fill(-4, 15, -6, 3, 21, -6, 0x1a2026);
  model.fill(-3, 23, -6, 2, 23, -6, 0x1a2026);
  model.fill(-4, 22, -6, 3, 22, -6, 0x1a2026);
  model.fill(-3, 16, -5, 2, 21, -5, (x, y) => (y % 2 === 0 && x < 1 - ((y + seed) % 3) ? 0x9fe8ff : 0x1f6f8a), VOXEL_EMISSIVE);
  model.fill(-3, 13, -3, 2, 13, -2, (x) => (x % 2 === 0 ? 0x2a3036 : 0x3a4248));
  model.fill(3, 13, -5, 5, 13, -3, pick(NOTE_TONES, seed, 1));
  model.fill(3, 14, -5, 4, 14, -4, pick(NOTE_TONES, seed, 2));
  model.fill(-6, 13, -4, -6, 14, -3, pick(MUG_TONES, seed, 3));
  model.fill(-3, 6, 1, 2, 7, 5, 0x2a3036);
  model.fill(-3, 8, 5, 2, 15, 6, (x, y) => (y === 15 || x === -3 || x === 2 ? 0x2a3036 : 0x3a4a56));
  model.fill(-1, 2, 3, 0, 5, 3, 0x5d6b74);
  model.fill(-3, 0, 3, 2, 1, 3, 0x2a3036).fill(-1, 0, 1, 0, 1, 5, 0x2a3036);
  return parts(model, 24);
};

const shelfItems = (model: VoxelModel, seed: number, shelfY: number, row: number): void => {
  let x = -7;
  let index = row * 20;
  while (x <= 6) {
    index += 1;
    const kind = noise3(index, row, 1, seed);
    if (kind < 0.15) {
      x += 2;
      continue;
    }
    if (kind < 0.55) {
      const width = noise3(index, 2, row, seed) > 0.5 ? 2 : 1;
      const height = 4 + Math.floor(noise3(index, 3, row, seed) * 3);
      const tone = pick(BINDER_TONES, seed, index, row);
      model.fill(x, shelfY + 1, -8, Math.min(6, x + width - 1), shelfY + height, -5, (_vx, vy) => (vy === shelfY + height - 1 ? lighten(tone, 0.3) : tone));
      x += width;
      continue;
    }
    if (kind < 0.8) {
      const tone = pick(BOX_TONES, seed, index, row + 7);
      model.fill(x, shelfY + 1, -8, Math.min(6, x + 2), shelfY + 3, -5, grained(tone, 0.05, seed));
      x += 3;
      continue;
    }
    model.fill(x, shelfY + 1, -7, Math.min(6, x + 1), shelfY + 2, -6, pick([0xb8c2ca, 0x8a9298, 0x3fbf7f], seed, index, row + 3));
    x += 3;
  }
};

const wallShelf = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (const x of [-6, 5]) model.fill(x, 11, -8, x, 24, -8, 0x2a3036).fill(x, 12, -7, x, 12, -5, 0x2a3036).fill(x, 20, -7, x, 20, -5, 0x2a3036);
  for (const y of [13, 21]) model.fill(-7, y, -8, 6, y, -4, (x, _y, z) => (z === -4 ? darken(DESK_STEEL, 0.2) : jitter(DESK_STEEL, 0.03, noise3(x, y, z, seed))));
  shelfItems(model, seed, 13, 0);
  shelfItems(model, seed, 21, 1);
  return parts(model, 28);
};

const CABINET_GREY = 0x6a747a;

const cabinet = (model: VoxelModel, seed: number, x0: number, x1: number, salt: number): void => {
  const tone = jitter(CABINET_GREY, 0.06, noise3(salt, 0, 0, seed));
  model.fill(x0, 0, -7, x1, 20, -1, grained(tone, 0.02, salt));
  model.fill(x0, 20, -7, x1, 20, -1, lighten(tone, 0.12));
  const ajar = Math.floor(noise3(salt, 1, 0, seed) * 6);
  for (let drawer = 0; drawer < 4; drawer++) {
    const bottom = 1 + drawer * 5;
    const middle = Math.floor((x0 + x1) / 2);
    model.paintExisting(x0 + 1, bottom + 4, -1, x1 - 1, bottom + 4, -1, darken(tone, 0.45));
    if (drawer === ajar) {
      model.fill(x0 + 1, bottom, 0, x1 - 1, bottom + 3, 2, (x, y, z) => (z === 2 ? tone : y === bottom + 3 && z < 2 ? (noise3(x, y, z, seed) > 0.4 ? 0xe6dfc8 : 0xc4ccd2) : darken(tone, 0.2)));
      model.set(middle, bottom + 2, 3, 0xb8c2ca);
    } else {
      model.set(middle, bottom + 2, 0, 0xb8c2ca);
      model.set(middle, bottom + 3, -1, 0xe6dfc8);
    }
  }
};

const filingCabinet = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  cabinet(model, seed, -7, -1, 1);
  cabinet(model, seed, 0, 6, 2);
  if (noise3(3, 3, 3, seed) > 0.4) model.fill(-6, 21, -6, -3, 23, -3, (x, y, z) => (y === 23 && (x + z) % 2 === 0 ? 0xe6dfc8 : 0xd8d2c0));
  else model.fill(2, 21, -6, 4, 22, -4, 0x4a4f53).fill(2, 23, -6, 4, 26, -4, (x, y, z) => (noise3(x, y, z, seed) > 0.35 ? 0x2f8d4c : null));
  return parts(model, 24);
};

const RACK_FRAME = 0x2f5a8a;
const RACK_SHELVES = [1, 10, 19, 28];

const rackItems = (model: VoxelModel, seed: number, shelfY: number): void => {
  let x = -6;
  let index = shelfY * 3;
  while (x <= 5) {
    index += 1;
    const kind = noise3(index, shelfY, 2, seed);
    if (kind < 0.2) {
      x += 2;
      continue;
    }
    if (kind < 0.6) {
      const width = 3 + Math.floor(noise3(index, 1, shelfY, seed) * 2);
      const height = 4 + Math.floor(noise3(index, 2, shelfY, seed) * 4);
      const tone = pick([0x6f5c3e, 0x5a6a3a, 0x8a7350, 0x46535c], seed, index);
      const end = Math.min(5, x + width - 1);
      model.fill(x, shelfY + 1, -5, end, shelfY + height, 2, (vx, vy, vz) => (vy === shelfY + height || vx === x || vx === end ? darken(tone, 0.2) : jitter(tone, 0.04, noise3(vx, vy, vz, seed))));
      x += width + 1;
      continue;
    }
    const tone = pick([0xc99a1c, 0xb84a3a, 0x3a8ad8, 0x8a9298], seed, index, 5);
    for (let vy = shelfY + 1; vy <= shelfY + 6; vy++) {
      for (let vx = x; vx <= Math.min(5, x + 2); vx++) {
        for (let vz = -3; vz <= -1; vz++) model.set(vx, vy, vz, vy === shelfY + 6 ? darken(tone, 0.3) : tone);
      }
    }
    x += 4;
  }
};

const storageRack = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (const x of [-7, 6]) for (const z of [-6, 3]) model.fill(x, 0, z, x, 28, z, RACK_FRAME);
  for (const y of RACK_SHELVES) model.fill(-7, y, -6, 6, y, 3, (x, _y, z) => (x === -7 || x === 6 || z === -6 || z === 3 ? RACK_FRAME : (x + z) % 2 === 0 ? 0x3a4248 : 0x2a3036));
  for (const y of RACK_SHELVES.slice(0, 3)) rackItems(model, seed, y);
  return parts(model, 29);
};

const noticeBoard = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-7, 10, -8, 6, 24, -8, (x, y) => (x === -7 || x === 6 || y === 10 || y === 24 ? 0x4a3a2a : jitter(0x9a7a50, 0.08, noise3(x, y, 0, seed))));
  for (let note = 0; note < 7; note++) {
    const x = -6 + Math.floor(noise3(note, 0, 1, seed) * 10);
    const y = 11 + Math.floor(noise3(note, 1, 1, seed) * 10);
    const tone = pick(NOTE_TONES, seed, note, 9);
    model.fill(x, y, -7, Math.min(5, x + 2), Math.min(23, y + 3), -7, (vx, vy) => (vy === y + 2 && vx > x && noise3(vx, vy, note, seed) > 0.5 ? 0x5d6b74 : tone));
    model.set(x + 1, Math.min(23, y + 3), -6, pick([0xd84a3a, 0x3a8ad8, 0xc99a1c], seed, note, 4));
  }
  return parts(model, 25);
};

const waterCooler = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-3, 0, -6, 2, 13, -1, (x, y, z) => (y === 0 ? 0x5d6b74 : jitter(0xd8dde0, 0.02, noise3(x, y, z, seed))));
  model.fill(-2, 6, 0, 1, 6, 0, 0xb8c2ca);
  model.set(-2, 9, 0, 0x3a8ad8).set(1, 9, 0, 0xd84a3a);
  model.fill(-2, 3, -1, 1, 4, -1, 0x2a3036);
  for (let y = 14; y <= 25; y++) {
    const radius = y <= 15 ? 1.4 : y >= 24 ? 2.2 : 3.1;
    for (let x = -4; x <= 3; x++) {
      for (let z = -7; z <= 0; z++) {
        if (Math.hypot(x + 0.5, z + 3.5) > radius) continue;
        const water = y <= 22;
        model.set(x, y, z, water ? 0x6fc8ff : 0xd8f2ff, VOXEL_GLASS);
      }
    }
  }
  model.fill(-1, 26, -4, 0, 26, -3, 0x3a8ad8);
  model.fill(3, 7, -3, 4, 12, -2, (_x, y) => (y === 12 ? 0xf2efe6 : 0xd8dde0));
  return parts(model, 27);
};

export const FURNITURE_BUILDERS: Readonly<Record<FurnitureModel, (seed: number) => ObjectModelParts>> = {
  officeDesk,
  wallShelf,
  filingCabinet,
  storageRack,
  noticeBoard,
  waterCooler,
};
