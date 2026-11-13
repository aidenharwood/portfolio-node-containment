import { createObjectWalkabilityGrid, parseTileLayout, type DistrictDefinition, type TileLayout } from '../world/district.ts';
import { doorTilesOf, withOpenDoors } from '../world/doors.ts';
import { objectFootprintTiles } from '../world/footprint.ts';
import { CARDINAL_OFFSETS, rectContains, tileKey, type TilePoint, type TileRect } from '../world/geometry.ts';
import type { ResolvedLevel } from '../world/levelLayout.ts';
import type { WalkabilityGrid } from '../world/pathfinding.ts';
import { TILE_KINDS } from '../world/tiles.ts';
import type { GameContent } from './gameContent.ts';
import { FURNISHING_PROFILES } from './furnishingCatalogue.ts';
import { findPlacementIssues } from './placementIntegrity.ts';
import { findPrefabIssues, findPrefabLibraryIssues, PREFABS } from './prefabs/index.ts';

export const VARIETY_ROOM_TILES = 150;
export const MIN_KINDS_IN_LARGE_ROOM = 3;

type Report = (problem: string) => void;

const isWalkableTile = (layout: TileLayout, point: TilePoint): boolean => TILE_KINDS[layout.tileAt(point)].walkable;

const tilesOf = (rect: TileRect): TilePoint[] => {
  const tiles: TilePoint[] = [];
  for (let y = rect.y; y < rect.y + rect.height; y++) for (let x = rect.x; x < rect.x + rect.width; x++) tiles.push({ x, y });
  return tiles;
};

function findClearanceIssues(content: GameContent, district: DistrictDefinition, layout: TileLayout, report: Report): void {
  const rooms = Object.values(district.rooms ?? {});
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
    const definition = content.worldObjects.get(object.objectId);
    if (!definition || definition.interactions.length > 0 || definition.door || definition.countsAs || FURNISHING_PROFILES[object.objectId]?.mount === 'flat') continue;
    const covered = objectFootprintTiles(definition, object).find((tile) => forbidden(tile) !== undefined);
    if (covered) report(`"${object.instanceId}" at ${covered.x},${covered.y} covers ${forbidden(covered)}`);
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

const isLitter = (objectId: string): boolean => objectId.startsWith('litter-') || objectId.startsWith('cable-run');

function findDressedIssues(content: GameContent, district: DistrictDefinition, layout: TileLayout, report: Report): void {
  for (const { room } of district.dressingLog ?? []) {
    const rect = district.rooms?.[room];
    if (!rect) continue;
    const walkable = tilesOf(rect).filter((point) => isWalkableTile(layout, point)).length;
    if (walkable <= VARIETY_ROOM_TILES) continue;
    const kinds = new Set(
      district.objects
        .filter((object) => !isLitter(object.objectId) && objectFootprintTiles(content.worldObjects.get(object.objectId), object).some((tile) => rectContains(rect, tile)))
        .map((object) => object.objectId),
    );
    if (kinds.size < MIN_KINDS_IN_LARGE_ROOM) report(`room "${room}" has ${walkable} walkable tiles but only ${kinds.size} kind(s) of object; dress rooms over ${VARIETY_ROOM_TILES} tiles by hand with at least ${MIN_KINDS_IN_LARGE_ROOM}`);
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
    findDressedIssues(content, district, layout, report);
    findDecalIssues(district, layout, report);
  }
  for (const level of content.levels.values()) findReachabilityIssues(content, level, issues);
  findDefinitionIssues(content, issues);
  issues.push(...findPlacementIssues(content));
  return issues;
}
