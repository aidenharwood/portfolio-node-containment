import type { CreatureModel } from '@containment/shared';
import { Group } from 'three';
import { darken, jitter, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE } from '../voxel/voxelKinds.ts';
import { createVoxelObject } from '../voxel/voxelMaterials.ts';
import type { VoxelMeshes } from '../voxel/voxelMesher.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import { CHARACTER_VOXEL_SIZE } from '../world/worldScale.ts';
import { swingCurve, type EntityPose, type EntityRig } from './entityRig.ts';

type WaterworksCreatureModel = Extract<CreatureModel, 'siltSkimmer' | 'sumpBloat' | 'sumpMother'>;

const VOXEL = CHARACTER_VOXEL_SIZE;
const meshCache = new Map<string, VoxelMeshes>();

function cachedMesh(key: string, build: () => VoxelModel, pivot: readonly [number, number, number] = [0, 0, 0]): VoxelMeshes {
  const cached = meshCache.get(key);
  if (cached) return cached;
  const meshes = build().mesh(VOXEL, pivot);
  meshCache.set(key, meshes);
  return meshes;
}

function blob(model: VoxelModel, radii: readonly [number, number, number], centerY: number, paint: (x: number, y: number, z: number) => number | null, shell = 0): VoxelModel {
  const [rx, ry, rz] = radii;
  for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
    for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
      for (let z = -Math.ceil(rz); z <= Math.ceil(rz); z++) {
        const distance = Math.hypot(x / rx, y / ry, z / rz);
        if (distance > 1 || (shell > 0 && distance < 1 - shell)) continue;
        const color = paint(x, y + centerY, z);
        if (color !== null) model.set(x, y + centerY, z, color);
      }
    }
  }
  return model;
}

class SiltSkimmerRig implements EntityRig {
  readonly root = new Group();
  readonly height = 0.55;
  private readonly body: Group;
  private readonly legs: { group: Group; phase: number; side: number }[] = [];

  constructor() {
    this.body = createVoxelObject(cachedMesh('skimmer-body', buildSkimmerBody));
    this.root.add(this.body);
    for (const [index, z] of [-4, 0, 4].entries()) {
      for (const side of [-1, 1] as const) {
        const leg = createVoxelObject(cachedMesh(`skimmer-leg-${side}`, () => buildSkimmerLeg(side), [0, 4, 0]));
        leg.position.set(side * 7 * VOXEL, 4 * VOXEL, z * VOXEL);
        this.body.add(leg);
        this.legs.push({ group: leg, phase: index * 2.1 + (side > 0 ? Math.PI : 0), side });
      }
    }
  }

  animate(pose: EntityPose): void {
    const stride = pose.moving ? pose.walkPhase * 2.4 : pose.time * 0.5;
    for (const leg of this.legs) leg.group.rotation.z = leg.side * Math.sin(stride + leg.phase) * (pose.moving ? 0.45 : 0.06);
    const lunge = swingCurve(pose.attackProgress);
    const hurt = swingCurve(pose.hurtProgress);
    this.body.position.set(Math.sin(pose.time * 32) * hurt * 0.03, Math.abs(Math.sin(stride)) * (pose.moving ? 0.015 : 0.004), lunge * 0.18);
    this.body.rotation.x = -lunge * 0.45;
    this.body.rotation.z = Math.sin(stride * 0.5) * (pose.moving ? 0.05 : 0.01);
  }
}

function buildSkimmerBody(): VoxelModel {
  const model = blob(new VoxelModel(), [7, 2.4, 6], 5, (x, y, z) => {
    if (y >= 6) return Math.hypot(x, z) < 3 ? 0x8a9a6a : jitter(0x5b6a44, 0.1, noise3(x, y, z, 41));
    return jitter(0x3a3a2c, 0.08, noise3(x, y, z, 43));
  });
  for (let x = -6; x <= 6; x += 3) model.set(x, 7, 0, 0x9aa87a).set(x, 7, 3, 0x9aa87a).set(x, 7, -3, 0x9aa87a);
  for (let x = -4; x <= 4; x++) model.set(x, 4, 6, x % 2 === 0 ? 0xd6d0b0 : 0x2a2418);
  model.set(-2, 6, 6, 0xffd24d, VOXEL_EMISSIVE).set(2, 6, 6, 0xffd24d, VOXEL_EMISSIVE);
  return model;
}

function buildSkimmerLeg(side: -1 | 1): VoxelModel {
  const model = new VoxelModel();
  for (let step = 0; step <= 4; step++) model.set(side * step, 4 - step, 0, step === 4 ? 0x2a2418 : jitter(0x4a4a34, 0.08, noise3(step, side, 0, 47)));
  return model;
}

class SumpBloatRig implements EntityRig {
  readonly root = new Group();
  readonly height = 1.3;
  private readonly sac: Group;

  constructor() {
    this.sac = createVoxelObject(cachedMesh('bloat-sac', buildBloatSac, [0, 14, 0]));
    this.sac.position.y = 14 * VOXEL;
    this.root.add(this.sac);
  }

  animate(pose: EntityPose): void {
    const spit = swingCurve(pose.attackProgress);
    const hurt = swingCurve(pose.hurtProgress);
    const breath = Math.sin(pose.time * 1.8);
    this.sac.position.y = 14 * VOXEL + 0.1 + Math.sin(pose.time * 1.2) * 0.05;
    this.sac.scale.set(1 + breath * 0.04 - spit * 0.1, 1 - breath * 0.03 + spit * 0.16, 1 + breath * 0.04 - spit * 0.1);
    this.sac.rotation.x = -spit * 0.3 + hurt * 0.25;
    this.sac.rotation.y = pose.time * 0.25;
  }
}

function buildBloatSac(): VoxelModel {
  const model = blob(new VoxelModel(), [7, 6.5, 7], 14, (x, y, z) => {
    const vein = noise3(x, y, z, 53) > 0.82;
    if (vein) return 0x9a3a4a;
    return jitter(y > 16 ? 0x6a7a4a : 0x4f5a34, 0.1, noise3(x, y, z, 59));
  }, 0.35);
  for (const [x, y, z] of [[0, 19, 6], [-4, 16, 5], [4, 13, 6], [-3, 11, 6], [5, 18, 3]] as const) {
    model.set(x, y, z, 0xc8ff7a, VOXEL_EMISSIVE);
  }
  model.fill(-1, 12, 7, 1, 13, 7, 0x1a1410);
  for (const [x, z] of [[-3, -2], [2, 3], [0, -4], [4, -1]] as const) {
    for (let y = 4; y <= 8; y++) model.set(x, y, z + Math.round(Math.sin(y + x) * 0.8), y % 2 === 0 ? 0x3a4424 : 0x5a6a3a);
  }
  return model;
}

class SumpMotherRig implements EntityRig {
  readonly root = new Group();
  readonly height = 2.1;
  private readonly body: Group;
  private readonly crown: Group;
  private readonly tendrils: { group: Group; phase: number }[] = [];

  constructor() {
    this.body = createVoxelObject(cachedMesh('mother-body', buildMotherBody));
    this.crown = createVoxelObject(cachedMesh('mother-crown', buildMotherCrown, [0, 20, 0]));
    this.crown.position.y = 20 * VOXEL;
    this.body.add(this.crown);
    this.root.add(this.body);
    for (const [index, angle] of [0, 1.2, 2.4, 3.6, 4.8].entries()) {
      const tendril = createVoxelObject(cachedMesh('mother-tendril', buildMotherTendril, [0, 0, 0]));
      tendril.position.set(Math.cos(angle) * 9 * VOXEL, 3 * VOXEL, Math.sin(angle) * 9 * VOXEL);
      tendril.rotation.y = -angle;
      this.body.add(tendril);
      this.tendrils.push({ group: tendril, phase: index * 1.3 });
    }
  }

  animate(pose: EntityPose): void {
    const slam = swingCurve(pose.attackProgress);
    const hurt = swingCurve(pose.hurtProgress);
    const heave = Math.sin(pose.time * 0.9);
    this.body.scale.set(1 + heave * 0.03, 1 - heave * 0.025 + slam * 0.08, 1 + heave * 0.03);
    this.body.position.set(Math.sin(pose.time * 24) * hurt * 0.05, 0, slam * 0.12);
    this.crown.rotation.x = -slam * 0.4;
    this.crown.rotation.y = Math.sin(pose.time * 0.4) * 0.2;
    for (const tendril of this.tendrils) tendril.group.rotation.z = Math.sin(pose.time * 1.4 + tendril.phase) * 0.35 + slam * 0.5;
  }
}

function buildMotherBody(): VoxelModel {
  const model = blob(new VoxelModel(), [11, 9, 10], 10, (x, y, z) => {
    if (noise3(x, y, z, 61) > 0.86) return 0xa83a52;
    const wet = y < 6 ? darken(0x3a4a2a, 0.2) : 0x4a5a32;
    return jitter(wet, 0.12, noise3(x, y, z, 67));
  }, 0.3);
  for (let i = 0; i < 9; i++) {
    const x = Math.round((noise3(i, 3, 7) - 0.5) * 16);
    const z = Math.round((noise3(i, 5, 7) - 0.5) * 14);
    model.set(x, 18 + (i % 2), z, 0xc8ff7a, VOXEL_EMISSIVE);
  }
  model.fill(-3, 8, 10, 3, 11, 10, (x, y) => (Math.abs(x) + Math.abs(y - 9.5) < 4 ? 0x14100c : null));
  return model;
}

function buildMotherCrown(): VoxelModel {
  const model = new VoxelModel();
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const x = Math.round(Math.cos(angle) * 5);
    const z = Math.round(Math.sin(angle) * 5);
    model.fill(x, 20, z, x, 23 + (i % 3), z, (_x, y) => (y >= 23 ? 0xd8ffa0 : 0x6a7a4a), undefined);
    model.set(x, 24 + (i % 3), z, 0xd8ffa0, VOXEL_EMISSIVE);
  }
  return model;
}

function buildMotherTendril(): VoxelModel {
  const model = new VoxelModel();
  for (let step = 0; step <= 7; step++) {
    const y = 4 - Math.round(step * 0.5);
    model.set(step, Math.max(0, y), 0, step === 7 ? 0xa83a52 : jitter(0x4a5a32, 0.1, noise3(step, 0, 0, 71)));
    if (step < 5) model.set(step, Math.max(0, y) + 1, 0, 0x5a6a3a);
  }
  return model;
}

export const WATERWORKS_CREATURE_FACTORIES: Readonly<Record<WaterworksCreatureModel, () => EntityRig>> = {
  siltSkimmer: () => new SiltSkimmerRig(),
  sumpBloat: () => new SumpBloatRig(),
  sumpMother: () => new SumpMotherRig(),
};
