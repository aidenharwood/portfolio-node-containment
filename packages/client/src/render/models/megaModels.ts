import { MEGASTRUCTURE_DROP, type WorldObjectModel } from '@containment/shared';
import { jitter, lighten, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS } from '../voxel/voxelKinds.ts';
import { VoxelModel, type Paint } from '../voxel/voxelModel.ts';
import { STEP_VOXELS } from '../world/worldScale.ts';
import type { ObjectModelParts } from './objectModels.ts';

export type MegaModel = Extract<WorldObjectModel, 'maglevPylon' | 'maglevSpan' | 'maglevSpanEnd' | 'siphonTrestle' | 'siphonPipe' | 'ribFoot' | 'ribArch' | 'ringFoot' | 'ringArch' | 'uplinkDish' | 'uplinkCable'>;

const MEGA = {
  carbon: 0x1e2428,
  steel: 0x4a5560,
  steelLight: 0x7a8794,
  panel: 0x6d7882,
  concrete: 0x5d5a55,
  concreteDark: 0x45423e,
  cyan: 0x4fe3ff,
  pink: 0xff4fa8,
  amber: 0xffb35a,
  red: 0xff3a2a,
  rust: 0x6a3f24,
  rustDark: 0x3f2516,
  rustBright: 0x9a5a30,
  bareSteel: 0x8a8f94,
  pipe: 0x3f5a5c,
  pipeDark: 0x2b3e40,
  sap: 0x7fffb0,
  moss: 0x4d6630,
  obsidian: 0x14181f,
  obsidianSheen: 0x2a3040,
  ringGlow: 0x7fe8ff,
  dish: 0xd8dde0,
  dishRib: 0x9aa4aa,
  cable: 0x15181a,
} as const;

const DROP = MEGASTRUCTURE_DROP * STEP_VOXELS;
const DECK = 40;

const grain = (color: number, amount = 0.04, salt = 0): Paint => (x, y, z) => jitter(color, amount, noise3(x, y, z, salt));
const parts = (base: VoxelModel, heightVoxels: number): ObjectModelParts => ({ base, animated: [], heightVoxels });

function guideway(model: VoxelModel, x0: number, x1: number): void {
  model.fill(x0, DECK, -6, x1, DECK + 3, 5, grain(MEGA.carbon, 0.03, 3));
  model.fill(x0, DECK + 4, -6, x1, DECK + 5, -5, MEGA.steelLight).fill(x0, DECK + 4, 4, x1, DECK + 5, 5, MEGA.steelLight);
  model.fill(x0, DECK + 4, -4, x1, DECK + 4, 3, MEGA.steel);
  model.fill(x0, DECK + 4, -1, x1, DECK + 4, 0, MEGA.cyan, VOXEL_EMISSIVE);
  for (let x = x0; x <= x1; x++) {
    if (((x % 16) + 16) % 16 === 0) model.fill(x, DECK - 1, -4, x + 1, DECK - 1, 3, MEGA.amber, VOXEL_EMISSIVE);
    if (((x % 6) + 6) % 6 === 0) model.set(x, DECK + 2, -7, MEGA.pink, VOXEL_EMISSIVE).set(x, DECK + 2, 6, MEGA.pink, VOXEL_EMISSIVE);
  }
}

const maglevPylon = (): ObjectModelParts => {
  const model = new VoxelModel().fill(-6, -DROP, -6, 5, 2, 5, grain(MEGA.concreteDark, 0.05, 5));
  model.fill(-4, 3, -4, 3, 33, 3, (x, y, z) => (Math.abs(x + 0.5) > 3 && Math.abs(z + 0.5) > 3 ? null : jitter(MEGA.concrete, 0.04, noise3(x, y, z, 7))));
  model.fill(-4, 8, -5, -3, 30, -5, MEGA.cyan, VOXEL_EMISSIVE).fill(2, 8, 4, 3, 30, 4, MEGA.cyan, VOXEL_EMISSIVE);
  for (let y = 34; y < DECK; y++) {
    const reach = 4 + (y - 34);
    model.fill(-5, y, -reach, 4, y, reach - 1, grain(MEGA.steel, 0.03, 9));
  }
  guideway(model, -8, 7);
  model.fill(-1, DECK + 6, -1, 0, DECK + 7, 0, MEGA.red, VOXEL_EMISSIVE);
  return parts(model, DECK + 8);
};

const maglevSpan = (): ObjectModelParts => {
  const model = new VoxelModel();
  guideway(model, -32, 31);
  for (let x = -32; x <= 31; x++) {
    const phase = ((x % 12) + 12) % 12;
    const y = DECK - 2 - Math.abs(phase - 6);
    model.set(x, y, -5, MEGA.steel).set(x, y, 4, MEGA.steel);
  }
  model.fill(-32, DECK - 8, -5, 31, DECK - 8, -5, MEGA.steel).fill(-32, DECK - 8, 4, 31, DECK - 8, 4, MEGA.steel);
  return parts(model, DECK + 6);
};

const maglevSpanEnd = (): ObjectModelParts => {
  const model = new VoxelModel();
  guideway(model, -32, 8);
  for (let z = -6; z <= 5; z++) {
    const reach = 8 + Math.floor(noise3(z, 0, 0, 13) * 7);
    model.fill(9, DECK, z, reach, DECK + 3, z, (x, y) => (noise3(x, y, z, 17) > 0.35 ? jitter(MEGA.carbon, 0.05, noise3(x, y, z, 19)) : null));
    if (z % 3 === 0) model.fill(reach, DECK - 1 - Math.floor(noise3(z, 1, 0, 23) * 18), z, reach, DECK - 1, z, MEGA.cable);
  }
  model.fill(13, DECK + 1, -2, 13, DECK + 1, -2, MEGA.amber, VOXEL_EMISSIVE).set(12, DECK - 3, 3, MEGA.amber, VOXEL_EMISSIVE);
  return parts(model, DECK + 6);
};

const PIPE_Y = 33;
const PIPE_RADIUS = 6;

function pipeRun(model: VoxelModel, x0: number, x1: number): void {
  for (let x = x0; x <= x1; x++) {
    const band = ((x % 24) + 24) % 24 < 2;
    for (let y = PIPE_Y - PIPE_RADIUS; y <= PIPE_Y + PIPE_RADIUS; y++) {
      for (let z = -PIPE_RADIUS - 1; z <= PIPE_RADIUS; z++) {
        const distance = Math.hypot(y - PIPE_Y, z + 0.5);
        if (distance > PIPE_RADIUS + 0.4 || distance < PIPE_RADIUS - 1.6) continue;
        if (band) model.set(x, y, z, distance > PIPE_RADIUS - 0.2 ? MEGA.sap : MEGA.pipeDark, distance > PIPE_RADIUS - 0.2 ? VOXEL_EMISSIVE : undefined);
        else model.set(x, y, z, y > PIPE_Y + 3 && noise3(x, y, z, 29) > 0.8 ? MEGA.moss : jitter(y < PIPE_Y ? MEGA.pipeDark : MEGA.pipe, 0.05, noise3(x, y, z, 31)));
      }
    }
  }
}

const siphonTrestle = (): ObjectModelParts => {
  const model = new VoxelModel();
  for (const z of [-6, 5]) {
    for (let y = -DROP; y <= PIPE_Y - PIPE_RADIUS; y++) {
      const lean = Math.round(Math.max(0, PIPE_Y - PIPE_RADIUS - y) * 0.18);
      model.fill(-7 + lean - 1, y, z, -7 + lean, y, z, grain(MEGA.rust, 0.06, 37)).fill(6 - lean, y, z, 7 - lean, y, z, grain(MEGA.rust, 0.06, 37));
    }
    model.fill(-6, 12, z, 5, 13, z, MEGA.rustDark);
  }
  model.fill(-6, PIPE_Y - PIPE_RADIUS - 2, -7, 5, PIPE_Y - PIPE_RADIUS - 1, 6, grain(MEGA.steel, 0.04, 41));
  pipeRun(model, -8, 7);
  model.fill(-1, PIPE_Y + PIPE_RADIUS + 1, -1, 0, PIPE_Y + PIPE_RADIUS + 2, 0, MEGA.sap, VOXEL_EMISSIVE);
  return parts(model, PIPE_Y + PIPE_RADIUS + 3);
};

const siphonPipe = (): ObjectModelParts => {
  const model = new VoxelModel();
  pipeRun(model, -32, 31);
  for (let a = 0; a < 24; a++) {
    const angle = (a / 24) * Math.PI * 2;
    model.set(Math.round(Math.cos(angle) * 4), PIPE_Y + PIPE_RADIUS + 5 + Math.round(Math.sin(angle) * 4), 0, MEGA.rustBright);
  }
  model.fill(0, PIPE_Y + PIPE_RADIUS + 1, 0, 0, PIPE_Y + PIPE_RADIUS + 5, 0, MEGA.steel);
  for (let x = -30; x < 30; x += 7) if (noise3(x, 0, 0, 43) > 0.55) model.fill(x, PIPE_Y - PIPE_RADIUS - 1 - Math.floor(noise3(x, 1, 0, 43) * 4), 0, x, PIPE_Y - PIPE_RADIUS - 1, 0, MEGA.sap, VOXEL_GLASS);
  return parts(model, PIPE_Y + PIPE_RADIUS + 10);
};

const rustPaint: Paint = (x, y, z) => {
  const wear = noise3(x, y, z, 47);
  return wear > 0.9 ? MEGA.bareSteel : wear > 0.7 ? MEGA.rustBright : jitter(wear < 0.2 ? MEGA.rustDark : MEGA.rust, 0.05, noise3(x, y, z, 53));
};

const ribFoot = (): ObjectModelParts => {
  const model = new VoxelModel().fill(-6, -DROP, -5, 5, 4, 4, rustPaint);
  model.fill(-7, -DROP, -7, 6, 0, 6, (x, y, z) => (noise3(x, y, z, 59) > 0.55 ? jitter(MEGA.concreteDark, 0.08, noise3(x, y, z, 61)) : null));
  for (let x = -5; x <= 4; x += 3) model.set(x, 4, -6, MEGA.bareSteel).set(x, 4, 5, MEGA.bareSteel);
  return parts(model, 5);
};

const RIB_HALF = 48;
const RIB_RISE = 74;

const ribArch = (): ObjectModelParts => {
  const model = new VoxelModel();
  const steps = 420;
  for (let index = 0; index <= steps; index++) {
    const t = (index / steps) * Math.PI;
    if (noise3(index >> 4, 0, 0, 67) > 0.86 && t > 0.6 && t < 2.5) continue;
    const cx = -Math.cos(t) * RIB_HALF;
    const cy = Math.sin(t) * RIB_RISE;
    const thick = 4 + Math.round((1 - Math.sin(t)) * 3);
    const nx = -Math.cos(t) / RIB_HALF;
    const ny = Math.sin(t) / RIB_RISE;
    const norm = Math.hypot(nx, ny);
    for (let d = 0; d < thick; d++) {
      const x = Math.round(cx - (nx / norm) * d);
      const y = Math.round(cy - (ny / norm) * d);
      if (y < 0) continue;
      model.fill(x, y, -3, x, y, 2, rustPaint);
    }
    if (index % 35 === 0 && t > 0.4 && t < 2.7 && noise3(index, 1, 0, 71) > 0.4) {
      const x = Math.round(cx);
      const y = Math.round(cy);
      const sag = 4 + Math.floor(noise3(index, 2, 0, 71) * 8);
      model.fill(x - 2, y - sag, -8, x + 2, y, -4, (vx, vy, vz) => (noise3(vx, vy, vz, 73) > 0.3 ? jitter(MEGA.rustDark, 0.06, noise3(vx, vy, vz, 79)) : null));
    }
  }
  return parts(model, RIB_RISE + 2);
};

const RING_HALF = 84;
const RING_CENTRE = 50;
const RING_RADIUS = Math.hypot(RING_HALF, RING_CENTRE);

const ringFoot = (): ObjectModelParts => {
  const model = new VoxelModel();
  for (let y = -DROP; y <= 12; y++) {
    const inset = y > 4 ? Math.floor((y - 4) / 2) : 0;
    model.fill(-11 + inset, y, -11 + inset, 10 - inset, y, 10 - inset, (x, vy, z) => ((x + z + vy) % 9 === 0 ? MEGA.obsidianSheen : MEGA.obsidian));
  }
  model.fill(-11, 2, -12, 10, 2, -12, MEGA.ringGlow, VOXEL_EMISSIVE).fill(-11, 2, 11, 10, 2, 11, MEGA.ringGlow, VOXEL_EMISSIVE);
  model.fill(-12, 2, -11, -12, 2, 10, MEGA.ringGlow, VOXEL_EMISSIVE).fill(11, 2, -11, 11, 2, 10, MEGA.ringGlow, VOXEL_EMISSIVE);
  return parts(model, 13);
};

const ringArch = (): ObjectModelParts => {
  const model = new VoxelModel();
  const reach = Math.ceil(RING_RADIUS);
  for (let x = -reach; x <= reach; x++) {
    for (let y = 0; y <= RING_CENTRE + reach; y++) {
      const distance = Math.hypot(x + 0.5, y - RING_CENTRE);
      if (distance > RING_RADIUS || distance < RING_RADIUS - 8) continue;
      const inner = distance < RING_RADIUS - 7;
      const seam = Math.abs(distance - (RING_RADIUS - 4)) < 0.5;
      for (let z = -4; z <= 3; z++) {
        const edge = z === -4 || z === 3;
        if (inner || (seam && edge)) model.set(x, y, z, MEGA.ringGlow, VOXEL_EMISSIVE);
        else model.set(x, y, z, (x * 3 + y * 5 + z) % 23 === 0 ? MEGA.obsidianSheen : MEGA.obsidian);
      }
    }
  }
  for (let index = 0; index < 18; index++) {
    const angle = noise3(index, 0, 0, 83) * Math.PI * 2;
    const radius = RING_RADIUS - 20 - noise3(index, 1, 0, 83) * 40;
    const x = Math.round(Math.cos(angle) * radius);
    const y = Math.round(RING_CENTRE + Math.sin(angle) * radius);
    if (y < 8) continue;
    model.fill(x, y, -1, x + 1, y + 2, 0, lighten(MEGA.ringGlow, 0.2), VOXEL_GLASS);
  }
  return parts(model, Math.ceil(RING_CENTRE + RING_RADIUS) + 1);
};

const DISH_MAST = 30;
const DISH_RADIUS = 20;
const DISH_TILT = 0.7;

const uplinkDish = (): ObjectModelParts => {
  const model = new VoxelModel().fill(-11, -DROP, -11, 10, 2, 10, grain(MEGA.concrete, 0.05, 89));
  model.fill(-11, 2, -11, 10, 2, -11, MEGA.amber).fill(-11, 2, 10, 10, 2, 10, MEGA.amber);
  model.fill(-3, 3, -3, 2, DISH_MAST, 2, grain(MEGA.panel, 0.03, 97));
  model.fill(-3, 10, -4, 2, 11, -4, MEGA.cyan, VOXEL_EMISSIVE);
  const cos = Math.cos(DISH_TILT);
  const sin = Math.sin(DISH_TILT);
  const centreY = DISH_MAST + 10;
  for (let u = -DISH_RADIUS; u <= DISH_RADIUS; u++) {
    for (let v = -DISH_RADIUS; v <= DISH_RADIUS; v++) {
      const r = Math.hypot(u, v);
      if (r > DISH_RADIUS) continue;
      for (let layer = 0; layer < 2; layer++) {
        const depth = (r * r) / (4 * 16) - layer;
        const y = centreY + v * sin + depth * cos;
        const z = v * cos - depth * sin;
        const rib = Math.abs(u) <= 0.5 || Math.abs(v) <= 0.5 || Math.abs(r - 12) < 0.6;
        model.set(u, Math.round(y), Math.round(z), rib ? MEGA.dishRib : jitter(MEGA.dish, 0.02, noise3(u, v, layer, 101)));
      }
    }
  }
  model.fill(-1, centreY - 4, -1, 0, centreY + 2, 0, MEGA.steel);
  for (let t = 0; t <= 14; t++) model.set(0, Math.round(centreY + 2 + t * cos), Math.round(-t * sin), MEGA.steel);
  model.fill(-1, Math.round(centreY + 16 * cos), Math.round(-16 * sin) - 1, 0, Math.round(centreY + 16 * cos) + 1, Math.round(-16 * sin), MEGA.red, VOXEL_EMISSIVE);
  return parts(model, Math.round(centreY + DISH_RADIUS));
};

const CABLE_END = 52;
const CABLE_HIGH = 27;
const CABLE_SAG = 9;

const uplinkCable = (): ObjectModelParts => {
  const model = new VoxelModel();
  for (let x = -CABLE_END; x <= CABLE_END; x++) {
    const t = x / CABLE_END;
    const y = Math.round(CABLE_HIGH - CABLE_SAG * (1 - t * t));
    model.set(x, y, -1, MEGA.cable).set(x, y + 1, 1, MEGA.cable);
    if (x % 26 === 0) model.fill(x - 1, y - 1, -1, x, y, 0, MEGA.amber, VOXEL_EMISSIVE);
  }
  return parts(model, CABLE_HIGH + 2);
};

export const MEGA_BUILDERS: Readonly<Record<MegaModel, (seed: number) => ObjectModelParts>> = {
  maglevPylon,
  maglevSpan,
  maglevSpanEnd,
  siphonTrestle,
  siphonPipe,
  ribFoot,
  ribArch,
  ringFoot,
  ringArch,
  uplinkDish,
  uplinkCable,
};
