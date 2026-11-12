import type { WorldObjectId } from '../../ids.ts';
import type { WorldObjectDefinition } from '../../world/entities.ts';
import { objectFootprintSize } from '../../world/footprint.ts';
import { tileKey, type Facing, type TilePoint, type TileRect } from '../../world/geometry.ts';
import type { CompositionLane } from '../compositions.ts';
import type { Prefab, PrefabDecal } from '../prefabs/index.ts';

export type ObjectLookup = (id: WorldObjectId) => WorldObjectDefinition | undefined;

export interface TurnPiece {
  readonly dx: number;
  readonly dy: number;
  readonly width: number;
  readonly height: number;
  readonly objectId: WorldObjectId;
  readonly facing: Facing;
}

export interface Turn {
  readonly pieces: readonly TurnPiece[];
  readonly decals: readonly PrefabDecal[];
  readonly width: number;
  readonly height: number;
}

export type MirrorAxis = 'x' | 'y';

export interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

const TURN_CLOCKWISE: Readonly<Record<Facing, Facing>> = { south: 'west', west: 'north', north: 'east', east: 'south' };
const MIRROR_FACING: Readonly<Record<MirrorAxis, Readonly<Record<Facing, Facing>>>> = {
  x: { north: 'north', south: 'south', east: 'west', west: 'east' },
  y: { north: 'south', south: 'north', east: 'east', west: 'west' },
};

const boundedTurn = (pieces: readonly TurnPiece[], decals: readonly PrefabDecal[]): Turn => ({
  pieces,
  decals,
  width: Math.max(...pieces.map((piece) => piece.dx + piece.width)),
  height: Math.max(...pieces.map((piece) => piece.dy + piece.height)),
});

const turnClockwise = (turn: Turn, objectOf: ObjectLookup): Turn =>
  boundedTurn(
    turn.pieces.map((piece) => {
      const facing = TURN_CLOCKWISE[piece.facing];
      const size = objectFootprintSize(objectOf(piece.objectId), facing);
      return { dx: turn.height - piece.dy - piece.height, dy: piece.dx, objectId: piece.objectId, facing, ...size };
    }),
    turn.decals.map((decal) => ({ ...decal, rect: { x: turn.height - decal.rect.y - decal.rect.height, y: decal.rect.x, width: decal.rect.height, height: decal.rect.width } })),
  );

export function turnsOf(prefab: Prefab, objectOf: ObjectLookup): readonly Turn[] {
  const first = boundedTurn(
    prefab.pieces.map((piece) => {
      const facing = piece.facing ?? 'south';
      return { dx: piece.dx, dy: piece.dy, objectId: piece.objectId, facing, ...objectFootprintSize(objectOf(piece.objectId), facing) };
    }),
    prefab.decals ?? [],
  );
  const turns = [first];
  for (let index = 1; index < 4; index++) turns.push(turnClockwise(turns[index - 1] as Turn, objectOf));
  return turns;
}

export function mirrorTurn(turn: Turn, axis: MirrorAxis): Turn {
  const flip = (start: number, size: number, span: number): number => span - start - size;
  return {
    width: turn.width,
    height: turn.height,
    pieces: turn.pieces.map((piece) => ({
      ...piece,
      dx: axis === 'x' ? flip(piece.dx, piece.width, turn.width) : piece.dx,
      dy: axis === 'y' ? flip(piece.dy, piece.height, turn.height) : piece.dy,
      facing: MIRROR_FACING[axis][piece.facing],
    })),
    decals: turn.decals.map((decal) => ({
      ...decal,
      rect: {
        ...decal.rect,
        x: axis === 'x' ? flip(decal.rect.x, decal.rect.width, turn.width) : decal.rect.x,
        y: axis === 'y' ? flip(decal.rect.y, decal.rect.height, turn.height) : decal.rect.y,
      },
    })),
  };
}

export const mirrorFacing = (facing: Facing, axis: MirrorAxis): Facing => MIRROR_FACING[axis][facing];

export const mirrorOrigin = (origin: TilePoint, turn: Turn, rect: TileRect, axis: MirrorAxis): TilePoint =>
  axis === 'x' ? { x: 2 * rect.x + rect.width - origin.x - turn.width, y: origin.y } : { x: origin.x, y: 2 * rect.y + rect.height - origin.y - turn.height };

export const mainAxisOf = (rect: TileRect): MirrorAxis => (rect.height > rect.width ? 'y' : 'x');

export const inFirstHalf = (origin: TilePoint, turn: Turn, rect: TileRect, axis: MirrorAxis): boolean =>
  axis === 'x' ? origin.x + turn.width <= rect.x + Math.floor(rect.width / 2) : origin.y + turn.height <= rect.y + Math.floor(rect.height / 2);

export const pieceTiles = (origin: TilePoint, turn: Turn): TilePoint[] =>
  turn.pieces.flatMap((piece) => {
    const tiles: TilePoint[] = [];
    for (let dy = 0; dy < piece.height; dy++) for (let dx = 0; dx < piece.width; dx++) tiles.push({ x: origin.x + piece.dx + dx, y: origin.y + piece.dy + dy });
    return tiles;
  });

export const placementSignature = (origin: TilePoint, turn: Turn): string =>
  turn.pieces
    .map((piece) => `${origin.x + piece.dx},${origin.y + piece.dy},${piece.objectId},${piece.facing}`)
    .sort()
    .join('|');

const THOROUGHFARE_RATIO = 2.5;
const THOROUGHFARE_HALF_WIDTH = 2.5;
const LANE_HALF_WIDTH = 1.5;
const RING_INNER = 2;
const RING_OUTER = 4;
const RING_PATH_HALF_WIDTH = 1;
const FOCAL_WALK = 2;

interface Band {
  readonly x?: number;
  readonly y?: number;
}

const bandOf = (rect: TileRect): Band => {
  const long = Math.max(rect.width, rect.height) >= THOROUGHFARE_RATIO * Math.min(rect.width, rect.height);
  if (!long) return { x: LANE_HALF_WIDTH, y: LANE_HALF_WIDTH };
  return rect.width >= rect.height ? { y: THOROUGHFARE_HALF_WIDTH } : { x: THOROUGHFARE_HALF_WIDTH };
};

const centreOf = (rect: TileRect): { readonly x: number; readonly y: number } => ({ x: rect.x + (rect.width - 1) / 2, y: rect.y + (rect.height - 1) / 2 });

export function inWalkingLane(rect: TileRect, point: TilePoint): boolean {
  const band = bandOf(rect);
  const centre = centreOf(rect);
  return (band.x !== undefined && Math.abs(point.x - centre.x) <= band.x) || (band.y !== undefined && Math.abs(point.y - centre.y) <= band.y);
}

export const distanceOutside = (bounds: Bounds, point: TilePoint): number =>
  Math.max(bounds.left - point.x, 0, point.x - bounds.right, bounds.top - point.y, point.y - bounds.bottom);

export const centreBounds = (rect: TileRect): Bounds => {
  const x = rect.x + Math.floor((rect.width - 1) / 2);
  const y = rect.y + Math.floor((rect.height - 1) / 2);
  return { left: x, top: y, right: x, bottom: y };
};

const rectTiles = (rect: TileRect): TilePoint[] => {
  const tiles: TilePoint[] = [];
  for (let y = rect.y; y < rect.y + rect.height; y++) for (let x = rect.x; x < rect.x + rect.width; x++) tiles.push({ x, y });
  return tiles;
};

const inwardOf = (rect: TileRect, opening: TilePoint): TilePoint => {
  if (opening.x < rect.x) return { x: 1, y: 0 };
  if (opening.x >= rect.x + rect.width) return { x: -1, y: 0 };
  if (opening.y < rect.y) return { x: 0, y: 1 };
  return { x: 0, y: -1 };
};

const ringPath = (rect: TileRect, focal: Bounds, opening: TilePoint): TilePoint[] => {
  const step = inwardOf(rect, opening);
  const across = { x: step.y, y: step.x };
  const centre = { x: (focal.left + focal.right) / 2, y: (focal.top + focal.bottom) / 2 };
  const tiles: TilePoint[] = [];
  let point = { x: opening.x + step.x, y: opening.y + step.y };
  while (point.x >= rect.x && point.y >= rect.y && point.x < rect.x + rect.width && point.y < rect.y + rect.height) {
    for (let offset = -RING_PATH_HALF_WIDTH; offset <= RING_PATH_HALF_WIDTH; offset++) tiles.push({ x: point.x + across.x * offset, y: point.y + across.y * offset });
    if (distanceOutside(focal, point) <= RING_OUTER) break;
    if ((step.x !== 0 && point.x === Math.round(centre.x)) || (step.y !== 0 && point.y === Math.round(centre.y))) break;
    point = { x: point.x + step.x, y: point.y + step.y };
  }
  return tiles;
};

export function laneTilesOf(rect: TileRect, lane: CompositionLane, focal: Bounds | undefined, openings: readonly TilePoint[]): Set<string> {
  const tiles = new Set<string>();
  if (lane === 'none') return tiles;
  if (lane === 'ring') {
    const hub = focal ?? centreBounds(rect);
    for (const point of rectTiles(rect)) {
      const distance = distanceOutside(hub, point);
      if (distance >= RING_INNER && distance <= RING_OUTER) tiles.add(tileKey(point));
    }
    for (const opening of openings) for (const point of ringPath(rect, hub, opening)) tiles.add(tileKey(point));
    return tiles;
  }
  for (const point of rectTiles(rect)) {
    const distance = focal ? distanceOutside(focal, point) : Infinity;
    if (distance === 0) continue;
    if (inWalkingLane(rect, point) || distance <= FOCAL_WALK) tiles.add(tileKey(point));
  }
  return tiles;
}

export function rectsOfTiles(tiles: readonly TilePoint[]): TileRect[] {
  const rows = new Map<number, number[]>();
  for (const tile of tiles) rows.set(tile.y, [...(rows.get(tile.y) ?? []), tile.x]);
  const done: TileRect[] = [];
  let open: TileRect[] = [];
  for (const y of [...rows.keys()].sort((a, b) => a - b)) {
    const xs = [...new Set(rows.get(y))].sort((a, b) => a - b);
    const runs: { x: number; width: number }[] = [];
    for (const x of xs) {
      const last = runs[runs.length - 1];
      if (last && last.x + last.width === x) last.width += 1;
      else runs.push({ x, width: 1 });
    }
    const next: TileRect[] = [];
    for (const run of runs) {
      const above = open.find((rect) => rect.x === run.x && rect.width === run.width && rect.y + rect.height === y);
      next.push(above ? { ...above, height: above.height + 1 } : { x: run.x, y, width: run.width, height: 1 });
    }
    done.push(...open.filter((rect) => !next.some((grown) => grown.x === rect.x && grown.y === rect.y)));
    open = next;
  }
  return [...done, ...open];
}

export interface Run {
  readonly along: 'x' | 'y';
  readonly start: number;
  readonly end: number;
  readonly line: number;
  readonly extends: 'before' | 'after';
  readonly rotation: number;
  readonly backs: readonly Facing[];
}

export const runOrigin = (run: Run, position: number, turn: Turn): TilePoint => {
  const depth = run.along === 'x' ? turn.height : turn.width;
  const across = run.extends === 'before' ? run.line - depth + 1 : run.line;
  return run.along === 'x' ? { x: position, y: across } : { x: across, y: position };
};

export const runLength = (run: Run, turn: Turn): number => (run.along === 'x' ? turn.width : turn.height);

const CORNER_MARGIN = 2;

export function bayRuns(rect: TileRect): Run[] {
  const right = rect.x + rect.width - 1;
  const bottom = rect.y + rect.height - 1;
  const xRun = { start: rect.x + CORNER_MARGIN, end: right - CORNER_MARGIN };
  const yRun = { start: rect.y + CORNER_MARGIN, end: bottom - CORNER_MARGIN };
  return [
    { along: 'x', ...xRun, line: rect.y, extends: 'after', rotation: 0, backs: ['north'] },
    { along: 'y', ...yRun, line: right, extends: 'before', rotation: 1, backs: ['east'] },
    { along: 'x', ...xRun, line: bottom, extends: 'before', rotation: 2, backs: ['south'] },
    { along: 'y', ...yRun, line: rect.x, extends: 'after', rotation: 3, backs: ['west'] },
  ];
}

const bandLimits = (centre: number, half: number): { readonly low: number; readonly high: number } => ({ low: Math.ceil(centre - half), high: Math.floor(centre + half) });

export function edgeRuns(rect: TileRect, lane: CompositionLane, focal: Bounds | undefined): Run[] {
  const right = rect.x + rect.width - 1;
  const bottom = rect.y + rect.height - 1;
  if (lane === 'none') return [];
  if (lane === 'ring') {
    const hub = focal ?? centreBounds(rect);
    const reach = RING_OUTER + 1;
    const xs = { start: hub.left - reach, end: hub.right + reach };
    const ys = { start: hub.top - reach, end: hub.bottom + reach };
    return [
      { along: 'x', ...xs, line: hub.top - reach, extends: 'before', rotation: 0, backs: [] },
      { along: 'y', ...ys, line: hub.right + reach, extends: 'after', rotation: 1, backs: [] },
      { along: 'x', ...xs, line: hub.bottom + reach, extends: 'after', rotation: 2, backs: [] },
      { along: 'y', ...ys, line: hub.left - reach, extends: 'before', rotation: 3, backs: [] },
    ];
  }
  const band = bandOf(rect);
  const centre = centreOf(rect);
  const runs: Run[] = [];
  if (band.y !== undefined) {
    const { low, high } = bandLimits(centre.y, band.y);
    runs.push({ along: 'x', start: rect.x, end: right, line: low - 1, extends: 'before', rotation: 0, backs: [] });
    runs.push({ along: 'x', start: rect.x, end: right, line: high + 1, extends: 'after', rotation: 2, backs: [] });
  }
  if (band.x !== undefined) {
    const { low, high } = bandLimits(centre.x, band.x);
    runs.push({ along: 'y', start: rect.y, end: bottom, line: low - 1, extends: 'before', rotation: 3, backs: [] });
    runs.push({ along: 'y', start: rect.y, end: bottom, line: high + 1, extends: 'after', rotation: 1, backs: [] });
  }
  return runs;
}

export interface CornerSlot {
  readonly corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  readonly rotation: number;
  readonly backs: readonly Facing[];
}

export const CORNER_SLOTS: readonly CornerSlot[] = [
  { corner: 'top-left', rotation: 0, backs: ['north', 'west'] },
  { corner: 'top-right', rotation: 0, backs: ['north', 'east'] },
  { corner: 'bottom-left', rotation: 2, backs: ['south', 'west'] },
  { corner: 'bottom-right', rotation: 2, backs: ['south', 'east'] },
];

export const cornerOrigin = (slot: CornerSlot, rect: TileRect, turn: Turn): TilePoint => ({
  x: slot.corner.endsWith('left') ? rect.x : rect.x + rect.width - turn.width,
  y: slot.corner.startsWith('top') ? rect.y : rect.y + rect.height - turn.height,
});
