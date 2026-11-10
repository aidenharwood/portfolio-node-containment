import type { CharacterAppearance, CreatureModel } from '@containment/shared';
import { Group } from 'three';
import { jitter, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS } from '../voxel/voxelKinds.ts';
import { createVoxelObject } from '../voxel/voxelMaterials.ts';
import type { VoxelMeshes } from '../voxel/voxelMesher.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import { CHARACTER_VOXEL_SIZE } from '../world/worldScale.ts';
import { CharacterRig } from './characterModel.ts';
import { swingCurve, type EntityPose, type EntityRig } from './entityRig.ts';

type CalderCreatureModel = Extract<CreatureModel, 'brineCrawler' | 'saltWight' | 'cathedralAcolyte' | 'saltBishop'>;

const VOXEL = CHARACTER_VOXEL_SIZE;
const SALT = 0xe8e2d4;
const SALT_SHADOW = 0xb8ae9c;
const BRINE_SHELL = 0x8a5a4a;
const LAMP = 0xffd27f;
const ROSE = 0xffb3c8;
const meshCache = new Map<string, VoxelMeshes>();

function cachedMesh(key: string, build: () => VoxelModel, pivot: readonly [number, number, number] = [0, 0, 0]): VoxelMeshes {
  const cached = meshCache.get(key);
  if (cached) return cached;
  const meshes = build().mesh(VOXEL, pivot);
  meshCache.set(key, meshes);
  return meshes;
}

function dome(model: VoxelModel, radii: readonly [number, number, number], baseY: number, paint: (x: number, y: number, z: number) => number): VoxelModel {
  const [rx, ry, rz] = radii;
  for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
    for (let y = 0; y <= Math.ceil(ry); y++) {
      for (let z = -Math.ceil(rz); z <= Math.ceil(rz); z++) {
        if (Math.hypot(x / rx, y / ry, z / rz) > 1) continue;
        model.set(x, y + baseY, z, paint(x, y + baseY, z));
      }
    }
  }
  return model;
}

function crystal(model: VoxelModel, x: number, y: number, z: number, height: number, color: number): void {
  for (let step = 0; step < height; step++) model.set(x, y + step, z, step === height - 1 ? 0xfff8ee : color, VOXEL_GLASS);
}

class BrineCrawlerRig implements EntityRig {
  readonly root = new Group();
  readonly height = 0.75;
  private readonly body: Group;
  private readonly claws: Group[] = [];
  private readonly legs: { group: Group; phase: number; side: number }[] = [];

  constructor() {
    this.body = createVoxelObject(cachedMesh('crawler-body', buildCrawlerBody));
    this.root.add(this.body);
    for (const side of [-1, 1] as const) {
      const claw = createVoxelObject(cachedMesh(`crawler-claw-${side}`, () => buildCrawlerClaw(side), [0, 5, 0]));
      claw.position.set(side * 6 * VOXEL, 5 * VOXEL, 7 * VOXEL);
      this.body.add(claw);
      this.claws.push(claw);
      for (const [index, z] of [-4, -1, 2].entries()) {
        const leg = createVoxelObject(cachedMesh(`crawler-leg-${side}`, () => buildCrawlerLeg(side), [0, 5, 0]));
        leg.position.set(side * 8 * VOXEL, 5 * VOXEL, z * VOXEL);
        this.body.add(leg);
        this.legs.push({ group: leg, phase: index * 1.9 + (side > 0 ? Math.PI : 0), side });
      }
    }
  }

  animate(pose: EntityPose): void {
    const stride = pose.moving ? pose.walkPhase * 2.2 : pose.time * 0.6;
    for (const leg of this.legs) leg.group.rotation.z = leg.side * Math.sin(stride + leg.phase) * (pose.moving ? 0.4 : 0.05);
    const pinch = swingCurve(pose.attackProgress);
    for (const [index, claw] of this.claws.entries()) {
      claw.rotation.x = -pinch * 0.7 - Math.sin(pose.time * 1.3 + index) * 0.05;
      claw.rotation.y = (index === 0 ? 1 : -1) * pinch * 0.35;
    }
    const hurt = swingCurve(pose.hurtProgress);
    this.body.position.set(Math.sin(pose.time * 30) * hurt * 0.03, Math.abs(Math.sin(stride)) * (pose.moving ? 0.02 : 0.004), pinch * 0.08);
    this.body.rotation.y = Math.sin(stride * 0.5) * (pose.moving ? 0.08 : 0.02);
  }
}

function buildCrawlerBody(): VoxelModel {
  const model = dome(new VoxelModel(), [8, 4.5, 7], 4, (x, y, z) => {
    const n = noise3(x, y, z, 17);
    if (y >= 7 && n > 0.7) return SALT;
    return jitter(y >= 6 ? BRINE_SHELL : 0x5a3a30, 0.08, n);
  });
  for (const [x, z, height] of [[-4, -2, 4], [3, -3, 5], [0, 1, 6], [-2, 3, 3], [5, 2, 4], [-6, 0, 3]] as const) crystal(model, x, 8, z, height, SALT);
  model.set(-2, 7, 7, 0x1a1210).set(2, 7, 7, 0x1a1210);
  model.set(-2, 8, 7, LAMP, VOXEL_EMISSIVE).set(2, 8, 7, LAMP, VOXEL_EMISSIVE);
  return model;
}

function buildCrawlerClaw(side: number): VoxelModel {
  const model = new VoxelModel();
  model.fill(-1, 3, 0, 1, 6, 4, (x, y, z) => jitter(BRINE_SHELL, 0.08, noise3(x, y, z, 23)));
  model.fill(-2 * side, 3, 5, 2 * side, 7, 8, (x, y, z) => jitter(0x9a6a5a, 0.08, noise3(x, y, z, 29)));
  model.fill(-1, 7, 8, 1, 8, 10, SALT);
  model.fill(-1, 2, 8, 1, 3, 10, SALT_SHADOW);
  return model;
}

function buildCrawlerLeg(side: number): VoxelModel {
  const model = new VoxelModel();
  for (let step = 0; step <= 5; step++) model.set(side * step, 5 - Math.round(step * 0.9), 0, step === 5 ? SALT : jitter(BRINE_SHELL, 0.1, noise3(step, side, 0, 31)));
  return model;
}

const WIGHT_APPEARANCE: CharacterAppearance = {
  physique: 'male',
  bodyType: 'broad',
  height: 1.0,
  skinTone: '#e8e2d4',
  hairStyle: 'shaved',
  hairColor: '#e8e2d4',
  eyeColor: '#ffd27f',
  faceMark: 'scarCheek',
  augment: 'respirator',
};

const ACOLYTE_APPEARANCE: CharacterAppearance = {
  physique: 'female',
  bodyType: 'slight',
  height: 1.06,
  skinTone: '#f4efe6',
  hairStyle: 'long',
  hairColor: '#f4efe6',
  eyeColor: '#ffb3c8',
  faceMark: 'none',
  augment: 'none',
};

class HumanoidRig implements EntityRig {
  readonly root = new Group();
  private readonly character: CharacterRig;
  private readonly scale: number;
  private readonly gait: number;

  constructor(appearance: CharacterAppearance, gear: readonly string[], scale: number, gait: number) {
    this.character = new CharacterRig(appearance, gear);
    this.scale = scale;
    this.gait = gait;
    this.root.add(this.character.root);
    this.root.scale.setScalar(scale);
  }

  get height(): number {
    return this.character.height * this.scale;
  }

  animate(pose: EntityPose): void {
    this.character.animate({ ...pose, walkPhase: pose.walkPhase * this.gait });
  }
}

class SaltBishopRig implements EntityRig {
  readonly root = new Group();
  readonly height = 2.1;
  private readonly body: Group;
  private readonly crown: Group;
  private readonly crook: Group;

  constructor() {
    this.body = createVoxelObject(cachedMesh('bishop-body', buildBishopBody));
    this.crown = createVoxelObject(cachedMesh('bishop-crown', buildBishopCrown));
    this.crook = createVoxelObject(cachedMesh('bishop-crook', buildBishopCrook, [0, 0, 0]));
    this.crown.position.set(0, 30 * VOXEL, 0);
    this.crook.position.set(9 * VOXEL, 4 * VOXEL, 3 * VOXEL);
    this.body.add(this.crown, this.crook);
    this.root.add(this.body);
  }

  animate(pose: EntityPose): void {
    const raise = swingCurve(pose.attackProgress);
    const hurt = swingCurve(pose.hurtProgress);
    const sway = Math.sin(pose.time * 0.8);
    this.body.rotation.z = sway * 0.03;
    this.body.position.set(Math.sin(pose.time * 28) * hurt * 0.04, Math.sin(pose.time * 1.6) * 0.02, 0);
    this.crown.rotation.y = pose.time * 0.4;
    this.crown.scale.setScalar(1 + raise * 0.12);
    this.crook.rotation.x = -raise * 0.9;
  }
}

function buildBishopBody(): VoxelModel {
  const model = new VoxelModel();
  for (let y = 0; y <= 28; y++) {
    const radius = y < 4 ? 9 - y : y < 22 ? 6 - Math.floor((y - 4) / 9) : 5;
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        if (Math.hypot(x, z) > radius + 0.3) continue;
        const n = noise3(x, y, z, 53);
        const robe = Math.abs(x) <= 1 && z > 0 && y > 4 && y < 22 ? 0x6a2a3a : jitter(y < 4 ? SALT_SHADOW : 0xf4efe6, 0.06, n);
        model.set(x, y, z, robe);
      }
    }
  }
  for (const [x, z, height] of [[-8, -2, 6], [7, -4, 5], [-5, 6, 4], [6, 5, 7], [0, -8, 5], [-9, 4, 3]] as const) crystal(model, x, 0, z, height, SALT);
  model.fill(-2, 24, 5, 2, 25, 5, 0x1a1210);
  model.set(-1, 25, 6, ROSE, VOXEL_EMISSIVE).set(1, 25, 6, ROSE, VOXEL_EMISSIVE);
  for (let y = 8; y <= 18; y += 5) model.set(0, y, 6, ROSE, VOXEL_EMISSIVE);
  return model;
}

function buildBishopCrown(): VoxelModel {
  const model = new VoxelModel();
  for (let y = 0; y <= 8; y++) {
    const half = Math.max(0, 4 - Math.floor(y / 2));
    for (let x = -half; x <= half; x++) {
      for (const z of [-1, 0, 1]) model.set(x, y, z, y >= 7 ? 0xfff8ee : jitter(SALT, 0.05, noise3(x, y, z, 61)), y >= 6 ? VOXEL_GLASS : undefined);
    }
  }
  model.set(0, 4, 2, ROSE, VOXEL_EMISSIVE);
  return model;
}

function buildBishopCrook(): VoxelModel {
  const model = new VoxelModel();
  for (let y = 0; y <= 30; y++) model.set(0, y, 0, y % 6 === 0 ? SALT : 0xd8c8a8);
  for (const [x, y] of [[1, 31], [2, 32], [3, 32], [4, 31], [4, 30], [3, 29]] as const) model.set(x, y, 0, SALT, VOXEL_GLASS);
  model.set(3, 30, 0, ROSE, VOXEL_EMISSIVE);
  return model;
}

export const CALDER_CREATURE_FACTORIES: Readonly<Record<CalderCreatureModel, () => EntityRig>> = {
  brineCrawler: () => new BrineCrawlerRig(),
  saltWight: () => new HumanoidRig(WIGHT_APPEARANCE, ['saltworks-helm', 'saltworks-plate', 'saltworks-trousers', 'saltworks-boots', 'lampline-rifle'], 1.04, 0.6),
  cathedralAcolyte: () => new HumanoidRig(ACOLYTE_APPEARANCE, ['cathedral-helm', 'cathedral-plate', 'cathedral-trousers', 'cathedral-boots', 'censer-maul'], 1.02, 0.75),
  saltBishop: () => new SaltBishopRig(),
};
