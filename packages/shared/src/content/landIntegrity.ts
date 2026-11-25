import type { DistrictId, RegionId } from '../ids.ts';
import { doorTilesOf } from '../world/doors.ts';
import { tileKey, type TilePoint } from '../world/geometry.ts';
import type { LandMap } from '../world/landPlan.ts';
import type { ResolvedLevel } from '../world/levelLayout.ts';
import { isWalkableTile, TILE_KINDS } from '../world/tiles.ts';
import type { GameContent } from './gameContent.ts';

export const OPEN_BORDER_SHARE = 0.75;
export const BORDER_CROSSING_DEPTH = 6;

export interface WardBorder {
  readonly wards: readonly [RegionId, RegionId];
  readonly length: number;
  readonly shared: number;
  readonly open: number;
}

const isWalkableLand = (land: LandMap, point: TilePoint): boolean => isWalkableTile(land, point);

function firstWalkableEdge(land: LandMap): TilePoint | undefined {
  for (let y = 0; y < land.height; y++) {
    const onEdgeRow = y === 0 || y === land.height - 1;
    for (let x = 0; x < land.width; x++) {
      if ((onEdgeRow || x === 0 || x === land.width - 1) && isWalkableLand(land, { x, y })) return { x, y };
    }
  }
  return undefined;
}

function crossing(land: LandMap, from: TilePoint, step: TilePoint): 'open' | 'closed' | undefined {
  const at = (offset: number): TilePoint => ({ x: from.x + step.x * offset, y: from.y + step.y * offset });
  if (!isWalkableLand(land, at(-BORDER_CROSSING_DEPTH)) || !isWalkableLand(land, at(BORDER_CROSSING_DEPTH + 1))) return undefined;
  for (let offset = -BORDER_CROSSING_DEPTH; offset <= BORDER_CROSSING_DEPTH; offset++) {
    const next = at(offset + 1);
    if (!isWalkableLand(land, next) || Math.abs(land.heightAt(next) - land.heightAt(at(offset))) > 1) return 'closed';
  }
  return 'open';
}

export function wardBorders(land: LandMap): WardBorder[] {
  const borders = new Map<string, { wards: readonly [RegionId, RegionId]; length: number; shared: number; open: number }>();
  for (let y = 0; y < land.height; y++) {
    for (let x = 0; x < land.width; x++) {
      const ward = land.wardAt({ x, y });
      if (ward === undefined) continue;
      for (const step of [{ x: 1, y: 0 }, { x: 0, y: 1 }]) {
        const other = land.wardAt({ x: x + step.x, y: y + step.y });
        if (other === undefined || other === ward) continue;
        const wards: readonly [RegionId, RegionId] = ward < other ? [ward, other] : [other, ward];
        const key = wards.join(' ');
        const border = borders.get(key) ?? { wards, length: 0, shared: 0, open: 0 };
        const result = crossing(land, { x, y }, step);
        border.length++;
        if (result !== undefined) border.shared++;
        if (result === 'open') border.open++;
        borders.set(key, border);
      }
    }
  }
  return [...borders.values()];
}

export function findLandPlanIssues(land: LandMap): string[] {
  const issues: string[] = [];
  const { id } = land.plan;
  const edge = firstWalkableEdge(land);
  if (edge) issues.push(`land ${id}: walkable land at ${edge.x},${edge.y} meets the edge of the plan`);
  for (const step of land.plan.steps) {
    if (step.kind !== 'gate') continue;
    const lost = land.gates[step.id]?.find((tile) => land.tileAt(tile) !== step.tile);
    if (lost) issues.push(`land ${id}: gate "${step.id}" at ${lost.x},${lost.y} is ${land.tileAt(lost)}, not ${step.tile}; draw over it before the gate, not after`);
  }
  for (const border of wardBorders(land)) {
    if (border.open < border.shared * OPEN_BORDER_SHARE) issues.push(`land ${id}: wards ${border.wards[0]} and ${border.wards[1]} meet in the open at only ${border.open} of the ${border.shared} crossings over their border; neighbouring regions join across open ground`);
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
  const used = new Set([...content.levels.values()].flatMap((level) => (level.definition.land ? [level.definition.land.plan.id] : [])));
  for (const land of content.lands.values()) {
    if (!used.has(land.plan.id)) issues.push(...findLandPlanIssues(land));
  }
  return issues;
}
