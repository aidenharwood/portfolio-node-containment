import type { WorldObjectModel } from '@containment/shared';
import { darken, lighten, mix, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import type { ObjectModelParts } from './objectModels.ts';

export type NatureModel = Extract<
  WorldObjectModel,
  | 'broadleafTree'
  | 'birchTree'
  | 'orchardTree'
  | 'windbentPine'
  | 'deadTree'
  | 'bush'
  | 'hedgerow'
  | 'fieldWall'
  | 'hayBale'
  | 'boulder'
  | 'rockOutcrop'
  | 'obsidianOutcrop'
  | 'glassCrystals'
  | 'fusedShards'
  | 'scrapMound'
  | 'tyreHeap'
  | 'wreckedPanel'
  | 'overgrownPlanter'
  | 'rubbleHeap'
  | 'ruinWall'
  | 'treeStump'
  | 'fallenLog'
  | 'wildflowers'
  | 'tallGrass'
>;

type Builder = (seed: number) => ObjectModelParts;

interface Tones {
  readonly light: number;
  readonly base: number;
  readonly dark: number;
}

const parts = (base: VoxelModel, heightVoxels: number): ObjectModelParts => ({ base, animated: [], heightVoxels });

const of = <T>(seed: number, options: readonly T[]): T => options[seed % options.length] as T;

const GOLDEN = 2.39996;

const BARK: Tones = { light: 0x6a5440, base: 0x4f3d2c, dark: 0x352a20 };
const WOOD = { face: 0xb89462, ring: 0x9a7848, core: 0x7a5a36 };
const LEAF: readonly Tones[] = [
  { light: 0x7fa24c, base: 0x5a823c, dark: 0x3a5c2e },
  { light: 0x6c9446, base: 0x4b7236, dark: 0x2f4c28 },
  { light: 0x8ea24e, base: 0x6a803a, dark: 0x485a2c },
];
const AUTUMN: Tones = { light: 0xd8a844, base: 0xb87e30, dark: 0x7e5226 };
const BIRCH_LEAF: readonly Tones[] = [
  { light: 0xbccc6c, base: 0x98ae4e, dark: 0x6a8038 },
  { light: 0xaac472, base: 0x82a24a, dark: 0x58722e },
];
const BLOSSOM: Tones = { light: 0xf4dce4, base: 0xe4b8c8, dark: 0x6a8a52 };
const PINE: readonly Tones[] = [
  { light: 0x4c7058, base: 0x32523f, dark: 0x1f3529 },
  { light: 0x5a7c60, base: 0x3c5c46, dark: 0x25392d },
];
const RIME = 0xcad6d0;
const STONE: Tones = { light: 0xa6a298, base: 0x88847b, dark: 0x5f5c55 };
const DARK_STONE: Tones = { light: 0x8e8a82, base: 0x6e6a63, dark: 0x4a4743 };
const LICHEN = 0xa0aa52;
const MOSS = 0x56803c;
const STRAW: Tones = { light: 0xdcc274, base: 0xc2a25a, dark: 0x9a7e42 };
const RUST = 0x8a4a24;
const RUST_DARK = 0x5e3420;
const STEEL = 0x5d666c;
const CONCRETE: Tones = { light: 0x969286, base: 0x7c786e, dark: 0x5c5850 };
const RUBBER = 0x1b1b1d;
const OBSIDIAN = { body: 0x1f1c28, sheen: 0x4a4268, edge: 0x2e2a3c };
const CITY_BAND = 0xe86a1c;

function ellipsoid(model: VoxelModel, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, tones: Tones, salt: number, bumps = 0.45, floor = -Infinity): void {
  for (let y = Math.max(floor, Math.floor(cy - ry - 1)); y <= Math.ceil(cy + ry + 1); y++) {
    for (let z = Math.floor(cz - rz - 1); z <= Math.ceil(cz + rz + 1); z++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        const nz = (z + 0.5 - cz) / rz;
        const lump = (noise3(x >> 1, y >> 1, z >> 1, salt) - 0.5) * bumps;
        if (nx * nx + ny * ny + nz * nz > 1 + lump) continue;
        const band = ny + lump * 0.6;
        model.set(x, y, z, band > 0.32 ? tones.light : band < -0.38 ? tones.dark : tones.base);
      }
    }
  }
}

function stem(model: VoxelModel, x: number, z: number, from: number, to: number, width: number, leanX: number, leanZ: number, tones: Tones): { x: number; z: number } {
  let top = { x, z };
  for (let y = from; y < to; y++) {
    const ox = x + Math.round(leanX * Math.max(0, y));
    const oz = z + Math.round(leanZ * Math.max(0, y));
    model.fill(ox, y, oz, ox + width - 1, y, oz + width - 1, y < 2 ? tones.dark : tones.base);
    top = { x: ox, z: oz };
  }
  return top;
}

function line(model: VoxelModel, from: readonly [number, number, number], to: readonly [number, number, number], color: number): void {
  const steps = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]), Math.abs(to[2] - from[2]), 1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    model.set(Math.round(from[0] + (to[0] - from[0]) * t), Math.round(from[1] + (to[1] - from[1]) * t), Math.round(from[2] + (to[2] - from[2]) * t), color);
  }
}

function dots(model: VoxelModel, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, count: number, color: number, seed: number, low = -0.3, high = 0.85): void {
  for (let i = 0; i < count; i++) {
    const angle = i * GOLDEN + seed;
    const t = low + ((i + 0.5) / count) * (high - low);
    const spread = Math.sqrt(Math.max(0, 1 - t * t)) * 1.08;
    model.set(Math.round(cx - 0.5 + Math.cos(angle) * rx * spread), Math.round(cy - 0.5 + t * ry * 1.05), Math.round(cz - 0.5 + Math.sin(angle) * rz * spread), color);
  }
}

function flare(model: VoxelModel, x: number, z: number, width: number, color: number): void {
  model.fill(x - 1, 0, z, x - 1, 0, z + width - 1, color).fill(x + width, 0, z, x + width, 0, z + width - 1, color);
  model.fill(x, 0, z - 1, x + width - 1, 0, z - 1, color).fill(x, 0, z + width, x + width - 1, 0, z + width, color);
}

const broadleafTree: Builder = (seed) => {
  const size = of(seed, [1, 0.9, 1.12, 0.95, 1.08, 0.86, 1.04, 1.18]);
  const tones = seed === 5 ? AUTUMN : of(seed, LEAF);
  const model = new VoxelModel();
  const height = Math.round(10 * size);
  const top = stem(model, -1, -1, -2, height, 2, of(seed, [0, 0.12, -0.1, 0.06]), of(seed, [0.08, -0.06, 0, -0.1, 0.1]), BARK);
  flare(model, -1, -1, 2, BARK.dark);
  const r = 5.6 * size;
  const cx = top.x + 1;
  const cz = top.z + 1;
  const cy = height + 3.6 * size;
  const shape = (seed >> 1) % 4;
  if (shape === 0) {
    ellipsoid(model, cx, cy, cz, r, r * 0.82, r, tones, seed + 11);
    ellipsoid(model, cx + 3.2, cy - 1.8, cz + 1.4, r * 0.62, r * 0.55, r * 0.62, tones, seed + 13);
    ellipsoid(model, cx - 2.8, cy - 1.2, cz - 2.2, r * 0.58, r * 0.5, r * 0.58, tones, seed + 17);
  } else if (shape === 1) {
    ellipsoid(model, cx, cy - 0.6, cz, r * 1.18, r * 0.66, r * 1.08, tones, seed + 11);
    ellipsoid(model, cx - 1, cy + 2, cz + 1, r * 0.7, r * 0.5, r * 0.7, tones, seed + 13);
  } else if (shape === 2) {
    ellipsoid(model, cx, cy + 1.6, cz, r * 0.84, r * 1.12, r * 0.84, tones, seed + 11);
    ellipsoid(model, cx + 2, cy - 2.4, cz - 1, r * 0.6, r * 0.5, r * 0.6, tones, seed + 13);
  } else {
    ellipsoid(model, cx - 2.4, cy - 0.4, cz + 0.8, r * 0.8, r * 0.72, r * 0.8, tones, seed + 11);
    ellipsoid(model, cx + 2.6, cy + 0.8, cz - 1, r * 0.78, r * 0.74, r * 0.78, tones, seed + 13);
    ellipsoid(model, cx, cy + 3, cz, r * 0.55, r * 0.45, r * 0.55, tones, seed + 17);
  }
  line(model, [top.x, height - 3, top.z], [top.x + 3, height + 1, top.z + 2], BARK.base);
  return parts(model, Math.ceil(cy + r + 2));
};

const birchTree: Builder = (seed) => {
  const tones = of(seed, BIRCH_LEAF);
  const bark: Tones = { light: 0xe4e0d4, base: 0xd8d4c8, dark: 0xb8b4a8 };
  const model = new VoxelModel();
  const trunks = of(seed, [1, 2, 3, 1, 2, 1, 3, 2]);
  let crownTop = 0;
  for (let i = 0; i < trunks; i++) {
    const angle = i * GOLDEN + seed;
    const bx = trunks === 1 ? 0 : Math.round(Math.cos(angle) * 1.6);
    const bz = trunks === 1 ? 0 : Math.round(Math.sin(angle) * 1.6);
    const height = of(seed + i, [16, 14, 18, 15, 17, 13, 19, 15]) - i * 2;
    const lean = trunks === 1 ? of(seed, [0.04, -0.08, 0.1, 0]) : 0.1;
    const top = stem(model, bx, bz, -2, height, 1, Math.sign(bx || 1) * lean, Math.sign(bz || -1) * lean * 0.6, bark);
    for (const mark of [3, 6, 10, 13]) if (mark < height - 4 && (mark + seed + i) % 2 === 0) model.set(bx + Math.round(Math.sign(bx || 1) * lean * mark), mark, bz + Math.round(Math.sign(bz || -1) * lean * 0.6 * mark), 0x2a2826);
    const cy = height - 2.5;
    ellipsoid(model, top.x + 0.5, cy, top.z + 0.5, 2.8, 5.2, 2.8, tones, seed * 7 + i);
    crownTop = Math.max(crownTop, cy + 6);
  }
  return parts(model, Math.ceil(crownTop));
};

const orchardTree: Builder = (seed) => {
  const blossom = seed === 3 || seed === 7;
  const tones = blossom ? BLOSSOM : of(seed, LEAF);
  const model = new VoxelModel();
  const height = of(seed, [6, 5, 7, 6, 5, 6, 7, 5]);
  const top = stem(model, -1, -1, -2, height, 2, of(seed, [0.1, -0.12, 0.05, 0]), of(seed, [0, 0.08, -0.1]), BARK);
  flare(model, -1, -1, 2, BARK.dark);
  line(model, [top.x, height - 1, top.z], [top.x - 2, height + 2, top.z + 1], BARK.base);
  line(model, [top.x + 1, height - 1, top.z + 1], [top.x + 3, height + 2, top.z - 1], BARK.base);
  const rx = of(seed, [5, 4.6, 5.4, 4.8]);
  const ry = rx * 0.74;
  const cx = top.x + 1;
  const cz = top.z + 1;
  const cy = height + ry * 0.9;
  ellipsoid(model, cx, cy, cz, rx, ry, rx * 0.95, tones, seed + 23, 0.35);
  if (!blossom) dots(model, cx, cy, cz, rx, ry, rx * 0.95, 7, of(seed, [0xb43a2a, 0xccaa36, 0xb8442a, 0, 0xcc7a30, 0xb43a2a, 0xccaa36]), seed, -0.4, 0.7);
  if (seed === 6) line(model, [3, 0, 2], [cx + 1, height + 1, cz], 0x8a7a5a);
  return parts(model, Math.ceil(cy + ry + 2));
};

const windbentPine: Builder = (seed) => {
  const tones = seed === 2 || seed === 6 ? { ...of(seed, PINE), light: RIME } : of(seed, PINE);
  const height = of(seed, [24, 20, 27, 22, 25, 18, 23, 26]);
  const bend = of(seed, [0.6, 1, 0.4, 0.8, 1.2]);
  const broken = seed === 5;
  const model = new VoxelModel();
  const shift = (y: number): number => Math.round(bend * 6 * (Math.max(0, y) / height) ** 2);
  for (let y = -2; y < height - 2; y++) {
    const width = y < height * 0.4 ? 2 : 1;
    model.fill(-1 + shift(y), y, -1, -2 + width + shift(y), y, -2 + width, y < 2 ? BARK.dark : BARK.base);
  }
  const tiers = broken ? 4 : 5;
  for (let k = 0; k < tiers; k++) {
    const y = Math.round(height * 0.32 + (k * height * 0.6) / 5);
    const radius = 5.4 - k * 0.95;
    ellipsoid(model, shift(y) + radius * 0.4, y, -0.5, radius, 1.5, radius * 0.78, tones, seed * 5 + k, 0.5);
  }
  if (broken) model.fill(shift(height - 3), height - 4, -1, shift(height - 3), height, -1, 0x9a948a);
  else ellipsoid(model, shift(height - 1), height - 1, -0.5, 1.4, 2, 1.2, tones, seed + 41, 0.3);
  return parts(model, height + 2);
};

const deadTree: Builder = (seed) => {
  const bleached = seed % 2 === 0;
  const bark: Tones = bleached ? { light: 0xaaa296, base: 0x8e877c, dark: 0x6a645c } : { light: 0x6e6258, base: 0x564a40, dark: 0x3c342e };
  const rusted = seed === 1 || seed === 2 || seed === 5 || seed === 6;
  const height = of(seed, [18, 15, 21, 16, 20, 14, 19, 17]);
  const snapped = seed === 3 || seed === 7;
  const model = new VoxelModel();
  const trunkTop = snapped ? Math.round(height * 0.7) : height;
  const lean = of(seed, [0.06, -0.08, 0.1, -0.04, 0]);
  for (let y = -2; y < trunkTop; y++) {
    const ox = Math.round(lean * Math.max(0, y));
    const width = y < height * 0.5 ? 2 : 1;
    model.fill(-1 + ox, y, -1, -2 + width + ox, y, -2 + width, y < 1 ? bark.dark : bark.base);
  }
  flare(model, -1, -1, 2, bark.dark);
  if (snapped) model.set(Math.round(lean * trunkTop), trunkTop, -1, bark.light).set(Math.round(lean * trunkTop), trunkTop + 1, -1, bark.light);
  const branches = of(seed, [4, 3, 5, 3, 4, 3, 5, 4]);
  for (let b = 0; b < branches; b++) {
    const y = Math.round(height * (0.42 + 0.11 * b));
    if (y >= trunkTop) continue;
    const angle = seed * 1.7 + b * GOLDEN;
    const length = 4 + ((seed + b) % 3);
    const sx = Math.round(lean * y);
    const end: [number, number, number] = [sx + Math.round(Math.cos(angle) * length), y + Math.round(length * 0.6), Math.round(Math.sin(angle) * length) - 1];
    line(model, [sx, y, -1], end, bark.base);
    model.set(end[0], end[1] + 1, end[2], bark.light);
    if (seed === 6 && b === 1) model.fill(end[0] - 1, end[1] - 4, end[2], end[0] + 1, end[1] - 1, end[2], RUST);
  }
  if (rusted) {
    model.fill(-1, 0, -2, 0, 4, -2, RUST).fill(-1, 5, -2, -1, 7, -2, RUST_DARK);
    model.fill(1, 0, -1, 1, 3, -1, RUST_DARK);
  }
  return parts(model, height + 4);
};

const bush: Builder = (seed) => {
  const tones = of(seed, LEAF);
  const model = new VoxelModel();
  const blobs = of(seed, [1, 2, 3, 2, 1, 3, 2, 1]);
  const radius = of(seed, [3.4, 2.8, 2.6, 3, 3.6, 2.4, 3.1, 3.2]);
  for (let i = 0; i < blobs; i++) {
    const angle = i * GOLDEN + seed;
    const reach = blobs === 1 ? 0 : 1.6;
    ellipsoid(model, Math.cos(angle) * reach, radius * 0.78, Math.sin(angle) * reach, radius - i * 0.3, radius * 0.82 - i * 0.3, radius - i * 0.3, tones, seed * 3 + i, 0.45, 0);
  }
  const accent = of(seed, [0, 0xa8322a, 0xe4e0d4, 0, 0xd4b848, 0, 0xa8322a, 0xe4e0d4]);
  if (accent) dots(model, 0, radius * 0.78, 0, radius, radius * 0.82, radius, 5, accent, seed, 0.1, 0.8);
  return parts(model, Math.ceil(radius * 1.7 + 1));
};

const hedgerow: Builder = (seed) => {
  const tones: Tones = { light: 0x5f8a3e, base: 0x44682f, dark: 0x2e4a24 };
  const height = of(seed, [7, 6, 8, 7, 6, 5, 8, 7]);
  const model = new VoxelModel();
  for (let x = -4; x <= 3; x++) {
    for (let z = -2; z <= 1; z++) {
      const edge = z === -2 || z === 1;
      const top = height + (noise3(x >> 1, seed, 3, 91) > 0.55 ? 1 : 0) - (edge ? 1 : 0) - (seed === 5 && Math.abs(x) <= 1 ? 2 : 0);
      for (let y = 0; y < top; y++) model.set(x, y, z, y >= top - 1 ? tones.light : y <= 1 ? tones.dark : tones.base);
    }
  }
  if (seed === 2 || seed === 6) dots(model, 0, height * 0.6, -0.5, 4.2, height * 0.5, 2.2, 6, 0xf0ece4, seed, 0.1, 0.9);
  if (seed === 4) model.fill(-4, 0, 2, -4, height + 1, 2, 0x6a5440);
  return parts(model, height + 2);
};

const fieldWall: Builder = (seed) => {
  const stones = [STONE.base, STONE.light, DARK_STONE.light] as const;
  const height = of(seed, [4, 5, 4, 4, 5, 3, 4, 5]);
  const gap = seed === 6;
  const model = new VoxelModel();
  for (let y = 0; y < height; y++) {
    for (let x = -4; x <= 3; x++) {
      if (gap && y >= height - 2 && Math.abs(x + 0.5) < 2) continue;
      const block = Math.floor((x + 4 + (y % 2)) / 2);
      const color = stones[Math.floor(noise3(block, y, seed, 61) * 3)] as number;
      model.fill(x, y, -1, x, y, 1, color);
    }
  }
  for (let x = -4; x <= 3; x++) {
    if (gap && Math.abs(x + 0.5) < 2) continue;
    model.set(x, height, 0, x % 2 === 0 ? STONE.dark : STONE.base);
    if (x % 2 === 0) model.set(x, height + 1, 0, STONE.dark);
  }
  if (seed === 1 || seed === 5) model.fill(-3, height, -1, -1, height, -1, MOSS).set(2, height, 1, MOSS);
  if (gap) model.fill(-1, 0, 2, 0, 0, 3, STONE.base).set(1, 0, -3, STONE.light);
  return parts(model, height + 2);
};

function roundBale(model: VoxelModel, z: number, radius: number, tones: Tones, wrap?: number): void {
  const reach = Math.ceil(radius);
  for (let y = 0; y <= reach * 2; y++) {
    for (let dz = -reach; dz <= reach; dz++) {
      const d = Math.hypot(y + 0.5 - radius, dz + 0.5);
      if (d > radius) continue;
      for (let x = -2; x <= 2; x++) {
        const end = x === -2 || x === 2;
        const color = wrap !== undefined ? (x === 0 ? CITY_BAND : wrap) : end ? (d > radius - 1 || Math.abs(d - radius * 0.5) < 0.5 ? tones.dark : tones.base) : y + 0.5 > radius * 1.4 ? tones.light : tones.base;
        model.set(x, y, z + dz, color);
      }
    }
  }
}

const hayBale: Builder = (seed) => {
  const kind = of(seed, ['round', 'pair', 'wrapped', 'square', 'round', 'stack', 'wrapped', 'pair']);
  const model = new VoxelModel();
  if (kind === 'round') roundBale(model, 0, 3.2, STRAW);
  if (kind === 'pair') {
    roundBale(model, -2, 2.6, STRAW);
    roundBale(model, 2, 2.6, STRAW);
  }
  if (kind === 'wrapped') roundBale(model, 0, 3.2, STRAW, seed === 2 ? 0xe4e2da : 0x2a2c2a);
  if (kind === 'square' || kind === 'stack') {
    model.fill(-3, 0, -2, 2, 2, 1, STRAW.base).fill(-3, 2, -2, 2, 2, 1, STRAW.light);
    model.fill(-2, 0, -2, -2, 2, 1, STRAW.dark).fill(1, 0, -2, 1, 2, 1, STRAW.dark);
    if (kind === 'stack') model.fill(-2, 3, -1, 3, 5, 2, STRAW.base).fill(-2, 5, -1, 3, 5, 2, STRAW.light).fill(0, 3, -1, 0, 5, 2, STRAW.dark);
  }
  return parts(model, 8);
};

function rock(model: VoxelModel, cx: number, cz: number, rx: number, ry: number, rz: number, tones: Tones, salt: number): void {
  ellipsoid(model, cx, ry * 0.45, cz, rx, ry, rz, tones, salt, 0.7, -1);
}

const boulder: Builder = (seed) => {
  const kind = of(seed, ['single', 'split', 'cluster', 'single', 'flat', 'cluster', 'single', 'split']);
  const size = of(seed, [1, 0.85, 1.1, 0.9, 1.15, 0.95, 1.05, 0.8]);
  const model = new VoxelModel();
  if (kind === 'single') rock(model, 0, 0, 3.4 * size, 3 * size, 3 * size, STONE, seed + 3);
  if (kind === 'flat') rock(model, 0, 0, 3.9 * size, 1.8 * size, 3.4 * size, STONE, seed + 3);
  if (kind === 'split') {
    rock(model, -1.6, 0, 2 * size, 2.8 * size, 2.8 * size, STONE, seed + 3);
    rock(model, 1.8, 0.4, 1.8 * size, 2.5 * size, 2.6 * size, STONE, seed + 5);
  }
  if (kind === 'cluster') {
    rock(model, -1.2, -0.8, 2.4 * size, 2.4 * size, 2.2 * size, STONE, seed + 3);
    rock(model, 2, 1.4, 1.6 * size, 1.6 * size, 1.5 * size, STONE, seed + 5);
    rock(model, -2.4, 2.4, 1.2 * size, 1.2 * size, 1.2 * size, STONE, seed + 7);
  }
  if (seed === 2 || seed === 4 || seed === 7) dots(model, 0, 1.6 * size, 0, 2.6 * size, 1.8 * size, 2.4 * size, 4, LICHEN, seed, 0.5, 0.95);
  return parts(model, Math.ceil(4 * size) + 2);
};

function slab(model: VoxelModel, x: number, z: number, width: number, depth: number, height: number, tilt: number, tones: Tones, strata: number): void {
  for (let y = -1; y < height; y++) {
    const ox = Math.round(tilt * Math.max(0, y));
    const top = y === height - 1;
    const band = Math.floor((y + strata) / 3) % 3;
    const color = top ? tones.light : band === 0 ? tones.base : band === 1 ? mix(tones.base, tones.light, 0.4) : tones.dark;
    const inset = y > height * 0.7 ? 1 : 0;
    model.fill(x + ox + inset, y, z + inset, x + ox + width - 1 - inset, y, z + depth - 1 - inset, color);
  }
}

const rockOutcrop: Builder = (seed) => {
  const tones = seed % 3 === 0 ? DARK_STONE : STONE;
  const model = new VoxelModel();
  const count = of(seed, [2, 3, 2, 4, 3, 2, 3, 4]);
  let top = 0;
  for (let i = 0; i < count; i++) {
    const angle = i * GOLDEN + seed * 0.7;
    const reach = i === 0 ? 0 : 3.6;
    const width = 5 + ((seed + i) % 3);
    const depth = 4 + ((seed + i * 2) % 3);
    const height = Math.max(4, of(seed + i, [14, 10, 16, 8, 12, 15, 9, 13]) - i * 3);
    const x = Math.round(Math.cos(angle) * reach) - Math.floor(width / 2);
    const z = Math.round(Math.sin(angle) * reach) - Math.floor(depth / 2);
    slab(model, Math.max(-8, Math.min(7 - width, x)), Math.max(-8, Math.min(7 - depth, z)), width, depth, height, of(seed + i, [0.2, -0.15, 0.1, -0.25, 0]), tones, i);
    top = Math.max(top, height);
  }
  if (seed === 1 || seed === 4) dots(model, 0, top * 0.5, 0, 4, top * 0.5, 4, 5, LICHEN, seed, 0.6, 0.95);
  return parts(model, top + 2);
};

const obsidianOutcrop: Builder = (seed) => {
  const glow = of(seed, [0xc79bff, 0x7fd8ff, 0xc79bff, 0xff7ad0]);
  const model = new VoxelModel();
  const count = of(seed, [4, 5, 6, 4, 7, 5, 6, 4]);
  let top = 0;
  for (let i = 0; i < count; i++) {
    const angle = i * GOLDEN + seed;
    const reach = i === 0 ? 0 : 2 + (i % 3) * 1.4;
    const bx = Math.round(Math.cos(angle) * reach);
    const bz = Math.round(Math.sin(angle) * reach);
    const height = Math.max(5, of(seed + i, [17, 12, 15, 9, 14, 11, 18, 10]) - i * 2);
    const lean = 0.12 + (i % 2) * 0.08;
    for (let y = -1; y < height; y++) {
      const half = y < height * 0.35 ? 1 : y < height * 0.75 ? 0.5 : 0;
      const ox = bx + Math.round(Math.sign(bx || 1) * lean * Math.max(0, y));
      const oz = bz + Math.round(Math.sign(bz || 1) * lean * Math.max(0, y));
      const color = y >= height - 1 ? OBSIDIAN.sheen : y % 4 === 3 ? OBSIDIAN.edge : OBSIDIAN.body;
      model.fill(ox - Math.ceil(half), y, oz - Math.ceil(half), ox + Math.floor(half + 0.5), y, oz + Math.floor(half + 0.5), color);
    }
    if (i === 0 && seed % 2 === 0) model.fill(bx + 1, 2, bz, bx + 1, Math.min(height - 3, 7), bz, glow, VOXEL_EMISSIVE);
    top = Math.max(top, height);
  }
  return parts(model, top + 1);
};

const glassCrystals: Builder = (seed) => {
  const tint = of(seed, [0x8fd8d0, 0xb49cf0, 0x9cc8f0, 0x8fd8d0, 0xb49cf0, 0xe0b8f0, 0x8fd8d0, 0xb49cf0]);
  const body = darken(tint, 0.3);
  const face = darken(tint, 0.12);
  const model = new VoxelModel();
  const count = of(seed, [3, 4, 5, 3, 6, 4, 5, 3]);
  let top = 0;
  for (let i = 0; i < count; i++) {
    const angle = i * GOLDEN + seed * 1.3;
    const reach = i === 0 ? 0 : 1.5 + (i % 2);
    const bx = Math.round(Math.cos(angle) * reach);
    const bz = Math.round(Math.sin(angle) * reach);
    const height = Math.max(3, of(seed + i, [10, 7, 12, 6, 9, 11, 8, 5]) - i * 2);
    const thick = i === 0 || height > 7;
    const lean = i === 0 ? 0 : 0.25;
    for (let y = -1; y < height; y++) {
      const ox = bx + Math.round(Math.sign(bx || 1) * lean * Math.max(0, y));
      const oz = bz + Math.round(Math.sign(bz || -1) * lean * Math.max(0, y));
      const tip = y >= height - 2;
      const wide = thick && y < height - 2;
      model.fill(ox, y, oz, ox + (wide ? 1 : 0), y, oz + (wide ? 1 : 0), tip ? lighten(tint, 0.15) : y % 3 === 0 ? face : body, tip ? VOXEL_EMISSIVE : undefined);
    }
    top = Math.max(top, height);
  }
  return parts(model, top + 1);
};

const fusedShards: Builder = (seed) => {
  const model = new VoxelModel();
  const tones: Tones = { light: 0x8eaea8, base: 0x627e7a, dark: 0x3c524e };
  const count = of(seed, [4, 3, 5, 4, 3, 5, 4, 3]);
  for (let i = 0; i < count; i++) {
    const angle = i * GOLDEN + seed;
    const x = Math.round(Math.cos(angle) * 2.2) - 1;
    const z = Math.round(Math.sin(angle) * 2.2) - 1;
    const w = 2 + ((seed + i) % 2);
    model.fill(x, 0, z, x + w - 1, 0, z + 1, i % 2 === 0 ? tones.base : tones.dark).set(x, 0, z, tones.light);
  }
  const shards = of(seed, [1, 2, 1, 0, 2, 1, 2, 1]);
  for (let i = 0; i < shards; i++) {
    const x = i === 0 ? 1 : -2;
    const z = i === 0 ? -1 : 1;
    const height = 2 + ((seed + i) % 3);
    for (let y = 0; y < height; y++) model.set(x + (y > 1 ? 1 : 0), y, z, y === height - 1 ? tones.light : tones.base);
  }
  return parts(model, 5);
};

const METALS = [0x6a4a3a, STEEL, 0x8a5a3a, 0x3a4a52, 0x7a6a5a] as const;

const scrapMound: Builder = (seed) => {
  const model = new VoxelModel();
  const peak = of(seed, [7, 5, 9, 6, 8, 5, 7, 9]);
  for (let i = 0; i < 14; i++) {
    const angle = i * GOLDEN + seed;
    const reach = (i / 14) * 3.4;
    const x = Math.round(Math.cos(angle) * reach) - 1;
    const z = Math.round(Math.sin(angle) * reach) - 1;
    const lift = Math.max(0, Math.round(peak * (1 - reach / 3.8)) - 2);
    const w = 2 + (i % 3);
    const d = 1 + ((i + seed) % 2);
    model.fill(x, lift, z, x + w - 1, lift + 1 + (i % 2), z + d, METALS[(i + seed) % METALS.length] as number);
  }
  if (seed % 2 === 0) line(model, [-2, 1, 1], [1, peak + 3, -1], RUST_DARK);
  if (seed === 3 || seed === 7) model.fill(1, 0, 1, 2, 3, 2, 0x2f4a6a).set(1, 3, 1, RUST);
  if (seed === 5) model.fill(-3, 0, -3, -3, 3, 0, 0x2f5a8a);
  return parts(model, peak + 4);
};

function tyre(model: VoxelModel, cx: number, cy: number, cz: number, upright: boolean, rim: number): void {
  for (let a = -3; a <= 3; a++) {
    for (let b = -3; b <= 3; b++) {
      const d = Math.hypot(a, b);
      if (d > 3.2 || d < 1.4) continue;
      const color = d < 2 ? rim : RUBBER;
      if (upright) model.fill(cx + a, cy + b, cz, cx + a, cy + b, cz + 1, color);
      else model.fill(cx + a, cy, cz + b, cx + a, cy + 1, cz + b, color);
    }
  }
}

const tyreHeap: Builder = (seed) => {
  const model = new VoxelModel();
  const stack = of(seed, [3, 2, 4, 1, 3, 2, 1, 4]);
  const rim = seed === 5 ? 0x6a4a3a : 0x2c2c2e;
  for (let i = 0; i < stack; i++) tyre(model, (i % 2) - (seed % 2), i * 2, ((i + seed) % 3) - 1, false, rim);
  if (stack <= 2) tyre(model, 2, 3, 3, true, rim);
  if (seed === 3) model.fill(-3, 1, -1, -3, 1, 1, 0xb8b4a8);
  if (seed === 6) tyre(model, -3, 0, 3, false, rim);
  return parts(model, stack * 2 + 3);
};

const wreckedPanel: Builder = (seed) => {
  const model = new VoxelModel();
  const width = of(seed, [7, 6, 7, 5, 6, 7, 5, 6]);
  const height = of(seed, [11, 9, 13, 8, 12, 10, 9, 12]);
  const tilt = of(seed, [0.3, 0.2, 0.4, 0.25]);
  const stripe = of(seed, [0x2f5a8a, CITY_BAND, 0x2f5a8a, 0xd8d6cc]);
  const hole = seed === 2 || seed === 5;
  for (let y = -2; y < height; y++) {
    const z = -2 + Math.round(tilt * Math.max(0, y));
    for (let x = -width; x <= width; x++) {
      const ragged = height - Math.floor(noise3(x >> 1, seed, 0, 77) * 3);
      if (y >= ragged) continue;
      if (hole && y >= 4 && y <= 6 && x >= -1 && x <= 1) continue;
      const rusty = noise3(x >> 2, y >> 2, seed, 79) > 0.62;
      const color = y === 4 || y === 5 ? stripe : rusty ? RUST : y % 4 === 0 ? darken(STEEL, 0.12) : STEEL;
      model.set(x, y, z, color);
      if (x % 4 === 0 && y < ragged - 1) model.set(x, y, z + 1, RUST_DARK);
    }
  }
  model.fill(-width, -1, -1, width, 0, 0, RUST_DARK);
  return parts(model, height + 2);
};

const overgrownPlanter: Builder = (seed) => {
  const kind = of(seed, ['shrub', 'sapling', 'weeds', 'shrub', 'spill', 'sapling', 'cracked', 'weeds']);
  const tones = of(seed, LEAF);
  const model = new VoxelModel();
  model.fill(-3, 0, -3, 2, 2, 2, CONCRETE.base).fill(-3, 2, -3, 2, 2, 2, CONCRETE.light).fill(-2, 2, -2, 1, 2, 1, 0x3a2e22);
  model.fill(-3, 0, -3, 2, 0, 2, CONCRETE.dark);
  if (kind === 'cracked') {
    for (let x = 1; x <= 2; x++) for (let z = 1; z <= 2; z++) for (let y = 1; y <= 2; y++) model.remove(x, y, z);
    model.set(3, 0, 3, CONCRETE.light);
  }
  if (kind === 'shrub' || kind === 'cracked' || kind === 'spill') ellipsoid(model, kind === 'spill' ? 1 : 0, 5, 0, 3.2, 2.6, 3.2, tones, seed + 31, 0.5, 3);
  if (kind === 'spill') model.fill(3, 1, -1, 3, 3, -1, tones.dark).fill(3, 0, 1, 3, 3, 1, tones.base);
  if (kind === 'sapling') {
    model.fill(0, 3, 0, 0, 8, 0, BARK.base);
    ellipsoid(model, 0.5, 9.5, 0.5, 2.6, 2.4, 2.6, tones, seed + 33, 0.4);
  }
  if (kind === 'weeds') for (let i = 0; i < 6; i++) model.fill(-2 + (i % 4), 3, -2 + Math.floor(i * 0.7), -2 + (i % 4), 3 + ((i + seed) % 3), -2 + Math.floor(i * 0.7), i % 2 === 0 ? tones.base : tones.light);
  if (seed === 1 || seed === 4) model.fill(-1, 1, 3, 0, 1, 3, seed === 1 ? 0xff4fa8 : 0x4fe3ff);
  return parts(model, kind === 'sapling' ? 13 : 9);
};

const rubbleHeap: Builder = (seed) => {
  const model = new VoxelModel();
  const peak = of(seed, [4, 3, 6, 4, 5, 3, 6, 5]);
  const count = of(seed, [9, 7, 11, 8, 10, 7, 11, 9]);
  const tones = [CONCRETE.base, CONCRETE.light, CONCRETE.dark] as const;
  for (let i = 0; i < count; i++) {
    const angle = i * GOLDEN + seed;
    const reach = (i / count) * 3.2;
    const x = Math.round(Math.cos(angle) * reach) - 1;
    const z = Math.round(Math.sin(angle) * reach) - 1;
    const lift = Math.max(0, Math.round(peak * (1 - reach / 3.6)) - 1);
    const size = 1 + ((i + seed) % 2);
    model.fill(x, lift, z, x + size, lift + size - 1, z + size, tones[(i + seed) % 3] as number);
  }
  if (seed % 3 !== 1) line(model, [0, 1, 0], [2, peak + 2, -1], 0x7a4a2a);
  if (seed % 2 === 1) line(model, [-1, 1, 1], [-3, peak + 1, 2], 0x7a4a2a);
  return parts(model, peak + 3);
};

const ruinWall: Builder = (seed) => {
  const tones: Tones = { light: 0x9c978a, base: 0x857f74, dark: 0x5e5a52 };
  const shape = of(seed, ['ramp', 'peak', 'notch', 'stub', 'corner', 'ramp', 'peak', 'corner']);
  const tall = of(seed, [13, 10, 14, 7, 12, 11, 12, 9]);
  const ivy = seed === 1 || seed === 4 || seed === 6;
  const model = new VoxelModel();
  const profile = (x: number): number => {
    const t = (x + 8) / 15;
    const jag = noise3(x >> 1, seed, 1, 83) > 0.5 ? 1 : 0;
    if (shape === 'ramp') return Math.round(tall * (1 - t * 0.7)) - jag;
    if (shape === 'peak') return Math.round(tall * (1 - Math.abs(t - 0.45) * 1.3)) - jag;
    if (shape === 'stub') return tall - jag * 2 - (x > 2 ? 3 : 0);
    return tall - jag;
  };
  for (let x = -7; x <= 6; x++) {
    const top = Math.max(2, profile(x));
    for (let y = -1; y < top; y++) {
      if (shape === 'notch' && x >= -2 && x <= 1 && y >= 4 && y <= 8) continue;
      const block = Math.floor((x + 8 + (Math.floor(y / 2) % 2) * 2) / 4);
      const color = y >= top - 1 ? tones.light : y < 1 ? tones.dark : (block + Math.floor(y / 2)) % 3 === 0 ? mix(tones.base, tones.dark, 0.3) : tones.base;
      model.fill(x, y, -1, x, y, 0, color);
    }
  }
  if (shape === 'corner') {
    const top = Math.max(2, profile(6));
    for (let y = -1; y < top; y++) model.fill(5, y, 1, 6, y, 3, y >= top - 1 ? tones.light : tones.base);
  }
  if (ivy) for (const x of [-5, -4, -3, 2, 3]) {
    const top = Math.max(2, profile(x));
    model.fill(x, Math.max(0, top - 5 + (x % 2)), 1, x, top - 1, 1, x % 2 === 0 ? 0x3f6a30 : 0x4f7a3a);
  }
  model.fill(-3, 0, 2, -2, 0, 3, tones.base).set(3, 0, -3, tones.dark).set(1, 1, 2, tones.light).set(1, 0, 2, tones.base);
  return parts(model, tall + 2);
};

function log(model: VoxelModel, x0: number, x1: number, radius: number, z: number, lift: number): void {
  const reach = Math.ceil(radius);
  for (let y = -reach; y <= reach; y++) {
    for (let dz = -reach; dz <= reach; dz++) {
      const d = Math.hypot(y + 0.5, dz + 0.5);
      if (d > radius) continue;
      for (let x = x0; x <= x1; x++) {
        const end = x === x0 || x === x1;
        const color = end ? (d < 0.9 ? WOOD.core : d > radius - 0.9 ? BARK.dark : WOOD.face) : y > radius * 0.5 ? BARK.light : y < -radius * 0.4 ? BARK.dark : BARK.base;
        model.set(x, y + lift, z + dz, color);
      }
    }
  }
}

const treeStump: Builder = (seed) => {
  const radius = of(seed, [2, 2.4, 1.8, 2.2, 2.6, 2, 2.4, 1.8]);
  const height = seed === 7 ? 4 : of(seed, [2, 3, 2, 3]);
  const model = new VoxelModel();
  const reach = Math.ceil(radius);
  for (let x = -reach; x <= reach; x++) {
    for (let z = -reach; z <= reach; z++) {
      const d = Math.hypot(x + 0.5, z + 0.5);
      if (d > radius) continue;
      const splinter = seed === 7 && d > radius - 1 && noise3(x, z, seed, 5) > 0.5 ? 1 : 0;
      model.fill(x, -1, z, x, height - 2 + splinter, z, BARK.base);
      model.set(x, height - 1 + splinter, z, splinter ? BARK.light : d < 0.9 ? WOOD.core : d > radius - 0.8 ? BARK.dark : seed === 3 && d < radius - 1.2 ? MOSS : WOOD.face);
    }
  }
  model.fill(-reach - 1, 0, 0, -reach - 1, 0, 0, BARK.dark).fill(reach, 0, -1, reach, 0, -1, BARK.dark).fill(0, 0, reach, 0, 0, reach, BARK.dark);
  if (seed === 1 || seed === 5) model.fill(reach, 0, 1, reach, 1, 1, 0xe8dcc8).set(reach, 2, 1, 0xc0402a).set(-reach, 0, -reach, 0xd8c8a8);
  if (seed === 6) model.fill(0, height, 0, 0, height + 2, 0, 0x6a5440).fill(-1, height, 0, -1, height + 1, 0, 0xa8b0b4);
  return parts(model, height + 3);
};

const fallenLog: Builder = (seed) => {
  const length = of(seed, [14, 12, 15, 11, 13, 14, 12, 15]);
  const radius = of(seed, [2.2, 2, 2.6, 2.4]);
  const model = new VoxelModel();
  const x0 = -Math.floor(length / 2);
  const x1 = x0 + length - 1;
  if (seed === 5) {
    log(model, x0, -1, radius, 0, Math.ceil(radius) - 1);
    log(model, 1, x1, radius - 0.2, 1, Math.ceil(radius) - 1);
  } else log(model, x0, x1, radius, 0, Math.ceil(radius) - 1);
  if (seed === 2) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) for (let x = x0; x <= x0 + 2; x++) model.remove(x, y + Math.ceil(radius) - 1, z);
  model.fill(-3, Math.ceil(radius * 2) - 1, 0, -3, Math.ceil(radius * 2), 0, BARK.base).fill(3, Math.ceil(radius) - 1, -Math.ceil(radius) - 1, 3, Math.ceil(radius) - 1, -Math.ceil(radius) - 2, BARK.base);
  if (seed === 1 || seed === 4) model.fill(x0 + 2, Math.ceil(radius * 2) - 1, -1, x0 + 7, Math.ceil(radius * 2) - 1, 0, MOSS);
  if (seed === 6) model.fill(0, 1, Math.ceil(radius) + 1, 1, 1, Math.ceil(radius) + 1, 0xc8a878).fill(-4, 2, Math.ceil(radius) + 1, -3, 2, Math.ceil(radius) + 1, 0xc8a878);
  return parts(model, Math.ceil(radius * 2) + 2);
};

const FLOWERS = [0xf0ece0, 0xe8c840, 0x9a6ad8, 0xd83a2a, 0x5a8ae0, 0xf0ece0, 0xe88ab0, 0xe8902a] as const;

const wildflowers: Builder = (seed) => {
  const model = new VoxelModel();
  const leaf = of(seed, [0x5a823c, 0x6a8e42, 0x4f7636]);
  const head = FLOWERS[seed % FLOWERS.length] as number;
  const second = seed === 5 ? 0xe8c840 : seed === 0 ? 0x9a6ad8 : head;
  for (let i = 0; i < 12; i++) {
    const angle = i * GOLDEN + seed;
    const reach = Math.sqrt((i + 0.5) / 12) * 3.6;
    const x = Math.round(Math.cos(angle) * reach);
    const z = Math.round(Math.sin(angle) * reach);
    const height = 1 + ((i + seed) % 2);
    model.fill(x, 0, z, x, height - 1, z, i % 3 === 0 ? darken(leaf, 0.15) : leaf);
    if (i % 3 !== 2) model.set(x, height, z, i % 4 === 0 ? second : head);
  }
  return parts(model, 3);
};

const tallGrass: Builder = (seed) => {
  const model = new VoxelModel();
  const dry = seed === 3 || seed === 6;
  const tones: Tones = dry ? { light: 0xc8b878, base: 0xa89a5c, dark: 0x7e7444 } : { light: 0x8aa44c, base: 0x6a8a3a, dark: 0x4c6a2e };
  const lean = of(seed, [1, -1, 0, 1]);
  for (let i = 0; i < 14; i++) {
    const angle = i * GOLDEN + seed * 0.9;
    const reach = Math.sqrt((i + 0.5) / 14) * 3.4;
    const x = Math.round(Math.cos(angle) * reach);
    const z = Math.round(Math.sin(angle) * reach);
    const height = 2 + ((i * 7 + seed) % 4);
    model.fill(x, 0, z, x, height - 2, z, i % 2 === 0 ? tones.base : tones.dark);
    model.set(x + (height > 3 ? lean : 0), height - 1, z, i % 5 === 0 ? 0xd8c88a : tones.light);
  }
  return parts(model, 6);
};

export const NATURE_BUILDERS: Readonly<Record<NatureModel, Builder>> = {
  broadleafTree,
  birchTree,
  orchardTree,
  windbentPine,
  deadTree,
  bush,
  hedgerow,
  fieldWall,
  hayBale,
  boulder,
  rockOutcrop,
  obsidianOutcrop,
  glassCrystals,
  fusedShards,
  scrapMound,
  tyreHeap,
  wreckedPanel,
  overgrownPlanter,
  rubbleHeap,
  ruinWall,
  treeStump,
  fallenLog,
  wildflowers,
  tallGrass,
};
