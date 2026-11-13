import type { NpcId, WorldObjectId } from '../../ids.ts';
import type { Blueprint } from '../../world/blueprint.ts';
import type { FloorDecal } from '../../world/decals.ts';
import type { DistrictDefinition, DressedRoom, NpcPlacement, ObjectPlacement } from '../../world/district.ts';
import type { WorldObjectDefinition } from '../../world/entities.ts';
import { objectFootprintTiles } from '../../world/footprint.ts';
import { rectContains, tileKey, type TilePoint } from '../../world/geometry.ts';
import { MAP_LEGEND, TILE_KINDS } from '../../world/tiles.ts';
import { ambientCast } from '../ambientNpcs.ts';
import { ASSEMBLY_OBJECTS } from '../assemblyObjects.ts';
import { CLUTTER_OBJECTS } from '../clutterObjects.ts';
import { CONTRACT_OBJECTS } from '../contractObjects.ts';
import { FURNITURE_OBJECTS } from '../furnitureObjects.ts';
import { LITTER_OBJECTS } from '../litterObjects.ts';
import { PREFABS, type DressingTheme } from '../prefabs/index.ts';
import { RUIN_OBJECTS } from '../ruinObjects.ts';
import { SET_PIECE_OBJECTS } from '../setPieceObjects.ts';
import { TRANSIT_OBJECTS } from '../transitObjects.ts';
import { WATERWORKS_OBJECTS } from '../waterworksObjects.ts';
import { pieceTiles, rotationOf, turnsOf, type Turn } from './prefabTurns.ts';
import { positionsOfWith } from './populate.ts';
import { hashSeed, seededRandom, shuffle } from './seededRandom.ts';
import type { SetPiece } from './setPiece.ts';

export interface RoomDressing {
  readonly theme: DressingTheme;
  readonly also?: readonly DressingTheme[];
  readonly people?: number;
  readonly cast?: readonly NpcId[];
}

export type Dressing = Readonly<Record<string, DressingTheme | RoomDressing>>;

export interface FurnishOptions {
  readonly cast?: readonly NpcId[];
  readonly setPieces?: readonly SetPiece[];
  readonly landmarks?: readonly string[];
}

const isFloorLitter = (objectId: string): boolean => objectId.startsWith('litter-') || objectId.startsWith('cable-run');
const TILES_PER_PERSON = 170;
const MAX_PEOPLE_PER_ROOM = 9;
const PEOPLE_INSET = 3;
const CROWD_SPACING = 4;
const GATHERING_POINTS: ReadonlySet<WorldObjectId> = new Set<WorldObjectId>(['briefing-bench', 'pew', 'stool', 'canteen-table', 'bench-curve']);
const CARDINAL: readonly TilePoint[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

const DRESSING_OBJECTS: ReadonlyMap<WorldObjectId, WorldObjectDefinition> = new Map(
  [...CLUTTER_OBJECTS, ...FURNITURE_OBJECTS, ...TRANSIT_OBJECTS, ...ASSEMBLY_OBJECTS, ...LITTER_OBJECTS, ...WATERWORKS_OBJECTS, ...CONTRACT_OBJECTS, ...RUIN_OBJECTS, ...SET_PIECE_OBJECTS].map((definition) => [definition.id, definition]),
);
export const dressingObjectOf = (id: WorldObjectId): WorldObjectDefinition | undefined => DRESSING_OBJECTS.get(id);

export function setPieceTurn(piece: Pick<SetPiece, 'prefab' | 'facing'>): Turn | undefined {
  const prefab = PREFABS[piece.prefab];
  return prefab ? turnsOf(prefab, dressingObjectOf)[rotationOf(piece.facing)] : undefined;
}

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

const dressingOf = (entry: DressingTheme | RoomDressing): RoomDressing => (typeof entry === 'string' ? { theme: entry } : entry);

export function furnish(plan: Blueprint, district: DistrictDefinition, dressing: Dressing, options: FurnishOptions = {}): DistrictDefinition {
  const tileAt = (point: TilePoint) => MAP_LEGEND[plan.map[point.y]?.[point.x] ?? ' '] ?? 'void';
  const isWalkable = (point: TilePoint) => TILE_KINDS[tileAt(point)].walkable;
  const isOpenFloor = (point: TilePoint) => isWalkable(point) && tileAt(point) !== 'door' && tileAt(point) !== 'hazard';

  const taken = new Set<string>(
    [
      ...positionsOfWith(dressingObjectOf, district.objects.filter((object) => !isFloorLitter(object.objectId)), district.assemblies ?? [], district.npcs, district.creatures ?? []),
      ...Object.values(district.anchors ?? {}),
      ...Object.values(district.exits ?? {}).flatMap((exit) => exit.tiles),
      ...Object.values(plan.links).flat(),
      ...(district.recovery?.districtId === district.id ? [district.recovery.position] : []),
    ].map(tileKey),
  );

  const decals: FloorDecal[] = [];
  const npcs: NpcPlacement[] = [];
  const setPieceObjects: ObjectPlacement[] = [];
  const setPiecesInRoom = new Map<string, number>();
  const log = new Map<string, DressedRoom>();
  const logOf = (room: string): DressedRoom => log.get(room) ?? { room, setPieces: [] };
  const blocked = new Set(taken);

  for (const piece of options.setPieces ?? []) {
    const where = `District "${district.id}" set-piece "${piece.prefab}" in room "${piece.room}"`;
    const turn = setPieceTurn(piece);
    if (!plan.rooms[piece.room]) throw new Error(`${where} names an unknown room.`);
    if (!turn) throw new Error(`${where} names an unknown prefab.`);
    const index = (setPiecesInRoom.get(piece.room) ?? 0) + 1;
    setPiecesInRoom.set(piece.room, index);
    const logged = logOf(piece.room);
    log.set(piece.room, { ...logged, setPieces: [...logged.setPieces, { prefab: piece.prefab, roles: PREFABS[piece.prefab]?.roles ?? [] }] });
    const tiles = pieceTiles(piece.origin, turn);
    for (const tile of tiles) if (blocked.has(tileKey(tile))) throw new Error(`${where} overlaps something already placed at ${tileKey(tile)}.`);
    for (const tile of tiles) blocked.add(tileKey(tile));
    turn.pieces.forEach((part, n) => {
      setPieceObjects.push({
        instanceId: piece.instanceId === undefined ? `${district.id}-${piece.room}-set-${index}-${n + 1}` : `${piece.instanceId}/${n + 1}`,
        objectId: part.objectId,
        position: { x: piece.origin.x + part.dx, y: piece.origin.y + part.dy },
        facing: part.facing,
      });
    });
    for (const decal of turn.decals) decals.push({ ...decal, rect: { ...decal.rect, x: piece.origin.x + decal.rect.x, y: piece.origin.y + decal.rect.y } });
    const clearance = PREFABS[piece.prefab]?.clearance ?? 1;
    for (let y = piece.origin.y - clearance; y < piece.origin.y + turn.height + clearance; y++) {
      for (let x = piece.origin.x - clearance; x < piece.origin.x + turn.width + clearance; x++) taken.add(tileKey({ x, y }));
    }
  }

  const safeRooms = new Set(district.areas.filter((area) => area.safe).map((area) => area.id));

  for (const [roomId, entry] of Object.entries(dressing)) {
    const rect = plan.rooms[roomId];
    if (!rect) throw new Error(`District "${district.id}" dresses unknown room "${roomId}".`);
    const { theme, also, people, cast } = dressingOf(entry);
    const floor: TilePoint[] = [];
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) if (isOpenFloor({ x, y })) floor.push({ x, y });
    }
    log.set(roomId, { ...logOf(roomId), theme, ...(also ? { also } : {}) });

    if (!safeRooms.has(roomId)) continue;
    const random = seededRandom(`${district.id}:${roomId}:crowd`);
    const crowd = cast ?? options.cast ?? THEME_CAST[theme];
    const headcount = people ?? Math.min(MAX_PEOPLE_PER_ROOM, Math.floor(floor.length / TILES_PER_PERSON));
    const inset = { x: rect.x + PEOPLE_INSET, y: rect.y + PEOPLE_INSET, width: rect.width - PEOPLE_INSET * 2, height: rect.height - PEOPLE_INSET * 2 };
    const gathering = new Set([...setPieceObjects, ...district.objects].filter((object) => rectContains(rect, object.position)).filter((object) => GATHERING_POINTS.has(object.objectId)).map((object) => tileKey(object.position)));
    const nearGathering = (point: TilePoint): boolean => CARDINAL.some((step) => gathering.has(tileKey({ x: point.x + step.x, y: point.y + step.y })));
    const standing = shuffle(
      floor.filter((point) => rectContains(inset, point) && !taken.has(tileKey(point))),
      random,
    );
    const ordered = [...standing.filter(nearGathering), ...standing.filter((point) => !nearGathering(point))];
    const chosen: TilePoint[] = [];
    for (const point of ordered) {
      if (chosen.length >= headcount || crowd.length === 0) break;
      if (chosen.some((other) => Math.max(Math.abs(other.x - point.x), Math.abs(other.y - point.y)) < CROWD_SPACING)) continue;
      chosen.push(point);
    }
    chosen.forEach((position, index) => {
      taken.add(tileKey(position));
      npcs.push({ instanceId: `${roomId}-crowd-${index + 1}`, npcId: crowd[(hashSeed(`${district.id}:${roomId}`) + index) % crowd.length] as NpcId, position });
    });
  }

  const covered = new Set(setPieceObjects.flatMap((object) => objectFootprintTiles(dressingObjectOf(object.objectId), object)).map(tileKey));
  return {
    ...district,
    npcs: [...district.npcs, ...npcs.map((npc) => ({ ...npc, instanceId: `${district.id}-${npc.instanceId}` }))],
    objects: [
      ...district.objects.filter((object) => !(isFloorLitter(object.objectId) && covered.has(tileKey(object.position)))),
      ...setPieceObjects,
    ],
    ...(decals.length > 0 || district.decals ? { decals: [...(district.decals ?? []), ...decals] } : {}),
    ...(options.landmarks ? { landmarks: options.landmarks } : {}),
    dressingLog: [...log.values()],
  };
}
