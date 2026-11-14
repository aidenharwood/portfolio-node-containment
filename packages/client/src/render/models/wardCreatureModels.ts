import { Group } from 'three';
import { darken, jitter, lighten, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE } from '../voxel/voxelKinds.ts';
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

const LOOKS: Readonly<Record<string, CreatureLook>> = {
  canalRat: { build: canalRat, height: 0.35, gait: 'scurry' },
  pigeon: { build: pigeon, height: 0.4, gait: 'hop' },
  strayDog: { build: strayDog, height: 0.75, gait: 'trot' },
  trainingDrone: { build: trainingDrone, height: 0.8, gait: 'hover' },
  crateWisp: { build: crateWisp, height: 0.75, gait: 'drift' },
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
} as const;
