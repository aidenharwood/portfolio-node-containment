import type { CharacterAppearance, CreatureModel } from '@containment/shared';
import { Group } from 'three';
import { darken, jitter, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE } from '../voxel/voxelKinds.ts';
import { createVoxelObject } from '../voxel/voxelMaterials.ts';
import type { VoxelMeshes } from '../voxel/voxelMesher.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import { CHARACTER_VOXEL_SIZE } from '../world/worldScale.ts';
import { CharacterRig } from './characterModel.ts';
import { DEEP_CREATURE_FACTORIES } from './deepCreatureModels.ts';
import { WATERWORKS_CREATURE_FACTORIES } from './waterworksCreatureModels.ts';
import { swingCurve, type EntityPose, type EntityRig } from './entityRig.ts';

const VOXEL = CHARACTER_VOXEL_SIZE;
const meshCache = new Map<string, VoxelMeshes>();

function cachedMesh(key: string, build: () => VoxelModel, pivot: readonly [number, number, number] = [0, 0, 0]): VoxelMeshes {
  const cached = meshCache.get(key);
  if (cached) return cached;
  const meshes = build().mesh(VOXEL, pivot);
  meshCache.set(key, meshes);
  return meshes;
}

class TrainingDroneRig implements EntityRig {
  readonly root = new Group();
  readonly height = 1.05;
  private readonly body: Group;

  constructor() {
    this.body = createVoxelObject(cachedMesh('drone', buildDrone, [0, 0, 0]));
    this.root.add(this.body);
  }

  animate(pose: EntityPose): void {
    const lunge = swingCurve(pose.attackProgress);
    const hurt = swingCurve(pose.hurtProgress);
    this.body.position.set(Math.sin(pose.time * 40) * hurt * 0.04, 0.45 + Math.sin(pose.time * 2.2) * 0.05, lunge * 0.3);
    this.body.rotation.y = Math.sin(pose.time * 0.8) * 0.15;
    this.body.rotation.x = lunge * 0.4 - hurt * 0.3;
  }
}

function buildDrone(): VoxelModel {
  const model = new VoxelModel();
  for (let x = -6; x <= 6; x++) {
    for (let y = -6; y <= 6; y++) {
      for (let z = -6; z <= 6; z++) {
        const distance = Math.hypot(x, y, z);
        if (distance > 6.2) continue;
        const band = Math.abs(y) <= 1;
        model.set(x, y + 8, z, band ? 0xd6dde2 : jitter(0xd9772b, 0.04, noise3(x, y, z)));
      }
    }
  }
  for (let x = -3; x <= 3; x++) {
    for (let y = -3; y <= 3; y++) {
      const ring = Math.hypot(x, y);
      if (ring <= 3.3) model.set(x, y + 8, 6, ring > 1.8 ? 0x4fd8ff : 0x0b1a22, ring > 1.8 ? VOXEL_EMISSIVE : undefined);
    }
  }
  model.fill(-1, 1, -1, 0, 1, 0, 0x7fe7ff, VOXEL_EMISSIVE);
  model.fill(-7, 7, -1, -7, 9, 1, 0x3a454d).fill(7, 7, -1, 7, 9, 1, 0x3a454d);
  return model;
}

class GloamMiteRig implements EntityRig {
  readonly root = new Group();
  readonly height = 0.45;
  private readonly body: Group;
  private readonly legs: { group: Group; phase: number; side: number }[] = [];

  constructor() {
    this.root.scale.setScalar(1.35);
    this.body = createVoxelObject(cachedMesh('mite-body', buildMiteBody));
    this.root.add(this.body);
    for (const side of [-1, 1]) {
      [-3, 0, 3].forEach((z, index) => {
        const leg = createVoxelObject(cachedMesh(`mite-leg-${side}`, () => buildMiteLeg(side), [0, 0, 0]));
        leg.position.set(side * 2.5 * VOXEL, 3 * VOXEL, z * VOXEL);
        this.body.add(leg);
        this.legs.push({ group: leg, phase: index * 2.1 + (side > 0 ? Math.PI : 0), side });
      });
    }
  }

  animate(pose: EntityPose): void {
    const scuttle = pose.moving ? pose.walkPhase * 2.2 : pose.time * 3;
    const amplitude = pose.moving ? 0.5 : 0.08;
    for (const leg of this.legs) leg.group.rotation.y = Math.sin(scuttle + leg.phase) * amplitude * leg.side;
    const lunge = swingCurve(pose.attackProgress);
    const hurt = swingCurve(pose.hurtProgress);
    this.body.position.z = lunge * 0.15;
    this.body.position.y = Math.abs(Math.sin(scuttle)) * (pose.moving ? 0.015 : 0.004);
    this.body.rotation.x = -lunge * 0.25 + hurt * 0.2;
  }
}

function buildMiteBody(): VoxelModel {
  const model = new VoxelModel();
  const shell = 0x2a1840;
  for (let z = -6; z <= -1; z++) {
    for (let x = -3; x <= 3; x++) {
      for (let y = 2; y <= 5; y++) {
        if (Math.hypot(x / 3.4, (y - 3) / 2.6, (z + 3.5) / 3.2) > 1) continue;
        const spot = y >= 4 && noise3(x, y, z, 5) > 0.72;
        model.set(x, y, z, spot ? (noise3(x, y, z, 9) > 0.5 ? 0x7a3cff : 0x3fe0c0) : jitter(shell, 0.05, noise3(x, y, z)), spot ? VOXEL_EMISSIVE : undefined);
      }
    }
  }
  model.fill(-2, 2, 0, 2, 4, 3, (x, y, z) => jitter(darken(shell, 0.1), 0.05, noise3(x, y, z, 2)));
  model.fill(-1, 2, 4, 1, 4, 6, (x, y, z) => jitter(darken(shell, 0.2), 0.04, noise3(x, y, z, 3)));
  model.set(-1, 4, 7, 0x3fe0c0, VOXEL_EMISSIVE).set(1, 4, 7, 0x3fe0c0, VOXEL_EMISSIVE);
  model.set(-1, 2, 7, 0xd8cbb0).set(1, 2, 7, 0xd8cbb0).set(-1, 2, 8, 0xd8cbb0).set(1, 2, 8, 0xd8cbb0);
  return model;
}

function buildMiteLeg(side: number): VoxelModel {
  const model = new VoxelModel();
  const color = 0x1c1029;
  for (const [x, y] of [[1, 0], [2, 1], [3, 1], [4, 0], [5, -1], [5, -2], [6, -3]] as const) model.set(side * x, y, 0, color);
  return model;
}

const WARDEN_APPEARANCE: CharacterAppearance = {
  physique: 'male',
  bodyType: 'broad',
  height: 1.08,
  skinTone: '#b7c7cf',
  hairStyle: 'shaved',
  hairColor: '#151214',
  eyeColor: '#ff4d4d',
  faceMark: 'burnMark',
  augment: 'ocularImplant',
};

class HollowWardenRig implements EntityRig {
  readonly root = new Group();
  private readonly character = new CharacterRig(WARDEN_APPEARANCE, ['response-helmet', 'field-vest-mk1', 'intake-trousers', 'work-boots', 'stun-baton']);

  constructor() {
    this.root.add(this.character.root);
    this.character.root.rotation.x = 0.08;
  }

  get height(): number {
    return this.character.height;
  }

  animate(pose: EntityPose): void {
    this.character.animate({ ...pose, moving: pose.moving, walkPhase: pose.walkPhase * 0.8 });
    this.character.root.position.x = Math.sin(pose.time * 13) * 0.01;
  }
}

class StaticWraithRig implements EntityRig {
  readonly root = new Group();
  readonly height = 1.75;
  private readonly layers: Group[];
  private readonly body = new Group();

  constructor() {
    this.root.add(this.body);
    this.layers = [0, 1, 2].map((layer) => {
      const group = createVoxelObject(cachedMesh(`wraith-${layer}`, () => buildWraithLayer(layer)), { castShadow: false });
      this.body.add(group);
      return group;
    });
  }

  animate(pose: EntityPose): void {
    const lunge = swingCurve(pose.attackProgress);
    this.body.position.y = 0.15 + Math.sin(pose.time * 1.7) * 0.06;
    this.body.position.z = lunge * 0.2;
    this.layers.forEach((layer, index) => {
      layer.visible = index === 0 || Math.sin(pose.time * (11 + index * 7) + index) > -0.3 || pose.hurtProgress !== null;
      layer.position.x = (Math.random() - 0.5) * 0.02 * (index + 1);
    });
  }
}

function buildWraithLayer(layer: number): VoxelModel {
  const model = new VoxelModel();
  const include = (x: number, y: number, z: number) => Math.floor(noise3(x, y, z, 17) * 3) === layer;
  const paint = (x: number, y: number, z: number) => {
    const bright = noise3(x, y, z, 23) > 0.55;
    return { color: bright ? 0xc8f6ff : 0x4fd8ff, bright };
  };
  const place = (x: number, y: number, z: number) => {
    if (!include(x, y, z)) return;
    const { color, bright } = paint(x, y, z);
    model.set(x, y, z, bright ? color : 0x17323d, bright ? VOXEL_EMISSIVE : undefined);
  };
  for (let y = 0; y <= 33; y++) {
    const halfWidth = y < 8 ? Math.max(1, Math.floor(y / 3)) : y < 26 ? 4 : y < 28 ? 1 : 3;
    const halfDepth = y < 8 ? 1 : y < 26 ? 2 : 3;
    for (let x = -halfWidth; x <= halfWidth; x++) for (let z = -halfDepth; z <= halfDepth; z++) place(x, y, z);
  }
  for (const side of [-1, 1]) for (let y = 9; y <= 24; y++) place(side * (5 + (y < 14 ? 1 : 0)), y, 0);
  if (layer === 0) model.set(-1, 31, 3, 0xffffff, VOXEL_EMISSIVE).set(1, 31, 3, 0xffffff, VOXEL_EMISSIVE);
  return model;
}

class PipeLeechRig implements EntityRig {
  readonly root = new Group();
  readonly height = 0.55;
  private readonly segments: Group[] = [];

  constructor() {
    this.root.scale.setScalar(1.25);
    for (let index = 0; index < 6; index++) {
      const segment = createVoxelObject(cachedMesh(`leech-${Math.min(index, 2)}-${index === 0 ? 'head' : 'body'}`, () => buildLeechSegment(index)));
      segment.position.z = (2 - index) * 3 * VOXEL;
      this.root.add(segment);
      this.segments.push(segment);
    }
  }

  animate(pose: EntityPose): void {
    const lunge = swingCurve(pose.attackProgress);
    const hurt = swingCurve(pose.hurtProgress);
    const wave = pose.moving ? pose.walkPhase * 1.6 : pose.time * 1.4;
    this.segments.forEach((segment, index) => {
      segment.position.x = Math.sin(wave - index * 0.9) * (pose.moving ? 0.05 : 0.02);
      segment.position.y = index === 0 ? lunge * 0.18 + hurt * 0.04 : 0;
      segment.rotation.x = index === 0 ? -lunge * 0.6 : 0;
    });
  }
}

function buildLeechSegment(index: number): VoxelModel {
  const model = new VoxelModel();
  const radius = index === 0 ? 2.6 : Math.max(1.4, 3 - index * 0.3);
  for (let x = -3; x <= 3; x++) {
    for (let y = 0; y <= 5; y++) {
      for (let z = -1; z <= 1; z++) {
        if (Math.hypot(x, y - radius, z * 1.2) > radius) continue;
        const ring = z === -1;
        model.set(x, y, z, ring ? 0x5a1a22 : jitter(0x8a2a36, 0.06, noise3(x, y, z + index)));
      }
    }
  }
  if (index === 0) {
    for (let x = -2; x <= 2; x++) for (let y = 1; y <= 4; y++) if (Math.hypot(x, y - 2.5) <= 1.6) model.set(x, y, 2, 0x1a0508);
    model.set(0, 2, 2, 0xff5e3a, VOXEL_EMISSIVE).set(-1, 3, 2, 0xff5e3a, VOXEL_EMISSIVE).set(1, 3, 2, 0xff5e3a, VOXEL_EMISSIVE);
  } else if (index % 2 === 0) {
    model.set(0, Math.round(radius * 2), 0, 0xffb347, VOXEL_EMISSIVE);
  }
  return model;
}

class RustHoundRig implements EntityRig {
  readonly root = new Group();
  readonly height = 0.9;
  private readonly body: Group;
  private readonly head: Group;
  private readonly legs: { group: Group; phase: number }[] = [];

  constructor() {
    this.root.scale.setScalar(1.1);
    this.body = createVoxelObject(cachedMesh('hound-body', buildHoundBody));
    this.head = createVoxelObject(cachedMesh('hound-head', buildHoundHead, [0, 12, 6]));
    this.head.position.set(0, 12 * VOXEL, 6 * VOXEL);
    this.body.add(this.head);
    this.root.add(this.body);
    [[-3, 4, 0], [3, 4, Math.PI], [-3, -5, Math.PI], [3, -5, 0]].forEach(([x, z, phase]) => {
      const leg = createVoxelObject(cachedMesh('hound-leg', buildHoundLeg, [0, 9, 0]));
      leg.position.set(x! * VOXEL, 9 * VOXEL, z! * VOXEL);
      this.body.add(leg);
      this.legs.push({ group: leg, phase: phase! });
    });
  }

  animate(pose: EntityPose): void {
    const stride = pose.moving ? pose.walkPhase * 1.4 : 0;
    for (const leg of this.legs) leg.group.rotation.x = pose.moving ? Math.sin(stride + leg.phase) * 0.6 : 0;
    const lunge = swingCurve(pose.attackProgress);
    const hurt = swingCurve(pose.hurtProgress);
    this.body.position.y = pose.moving ? Math.abs(Math.sin(stride)) * 0.03 : Math.sin(pose.time * 2) * 0.008;
    this.body.position.z = lunge * 0.18;
    this.head.rotation.x = -lunge * 0.5 + hurt * 0.3 + (pose.moving ? 0 : Math.sin(pose.time * 0.7) * 0.1);
    this.head.rotation.y = pose.moving ? 0 : Math.sin(pose.time * 0.5) * 0.3;
  }
}

function buildHoundBody(): VoxelModel {
  const model = new VoxelModel();
  for (let z = -7; z <= 6; z++) {
    for (let x = -3; x <= 3; x++) {
      for (let y = 9; y <= 14; y++) {
        if (Math.hypot(x / 3.4, (y - 11.5) / 2.8) > 1) continue;
        const rib = z % 3 === 0 && y >= 12;
        model.set(x, y, z, rib ? 0x2a1f18 : jitter(0x7a4a2a, 0.08, noise3(x, y, z, 3)));
      }
    }
  }
  model.fill(0, 13, -9, 0, 14, -8, 0x5a3a26);
  model.fill(0, 15, -2, 0, 15, 3, 0x9a5a2a);
  return model;
}

function buildHoundHead(): VoxelModel {
  const model = new VoxelModel().fill(-2, 11, 6, 2, 15, 10, (x, y, z) => jitter(0x6a4024, 0.06, noise3(x, y, z, 4)));
  model.fill(-1, 11, 11, 1, 13, 13, 0x4a2f1c);
  model.fill(-1, 10, 11, 1, 10, 13, 0xd8cbb0);
  model.set(-2, 14, 10, 0xff4d4d, VOXEL_EMISSIVE).set(2, 14, 10, 0xff4d4d, VOXEL_EMISSIVE);
  model.set(-2, 16, 7, 0x5a3a26).set(2, 16, 7, 0x5a3a26);
  return model;
}

function buildHoundLeg(): VoxelModel {
  return new VoxelModel().fill(0, 1, 0, 1, 9, 1, (x, y, z) => (y <= 2 ? 0x2a1f18 : jitter(0x5a3a26, 0.06, noise3(x, y, z, 6))));
}

const FOREMAN_APPEARANCE: CharacterAppearance = {
  physique: 'male',
  bodyType: 'broad',
  height: 1.1,
  skinTone: '#b7c7cf',
  hairStyle: 'shaved',
  hairColor: '#151214',
  eyeColor: '#ffb347',
  faceMark: 'burnMark',
  augment: 'respirator',
};

class ForemanRig implements EntityRig {
  readonly root = new Group();
  private readonly character = new CharacterRig(FOREMAN_APPEARANCE, ['response-helmet', 'composite-plate', 'intake-trousers', 'work-boots', 'shock-maul', 'containment-gloves']);

  constructor() {
    this.root.add(this.character.root);
    this.root.scale.setScalar(1.12);
  }

  get height(): number {
    return this.character.height * 1.12;
  }

  animate(pose: EntityPose): void {
    this.character.animate({ ...pose, walkPhase: pose.walkPhase * 0.7 });
  }
}

class ThornCrawlerRig implements EntityRig {
  readonly root = new Group();
  readonly height = 0.7;
  private readonly body: Group;
  private readonly legs: { group: Group; phase: number }[] = [];

  constructor() {
    this.body = createVoxelObject(cachedMesh('crawler-body', buildCrawlerBody));
    this.root.add(this.body);
    [[-4, 3, 0], [4, 3, Math.PI], [-4, -1, Math.PI], [4, -1, 0], [-4, -5, 0], [4, -5, Math.PI]].forEach(([x, z, phase]) => {
      const leg = createVoxelObject(cachedMesh(`crawler-leg-${x! < 0 ? 'l' : 'r'}`, () => buildCrawlerLeg(x! < 0 ? -1 : 1), [0, 5, 0]));
      leg.position.set(x! * VOXEL, 5 * VOXEL, z! * VOXEL);
      this.body.add(leg);
      this.legs.push({ group: leg, phase: phase! });
    });
  }

  animate(pose: EntityPose): void {
    const stride = pose.moving ? pose.walkPhase * 2 : pose.time * 0.6;
    for (const leg of this.legs) leg.group.rotation.x = Math.sin(stride + leg.phase) * (pose.moving ? 0.55 : 0.08);
    const lunge = swingCurve(pose.attackProgress);
    const hurt = swingCurve(pose.hurtProgress);
    this.body.position.set(Math.sin(pose.time * 30) * hurt * 0.03, Math.abs(Math.sin(stride)) * (pose.moving ? 0.02 : 0.005), lunge * 0.16);
    this.body.rotation.x = -lunge * 0.35;
  }
}

function buildCrawlerBody(): VoxelModel {
  const model = new VoxelModel();
  for (let x = -4; x <= 4; x++) {
    for (let y = 4; y <= 10; y++) {
      for (let z = -6; z <= 5; z++) {
        if (Math.hypot(x / 4.3, (y - 7) / 3.2, z / 6.2) > 1) continue;
        model.set(x, y, z, jitter(0x3f6a2a, 0.12, noise3(x, y, z, 17)));
      }
    }
  }
  for (let i = 0; i < 14; i++) {
    const x = Math.round((noise3(i, 1, 4) - 0.5) * 8);
    const z = Math.round((noise3(i, 2, 4) - 0.5) * 10);
    model.fill(x, 10, z, x, 12 + (i % 3), z, i % 2 === 0 ? 0xb8c87a : 0x8aa05a);
  }
  model.set(-2, 8, 6, 0xff7a2a, VOXEL_EMISSIVE).set(2, 8, 6, 0xff7a2a, VOXEL_EMISSIVE);
  model.fill(-1, 6, 6, 1, 6, 7, 0x2a1f18);
  return model;
}

function buildCrawlerLeg(side: -1 | 1): VoxelModel {
  return new VoxelModel().fill(0, 0, 0, side, 5, 0, (x, y) => (y <= 1 ? 0x2a3a1a : jitter(0x4f6a2a, 0.08, noise3(x, y, 0, 23))));
}

class SporeDrifterRig implements EntityRig {
  readonly root = new Group();
  readonly height = 1.5;
  private readonly cap: Group;
  private readonly tendrils: Group;

  constructor() {
    this.cap = createVoxelObject(cachedMesh('drifter-cap', buildDrifterCap));
    this.tendrils = createVoxelObject(cachedMesh('drifter-tendrils', buildDrifterTendrils, [0, 20, 0]));
    this.tendrils.position.y = 20 * VOXEL;
    this.cap.add(this.tendrils);
    this.root.add(this.cap);
  }

  animate(pose: EntityPose): void {
    const puff = swingCurve(pose.attackProgress);
    const hurt = swingCurve(pose.hurtProgress);
    this.cap.position.y = 0.12 + Math.sin(pose.time * 1.6) * 0.06;
    this.cap.rotation.y = pose.time * 0.4;
    this.cap.scale.setScalar(1 + puff * 0.18 - hurt * 0.1);
    this.tendrils.rotation.x = Math.sin(pose.time * 1.3) * 0.12;
    this.tendrils.rotation.z = Math.cos(pose.time * 1.1) * 0.12;
  }
}

function buildDrifterCap(): VoxelModel {
  const model = new VoxelModel();
  for (let x = -7; x <= 7; x++) {
    for (let y = 20; y <= 32; y++) {
      for (let z = -7; z <= 7; z++) {
        const r = Math.hypot(x, (y - 25) * 1.1, z);
        if (r > 7.2 || r < 5.8) continue;
        const spot = noise3(x, y, z, 29) > 0.8;
        model.set(x, y, z, spot ? 0xc8f6ff : jitter(0x6a8aa8, 0.08, noise3(x, y, z, 31)), spot ? VOXEL_EMISSIVE : undefined);
      }
    }
  }
  model.fill(-5, 20, -5, 5, 20, 5, (x, _y, z) => (Math.hypot(x, z) <= 5 ? 0x8ad8ff : null), VOXEL_EMISSIVE);
  return model;
}

function buildDrifterTendrils(): VoxelModel {
  const model = new VoxelModel();
  for (const [x, z] of [[-3, -3], [3, -2], [0, 3], [-2, 1], [2, 2]] as const) {
    for (let y = 8; y <= 19; y++) model.set(x + Math.round(Math.sin(y * 0.5 + x) * 0.8), y, z, y % 4 === 0 ? 0xc8f6ff : 0x4a6a8a, y % 4 === 0 ? VOXEL_EMISSIVE : undefined);
  }
  return model;
}

const FACTORIES: Readonly<Record<CreatureModel, () => EntityRig>> = {
  ...DEEP_CREATURE_FACTORIES,
  ...WATERWORKS_CREATURE_FACTORIES,
  thornCrawler: () => new ThornCrawlerRig(),
  sporeDrifter: () => new SporeDrifterRig(),
  pipeLeech: () => new PipeLeechRig(),
  rustHound: () => new RustHoundRig(),
  foreman: () => new ForemanRig(),
  trainingDrone: () => new TrainingDroneRig(),
  gloamMite: () => new GloamMiteRig(),
  hollowWarden: () => new HollowWardenRig(),
  staticWraith: () => new StaticWraithRig(),
};

export const createCreatureRig = (model: CreatureModel): EntityRig => FACTORIES[model]();
