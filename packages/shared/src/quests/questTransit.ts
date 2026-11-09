import type { LevelId, TramStationId, WorldObjectId } from '../ids.ts';
import { locate, type LocatableContent } from '../content/levelIndex.ts';
import { areConditionsMet, type ConditionContext } from '../rules/conditions.ts';
import type { WorldObjectDefinition } from '../world/entities.ts';
import { CARDINAL_OFFSETS, type TilePoint } from '../world/geometry.ts';
import type { WorldLocation } from '../world/level.ts';
import type { ResolvedLevel } from '../world/levelLayout.ts';
import { WALK_SNAP_RADIUS, type WalkabilityGrid } from '../world/pathfinding.ts';
import { linesThrough, type TramNetwork } from '../world/tram.ts';
import type { RouteGoal } from './questRoute.ts';

export interface WalkRegions {
  regionAt(point: TilePoint): number;
}

export function walkRegions(grid: WalkabilityGrid, width: number, height: number): WalkRegions {
  const UNSEEN = -1;
  const BLOCKED = -2;
  const labels = new Int32Array(width * height).fill(UNSEEN);
  const stack: number[] = [];
  let next = 0;
  for (let start = 0; start < labels.length; start++) {
    if (labels[start] !== UNSEEN) continue;
    if (!grid.isWalkable({ x: start % width, y: Math.floor(start / width) })) {
      labels[start] = BLOCKED;
      continue;
    }
    labels[start] = next;
    stack.push(start);
    while (stack.length > 0) {
      const index = stack.pop() as number;
      const x = index % width;
      const y = Math.floor(index / width);
      for (const offset of CARDINAL_OFFSETS) {
        const nx = x + offset.x;
        const ny = y + offset.y;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const neighbour = ny * width + nx;
        if (labels[neighbour] !== UNSEEN) continue;
        if (!grid.isWalkable({ x: nx, y: ny })) {
          labels[neighbour] = BLOCKED;
          continue;
        }
        labels[neighbour] = next;
        stack.push(neighbour);
      }
    }
    next++;
  }
  return {
    regionAt: ({ x, y }) => (x < 0 || y < 0 || x >= width || y >= height ? -1 : Math.max(-1, labels[y * width + x] ?? -1)),
  };
}

export interface TransitHop {
  readonly kind: 'tram' | 'passage';
  readonly label: string;
  readonly levelId: LevelId;
  readonly board: RouteGoal;
  readonly arrive: WorldLocation;
  readonly cost: number;
}

export interface TransitAccess {
  knowsStation(stationId: TramStationId): boolean;
  canUsePassage(objectId: WorldObjectId): boolean;
}

export interface TransitContent extends LocatableContent {
  readonly tram: TramNetwork;
  readonly worldObjects: ReadonlyMap<WorldObjectId, WorldObjectDefinition>;
}

const TRAM_HOP_COST = 30;
const TRAM_STOP_COST = 5;
const PASSAGE_HOP_COST = 20;
const MAX_HOPS = 6;

function tramHops(network: TramNetwork, access: TransitAccess): TransitHop[] {
  const hops: TransitHop[] = [];
  for (const origin of network.stations.values()) {
    const reachable = new Map<TramStationId, number>();
    for (const line of linesThrough(network, origin.id)) {
      const from = line.stations.indexOf(origin.id);
      line.stations.forEach((stationId, index) => {
        const stops = Math.abs(index - from);
        if (stops > 0 && stops < (reachable.get(stationId) ?? Infinity)) reachable.set(stationId, stops);
      });
    }
    for (const [destinationId, stops] of reachable) {
      const destination = network.stations.get(destinationId);
      if (!destination || !access.knowsStation(destinationId)) continue;
      hops.push({
        kind: 'tram',
        label: `Ride the tram to ${destination.name}`,
        levelId: origin.levelId,
        board: { point: origin.platformPoint, arriveAdjacent: false },
        arrive: { levelId: destination.levelId, position: destination.platformPoint },
        cost: TRAM_HOP_COST + TRAM_STOP_COST * stops,
      });
    }
  }
  return hops;
}

function passageHops(content: TransitContent, access: TransitAccess): TransitHop[] {
  const hops: TransitHop[] = [];
  for (const level of content.levels.values()) {
    for (const placement of level.objects) {
      const definition = content.worldObjects.get(placement.objectId);
      if (!definition || !access.canUsePassage(definition.id)) continue;
      for (const interaction of definition.interactions) {
        for (const effect of interaction.effects) {
          if (effect.type !== 'teleport') continue;
          const arrive = locate(content, effect.districtId, effect.position);
          if (!arrive) continue;
          hops.push({
            kind: 'passage',
            label: `Use the ${definition.name}`,
            levelId: level.id,
            board: { point: placement.position, arriveAdjacent: true },
            arrive,
            cost: PASSAGE_HOP_COST,
          });
        }
      }
    }
  }
  return hops;
}

export const transitHops = (content: TransitContent, access: TransitAccess): TransitHop[] => [...tramHops(content.tram, access), ...passageHops(content, access)];

export const isPassageOpenFor = (definition: WorldObjectDefinition, context: ConditionContext): boolean =>
  definition.interactions.some((interaction) => interaction.effects.some((effect) => effect.type === 'teleport') && areConditionsMet(interaction.conditions, context));

export interface TransitTarget {
  readonly levelId: LevelId;
  readonly goal: RouteGoal;
}

export interface TransitPlan {
  readonly hops: readonly TransitHop[];
  readonly target: TransitTarget;
}

export function regionsReaching(regions: WalkRegions, goal: RouteGoal): Set<number> {
  const found = new Set<number>();
  const add = (point: TilePoint) => {
    const region = regions.regionAt(point);
    if (region >= 0) found.add(region);
  };
  if (goal.arriveAdjacent) {
    for (const offset of CARDINAL_OFFSETS) add({ x: goal.point.x + offset.x, y: goal.point.y + offset.y });
    return found;
  }
  add(goal.point);
  for (let ring = 1; found.size === 0 && ring <= WALK_SNAP_RADIUS; ring++) {
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === ring) add({ x: goal.point.x + dx, y: goal.point.y + dy });
      }
    }
  }
  return found;
}

const octile = (a: TilePoint, b: TilePoint): number => {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.max(dx, dy) + 0.41 * Math.min(dx, dy);
};

interface Frontier {
  readonly at: WorldLocation;
  readonly cost: number;
  readonly hops: readonly TransitHop[];
  readonly target?: TransitTarget;
}

export function planTransit(
  origin: WorldLocation,
  targets: readonly TransitTarget[],
  hops: readonly TransitHop[],
  regionsOf: (levelId: LevelId) => WalkRegions | undefined,
): TransitPlan | null {
  const regionOf = (location: WorldLocation): number => {
    const regions = regionsOf(location.levelId);
    return regions ? [...regionsReaching(regions, { point: location.position, arriveAdjacent: false })][0] ?? -1 : -1;
  };
  const reaching = (levelId: LevelId, goal: RouteGoal): Set<number> => {
    const regions = regionsOf(levelId);
    return regions ? regionsReaching(regions, goal) : new Set();
  };
  const targetRegions = targets.map((target) => ({ target, regions: reaching(target.levelId, target.goal) }));
  const hopRegions = hops.map((hop) => ({ hop, regions: reaching(hop.levelId, hop.board) }));

  const settled = new Set<string>();
  const frontier: Frontier[] = [{ at: origin, cost: 0, hops: [] }];
  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost);
    const current = frontier.shift() as Frontier;
    if (current.target) return { hops: current.hops, target: current.target };
    const region = regionOf(current.at);
    const key = `${current.at.levelId}:${region}`;
    if (region < 0 || settled.has(key)) continue;
    settled.add(key);
    for (const { target, regions } of targetRegions) {
      if (target.levelId === current.at.levelId && regions.has(region)) {
        frontier.push({ at: current.at, cost: current.cost + octile(current.at.position, target.goal.point), hops: current.hops, target });
      }
    }
    if (current.hops.length >= MAX_HOPS) continue;
    for (const { hop, regions } of hopRegions) {
      if (hop.levelId !== current.at.levelId || !regions.has(region)) continue;
      frontier.push({ at: hop.arrive, cost: current.cost + octile(current.at.position, hop.board.point) + hop.cost, hops: [...current.hops, hop] });
    }
  }
  return null;
}

export function levelRegions(level: ResolvedLevel, grid: WalkabilityGrid): WalkRegions {
  return walkRegions(grid, level.layout.width, level.layout.height);
}
