import { createObjectWalkabilityGrid, parseTileLayout, type DistrictDefinition, type DressedRoom, type TileLayout } from '../world/district.ts';
import { doorTilesOf, withOpenDoors } from '../world/doors.ts';
import { objectFootprintSize, objectFootprintTiles } from '../world/footprint.ts';
import { CARDINAL_OFFSETS, chebyshevDistance, rectContains, tileKey, type TilePoint, type TileRect } from '../world/geometry.ts';
import type { ResolvedLevel } from '../world/levelLayout.ts';
import type { WalkabilityGrid } from '../world/pathfinding.ts';
import { TILE_KINDS } from '../world/tiles.ts';
import { CONDITION_RULES } from './conditions.ts';
import { MAX_PREFAB_REPEATS } from './districts/compose.ts';
import type { GameContent } from './gameContent.ts';
import { findPrefabIssues, findPrefabLibraryIssues, PREFABS } from './prefabs/index.ts';

export const OPENING_CLEARANCE = 2;
export const VARIETY_ROOM_TILES = 150;
export const MIN_PREFABS_IN_LARGE_ROOM = 3;

type Report = (problem: string) => void;

const COMPOSED_ID = /-(dressing|ruin|mirror)-\d/;
const SET_PIECE_ID = /(\/\d+|-set-\d+-\d+)$/;

const isWalkableTile = (layout: TileLayout, point: TilePoint): boolean => TILE_KINDS[layout.tileAt(point)].walkable;

const tilesOf = (rect: TileRect): TilePoint[] => {
  const tiles: TilePoint[] = [];
  for (let y = rect.y; y < rect.y + rect.height; y++) for (let x = rect.x; x < rect.x + rect.width; x++) tiles.push({ x, y });
  return tiles;
};

function openingsOf(layout: TileLayout, rect: TileRect): TilePoint[] {
  const around = tilesOf({ x: rect.x - 1, y: rect.y - 1, width: rect.width + 2, height: rect.height + 2 });
  return around.filter((point) => {
    if (layout.tileAt(point) === 'door') return true;
    if (rectContains(rect, point) || !isWalkableTile(layout, point)) return false;
    return CARDINAL_OFFSETS.some((offset) => {
      const inside = { x: point.x + offset.x, y: point.y + offset.y };
      return rectContains(rect, inside) && isWalkableTile(layout, inside);
    });
  });
}

function findClearanceIssues(content: GameContent, district: DistrictDefinition, layout: TileLayout, report: Report): void {
  const rooms = Object.values(district.rooms ?? {});
  const openings = new Map(Object.entries(district.rooms ?? {}).map(([room, rect]) => [room, openingsOf(layout, rect)]));
  const roomOf = (instanceId: string): string | undefined =>
    [...openings.keys()].filter((room) => instanceId.startsWith(`${district.id}-${room}-`)).sort((a, b) => b.length - a.length)[0];
  const reserved = new Map<string, string>();
  for (const [id, point] of Object.entries(district.anchors ?? {})) reserved.set(tileKey(point), `anchor "${id}"`);
  for (const [id, exit] of Object.entries(district.exits ?? {})) for (const tile of exit.tiles) reserved.set(tileKey(tile), `exit "${id}"`);
  const forbidden = (point: TilePoint): string | undefined => {
    const kind = layout.tileAt(point);
    if (kind === 'door' || kind === 'track') return `a ${kind} tile`;
    const named = reserved.get(tileKey(point));
    if (named) return named;
    return rooms.some((rect) => rectContains(rect, point)) ? undefined : 'a link outside every room';
  };
  for (const object of district.objects) {
    const composed = COMPOSED_ID.test(object.instanceId);
    if (!composed && !SET_PIECE_ID.test(object.instanceId)) continue;
    const tiles = objectFootprintTiles(content.worldObjects.get(object.objectId), object);
    const covered = tiles.map(forbidden).find((what) => what !== undefined);
    if (covered) {
      report(`"${object.instanceId}" covers ${covered}`);
      continue;
    }
    if (!composed) continue;
    const crowded = (openings.get(roomOf(object.instanceId) ?? '') ?? [...openings.values()].flat()).find((opening) => tiles.some((tile) => chebyshevDistance(tile, opening) <= OPENING_CLEARANCE));
    if (crowded) report(`"${object.instanceId}" stands within ${OPENING_CLEARANCE} tiles of the room opening at ${crowded.x},${crowded.y}`);
  }
}

function findLandmarkIssues(district: DistrictDefinition, report: Report): void {
  for (const room of district.landmarks ?? []) {
    if (!district.rooms?.[room]) {
      report(`landmark room "${room}" is no such room`);
      continue;
    }
    const pieces = district.dressingLog?.find((entry) => entry.room === room)?.setPieces ?? [];
    if (!pieces.some((piece) => piece.roles.includes('focal'))) report(`landmark room "${room}" has no set-piece with a focal prefab`);
  }
}

function findVarietyIssues(district: DistrictDefinition, layout: TileLayout, report: Report): void {
  for (const entry of district.dressingLog ?? []) findRoomVarietyIssues(entry, district.rooms?.[entry.room], layout, report);
}

function findRoomVarietyIssues(entry: DressedRoom, rect: TileRect | undefined, layout: TileLayout, report: Report): void {
  if (!rect) return;
  const walkable = tilesOf(rect).filter((point) => isWalkableTile(layout, point)).length;
  const distinct = new Set([...entry.prefabs, ...entry.additions, ...entry.setPieces.map((piece) => piece.prefab)]).size;
  if (walkable > VARIETY_ROOM_TILES && distinct < MIN_PREFABS_IN_LARGE_ROOM) {
    report(`room "${entry.room}" has ${walkable} walkable tiles but uses ${distinct} distinct prefab(s); rooms over ${VARIETY_ROOM_TILES} tiles need ${MIN_PREFABS_IN_LARGE_ROOM}`);
  }
  if (entry.formal) return;
  const uses = new Map<string, number>();
  for (const prefab of [...entry.prefabs, ...entry.additions]) uses.set(prefab, (uses.get(prefab) ?? 0) + 1);
  for (const [prefab, count] of uses) {
    if (count > MAX_PREFAB_REPEATS) report(`room "${entry.room}" uses prefab "${prefab}" ${count} times; an informal room uses each at most ${MAX_PREFAB_REPEATS} times`);
  }
}

function findDecalIssues(district: DistrictDefinition, layout: TileLayout, report: Report): void {
  for (const decal of district.decals ?? []) {
    const bad = tilesOf(decal.rect).find((point) => !isWalkableTile(layout, point) || layout.tileAt(point) === 'door');
    if (bad) report(`${decal.kind} decal at ${decal.rect.x},${decal.rect.y} lies on ${layout.tileAt(bad)} at ${bad.x},${bad.y}; decals lie on walkable floor`);
  }
}

function gridOf(content: GameContent, level: ResolvedLevel): WalkabilityGrid {
  const definitionOf = (objectId: string) => content.worldObjects.get(objectId);
  const grid = createObjectWalkabilityGrid(level.layout, level.objects, definitionOf);
  return withOpenDoors(grid, level.layout, doorTilesOf(level.objects, definitionOf), () => true);
}

function unreachedIn(rect: TileRect, grid: WalkabilityGrid, anchors: readonly TilePoint[]): TilePoint[] {
  const walkable = tilesOf(rect).filter((point) => grid.isWalkable(point));
  const entrances = walkable.filter((point) =>
    CARDINAL_OFFSETS.some((offset) => {
      const outside = { x: point.x + offset.x, y: point.y + offset.y };
      return !rectContains(rect, outside) && grid.isWalkable(outside);
    }),
  );
  const seeds = [...entrances, ...anchors.filter((point) => rectContains(rect, point) && grid.isWalkable(point))];
  if (seeds.length === 0 && walkable[0]) seeds.push(walkable[0]);
  const seen = new Set(seeds.map(tileKey));
  const queue = [...seeds];
  for (let index = 0; index < queue.length; index++) {
    const here = queue[index] as TilePoint;
    for (const offset of CARDINAL_OFFSETS) {
      const next = { x: here.x + offset.x, y: here.y + offset.y };
      if (!rectContains(rect, next) || seen.has(tileKey(next)) || !grid.isWalkable(next)) continue;
      seen.add(tileKey(next));
      queue.push(next);
    }
  }
  return walkable.filter((point) => !seen.has(tileKey(point)));
}

function findReachabilityIssues(content: GameContent, level: ResolvedLevel, issues: string[]): void {
  const grid = gridOf(content, level);
  for (const placement of level.definition.districts) {
    const district = content.districts.get(placement.districtId);
    if (!district?.rooms) continue;
    const { origin } = placement;
    const anchors = Object.values(district.anchors ?? {}).map((point) => ({ x: point.x + origin.x, y: point.y + origin.y }));
    for (const [room, local] of Object.entries(district.rooms)) {
      const unreached = unreachedIn({ ...local, x: local.x + origin.x, y: local.y + origin.y }, grid, anchors);
      const first = unreached[0];
      if (first) {
        issues.push(
          `district ${district.id}: room "${room}" has ${unreached.length} unreachable walkable tile(s), first at ${first.x - origin.x},${first.y - origin.y}; dressing and fixtures must not seal off floor`,
        );
      }
    }
  }
}

function findConditionIssues(content: GameContent, issues: string[]): void {
  for (const [condition, rule] of Object.entries(CONDITION_RULES)) {
    for (const [source, target] of Object.entries(rule.swaps)) {
      const from = content.worldObjects.get(source);
      const to = target === undefined ? undefined : content.worldObjects.get(target);
      if (!from) issues.push(`condition ${condition}: swap source "${source}" is no object`);
      if (!to) issues.push(`condition ${condition}: swap target "${target}" is no object`);
      if (!from || !to) continue;
      const a = objectFootprintSize(from);
      const b = objectFootprintSize(to);
      if (a.width !== b.width || a.height !== b.height) issues.push(`condition ${condition}: "${source}" (${a.width}×${a.height}) swaps to "${target}" (${b.width}×${b.height}); swaps keep their footprint`);
    }
    for (const prefab of rule.adds) if (!PREFABS[prefab]) issues.push(`condition ${condition}: adds unknown prefab "${prefab}"`);
  }
}

function findDefinitionIssues(content: GameContent, issues: string[]): void {
  const objectOf = (id: string) => content.worldObjects.get(id);
  for (const prefab of Object.values(PREFABS)) issues.push(...findPrefabIssues(prefab, objectOf).map((issue) => `prefab ${issue}`));
  issues.push(...findPrefabLibraryIssues());
  for (const definition of content.worldObjects.values()) {
    const footprint = definition.footprint;
    if (footprint && !(Number.isInteger(footprint.width) && Number.isInteger(footprint.height) && footprint.width >= 1 && footprint.height >= 1)) {
      issues.push(`object "${definition.id}" has a ${footprint.width}×${footprint.height} footprint; footprints are whole tiles, at least 1×1`);
    }
  }
}

export function findFurnishingIssues(content: GameContent): string[] {
  const issues: string[] = [];
  for (const district of content.districts.values()) {
    if (!district.rooms) continue;
    const layout = parseTileLayout(district.map);
    const report: Report = (problem) => issues.push(`district ${district.id}: ${problem}`);
    findClearanceIssues(content, district, layout, report);
    findLandmarkIssues(district, report);
    findVarietyIssues(district, layout, report);
    findDecalIssues(district, layout, report);
  }
  for (const level of content.levels.values()) findReachabilityIssues(content, level, issues);
  findConditionIssues(content, issues);
  findDefinitionIssues(content, issues);
  return issues;
}
