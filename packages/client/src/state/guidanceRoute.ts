import {
  createObjectWalkabilityGrid,
  doorTilesOf,
  findPath,
  levelRegions,
  planTransit,
  regionsReaching,
  transitHops,
  withOpenDoors,
  GAME_CONTENT,
  tileKey,
  walkableTilesNear,
  type LevelId,
  type LiveCreature,
  type NpcId,
  type GuidanceTarget,
  type ResolvedLevel,
  type RouteGoal,
  type RouteScene,
  type TilePoint,
  type TransitTarget,
  type WalkRegions,
} from '@containment/shared';
import { guidanceGoals } from './guidanceGoals.ts';
import type { WorldState } from './worldState.ts';

const REFRESH_MS = 2500;
const CANDIDATE_LIMIT = 4;
const FOLLOW_LOOKAHEAD = 8;
const GOAL_STICK_RADIUS = 3;
const GOAL_STICK_BIAS = 0.5;
const MAX_SEARCH_NODES = 40000;
const KEEP_COURSE_SLACK = 2;

const chebyshev = (a: TilePoint, b: TilePoint): number => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

const sameTile = (a: TilePoint | undefined, b: TilePoint | undefined): boolean => a !== undefined && b !== undefined && a.x === b.x && a.y === b.y;

const octile = (a: TilePoint, b: TilePoint): number => {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.max(dx, dy) + 0.41 * Math.min(dx, dy);
};

const routeLength = (route: readonly TilePoint[]): number => {
  let total = 0;
  for (let index = 1; index < route.length; index++) total += octile(route[index - 1] as TilePoint, route[index] as TilePoint);
  return total;
};

export function untangle(route: readonly TilePoint[]): TilePoint[] {
  const result: TilePoint[] = [];
  let index = 0;
  while (index < route.length) {
    const tile = route[index] as TilePoint;
    result.push(tile);
    let next = index + 1;
    for (let ahead = route.length - 1; ahead > index + 1; ahead--) {
      const later = route[ahead] as TilePoint;
      if (sameTile(later, tile)) {
        next = ahead + 1;
        break;
      }
      if (Math.abs(later.x - tile.x) + Math.abs(later.y - tile.y) === 1) {
        next = ahead;
        break;
      }
    }
    index = next;
  }
  return result;
}

export class GuidanceRoute {
  private readonly world: WorldState;
  private route: readonly TilePoint[] = [];
  private computedAt = -Infinity;
  private computedFrom = '';
  private stale = true;
  private nextHop: string | null = null;
  private goal: TilePoint | null = null;
  private depleted = false;
  private lost = false;
  private reusable: TilePoint | null = null;
  private plannedDoors = '';
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

  get exhausted(): boolean {
    return this.depleted;
  }

  get unreachable(): boolean {
    return this.lost;
  }

  current(now: number, target: GuidanceTarget | null): readonly TilePoint[] {
    const origin = this.world.selfEntity?.to;
    if (!origin) {
      this.nextHop = null;
      return [];
    }
    const originKey = tileKey(origin);
    if (originKey !== this.computedFrom) {
      this.computedFrom = originKey;
      const followed = this.follow(origin);
      if (followed) this.route = untangle(followed);
      else this.stale = true;
    }
    if (this.stale || now - this.computedAt > REFRESH_MS) {
      const planned = this.plan(origin, target);
      if (!this.keepsCourse(origin, planned)) this.route = untangle(planned);
      this.computedAt = now;
      this.stale = false;
    }
    return this.route;
  }

  private follow(origin: TilePoint): TilePoint[] | null {
    const route = this.route;
    const limit = Math.min(route.length, FOLLOW_LOOKAHEAD);
    for (let index = limit - 1; index >= 0; index--) {
      const tile = route[index] as TilePoint;
      if (chebyshev(tile, origin) > 1) continue;
      if (index === 0 && !sameTile(tile, origin)) return null;
      const rest = route.slice(index);
      return sameTile(tile, origin) ? rest : [origin, ...rest];
    }
    return null;
  }

  private keepsCourse(origin: TilePoint, planned: readonly TilePoint[]): boolean {
    const route = this.route;
    if (route.length === 0 || planned.length === 0) return false;
    if (!sameTile(route[0], origin) || !sameTile(route[route.length - 1], planned[planned.length - 1])) return false;
    if (routeLength(route) > routeLength(planned) + KEEP_COURSE_SLACK) return false;
    const grid = this.world.zone?.grid;
    return grid !== undefined && route.every((tile, index) => index === 0 || grid.isWalkable(tile));
  }

  private plan(origin: TilePoint, target: GuidanceTarget | null): TilePoint[] {
    this.depleted = false;
    this.lost = false;
    const doors = this.doorsKey();
    this.reusable = doors === this.plannedDoors && this.intact(origin) ? this.goal : null;
    const route = this.planRoute(origin, target);
    this.plannedDoors = doors;
    this.lost = target !== null && route.length === 0;
    return route;
  }

  private intact(origin: TilePoint): boolean {
    const route = this.route;
    const grid = this.world.zone?.grid;
    return grid !== undefined && route.length > 1 && sameTile(route[0], origin) && route.every((tile, index) => index === 0 || grid.isWalkable(tile));
  }

  private doorsKey(): string {
    return [...this.world.openDoors].sort().join('|');
  }

  private routeTo(origin: TilePoint, goal: RouteGoal): TilePoint[] | null {
    if (sameTile(this.reusable ?? undefined, goal.point)) return [...this.route];
    const path = this.pathTo(origin, goal);
    return path ? [origin, ...path] : null;
  }

  private planRoute(origin: TilePoint, target: GuidanceTarget | null): TilePoint[] {
    this.nextHop = null;
    const previousGoal = this.goal;
    this.goal = null;
    const { self, zone } = this.world;
    if (!self || !zone) return [];
    const levelId = zone.definition.id;
    const local = guidanceGoals(target, self.quests, this.scene(zone.definition));
    this.depleted = local.allDepleted;
    const goals = local.goals;
    const here = this.regionsOf(levelId)?.regionAt(origin) ?? -1;
    const sameRegion = goals.filter((goal) => {
      const regions = this.regionsOf(levelId);
      return regions !== undefined && regionsReaching(regions, goal).has(here);
    });
    const district = zone.layout.districtAt(origin);
    const nearby = sameRegion.filter((goal) => zone.layout.districtAt(goal.point) === district);
    const tried = new Set<RouteGoal>();
    for (const candidates of [nearby, sameRegion]) {
      const path = this.nearestPath(origin, candidates, previousGoal, tried);
      if (path) return path;
    }
    const targets: TransitTarget[] = [
      ...goals.map((goal) => ({ levelId, goal })),
      ...[...GAME_CONTENT.levels.values()]
        .filter((level) => level.id !== levelId)
        .flatMap((level) => guidanceGoals(target, self.quests, { level, npcPositions: new Map(), creatures: [], depletedInstances: this.world.usedObjects }).goals.map((goal) => ({ levelId: level.id, goal }))),
    ];
    const known = new Set(self.discoveredStations);
    const passages = new Set(self.openPassages);
    const hops = transitHops(GAME_CONTENT, { knowsStation: (stationId) => known.has(stationId), canUsePassage: (objectId) => passages.has(objectId) });
    const transit = planTransit({ levelId, position: origin }, targets, hops, (id) => this.regionsOf(id));
    const first = transit?.hops[0];
    if (!transit || !first) return this.nearestPath(origin, goals, previousGoal, tried) ?? [];
    const path = this.routeTo(origin, first.board);
    if (!path) return [];
    this.nextHop = first.label;
    this.goal = first.board.point;
    return path;
  }

  private nearestPath(origin: TilePoint, candidates: readonly RouteGoal[], previousGoal: TilePoint | null, tried: Set<RouteGoal>): TilePoint[] | null {
    const score = (goal: RouteGoal) => {
      const distance = octile(origin, goal.point);
      return previousGoal && chebyshev(previousGoal, goal.point) <= GOAL_STICK_RADIUS ? distance * GOAL_STICK_BIAS : distance;
    };
    const nearest = [...candidates].sort((a, b) => score(a) - score(b)).slice(0, CANDIDATE_LIMIT);
    for (const goal of nearest) {
      if (tried.has(goal)) continue;
      tried.add(goal);
      const path = this.routeTo(origin, goal);
      if (path) {
        this.goal = goal.point;
        return path;
      }
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
    const { depletedObjects, usedObjects } = this.world;
    return {
      level,
      npcPositions,
      creatures,
      depletedInstances: usedObjects.size > 0 ? new Set([...depletedObjects, ...usedObjects]) : depletedObjects,
    };
  }
}
