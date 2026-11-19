import type { DistrictId, RegionId } from '../ids.ts';
import { doorTilesOf } from '../world/doors.ts';
import { CARDINAL_OFFSETS, tileKey, type TilePoint } from '../world/geometry.ts';
import type { LandMap } from '../world/landPlan.ts';
import type { ResolvedLevel } from '../world/levelLayout.ts';
import { TILE_KINDS } from '../world/tiles.ts';
import type { GameContent } from './gameContent.ts';

const isWalkableLand = (land: LandMap, point: TilePoint): boolean => TILE_KINDS[land.tileAt(point)].walkable;

function firstWalkableEdge(land: LandMap): TilePoint | undefined {
  for (let y = 0; y < land.height; y++) {
    const onEdgeRow = y === 0 || y === land.height - 1;
    for (let x = 0; x < land.width; x++) {
      if ((onEdgeRow || x === 0 || x === land.width - 1) && isWalkableLand(land, { x, y })) return { x, y };
    }
  }
  return undefined;
}

function wardsBeside(land: LandMap, tiles: readonly TilePoint[], gateTiles: ReadonlySet<string>): Set<RegionId> {
  const wards = new Set<RegionId>();
  for (const tile of tiles) {
    for (const offset of CARDINAL_OFFSETS) {
      const point = { x: tile.x + offset.x, y: tile.y + offset.y };
      if (gateTiles.has(tileKey(point)) || !isWalkableLand(land, point)) continue;
      const ward = land.wardAt(point);
      if (ward !== undefined) wards.add(ward);
    }
  }
  return wards;
}

export function findLandPlanIssues(land: LandMap): string[] {
  const issues: string[] = [];
  const { id } = land.plan;
  const edge = firstWalkableEdge(land);
  if (edge) issues.push(`land ${id}: walkable land at ${edge.x},${edge.y} meets the edge of the plan`);
  const gateTiles = new Set(Object.values(land.gates).flatMap((tiles) => tiles.map(tileKey)));
  for (const [gate, tiles] of Object.entries(land.gates)) {
    if (wardsBeside(land, tiles, gateTiles).size < 2) issues.push(`land ${id}: gate "${gate}" does not join two wards`);
  }
  for (const step of land.plan.steps) {
    if (step.kind !== 'gate') continue;
    const lost = land.gates[step.id]?.find((tile) => land.tileAt(tile) !== step.tile);
    if (lost) issues.push(`land ${id}: gate "${step.id}" at ${lost.x},${lost.y} is ${land.tileAt(lost)}, not ${step.tile}; draw over it before the gate, not after`);
  }
  return issues;
}

function findUncoveredLand(level: ResolvedLevel, land: LandMap, issues: string[]): void {
  const { squareSize, columns, rows } = land.plan;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const uncovered = firstUncoveredIn(level, land, column * squareSize, row * squareSize, squareSize);
      if (uncovered) issues.push(`level ${level.id}: walkable land at ${uncovered.x},${uncovered.y} lies in no district`);
    }
  }
}

function firstUncoveredIn(level: ResolvedLevel, land: LandMap, left: number, top: number, size: number): TilePoint | undefined {
  for (let y = top; y < top + size; y++) {
    for (let x = left; x < left + size; x++) {
      if (isWalkableLand(land, { x, y }) && level.layout.districtAt({ x, y }) === undefined) return { x, y };
    }
  }
  return undefined;
}

function findForeignLand(content: GameContent, level: ResolvedLevel, land: LandMap, issues: string[]): void {
  const reported = new Set<DistrictId>();
  const { layout } = level;
  for (let y = 0; y < layout.height; y++) {
    for (let x = 0; x < layout.width; x++) {
      const districtId = layout.districtAt({ x, y });
      if (districtId === undefined || reported.has(districtId) || !TILE_KINDS[layout.tileAt({ x, y })].walkable) continue;
      const district = content.districts.get(districtId);
      if (!district?.square) continue;
      const ward = land.wardAt({ x, y });
      if (ward === district.region) continue;
      reported.add(districtId);
      const local = layout.toLocalPoint({ x, y })?.position ?? { x, y };
      issues.push(`district ${districtId}: its land at ${local.x},${local.y} belongs to ${ward ?? 'no ward'}, not its region ${district.region}`);
    }
  }
}

function findDoorlessGates(content: GameContent, level: ResolvedLevel, land: LandMap, issues: string[]): void {
  const doors = doorTilesOf(level.objects, (objectId) => content.worldObjects.get(objectId));
  for (const [gate, tiles] of Object.entries(land.gates)) {
    if (!tiles.some((tile) => doors.has(tileKey(tile)))) issues.push(`level ${level.id}: land gate "${gate}" has no door on its tiles`);
  }
}

export function findLandIssues(content: GameContent): string[] {
  const issues: string[] = [];
  for (const level of content.levels.values()) {
    const { land } = level.definition;
    if (!land) continue;
    issues.push(...findLandPlanIssues(land).map((issue) => `level ${level.id}: ${issue}`));
    findUncoveredLand(level, land, issues);
    findForeignLand(content, level, land, issues);
    findDoorlessGates(content, level, land, issues);
  }
  return issues;
}
