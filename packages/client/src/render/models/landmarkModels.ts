import type { WorldObjectModel } from '@containment/shared';
import type { Object3D } from 'three';
import { darken, jitter, lighten, mix, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS, VOXEL_SOLID, type VoxelKind } from '../voxel/voxelKinds.ts';
import { VoxelModel, type Paint } from '../voxel/voxelModel.ts';
import type { AnimatedPart, ObjectModelParts } from './objectModels.ts';

type LandmarkModel = Extract<
  WorldObjectModel,
  | 'signalMast'
  | 'lanternTower'
  | 'ledgerClock'
  | 'gantryCrane'
  | 'settlingTank'
  | 'beamEngine'
  | 'heartBloom'
  | 'saltReliquary'
  | 'headframe'
  | 'weighScale'
  | 'brazierHearth'
  | 'apothecaryRotunda'
  | 'nursesStation'
  | 'greatDish'
  | 'containmentTank'
  | 'pneumaticTree'
  | 'indexCarousel'
  | 'invertedMonument'
  | 'deconArch'
  | 'reactorRing'
  | 'mortuaryBier'
  | 'depthGauge'
  | 'saltCone'
  | 'containerTower'
  | 'cryoCore'
  | 'callBoard'
  | 'bellJarTree'
  | 'slagLadle'
  | 'beaconRed'
  | 'beaconGreen'
  | 'beaconBlue'
  | 'beaconAmber'
>;

const VOXEL = 1 / 16;

const STONE = 0xd9d4c7;
const STONE_SHADE = 0xb9b3a4;
const STONE_DARK = 0x8f897c;
const CONCRETE = 0x9a9890;
const CONCRETE_DARK = 0x6c6a64;
const BRASS = 0xb8913a;
const BRASS_DARK = 0x8a6b2f;
const STEEL = 0x8d969e;
const STEEL_DARK = 0x56636c;
const STEEL_DEEP = 0x2a333a;
const IRON = 0x3a3634;
const RUST = 0x8a4a2a;
const OAK = 0x9a6a3a;
const OAK_DARK = 0x5e3d22;
const BRONZE = 0x8a6a42;
const PATINA = 0x5f8a78;
const CREAM = 0xf2efe6;
const SALT = 0xf1ece6;
const SALT_PINK = 0xe8d2cc;
const BRINE = 0x9fb8b0;
const WATER_MURK = 0x3f6f6a;
const HAZARD_YELLOW = 0xc99a1c;
const HAZARD_BLACK = 0x17170f;
const EMBER = 0xff8a3a;
const FLAME = 0xffc35a;
const CYAN = 0x4fd8ff;
const SIGNAL_RED = 0xff4a3a;
const SPORE = 0x9cf27a;
const FLESH = 0xb86a7a;
const SOIL = 0x4a3a2a;
const RED_CROSS = 0xc8352a;

const parts = (base: VoxelModel, heightVoxels: number, animated: AnimatedPart[] = []): ObjectModelParts => ({ base, animated, heightVoxels });

type Shade = (x: number, y: number, z: number) => number;
type Point = readonly [number, number, number];

const grained = (color: number, amount = 0.03, salt = 0): Shade => (x, y, z) => jitter(color, amount, noise3(x, y, z, salt));
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

const column = (model: VoxelModel, cx: number, cz: number, radius: number, y0: number, y1: number, paint: Paint, kind: VoxelKind = VOXEL_SOLID): void => {
  for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
    for (let z = Math.floor(cz - radius); z <= Math.ceil(cz + radius); z++) {
      if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) <= radius) model.fill(x, y0, z, x, y1, z, paint, kind);
    }
  }
};

const beam = (model: VoxelModel, from: Point, to: Point, thickness: number, paint: Paint, kind: VoxelKind = VOXEL_SOLID): void => {
  const steps = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) * 1.5));
  const half = Math.floor(thickness / 2);
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const x = Math.round(from[0] + (to[0] - from[0]) * t);
    const y = Math.round(from[1] + (to[1] - from[1]) * t);
    const z = Math.round(from[2] + (to[2] - from[2]) * t);
    model.fill(x - half, y - half, z - half, x - half + thickness - 1, y - half + thickness - 1, z - half + thickness - 1, paint, kind);
  }
};

const ball = (model: VoxelModel, cx: number, cy: number, cz: number, radius: number, paint: Paint, kind: VoxelKind = VOXEL_SOLID): void => {
  const reach = Math.ceil(radius);
  for (let x = -reach; x <= reach; x++) {
    for (let y = -reach; y <= reach; y++) {
      for (let z = -reach; z <= reach; z++) {
        if (Math.hypot(x, y, z) <= radius) model.set(Math.round(cx + x), Math.round(cy + y), Math.round(cz + z), typeof paint === 'number' ? paint : (paint(Math.round(cx + x), Math.round(cy + y), Math.round(cz + z)) ?? 0), kind);
      }
    }
  }
};

const dial = (model: VoxelModel, cx: number, cy: number, z: number, radius: number, face: number, rim: number, hand: number, angle: number): void => {
  for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
      const reach = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (reach > radius) continue;
      model.set(x, y, z, reach > radius - 1.2 ? rim : face);
      const tick = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
      if (reach > radius - 2.6 && reach <= radius - 1.2 && Math.abs(Math.round(tick / (Math.PI / 6)) * (Math.PI / 6) - tick) < 0.12) model.set(x, y, z, darken(face, 0.6));
    }
  }
  for (let step = 0; step <= radius - 2; step++) model.set(Math.round(cx - 0.5 + Math.cos(angle) * step), Math.round(cy - 0.5 + Math.sin(angle) * step), z + (z >= 0 ? 1 : -1), hand);
  model.set(Math.round(cx - 0.5), Math.round(cy - 0.5), z + (z >= 0 ? 1 : -1), BRASS);
};

const blink = (rate: number, phase = 0) => (part: Object3D, time: number, seed: number) => {
  part.visible = Math.sin(time * rate + phase + seed) > -0.2;
};

const flicker = (phase: number) => (part: Object3D, time: number, seed: number) => {
  part.visible = Math.sin(time * 9 + seed * 3 + phase) + Math.sin(time * 13.7 + phase) > -0.6;
};

const spin = (rate: number) => (part: Object3D, time: number, seed: number) => {
  part.rotation.y = time * rate + seed;
};

const bob = (depth: number, rate: number) => (part: Object3D, time: number, seed: number) => {
  part.position.y = Math.sin(time * rate + seed) * depth * VOXEL;
};

const pulse = (amount: number, rate: number) => (part: Object3D, time: number, seed: number) => {
  const scale = 1 + Math.max(0, Math.sin(time * rate + seed)) ** 6 * amount;
  part.scale.set(scale, scale, scale);
};

const footing = (model: VoxelModel, half: number, height: number, seed: number, color = CONCRETE): void => {
  model.fill(-half, 0, -half, half - 1, height, half - 1, (x, y, z) => {
    const edge = x === -half || x === half - 1 || z === -half || z === half - 1;
    if (y === height && edge) return lighten(color, 0.12);
    return jitter(color, 0.04, noise3(x, y, z, seed));
  });
};

const signalMast = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  footing(model, 15, 3, seed);
  const top = 54;
  const leg = (y: number) => 12 - ((y - 4) / (top - 4)) * 9;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (let y = 4; y <= top; y++) {
        const reach = leg(y);
        const x = Math.round(sx * reach - (sx < 0 ? 1 : 0));
        const z = Math.round(sz * reach - (sz < 0 ? 1 : 0));
        model.fill(x - (sx > 0 ? 1 : 0), y, z - (sz > 0 ? 1 : 0), x + (sx < 0 ? 1 : 0), y, z + (sz < 0 ? 1 : 0), y % 16 < 2 ? 0xf0f0f0 : SIGNAL_RED);
      }
    }
  }
  for (let y = 10; y < top - 6; y += 10) {
    const a = leg(y);
    const b = leg(y + 10);
    for (const side of [-1, 1]) {
      beam(model, [Math.round(-a), y, Math.round(side * a)], [Math.round(b), y + 10, Math.round(side * b)], 1, STEEL_DARK);
      beam(model, [Math.round(side * a), y, Math.round(-a)], [Math.round(side * b), y + 10, Math.round(b)], 1, STEEL_DARK);
      beam(model, [Math.round(-a), y, Math.round(side * a)], [Math.round(a), y, Math.round(side * a)], 1, STEEL);
      beam(model, [Math.round(side * a), y, Math.round(-a)], [Math.round(side * a), y, Math.round(a)], 1, STEEL);
    }
  }
  ring(model, 4, 9, 38, 38, (x, _y, z) => ((x + z + 64) % 2 === 0 ? STEEL : STEEL_DARK));
  ring(model, 8, 9, 39, 41, STEEL_DARK);
  for (let x = -6; x <= 5; x++) {
    for (let y = 42; y <= 53; y++) {
      const reach = Math.hypot(x + 0.5, y - 47.5);
      if (reach > 6) continue;
      model.set(x, y, 7 + Math.round(reach * reach * 0.06), reach > 5.2 ? STEEL_DARK : 0xe6eaec);
    }
  }
  beam(model, [-0.5, 47, 8], [-0.5, 47, 14], 1, STEEL_DARK);
  model.fill(-1, 47, 14, 0, 48, 15, BRASS);
  column(model, -0.5, -0.5, 1.5, top, top + 4, STEEL_DEEP);
  const beacon = new VoxelModel();
  ball(beacon, -0.5, top + 6, -0.5, 2.2, SIGNAL_RED, VOXEL_EMISSIVE);
  return parts(model, top + 9, [{ model: beacon, animate: blink(1.4) }]);
};

const lanternTower = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-12, 0, -12, 11, 4, 11, (x, y, z) => (Math.abs(x + 0.5) + Math.abs(z + 0.5) > 17 ? null : y === 4 ? lighten(STONE, 0.15) : jitter(STONE_SHADE, 0.03, noise3(x, y, z, seed))));
  model.fill(-8, 5, -8, 7, 8, 7, (x, y, z) => (Math.abs(x + 0.5) + Math.abs(z + 0.5) > 11 ? null : jitter(IRON, 0.04, noise3(x, y, z, seed + 1))));
  column(model, -0.5, -0.5, 3.4, 9, 52, (x, y, z) => {
    if (y % 14 === 0 || y === 51) return BRASS_DARK;
    return Math.floor(((bearing(x, z) + Math.PI) / (Math.PI * 2)) * 12) % 2 === 0 ? IRON : lighten(IRON, 0.1);
  });
  ring(model, 2, 4.6, 24, 25, BRASS);
  disc(model, 5, 52, 53, IRON);
  const flames = new VoxelModel();
  for (let index = 0; index < 4; index++) {
    const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
    const ax = Math.round(Math.cos(angle) * 10 - 0.5);
    const az = Math.round(Math.sin(angle) * 10 - 0.5);
    beam(model, [0, 50, 0], [ax, 54, az], 2, IRON);
    model.fill(ax - 2, 53, az - 2, ax + 2, 53, az + 2, IRON);
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]] as const) model.fill(ax + dx, 46, az + dz, ax + dx, 52, az + dz, IRON);
    model.fill(ax - 2, 45, az - 2, ax + 2, 45, az + 2, IRON);
    model.fill(ax - 1, 46, az - 1, ax + 1, 52, az + 1, (x, y, z) => (Math.abs(x - ax) === 1 || Math.abs(z - az) === 1 ? 0xffd89a : null), VOXEL_GLASS);
    flames.fill(ax, 47, az, ax, 50, az, (_x, y) => (y >= 49 ? FLAME : EMBER), VOXEL_EMISSIVE);
    model.fill(ax - 1, 54, az - 1, ax + 1, 55, az + 1, IRON).set(ax, 56, az, BRASS);
  }
  column(model, -0.5, -0.5, 2, 54, 60, IRON);
  ball(model, -0.5, 62, -0.5, 1.8, BRASS);
  return parts(model, 64, [{ model: flames, animate: flicker(0) }]);
};

const ledgerClock = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (let step = 0; step < 3; step++) {
    const half = 15 - step * 2;
    model.fill(-half, step * 2, -half, half - 1, step * 2 + 1, half - 1, (x, y, z) => (y === step * 2 + 1 && (x === -half || x === half - 1 || z === -half || z === half - 1) ? lighten(STONE, 0.15) : jitter(STONE_SHADE, 0.03, noise3(x, y, z, seed))));
  }
  for (let y = 6; y <= 50; y++) {
    const half = Math.round(9 - (y - 6) * 0.075);
    model.fill(-half, y, -half, half - 1, y, half - 1, (x, vy, z) => {
      const face = Math.max(Math.abs(x + 0.5), Math.abs(z + 0.5)) > half - 1;
      if (face && vy > 12 && vy < 34 && vy % 3 === 0) return darken(STONE, 0.28);
      if (vy === 30 || vy === 50) return BRASS;
      return jitter(STONE, 0.025, noise3(x, vy, z, seed + 1));
    });
  }
  for (let y = 51; y <= 60; y++) {
    const half = Math.max(1, Math.round(6 - (y - 51) * 0.6));
    model.fill(-half, y, -half, half - 1, y, half - 1, y >= 58 ? BRASS : jitter(STONE_SHADE, 0.03, noise3(0, y, 0, seed)));
  }
  dial(model, 0, 40, 7, 6, CREAM, BRASS, 0x1a1a1a, Math.PI / 3);
  dial(model, 0, 40, -8, 6, CREAM, BRASS, 0x1a1a1a, Math.PI / 3);
  for (let x = -6; x <= 5; x++) {
    for (let y = 34; y <= 46; y++) {
      const reach = Math.hypot(x + 0.5, y - 40);
      if (reach > 6) continue;
      model.set(7, y, x, reach > 4.8 ? BRASS : CREAM);
      model.set(-8, y, x, reach > 4.8 ? BRASS : CREAM);
    }
  }
  model.fill(8, 40, -1, 8, 44, -1, 0x1a1a1a).fill(-9, 40, -1, -9, 44, -1, 0x1a1a1a);
  return parts(model, 62);
};

const gantryCrane = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  const girderY = 50;
  for (const x0 of [-56, 50]) {
    for (const z0 of [-24, 19]) model.fill(x0, 0, z0, x0 + 5, 3, z0 + 4, (x, y, z) => (y === 3 ? hazard(x, y, z) : STEEL_DEEP));
    for (const z0 of [-22, 19]) {
      const lean = z0 < 0 ? 1 : -1;
      for (let y = 4; y < girderY; y++) {
        const shift = Math.round(((y - 4) / girderY) * 10) * lean;
        model.fill(x0 + 1, y, z0 + shift, x0 + 4, y, z0 + shift + 2, (x, vy, z) => (vy < 16 ? hazard(x, vy, z) : jitter(HAZARD_YELLOW, 0.04, noise3(x, vy, z, seed))));
      }
    }
    beam(model, [x0 + 2, 24, -12], [x0 + 2, 24, 10], 2, STEEL_DARK);
    beam(model, [x0 + 2, 8, -18], [x0 + 2, 40, 8], 2, STEEL_DARK);
  }
  model.fill(-56, girderY, -8, 55, girderY + 8, 7, (x, y, z) => {
    if (y === girderY + 8 || y === girderY) return darken(HAZARD_YELLOW, 0.15);
    if ((z === -8 || z === 7) && (x + 64) % 8 < 1) return STEEL_DARK;
    if ((z === -8 || z === 7) && (y === girderY + 2 || y === girderY + 6)) return darken(HAZARD_YELLOW, 0.25);
    return jitter(HAZARD_YELLOW, 0.035, noise3(x, y, z, seed + 1));
  });
  for (let x = -54; x <= 52; x += 12) model.fill(x, girderY + 9, -1, x + 1, girderY + 10, 0, SIGNAL_RED);
  model.fill(4, girderY - 6, -10, 19, girderY - 1, 9, (x, y, z) => (y === girderY - 6 ? STEEL_DEEP : jitter(STEEL_DARK, 0.03, noise3(x, y, z, seed + 2))));
  model.fill(6, girderY - 5, 10, 11, girderY - 2, 10, 0x7fb8d0, VOXEL_GLASS);
  for (let y = 30; y < girderY - 6; y++) model.set(11, y, -1, 0x1a1a1a).set(12, y, 0, 0x1a1a1a);
  model.fill(8, 27, -3, 15, 29, 2, STEEL_DEEP);
  beam(model, [11, 26, -1], [11, 23, -1], 2, BRASS_DARK);
  model.fill(10, 21, -2, 13, 22, 1, BRASS_DARK).fill(13, 20, -2, 13, 21, 1, BRASS_DARK);
  const lamp = new VoxelModel().fill(-2, girderY + 9, -1, 1, girderY + 10, 0, 0xffb347, VOXEL_EMISSIVE);
  return parts(model, girderY + 12, [{ model: lamp, animate: blink(2.2) }]);
};

const settlingTank = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  ring(model, 32.5, 39.5, 0, 14, (x, y, z) => {
    if (y === 14) return lighten(CONCRETE, 0.2);
    if (y % 5 === 0) return darken(CONCRETE, 0.12);
    const stain = noise3(x, Math.floor(y / 2), z, seed) > 0.8 ? 0.18 : 0;
    return jitter(darken(mix(CONCRETE, PATINA, y < 6 ? 0.25 : 0), stain), 0.04, noise3(x, y, z, seed));
  });
  disc(model, 32.5, 0, 9, darken(WATER_MURK, 0.4));
  disc(model, 32.5, 10, 11, (x, y, z) => {
    const scum = noise3(Math.floor(x / 2), y, Math.floor(z / 2), seed + 1);
    if (scum > 0.86) return 0x9fb07a;
    return jitter(WATER_MURK, 0.05, noise3(x, y, z, seed + 2));
  }, VOXEL_GLASS);
  ring(model, 38.5, 39.5, 15, 18, (x, y, z) => (y === 18 ? STEEL : (Math.round(bearing(x, z) * 12) % 3 === 0 ? STEEL_DARK : null)));
  column(model, -0.5, -0.5, 4, 0, 18, grained(CONCRETE_DARK, 0.04, seed + 3));
  disc(model, 5, 19, 20, STEEL_DARK);
  const skimmer = new VoxelModel();
  skimmer.fill(-1, 14, -2, 37, 18, 1, (x, y, z) => {
    if (y === 18) return (x + 64) % 4 === 0 ? STEEL : null;
    if (y === 14) return STEEL_DEEP;
    if (z === -2 || z === 1) return y === 15 ? hazard(x, y, z) : STEEL_DARK;
    return STEEL;
  });
  skimmer.fill(-1, 12, -1, 37, 13, 0, (x) => ((x + 64) % 3 === 0 ? 0x2a2420 : null));
  skimmer.fill(33, 19, -2, 37, 22, 1, STEEL_DARK).fill(34, 23, -1, 36, 23, 0, CYAN, VOXEL_EMISSIVE);
  return parts(model, 24, [{ model: skimmer, animate: spin(0.12) }]);
};

const beamEngine = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-40, 0, -24, 39, 7, 23, (x, y, z) => {
    if (y === 7) return (x + 64) % 8 === 0 || (z + 64) % 8 === 0 ? darken(RUST, 0.35) : jitter(RUST, 0.05, noise3(x, y, z, seed));
    return (Math.floor(y / 2) + Math.floor((x + (Math.floor(y / 2) % 2) * 3) / 6)) % 7 === 0 ? 0x5a3a2a : jitter(0x7a4232, 0.05, noise3(x, y, z, seed + 1));
  });
  for (const x0 of [-6, 4]) {
    for (let y = 8; y <= 44; y++) model.fill(x0, y, -14 + Math.round((y - 8) / 4), x0 + 2, y, -11 + Math.round((y - 8) / 4), IRON);
    for (let y = 8; y <= 44; y++) model.fill(x0, y, 13 - Math.round((y - 8) / 4), x0 + 2, y, 10 - Math.round((y - 8) / 4), IRON);
  }
  model.fill(-8, 44, -6, 9, 47, 5, IRON);
  model.fill(-38, 48, -2, 37, 52, 1, (x, y, z) => {
    if (y === 50 && Math.abs(x) > 4) return darken(IRON, 0.3);
    return jitter(0x2a3a3a, 0.04, noise3(x, y, z, seed + 2));
  });
  for (let x = -36; x <= 35; x += 6) model.fill(x, 49, 2, x, 51, 2, BRASS);
  disc(model, 3, 46, 54, BRASS);
  column(model, -30.5, -0.5, 7, 8, 32, (x, y, z) => (y === 8 || y === 32 || y === 20 ? BRASS_DARK : grained(0x34484a, 0.04, seed + 3)(x, y, z)));
  model.fill(-31, 33, -1, -30, 47, 0, CREAM);
  for (let angle = 0; angle < Math.PI * 2; angle += 0.03) {
    for (let reach = 12; reach <= 15; reach++) model.set(Math.round(22 + Math.cos(angle) * reach), Math.round(24 + Math.sin(angle) * reach), -16, IRON).set(Math.round(22 + Math.cos(angle) * reach), Math.round(24 + Math.sin(angle) * reach), -15, IRON);
  }
  for (let spoke = 0; spoke < 6; spoke++) {
    const angle = (spoke / 6) * Math.PI * 2;
    beam(model, [22, 24, -16], [Math.round(22 + Math.cos(angle) * 12), Math.round(24 + Math.sin(angle) * 12), -16], 2, IRON);
  }
  model.fill(20, 8, -18, 24, 24, -13, darken(IRON, 0.2));
  beam(model, [34, 49, -1], [24, 28, -14], 2, STEEL_DARK);
  for (const x of [-22, 18]) model.fill(x, 8, 14, x + 3, 30, 17, (vx, y, vz) => (y === 30 ? BRASS : jitter(STEEL_DARK, 0.03, noise3(vx, y, vz, seed + 4))));
  return parts(model, 56);
};

const heartBloom = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  disc(model, 22, 0, 2, (x, y, z) => (noise3(x, y, z, seed) > 0.75 ? 0x3a5a2a : jitter(SOIL, 0.06, noise3(x, y, z, seed + 1))));
  for (let root = 0; root < 7; root++) {
    const angle = (root / 7) * Math.PI * 2 + noise3(root, 0, 0, seed);
    beam(model, [0, 6, 0], [Math.round(Math.cos(angle) * 19), 1, Math.round(Math.sin(angle) * 19)], 3, jitter(0x6a5a3a, 0.05, root));
  }
  column(model, -0.5, -0.5, 5, 2, 30, (x, y, z) => (Math.sin(bearing(x, z) * 5 + y * 0.4) > 0.75 ? 0x3f7a3a : jitter(0x4f6a3a, 0.05, noise3(x, y, z, seed + 2))));
  for (let petal = 0; petal < 6; petal++) {
    const angle = (petal / 6) * Math.PI * 2;
    const tip: Point = [Math.round(Math.cos(angle) * 19), 38, Math.round(Math.sin(angle) * 19)];
    beam(model, [Math.round(Math.cos(angle) * 6), 30, Math.round(Math.sin(angle) * 6)], [Math.round(Math.cos(angle) * 15), 40, Math.round(Math.sin(angle) * 15)], 4, (x, y, z) => jitter(petal % 2 === 0 ? FLESH : lighten(FLESH, 0.12), 0.05, noise3(x, y, z, seed + 3)));
    beam(model, [Math.round(Math.cos(angle) * 15), 40, Math.round(Math.sin(angle) * 15)], tip, 3, (x, y, z) => jitter(darken(FLESH, 0.15), 0.05, noise3(x, y, z, seed + 4)));
  }
  const bulb = new VoxelModel();
  ball(bulb, -0.5, 42, -0.5, 11, (x, y, z) => {
    const seam = Math.abs(Math.sin(bearing(x, z) * 3)) < 0.12;
    if (seam) return SPORE;
    return jitter(y > 46 ? lighten(FLESH, 0.2) : FLESH, 0.05, noise3(x, y, z, seed + 5));
  });
  bulb.paintExisting(-12, 30, -12, 11, 54, 11, (x, _y, z) => (Math.abs(Math.sin(bearing(x, z) * 3)) < 0.12 ? SPORE : null), VOXEL_EMISSIVE);
  ball(bulb, -0.5, 53, -0.5, 3, lighten(SPORE, 0.3), VOXEL_EMISSIVE);
  const spores = new VoxelModel();
  for (let index = 0; index < 18; index++) {
    const angle = noise3(index, 1, 0, seed) * Math.PI * 2;
    const reach = 8 + noise3(index, 2, 0, seed) * 13;
    spores.set(Math.round(Math.cos(angle) * reach), Math.round(26 + noise3(index, 3, 0, seed) * 32), Math.round(Math.sin(angle) * reach), SPORE, VOXEL_EMISSIVE);
  }
  return parts(model, 60, [{ model: bulb, animate: pulse(0.04, 1.3) }, { model: spores, animate: bob(3, 0.5) }]);
};

const saltReliquary = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  const salt: Shade = (x, y, z) => {
    const grain = noise3(x, y, z, seed);
    if (grain > 0.9) return SALT_PINK;
    if (grain < 0.08) return BRINE;
    return jitter(SALT, 0.025, grain);
  };
  for (let step = 0; step < 3; step++) model.fill(-40 + step * 4, step * 2, -24 + step * 2, 39 - step * 4, step * 2 + 1, 23 - step * 4, (x, y, z) => (y === step * 2 + 1 && z === 23 - step * 4 ? lighten(SALT, 0.2) : salt(x, y, z)));
  model.fill(-20, 6, -14, 19, 19, 5, (x, y, z) => (y === 19 || (z === 5 && (y === 7 || y === 17)) ? lighten(SALT, 0.3) : salt(x, y, z)));
  for (let x = -18; x <= 17; x += 6) model.fill(x, 9, 6, x + 2, 15, 6, BRINE);
  model.fill(-9, 20, -9, 8, 30, 0, (x, y, z) => (x === -9 || x === 8 || z === -9 || z === 0 || y === 30 ? BRASS : null));
  model.fill(-8, 20, -8, 7, 29, -1, (_x, y) => (y > 26 ? 0xfff0e0 : 0xf8e0d8), VOXEL_GLASS);
  ball(model, -0.5, 24, -4.5, 3, 0xfff4e8, VOXEL_EMISSIVE);
  for (let spire = 0; spire < 13; spire++) {
    const x = -36 + spire * 6;
    const height = 26 + Math.round((1 - Math.abs(spire - 6) / 6) * 30 + noise3(spire, 0, 0, seed) * 4);
    for (let y = 6; y <= height; y++) {
      const width = Math.max(0, Math.round(3 - ((y - 6) / (height - 6)) * 3));
      model.fill(x - width, y, -20 - width, x + width, y, -18 + width, (vx, vy, vz) => (vy > height - 4 ? 0xfff6f0 : jitter(spire % 2 === 0 ? SALT : SALT_PINK, 0.03, noise3(vx, vy, vz, seed + 1))), VOXEL_GLASS);
    }
  }
  const candles = new VoxelModel();
  for (const x of [-34, -28, 27, 33]) {
    for (const z of [10, 16]) {
      const height = 10 + Math.round(noise3(x, 0, z, seed) * 8);
      model.fill(x, 6, z, x + 1, height, z + 1, CREAM);
      candles.fill(x, height + 1, z, x, height + 2, z, FLAME, VOXEL_EMISSIVE);
    }
  }
  return parts(model, 62, [{ model: candles, animate: flicker(1) }]);
};

const headframe = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-24, 0, -24, 23, 2, 23, (x, y, z) => (Math.abs(x + 0.5) < 10 && Math.abs(z + 0.5) < 10 && y === 2 ? 0x101010 : jitter(CONCRETE_DARK, 0.05, noise3(x, y, z, seed))));
  model.fill(-10, 0, -10, 9, 2, 9, (x, _y, z) => (Math.abs(x + 0.5) > 8.5 || Math.abs(z + 0.5) > 8.5 ? hazard(x, 0, z) : null));
  const top = 40;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      beam(model, [sx * 21, 3, sz * 21], [sx * 7, top, sz * 7], 3, (x, y, z) => jitter(RUST, 0.06, noise3(x, y, z, seed + 1)));
    }
    for (let y = 12; y < top - 6; y += 14) {
      const a = 21 - ((y - 3) / (top - 3)) * 14;
      const b = 21 - ((y + 14 - 3) / (top - 3)) * 14;
      beam(model, [Math.round(sx * a), y, Math.round(-a)], [Math.round(sx * a), y, Math.round(a)], 2, darken(RUST, 0.2));
      beam(model, [Math.round(-a), y, Math.round(sx * a)], [Math.round(a), y, Math.round(sx * a)], 2, darken(RUST, 0.2));
      beam(model, [Math.round(sx * a), y, Math.round(-a)], [Math.round(sx * b), y + 14, Math.round(b)], 1, darken(RUST, 0.3));
    }
  }
  model.fill(-9, top, -9, 8, top + 2, 8, IRON);
  for (const z of [-5, 4]) {
    for (let angle = 0; angle < Math.PI * 2; angle += 0.04) {
      for (let reach = 8; reach <= 10; reach++) model.set(Math.round(Math.cos(angle) * reach), Math.round(top + 11 + Math.sin(angle) * reach), z, reach === 10 ? IRON : 0x5a4a3a);
    }
    for (let spoke = 0; spoke < 8; spoke++) {
      const angle = (spoke / 8) * Math.PI * 2;
      beam(model, [0, top + 11, z], [Math.round(Math.cos(angle) * 8), Math.round(top + 11 + Math.sin(angle) * 8), z], 1, IRON);
    }
    model.fill(-1, top + 2, z, 0, top + 11, z, IRON);
  }
  for (let y = 22; y <= top + 11; y++) model.set(-9, y, -5, 0x1a1a1a).set(-9, y, 4, 0x1a1a1a);
  model.fill(-8, 3, -7, 7, 21, 6, (x, y, z) => {
    const frame = x === -8 || x === 7 || z === -7 || z === 6 || y === 3 || y === 21 || y === 12;
    if (frame) return y === 21 ? STEEL_DARK : darken(HAZARD_YELLOW, 0.25);
    return (x + y + 64) % 3 === 0 ? STEEL_DARK : null;
  });
  const lamp = new VoxelModel().fill(-2, top + 3, 9, 1, top + 5, 10, 0xffb347, VOXEL_EMISSIVE);
  return parts(model, 64, [{ model: lamp, animate: blink(0.8) }]);
};

const weighScale = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-32, 0, -24, 31, 2, 7, (x, y, z) => {
    if (y === 2 && (x === -32 || x === 31 || z === -24 || z === 7)) return hazard(x, y, z);
    if (y === 2) return (Math.floor(x / 2) + Math.floor(z / 2)) % 2 === 0 ? STEEL : STEEL_DARK;
    return STEEL_DEEP;
  });
  model.fill(-14, 0, 9, 13, 30, 23, (x, y, z) => {
    if (y <= 2) return CONCRETE_DARK;
    if (y >= 28) return y === 30 ? darken(RUST, 0.3) : RUST;
    if (z === 9 && x > -8 && x < 7 && y > 4 && y < 13) return null;
    return (Math.floor(y / 3) + Math.floor(x / 5)) % 2 === 0 ? jitter(0x8a7a5a, 0.04, noise3(x, y, z, seed)) : jitter(0x7a6a4a, 0.04, noise3(x, y, z, seed));
  });
  model.fill(-7, 5, 10, 6, 12, 10, 0x9fc8d0, VOXEL_GLASS);
  dial(model, 0, 20, 8, 7, CREAM, BRASS, SIGNAL_RED, Math.PI * 0.7);
  model.fill(-16, 31, 7, 15, 32, 23, IRON);
  model.fill(-1, 33, 15, 0, 40, 16, IRON).fill(-3, 41, 14, 2, 42, 17, 0xffd27f, VOXEL_EMISSIVE);
  return parts(model, 44);
};

const brazierHearth = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (let index = 0; index < 14; index++) {
    const angle = (index / 14) * Math.PI * 2;
    const x = Math.round(Math.cos(angle) * 13 - 0.5);
    const z = Math.round(Math.sin(angle) * 13 - 0.5);
    model.fill(x - 1, 0, z - 1, x + 1, 2 + Math.round(noise3(index, 0, 0, seed)), z + 1, jitter(STONE_DARK, 0.08, noise3(x, 0, z, seed)));
  }
  disc(model, 11, 0, 0, darken(SOIL, 0.3));
  for (let leg = 0; leg < 3; leg++) {
    const angle = (leg / 3) * Math.PI * 2;
    beam(model, [Math.round(Math.cos(angle) * 8), 1, Math.round(Math.sin(angle) * 8)], [Math.round(Math.cos(angle) * 5), 12, Math.round(Math.sin(angle) * 5)], 2, IRON);
  }
  for (let y = 12; y <= 18; y++) ring(model, 3 + (y - 12) * 0.8, 4.4 + (y - 12) * 0.8, y, y, (x, vy, z) => ((Math.round(bearing(x, z) * 8) + vy) % 3 === 0 ? null : jitter(IRON, 0.05, noise3(x, vy, z, seed))));
  disc(model, 8, 12, 12, IRON);
  disc(model, 7.5, 13, 16, (x, y, z) => (noise3(x, y, z, seed + 1) > 0.5 ? EMBER : 0x8a2a1a), VOXEL_EMISSIVE);
  const flames = new VoxelModel();
  const embers = new VoxelModel();
  for (let x = -7; x <= 6; x++) {
    for (let z = -7; z <= 6; z++) {
      if (radial(x, z) > 7) continue;
      const height = Math.round((1 - radial(x, z) / 7) * 12 * (0.5 + noise3(x, 0, z, seed + 2)));
      for (let y = 17; y <= 17 + height; y++) (noise3(x, y, z, seed + 3) > 0.5 ? flames : embers).set(x, y, z, y > 17 + height * 0.6 ? FLAME : EMBER, VOXEL_EMISSIVE);
    }
  }
  model.fill(9, 0, -15, 15, 2, -11, OAK_DARK).fill(10, 3, -15, 14, 4, -12, OAK);
  return parts(model, 40, [{ model: flames, animate: flicker(0) }, { model: embers, animate: flicker(2.1) }]);
};

const apothecaryRotunda = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  disc(model, 38.5, 0, 0, (x, y, z) => (Math.floor(radial(x, z) / 4) % 2 === 0 ? 0x2a4a44 : jitter(CREAM, 0.03, noise3(x, y, z, seed))));
  ring(model, 30.5, 37.5, 1, 14, (x, y, z) => {
    if (Math.abs(bearing(x, z) - Math.PI / 2) < 0.22) return null;
    if (y === 14) return BRASS;
    if (y === 13) return OAK_DARK;
    if (radial(x, z) > 36.6 && y > 3 && y < 12 && Math.round(bearing(x, z) * 10) % 2 === 0) return darken(OAK, 0.3);
    return jitter(OAK, 0.05, noise3(x, y, z, seed + 1));
  });
  ring(model, 30.5, 37.5, 15, 15, (x, _y, z) => (Math.abs(bearing(x, z) - Math.PI / 2) < 0.22 ? null : lighten(STONE, 0.25)));
  column(model, -0.5, -0.5, 11, 1, 46, (x, y, z) => {
    if (y % 8 === 1) return OAK_DARK;
    if (radial(x, z) < 10) return OAK_DARK;
    const jar = noise3(Math.round(bearing(x, z) * 6), Math.floor(y / 8), 0, seed + 2);
    return [0x7a2a3a, 0x2a7a5a, 0xc89a3a, 0x3a5a9a, CREAM][Math.floor(jar * 5)] as number;
  }, VOXEL_SOLID);
  ring(model, 10, 11.5, 1, 46, (x, y, z) => (y % 8 === 1 || y % 8 === 0 ? null : noise3(x, Math.floor(y / 8), z, seed + 3) > 0.4 ? lighten([0x7a2a3a, 0x2a7a5a, 0xc89a3a, 0x3a5a9a][Math.floor(noise3(x, y, z, seed) * 4)] as number, 0.2) : null), VOXEL_GLASS);
  for (let y = 47; y <= 58; y++) {
    const reach = Math.sqrt(Math.max(0, 1 - ((y - 47) / 12) ** 2)) * 14;
    ring(model, reach - 1.4, reach, y, y, (x, vy, z) => (Math.round(bearing(x, z) * 8) % 2 === 0 ? BRASS : PATINA));
  }
  disc(model, 14, 47, 47, BRASS_DARK);
  ball(model, -0.5, 60, -0.5, 1.8, BRASS);
  const lamps = new VoxelModel();
  for (let index = 0; index < 6; index++) {
    const angle = (index / 6) * Math.PI * 2;
    const x = Math.round(Math.cos(angle) * 22 - 0.5);
    const z = Math.round(Math.sin(angle) * 22 - 0.5);
    beam(model, [Math.round(Math.cos(angle) * 12), 46, Math.round(Math.sin(angle) * 12)], [x, 42, z], 1, BRASS_DARK);
    model.fill(x, 36, z, x, 41, z, BRASS_DARK);
    lamps.fill(x - 1, 33, z - 1, x + 1, 35, z + 1, 0xffd89a, VOXEL_EMISSIVE);
  }
  return parts(model, 62, [{ model: lamps, animate: flicker(0.5) }]);
};

const nursesStation = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  const desk = (x0: number, z0: number, x1: number, z1: number) =>
    model.fill(x0, 0, z0, x1, 14, z1, (x, y, z) => {
      if (y === 14) return lighten(STONE, 0.2);
      if (y === 13) return 0x3a6a7a;
      if (y <= 1) return STEEL_DEEP;
      return jitter(CREAM, 0.03, noise3(x, y, z, seed));
    });
  desk(-30, 12, 29, 19);
  desk(-30, -6, -24, 11);
  desk(23, -6, 29, 11);
  model.fill(-6, 4, 20, 5, 11, 20, (x, y) => ((Math.abs(x + 0.5) < 1.5 && y > 4 && y < 11) || (y === 7 || y === 8) ? RED_CROSS : CREAM));
  model.fill(-14, 15, 13, -9, 22, 14, STEEL_DEEP).fill(-13, 16, 12, -10, 21, 12, 0x7cf29a, VOXEL_EMISSIVE);
  model.fill(8, 15, 14, 13, 16, 17, BRASS_DARK);
  ball(model, 18.5, 16, 15.5, 1.8, BRASS);
  model.fill(-26, 0, -24, 25, 44, -20, (x, y, z) => {
    if (y <= 2) return STEEL_DEEP;
    if (x === -26 || x === 25 || y === 44 || y === 3) return OAK_DARK;
    return jitter(0x6a5a4a, 0.03, noise3(x, y, z, seed + 1));
  });
  for (let slot = 0; slot < 12; slot++) {
    const x = -22 + (slot % 6) * 8;
    const y = 30 - Math.floor(slot / 6) * 16;
    model.fill(x, y, -19, x + 5, y + 9, -19, (vx, vy) => (vy === y + 9 ? BRASS : (vy - y) % 2 === 0 && vx > x && vx < x + 5 ? 0x5a6a7a : CREAM));
  }
  model.fill(0, 46, 0, 0, 56, 0, IRON);
  model.fill(-4, 44, -4, 3, 45, 3, IRON);
  const lamp = new VoxelModel().fill(-3, 42, -3, 2, 43, 2, 0xfff4d8, VOXEL_EMISSIVE);
  return parts(model, 58, [{ model: lamp, animate: flicker(3) }]);
};

const greatDish = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  disc(model, 18, 0, 3, grained(CONCRETE, 0.04, seed));
  column(model, -0.5, -0.5, 10, 4, 22, (x, y, z) => (y % 6 === 0 ? CONCRETE_DARK : grained(CONCRETE, 0.04, seed + 1)(x, y, z)));
  disc(model, 12, 23, 25, STEEL_DARK);
  for (const x of [-12, 11]) beam(model, [x, 25, 0], [x, 33, 0], 3, STEEL_DARK);
  model.fill(-13, 32, -2, 12, 35, 1, STEEL_DEEP);
  const tilt = Math.PI / 4;
  const focal = 26;
  const centreY = 36;
  const place = (u: number, v: number, d: number): Point => {
    const y = v * Math.cos(tilt) + d * Math.sin(tilt);
    const z = -v * Math.sin(tilt) + d * Math.cos(tilt);
    return [Math.round(u), Math.round(centreY + y), Math.round(z - 2)];
  };
  for (let u = -30; u <= 30; u += 0.5) {
    for (let v = -30; v <= 30; v += 0.5) {
      const reach = Math.hypot(u, v);
      if (reach > 30) continue;
      const depth = (reach * reach) / (4 * focal);
      const [x, y, z] = place(u, v, depth);
      const panel = (Math.round(reach / 6) + Math.round(Math.atan2(v, u) * 4)) % 2 === 0;
      model.set(x, y, z, reach > 29 ? STEEL_DARK : panel ? 0xe8ecee : 0xd0d6da);
      const [bx, by, bz] = place(u, v, depth - 1);
      if (reach < 28 && Math.abs(u % 9) < 0.5) model.set(bx, by, bz, STEEL_DARK);
    }
  }
  for (const angle of [Math.PI / 2, (Math.PI * 7) / 6, (Math.PI * 11) / 6]) {
    beam(model, place(Math.cos(angle) * 28, Math.sin(angle) * 28, 7), place(0, 0, focal), 1, STEEL_DARK);
  }
  const [fx, fy, fz] = place(0, 0, focal);
  model.fill(fx - 2, fy - 2, fz - 2, fx + 1, fy + 1, fz + 1, STEEL_DEEP);
  const horn = new VoxelModel();
  ball(horn, fx - 0.5, fy - 0.5, fz + 2, 1.4, SIGNAL_RED, VOXEL_EMISSIVE);
  return parts(model, 64, [{ model: horn, animate: blink(0.9) }]);
};

const containmentTank = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-22, 0, -22, 21, 6, 21, (x, y, z) => {
    if (Math.abs(x + 0.5) + Math.abs(z + 0.5) > 34) return null;
    if (y === 6 && Math.abs(x + 0.5) + Math.abs(z + 0.5) > 32) return hazard(x, y, z);
    return jitter(STEEL_DEEP, 0.03, noise3(x, y, z, seed));
  });
  ring(model, 16.5, 18, 7, 52, 0xc8f0d8, VOXEL_GLASS);
  for (let index = 0; index < 6; index++) {
    const angle = (index / 6) * Math.PI * 2;
    column(model, Math.cos(angle) * 18.5, Math.sin(angle) * 18.5, 1.3, 7, 52, STEEL_DARK);
  }
  disc(model, 16.5, 7, 47, (x, y, z) => (noise3(x, y, z, seed + 1) > 0.97 ? lighten(SPORE, 0.4) : 0x4a9a5a), VOXEL_GLASS);
  const specimen: Shade = (x, y, z) => jitter(0x1e2a24, 0.05, noise3(x, y, z, seed + 2));
  ball(model, -0.5, 36, -0.5, 4, specimen);
  column(model, -0.5, -0.5, 4, 18, 32, specimen);
  beam(model, [-4, 30, 0], [-9, 22, 3], 2, specimen);
  beam(model, [3, 30, 0], [8, 24, -2], 2, specimen);
  beam(model, [-2, 18, 0], [-5, 10, 4], 3, specimen);
  beam(model, [1, 18, 0], [4, 11, -3], 3, specimen);
  model.fill(-2, 36, 3, -1, 36, 3, SPORE, VOXEL_EMISSIVE).fill(1, 36, 3, 2, 36, 3, SPORE, VOXEL_EMISSIVE);
  disc(model, 19.5, 53, 58, (x, y, z) => (y === 55 ? BRASS_DARK : jitter(STEEL_DARK, 0.03, noise3(x, y, z, seed + 3))));
  for (const [x, z] of [[-8, -8], [7, 6], [0, -12]] as const) beam(model, [x, 58, z], [x * 1.5, 62, z * 1.5], 3, x === 0 ? 0x2a2a2a : STEEL_DEEP);
  const bubbles = new VoxelModel();
  for (let index = 0; index < 14; index++) bubbles.set(Math.round((noise3(index, 0, 0, seed) - 0.5) * 26), Math.round(9 + noise3(index, 1, 0, seed) * 36), Math.round((noise3(index, 2, 0, seed) - 0.5) * 26), lighten(SPORE, 0.5), VOXEL_EMISSIVE);
  return parts(model, 64, [{ model: bubbles, animate: bob(4, 0.7) }]);
};

const pneumaticTree = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-14, 0, -14, 13, 10, 13, (x, y, z) => {
    if (y === 10 || y === 0) return BRASS_DARK;
    if ((x === -14 || x === 13 || z === -14 || z === 13) && y > 2 && y < 9 && (x + z + 64) % 6 < 2) return 0x1a1a1a;
    return jitter(BRASS, 0.04, noise3(x, y, z, seed));
  });
  for (let index = 0; index < 4; index++) {
    const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
    model.fill(Math.round(Math.cos(angle) * 18) - 2, 0, Math.round(Math.sin(angle) * 18) - 2, Math.round(Math.cos(angle) * 18) + 1, 8, Math.round(Math.sin(angle) * 18) + 1, (x, y, z) => (y === 8 ? BRASS : jitter(OAK, 0.04, noise3(x, y, z, seed + index))));
  }
  column(model, -0.5, -0.5, 4.5, 11, 62, (x, y, z) => (y % 10 === 0 ? BRASS_DARK : y > 34 && y < 46 ? null : jitter(BRASS, 0.04, noise3(x, y, z, seed + 1))));
  column(model, -0.5, -0.5, 4.5, 35, 45, 0xd8eef0, VOXEL_GLASS);
  const capsules = new VoxelModel();
  column(capsules, -0.5, -0.5, 2.5, 37, 41, (_x, y) => (y === 45 ? RED_CROSS : 0xd8c8a0));
  for (let branch = 0; branch < 8; branch++) {
    const angle = (branch / 8) * Math.PI * 2;
    const startY = 16 + (branch % 3) * 10;
    const out: Point = [Math.round(Math.cos(angle) * 20), startY + 12, Math.round(Math.sin(angle) * 20)];
    beam(model, [Math.round(Math.cos(angle) * 4), startY, Math.round(Math.sin(angle) * 4)], out, 3, branch % 2 === 0 ? BRASS : lighten(BRASS, 0.12));
    beam(model, out, [out[0], 61, out[2]], 3, branch % 2 === 0 ? BRASS : lighten(BRASS, 0.12));
    model.fill(out[0] - 2, out[1] - 1, out[2] - 2, out[0] + 2, out[1] + 1, out[2] + 2, BRASS_DARK);
  }
  const lamp = new VoxelModel().fill(-1, 12, 14, 0, 14, 14, 0x7cf29a, VOXEL_EMISSIVE);
  return parts(model, 64, [{ model: capsules, animate: bob(8, 0.8) }, { model: lamp, animate: blink(2.7) }]);
};

const indexCarousel = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  disc(model, 22, 0, 3, (x, y, z) => (y === 3 && radial(x, z) > 21 ? BRASS : jitter(STONE_SHADE, 0.03, noise3(x, y, z, seed))));
  column(model, -0.5, -0.5, 4, 4, 52, BRASS_DARK);
  const drum = new VoxelModel();
  ring(drum, 7, 18, 6, 42, (x, y, z) => {
    const outer = radial(x, z) > 16.8;
    if (y === 6 || y === 42 || y % 9 === 6) return OAK_DARK;
    if (!outer) return darken(OAK, 0.2);
    const column = Math.round(((bearing(x, z) + Math.PI) / (Math.PI * 2)) * 36);
    if (column % 3 === 0) return OAK_DARK;
    if ((y % 9) === 1 && column % 3 === 1) return BRASS;
    return jitter(OAK, 0.05, noise3(x, y, z, seed + 1));
  });
  disc(drum, 19, 43, 44, BRASS);
  for (let y = 45; y <= 50; y++) ring(drum, 16 - (y - 45) * 2.4, 18 - (y - 45) * 2.4, y, y, (x, _y, z) => (Math.round(bearing(x, z) * 6) % 2 === 0 ? BRASS : OAK_DARK));
  const lamp = new VoxelModel();
  ball(lamp, -0.5, 55, -0.5, 2.6, 0xffe2a8, VOXEL_EMISSIVE);
  model.fill(18, 0, -2, 20, 30, -1, OAK_DARK);
  for (let y = 3; y <= 29; y += 4) model.fill(17, y, -2, 21, y, -1, OAK);
  return parts(model, 60, [{ model: drum, animate: spin(0.06) }, { model: lamp, animate: flicker(1.5) }]);
};

const invertedMonument = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  disc(model, 15, 0, 1, (x, y, z) => jitter(STONE_DARK, 0.03, noise3(x, y, z, seed)));
  ring(model, 13.5, 15, 2, 2, BRASS);
  const bronze: Shade = (x, y, z) => {
    const grain = noise3(x, y, z, seed + 1);
    return grain > 0.82 ? mix(BRONZE, PATINA, 0.6) : jitter(BRONZE, 0.04, grain);
  };
  ball(model, -0.5, 6, -0.5, 3.4, bronze);
  column(model, -0.5, -0.5, 1.6, 9, 11, bronze);
  for (let y = 11; y <= 24; y++) {
    const half = Math.round(4 + (y - 11) * 0.12);
    model.fill(-half, y, -2, half - 1, y, 1, bronze);
  }
  beam(model, [-2, 24, 0], [-5, 40, 1], 3, bronze);
  beam(model, [1, 24, 0], [4, 40, -1], 3, bronze);
  beam(model, [-5, 22, 0], [-9, 10, 2], 2, bronze);
  beam(model, [4, 22, 0], [8, 6, 0], 2, bronze);
  column(model, 8.5, 0.5, 1.6, 2, 5, (_x, y) => (y === 2 ? lighten(PATINA, 0.2) : BRONZE));
  model.fill(-12, 46, -12, 11, 62, 11, (x, y, z) => {
    if (y === 46 || y === 62) return lighten(STONE, 0.2);
    const face = Math.max(Math.abs(x + 0.5), Math.abs(z + 0.5)) > 10.8;
    if (face && y > 49 && y < 58 && Math.abs(x + 0.5) < 7 && z > 10) return (62 - y) % 2 === 0 ? BRASS : BRASS_DARK;
    return jitter(STONE, 0.025, noise3(x, y, z, seed + 2));
  });
  for (const x of [-10, 9]) beam(model, [x, 41, 0], [x, 45, 0], 1, darken(STONE, 0.3));
  const motes = new VoxelModel();
  for (let index = 0; index < 10; index++) motes.set(Math.round((noise3(index, 0, 0, seed) - 0.5) * 24), Math.round(38 + noise3(index, 1, 0, seed) * 8), Math.round((noise3(index, 2, 0, seed) - 0.5) * 24), 0xd8e8ff, VOXEL_EMISSIVE);
  return parts(model, 64, [{ model: motes, animate: bob(2, 0.4) }]);
};

const deconArch = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-24, 0, -8, 23, 0, 7, (x, y, z) => (z === -8 || z === 7 ? hazard(x, y, z) : (x + 64) % 4 === 0 ? STEEL_DARK : STEEL));
  for (const x0 of [-24, 17]) {
    model.fill(x0, 1, -7, x0 + 6, 40, 6, (x, y, z) => {
      if (y === 40 || y === 1) return STEEL_DEEP;
      if ((x === (x0 < 0 ? x0 + 6 : x0)) && y > 6 && y < 36 && (y % 5 === 0)) return 0x2a2a2a;
      return jitter(0xd8dcde, 0.02, noise3(x, y, z, seed));
    });
    for (let y = 8; y <= 34; y += 5) model.set(x0 < 0 ? x0 + 7 : x0 - 1, y, 0, CYAN, VOXEL_EMISSIVE);
  }
  model.fill(-24, 41, -7, 23, 47, 6, (x, y, z) => (y === 41 ? STEEL_DEEP : y === 47 ? STEEL_DARK : (z === 6 && y === 44) ? hazard(x, y, z) : jitter(0xd8dcde, 0.02, noise3(x, y, z, seed + 1))));
  model.fill(-6, 42, 7, 5, 46, 7, 0x101418);
  model.fill(-5, 43, 7, 4, 45, 7, (x) => ((x + 64) % 3 === 0 ? 0x7cf29a : 0x1a2a20), VOXEL_EMISSIVE);
  const scan = new VoxelModel().fill(-17, 20, -6, 16, 20, 5, (x, _y, z) => ((x + z + 64) % 3 === 0 ? CYAN : null), VOXEL_EMISSIVE);
  return parts(model, 48, [{ model: scan, animate: bob(16, 1.4) }]);
};

const reactorRing = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-38, 0, -38, 37, 6, 37, (x, y, z) => {
    if (Math.abs(x + 0.5) + Math.abs(z + 0.5) > 56) return null;
    if (y === 6 && Math.abs(x + 0.5) + Math.abs(z + 0.5) > 54) return hazard(x, y, z);
    return jitter(STEEL_DEEP, 0.03, noise3(x, y, z, seed));
  });
  for (let index = 0; index < 4; index++) {
    const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
    column(model, Math.cos(angle) * 28, Math.sin(angle) * 28, 3, 7, 22, STEEL_DARK);
  }
  for (let angle = 0; angle < Math.PI * 2; angle += 0.01) {
    for (let u = -3; u <= 3; u++) {
      for (let v = -3; v <= 3; v++) {
        if (Math.hypot(u, v) > 3.4) continue;
        const reach = 28 + u;
        model.set(Math.round(Math.cos(angle) * reach - 0.5), 26 + v, Math.round(Math.sin(angle) * reach - 0.5), Math.round(angle * 16) % 8 === 0 ? BRASS : jitter(0x4a3a3a, 0.05, noise3(u, v, angle * 10, seed)));
      }
    }
  }
  for (let index = 0; index < 8; index++) {
    const angle = (index / 8) * Math.PI * 2;
    const x = Math.round(Math.cos(angle) * 28 - 0.5);
    const z = Math.round(Math.sin(angle) * 28 - 0.5);
    model.fill(x - 3, 20, z - 3, x + 3, 32, z + 3, (vx, y, vz) => (y === 32 || y === 20 ? BRASS_DARK : jitter(0x8a4a2a, 0.05, noise3(vx, y, vz, seed + 1))));
    beam(model, [x, 26, z], [Math.round(x * 0.35), 30, Math.round(z * 0.35)], 2, IRON);
  }
  column(model, -0.5, -0.5, 9, 7, 58, (x, y, z) => (y % 8 < 2 ? BRASS_DARK : jitter(IRON, 0.05, noise3(x, y, z, seed + 2))));
  const glow = new VoxelModel();
  for (let y = 10; y <= 56; y += 8) ring(glow, 8.6, 9.6, y + 3, y + 5, EMBER, VOXEL_EMISSIVE);
  disc(glow, 6, 59, 62, FLAME, VOXEL_EMISSIVE);
  return parts(model, 64, [{ model: glow, animate: flicker(0.7) }]);
};

const mortuaryBier = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-20, 0, -12, 19, 2, 11, (x, y, z) => jitter(STONE_DARK, 0.03, noise3(x, y, z, seed)));
  model.fill(-17, 3, -8, 16, 12, 7, (x, y, z) => {
    if (y === 12) return lighten(STONE, 0.15);
    if ((z === 7 || z === -8) && y > 4 && y < 11 && (x + 64) % 8 < 1) return STONE_DARK;
    return jitter(STONE, 0.025, noise3(x, y, z, seed + 1));
  });
  for (let x = -14; x <= 13; x++) {
    for (let z = -6; z <= 5; z++) {
      const body = Math.max(0, 1 - ((z + 0.5) / 6) ** 2) * (x < -9 ? 3.5 : x > 9 ? 2 : 2.6);
      const height = Math.round(13 + body + noise3(x, 0, z, seed + 2) * 0.8);
      model.fill(x, 13, z, x, height, z, (vx, vy, vz) => jitter(CREAM, 0.03, noise3(vx, vy, vz, seed + 3)));
    }
  }
  const flames = new VoxelModel();
  for (const x of [-20, 18]) {
    for (const z of [-12, 10]) {
      model.fill(x, 0, z, x + 1, 1, z + 1, IRON);
      model.fill(x, 2, z, x + 1, 36, z + 1, (_vx, y) => (y % 8 === 0 ? BRASS_DARK : IRON));
      model.fill(x - 1, 37, z - 1, x + 2, 37, z + 2, BRASS_DARK);
      model.fill(x, 38, z, x + 1, 40, z + 1, CREAM);
      flames.fill(x, 41, z, x + 1, 42, z + 1, FLAME, VOXEL_EMISSIVE);
    }
  }
  model.fill(-3, 14, -11, 2, 16, -9, 0x3a5a3a).set(0, 17, -10, 0xc8b8d8);
  return parts(model, 44, [{ model: flames, animate: flicker(2) }]);
};

const depthGauge = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  footing(model, 14, 3, seed, STEEL_DEEP);
  column(model, -0.5, -0.5, 3.2, 4, 34, (x, y, z) => (y % 9 === 0 ? BRASS_DARK : grained(BRASS, 0.04, seed + 1)(x, y, z)));
  for (const y of [12, 24]) disc(model, 5, y, y + 1, BRASS_DARK);
  for (let angle = 0; angle < Math.PI * 2; angle += 0.4) {
    model.set(Math.round(Math.cos(angle) * 5), 9, Math.round(Math.sin(angle) * 5), SIGNAL_RED);
  }
  model.fill(-6, 8, -1, 5, 10, 0, SIGNAL_RED);
  model.fill(-14, 34, -4, 13, 60, 2, (x, y, z) => {
    const reach = Math.hypot(x + 0.5, y - 47);
    if (reach > 13.5) return null;
    return reach > 12.4 ? BRASS : jitter(BRASS_DARK, 0.03, noise3(x, y, z, seed + 2));
  });
  for (let x = -13; x <= 12; x++) {
    for (let y = 34; y <= 60; y++) {
      const reach = Math.hypot(x + 0.5, y - 47);
      if (reach > 12) continue;
      const angle = Math.atan2(y - 47, x + 0.5);
      const red = reach > 8 && angle > -0.2 && angle < 0.9;
      model.set(x, y, 3, reach > 11 ? BRASS : red ? 0xd84a3a : CREAM);
      if (reach > 9.4 && reach <= 11 && Math.abs(Math.round(angle / (Math.PI / 8)) * (Math.PI / 8) - angle) < 0.08) model.set(x, y, 3, 0x1a1a1a);
    }
  }
  const needle = new VoxelModel();
  for (let step = 0; step <= 9; step++) needle.set(Math.round(-0.5 + Math.cos(0.5) * step), Math.round(46.5 + Math.sin(0.5) * step), 4, 0x1a1a1a);
  needle.set(0, 47, 4, BRASS);
  return parts(model, 62, [{ model: needle, animate: (part, time, phase) => { part.visible = Math.sin(time * 0.7 + phase) > -0.9; } }]);
};

const saltCone = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  for (let x = -24; x <= 23; x++) {
    for (let z = -24; z <= 23; z++) {
      const reach = radial(x, z) + (noise3(Math.floor(x / 3), 0, Math.floor(z / 3), seed) - 0.5) * 4;
      if (reach > 23.5) continue;
      const height = Math.max(0, Math.round((1 - reach / 23.5) ** 0.8 * 44 + noise3(x, 1, z, seed) * 2));
      model.fill(x, 0, z, x, height, z, (vx, y, vz) => {
        const grain = noise3(vx, y, vz, seed + 1);
        if (y < 4 && grain > 0.6) return BRINE;
        if (grain > 0.93) return SALT_PINK;
        return jitter(SALT, 0.03, grain);
      });
    }
  }
  beam(model, [10, 24, 6], [20, 4, 16], 1, OAK_DARK);
  model.fill(19, 1, 15, 22, 4, 18, STEEL_DARK);
  for (let step = 0; step <= 10; step++) {
    const y = 2 + step * 3;
    const x = Math.round(-22 + step * 1.6);
    model.fill(x, y, -4, x, y, 3, OAK).set(x, y, -5, OAK_DARK).set(x, y, 4, OAK_DARK);
  }
  const lamp = new VoxelModel().fill(-1, 46, -1, 0, 48, 0, 0xffd27f, VOXEL_EMISSIVE);
  model.fill(-1, 44, -1, 0, 45, 0, IRON);
  return parts(model, 50, [{ model: lamp, animate: flicker(4) }]);
};

const CONTAINER_COLORS = [0x2f6f9a, 0xa8432a, 0x3f7a4a, 0xc99a1c];

const containerTower = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  footing(model, 24, 1, seed, CONCRETE_DARK);
  const levels = 4;
  for (let level = 0; level < levels; level++) {
    const y0 = 2 + level * 10;
    const along = level % 2 === 0;
    const color = CONTAINER_COLORS[(level + seed) % CONTAINER_COLORS.length]!;
    const [x0, x1, z0, z1] = along ? [-22, 21, -9, 8] : [-9, 8, -22, 21];
    model.fill(x0, y0, z0, x1, y0 + 9, z1, (x, y, z) => {
      const end = along ? x === x0 || x === x1 : z === z0 || z === z1;
      if (y === y0 || y === y0 + 9) return darken(color, 0.35);
      if (end) return (along ? z : x) % 4 === 0 ? STEEL_DARK : darken(color, 0.15);
      const rib = (along ? x : z) % 2 === 0;
      return jitter(rib ? color : darken(color, 0.12), 0.04, noise3(x, y, z, seed + level));
    });
    for (let step = -4; step <= 3; step++) {
      if (along) model.set(step, y0 + 5, z1 + 1, CREAM);
      else model.set(x1 + 1, y0 + 5, step, CREAM);
    }
  }
  const top = 2 + levels * 10;
  for (let y = 2; y < top; y++) {
    model.set(-23, y, -3, STEEL_DARK).set(-23, y, 2, STEEL_DARK);
    if (y % 3 === 0) model.fill(-23, y, -2, -23, y, 1, STEEL);
  }
  model.fill(-3, top, -3, 2, top + 2, 2, STEEL_DEEP);
  column(model, -0.5, -0.5, 1, top + 3, top + 10, STEEL_DARK);
  model.fill(-3, top + 11, -3, 2, top + 11, 2, STEEL_DARK);
  const lamp = new VoxelModel();
  ball(lamp, -0.5, top + 14, -0.5, 2.4, 0xffb347, VOXEL_EMISSIVE);
  return parts(model, top + 17, [{ model: lamp, animate: blink(2.2) }]);
};

const FROST = 0xe4f4ff;
const ICE = 0x9fd8ff;

const cryoCore = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  disc(model, 22, 0, 2, (x, y, z) => (noise3(x, y, z, seed) > 0.7 ? FROST : jitter(STEEL_DARK, 0.04, noise3(x, y, z, seed + 1))));
  ring(model, 19, 22, 3, 3, (x, _y, z) => (Math.floor(((bearing(x, z) + Math.PI) / (Math.PI * 2)) * 16) % 2 === 0 ? HAZARD_YELLOW : HAZARD_BLACK));
  disc(model, 11, 3, 8, (x, y, z) => (y === 8 ? lighten(STEEL, 0.1) : jitter(STEEL, 0.04, noise3(x, y, z, seed + 2))));
  ring(model, 6.5, 8, 9, 48, (x, y, z) => (y % 8 === 0 ? STEEL_DARK : noise3(x, y, z, seed + 3) > 0.82 ? FROST : ICE), VOXEL_GLASS);
  for (const y of [9, 24, 40]) ring(model, 7, 9.5, y, y + 1, STEEL_DARK);
  disc(model, 10, 49, 53, (x, y, z) => (y === 53 ? lighten(STEEL, 0.15) : jitter(STEEL, 0.04, noise3(x, y, z, seed + 4))));
  column(model, -0.5, -0.5, 4, 54, 57, STEEL_DARK);
  for (let index = 0; index < 4; index++) {
    const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
    const fx = Math.round(Math.cos(angle) * 18 - 0.5);
    const fz = Math.round(Math.sin(angle) * 18 - 0.5);
    const tx = Math.round(Math.cos(angle) * 10 - 0.5);
    const tz = Math.round(Math.sin(angle) * 10 - 0.5);
    model.fill(fx - 2, 3, fz - 2, fx + 1, 6, fz + 1, STEEL_DEEP);
    beam(model, [fx, 6, fz], [fx, 44, fz], 3, (x, y, z) => (noise3(x, y, z, seed + 5) > 0.72 ? FROST : STEEL));
    beam(model, [fx, 45, fz], [tx, 50, tz], 3, STEEL);
  }
  const core = new VoxelModel();
  column(core, -0.5, -0.5, 4, 9, 48, (x, y, z) => (Math.sin(y * 0.5 + bearing(x, z) * 2) > 0.6 ? 0xe8fbff : CYAN), VOXEL_EMISSIVE);
  return parts(model, 58, [{ model: core, animate: pulse(0.03, 0.9) }]);
};

const callBoard = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-24, 0, -10, 23, 2, 9, (x, y, z) => (y === 2 ? lighten(STONE, 0.1) : jitter(STONE_SHADE, 0.03, noise3(x, y, z, seed))));
  for (const x0 of [-22, 18]) model.fill(x0, 3, -3, x0 + 3, 46, 2, grained(OAK_DARK, 0.04, seed + 1));
  model.fill(-21, 10, -2, 20, 45, 1, (x, y, z) => {
    if (x === -21 || x === 20 || y === 10 || y === 45) return OAK;
    return z === 1 ? jitter(0x1d2a26, 0.04, noise3(x, y, z, seed + 2)) : OAK_DARK;
  });
  model.fill(-24, 46, -4, 23, 48, 3, grained(OAK, 0.03, seed + 3));
  model.fill(-20, 49, -2, 19, 50, 1, OAK_DARK);
  model.fill(-21, 9, 2, 20, 9, 6, grained(OAK, 0.03, seed + 4));
  const lamps = new VoxelModel();
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      const x = -17 + col * 10;
      const y = 39 - row * 5;
      model.fill(x + 3, y, 2, x + 7, y + 1, 2, CREAM);
      if (noise3(row, col, 0, seed + 7) > 0.55) lamps.fill(x, y, 2, x + 1, y + 1, 2, 0xffe08a, VOXEL_EMISSIVE);
      else model.fill(x, y, 2, x + 1, y + 1, 2, 0x4a3a2a);
    }
  }
  model.fill(-1, 51, -1, 0, 54, 0, BRASS_DARK);
  beam(model, [-6, 55, 0], [5, 55, 0], 1, BRASS_DARK);
  const bell = new VoxelModel();
  for (let y = 0; y < 6; y++) column(bell, -0.5, -0.5, 1.5 + y * 0.6, 53 - y, 53 - y, (x, vy, z) => jitter(BRASS, 0.04, noise3(x, vy, z, seed + 8)));
  return parts(model, 58, [{ model: lamps, animate: blink(0.7) }, { model: bell, animate: bob(0.4, 0.6) }]);
};

const LEAF = 0x4f8a3a;

const bellJarTree = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  disc(model, 23, 0, 4, (x, y, z) => (y === 4 && radial(x, z) > 20.5 ? BRASS : jitter(STONE_SHADE, 0.03, noise3(x, y, z, seed))));
  disc(model, 19, 5, 5, (x, y, z) => (noise3(x, y, z, seed + 1) > 0.8 ? 0x3a5a2a : jitter(SOIL, 0.06, noise3(x, y, z, seed + 2))));
  column(model, -0.5, -0.5, 2.5, 6, 26, grained(OAK_DARK, 0.06, seed + 3));
  for (let branch = 0; branch < 5; branch++) {
    const angle = (branch / 5) * Math.PI * 2 + noise3(branch, 0, 0, seed);
    const reach = 9 + noise3(branch, 1, 0, seed) * 4;
    beam(model, [0, 18 + branch * 2, 0], [Math.round(Math.cos(angle) * reach), 30 + branch, Math.round(Math.sin(angle) * reach)], 2, OAK_DARK);
  }
  const canopy = new VoxelModel();
  for (let clump = 0; clump < 7; clump++) {
    const angle = (clump / 7) * Math.PI * 2 + noise3(clump, 2, 0, seed);
    const reach = clump === 0 ? 0 : 7 + noise3(clump, 3, 0, seed) * 4;
    const radius = 5 + noise3(clump, 4, 0, seed) * 2;
    ball(canopy, Math.cos(angle) * reach, 34 + noise3(clump, 5, 0, seed) * 6, Math.sin(angle) * reach, radius, (x, y, z) => {
      if (Math.hypot(x + 0.5, z + 0.5) > 17 || y > 46) return null;
      const grain = noise3(x, y, z, seed + 6);
      if (grain > 0.94) return 0xffe08a;
      return jitter(y > 38 ? lighten(LEAF, 0.15) : LEAF, 0.08, grain);
    });
  }
  for (let x = -20; x <= 19; x++) {
    for (let z = -20; z <= 19; z++) {
      const r = radial(x, z);
      for (let y = 6; y <= 50; y++) {
        const reach = y <= 30 ? r : Math.hypot(r, y - 30);
        if (reach <= 19 || reach > 20) continue;
        const angle = bearing(x, z);
        const rib = Math.abs(Math.round(angle / (Math.PI / 4)) * (Math.PI / 4) - angle) < 0.06 || y === 30 || y === 6;
        if (rib) model.set(x, y, z, BRASS_DARK);
        else model.set(x, y, z, 0xd8f0e8, VOXEL_GLASS);
      }
    }
  }
  ball(model, -0.5, 52, -0.5, 1.6, BRASS);
  return parts(model, 55, [{ model: canopy, animate: bob(0.3, 0.4) }]);
};

const SLAG = 0x2a2420;

const slagLadle = (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-24, 0, -24, 23, 1, 23, (x, y, z) => (Math.max(Math.abs(x + 0.5), Math.abs(z + 0.5)) > 22 ? hazard(x, y, z) : jitter(IRON, 0.05, noise3(x, y, z, seed))));
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -22 : 18;
    for (let y = 2; y <= 30; y++) {
      const spread = Math.round((30 - y) * 0.35);
      model.fill(x0, y, -4 - spread, x0 + 3, y, -2 - spread, STEEL_DEEP).fill(x0, y, 1 + spread, x0 + 3, y, 3 + spread, STEEL_DEEP);
    }
    model.fill(x0, 29, -4, x0 + 3, 33, 3, STEEL_DARK);
    model.fill(side < 0 ? -18 : 14, 30, -2, side < 0 ? -15 : 17, 32, 1, BRASS_DARK);
  }
  for (let y = 10; y <= 38; y++) {
    const radius = 9 + (y - 10) * 0.2;
    ring(model, radius - 1.6, radius, y, y, (x, vy, z) => (vy % 7 === 0 ? RUST : jitter(darken(RUST, 0.35), 0.06, noise3(x, vy, z, seed + 1))));
  }
  disc(model, 9, 9, 9, darken(RUST, 0.4));
  beam(model, [-12, 38, 0], [-16, 42, 0], 3, darken(RUST, 0.35));
  const melt = new VoxelModel();
  disc(melt, 13.6, 36, 36, (x, y, z) => {
    const grain = noise3(x, y, z, seed + 2) + Math.sin(bearing(x, z) * 3 + radial(x, z)) * 0.2;
    if (grain > 0.85) return SLAG;
    return grain > 0.5 ? FLAME : EMBER;
  }, VOXEL_EMISSIVE);
  for (let blob = 0; blob < 9; blob++) {
    const angle = noise3(blob, 0, 1, seed) * Math.PI * 2;
    const reach = 15 + noise3(blob, 1, 1, seed) * 5;
    const bx = Math.round(Math.cos(angle) * reach);
    const bz = Math.round(Math.sin(angle) * reach);
    if (Math.abs(bx) > 20 || Math.abs(bz) > 20) continue;
    model.fill(bx - 1, 2, bz - 1, bx + 1, 2, bz + 1, SLAG).set(bx, 3, bz, SLAG);
    melt.set(bx + 1, 3, bz, EMBER, VOXEL_EMISSIVE);
  }
  return parts(model, 44, [{ model: melt, animate: flicker(1) }]);
};

const beacon = (color: number) => (seed: number): ObjectModelParts => {
  const model = new VoxelModel();
  model.fill(-12, 0, -12, 11, 6, 11, (x, y, z) => {
    if (Math.abs(x + 0.5) + Math.abs(z + 0.5) > 19) return null;
    if (y === 6) return lighten(STEEL_DEEP, 0.12);
    return y % 3 === 0 ? color : jitter(STEEL_DEEP, 0.05, noise3(x, y, z, seed));
  });
  for (let link = 0; link < 7; link++) {
    const x = Math.round(-14 + (link / 6) * 10);
    const y = Math.round(1 + (link / 6) * 5);
    model.fill(x, y, 10, x + 1, y + 1, 11, link % 2 === 0 ? STEEL : STEEL_DARK);
  }
  column(model, -0.5, -0.5, 2, 7, 44, (x, y, z) => (y % 12 < 3 ? color : y % 12 < 5 ? CREAM : grained(STEEL_DARK, 0.04, seed + 1)(x, y, z)));
  for (const y of [18, 32]) disc(model, 4, y, y, STEEL);
  disc(model, 6, 45, 46, STEEL_DEEP);
  for (const [dx, dz] of [[-5, -5], [4, -5], [-5, 4], [4, 4]] as const) model.fill(dx, 47, dz, dx, 54, dz, STEEL_DARK);
  disc(model, 6, 55, 56, STEEL_DEEP);
  column(model, -0.5, -0.5, 0.8, 57, 60, STEEL_DARK);
  const lamp = new VoxelModel();
  column(lamp, -0.5, -0.5, 3.2, 48, 53, (x, _y, z) => (Math.abs(Math.sin(bearing(x, z) * 2)) > 0.9 ? lighten(color, 0.4) : color), VOXEL_EMISSIVE);
  return parts(model, 62, [{ model: lamp, animate: blink(1.1, color % 7) }]);
};

export const LANDMARK_BUILDERS: Readonly<Record<LandmarkModel, (seed: number) => ObjectModelParts>> = {
  signalMast,
  lanternTower,
  ledgerClock,
  gantryCrane,
  settlingTank,
  beamEngine,
  heartBloom,
  saltReliquary,
  headframe,
  weighScale,
  brazierHearth,
  apothecaryRotunda,
  nursesStation,
  greatDish,
  containmentTank,
  pneumaticTree,
  indexCarousel,
  invertedMonument,
  deconArch,
  reactorRing,
  mortuaryBier,
  depthGauge,
  saltCone,
  containerTower,
  cryoCore,
  callBoard,
  bellJarTree,
  slagLadle,
  beaconRed: beacon(SIGNAL_RED),
  beaconGreen: beacon(0x5cf27a),
  beaconBlue: beacon(CYAN),
  beaconAmber: beacon(0xffb347),
};
