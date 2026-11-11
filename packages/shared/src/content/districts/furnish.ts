import type { NpcId } from '../../ids.ts';
import type { Blueprint } from '../../world/blueprint.ts';
import type { DistrictDefinition, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import { rectContains, tileKey, type Facing, type TilePoint, type TileRect } from '../../world/geometry.ts';
import { MAP_LEGEND, TILE_KINDS } from '../../world/tiles.ts';
import { ambientCast } from '../ambientNpcs.ts';
import { PREFABS, THEME_PREFABS, type DressingTheme, type Prefab, type PrefabPiece } from '../prefabs.ts';
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

const TILES_PER_PREFAB: Readonly<Record<DressingDensity, number>> = { sparse: 75, normal: 42, dense: 28 };
const OBJECTS_PER_PREFAB = 3;
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
const TURNS = [0, 1, 2, 3];
const PLACEMENT_ATTEMPTS = 3;

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

const dressingOf = (entry: DressingTheme | RoomDressing): RoomDressing => (typeof entry === 'string' ? { theme: entry } : entry);

export function furnish(plan: Blueprint, district: DistrictDefinition, dressing: Dressing, options: FurnishOptions = {}): DistrictDefinition {
  const tileAt = (point: TilePoint) => MAP_LEGEND[plan.map[point.y]?.[point.x] ?? ' '] ?? 'void';
  const isWalkable = (point: TilePoint) => TILE_KINDS[tileAt(point)].walkable;
  const isOpenFloor = (point: TilePoint) => isWalkable(point) && tileAt(point) !== 'door' && tileAt(point) !== 'hazard';

  const taken = new Set<string>(
    [
      ...positionsOf(district.objects, district.assemblies ?? [], district.npcs, district.creatures ?? []),
      ...Object.values(district.anchors ?? {}),
      ...Object.values(district.exits ?? {}).flatMap((exit) => exit.tiles),
      ...Object.values(plan.links).flat(),
      ...(district.recovery?.districtId === district.id ? [district.recovery.position] : []),
    ].map(tileKey),
  );

  const nearOpening = (rect: TileRect, point: TilePoint): boolean => {
    for (let dy = -OPENING_CLEARANCE - 1; dy <= OPENING_CLEARANCE + 1; dy++) {
      for (let dx = -OPENING_CLEARANCE - 1; dx <= OPENING_CLEARANCE + 1; dx++) {
        const near = { x: point.x + dx, y: point.y + dy };
        if (isWalkable(near) && !rectContains(rect, near)) return true;
        if (tileAt(near) === 'door') return true;
      }
    }
    return false;
  };

  const inWalkingLane = (rect: TileRect, point: TilePoint): boolean => {
    const long = Math.max(rect.width, rect.height) >= THOROUGHFARE_RATIO * Math.min(rect.width, rect.height);
    const centre = { x: rect.x + (rect.width - 1) / 2, y: rect.y + (rect.height - 1) / 2 };
    if (long) {
      const across = rect.width >= rect.height ? Math.abs(point.y - centre.y) : Math.abs(point.x - centre.x);
      return across <= THOROUGHFARE_HALF_WIDTH;
    }
    return Math.abs(point.x - centre.x) <= LANE_HALF_WIDTH || Math.abs(point.y - centre.y) <= LANE_HALF_WIDTH;
  };

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

  const objectsInRoom = (rect: TileRect): number => district.objects.filter((placement) => rectContains(rect, placement.position) && !isFloorLitter(placement.objectId)).length;

  const objects: ObjectPlacement[] = [];
  const npcs: NpcPlacement[] = [];
  const safeRooms = new Set(district.areas.filter((area) => area.safe).map((area) => area.id));

  for (const [roomId, entry] of Object.entries(dressing)) {
    const rect = plan.rooms[roomId];
    if (!rect) throw new Error(`District "${district.id}" dresses unknown room "${roomId}".`);
    const { theme, density = 'normal', people, cast } = dressingOf(entry);
    const random = seededRandom(`${district.id}:${roomId}:dressing`);
    const floor: TilePoint[] = [];
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) if (isOpenFloor({ x, y })) floor.push({ x, y });
    }

    const wanted = Math.max(0, Math.round(floor.length / TILES_PER_PREFAB[density] - objectsInRoom(rect) / OBJECTS_PER_PREFAB));
    const weighted = THEME_PREFABS[theme];
    const totalWeight = weighted.reduce((sum, [, weight]) => sum + weight, 0);
    const choosePrefab = (): Prefab => {
      let roll = random() * totalWeight;
      for (const [name, weight] of weighted) {
        roll -= weight;
        if (roll < 0) return PREFABS[name];
      }
      return PREFABS[(weighted[0] as (typeof weighted)[number])[0]];
    };

    const alignedTurn = Math.floor(random() * TURNS.length);
    const clear = new Set(floor.filter((point) => !nearOpening(rect, point) && !inWalkingLane(rect, point)).map(tileKey));
    const candidates = shuffle([...floor], random);
    const findSpot = (prefab: Prefab): { readonly origin: TilePoint; readonly pieces: readonly PrefabPiece[] } | undefined => {
      const turns = rotations(prefab);
      const order = prefab.placement === 'aligned' ? [alignedTurn] : shuffle([...TURNS], random);
      const start = Math.floor(random() * candidates.length);
      for (let step = 0; step < candidates.length; step++) {
        const origin = candidates[(start + step) % candidates.length] as TilePoint;
        if (taken.has(tileKey(origin))) continue;
        for (const index of order) {
          const turn = turns[index] as Turn;
          if (fits(rect, clear, origin, turn, prefab.placement === 'wall' ? BACK_SIDE[index] : undefined)) return { origin, pieces: turn.pieces };
        }
      }
      return undefined;
    };

    let placedCount = 0;
    for (let attempt = 0; placedCount < wanted && attempt < wanted * PLACEMENT_ATTEMPTS; attempt++) {
      const spot = findSpot(choosePrefab());
      if (!spot) continue;
      const { origin, pieces } = spot;
      placedCount += 1;
      pieces.forEach((piece, index) => {
        const position = { x: origin.x + piece.dx, y: origin.y + piece.dy };
        taken.add(tileKey(position));
        objects.push({
          instanceId: `${roomId}-dressing-${placedCount}-${index + 1}`,
          objectId: piece.objectId,
          position,
          ...(piece.facing ? { facing: piece.facing } : {}),
        });
      });
    }

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

  return {
    ...district,
    npcs: [...district.npcs, ...npcs.map((npc) => ({ ...npc, instanceId: `${district.id}-${npc.instanceId}` }))],
    objects: [...district.objects, ...objects.map((object) => ({ ...object, instanceId: `${district.id}-${object.instanceId}` }))],
  };
}
