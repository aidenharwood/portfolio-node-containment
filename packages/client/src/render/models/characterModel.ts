import {
  GAME_CONTENT,
  type AttackMotion,
  type BodyType,
  type CharacterAppearance,
  type EquipmentSlot,
  type GearMotif,
  type GearShape,
  type GearVisual,
  type ItemId,
  type Physique,
  type WeaponKind,
  wornVisualOf,
} from '@containment/shared';
import { Euler, Group, Quaternion } from 'three';
import { darken, hex, jitter, lighten, mix, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE } from '../voxel/voxelKinds.ts';
import { createVoxelObject } from '../voxel/voxelMaterials.ts';
import type { VoxelMeshes } from '../voxel/voxelMesher.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import { CHARACTER_VOXEL_SIZE } from '../world/worldScale.ts';
import { swingCurve, type EntityRig } from './entityRig.ts';
import { attackPose, combinePoses, gripFor, heldWeaponOf, motionFor } from './weaponPoses.ts';

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

interface RigGeometry {
  readonly parts: Readonly<Record<PartName, VoxelMeshes>>;
  readonly weapon: VoxelMeshes | null;
  readonly grip: readonly [number, number, number];
}

interface PartLayout {
  readonly pivot: readonly [number, number, number];
}

const geometryCache = new Map<string, RigGeometry>();

function wornGear(itemId: ItemId): { slot: EquipmentSlot; gear: WornGear<EquipmentSlot> } | null {
  const item = GAME_CONTENT.items.get(itemId);
  const worn = item ? wornVisualOf(item) : null;
  if (!item || !worn) return null;
  return { slot: worn.slot, gear: { ...worn.visual, shape: item.icon as GearShape } };
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
  readonly attackMotion?: AttackMotion | null;
  readonly hurtProgress?: number | null;
}

export class CharacterRig implements EntityRig {
  readonly root = new Group();
  private readonly rig = new Group();
  private readonly upper = new Group();
  private parts = new Map<PartName, Group>();
  private appearance: CharacterAppearance;
  private gearKey = '';
  private heldWeapon: WeaponKind | null = null;
  private weapon: Group | null = null;
  private readonly euler = new Euler();
  private readonly inHand = new Quaternion();
  private readonly levelled = new Quaternion();
  private readonly parent = new Quaternion();

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
    this.heldWeapon = heldWeaponOf(gear);
    for (const part of this.parts.values()) part.removeFromParent();
    this.parts.clear();
    this.weapon?.removeFromParent();
    this.weapon = null;

    let geometry = geometryCache.get(key);
    if (!geometry) {
      geometry = buildRigGeometry(appearance, resolveGearVisuals(gear));
      geometryCache.set(key, geometry);
    }
    const layout = partLayouts(buildOf(appearance));
    for (const name of Object.keys(layout) as PartName[]) {
      const part = createVoxelObject(geometry.parts[name]);
      const [px, py, pz] = layout[name].pivot;
      part.position.set(px * CHARACTER_VOXEL_SIZE, py * CHARACTER_VOXEL_SIZE, pz * CHARACTER_VOXEL_SIZE);
      (name.startsWith('leg') ? this.rig : this.upper).add(part);
      this.parts.set(name, part);
    }
    const armRight = this.parts.get('armRight');
    if (geometry.weapon && armRight) {
      const weapon = createVoxelObject(geometry.weapon);
      const [ax, ay, az] = layout.armRight.pivot;
      const [gx, gy, gz] = geometry.grip;
      weapon.position.set((gx - ax) * CHARACTER_VOXEL_SIZE, (gy - ay) * CHARACTER_VOXEL_SIZE, (gz - az) * CHARACTER_VOXEL_SIZE);
      armRight.add(weapon);
      this.weapon = weapon;
    }
    this.rig.scale.set(1, appearance.height, 1);
  }

  animate(pose: CharacterPose): void {
    const stride = pose.moving ? Math.sin(pose.walkPhase) : 0;
    const breathe = Math.sin(pose.time * 1.3) * 0.02;
    const grip = gripFor(this.heldWeapon);
    const twoHanded = grip.leftX < -0.5;
    const action = pose.attackProgress == null ? grip : combinePoses(grip, attackPose(pose.attackMotion ?? motionFor(this.heldWeapon), pose.attackProgress));
    const recoil = swingCurve(pose.hurtProgress ?? null);
    const legLeft = this.parts.get('legLeft');
    const legRight = this.parts.get('legRight');
    const armLeft = this.parts.get('armLeft');
    const armRight = this.parts.get('armRight');
    const head = this.parts.get('head');
    if (legLeft) legLeft.rotation.x = stride * 0.6;
    if (legRight) legRight.rotation.x = -stride * 0.6;
    if (armLeft) {
      armLeft.rotation.x = -stride * (twoHanded ? 0.08 : 0.45) + action.leftX;
      armLeft.rotation.z = -0.05 - breathe + action.leftZ;
    }
    if (armRight) {
      armRight.rotation.x = stride * (twoHanded ? 0.08 : this.heldWeapon ? 0.25 : 0.5) + action.rightX;
      armRight.rotation.z = 0.05 + breathe + action.rightZ;
    }
    if (head) head.rotation.y = pose.moving ? 0 : Math.sin(pose.time * 0.35) * 0.18;
    this.upper.rotation.x = action.lean - recoil * 0.22;
    this.upper.rotation.y = action.twist;
    this.upper.position.z = action.lunge;
    this.upper.position.y = pose.moving ? Math.abs(stride) * 0.035 : Math.sin(pose.time * 1.8) * 0.006;
    if (this.weapon && armRight) this.orientWeapon(this.weapon, armRight, action.weaponX, action.aim, action.level);
  }

  private orientWeapon(weapon: Group, arm: Group, weaponX: number, aim: number, level: number): void {
    this.inHand.setFromEuler(this.euler.set(weaponX, 0, 0));
    if (level > 0) {
      this.parent.copy(this.upper.quaternion).multiply(arm.quaternion).invert();
      this.levelled.setFromEuler(this.euler.set(aim, 0, 0)).premultiply(this.parent);
      this.inHand.slerp(this.levelled, level);
    }
    weapon.quaternion.copy(this.inHand);
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
  const handX = build.shoulderHalf + 1;
  const grip = [handX, 12.5, -0.5] as const;
  const primary = visuals.primary;
  return {
    grip,
    weapon: primary ? buildHeld(primary, handX).mesh(CHARACTER_VOXEL_SIZE, grip) : null,
    parts: {
    legLeft: meshPart('legLeft', buildLeg(build, visuals, -1)),
    legRight: meshPart('legRight', buildLeg(build, visuals, 1)),
    torso: meshPart('torso', buildTorso(build, visuals)),
    head: meshPart('head', buildHead(appearance, visuals)),
    armLeft: meshPart('armLeft', buildArm(appearance, build, visuals, -1)),
    armRight: meshPart('armRight', buildArm(appearance, build, visuals, 1)),
    },
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
  const outside = side < 0 ? inner - 1 : outer + 1;
  if (legs) {
    const trim = colorOf(legs.secondary, darken(legColor, 0.3));
    model.paintExisting(inner, 5, -1, outer, 5, 1, darken(legColor, 0.2));
    if (legs.motif === 'skirmisher') {
      model.fill(outside, 8, -1, outside, 11, 1, trim).set(outside, 10, 2, darken(trim, 0.2));
      model.fill(inner, 11, -1, outer, 11, 1, darken(trim, 0.15));
    } else if (legs.motif === 'warden') {
      model.fill(inner, 6, 2, outer, 7, 2, trim);
      model.paintExisting(inner, 4, -1, outer, 4, 1, trim);
    } else {
      model.fill(inner, 6, 2, outer, 7, 2, trim);
      model.fill(outside, 8, -1, outside, 10, 0, darken(legColor, 0.15));
    }
  }
  if (feet?.motif === 'skirmisher') model.paintExisting(footInner, 2, -1, footOuter, 2, 2, colorOf(feet.secondary, darken(bootColor, 0.3)));
  if (feet?.motif === 'warden') model.paintExisting(footInner, 3, -1, footOuter, 4, 1, (_x, y) => (y === 4 ? colorOf(feet.secondary, bootColor) : null));
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

const TORSO_MOTIF: Readonly<Record<GearMotif, TorsoRenderer>> = {
  bulwark: (model, build, gear) => {
    const plate = colorOf(gear.primary, 0x3a3f45);
    const sh = build.shoulderHalf;
    model.fill(-1, 17, torsoFront(build, 17, 0) + 2, 1, 21, torsoFront(build, 17, 0) + 2, (_x, y) => (y % 2 === 0 ? lighten(plate, 0.18) : darken(plate, 0.1)));
    model.fill(-sh, SHOULDER_Y, -2, sh, SHOULDER_Y, -2, darken(plate, 0.2));
  },
  skirmisher: (model, build, gear) => {
    const strap = darken(colorOf(gear.secondary, 0x2a2420), 0.1);
    const pouch = colorOf(gear.primary, 0x4a5a3a);
    const sh = build.shoulderHalf;
    for (let y = HIP_Y + 2; y <= SHOULDER_Y; y++) {
      const half = torsoHalf(build, y) - 1;
      const x = Math.max(-half, Math.min(half, -Math.round(-sh + 1 + ((y - HIP_Y - 2) / (SHOULDER_Y - HIP_Y - 2)) * (2 * sh - 2))));
      model.set(x, y, torsoFront(build, y, x) + 2, strap).set(x, y, -3, strap);
    }
    for (const [x, y] of [[-2, 16], [0, 18], [2, 20]] as const) model.fill(x, y, torsoFront(build, y, x) + 2, x + 1, y, torsoFront(build, y, x) + 2, darken(pouch, 0.15));
    if (gear.emissive) model.set(-sh + 1, 21, torsoFront(build, 21, -sh + 1) + 2, hex(gear.emissive), VOXEL_EMISSIVE);
  },
  warden: (model, build, gear) => {
    const cloth = colorOf(gear.primary, 0xc8b88a);
    const trim = colorOf(gear.secondary, darken(cloth, 0.4));
    const mantle = build.shoulderHalf + 1;
    for (let x = -mantle; x <= mantle; x++) {
      for (let z = -3; z <= 3; z++) {
        if (Math.abs(x) === mantle || Math.abs(z) === 3) model.set(x, SHOULDER_Y - 1, z, x % 2 === 0 ? trim : lighten(cloth, 0.08));
        model.set(x, SHOULDER_Y, z, jitter(cloth, 0.02, noise3(x, SHOULDER_Y, z, 61)));
      }
    }
    const front = torsoFront(build, 16, 0) + 1;
    model.fill(-1, 7, Math.max(front, 3), 1, HIP_Y, Math.max(front, 3), (x, y) => (y === 7 || Math.abs(x) === 1 ? trim : cloth));
    if (gear.emissive) {
      for (let y = 15; y <= 21; y++) if (y % 2 === 1) model.set(0, y, torsoFront(build, y, 0) + 1, hex(gear.emissive), VOXEL_EMISSIVE);
    }
  },
};

type BackRenderer = (model: VoxelModel, build: Build, gear: WornGear<'back'>) => void;

const BACK_GEAR: Readonly<Record<GearShape<'back'>, BackRenderer>> = {
  pack: (model, build, gear) => {
    const body = colorOf(gear.primary, 0x4a5056);
    const strap = darken(colorOf(gear.secondary, body), 0.15);
    const slim = gear.motif === 'skirmisher';
    const half = slim ? 2 : 3;
    const depth = slim ? -5 : -6;
    const top = slim ? 20 : 21;
    model.fill(-half, 14, depth, half, top, -4, (x, y, z) => (y === 14 || (z === depth && y === top) ? darken(body, 0.25) : jitter(body, 0.03, noise3(x, y, z, 81))));
    model.fill(-half + 1, 15, depth - 1, half - 1, 17, depth - 1, darken(body, 0.12));
    for (const x of [-2, 2]) {
      model.fill(x, 18, -3, x, SHOULDER_Y, -3, strap);
      for (let y = 17; y <= SHOULDER_Y; y++) model.set(x, y, torsoFront(build, y, x) + 1, strap);
    }
    if (slim) model.fill(-3, top + 1, -5, 3, top + 2, -4, (x) => (Math.abs(x) === 3 ? strap : colorOf(gear.secondary, darken(body, 0.2))));
    else model.fill(-half - 1, 15, -5, -half - 1, 19, -4, darken(body, 0.08)).fill(half + 1, 15, -5, half + 1, 19, -4, darken(body, 0.08));
    if (gear.motif === 'bulwark') model.fill(-half, top + 1, -5, half, top + 1, -4, lighten(body, 0.15));
    if (gear.emissive) model.set(slim ? 1 : 2, slim ? 18 : 20, depth - 1, hex(gear.emissive), VOXEL_EMISSIVE);
  },
  cape: (model, build, gear) => {
    const cloth = colorOf(gear.primary, 0x3a2a4a);
    const hem = colorOf(gear.secondary, darken(cloth, 0.35));
    for (let y = 5; y <= SHOULDER_Y; y++) {
      const half = Math.min(build.shoulderHalf, 2 + Math.floor((SHOULDER_Y - y) / 4)) + (y < 10 ? 1 : 0);
      const z = y < HIP_Y ? -5 : -4;
      for (let x = -half; x <= half; x++) model.set(x, y, z, y <= 6 ? hem : jitter(x % 2 === 0 ? cloth : darken(cloth, 0.06), 0.02, noise3(x, y, z, 87)));
    }
    model.fill(-build.shoulderHalf, SHOULDER_Y, -4, build.shoulderHalf, SHOULDER_Y, -3, darken(cloth, 0.1));
    for (const x of [-build.shoulderHalf + 1, build.shoulderHalf - 1]) {
      model.set(x, SHOULDER_Y - 1, torsoFront(build, SHOULDER_Y - 1, x) + 1, gear.emissive ? hex(gear.emissive) : hem, gear.emissive ? VOXEL_EMISSIVE : undefined);
    }
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
  if (torso?.motif) TORSO_MOTIF[torso.motif](model, build, torso);
  if (visuals.back) BACK_GEAR[visuals.back.shape](model, build, visuals.back);

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
  if (gloves?.motif === 'skirmisher') model.fill(x0, 12, -1, x1, 12, 0, (x, y, z) => jitter(hex(appearance.skinTone), 0.02, noise3(x, y, z)));
  if (gloves?.motif === 'bulwark') model.fill(x0, 13, -1, x1, 13, 0, lighten(handColor, 0.18));
  if (gloves?.motif === 'warden' && gloves.emissive) model.set(side > 0 ? x1 : x0, 13, 0, hex(gloves.emissive), VOXEL_EMISSIVE);
  if (torso?.shape === 'coat') model.paintExisting(x0, 14, -1, x1, 14, 0, colorOf(torso.secondary, 0x9fb3bd));
  if (torso?.shape === 'plate') {
    const plate = colorOf(torso.primary, 0x3a3f45);
    const outer = side > 0 ? x1 + 1 : x0 - 1;
    model.fill(Math.min(x0, outer), 19, -2, Math.max(x1, outer), SHOULDER_Y + 1, 1, (x, y, z) => (y === 19 ? darken(plate, 0.3) : jitter(lighten(plate, 0.08), 0.03, noise3(x, y, z, 5))));
    model.fill(x0, 15, -2, x1, 16, 1, darken(plate, 0.05));
  }

  if (side < 0 && visuals.secondary) HELD_GEAR[visuals.secondary.shape](model, visuals.secondary, x1);
  return model;
}

const WEAPON_SPAN: Readonly<Record<GearShape<'primary'>, readonly [grip: number, tip: number, y: number]>> = {
  knife: [1, 6, 12],
  baton: [1, 8, 12],
  blade: [1, 11, 12],
  maul: [1, 11, 12],
  polearm: [-7, 18, 12],
  pistol: [1, 5, 13],
  carbine: [-3, 12, 13],
  rifle: [-6, 17, 13],
  scattergun: [-5, 8, 13],
};

const RANGED_SHAPES: readonly GearShape<'primary'>[] = ['pistol', 'carbine', 'rifle', 'scattergun'];

function addWeaponMotif(model: VoxelModel, gear: WornGear<'primary'>, handX: number): void {
  const [grip, tip, y] = WEAPON_SPAN[gear.shape];
  const body = hex(gear.primary);
  const trim = hex(gear.secondary);
  const ranged = RANGED_SHAPES.includes(gear.shape);
  if (gear.motif === 'skirmisher' && ranged) {
    const mid = Math.round((grip + tip) / 2);
    model.fill(handX, y + 2, mid - 1, handX, y + 2, mid + 1, darken(trim, 0.2));
    model.set(handX, y + 2, mid + 2, gear.emissive ? hex(gear.emissive) : lighten(body, 0.3), gear.emissive ? VOXEL_EMISSIVE : undefined);
    model.fill(handX, y, tip + 1, handX, y, tip + 2, darken(body, 0.55));
  } else if (gear.motif === 'skirmisher') {
    for (let z = Math.max(grip, 1); z <= Math.max(grip, 1) + 2; z++) if (z % 2 === 0) model.set(handX + 1, 12, z, trim);
    model.set(handX, y + 1, tip, lighten(body, 0.25)).set(handX, y - 1, tip - 1, lighten(body, 0.15));
  } else if (gear.motif === 'bulwark' && ranged) {
    model.fill(handX - 1, y - 1, tip - 3, handX + 1, y + 1, tip - 2, (x, yy, z) => (x === handX && yy === y ? null : jitter(darken(body, 0.15), 0.03, noise3(x, yy, z, 91))));
  } else if (gear.motif === 'bulwark') {
    model.fill(handX - 1, y - 1, tip - 2, handX + 1, y + 1, tip, (x, yy, z) => jitter(darken(body, 0.1), 0.04, noise3(x, yy, z, 93)));
  } else if (gear.motif === 'warden' && gear.emissive) {
    for (let z = grip + 2; z < tip - 1; z += 2) model.set(handX, y + 1, z, hex(gear.emissive), VOXEL_EMISSIVE);
  }
}

function buildHeld(gear: WornGear<'primary'>, handX: number): VoxelModel {
  const model = new VoxelModel();
  HELD_GEAR[gear.shape](model, gear, handX);
  addWeaponMotif(model, gear, handX);
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
  knife: (model, gear, handX) => {
    const steel = hex(gear.primary);
    model.fill(handX, 12, 1, handX, 12, 2, hex(gear.secondary));
    model.fill(handX, 12, 3, handX, 13, 5, steel);
    model.set(handX, 12, 6, lighten(steel, 0.2));
    if (gear.emissive) model.fill(handX, 11, 3, handX, 11, 5, hex(gear.emissive), VOXEL_EMISSIVE);
  },
  blade: (model, gear, handX) => {
    const steel = hex(gear.primary);
    model.fill(handX, 12, 1, handX, 12, 2, hex(gear.secondary));
    model.fill(handX - 1, 11, 3, handX + 1, 14, 3, darken(hex(gear.secondary), 0.2));
    model.fill(handX, 12, 4, handX, 14, 9, (x, y, z) => jitter(steel, 0.03, noise3(x, y, z, 17)));
    model.fill(handX, 12, 10, handX, 13, 11, lighten(steel, 0.15));
    if (gear.emissive) model.fill(handX, 11, 5, handX, 11, 10, hex(gear.emissive), VOXEL_EMISSIVE);
  },
  polearm: (model, gear, handX) => {
    const head = hex(gear.primary);
    model.fill(handX, 12, -7, handX, 12, 14, hex(gear.secondary));
    model.fill(handX, 11, 15, handX, 13, 18, (x, y, z) => jitter(head, 0.04, noise3(x, y, z, 23)));
    model.fill(handX, 14, 14, handX, 15, 16, darken(head, 0.2));
    if (gear.emissive) model.set(handX, 12, 19, hex(gear.emissive), VOXEL_EMISSIVE);
  },
  rifle: (model, gear, handX) => {
    const body = hex(gear.primary);
    model.fill(handX, 13, -4, handX, 13, 14, body);
    model.fill(handX, 12, -6, handX, 13, -3, hex(gear.secondary));
    model.fill(handX, 12, 1, handX, 12, 2, hex(gear.secondary));
    model.fill(handX, 13, 15, handX, 13, 17, darken(body, 0.5));
    model.fill(handX, 15, 2, handX, 15, 7, darken(body, 0.35));
    model.set(handX, 14, 4, darken(body, 0.35));
    if (gear.emissive) model.set(handX, 15, 8, hex(gear.emissive), VOXEL_EMISSIVE);
  },
  scattergun: (model, gear, handX) => {
    const body = hex(gear.primary);
    model.fill(handX, 13, -2, handX, 14, 7, (x, y, z) => jitter(body, 0.03, noise3(x, y, z, 29)));
    model.fill(handX, 12, -5, handX, 13, -2, hex(gear.secondary));
    model.fill(handX, 12, 3, handX, 12, 6, darken(hex(gear.secondary), 0.15));
    model.fill(handX, 13, 8, handX, 14, 8, darken(body, 0.5));
    if (gear.emissive) model.fill(handX, 15, 1, handX, 15, 3, hex(gear.emissive), VOXEL_EMISSIVE);
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

function hoodShell(model: VoxelModel, gear: GearVisual, depth: number): void {
  const cloth = hex(gear.primary);
  const lining = hex(gear.secondary);
  for (let x = -4; x <= 4; x++) {
    for (let y = 24; y <= 32; y++) {
      for (let z = -4; z <= depth; z++) {
        const side = Math.abs(x) === 4;
        const back = z === -4;
        const top = y === 32 && Math.abs(x) <= 3;
        const peak = z >= 4 && y >= 30 && Math.abs(x) <= 3;
        if (!(side || back || top || peak)) continue;
        if (z >= 4 && !peak && y < 30 && Math.abs(x) < 4) continue;
        const edge = (side && z === depth) || (peak && y === 30);
        model.set(x, y, z, edge ? lining : jitter(cloth, 0.03, noise3(x, y, z, 71)));
      }
    }
  }
  model.fill(-3, NECK_Y, -4, 3, NECK_Y, 3, (x, _y, z) => (Math.abs(x) === 3 || z === -4 || z === 3 ? darken(cloth, 0.12) : null));
}

const HEAD_GEAR: Readonly<Record<GearShape<'head'>, FaceRenderer>> = {
  hood: (model, gear) => {
    hoodShell(model, gear, 4);
    model.fill(-1, 33, -4, 1, 33, -1, darken(hex(gear.primary), 0.08));
    if (gear.emissive) model.fill(-3, 30, 5, 3, 30, 5, (x) => (x % 3 === 0 ? hex(gear.emissive ?? gear.secondary) : null), VOXEL_EMISSIVE);
  },
  cowl: (model, gear) => {
    hoodShell(model, gear, 5);
    const cloth = hex(gear.primary);
    const mask = hex(gear.secondary);
    model.fill(-3, 24, 4, 3, 26, 4, (x, y) => (y === 26 && Math.abs(x) === 3 ? null : jitter(mask, 0.03, noise3(x, y, 4, 73))));
    model.fill(-3, 31, 5, 3, 32, 5, darken(cloth, 0.1));
    model.fill(-2, 33, -3, 2, 33, 1, darken(cloth, 0.05));
    model.set(0, 34, -1, darken(cloth, 0.05));
    if (gear.emissive) model.set(0, 31, 6, hex(gear.emissive), VOXEL_EMISSIVE).set(-1, 30, 5, hex(gear.emissive), VOXEL_EMISSIVE).set(1, 30, 5, hex(gear.emissive), VOXEL_EMISSIVE);
  },
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

