import type { WorldObjectModel } from '@containment/shared';
import type { Object3D } from 'three';
import { darken, jitter, lighten, mix, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS, VOXEL_SOLID, type VoxelKind } from '../voxel/voxelKinds.ts';
import { VoxelModel, type Paint } from '../voxel/voxelModel.ts';
import type { AnimatedPart, ObjectModelParts } from './objectModels.ts';

type SetPieceModel = Extract<
  WorldObjectModel,
  | 'fountainBasin'
  | 'fountainGrand'
  | 'monumentStatue'
  | 'benchCurve'
  | 'bannerMast'
  | 'glassKiosk'
  | 'directoryPylon'
  | 'receptionDesk'
  | 'mapTable'
  | 'triageStation'
  | 'transitShelter'
  | 'timetableBoard'
  | 'ticketBarrier'
  | 'guardBooth'
  | 'hydraulicPress'
>;

const VOXEL = 1 / 16;

const STONE = 0xd9d4c7;
const STONE_SHADE = 0xb9b3a4;
const STONE_DARK = 0x8f897c;
const BRASS = 0xb8913a;
const BRASS_DARK = 0x8a6b2f;
const STEEL = 0x8d969e;
const STEEL_DARK = 0x56636c;
const STEEL_DEEP = 0x2a333a;
const CHROME = 0xc4ccd2;
const WATER = 0x7fd0f0;
const WATER_DEEP = 0x3f9cc4;
const SPARK = 0xe8fbff;
const MOSAIC = 0x2a7f8f;
const MOSAIC_PALE = 0xcfe8e6;
const OAK = 0x9a6a3a;
const BRONZE = 0x8a6a42;
const PATINA = 0x5f8a78;
const PANE = 0xcfeaf2;
const CYAN = 0x4fd8ff;
const HAZARD_YELLOW = 0xc99a1c;
const HAZARD_BLACK = 0x17170f;
const CREAM = 0xf2efe6;
const TERRAZZO_CHIPS = [0x8a9aa0, BRASS, 0x6f8a94, 0x5d6b74];

const parts = (base: VoxelModel, heightVoxels: number, animated: AnimatedPart[] = []): ObjectModelParts => ({ base, animated, heightVoxels });

type Shade = (x: number, y: number, z: number) => number;

const grained = (color: number, amount = 0.03, salt = 0): Shade => (x, y, z) => jitter(color, amount, noise3(x, y, z, salt));

const terrazzo = (color: number, salt = 0): Shade => (x, y, z) => {
  const grain = noise3(x, y, z, salt);
  return grain > 0.94 ? (TERRAZZO_CHIPS[Math.floor(grain * 997) % TERRAZZO_CHIPS.length] as number) : jitter(color, 0.02, grain);
};

const radial = (x: number, z: number): number => Math.hypot(x + 0.5, z + 0.5);
const bearing = (x: number, z: number): number => Math.atan2(z + 0.5, x + 0.5);
const hazard = (x: number, y: number, z: number): number => (Math.floor((x + y + z + 96) / 2) % 2 === 0 ? HAZARD_YELLOW : HAZARD_BLACK);

const ring = (model: VoxelModel, inner: number, outer: number, y0: number, y1: number, paint: Paint, kind: VoxelKind = VOXEL_SOLID): VoxelModel => {
  const reach = Math.ceil(outer);
  for (let x = -reach; x < reach; x++) {
    for (let z = -reach; z < reach; z++) {
      const distance = radial(x, z);
      if (distance > inner && distance <= outer) model.fill(x, y0, z, x, y1, z, paint, kind);
    }
  }
  return model;
};

const disc = (model: VoxelModel, radius: number, y0: number, y1: number, paint: Paint, kind: VoxelKind = VOXEL_SOLID): VoxelModel => ring(model, -1, radius, y0, y1, paint, kind);

const column = (model: VoxelModel, cx: number, cz: number, radius: number, y0: number, y1: number, paint: Paint): void => {
  for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
    for (let z = Math.floor(cz - radius); z <= Math.ceil(cz + radius); z++) {
      if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) <= radius) model.fill(x, y0, z, x, y1, z, paint);
    }
  }
};

const limb = (model: VoxelModel, from: readonly [number, number, number], to: readonly [number, number, number], paint: Paint): void => {
  for (let step = 0; step <= 24; step++) {
    const t = step / 24;
    const x = Math.round(from[0] + (to[0] - from[0]) * t);
    const y = Math.round(from[1] + (to[1] - from[1]) * t);
    const z = Math.round(from[2] + (to[2] - from[2]) * t);
    model.fill(x - 1, y, z - 1, x, y + 1, z, paint);
  }
};

const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  A: ['010', '101', '111', '101', '101'],
  D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'],
  I: ['111', '010', '010', '010', '111'],
  K: ['101', '101', '110', '101', '101'],
  M: ['101', '111', '111', '101', '101'],
  N: ['110', '101', '101', '101', '101'],
  O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'],
  R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'],
};

const lettering = (model: VoxelModel, text: string, left: number, top: number, z: number, color: number, kind: VoxelKind = VOXEL_SOLID): void => {
  [...text].forEach((letter, index) => {
    const glyph = GLYPHS[letter];
    if (!glyph) return;
    glyph.forEach((row, line) => {
      [...row].forEach((bit, column) => {
        if (bit === '1') model.set(left + index * 4 + column, top - line, z, color, kind);
      });
    });
  });
};

const textWidth = (text: string): number => text.length * 4 - 1;

const blink = (rate: number, phase = 0) => (part: Object3D, time: number, seed: number) => {
  part.visible = Math.sin(time * rate + phase + seed) > -0.2;
};

const surge = (depth: number, rate: number) => (part: Object3D, time: number, seed: number) => {
  const rise = (Math.sin(time * rate + seed) + Math.sin(time * rate * 2.3 + seed * 1.7) * 0.25 + 1.25) / 2.5;
  part.position.y = (rise - 1) * depth * VOXEL;
};

const waterJet = (y0: number, y1: number, radius: number, seed: number): VoxelModel => {
  const jet = new VoxelModel();
  disc(jet, radius * 0.55, y0, y1, (_x, y) => (y % 5 === 0 ? 0xffffff : SPARK), VOXEL_EMISSIVE);
  ring(jet, radius * 0.55, radius, y0, y1, (x, y, z) => lighten(WATER, 0.25 + noise3(x, y, z, seed) * 0.2), VOXEL_GLASS);
  for (let layer = 1; layer <= 4; layer++) {
    const y = y1 - 4 + layer;
    const spread = radius + layer * 0.9;
    ring(jet, radius, spread, y, y, (x, vy, z) => (noise3(x, vy, z, seed + 3) > 0.45 ? lighten(WATER, 0.45) : null), VOXEL_GLASS);
  }
  ring(jet, radius + 1.5, radius + 3.8, y1 - 6, y1 - 3, (x, y, z) => (noise3(x, y, z, seed + 5) > 0.82 ? lighten(WATER, 0.5) : null), VOXEL_GLASS);
  return jet;
};

const MOSAIC_RAYS = 8;

const mosaic = (seed: number): Shade => (x, y, z) => {
  if (y < 3) return STONE_DARK;
  const distance = radial(x, z);
  if ((x + 64) % 4 === 0 || (z + 64) % 4 === 0) return darken(MOSAIC, 0.3);
  if (distance > 6 && Math.cos(bearing(x, z) * MOSAIC_RAYS) > 0.75) return MOSAIC_PALE;
  return Math.floor(distance / 3) % 2 === 0 ? jitter(MOSAIC, 0.04, noise3(x, y, z, seed)) : jitter(darken(MOSAIC, 0.18), 0.04, noise3(x, y, z, seed));
};

interface BasinShape {
  readonly inner: number;
  readonly outer: number;
  readonly wallTop: number;
}

const poolBasin = (model: VoxelModel, seed: number, { inner, outer, wallTop }: BasinShape): void => {
  const wallOuter = outer - 1.5;
  ring(model, inner + 0.5, outer, 0, 1, terrazzo(STONE_SHADE, seed));
  ring(model, outer - 0.9, outer - 0.3, 1, 1, BRASS);
  disc(model, inner + 0.5, 0, 3, mosaic(seed));
  ring(model, inner, wallOuter, 2, wallTop - 1, (x, y, z) => {
    if (y === wallTop - 2 && radial(x, z) > wallOuter - 0.9) return BRASS;
    if (y === 2 && radial(x, z) > wallOuter - 0.9) return STONE_DARK;
    return terrazzo(STONE, seed + 1)(x, y, z);
  });
  ring(model, inner - 0.5, wallOuter + 0.6, wallTop, wallTop, (x, y, z) => jitter(lighten(STONE, 0.3), 0.015, noise3(x, y, z, seed + 2)));
  disc(model, inner, 4, wallTop - 2, (x, y, z) => (y === wallTop - 2 ? (noise3(x, y, z, seed + 4) > 0.9 ? lighten(WATER, 0.35) : WATER) : WATER_DEEP), VOXEL_GLASS);
  for (const [dx, dz] of [[0, 1], [1, 0], [0, -1], [-1, 0]] as const) {
    const cx = Math.round(dx * (outer - 0.8));
    const cz = Math.round(dz * (outer - 0.8));
    const halfX = dx === 0 ? 2 : 0;
    const halfZ = dz === 0 ? 2 : 0;
    model.fill(cx - halfX - 1, 1, cz - halfZ - 1, cx + halfX, 1, cz + halfZ, (x, _y, z) => ((x + z) % 2 === 0 ? STEEL_DEEP : STEEL_DARK));
  }
};

const underwaterLights = (model: VoxelModel, radius: number, count: number, y: number, offset = 0): void => {
  for (let index = 0; index < count; index++) {
    const angle = offset + (index / count) * Math.PI * 2;
    const x = Math.round(Math.cos(angle) * radius - 0.5);
    const z = Math.round(Math.sin(angle) * radius - 0.5);
    model.fill(x, y, z, x + 1, y, z + 1, 0x7fd8ff, VOXEL_EMISSIVE);
  }
};

const curtain = (model: VoxelModel, inner: number, outer: number, y0: number, y1: number, seed: number): void => {
  ring(model, inner, outer, y0, y1, (x, y, z) => (noise3(x, Math.floor(y / 3), z, seed) > 0.42 ? lighten(WATER, 0.3 + noise3(x, y, z, seed) * 0.2) : null), VOXEL_GLASS);
};

const foam = (model: VoxelModel, inner: number, outer: number, y: number, seed: number): void => {
  ring(model, inner, outer, y, y, (x, vy, z) => (noise3(x, vy, z, seed + 9) > 0.55 ? SPARK : null), VOXEL_EMISSIVE);
};

const plaque = (model: VoxelModel, x0: number, x1: number, y0: number, y1: number, z: number, lines: readonly number[]): void => {
  model.fill(x0, y0, z, x1, y1, z, (x, y) => (x === x0 || x === x1 || y === y0 || y === y1 ? BRASS_DARK : BRASS));
  for (const y of lines) model.fill(x0 + 2, y, z, x1 - 2 - (y % 3), y, z, darken(BRASS, 0.45));
};

const fountainBasin = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  poolBasin(model, seed, { inner: 18.5, outer: 23.5, wallTop: 9 });
  model.paintExisting(-4, 4, 19, 3, 6, 23, (x, y, z) => (radial(x, z) > 21 ? (y === 5 && x > -3 && x < 2 ? darken(BRASS, 0.4) : BRASS) : null));
  underwaterLights(model, 13.5, 6, 4, seed * 0.1);
  disc(model, 3.5, 2, 13, (x, y, z) => (y === 6 || y === 12 ? BRASS : terrazzo(STONE, seed + 6)(x, y, z)));
  for (let y = 13; y <= 16; y++) {
    const reach = 4 + (y - 13) * 1.4;
    ring(model, y === 16 ? reach - 1.2 : -1, reach, y, y, y === 16 ? BRASS : terrazzo(STONE_SHADE, seed + 7));
  }
  disc(model, 7, 16, 16, lighten(WATER, 0.15), VOXEL_GLASS);
  disc(model, 2.6, 16, 19, (_x, y) => (y === 19 ? lighten(BRASS, 0.25) : y === 17 ? BRASS_DARK : BRASS));
  curtain(model, 8.2, 9.3, 8, 15, seed);
  foam(model, 8.5, 11, 7, seed);
  foam(model, 3.5, 5, 7, seed + 1);
  return parts(model, 35, [{ model: waterJet(12, 33, 1.6, seed), animate: surge(6, 1.1) }]);
};

const fountainGrand = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  poolBasin(model, seed, { inner: 31.5, outer: 39.5, wallTop: 11 });
  model.paintExisting(-6, 4, 33, 5, 8, 39, (x, y, z) => (radial(x, z) > 36.2 ? (y === 7 || y === 5) && x > -5 && x < 4 ? darken(BRASS, 0.4) : BRASS : null));
  underwaterLights(model, 27, 12, 4, seed * 0.1);
  underwaterLights(model, 21, 8, 4, Math.PI / 8);
  column(model, -0.5, -0.5, 6, 2, 17, (x, y, z) => {
    if (y === 3 || y === 16) return BRASS;
    return Math.floor(((bearing(x, z) + Math.PI) / (Math.PI * 2)) * 16) % 2 === 0 ? terrazzo(STONE, seed + 3)(x, y, z) : STONE_SHADE;
  });
  for (let y = 14; y <= 21; y++) {
    const reach = 7 + (y - 14) * 1.5;
    ring(model, y === 21 ? reach - 2 : -1, reach, y, y, y === 21 ? BRASS : y === 20 ? BRASS_DARK : terrazzo(STONE_SHADE, seed + 4));
  }
  ring(model, 3.5, 15.5, 21, 21, lighten(WATER, 0.15), VOXEL_GLASS);
  curtain(model, 17.5, 18.6, 10, 20, seed + 1);
  foam(model, 17, 20.5, 9, seed);
  column(model, -0.5, -0.5, 3.5, 21, 32, (x, y, z) => (y === 26 ? BRASS : terrazzo(STONE, seed + 5)(x, y, z)));
  for (let y = 30; y <= 34; y++) {
    const reach = 4 + (y - 30) * 1.4;
    ring(model, y === 34 ? reach - 1.6 : -1, reach, y, y, y === 34 ? BRASS : terrazzo(STONE_SHADE, seed + 6));
  }
  ring(model, 2.6, 8, 34, 34, lighten(WATER, 0.2), VOXEL_GLASS);
  curtain(model, 9.6, 10.6, 22, 33, seed + 2);
  foam(model, 10, 12.5, 21, seed + 1);
  disc(model, 2.6, 34, 37, (_x, y) => (y === 37 ? lighten(BRASS, 0.3) : y === 35 ? BRASS_DARK : BRASS));
  for (let index = 0; index < 8; index++) {
    const angle = (index / 8) * Math.PI * 2 + Math.PI / 8;
    const spout = (distance: number) => [Math.round(Math.cos(angle) * distance - 0.5), Math.round(Math.sin(angle) * distance - 0.5)] as const;
    const [nx, nz] = spout(33.5);
    model.fill(nx, 12, nz, nx, 13, nz, BRASS).set(nx, 14, nz, lighten(BRASS, 0.3));
    for (let step = 0; step <= 30; step++) {
      const t = step / 30;
      const [x, z] = spout(32.5 - t * 10);
      model.set(x, Math.round(13 + Math.sin(Math.PI * t) * 6 - t * 4), z, lighten(WATER, 0.35), VOXEL_GLASS);
    }
    const [sx, sz] = spout(22.5);
    model.set(sx, 9, sz, SPARK, VOXEL_EMISSIVE);
  }
  return parts(model, 59, [{ model: waterJet(28, 57, 1.6, seed), animate: surge(8, 0.9) }]);
};

const bronze: Shade = (x, y, z) => {
  const grain = noise3(x, y, z, 31);
  if (grain > 0.84) return mix(BRONZE, PATINA, 0.55 + (grain - 0.84) * 2);
  return jitter(y % 7 === 0 ? lighten(BRONZE, 0.08) : BRONZE, 0.035, grain);
};

const ellipseBand = (model: VoxelModel, y: number, radiusX: number, radiusZ: number, offsetZ: number, paint: Paint): void => {
  const reach = Math.ceil(Math.max(radiusX, radiusZ)) + 1;
  for (let x = -reach; x < reach; x++) {
    for (let z = -reach; z < reach; z++) {
      if (((x + 0.5) / radiusX) ** 2 + ((z + 0.5 - offsetZ) / radiusZ) ** 2 <= 1) model.fill(x, y, z, x, y, z, paint);
    }
  }
};

const monumentStatue = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-16, 0, -16, 15, 2, 15, (x, y, z) => (Math.abs(x + 0.5) + Math.abs(z + 0.5) > 29 ? null : y === 2 && (Math.abs(x + 0.5) > 14 || Math.abs(z + 0.5) > 14) ? STONE_SHADE : terrazzo(STONE_DARK, seed)(x, y, z)));
  model.fill(-13, 3, -13, 12, 5, 12, terrazzo(STONE_SHADE, seed + 1));
  for (const x of [-13, 12]) for (const z of [-13, 12]) model.fill(x, 3, z, x, 5, z, BRASS_DARK);
  model.fill(-11, 6, -11, 10, 23, 10, (x, y, z) => {
    const face = Math.max(Math.abs(x + 0.5), Math.abs(z + 0.5)) > 10;
    const corner = Math.abs(x + 0.5) > 10 && Math.abs(z + 0.5) > 10;
    if (y === 22) return BRASS;
    if (corner) return lighten(STONE, 0.2);
    if (face && (y === 8 || y === 20)) return STONE_SHADE;
    return terrazzo(STONE, seed + 2)(x, y, z);
  });
  model.fill(-12, 24, -12, 11, 25, 11, (x, y, z) => (y === 24 ? STONE_SHADE : jitter(lighten(STONE, 0.25), 0.015, noise3(x, y, z, seed))));
  model.fill(-10, 26, -10, 9, 26, 9, terrazzo(STONE, seed + 3));
  plaque(model, -7, 6, 10, 18, 11, [16, 14]);
  model.fill(-5, 12, 11, 3, 12, 11, (x) => jitter(STONE_SHADE, 0.08, noise3(x, 12, 11, seed + 8)));
  model.fill(-6, 27, -5, 5, 27, 4, bronze);
  for (let y = 28; y <= 43; y++) {
    const fold = (x: number, vy: number, z: number) => {
      const shade = Math.sin(bearing(x, z) * 6) * 0.12;
      return shade > 0 ? lighten(bronze(x, vy, z), shade) : darken(bronze(x, vy, z), -shade);
    };
    ellipseBand(model, y, 5.4 - (y - 28) * 0.09, 3.7 - (y - 28) * 0.03, 0, y === 40 ? BRASS_DARK : fold);
  }
  for (let y = 44; y <= 49; y++) ellipseBand(model, y, y >= 47 ? 5.6 : 4.6, 3.1, 0, bronze);
  model.fill(-2, 50, -2, 1, 50, 1, bronze);
  for (let y = 51; y <= 56; y++) for (let x = -4; x <= 3; x++) for (let z = -4; z <= 3; z++) if (Math.hypot(x + 0.5, (y - 53.3) * 1.05, z + 0.5) <= 2.8) model.set(x, y, z, bronze(x, y, z));
  for (let y = 30; y <= 48; y++) {
    const sweep = Math.floor((48 - y) / 7);
    model.fill(-5 - sweep, y, -5 - sweep, 4 + sweep, y, -4 - sweep, (x, vy, z) => darken(bronze(x, vy, z), 0.12));
  }
  limb(model, [6, 47, 0], [8, 53, 0], bronze);
  limb(model, [8, 53, 0], [7, 58, 0], bronze);
  limb(model, [-6, 47, 0], [-7, 42, 1], bronze);
  limb(model, [-7, 42, 1], [-6, 38, 2], bronze);
  model.fill(-9, 32, 0, -8, 39, 4, (x, y, z) => lighten(bronze(x, y, z), 0.1));
  model.fill(5, 59, -2, 8, 59, 1, BRASS).fill(5, 62, -2, 8, 62, 1, lighten(BRASS, 0.2));
  model.fill(5, 60, -2, 8, 61, 1, (x, y, z) => (x === 5 || x === 8 || z === -2 || z === 1 ? 0x9fe4ff : 0xd8f8ff), VOXEL_GLASS);
  return parts(model, 63);
};

const benchCurve = (_seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  const front = (x: number) => Math.round(((x + 0.5) / 22) ** 2 * 5);
  for (let x = -21; x <= 20; x++) {
    const centre = front(x);
    model.fill(x, 6, centre - 2, x, 7, centre + 2, (_vx, y) => (y === 7 ? OAK : darken(OAK, 0.25)));
    model.fill(x, 8, centre - 3, x, 13, centre - 3, (_vx, y) => (y === 13 ? darken(OAK, 0.1) : OAK));
  }
  for (const legX of [-17, 16]) {
    const centre = front(legX);
    model.fill(legX - 1, 0, centre - 2, legX + 1, 5, centre + 1, STEEL_DARK);
  }
  return parts(model, 14);
};

const bannerMast = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-6, 0, -6, 5, 2, 5, (x, y, z) => (Math.abs(x + 0.5) + Math.abs(z + 0.5) > 9 ? null : y === 2 ? lighten(STONE, 0.2) : terrazzo(STONE_SHADE, seed)(x, y, z)));
  model.fill(-4, 3, -4, 3, 4, 3, (x, y, z) => (Math.abs(x + 0.5) + Math.abs(z + 0.5) > 6 ? null : terrazzo(STONE, seed + 1)(x, y, z)));
  disc(model, 2.6, 5, 7, (_x, y) => (y === 6 ? BRASS_DARK : BRASS));
  disc(model, 1.3, 8, 57, (x, y, z) => (y % 12 === 0 ? BRASS_DARK : jitter(BRASS, 0.04, noise3(x, y, z, seed + 2))));
  for (let y = 58; y <= 61; y++) for (let x = -2; x <= 1; x++) for (let z = -2; z <= 1; z++) if (Math.hypot(x + 0.5, y - 59.5, z + 0.5) <= 1.9) model.set(x, y, z, lighten(BRASS, 0.25));
  model.fill(-1, 62, -1, 0, 62, 0, lighten(BRASS, 0.4));
  const banner = new VoxelModel();
  banner.fill(-7, 55, 1, 6, 55, 1, BRASS).fill(-8, 54, 1, -8, 56, 1, lighten(BRASS, 0.2)).fill(7, 54, 1, 7, 56, 1, lighten(BRASS, 0.2));
  banner.fill(-6, 25, 1, 5, 54, 1, (x, y) => {
    const u = x + 6;
    const v = 54 - y;
    if (v >= 25 && Math.abs(u - 5.5) < (v - 24) * 1.5) return null;
    if (v === 0) return BRASS_DARK;
    if (u === 0 || u === 11) return BRASS;
    const roundel = Math.hypot(u - 5.5, v - 10);
    if (roundel >= 2.6 && roundel <= 4.1) return CREAM;
    if (roundel < 1.6) return CYAN;
    if (v === 19 || v === 20) return BRASS;
    return jitter(0x1f5a66, 0.03, noise3(x, y, 1, seed));
  });
  return parts(model, 63, [
    {
      model: banner,
      animate: (part, time, phase) => {
        part.rotation.y = Math.sin(time * 0.6 + phase) * 0.14 + Math.sin(time * 1.7 + phase * 2) * 0.04;
      },
    },
  ]);
};

const shelfStock = (model: VoxelModel, seed: number, shelfY: number, x0: number, x1: number): void => {
  for (let x = x0; x <= x1; x++) {
    const roll = noise3(x, shelfY, 4, seed);
    if (roll < 0.2) continue;
    const tone = [0xd84a3a, 0x3a8ad8, 0xc99a1c, 0x2f7a4a, CREAM][Math.floor(roll * 50) % 5] as number;
    const top = shelfY + 1 + Math.floor(noise3(x, shelfY, 5, seed) * 4);
    model.fill(x, shelfY + 1, -13, x, top, -12, (_vx, y) => (y === top ? lighten(tone, 0.25) : tone));
  }
};

const glassKiosk = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-24, 0, -16, 23, 1, 15, (x, y, z) => (y === 1 && (x === -24 || x === 23 || z === -16 || z === 15) ? BRASS : terrazzo(STONE_SHADE, seed)(x, y, z)));
  model.fill(-22, 2, -15, 21, 33, -14, (x, y, z) => ((x + 64) % 8 === 0 ? STEEL_DARK : jitter(STEEL, 0.025, noise3(x, y, z, seed))));
  for (const y of [14, 20, 26]) {
    model.fill(-20, y, -13, 19, y, -11, STEEL_DARK);
    shelfStock(model, seed, y, -19, 18);
  }
  model.fill(-22, 2, 11, 21, 11, 13, (x, y, z) => (y === 2 ? STEEL_DEEP : y === 10 ? BRASS : terrazzo(STONE, seed + 1)(x, y, z)));
  model.fill(-22, 12, 10, 21, 12, 15, (x, y, z) => (z === 15 ? BRASS : jitter(lighten(STONE, 0.3), 0.015, noise3(x, y, z, seed + 2))));
  for (const x of [-23, 22]) model.fill(x, 2, -14, x, 11, 13, terrazzo(STONE, seed + 3));
  const hatch = (x: number, y: number) => x >= -7 && x <= 6 && y <= 24;
  const frontMullion = (x: number, y: number) => x === -14 || x === 13 || x === -8 || x === 7 || y === 25 || y === 33;
  model.fill(-22, 13, 13, 21, 33, 13, (x, y) => (hatch(x, y) || !frontMullion(x, y) ? null : STEEL_DARK));
  model.fill(-22, 13, 13, 21, 33, 13, (x, y) => (hatch(x, y) || frontMullion(x, y) ? null : PANE), VOXEL_GLASS);
  const sideMullion = (y: number, z: number) => z === 0 || y === 12 || y === 22 || y === 33;
  for (const x of [-23, 22]) {
    model.fill(x, 12, -14, x, 33, 13, (_vx, y, z) => (sideMullion(y, z) ? STEEL_DARK : null));
    model.fill(x, 12, -14, x, 33, 13, (_vx, y, z) => (sideMullion(y, z) ? null : PANE), VOXEL_GLASS);
  }
  for (const x of [-24, 21]) for (const z of [-16, 14]) model.fill(x, 2, z, x + 2, 33, z + 1, (_vx, y) => (y <= 3 || y === 33 ? BRASS : jitter(STEEL_DARK, 0.03, noise3(x, y, z, seed))));
  model.fill(-24, 34, -16, 23, 36, 15, (x, y, z) => {
    const edge = x === -24 || x === 23 || z === -16 || z === 15;
    if (edge && y === 35) return BRASS;
    return y === 36 ? darken(STEEL, 0.15) : STEEL;
  });
  model.fill(-18, 33, -10, 17, 33, 8, (x, _y, z) => ((x + 64) % 9 === 0 || (z + 64) % 6 === 0 ? 0xc8b48a : 0xffe8b8), VOXEL_EMISSIVE);
  model.fill(-20, 2, -10, -14, 22, -3, (x, y, z) => (y === 22 || x === -20 || x === -14 || z === -10 ? 0xe6e9ea : null));
  model.fill(-19, 3, -3, -15, 21, -3, (_x, y) => (y % 5 === 0 ? 0xbfe8ff : 0x9fd8ff), VOXEL_GLASS);
  for (const y of [7, 12, 17]) model.fill(-19, y, -9, -15, y, -4, 0xe8fbff, VOXEL_EMISSIVE);
  model.fill(8, 13, 9, 12, 15, 11, STEEL_DEEP).fill(9, 16, 10, 11, 17, 10, STEEL_DEEP).fill(9, 16, 11, 11, 17, 11, 0x7cf29a, VOXEL_EMISSIVE);
  for (let x = -18; x <= -10; x += 2) model.fill(x, 13, 11, x + 1, 13 + Math.floor(noise3(x, 0, 0, seed) * 3), 12, x % 4 === 0 ? 0xd84a3a : 0x3a8ad8);
  const sign = 'KIOSK';
  const left = -Math.floor(textWidth(sign) / 2);
  model.fill(left - 3, 37, -2, left + textWidth(sign) + 2, 43, 1, (x, y) => (y === 37 || y === 43 || x === left - 3 || x === left + textWidth(sign) + 2 ? BRASS : STEEL_DEEP));
  lettering(model, sign, left, 42, 2, 0xffd27f, VOXEL_EMISSIVE);
  return parts(model, 44);
};

const directoryPylon = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-6, 0, -5, 5, 2, 4, (x, y, z) => (y === 2 && (x === -6 || x === 5 || z === -5 || z === 4) ? STONE_SHADE : terrazzo(STONE, seed)(x, y, z)));
  model.fill(-5, 3, -4, 4, 3, 3, BRASS);
  model.fill(-5, 4, -3, 4, 39, 2, (x, y, z) => ((x === -5 || x === 4) && z === 0 ? STEEL_DARK : jitter(STEEL, 0.025, noise3(x, y, z, seed + 1))));
  model.fill(-4, 9, 3, 3, 37, 3, 0x141c22);
  model.fill(-3, 34, 3, 2, 35, 3, (x) => (x % 2 === 0 ? 0xffffff : 0xd8f6ff), VOXEL_EMISSIVE);
  for (let row = 0; row < 8; row++) {
    const y = 31 - row * 3;
    const greyed = row === 2 || row === 5 || row === 6;
    const length = 2 + Math.floor(noise3(row, 0, 0, seed) * 4);
    model.set(-4, y, 3, greyed ? 0x3a4852 : [0x4fd8ff, 0x7cf29a, 0xffb347, 0xb57cff][row % 4] as number, greyed ? VOXEL_SOLID : VOXEL_EMISSIVE);
    model.fill(-2, y, 3, -2 + length, y, 3, greyed ? 0x3a4852 : 0x9feeff, greyed ? VOXEL_SOLID : VOXEL_EMISSIVE);
  }
  model.fill(-4, 9, -4, 3, 37, -4, (x, y) => (y % 4 === 0 && x < 2 ? 0x3a5a6a : 0x22303a));
  model.fill(-6, 40, -4, 5, 41, 3, (_x, y) => (y === 41 ? lighten(BRASS, 0.15) : BRASS));
  model.fill(-3, 42, -1, 2, 47, 0, STEEL_DARK);
  for (let x = -3; x <= 2; x++) for (let y = 42; y <= 47; y++) if (Math.abs(Math.hypot(x + 0.5, y - 44.5) - 2.2) < 0.6) model.set(x, y, 1, CYAN, VOXEL_EMISSIVE);
  const here = new VoxelModel().fill(1, 17, 4, 2, 18, 4, 0xffb347, VOXEL_EMISSIVE);
  return parts(model, 48, [{ model: here, animate: blink(3.2) }]);
};

const receptionDesk = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  const front = (x: number) => Math.round(13 - ((x + 0.5) / 30) ** 2 * 7);
  for (let x = -30; x <= 29; x++) {
    const edge = front(x);
    model.fill(x, 0, edge - 3, x, 12, edge, (vx, y, z) => {
      if (z !== edge) return terrazzo(STONE, seed)(vx, y, z);
      if (y <= 1) return STEEL_DEEP;
      if (y === 10) return BRASS;
      return (vx + 64) % 6 === 0 ? STONE_SHADE : terrazzo(STONE, seed)(vx, y, z);
    });
    model.fill(x, 0, edge - 7, x, 9, edge - 4, (vx, y, z) => (y <= 1 ? STEEL_DEEP : grained(STEEL, 0.03, seed + 1)(vx, y, z)));
    model.fill(x, 10, edge - 7, x, 10, edge - 4, jitter(OAK, 0.04, noise3(x, 10, 0, seed)));
    model.fill(x, 13, edge - 3, x, 14, edge + 1, (vx, y, z) => (z === edge + 1 && y === 13 ? BRASS : jitter(lighten(STONE, 0.3), 0.015, noise3(vx, y, z, seed + 2))));
  }
  for (const x of [-30, 29]) model.fill(x, 0, front(x) - 7, x, 14, front(x) + 1, (_vx, y) => (y === 14 ? BRASS : STONE_SHADE));
  for (const centre of [-12, 10]) {
    const back = front(centre) - 6;
    model.fill(centre - 1, 11, back, centre, 12, back, STEEL_DEEP);
    model.fill(centre - 4, 13, back, centre + 3, 18, back, (x, y) => (x === centre - 4 || x === centre + 3 || y === 13 || y === 18 ? STEEL_DEEP : null));
    model.fill(centre - 3, 14, back - 1, centre + 2, 17, back - 1, (_x, y) => (y % 2 === 0 ? 0x2a9fc4 : 0x1f6f8a));
    model.fill(centre - 3, 14, back, centre + 2, 17, back, 0x1a2228);
  }
  const ledge = front(-2) - 1;
  model.fill(-5, 15, ledge - 1, 2, 15, ledge, (x) => (x === -1 ? 0x3a3f44 : CREAM));
  model.fill(-4, 15, ledge - 1, 1, 15, ledge - 1, (x) => (x === -1 ? 0x3a3f44 : (x + 8) % 2 === 0 ? 0xc4c8cc : CREAM));
  model.set(3, 15, ledge, BRASS);
  model.fill(6, 15, ledge - 1, 7, 15, ledge, BRASS_DARK).fill(6, 16, ledge - 1, 7, 16, ledge, lighten(BRASS, 0.2));
  const potEdge = front(22) - 2;
  model.fill(21, 15, potEdge - 1, 23, 17, potEdge + 1, 0x3a4046);
  for (let x = 19; x <= 25; x++) for (let y = 18; y <= 23; y++) for (let z = potEdge - 3; z <= potEdge + 3; z++) {
    const reach = Math.hypot(x - 22, (y - 19.5) * 1.3, z - potEdge);
    const leaf = noise3(x, y, z, seed + 4);
    if (reach < 3.2 && leaf > 0.35) model.set(x, y, z, leaf > 0.75 ? 0x4fbf6f : 0x2f8d4c);
  }
  model.fill(-26, 0, -16, 25, 9, -12, (x, y, z) => (y === 9 ? jitter(lighten(STONE, 0.2), 0.015, noise3(x, y, z, seed)) : z === -12 && ((x + 64) % 9 === 0 || y === 0) ? STEEL_DEEP : grained(STEEL, 0.03, seed + 5)(x, y, z)));
  for (let x = -22; x <= 21; x += 9) model.set(x + 4, 6, -11, BRASS);
  model.fill(-22, 10, -16, 21, 30, -15, (x, y, z) => (x === -22 || x === 21 || y === 30 ? BRASS : terrazzo(STONE, seed + 6)(x, y, z)));
  for (let x = -7; x <= 6; x++) {
    for (let y = 18; y <= 30; y++) {
      const reach = Math.hypot(x + 0.5, y - 24);
      if (reach >= 4.2 && reach <= 5.6) model.set(x, y, -14, BRASS);
      else if (reach < 3.2) model.set(x, y, -14, Math.abs(x + 0.5) < 1 || Math.abs(y - 24) < 1 ? MOSAIC_PALE : MOSAIC);
    }
  }
  const name = 'MERIDIAN';
  lettering(model, name, -Math.floor(textWidth(name) / 2) - 1, 16, -14, BRASS);
  return parts(model, 31);
};

const mapTable = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-14, 0, -8, 13, 1, 7, terrazzo(STONE_SHADE, seed));
  model.fill(-10, 2, -5, 9, 9, 4, (x, y, z) => (y === 9 ? BRASS : (z === 4 || z === -5) && y >= 3 && y <= 7 && x > -9 && x < 8 && y % 2 === 1 ? STEEL_DEEP : jitter(STEEL, 0.03, noise3(x, y, z, seed))));
  model.fill(-22, 10, -14, 21, 11, 13, (x, y, z) => (y === 10 ? STEEL_DEEP : jitter(STEEL_DARK, 0.03, noise3(x, y, z, seed + 1))));
  for (let x = -22; x <= 21; x++) {
    for (let z = -14; z <= 13; z++) {
      if (x === -22 || x === 21 || z === -14 || z === 13) {
        model.fill(x, 12, z, x, 13, z, (_vx, y) => (y === 13 ? lighten(BRASS, 0.15) : BRASS));
        continue;
      }
      const localX = x + 20;
      const localZ = z + 12;
      const wall = localX % 8 === 0 || localZ % 6 === 0;
      const door = (localX % 8 === 0 && localZ % 6 === 3) || (localZ % 6 === 0 && localX % 8 === 4);
      const room = noise3(Math.floor(localX / 8), 0, Math.floor(localZ / 6), seed);
      if (wall && !door) model.set(x, 12, z, 0x9fd8ff, VOXEL_EMISSIVE);
      else if (room > 0.88 && !wall) model.set(x, 12, z, 0xffb347, VOXEL_EMISSIVE);
      else model.set(x, 12, z, room > 0.5 ? 0x1f4f6a : 0x173a4f);
      model.set(x, 13, z, 0xbfe8f5, VOXEL_GLASS);
    }
  }
  for (const [x, z] of [[-23, -15], [22, -15], [-23, 14], [22, 14]] as const) model.fill(x, 0, z, x, 11, z, BRASS_DARK);
  model.fill(-23, 11, -15, 22, 11, 14, (x, _y, z) => (x === -23 || x === 22 || z === -15 || z === 14 ? BRASS : null));
  disc(model, 2.6, 14, 14, BRASS);
  model.fill(-1, 15, -1, 0, 15, 0, 0xd8f6ff, VOXEL_EMISSIVE);
  const hologram = new VoxelModel();
  disc(hologram, 0.8, 16, 28, (_x, y) => (y % 3 === 0 ? 0xffffff : 0x9fd8ff), VOXEL_EMISSIVE);
  [9, 7, 5].forEach((radius, layer) => {
    const y = 18 + layer * 4;
    ring(hologram, radius - 0.9, radius, y, y, 0x9fd8ff, VOXEL_EMISSIVE);
    for (let spoke = 0; spoke < 4; spoke++) {
      const angle = (spoke / 4) * Math.PI * 2 + layer * 0.4;
      for (let step = 2; step < radius; step++) hologram.set(Math.round(Math.cos(angle) * step - 0.5), y, Math.round(Math.sin(angle) * step - 0.5), 0x6fc0e8, VOXEL_EMISSIVE);
    }
  });
  hologram.fill(-1, 29, -1, 0, 29, 0, 0xffffff, VOXEL_EMISSIVE);
  const memory = new VoxelModel();
  ring(memory, 10, 11, 15, 15, (x, _y, z) => (Math.floor(((bearing(x, z) + Math.PI) / (Math.PI * 2)) * 24) % 2 === 0 ? 0xffb347 : null), VOXEL_EMISSIVE);
  return parts(model, 30, [
    { model: hologram, animate: (part, time) => (part.rotation.y = time * 0.3) },
    {
      model: memory,
      animate: (part, time, phase) => {
        part.rotation.y = -time * 0.18;
        part.visible = Math.sin(time * 2.1 + phase) > -0.5 || Math.sin(time * 7 + phase) > 0.6;
      },
    },
  ]);
};

const triageStation = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-23, 0, -15, 22, 0, 14, (x, y, z) => {
    if (x === -23 || x === 22 || z === -15 || z === 14) return 0x2fb89c;
    if ((Math.abs(x - 11) <= 1 && z >= 5 && z <= 11) || (Math.abs(z - 8) <= 1 && x >= 8 && x <= 14)) return 0x2f9a6a;
    return jitter(0xe6efea, 0.015, noise3(x, y, z, seed));
  });
  for (let panel = 0; panel < 5; panel++) {
    const x0 = -23 + panel * 9;
    const z = panel % 2 === 0 ? -15 : -14;
    model.fill(x0, 1, z, x0, 28, z, STEEL);
    model.fill(x0 + 1, 3, z, x0 + 8, 26, z, (x, y) => (y === 26 || y === 3 ? STEEL : (x + y) % 3 === 0 ? 0xc8dcd4 : 0xd8e8e2));
  }
  model.fill(22, 1, -15, 22, 28, -15, STEEL);
  for (const [x0, x1] of [[-22, -20], [-7, -5]] as const) model.fill(x0, 1, -3, x1, 34, 1, (x, y, z) => (y === 1 ? STEEL_DEEP : jitter(0xe6efea, 0.015, noise3(x, y, z, seed + 1))));
  model.fill(-22, 35, -3, -5, 38, 1, (x, y, z) => (y === 36 && z === 1 ? 0x2fb89c : jitter(0xe6efea, 0.015, noise3(x, y, z, seed + 2))));
  for (const x of [-19, -8]) model.fill(x, 4, -2, x, 32, 0, 0xd8fff0, VOXEL_EMISSIVE);
  model.fill(-18, 34, -2, -9, 34, 0, 0xd8fff0, VOXEL_EMISSIVE);
  for (const x of [-15, -11]) model.fill(x, 0, -2, x + 1, 0, 0, 0x2a3036);
  for (const [x, z] of [[3, -10], [20, -10], [3, -3], [20, -3]] as const) model.fill(x, 1, z, x, 7, z, STEEL);
  model.fill(2, 8, -11, 21, 8, -2, STEEL_DARK);
  model.fill(3, 9, -10, 20, 10, -3, (x, y, z) => jitter(0xeaf2f5, 0.02, noise3(x, y, z, seed + 3)));
  model.fill(17, 11, -9, 20, 11, -4, 0xf6fbfc);
  model.fill(3, 11, -10, 7, 11, -3, (_x, _y, z) => (z % 2 === 0 ? 0x2f8a7a : 0x3a9a8a));
  model.fill(16, 1, 3, 22, 18, 9, (x, y, z) => (y === 18 ? STEEL : z === 9 && y % 6 === 0 ? 0xc8d0d4 : jitter(0xf2f5f4, 0.015, noise3(x, y, z, seed))));
  model.fill(18, 11, 10, 20, 11, 10, 0x2f9a6a).fill(19, 10, 10, 19, 12, 10, 0x2f9a6a);
  model.fill(17, 19, 4, 18, 20, 5, 0x3a8ad8).fill(20, 19, 6, 21, 19, 8, 0xd84a3a);
  model.fill(-1, 1, -8, 1, 1, -6, (x, _y, z) => (x === 0 || z === -7 ? STEEL_DARK : null));
  model.fill(0, 2, -7, 0, 27, -7, STEEL);
  model.fill(-1, 27, -7, 1, 27, -7, STEEL);
  model.fill(-1, 21, -8, 0, 25, -8, 0xd8fff0, VOXEL_GLASS);
  for (let y = 11; y <= 20; y++) model.set(Math.round(-0.5 + (20 - y) * 0.3), y, -8, 0x6a8a94);
  model.fill(10, 1, -14, 10, 32, -14, STEEL);
  model.fill(10, 32, -14, 10, 32, -7, STEEL);
  model.fill(6, 31, -10, 14, 31, -3, STEEL_DARK);
  model.fill(7, 30, -9, 13, 30, -4, 0xeafff6, VOXEL_EMISSIVE);
  const scan = new VoxelModel().fill(-19, 0, -2, -8, 0, 0, 0xbfffe8, VOXEL_EMISSIVE);
  return parts(model, 39, [
    {
      model: scan,
      animate: (part, time, phase) => {
        part.position.y = (3 + ((Math.sin(time * 1.2 + phase) + 1) / 2) * 29) * VOXEL;
      },
    },
  ]);
};

const transitShelter = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (const x0 of [-24, 22]) {
    for (const z0 of [-16, 14]) {
      const plinthX = x0 < 0 ? x0 : x0 - 1;
      const plinthZ = z0 < 0 ? z0 : z0 - 1;
      model.fill(plinthX, 0, plinthZ, plinthX + 2, 2, plinthZ + 2, (x, y, z) => (y === 2 ? BRASS : jitter(STEEL_DEEP, 0.03, noise3(x, y, z, seed))));
      model.fill(x0, 3, z0, x0 + 1, 37, z0 + 1, (x, y, z) => (y === 20 || y === 21 ? BRASS : jitter(STEEL, 0.03, noise3(x, y, z, seed + 1))));
      model.fill(plinthX, 35, plinthZ, plinthX + 2, 37, plinthZ + 2, (_x, y) => (y === 36 ? lighten(BRASS, 0.2) : BRASS));
    }
  }
  for (const z0 of [-16, 14]) model.fill(-24, 38, z0, 23, 40, z0 + 1, (x, y, z) => (y === 39 && z === (z0 < 0 ? z0 : z0 + 1) ? BRASS : jitter(STEEL_DARK, 0.03, noise3(x, y, z, seed + 2))));
  for (const x0 of [-24, 22]) model.fill(x0, 38, -14, x0 + 1, 40, 13, (x, y, z) => (y === 39 && x === (x0 < 0 ? x0 : x0 + 1) ? BRASS : jitter(STEEL_DARK, 0.03, noise3(x, y, z, seed + 3))));
  const arch = (z: number) => 41 + Math.round(6 * Math.cos(((z + 0.5) / 16) * (Math.PI / 2)));
  for (let x = -22; x <= 21; x++) {
    const rib = (x + 64) % 8 === 0;
    for (let z = -14; z <= 13; z++) {
      const top = arch(z);
      const neighbour = Math.min(arch(z - 1), arch(z + 1), top);
      for (let y = Math.min(neighbour + 1, top); y <= top; y++) {
        if (rib) model.set(x, y, z, STEEL_DARK);
        else model.set(x, y, z, (z + 64) % 7 === 0 ? 0xa8dde8 : PANE, VOXEL_GLASS);
      }
      if (rib) model.set(x, top + 1, z, STEEL);
    }
  }
  model.fill(-22, arch(-1) + 1, -1, 21, arch(-1) + 1, 0, BRASS);
  const route = 'TRAM';
  const left = -Math.floor(textWidth(route) / 2) - 1;
  model.fill(left - 2, 41, 14, left + textWidth(route) + 1, 47, 15, (x, y) => (y === 41 || y === 47 || x === left - 2 || x === left + textWidth(route) + 1 ? BRASS : 0x1a2830));
  lettering(model, route, left, 46, 15, 0x46c8a8);
  return parts(model, 49);
};

const timetableBoard = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (const x of [-20, 17]) model.fill(x, 10, -8, x + 2, 13, -6, STEEL_DARK);
  model.fill(-23, 14, -8, 22, 40, -5, (x, y, z) => (z === -5 && (x === -23 || x === 22 || y === 14 || y === 40) ? BRASS : jitter(STEEL_DEEP, 0.02, noise3(x, y, z, seed))));
  const header = 'DEPARTURES';
  lettering(model, header, -Math.floor(textWidth(header) / 2), 38, -4, 0xfff6e0, VOXEL_EMISSIVE);
  model.fill(-21, 32, -4, 20, 32, -4, BRASS_DARK);
  const blinking = new VoxelModel();
  [29, 26, 23, 20, 17].forEach((y, row) => {
    model.fill(-21, y, -4, 20, y + 1, -4, (x, vy) => (x === -2 || x === 9 ? null : vy === y ? 0x15181a : 0x1f2326));
    for (let x = -21; x <= -4; x++) if (noise3(x, row, 1, seed) > 0.3) model.set(x, y + 1, -4, 0xffb347, VOXEL_EMISSIVE).set(x, y, -4, 0xd8892a, VOXEL_EMISSIVE);
    for (let x = 0; x <= 7; x++) if (x !== 3 && noise3(x, row, 2, seed) > 0.2) model.set(x, y + 1, -4, 0xffcf4d, VOXEL_EMISSIVE);
    for (let x = 11; x <= 19; x++) {
      if (x === 13 || noise3(x, row, 3, seed) < 0.15) continue;
      if (row === 2) blinking.fill(x, y, -3, x, y + 1, -3, 0xffe14d, VOXEL_EMISSIVE);
      else model.set(x, y + 1, -4, 0x7cf29a, VOXEL_EMISSIVE);
    }
  });
  model.fill(-1, 41, -7, 0, 41, -6, BRASS_DARK);
  for (let x = -7; x <= 6; x++) {
    for (let y = 42; y <= 53; y++) {
      const reach = Math.hypot(x + 0.5, y - 47.5);
      if (reach > 5.9) continue;
      model.fill(x, y, -8, x, y, -6, BRASS_DARK);
      model.set(x, y, -5, reach > 4.9 ? BRASS : CREAM);
      if (reach <= 4.6 && reach > 4 && Math.round(Math.atan2(y - 47.5, x + 0.5) / (Math.PI / 6)) % 3 === 0) model.set(x, y, -4, 0x2a2420);
    }
  }
  for (let step = 0; step <= 3; step++) model.set(Math.round(-0.5 - step * 0.8), Math.round(47.5 + step * 0.5), -4, 0x1a1a1a);
  for (let step = 0; step <= 4; step++) model.set(Math.round(-0.5 + step * 0.75), Math.round(47.5 + step * 0.65), -4, 0x1a1a1a);
  return parts(model, 54, [{ model: blinking, animate: blink(4) }]);
};

const ticketBarrier = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-8, 0, -7, -4, 15, 6, (x, y, z) => {
    if ((z === -7 || z === 6) && (x === -8 || x === -4) && y > 12) return null;
    if (y <= 1) return STEEL_DEEP;
    if (y === 12) return BRASS;
    if (z === 6 && y >= 4 && y <= 9) return (Math.floor((x + y + 64) / 2) % 2 === 0 ? HAZARD_YELLOW : HAZARD_BLACK);
    return jitter(STEEL, 0.03, noise3(x, y, z, seed));
  });
  model.fill(-7, 16, -6, -5, 16, 5, BRASS);
  model.fill(-7, 17, -2, -5, 18, 2, STEEL_DEEP);
  model.fill(-7, 18, -1, -5, 18, 1, 0x2fb89c);
  model.set(-6, 17, 5, 0x7cf29a, VOXEL_EMISSIVE);
  model.fill(-3, 6, -1, -3, 13, 0, STEEL_DARK);
  model.fill(-2, 5, 0, 5, 14, 0, (x, y) => (y === 14 || x === 5 ? BRASS : y === 5 ? STEEL_DARK : null));
  model.fill(-2, 6, 0, 4, 13, 0, PANE, VOXEL_GLASS);
  model.fill(6, 0, -2, 7, 14, 1, (x, y, z) => (y === 14 ? BRASS : y <= 1 ? STEEL_DEEP : jitter(STEEL, 0.03, noise3(x, y, z, seed + 1))));
  return parts(model, 19);
};

const ARMOUR = 0x5a6670;

const armourPlate = (seed: number): Shade => (x, y, z) => {
  const along = Math.abs(z) > Math.abs(x) ? x : z;
  if ((y - 2) % 9 === 0 || (along + 64) % 8 === 0) return darken(ARMOUR, 0.25);
  if ((y - 2) % 9 === 1 && (along + 64) % 4 === 2) return 0x9aa4ac;
  return jitter(ARMOUR, 0.025, noise3(x, y, z, seed));
};

const guardBooth = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-16, 0, -16, 15, 1, 15, (x, y, z) => (y === 1 && z >= 14 ? hazard(x, 0, z) : jitter(STEEL_DEEP, 0.03, noise3(x, y, z, seed))));
  const plate = armourPlate(seed);
  model.fill(-15, 2, -15, 14, 36, 14, (x, y, z) => (x > -14 && x < 13 && z > -14 && z < 13 ? null : plate(x, y, z)));
  model.fill(-11, 22, 13, 10, 27, 14, 0x5a8a94, VOXEL_GLASS);
  for (let x = -11; x <= 10; x += 4) model.fill(x, 22, 15, x, 27, 15, STEEL_DARK);
  model.fill(-12, 21, 15, 11, 21, 15, STEEL_DARK).fill(-12, 28, 15, 11, 28, 15, STEEL_DARK);
  model.fill(-4, 19, 15, 3, 20, 15, BRASS).fill(-3, 21, 14, 2, 21, 14, 0x101418);
  model.paintExisting(-2, 15, 14, 1, 17, 14, (x, y) => ((x + y) % 2 === 0 ? 0x1a1f22 : null));
  model.fill(6, 23, 12, 9, 26, 12, (x, y) => (y === 26 || x === 6 ? 0xd84a3a : CREAM));
  model.fill(13, 22, -8, 14, 27, 7, 0x5a8a94, VOXEL_GLASS);
  model.fill(-15, 2, -6, -15, 31, 5, (x, y, z) => (z === -6 || z === 5 || y === 31 ? darken(ARMOUR, 0.35) : jitter(0x3c4850, 0.025, noise3(x, y, z, seed + 2))));
  model.fill(-16, 15, 2, -16, 17, 3, BRASS);
  for (let y = 23; y <= 27; y++) for (let z = -3; z <= 2; z++) if (Math.hypot(y - 25, z + 0.5) <= 2.3) model.set(-15, y, z, 0x5a8a94, VOXEL_GLASS);
  model.fill(-10, 2, 9, 9, 17, 12, grained(STEEL_DARK, 0.03, seed + 3));
  model.fill(-8, 18, 10, -3, 20, 11, STEEL_DEEP);
  model.fill(-7, 19, 12, -4, 20, 12, 0x9fd8ff, VOXEL_EMISSIVE);
  model.fill(-16, 37, -16, 15, 38, 15, (x, y, z) => (y === 38 && (x === -16 || x === 15 || z === -16 || z === 15) ? hazard(x, 0, z) : jitter(STEEL_DARK, 0.03, noise3(x, y, z, seed + 4))));
  model.fill(-14, 39, -14, 13, 39, 13, grained(darken(STEEL_DARK, 0.15), 0.03, seed + 5));
  model.fill(10, 33, 15, 13, 35, 15, STEEL_DEEP).set(11, 34, 15, 0x3a8ad8).set(12, 36, 14, STEEL_DEEP);
  model.fill(11, 40, -12, 11, 50, -12, STEEL).set(11, 50, -11, 0xd84a3a);
  model.fill(-3, 40, -3, 2, 41, 2, STEEL_DEEP);
  ring(model, 1.3, 2.6, 42, 46, 0xff9a7a, VOXEL_GLASS);
  disc(model, 2.4, 47, 47, STEEL_DEEP);
  const beacon = disc(new VoxelModel(), 1.3, 42, 46, 0xff8a5a, VOXEL_EMISSIVE);
  return parts(model, 51, [{ model: beacon, animate: blink(1.6) }]);
};

const hydraulicPress = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-22, 0, -22, 21, 9, 21, (x, y, z) => {
    if (Math.abs(x + 0.5) + Math.abs(z + 0.5) > 38) return null;
    const outer = x === -22 || x === 21 || z === -22 || z === 21 || Math.abs(x + 0.5) + Math.abs(z + 0.5) > 37;
    if (outer && y >= 7) return hazard(x, y, z);
    if (y === 0) return HAZARD_BLACK;
    return jitter(STEEL_DEEP, 0.03, noise3(x, y, z, seed));
  });
  for (let x = -20; x <= 19; x += 5) for (const z of [-20, 19]) model.set(x, 10, z, STEEL);
  for (let z = -15; z <= 14; z += 5) for (const x of [-20, 19]) model.set(x, 10, z, STEEL);
  const dent = (x: number, z: number) =>
    Math.hypot(x + 0.5, z + 8.5) < 2.6 ||
    (Math.abs(x + 0.5) < 3.5 && z >= -6 && z <= 2) ||
    (Math.abs(Math.abs(x + 0.5) - 2.5) < 1.2 && z > 2 && z <= 10) ||
    (Math.abs(z + 4.5) < 1.1 && Math.abs(x + 0.5) < 8);
  model.fill(-15, 10, -15, 14, 11, 14, (x, y, z) => {
    if (y === 11 && dent(x, z)) return null;
    if (y === 10 && dent(x, z)) return darken(0x6a747a, 0.35);
    if (y === 11 && (z + 64) % 5 === 0) return darken(0x6a747a, 0.3);
    return jitter(y === 11 ? lighten(0x6a747a, 0.1) : 0x6a747a, 0.05, noise3(x, y, z, seed + 1));
  });
  const chrome: Shade = (x, y, z) => {
    const shine = Math.cos(bearing(x, z) - 0.6);
    return jitter(shine > 0.5 ? lighten(CHROME, 0.25) : shine < -0.3 ? darken(CHROME, 0.25) : CHROME, 0.02, noise3(x, y, z, seed + 2));
  };
  const columns: readonly (readonly [number, number])[] = [[-0.5, -16.5], [-14.5, 8.5], [13.5, 8.5]];
  for (const [cx, cz] of columns) {
    column(model, cx, cz, 4.2, 10, 13, STEEL_DEEP);
    column(model, cx, cz, 3.2, 14, 51, (x, y, z) => (y % 12 === 0 ? STEEL_DARK : chrome(x, y, z)));
  }
  disc(model, 20.5, 52, 57, (x, y, z) => {
    if (y === 55 || y === 56) return radial(x, z) > 19.5 ? hazard(x, y, z) : STEEL_DEEP;
    return jitter(0x3a4a52, 0.03, noise3(x, y, z, seed + 3));
  });
  model.paintExisting(-6, 53, 15, 5, 54, 21, (x, _y, z) => (radial(x, z) > 19.4 ? BRASS : null));
  disc(model, 7, 58, 62, (x, y, z) => (y === 60 ? BRASS : y === 62 ? STEEL_DARK : grained(STEEL, 0.03, seed + 4)(x, y, z)));
  disc(model, 4.2, 34, 51, chrome);
  disc(model, 13.5, 30, 33, (x, y, z) => {
    if ((y === 31 || y === 32) && radial(x, z) > 12.2) return hazard(x, y, z);
    if (y === 30) return (x + 64) % 4 === 0 || (z + 64) % 4 === 0 ? STEEL_DEEP : STEEL_DARK;
    return jitter(STEEL_DARK, 0.03, noise3(x, y, z, seed + 5));
  });
  for (let y = 10; y <= 51; y++) model.set(-20 + Math.round(Math.sin(y / 6) * 1.2), y, -4, 0x1a1a1a);
  model.fill(15, 10, 12, 20, 21, 16, (x, y, z) => (y === 21 ? STEEL_DEEP : jitter(HAZARD_YELLOW, 0.03, noise3(x, y, z, seed + 6))));
  model.fill(16, 22, 13, 19, 22, 15, STEEL_DEEP);
  model.fill(16, 23, 14, 17, 24, 15, 0xd84a3a).set(19, 23, 14, 0x3fbf7f);
  return parts(model, 63);
};

export const SET_PIECE_BUILDERS: Readonly<Record<SetPieceModel, (seed: number) => ObjectModelParts>> = {
  fountainBasin,
  fountainGrand,
  monumentStatue,
  benchCurve,
  bannerMast,
  glassKiosk,
  directoryPylon,
  receptionDesk,
  mapTable,
  triageStation,
  transitShelter,
  timetableBoard,
  ticketBarrier,
  guardBooth,
  hydraulicPress,
};
