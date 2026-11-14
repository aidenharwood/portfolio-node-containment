import type { WorldObjectModel } from '@containment/shared';
import type { Object3D } from 'three';
import { darken, jitter, lighten, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS, type VoxelKind } from '../voxel/voxelKinds.ts';
import { VoxelModel, type Paint } from '../voxel/voxelModel.ts';
import type { AnimatedPart, ObjectModelParts } from './objectModels.ts';

type CityModel = Exclude<WorldObjectModel, 'placeholder'>;
type Builder = (seed: number) => ObjectModelParts;

export const CITY = {
  iron: 0x2a2e31,
  steel: 0x5d666c,
  darkSteel: 0x262c30,
  concrete: 0x77736b,
  sodium: 0xffb35a,
  lamp: 0xffe2a8,
  wood: 0x7a5a3a,
  darkWood: 0x4a3424,
  panel: 0xd8d6cc,
  panelJoint: 0xb4b2a8,
  band: 0xe86a1c,
  ink: 0x1a1a1c,
  amber: 0xe8a21c,
  red: 0xd8322a,
  green: 0x3fbf7f,
  glass: 0x9fd6e6,
  leaf: 0x355a34,
  leafLight: 0x4d7340,
  leafDark: 0x22402a,
  soil: 0x2e2418,
  paper: 0xd8d0b8,
  rubber: 0x161618,
} as const;

export const NEON = [0xff4fa8, 0x4fe3ff, 0xb6ff4f, 0xffb35a] as const;

const grain = (color: number, amount = 0.03, salt = 0): Paint => (x, y, z) => jitter(color, amount, noise3(x, y, z, salt));

const pick = <T>(options: readonly T[], seed: number, salt = 0): T => options[Math.floor(noise3(seed, salt, 11, 17) * options.length) % options.length] as T;

const parts = (base: VoxelModel, heightVoxels: number, animated: AnimatedPart[] = []): ObjectModelParts => ({ base, animated, heightVoxels });

function cylinder(model: VoxelModel, cx: number, cz: number, radius: number, y0: number, y1: number, paint: Paint, kind?: VoxelKind): VoxelModel {
  const reach = Math.ceil(radius);
  for (let x = cx - reach; x <= cx + reach; x++) {
    for (let z = cz - reach; z <= cz + reach; z++) {
      if (Math.hypot(x - cx + 0.5, z - cz + 0.5) <= radius) model.fill(x, y0, z, x, y1, z, paint, kind);
    }
  }
  return model;
}

function blob(model: VoxelModel, cx: number, cy: number, cz: number, radius: number, paint: Paint): VoxelModel {
  const reach = Math.ceil(radius);
  for (let x = cx - reach; x <= cx + reach; x++) {
    for (let y = cy - reach; y <= cy + reach; y++) {
      for (let z = cz - reach; z <= cz + reach; z++) {
        const wobble = noise3(x, y, z, 29) * 1.4;
        if (Math.hypot(x - cx, (y - cy) * 1.2, z - cz) <= radius - wobble + 0.7) {
          const color = typeof paint === 'number' ? paint : paint(x, y, z);
          if (color !== null) model.set(x, y, z, color);
        }
      }
    }
  }
  return model;
}

const blink = (rate: number, phase = 0) => (part: Object3D, time: number, seed: number) => {
  part.visible = Math.sin(time * rate + phase + seed) > -0.3;
};

const flicker = (part: Object3D, time: number, seed: number) => {
  const beat = Math.floor(time * 9 + seed * 3);
  part.visible = noise3(beat, seed, 0, 41) > 0.05;
};

const streetLamp: Builder = () => {
  const model = new VoxelModel()
    .fill(-2, 0, -2, 1, 2, 1, grain(CITY.concrete))
    .fill(-1, 3, -1, 0, 39, 0, grain(CITY.iron, 0.02))
    .fill(-1, 38, 1, 0, 39, 5, CITY.iron)
    .fill(-3, 37, 3, 2, 39, 9, CITY.iron)
    .fill(-2, 36, 4, 1, 36, 8, CITY.sodium, VOXEL_EMISSIVE)
    .fill(-1, 14, 1, 0, 19, 1, CITY.band);
  return parts(model, 40);
};

const bollard: Builder = () => {
  const model = cylinder(new VoxelModel(), 0, 0, 2.2, 0, 8, grain(CITY.darkSteel, 0.02));
  cylinder(model, 0, 0, 2.2, 6, 7, CITY.amber);
  cylinder(model, 0, 0, 1.6, 9, 9, lighten(CITY.darkSteel, 0.2));
  return parts(model, 10);
};

const streetBench: Builder = () => {
  const model = new VoxelModel();
  for (const x of [-6, 5]) model.fill(x, 0, -3, x, 6, 2, CITY.iron).fill(x, 7, -4, x, 14, -4, CITY.iron);
  model.fill(-7, 6, -3, 6, 6, 3, (_x, _y, z) => (z % 2 === 0 ? CITY.wood : darken(CITY.wood, 0.2)));
  model.fill(-7, 9, -5, 6, 13, -5, (_x, y) => (y % 2 === 0 ? CITY.wood : null));
  return parts(model, 15);
};

const litterBin: Builder = () => {
  const body = 0x2f4a3a;
  const model = cylinder(new VoxelModel(), 0, 0, 3.2, 0, 10, grain(body, 0.03));
  cylinder(model, 0, 0, 3.6, 11, 11, lighten(body, 0.15));
  cylinder(model, 0, 0, 2, 11, 11, CITY.ink);
  model.fill(-1, 5, 3, 1, 7, 3, CITY.band);
  return parts(model, 12);
};

const vendingMachine: Builder = (seed) => {
  const glow = pick(NEON, seed);
  const model = new VoxelModel().fill(-6, 0, -7, 5, 28, -1, grain(0x1e2830, 0.02));
  model.fill(-5, 2, 0, 1, 24, 0, (x, y) => (y % 5 === 0 ? darken(glow, 0.6) : x % 3 === 0 ? darken(glow, 0.3) : lighten(glow, 0.2)), VOXEL_EMISSIVE);
  model.fill(3, 12, 0, 4, 18, 0, 0x0e1216).set(3, 16, 0, CITY.green, VOXEL_EMISSIVE);
  model.fill(-5, 0, 0, 4, 1, 0, CITY.ink);
  model.fill(-6, 25, 0, 5, 27, 0, glow, VOXEL_EMISSIVE);
  return parts(model, 29);
};

const dumpster: Builder = (seed) => {
  const body = pick([0x2f5a3a, 0x2f4a6a, 0x6a3a22], seed);
  const model = new VoxelModel().fill(-14, 2, -6, 13, 13, 5, grain(body, 0.04));
  model.paintExisting(-14, 2, 5, 13, 13, 5, (x, y) => (x % 7 === 0 ? darken(body, 0.25) : y === 13 ? lighten(body, 0.15) : null));
  model.fill(-14, 14, -7, 13, 14, 4, darken(body, 0.35));
  for (const x of [-12, 11]) for (const z of [-5, 4]) model.fill(x, 0, z, x, 1, z, CITY.rubber);
  model.fill(-4, 8, 6, 3, 10, 6, CITY.paper);
  return parts(model, 15);
};

const streetTree: Builder = (seed) => {
  const model = new VoxelModel().fill(-5, 0, -5, 4, 4, 4, grain(CITY.concrete));
  model.fill(-4, 5, -4, 3, 5, 3, CITY.soil).fill(-5, 5, -5, 4, 5, -5, CITY.concrete).fill(-5, 5, 4, 4, 5, 4, CITY.concrete);
  model.fill(-5, 5, -5, -5, 5, 4, CITY.concrete).fill(4, 5, -5, 4, 5, 4, CITY.concrete);
  model.fill(-1, 5, -1, 0, 22, 0, grain(0x4a3420, 0.05));
  const leaf: Paint = (x, y, z) => {
    const shade = noise3(x, y, z, seed + 3);
    return shade > 0.8 ? CITY.leafLight : shade < 0.25 ? CITY.leafDark : CITY.leaf;
  };
  blob(model, 0, 27, 0, 7.5, leaf);
  blob(model, 3, 23, -2, 4.5, leaf);
  return parts(model, 35);
};

const utilityPole: Builder = () => {
  const model = new VoxelModel().fill(-1, 0, -1, 0, 50, 0, grain(0x4a3420, 0.05));
  model.fill(-9, 45, -1, 8, 46, 0, darken(0x4a3420, 0.15));
  for (const x of [-8, -3, 2, 7]) model.fill(x, 47, -1, x, 48, -1, 0x9aa2a6);
  model.fill(1, 34, -3, 5, 41, 2, grain(CITY.steel, 0.03)).fill(1, 33, -2, 5, 33, 1, CITY.iron);
  model.fill(-1, 12, 1, 0, 18, 1, CITY.paper).fill(-1, 14, 1, 0, 15, 1, CITY.red);
  return parts(model, 51);
};

const parkedCar: Builder = (seed) => {
  const body = pick([0x8a2f2f, 0x2f4a6a, 0xb8b2a0, 0x3a3e42, 0xc99a1c, 0x4a5a3a], seed);
  const model = new VoxelModel().fill(-15, 3, -6, 14, 9, 5, grain(body, 0.025));
  model.fill(-15, 9, -6, 14, 9, 5, lighten(body, 0.1));
  model.fill(-7, 10, -5, 6, 15, 4, grain(body, 0.025));
  model.fill(-6, 10, -5, 5, 14, 4, 0x1a242c, VOXEL_GLASS).fill(-7, 16, -5, 6, 16, 4, lighten(body, 0.12));
  for (const x of [-11, 9]) {
    model.fill(x - 2, 0, -7, x + 2, 4, -6, CITY.rubber).fill(x - 2, 0, 5, x + 2, 4, 6, CITY.rubber);
    model.fill(x - 1, 1, -7, x + 1, 3, -7, CITY.steel).fill(x - 1, 1, 6, x + 1, 3, 6, CITY.steel);
  }
  model.fill(14, 6, -5, 14, 7, -3, CITY.lamp, VOXEL_EMISSIVE).fill(14, 6, 2, 14, 7, 4, CITY.lamp, VOXEL_EMISSIVE);
  model.fill(-15, 6, -5, -15, 7, -3, CITY.red, VOXEL_EMISSIVE).fill(-15, 6, 2, -15, 7, 4, CITY.red, VOXEL_EMISSIVE);
  model.fill(14, 3, -6, 14, 4, 5, CITY.iron).fill(-15, 3, -6, -15, 4, 5, CITY.iron);
  return parts(model, 17);
};

const foodStall: Builder = (seed) => {
  const stripe = pick(NEON, seed);
  const model = new VoxelModel().fill(-14, 0, -2, 13, 12, 5, grain(CITY.steel, 0.03));
  model.fill(-15, 13, -3, 14, 13, 6, lighten(CITY.steel, 0.25));
  model.fill(-14, 2, 6, 13, 3, 6, darken(CITY.steel, 0.3));
  for (const x of [-15, 14]) model.fill(x, 0, -7, x, 27, -7, CITY.iron);
  model.fill(-16, 28, -8, 15, 28, 7, (x) => (Math.floor((x + 16) / 4) % 2 === 0 ? darken(stripe, 0.25) : CITY.paper));
  model.fill(-16, 26, 7, 15, 27, 7, (x) => (Math.floor((x + 16) / 4) % 2 === 0 ? darken(stripe, 0.25) : CITY.paper));
  model.fill(-6, 29, -2, 5, 33, -2, CITY.ink).fill(-5, 30, -1, 4, 32, -1, stripe, VOXEL_EMISSIVE);
  cylinder(model, -7, 1, 2.5, 14, 17, CITY.darkSteel);
  model.fill(4, 14, -1, 10, 14, 3, CITY.darkSteel).fill(5, 15, 0, 9, 15, 2, 0xff7a2a, VOXEL_EMISSIVE);
  const steam = new VoxelModel().fill(-8, 19, 0, -7, 21, 1, 0xc8ccd0).fill(-7, 23, 1, -6, 24, 2, 0xb8bcc0);
  return parts(model, 34, [{ model: steam, animate: rise(1.2, 0.35) }]);
};

function rise(rate: number, reach: number) {
  return (part: Object3D, time: number, seed: number) => {
    const phase = (time * rate + seed * 0.13) % 1;
    part.position.y = phase * reach;
    part.scale.setScalar(1 - phase * 0.5);
    part.visible = phase < 0.85;
  };
}

const checkpointBarrier: Builder = () => {
  const model = new VoxelModel().fill(-8, 0, -2, -5, 14, 1, (x, y, z) => (y >= 11 && y <= 12 ? CITY.band : jitter(CITY.panel, 0.015, noise3(x, y, z, 0))));
  model.fill(-8, 15, -2, -5, 15, 1, CITY.ink);
  model.fill(-4, 12, -1, 7, 13, 0, (x) => (Math.floor((x + 4) / 3) % 2 === 0 ? CITY.red : CITY.panel));
  model.fill(7, 0, -1, 7, 11, 0, CITY.iron);
  const lamp = new VoxelModel().fill(-7, 16, -1, -6, 17, 0, CITY.red, VOXEL_EMISSIVE);
  return parts(model, 18, [{ model: lamp, animate: blink(3) }]);
};

const steamVent: Builder = () => {
  const model = new VoxelModel().fill(-6, 0, -6, 5, 0, 5, (x, _y, z) => (x === -6 || x === 5 || z === -6 || z === 5 ? CITY.steel : x % 2 === 0 ? CITY.darkSteel : 0x0c0e10));
  const steam = new VoxelModel();
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(noise3(i, 1, 0, 53) * 8) - 4;
    const z = Math.floor(noise3(i, 2, 0, 53) * 8) - 4;
    const y = 2 + Math.floor(noise3(i, 3, 0, 53) * 10);
    steam.fill(x, y, z, x + 1, y + 1, z + 1, i % 2 === 0 ? 0xc8ccd0 : 0xa8acb0);
  }
  return parts(model, 1, [{ model: steam, animate: rise(0.7, 0.6) }]);
};

const neonSign: Builder = (seed) => {
  const glow = pick(NEON, seed);
  const model = new VoxelModel().fill(-7, 17, -8, 6, 26, -7, CITY.ink);
  model.fill(-7, 17, -6, 6, 17, -6, darken(glow, 0.5)).fill(-7, 26, -6, 6, 26, -6, darken(glow, 0.5));
  const letters = new VoxelModel();
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 3; row++) {
      for (let cell = 0; cell < 2; cell++) {
        if (noise3(seed, column * 7 + row, cell, 61) < 0.35) continue;
        const x = -6 + column * 3 + cell;
        const y = 19 + row * 2;
        letters.fill(x, y, -6, x, y + 1, -6, glow, VOXEL_EMISSIVE);
      }
    }
  }
  return parts(model, 27, [{ model: letters, animate: flicker }]);
};

const shopAwning: Builder = (seed) => {
  const stripe = pick([0x8a2f2f, 0x2f6a5a, 0x2f4a6a, 0x6a4a8a], seed);
  const model = new VoxelModel();
  for (let z = -8; z <= 0; z++) {
    const y = 26 - Math.floor((z + 8) / 2);
    model.fill(-8, y, z, 7, y, z, (x) => (Math.floor((x + 8) / 2) % 2 === 0 ? stripe : CITY.paper));
  }
  model.fill(-8, 20, 1, 7, 22, 1, (x, y) => (y === 20 && x % 2 === 0 ? null : stripe));
  model.fill(-8, 23, -8, -8, 26, 0, CITY.iron).fill(7, 23, -8, 7, 26, 0, CITY.iron);
  return parts(model, 27);
};

const securityCamera: Builder = () => {
  const model = new VoxelModel().fill(-1, 26, -8, 0, 27, -5, CITY.iron);
  model.fill(-2, 23, -5, 1, 26, 0, grain(CITY.panel, 0.02)).fill(-1, 24, 1, 0, 25, 1, CITY.ink);
  model.fill(-2, 27, -5, 1, 27, 1, CITY.panelJoint);
  const led = new VoxelModel().set(1, 25, 1, CITY.red, VOXEL_EMISSIVE);
  return parts(model, 28, [{ model: led, animate: blink(2.4) }]);
};

const noticeBoard: Builder = (seed) => {
  const model = new VoxelModel().fill(-7, 11, -8, 6, 25, -7, CITY.darkWood);
  model.fill(-6, 12, -6, 5, 24, -6, 0x8a6a42);
  const sheets = [CITY.paper, 0xe8d88a, 0xc8d8e0, 0xe8b8a8, CITY.paper];
  for (let i = 0; i < 6; i++) {
    const x = -5 + Math.floor(noise3(seed, i, 0, 71) * 8);
    const y = 13 + Math.floor(noise3(seed, i, 1, 71) * 8);
    model.fill(x, y, -5, x + 2, y + 3, -5, sheets[i % sheets.length] as number);
  }
  return parts(model, 26);
};

const directorateSign: Builder = () => {
  const model = new VoxelModel().fill(-7, 15, -8, 6, 28, -7, grain(CITY.panel, 0.015));
  model.fill(-7, 26, -6, 6, 27, -6, CITY.band);
  model.fill(-6, 18, -6, -2, 24, -6, CITY.ink).fill(-5, 19, -6, -3, 23, -6, CITY.panel).fill(-4, 20, -6, -4, 22, -6, CITY.band);
  for (const y of [23, 21, 19]) model.fill(0, y, -6, y === 19 ? 3 : 5, y, -6, CITY.ink);
  return parts(model, 29);
};

const counter: Builder = (seed) => {
  const face = pick([0x4a3424, 0x2f3a40, 0x5a2f2a], seed);
  const model = new VoxelModel().fill(-8, 0, -5, 7, 13, 4, grain(face, 0.02));
  model.fill(-8, 0, 5, 7, 1, 5, CITY.ink);
  model.fill(-8, 14, -6, 7, 15, 6, grain(0x8a857b, 0.02));
  return parts(model, 16);
};

const shelving: Builder = (seed) => {
  const model = new VoxelModel();
  for (const x of [-7, 6]) model.fill(x, 0, -7, x, 28, -2, CITY.steel);
  const goods = [0xc8553a, 0x3a7ac8, 0xd8c26a, 0x5aa86a, 0xd8d0b8, 0x8a5ac8];
  for (const y of [1, 8, 15, 22]) {
    model.fill(-6, y, -7, 5, y, -2, darken(CITY.steel, 0.2));
    for (let x = -6; x <= 5; x += 3) {
      if (noise3(seed, x, y, 79) < 0.2) continue;
      const height = 2 + Math.floor(noise3(seed, x, y, 83) * 4);
      model.fill(x, y + 1, -6, x + 1, y + height, -3, goods[Math.floor(noise3(seed, x, y, 89) * goods.length)] as number);
    }
  }
  model.fill(-7, 28, -7, 6, 28, -2, darken(CITY.steel, 0.2));
  return parts(model, 29);
};

const table: Builder = (seed) => {
  const top = pick([CITY.wood, 0x8a857b, 0x3a4248], seed);
  const model = new VoxelModel().fill(-6, 11, -6, 5, 12, 5, grain(top, 0.02));
  for (const x of [-5, 4]) for (const z of [-5, 4]) model.fill(x, 0, z, x, 10, z, CITY.iron);
  return parts(model, 13);
};

const chair: Builder = (seed) => {
  const seat = pick([0x8a2f2f, 0x2f4a6a, CITY.wood, 0x3a3e42], seed);
  const model = new VoxelModel().fill(-3, 6, -3, 2, 7, 2, seat).fill(-3, 8, -4, 2, 15, -4, seat);
  for (const x of [-3, 2]) for (const z of [-3, 2]) model.fill(x, 0, z, x, 5, z, CITY.iron);
  return parts(model, 16);
};

const bed: Builder = (seed) => {
  const blanket = pick([0x6a3a4a, 0x3a5a6a, 0x5a6a3a, 0x4a4a5a], seed);
  const model = new VoxelModel().fill(-6, 0, -8, 5, 3, 7, CITY.iron).fill(-6, 4, -7, 5, 5, 6, 0xb8b2a0);
  model.fill(-5, 6, -6, 4, 7, -4, CITY.paper);
  model.fill(-6, 6, -2, 5, 6, 6, (x, _y, z) => ((x + z) % 4 === 0 ? darken(blanket, 0.2) : blanket));
  model.fill(-6, 4, -8, 5, 12, -8, CITY.darkSteel);
  return parts(model, 13);
};

const storageLocker: Builder = () => {
  const body = 0x4a5a64;
  const model = new VoxelModel().fill(-6, 0, -8, 5, 28, -3, grain(body, 0.02));
  model.fill(-6, 28, -8, 5, 28, -3, lighten(body, 0.15));
  model.paintExisting(-6, 0, -3, 5, 28, -3, (x, y) => (x === 0 ? darken(body, 0.35) : y >= 22 && y <= 25 && y % 2 === 0 ? darken(body, 0.45) : null));
  model.fill(-2, 13, -2, -2, 15, -2, CITY.steel).fill(1, 13, -2, 1, 15, -2, CITY.steel);
  model.fill(-5, 18, -2, -3, 19, -2, CITY.paper);
  return parts(model, 29);
};

const containmentCell: Builder = () => {
  const model = new VoxelModel().fill(-16, 0, -16, 15, 2, 15, grain(0x2a2e31, 0.02));
  model.paintExisting(-16, 2, -16, 15, 2, 15, (x, _y, z) => {
    const edge = Math.max(Math.abs(x + 0.5), Math.abs(z + 0.5));
    if (edge < 15) return null;
    return (x + z + 64) % 4 < 2 ? CITY.amber : CITY.ink;
  });
  model.fill(-14, 3, -14, 13, 3, 13, 0x3a4044);
  for (const x of [-14, 13]) for (const z of [-14, 13]) model.fill(x, 3, z, x, 30, z, grain(CITY.panel, 0.015));
  for (let along = -13; along <= 12; along++) {
    for (const edge of [-14, 13]) {
      model.fill(along, 4, edge, along, 28, edge, CITY.glass, VOXEL_GLASS);
      model.fill(edge, 4, along, edge, 28, along, CITY.glass, VOXEL_GLASS);
      model.set(along, 3, edge, CITY.amber, VOXEL_EMISSIVE).set(edge, 3, along, CITY.amber, VOXEL_EMISSIVE);
    }
  }
  model.fill(-14, 29, -14, 13, 30, 13, (x, _y, z) => (Math.abs(x + 0.5) > 12 || Math.abs(z + 0.5) > 12 ? CITY.band : CITY.panel));
  model.fill(-3, 31, -3, 2, 31, 2, CITY.darkSteel);
  return parts(model, 32);
};

const keycardReader: Builder = () => {
  const model = new VoxelModel().fill(-2, 13, -8, 1, 19, -6, grain(CITY.panel, 0.015));
  model.fill(-1, 15, -5, 0, 17, -5, CITY.ink);
  const led = new VoxelModel().set(-1, 18, -5, CITY.red, VOXEL_EMISSIVE).set(0, 18, -5, CITY.green, VOXEL_EMISSIVE);
  return parts(model, 20, [{ model: led, animate: blink(1.6) }]);
};

const clockTower: Builder = () => {
  const brick = 0x6e3b2e;
  const model = new VoxelModel().fill(-14, 0, -14, 13, 3, 13, grain(CITY.concrete));
  model.fill(-10, 4, -10, 9, 58, 9, (x, y, z) => (y % 4 === 0 ? 0x4f2a20 : jitter(brick, 0.05, noise3(x, y, z, 5))));
  model.fill(-11, 40, -11, 10, 41, 10, CITY.concrete).fill(-11, 57, -11, 10, 58, 10, CITY.concrete);
  for (let x = -6; x <= 5; x++) {
    for (let y = 43; y <= 54; y++) {
      if (Math.hypot(x + 0.5, y - 48.5) > 5.8) continue;
      model.set(x, y, 10, CITY.lamp, VOXEL_EMISSIVE).set(x, y, -11, CITY.lamp, VOXEL_EMISSIVE).set(10, y, x, CITY.lamp, VOXEL_EMISSIVE).set(-11, y, x, CITY.lamp, VOXEL_EMISSIVE);
    }
  }
  model.fill(0, 48, 11, 0, 53, 11, CITY.ink).fill(0, 48, 11, 3, 48, 11, CITY.ink);
  model.fill(0, 48, -12, 0, 53, -12, CITY.ink).fill(-3, 48, -12, 0, 48, -12, CITY.ink);
  model.fill(11, 48, 0, 11, 53, 0, CITY.ink).fill(11, 48, -3, 11, 48, 0, CITY.ink);
  model.fill(-12, 48, 0, -12, 53, 0, CITY.ink).fill(-12, 48, 0, -12, 48, 3, CITY.ink);
  for (let step = 0; step < 5; step++) model.fill(-10 + step * 2, 59 + step * 2, -10 + step * 2, 9 - step * 2, 60 + step * 2, 9 - step * 2, grain(CITY.iron, 0.02));
  model.fill(-1, 69, -1, 0, 76, 0, CITY.iron).fill(-1, 74, -1, 0, 74, 0, CITY.red, VOXEL_EMISSIVE);
  model.fill(-3, 4, 10, 2, 12, 10, CITY.darkWood);
  return parts(model, 77);
};

const washingLine: Builder = (seed) => {
  const model = new VoxelModel();
  for (const x of [-7, 6]) model.fill(x, 0, 0, x, 20, 0, CITY.iron);
  model.fill(-6, 19, 0, 5, 19, 0, CITY.paper);
  const cloth = [0xc84a4a, 0x4a7ac8, CITY.paper, 0xd8b84a, 0x5aa86a, 0x8a5ab8];
  let x = -5;
  for (let i = 0; x < 5; i++) {
    const width = 2 + Math.floor(noise3(seed, i, 0, 13) * 3);
    const drop = 5 + Math.floor(noise3(seed, i, 1, 13) * 6);
    model.fill(x, 19 - drop, 0, Math.min(5, x + width - 1), 18, 0, cloth[Math.floor(noise3(seed, i, 2, 13) * cloth.length) % cloth.length] as number);
    x += width + 1;
  }
  return parts(model, 21);
};

const exchangePost: Builder = () => {
  const body = 0x1f4a4a;
  const model = cylinder(new VoxelModel(), 0, 0, 4.2, 0, 1, CITY.iron);
  cylinder(model, 0, 0, 3.6, 2, 18, grain(body, 0.03));
  cylinder(model, 0, 0, 4.2, 19, 20, lighten(body, 0.15));
  model.fill(-2, 14, 3, 1, 14, 3, CITY.ink);
  model.fill(-2, 7, 3, 1, 11, 3, 0x4fe3ff, VOXEL_EMISSIVE);
  model.fill(-3, 16, 3, 2, 17, 3, CITY.band);
  return parts(model, 21);
};

const contractBoard: Builder = (seed) => {
  const model = new VoxelModel().fill(-7, 10, -8, 6, 27, -7, grain(CITY.panel, 0.015));
  model.fill(-7, 24, -6, 6, 27, -6, CITY.band);
  model.fill(-5, 25, -5, 4, 26, -5, CITY.ink);
  for (let i = 0; i < 6; i++) {
    const x = -6 + (i % 3) * 4;
    const y = 12 + Math.floor(i / 3) * 6;
    const tag = noise3(seed, i, 0, 31) > 0.6 ? CITY.red : CITY.amber;
    model.fill(x, y, -6, x + 2, y + 4, -6, CITY.paper).fill(x, y + 4, -5, x + 2, y + 4, -5, tag);
  }
  return parts(model, 28);
};

const marketStall: Builder = (seed) => {
  const stripe = pick([0xc84a4a, 0x2f6a8a, 0x3f8a4a, 0xd8a03a], seed);
  const model = new VoxelModel().fill(-15, 0, -6, 14, 11, 3, grain(CITY.wood, 0.05));
  model.fill(-15, 12, -7, 14, 13, 4, grain(CITY.darkWood, 0.03));
  const goods = [0xd8a03a, 0x8ab84a, 0xc84a4a, CITY.paper, 0xe8d88a, 0x6a8ab8];
  for (let i = 0; i < 7; i++) {
    const x = -14 + i * 4;
    const color = goods[Math.floor(noise3(seed, i, 0, 23) * goods.length) % goods.length] as number;
    model.fill(x, 14, -5, x + 2, 15 + Math.floor(noise3(seed, i, 1, 23) * 3), 2, color);
  }
  for (const x of [-15, 14]) for (const z of [-7, 4]) model.fill(x, 0, z, x, 30, z, CITY.iron);
  model.fill(-16, 30, -8, 15, 31, 6, (x) => (Math.floor((x + 16) / 4) % 2 === 0 ? stripe : CITY.paper));
  model.fill(-16, 28, 6, 15, 29, 6, (x) => (Math.floor((x + 16) / 4) % 2 === 0 ? stripe : CITY.paper));
  return parts(model, 32);
};

const headframe: Builder = () => {
  const steel = 0x3a4a52;
  const model = new VoxelModel().fill(-15, 0, -15, 14, 2, 14, grain(CITY.concrete));
  for (const x of [-12, 11]) for (const z of [-12, 11]) {
    for (let y = 3; y <= 80; y++) {
      const lean = Math.floor((y - 3) / 11);
      const px = x < 0 ? x + lean : x - lean;
      const pz = z < 0 ? z + lean : z - lean;
      model.fill(px, y, pz, px + (x < 0 ? 1 : -1), y, pz + (z < 0 ? 1 : -1), steel);
    }
  }
  for (let y = 14; y <= 74; y += 15) {
    const inset = Math.floor((y - 3) / 11);
    const lo = -12 + inset;
    const hi = 11 - inset;
    model.fill(lo, y, lo, hi, y, lo, steel).fill(lo, y, hi, hi, y, hi, steel).fill(lo, y, lo, lo, y, hi, steel).fill(hi, y, lo, hi, y, hi, steel);
  }
  model.fill(-6, 80, -6, 5, 81, 5, CITY.band);
  for (let a = 0; a < 48; a++) {
    const angle = (a / 48) * Math.PI * 2;
    const y = Math.round(88 + Math.sin(angle) * 7);
    const z = Math.round(Math.cos(angle) * 7);
    model.set(-1, y, z, CITY.darkSteel).set(0, y, z, CITY.darkSteel);
  }
  model.fill(-1, 82, 0, 0, 88, 0, CITY.darkSteel);
  model.fill(-1, 96, -1, 0, 96, 0, CITY.red, VOXEL_EMISSIVE);
  model.fill(-14, 3, 14, 13, 8, 14, (x) => (Math.floor((x + 14) / 3) % 2 === 0 ? CITY.amber : CITY.ink));
  return parts(model, 97);
};

const mooringPost: Builder = () => {
  const model = cylinder(new VoxelModel(), 0, 0, 2.6, 0, 6, grain(CITY.iron, 0.03));
  cylinder(model, 0, 0, 3.4, 7, 8, CITY.iron);
  model.fill(-3, 4, -3, 2, 4, 2, (x, _y, z) => ((x + z) % 2 === 0 ? 0xb8a070 : null));
  return parts(model, 9);
};

const liftDoor: Builder = () => {
  const model = new VoxelModel().fill(-8, 0, -8, 7, 31, -7, grain(CITY.panel, 0.015));
  model.fill(-6, 0, -6, 5, 26, -6, CITY.darkSteel).fill(0, 0, -5, 0, 26, -5, CITY.ink);
  model.fill(-8, 28, -6, 7, 31, -6, CITY.band);
  model.fill(-2, 29, -5, 1, 30, -5, CITY.red, VOXEL_EMISSIVE);
  model.fill(6, 12, -5, 6, 15, -5, CITY.amber, VOXEL_EMISSIVE);
  return parts(model, 32);
};

export const CITY_BUILDERS: Readonly<Record<CityModel, Builder>> = {
  streetLamp,
  bollard,
  streetBench,
  litterBin,
  vendingMachine,
  dumpster,
  streetTree,
  utilityPole,
  parkedCar,
  foodStall,
  checkpointBarrier,
  steamVent,
  neonSign,
  shopAwning,
  securityCamera,
  noticeBoard,
  directorateSign,
  counter,
  shelving,
  table,
  chair,
  bed,
  storageLocker,
  containmentCell,
  keycardReader,
  clockTower,
  washingLine,
  exchangePost,
  contractBoard,
  marketStall,
  headframe,
  mooringPost,
  liftDoor,
};
