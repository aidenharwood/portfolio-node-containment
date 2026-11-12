import type { NpcId } from '../../ids.ts';
import type { Blueprint } from '../../world/blueprint.ts';
import type { DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import { rectContains, tileKey, type Facing, type TilePoint, type TileRect } from '../../world/geometry.ts';
import { MAP_LEGEND, TILE_KINDS } from '../../world/tiles.ts';
import { ambientCast } from '../ambientNpcs.ts';
import type { WorldObjectId } from '../../ids.ts';
import { PREFABS, THEME_LAYOUTS, type DressingTheme, type Prefab, type PrefabPiece } from '../prefabs.ts';
import { positionsOf } from './populate.ts';

export type DressingDensity = 'sparse' | 'normal' | 'dense';

export interface RoomDressing {
  readonly theme: DressingTheme;
  readonly density?: DressingDensity;
  readonly people?: number;
  readonly cast?: readonly NpcId[];
}

export type Dressing = Readonly<Record<string, DressingTheme | RoomDressing>>;

export interface FurnishOptions {
  readonly cast?: readonly NpcId[];
}

const TILES_PER_BLOCK: Readonly<Record<DressingDensity, number>> = { sparse: 110, normal: 64, dense: 40 };
const WALL_GAP: Readonly<Record<DressingDensity, number>> = { sparse: 6, normal: 3, dense: 2 };
const MIN_GUTTER = 2;
const FIELD_AISLE = 2;
const CORNER_MARGIN = 2;
const isFloorLitter = (objectId: string): boolean => objectId.startsWith('litter-') || objectId.startsWith('cable-run');
const TILES_PER_PERSON = 170;
const MAX_PEOPLE_PER_ROOM = 9;
const PEOPLE_INSET = 3;
const OPENING_CLEARANCE = 2;
const THOROUGHFARE_RATIO = 2.5;
const THOROUGHFARE_HALF_WIDTH = 2.5;
const LANE_HALF_WIDTH = 1.5;

const THEME_CAST: Readonly<Record<DressingTheme, readonly NpcId[]>> = {
  civic: ambientCast('staffer', 'operative', 'clerk', 'security', 'janitor'),
  office: ambientCast('clerk', 'staffer', 'security'),
  canteen: ambientCast('cook', 'staffer', 'operative', 'technician'),
  dormitory: ambientCast('operative', 'staffer', 'freight', 'janitor'),
  industrial: ambientCast('technician', 'freight'),
  freight: ambientCast('freight', 'technician'),
  medical: ambientCast('orderly', 'staffer', 'janitor'),
  lab: ambientCast('researcher', 'technician'),
  garden: ambientCast('staffer', 'researcher', 'technician'),
  wet: ambientCast('technician', 'janitor'),
  mine: ambientCast('saltworker'),
  chapel: ambientCast('saltworker'),
  ward: ambientCast('porter', 'orderly'),
  archive: ambientCast('clerk', 'researcher'),
  post: ambientCast('clerk'),
  camp: ambientCast('operative', 'technician', 'security'),
  cold: ambientCast('deckhand', 'researcher'),
  works: ambientCast('technician'),
};

const FACING_TURN: Readonly<Record<Facing, Facing>> = { south: 'west', west: 'north', north: 'east', east: 'south' };

const turnPiece = (piece: PrefabPiece, height: number): PrefabPiece => ({
  dx: height - 1 - piece.dy,
  dy: piece.dx,
  objectId: piece.objectId,
  facing: FACING_TURN[piece.facing ?? 'south'],
});

const BACK_SIDE: readonly Facing[] = ['north', 'east', 'south', 'west'];
const INWARD: Readonly<Record<Facing, Facing>> = { north: 'south', south: 'north', east: 'west', west: 'east' };
const TURNS_BY_BACK = [0, 2, 1, 3];

interface Turn {
  readonly pieces: readonly PrefabPiece[];
  readonly width: number;
  readonly height: number;
}

const turnOf = (pieces: readonly PrefabPiece[]): Turn => ({
  pieces,
  width: Math.max(...pieces.map((piece) => piece.dx)) + 1,
  height: Math.max(...pieces.map((piece) => piece.dy)) + 1,
});

const ROTATIONS = new Map<Prefab, readonly Turn[]>();

const rotations = (prefab: Prefab): readonly Turn[] => {
  const cached = ROTATIONS.get(prefab);
  if (cached) return cached;
  const turns: Turn[] = [turnOf(prefab.pieces.map((piece) => ({ ...piece, facing: piece.facing ?? 'south' })))];
  for (let turn = 1; turn < 4; turn++) {
    const previous = turns[turn - 1] as Turn;
    turns.push(turnOf(previous.pieces.map((piece) => turnPiece(piece, previous.height))));
  }
  ROTATIONS.set(prefab, turns);
  return turns;
};

const hashSeed = (seed: string): number => {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
};

const seededRandom = (seed: string): (() => number) => {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = <T>(items: T[], random: () => number): T[] => {
  for (let index = items.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [items[index], items[swap]] = [items[swap] as T, items[index] as T];
  }
  return items;
};

const gutterFor = (width: number, height: number, density: DressingDensity): number => {
  const target = TILES_PER_BLOCK[density];
  const gutter = (-(width + height) + Math.sqrt((width - height) ** 2 + 4 * target)) / 2;
  return Math.max(MIN_GUTTER, Math.round(gutter));
};

interface Lane {
  readonly x?: number;
  readonly y?: number;
}

const laneOf = (rect: TileRect): Lane => {
  const long = Math.max(rect.width, rect.height) >= THOROUGHFARE_RATIO * Math.min(rect.width, rect.height);
  if (!long) return { x: LANE_HALF_WIDTH, y: LANE_HALF_WIDTH };
  return rect.width >= rect.height ? { y: THOROUGHFARE_HALF_WIDTH } : { x: THOROUGHFARE_HALF_WIDTH };
};

const centreOf = (rect: TileRect): TilePoint => ({ x: rect.x + (rect.width - 1) / 2, y: rect.y + (rect.height - 1) / 2 });

const inWalkingLane = (rect: TileRect, point: TilePoint): boolean => {
  const lane = laneOf(rect);
  const centre = centreOf(rect);
  return (lane.x !== undefined && Math.abs(point.x - centre.x) <= lane.x) || (lane.y !== undefined && Math.abs(point.y - centre.y) <= lane.y);
};

const gridOrigins = (rect: TileRect, field: TileRect, turn: Turn, density: DressingDensity): TilePoint[] => {
  const gutter = gutterFor(turn.width, turn.height, density);
  const lane = laneOf(rect);
  const centre = centreOf(rect);
  const spread = (start: number, span: number, size: number): number[] => {
    const pitch = size + gutter;
    const count = Math.max(0, Math.floor((span + gutter) / pitch));
    const first = start + Math.floor((span - (count * pitch - gutter)) / 2);
    return Array.from({ length: count }, (_, index) => first + index * pitch);
  };
  const axis = (start: number, span: number, size: number, roomStart: number, roomSpan: number, middle: number, half?: number): number[] => {
    if (half === undefined) return spread(start, span, size);
    const beyond = Math.floor(middle + half) + 1;
    const far = spread(beyond, start + span - beyond, size);
    return [...far.map((position) => 2 * roomStart + roomSpan - position - size).reverse(), ...far];
  };
  const columns = axis(field.x, field.width, turn.width, rect.x, rect.width, centre.x, lane.x);
  return axis(field.y, field.height, turn.height, rect.y, rect.height, centre.y, lane.y).flatMap((y) => columns.map((x) => ({ x, y })));
};

const dressingOf = (entry: DressingTheme | RoomDressing): RoomDressing => (typeof entry === 'string' ? { theme: entry } : entry);

export function furnish(plan: Blueprint, district: DistrictDefinition, dressing: Dressing, options: FurnishOptions = {}): DistrictDefinition {
  const tileAt = (point: TilePoint) => MAP_LEGEND[plan.map[point.y]?.[point.x] ?? ' '] ?? 'void';
  const isWalkable = (point: TilePoint) => TILE_KINDS[tileAt(point)].walkable;
  const isOpenFloor = (point: TilePoint) => isWalkable(point) && tileAt(point) !== 'door' && tileAt(point) !== 'hazard';

  const taken = new Set<string>(
    [
      ...positionsOf(district.objects.filter((object) => !isFloorLitter(object.objectId)), district.assemblies ?? [], district.npcs, district.creatures ?? []),
      ...Object.values(district.anchors ?? {}),
      ...Object.values(district.exits ?? {}).flatMap((exit) => exit.tiles),
      ...Object.values(plan.links).flat(),
      ...(district.recovery?.districtId === district.id ? [district.recovery.position] : []),
    ].map(tileKey),
  );

  const openingsOf = (rect: TileRect): TilePoint[] => {
    const openings: TilePoint[] = [];
    for (let y = rect.y - 1; y <= rect.y + rect.height; y++) {
      for (let x = rect.x - 1; x <= rect.x + rect.width; x++) {
        const point = { x, y };
        if (tileAt(point) === 'door') {
          openings.push(point);
          continue;
        }
        if (rectContains(rect, point) || !isWalkable(point)) continue;
        const inside = [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }];
        if (inside.some((neighbour) => rectContains(rect, neighbour) && isWalkable(neighbour))) openings.push(point);
      }
    }
    return openings;
  };

  const nearOpening = (openings: readonly TilePoint[], point: TilePoint): boolean =>
    openings.some((opening) => Math.max(Math.abs(opening.x - point.x), Math.abs(opening.y - point.y)) <= OPENING_CLEARANCE + 1);

  const fits = (rect: TileRect, clear: ReadonlySet<string>, origin: TilePoint, turn: Turn, back?: Facing): boolean => {
    const { pieces, width, height } = turn;
    if (back) {
      const length = back === 'north' || back === 'south' ? width : height;
      for (let index = 0; index < length; index++) {
        const point =
          back === 'north' || back === 'south'
            ? { x: origin.x + index, y: back === 'north' ? origin.y - 1 : origin.y + height }
            : { x: back === 'west' ? origin.x - 1 : origin.x + width, y: origin.y + index };
        if (isWalkable(point)) return false;
      }
    }
    for (const piece of pieces) if (!clear.has(tileKey({ x: origin.x + piece.dx, y: origin.y + piece.dy }))) return false;
    const left = back === 'west' ? origin.x : origin.x - 1;
    const right = back === 'east' ? origin.x + width - 1 : origin.x + width;
    const top = back === 'north' ? origin.y : origin.y - 1;
    const bottom = back === 'south' ? origin.y + height - 1 : origin.y + height;
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const point = { x, y };
        if (!rectContains(rect, point) || !isOpenFloor(point) || taken.has(tileKey(point))) return false;
      }
    }
    return true;
  };

  const objects: ObjectPlacement[] = [];
  const npcs: NpcPlacement[] = [];
  const safeRooms = new Set(district.areas.filter((area) => area.safe).map((area) => area.id));

  for (const [roomId, entry] of Object.entries(dressing)) {
    const rect = plan.rooms[roomId];
    if (!rect) throw new Error(`District "${district.id}" dresses unknown room "${roomId}".`);
    const { theme, density = 'normal', people, cast } = dressingOf(entry);
    const random = seededRandom(`${district.id}:${roomId}:dressing`);
    const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;
    const floor: TilePoint[] = [];
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) if (isOpenFloor({ x, y })) floor.push({ x, y });
    }
    const openings = openingsOf(rect);
    const clear = new Set(floor.filter((point) => !nearOpening(openings, point) && !inWalkingLane(rect, point)).map(tileKey));
    const layout = THEME_LAYOUTS[theme];

    let blockCount = 0;
    const place = (origin: TilePoint, pieces: readonly PrefabPiece[]): void => {
      blockCount += 1;
      pieces.forEach((piece, index) => {
        const position = { x: origin.x + piece.dx, y: origin.y + piece.dy };
        taken.add(tileKey(position));
        objects.push({ instanceId: `${roomId}-dressing-${blockCount}-${index + 1}`, objectId: piece.objectId, position, facing: piece.facing ?? 'south' });
      });
    };

    if (layout.corner) {
      const single = (back: Facing): Turn => turnOf([{ dx: 0, dy: 0, objectId: layout.corner as WorldObjectId, facing: INWARD[back] }]);
      const corners: readonly (readonly [TilePoint, Facing])[] = [
        [{ x: rect.x, y: rect.y }, 'north'],
        [{ x: rect.x + rect.width - 1, y: rect.y }, 'north'],
        [{ x: rect.x, y: rect.y + rect.height - 1 }, 'south'],
        [{ x: rect.x + rect.width - 1, y: rect.y + rect.height - 1 }, 'south'],
      ];
      for (const [point, back] of corners) {
        const turn = single(back);
        if (fits(rect, clear, point, turn, back)) place(point, turn.pieces);
      }
    }

    const wallPrefabs: readonly Prefab[] = [PREFABS[pick(layout.wall)], PREFABS[pick(layout.wall)]];
    let wallDepth = 0;
    TURNS_BY_BACK.forEach((turnIndex, sideIndex) => {
      const back = BACK_SIDE[turnIndex] as Facing;
      const turn = rotations(wallPrefabs[Math.floor(sideIndex / 2)] as Prefab)[turnIndex] as Turn;
      const alongX = back === 'north' || back === 'south';
      const length = alongX ? turn.width : turn.height;
      const runStart = (alongX ? rect.x : rect.y) + CORNER_MARGIN;
      const runLength = (alongX ? rect.width : rect.height) - CORNER_MARGIN * 2;
      const pitch = length + WALL_GAP[density];
      const count = Math.floor((runLength + WALL_GAP[density]) / pitch);
      if (count <= 0) return;
      wallDepth = Math.max(wallDepth, alongX ? turn.height : turn.width);
      const first = runStart + Math.floor((runLength - (count * pitch - WALL_GAP[density])) / 2);
      for (let slot = 0; slot < count; slot++) {
        const along = first + slot * pitch;
        const origin = alongX
          ? { x: along, y: back === 'north' ? rect.y : rect.y + rect.height - turn.height }
          : { x: back === 'west' ? rect.x : rect.x + rect.width - turn.width, y: along };
        if (fits(rect, clear, origin, turn, back)) place(origin, turn.pieces);
      }
    });

    const fieldInset = wallDepth + FIELD_AISLE;
    const field = { x: rect.x + fieldInset, y: rect.y + fieldInset, width: rect.width - fieldInset * 2, height: rect.height - fieldInset * 2 };
    const fieldPrefab = PREFABS[pick(layout.field)];
    const preferred = Math.floor(random() * 4);
    let best: { readonly turn: Turn; readonly origins: readonly TilePoint[] } | undefined;
    for (let step = 0; step < 4; step++) {
      const turn = rotations(fieldPrefab)[(preferred + step) % 4] as Turn;
      const origins = gridOrigins(rect, field, turn, density).filter((origin) => fits(rect, clear, origin, turn));
      if (!best || origins.length > best.origins.length) best = { turn, origins };
    }
    if (best) for (const origin of best.origins) if (fits(rect, clear, origin, best.turn)) place(origin, best.turn.pieces);

    if (!safeRooms.has(roomId)) continue;
    const crowd = cast ?? options.cast ?? THEME_CAST[theme];
    const headcount = people ?? Math.min(MAX_PEOPLE_PER_ROOM, Math.floor(floor.length / TILES_PER_PERSON));
    const inset = { x: rect.x + PEOPLE_INSET, y: rect.y + PEOPLE_INSET, width: rect.width - PEOPLE_INSET * 2, height: rect.height - PEOPLE_INSET * 2 };
    const standing = shuffle(
      floor.filter((point) => rectContains(inset, point) && !taken.has(tileKey(point))),
      random,
    );
    const chosen: TilePoint[] = [];
    for (const point of standing) {
      if (chosen.length >= headcount || crowd.length === 0) break;
      if (chosen.some((other) => Math.max(Math.abs(other.x - point.x), Math.abs(other.y - point.y)) < 4)) continue;
      chosen.push(point);
    }
    chosen.forEach((position, index) => {
      taken.add(tileKey(position));
      npcs.push({ instanceId: `${roomId}-crowd-${index + 1}`, npcId: crowd[(hashSeed(`${district.id}:${roomId}`) + index) % crowd.length] as NpcId, position });
    });
  }

  const covered = new Set(objects.map((object) => tileKey(object.position)));
  return {
    ...district,
    npcs: [...district.npcs, ...npcs.map((npc) => ({ ...npc, instanceId: `${district.id}-${npc.instanceId}` }))],
    objects: [...district.objects.filter((object) => !(isFloorLitter(object.objectId) && covered.has(tileKey(object.position)))), ...objects.map((object) => ({ ...object, instanceId: `${district.id}-${object.instanceId}` }))],
  };
}
