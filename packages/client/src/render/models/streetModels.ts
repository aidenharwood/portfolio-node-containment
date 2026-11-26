import type { WorldObjectModel } from '@containment/shared';
import { darken, lighten, mix } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import { CITY, cylinder, grain, holoFrame, NEON, parts, rise } from './cityModels.ts';
import { columnCells, columnHeight, glyphOutline, KANA, lettersOf, SYMBOLS, textCells, textWidth, type Glyph } from './glyphs.ts';
import type { ObjectModelParts } from './objectModels.ts';

export type StreetModel = Extract<WorldObjectModel, 'bladeSign' | 'acUnit' | 'wallVent' | 'rollShutter' | 'holoPanel' | 'cableRun' | 'streetStall' | 'trashBags' | 'parkedBike'>;

type Builder = (seed: number) => ObjectModelParts;

const of = <T>(seed: number, options: readonly T[], salt = 0): T => options[(seed + salt) % options.length] as T;

const glowOf = (seed: number, salt = 0): number => of(seed, NEON, salt);

const BLADE_TEXT: readonly (string | readonly number[])[] = ['HOTEL', [0, 2, 5], 'BAR', [3, 1, 6, 4], 'RAMEN', [7, 2], 'CLUB', [5, 0, 3]];

const bladeSign: Builder = (seed) => {
  const glow = glowOf(seed);
  const frame = of(seed, [0xf4f0ff, 0xffb35a, 0x4fe3ff, 0xff4fa8], 1);
  const content = BLADE_TEXT[seed % BLADE_TEXT.length] as string | readonly number[];
  const glyphs: readonly Glyph[] = typeof content === 'string' ? lettersOf(content) : content.map((index) => KANA[index % KANA.length] as Glyph);
  const width = Math.max(...glyphs.map((glyph) => Math.max(...glyph.map((row) => row.length))));
  const height = columnHeight(glyphs);
  const depth = width + 4;
  const bottom = 20;
  const top = bottom + height + 3;
  const front = -6 + depth - 1;
  const model = new VoxelModel();
  model.fill(-1, top - 3, -8, 0, top - 2, -6, CITY.iron).fill(-1, bottom + 1, -8, 0, bottom + 2, -6, CITY.iron);
  model.fill(-1, bottom, -6, 0, top, front, CITY.ink);
  if (seed % 2 === 1) model.fill(-1, top + 1, -4, 0, top + 2 + (seed % 3), front - 2, CITY.ink);
  const face = new VoxelModel();
  for (const x of [-1, 0]) {
    for (let y = bottom; y <= top; y++) for (const z of [-6, front]) face.set(x, y, z, darken(frame, 0.15), VOXEL_EMISSIVE);
    for (let z = -6; z <= front; z++) for (const y of [bottom, top]) face.set(x, y, z, darken(frame, 0.15), VOXEL_EMISSIVE);
    for (const cell of columnCells(glyphs)) {
      const z = x === 0 ? front - 2 - cell.x : -4 + cell.x;
      face.set(x, bottom + 2 + cell.y, z, glow, VOXEL_EMISSIVE);
    }
  }
  model.merge(face);
  return parts(model, top + 4);
};

const AC_BODY = [0xc8c4b8, 0x9aa0a2, 0xb8b0a0, 0x7e8a8c] as const;

function airUnit(model: VoxelModel, x0: number, y0: number, width: number, height: number, body: number): void {
  const x1 = x0 + width - 1;
  const y1 = y0 + height - 1;
  model.fill(x0, y0, -8, x1, y1, -2, grain(body, 0.015));
  model.fill(x0, y1, -8, x1, y1, -2, lighten(body, 0.12));
  model.fill(x0, y0, -2, x1, y0, -2, darken(body, 0.25));
  const cx = x0 + Math.floor(width / 2) - 1;
  const cy = y0 + Math.floor(height / 2);
  const radius = Math.min(width, height) / 2 - 1;
  for (let y = y0 + 1; y < y1; y++) {
    for (let x = x0 + 1; x < x1; x++) {
      const r = Math.hypot(x - cx - 0.5, y - cy);
      if (r <= radius) model.set(x, y, -1, r < 1.2 ? CITY.steel : Math.abs(x - cx - 0.5) < 0.8 || Math.abs(y - cy) < 0.6 ? darken(body, 0.45) : 0x14181a);
    }
  }
  for (const x of [x0 + 1, x1 - 1]) model.fill(x, y0 - 2, -8, x, y0 - 1, -4, CITY.iron).fill(x, y0 - 1, -4, x, y0 - 1, -3, CITY.iron);
}

const acUnit: Builder = (seed) => {
  const body = of(seed, AC_BODY);
  const model = new VoxelModel();
  const layout = seed % 4;
  if (layout === 0) airUnit(model, -6, 18, 12, 9, body);
  if (layout === 1) {
    airUnit(model, -7, 8, 10, 8, body);
    airUnit(model, -3, 21, 10, 8, of(seed, AC_BODY, 1));
  }
  if (layout === 2) {
    airUnit(model, -8, 20, 8, 7, body);
    airUnit(model, 0, 20, 8, 7, body);
  }
  if (layout === 3) {
    airUnit(model, -6, 22, 12, 9, body);
    model.fill(-7, 17, -8, 6, 17, -1, CITY.iron).fill(-7, 18, -1, -7, 31, -1, CITY.iron).fill(6, 18, -1, 6, 31, -1, CITY.iron);
  }
  if (seed >= 4) model.fill(4, 0, -8, 4, 17, -7, CITY.darkSteel).fill(4, 0, -6, 5, 0, -5, darken(body, 0.6));
  if (seed % 3 === 0) model.set(4, 19 + (layout === 3 ? 4 : 0), -1, CITY.green, VOXEL_EMISSIVE);
  return parts(model, 33);
};

const wallVent: Builder = (seed) => {
  const model = new VoxelModel();
  const steam = new VoxelModel();
  const style = seed % 3;
  const warm = seed % 2 === 0;
  if (style === 0) {
    model.fill(-6, 3, -8, 5, 14, -6, grain(CITY.steel, 0.02)).fill(-5, 4, -6, 4, 13, -6, 0x101416);
    for (const y of [6, 9, 12]) model.fill(-5, y, -5, 4, y, -5, lighten(CITY.steel, 0.1));
    if (warm) model.fill(-4, 5, -7, 3, 5, -7, 0xff7a2a, VOXEL_EMISSIVE);
    steam.fill(-3, 15, -4, -1, 16, -3, 0xc8ccd0).fill(0, 18, -3, 2, 19, -2, 0xb8bcc0);
  } else if (style === 1) {
    model.fill(-3, 21, -8, 2, 26, -3, grain(CITY.darkSteel, 0.02));
    cylinder(model, 0, -3, 2.6, 5, 26, grain(CITY.steel, 0.02));
    cylinder(model, 0, -3, 3.2, 4, 4, CITY.darkSteel);
    cylinder(model, 0, -3, 1.6, 3, 3, 0x101416);
    steam.fill(-1, 0, -2, 1, 1, 0, 0xc8ccd0).fill(1, 1, -1, 2, 2, 1, 0xb8bcc0);
  } else {
    model.fill(-7, 18, -8, 6, 29, -3, grain(darken(CITY.steel, 0.15), 0.02));
    for (let y = 19; y <= 28; y++) for (let x = -6; x <= 5; x++) if (Math.hypot(x + 0.5, y - 23.5) <= 4.6) model.set(x, y, -2, Math.hypot(x + 0.5, y - 23.5) < 1.2 ? CITY.steel : (x + y) % 3 === 0 ? darken(CITY.steel, 0.3) : 0x0e1214);
    model.fill(-7, 30, -8, 6, 30, -3, CITY.iron);
    steam.fill(-2, 31, -6, 0, 32, -5, 0xc8ccd0).fill(0, 34, -5, 2, 35, -4, 0xb8bcc0);
  }
  return parts(model, 33, [{ model: steam, animate: rise(0.6, 0.5) }]);
};

const SHUTTER = [0x8a9296, 0x4a5e74, 0x7a3a30, 0x4e6a52, 0x9a8a62] as const;

const rollShutter: Builder = (seed) => {
  const body = of(seed, SHUTTER);
  const model = new VoxelModel();
  const open = seed % 3 === 1 ? 9 : seed % 3 === 2 ? 4 : 0;
  model.fill(-16, 0, -8, -15, 27, -6, CITY.darkSteel).fill(14, 0, -8, 15, 27, -6, CITY.darkSteel);
  model.fill(-16, 26, -8, 15, 30, -4, grain(darken(body, 0.35), 0.02)).fill(-16, 30, -8, 15, 30, -4, darken(body, 0.5));
  model.fill(-14, open, -8, 13, 25, -7, (_x, y) => (y % 3 === 0 ? darken(body, 0.2) : body));
  model.fill(-14, open, -6, 13, open, -6, darken(body, 0.4));
  if (open > 0) {
    const inside = of(seed, [0xffd59a, 0x9fe8ff, 0xffb35a], 3);
    model.fill(-14, 0, -8, 13, open - 1, -8, darken(inside, 0.35), VOXEL_EMISSIVE);
    model.fill(-12, 0, -7, -7, Math.min(open - 1, 5), -6, darken(body, 0.5)).fill(4, 0, -7, 10, Math.min(open - 1, 3), -6, CITY.paper);
  }
  if (seed % 4 === 3) {
    const tag = of(seed, [0xff4fa8, 0xb6ff4f, 0x4fe3ff], 1);
    for (let x = -10; x <= 6; x++) {
      const y = 12 + Math.round(Math.sin(x * 0.7) * 3);
      model.fill(x, y, -6, x, y + 1, -6, tag);
    }
  }
  if (seed % 4 === 0) {
    model.fill(-10, 31, -7, 9, 36, -5, CITY.ink);
    const word = of(seed, ['MART', 'PAWN', 'FIXT', 'NOOD'], 2).slice(0, 4);
    const glow = glowOf(seed, 3);
    const width = textWidth(word);
    for (const cell of textCells(word)) model.set(-Math.floor(width / 2) + cell.x, 31 + cell.y, -4, glow, VOXEL_EMISSIVE);
  }
  return parts(model, 37);
};

const HOLO_SYMBOLS = ['heart', 'eye', 'star', 'cat', 'bolt', 'cup', 'bowl', 'ring'] as const;
const HOLO_WORDS = ['NEW', 'BUY', 'HOT', 'NOW', 'MAX', 'FUN', 'ZAP', 'YES'] as const;

const holoPanel: Builder = (seed) => {
  const hot = glowOf(seed);
  const cool = glowOf(seed, 1);
  const tall = seed % 2 === 1;
  const left = tall ? -9 : -15;
  const right = tall ? 8 : 14;
  const bottom = tall ? 26 : 30;
  const top = tall ? 58 : 50;
  const model = new VoxelModel();
  model.fill(left, bottom, -8, right, bottom, -7, CITY.iron).fill(left, top, -8, right, top, -7, CITY.iron);
  model.fill(left, bottom, -8, left, top, -7, CITY.iron).fill(right, bottom, -8, right, top, -7, CITY.iron);
  model.fill(left, bottom, -6, right, bottom, -6, darken(cool, 0.2), VOXEL_EMISSIVE).fill(left, top, -6, right, top, -6, darken(cool, 0.2), VOXEL_EMISSIVE);
  const midX = Math.floor((left + right) / 2);
  const midY = Math.floor((bottom + top) / 2);
  const mark = new VoxelModel();
  const glyph = SYMBOLS[of(seed, HOLO_SYMBOLS)] as Glyph;
  const scale = tall ? 2 : 3;
  const gw = Math.max(...glyph.map((row) => row.length)) * scale;
  const gh = glyph.length * scale;
  for (const cell of glyphOutline(glyph)) {
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) mark.set(midX - Math.floor(gw / 2) + cell.x * scale + dx, midY - Math.floor(gh / 2) + cell.y * scale + dy, -6, hot, VOXEL_EMISSIVE);
  }
  const copy = new VoxelModel();
  const cells = tall ? columnCells([KANA[seed % KANA.length] as Glyph, KANA[(seed + 3) % KANA.length] as Glyph]) : textCells(of(seed, HOLO_WORDS, 2));
  const width = (tall ? 5 : textWidth(of(seed, HOLO_WORDS, 2))) * 2;
  const height = (tall ? 11 : 5) * 2;
  for (const cell of cells) {
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) copy.set(midX - Math.floor(width / 2) + cell.x * 2 + dx, midY - Math.floor(height / 2) + 2 + cell.y * 2 + dy, -6, lighten(cool, 0.2), VOXEL_EMISSIVE);
  }
  for (let x = left + 2; x <= right - 2; x += 2) copy.set(x, midY - Math.floor(height / 2) - 1, -6, hot, VOXEL_EMISSIVE);
  const wash = new VoxelModel().fill(left + 1, bottom + 1, -7, right - 1, top - 1, -7, (x, y) => mix(darken(hot, 0.75), darken(cool, 0.75), (y - bottom) / (top - bottom)), VOXEL_GLASS);
  model.merge(wash);
  return parts(model, top + 1, [
    { model: mark, animate: holoFrame(0, 2, 3.5) },
    { model: copy, animate: holoFrame(1, 2, 3.5) },
  ]);
};

const CABLE_TONES = [0x16181a, 0x24282c, 0x3a2a22, 0x1e2a36] as const;

const cableRun: Builder = (seed) => {
  const model = new VoxelModel();
  const lanes = seed % 3 === 0 ? [30, 27] : seed % 3 === 1 ? [30, 27, 24] : [30];
  lanes.forEach((edge, lane) => {
    const sag = 1 + ((seed + lane) % 3);
    const tone = of(seed, CABLE_TONES, lane);
    for (let x = -8; x <= 7; x++) {
      const t = (x + 8.5) / 16;
      const y = edge - Math.round(sag * 4 * t * (1 - t));
      model.fill(x, y, -7 + (lane % 2), x, y + 1, -7 + (lane % 2), tone);
    }
  });
  model.fill(-8, 22, -8, -7, 32, -6, CITY.iron);
  if (seed % 4 === 2) {
    model.fill(-3, 16, -8, 3, 24, -5, grain(0x5d666c, 0.02)).fill(-3, 24, -8, 3, 24, -5, lighten(0x5d666c, 0.15));
    model.set(2, 22, -4, of(seed, [CITY.green, CITY.amber, CITY.red], 1), VOXEL_EMISSIVE);
    model.fill(0, 25, -7, 0, 28, -7, CABLE_TONES[0]);
  }
  if (seed % 4 === 3) for (let y = 4; y <= 26; y++) model.set(5 + (y < 10 ? 1 : 0), y, -7, of(seed, CABLE_TONES, 2));
  return parts(model, 32);
};

const CANOPY = [0x9a2a2a, 0x1f6a6a, 0xb8622a, 0x5a2a7a, 0x2a4a8a] as const;

const streetStall: Builder = (seed) => {
  const tarp = of(seed, CANOPY);
  const kind = seed % 3;
  const model = new VoxelModel();
  const cart = seed >= 6;
  const wood = 0x5a4632;
  model.fill(-13, cart ? 4 : 0, -5, 12, 11, 4, grain(kind === 1 ? CITY.darkSteel : wood, 0.03));
  model.fill(-14, 12, -6, 13, 12, 5, lighten(kind === 1 ? CITY.steel : wood, 0.15));
  if (cart) {
    for (const x of [-9, 8]) {
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (Math.hypot(dx, dy) <= 3.2) for (const z of [-6, 5]) model.set(x + dx, 3 + dy, z, Math.hypot(dx, dy) < 1.2 ? CITY.steel : CITY.rubber);
    }
  }
  for (const [x, z] of [[-15, -7], [14, -7], [-15, 6], [14, 6]] as const) model.fill(x, 0, z, x, 25, z, CITY.iron);
  for (let z = -8; z <= 7; z++) {
    const y = 26 + Math.round((7 - z) / 6);
    model.fill(-16, y, z, 15, y, z, (x) => (seed % 2 === 0 && Math.floor((x + 16) / 4) % 2 === 1 ? CITY.paper : tarp));
  }
  model.fill(-16, 24, 7, 15, 25, 7, darken(tarp, 0.25));
  if (kind === 0) {
    const fruit = [0xd8742a, 0x8ab83a, 0xc8322a, 0xe8c84a] as const;
    for (let i = 0; i < 6; i++) {
      const x = -12 + i * 4;
      model.fill(x, 13, -4, x + 2, 14, 3, darken(wood, 0.2)).fill(x, 15, -3, x + 2, 15, 2, fruit[(i + seed) % fruit.length] as number);
    }
  } else if (kind === 1) {
    for (let i = 0; i < 4; i++) {
      const x = -12 + i * 6;
      model.fill(x, 13, -3, x + 4, 18, -2, CITY.ink).fill(x + 1, 14, -1, x + 3, 17, -1, of(seed, [0x4fe3ff, 0xb6ff4f, 0xff4fa8], i), VOXEL_EMISSIVE);
    }
    model.fill(-12, 13, 1, 11, 13, 3, 0x2a2e31);
  } else {
    cylinder(model, -6, 0, 3, 13, 17, CITY.steel);
    cylinder(model, 5, 0, 3, 13, 16, darken(CITY.steel, 0.2));
    cylinder(model, -6, 0, 2, 17, 17, 0xd8b070);
  }
  const lights = new VoxelModel();
  if (seed % 2 === 1 || kind === 2) for (const x of [-12, -4, 4, 12]) lights.fill(x, 21, 6, x + 1, 23, 7, of(seed, [0xff5a3a, 0xffb35a, 0xff4fa8], 1), VOXEL_EMISSIVE).set(x, 24, 7, CITY.iron);
  else model.fill(-10, 21, 7, 9, 23, 7, CITY.ink).fill(-9, 22, 8, 8, 22, 8, glowOf(seed, 2), VOXEL_EMISSIVE);
  model.merge(lights);
  const steam = new VoxelModel();
  if (kind === 2) steam.fill(-7, 19, -1, -5, 20, 0, 0xc8ccd0).fill(-6, 22, 0, -4, 23, 1, 0xb8bcc0);
  return parts(model, 29, kind === 2 ? [{ model: steam, animate: rise(1.1, 0.4) }] : []);
};

const BAGS = [0x1c1e20, 0x26332a, 0x1f2a3a, 0x2a2624, 0x6e706a] as const;

function bag(model: VoxelModel, x: number, z: number, y: number, size: number, tone: number): void {
  for (let dy = 0; dy < size; dy++) {
    const reach = size / 2 - Math.max(0, dy - size + 3) * 0.7;
    for (let dx = -Math.ceil(reach); dx <= Math.ceil(reach); dx++) {
      for (let dz = -Math.ceil(reach); dz <= Math.ceil(reach); dz++) {
        if (Math.hypot(dx, dz) <= reach) model.set(x + dx, y + dy, z + dz, dy === size - 1 ? lighten(tone, 0.18) : tone);
      }
    }
  }
  model.set(x, y + size, z, lighten(tone, 0.3));
}

const trashBags: Builder = (seed) => {
  const model = new VoxelModel();
  const count = 3 + (seed % 4);
  const spots = [[-3, -2, 0, 7], [3, -3, 0, 6], [0, 3, 0, 6], [-4, 4, 0, 5], [4, 3, 0, 5], [0, -1, 6, 5]] as const;
  for (let i = 0; i < count; i++) {
    const [x, z, y, size] = spots[(i + seed) % spots.length] as readonly [number, number, number, number];
    bag(model, x, z, i === count - 1 && count > 4 ? 5 : y, size, of(seed, BAGS, i * 2));
  }
  if (seed % 3 === 0) model.fill(-7, 0, 1, -2, 4, 6, 0x8a6a42).fill(-7, 5, 1, -2, 5, 6, lighten(0x8a6a42, 0.15));
  return parts(model, 13);
};

const BIKES = [0xb8322a, 0x2a5a9a, 0xd8d4c8, 0x1e2226, 0xc89a1c, 0x3a7a4a] as const;

function wheel(model: VoxelModel, cx: number, radius: number): void {
  for (let y = 0; y <= radius * 2; y++) {
    for (let x = -radius; x <= radius; x++) {
      const r = Math.hypot(x, y - radius);
      if (r <= radius + 0.3) model.fill(cx + x, y, -1, cx + x, y, 0, r < 1.2 ? CITY.steel : r > radius - 1.1 ? CITY.rubber : 0x2a2e31);
    }
  }
}

const parkedBike: Builder = (seed) => {
  const body = of(seed, BIKES);
  const style = seed % 4;
  const model = new VoxelModel();
  const radius = style === 2 ? 2 : 3;
  wheel(model, -5, radius);
  wheel(model, 5, radius);
  if (style === 0) {
    model.fill(-4, 4, -1, 4, 6, 0, CITY.darkSteel);
    model.fill(-1, 6, -2, 4, 9, 1, grain(body, 0.02)).fill(4, 7, -2, 6, 10, 1, darken(body, 0.2));
    model.fill(-5, 8, -1, -1, 8, 0, CITY.rubber).fill(-6, 7, -1, -5, 7, 0, body);
    model.fill(5, 11, -3, 5, 11, 2, CITY.iron);
  } else if (style === 1) {
    model.fill(-5, 4, -1, 5, 5, 0, CITY.darkSteel);
    model.fill(-1, 6, -2, 2, 8, 1, grain(body, 0.02)).fill(-5, 7, -2, -2, 7, 1, CITY.rubber);
    model.fill(4, 6, -1, 5, 13, 0, CITY.steel).fill(3, 13, -4, 5, 13, 3, CITY.steel);
  } else if (style === 2) {
    model.fill(-5, 3, -2, 3, 5, 1, grain(body, 0.02)).fill(-5, 6, -2, -1, 7, 1, grain(body, 0.02));
    model.fill(-4, 8, -1, -1, 8, 0, CITY.rubber);
    model.fill(3, 3, -2, 4, 11, 1, body).fill(4, 12, -3, 4, 12, 2, CITY.iron);
  } else {
    model.fill(-4, 4, -1, 4, 6, 0, CITY.darkSteel).fill(0, 6, -2, 4, 8, 1, grain(body, 0.02));
    model.fill(-8, 7, -3, -3, 12, 2, grain(darken(body, 0.15), 0.02)).fill(-8, 12, -3, -3, 12, 2, lighten(body, 0.1));
    model.fill(5, 9, -3, 5, 9, 2, CITY.iron);
  }
  model.set(radius === 2 ? 5 : 6, style === 1 ? 12 : 9, 0, CITY.lamp, VOXEL_EMISSIVE).set(-7, 7, 0, CITY.red, VOXEL_EMISSIVE);
  if (seed >= 4) model.fill(-3, 2, 1, 3, 2, 1, glowOf(seed), VOXEL_EMISSIVE);
  return parts(model, 14);
};

export const STREET_BUILDERS: Readonly<Record<StreetModel, Builder>> = {
  bladeSign,
  acUnit,
  wallVent,
  rollShutter,
  holoPanel,
  cableRun,
  streetStall,
  trashBags,
  parkedBike,
};

