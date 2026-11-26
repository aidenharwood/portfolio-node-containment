import type { WorldObjectModel } from '@containment/shared';
import { darken, lighten, mix } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import { blink, CITY, cylinder, grain, parts, ringAt, spin } from './cityModels.ts';
import { glyphCells, LETTERS, SYMBOLS, textCells, textWidth, type Glyph } from './glyphs.ts';
import type { ObjectModelParts } from './objectModels.ts';

export type ContainmentModel = Extract<
  WorldObjectModel,
  'blastFrameLeft' | 'blastFrameRight' | 'classPlacard' | 'warningSign' | 'sentryTower' | 'jerseyBarrier' | 'razorWire' | 'sirenBeacon' | 'deconTent' | 'containmentCrate' | 'cordonPost' | 'cargoContainer'
>;

type Builder = (seed: number) => ObjectModelParts;

const of = <T>(seed: number, options: readonly T[], salt = 0): T => options[(seed + salt) % options.length] as T;

const HAZARD = { yellow: 0xe8b81c, black: 0x1c1c1e, white: 0xe8e4d8, red: 0xc0302a, orange: 0xe86a1c } as const;
const CONCRETE = 0x8a8780;
const PANEL = 0xd8d6cc;

const stripes = (a: number, b: number, period = 3, lean = 1) => (x: number, y: number, z: number): number => (Math.floor((x * lean + y + z + 96) / period) % 2 === 0 ? a : b);

function stamp(model: VoxelModel, cells: readonly { x: number; y: number }[], x0: number, y0: number, z: number, color: number, scale = 1, emissive = false): void {
  for (const cell of cells) {
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      if (emissive) model.set(x0 + cell.x * scale + dx, y0 + cell.y * scale + dy, z, color, VOXEL_EMISSIVE);
      else model.set(x0 + cell.x * scale + dx, y0 + cell.y * scale + dy, z, color);
    }
  }
}

const blastFrame = (side: 1 | -1): Builder => (seed) => {
  const model = new VoxelModel();
  const steel = of(seed, [0x5d666c, 0x6a6e66, 0x4e5660]);
  const [x0, x1] = side === 1 ? [0, 7] : [-8, -1];
  const [l0, l1] = side === 1 ? [0, 23] : [-24, -1];
  const tall = seed % 3 === 2 ? 39 : 35;
  model.fill(x0, 0, -8, x1, tall, -3, grain(CONCRETE, 0.02));
  model.fill(x0, 0, -2, x1, tall - 2, -2, steel);
  model.fill(x0, 0, -1, x1, 9, -1, stripes(HAZARD.yellow, HAZARD.black, 3, side));
  model.fill(l0, tall - 5, -8, l1, tall, -3, grain(CONCRETE, 0.02));
  model.fill(l0, tall - 5, -2, l1, tall - 4, -2, stripes(HAZARD.yellow, HAZARD.black, 4, side));
  const inner = side === 1 ? x1 : x0;
  model.fill(inner, 4, -2, inner, tall - 7, -1, darken(steel, 0.3));
  if (seed % 2 === 0) {
    const kx = side === 1 ? 2 : -6;
    model.fill(kx, 14, -1, kx + 3, 19, -1, CITY.ink).set(kx + 1, 18, 0, CITY.green, VOXEL_EMISSIVE).set(kx + 2, 18, 0, CITY.red, VOXEL_EMISSIVE);
  } else {
    const word = of(seed, ['B1', 'B2', 'K4', 'C7'], 1);
    const width = textWidth(word);
    const lx = side === 1 ? 12 - Math.floor(width / 2) : -12 - Math.floor(width / 2);
    stamp(model, textCells(word), lx, tall - 3, -2, HAZARD.white);
  }
  const lamp = new VoxelModel();
  const glow = of(seed, [CITY.amber, CITY.red, 0x4fe3ff], 1);
  const lx = side === 1 ? 2 : -6;
  model.fill(lx, tall + 1, -7, lx + 3, tall + 1, -4, CITY.iron);
  lamp.fill(lx, tall + 2, -7, lx + 3, tall + 3, -4, glow, VOXEL_EMISSIVE);
  return parts(model, tall + 4, [{ model: lamp, animate: blink(1.4) }]);
};

interface Placard {
  readonly style: 'letter' | 'symbol' | 'text';
  readonly mark: string;
  readonly color: number;
}

const PLACARDS: readonly Placard[] = [
  { style: 'letter', mark: 'S', color: 0x2f8a4a },
  { style: 'symbol', mark: 'ring', color: HAZARD.yellow },
  { style: 'letter', mark: 'E', color: 0xd8901c },
  { style: 'letter', mark: 'K', color: HAZARD.red },
  { style: 'symbol', mark: 'ring', color: HAZARD.red },
  { style: 'text', mark: 'SC-V', color: HAZARD.red },
  { style: 'letter', mark: 'N', color: 0x6a7076 },
  { style: 'text', mark: 'SC-I', color: 0x2f8a4a },
];

const classPlacard: Builder = (seed) => {
  const placard = PLACARDS[seed % PLACARDS.length] as Placard;
  const model = new VoxelModel();
  model.fill(-1, 10, -8, 0, 12, -8, CITY.iron);
  if (placard.style === 'letter') {
    model.fill(-6, 12, -8, 5, 29, -7, HAZARD.white).fill(-6, 25, -6, 5, 29, -6, placard.color);
    model.fill(-6, 12, -6, 5, 12, -6, darken(HAZARD.white, 0.3));
    stamp(model, glyphCells(LETTERS[placard.mark] as Glyph), -3, 14, -6, placard.color, 2);
  } else if (placard.style === 'symbol') {
    model.fill(-6, 13, -8, 5, 26, -7, placard.color).fill(-6, 13, -6, 5, 13, -6, darken(placard.color, 0.35)).fill(-6, 26, -6, 5, 26, -6, darken(placard.color, 0.35));
    stamp(model, glyphCells(SYMBOLS[placard.mark] as Glyph), -4, 16, -6, placard.color === HAZARD.yellow ? HAZARD.black : HAZARD.white);
    for (const [x, y] of [[-1, 23], [-1, 15], [-4, 19], [2, 19]] as const) model.set(x, y, -6, placard.color === HAZARD.yellow ? HAZARD.black : HAZARD.white);
  } else {
    const width = textWidth(placard.mark);
    const left = -Math.floor(width / 2);
    model.fill(left - 1, 15, -8, left + width, 24, -7, HAZARD.white).fill(left - 1, 22, -6, left + width, 24, -6, placard.color);
    stamp(model, textCells(placard.mark), left, 16, -6, HAZARD.black);
  }
  return parts(model, 30);
};

function triangle(model: VoxelModel, y0: number, height: number, z: number, fill: number, border: number): void {
  for (let row = 0; row < height; row++) {
    const half = Math.round((height - row) * 0.55);
    for (let x = -half; x < half; x++) model.set(x, y0 + row, z, row < 2 || x <= -half + 1 || x >= half - 2 ? border : fill);
  }
}

function disc(model: VoxelModel, cy: number, radius: number, z: number, paint: (x: number, y: number, r: number) => number): void {
  for (let y = cy - radius; y <= cy + radius; y++) for (let x = -radius; x < radius; x++) {
    const r = Math.hypot(x + 0.5, y - cy);
    if (r <= radius) model.set(x, y, z, paint(x, y, r));
  }
}

const warningSign: Builder = (seed) => {
  const model = new VoxelModel();
  const design = seed % 8;
  model.fill(-1, 12, -8, 0, 14, -8, CITY.iron);
  if (design === 0 || design === 5) {
    triangle(model, 14, 14, -7, HAZARD.yellow, HAZARD.black);
    stamp(model, glyphCells((design === 0 ? LETTERS['!'] : SYMBOLS.bolt) as Glyph), design === 0 ? -2 : -3, 16, -6, HAZARD.black);
  } else if (design === 1 || design === 2) {
    model.fill(-6, 14, -8, 5, 27, -7, HAZARD.yellow).fill(-6, 14, -6, 5, 14, -6, HAZARD.black).fill(-6, 27, -6, 5, 27, -6, HAZARD.black);
    stamp(model, glyphCells((design === 1 ? SYMBOLS.trefoil : SYMBOLS.wedges) as Glyph), -4, 17, -6, HAZARD.black);
  } else if (design === 3 || design === 7) {
    const tone = design === 3 ? HAZARD.red : 0x2a5a9a;
    disc(model, 21, 7, -7, (_x, _y, r) => (r > 6 ? darken(tone, 0.3) : tone));
    if (design === 3) model.fill(-5, 20, -6, 4, 22, -6, HAZARD.white);
    else stamp(model, glyphCells(SYMBOLS.arrow as Glyph), -4, 19, -6, HAZARD.white);
  } else {
    const lines = design === 4 ? ['STOP'] : ['KEEP', 'OUT'];
    const height = lines.length * 6 + 3;
    model.fill(-8, 14, -8, 7, 14 + height, -7, HAZARD.white);
    model.fill(-8, 14, -6, 7, 14, -6, stripes(HAZARD.yellow, HAZARD.black, 2)).fill(-8, 14 + height, -6, 7, 14 + height, -6, stripes(HAZARD.yellow, HAZARD.black, 2));
    lines.forEach((line, index) => stamp(model, textCells(line), -Math.floor(textWidth(line) / 2), 14 + height - 6 - index * 6, -6, HAZARD.red));
  }
  return parts(model, 32);
};

const sentryTower: Builder = (seed) => {
  const model = new VoxelModel();
  const cabin = of(seed, [PANEL, 0x5e6a4a, 0x6a6e70, 0x4a5058]);
  const legTop = seed % 2 === 0 ? 40 : 46;
  const steel = 0x3a4044;
  for (const x of [-13, 11]) for (const z of [-13, 11]) model.fill(x, 0, z, x + 1, legTop, z + 1, grain(steel, 0.02));
  for (const z of [-13, 12]) for (let y = 4; y < legTop - 2; y++) {
    const t = ((y - 4) % 18) / 18;
    model.set(Math.round(-12 + t * 24), y, z, steel).set(Math.round(11 - t * 24), y, z, steel);
  }
  for (const y of [14, 28]) model.fill(-13, y, -13, 12, y, -13, steel).fill(-13, y, 12, 12, y, 12, steel);
  model.fill(-15, legTop + 1, -15, 14, legTop + 2, 14, darken(steel, 0.2));
  model.fill(-15, legTop + 3, -15, 14, legTop + 4, 14, stripes(HAZARD.yellow, HAZARD.black, 3));
  model.fill(-13, legTop + 5, -13, 12, legTop + 15, 12, grain(cabin, 0.015));
  model.fill(-13, legTop + 9, -13, 12, legTop + 12, 12, (x, _y, z) => (x === -13 || x === 12 || z === -13 || z === 12 ? 0x1a2830 : null), VOXEL_GLASS);
  model.fill(-12, legTop + 9, -12, 11, legTop + 12, 11, darken(cabin, 0.5));
  model.fill(-10, legTop + 9, -12, 9, legTop + 9, -12, 0x4fe3ff, VOXEL_EMISSIVE);
  const roof = seed % 4 < 2 ? 0 : 1;
  for (let i = 0; i <= 2 + roof * 2; i++) model.fill(-16 + i * roof * 2, legTop + 16 + i, -16 + i * roof * 2, 15 - i * roof * 2, legTop + 16 + i, 15 - i * roof * 2, i === 0 ? darken(cabin, 0.3) : darken(cabin, 0.15));
  for (const x of [-4, 3]) model.fill(x, 0, 13, x, legTop, 13, CITY.iron);
  for (let y = 3; y < legTop; y += 4) model.fill(-4, y, 13, 3, y, 13, CITY.iron);
  const top = legTop + 19 + roof * 2;
  model.fill(-1, top, -1, 0, top + 2, 0, CITY.iron);
  const head = new VoxelModel().fill(-2, top + 3, -2, 1, top + 5, 1, CITY.darkSteel).fill(-2, top + 3, 2, 1, top + 5, 2, 0xf4f0d8, VOXEL_EMISSIVE);
  if (seed % 3 === 0) model.fill(-14, 0, -16, -6, 4, -14, 0x8a7a5a).fill(5, 0, -16, 13, 4, -14, 0x8a7a5a);
  return parts(model, top + 6, [{ model: head, animate: spin(0.7) }]);
};

const jerseyBarrier: Builder = (seed) => {
  const model = new VoxelModel();
  const style = seed % 4;
  if (style === 3) {
    const tone = seed >= 4 ? HAZARD.red : HAZARD.orange;
    for (let x = -15; x <= 14; x++) {
      const end = x <= -13 || x >= 12;
      model.fill(x, 0, -5, x, end ? 10 : 12, 4, (_x, y) => (y >= 7 && y <= 9 ? HAZARD.white : tone));
    }
    model.fill(-15, 13, -2, 14, 13, 1, darken(tone, 0.2));
    return parts(model, 14);
  }
  const concrete = seed >= 4 ? 0x9a968c : CONCRETE;
  const profile: readonly (readonly [number, number, number])[] = [[0, 2, 6], [3, 5, 5], [6, 11, 3], [12, 13, 2]];
  for (const [y0, y1, half] of profile) model.fill(-15, y0, -half, 14, y1, half - 1, grain(concrete, 0.02));
  if (style === 1) model.paintExisting(-14, 6, -3, 13, 11, 2, (x, _y, z) => (z === -3 || z === 2 ? (Math.floor((x + 16) / 6) % 2 === 0 ? HAZARD.red : HAZARD.white) : null));
  if (style === 2) model.paintExisting(-14, 8, -3, 13, 9, 2, (_x, _y, z) => (z === -3 || z === 2 ? HAZARD.orange : null));
  for (const x of [-15, 14]) model.paintExisting(x, 0, -6, x, 13, 5, (_x, y, z) => stripes(HAZARD.yellow, HAZARD.black, 3)(0, y, z));
  if (seed % 2 === 1) model.fill(-2, 10, 2, 1, 10, 2, CITY.amber, VOXEL_EMISSIVE);
  if (seed === 6) model.remove(14, 13, -2).remove(14, 13, -1).remove(13, 13, -2).remove(14, 12, -3).remove(14, 11, -3);
  return parts(model, 14);
};

const razorWire: Builder = (seed) => {
  const model = new VoxelModel();
  const wire = 0x9aa2a6;
  const coils: readonly (readonly [number, number])[] = seed % 3 === 2 ? [[24, 2.4], [29, 2.4]] : [[26, seed % 3 === 0 ? 3 : 2.5]];
  for (const [cy, radius] of coils) {
    for (let step = 0; step < 192; step++) {
      const x = -16 + step / 6;
      const angle = step * 0.55 + seed;
      model.set(Math.floor(x), Math.round(cy + Math.sin(angle) * radius), Math.round(-16 + Math.cos(angle) * radius), step % 9 === 0 ? lighten(wire, 0.25) : wire);
    }
  }
  for (const post of [-16, 0]) {
    model.fill(post, 20, -16, post, 25, -16, CITY.iron);
    for (let i = 0; i <= 5; i++) model.set(post, 25 + i, -16 - Math.ceil(i * 0.7), CITY.iron).set(post, 25 + i, -16 + Math.ceil(i * 0.7), CITY.iron);
  }
  return parts(model, 32);
};

const sirenBeacon: Builder = (seed) => {
  const model = new VoxelModel();
  const glow = of(seed, [CITY.amber, HAZARD.red, 0x4f8aff, CITY.amber]);
  model.fill(-1, 24, -8, 0, 25, -1, CITY.iron).fill(-2, 26, -2, 1, 27, 1, CITY.darkSteel);
  if (seed % 2 === 0) model.fill(-3, 18, -7, 2, 23, -4, grain(0x8a9296, 0.02)).fill(-2, 19, -3, 1, 22, -3, 0x2a2e31).fill(-1, 20, -2, 0, 21, -2, 0x1a1c1e);
  if (seed % 4 === 1) model.fill(-4, 10, -8, 3, 17, -7, HAZARD.yellow).fill(-3, 11, -6, 2, 16, -6, HAZARD.black);
  const dome = new VoxelModel();
  for (let y = 28; y <= 31; y++) {
    const radius = y === 31 ? 1.4 : 2.4;
    for (let x = -3; x <= 2; x++) for (let z = -3; z <= 2; z++) {
      if (Math.hypot(x + 0.5, z + 0.5) > radius) continue;
      dome.set(x, y, z, x + 0.5 > 0 ? glow : darken(glow, 0.55), x + 0.5 > 0 ? VOXEL_EMISSIVE : VOXEL_GLASS);
    }
  }
  return parts(model, 32, [{ model: dome, animate: spin(4) }]);
};

const TENTS = [0xd8d6c8, 0xd8c87a, 0xc8d0c8, 0xd89a5a] as const;

const deconTent: Builder = (seed) => {
  const model = new VoxelModel();
  const canvas = of(seed, TENTS);
  const shape = seed % 3;
  const roofAt = (z: number): number => {
    const edge = Math.abs(z + 3);
    if (shape === 0) return 36 - Math.round(edge * 0.85);
    if (shape === 1) return Math.round(14 + Math.sqrt(Math.max(0, 12.5 * 12.5 - edge * edge)) * 1.6);
    return 30;
  };
  for (let x = -22; x <= 21; x++) {
    for (let z = -15; z <= 9; z++) {
      const roof = roofAt(z);
      const outer = x === -22 || x === 21 || z === -15 || z === 9;
      if (outer) model.fill(x, 0, z, x, roof, z, (_x, y) => (y >= 2 && y <= 4 ? stripes(HAZARD.yellow, HAZARD.black, 3)(x, y, z) : canvas));
      else model.set(x, roof, z, x % 8 === 0 ? darken(canvas, 0.15) : canvas);
    }
  }
  if (shape === 2) model.fill(-23, 31, -16, 22, 31, 10, darken(canvas, 0.2));
  model.fill(-6, 0, 9, 5, 19, 9, 0x1a1e22).fill(-6, 0, 10, -1, 19, 10, 0xc8e0e8, VOXEL_GLASS);
  model.fill(-8, 20, 9, 7, 21, 10, darken(canvas, 0.3));
  model.fill(9, 8, 10, 16, 15, 10, HAZARD.white).fill(12, 9, 11, 13, 14, 11, HAZARD.red).fill(10, 11, 11, 15, 12, 11, HAZARD.red);
  model.fill(-10, 0, 11, 9, 0, 15, (x, _y, z) => ((x + z) % 3 === 0 ? 0x3a4044 : 0x5a6064));
  if (seed % 2 === 1) model.fill(13, 0, 11, 19, 6, 15, grain(0x5e6a4a, 0.02)).set(18, 5, 15, CITY.green, VOXEL_EMISSIVE);
  const peak = roofAt(-3);
  const lamp = new VoxelModel().fill(-1, peak + 1, -4, 0, peak + 2, -3, CITY.amber, VOXEL_EMISSIVE);
  return parts(model, peak + 3, [{ model: lamp, animate: blink(1.1) }]);
};

const CRATES = [0x3a4148, 0x4a4e3e, 0x50463e, 0x34404a] as const;
const SEALS = [0x4fe3ff, CITY.amber, HAZARD.red, 0xb6ff4f] as const;

const containmentCrate: Builder = (seed) => {
  const model = new VoxelModel();
  const body = of(seed, CRATES);
  const seal = of(seed, SEALS, 1);
  const shape = seed % 4;
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): void => {
    model.fill(x0, y0, z0, x1, y1, z1, grain(body, 0.02));
    model.fill(x0, y1, z0, x1, y1, z1, lighten(body, 0.12));
    for (const x of [x0, x1]) model.fill(x, y0, z0, x, y1, z1, stripes(HAZARD.yellow, HAZARD.black, 3));
    model.fill(x0 + 2, y1 - 1, z1 + 1, x1 - 2, y1 - 1, z1 + 1, seal, VOXEL_EMISSIVE);
  };
  if (shape === 0) box(-14, 13, 0, 15, -6, 5);
  else if (shape === 1) {
    box(-14, 13, 0, 11, -6, 5);
    box(-9, 6, 12, 20, -4, 3);
  } else if (shape === 2) {
    for (const cx of [-8, 7]) {
      cylinder(model, cx, 0, 5.5, 0, 20, grain(body, 0.02));
      for (const y of [4, 16]) ringAt(model, cx, 0, 6, 1, y, HAZARD.yellow);
      cylinder(model, cx, 0, 3, 21, 21, darken(body, 0.3));
      model.set(cx, 22, 0, seal, VOXEL_EMISSIVE);
    }
  } else {
    box(-14, 13, 0, 17, -6, 5);
    model.fill(-6, 5, 6, 5, 13, 6, 0x1a2a30, VOXEL_GLASS).fill(-2, 7, 4, 1, 10, 5, seal, VOXEL_EMISSIVE);
  }
  const plate = of(seed, [0x2f8a4a, 0xd8901c, HAZARD.red], 2);
  if (shape !== 2) model.fill(-12, 4, 6, -8, 8, 6, plate).fill(-11, 5, 7, -9, 7, 7, HAZARD.white);
  return parts(model, shape === 1 ? 21 : shape === 2 ? 23 : 18);
};

const cordonPost: Builder = (seed) => {
  const model = new VoxelModel();
  const scheme = of(seed, [[HAZARD.yellow, HAZARD.black], [HAZARD.red, HAZARD.white], [HAZARD.orange, HAZARD.white]] as const);
  const [a, b] = scheme;
  if (seed % 4 === 3) {
    for (let y = 0; y <= 14; y++) {
      const radius = 3.6 - y * 0.2;
      for (let x = -4; x <= 3; x++) for (let z = -4; z <= 3; z++) if (Math.hypot(x + 0.5, z + 0.5) <= radius) model.set(x, y, z, y >= 7 && y <= 9 ? HAZARD.white : HAZARD.orange);
    }
    model.fill(-4, 0, -4, 3, 0, 3, CITY.rubber);
  } else {
    cylinder(model, 0, 0, 3, 0, 1, CITY.darkSteel);
    model.fill(-1, 2, -1, 0, 15, 0, (_x, y) => (Math.floor(y / 3) % 2 === 0 ? a : CITY.darkSteel)).fill(-1, 16, -1, 0, 16, 0, a);
  }
  const reach = seed % 3 === 1 ? 15 : 31;
  const cut = seed === 5;
  for (let x = 1; x <= reach; x++) {
    const t = x / reach;
    const sag = Math.round(Math.sin(t * Math.PI) * (reach > 16 ? 2 : 1));
    const y = cut && x > reach / 2 ? Math.max(0, 13 - (x - reach / 2)) : 13 - sag;
    model.fill(x, y, 0, x, y + 1, 0, Math.floor(x / 3) % 2 === 0 ? a : b);
  }
  return parts(model, 17);
};

const CONTAINERS = [0x8a4a2a, 0x2a5a5a, 0x2a3e6a, 0x5a2a2a, 0x5a5e60, 0x8a7a3a] as const;

const cargoContainer: Builder = (seed) => {
  const model = new VoxelModel();
  const body = of(seed, CONTAINERS);
  const rust = mix(body, 0x5a3220, 0.45);
  const length = seed % 3 === 2 ? 22 : 31;
  const x0 = -length;
  const x1 = length - 1;
  model.fill(x0, 0, -14, x1, 37, 13, (x, y, z) => {
    if ((z === -14 || z === 13) && (x - x0) % 4 === 0) return darken(body, 0.22);
    if (y === 37 || y === 0) return darken(body, 0.3);
    return body;
  });
  for (const x of [x0, x1]) for (const z of [-14, 13]) for (const y of [0, 36]) model.fill(x, y, z, x, y + 1, z, 0x2a2e31);
  model.fill(x1, 1, -1, x1, 36, 0, darken(body, 0.4));
  for (const z of [-9, -5, 4, 8]) model.fill(x1 + 1, 2, z, x1 + 1, 35, z, lighten(body, 0.25));
  for (let i = 0; i < 4; i++) {
    const cx = x0 + 3 + ((seed * 7 + i * 17) % Math.max(1, length * 2 - 8));
    const drop = 8 + ((seed * 5 + i * 11) % 18);
    for (let y = 36 - drop; y <= 36; y++) for (const z of [-14, 13]) for (const x of [cx, cx + 1]) if (x > x0 && x < x1 && model.has(x, y, z)) model.set(x, y, z, y > 36 - drop / 2 ? rust : mix(body, rust, 0.5));
  }
  if (seed % 4 === 1) model.fill(x1, 1, 1, x1, 35, 12, 0x14181a).fill(x1 - 12, 1, 14, x1, 35, 14, darken(body, 0.1));
  if (seed % 4 === 3) model.fill(x0 + 4, 38, -12, x0 + 20, 40, 10, grain(0x4a5a3a, 0.03));
  return parts(model, 41);
};

export const CONTAINMENT_BUILDERS: Readonly<Record<ContainmentModel, Builder>> = {
  blastFrameLeft: blastFrame(1),
  blastFrameRight: blastFrame(-1),
  classPlacard,
  warningSign,
  sentryTower,
  jerseyBarrier,
  razorWire,
  sirenBeacon,
  deconTent,
  containmentCrate,
  cordonPost,
  cargoContainer,
};
