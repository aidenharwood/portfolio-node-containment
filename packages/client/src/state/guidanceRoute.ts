import {
  createObjectWalkabilityGrid,
  doorTilesOf,
  findPath,
  levelRegions,
  planTransit,
  regionsReaching,
  transitHops,
  withOpenDoors,
  trackedQuest,
  GAME_CONTENT,
  routeGoals,
  tileKey,
  walkableTilesNear,
  type LevelId,
  type LiveCreature,
  type NpcId,
  type QuestId,
  type ResolvedLevel,
  type RouteGoal,
  type RouteScene,
  type TilePoint,
  type TransitTarget,
  type WalkRegions,
} from '@containment/shared';
import type { WorldState } from './worldState.ts';

const REFRESH_MS = 800;
const CANDIDATE_LIMIT = 4;
const MAX_SEARCH_NODES = 40000;

const octile = (a: TilePoint, b: TilePoint): number => {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.max(dx, dy) + 0.41 * Math.min(dx, dy);
};

export class GuidanceRoute {
  private readonly world: WorldState;
  private route: readonly TilePoint[] = [];
  private computedAt = -Infinity;
  private computedFrom = '';
  private stale = true;
  private nextHop: string | null = null;
  private readonly regionCache = new Map<LevelId, { readonly key: string; readonly regions: WalkRegions }>();

  constructor(world: WorldState) {
    this.world = world;
  }

  invalidate(): void {
    this.stale = true;
  }

  get via(): string | null {
    return this.nextHop;
  }

  current(now: number, preferred: QuestId | null): readonly TilePoint[] {
    const origin = this.world.selfEntity?.to;
    if (!origin) {
      this.nextHop = null;
      return [];
    }
    const originKey = tileKey(origin);
    if (this.stale || originKey !== this.computedFrom || now - this.computedAt > REFRESH_MS) {
      this.route = this.plan(origin, preferred);
      this.computedAt = now;
      this.computedFrom = originKey;
      this.stale = false;
    }
    return this.route;
  }

  private plan(origin: TilePoint, preferred: QuestId | null): TilePoint[] {
    this.nextHop = null;
    const { self, zone } = this.world;
    if (!self || !zone) return [];
    const tracked = trackedQuest(self.quests, GAME_CONTENT.quests, preferred);
    if (!tracked) return [];
    const levelId = zone.definition.id;
    const goals = routeGoals(tracked, this.scene(zone.definition), GAME_CONTENT);
    const here = this.regionsOf(levelId)?.regionAt(origin) ?? -1;
    const sameRegion = goals.filter((goal) => {
      const regions = this.regionsOf(levelId);
      return regions !== undefined && regionsReaching(regions, goal).has(here);
    });
    const district = zone.layout.districtAt(origin);
    const local = sameRegion.filter((goal) => zone.layout.districtAt(goal.point) === district);
    for (const candidates of [local, sameRegion]) {
      const path = this.nearestPath(origin, candidates);
      if (path) return path;
    }
    const targets: TransitTarget[] = [
      ...goals.map((goal) => ({ levelId, goal })),
      ...[...GAME_CONTENT.levels.values()]
        .filter((level) => level.id !== levelId)
        .flatMap((level) => routeGoals(tracked, { level, npcPositions: new Map(), creatures: [], depletedInstances: new Set() }, GAME_CONTENT).map((goal) => ({ levelId: level.id, goal }))),
    ];
    const known = new Set(self.discoveredStations);
    const passages = new Set(self.openPassages);
    const hops = transitHops(GAME_CONTENT, { knowsStation: (stationId) => known.has(stationId), canUsePassage: (objectId) => passages.has(objectId) });
    const transit = planTransit({ levelId, position: origin }, targets, hops, (id) => this.regionsOf(id));
    const first = transit?.hops[0];
    if (!transit || !first) return this.nearestPath(origin, goals) ?? [];
    const path = this.pathTo(origin, first.board);
    if (!path) return [];
    this.nextHop = first.label;
    return [origin, ...path];
  }

  private nearestPath(origin: TilePoint, candidates: readonly RouteGoal[]): TilePoint[] | null {
    const nearest = [...candidates].sort((a, b) => octile(origin, a.point) - octile(origin, b.point)).slice(0, CANDIDATE_LIMIT);
    for (const goal of nearest) {
      const path = this.pathTo(origin, goal);
      if (path) return [origin, ...path];
    }
    return null;
  }

  private regionsOf(levelId: LevelId): WalkRegions | undefined {
    const level = GAME_CONTENT.levels.get(levelId);
    if (!level) return undefined;
    const openDoors = this.world.openDoors;
    const key = [...openDoors].sort().join('|');
    const cached = this.regionCache.get(levelId);
    if (cached?.key === key) return cached.regions;
    const definitionOf = (objectId: string) => GAME_CONTENT.worldObjects.get(objectId);
    const grid = withOpenDoors(
      createObjectWalkabilityGrid(level.layout, level.objects, definitionOf),
      level.layout,
      doorTilesOf(level.objects, definitionOf),
      (objectId) => openDoors.has(objectId),
    );
    const regions = levelRegions(level, grid);
    this.regionCache.set(levelId, { key, regions });
    return regions;
  }

  private pathTo(origin: TilePoint, goal: RouteGoal): TilePoint[] | null {
    const grid = this.world.zone?.grid;
    if (!grid) return null;
    if (goal.arriveAdjacent) return findPath(grid, { from: origin, to: goal.point, arriveAdjacent: true, maxSearchNodes: MAX_SEARCH_NODES });
    const target = walkableTilesNear(grid, goal.point, origin)[0];
    return target ? findPath(grid, { from: origin, to: target, maxSearchNodes: MAX_SEARCH_NODES }) : null;
  }

  private scene(level: ResolvedLevel): RouteScene {
    const npcPositions = new Map<NpcId, TilePoint>();
    const creatures: LiveCreature[] = [];
    for (const entity of this.world.entities.values()) {
      if (entity.npcId) npcPositions.set(entity.npcId, entity.to);
      if (entity.creatureId && entity.dyingAt === null) creatures.push({ creatureId: entity.creatureId, position: entity.to });
    }
    return {
      level,
      npcPositions,
      creatures,
      depletedInstances: this.world.depletedObjects,
    };
  }
}
