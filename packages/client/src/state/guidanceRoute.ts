import {
  findPath,
  focusedHandheldQuest,
  GAME_CONTENT,
  routeGoals,
  tileKey,
  walkableTilesNear,
  type LiveCreature,
  type NpcId,
  type QuestId,
  type ResolvedLevel,
  type RouteGoal,
  type RouteScene,
  type TilePoint,
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

  constructor(world: WorldState) {
    this.world = world;
  }

  invalidate(): void {
    this.stale = true;
  }

  current(now: number, preferred: QuestId | null): readonly TilePoint[] {
    const origin = this.world.selfEntity?.to;
    if (!origin) return [];
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
    const { self, zone } = this.world;
    if (!self || !zone) return [];
    const tracked = focusedHandheldQuest(self.quests, GAME_CONTENT.quests, preferred);
    if (!tracked) return [];
    const goals = routeGoals(tracked, this.scene(zone.definition), GAME_CONTENT);
    const here = zone.layout.districtAt(origin);
    const local = goals.filter((goal) => zone.layout.districtAt(goal.point) === here);
    for (const candidates of [local, goals]) {
      const nearest = [...candidates].sort((a, b) => octile(origin, a.point) - octile(origin, b.point)).slice(0, CANDIDATE_LIMIT);
      for (const goal of nearest) {
        const path = this.pathTo(origin, goal);
        if (path) return [origin, ...path];
      }
    }
    return [];
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
