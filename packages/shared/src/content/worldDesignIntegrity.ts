import type { DistrictId } from '../ids.ts';
import { parseTileLayout, type DistrictDefinition, type TileLayout } from '../world/district.ts';
import { CARDINAL_OFFSETS, chebyshevDistance, rectContains, type TilePoint } from '../world/geometry.ts';
import type { ResolvedLevel } from '../world/levelLayout.ts';
import { TILE_KINDS } from '../world/tiles.ts';
import type { GameContent } from './gameContent.ts';

export const LEGACY_DISTRICTS: ReadonlySet<DistrictId> = new Set([
  'undercroft',
  'sector-three',
  'deepwatch',
  'deep-concourse',
  'furnace-causeway',
  'cryovault',
  'signal-array',
  'drowned-archive',
  'furnace',
  'meridian-below',
  'verdant-fold',
  'dead-letter-office',
  'calder-causeway',
  'brine-galleries',
  'calder-gatehouse',
  'salt-cathedral',
  'calder-deeps',
  'vesper-causeway',
  'vesper-wards',
  'vesper-lodge',
  'vesper-pharmacy',
  'vesper-cellars',
]);

export const MIN_EXIT_WIDTH = 9;
export const MIN_CREATURES_PER_THOUSAND_TILES = 3;
export const MAX_CREATURES_PER_THOUSAND_TILES = 14;
export const MAX_PLATFORM_DISTANCE_FROM_TRACK = 6;

type Report = (problem: string) => void;

const isWalkableTile = (layout: TileLayout, point: TilePoint): boolean => TILE_KINDS[layout.tileAt(point)].walkable;

function findPlacementIssues(district: DistrictDefinition, layout: TileLayout, report: Report): void {
  const rooms = Object.values(district.rooms ?? {});
  const stands = (point: TilePoint): boolean => layout.tileAt(point) === 'door' || rooms.some((rect) => rectContains(rect, point));
  const placements = [...district.npcs, ...district.objects, ...(district.assemblies ?? []), ...(district.creatures ?? [])];
  for (const placement of placements) {
    if (!stands(placement.position)) report(`"${placement.instanceId}" stands outside every room`);
  }
  for (const area of district.areas) {
    const rect = district.rooms?.[area.id];
    const matches = rect && rect.x === area.rect.x && rect.y === area.rect.y && rect.width === area.rect.width && rect.height === area.rect.height;
    if (!matches) report(`area "${area.id}" does not match a room of the same id`);
  }
}

function findExitIssues(district: DistrictDefinition, level: ResolvedLevel, report: Report): void {
  const exits = Object.entries(district.exits ?? {});
  for (const [exitId, exit] of exits) {
    if (!exit.gate && exit.tiles.length < MIN_EXIT_WIDTH) report(`exit "${exitId}" is ${exit.tiles.length} wide; open exits need ${MIN_EXIT_WIDTH}`);
  }
  if (level.definition.districts.length > 1 && exits.length < 2 && !district.deadEnd && !district.reachedOnlyByTram) {
    report(`has ${exits.length} exit(s); a district needs two ways in unless it is a dead end`);
  }
}

function findDensityIssues(district: DistrictDefinition, layout: TileLayout, report: Report): void {
  const creatures = district.creatures ?? [];
  if (creatures.length === 0) return;
  const safeAreas = district.areas.filter((area) => area.safe);
  let hostileTiles = 0;
  for (let y = 0; y < layout.height; y++) {
    for (let x = 0; x < layout.width; x++) {
      if (isWalkableTile(layout, { x, y }) && !safeAreas.some((area) => rectContains(area.rect, { x, y }))) hostileTiles++;
    }
  }
  const density = (creatures.length * 1000) / Math.max(1, hostileTiles);
  if (density < MIN_CREATURES_PER_THOUSAND_TILES || density > MAX_CREATURES_PER_THOUSAND_TILES) {
    report(
      `has ${creatures.length} creatures on ${hostileTiles} hostile tiles (${density.toFixed(1)} per thousand); keep it between ${MIN_CREATURES_PER_THOUSAND_TILES} and ${MAX_CREATURES_PER_THOUSAND_TILES}`,
    );
  }
}

function findTrackIssues(content: GameContent, district: DistrictDefinition, layout: TileLayout, report: Report): void {
  const reach = MAX_PLATFORM_DISTANCE_FROM_TRACK;
  for (const station of content.tram.stations.values()) {
    if (station.districtId !== district.id) continue;
    let nearTrack = false;
    for (let y = station.platform.y - reach; y <= station.platform.y + reach; y++) {
      for (let x = station.platform.x - reach; x <= station.platform.x + reach; x++) {
        if (layout.tileAt({ x, y }) === 'track' && chebyshevDistance({ x, y }, station.platform) <= reach) nearTrack = true;
      }
    }
    if (!nearTrack) report(`tram station "${station.id}" has no drawn track within ${reach} tiles of its platform`);
  }
}

function findSeamIssues(level: ResolvedLevel, rebuilt: ReadonlySet<DistrictId>, issues: string[]): void {
  const openToVoid = new Map<DistrictId, TilePoint>();
  const { layout } = level;
  for (let y = 0; y < layout.height; y++) {
    for (let x = 0; x < layout.width; x++) {
      const districtId = layout.districtAt({ x, y });
      if (districtId === undefined || !rebuilt.has(districtId) || openToVoid.has(districtId) || !isWalkableTile(layout, { x, y })) continue;
      if (CARDINAL_OFFSETS.some((offset) => layout.tileAt({ x: x + offset.x, y: y + offset.y }) === 'void')) openToVoid.set(districtId, { x, y });
    }
  }
  for (const [districtId, point] of openToVoid) {
    const local = layout.toLocalPoint(point)?.position ?? point;
    issues.push(`district ${districtId}: floor at ${local.x},${local.y} opens onto the void; an exit must meet a neighbouring district`);
  }
}

interface DistrictGraph {
  readonly hops: ReadonlyMap<DistrictId, number>;
  readonly neighbours: ReadonlyMap<DistrictId, ReadonlySet<DistrictId>>;
}

function districtGraphOf(level: ResolvedLevel): DistrictGraph {
  const { layout } = level;
  const neighbours = new Map<DistrictId, Set<DistrictId>>();
  const join = (a: DistrictId, b: DistrictId) => neighbours.set(a, (neighbours.get(a) ?? new Set()).add(b));
  const forward: readonly TilePoint[] = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ];
  for (let y = 0; y < layout.height; y++) {
    for (let x = 0; x < layout.width; x++) {
      const here = layout.districtAt({ x, y });
      if (here === undefined || !isWalkableTile(layout, { x, y })) continue;
      for (const offset of forward) {
        const point = { x: x + offset.x, y: y + offset.y };
        const there = layout.districtAt(point);
        if (there === undefined || there === here || !isWalkableTile(layout, point)) continue;
        join(here, there);
        join(there, here);
      }
    }
  }
  const start = layout.districtAt(level.spawn);
  const hops = new Map<DistrictId, number>();
  const queue: DistrictId[] = start === undefined ? [] : [start];
  if (start !== undefined) hops.set(start, 0);
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index] as DistrictId;
    for (const next of neighbours.get(current) ?? []) {
      if (hops.has(next)) continue;
      hops.set(next, (hops.get(current) as number) + 1);
      queue.push(next);
    }
  }
  return { hops, neighbours };
}

function findTierIssues(content: GameContent, level: ResolvedLevel, rebuilt: ReadonlySet<DistrictId>, issues: string[]): void {
  const { hops, neighbours } = districtGraphOf(level);
  for (const [districtId, distance] of hops) {
    const district = content.districts.get(districtId);
    if (!district || distance === 0 || !rebuilt.has(districtId)) continue;
    const inward = [...(neighbours.get(districtId) ?? [])].filter((neighbour) => hops.get(neighbour) === distance - 1);
    const gentlest = Math.min(...inward.map((neighbour) => content.districts.get(neighbour)?.tier ?? Infinity));
    if (gentlest > district.tier) {
      issues.push(`district ${districtId}: tier ${district.tier} lies beyond tier ${gentlest} on the way out from the spawn; tier must not fall with distance`);
    }
  }
}

export function findWorldDesignIssues(content: GameContent, legacy: ReadonlySet<DistrictId> = LEGACY_DISTRICTS): string[] {
  const issues: string[] = [];
  for (const level of content.levels.values()) {
    const rebuilt = new Set(level.definition.districts.map((placement) => placement.districtId).filter((districtId) => !legacy.has(districtId)));
    for (const districtId of rebuilt) {
      const district = content.districts.get(districtId);
      if (!district) continue;
      const report: Report = (problem) => issues.push(`district ${districtId}: ${problem}`);
      if (!district.rooms) {
        report('its map was not drawn from a blueprint (it has no rooms)');
        continue;
      }
      const layout = parseTileLayout(district.map);
      findPlacementIssues(district, layout, report);
      findExitIssues(district, level, report);
      findDensityIssues(district, layout, report);
      findTrackIssues(content, district, layout, report);
    }
    if (rebuilt.size === 0) continue;
    findSeamIssues(level, rebuilt, issues);
    findTierIssues(content, level, rebuilt, issues);
  }
  return issues;
}
