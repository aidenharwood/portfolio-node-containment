import type { WorldObjectModel } from '@containment/shared';
import { jitter, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS, type VoxelKind } from '../voxel/voxelKinds.ts';
import { VoxelModel, type Paint } from '../voxel/voxelModel.ts';
import type { AnimatedPart, ObjectModelParts } from './objectModels.ts';

type AssemblyModel = Extract<
  WorldObjectModel,
  'tramNoseLeft' | 'tramNoseRight' | 'tramDoor' | 'tramWindow' | 'bridgeSpan' | 'bridgeEndLeft' | 'bridgeEndRight' | 'catwalkSpan' | 'catwalkEnd'
>;

const TILE_MIN = -8;
const TILE_MAX = 7;

const TRACK_BED = 0x1d2328;
const RAIL_STEEL = 0x8d969e;
const UNDERFRAME = 0x2a2f33;
const LIVERY_LOW = 0x1f5f6a;
const LIVERY_STRIPE = 0x46c8a8;
const HULL = 0xd8e2e8;
const ROOF = 0xb8c2ca;
const WINDOW_TINT = 0xbfe6ff;
const CABIN_FLOOR = 0x3a4046;
const SEAT = 0x2f6f8a;
const DECK_LIGHT = 0x4b5861;
const DECK_DARK = 0x3a454d;
const GIRDER = 0x2a3035;
const RAILING = 0x8a6b2f;
const HAZARD_YELLOW = 0xc99a1c;
const HAZARD_BLACK = 0x17170f;
const GUIDE_AMBER = 0xffb347;

const SKIN_Z = 6;
const CABIN_FLOOR_Y = 5;
const STRIPE_Y = 10;
const WINDOW_LOW_Y = 13;
const WINDOW_HIGH_Y = 21;
const ROOF_Y = 25;

interface Canvas {
  fill(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, paint: Paint, kind?: VoxelKind): void;
  set(x: number, y: number, z: number, color: number, kind?: VoxelKind): void;
}

function canvasOf(model: VoxelModel, mirrored: boolean): Canvas {
  const mx = (x: number) => (mirrored ? -1 - x : x);
  return {
    fill: (x0, y0, z0, x1, y1, z1, paint, kind) =>
      model.fill(mx(x0), y0, z0, mx(x1), y1, z1, typeof paint === 'number' ? paint : (x, y, z) => paint(mx(x), y, z), kind),
    set: (x, y, z, color, kind) => model.set(mx(x), y, z, color, kind),
  };
}

const parts = (base: VoxelModel, heightVoxels: number, animated: AnimatedPart[] = []): ObjectModelParts => ({ base, animated, heightVoxels });

const hullColor = (y: number) => {
  if (y === STRIPE_Y) return LIVERY_STRIPE;
  if (y < STRIPE_Y) return LIVERY_LOW;
  return HULL;
};

function paintTrack(canvas: Canvas): void {
  canvas.fill(TILE_MIN, 0, TILE_MIN, TILE_MAX, 0, 5, (x) => (x % 4 === 0 ? 0x2e3439 : TRACK_BED));
  canvas.fill(TILE_MIN, 1, 1, TILE_MAX, 1, 2, RAIL_STEEL);
}

function paintUnderframe(canvas: Canvas, x0: number, x1: number): void {
  canvas.fill(x0, 2, TILE_MIN, x1, 4, 4, UNDERFRAME);
  canvas.fill(x0, 3, 5, x1, 4, SKIN_Z, LIVERY_LOW);
}

function paintHullSection(canvas: Canvas, x0: number, x1: number, sideWall: Paint): void {
  canvas.fill(x0, CABIN_FLOOR_Y, TILE_MIN, x1, CABIN_FLOOR_Y, SKIN_Z, CABIN_FLOOR);
  canvas.fill(x0, CABIN_FLOOR_Y + 1, SKIN_Z, x1, ROOF_Y - 1, SKIN_Z, sideWall);
  canvas.fill(x0, ROOF_Y, TILE_MIN, x1, ROOF_Y, SKIN_Z - 1, ROOF);
  canvas.fill(x0, ROOF_Y + 1, TILE_MIN, x1, ROOF_Y + 1, SKIN_Z - 3, (x, _y, z) => jitter(ROOF, 0.02, noise3(x, 0, z, 9)));
  canvas.fill(x0, ROOF_Y - 1, SKIN_Z - 1, x1, ROOF_Y - 1, SKIN_Z - 1, ROOF);
}

const windowedWall: Paint = (x, y) => {
  const glazed = y >= WINDOW_LOW_Y && y <= WINDOW_HIGH_Y && x > TILE_MIN + 1 && x < TILE_MAX - 1;
  return glazed ? null : hullColor(y);
};

function paintGlazing(canvas: Canvas, x0: number, x1: number): void {
  canvas.fill(x0, WINDOW_LOW_Y, SKIN_Z, x1, WINDOW_HIGH_Y, SKIN_Z, WINDOW_TINT, VOXEL_GLASS);
}

function paintBench(canvas: Canvas, x0: number, x1: number): void {
  canvas.fill(x0, CABIN_FLOOR_Y + 1, 2, x1, CABIN_FLOOR_Y + 3, 4, SEAT);
  canvas.fill(x0, CABIN_FLOOR_Y + 4, 4, x1, CABIN_FLOOR_Y + 8, 5, SEAT);
}

function pantograph(): AnimatedPart {
  const model = new VoxelModel();
  model.fill(-3, ROOF_Y + 2, TILE_MIN, 2, ROOF_Y + 2, -6, UNDERFRAME);
  for (let step = 0; step <= 6; step++) {
    const reach = step < 4 ? step : 6 - step;
    model.set(-1 - reach, ROOF_Y + 3 + step, -7, RAIL_STEEL).set(reach, ROOF_Y + 3 + step, -7, RAIL_STEEL);
  }
  model.fill(-4, ROOF_Y + 10, TILE_MIN, 3, ROOF_Y + 10, -4, 0x5d6b74);
  return {
    model,
    animate: (part, time, seed) => {
      part.position.y = Math.sin(time * 1.7 + seed) * 0.008;
    },
  };
}

const tramWindow = (): ObjectModelParts => {
  const model = new VoxelModel();
  const canvas = canvasOf(model, false);
  paintTrack(canvas);
  paintUnderframe(canvas, TILE_MIN, TILE_MAX);
  paintHullSection(canvas, TILE_MIN, TILE_MAX, windowedWall);
  paintGlazing(canvas, TILE_MIN + 2, TILE_MAX - 2);
  paintBench(canvas, TILE_MIN + 1, TILE_MAX - 1);
  return parts(model, ROOF_Y + 2, [pantograph()]);
};

const DOOR_MIN_X = -5;
const DOOR_MAX_X = 4;
const DOOR_TOP_Y = 22;

const tramDoor = (): ObjectModelParts => {
  const model = new VoxelModel();
  const canvas = canvasOf(model, false);
  paintTrack(canvas);
  paintUnderframe(canvas, TILE_MIN, TILE_MAX);
  paintHullSection(canvas, TILE_MIN, TILE_MAX, (x, y) => (x >= DOOR_MIN_X && x <= DOOR_MAX_X && y <= DOOR_TOP_Y ? null : hullColor(y)));
  canvas.fill(DOOR_MIN_X, CABIN_FLOOR_Y + 1, SKIN_Z, DOOR_MAX_X, DOOR_TOP_Y, SKIN_Z, (x, y) => {
    if (x === -1 || x === 0) return 0x1b2228;
    if (y >= WINDOW_LOW_Y && y <= WINDOW_HIGH_Y - 1 && x !== DOOR_MIN_X && x !== DOOR_MAX_X) return null;
    return y === STRIPE_Y ? LIVERY_STRIPE : 0xc4ced6;
  });
  canvas.fill(DOOR_MIN_X + 1, WINDOW_LOW_Y, SKIN_Z, -2, WINDOW_HIGH_Y - 1, SKIN_Z, WINDOW_TINT, VOXEL_GLASS);
  canvas.fill(1, WINDOW_LOW_Y, SKIN_Z, DOOR_MAX_X - 1, WINDOW_HIGH_Y - 1, SKIN_Z, WINDOW_TINT, VOXEL_GLASS);
  canvas.fill(DOOR_MIN_X - 1, CABIN_FLOOR_Y - 1, SKIN_Z + 1, DOOR_MAX_X + 1, CABIN_FLOOR_Y - 1, SKIN_Z + 1, (x) => (x % 2 === 0 ? HAZARD_YELLOW : HAZARD_BLACK));
  canvas.fill(-3, CABIN_FLOOR_Y + 1, -2, 2, ROOF_Y - 1, -2, (_x, y) => (y % 6 === 0 ? RAIL_STEEL : null));
  const signal = new VoxelModel().fill(DOOR_MIN_X, DOOR_TOP_Y + 1, SKIN_Z + 1, DOOR_MAX_X, DOOR_TOP_Y + 1, SKIN_Z + 1, GUIDE_AMBER, VOXEL_EMISSIVE);
  return parts(model, ROOF_Y + 2, [
    {
      model: signal,
      animate: (part, time, seed) => {
        part.visible = Math.sin(time * 0.8 + seed) > -0.6;
      },
    },
  ]);
};

const NOSE_LENGTH = 5;
const NOSE_FRONT_X = TILE_MIN;

function noseDepth(x: number): number {
  return Math.max(0, NOSE_FRONT_X + NOSE_LENGTH - 1 - x);
}

const tramNose = (mirrored: boolean): ObjectModelParts => {
  const model = new VoxelModel();
  const canvas = canvasOf(model, mirrored);
  const bodyStart = NOSE_FRONT_X + NOSE_LENGTH;
  paintTrack(canvas);
  paintUnderframe(canvas, NOSE_FRONT_X + 1, TILE_MAX);
  paintHullSection(canvas, bodyStart, TILE_MAX, windowedWall);
  paintGlazing(canvas, bodyStart + 1, TILE_MAX - 2);
  paintBench(canvas, bodyStart + 1, TILE_MAX - 1);

  for (let x = NOSE_FRONT_X; x < bodyStart; x++) {
    const depth = noseDepth(x);
    const skin = SKIN_Z - Math.floor(depth / 2);
    const roof = ROOF_Y - depth;
    const front = x === NOSE_FRONT_X;
    canvas.fill(x, CABIN_FLOOR_Y, TILE_MIN, x, CABIN_FLOOR_Y, skin, CABIN_FLOOR);
    canvas.fill(x, CABIN_FLOOR_Y + 1, skin, x, roof - 1, skin, (_x, y) => (y >= WINDOW_LOW_Y && y <= roof - 2 ? null : hullColor(y)));
    canvas.fill(x, WINDOW_LOW_Y, skin, x, roof - 2, skin, WINDOW_TINT, VOXEL_GLASS);
    canvas.fill(x, roof, TILE_MIN, x, roof, skin, ROOF);
    if (!front) continue;
    canvas.fill(x, CABIN_FLOOR_Y + 1, TILE_MIN, x, WINDOW_LOW_Y - 1, skin, (_x, y) => hullColor(y));
    canvas.fill(x, WINDOW_LOW_Y, TILE_MIN, x, roof - 2, skin - 1, WINDOW_TINT, VOXEL_GLASS);
    canvas.fill(x, roof - 1, TILE_MIN, x, roof - 1, skin, HULL);
  }
  canvas.fill(NOSE_FRONT_X - 1, 2, TILE_MIN, NOSE_FRONT_X, 4, 3, (_x, y) => (y === 3 ? HAZARD_YELLOW : UNDERFRAME));
  canvas.fill(NOSE_FRONT_X + 1, ROOF_Y - NOSE_LENGTH + 2, -5, NOSE_FRONT_X + 1, ROOF_Y - NOSE_LENGTH + 2, -1, 0x1b2228);

  const lamps = new VoxelModel();
  const lampCanvas = canvasOf(lamps, mirrored);
  lampCanvas.fill(NOSE_FRONT_X - 1, 7, 2, NOSE_FRONT_X - 1, 8, 3, 0xfff3c4, VOXEL_EMISSIVE);
  lampCanvas.fill(NOSE_FRONT_X, WINDOW_LOW_Y - 1, TILE_MIN, NOSE_FRONT_X, WINDOW_LOW_Y - 1, -3, LIVERY_STRIPE, VOXEL_EMISSIVE);
  const board = new VoxelModel();
  const boardCanvas = canvasOf(board, mirrored);
  boardCanvas.fill(NOSE_FRONT_X + 2, ROOF_Y - 4, TILE_MIN, NOSE_FRONT_X + 2, ROOF_Y - 3, -3, (_x, y, z) => ((y + z) % 3 === 0 ? 0xffcf4d : GUIDE_AMBER), VOXEL_EMISSIVE);
  return parts(model, ROOF_Y + 2, [
    { model: lamps, animate: (part, time, seed) => (part.visible = Math.sin(time * 0.6 + seed) > -0.97) },
    { model: board, animate: (part, time, seed) => (part.visible = Math.sin(time * 4 + seed) > -0.9 || Math.sin(time * 0.3) > 0) },
  ]);
};

const DECK_TOP_Y = 0;
const RAIL_TOP_Y = 13;
const GIRDER_TOP_Y = -3;
const GIRDER_BOTTOM_Y = -10;

const gripPlate: Paint = (x, _y, z) => (Math.abs(((x + z) % 4) + 4) % 4 === 0 || Math.abs(((x - z) % 4) + 4) % 4 === 0 ? DECK_LIGHT : DECK_DARK);

function paintDeck(canvas: Canvas, z0: number, z1: number): void {
  canvas.fill(TILE_MIN, DECK_TOP_Y, z0, TILE_MAX, DECK_TOP_Y, z1, gripPlate);
  canvas.fill(TILE_MIN, DECK_TOP_Y - 2, z0, TILE_MAX, DECK_TOP_Y - 1, z1, GIRDER);
  canvas.fill(TILE_MIN, GIRDER_TOP_Y - 1, -1, TILE_MAX, GIRDER_TOP_Y, 0, GIRDER);
}

function paintRailingSide(canvas: Canvas, z0: number, z1: number): void {
  canvas.fill(TILE_MIN, DECK_TOP_Y + 1, z0, TILE_MIN + 1, DECK_TOP_Y + 1, z1, (_x, _y, z) => (Math.floor((z + 16) / 2) % 2 === 0 ? HAZARD_YELLOW : HAZARD_BLACK));
  canvas.fill(TILE_MIN, RAIL_TOP_Y, z0, TILE_MIN, RAIL_TOP_Y + 1, z1, RAILING);
  canvas.fill(TILE_MIN, 7, z0, TILE_MIN, 7, z1, RAILING);
  canvas.fill(TILE_MIN, GIRDER_BOTTOM_Y, z0, TILE_MIN + 3, GIRDER_BOTTOM_Y, z1, GIRDER);
  canvas.fill(TILE_MIN, GIRDER_TOP_Y, z0, TILE_MIN + 3, GIRDER_TOP_Y, z1, GIRDER);
  canvas.fill(TILE_MIN + 1, GIRDER_BOTTOM_Y + 1, z0, TILE_MIN + 2, GIRDER_TOP_Y - 1, z1, (_x, y, z) => jitter(GIRDER, 0.04, noise3(0, y, z, 3)));
}

function paintRailPost(canvas: Canvas, z: number): void {
  canvas.fill(TILE_MIN, DECK_TOP_Y + 1, z, TILE_MIN, RAIL_TOP_Y - 1, z + 1, RAILING);
}

function guideLights(mirrored: boolean, z0: number): AnimatedPart {
  const model = new VoxelModel();
  canvasOf(model, mirrored).fill(TILE_MIN + 2, DECK_TOP_Y + 1, z0, TILE_MIN + 2, DECK_TOP_Y + 1, z0 + 1, GUIDE_AMBER, VOXEL_EMISSIVE);
  return { model, animate: (part, time, seed) => (part.visible = Math.sin(time * 2.4 - seed * 0.7) > -0.3) };
}

const bridgeSpan = (): ObjectModelParts => {
  const model = new VoxelModel();
  const canvas = canvasOf(model, false);
  paintDeck(canvas, TILE_MIN, TILE_MAX);
  paintRailingSide(canvas, TILE_MIN, TILE_MAX);
  paintRailPost(canvas, -1);
  return parts(model, RAIL_TOP_Y + 2, [guideLights(false, -1)]);
};

const ANCHOR_END_Z = -6;

const bridgeEnd = (mirrored: boolean): ObjectModelParts => {
  const model = new VoxelModel();
  const canvas = canvasOf(model, mirrored);
  paintDeck(canvas, TILE_MIN, TILE_MAX);
  canvas.fill(TILE_MIN, DECK_TOP_Y, TILE_MIN, TILE_MAX, DECK_TOP_Y, TILE_MIN + 1, (x) => (Math.floor((x + 16) / 2) % 2 === 0 ? HAZARD_YELLOW : HAZARD_BLACK));
  paintRailingSide(canvas, ANCHOR_END_Z, TILE_MAX);
  paintRailPost(canvas, 2);
  canvas.fill(TILE_MIN, DECK_TOP_Y + 1, TILE_MIN, TILE_MIN + 2, RAIL_TOP_Y + 4, ANCHOR_END_Z - 1, (_x, y, z) => jitter(0x3a454d, 0.04, noise3(0, y, z, 7)));
  canvas.fill(TILE_MIN, -24, TILE_MIN, TILE_MIN + 3, GIRDER_TOP_Y - 1, TILE_MIN + 3, (_x, y) => (y % 5 === 0 ? 0x232a2f : GIRDER));
  canvas.fill(TILE_MIN, DECK_TOP_Y + 1, TILE_MIN + 2, TILE_MIN + 1, DECK_TOP_Y + 1, ANCHOR_END_Z - 1, HAZARD_YELLOW);
  const beacon = new VoxelModel();
  canvasOf(beacon, mirrored).fill(TILE_MIN, RAIL_TOP_Y + 5, TILE_MIN, TILE_MIN + 2, RAIL_TOP_Y + 6, ANCHOR_END_Z - 1, GUIDE_AMBER, VOXEL_EMISSIVE);
  return parts(model, RAIL_TOP_Y + 7, [
    { model: beacon, animate: (part, time, seed) => (part.visible = Math.sin(time * 3 + seed) > -0.5) },
    guideLights(mirrored, 3),
  ]);
};

const CATWALK_EDGE = 6;
const CATWALK_RAIL_Y = 12;

function paintCatwalk(model: VoxelModel, z0: number, z1: number): void {
  model.fill(-CATWALK_EDGE, DECK_TOP_Y, z0, CATWALK_EDGE - 1, DECK_TOP_Y, z1, (x, _y, z) => ((x + z) % 2 === 0 ? 0x5d6b74 : null));
  model.fill(-CATWALK_EDGE, DECK_TOP_Y - 1, z0, CATWALK_EDGE - 1, DECK_TOP_Y - 1, z1, (x, _y, z) => ((x + z) % 2 !== 0 ? 0x3a464f : null));
  for (const x of [-CATWALK_EDGE - 1, CATWALK_EDGE]) {
    model.fill(x, DECK_TOP_Y - 2, z0, x, DECK_TOP_Y + 1, z1, GIRDER);
    model.fill(x, CATWALK_RAIL_Y, z0, x, CATWALK_RAIL_Y, z1, RAILING);
    model.fill(x, 6, z0, x, 6, z1, RAILING);
  }
  model.fill(-1, -8, z0, 0, DECK_TOP_Y - 2, z1, (_x, y) => (y === -8 ? 0x232a2f : GIRDER));
}

function paintCatwalkPosts(model: VoxelModel, z: number, top: number): void {
  for (const x of [-CATWALK_EDGE - 1, CATWALK_EDGE]) model.fill(x, DECK_TOP_Y + 2, z, x, top, z + 1, RAILING);
}

const catwalkSpan = (): ObjectModelParts => {
  const model = new VoxelModel();
  paintCatwalk(model, TILE_MIN, TILE_MAX);
  paintCatwalkPosts(model, -1, CATWALK_RAIL_Y - 1);
  return parts(model, CATWALK_RAIL_Y + 1);
};

const catwalkEnd = (): ObjectModelParts => {
  const model = new VoxelModel();
  paintCatwalk(model, TILE_MIN + 2, TILE_MAX);
  model.fill(-CATWALK_EDGE - 1, DECK_TOP_Y, TILE_MIN, CATWALK_EDGE, DECK_TOP_Y, TILE_MIN + 1, (x) => (Math.floor((x + 16) / 2) % 2 === 0 ? HAZARD_YELLOW : HAZARD_BLACK));
  model.fill(-CATWALK_EDGE - 1, DECK_TOP_Y - 3, TILE_MIN, CATWALK_EDGE, DECK_TOP_Y - 1, TILE_MIN + 1, GIRDER);
  paintCatwalkPosts(model, TILE_MIN + 2, CATWALK_RAIL_Y + 2);
  const tips = new VoxelModel();
  for (const x of [-CATWALK_EDGE - 1, CATWALK_EDGE]) tips.fill(x, CATWALK_RAIL_Y + 3, TILE_MIN + 2, x, CATWALK_RAIL_Y + 3, TILE_MIN + 3, 0x7cf29a, VOXEL_EMISSIVE);
  return parts(model, CATWALK_RAIL_Y + 4, [{ model: tips, animate: (part, time, seed) => (part.visible = Math.sin(time * 1.5 + seed) > -0.4) }]);
};

export const ASSEMBLY_BUILDERS: Readonly<Record<AssemblyModel, (seed: number) => ObjectModelParts>> = {
  tramNoseLeft: () => tramNose(false),
  tramNoseRight: () => tramNose(true),
  tramDoor,
  tramWindow,
  bridgeSpan,
  bridgeEndLeft: () => bridgeEnd(false),
  bridgeEndRight: () => bridgeEnd(true),
  catwalkSpan,
  catwalkEnd,
};
