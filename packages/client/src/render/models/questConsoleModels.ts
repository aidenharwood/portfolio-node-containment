import type { WorldObjectModel } from '@containment/shared';
import type { Object3D } from 'three';
import { VOXEL_EMISSIVE, VOXEL_GLASS } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import type { AnimatedPart, ObjectModelParts } from './objectModels.ts';

type QuestConsoleModel = Extract<
  WorldObjectModel,
  | 'marketTerminal'
  | 'marketMailbox'
  | 'councilTerminal'
  | 'relayConsole'
  | 'outboxTerminal'
  | 'reactorConsole'
  | 'waterworksAssay'
  | 'diagnosticTerminal'
  | 'halvorsenTerminal'
>;

const parts = (base: VoxelModel, heightVoxels: number, animated: AnimatedPart[] = []): ObjectModelParts => ({ base, animated, heightVoxels });

const blink = (rate: number, phase: number) => (part: Object3D, time: number, seed: number) => {
  part.visible = Math.sin(time * rate + phase + seed) > -0.2;
};

const marketTerminal = (): ObjectModelParts => {
  const model = new VoxelModel()
    .fill(-6, 0, -3, 5, 8, 2, 0x3a3320)
    .fill(-7, 9, -4, 6, 10, 3, 0x57492a)
    .fill(-7, 11, -4, -6, 22, -3, 0x2a2618)
    .fill(5, 11, -4, 6, 22, -3, 0x2a2618)
    .fill(-7, 23, -4, 6, 24, -3, 0x2a2618)
    .fill(-6, 11, -4, 4, 22, -3, 0x15130a);
  const chart = new VoxelModel();
  for (let x = -5; x <= 4; x++) {
    const top = 13 + ((x * 5 + 40) % 7);
    chart.fill(x, 12, -3, x, top, -3, x % 2 === 0 ? 0xe3c35a : 0x8fd18a, VOXEL_EMISSIVE);
  }
  const ticker = new VoxelModel().fill(-6, 20, -2, 5, 21, -2, 0xfff1b0, VOXEL_EMISSIVE);
  return parts(model, 25, [{ model: chart, animate: blink(1.5, 0) }, { model: ticker, animate: blink(3, 1) }]);
};

const marketMailbox = (): ObjectModelParts => {
  const model = new VoxelModel()
    .fill(-4, 0, -3, 3, 1, 2, 0x2a2618)
    .fill(-4, 2, -3, 3, 13, 2, 0xc79a2a)
    .fill(-5, 14, -4, 4, 15, 3, 0x7a5c18)
    .fill(-3, 8, 3, 2, 9, 3, 0x120e04)
    .fill(-2, 4, 3, 1, 6, 3, 0x7a5c18);
  const lamp = new VoxelModel().fill(-1, 16, -1, 0, 16, 0, 0xfff1b0, VOXEL_EMISSIVE);
  return parts(model, 17, [{ model: lamp, animate: blink(2, 0) }]);
};

const councilTerminal = (): ObjectModelParts => {
  const model = new VoxelModel()
    .fill(-7, 0, -4, 6, 11, 3, 0x2b2038)
    .fill(-8, 12, -5, 7, 13, 4, 0x3f3056)
    .fill(-4, 14, 0, 3, 30, 1, 0x1a1424)
    .fill(-2, 31, 0, 1, 32, 1, 0x1a1424);
  model.fill(-3, 15, 2, 2, 28, 2, 0x4fd8ff, VOXEL_EMISSIVE);
  const seal = new VoxelModel().fill(-1, 20, 3, 0, 23, 3, 0xffffff, VOXEL_EMISSIVE);
  return parts(model, 33, [{ model: seal, animate: blink(1.2, 0) }]);
};

const relayConsole = (): ObjectModelParts => {
  const model = new VoxelModel()
    .fill(-4, 0, -4, 3, 34, 3, 0x4a3a30)
    .fill(-3, 4, 4, 2, 12, 4, 0x1c1410)
    .fill(-3, 16, 4, 2, 24, 4, 0x1c1410)
    .fill(0, 35, 0, 0, 46, 0, 0xc8c0b4)
    .fill(-2, 42, 0, 2, 42, 0, 0xc8c0b4);
  for (let y = 5; y <= 11; y += 3) model.fill(-2, y, 4, -1, y + 1, 4, 0xe8dcc8).fill(1, y, 4, 2, y + 1, 4, 0xe8dcc8);
  const tune = new VoxelModel().fill(-3, 18, 4, 2, 22, 4, 0xffb87a, VOXEL_EMISSIVE);
  const tip = new VoxelModel().fill(0, 47, 0, 0, 47, 0, 0xff5a3a, VOXEL_EMISSIVE);
  return parts(model, 48, [{ model: tune, animate: blink(7, 0) }, { model: tip, animate: blink(2, 0) }]);
};

const outboxTerminal = (): ObjectModelParts => {
  const model = new VoxelModel()
    .fill(-8, 0, -3, 7, 10, 2, 0x35504e)
    .fill(-9, 11, -4, 8, 12, 3, 0x1e3331)
    .fill(-8, 13, -4, 7, 20, -3, 0x274241);
  for (let x = -8; x <= 6; x += 3) model.fill(x, 13, -3, x, 20, -2, 0x0f1d1c);
  model.fill(-8, 17, -4, 7, 17, -3, 0x1e3331);
  model.fill(-3, 4, 3, 2, 8, 3, 0x0a1514);
  const light = new VoxelModel().fill(-8, 21, -4, 7, 21, -4, 0x8afff0, VOXEL_EMISSIVE);
  return parts(model, 22, [{ model: light, animate: blink(1, 0) }]);
};

const reactorConsole = (): ObjectModelParts => {
  const model = new VoxelModel()
    .fill(-8, 0, -4, 7, 9, 3, 0x3a2820)
    .fill(-8, 10, -4, 7, 13, 3, 0x56382a)
    .fill(-8, 14, -4, 7, 18, -3, 0x2a1c16)
    .fill(-2, 14, -2, 1, 22, 1, 0x20140f)
    .fill(-1, 23, -1, 0, 28, 0, 0xd8d0c4)
    .fill(-2, 29, -2, 1, 31, 1, 0xc83a2a);
  model.fill(-7, 15, -4, 6, 17, -4, 0xff8a4a, VOXEL_EMISSIVE);
  model.fill(3, 14, 1, 6, 14, 3, 0xe8e0c8);
  const warn = new VoxelModel().fill(-7, 12, 3, -5, 12, 3, 0xff3a1a, VOXEL_EMISSIVE);
  return parts(model, 32, [{ model: warn, animate: blink(4, 0) }]);
};

const waterworksAssay = (): ObjectModelParts => {
  const model = new VoxelModel()
    .fill(-8, 0, -4, 7, 9, 3, 0x34423a)
    .fill(-9, 10, -5, 8, 11, 4, 0xc4cec8)
    .fill(-7, 12, -1, 6, 12, 1, 0x5a6a62);
  const colours = [0x7cf29a, 0xd8e868, 0x7cf29a, 0x3a6a4a, 0xd8e868];
  colours.forEach((colour, index) => {
    const x = -6 + index * 3;
    model.fill(x, 13, -1, x + 1, 19, 0, colour, VOXEL_GLASS);
  });
  const lamp = new VoxelModel().fill(-8, 12, 2, -7, 13, 3, 0x7cf29a, VOXEL_EMISSIVE);
  return parts(model, 20, [{ model: lamp, animate: blink(2, 0) }]);
};

const diagnosticTerminal = (): ObjectModelParts => {
  const model = new VoxelModel()
    .fill(-5, 0, -4, 4, 1, 3, 0xdce4e8)
    .fill(-1, 2, -1, 0, 15, 0, 0xdce4e8)
    .fill(-6, 16, -5, 5, 17, 4, 0xf4f8fa)
    .fill(-6, 18, -5, 5, 18, -4, 0x9ab0ba)
    .fill(-6, 18, 3, 5, 18, 4, 0x9ab0ba)
    .fill(-6, 18, -5, -5, 18, 4, 0x9ab0ba)
    .fill(4, 18, -5, 5, 18, 4, 0x9ab0ba);
  model.fill(-4, 18, -3, 3, 18, 2, 0x4fd8ff, VOXEL_EMISSIVE);
  const beam = new VoxelModel().fill(-4, 18, -3, 3, 19, -3, 0xffffff, VOXEL_EMISSIVE);
  return parts(model, 20, [
    {
      model: beam,
      animate: (part, time) => {
        part.position.z = (Math.sin(time * 1.5) * 2.5) / 16;
      },
    },
  ]);
};

const halvorsenTerminal = (): ObjectModelParts => {
  const model = new VoxelModel()
    .fill(-6, 0, -4, 5, 1, 3, 0x4a3c30)
    .fill(-6, 2, -4, 5, 11, 3, 0x6a5848)
    .fill(-7, 12, -4, 6, 12, 3, 0x4a3c30)
    .fill(-5, 13, -3, 4, 14, -2, 0xc8c4bc)
    .fill(-5, 15, -3, 4, 24, -3, 0xc8c4bc);
  model.fill(-4, 16, -2, 3, 23, -2, 0x9fd8ff, VOXEL_EMISSIVE);
  model.fill(3, 13, 1, 5, 15, 2, 0xe8e4dc);
  return parts(model, 25, [{ model: new VoxelModel().fill(-3, 22, -1, -1, 22, -1, 0xffffff, VOXEL_EMISSIVE), animate: blink(2.5, 0) }]);
};

export const QUEST_CONSOLE_BUILDERS: Readonly<Record<QuestConsoleModel, (seed: number) => ObjectModelParts>> = {
  marketTerminal,
  marketMailbox,
  councilTerminal,
  relayConsole,
  outboxTerminal,
  reactorConsole,
  waterworksAssay,
  diagnosticTerminal,
  halvorsenTerminal,
};
