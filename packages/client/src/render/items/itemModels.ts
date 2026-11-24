import type { GearForm, GearMotif, ItemDefinition, ItemIconShape } from '@containment/shared';
import { iconForm } from './itemFormPasses.ts';
import { reshapeForForm } from '../voxel/formReshape.ts';
import { darken, hex, jitter, lighten, mix, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS, type VoxelKind } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';

export interface ItemPalette {
  readonly primary: number;
  readonly secondary: number;
  readonly emissive: number | null;
  readonly motif: GearMotif | null;
  readonly form: GearForm | null;
}

type ItemBuilder = (palette: ItemPalette) => VoxelModel;

export function itemPalette(item: ItemDefinition): ItemPalette {
  const visual = item.equipment?.visual;
  if (visual) {
    return { primary: hex(visual.primary), secondary: hex(visual.secondary), emissive: visual.emissive ? hex(visual.emissive) : null, motif: visual.motif ?? null, form: visual.form ?? null };
  }
  const [primary, secondary] = item.iconColors;
  return { primary: hex(primary), secondary: hex(secondary), emissive: null, motif: null, form: null };
}

const grain = (color: number, amount = 0.035) => (x: number, y: number, z: number) => jitter(color, amount, noise3(x, y, z, 13));

function line(model: VoxelModel, from: readonly [number, number, number], to: readonly [number, number, number], color: number, kind?: typeof VOXEL_EMISSIVE): void {
  const steps = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]), Math.abs(to[2] - from[2]));
  for (let step = 0; step <= steps; step++) {
    const t = steps === 0 ? 0 : step / steps;
    model.set(
      Math.round(from[0] + (to[0] - from[0]) * t),
      Math.round(from[1] + (to[1] - from[1]) * t),
      Math.round(from[2] + (to[2] - from[2]) * t),
      color,
      kind,
    );
  }
}

const helmet: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  for (let x = -6; x <= 6; x++) {
    for (let y = 0; y <= 7; y++) {
      for (let z = -6; z <= 6; z++) {
        const radius = Math.hypot(x, y * 1.15, z);
        if (radius > 6.6 || radius < 5.2) continue;
        model.set(x, y, z, y === 0 ? secondary : jitter(primary, 0.04, noise3(x, y, z)));
      }
    }
  }
  const visor = emissive ? mix(emissive, 0x0c1216, 0.72) : 0x1a2630;
  model.fill(-4, 1, 6, 4, 4, 6, (x, y) => (y === 4 ? 0x0c1216 : x === 2 && y === 2 ? lighten(visor, 0.35) : visor));
  model.fill(-6, 2, 4, -6, 3, 5, visor).fill(6, 2, 4, 6, 3, 5, visor);
  if (emissive) model.fill(-3, 3, 7, 3, 3, 7, emissive, VOXEL_EMISSIVE);
  model.fill(-7, 2, -1, -7, 3, 1, secondary).fill(-7, 4, -1, -7, 6, -1, darken(primary, 0.3));
  model.fill(-4, -1, -6, 4, 0, -6, darken(primary, 0.15));
  return model;
};

const hoodLike = (deep: boolean): ItemBuilder => ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  for (let x = -6; x <= 6; x++) {
    for (let y = -4; y <= 8; y++) {
      for (let z = -6; z <= 6; z++) {
        const radius = Math.hypot(x, Math.max(0, y) * 1.1, z);
        if (radius > 6.6 || radius < 5.2) continue;
        const face = z > 2 && y < 5 && Math.abs(x) < 5;
        if (face) continue;
        if (y < 0 && z > -3) continue;
        model.set(x, y, z, z > 3 && y >= 5 ? secondary : jitter(primary, 0.04, noise3(x, y, z, 5)));
      }
    }
  }
  model.fill(-1, 8, -5, 1, 9, -3, darken(primary, 0.1));
  if (deep) {
    model.fill(-4, 0, 4, 4, 2, 4, secondary);
    model.fill(-4, 5, 6, 4, 5, 6, darken(primary, 0.15));
  }
  if (emissive) model.fill(-1, 4, deep ? 6 : 5, 1, 4, deep ? 6 : 5, emissive, VOXEL_EMISSIVE);
  return model;
};

const pack: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  model.fill(-4, 0, -2, 4, 9, 2, (x, y, z) => (y === 0 ? darken(primary, 0.3) : jitter(primary, 0.04, noise3(x, y, z, 7))));
  model.fill(-3, 1, 3, 3, 4, 3, darken(primary, 0.15));
  model.fill(-5, 10, -2, 5, 11, 1, secondary);
  for (const x of [-2, 2]) model.fill(x, 3, -3, x, 9, -3, darken(secondary, 0.2));
  if (emissive) model.set(2, 7, 3, emissive, VOXEL_EMISSIVE);
  return model;
};

const cape: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  for (let y = 0; y <= 12; y++) {
    const half = 3 + Math.floor((12 - y) / 3);
    for (let x = -half; x <= half; x++) {
      if (x === 0 && y < 7) continue;
      model.set(x, y, Math.round(Math.abs(x) * 0.3), y <= 1 || Math.abs(x) === half ? secondary : jitter(x % 2 === 0 ? primary : darken(primary, 0.08), 0.03, noise3(x, y, 0, 9)));
    }
  }
  model.fill(-4, 13, 0, 4, 13, 1, darken(primary, 0.15));
  if (emissive) model.fill(-2, 12, -1, 2, 12, -1, emissive, VOXEL_EMISSIVE);
  else for (const x of [-3, 3]) model.set(x, 12, -1, secondary);
  return model;
};

const hoodBase = hoodLike(false);
const cowlBase = hoodLike(true);

const hood: ItemBuilder = (palette) => {
  const model = hoodBase(palette);
  model.fill(-4, 5, 6, 4, 5, 8, palette.secondary);
  for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
    const x = Math.round(Math.cos(angle) * 6);
    const z = Math.round(Math.sin(angle) * 6);
    model.fill(x, -4, z, x, -3, z, darken(palette.primary, 0.2));
  }
  return model;
};

const cowl: ItemBuilder = (palette) => {
  const model = cowlBase(palette);
  const glow = palette.emissive ?? lighten(palette.secondary, 0.4);
  const kind = palette.emissive ? VOXEL_EMISSIVE : undefined;
  for (let angle = 0; angle < Math.PI * 2; angle += 0.1) model.set(Math.round(Math.cos(angle) * 7), 5, Math.round(Math.sin(angle) * 7), darken(palette.primary, 0.25));
  for (const [x, z] of [[7, 0], [-7, 0], [0, 7], [0, -7]] as const) model.set(x, 5, z, glow, kind);
  for (const x of [-3, 3]) model.fill(x, 9, -3, x, 10, -3, darken(palette.secondary, 0.2)).set(x, 11, -3, glow, kind);
  for (let y = -6; y <= -4; y++) {
    for (let angle = 0; angle < Math.PI * 2; angle += 0.12) {
      const radius = 7 + (y + 6) * 0.5;
      model.set(Math.round(Math.cos(angle) * radius), y, Math.round(Math.sin(angle) * radius), darken(palette.primary, 0.08));
    }
  }
  if (palette.emissive) model.fill(0, 1, 6, 0, 4, 6, palette.emissive, VOXEL_EMISSIVE);
  return model;
};

const visor: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  for (let x = -6; x <= 6; x++) {
    const depth = Math.round(Math.abs(x) * 0.5);
    model.fill(x, 0, -depth, x, 3, -depth, Math.abs(x) >= 5 ? secondary : primary);
  }
  model.fill(-4, 1, 1, 4, 2, 1, emissive ?? lighten(primary, 0.3), emissive ? VOXEL_EMISSIVE : undefined);
  model.fill(-7, 1, -4, -7, 2, -2, secondary).fill(7, 1, -4, 7, 2, -2, secondary);
  return model;
};

const garment = (withCoatTails: boolean): ItemBuilder => ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  const bottom = withCoatTails ? -6 : 0;
  model.fill(-5, bottom, -2, 5, 11, 1, grain(primary));
  model.fill(-9, 7, -2, -6, 11, 1, grain(darken(primary, 0.08)));
  model.fill(6, 7, -2, 9, 11, 1, grain(darken(primary, 0.08)));
  model.fill(-2, 10, 2, 2, 11, 2, darken(primary, 0.35));
  model.fill(0, bottom, 2, 0, 9, 2, secondary);
  model.fill(2, 7, 2, 4, 8, 2, secondary);
  if (emissive) model.fill(-3, 4, 2, -3, 8, 2, emissive, VOXEL_EMISSIVE);
  return model;
};

const vest: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel().fill(-5, 0, -2, 5, 12, 1, grain(secondary));
  model.fill(-5, 3, 2, 5, 11, 2, grain(primary));
  model.fill(-5, 3, -3, 5, 11, -3, grain(darken(primary, 0.1)));
  model.fill(-6, 10, -2, -5, 12, 1, lighten(primary, 0.15)).fill(5, 10, -2, 6, 12, 1, lighten(primary, 0.15));
  for (const x of [-4, -1, 2]) model.fill(x, 1, 2, x + 1, 2, 3, darken(secondary, 0.3));
  if (emissive) model.fill(-2, 5, 3, -2, 9, 3, emissive, VOXEL_EMISSIVE);
  return model;
};

const gloves: ItemBuilder = ({ primary, secondary, emissive, motif }) => {
  const model = new VoxelModel();
  for (const offset of [-5, 2]) {
    const fingerTop = motif === 'skirmisher' ? 7 : 9;
    model.fill(offset, 0, -1, offset + 3, 6, 1, motif === 'warden' ? (x, y) => ((x + y) % 3 === 0 ? lighten(primary, 0.18) : primary) : grain(primary));
    for (let finger = 0; finger < 4; finger++) model.fill(offset + finger, 7, -1, offset + finger, fingerTop - (finger === 0 ? 2 : 0), 0, primary);
    if (motif === 'bulwark') {
      model.fill(offset - 1, 0, -2, offset + 4, 2, 2, lighten(primary, 0.15));
      model.fill(offset - 1, 0, -2, offset + 4, 0, 2, secondary);
      model.fill(offset, 6, 2, offset + 3, 6, 2, lighten(primary, 0.25));
    } else if (motif === 'skirmisher') {
      model.fill(offset, 2, -1, offset + 3, 2, 1, secondary).set(offset + 3, 2, 2, 0xb8b0a0);
    } else {
      model.fill(offset, 0, -1, offset + 3, 1, 1, secondary);
    }
    if (motif === 'warden') {
      line(model, [offset + 3, 0, 0], [offset + 5, -3, 0], primary);
      if (emissive) model.fill(offset + 1, 3, 2, offset + 2, 3, 2, emissive, VOXEL_EMISSIVE);
    }
  }
  return model;
};

const trousers: ItemBuilder = ({ primary, secondary, emissive, motif }) => {
  const model = new VoxelModel().fill(-5, 12, -2, 5, 14, 1, secondary);
  model.fill(-5, 0, -2, -1, 11, 1, grain(primary)).fill(1, 0, -2, 5, 11, 1, grain(primary));
  if (motif === 'bulwark') {
    for (const x of [-5, 1]) model.fill(x, 5, 2, x + 3, 7, 3, lighten(primary, 0.2));
    model.fill(-6, 9, -2, -6, 12, 1, lighten(primary, 0.1)).fill(6, 9, -2, 6, 12, 1, lighten(primary, 0.1));
  } else if (motif === 'skirmisher') {
    model.fill(5, 6, -1, 6, 9, 1, darken(primary, 0.15));
    model.fill(-5, 8, 2, 5, 8, 2, secondary);
  } else if (motif === 'warden') {
    for (let y = 4; y <= 12; y++) {
      const half = Math.round(5 + (12 - y) / 4);
      model.fill(-half, y, -3, half, y, 2, (x, _y, z) => (Math.abs(x) === half || Math.abs(z) >= 2 ? grain(primary)(x, y, z) : null));
    }
    model.fill(-1, 3, 3, 1, 12, 3, secondary);
    if (emissive) for (const y of [5, 8, 11]) model.set(0, y, 4, emissive, VOXEL_EMISSIVE);
  } else {
    model.fill(-5, 5, 2, -1, 6, 2, darken(primary, 0.3)).fill(1, 5, 2, 5, 6, 2, darken(primary, 0.3));
  }
  return model;
};

const boots: ItemBuilder = ({ primary, secondary, emissive, motif }) => {
  const model = new VoxelModel();
  for (const x of [-5, 1]) {
    const shaft = motif === 'bulwark' ? 9 : motif === 'skirmisher' ? 5 : 8;
    model.fill(x, 1, -3, x + 3, shaft, 0, motif === 'warden' ? (vx, vy) => ((vx + vy) % 3 === 0 ? lighten(primary, 0.18) : primary) : grain(primary));
    model.fill(x, 1, 1, x + 3, 3, 4, grain(primary));
    model.fill(x, 0, -3, x + 3, 0, 4, motif === 'skirmisher' ? (_vx, _vy, z) => (z % 2 === 0 ? darken(secondary, 0.2) : secondary) : secondary);
    if (motif === 'bulwark') {
      model.fill(x, -1, -3, x + 3, -1, 4, darken(secondary, 0.2));
      model.fill(x, 1, 3, x + 3, 2, 4, lighten(primary, 0.25));
      model.fill(x, 5, 1, x + 3, 6, 1, lighten(primary, 0.2));
    } else if (motif === 'skirmisher') {
      model.set(x + 1, 3, 4, 0xd8d2c4).set(x + 2, 4, 3, 0xd8d2c4);
    } else if (motif === 'warden' && emissive) {
      model.set(x + 1, 4, 1, emissive, VOXEL_EMISSIVE);
    }
    model.fill(x, shaft, -3, x + 3, shaft, 0, lighten(primary, 0.15));
  }
  return model;
};

const baton: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  line(model, [-6, 0, 0], [6, 12, 0], primary);
  line(model, [-6, 1, 0], [6, 13, 0], darken(primary, 0.2));
  line(model, [-6, 0, 0], [-3, 3, 0], secondary);
  line(model, [-3, 3, 1], [-1, 1, 1], secondary);
  model.fill(-2, 3, -1, -1, 4, 1, darken(primary, 0.35));
  const glow = emissive ?? lighten(primary, 0.4);
  const kind = emissive ? VOXEL_EMISSIVE : undefined;
  line(model, [7, 12, 0], [8, 13, 0], glow, kind);
  line(model, [6, 14, 0], [7, 15, 0], glow, kind);
  return model;
};

const pistol: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel().fill(-6, 6, -1, 7, 9, 1, grain(primary));
  model.fill(-5, 0, -1, -2, 6, 1, secondary);
  model.fill(-1, 4, 0, 1, 5, 0, darken(primary, 0.4));
  model.fill(8, 7, 0, 8, 8, 0, darken(primary, 0.5));
  for (const x of [1, 4]) model.fill(x, 5, -2, x, 10, 2, (_x, y, z) => (y === 5 || y === 10 || Math.abs(z) === 2 ? darken(primary, 0.25) : null));
  if (emissive) model.fill(2, 10, 0, 3, 10, 0, emissive, VOXEL_EMISSIVE);
  return model;
};

const insulatedGrip = (model: VoxelModel, top: number, secondary: number): void => {
  model.fill(-1, 0, -1, 1, top, 1, (x, y, z) => (y % 2 === 0 ? (y === 0 ? secondary : lighten(secondary, 0.3)) : x === 0 && z === 0 ? secondary : null));
};

const traceShard = (model: VoxelModel, base: number, halves: readonly number[], glow: number, kind: VoxelKind): void => {
  halves.forEach((half, row) => {
    for (let x = -half; x <= half; x++) {
      for (let z = -half; z <= half; z++) {
        const reach = Math.abs(x) + Math.abs(z);
        if (reach <= half) model.set(x, base + row, z, reach === half && half > 0 ? lighten(glow, 0.35) : glow, kind);
      }
    }
  });
};

const psionicGlow = (primary: number, emissive: number | null): { readonly glow: number; readonly kind: VoxelKind } =>
  emissive ? { glow: emissive, kind: VOXEL_EMISSIVE } : { glow: lighten(primary, 0.45), kind: VOXEL_GLASS };

const focus: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  const { glow, kind } = psionicGlow(primary, emissive);
  insulatedGrip(model, 7, secondary);
  model.fill(-4, 8, -1, 4, 8, 1, grain(primary));
  for (const x of [-4, 4]) model.fill(x, 9, 0, x, 15, 0, (_x, y) => (y === 15 ? lighten(primary, 0.2) : primary));
  for (const x of [-3, 3]) model.set(x, 15, 0, glow, kind);
  traceShard(model, 10, [0, 1, 2, 2, 1, 1, 0, 0], glow, kind);
  return model;
};

const hoop = (model: VoxelModel, y: number, radius: number, color: number): void => {
  model.fill(-radius, y, -radius, radius, y, radius, (x, _y, z) => {
    const corner = Math.abs(x) === radius && Math.abs(z) === radius;
    return Math.max(Math.abs(x), Math.abs(z)) === radius && !(corner && radius > 1) ? color : null;
  });
};

const resonator: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  const { glow, kind } = psionicGlow(primary, emissive);
  insulatedGrip(model, 11, secondary);
  model.fill(-3, 5, 0, 3, 5, 0, secondary);
  model.fill(-3, 12, -3, 3, 12, 3, grain(primary));
  model.fill(0, 13, 0, 0, 18, 0, glow, kind);
  hoop(model, 14, 4, primary);
  hoop(model, 16, 3, lighten(primary, 0.1));
  hoop(model, 18, 2, lighten(primary, 0.2));
  for (const [x, z] of [[4, 0], [-4, 0], [0, 4], [0, -4]] as const) model.set(x, 14, z, glow, kind);
  traceShard(model, 20, [0, 1, 2, 1, 0], glow, kind);
  return model;
};

const datapad: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel().fill(-5, 0, -1, 5, 13, 0, grain(primary));
  model.fill(-4, 2, 1, 4, 12, 1, (_x, y) => (y % 3 === 0 ? lighten(emissive ?? secondary, 0.35) : (emissive ?? secondary)), emissive ? VOXEL_EMISSIVE : undefined);
  return model;
};

const scanner: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel().fill(-3, 0, -2, 3, 12, 1, grain(primary));
  model.fill(-2, 6, 2, 2, 10, 2, secondary);
  model.fill(-1, 13, -1, 1, 14, 0, darken(primary, 0.3));
  model.set(0, 3, 2, emissive ?? 0xff4d4d, VOXEL_EMISSIVE);
  return model;
};

const implant: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  for (let angle = 0; angle < Math.PI * 2; angle += 0.15) {
    model.set(Math.round(Math.cos(angle) * 6), Math.round(6 + Math.sin(angle) * 6), 0, emissive ?? secondary, VOXEL_EMISSIVE);
    model.set(Math.round(Math.cos(angle) * 4), Math.round(6 + Math.sin(angle) * 4), 1, primary);
  }
  model.fill(-1, 5, 0, 1, 7, 1, lighten(primary, 0.4));
  return model;
};

const badge: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  for (let y = 0; y <= 12; y++) {
    const half = y < 4 ? y + 2 : y < 10 ? 6 : 6 - (y - 9) * 2;
    model.fill(-half, y, 0, half, y, 1, grain(primary, 0.05));
  }
  model.fill(-2, 5, 2, 2, 8, 2, emissive ?? secondary, emissive ? VOXEL_EMISSIVE : undefined);
  return model;
};

const keycard: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel().fill(-7, 0, 0, 7, 9, 0, grain(primary, 0.02));
  model.fill(-7, 6, 1, 7, 7, 1, secondary);
  model.fill(-5, 1, 1, -2, 3, 1, 0xc9a227);
  return model;
};

const vial: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  for (let y = 0; y <= 12; y++) {
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        const distance = Math.hypot(x, z);
        if (distance > 3.2) continue;
        if (distance > 2.2) model.set(x, y, z, 0xcfe8ff, VOXEL_GLASS);
        else if (y <= 8) model.set(x, y, z, primary, VOXEL_EMISSIVE);
      }
    }
  }
  model.fill(-2, 13, -2, 2, 14, 2, secondary);
  return model;
};

const scrap: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  for (let x = -6; x <= 6; x++) {
    for (let y = 0; y <= 7; y++) {
      for (let z = -4; z <= 4; z++) {
        const density = noise3(x, y, z, 3);
        if (Math.hypot(x / 6.5, y / 7, z / 4.5) < 1 && density > 0.25) model.set(x, y, z, density > 0.8 ? secondary : jitter(primary, 0.08, density));
      }
    }
  }
  return model;
};

const chip: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel().fill(-5, 0, -5, 5, 1, 5, secondary);
  model.fill(-3, 2, -3, 3, 2, 3, primary);
  for (let pin = -4; pin <= 4; pin += 2) model.set(pin, 0, -6, 0x9aa3ab).set(pin, 0, 6, 0x9aa3ab);
  return model;
};

const chitin: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  for (let x = -7; x <= 7; x++) {
    for (let z = -4; z <= 4; z++) {
      const arch = Math.round(5 - (x * x) / 12);
      if (Math.abs(z) > 4 - Math.abs(x) / 4) continue;
      const glow = noise3(x, arch, z, 7) > 0.78;
      model.set(x, arch, z, glow ? secondary : jitter(darken(primary, 0.55), 0.06, noise3(x, 0, z)), glow ? VOXEL_EMISSIVE : undefined);
    }
  }
  return model;
};

const shard: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  for (let y = 0; y <= 14; y++) {
    const half = Math.max(0, Math.round(3 - Math.abs(y - 5) * 0.45));
    model.fill(-half, y, -half, half, y, half, (x, _y, z) => (Math.abs(x) + Math.abs(z) === half ? secondary : primary), VOXEL_EMISSIVE);
  }
  return model;
};

const credits: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  [[0, 0, 0], [-1, 2, 1], [1, 4, -1], [6, 0, 2]].forEach(([cx, cy, cz]) => {
    for (let x = -4; x <= 4; x++) {
      for (let z = -4; z <= 4; z++) {
        const distance = Math.hypot(x, z);
        if (distance <= 4.3) model.fill(cx! + x, cy!, cz! + z, cx! + x, cy! + 1, cz! + z, distance > 3.3 ? secondary : primary);
      }
    }
  });
  return model;
};

const maul: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  line(model, [-5, 0, 0], [3, 12, 0], secondary);
  line(model, [-4, 0, 0], [4, 12, 0], darken(secondary, 0.2));
  model.fill(1, 12, -2, 7, 16, 2, grain(primary));
  if (emissive) model.fill(8, 13, -1, 8, 15, 1, emissive, VOXEL_EMISSIVE);
  return model;
};

const carbine: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel().fill(-9, 5, -1, 10, 7, 1, grain(primary));
  model.fill(-12, 3, -1, -8, 6, 1, secondary);
  model.fill(-4, 0, -1, -2, 5, 1, secondary);
  model.fill(1, 1, -1, 3, 4, 1, darken(secondary, 0.15));
  model.fill(11, 6, 0, 13, 6, 0, darken(primary, 0.5));
  if (emissive) model.fill(-6, 7, 2, -4, 7, 2, emissive, VOXEL_EMISSIVE);
  return model;
};

const knife: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  for (const offset of [0, 1]) line(model, [-6 + offset, 0, 0], [-3 + offset, 3, 0], secondary);
  line(model, [-5, 4, 0], [-2, 1, 0], darken(secondary, 0.3));
  for (const offset of [0, 1]) line(model, [-2 + offset, 3, 0], [4, 9 - offset, 0], offset === 1 ? lighten(primary, 0.2) : primary);
  model.set(5, 10, 0, lighten(primary, 0.3));
  if (emissive) line(model, [-1, 4, 0], [3, 8, 0], emissive, VOXEL_EMISSIVE);
  return model;
};

const blade: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  for (const offset of [0, 1]) line(model, [-8 + offset, -2, 0], [-5 + offset, 1, 0], secondary);
  model.fill(-5, 1, -1, -4, 2, 1, darken(secondary, 0.3));
  for (const offset of [0, 1, 2]) line(model, [-4 + offset, 2, 0], [8, 13 - offset, 0], offset === 2 ? lighten(primary, 0.2) : primary);
  if (emissive) line(model, [-1, 2, 1], [7, 10, 1], emissive, VOXEL_EMISSIVE);
  return model;
};

const polearm: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  line(model, [-10, -4, 0], [5, 11, 0], secondary);
  line(model, [-9, -4, 0], [6, 11, 0], darken(secondary, 0.2));
  for (const offset of [0, 1]) line(model, [5 + offset, 11, 0], [9, 15 - offset, 0], primary);
  line(model, [5, 13, 0], [3, 15, 0], darken(primary, 0.2));
  line(model, [7, 10, 0], [9, 8, 0], darken(primary, 0.2));
  if (emissive) model.fill(10, 16, 0, 10, 16, 0, emissive, VOXEL_EMISSIVE);
  return model;
};

const rifle: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel().fill(-10, 5, -1, 12, 6, 1, grain(primary));
  model.fill(-15, 3, -1, -10, 6, 1, secondary);
  model.fill(-5, 0, -1, -3, 4, 1, secondary);
  model.fill(13, 5, 0, 18, 5, 0, darken(primary, 0.5));
  model.fill(-5, 8, -1, 6, 9, 1, darken(primary, 0.3));
  model.fill(-2, 7, 0, 1, 7, 0, darken(primary, 0.45));
  model.fill(7, 8, 0, 7, 9, 0, emissive ?? lighten(primary, 0.35), emissive ? VOXEL_EMISSIVE : undefined);
  for (const y of [4, 7]) model.fill(11, y, 0, 17, y, 0, (x) => (x % 2 === 0 ? darken(primary, 0.25) : darken(primary, 0.4)));
  line(model, [9, 4, 0], [8, 1, 0], darken(primary, 0.4));
  line(model, [10, 4, 0], [11, 1, 0], darken(primary, 0.4));
  return model;
};

const scattergun: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel().fill(-7, 5, -1, 7, 8, 1, grain(primary));
  model.fill(-11, 3, -1, -7, 7, 1, secondary);
  model.fill(-3, 0, -1, -1, 5, 1, secondary);
  model.fill(1, 3, -1, 6, 4, 1, darken(secondary, 0.15));
  model.fill(8, 5, -1, 8, 8, 1, darken(primary, 0.5));
  if (emissive) model.fill(-5, 9, 0, -2, 9, 0, emissive, VOXEL_EMISSIVE);
  return model;
};

const shield: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  const glow = emissive ?? lighten(primary, 0.45);
  model.fill(-4, 2, -1, 4, 10, 1, (x, y, z) => (y === 2 || y === 10 ? darken(secondary, 0.1) : grain(primary)(x, y, z)));
  model.fill(-1, 5, 2, 1, 7, 2, (x, y) => (x === 0 && y === 6 ? null : darken(primary, 0.3))).set(0, 6, 2, glow, VOXEL_EMISSIVE);
  for (const x of [-5, 5]) model.fill(x, 3, 0, x, 13, 0, secondary).set(x, 14, 0, glow, VOXEL_EMISSIVE);
  for (let x = -7; x <= 7; x++) {
    for (let y = 0; y <= 15; y++) {
      const edge = Math.abs(x) === 7 || y === 0 || y === 15;
      const lattice = y % 2 === 0 && (x + (y % 4 === 0 ? 1 : 0)) % 2 === 0;
      if (edge || lattice) model.set(x, y, -3, lighten(glow, edge ? 0.1 : 0.35), VOXEL_GLASS);
    }
  }
  return model;
};

const plate: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel().fill(-6, 0, -2, 6, 13, 1, grain(primary, 0.05));
  for (const x0 of [-5, 1]) model.fill(x0, 7, 2, x0 + 4, 12, 2, grain(lighten(primary, 0.08), 0.04));
  for (const [y0, y1] of [[1, 2], [4, 5]] as const) model.fill(-4, y0, 2, -1, y1, 2, primary).fill(1, y0, 2, 4, y1, 2, primary);
  model.fill(-8, 10, -2, -6, 13, 1, lighten(primary, 0.1)).fill(6, 10, -2, 8, 13, 1, lighten(primary, 0.1));
  model.fill(-3, 14, -2, 3, 14, 1, (x, _y, z) => (Math.abs(x) === 3 || z === -2 || z === 1 ? darken(primary, 0.15) : null));
  model.fill(-6, 0, 2, 6, 0, 2, secondary);
  model.fill(0, 7, 2, 0, 11, 2, emissive ?? darken(primary, 0.3), emissive ? VOXEL_EMISSIVE : undefined);
  return model;
};

const respirator: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel().fill(-4, 0, 0, 4, 6, 2, grain(secondary));
  model.fill(-3, 1, 3, 3, 5, 3, grain(primary));
  for (const x of [-6, 5]) model.fill(x, 1, -1, x + 1, 4, 2, darken(primary, 0.2));
  if (emissive) model.fill(-1, 2, 4, 1, 3, 4, emissive, VOXEL_EMISSIVE);
  model.fill(-6, 3, -3, 6, 3, -3, 0x2a2f33);
  return model;
};

const fibre: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  for (let x = -6; x <= 6; x++) {
    for (let y = 0; y <= 8; y++) {
      for (let z = -1; z <= 1; z++) {
        if (Math.hypot(y - 4, z * 2) > 4.2) continue;
        model.set(x, y, z, Math.abs(x) >= 5 ? secondary : (y + x) % 3 === 0 ? lighten(primary, 0.15) : grain(primary)(x, y, z));
      }
    }
  }
  line(model, [6, 1, 2], [9, 0, 2], primary);
  return model;
};

const moss: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  for (let x = -6; x <= 6; x++) {
    for (let z = -4; z <= 4; z++) {
      if (Math.hypot(x / 6.5, z / 4.5) > 1) continue;
      const top = 2 + Math.round(noise3(x, 0, z, 21) * 4);
      for (let y = 0; y <= top; y++) model.set(x, y, z, y === top && noise3(x, y, z, 5) > 0.7 ? lighten(primary, 0.35) : y < 2 ? secondary : grain(primary, 0.08)(x, y, z));
    }
  }
  return model;
};

const gel: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  for (let x = -5; x <= 5; x++) {
    for (let y = 0; y <= 7; y++) {
      for (let z = -4; z <= 4; z++) {
        const radius = Math.hypot(x, (y - 2) * 1.4, z);
        if (radius > 5.4 - y * 0.25) continue;
        model.set(x, y, z, y === 0 ? secondary : grain(primary, 0.06)(x, y, z));
      }
    }
  }
  model.set(-2, 6, 1, lighten(primary, 0.5)).set(-1, 6, 2, lighten(primary, 0.4));
  return model;
};

const coil: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  for (let step = 0; step < 90; step++) {
    const angle = step * 0.42;
    const x = Math.round(Math.cos(angle) * 5);
    const z = Math.round(Math.sin(angle) * 5);
    const y = Math.round(step / 9);
    model.set(x, y, z, step % 9 === 0 ? lighten(primary, 0.25) : primary);
  }
  model.fill(-1, 0, -1, 0, 10, 0, secondary);
  return model;
};

const plating: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  const slab = (y: number, dx: number, dz: number, color: number) =>
    model.fill(-7 + dx, y, -5 + dz, 7 + dx, y + 1, 5 + dz, (x, vy, z) => {
      const rimX = Math.abs(x - dx) === 7;
      const rimZ = Math.abs(z - dz) === 5;
      if (rimX && rimZ) return null;
      return vy === y + 1 && (rimX || rimZ) ? lighten(color, 0.18) : grain(color, 0.04)(x, vy, z);
    });
  slab(0, 0, 0, darken(primary, 0.15));
  slab(2, 1, -1, primary);
  model.paintExisting(2, 3, -5, 2, 3, 3, darken(primary, 0.3));
  model.paintExisting(-4, 3, 0, -1, 3, 2, secondary);
  for (const [x, z] of [[-4, -4], [6, -4], [-4, 2], [6, 2]] as const) model.set(x, 4, z, lighten(primary, 0.3));
  return model;
};

const servo: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  model.fill(-5, 0, -3, 5, 6, 3, (x, y, z) => (y === 6 ? lighten(primary, 0.15) : grain(primary)(x, y, z)));
  for (const x of [-6, 6]) model.fill(x, 2, -3, x, 4, 3, (_x, _y, z) => (Math.abs(z) === 2 ? null : darken(primary, 0.2)));
  model.fill(1, 7, -1, 3, 7, 1, lighten(secondary, 0.1)).set(2, 8, 0, lighten(secondary, 0.25));
  model.fill(2, 9, -5, 2, 9, 5, (_x, _y, z) => (Math.abs(z) === 5 ? darken(secondary, 0.2) : secondary));
  line(model, [-5, 1, 3], [-8, 0, 6], 0xc83a3a);
  line(model, [-5, 2, 3], [-8, 1, 7], 0x2a2a2a);
  return model;
};

const sheet: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  for (let layer = 0; layer < 3; layer++) model.fill(-6, layer * 2, -4, 6, layer * 2 + 1, 4, layer % 2 === 0 ? grain(primary, 0.04) : grain(darken(primary, 0.08), 0.04));
  model.fill(7, 1, -4, 7, 2, 4, darken(primary, 0.12)).fill(7, 3, -4, 7, 4, 4, primary);
  model.fill(-1, 0, -5, 0, 6, -5, secondary).fill(-1, 6, -4, 0, 6, 4, secondary).fill(-1, 0, 5, 0, 6, 5, secondary);
  return model;
};

const cell: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  for (let y = 0; y <= 12; y++) {
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        if (Math.hypot(x, z) > 3.3) continue;
        const cap = y <= 1 || y >= 11;
        if (cap) model.set(x, y, z, secondary);
        else if (Math.hypot(x, z) > 2.4) model.set(x, y, z, lighten(primary, 0.4), VOXEL_GLASS);
        else model.set(x, y, z, primary, VOXEL_EMISSIVE);
      }
    }
  }
  model.fill(-1, 13, -1, 0, 14, 0, 0xd8e2e8);
  return model;
};

const seal: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  const frame = darken(primary, 0.35);
  for (let x = -4; x <= 4; x++) {
    for (let y = 0; y <= 8; y++) {
      for (let z = -4; z <= 4; z++) {
        const edges = Number(Math.abs(x) === 4) + Number(y === 0 || y === 8) + Number(Math.abs(z) === 4);
        if (edges >= 2) model.set(x, y, z, frame);
        else if (edges === 1) model.set(x, y, z, lighten(primary, 0.35), VOXEL_GLASS);
      }
    }
  }
  model.fill(-1, 3, -1, 1, 5, 1, secondary, VOXEL_EMISSIVE);
  model.fill(-4, 4, -5, 4, 4, -5, (x) => (x % 2 === 0 ? secondary : 0x1a1a1a));
  return model;
};


const ellipsoid = (model: VoxelModel, rx: number, ry: number, rz: number, paint: (x: number, y: number, z: number) => number | null): void => {
  for (let y = 0; y <= ry; y++) {
    for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
      for (let z = -Math.ceil(rz); z <= Math.ceil(rz); z++) {
        if ((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2 > 1) continue;
        const color = paint(x, y, z);
        if (color !== null) model.set(x, y, z, color);
      }
    }
  }
};

const disc = (model: VoxelModel, y: number, radius: number, paint: (x: number, z: number) => number | null, kind?: VoxelKind): void => {
  for (let x = -Math.ceil(radius); x <= Math.ceil(radius); x++) {
    for (let z = -Math.ceil(radius); z <= Math.ceil(radius); z++) {
      if (Math.hypot(x, z) > radius) continue;
      const color = paint(x, z);
      if (color !== null) model.set(x, y, z, color, kind);
    }
  }
};

const loaf: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  ellipsoid(model, 6.6, 5.6, 3.6, (x, y, z) => (y === 0 ? secondary : y >= 3 && [-3, 0, 3].includes(x + Math.round(z / 2)) ? lighten(primary, 0.4) : grain(primary, 0.05)(x, y, z)));
  return model;
};

const pie: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  for (const y of [0, 1]) disc(model, y, 6.3, () => darken(primary, 0.25));
  disc(model, 2, 6.3, (x, z) => grain(primary, 0.05)(x, 2, z));
  disc(model, 3, 6.3, (x, z) => {
    const distance = Math.hypot(x, z);
    if (distance > 5.3) return Math.round(Math.atan2(z, x) * 4) % 2 === 0 ? lighten(primary, 0.2) : null;
    return distance <= 4 ? primary : null;
  });
  disc(model, 4, 2.5, () => lighten(primary, 0.1));
  model.fill(0, 4, 0, 1, 6, 1, secondary);
  return model;
};

const dish: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  disc(model, 0, 7, () => 0x5a6068);
  disc(model, 1, 7, (x, z) => (Math.hypot(x, z) > 6 ? 0xe2e6ea : null));
  for (let x = -5; x <= 5; x++) {
    for (let z = -3; z <= 3; z++) {
      if ((x / 5) ** 2 + (z / 3.5) ** 2 > 1) continue;
      model.set(x, 1, z, primary).set(x, 2, z, noise3(x, 2, z, 61) > 0.7 ? lighten(primary, 0.25) : primary);
    }
  }
  model.set(4, 2, -4, secondary).set(5, 2, -3, secondary).set(-5, 2, 4, secondary);
  return model;
};

const bowl: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  for (let y = 0; y <= 5; y++) {
    const radius = 3 + 0.6 * y;
    disc(model, y, radius, (x, z) => (Math.hypot(x, z) > radius - 1.1 || y === 0 ? 0x6a7078 : null));
  }
  disc(model, 5, 4.9, (x, z) => (noise3(x, 5, z, 67) > 0.75 ? secondary : primary));
  disc(model, 6, 2.5, (x, z) => (noise3(x, 6, z, 69) > 0.6 ? secondary : primary));
  line(model, [1, 5, 0], [6, 10, -3], 0xb8b2a4);
  return model;
};

const eel: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  for (let t = 0; t <= 28; t++) {
    const x = Math.round(-7 + t / 2);
    const z = Math.round(2.5 * Math.sin(0.45 * t));
    const head = t >= 25;
    const tail = t <= 3;
    model.fill(x, 0, z - 1, x, 0, z + 1, secondary);
    if (!tail) model.fill(x, 1, z - 1, x, 1, z + 1, primary);
    if (t >= 6 && t <= 22) model.set(x, 2, z, primary);
    if (head) model.fill(x, 0, z - 1, x, 2, z + 1, primary);
    if (!tail && !head && x % 2 === 0) model.set(x, 2, z, darken(primary, 0.25));
  }
  const tip = Math.round(2.5 * Math.sin(0.45 * 28));
  model.set(7, 2, tip + 1, 0xe8e2c8);
  return model;
};

const cat: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  model.fill(-3, 0, -3, 3, 5, 2, grain(primary, 0.05));
  model.fill(-1, 1, 3, 1, 5, 3, lighten(primary, 0.2));
  model.set(-2, 0, 3, primary).set(2, 0, 3, primary);
  model.fill(-3, 6, -1, 3, 10, 3, grain(primary, 0.05));
  model.fill(-3, 11, 0, -2, 11, 1, primary).set(-3, 12, 0, primary);
  model.set(3, 11, 0, darken(primary, 0.25));
  model.set(-2, 8, 3, secondary, VOXEL_EMISSIVE).set(2, 8, 3, secondary, VOXEL_EMISSIVE);
  model.set(0, 7, 4, darken(primary, 0.45));
  model.fill(4, 0, -3, 4, 1, 2, primary).fill(4, 2, 2, 4, 3, 2, primary);
  return model;
};

const panel: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  model.fill(-7, 0, -5, 7, 1, 5, (x, y, z) => (x >= 5 && z >= 3 ? null : y === 1 && (x === -7 || z === -5) && (x + z) % 3 === 0 ? lighten(primary, 0.35) : grain(primary, 0.05)(x, y, z)));
  model.fill(-5, 2, -3, 3, 3, 3, (x, y, z) => grain(darken(primary, 0.12), 0.05)(x, y, z));
  model.fill(-5, 4, -1, 3, 4, 0, secondary);
  return model;
};

const lantern: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  const glow = emissive ?? 0x7fe8ff;
  model.fill(-3, 0, -3, 2, 2, 2, grain(primary)).fill(-3, 2, -3, 2, 2, 2, darken(primary, 0.15));
  model.fill(-2, 3, -2, 1, 10, 1, lighten(secondary, 0.3), VOXEL_GLASS).fill(-1, 3, -1, 0, 10, 0, glow, VOXEL_EMISSIVE);
  for (const x of [-3, 2]) model.fill(x, 3, -1, x, 10, 0, darken(primary, 0.1));
  model.fill(-3, 11, -3, 2, 12, 2, grain(primary)).set(2, 12, 0, glow, VOXEL_EMISSIVE);
  model.fill(-2, 13, 0, -2, 15, 0, secondary).fill(1, 13, 0, 1, 15, 0, secondary).fill(-1, 16, 0, 0, 16, 0, secondary);
  return model;
};

const key: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  for (let angle = 0; angle < Math.PI * 2; angle += 0.2) model.set(Math.round(Math.cos(angle) * 3), Math.round(11 + Math.sin(angle) * 3), 0, primary).set(Math.round(Math.cos(angle) * 3), Math.round(11 + Math.sin(angle) * 3), 1, darken(primary, 0.15));
  model.fill(0, 0, 0, 0, 7, 1, primary);
  model.fill(1, 1, 0, 3, 2, 1, primary).fill(1, 4, 0, 2, 4, 1, primary);
  model.set(0, 11, 0, emissive ?? secondary, emissive ? VOXEL_EMISSIVE : undefined);
  return model;
};

const collar: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  for (let angle = 0; angle < Math.PI * 2; angle += 0.12) {
    const x = Math.round(Math.cos(angle) * 5);
    const z = Math.round(Math.sin(angle) * 5);
    model.set(x, 0, z, primary).set(x, 1, z, darken(primary, 0.12));
  }
  model.fill(-5, 0, -1, -5, 1, 0, 0xb8b0a0);
  model.fill(-1, -3, 6, 0, -1, 6, secondary).set(0, 0, 5, 0xb8b0a0);
  return model;
};

const leaf: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  model.fill(-2, 0, -2, 2, 1, 2, secondary);
  model.fill(0, 2, 0, 0, 4, 0, darken(primary, 0.2));
  model.fill(-2, 5, 0, 2, 8, 1, grain(primary, 0.05));
  [10, 12, 13, 12, 11].forEach((top, index) => model.fill(index - 2, 9, 0, index - 2, top, 0, index === 2 ? lighten(primary, 0.15) : primary));
  model.fill(3, 6, 0, 3, 7, 0, primary).fill(4, 7, 0, 4, 8, 0, primary);
  return model;
};

const flower: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  model.fill(-2, 0, -2, 2, 0, 2, darken(secondary, 0.3));
  model.fill(0, 1, 0, 0, 6, 0, 0x3a5a3a).set(1, 3, 0, 0x3a5a3a).set(2, 4, 0, 0x4a6a4a);
  for (const [x, z] of [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, -1], [1, -1], [-1, 1]] as const) model.fill(x, 7, z, x, 8, z, primary);
  model.fill(-1, 7, 0, 1, 8, 0, primary).fill(0, 7, -1, 0, 8, 1, primary);
  model.set(0, 9, 0, secondary, VOXEL_EMISSIVE);
  return model;
};

const rotor: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  disc(model, 0, 6.5, (x, z) => grain(darken(primary, 0.2))(x, 0, z));
  disc(model, 1, 2, () => secondary);
  disc(model, 2, 1.2, () => lighten(secondary, 0.2));
  for (let vane = 0; vane < 6; vane++) {
    for (let radius = 2; radius <= 6; radius++) {
      const angle = (vane / 6) * Math.PI * 2 + radius * 0.18;
      model.fill(Math.round(Math.cos(angle) * radius), 1, Math.round(Math.sin(angle) * radius), Math.round(Math.cos(angle) * radius), 2, Math.round(Math.sin(angle) * radius), radius === 6 ? lighten(primary, 0.15) : primary);
    }
  }
  return model;
};

const tin: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  for (let y = 0; y <= 3; y++) disc(model, y, 5, (x, z) => (Math.hypot(x, z) > 4.1 || y === 0 ? (y === 3 ? 0xd8dce0 : 0xa8b0b8) : null));
  disc(model, 3, 4.1, (x, z) => (noise3(x, 3, z, 71) > 0.8 ? lighten(primary, 0.3) : primary));
  for (let x = -5; x <= 5; x++) for (let y = 0; y <= 1; y++) if (Math.abs(x) <= 4 || y === 0) model.set(x, 4 + y, -6 - y, y === 0 ? 0xb8c0c8 : secondary);
  return model;
};

const BUILDERS: Readonly<Record<ItemIconShape, ItemBuilder>> = {
  loaf,
  pie,
  dish,
  bowl,
  eel,
  cat,
  panel,
  lantern,
  key,
  collar,
  leaf,
  flower,
  rotor,
  tin,
  focus,
  resonator,
  fibre,
  moss,
  gel,
  coil,
  plating,
  servo,
  sheet,
  cell,
  seal,
  maul,
  carbine,
  knife,
  blade,
  polearm,
  rifle,
  scattergun,
  plate,
  respirator,
  helmet,
  hood,
  pack,
  cape,
  shield,
  cowl,
  visor,
  jumpsuit: garment(false),
  vest,
  coat: garment(true),
  gloves,
  trousers,
  boots,
  baton,
  pistol,
  datapad,
  scanner,
  implant,
  badge,
  keycard,
  vial,
  scrap,
  chip,
  chitin,
  shard,
  credits,
};

export function buildItemModel(item: ItemDefinition): VoxelModel {
  const palette = itemPalette(item);
  const model = BUILDERS[item.icon](palette);
  if (!palette.form) return model;
  iconForm(model, item.icon, palette.form, palette);
  return reshapeForForm(model, palette.form);
}
