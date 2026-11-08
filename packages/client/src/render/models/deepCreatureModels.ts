import type { CharacterAppearance, CreatureModel, ItemId } from '@containment/shared';
import { Group } from 'three';
import { darken, jitter, lighten, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE } from '../voxel/voxelKinds.ts';
import { createVoxelObject } from '../voxel/voxelMaterials.ts';
import type { VoxelMeshes } from '../voxel/voxelMesher.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import { CHARACTER_VOXEL_SIZE } from '../world/worldScale.ts';
import { CharacterRig } from './characterModel.ts';
import { swingCurve, type EntityPose, type EntityRig } from './entityRig.ts';

type DeepCreatureModel = Extract<
  CreatureModel,
  | 'frostMoth'
  | 'rimeHusk'
  | 'curator'
  | 'relaySentinel'
  | 'echoOperator'
  | 'choir'
  | 'inkEel'
  | 'redactor'
  | 'lastArchivist'
  | 'cinderWisp'
  | 'slagGolem'
  | 'stoker'
  | 'hollowOperative'
  | 'knockling'
  | 'theHost'
  | 'frankingClerk'
  | 'courierEcho'
  | 'postmaster'
>;

const VOXEL = CHARACTER_VOXEL_SIZE;
const meshCache = new Map<string, VoxelMeshes>();

function cachedMesh(key: string, build: () => VoxelModel, pivot: readonly [number, number, number] = [0, 0, 0]): VoxelMeshes {
  const cached = meshCache.get(key);
  if (cached) return cached;
  const meshes = build().mesh(VOXEL, pivot);
  meshCache.set(key, meshes);
  return meshes;
}

function ellipsoid(model: VoxelModel, center: readonly [number, number, number], radii: readonly [number, number, number], paint: (x: number, y: number, z: number) => number | null, emissive = false): VoxelModel {
  const [cx, cy, cz] = center;
  const [rx, ry, rz] = radii;
  for (let x = Math.floor(-rx); x <= Math.ceil(rx); x++) {
    for (let y = Math.floor(-ry); y <= Math.ceil(ry); y++) {
      for (let z = Math.floor(-rz); z <= Math.ceil(rz); z++) {
        if ((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2 > 1) continue;
        const color = paint(cx + x, cy + y, cz + z);
        if (color !== null) model.set(cx + x, cy + y, cz + z, color, emissive ? VOXEL_EMISSIVE : undefined);
      }
    }
  }
  return model;
}

interface HumanoidSpec {
  readonly appearance: CharacterAppearance;
  readonly gear: readonly ItemId[];
  readonly scale: number;
  readonly stride: number;
  readonly hover?: number;
  readonly tremor?: number;
  readonly lean?: number;
}

class HumanoidAnomalyRig implements EntityRig {
  readonly root = new Group();
  private readonly character: CharacterRig;
  private readonly spec: HumanoidSpec;

  constructor(spec: HumanoidSpec) {
    this.spec = spec;
    this.character = new CharacterRig(spec.appearance, spec.gear);
    this.character.root.rotation.x = spec.lean ?? 0;
    this.root.add(this.character.root);
    this.root.scale.setScalar(spec.scale);
  }

  get height(): number {
    return this.character.height * this.spec.scale;
  }

  animate(pose: EntityPose): void {
    this.character.animate({ ...pose, walkPhase: pose.walkPhase * this.spec.stride });
    const tremor = this.spec.tremor ?? 0;
    this.character.root.position.x = tremor ? Math.sin(pose.time * 17) * tremor : 0;
    this.character.root.position.y = this.spec.hover ? this.spec.hover + Math.sin(pose.time * 1.4) * this.spec.hover * 0.4 : 0;
  }
}

const humanoid = (spec: HumanoidSpec) => () => new HumanoidAnomalyRig(spec);

const PALE: Omit<CharacterAppearance, 'physique' | 'bodyType' | 'height' | 'hairStyle' | 'hairColor' | 'eyeColor'> = {
  skinTone: '#b7c7cf',
  faceMark: 'none',
  augment: 'none',
};

class FrostMothRig implements EntityRig {
  readonly root = new Group();
  readonly height = 1.2;
  private readonly body: Group;
  private readonly wings: { group: Group; side: number }[] = [];

  constructor() {
    this.body = createVoxelObject(cachedMesh('moth-body', buildMothBody));
    this.root.add(this.body);
    for (const side of [-1, 1]) {
      const wing = createVoxelObject(cachedMesh(`moth-wing-${side}`, () => buildMothWing(side)), { castShadow: false });
      wing.position.set(side * 1.5 * VOXEL, 14 * VOXEL, 0);
      this.body.add(wing);
      this.wings.push({ group: wing, side });
    }
  }

  animate(pose: EntityPose): void {
    const flap = Math.sin(pose.time * (pose.moving ? 16 : 9));
    for (const wing of this.wings) wing.group.rotation.z = wing.side * (0.25 + flap * 0.55);
    const lunge = swingCurve(pose.attackProgress);
    const hurt = swingCurve(pose.hurtProgress);
    this.body.position.set(Math.sin(pose.time * 40) * hurt * 0.03, 0.25 + Math.sin(pose.time * 2.1) * 0.08, lunge * 0.2);
    this.body.rotation.x = -lunge * 0.4 + 0.15;
  }
}

function buildMothBody(): VoxelModel {
  const model = new VoxelModel();
  ellipsoid(model, [0, 14, -2], [1.6, 1.6, 4.5], (x, y, z) => jitter(0xc8d8e8, 0.06, noise3(x, y, z, 3)));
  ellipsoid(model, [0, 15, 3], [1.8, 1.8, 1.8], (x, y, z) => jitter(0xe8f4ff, 0.04, noise3(x, y, z, 4)));
  model.set(-1, 16, 5, 0x7ae0ff, VOXEL_EMISSIVE).set(1, 16, 5, 0x7ae0ff, VOXEL_EMISSIVE);
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) model.set(side * (1 + Math.floor(i / 2)), 17 + i, 4 + Math.floor(i / 2), 0x8a9aba);
  return model;
}

function buildMothWing(side: number): VoxelModel {
  const model = new VoxelModel();
  for (let x = 0; x <= 11; x++) {
    for (let z = -6; z <= 5; z++) {
      const reach = 11 - Math.abs(z + 0.5) * 0.9;
      if (x > reach) continue;
      const vein = x % 4 === 0 || z === 0;
      const eye = Math.hypot(x - 6, z - 1) < 1.6;
      model.set(side * x, 0, z, eye ? 0x7ae0ff : vein ? 0x8a9aba : jitter(0xe8f0ff, 0.08, noise3(x, 0, z, 11)), eye ? VOXEL_EMISSIVE : undefined);
    }
  }
  return model;
}

class RelaySentinelRig implements EntityRig {
  readonly root = new Group();
  readonly height = 1.6;
  private readonly body: Group;
  private readonly dish: Group;
  private readonly legs: { group: Group; phase: number }[] = [];

  constructor() {
    this.body = createVoxelObject(cachedMesh('sentinel-body', buildSentinelBody));
    this.dish = createVoxelObject(cachedMesh('sentinel-dish', buildSentinelDish, [0, 26, 0]));
    this.dish.position.y = 26 * VOXEL;
    this.body.add(this.dish);
    this.root.add(this.body);
    [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].forEach((angle, index) => {
      const leg = createVoxelObject(cachedMesh('sentinel-leg', buildSentinelLeg, [0, 14, 0]));
      leg.position.set(Math.sin(angle) * 3 * VOXEL, 14 * VOXEL, Math.cos(angle) * 3 * VOXEL);
      leg.rotation.y = angle;
      this.body.add(leg);
      this.legs.push({ group: leg, phase: index * 2.1 });
    });
  }

  animate(pose: EntityPose): void {
    const stride = pose.moving ? pose.walkPhase * 2 : pose.time * 0.5;
    for (const leg of this.legs) leg.group.rotation.x = Math.sin(stride + leg.phase) * (pose.moving ? 0.35 : 0.04);
    const lunge = swingCurve(pose.attackProgress);
    const hurt = swingCurve(pose.hurtProgress);
    this.dish.rotation.y = pose.time * 0.8 + lunge * 2;
    this.dish.rotation.x = -0.3 - lunge * 0.4;
    this.body.position.set(Math.sin(pose.time * 35) * hurt * 0.03, Math.abs(Math.sin(stride)) * 0.02, lunge * 0.18);
  }
}

function buildSentinelBody(): VoxelModel {
  const model = new VoxelModel().fill(-3, 14, -3, 3, 22, 3, (x, y, z) => (y === 18 ? 0xffb87a : jitter(0x5a5048, 0.05, noise3(x, y, z, 7))));
  model.fill(-2, 18, 3, 2, 18, 4, 0xffb87a, VOXEL_EMISSIVE);
  model.fill(-1, 23, -1, 1, 26, 1, 0x2a2420);
  model.fill(-4, 20, -1, -4, 21, 1, 0x3a3430).fill(4, 20, -1, 4, 21, 1, 0x3a3430);
  return model;
}

function buildSentinelDish(): VoxelModel {
  const model = new VoxelModel();
  for (let x = -6; x <= 6; x++) {
    for (let z = -6; z <= 6; z++) {
      const r = Math.hypot(x, z);
      if (r > 6.3) continue;
      model.set(x, 26 + Math.round(r * r * 0.06), z, r < 1.2 ? 0xffb87a : jitter(0xc0c8d0, 0.05, noise3(x, 0, z, 9)), r < 1.2 ? VOXEL_EMISSIVE : undefined);
    }
  }
  model.fill(0, 27, 0, 0, 31, 0, 0x3a3430).set(0, 32, 0, 0xff5e3a, VOXEL_EMISSIVE);
  return model;
}

function buildSentinelLeg(): VoxelModel {
  return new VoxelModel().fill(0, 0, 0, 0, 14, 0, (x, y) => (y <= 1 ? 0x2a2420 : jitter(0x7a7068, 0.05, noise3(x, y, 0, 13)))).fill(0, 0, 0, 0, 0, 1, 0x2a2420);
}

class ChoirRig implements EntityRig {
  readonly root = new Group();
  readonly height = 2.1;
  private readonly ring = new Group();
  private readonly voices: Group[] = [];
  private readonly core: Group;

  constructor() {
    this.root.add(this.ring);
    this.core = createVoxelObject(cachedMesh('choir-core', buildChoirCore), { castShadow: false });
    this.ring.add(this.core);
    for (let index = 0; index < 6; index++) {
      const voice = createVoxelObject(cachedMesh(`choir-voice-${index % 3}`, () => buildChoirVoice(index % 3)), { castShadow: false });
      const angle = (index / 6) * Math.PI * 2;
      voice.position.set(Math.sin(angle) * 9 * VOXEL, 0, Math.cos(angle) * 9 * VOXEL);
      voice.rotation.y = angle;
      this.ring.add(voice);
      this.voices.push(voice);
    }
  }

  animate(pose: EntityPose): void {
    const lunge = swingCurve(pose.attackProgress);
    this.ring.rotation.y = pose.time * 0.5;
    this.ring.position.y = 0.1 + Math.sin(pose.time * 1.3) * 0.06;
    this.core.scale.setScalar(1 + lunge * 0.3);
    this.voices.forEach((voice, index) => {
      voice.position.y = Math.sin(pose.time * 2 + index) * 0.08;
      voice.visible = Math.sin(pose.time * (9 + index * 3) + index) > -0.5 || pose.hurtProgress !== null;
      voice.scale.setScalar(1 + lunge * 0.12);
    });
  }
}

function buildChoirCore(): VoxelModel {
  return ellipsoid(new VoxelModel(), [0, 22, 0], [4, 5, 4], (x, y, z) => (noise3(x, y, z, 41) > 0.45 ? 0x8afff0 : null), true);
}

function buildChoirVoice(variant: number): VoxelModel {
  const model = new VoxelModel();
  for (let y = 0; y <= 30; y++) {
    const half = y < 6 ? 1 : y < 24 ? 2 + (y % 5 === variant ? 1 : 0) : y < 26 ? 1 : 2;
    for (let x = -half; x <= half; x++) {
      for (let z = -1; z <= 1; z++) {
        if (noise3(x, y, z, 50 + variant) < 0.3) continue;
        const bright = noise3(x, y, z, 60 + variant) > 0.7;
        model.set(x, y, z, bright ? 0xc8fff8 : 0x1a4a4a, bright ? VOXEL_EMISSIVE : undefined);
      }
    }
  }
  model.set(-1, 28, 2, 0xffffff, VOXEL_EMISSIVE).set(1, 28, 2, 0xffffff, VOXEL_EMISSIVE).fill(-1, 26, 2, 1, 26, 2, 0x0a1a1a);
  return model;
}

class InkEelRig implements EntityRig {
  readonly root = new Group();
  readonly height = 0.6;
  private readonly segments: Group[] = [];

  constructor() {
    this.root.scale.setScalar(1.3);
    for (let index = 0; index < 8; index++) {
      const segment = createVoxelObject(cachedMesh(`eel-${index === 0 ? 'head' : index === 7 ? 'tail' : 'body'}`, () => buildEelSegment(index)));
      segment.position.z = (3 - index) * 3 * VOXEL;
      this.root.add(segment);
      this.segments.push(segment);
    }
  }

  animate(pose: EntityPose): void {
    const lunge = swingCurve(pose.attackProgress);
    const hurt = swingCurve(pose.hurtProgress);
    const wave = pose.moving ? pose.walkPhase * 1.8 : pose.time * 1.6;
    this.segments.forEach((segment, index) => {
      segment.position.x = Math.sin(wave - index * 0.8) * (pose.moving ? 0.08 : 0.04);
      segment.position.y = index === 0 ? lunge * 0.25 + hurt * 0.05 : Math.max(0, Math.sin(wave - index) * 0.02);
      segment.rotation.x = index === 0 ? -lunge * 0.7 : 0;
    });
  }
}

function buildEelSegment(index: number): VoxelModel {
  const model = new VoxelModel();
  const width = index === 0 ? 3 : index === 7 ? 1 : 2.4;
  for (let x = -3; x <= 3; x++) {
    for (let y = 0; y <= 3; y++) {
      for (let z = -1; z <= 1; z++) {
        if (Math.abs(x) > width || y > 2 + (index === 0 ? 1 : 0)) continue;
        const word = y === 2 && noise3(x, y, z + index * 3, 71) > 0.72;
        model.set(x, y, z, word ? 0xe8dcc0 : jitter(0x2a2438, 0.08, noise3(x, y, z + index, 73)));
      }
    }
  }
  if (index === 0) {
    model.set(-2, 3, 2, 0xb57cff, VOXEL_EMISSIVE).set(2, 3, 2, 0xb57cff, VOXEL_EMISSIVE);
    model.fill(-2, 0, 2, 2, 1, 3, 0x0a080f);
  }
  if (index === 7) model.fill(-3, 1, -2, 3, 1, -2, 0x3a3450);
  return model;
}

class CinderWispRig implements EntityRig {
  readonly root = new Group();
  readonly height = 1.3;
  private readonly flames: Group[];
  private readonly body = new Group();

  constructor() {
    this.root.add(this.body);
    this.flames = [0, 1, 2].map((layer) => {
      const flame = createVoxelObject(cachedMesh(`wisp-${layer}`, () => buildWispLayer(layer)), { castShadow: false });
      this.body.add(flame);
      return flame;
    });
  }

  animate(pose: EntityPose): void {
    const lunge = swingCurve(pose.attackProgress);
    this.body.position.y = 0.2 + Math.sin(pose.time * 2.6) * 0.1;
    this.body.position.z = lunge * 0.2;
    this.flames.forEach((flame, index) => {
      flame.rotation.y = pose.time * (0.8 + index * 0.5) * (index % 2 === 0 ? 1 : -1);
      flame.scale.set(1, 1 + Math.sin(pose.time * (7 + index * 3)) * 0.12 + lunge * 0.25, 1);
      flame.visible = index === 0 || Math.sin(pose.time * (13 + index * 5)) > -0.4;
    });
  }
}

function buildWispLayer(layer: number): VoxelModel {
  const model = new VoxelModel();
  const colors = [0xffcf4d, 0xff7a2a, 0xff3a1a];
  for (let y = 0; y <= 22; y++) {
    const radius = (layer === 0 ? 2.5 : 4 + layer) * Math.sin(Math.PI * Math.min(1, (y + 2) / 24)) * (1 - y / 30);
    for (let x = -6; x <= 6; x++) {
      for (let z = -6; z <= 6; z++) {
        const r = Math.hypot(x, z);
        if (r > radius || (layer > 0 && r < radius - 1.2)) continue;
        if (layer > 0 && noise3(x, y, z, 80 + layer) < 0.35) continue;
        model.set(x, y, z, colors[layer]!, VOXEL_EMISSIVE);
      }
    }
  }
  if (layer === 0) model.set(-1, 12, 3, 0xffffff, VOXEL_EMISSIVE).set(1, 12, 3, 0xffffff, VOXEL_EMISSIVE);
  return model;
}

class SlagGolemRig implements EntityRig {
  readonly root = new Group();
  readonly height = 2.0;
  private readonly torso: Group;
  private readonly arms: { group: Group; side: number }[] = [];
  private readonly legs: { group: Group; side: number }[] = [];

  constructor() {
    this.root.scale.setScalar(1.15);
    this.torso = createVoxelObject(cachedMesh('golem-torso', buildGolemTorso, [0, 14, 0]));
    this.torso.position.y = 14 * VOXEL;
    this.root.add(this.torso);
    for (const side of [-1, 1]) {
      const arm = createVoxelObject(cachedMesh(`golem-arm-${side}`, () => buildGolemArm(side), [side * 9, 28, 0]));
      arm.position.set(side * 9 * VOXEL, 14 * VOXEL, 0);
      this.torso.add(arm);
      this.arms.push({ group: arm, side });
      const leg = createVoxelObject(cachedMesh(`golem-leg-${side}`, () => buildGolemLeg(side), [side * 4, 14, 0]));
      leg.position.set(side * 4 * VOXEL, 14 * VOXEL, 0);
      this.root.add(leg);
      this.legs.push({ group: leg, side });
    }
  }

  animate(pose: EntityPose): void {
    const stride = pose.moving ? pose.walkPhase : pose.time * 0.3;
    const lunge = swingCurve(pose.attackProgress);
    const hurt = swingCurve(pose.hurtProgress);
    for (const leg of this.legs) leg.group.rotation.x = Math.sin(stride + (leg.side > 0 ? Math.PI : 0)) * (pose.moving ? 0.35 : 0.02);
    for (const arm of this.arms) arm.group.rotation.x = -lunge * 1.6 + Math.sin(stride + (arm.side > 0 ? 0 : Math.PI)) * (pose.moving ? 0.25 : 0.03);
    this.torso.rotation.x = lunge * 0.25 - hurt * 0.15;
    this.torso.rotation.y = Math.sin(stride) * (pose.moving ? 0.08 : 0.02);
  }
}

const slag = (x: number, y: number, z: number) => {
  const n = noise3(x, y, z, 91);
  if (n > 0.86) return 0xff7a2a;
  return jitter(n > 0.5 ? 0x4a3028 : 0x2a1a14, 0.1, n);
};

function buildGolemTorso(): VoxelModel {
  const model = ellipsoid(new VoxelModel(), [0, 24, 0], [8, 9, 6], slag);
  model.fill(-3, 22, 6, 3, 26, 7, (x, y) => (Math.abs(x) + Math.abs(y - 24) <= 3 ? 0xffb347 : null), VOXEL_EMISSIVE);
  ellipsoid(model, [0, 35, 1], [3.5, 3, 3], slag);
  model.set(-1, 35, 4, 0xffcf4d, VOXEL_EMISSIVE).set(1, 35, 4, 0xffcf4d, VOXEL_EMISSIVE);
  return model;
}

function buildGolemArm(side: number): VoxelModel {
  const model = new VoxelModel();
  ellipsoid(model, [side * 11, 26, 0], [3, 3, 3], slag);
  model.fill(side * 10, 12, -2, side * 13, 24, 2, slag);
  ellipsoid(model, [side * 11.5, 10, 0], [3.5, 3, 3.5], slag);
  return model;
}

function buildGolemLeg(side: number): VoxelModel {
  return new VoxelModel().fill(side * 2, 0, -3, side * 6, 14, 3, slag);
}

class KnocklingRig implements EntityRig {
  readonly root = new Group();
  readonly height = 1.1;
  private readonly door: Group;
  private readonly legs: { group: Group; phase: number }[] = [];

  constructor() {
    this.door = createVoxelObject(cachedMesh('knockling-door', buildKnocklingDoor, [0, 9, 0]));
    this.door.position.y = 9 * VOXEL;
    this.root.add(this.door);
    [[-3, -1, 0], [3, -1, Math.PI], [-3, 1, Math.PI], [3, 1, 0]].forEach(([x, z, phase]) => {
      const leg = createVoxelObject(cachedMesh('knockling-leg', buildKnocklingLeg, [0, 9, 0]));
      leg.position.set(x! * VOXEL, 9 * VOXEL, z! * VOXEL);
      this.root.add(leg);
      this.legs.push({ group: leg, phase: phase! });
    });
  }

  animate(pose: EntityPose): void {
    const stride = pose.moving ? pose.walkPhase * 2.4 : pose.time * 0.7;
    for (const leg of this.legs) leg.group.rotation.x = Math.sin(stride + leg.phase) * (pose.moving ? 0.6 : 0.05);
    const knock = Math.max(0, Math.sin(pose.time * 3)) ** 16;
    const lunge = swingCurve(pose.attackProgress);
    const hurt = swingCurve(pose.hurtProgress);
    this.door.rotation.x = -lunge * 0.5 + knock * 0.06 - hurt * 0.2;
    this.door.position.y = 9 * VOXEL + Math.abs(Math.sin(stride)) * 0.03;
  }
}

function buildKnocklingDoor(): VoxelModel {
  const model = new VoxelModel().fill(-4, 9, 0, 4, 24, 1, (x, y) => {
    if (Math.abs(x) === 4 || y === 24) return 0x2a1f36;
    if (y === 16 || x === 0) return 0x3c2b4f;
    return jitter(0x4a3560, 0.04, noise3(x, y, 0, 101));
  });
  model.set(2, 16, 2, 0xc9a227).set(2, 17, 2, 0xc9a227);
  for (let y = 9; y <= 25; y++) model.set(-5, y, 1, 0xb57cff, VOXEL_EMISSIVE).set(5, y, 1, 0xb57cff, VOXEL_EMISSIVE);
  model.fill(-5, 25, 1, 5, 25, 1, 0xb57cff, VOXEL_EMISSIVE);
  model.set(-1, 20, 2, 0x0a080f).set(1, 20, 2, 0x0a080f).set(0, 20, 2, 0xb57cff, VOXEL_EMISSIVE);
  return model;
}

function buildKnocklingLeg(): VoxelModel {
  const model = new VoxelModel();
  for (const [x, y] of [[0, 9], [0, 8], [1, 7], [1, 6], [1, 5], [0, 4], [0, 3], [0, 2], [0, 1], [0, 0]] as const) model.set(x, y, 0, darken(0x4a3560, 0.4));
  return model;
}

class HostRig implements EntityRig {
  readonly root = new Group();
  readonly height = 3.2;
  private readonly body: Group;
  private readonly halo = new Group();
  private readonly doors: Group[] = [];

  constructor() {
    this.root.scale.setScalar(1.4);
    this.body = createVoxelObject(cachedMesh('host-body', buildHostBody));
    this.root.add(this.body);
    this.halo.position.y = 30 * VOXEL;
    this.root.add(this.halo);
    for (let index = 0; index < 5; index++) {
      const door = createVoxelObject(cachedMesh('host-door', buildHostOrbitDoor), { castShadow: false });
      const angle = (index / 5) * Math.PI * 2;
      door.position.set(Math.sin(angle) * 13 * VOXEL, 0, Math.cos(angle) * 13 * VOXEL);
      door.rotation.y = angle;
      this.halo.add(door);
      this.doors.push(door);
    }
  }

  animate(pose: EntityPose): void {
    const lunge = swingCurve(pose.attackProgress);
    const hurt = swingCurve(pose.hurtProgress);
    this.halo.rotation.y = pose.time * 0.35 + lunge * 1.5;
    this.body.position.y = 0.05 + Math.sin(pose.time * 0.9) * 0.05;
    this.body.position.x = Math.sin(pose.time * 31) * hurt * 0.04;
    this.body.scale.set(1 + lunge * 0.06, 1 - lunge * 0.03, 1 + lunge * 0.06);
    this.doors.forEach((door, index) => {
      door.position.y = Math.sin(pose.time * 1.2 + index * 1.3) * 0.12;
      door.rotation.x = Math.max(0, Math.sin(pose.time * 1.1 + index)) ** 10 * 0.3;
    });
  }
}

function buildHostBody(): VoxelModel {
  const model = new VoxelModel();
  for (let y = 0; y <= 38; y++) {
    const half = y < 30 ? 3 + Math.round((30 - y) / 6) : 3;
    const depth = y < 30 ? 2 + Math.round((30 - y) / 10) : 2;
    for (let x = -half; x <= half; x++) {
      for (let z = -depth; z <= depth; z++) {
        if (y >= 31 && Math.hypot(x, (y - 34) * 0.9, z) > 3.6) continue;
        const panel = y < 30 && (y % 7 === 0 || Math.abs(x) === half);
        model.set(x, y, z, panel ? 0x2a1f36 : jitter(y >= 31 ? lighten(0xb7c7cf, 0.1) : 0x3c2b4f, 0.04, noise3(x, y, z, 111)));
      }
    }
  }
  model.set(-1, 34, 4, 0xb57cff, VOXEL_EMISSIVE).set(1, 34, 4, 0xb57cff, VOXEL_EMISSIVE);
  model.fill(-2, 12, 5, 2, 22, 5, (x, y) => (Math.abs(x) === 2 || y === 22 ? 0xb57cff : null), VOXEL_EMISSIVE);
  model.set(1, 17, 6, 0xc9a227);
  return model;
}

function buildHostOrbitDoor(): VoxelModel {
  const model = new VoxelModel().fill(-2, 0, 0, 2, 7, 0, (x, y) => (Math.abs(x) === 2 || y === 7 ? 0xb57cff : 0x2a1f36), VOXEL_EMISSIVE);
  model.set(1, 3, 1, 0xc9a227);
  return model;
}

export const DEEP_CREATURE_FACTORIES: Readonly<Record<DeepCreatureModel, () => EntityRig>> = {
  frostMoth: () => new FrostMothRig(),
  rimeHusk: humanoid({
    appearance: { ...PALE, physique: 'male', bodyType: 'slight', height: 1.02, hairStyle: 'crop', hairColor: '#e8e2d4', eyeColor: '#57e3ff', faceMark: 'scarCheek' },
    gear: ['intake-jumpsuit', 'rimeguard-greaves', 'rimeguard-boots', 'research-datapad'],
    scale: 1,
    stride: 0.6,
    tremor: 0.012,
    lean: 0.12,
  }),
  curator: humanoid({
    appearance: { ...PALE, physique: 'male', bodyType: 'broad', height: 1.08, hairStyle: 'swept', hairColor: '#e8e2d4', eyeColor: '#57e3ff', augment: 'ocularImplant' },
    gear: ['lab-coat', 'rimeguard-helm', 'rimeguard-gauntlets', 'rimeguard-greaves', 'rimeguard-boots', 'research-datapad'],
    scale: 1.18,
    stride: 0.7,
  }),
  relaySentinel: () => new RelaySentinelRig(),
  echoOperator: humanoid({
    appearance: { ...PALE, physique: 'female', bodyType: 'average', height: 1.0, hairStyle: 'bun', hairColor: '#4f6f9e', eyeColor: '#57e3ff', augment: 'neuralPort' },
    gear: ['relay-vest', 'relay-trousers', 'relay-boots', 'relay-helm', 'signal-scanner'],
    scale: 1,
    stride: 0.85,
    tremor: 0.02,
  }),
  choir: () => new ChoirRig(),
  inkEel: () => new InkEelRig(),
  redactor: humanoid({
    appearance: { ...PALE, skinTone: '#4a2b1c', physique: 'male', bodyType: 'average', height: 1.06, hairStyle: 'shaved', hairColor: '#151214', eyeColor: '#d43c3c', faceMark: 'barcodeTattoo' },
    gear: ['archivist-coat', 'ink-trousers', 'ink-boots', 'vellum-gloves', 'inkproof-helm'],
    scale: 1.05,
    stride: 0.8,
  }),
  lastArchivist: humanoid({
    appearance: { ...PALE, physique: 'female', bodyType: 'slight', height: 1.0, hairStyle: 'long', hairColor: '#e8e2d4', eyeColor: '#b25bd6', augment: 'circuitTrace' },
    gear: ['archivist-coat', 'ink-trousers', 'ink-boots', 'vellum-gloves', 'lexicon-datapad'],
    scale: 1.15,
    stride: 0.5,
    hover: 0.12,
  }),
  cinderWisp: () => new CinderWispRig(),
  slagGolem: () => new SlagGolemRig(),
  stoker: humanoid({
    appearance: { ...PALE, skinTone: '#6b3f28', physique: 'male', bodyType: 'broad', height: 1.1, hairStyle: 'shaved', hairColor: '#151214', eyeColor: '#c2a03c', faceMark: 'burnMark', augment: 'respirator' },
    gear: ['furnace-plate', 'furnace-greaves', 'furnace-boots', 'furnace-gauntlets', 'furnace-helm', 'stoker-maul'],
    scale: 1.25,
    stride: 0.65,
  }),
  hollowOperative: humanoid({
    appearance: { ...PALE, physique: 'female', bodyType: 'average', height: 1.0, hairStyle: 'crop', hairColor: '#e8e2d4', eyeColor: '#57e3ff' },
    gear: ['threshold-plate', 'threshold-trousers', 'threshold-boots', 'threshold-gloves', 'threshold-helm', 'the-knocker'],
    scale: 1,
    stride: 0.95,
    tremor: 0.008,
  }),
  knockling: () => new KnocklingRig(),
  theHost: () => new HostRig(),
  frankingClerk: humanoid({
    appearance: { ...PALE, skinTone: '#d8cdb4', physique: 'male', bodyType: 'slight', height: 1.02, hairStyle: 'swept', hairColor: '#151214', eyeColor: '#c9a227', faceMark: 'barcodeTattoo' },
    gear: ['archivist-coat', 'ink-trousers', 'ink-boots', 'vellum-gloves', 'research-datapad'],
    scale: 1,
    stride: 0.9,
    tremor: 0.01,
  }),
  courierEcho: humanoid({
    appearance: { ...PALE, physique: 'female', bodyType: 'average', height: 1.0, hairStyle: 'crop', hairColor: '#e8e2d4', eyeColor: '#ff8a4a' },
    gear: ['field-vest-mk1', 'intake-trousers', 'work-boots', 'threshold-helm', 'last-word'],
    scale: 1,
    stride: 1.05,
    hover: 0.06,
  }),
  postmaster: humanoid({
    appearance: { ...PALE, skinTone: '#e8dcc0', physique: 'male', bodyType: 'broad', height: 1.1, hairStyle: 'long', hairColor: '#e8e2d4', eyeColor: '#c9a227', augment: 'ocularImplant' },
    gear: ['lab-coat', 'threshold-trousers', 'threshold-boots', 'threshold-gloves', 'lexicon-datapad'],
    scale: 1.3,
    stride: 0.55,
    lean: 0.08,
  }),
};
