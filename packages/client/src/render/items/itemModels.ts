import type { ItemDefinition, ItemIconShape } from '@containment/shared';
import { darken, hex, jitter, lighten, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';

export interface ItemPalette {
  readonly primary: number;
  readonly secondary: number;
  readonly emissive: number | null;
}

type ItemBuilder = (palette: ItemPalette) => VoxelModel;

export function itemPalette(item: ItemDefinition): ItemPalette {
  const visual = item.equipment?.visual;
  if (visual) {
    return { primary: hex(visual.primary), secondary: hex(visual.secondary), emissive: visual.emissive ? hex(visual.emissive) : null };
  }
  const [primary, secondary] = item.iconColors;
  return { primary: hex(primary), secondary: hex(secondary), emissive: null };
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
  model.fill(-4, 2, 6, 4, 4, 6, 0x0c1216);
  if (emissive) model.fill(-4, 3, 7, 4, 3, 7, emissive, VOXEL_EMISSIVE);
  model.fill(-1, 7, -3, 0, 8, 3, lighten(primary, 0.15));
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
    for (let x = -half; x <= half; x++) model.set(x, y, Math.round(Math.abs(x) * 0.3), y <= 1 ? secondary : jitter(x % 2 === 0 ? primary : darken(primary, 0.08), 0.03, noise3(x, y, 0, 9)));
  }
  model.fill(-4, 13, 0, 4, 13, 1, darken(primary, 0.15));
  for (const x of [-3, 3]) model.set(x, 12, -1, emissive ?? secondary, emissive ? VOXEL_EMISSIVE : undefined);
  return model;
};

const hood = hoodLike(false);
const cowl = hoodLike(true);

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

const gloves: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  for (const offset of [-5, 2]) {
    model.fill(offset, 0, -1, offset + 3, 6, 1, grain(primary));
    for (let finger = 0; finger < 4; finger++) model.fill(offset + finger, 7, -1, offset + finger, 9 - (finger === 0 ? 2 : 0), 0, primary);
    model.fill(offset, 0, -1, offset + 3, 1, 1, secondary);
  }
  return model;
};

const trousers: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel().fill(-5, 12, -2, 5, 14, 1, secondary);
  model.fill(-5, 0, -2, -1, 11, 1, grain(primary)).fill(1, 0, -2, 5, 11, 1, grain(primary));
  model.fill(-5, 5, 2, -1, 6, 2, darken(primary, 0.3)).fill(1, 5, 2, 5, 6, 2, darken(primary, 0.3));
  return model;
};

const boots: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  for (const x of [-5, 1]) {
    model.fill(x, 1, -3, x + 3, 8, 0, grain(primary));
    model.fill(x, 1, 1, x + 3, 3, 4, grain(primary));
    model.fill(x, 0, -3, x + 3, 0, 4, secondary);
    model.fill(x, 8, -3, x + 3, 8, 0, lighten(primary, 0.15));
  }
  return model;
};

const baton: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  line(model, [-6, 0, 0], [5, 11, 0], primary);
  line(model, [-6, 1, 0], [5, 12, 0], darken(primary, 0.2));
  line(model, [-6, 0, 0], [-3, 3, 0], secondary);
  model.fill(5, 11, -1, 7, 13, 1, emissive ?? lighten(primary, 0.3), emissive ? VOXEL_EMISSIVE : undefined);
  return model;
};

const pistol: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel().fill(-6, 6, -1, 7, 9, 1, grain(primary));
  model.fill(-5, 0, -1, -2, 6, 1, secondary);
  model.fill(-1, 4, 0, 1, 5, 0, darken(primary, 0.4));
  model.fill(8, 7, 0, 8, 8, 0, darken(primary, 0.5));
  if (emissive) model.fill(2, 10, 0, 6, 10, 0, emissive, VOXEL_EMISSIVE);
  return model;
};

const focus: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  line(model, [-6, 0, 0], [3, 9, 0], secondary);
  model.fill(3, 8, -1, 7, 12, 1, (x, y, z) => ((x === 3 || x === 7) && (y === 8 || y === 12) ? null : z === 0 && x > 3 && x < 7 && y > 8 && y < 12 ? null : primary));
  model.fill(4, 9, 0, 6, 11, 0, emissive ?? lighten(primary, 0.35), emissive ? VOXEL_EMISSIVE : VOXEL_GLASS);
  return model;
};

const resonator: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel();
  line(model, [-8, 0, 0], [-2, 6, 0], secondary);
  model.fill(-2, 4, 0, 8, 14, 0, (x, y) => {
    const ring = Math.abs(Math.hypot(x - 3, y - 9) - 5);
    if (ring < 0.7) return primary;
    return null;
  });
  if (emissive) {
    for (const y of [6, 9, 12]) model.fill(0, y, 0, 6, y, 0, emissive, VOXEL_EMISSIVE);
  }
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

const implant: ItemBuilder = ({ primary, emissive }) => {
  const model = new VoxelModel();
  for (let angle = 0; angle < Math.PI * 2; angle += 0.15) {
    model.set(Math.round(Math.cos(angle) * 6), Math.round(6 + Math.sin(angle) * 6), 0, emissive ?? 0xb57cff, VOXEL_EMISSIVE);
    model.set(Math.round(Math.cos(angle) * 4), Math.round(6 + Math.sin(angle) * 4), 1, primary);
  }
  model.fill(-1, 5, 0, 1, 7, 1, lighten(primary, 0.4));
  return model;
};

const badge: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  for (let y = 0; y <= 12; y++) {
    const half = y < 4 ? y + 2 : y < 10 ? 6 : 6 - (y - 9) * 2;
    model.fill(-half, y, 0, half, y, 1, grain(primary, 0.05));
  }
  model.fill(-2, 5, 2, 2, 8, 2, secondary);
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
  model.fill(-1, 8, 0, 4, 9, 0, darken(primary, 0.4));
  model.fill(11, 6, 0, 13, 6, 0, darken(primary, 0.5));
  if (emissive) model.fill(0, 10, 0, 3, 10, 0, emissive, VOXEL_EMISSIVE);
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
  line(model, [-7, 3, 0], [-3, -1, 0], darken(secondary, 0.3));
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
  model.fill(-4, 8, -1, 4, 9, 1, darken(primary, 0.3));
  model.fill(-2, 7, 0, 1, 7, 0, darken(primary, 0.45));
  if (emissive) model.fill(5, 8, 0, 5, 9, 0, emissive, VOXEL_EMISSIVE);
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

const plate: ItemBuilder = ({ primary, secondary, emissive }) => {
  const model = new VoxelModel().fill(-6, 0, -2, 6, 13, 1, grain(primary, 0.05));
  for (let y = 2; y <= 12; y += 3) model.fill(-6, y, 2, 6, y + 1, 2, darken(primary, 0.2));
  model.fill(-8, 10, -2, -6, 13, 1, lighten(primary, 0.1)).fill(6, 10, -2, 8, 13, 1, lighten(primary, 0.1));
  model.fill(-6, 0, 2, 6, 0, 2, secondary);
  if (emissive) model.fill(-1, 6, 3, 1, 8, 3, emissive, VOXEL_EMISSIVE);
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

const ingot: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  for (let y = 0; y <= 5; y++) {
    const inset = Math.floor(y / 2);
    model.fill(-7 + inset, y, -3 + Math.min(inset, 2), 7 - inset, y, 3 - Math.min(inset, 2), y === 5 ? lighten(primary, 0.2) : grain(primary, 0.04));
  }
  model.fill(-6, 0, 4, 6, 0, 4, secondary);
  model.fill(-2, 6, 0, 1, 6, 0, darken(primary, 0.3));
  return model;
};

const sheet: ItemBuilder = ({ primary, secondary }) => {
  const model = new VoxelModel();
  for (let layer = 0; layer < 3; layer++) {
    model.fill(-7 + layer, layer * 2, -5 + layer, 6 - layer, layer * 2, 4 - layer, layer === 2 ? lighten(primary, 0.2) : primary, VOXEL_GLASS);
    model.fill(-7 + layer, layer * 2 + 1, 4 - layer, 6 - layer, layer * 2 + 1, 4 - layer, secondary);
  }
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

const BUILDERS: Readonly<Record<ItemIconShape, ItemBuilder>> = {
  focus,
  resonator,
  fibre,
  moss,
  gel,
  coil,
  ingot,
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

export const buildItemModel = (item: ItemDefinition): VoxelModel => BUILDERS[item.icon](itemPalette(item));
