import type { DistrictId } from '../ids.ts';
import { createWalkabilityGrid, parseTileLayout } from '../world/district.ts';
import { tileKey, type TilePoint } from '../world/geometry.ts';
import type { ResolvedLevel } from '../world/levelLayout.ts';
import type { WalkabilityGrid } from '../world/pathfinding.ts';
import type { GameContent } from './gameContent.ts';
import { locate } from './levelIndex.ts';

const CARDINAL_STEPS: readonly TilePoint[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const step = (point: TilePoint, by: TilePoint): TilePoint => ({ x: point.x + by.x, y: point.y + by.y });

function gridOf(content: GameContent, level: ResolvedLevel): WalkabilityGrid {
  const blocked = level.objects.filter((object) => content.worldObjects.get(object.objectId)?.blocksMovement).map((object) => object.position);
  return createWalkabilityGrid(level.layout, blocked);
}

function teleportsOf(content: GameContent, level: ResolvedLevel): { readonly source: TilePoint; readonly districtId: DistrictId; readonly position: TilePoint }[] {
  return level.objects.flatMap((placement) =>
    (content.worldObjects.get(placement.objectId)?.interactions ?? []).flatMap((interaction) =>
      interaction.effects.flatMap((effect) => (effect.type === 'teleport' ? [{ source: placement.position, districtId: effect.districtId, position: effect.position }] : [])),
    ),
  );
}

function findOverlaps(content: GameContent, level: ResolvedLevel, report: (problem: string) => void): void {
  const owners = new Map<string, string>();
  const reported = new Set<string>();
  const stamps = [
    ...level.definition.districts.map((placement) => ({ id: placement.districtId, origin: placement.origin, map: content.districts.get(placement.districtId)?.map ?? [] })),
    ...level.definition.connectors.map((connector) => ({ id: connector.id, origin: connector.origin, map: connector.map })),
  ];
  for (const stamp of stamps) {
    const layout = parseTileLayout(stamp.map);
    for (let y = 0; y < layout.height; y++) {
      for (let x = 0; x < layout.width; x++) {
        if (layout.tileAt({ x, y }) === 'void') continue;
        const key = tileKey(step(stamp.origin, { x, y }));
        const previous = owners.get(key);
        owners.set(key, stamp.id);
        if (!previous || previous === stamp.id || reported.has(`${previous}|${stamp.id}`)) continue;
        reported.add(`${previous}|${stamp.id}`);
        report(`placements "${previous}" and "${stamp.id}" overlap at ${key}`);
      }
    }
  }
}

function findUnreachable(content: GameContent, level: ResolvedLevel, grid: WalkabilityGrid, report: (problem: string) => void): void {
  const jumps = new Map<string, TilePoint[]>();
  for (const teleport of teleportsOf(content, level)) {
    const destination = locate(content, teleport.districtId, teleport.position);
    if (destination?.levelId !== level.id) continue;
    for (const offset of CARDINAL_STEPS) {
      const key = tileKey(step(teleport.source, offset));
      jumps.set(key, [...(jumps.get(key) ?? []), destination.position]);
    }
  }

  const seen = new Set<string>();
  const queue: TilePoint[] = [level.spawn];
  while (queue.length > 0) {
    const point = queue.pop() as TilePoint;
    const key = tileKey(point);
    if (seen.has(key) || !grid.isWalkable(point)) continue;
    seen.add(key);
    queue.push(...CARDINAL_STEPS.map((offset) => step(point, offset)), ...(jumps.get(key) ?? []));
  }

  const unreachable: string[] = [];
  for (let y = 0; y < level.layout.height; y++) {
    for (let x = 0; x < level.layout.width; x++) {
      if (grid.isWalkable({ x, y }) && !seen.has(tileKey({ x, y }))) unreachable.push(tileKey({ x, y }));
    }
  }
  if (unreachable.length > 0) report(`${unreachable.length} walkable tiles are unreachable from the spawn (first at ${unreachable[0]})`);
}

function findDuplicateInstances(level: ResolvedLevel, report: (problem: string) => void): void {
  const seen = new Set<string>();
  const reported = new Set<string>();
  for (const instanceId of [...level.npcs, ...level.objects, ...level.creatures].map((placement) => placement.instanceId)) {
    if (seen.has(instanceId) && !reported.has(instanceId)) {
      reported.add(instanceId);
      report(`instance id "${instanceId}" is used more than once`);
    }
    seen.add(instanceId);
  }
}

function findUnwalkableTargets(content: GameContent, level: ResolvedLevel, report: (problem: string) => void): void {
  const grids = new Map<string, WalkabilityGrid>();
  const walkable = (districtId: DistrictId, position: TilePoint): boolean => {
    const location = locate(content, districtId, position);
    const target = location && content.levels.get(location.levelId);
    if (!location || !target) return false;
    const grid = grids.get(target.id) ?? gridOf(content, target);
    grids.set(target.id, grid);
    return grid.isWalkable(location.position);
  };

  if (!walkable(level.definition.spawn.districtId, level.definition.spawn.position)) report('the spawn is not walkable');
  for (const teleport of teleportsOf(content, level)) {
    if (!walkable(teleport.districtId, teleport.position)) {
      report(`teleport to ${teleport.districtId} ${teleport.position.x},${teleport.position.y} does not land on a walkable tile`);
    }
  }
  for (const placement of level.definition.districts) {
    const recovery = content.districts.get(placement.districtId)?.recovery;
    if (recovery && !walkable(recovery.districtId, recovery.position)) report(`recovery for ${placement.districtId} is not walkable`);
  }
}

export function findLevelIssues(content: GameContent): string[] {
  const issues: string[] = [];
  const placedIn = new Map<DistrictId, string[]>();

  for (const level of content.levels.values()) {
    const report = (problem: string) => issues.push(`level ${level.id}: ${problem}`);
    for (const placement of level.definition.districts) {
      if (!content.districts.has(placement.districtId)) report(`unknown district "${placement.districtId}"`);
      placedIn.set(placement.districtId, [...(placedIn.get(placement.districtId) ?? []), level.id]);
    }
    const grid = gridOf(content, level);
    findOverlaps(content, level, report);
    findUnreachable(content, level, grid, report);
    findDuplicateInstances(level, report);
    findUnwalkableTargets(content, level, report);
  }

  for (const districtId of content.districts.keys()) {
    const levels = placedIn.get(districtId) ?? [];
    if (levels.length === 0) issues.push(`district ${districtId}: not placed on any level`);
    if (levels.length > 1) issues.push(`district ${districtId}: placed on more than one level (${levels.join(', ')})`);
  }
  return issues;
}
