import type { WorldObjectId } from '../../ids.ts';
import type { FloorDecal } from '../../world/decals.ts';
import type { ObjectPlacement } from '../../world/district.ts';
import type { WorldObjectDefinition } from '../../world/entities.ts';
import { objectFootprintSize, objectFootprintTiles } from '../../world/footprint.ts';
import { rectContains, tileKey, type Facing, type TilePoint, type TileRect } from '../../world/geometry.ts';
import { CONDITION_RULES, type Condition } from '../conditions.ts';
import { PREFABS } from '../prefabs/index.ts';
import { MAX_PREFAB_REPEATS, type Composed } from './compose.ts';
import { inWalkingLane, pieceTiles, turnsOf, type Turn } from './composeLayout.ts';
import { seededRandom, shuffle } from './seededRandom.ts';

export interface ConditionInput {
  readonly condition: Condition;
  readonly rect: TileRect;
  readonly seed: string;
  readonly composed: Composed;
  readonly clear: ReadonlySet<string>;
  readonly occupied: Set<string>;
  readonly objectOf: (id: WorldObjectId) => WorldObjectDefinition | undefined;
  readonly roomId?: string;
  readonly openings?: readonly TilePoint[];
}

const OPENING_CLEARANCE = 3;
const MIN_STAMP = 2;
const STAMP_SPAN = 3;
const STAMP_ATTEMPTS = 12;
const OPPOSITE: Readonly<Record<Facing, Facing>> = { north: 'south', south: 'north', east: 'west', west: 'east' };

const isDressing = (object: ObjectPlacement): boolean => object.instanceId.includes('-dressing-');
const perThousand = (rate: number, tiles: number): number => Math.round((rate * tiles) / 1000);
const pickFrom = <T>(items: readonly T[], random: () => number): T => items[Math.floor(random() * items.length)] as T;

export function applyCondition(input: ConditionInput): Composed {
  const { condition, rect, composed, clear, occupied, objectOf } = input;
  const rule = CONDITION_RULES[condition];
  if (condition === 'pristine') return composed;

  const random = seededRandom(input.seed);
  const roomId = input.roomId ?? 'room';
  const openings = input.openings ?? [];
  const floorTiles = [...clear].filter((key) => {
    const [x, y] = key.split(',').map(Number) as [number, number];
    return rectContains(rect, { x, y });
  }).length;

  const objects: ObjectPlacement[] = [...composed.objects];
  const decals: FloorDecal[] = [...composed.decals];
  const additions: string[] = [...(composed.additions ?? [])];
  const usesOf = (id: string): number => [...(composed.prefabs ?? []), ...additions].filter((used) => used === id).length;

  const eligible = objects.map((object, index) => ({ object, index })).filter(({ object }) => isDressing(object) && rule.swaps[object.objectId] !== undefined);
  const swapCount = Math.round(rule.swapShare * eligible.length);
  for (const { object, index } of shuffle(eligible, random).slice(0, swapCount)) {
    objects[index] = { ...object, objectId: rule.swaps[object.objectId] as WorldObjectId };
  }

  const nearOpening = (point: TilePoint): boolean => openings.some((opening) => Math.max(Math.abs(opening.x - point.x), Math.abs(opening.y - point.y)) <= OPENING_CLEARANCE);
  const isFree = (point: TilePoint): boolean => rectContains(rect, point) && clear.has(tileKey(point)) && !occupied.has(tileKey(point));

  const fitsAt = (origin: TilePoint, turn: Turn, clearance: number): boolean => {
    for (const tile of pieceTiles(origin, turn)) if (!isFree(tile) || nearOpening(tile) || inWalkingLane(rect, tile)) return false;
    for (let y = origin.y - clearance; y < origin.y + turn.height + clearance; y++) {
      for (let x = origin.x - clearance; x < origin.x + turn.width + clearance; x++) {
        const point = { x, y };
        if (!rectContains(rect, point) || !clear.has(tileKey(point)) || occupied.has(tileKey(point))) return false;
      }
    }
    return true;
  };

  const origins = (): TilePoint[] => {
    const points: TilePoint[] = [];
    for (let y = rect.y; y < rect.y + rect.height; y++) for (let x = rect.x; x < rect.x + rect.width; x++) points.push({ x, y });
    return shuffle(points, random);
  };

  const addCount = rule.adds.length === 0 ? 0 : perThousand(rule.addsPerThousandTiles, floorTiles);
  for (let added = 1; added <= addCount; added++) {
    const fresh = rule.adds.filter((id) => usesOf(id) < MAX_PREFAB_REPEATS);
    if (fresh.length === 0) break;
    const prefab = PREFABS[pickFrom(fresh, random)];
    if (!prefab) continue;
    const turns = turnsOf(prefab, objectOf);
    const first = Math.floor(random() * 4);
    const clearance = prefab.clearance ?? 1;
    let spot: { origin: TilePoint; turn: Turn } | undefined;
    for (const origin of origins()) {
      const turn = [0, 1, 2, 3].map((offset) => turns[(first + offset) % 4] as Turn).find((candidate) => fitsAt(origin, candidate, clearance));
      if (turn) {
        spot = { origin, turn };
        break;
      }
    }
    if (!spot) continue;
    for (const tile of pieceTiles(spot.origin, spot.turn)) occupied.add(tileKey(tile));
    additions.push(prefab.id);
    spot.turn.pieces.forEach((piece, index) => {
      objects.push({
        instanceId: `${roomId}-ruin-${added}-${index + 1}`,
        objectId: piece.objectId,
        position: { x: spot.origin.x + piece.dx, y: spot.origin.y + piece.dy },
        facing: piece.facing,
      });
    });
  }

  const stampCount = rule.decals.length === 0 ? 0 : perThousand(rule.decalsPerThousandTiles, floorTiles);
  for (let stamp = 0; stamp < stampCount; stamp++) {
    const kind = pickFrom(rule.decals, random);
    for (let attempt = 0; attempt < STAMP_ATTEMPTS; attempt++) {
      const width = MIN_STAMP + Math.floor(random() * STAMP_SPAN);
      const height = MIN_STAMP + Math.floor(random() * STAMP_SPAN);
      const x = rect.x + Math.floor(random() * Math.max(1, rect.width - width + 1));
      const y = rect.y + Math.floor(random() * Math.max(1, rect.height - height + 1));
      let onFloor = true;
      for (let dy = 0; dy < height && onFloor; dy++) for (let dx = 0; dx < width && onFloor; dx++) onFloor = clear.has(tileKey({ x: x + dx, y: y + dy })) && rectContains(rect, { x: x + dx, y: y + dy });
      if (!onFloor) continue;
      decals.push({ kind, rect: { x, y, width, height } });
      break;
    }
  }

  if (condition === 'uncanny') {
    for (const source of shuffle(objects.filter(isDressing), random)) {
      const facing = source.facing ?? 'south';
      const { width, height } = objectFootprintSize(objectOf(source.objectId), facing);
      const position = { x: 2 * rect.x + rect.width - source.position.x - width, y: 2 * rect.y + rect.height - source.position.y - height };
      const mirrored = { instanceId: `${roomId}-mirror-1`, objectId: source.objectId, position, facing: OPPOSITE[facing] };
      const tiles = objectFootprintTiles(objectOf(source.objectId), mirrored);
      if (!tiles.every((tile) => isFree(tile) && !nearOpening(tile))) continue;
      for (const tile of tiles) occupied.add(tileKey(tile));
      objects.push(mirrored);
      break;
    }
  }

  return { ...composed, objects, decals, additions };
}
