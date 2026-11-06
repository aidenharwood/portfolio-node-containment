import {
  GAME_CONTENT,
  type BodyType,
  type CharacterAppearance,
  type EquipmentSlot,
  type GearShape,
  type GearVisual,
  type ItemId,
  type Physique,
} from '@containment/shared';
import { Group } from 'three';
import { darken, hex, jitter, lighten, mix, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE } from '../voxel/voxelKinds.ts';
import { createVoxelObject } from '../voxel/voxelMaterials.ts';
import type { VoxelMeshes } from '../voxel/voxelMesher.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import { CHARACTER_VOXEL_SIZE } from '../world/worldScale.ts';
import { swingCurve, type EntityRig } from './entityRig.ts';

interface WornGear<S extends EquipmentSlot> extends GearVisual {
  readonly shape: GearShape<S>;
}

type GearVisuals = { readonly [S in EquipmentSlot]?: WornGear<S> };

interface Build {
  readonly shoulderHalf: number;
  readonly waistHalf: number;
  readonly hipHalf: number;
  readonly armWidth: number;
  readonly bust: boolean;
}

const BUILDS: Readonly<Record<Physique, Readonly<Record<BodyType, Build>>>> = {
  male: {
    slight: { shoulderHalf: 4, waistHalf: 3, hipHalf: 3, armWidth: 2, bust: false },
    average: { shoulderHalf: 5, waistHalf: 3, hipHalf: 3, armWidth: 2, bust: false },
    broad: { shoulderHalf: 6, waistHalf: 4, hipHalf: 4, armWidth: 3, bust: false },
  },
  female: {
    slight: { shoulderHalf: 3, waistHalf: 2, hipHalf: 3, armWidth: 1, bust: true },
    average: { shoulderHalf: 3, waistHalf: 2, hipHalf: 4, armWidth: 2, bust: true },
    broad: { shoulderHalf: 4, waistHalf: 3, hipHalf: 4, armWidth: 2, bust: true },
  },
};

const buildOf = (appearance: CharacterAppearance): Build => BUILDS[appearance.physique][appearance.bodyType];

const HIP_Y = 13;
const WAIST_Y = 16;
const CHEST_Y = 18;
const SHOULDER_Y = 22;
const NECK_Y = 23;
const UNDERSUIT = 0x36424c;
const BARE_FEET = 0x1a1d20;

const torsoHalf = (build: Build, y: number): number => {
  if (y < WAIST_Y) return build.hipHalf;
  if (y < CHEST_Y) return build.waistHalf;
  if (y < SHOULDER_Y) return build.shoulderHalf;
  return build.shoulderHalf - 1;
};

const torsoFront = (build: Build, y: number, x: number): number => {
  if (!build.bust || y < CHEST_Y || y > CHEST_Y + 2 || Math.abs(x) > build.shoulderHalf - 1) return 2;
  return y === CHEST_Y && x === 0 ? 2 : 3;
};

type PartName = 'legLeft' | 'legRight' | 'torso' | 'head' | 'armLeft' | 'armRight';

type RigGeometry = Readonly<Record<PartName, VoxelMeshes>>;

interface PartLayout {
  readonly pivot: readonly [number, number, number];
}

const geometryCache = new Map<string, RigGeometry>();

function wornGear(itemId: ItemId): { slot: EquipmentSlot; gear: WornGear<EquipmentSlot> } | null {
  const item = GAME_CONTENT.items.get(itemId);
  if (!item?.equipment) return null;
  return { slot: item.equipment.slot, gear: { ...item.equipment.visual, shape: item.icon as GearShape } };
}

function resolveGearVisuals(gear: readonly ItemId[]): GearVisuals {
  const visuals: Partial<Record<EquipmentSlot, WornGear<EquipmentSlot>>> = {};
  for (const itemId of gear) {
    const worn = wornGear(itemId);
    if (worn) visuals[worn.slot] = worn.gear;
  }
  return visuals as GearVisuals;
}

export interface CharacterPose {
  readonly moving: boolean;
  readonly walkPhase: number;
  readonly time: number;
  readonly attackProgress?: number | null;
  readonly hurtProgress?: number | null;
}

export class CharacterRig implements EntityRig {
  readonly root = new Group();
  private readonly rig = new Group();
  private readonly upper = new Group();
  private parts = new Map<PartName, Group>();
  private appearance: CharacterAppearance;
  private gearKey = '';

  constructor(appearance: CharacterAppearance, gear: readonly ItemId[]) {
    this.appearance = appearance;
    this.root.add(this.rig);
    this.rig.position.set(-CHARACTER_VOXEL_SIZE / 2, 0, -CHARACTER_VOXEL_SIZE / 2);
    this.rig.add(this.upper);
    this.setLook(appearance, gear);
  }

  setLook(appearance: CharacterAppearance, gear: readonly ItemId[]): void {
    const key = rigKey(appearance, gear);
    if (key === this.gearKey) return;
    this.gearKey = key;
    this.appearance = appearance;
    for (const part of this.parts.values()) part.removeFromParent();
    this.parts.clear();

    let geometry = geometryCache.get(key);
    if (!geometry) {
      geometry = buildRigGeometry(appearance, resolveGearVisuals(gear));
      geometryCache.set(key, geometry);
    }
    const layout = partLayouts(buildOf(appearance));
    for (const name of Object.keys(layout) as PartName[]) {
      const part = createVoxelObject(geometry[name]);
      const [px, py, pz] = layout[name].pivot;
      part.position.set(px * CHARACTER_VOXEL_SIZE, py * CHARACTER_VOXEL_SIZE, pz * CHARACTER_VOXEL_SIZE);
      (name.startsWith('leg') ? this.rig : this.upper).add(part);
      this.parts.set(name, part);
    }
    this.rig.scale.set(1, appearance.height, 1);
  }

  animate(pose: CharacterPose): void {
    const stride = pose.moving ? Math.sin(pose.walkPhase) : 0;
    const legLeft = this.parts.get('legLeft');
    const legRight = this.parts.get('legRight');
    const armLeft = this.parts.get('armLeft');
    const armRight = this.parts.get('armRight');
    const head = this.parts.get('head');
    if (legLeft) legLeft.rotation.x = stride * 0.6;
    if (legRight) legRight.rotation.x = -stride * 0.6;
    if (armLeft) {
      armLeft.rotation.x = -stride * 0.5;
      armLeft.rotation.z = -0.05 - Math.sin(pose.time * 1.3) * 0.02;
    }
    const swing = swingCurve(pose.attackProgress ?? null);
    const recoil = swingCurve(pose.hurtProgress ?? null);
    if (armRight) {
      armRight.rotation.x = stride * 0.5 - swing * 2.1;
      armRight.rotation.z = 0.05 + Math.sin(pose.time * 1.3) * 0.02;
    }
    if (head) head.rotation.y = pose.moving ? 0 : Math.sin(pose.time * 0.35) * 0.18;
    this.upper.rotation.x = swing * 0.18 - recoil * 0.22;
    this.upper.position.y = pose.moving ? Math.abs(stride) * 0.035 : Math.sin(pose.time * 1.8) * 0.006;
  }

  get height(): number {
    return 34 * CHARACTER_VOXEL_SIZE * this.appearance.height;
  }
}

function rigKey(appearance: CharacterAppearance, gear: readonly ItemId[]): string {
  return JSON.stringify([appearance, [...gear].sort()]);
}

function partLayouts(build: Build): Readonly<Record<PartName, PartLayout>> {
  const legCenter = (build.hipHalf + 1) / 2;
  const armCenter = build.shoulderHalf + 1 + (build.armWidth - 1) / 2;
  return {
    legLeft: { pivot: [-legCenter, HIP_Y, 0] },
    legRight: { pivot: [legCenter, HIP_Y, 0] },
    torso: { pivot: [0, 0, 0] },
    head: { pivot: [0, NECK_Y, 0] },
    armLeft: { pivot: [-armCenter, SHOULDER_Y, -0.5] },
    armRight: { pivot: [armCenter, SHOULDER_Y, -0.5] },
  };
}

function buildRigGeometry(appearance: CharacterAppearance, visuals: GearVisuals): RigGeometry {
  const build = buildOf(appearance);
  const layout = partLayouts(build);
  const meshPart = (name: PartName, model: VoxelModel) => model.mesh(CHARACTER_VOXEL_SIZE, layout[name].pivot);
  return {
    legLeft: meshPart('legLeft', buildLeg(build, visuals, -1)),
    legRight: meshPart('legRight', buildLeg(build, visuals, 1)),
    torso: meshPart('torso', buildTorso(build, visuals)),
    head: meshPart('head', buildHead(appearance, visuals)),
    armLeft: meshPart('armLeft', buildArm(appearance, build, visuals, -1)),
    armRight: meshPart('armRight', buildArm(appearance, build, visuals, 1)),
  };
}

const colorOf = (css: string | undefined, fallback: number): number => (css ? hex(css) : fallback);

const fabric = (color: number) => (x: number, y: number, z: number) => jitter(color, 0.025, noise3(x, y, z, 21));

function buildLeg(build: Build, visuals: GearVisuals, side: -1 | 1): VoxelModel {
  const legs = visuals.legs;
  const feet = visuals.feet;
  const legColor = colorOf(legs?.primary, UNDERSUIT);
  const bootColor = colorOf(feet?.primary, BARE_FEET);
  const soleColor = colorOf(feet?.secondary, 0x0d0f11);
  const inner = side < 0 ? -build.hipHalf : 1;
  const outer = side < 0 ? -1 : build.hipHalf;
  const taper = build.bust && build.hipHalf > 3 ? 1 : 0;
  const knee = 8;
  const model = new VoxelModel()
    .fill(inner, knee, -1, outer, HIP_Y - 1, 1, fabric(legColor))
    .fill(side < 0 ? inner + taper : inner, 4, -1, side < 0 ? outer : outer - taper, knee - 1, 1, fabric(legColor));
  const footInner = side < 0 ? inner + taper : inner;
  const footOuter = side < 0 ? outer : outer - taper;
  if (feet) {
    model.fill(footInner, 0, -1, footOuter, 4, 1, (_x, y) => (y === 0 ? soleColor : jitter(bootColor, 0.03, y / 4)));
    model.fill(footInner, 0, 2, footOuter, 1, 2, (_x, y) => (y === 0 ? soleColor : bootColor));
    model.fill(footInner, 4, -1, footOuter, 4, 1, lighten(bootColor, 0.12));
  } else {
    model.fill(footInner, 0, -1, footOuter, 3, 1, (_x, y) => (y === 0 ? darken(BARE_FEET, 0.3) : BARE_FEET));
    model.fill(footInner, 0, 2, footOuter, 0, 2, BARE_FEET);
  }
  if (legs) {
    model.fill(inner, 6, 2, outer, 7, 2, colorOf(legs.secondary, darken(legColor, 0.3)));
    model.paintExisting(inner, 5, -1, outer, 5, 1, darken(legColor, 0.2));
    model.fill(side < 0 ? inner - 1 : outer + 1, 8, -1, side < 0 ? inner - 1 : outer + 1, 10, 0, darken(legColor, 0.15));
  }
  return model;
}

const isArmoured = (visuals: GearVisuals): boolean => visuals.torso?.shape === 'vest' || visuals.torso?.shape === 'plate';

function torsoBaseColor(visuals: GearVisuals): number {
  const torso = visuals.torso;
  if (!torso) return UNDERSUIT;
  return isArmoured(visuals) ? colorOf(torso.secondary, UNDERSUIT) : colorOf(torso.primary, UNDERSUIT);
}

function fillBody(model: VoxelModel, build: Build, color: (x: number, y: number, z: number) => number): void {
  for (let y = HIP_Y; y <= SHOULDER_Y; y++) {
    const half = torsoHalf(build, y);
    for (let x = -half; x <= half; x++) {
      for (let z = -2; z <= torsoFront(build, y, x); z++) model.set(x, y, z, color(x, y, z));
    }
  }
}

function shellFront(model: VoxelModel, build: Build, y0: number, y1: number, inset: number, color: (x: number, y: number) => number, kind?: typeof VOXEL_EMISSIVE): void {
  for (let y = y0; y <= y1; y++) {
    const half = torsoHalf(build, y) - inset;
    for (let x = -half; x <= half; x++) model.set(x, y, torsoFront(build, y, x) + 1, color(x, y), kind);
  }
}

function shellBack(model: VoxelModel, build: Build, y0: number, y1: number, inset: number, color: (x: number, y: number) => number): void {
  for (let y = y0; y <= y1; y++) {
    const half = torsoHalf(build, y) - inset;
    for (let x = -half; x <= half; x++) model.set(x, y, -3, color(x, y));
  }
}

type TorsoRenderer = (model: VoxelModel, build: Build, gear: WornGear<'torso'>) => void;

const TORSO_GEAR: Readonly<Record<GearShape<'torso'>, TorsoRenderer>> = {
  jumpsuit: (model, build, gear) => {
    const base = colorOf(gear.primary, UNDERSUIT);
    const trim = colorOf(gear.secondary, darken(base, 0.3));
    for (let y = HIP_Y + 1; y < SHOULDER_Y; y++) model.set(0, y, torsoFront(build, y, 0), trim);
    model.paintExisting(-1, SHOULDER_Y, -2, 1, SHOULDER_Y, 3, darken(base, 0.35));
    const pocketX = build.shoulderHalf - 2;
    model.paintExisting(pocketX, 19, 2, pocketX + 1, 20, 3, trim);
    model.paintExisting(-2, 19, -2, 2, 20, -2, trim);
  },
  vest: (model, build, gear) => {
    const plate = colorOf(gear.primary, 0x2f4f5f);
    const strap = darken(colorOf(gear.secondary, plate), 0.25);
    shellFront(model, build, 15, 21, 1, (x, y) => (y === 21 ? lighten(plate, 0.2) : jitter(plate, 0.025, noise3(x, y, 3, 21))));
    shellBack(model, build, 15, 21, 1, (x, y) => jitter(darken(plate, 0.1), 0.025, noise3(x, y, -3, 21)));
    const sh = build.shoulderHalf;
    model.fill(-sh, 21, -2, -sh + 1, SHOULDER_Y, 2, lighten(plate, 0.12)).fill(sh - 1, 21, -2, sh, SHOULDER_Y, 2, lighten(plate, 0.12));
    const hip = build.hipHalf;
    for (const x of [-hip + 1, hip - 2]) model.fill(x, 14, 3, x + 1, 15, 4, strap);
    if (gear.emissive) for (let y = 17; y <= 20; y++) model.set(-2, y, torsoFront(build, y, -2) + 2, hex(gear.emissive), VOXEL_EMISSIVE);
  },
  plate: (model, build, gear) => {
    const plate = colorOf(gear.primary, 0x3a3f45);
    const seam = darken(plate, 0.35);
    const band = (y: number) => (y < CHEST_Y && y % 2 === 0 ? seam : null);
    shellFront(model, build, HIP_Y + 1, SHOULDER_Y, 0, (x, y) => band(y) ?? jitter(plate, 0.03, noise3(x, y, 4, 33)));
    shellBack(model, build, HIP_Y + 1, SHOULDER_Y, 0, (x, y) => band(y) ?? jitter(darken(plate, 0.08), 0.03, noise3(x, y, -4, 33)));
    for (let y = HIP_Y + 1; y <= SHOULDER_Y - 1; y++) {
      const half = torsoHalf(build, y) + 1;
      for (let z = -2; z <= 2; z++) model.set(-half, y, z, darken(plate, 0.12)).set(half, y, z, darken(plate, 0.12));
    }
    model.fill(-2, NECK_Y, -2, 2, NECK_Y, 2, (x, _y, z) => (Math.abs(x) === 2 || Math.abs(z) === 2 ? lighten(plate, 0.1) : null));
    if (gear.emissive) model.fill(-1, 19, torsoFront(build, 19, 0) + 2, 0, 20, torsoFront(build, 19, 0) + 2, hex(gear.emissive), VOXEL_EMISSIVE);
  },
  coat: (model, build, gear) => {
    const coat = colorOf(gear.primary, 0xe9eef0);
    const trim = colorOf(gear.secondary, 0x9fb3bd);
    const hem = build.hipHalf + 1;
    for (let y = 6; y < HIP_Y + 1; y++) {
      for (let x = -hem; x <= hem; x++) {
        for (let z = -3; z <= 3; z++) {
          const shell = x === -hem || x === hem || z === -3 || z === 3;
          const opening = z === 3 && x >= -1 && x <= 0;
          if (shell && !opening) model.set(x, y, z, jitter(coat, 0.02, noise3(x, y, z)));
        }
      }
    }
    for (let y = 18; y <= SHOULDER_Y; y++) {
      model.set(-1, y, torsoFront(build, y, -1), trim).set(1, y, torsoFront(build, y, 1), trim);
      model.set(0, y, torsoFront(build, y, 0), UNDERSUIT);
    }
    model.set(2, 16, torsoFront(build, 16, 2) + 1, trim).set(3, 16, torsoFront(build, 16, 3) + 1, trim);
  },
};

function buildTorso(build: Build, visuals: GearVisuals): VoxelModel {
  const torso = visuals.torso;
  const base = torsoBaseColor(visuals);
  const model = new VoxelModel();
  fillBody(model, build, (x, y, z) => fabric(y === SHOULDER_Y ? lighten(base, 0.06) : base)(x, y, z));
  if (build.bust && !isArmoured(visuals)) {
    for (let x = -(build.shoulderHalf - 1); x <= build.shoulderHalf - 1; x++) model.paintExisting(x, CHEST_Y, 3, x, CHEST_Y, 3, darken(base, 0.12));
  }
  if (torso?.shape !== 'coat') {
    model.paintExisting(-build.hipHalf, HIP_Y, -2, build.hipHalf, HIP_Y, 2, 0x121518);
    model.set(0, HIP_Y, 3, 0x8f8a74);
  }
  if (torso) TORSO_GEAR[torso.shape](model, build, torso);

  const badge = visuals.utility;
  if (badge) {
    const x = -2;
    const y = 20;
    model.set(x, y, torsoFront(build, y, x) + (isArmoured(visuals) ? 2 : 1), colorOf(badge.primary, 0xc9a227));
  }
  return model;
}

function buildArm(appearance: CharacterAppearance, build: Build, visuals: GearVisuals, side: -1 | 1): VoxelModel {
  const { shoulderHalf, armWidth } = build;
  const start = shoulderHalf + 1;
  const [x0, x1] = (side > 0 ? [start, start + armWidth - 1] : [-(start + armWidth - 1), -start]) as [number, number];
  const gloves = visuals.hands;
  const torso = visuals.torso;
  const handColor = colorOf(gloves?.primary, hex(appearance.skinTone));
  const sleeve = torso && !isArmoured(visuals) ? colorOf(torso.primary, UNDERSUIT) : torso ? colorOf(torso.secondary, UNDERSUIT) : UNDERSUIT;
  const model = new VoxelModel()
    .fill(x0, 14, -1, x1, SHOULDER_Y, 0, fabric(sleeve))
    .fill(x0, 12, -1, x1, 13, 0, (x, y, z) => jitter(handColor, 0.02, noise3(x, y, z)));
  if (gloves) model.fill(x0, 14, -1, x1, 15, 0, colorOf(gloves.secondary, darken(handColor, 0.3)));
  if (torso?.shape === 'coat') model.paintExisting(x0, 14, -1, x1, 14, 0, colorOf(torso.secondary, 0x9fb3bd));
  if (torso?.shape === 'plate') {
    const plate = colorOf(torso.primary, 0x3a3f45);
    const outer = side > 0 ? x1 + 1 : x0 - 1;
    model.fill(Math.min(x0, outer), 19, -2, Math.max(x1, outer), SHOULDER_Y + 1, 1, (x, y, z) => (y === 19 ? darken(plate, 0.3) : jitter(lighten(plate, 0.08), 0.03, noise3(x, y, z, 5))));
    model.fill(x0, 15, -2, x1, 16, 1, darken(plate, 0.05));
  }

  const handX = side > 0 ? x0 : x1;
  const held = side > 0 ? visuals.primary : visuals.secondary;
  if (held) HELD_GEAR[held.shape](model, held, handX);
  return model;
}

type HeldRenderer = (model: VoxelModel, gear: GearVisual, handX: number) => void;

const HELD_GEAR: Readonly<Record<GearShape<'primary' | 'secondary'>, HeldRenderer>> = {
  baton: (model, gear, handX) => {
    model.fill(handX, 12, 1, handX, 12, 7, hex(gear.primary));
    model.set(handX, 12, 1, hex(gear.secondary));
    if (gear.emissive) model.set(handX, 12, 8, hex(gear.emissive), VOXEL_EMISSIVE);
  },
  maul: (model, gear, handX) => {
    const head = hex(gear.primary);
    model.fill(handX, 12, 1, handX, 12, 7, hex(gear.secondary));
    model.fill(handX - 1, 10, 8, handX + 1, 14, 10, (x, y, z) => jitter(head, 0.04, noise3(x, y, z, 9)));
    model.fill(handX - 1, 11, 11, handX + 1, 13, 11, darken(head, 0.25));
    if (gear.emissive) model.fill(handX - 1, 12, 7, handX + 1, 12, 7, hex(gear.emissive), VOXEL_EMISSIVE);
  },
  pistol: (model, gear, handX) => {
    model.fill(handX, 13, 1, handX, 13, 5, hex(gear.primary));
    model.set(handX, 12, 1, hex(gear.secondary));
    if (gear.emissive) model.set(handX, 14, 4, hex(gear.emissive), VOXEL_EMISSIVE);
  },
  carbine: (model, gear, handX) => {
    const body = hex(gear.primary);
    model.fill(handX, 13, -2, handX, 13, 10, body);
    model.fill(handX, 12, -3, handX, 13, -1, hex(gear.secondary));
    model.fill(handX, 12, 2, handX, 12, 3, hex(gear.secondary));
    model.fill(handX, 13, 11, handX, 13, 12, darken(body, 0.5));
    model.fill(handX, 14, 3, handX, 14, 6, darken(body, 0.35));
    if (gear.emissive) model.set(handX, 15, 4, hex(gear.emissive), VOXEL_EMISSIVE);
  },
  datapad: (model, gear, handX) => {
    model.fill(handX - 1, 12, 1, handX + 1, 15, 1, hex(gear.secondary));
    model.fill(handX - 1, 13, 2, handX + 1, 15, 2, gear.emissive ? hex(gear.emissive) : 0x59e0c5, VOXEL_EMISSIVE);
  },
  scanner: (model, gear, handX) => {
    model.fill(handX, 12, 1, handX, 16, 2, hex(gear.primary));
    model.set(handX, 15, 3, hex(gear.secondary));
    if (gear.emissive) model.set(handX, 17, 2, hex(gear.emissive), VOXEL_EMISSIVE);
  },
};

type FaceRenderer = (model: VoxelModel, gear: GearVisual) => void;

const EYE_GEAR: Readonly<Record<GearShape<'eyes'>, FaceRenderer>> = {
  visor: (model, gear) => {
    const frame = hex(gear.primary);
    model.fill(-4, 26, 4, 4, 28, 4, (_x, y) => (y === 27 ? null : frame));
    model.fill(-4, 27, 4, 4, 27, 4, gear.emissive ? hex(gear.emissive) : darken(frame, 0.4), gear.emissive ? VOXEL_EMISSIVE : undefined);
    model.fill(-4, 27, -3, -4, 27, 3, hex(gear.secondary));
    model.fill(4, 27, -3, 4, 27, 3, hex(gear.secondary));
  },
  respirator: (model, gear) => {
    const mask = hex(gear.secondary);
    const filter = hex(gear.primary);
    model.fill(-3, 24, 4, 3, 26, 4, mask);
    model.fill(-2, 24, 5, 2, 25, 5, darken(mask, 0.2));
    for (const x of [-4, 4]) model.fill(x, 24, 2, x, 26, 4, filter).set(x, 25, 5, darken(filter, 0.3));
    model.fill(-4, 27, -3, -4, 27, 1, darken(mask, 0.3)).fill(4, 27, -3, 4, 27, 1, darken(mask, 0.3));
    if (gear.emissive) model.set(0, 26, 5, hex(gear.emissive), VOXEL_EMISSIVE);
  },
};

const HEAD_GEAR: Readonly<Record<GearShape<'head'>, FaceRenderer>> = {
  helmet: (model, gear) => {
    const shell = hex(gear.primary);
    for (let x = -4; x <= 4; x++) {
      for (let y = 24; y <= 33; y++) {
        for (let z = -4; z <= 4; z++) {
          const boundary = Math.abs(x) === 4 || Math.abs(z) === 4 || y === 33;
          if (!boundary) continue;
          const visorOpening = z === 4 && y >= 26 && y <= 28 && Math.abs(x) <= 3;
          if (visorOpening) model.set(x, y, z, y === 27 && gear.emissive ? hex(gear.emissive) : 0x0c1216, y === 27 && gear.emissive ? VOXEL_EMISSIVE : undefined);
          else model.set(x, y, z, y === 24 ? hex(gear.secondary) : jitter(shell, 0.04, noise3(x, y, z, 41)));
        }
      }
    }
    model.fill(-1, 34, -3, 0, 34, 2, lighten(shell, 0.15));
  },
};

function buildHead(appearance: CharacterAppearance, visuals: GearVisuals): VoxelModel {
  const skin = hex(appearance.skinTone);
  const hair = hex(appearance.hairColor);
  const female = appearance.physique === 'female';
  const model = new VoxelModel()
    .fill(-1, NECK_Y, -1, 1, NECK_Y, 1, darken(skin, 0.15))
    .fill(-3, 24, -3, 3, 31, 3, (x, y, z) => jitter(skin, 0.018, noise3(x, y, z, 7)));
  model.paintExisting(-3, 24, -3, 3, 24, 3, darken(skin, 0.08));
  if (female) {
    for (const x of [-3, 3]) for (let z = -3; z <= 3; z++) model.remove(x, 24, z);
    model.remove(-3, 25, 3).remove(3, 25, 3);
  }
  else model.paintExisting(-3, 24, -3, 3, 25, 3, (x, y, z) => (Math.abs(x) === 3 && y === 24 && z > 0 ? darken(skin, 0.14) : null));

  const eyeY = 27;
  for (const x of [-2, 2]) {
    model.set(x, eyeY, 3, hex(appearance.eyeColor));
    model.set(x, eyeY + 1, 3, darken(hair, 0.1));
    if (female) model.set(x + Math.sign(x), eyeY + 1, 3, darken(hair, 0.35)).set(x, eyeY - 1, 3, lighten(skin, 0.08));
    else model.set(x - Math.sign(x), eyeY + 1, 3, darken(hair, 0.1));
  }
  model.set(0, 26, 4, darken(skin, 0.1));
  model.fill(-1, 25, 3, 1, 25, 3, mix(skin, 0x8a3a3a, female ? 0.55 : 0.35));
  model.set(-4, 27, 0, darken(skin, 0.12)).set(4, 27, 0, darken(skin, 0.12)).set(-4, 26, 0, darken(skin, 0.18)).set(4, 26, 0, darken(skin, 0.18));

  const helmet = visuals.head;
  if (!helmet) addHair(model, appearance.hairStyle, hair, skin);
  addFaceMark(model, appearance.faceMark, skin);
  addAugment(model, appearance.augment);

  if (visuals.implant) model.set(0, NECK_Y, -2, colorOf(visuals.implant.emissive, 0xb57cff), VOXEL_EMISSIVE);
  if (visuals.eyes) EYE_GEAR[visuals.eyes.shape](model, visuals.eyes);
  if (helmet) HEAD_GEAR[helmet.shape](model, helmet);
  return model;
}

function addHair(model: VoxelModel, style: CharacterAppearance['hairStyle'], hair: number, skin: number): void {
  const strand = (x: number, y: number, z: number) => jitter(hair, 0.05, noise3(x, y, z, 31));
  const stubble = mix(skin, hair, 0.4);
  const cap = () => {
    model.paintExisting(-3, 30, -3, 3, 31, 3, (x, y, z) => (z === 3 && y === 30 ? null : strand(x, y, z)));
    model.paintExisting(-3, 26, -3, 3, 29, -3, strand);
  };
  const crown = () => model.fill(-3, 32, -3, 3, 32, 3, strand);
  const temples = () => {
    model.fill(-4, 28, -3, -4, 31, 1, strand);
    model.fill(4, 28, -3, 4, 31, 1, strand);
    model.fill(-3, 25, -4, 3, 31, -4, strand);
  };

  switch (style) {
    case 'shaved':
      model.paintExisting(-3, 31, -3, 3, 31, 3, stubble);
      break;
    case 'buzz':
      cap();
      break;
    case 'crop':
      cap();
      crown();
      temples();
      model.fill(-3, 31, 4, 3, 31, 4, (x) => (x % 2 === 0 ? strand(x, 31, 4) : null));
      break;
    case 'undercut':
      model.paintExisting(-3, 26, -3, 3, 30, 3, (x, _y, z) => (Math.abs(x) === 3 || z === -3 ? stubble : null));
      model.paintExisting(-3, 31, -3, 3, 31, 3, strand);
      model.fill(-3, 32, -3, 3, 33, 3, (x, y) => (y === 33 && x > 1 ? null : strand(x, y, 0)));
      model.fill(-3, 31, 4, 0, 32, 4, strand);
      break;
    case 'swept':
      cap();
      crown();
      temples();
      model.fill(-2, 33, -4, 2, 33, 2, strand);
      model.fill(-2, 29, -5, 2, 32, -5, strand);
      break;
    case 'long':
      cap();
      crown();
      temples();
      model.fill(-3, 17, -4, 3, 24, -4, strand);
      model.fill(-4, 20, -3, -4, 27, 1, strand);
      model.fill(4, 20, -3, 4, 27, 1, strand);
      break;
    case 'braids':
      cap();
      crown();
      temples();
      for (const x of [-4, 4]) model.fill(x, 14, -2, x, 27, -2, (_x, y) => (y % 2 === 0 ? hair : darken(hair, 0.3)));
      break;
    case 'bun':
      cap();
      crown();
      model.fill(-1, 31, -6, 1, 33, -4, strand);
      model.fill(-2, 32, -4, 2, 32, -4, darken(hair, 0.3));
      break;
    case 'mohawk':
      model.paintExisting(-3, 30, -3, 3, 31, 3, stubble);
      model.fill(-1, 32, -3, 0, 34, 3, strand);
      model.fill(-1, 35, -2, 0, 35, 2, strand);
      break;
  }
}

function addFaceMark(model: VoxelModel, mark: CharacterAppearance['faceMark'], skin: number): void {
  switch (mark) {
    case 'scarBrow':
      model.set(2, 29, 3, lighten(skin, 0.35)).set(2, 28, 3, lighten(skin, 0.3)).set(3, 26, 3, lighten(skin, 0.3));
      break;
    case 'scarCheek':
      model.set(-2, 26, 3, lighten(skin, 0.3)).set(-3, 25, 3, lighten(skin, 0.3)).set(-1, 26, 3, lighten(skin, 0.2));
      break;
    case 'freckles':
      for (const [x, y] of [[-3, 26], [-1, 26], [-2, 25], [1, 26], [3, 26], [2, 25]] as const) model.set(x, y, 3, darken(skin, 0.22));
      break;
    case 'barcodeTattoo':
      for (let z = -2; z <= 1; z += 2) model.paintExisting(-3, 25, z, -3, 27, z, 0x1a1a24);
      break;
    case 'burnMark':
      model.paintExisting(-3, 24, 1, -2, 27, 3, (x, y) => ((x + y) % 2 === 0 ? mix(skin, 0x7a2b1a, 0.45) : mix(skin, 0x7a2b1a, 0.25)));
      break;
    case 'none':
      break;
  }
}

function addAugment(model: VoxelModel, augment: CharacterAppearance['augment']): void {
  const metal = 0x8d969e;
  switch (augment) {
    case 'ocularImplant':
      model.set(2, 27, 3, 0xff4d4d, VOXEL_EMISSIVE).set(3, 27, 3, metal).set(2, 28, 3, metal).set(3, 28, 3, darken(metal, 0.2));
      break;
    case 'jawPlate':
      model.paintExisting(-3, 24, -1, 3, 25, 3, (x, y, z) => (z >= 1 || Math.abs(x) === 3 ? (y === 24 ? darken(metal, 0.2) : metal) : null));
      model.set(-1, 25, 3, 0x5b6369).set(1, 25, 3, 0x5b6369);
      break;
    case 'neuralPort':
      model.set(-4, 29, -1, metal).set(-4, 29, -2, 0x57e3ff, VOXEL_EMISSIVE).set(-4, 28, -2, metal);
      break;
    case 'circuitTrace':
      for (const [x, y] of [[-3, 28], [-3, 27], [-3, 26], [-2, 25], [-1, 24]] as const) model.set(x, y, 3, 0x57e3ff, VOXEL_EMISSIVE);
      break;
    case 'respirator':
      model.fill(-2, 24, 4, 2, 26, 4, 0x3a4046);
      model.set(-1, 25, 5, 0x20252a).set(1, 25, 5, 0x20252a);
      model.fill(3, 24, 2, 4, 25, 3, 0x4a5056);
      break;
    case 'none':
      break;
  }
}

