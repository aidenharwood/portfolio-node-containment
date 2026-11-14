import { Group } from 'three';
import { darken, jitter, lighten, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS } from '../voxel/voxelKinds.ts';
import { createVoxelObject } from '../voxel/voxelMaterials.ts';
import type { VoxelMeshes } from '../voxel/voxelMesher.ts';
import { VoxelModel, type Paint } from '../voxel/voxelModel.ts';
import { CHARACTER_VOXEL_SIZE } from '../world/worldScale.ts';
import { swingCurve, type EntityPose, type EntityRig } from './entityRig.ts';

type Gait = 'scurry' | 'hop' | 'trot' | 'hover' | 'drift';

interface CreatureLook {
  readonly build: () => VoxelModel;
  readonly height: number;
  readonly gait: Gait;
}

const fur = (color: number, salt: number): Paint => (x, y, z) => jitter(color, 0.07, noise3(x, y, z, salt));

const canalRat = (): VoxelModel => {
  const hide = 0x5a4a40;
  const model = new VoxelModel().fill(-2, 1, -4, 1, 4, 3, fur(hide, 3)).fill(-2, 1, 4, 1, 3, 6, fur(lighten(hide, 0.1), 4));
  model.set(-2, 3, 7, 0xff4f4f, VOXEL_EMISSIVE).set(1, 3, 7, 0xff4f4f, VOXEL_EMISSIVE).fill(-1, 2, 7, 0, 2, 7, 0xd89a9a);
  model.fill(-2, 5, 4, -2, 5, 4, 0xd89a9a).fill(1, 5, 4, 1, 5, 4, 0xd89a9a);
  model.fill(0, 2, -8, 0, 2, -5, 0xc89a8a);
  for (const x of [-2, 1]) for (const z of [-3, 2]) model.set(x, 0, z, darken(hide, 0.3));
  return model;
};

const pigeon = (): VoxelModel => {
  const grey = 0x7a7f8a;
  const model = new VoxelModel().fill(-2, 2, -3, 1, 6, 2, fur(grey, 7)).fill(-1, 6, 1, 0, 9, 3, fur(lighten(grey, 0.1), 8));
  model.fill(-2, 5, 1, 1, 6, 2, 0x4a8a6a).fill(-1, 7, 4, 0, 7, 4, 0xd8a03a).set(-1, 8, 3, 0xff8a3a).set(0, 8, 3, 0xff8a3a);
  model.fill(-3, 3, -3, -3, 5, 1, darken(grey, 0.2)).fill(2, 3, -3, 2, 5, 1, darken(grey, 0.2)).fill(-1, 2, -5, 0, 3, -4, darken(grey, 0.35));
  model.fill(-1, 0, 0, -1, 1, 0, 0xd85a5a).fill(0, 0, 0, 0, 1, 0, 0xd85a5a);
  return model;
};

const strayDog = (): VoxelModel => {
  const coat = 0x8a6a42;
  const model = new VoxelModel().fill(-3, 5, -7, 2, 10, 5, fur(coat, 11));
  model.fill(-3, 8, 6, 2, 13, 10, fur(coat, 12)).fill(-2, 8, 11, 1, 10, 13, fur(lighten(coat, 0.15), 13)).set(-1, 10, 14, 0x1a1a1a).set(0, 10, 14, 0x1a1a1a);
  model.set(-2, 12, 10, 0x1a1a1a).set(1, 12, 10, 0x1a1a1a).fill(-3, 14, 7, -3, 15, 8, darken(coat, 0.3)).fill(2, 14, 7, 2, 15, 8, darken(coat, 0.3));
  for (const x of [-3, 2]) for (const z of [-6, 4]) model.fill(x, 0, z, x, 4, z + 1, fur(darken(coat, 0.15), 14));
  model.fill(-1, 10, -10, 0, 11, -8, fur(coat, 15)).fill(-3, 10, 5, 2, 10, 5, 0xc84a4a);
  return model;
};

const trainingDrone = (): VoxelModel => {
  const shell = 0xd8d6cc;
  const model = new VoxelModel().fill(-4, 8, -4, 3, 14, 3, (x, y, z) => jitter(shell, 0.02, noise3(x, y, z, 2)));
  model.fill(-4, 11, 4, 3, 11, 4, 0xe86a1c).fill(-1, 12, 4, 0, 13, 4, 0x4fe3ff, VOXEL_EMISSIVE);
  for (const [x, z] of [[-6, -6], [5, -6], [-6, 5], [5, 5]] as const) model.fill(x, 13, z, x, 13, z, 0x2a2e31).fill(Math.sign(x) * 4 - (x < 0 ? 1 : 0), 13, Math.sign(z) * 4 - (z < 0 ? 1 : 0), x, 13, z, 0x2a2e31);
  model.fill(-2, 6, -2, 1, 7, 1, 0x2a2e31);
  return model;
};

const crateWisp = (): VoxelModel => {
  const glow = 0xb6ff4f;
  const model = new VoxelModel();
  for (let x = -3; x <= 3; x++) for (let y = 6; y <= 13; y++) for (let z = -3; z <= 3; z++) {
    if (Math.hypot(x, (y - 9.5) * 0.9, z) <= 3.4 - noise3(x, y, z, 5) * 0.8) model.set(x, y, z, jitter(glow, 0.12, noise3(x, y, z, 6)), VOXEL_EMISSIVE);
  }
  model.set(-1, 10, 3, 0x1a2a10).set(1, 10, 3, 0x1a2a10);
  return model;
};

const gutterMite = (): VoxelModel => {
  const shell = 0x3a4a2a;
  const model = new VoxelModel().fill(-3, 1, -3, 2, 4, 3, fur(shell, 21)).fill(-2, 5, -2, 1, 5, 2, fur(lighten(shell, 0.15), 22));
  for (const z of [-2, 0, 2]) model.fill(-5, 0, z, -4, 2, z, darken(shell, 0.3)).fill(3, 0, z, 4, 2, z, darken(shell, 0.3));
  model.fill(-2, 3, 4, -1, 3, 4, 0xb6ff4f, VOXEL_EMISSIVE).fill(0, 3, 4, 1, 3, 4, 0xb6ff4f, VOXEL_EMISSIVE);
  return model;
};

const siltEel = (): VoxelModel => {
  const skin = 0x1f2a2a;
  const model = new VoxelModel();
  for (let z = -10; z <= 8; z++) {
    const x = Math.round(Math.sin(z * 0.45) * 2);
    const r = z > 4 ? 2 : z < -6 ? 1 : 2;
    model.fill(x - r, 1, z, x + r - 1, 1 + r * 2, z, fur(skin, 23));
  }
  model.fill(-2, 4, 9, 1, 6, 10, fur(lighten(skin, 0.1), 24)).set(-2, 6, 10, 0xffd23f, VOXEL_EMISSIVE).set(1, 6, 10, 0xffd23f, VOXEL_EMISSIVE);
  model.fill(-1, 6, -6, 0, 8, 4, 0x3a5a4a);
  return model;
};

const scrapCrawler = (): VoxelModel => {
  const plate = 0x6a4a3a;
  const model = new VoxelModel().fill(-5, 3, -6, 4, 8, 5, (x, y, z) => ((x + z) % 3 === 0 ? 0x5d666c : jitter(plate, 0.08, noise3(x, y, z, 25))));
  for (const z of [-5, -1, 3]) model.fill(-8, 0, z, -6, 5, z, 0x3a3f44).fill(5, 0, z, 7, 5, z, 0x3a3f44);
  model.fill(-3, 4, 6, 2, 7, 8, 0x3a3f44).fill(-4, 6, 9, -3, 7, 11, 0x8a5a3a).fill(2, 6, 9, 3, 7, 11, 0x8a5a3a);
  model.set(-2, 7, 9, 0xffb35a, VOXEL_EMISSIVE).set(1, 7, 9, 0xffb35a, VOXEL_EMISSIVE);
  return model;
};

const rustling = (): VoxelModel => {
  const metals = [0x6a4a3a, 0x5d666c, 0x8a5a3a, 0x3a4a52];
  const model = new VoxelModel();
  for (let i = 0; i < 18; i++) {
    const x = Math.floor((noise3(i, 0, 3, 27) - 0.5) * 12);
    const z = Math.floor((noise3(i, 1, 3, 27) - 0.5) * 10);
    const y = 3 + Math.floor(noise3(i, 2, 3, 27) * 14);
    model.fill(x, y, z, x + 2 + (i % 3), y + 2, z + 2, jitter(metals[i % 4] as number, 0.08, i));
  }
  for (const x of [-4, 3]) model.fill(x, 0, -1, x + 1, 4, 0, 0x3a3f44);
  model.fill(-1, 11, 6, 0, 12, 6, 0xe8a21c, VOXEL_EMISSIVE);
  return model;
};

const lineMimic = (): VoxelModel => {
  const coat = 0x3a3a4a;
  const model = new VoxelModel().fill(-4, 4, -2, 3, 18, 2, (x, y, z) => jitter(coat, 0.06, noise3(x, y, z, 29)));
  model.fill(-6, 14, -1, -5, 18, 1, coat).fill(4, 14, -1, 5, 18, 1, coat).fill(-1, 18, -1, 0, 20, 0, 0x8a8a8a);
  model.fill(-3, 0, -1, -2, 3, 0, 0xc84a4a).fill(1, 0, -1, 2, 3, 0, 0x4a7ac8);
  model.fill(-2, 15, 3, 1, 15, 3, 0xd8d0b8).set(-1, 12, 3, 0xffd23f, VOXEL_EMISSIVE).set(0, 12, 3, 0xffd23f, VOXEL_EMISSIVE);
  return model;
};

const scrapMagpie = (): VoxelModel => {
  const model = new VoxelModel().fill(-2, 3, -3, 1, 7, 2, fur(0x1a1a22, 31)).fill(-1, 7, 1, 0, 9, 3, fur(0x1a1a22, 32));
  model.fill(-2, 4, -1, 1, 5, 2, 0xe8e8f0).fill(-1, 3, -7, 0, 4, -4, 0x2a3a6a).fill(-1, 8, 4, 0, 8, 5, 0x3a3a3a);
  model.set(-1, 8, 3, 0xd8a03a, VOXEL_EMISSIVE).fill(-1, 0, 0, -1, 2, 0, 0x2a2a2a).fill(0, 0, 0, 0, 2, 0, 0x2a2a2a);
  return model;
};

const lamplighter = (): VoxelModel => {
  const body = 0x1f2a30;
  const model = new VoxelModel();
  for (let y = 0; y <= 34; y++) {
    const r = y < 6 ? 6 - y * 0.5 : y < 26 ? 4 + Math.sin(y * 0.4) * 1.2 : 3;
    model.fill(-Math.round(r), y, -Math.round(r * 0.7), Math.round(r) - 1, y, Math.round(r * 0.7) - 1, (x, yy, z) => jitter(body, 0.08, noise3(x, yy, z, 33)));
  }
  model.fill(-9, 22, -1, -5, 24, 0, body).fill(4, 22, -1, 8, 24, 0, body).fill(8, 14, -1, 9, 24, 0, body);
  model.fill(7, 8, -2, 10, 13, 1, 0x2a2e31).fill(8, 9, -1, 9, 12, 0, 0xffb35a, VOXEL_EMISSIVE);
  model.fill(-2, 30, 3, 1, 31, 3, 0xffb35a, VOXEL_EMISSIVE);
  return model;
};

const mothLantern = (): VoxelModel => {
  const model = new VoxelModel().fill(-1, 10, -3, 0, 12, 2, fur(0x4a3a2a, 41));
  model.fill(-2, 6, -2, 1, 9, 1, 0xffd08a, VOXEL_EMISSIVE).fill(-1, 5, -1, 0, 5, 0, 0xe8a21c, VOXEL_EMISSIVE);
  for (const side of [-1, 1]) {
    for (let x = 1; x <= 7; x++) model.fill(side < 0 ? -1 - x : x, 11, -4 + Math.floor(x / 3), side < 0 ? -1 - x : x, 11, 3 - Math.floor(x / 2), x % 3 === 0 ? 0xe8a21c : 0x8a7a5a);
  }
  model.fill(-1, 13, 3, -1, 15, 4, 0x2a2018).fill(0, 13, 3, 0, 15, 4, 0x2a2018);
  return model;
};

const glassHound = (): VoxelModel => {
  const model = new VoxelModel().fill(-3, 6, -7, 2, 11, 5, 0x9fd6e6, VOXEL_GLASS);
  model.fill(-3, 9, 6, 2, 14, 10, 0x9fd6e6, VOXEL_GLASS).fill(-2, 9, 11, 1, 11, 13, 0xbfe6f0, VOXEL_GLASS);
  model.fill(-1, 7, -4, 0, 9, 2, 0xe8a21c, VOXEL_EMISSIVE).set(-2, 12, 10, 0xe8a21c, VOXEL_EMISSIVE).set(1, 12, 10, 0xe8a21c, VOXEL_EMISSIVE);
  for (const x of [-3, 2]) for (const z of [-6, 4]) model.fill(x, 0, z, x, 5, z + 1, 0x9fd6e6, VOXEL_GLASS);
  model.fill(-1, 11, -11, 0, 12, -8, 0x9fd6e6, VOXEL_GLASS);
  return model;
};

const hullKnocker = (): VoxelModel => {
  const shell = 0x3a4a52;
  const model = new VoxelModel().fill(-7, 4, -6, 6, 13, 5, (x, y, z) => ((y + z) % 4 === 0 ? 0x8a4a2a : jitter(shell, 0.08, noise3(x, y, z, 43))));
  model.fill(-11, 6, 4, -7, 12, 9, 0x2a3038).fill(6, 6, 4, 10, 12, 9, 0x2a3038);
  for (const z of [-5, 0]) model.fill(-9, 0, z, -7, 5, z + 1, 0x2a3038).fill(6, 0, z, 8, 5, z + 1, 0x2a3038);
  model.set(-3, 11, 6, 0xc79bff, VOXEL_EMISSIVE).set(2, 11, 6, 0xc79bff, VOXEL_EMISSIVE);
  return model;
};

const tideWraith = (): VoxelModel => {
  const model = new VoxelModel();
  for (let y = 2; y <= 26; y++) {
    const r = y < 18 ? 3 + Math.floor(Math.sin(y * 0.5) * 1.5) : 2;
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
      if (Math.hypot(x, z) > r || noise3(x, y, z, 45) > 0.75) continue;
      model.set(x, y, z, jitter(y < 10 ? 0x2a4a3a : 0x3a5a4a, 0.1, noise3(x, y, z, 46)));
    }
  }
  model.fill(-1, 22, 2, -1, 22, 2, 0xc79bff, VOXEL_EMISSIVE).fill(1, 22, 2, 1, 22, 2, 0xc79bff, VOXEL_EMISSIVE);
  model.fill(-6, 16, 0, -3, 17, 0, 0x2a4a3a).fill(3, 16, 0, 6, 17, 0, 0x2a4a3a);
  return model;
};

const redTwin = (): VoxelModel => {
  const skin = 0xd8d6cc;
  const model = new VoxelModel();
  for (const x0 of [-6, 2]) {
    model.fill(x0, 0, -1, x0 + 3, 16, 1, (x, y, z) => jitter(skin, 0.03, noise3(x, y, z, 51)));
    model.fill(x0, 16, -1, x0 + 3, 20, 2, skin).fill(x0 + 1, 18, 3, x0 + 2, 18, 3, 0xd8322a, VOXEL_EMISSIVE);
  }
  model.fill(-2, 10, -1, 1, 11, 0, 0xd8322a);
  return model;
};

const cellBreaker = (): VoxelModel => {
  const hide = 0x3a2a2a;
  const model = new VoxelModel().fill(-6, 6, -5, 5, 18, 4, (x, y, z) => jitter(hide, 0.08, noise3(x, y, z, 53)));
  model.fill(-10, 10, 0, -7, 16, 7, darken(hide, 0.2)).fill(6, 10, 0, 9, 16, 7, darken(hide, 0.2));
  model.fill(-9, 10, 8, -7, 12, 9, 0xd8d6cc).fill(7, 10, 8, 9, 12, 9, 0xd8d6cc);
  for (const x of [-5, 3]) model.fill(x, 0, -2, x + 2, 5, 1, darken(hide, 0.3));
  model.fill(-2, 16, 5, 1, 16, 5, 0xd8322a, VOXEL_EMISSIVE).fill(-6, 18, -5, 5, 18, 4, 0xe86a1c);
  return model;
};

const cordonStalker = (): VoxelModel => {
  const body = 0x2a2a30;
  const model = new VoxelModel();
  for (const [x, z] of [[-5, -5], [4, -5], [-5, 4], [4, 4]] as const) model.fill(x, 0, z, x, 14, z, 0x1a1a20);
  model.fill(-4, 14, -4, 3, 18, 3, (x, y, z) => jitter(body, 0.06, noise3(x, y, z, 55)));
  model.fill(-2, 18, 2, 1, 24, 5, body).fill(-1, 22, 6, 0, 22, 6, 0xd8322a, VOXEL_EMISSIVE);
  model.fill(-4, 15, -4, 3, 15, 3, 0xe86a1c);
  return model;
};

const vaultEcho = (): VoxelModel => {
  const glow = 0x7fd8ff;
  const model = new VoxelModel();
  for (let y = 0; y <= 22; y++) {
    const r = y < 14 ? 3 : 2;
    for (let x = -r; x <= r; x++) for (let z = -1; z <= 1; z++) {
      if (noise3(x, y, z, 57) > 0.6) continue;
      model.set(x, y, z, jitter(0x1a2a3a, 0.1, noise3(x, y, z, 58)), (x + y) % 5 === 0 ? VOXEL_EMISSIVE : undefined);
    }
  }
  model.set(-1, 19, 2, glow, VOXEL_EMISSIVE).set(1, 19, 2, glow, VOXEL_EMISSIVE);
  return model;
};

const warden = (): VoxelModel => {
  const plate = 0x1a2a3a;
  const model = new VoxelModel();
  for (let y = 0; y <= 44; y++) {
    const r = y < 8 ? 9 - y * 0.5 : y < 34 ? 6 + Math.sin(y * 0.25) * 2 : 5;
    model.fill(-Math.round(r), y, -Math.round(r * 0.6), Math.round(r) - 1, y, Math.round(r * 0.6) - 1, (x, yy, z) => jitter(plate, 0.08, noise3(x, yy, z, 59)));
  }
  model.fill(-16, 28, -2, -8, 31, 1, plate).fill(7, 28, -2, 15, 31, 1, plate);
  model.fill(-17, 14, -2, -14, 31, 1, plate).fill(13, 14, -2, 16, 31, 1, plate);
  model.fill(-3, 38, 4, 2, 40, 4, 0x7fd8ff, VOXEL_EMISSIVE).fill(-1, 20, 4, 0, 30, 4, 0x7fd8ff, VOXEL_EMISSIVE);
  model.fill(-6, 45, -2, 5, 47, 1, 0xd8322a);
  return model;
};

const LOOKS: Readonly<Record<string, CreatureLook>> = {
  canalRat: { build: canalRat, height: 0.35, gait: 'scurry' },
  pigeon: { build: pigeon, height: 0.4, gait: 'hop' },
  strayDog: { build: strayDog, height: 0.75, gait: 'trot' },
  trainingDrone: { build: trainingDrone, height: 0.8, gait: 'hover' },
  crateWisp: { build: crateWisp, height: 0.75, gait: 'drift' },
  gutterMite: { build: gutterMite, height: 0.35, gait: 'scurry' },
  siltEel: { build: siltEel, height: 0.45, gait: 'scurry' },
  scrapCrawler: { build: scrapCrawler, height: 0.6, gait: 'scurry' },
  rustling: { build: rustling, height: 1, gait: 'trot' },
  lineMimic: { build: lineMimic, height: 1.2, gait: 'drift' },
  scrapMagpie: { build: scrapMagpie, height: 0.5, gait: 'hop' },
  lamplighter: { build: lamplighter, height: 2.1, gait: 'drift' },
  mothLantern: { build: mothLantern, height: 1, gait: 'hover' },
  glassHound: { build: glassHound, height: 0.9, gait: 'trot' },
  hullKnocker: { build: hullKnocker, height: 0.9, gait: 'scurry' },
  tideWraith: { build: tideWraith, height: 1.6, gait: 'drift' },
  redTwin: { build: redTwin, height: 1.3, gait: 'drift' },
  cellBreaker: { build: cellBreaker, height: 1.2, gait: 'trot' },
  cordonStalker: { build: cordonStalker, height: 1.5, gait: 'trot' },
  vaultEcho: { build: vaultEcho, height: 1.4, gait: 'drift' },
  warden: { build: warden, height: 3, gait: 'drift' },
};

const meshes = new Map<string, VoxelMeshes>();

class WardCreatureRig implements EntityRig {
  readonly root = new Group();
  readonly height: number;
  private readonly body: Group;
  private readonly gait: Gait;

  constructor(key: string) {
    const look = LOOKS[key] as CreatureLook;
    this.height = look.height;
    this.gait = look.gait;
    let mesh = meshes.get(key);
    if (!mesh) {
      mesh = look.build().mesh(CHARACTER_VOXEL_SIZE, [0, 0, 0]);
      meshes.set(key, mesh);
    }
    this.body = createVoxelObject(mesh);
    this.root.add(this.body);
  }

  animate(pose: EntityPose): void {
    const lunge = swingCurve(pose.attackProgress);
    const hurt = swingCurve(pose.hurtProgress);
    const step = Math.abs(Math.sin(pose.walkPhase * Math.PI));
    const shake = Math.sin(pose.time * 40) * hurt * 0.04;
    switch (this.gait) {
      case 'scurry':
        this.body.position.set(shake, pose.moving ? step * 0.02 : 0, lunge * 0.25);
        this.body.rotation.y = pose.moving ? Math.sin(pose.walkPhase * Math.PI * 2) * 0.12 : 0;
        return;
      case 'hop':
        this.body.position.set(shake, pose.moving ? step * 0.08 : 0, lunge * 0.2);
        this.body.rotation.x = pose.moving ? 0 : Math.max(0, Math.sin(pose.time * 3)) * 0.3;
        return;
      case 'trot':
        this.body.position.set(shake, pose.moving ? step * 0.05 : 0, lunge * 0.35);
        this.body.rotation.x = -lunge * 0.2;
        return;
      case 'hover':
        this.body.position.set(shake, 0.05 + Math.sin(pose.time * 2.2) * 0.04, lunge * 0.3);
        this.body.rotation.y = pose.time * 0.6;
        return;
      case 'drift':
        this.body.position.set(shake + Math.sin(pose.time * 1.3) * 0.05, 0.08 + Math.sin(pose.time * 1.9) * 0.06, lunge * 0.25);
        this.body.scale.setScalar(1 + Math.sin(pose.time * 4) * 0.05 + hurt * 0.15);
        return;
    }
  }
}

export const WARD_CREATURE_FACTORIES = {
  canalRat: () => new WardCreatureRig('canalRat'),
  pigeon: () => new WardCreatureRig('pigeon'),
  strayDog: () => new WardCreatureRig('strayDog'),
  trainingDrone: () => new WardCreatureRig('trainingDrone'),
  crateWisp: () => new WardCreatureRig('crateWisp'),
  gutterMite: () => new WardCreatureRig('gutterMite'),
  siltEel: () => new WardCreatureRig('siltEel'),
  scrapCrawler: () => new WardCreatureRig('scrapCrawler'),
  rustling: () => new WardCreatureRig('rustling'),
  lineMimic: () => new WardCreatureRig('lineMimic'),
  scrapMagpie: () => new WardCreatureRig('scrapMagpie'),
  lamplighter: () => new WardCreatureRig('lamplighter'),
  mothLantern: () => new WardCreatureRig('mothLantern'),
  glassHound: () => new WardCreatureRig('glassHound'),
  hullKnocker: () => new WardCreatureRig('hullKnocker'),
  tideWraith: () => new WardCreatureRig('tideWraith'),
  redTwin: () => new WardCreatureRig('redTwin'),
  cellBreaker: () => new WardCreatureRig('cellBreaker'),
  cordonStalker: () => new WardCreatureRig('cordonStalker'),
  vaultEcho: () => new WardCreatureRig('vaultEcho'),
  warden: () => new WardCreatureRig('warden'),
} as const;
