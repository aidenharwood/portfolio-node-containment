import { Group, Vector3 } from 'three';
import { darken, jitter, lighten, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS, VOXEL_SOLID, type VoxelKind } from '../voxel/voxelKinds.ts';
import { ACTOR_OPTIONS, createVoxelObject } from '../voxel/voxelMaterials.ts';
import type { VoxelMeshes } from '../voxel/voxelMesher.ts';
import { VoxelModel, type Paint } from '../voxel/voxelModel.ts';
import { CHARACTER_VOXEL_SIZE } from '../world/worldScale.ts';
import { swingCurve, type EntityPose, type EntityRig } from './entityRig.ts';

type Gait = 'scurry' | 'hop' | 'trot' | 'hover' | 'drift' | 'loom';

interface CreatureLook {
  readonly build: () => VoxelModel;
  readonly gait: Gait;
  readonly scale?: number;
  readonly muzzle?: readonly [number, number, number];
  readonly accent?: number;
  readonly spin?: boolean;
}

const GAIT_CADENCE: Readonly<Record<Gait, number>> = { scurry: 2.2, trot: 1.4, hop: 1, loom: 0.5, hover: 1, drift: 1 };

const AIRBORNE: ReadonlySet<Gait> = new Set(['hover', 'drift']);

const SPIRITS: ReadonlySet<string> = new Set(['lamplighter', 'tideWraith', 'vaultEcho', 'crateWisp']);

type StrikeKey = readonly [number, number, 'in' | 'out' | 'hold'];

const STRIKE: readonly StrikeKey[] = [[0, 0, 'out'], [0.35, -0.25, 'out'], [0.45, 1, 'in'], [0.6, 1, 'hold'], [1, 0, 'out']];

export function creatureStrike(progress: number | null): number {
  if (progress === null) return 0;
  const t = Math.min(1, Math.max(0, progress));
  let index = 0;
  while (index < STRIKE.length - 2 && t > STRIKE[index + 1]![0]) index++;
  const [startAt, from] = STRIKE[index]!;
  const [endAt, to, ease] = STRIKE[index + 1]!;
  const raw = endAt > startAt ? (t - startAt) / (endAt - startAt) : 1;
  const shaped = ease === 'in' ? raw ** 3 : ease === 'out' ? 1 - (1 - raw) ** 3 : raw;
  return from + (to - from) * shaped;
}

const fur = (color: number, salt: number): Paint => (x, y, z) => jitter(color, 0.07, noise3(x, y, z, salt));

const mod = (value: number, by: number): number => ((value % by) + by) % by;

const trainingDrone = (): VoxelModel => {
  const shell = 0xd8d6cc;
  const model = new VoxelModel().fill(-4, 8, -4, 3, 14, 3, (x, y, z) => (noise3(x, y, z, 3) > 0.9 ? darken(shell, 0.25) : jitter(shell, 0.02, noise3(x, y, z, 2))));
  model.paintExisting(-4, 14, -4, 3, 14, 3, (x, _y, z) => {
    const ring = Math.max(Math.abs(x + 0.5), Math.abs(z + 0.5));
    return ring > 3 ? 0xe86a1c : ring > 2 ? 0xd8d6cc : ring > 1 ? 0xe86a1c : 0xd8322a;
  });
  model.fill(-4, 11, 4, 3, 11, 4, 0xe86a1c).fill(-1, 12, 4, 0, 13, 4, 0x4fe3ff, VOXEL_EMISSIVE);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const cx = sx > 0 ? 3 : -4;
    const cz = sz > 0 ? 3 : -4;
    const tx = cx + 2 * sx;
    const tz = cz + 2 * sz;
    model.set(cx + sx, 13, cz, 0x2a2e31).set(cx + sx, 13, cz + sz, 0x2a2e31).set(tx, 13, cz + sz, 0x2a2e31).set(tx, 13, tz, 0x2a2e31);
    model.fill(tx - 1, 14, tz - 1, tx + 1, 14, tz + 1, 0x9aa4ac, VOXEL_GLASS).set(tx, 14, tz, 0x2a2e31);
  }
  model.fill(-2, 6, -2, 1, 7, 1, 0x2a2e31);
  return model;
};

const crateWisp = (): VoxelModel => {
  const glow = 0xb6ff4f;
  const model = new VoxelModel();
  for (let x = -3; x <= 3; x++) for (let y = 6; y <= 13; y++) for (let z = -3; z <= 3; z++) {
    if (Math.hypot(x, (y - 9.5) * 0.9, z) <= 3.4 - noise3(x, y, z, 5) * 0.8) model.set(x, y, z, jitter(glow, 0.12, noise3(x, y, z, 6)), VOXEL_EMISSIVE);
  }
  model.fill(-2, 8, -1, 1, 12, 2, (x, y, z) => jitter(glow, 0.12, noise3(x, y, z, 6)), VOXEL_EMISSIVE);
  model.fill(-1, 12, -1, 0, 13, 0, glow, VOXEL_EMISSIVE);
  model.fill(-3, 14, -1, 2, 14, 1, 0x8a6a3a).set(-3, 14, 0, 0x5a5a5a).set(2, 14, 0, 0x5a5a5a);
  model.fill(-1, 10, 3, -1, 11, 3, 0x1a2a10).fill(1, 10, 3, 1, 11, 3, 0x1a2a10).fill(0, 10, 3, 0, 11, 3, glow, VOXEL_EMISSIVE);
  return model;
};

const canalRat = (): VoxelModel => {
  const hide = 0x6e5a4a;
  const pink = 0xd89a9a;
  const model = new VoxelModel().fill(-2, 1, -4, 1, 4, 3, fur(hide, 3)).fill(-1, 5, -2, 0, 5, 1, fur(hide, 3));
  model.fill(-2, 1, 4, 1, 3, 5, fur(lighten(hide, 0.1), 4)).fill(-1, 1, 6, 0, 2, 7, fur(lighten(hide, 0.2), 4)).fill(-1, 2, 8, 0, 2, 8, pink);
  model.set(-2, 3, 5, 0xff4f4f, VOXEL_EMISSIVE).set(1, 3, 5, 0xff4f4f, VOXEL_EMISSIVE);
  model.fill(-2, 4, 4, -2, 5, 4, pink).fill(1, 4, 4, 1, 5, 4, pink);
  model.fill(-1, 2, -6, 0, 2, -5, pink).fill(0, 1, -7, 0, 2, -7, pink).fill(0, 1, -9, 0, 1, -8, pink);
  for (const x of [-2, 1]) for (const z of [-3, 2]) model.fill(x, 0, z, x, 0, z + 1, darken(hide, 0.3));
  return model;
};

const pigeon = (): VoxelModel => {
  const grey = 0x7a7f8a;
  const model = new VoxelModel().fill(-2, 2, -3, 1, 6, 2, fur(grey, 7)).fill(-1, 6, 1, 0, 9, 3, fur(lighten(grey, 0.1), 8));
  model.paintExisting(-1, 6, 1, 0, 7, 3, (_x, y, z) => ((y + z) % 2 === 0 ? 0x4a8a6a : 0x7a4a8a));
  model.set(-2, 8, 2, 0xff8a3a).set(1, 8, 2, 0xff8a3a);
  model.fill(-1, 7, 4, 0, 7, 4, 0x6a5a5a).fill(-1, 8, 4, 0, 8, 4, 0xe8e0d8);
  model.fill(-3, 3, -3, -3, 5, 1, darken(grey, 0.2)).fill(2, 3, -3, 2, 5, 1, darken(grey, 0.2));
  model.fill(-2, 4, -5, 1, 4, -4, darken(grey, 0.15)).fill(-2, 4, -6, 1, 4, -6, darken(grey, 0.5));
  model.fill(-2, 0, 0, -2, 1, 0, 0xd85a5a).fill(1, 0, 0, 1, 1, 0, 0xd85a5a).set(-2, 0, 1, 0xd85a5a).set(1, 0, 1, 0xd85a5a);
  return model;
};

const canine = (model: VoxelModel, coat: Paint, muzzle: Paint, dark: number, kind: VoxelKind, eyes: number, eyeKind: VoxelKind): VoxelModel => {
  model.fill(-3, 5, -7, 2, 10, 5, coat, kind).fill(-2, 9, 6, 1, 13, 9, coat, kind).fill(-1, 9, 10, 0, 11, 12, muzzle, kind);
  model.fill(-1, 11, 13, 0, 11, 13, 0x1a1a1a);
  model.set(-2, 12, 9, eyes, eyeKind).set(1, 12, 9, eyes, eyeKind);
  model.fill(-2, 14, 7, -2, 15, 8, dark, kind).fill(2, 11, 7, 2, 13, 8, dark, kind);
  model.fill(-1, 10, -9, 0, 11, -8, coat, kind).fill(-1, 11, -10, 0, 13, -10, coat, kind);
  for (const x of [-3, 1]) for (const z of [-6, 4]) model.fill(x, 0, z, x + 1, 4, z + 1, dark, kind);
  return model;
};

const strayDog = (): VoxelModel => {
  const coat = 0x8a6a42;
  const model = canine(new VoxelModel(), fur(coat, 11), fur(lighten(coat, 0.15), 13), darken(coat, 0.3), VOXEL_SOLID, 0x1a1a1a, VOXEL_SOLID);
  model.paintExisting(-1, 9, 10, 0, 9, 12, darken(coat, 0.4));
  model.paintExisting(-3, 10, -6, 2, 10, 3, (x, y, z) => (noise3(x, y, z, 16) > 0.4 ? darken(coat, 0.25) : null));
  model.paintExisting(-3, 5, -7, 2, 10, 5, (x, y, z) => (noise3(x, y, z, 17) > 0.85 ? lighten(coat, 0.2) : null));
  model.paintExisting(-2, 9, 6, 1, 10, 6, 0xc84a4a);
  return model;
};

const gutterMite = (): VoxelModel => {
  const shell = 0x52683a;
  const glow = 0xb6ff4f;
  const model = new VoxelModel().fill(-3, 1, -3, 2, 4, 3, fur(shell, 21)).fill(-2, 5, -2, 1, 5, 2, fur(lighten(shell, 0.15), 22));
  const leg = darken(shell, 0.35);
  for (const z of [-2, 0, 2]) {
    model.fill(-4, 2, z, -4, 3, z, leg).set(-5, 3, z, leg).fill(-6, 0, z, -6, 3, z, leg);
    model.fill(3, 2, z, 3, 3, z, leg).set(4, 3, z, leg).fill(5, 0, z, 5, 3, z, leg);
  }
  model.set(-2, 3, 4, glow, VOXEL_EMISSIVE).set(1, 3, 4, glow, VOXEL_EMISSIVE).fill(-1, 1, 4, 0, 2, 4, 0x1a2010);
  model.set(-2, 5, -1, glow, VOXEL_EMISSIVE).set(0, 5, 1, glow, VOXEL_EMISSIVE).set(1, 5, -2, glow, VOXEL_EMISSIVE);
  model.paintExisting(-2, 2, -3, 1, 3, -3, glow, VOXEL_EMISSIVE);
  return model;
};

const siltEel = (): VoxelModel => {
  const skin = 0x2e403c;
  const model = new VoxelModel();
  for (let z = -10; z <= 9; z++) {
    const xc = Math.round(Math.sin(z * 0.45) * 2);
    if (z < -6) model.fill(xc - 1, 0, z, xc, 1, z, fur(skin, 23));
    else model.fill(xc - 2, 0, z, xc + 1, 2, z, fur(skin, 23));
    model.paintExisting(xc - 2, 0, z, xc + 1, 0, z, 0x4a5a4a);
    if (z >= -6 && z <= 5) model.fill(xc - 1, 3, z, xc, 3, z, 0x3a6a5a);
  }
  model.fill(-4, 0, 10, -1, 3, 12, fur(lighten(skin, 0.1), 24)).paintExisting(-3, 1, 12, -2, 1, 12, 0xd87a7a);
  model.set(-4, 3, 11, 0xffd23f, VOXEL_EMISSIVE).set(-1, 3, 11, 0xffd23f, VOXEL_EMISSIVE);
  return model;
};

const scrapCrawler = (): VoxelModel => {
  const plate = 0x6a4a3a;
  const model = new VoxelModel().fill(-5, 3, -6, 4, 8, 5, fur(plate, 25));
  for (const [x, door, handle] of [[-5, 0x8a3a2a, -6], [4, 0x3a5a7a, 5]] as const) {
    model.paintExisting(x, 4, -4, x, 7, 3, door).paintExisting(x, 6, -3, x, 7, 0, 0x6a8a9a).set(handle, 6, 1, 0xb0b0b0);
  }
  model.fill(-3, 4, 6, 2, 7, 8, 0x3a3f44).fill(-4, 6, 9, -3, 7, 11, 0x8a5a3a).fill(2, 6, 9, 3, 7, 11, 0x8a5a3a);
  model.set(-2, 7, 9, 0xffb35a, VOXEL_EMISSIVE).set(1, 7, 9, 0xffb35a, VOXEL_EMISSIVE);
  for (const z of [-5, -1, 3]) {
    model.fill(-8, 5, z, -6, 6, z + 1, 0x4a4f54).fill(-9, 1, z, -8, 6, z + 1, 0x5d666c).fill(-9, 0, z, -8, 0, z + 1, 0x2a2a2a);
    model.fill(5, 5, z, 7, 6, z + 1, 0x4a4f54).fill(7, 1, z, 8, 6, z + 1, 0x5d666c).fill(7, 0, z, 8, 0, z + 1, 0x2a2a2a);
  }
  for (const [x, z] of [[-3, -3], [1, 0], [-2, 3]] as const) for (let y = 9; y <= 11; y++) model.set(x, y, z, y % 2 === 0 ? 0x9a9a9a : 0x4a4a4a);
  return model;
};

const rustling = (): VoxelModel => {
  const metals = [0x6a4a3a, 0x5d666c, 0x8a5a3a, 0x3a4a52, 0x9a4a22];
  const model = new VoxelModel().fill(-3, 3, -2, 2, 15, 2, fur(0x3a3f44, 26));
  for (let i = 0; i < 18; i++) {
    const x = -5 + Math.floor(noise3(i, 0, 3, 27) * 7);
    const z = -4 + Math.floor(noise3(i, 1, 3, 27) * 5);
    const y = 3 + Math.floor(noise3(i, 2, 3, 27) * 12);
    model.fill(x, y, z, x + 2 + (i % 3), y + 2, z + 2, jitter(metals[i % 5] as number, 0.08, noise3(i, 4, 3, 28)));
  }
  model.fill(-4, 5, -3, -4, 10, 2, 0x1a1a1a);
  for (let y = 7; y <= 8; y++) for (let z = -1; z <= 0; z++) model.remove(-4, y, z);
  model.fill(-3, 0, -1, -2, 3, 0, 0x3a3f44).fill(1, 0, -1, 2, 3, 0, 0x3a3f44);
  model.fill(-1, 11, 3, 0, 12, 3, 0xe8a21c, VOXEL_EMISSIVE);
  return model;
};

const lineMimic = (): VoxelModel => {
  const coat = 0x4e4a5e;
  const paint = (x: number, y: number, z: number): number => jitter(coat, 0.06, noise3(x, y, z, 29));
  const model = new VoxelModel().fill(-4, 4, -2, 3, 17, 2, paint).fill(-5, 4, -3, 4, 6, 3, paint);
  model.fill(-6, 7, -1, -5, 17, 1, paint).fill(4, 7, -1, 5, 17, 1, paint).fill(-6, 5, 0, -6, 6, 0, 0x1a1a22).fill(5, 5, 0, 5, 6, 0, 0x1a1a22);
  model.paintExisting(-1, 13, 2, 0, 17, 2, 0xd8d0b8).paintExisting(-2, 13, 2, -2, 17, 2, darken(coat, 0.35)).paintExisting(1, 13, 2, 1, 17, 2, darken(coat, 0.35));
  model.set(0, 8, 3, 0xc8a03a).set(0, 10, 3, 0xc8a03a);
  model.set(-1, 12, 3, 0xffd23f, VOXEL_EMISSIVE).set(0, 12, 3, 0xffd23f, VOXEL_EMISSIVE);
  model.fill(-3, 0, -1, -2, 3, 0, 0xc84a4a).fill(1, 0, -1, 2, 3, 0, 0x4a7ac8);
  model.fill(-4, 18, 0, 3, 18, 0, 0x8a8a8a).fill(0, 19, 0, 0, 20, 0, 0x8a8a8a).fill(-2, 21, 0, 0, 21, 0, 0x8a8a8a).set(-2, 20, 0, 0x8a8a8a);
  return model;
};

const scrapMagpie = (): VoxelModel => {
  const black = 0x22222e;
  const model = new VoxelModel().fill(-2, 3, -3, 1, 7, 2, fur(black, 31)).fill(-1, 7, 1, 0, 9, 3, fur(black, 32));
  model.fill(-2, 3, -1, 1, 5, 2, 0xe8e8f0).fill(-2, 7, -2, -2, 7, 0, 0xe8e8f0).fill(1, 7, -2, 1, 7, 0, 0xe8e8f0);
  model.fill(-3, 4, -3, -3, 6, 1, 0x1e2a44).fill(2, 4, -3, 2, 6, 1, 0x1e2a44);
  model.fill(-1, 5, -6, 0, 6, -4, 0x2a3a6a).fill(-1, 6, -8, 0, 6, -7, 0x2a3a6a);
  model.set(-2, 8, 2, 0xd8a03a, VOXEL_EMISSIVE).set(1, 8, 2, 0xd8a03a, VOXEL_EMISSIVE);
  model.fill(-1, 8, 4, 0, 8, 5, 0x3a3a3a).fill(0, 7, 6, 0, 8, 6, 0xe8c84a, VOXEL_EMISSIVE);
  model.fill(-2, 0, 0, -2, 2, 0, 0x2a2a2a).fill(1, 0, 0, 1, 2, 0, 0x2a2a2a);
  return model;
};

const lamplighter = (): VoxelModel => {
  const body = 0x2c3c44;
  const lamp = 0xffb35a;
  const iron = 0x2a2e31;
  const model = new VoxelModel();
  for (let y = 0; y <= 41; y++) {
    const r = y < 6 ? 6 - y * 0.5 : y < 31 ? 3.5 : y < 33 ? 2 : 3;
    const rx = Math.round(r);
    const rz = Math.round(r * 0.7);
    model.fill(-rx, y, -rz, rx - 1, y, rz - 1, (x, yy, z) => jitter(body, 0.08, noise3(x, yy, z, 33)));
  }
  model.fill(-2, 37, 2, 1, 37, 2, lamp, VOXEL_EMISSIVE);
  model.fill(-7, 28, -1, 6, 30, 0, body).fill(-7, 13, -1, -6, 27, 0, body).fill(5, 18, -1, 6, 27, 0, body);
  model.fill(-7, 10, -1, -7, 12, -1, darken(body, 0.3)).fill(-6, 10, 0, -6, 12, 0, darken(body, 0.3));
  model.fill(4, 10, -2, 7, 14, 1, lamp, VOXEL_EMISSIVE);
  for (const x of [4, 7]) for (const z of [-2, 1]) model.fill(x, 10, z, x, 14, z, iron);
  model.fill(4, 9, -2, 7, 9, 1, iron).fill(4, 15, -2, 7, 15, 1, iron).fill(5, 16, -1, 6, 17, 0, iron);
  for (const x of [-3, -1, 2]) model.paintExisting(x, 6, 1, x, 26, 1, 0x3a5a60);
  model.fill(5, 7, -1, 5, 8, -1, 0x5a8a90);
  return model;
};

const mothLantern = (): VoxelModel => {
  const model = new VoxelModel().fill(-1, 10, -3, 0, 12, 2, fur(0x4a3a2a, 41));
  model.fill(-2, 6, -2, 1, 9, 1, 0xffd08a, VOXEL_EMISSIVE).fill(-1, 5, -1, 0, 5, 0, 0xe8a21c, VOXEL_EMISSIVE);
  for (const side of [-1, 1]) {
    for (let x = 1; x <= 7; x++) model.fill(side < 0 ? -1 - x : x, 11, -4 + Math.floor(x / 3), side < 0 ? -1 - x : x, 11, 3 - Math.floor(x / 2), x % 3 === 0 ? 0xe8a21c : 0x8a7a5a);
  }
  model.paintExisting(-6, 11, -1, -5, 11, 0, 0x2a2018).paintExisting(5, 11, -1, 6, 11, 0, 0x2a2018);
  model.paintExisting(-6, 11, 0, -6, 11, 0, 0xffd08a, VOXEL_EMISSIVE).paintExisting(6, 11, 0, 6, 11, 0, 0xffd08a, VOXEL_EMISSIVE);
  model.fill(-1, 10, 3, 0, 11, 3, 0x2a2018);
  for (const [x, z] of [[-1, 3], [-2, 3], [-2, 4], [-3, 4], [-3, 5], [0, 3], [1, 3], [1, 4], [2, 4], [2, 5]] as const) model.set(x, 12, z, 0x6a5a3a);
  return model;
};

const glassHound = (): VoxelModel => {
  const glass = 0x9fd6e6;
  const model = canine(new VoxelModel(), glass, 0xbfe6f0, 0x7fb6c6, VOXEL_GLASS, 0xe8a21c, VOXEL_EMISSIVE);
  model.fill(-1, 10, -6, 0, 10, 4, 0x5a7a8a).fill(-1, 8, 2, 0, 9, 3, 0xe8a21c, VOXEL_EMISSIVE);
  return model;
};

const hullKnocker = (): VoxelModel => {
  const shell = 0x4e626c;
  const dark = 0x2a3038;
  const paint = (x: number, y: number, z: number): number => jitter(shell, 0.08, noise3(x, y, z, 43));
  const model = new VoxelModel().fill(-9, 6, -6, 8, 9, 6, paint).fill(-8, 10, -5, 7, 10, 5, paint).fill(-6, 11, -4, 5, 11, 3, paint);
  model.fill(-7, 5, -4, 6, 5, 4, darken(shell, 0.3));
  model.paintExisting(-8, 10, -5, 7, 10, 5, (x) => (mod(x, 3) === 0 ? 0x8a4a2a : null));
  model.paintExisting(-6, 11, -4, 5, 11, 3, (x, y, z) => (noise3(x, y, z, 44) > 0.85 ? 0xc8c0a8 : null));
  for (const x of [-3, 2]) model.fill(x, 10, 6, x, 13, 6, dark).set(x, 14, 6, 0xc79bff, VOXEL_EMISSIVE);
  for (const side of [-1, 1]) {
    const at = (x: number): number => (side < 0 ? x : -1 - x);
    model.fill(at(-12), 6, 4, at(-10), 8, 7, dark).fill(at(-14), 5, 8, at(-10), 10, 10, paint);
    model.fill(at(-14), 8, 11, at(-11), 10, 13, paint).fill(at(-14), 5, 11, at(-11), 6, 13, paint);
    for (const z of [-6, -3, 0, 3]) model.fill(at(-12), 7, z, at(-10), 7, z, dark).fill(at(-13), 0, z, at(-13), 7, z, dark);
  }
  return model;
};

const tideWraith = (): VoxelModel => {
  const model = new VoxelModel();
  for (let y = 0; y <= 26; y++) {
    const r = y < 6 ? 1.5 : y < 12 ? 2.5 : y < 20 ? 3.5 : y === 20 ? 1.5 : 2.5;
    for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) {
      const d = Math.hypot(x, z);
      if (d > r) continue;
      const surface = d > r - 1;
      if (surface && y < 21 && noise3(x, y, z, 45) > 0.7) continue;
      if (surface && noise3(x, y, z, 47) > 0.65) model.set(x, y, z, 0x6ab8b0, VOXEL_GLASS);
      else model.set(x, y, z, jitter(y < 10 ? 0x35604c : 0x4a7060, 0.1, noise3(x, y, z, 46)));
    }
  }
  model.fill(-5, 8, 0, -4, 18, 0, 0x4a7060).fill(4, 8, 0, 5, 18, 0, 0x4a7060);
  for (const [x, z, bottom] of [[-3, 1, 5], [2, -2, 7], [1, 3, 4], [-1, -3, 8]] as const) model.fill(x, bottom, z, x, 12, z, 0x4a6a2a);
  model.set(-1, 23, 3, 0xc79bff, VOXEL_EMISSIVE).set(1, 23, 3, 0xc79bff, VOXEL_EMISSIVE).set(0, 23, 2, 0x35604c);
  return model;
};

const redTwin = (): VoxelModel => {
  const skin = 0xd8d6cc;
  const paint = (x: number, y: number, z: number): number => jitter(skin, 0.03, noise3(x, y, z, 51));
  const model = new VoxelModel();
  for (const cx of [-5, 4]) {
    model.fill(cx - 2, 0, -1, cx - 2, 11, 0, paint).fill(cx + 1, 0, -1, cx + 1, 11, 0, paint);
    model.fill(cx - 2, 12, -1, cx + 1, 21, 1, paint).fill(cx - 3, 20, -1, cx + 2, 21, 1, paint);
    model.fill(cx - 1, 22, 0, cx, 22, 0, paint).fill(cx - 2, 23, -1, cx + 1, 27, 2, paint);
  }
  model.fill(-8, 9, -1, -8, 19, 0, paint).fill(6, 9, -1, 6, 19, 0, paint);
  model.fill(-3, 13, -1, -3, 19, 0, paint).fill(1, 13, -1, 1, 19, 0, paint);
  model.fill(-2, 13, -1, 0, 14, 0, 0xd8322a);
  model.set(-5, 25, 3, 0xd8322a, VOXEL_EMISSIVE).set(3, 25, 3, 0xd8322a, VOXEL_EMISSIVE);
  return model;
};

const cellBreaker = (): VoxelModel => {
  const hide = 0x52383a;
  const paint = (x: number, y: number, z: number): number => jitter(hide, 0.08, noise3(x, y, z, 53));
  const model = new VoxelModel().fill(-5, 0, -2, -2, 7, 1, darken(hide, 0.3)).fill(1, 0, -2, 4, 7, 1, darken(hide, 0.3));
  model.fill(-6, 8, -3, 5, 23, 2, paint).fill(-9, 20, -3, 8, 25, 2, paint);
  model.fill(-10, 8, -2, -7, 19, 1, darken(hide, 0.2)).fill(6, 8, -2, 9, 19, 1, darken(hide, 0.2));
  model.fill(-11, 4, -3, -7, 7, 2, 0xd8d6cc).fill(6, 4, -3, 10, 7, 2, 0xd8d6cc);
  model.paintExisting(-5, 10, 2, 4, 21, 2, (x, y) => (x === -5 || x === 4 || y === 10 || y === 21 ? darken(hide, 0.35) : null));
  model.fill(-1, 14, 3, 0, 16, 3, 0xd8d6cc).fill(-3, 23, 3, 2, 23, 3, 0xd8322a, VOXEL_EMISSIVE);
  model.paintExisting(-9, 25, -3, 8, 25, 2, 0xe86a1c);
  return model;
};

const cordonStalker = (): VoxelModel => {
  const body = 0x3a3a46;
  const model = new VoxelModel();
  for (let y = 0; y <= 31; y++) {
    const inward = Math.min(3, Math.floor(y / 10));
    const color = y === 0 ? 0x2a2a2a : y === 9 || y === 19 ? 0xe86a1c : 0x5a6068;
    for (const [x0, x1] of [[-9 + inward, -8 + inward], [7 - inward, 8 - inward]] as const) {
      for (const [z0, z1] of [[-8 + inward, -7 + inward], [6 - inward, 7 - inward]] as const) model.fill(x0, y, z0, x1, y, z1, color);
    }
  }
  model.fill(-5, 30, -5, 4, 35, 4, (x, y, z) => jitter(body, 0.06, noise3(x, y, z, 55))).paintExisting(-5, 31, -5, 4, 31, 4, 0xe86a1c);
  model.fill(-1, 35, 3, 0, 44, 4, body).fill(-2, 42, 5, 1, 46, 9, body);
  model.fill(-1, 45, 10, 0, 45, 10, 0xd8322a, VOXEL_EMISSIVE).fill(-1, 47, 8, 0, 47, 8, 0xd8322a, VOXEL_EMISSIVE);
  return model;
};

const vaultEcho = (): VoxelModel => {
  const model = new VoxelModel();
  const part = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): void => {
    for (let y = y0; y <= y1; y++) {
      const shift = (y >= 8 && y <= 10) || (y >= 22 && y <= 23) ? 1 : 0;
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
        if (y % 3 === 0) model.set(x + shift, y, z, 0x7fd8ff, VOXEL_EMISSIVE);
        else if (noise3(x, y, z, 57) <= 0.8) model.set(x + shift, y, z, 0x3a7a9a, VOXEL_GLASS);
      }
    }
  };
  part(-3, 0, -1, -2, 15, 1);
  part(1, 0, -1, 2, 15, 1);
  part(-3, 14, -1, 2, 15, 1);
  part(-4, 16, -2, 3, 27, 1);
  part(-6, 15, -1, -5, 27, 0);
  part(4, 15, -1, 5, 27, 0);
  part(-1, 28, -1, 0, 28, 0);
  part(-3, 29, -3, 2, 35, 2);
  model.set(-2, 32, 3, 0xe8fbff, VOXEL_EMISSIVE).set(1, 32, 3, 0xe8fbff, VOXEL_EMISSIVE);
  return model;
};

const warden = (): VoxelModel => {
  const plate = 0x24323f;
  const core = 0x7fd8ff;
  const model = new VoxelModel();
  for (let y = 0; y <= 44; y++) {
    const r = y < 8 ? 9 - y * 0.5 : y < 34 ? 6 + Math.sin(y * 0.25) * 2 : 5;
    const rx = Math.round(r);
    const rz = Math.round(r * 0.6);
    const glassy = y > 12 && y < 34;
    for (let x = -rx; x <= rx - 1; x++) for (let z = -rz; z <= rz - 1; z++) {
      const shell = x === -rx || x === rx - 1 || z === -rz || z === rz - 1;
      if (!shell) model.set(x, y, z, glassy ? core : 0x0e1a26, glassy ? VOXEL_EMISSIVE : VOXEL_SOLID);
      else if (glassy && mod(x + rx - 1, 4) !== 0) model.set(x, y, z, 0x2a4458, VOXEL_GLASS);
      else model.set(x, y, z, jitter(plate, 0.08, noise3(x, y, z, 59)));
    }
  }
  model.fill(-16, 28, -2, -8, 31, 1, plate).fill(7, 28, -2, 15, 31, 1, plate);
  model.fill(-17, 14, -2, -14, 31, 1, plate).fill(13, 14, -2, 16, 31, 1, plate);
  model.fill(-17, 10, -2, -14, 13, 1, darken(plate, 0.3)).fill(13, 10, -2, 16, 13, 1, darken(plate, 0.3));
  model.fill(-18, 6, -3, -13, 9, 2, darken(plate, 0.3)).fill(12, 6, -3, 17, 10, 2, darken(plate, 0.3));
  model.fill(14, 0, -1, 15, 5, 0, 0xd8322a, VOXEL_EMISSIVE).fill(16, 0, -1, 17, 2, 0, 0xd8322a, VOXEL_EMISSIVE).fill(16, 4, -1, 16, 4, 0, 0xd8322a, VOXEL_EMISSIVE);
  model.fill(-3, 38, 3, 2, 40, 3, core, VOXEL_EMISSIVE).fill(-1, 45, -2, 0, 46, 1, core, VOXEL_EMISSIVE);
  for (let x = -6; x <= 5; x++) {
    if (x === 2 || x === 3) continue;
    for (let z = -3; z <= 2; z++) {
      if (Math.abs(z + 0.5) < 2 && Math.abs(x + 0.5) < 5) continue;
      const lift = x > 3 ? 1 : 0;
      model.fill(x, 41 + lift, z, x, 43 + lift, z, Math.floor((x + 6) / 2) % 2 === 0 ? 0xc99a1c : 0x17170f);
    }
  }
  return model;
};

const LOOKS: Readonly<Record<string, CreatureLook>> = {
  canalRat: { build: canalRat, gait: 'scurry' },
  pigeon: { build: pigeon, gait: 'hop' },
  strayDog: { build: strayDog, gait: 'trot' },
  trainingDrone: { build: trainingDrone, gait: 'hover', spin: true },
  crateWisp: { build: crateWisp, gait: 'drift', muzzle: [0, 9.5, 3], accent: 0xb6ff4f },
  gutterMite: { build: gutterMite, gait: 'scurry' },
  siltEel: { build: siltEel, gait: 'scurry' },
  scrapCrawler: { build: scrapCrawler, gait: 'scurry' },
  rustling: { build: rustling, gait: 'trot' },
  lineMimic: { build: lineMimic, gait: 'drift' },
  scrapMagpie: { build: scrapMagpie, gait: 'hop' },
  lamplighter: { build: lamplighter, gait: 'drift', muzzle: [5.5, 12, -0.5], accent: 0xffb35a },
  mothLantern: { build: mothLantern, gait: 'hover', muzzle: [-0.5, 6, 0], accent: 0xffd08a },
  glassHound: { build: glassHound, gait: 'trot' },
  hullKnocker: { build: hullKnocker, gait: 'scurry', scale: 1.8 },
  tideWraith: { build: tideWraith, gait: 'drift', muzzle: [0, 23, 3], accent: 0xc79bff },
  redTwin: { build: redTwin, gait: 'drift', muzzle: [-1, 14, 1], accent: 0xd8322a },
  cellBreaker: { build: cellBreaker, gait: 'trot' },
  cordonStalker: { build: cordonStalker, gait: 'trot' },
  vaultEcho: { build: vaultEcho, gait: 'drift', muzzle: [-0.5, 32, 3], accent: 0x7fd8ff },
  warden: { build: warden, gait: 'loom', scale: 1.8, muzzle: [-0.5, 39, 3.5], accent: 0x7fd8ff },
};

const TOP_SHEEN = 0.18;

const built = new Map<string, VoxelModel>();

export const CREATURE_LOOK_KEYS: readonly string[] = Object.keys(LOOKS);

export function buildCreatureModel(key: string): VoxelModel {
  let model = built.get(key);
  if (!model) {
    const raw = (LOOKS[key] as CreatureLook).build();
    model = new VoxelModel();
    for (const cell of raw.cells()) {
      const top = cell.kind === VOXEL_SOLID && !raw.has(cell.x, cell.y + 1, cell.z);
      model.set(cell.x, cell.y, cell.z, top ? lighten(cell.color, TOP_SHEEN) : cell.color, cell.kind);
    }
    built.set(key, model);
  }
  return model;
}

export const creatureLookScale = (key: string): number => (LOOKS[key] as CreatureLook).scale ?? 1;

export const creatureLookAirborne = (key: string): boolean => AIRBORNE.has((LOOKS[key] as CreatureLook).gait);

export const creatureLookAccent = (key: string): number | undefined => (LOOKS[key] as CreatureLook).accent;

const meshes = new Map<string, VoxelMeshes>();
const palettes = new Map<string, readonly number[]>();

const PALETTE_SAMPLES = 24;
const profiles = new Map<string, readonly (readonly [number, number])[]>();

function profileOf(key: string, look: CreatureLook): readonly (readonly [number, number])[] {
  let profile = profiles.get(key);
  if (!profile) {
    const lowest = new Map<number, number>();
    for (const cell of buildCreatureModel(key).cells()) lowest.set(cell.z, Math.min(lowest.get(cell.z) ?? Infinity, cell.y));
    const unit = CHARACTER_VOXEL_SIZE * (look.scale ?? 1);
    profile = [...lowest.entries()].flatMap(([z, y]) => [[z * unit, y * unit], [(z + 1) * unit, y * unit]] as const);
    profiles.set(key, profile);
  }
  return profile;
}

function paletteOf(key: string, look: CreatureLook): readonly number[] {
  let palette = palettes.get(key);
  if (!palette) {
    const cells = buildCreatureModel(key).cells();
    const stride = Math.max(1, Math.floor(cells.length / PALETTE_SAMPLES));
    palette = cells.filter((_cell, index) => index % stride === 0).slice(0, PALETTE_SAMPLES).map((cell) => cell.color);
    palettes.set(key, palette);
  }
  return palette;
}

class WardCreatureRig implements EntityRig {
  readonly root = new Group();
  readonly height: number;
  readonly airborne: boolean;
  readonly accent?: number;
  private readonly pivot = new Group();
  private readonly body: Group;
  private readonly look: CreatureLook;
  private readonly key: string;
  private readonly scale: number;

  constructor(key: string) {
    const look = LOOKS[key] as CreatureLook;
    this.look = look;
    this.key = key;
    this.height = ((buildCreatureModel(key).bounds?.max[1] ?? 1) * CHARACTER_VOXEL_SIZE) * (look.scale ?? 1);
    this.airborne = AIRBORNE.has(look.gait);
    if (look.accent !== undefined) this.accent = look.accent;
    let mesh = meshes.get(key);
    if (!mesh) {
      mesh = buildCreatureModel(key).mesh(CHARACTER_VOXEL_SIZE, [0, 0, 0]);
      meshes.set(key, mesh);
    }
    this.body = createVoxelObject(mesh, ACTOR_OPTIONS);
    this.scale = look.scale ?? 1;
    this.body.scale.setScalar(this.scale);
    this.pivot.position.y = this.height * 0.4;
    this.pivot.add(this.body);
    this.root.add(this.pivot);
  }

  palette(): readonly number[] {
    return paletteOf(this.key, this.look);
  }

  get spirit(): boolean {
    return SPIRITS.has(this.key);
  }

  muzzle(out: Vector3): boolean {
    const point = this.look.muzzle;
    if (!point) return false;
    this.root.updateMatrixWorld(true);
    this.body.localToWorld(out.set(point[0] * CHARACTER_VOXEL_SIZE, point[1] * CHARACTER_VOXEL_SIZE, point[2] * CHARACTER_VOXEL_SIZE));
    return true;
  }

  animate(pose: EntityPose): void {
    const strike = creatureStrike(pose.attackProgress);
    const reach = Math.max(0, strike);
    const hurt = swingCurve(pose.hurtProgress);
    const gait = this.look.gait;
    const step = pose.moving ? Math.abs(Math.sin(pose.walkPhase * GAIT_CADENCE[gait])) : 0;
    const fall = this.airborne ? (1 - (pose.dying ?? 0)) ** 2 : 1;
    const base = -this.height * 0.4;
    let lift = 0;
    let pitch = 0;
    let yaw = 0;
    let roll = 0;
    let pulse = 1;
    let forward = strike * 0.3 - hurt * 0.1;
    switch (gait) {
      case 'scurry':
        lift = step * 0.02 + reach * 0.06;
        pitch = reach * 0.18 - hurt * 0.18;
        yaw = pose.moving ? Math.sin(pose.walkPhase * GAIT_CADENCE.scurry * 2) * 0.12 : 0;
        forward = strike * 0.25 - hurt * 0.1;
        break;
      case 'trot':
        lift = step * 0.05 + reach * 0.06;
        pitch = reach * 0.18 - hurt * 0.18;
        forward = strike * 0.35 - hurt * 0.1;
        break;
      case 'hop':
        lift = step * 0.08 + reach * 0.04;
        pitch = reach * 0.4 - hurt * 0.18 + (pose.moving || pose.attackProgress !== null ? 0 : Math.max(0, Math.sin(pose.time * 3)) * 0.3);
        forward = strike * 0.2 - hurt * 0.1;
        break;
      case 'hover':
        lift = (0.05 + Math.sin(pose.time * 2.2) * 0.04) * fall;
        yaw = this.look.spin ? pose.time * 0.6 : Math.sin(pose.time * 0.6) * 0.35;
        pulse = 1 + reach * 0.12;
        break;
      case 'drift':
        lift = (0.08 + Math.sin(pose.time * 1.9) * 0.06) * fall;
        pulse = 1 + Math.sin(pose.time * 4) * 0.05 + hurt * 0.15 + reach * 0.12;
        break;
      case 'loom':
        lift = Math.sin(pose.time * 0.9) * 0.05;
        pitch = strike < 0 ? strike * 0.4 : strike * 0.08;
        roll = Math.sin(pose.time * 0.7) * 0.03 + (pose.moving ? Math.sin(pose.walkPhase * GAIT_CADENCE.loom * 2) * 0.05 : 0);
        forward = strike * 0.5 - hurt * 0.1;
        break;
    }
    const pivotHeight = this.height * 0.4;
    const cos = Math.cos(pitch);
    const sin = Math.sin(pitch);
    let dip = 0;
    if (pitch !== 0) for (const [z, y] of profileOf(this.key, this.look)) dip = Math.max(dip, -(pivotHeight + (y - pivotHeight) * cos - (z + forward) * sin));
    this.body.position.set(gait === 'drift' ? Math.sin(pose.time * 1.3) * 0.05 : 0, base + lift + (this.airborne ? 0 : dip), forward);
    this.pivot.rotation.set(pitch, yaw, roll);
    this.body.scale.setScalar(this.scale * pulse);
  }
}

export const WARD_CREATURE_FACTORIES = {
  canalRat: () => new WardCreatureRig('canalRat'),
  pigeon: () => new WardCreatureRig('pigeon'),
  strayDog: () => new WardCreatureRig('strayDog'),
  trainingDrone: () => new WardCreatureRig('trainingDrone'),
  crateWisp: () => new WardCreatureRig('crateWisp'),
  gutterMite: () => new WardCreatureRig('gutterMite'),
  siltEel: () => new WardCreatureRig('siltEel'),
  scrapCrawler: () => new WardCreatureRig('scrapCrawler'),
  rustling: () => new WardCreatureRig('rustling'),
  lineMimic: () => new WardCreatureRig('lineMimic'),
  scrapMagpie: () => new WardCreatureRig('scrapMagpie'),
  lamplighter: () => new WardCreatureRig('lamplighter'),
  mothLantern: () => new WardCreatureRig('mothLantern'),
  glassHound: () => new WardCreatureRig('glassHound'),
  hullKnocker: () => new WardCreatureRig('hullKnocker'),
  tideWraith: () => new WardCreatureRig('tideWraith'),
  redTwin: () => new WardCreatureRig('redTwin'),
  cellBreaker: () => new WardCreatureRig('cellBreaker'),
  cordonStalker: () => new WardCreatureRig('cordonStalker'),
  vaultEcho: () => new WardCreatureRig('vaultEcho'),
  warden: () => new WardCreatureRig('warden'),
} as const;
